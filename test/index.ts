import { expect } from "chai";
import { ethers } from "hardhat";
import { Blyatversity } from "../typechain-types/cache/solpp-generated-contracts/index"
import CONST from "../scripts/util/const.json";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

const { REGISTRY_ADDRESS, CONTRACT_METADATA_CID, FOLDER_CID, ADMIN_ROLE } = CONST;

describe("Blyatversity", function () {

	let Blyat: Blyatversity;
	let admin: SignerWithAddress;
	before(async () => {
		const blyat = await ethers.getContractFactory("Blyatversity");
		Blyat = (await blyat.deploy(FOLDER_CID, CONTRACT_METADATA_CID, REGISTRY_ADDRESS)) as Blyatversity;
		await Blyat.deployed()

		const signers = await ethers.getSigners()
		admin = signers[0];
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
});
