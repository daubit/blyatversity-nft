import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { Blyatversity } from "../typechain-types/cache/solpp-generated-contracts/index"
import CONST from "../scripts/util/const.json";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

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
		describe("Adding Itmes", () => {
			it("should be should to add an unlimited item", async () => {
				const addTx = await blyat["addItem()"]();
				await addTx.wait();
				const maxSupply = await blyat.getItemMaxSupply(1);
				expect(maxSupply.toNumber()).to.be.equal(0);
			})
			it("should be should to add an limited item", async () => {
				const addTx = await blyat["addItem(uint256)"](3);
				await addTx.wait();
				const maxSupply = await blyat.getItemMaxSupply(2);
				expect(maxSupply.toNumber()).to.be.equal(3)
			})
			it("should be NOT able for user to add an limited item", async () => {
				const addTx = blyat.connect(userA)["addItem(uint256)"](3);
				expect(addTx).to.be.reverted
			})
			it("should be NOT able for user to add an unlimited item", async () => {
				const addTx = blyat.connect(userA)["addItem()"]();
				expect(addTx).to.be.reverted
			})
		})
		describe("Mint", () => {
			it("should be able to mint unlimited", async () => {
				await blyat.mint(1, userA.address);
				const balance = await blyat.balanceOf(userA.address)
				const itemId = await blyat.getItem(0);
				expect(balance.toNumber()).to.be.equal(1)
				expect(itemId.toNumber()).to.be.equal(1)
			})
			it("should be able to mint limited", async () => {
				await blyat.mint(1, userA.address);
				const balance = await blyat.balanceOf(userA.address)
				const itemId = await blyat.getItem(0);
				expect(balance.toNumber()).to.be.equal(2)
				expect(itemId.toNumber()).to.be.equal(1)
			})
			it("should NOT able for user to mint", async () => {
				const mintTx = blyat.mint(1, userA.address, { from: userA.address })
				expect(mintTx).to.be.reverted;
			})
		})
		describe("Burn", () => {
			it("should be able to burn", async () => {
				const burnTx = await blyat.connect(userA).burn(0);
				await burnTx.wait();
				const balance = await blyat.balanceOf(userA.address)
				expect(balance.toNumber()).to.be.equal(1);
			})
			it("should NOT be able for user to burn", async () => {
				const burnTx = blyat.burn(1, { from: userA.address });
				expect(burnTx).to.be.reverted
			})
		})
		describe("TokenURI", () => {
			it("should return the corrent token URI", async () => {
				const mintTx = await blyat.mint(1, admin.address);
				await mintTx.wait();
				const totalSupply = Number(await blyat.totalSupply())
				const tokenId = totalSupply - 1
				const uri = await blyat.tokenURI(tokenId);
				expect(uri).to.be.equal(`ipfs://${FOLDER_CID}1/${tokenId}`)
			})
		})
	})
	describe("Lock Period", function () {
		describe("should restrain items from transfer", function () {
			const fiveMinPeriod = Date.now() + 1000 * 60 * 5;
			it("should have a correct setup", async () => {
				const addItemTx = await blyat["addItem()"]();
				await addItemTx.wait();
				const lockTx = await blyat.setLockPeriod(3, fiveMinPeriod)
				await lockTx.wait();
				const mintTx = await blyat.mint(3, userA.address);
				await mintTx.wait();
				const balanceUser = await blyat.balanceOf(userA.address);
				const balanceAdmin = await blyat.balanceOf(admin.address);
				expect(balanceUser.toNumber()).to.be.equal(2, "User balance is incorrect!");
				expect(balanceAdmin.toNumber()).to.be.equal(1, "Admin balance is incorrect!");
			})
			it("should NOT be able to transfer", async () => {
				const transferTx = blyat.connect(userA).transferFrom(userA.address, admin.address, 0);
				expect(transferTx).to.be.reverted
			})
			it("should be able to transfer now", async () => {
				await time.increaseTo(fiveMinPeriod);
				const transferTx = await blyat.connect(userA).transferFrom(userA.address, admin.address, 1);
				await transferTx.wait();
				const balance = await blyat.balanceOf(admin.address);
				expect(balance.toNumber()).to.be.equal(2)
			})
		})
	})
});
