/* eslint-disable node/no-missing-import */
// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { Storage } from "./util/storage";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Blyatversity } from "../typechain-types/cache/solpp-generated-contracts";

interface MintArgs {
    to: string;
}

export async function mint(args: MintArgs, hre: HardhatRuntimeEnvironment) {
    const bookId = 0;
    const network = await hre.ethers.provider.getNetwork();
    const storage = new Storage("addresses.json");
    const { blyat: blyatAddress } = storage.fetch(network.chainId);
    const { to } = args;
    const Blyat = await hre.ethers.getContractFactory("Blyatversity");
    const blyat = (Blyat.attach(blyatAddress)) as Blyatversity;
    const mintTx = await blyat.mint(bookId, to);
    await mintTx.wait()
    console.log(`https://${network.chainId === 80001 ? "mumbai." : ""}polygonscan.com/tx/${mintTx.hash}`)
}