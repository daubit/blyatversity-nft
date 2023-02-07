import { ethers, upgrades } from "hardhat";
import { AddressStorage, Storage } from "../util/storage";

export async function main() {
	const network = await ethers.provider.getNetwork();
	const storage = new Storage("addresses.json");
	const addresses: AddressStorage = storage.fetch(network.chainId);
	const blyat = await ethers.getContractFactory("Blyatversity");
	console.log(addresses.blyat);
	const blyatUpgrade = await upgrades.upgradeProxy(addresses.blyat, blyat);
	addresses.blyat = blyatUpgrade.address;
	storage.save(network.chainId, addresses);
}

main()
	.then(() => console.log("done"))
	.catch((e) => console.log(e));
