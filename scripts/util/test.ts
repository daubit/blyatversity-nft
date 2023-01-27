import { HardhatRuntimeEnvironment } from "hardhat/types";
// @ts-ignore
import { MetadataFactory } from "../../typechain-types";
import { Storage } from "./storage";

interface TokenArgs {
	id: string;
	amount: number;
}

export async function benchmarkTokenURI(args: TokenArgs, hre: HardhatRuntimeEnvironment) {
	const network = await hre.ethers.provider.getNetwork();
	const storage = new Storage("addresses.json");
	const { blyat: blyatAddress, stringLib: stringLibAddress } = storage.fetch(network.chainId);
	const { id: tokenId, amount } = args;
	const Metadata = await hre.ethers.getContractFactory("MetadataFactory", {
		libraries: { String: stringLibAddress },
	});
	const metadata = Metadata.attach(blyatAddress) as MetadataFactory;
	const benchMarks = [];
	for (let i = 0; i < amount; i++) {
		const start = Date.now();
		await metadata.tokenURI(tokenId);
		const end = Date.now();
		console.log(`Time: ${end - start} ms`);
		benchMarks.push(end - start);
	}
	console.log(`Average time: ${benchMarks.reduce((a, b) => a + b, 0) / amount}ms`);
	// writeFileSync("dist/token.txt", tokenURI, "utf-8");
}
