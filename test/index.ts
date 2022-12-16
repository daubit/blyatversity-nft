import { expect } from "chai";
import { ethers, upgrades, } from "hardhat";
import { Blyatversity } from "../typechain-types/cache/solpp-generated-contracts/index"
import CONST from "../scripts/util/const.json";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

const { REGISTRY_ADDRESS, CONTRACT_METADATA_CID, FOLDER_CID, ADMIN_ROLE } = CONST;

describe("Blyatversity", function () {

	let blyat: Blyatversity;
	let admin: SignerWithAddress;
	let userA: SignerWithAddress;
	before(async () => {
		const Blyat = await ethers.getContractFactory("Blyatversity");
		blyat = (await upgrades.deployProxy(Blyat, [FOLDER_CID, CONTRACT_METADATA_CID, REGISTRY_ADDRESS])) as Blyatversity;
		await blyat.deployed()

		const signers = await ethers.getSigners()
		admin = signers[0];
		userA = signers[1];
	})
	describe("Deployment", function () {
		it("should have contract cid", async () => {
			const cid = await blyat.contractCID()
			expect(cid).equals(`ipfs://${CONTRACT_METADATA_CID}`);
		})
		it("should have admin", async () => {
			const hasRole = await blyat.hasRole(ADMIN_ROLE, admin.address);
			expect(hasRole).to.be.true;
		})
	});
	describe("NFT", function () {
		it("should be should to add an item", async () => {
			const addTx = await blyat["addItem()"]();
			await addTx.wait();
			await blyat.mint(1, admin.address);
			const itemId = await blyat.getItem(0)
			expect(itemId.toNumber()).to.be.equal(1)
		})
		it("should be NOT able for user to add an item", async () => {
			const addTx = blyat["addItem()"]({ from: userA.address });
			expect(addTx).to.be.reverted
		})
		it("should be able to mint", async () => {
			await blyat.mint(1, userA.address);
			const balance = await blyat.balanceOf(userA.address)
			const itemId = await blyat.getItem(1);
			expect(balance.toNumber()).to.be.equal(1)
			expect(itemId.toNumber()).to.be.equal(1)
		})
		it("should return the corrent token URI", async () => {
			const uri = await blyat.tokenURI(1);
			expect(uri).to.be.equal(`ipfs://${FOLDER_CID}1/1`)
		})
		it("should not able for user to mint", async () => {
			const mintTx = blyat.mint(1, userA.address, { from: userA.address })
			expect(mintTx).to.be.reverted;
		})
		it("should be able to burn", async () => {
			const burnTx = await blyat.connect(userA).burn(1);
			await burnTx.wait();
			const balance = await blyat.balanceOf(userA.address)
			expect(balance.toNumber()).to.be.equal(0);
		})
		it("should not be able for user to burn", async () => {
			const burnTx = blyat.burn(1, { from: userA.address });
			expect(burnTx).to.be.reverted
		})
	})
});
