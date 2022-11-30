import { AddressStorage, Storage } from "../util/storage";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { MFSWrapper } from "../util/ipfs";
import { readFileSync } from "fs";

const NETWORK_URL: { [chainId: number]: string } = {
  80001: "https://mumbai.polygonscan.com/tx",
  137: "https://polygonscan.com/tx",
};

const networkUrl = (chainId: number) =>
  NETWORK_URL[chainId]
    ? NETWORK_URL[chainId]
    : new Error("Cannot find chain name");

interface TaskArgs {
  file: string;
  folder: string;
}

interface Airdrop {
  [address: string]: number;
}

export async function airdrop(
  taskArgs: TaskArgs,
  hre: HardhatRuntimeEnvironment
) {
  const file = taskArgs.file;
  const folder = taskArgs.folder;
  if (file === undefined) throw new Error("Require file name");
  const airdrop = JSON.parse(readFileSync(file, "utf8")) as Airdrop;
  const storage = new Storage("addresses.json");
  const mfs = new MFSWrapper();
  const { provider } = hre.ethers;
  const chainId = (await provider.getNetwork()).chainId;
  let amountFilesOnIPFS: number;
  try {
    amountFilesOnIPFS = (await mfs.ls(`/${folder}`)).length;
  } catch (e) {
    throw new Error("Folder does not exists");
  }

  const { blyat: blyatAddress } = storage.fetch(chainId);
  if (!blyatAddress) throw new Error("Need an address!");
  const Blyat = await hre.ethers.getContractFactory("Blyatversity");
  const blyat = Blyat.attach(blyatAddress);

  const totalSupply = (await blyat.totalSupply()).toNumber();
  const quantity = Object.values(airdrop).reduce((a, b) => a + b, 0);
  if (amountFilesOnIPFS < totalSupply + quantity)
    throw new Error("IPFS does not contain enough files for minting!");
  for (const address in airdrop) {
    const quantity = airdrop[address];
    const mint = await blyat.mint(address, quantity);
    console.log(
      `Attempting to mint ${quantity} NFT${
        quantity > 1 ? "s" : ""
      } for ${address}...`
    );
    await mint.wait();
    console.log(`${networkUrl(chainId)}/${mint.hash}`);
  }
}
