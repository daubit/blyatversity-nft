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
import { BigNumber } from "ethers";
import { uploadAttributes, uploadStyles, uploadVariant, uploadVariants } from "./util/upload-attribs";
import uploadAllHelper from "../scripts/util/upload-attribs";
import { keccak256 } from "./util/utils";
import data from "./data.json";

interface MintArgs {
	to: string;
	seasonid: string;
}

interface UploadArgs {
	start: number;
	end: number;
	layer: number;
	startid: number;
}

interface TokenArgs {
	id: string;
}

export async function addAttributes(args: any, hre: HardhatRuntimeEnvironment) {
	const network = await hre.ethers.provider.getNetwork();
	const storage = new Storage("addresses.json");
	const { stringLib: stringLibAddress, metadata: metadataAddress } = storage.fetch(network.chainId);
	const Metadata = await hre.ethers.getContractFactory("MetadataFactory", {
		libraries: { String: stringLibAddress },
	});
	const metadata = Metadata.attach(metadataAddress) as MetadataFactory;
	const ROOT_FOLDER = "assets/layers";
	await uploadAttributes(metadata, ROOT_FOLDER);
}

export async function setDescription(args: any, hre: HardhatRuntimeEnvironment) {
	const network = await hre.ethers.provider.getNetwork();
	const storage = new Storage("addresses.json");
	const { stringLib: stringLibAddress, metadata: metadataAddress } = storage.fetch(network.chainId);
	const Metadata = await hre.ethers.getContractFactory("MetadataFactory", {
		libraries: { String: stringLibAddress },
	});
	const metadata = Metadata.attach(metadataAddress) as MetadataFactory;
	const setDescriptionTx = await metadata.setDescription(data.description);
	await setDescriptionTx.wait();
	console.log("Set description!");
}

export async function setContractDescription(args: any, hre: HardhatRuntimeEnvironment) {
	const file = readFileSync("./scripts/metadata.json", "utf8");
	const metadataFactory = () => {
		return `data:application/json,${encodeURIComponent(file)}`;
	};

	const network = await hre.ethers.provider.getNetwork();
	const storage = new Storage("addresses.json");
	const { blyat: blyatAddress } = storage.fetch(network.chainId);
	const Blyatversity = await hre.ethers.getContractFactory("Blyatversity", {});
	const blyat = Blyatversity.attach(blyatAddress) as Blyatversity;
	const setDescriptionTx = await blyat.setContractCID(metadataFactory());
	await setDescriptionTx.wait();
	console.log("Set Contract description!");
}

export async function reset(args: UploadArgs, hre: HardhatRuntimeEnvironment) {
	const network = await hre.ethers.provider.getNetwork();
	const storage = new Storage("addresses.json");
	const { stringLib: stringLibAddress, metadata: metadataAddress } = storage.fetch(network.chainId);
	const Metadata = await hre.ethers.getContractFactory("MetadataFactory", {
		libraries: { String: stringLibAddress },
	});
	const { start, end, layer: layerId, startid } = args;
	const metadata = Metadata.attach(metadataAddress) as MetadataFactory;
	interface Variant {
		name: string;
		svg: string;
	}
	const ROOT_FOLDER = "assets";
	let layers = readdirSync(ROOT_FOLDER);
	if (layerId > 0) {
		const chosenLayer = layers.find((layer) => layer.includes(layerId.toString()));
		layers = chosenLayer ? [chosenLayer] : layers;
	}
	for (const layer of layers) {
		const attributesFolder = readdirSync(`${ROOT_FOLDER}/${layer}`).slice(start, end);
		for (let i = 0; i < attributesFolder.length; i++) {
			const attribute = attributesFolder[i];
			const attributeId = i + 1 + +startid;
			console.log(`Removing attribute ${attributeId}`);
			const variants: Variant[] = readdirSync(`${ROOT_FOLDER}/${layer}/${attribute}`).map((file) => ({
				name: file.replace(".html", ""),
				svg: "",
			}));
			for (const variant of variants) {
				const { svg, name } = variant;
				const setVariantTx = await metadata.setVariant(attributeId, name, svg);
				await setVariantTx.wait();
			}
			console.log(`Resetting ${attribute}`);
		}
	}
}

export async function uploadAll(args: UploadArgs, hre: HardhatRuntimeEnvironment) {
	const network = await hre.ethers.provider.getNetwork();
	const storage = new Storage("addresses.json");
	const { stringLib: stringLibAddress, metadata: metadataAddress } = storage.fetch(network.chainId);
	const Metadata = await hre.ethers.getContractFactory("MetadataFactory", {
		libraries: { String: stringLibAddress },
	});
	const metadata = Metadata.attach(metadataAddress) as MetadataFactory;
	const ROOT_FOLDER = "assets/layers";
	await uploadAllHelper(metadata, ROOT_FOLDER);
}

export async function upload(args: UploadArgs, hre: HardhatRuntimeEnvironment) {
	const network = await hre.ethers.provider.getNetwork();
	const storage = new Storage("addresses.json");
	const { stringLib: stringLibAddress, metadata: metadataAddress } = storage.fetch(network.chainId);
	const Metadata = await hre.ethers.getContractFactory("MetadataFactory", {
		libraries: { String: stringLibAddress },
	});
	const { start, end, layer, startid } = args;
	const metadata = Metadata.attach(metadataAddress) as MetadataFactory;
	const ROOT_FOLDER = "assets/layers";
	await uploadVariants(metadata, ROOT_FOLDER, { start, end, layer, startid });
}

export async function uploadStls(args: UploadArgs, hre: HardhatRuntimeEnvironment) {
	const network = await hre.ethers.provider.getNetwork();
	const storage = new Storage("addresses.json");
	const { stringLib: stringLibAddress, metadata: metadataAddress } = storage.fetch(network.chainId);
	const Metadata = await hre.ethers.getContractFactory("MetadataFactory", {
		libraries: { String: stringLibAddress },
	});
	const { start, end, layer } = args;
	const metadata = Metadata.attach(metadataAddress) as MetadataFactory;
	const ROOT_FOLDER = "assets/styles";
	await uploadStyles(metadata, ROOT_FOLDER, { layer, start, end, startid: 5 });
}

export async function mint(args: MintArgs, hre: HardhatRuntimeEnvironment) {
	const network = await hre.ethers.provider.getNetwork();
	const storage = new Storage("addresses.json");
	const { blyat: blyatAddress } = storage.fetch(network.chainId);
	const { to, seasonid: itemId } = args;
	const Blyatversity = await hre.ethers.getContractFactory("Blyatversity");
	const blyat = Blyatversity.attach(blyatAddress) as Blyatversity;
	const mintTx = await blyat.mint(BigNumber.from(itemId), to);
	await mintTx.wait();
	console.log(`https://${network.chainId === 80001 ? "mumbai." : ""}polygonscan.com/tx/${mintTx.hash}`);
}

export async function tokenURI(args: TokenArgs, hre: HardhatRuntimeEnvironment) {
	const network = await hre.ethers.provider.getNetwork();
	const storage = new Storage("addresses.json");
	const { blyat: blyatAddress } = storage.fetch(network.chainId);
	const { id: tokenId } = args;
	const Blyatversity = await hre.ethers.getContractFactory("Blyatversity");
	const blyat = Blyatversity.attach(blyatAddress) as MetadataFactory;
	const tokenURI = await blyat.tokenURI(tokenId);
	writeFileSync("token.txt", tokenURI, "utf-8");
	console.log("Fetched tokenURI!");
}

interface MinterRoleArgs {
	address: string;
}

export async function addMinterRole(args: MinterRoleArgs, hre: HardhatRuntimeEnvironment) {
	const network = await hre.ethers.provider.getNetwork();
	const storage = new Storage("addresses.json");
	const { blyat: blyatAddress } = storage.fetch(network.chainId);
	const { address } = args;
	const Metadata = await hre.ethers.getContractFactory("Blyatversity");
	const metadata = Metadata.attach(blyatAddress) as Blyatversity;
	const tx = await metadata.grantRole(keccak256("MINTER_ROLE"), address);
	await tx.wait();
	console.log(tx.hash);
}

export async function removeMinterRole(args: MinterRoleArgs, hre: HardhatRuntimeEnvironment) {
	const network = await hre.ethers.provider.getNetwork();
	const storage = new Storage("addresses.json");
	const { blyat: blyatAddress } = storage.fetch(network.chainId);
	const { address } = args;
	const Metadata = await hre.ethers.getContractFactory("Blyatversity");
	const metadata = Metadata.attach(blyatAddress) as Blyatversity;
	const tx = await metadata.revokeRole(keccak256("MINTER_ROLE"), address);
	await tx.wait();
	console.log(tx.hash);
}

interface AddItemArgs {
	factory: string;
	supply?: number;
}
export async function addItem(args: AddItemArgs, hre: HardhatRuntimeEnvironment) {
	const network = await hre.ethers.provider.getNetwork();
	const storage = new Storage("addresses.json");
	const { blyat: blyatAddress } = storage.fetch(network.chainId);
	const { factory, supply } = args;
	const Blyatversity = await hre.ethers.getContractFactory("Blyatversity");
	const blyat = Blyatversity.attach(blyatAddress) as Blyatversity;
	if (supply) {
		const addTx = await blyat["addItem(address,uint256)"](factory, supply);
		await addTx.wait();
	} else {
		const addTx = await blyat["addItem(address)"](factory);
		await addTx.wait();
	}
	console.log("Metadata added!");
}

interface AddItemIndexedArgs {
	factory: string;
	index: number;
}
export async function addItemIndexed(args: AddItemIndexedArgs, hre: HardhatRuntimeEnvironment) {
	const network = await hre.ethers.provider.getNetwork();
	const storage = new Storage("addresses.json");
	const { blyat: blyatAddress } = storage.fetch(network.chainId);
	const { factory, index } = args;
	const Blyatversity = await hre.ethers.getContractFactory("Blyatversity");
	const blyat = Blyatversity.attach(blyatAddress) as Blyatversity;
	const addTx = await blyat.addItemIndexed(index, factory);
	await addTx.wait();
	console.log("Metadata added!");
}

interface LockArgs {
	deadline: number;
	seasonid: number;
}

export async function lockItem(args: LockArgs, hre: HardhatRuntimeEnvironment) {
	const network = await hre.ethers.provider.getNetwork();
	const storage = new Storage("addresses.json");
	const { blyat: blyatAddress } = storage.fetch(network.chainId);
	const { seasonid, deadline } = args;
	const Blyatversity = await hre.ethers.getContractFactory("Blyatversity");
	const blyat = Blyatversity.attach(blyatAddress) as Blyatversity;
	const lockTx = await blyat.setLockPeriod(seasonid, deadline);
	await lockTx.wait();
	console.log(`Locked item ${seasonid} till ${new Date(deadline)}`);
}

interface AddVariantArgs {
	layer: number;
	variant: string;
	atrribid: string;
	atrribname: string;
}
export async function addVariant(args: AddVariantArgs, hre: HardhatRuntimeEnvironment) {
	const network = await hre.ethers.provider.getNetwork();
	const storage = new Storage("addresses.json");
	const { layer, variant, atrribid, atrribname } = args;
	const { metadata: metadataAddress, stringLib: stringLibAddress } = storage.fetch(network.chainId);
	const Metadata = await hre.ethers.getContractFactory("MetadataFactory", {
		libraries: { String: stringLibAddress },
	});
	const metadata = Metadata.attach(metadataAddress) as MetadataFactory;
	await uploadVariant(metadata, "assets/layers", { layer, variant, atrribId: atrribid, atrribName: atrribname });
	console.log("Variant added!");
}
