/* eslint-disable node/no-missing-import */
// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { Storage } from "./util/storage";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Blyatversity } from "../typechain-types";
import { readdirSync, readFileSync, writeFileSync } from "fs";

interface MintArgs {
    to: string;
}

interface TokenArgs {
    id: number;
}

export async function setMetadata(
    args: TokenArgs,
    hre: HardhatRuntimeEnvironment
) {
    const network = await hre.ethers.provider.getNetwork();
    const storage = new Storage("addresses.json");
    const { Blyatversity: blyatversityAddress, stringLib: stringLibAddress } =
        storage.fetch(network.chainId);
    const OnChain = await hre.ethers.getContractFactory("Blyatversity", {
        libraries: { String: stringLibAddress },
    });
    const onChain = OnChain.attach(hackBoiAddress) as Blyatversity;
    const { id: tokenId } = args;
    const setNameTx = await onChain.setName(tokenId, "Landscape");
    await setNameTx.wait();
    const setDescriptionTx = await onChain.setDescription(
        tokenId,
        "This is the evening landscape template"
    );
    await setDescriptionTx.wait();
    const addAttributesTx = await onChain.addAttributes(tokenId, [
        "sky",
        "clouds",
        "sun",
        "back",
        "middle",
        "fore",
        "evening",
        "window"
    ]);
    await addAttributesTx.wait();
}

export async function setup(args: MintArgs, hre: HardhatRuntimeEnvironment) {
    const network = await hre.ethers.provider.getNetwork();
    const storage = new Storage("addresses.json");
    const { onChain: hackBoiAddress, stringLib: stringLibAddress } =
        storage.fetch(network.chainId);
    const OnChain = await hre.ethers.getContractFactory("OnChain", {
        libraries: { String: stringLibAddress },
    });
    const onChain = OnChain.attach(hackBoiAddress) as OnChain;
    const svgDir = readdirSync("assets/svg");
    const htmlDir = readdirSync("assets/html");
    const jsDir = readdirSync("assets/js");

    const keys = svgDir
        .map((file) => file.replace(".svg", ""))
        .concat(htmlDir.map((file) => file.replace(".html", "")))
        .concat(jsDir.map((file) => file.replace(".html", "")));

    const values = svgDir
        .map((file) => readFileSync(`assets/svg/${file}`, "utf-8"))
        .map((component) => component.replace(/\n|\r|\t/g, " "))
        .concat(
            htmlDir
                .map((file) => readFileSync(`assets/html/${file}`, "utf-8"))
                .map((style) => style.replace(/\n|\r|\t/g, " "))
        ).concat(
            jsDir
                .map((file) => readFileSync(`assets/js/${file}`, "utf-8"))
                .map((style) => style.replace(/\n|\r|\t/g, " "))
        );
    const addElementsTx = await onChain.addElements(keys, values);
    await addElementsTx.wait();
}

export async function mint(args: MintArgs, hre: HardhatRuntimeEnvironment) {
    const network = await hre.ethers.provider.getNetwork();
    const storage = new Storage("addresses.json");
    const { onChain: hackBoiAddress, stringLib: stringLibAddress } =
        storage.fetch(network.chainId);
    const { to } = args;
    const OnChain = await hre.ethers.getContractFactory("OnChain", {
        libraries: { String: stringLibAddress },
    });
    const onChain = OnChain.attach(hackBoiAddress) as OnChain;
    const mintTx = await onChain.mint(to);
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
    const { onChain: hackBoiAddress, stringLib: stringLibAddress } =
        storage.fetch(network.chainId);
    const { id: tokenId } = args;
    const OnChain = await hre.ethers.getContractFactory("OnChain", {
        libraries: { String: stringLibAddress },
    });
    const onChain = OnChain.attach(hackBoiAddress) as OnChain;
    const tokenURI = await onChain.tokenURI(tokenId);
    writeFileSync("token.txt", tokenURI, "utf-8");
}
