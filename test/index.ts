import { expect } from "chai";
import { ethers, upgrades, } from "hardhat";
import { Blyatversity } from "../typechain-types/cache/solpp-generated-contracts/index"
import CONST from "../scripts/util/const.json";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

const { REGISTRY_ADDRESS, CONTRACT_METADATA_CID, FOLDER_CID, ADMIN_ROLE } = CONST;

const ItemId = 0;

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
		it("should mint for booking reference", async () => {
			await blyat.mint(ItemId, userA.address);
			const balance = await blyat.balanceOf(userA.address)
			const bookId = await blyat.getItem(0);
			expect(balance.toNumber()).to.be.equal(1)
			expect(bookId.toNumber()).to.be.equal(ItemId)
		})
		it("should not able for user to mint", async () => {
			const mintTx = blyat.mint(ItemId, userA.address, { from: userA.address })
			expect(mintTx).to.be.reverted;
		})
		it("should burn with booking reference", async () => {
			await blyat.burn(ItemId);
			const balance = await blyat.balanceOf(userA.address);
			expect(balance.toNumber()).to.be.equal(0)
		})
		it("should not be able for user to burn", async () => {
			const burnTx = blyat.burn(ItemId, { from: userA.address });
			expect(burnTx).to.be.reverted
		})
		it("should be should to add a book", async () => {
			const addTx = await blyat["addItem()"]();
			await addTx.wait();
			const newItemId = 1;
			await blyat.mint(newItemId, admin.address);
			const bookId = await blyat.getItem(1)
			expect(bookId.toNumber()).to.be.equal(newItemId)
		})
		it("should be NOT should for user to add a book ", async () => {
			const addTx = blyat["addItem()"]({ from: userA.address });
			expect(addTx).to.be.reverted
		})
		it("should return the corrent token URI", async () => {
			const uri = await blyat.tokenURI(1);
			expect(uri).to.be.equal(`ipfs://${FOLDER_CID}1/1`)
		})
	})
});
