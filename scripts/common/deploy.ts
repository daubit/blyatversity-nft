/* eslint-disable node/no-missing-import */
// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers, upgrades } from "hardhat";
import hardhat from "hardhat";
import { AddressStorage, Storage } from "../util/storage";
import { verify } from "../util/utils";
import { REGISTRY_ADDRESS, CONTRACT_METADATA_CID } from "../util/const.json";
import { Blyatversity } from "../../typechain-types";

async function main() {
	const network = await ethers.provider.getNetwork();
	const storage = new Storage("addresses.json");
	const addresses: AddressStorage = storage.fetch(network.chainId);
	const { blyat: blyatAddress, stringLib: stringLibAddress, metadata: metadataAddress } = addresses;
	// We get the contract to deploy
	let blyatversity: Blyatversity;
	if (!stringLibAddress) {
		const StringLib = await ethers.getContractFactory("String");
		const stringLib = await StringLib.deploy();
		await stringLib.deployed();
		addresses.stringLib = stringLib.address;
		console.log("Library deployed!");
	}
	if (!addresses.stringLib) throw new Error("Cannot find String Library!");
	if (!blyatAddress) {
		const Blyatversity = await ethers.getContractFactory("Blyatversity");
		blyatversity = (await upgrades.deployProxy(Blyatversity, [
			CONTRACT_METADATA_CID,
			REGISTRY_ADDRESS,
		])) as Blyatversity;
		await blyatversity.deployed();
		addresses.blyat = blyatversity.address;
		console.log("Blyatversity deployed to:", blyatversity.address);
		console.log("Waiting for verification...");
		await verify(hardhat, blyatversity.address, network.chainId, [CONTRACT_METADATA_CID, REGISTRY_ADDRESS]);
	} else {
		const Blyatversity = await ethers.getContractFactory("Blyatversity");
		blyatversity = Blyatversity.attach(blyatAddress) as Blyatversity;
	}
	if (!metadataAddress) {
		const Metadata = await ethers.getContractFactory("MetadataFactory", {
			libraries: { String: addresses.stringLib },
		});
		const metadata = await Metadata.deploy();
		await metadata.deployed();
		addresses.metadata = metadata.address;
		console.log("Metadata deployed!");
		const addTx = await blyatversity["addItem(address)"](metadata.address);
		await addTx.wait();
		console.log("Metadata added!");
		await verify(hardhat, metadata.address, network.chainId, []);
	}
	storage.save(network.chainId, addresses);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
