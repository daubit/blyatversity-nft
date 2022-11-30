import { expect, use } from "chai";
import { ethers, } from "hardhat";
import { Blyatversity } from "../typechain-types/cache/solpp-generated-contracts/index"
import CONST from "../scripts/util/const.json";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

const { REGISTRY_ADDRESS, CONTRACT_METADATA_CID, FOLDER_CID, ADMIN_ROLE } = CONST;

const bookingReferences = [
	"000-1234567-1234567",
	"001-1234567-1234567",
	"010-1234567-1234567"
]

function keccak256(text: string) {
	return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(text))
}

describe("Blyatversity", function () {

	let Blyat: Blyatversity;
	let admin: SignerWithAddress;
	let userA: SignerWithAddress;
	before(async () => {
		const blyat = await ethers.getContractFactory("Blyatversity");
		Blyat = (await blyat.deploy(FOLDER_CID, CONTRACT_METADATA_CID, REGISTRY_ADDRESS)) as Blyatversity;
		await Blyat.deployed()

		const signers = await ethers.getSigners()
		admin = signers[0];
		userA = signers[1];
	})
	describe("Deployment", function () {
		it("should have contract cid", async () => {
			const cid = await Blyat.contractCID()
			expect(cid).equals(`ipfs://${CONTRACT_METADATA_CID}`);
		})
		it("should have admin", async () => {
			const hasRole = await Blyat.hasRole(ADMIN_ROLE, admin.address);
			expect(hasRole).to.be.true;
		})
	});
	describe("NFT", function () {
		it("should mint for booking reference", async () => {
			const bytes = keccak256(bookingReferences[0])
			await Blyat.mint(userA.address, bytes);
			const balance = await Blyat.balanceOf(userA.address)
			expect(balance.toNumber()).to.be.equal(1)
		})
		it("should not able for user to mint", async () => {
			const bytes = keccak256(bookingReferences[1])
			const mintTx = Blyat.mint(userA.address, bytes, { from: userA.address })
			expect(mintTx).to.be.reverted;
		})
		it("should burn with booking reference", async () => {
			const bytes = keccak256(bookingReferences[0])
			await Blyat.burn(bytes);
			const balance = await Blyat.balanceOf(userA.address);
			expect(balance.toNumber()).to.be.equal(0)
		})
		it("should not be able for user to burn", async () => {
			const bytes = keccak256(bookingReferences[0])
			const burnTx = Blyat.burn(bytes, { from: userA.address });
			expect(burnTx).to.be.reverted
		})
	})
});
