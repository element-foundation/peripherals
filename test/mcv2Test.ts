import { ethers, network, waffle } from "hardhat";
import { ERC20Permit } from "typechain/ERC20Permit";

import { TestERC20 } from "typechain/TestERC20";
import { TestERC20__factory } from "typechain/factories/TestERC20__factory";

import { MCMod } from "typechain/MCMod";
import { MCMod__factory } from "typechain/factories/MCMod__factory";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";

describe("MCMod", function () {
    let signers: SignerWithAddress[];
    let elfi: TestERC20;
    let lp1: TestERC20;
    let lp2: TestERC20;
    let mc: MCMod;
    before(async function () {
        signers = await ethers.getSigners();

        // deploy contracts
        const tokenDeployer = new TestERC20__factory(signers[0]);
        const mcDeployer = new MCMod__factory(signers[0]);
        elfi = await tokenDeployer.deploy("elfi", "elfi", 18);
        lp1 = await tokenDeployer.deploy("lp1", "lp1", 18);
        lp2 = await tokenDeployer.deploy("lp2", "lp2", 18);
        mc = await mcDeployer.deploy(elfi.address, 10)

        // setup
        await mc.add(100, lp1.address, ethers.constants.AddressZero)
        await mc.add(100, lp2.address, ethers.constants.AddressZero)
    });
    after(async () => {
    });
    describe("Permit function", async () => {
        beforeEach(async () => {
        });
        afterEach(async () => {
        });
        it("has a correctly precomputed typehash", async function () {
            console.log(elfi.address)
            console.log(mc.address)
        });
    })
})
