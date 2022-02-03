import { expect } from "chai";
import { createSnapshot, restoreSnapshot } from "./helpers/snapshots";

import { ethers, network, waffle } from "hardhat";
import { ERC20Permit } from "typechain/ERC20Permit";

import { TestERC20 } from "../typechain/TestERC20";
import { TestERC20__factory } from "../typechain/factories/TestERC20__factory";

import { LockingVault } from "typechain/LockingVault";
import { LockingVault__factory } from "typechain/factories/LockingVault__factory";

import { MCMod } from "../typechain/MCMod";
import { MCMod__factory } from "../typechain/factories/MCMod__factory";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { advanceBlocks, advanceBlock } from "./helpers/time";
const { provider } = waffle;

describe("MCMod", function () {
  let signers: SignerWithAddress[];
  let elfi: TestERC20;
  let knob: TestERC20;
  let newlp: TestERC20;
  let lps: TestERC20[] = [];
  let mc: MCMod;
  let lv: LockingVault;
  let numOfLp: number = 5;
  let numOfSigner: number = 3;
  const one = ethers.utils.parseEther("1");
  const thousand = ethers.utils.parseEther("1000");
  const tenThousand = ethers.utils.parseEther("100000");

  before(async function () {
    await createSnapshot(provider);
    signers = await ethers.getSigners();

    const tokenDeployer = new TestERC20__factory(signers[0]);
    const mcDeployer = new MCMod__factory(signers[0]);
    const lvDeployer = new LockingVault__factory(signers[0]);

    elfi = await tokenDeployer.deploy("elfi", "elfi", 18);
    knob = await tokenDeployer.deploy("knob", "knob", 18);
    newlp = await tokenDeployer.deploy("knob", "knob", 18);

    // deploy locking vault
    lv = await lvDeployer.deploy(elfi.address, 100000);
    // deploy masterchef, emit one elfi per second
    mc = await mcDeployer.deploy(elfi.address, one, lv.address);

    // 10000 elfi to emit total
    await elfi.setBalance(mc.address, tenThousand);
    await knob.setBalance(signers[numOfSigner + 1].address, tenThousand);

    for (let i = 0; i < 5; i++) {
      let lp = await tokenDeployer.deploy("lp" + i, "lp" + i, 18);
      // 100 alloc points per base token
      await mc.add(100, lp.address, ethers.constants.AddressZero);
      for (let q = 0; q <= numOfSigner; q++) {
        await lp.setBalance(signers[q].address, tenThousand);
        await lp.connect(signers[q]).approve(mc.address, tenThousand);
      }
      lps.push(lp);
    }
  });
  after(async () => {
    await restoreSnapshot(provider);
  });
  describe("Deposit", async () => {
    before(async () => {
      await createSnapshot(provider);
      // single LP token deposit test
      for (let i = 0; i < numOfSigner; i++) {
        await mc.connect(signers[i]).deposit(1, one, signers[i].address);
      }
      await advanceBlocks(provider, 100);
    });
    after(async () => {
      await restoreSnapshot(provider);
    });
    beforeEach(async () => {
      await createSnapshot(provider);
    });
    afterEach(async () => {
      await restoreSnapshot(provider);
    });
    it("deposits correctly", async function () {
      for (let i = 0; i < numOfSigner; i++) {
        let reward = await mc.pendingSushi(1, signers[i].address);
        expect(reward).to.be.gt(0);
      }
    });
    it("withdraws correctly", async function () {
      for (let i = 0; i < numOfSigner; i++) {
        let toWithdraw = one;

        let balanceBefore = await lps[1].balanceOf(signers[i].address);
        await mc.connect(signers[i]).withdraw(1, one, signers[i].address);
        let balanceAfter = await lps[1].balanceOf(signers[i].address);

        expect(balanceAfter.sub(balanceBefore)).to.equal(toWithdraw);
      }
    });
    it("locks harvest in Locking vault correctly via harvest", async function () {
      // withdraw and get pending rewards
      let rewards = [];
      for (let i = 0; i < numOfSigner; i++) {
        await mc.connect(signers[i]).withdraw(1, one, signers[i].address);
        let reward = await mc.pendingSushi(1, signers[i].address);
        rewards.push(reward);
        await mc.connect(signers[i]).harvest(1, signers[i].address);
        let blockNumber = await provider.getBlockNumber();
        let votingPower = await lv.queryVotePowerView(
          signers[i].address,
          blockNumber
        );
        expect(votingPower).to.equal(rewards[i]);
      }
      // get pending rewards
    });
    it("locks harvest in Locking vault correctly via withdrawAndHarvest", async function () {
      // withdraw and get pending rewards
      let rewards = [];
      for (let i = 0; i < numOfSigner; i++) {
        let reward = await mc.pendingSushi(1, signers[i].address);
        rewards.push(reward);
        await mc
          .connect(signers[i])
          .withdrawAndHarvest(1, one, signers[i].address);

        let blockNumber = await provider.getBlockNumber();
        let votingPower = await lv.queryVotePowerView(
          signers[i].address,
          blockNumber
        );

        // expect slightly greater to account for the small block lag
        expect(votingPower).to.be.gt(rewards[i]);
      }
    });
  });
});
