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

interface MintArgs {
    to: string;
    id: string;
}

interface TokenArgs {
    id: string;
}


export async function setup(args: MintArgs, hre: HardhatRuntimeEnvironment) {
    const network = await hre.ethers.provider.getNetwork();
    const storage = new Storage("addresses.json");
    const { blyat: blyatAddress, stringLib: stringLibAddress } =
        storage.fetch(network.chainId);
    const Metadata = await hre.ethers.getContractFactory("MetadataFactory", {
        libraries: { String: stringLibAddress },
    });
    const metadata = Metadata.attach(blyatAddress) as MetadataFactory;
    interface Variant {
        name: string,
        svg: string,
    }
    const ROOT_FOLDER = "assets";
    const attributesFolder = readdirSync(ROOT_FOLDER);
    const addAttributesTx = await metadata.addAttributes(attributesFolder)
    await addAttributesTx.wait();

    for (const [attributeId, attribute] of Object.entries(attributesFolder)) {
        const variants: Variant[] = readdirSync(`${ROOT_FOLDER}/${attribute}`).map(file => ({ name: file.replace(".html", ""), svg: encodeURIComponent(encodeURIComponent(minify(readFileSync(`${ROOT_FOLDER}/${attribute}/${file}`, "utf-8").replace(/\n|\r|\t/g, " "), { collapseWhitespace: true, removeComments: true, minifyCSS: true, collapseInlineTagWhitespace: true }))) }))
        for (const variant of variants) {
            const { svg, name } = variant;
            const chunkSize = 20000;
            for (let start = 0; start < svg.length; start += chunkSize) {
                const till = start + chunkSize < svg.length ? start + chunkSize : svg.length;
                const svgChunk = svg.slice(start, till);
                const addVariantChunkedTx = await metadata.addVariantChunked(attributeId, name, svgChunk, { gasLimit: 30_000_000 })
                await addVariantChunkedTx.wait();
            }
        }
    }

    const setDescriptionTx = await metadata.setDescription("Monster AG");
    await setDescriptionTx.wait();
}

export async function mint(args: MintArgs, hre: HardhatRuntimeEnvironment) {
    const network = await hre.ethers.provider.getNetwork();
    const storage = new Storage("addresses.json");
    const { blyat: blyatAddress, } =
        storage.fetch(network.chainId);
    const { to, id: itemId } = args;
    const Blyatversity = await hre.ethers.getContractFactory("Blyatversity");
    const blyat = Blyatversity.attach(blyatAddress) as Blyatversity;
    const mintTx = await blyat.mint(itemId, to);
    await mintTx.wait();
    console.log(
        `https://${network.chainId === 80001 ? "mumbai." : ""}polygonscan.com/tx/${mintTx.hash
        }`
    );
}

export async function tokenURI(
    args: TokenArgs,
    hre: HardhatRuntimeEnvironment
) {
    const network = await hre.ethers.provider.getNetwork();
    const storage = new Storage("addresses.json");
    const { blyat: blyatAddress, stringLib: stringLibAddress } =
        storage.fetch(network.chainId);
    const { id: tokenId } = args;
    const Metadata = await hre.ethers.getContractFactory("MetadataFactory", {
        libraries: { String: stringLibAddress },
    });
    const metadata = Metadata.attach(blyatAddress) as MetadataFactory;
    const tokenURI = await metadata.tokenURI(tokenId);
    writeFileSync("token.txt", tokenURI, "utf-8");
}
