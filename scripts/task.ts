/* eslint-disable node/no-missing-import */
// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { Storage } from "./util/storage";
import { HardhatRuntimeEnvironment } from "hardhat/types";
// @ts-ignore
import { Blyatversity, MetadataFactory } from "../typechain-types";
import { readdirSync, readFileSync, writeFileSync } from "fs";
import { minify } from "html-minifier";
import { encode } from "js-base64";
import uploadAttribs from "./util/upload-attribs";

interface MintArgs {
	to: string;
	id: string;
}

interface TokenArgs {
	id: string;
}

export async function upload(args: MintArgs, hre: HardhatRuntimeEnvironment) {
	const network = await hre.ethers.provider.getNetwork();
	const storage = new Storage("addresses.json");
	const { stringLib: stringLibAddress, metadata: metadataAddress } = storage.fetch(network.chainId);
	const Metadata = await hre.ethers.getContractFactory("MetadataFactory", {
		libraries: { String: stringLibAddress },
	});
	const metadata = Metadata.attach(metadataAddress) as MetadataFactory;
	const ROOT_FOLDER = "assets";
	await uploadAttribs(ROOT_FOLDER, metadata);
}

export async function mint(args: MintArgs, hre: HardhatRuntimeEnvironment) {
	const network = await hre.ethers.provider.getNetwork();
	const storage = new Storage("addresses.json");
	const { blyat: blyatAddress } = storage.fetch(network.chainId);
	const { to, id: itemId } = args;
	const Blyatversity = await hre.ethers.getContractFactory("Blyatversity");
	const blyat = Blyatversity.attach(blyatAddress) as Blyatversity;
	const mintTx = await blyat.mint(itemId, to);
	await mintTx.wait();
	console.log(`https://${network.chainId === 80001 ? "mumbai." : ""}polygonscan.com/tx/${mintTx.hash}`);
}

export async function tokenURI(args: TokenArgs, hre: HardhatRuntimeEnvironment) {
	const network = await hre.ethers.provider.getNetwork();
	const storage = new Storage("addresses.json");
	const { blyat: blyatAddress, stringLib: stringLibAddress } = storage.fetch(network.chainId);
	const { id: tokenId } = args;
	const Metadata = await hre.ethers.getContractFactory("MetadataFactory", {
		libraries: { String: stringLibAddress },
	});
	const metadata = Metadata.attach(blyatAddress) as MetadataFactory;
	const tokenURI = await metadata.tokenURI(tokenId);
	writeFileSync("token.txt", tokenURI, "utf-8");
}
