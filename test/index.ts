import { expect } from "chai";
import { ethers, upgrades, } from "hardhat";
import { Blyatversity } from "../typechain-types/cache/solpp-generated-contracts/index"
import CONST from "../scripts/util/const.json";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

const { REGISTRY_ADDRESS, CONTRACT_METADATA_CID, FOLDER_CID, ADMIN_ROLE } = CONST;

const bookingReferences = [
	"000-1234567-1234567",
	"001-1234567-1234567",
	"010-1234567-1234567"
]

const BookId = 0;

function keccak256(text: string) {
	return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(text))
}

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
			const bytes = keccak256(bookingReferences[0])
			await blyat["mint(uint256,address,bytes32)"](BookId, userA.address, bytes);
			const balance = await blyat.balanceOf(userA.address)
			const bookId = await blyat.getBook(0);
			expect(balance.toNumber()).to.be.equal(1)
			expect(bookId.toNumber()).to.be.equal(BookId)
		})
		it("should not able for user to mint", async () => {
			const bytes = keccak256(bookingReferences[1])
			const mintTx = blyat["mint(uint256,address,bytes32)"](BookId, userA.address, bytes, { from: userA.address })
			expect(mintTx).to.be.reverted;
		})
		it("should burn with booking reference", async () => {
			const bytes = keccak256(bookingReferences[0])
			await blyat["burn(uint256,bytes32)"](BookId, bytes);
			const balance = await blyat.balanceOf(userA.address);
			expect(balance.toNumber()).to.be.equal(0)
		})
		it("should not be able for user to burn", async () => {
			const bytes = keccak256(bookingReferences[0])
			const burnTx = blyat["burn(uint256,bytes32)"](BookId, bytes, { from: userA.address });
			expect(burnTx).to.be.reverted
		})
		it("should be should to add a book", async () => {
			const addTx = await blyat.addBook();
			await addTx.wait();
			const newBookId = 1;
			const bytes = keccak256(bookingReferences[0])
			await blyat["mint(uint256,address,bytes32)"](newBookId, admin.address, bytes);
			const bookId = await blyat.getBook(1)
			expect(bookId.toNumber()).to.be.equal(newBookId)
		})
		it("should be NOT should for user to add a book ", async () => {
			const addTx = blyat.addBook({ from: userA.address });
			expect(addTx).to.be.reverted
		})
		it("should return the corrent token URI", async () => {
			const uri = await blyat.tokenURI(1);
			expect(uri).to.be.equal(`ipfs://${FOLDER_CID}1/1`)
		})
	})
});
