/* eslint-disable node/no-missing-import */
// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import hardhat, { ethers } from "hardhat";
import { AddressStorage, Storage } from "../util/storage";
import { verify } from "../util/utils";
import { REGISTRY_ADDRESS } from "../util/const.json"

async function main() {
  const network = await ethers.provider.getNetwork();
  const { provider } = ethers;
  const chainId = (await provider.getNetwork()).chainId;
  const storage = new Storage("addresses.json");
  const addresses: AddressStorage = storage.fetch(network.chainId);
  const { onChain: hackBoiAddress, stringLib: stringLibAddress } = addresses
  // We get the contract to deploy
  if (!stringLibAddress) {
    const StringLib = await ethers.getContractFactory("String");
    const stringLib = await StringLib.deploy();
    await stringLib.deployed();
    addresses.stringLib = stringLib.address;
    console.log("Library deployed!")
  }
  if (!addresses.stringLib) throw new Error("Cannot find String Library!")
  if (!hackBoiAddress) {
    const Blyatversity = await ethers.getContractFactory("Blyatversity", { libraries: { String: addresses.stringLib } });
    const blyatversity = await Blyatversity.deploy(REGISTRY_ADDRESS);
    await blyatversity.deployed();
    addresses.onChain = blyatversity.address;
    console.log("Blyatversity deployed to:", blyatversity.address);
    console.log("Waiting for verification...");
    await verify(hardhat, blyatversity.address, chainId, [REGISTRY_ADDRESS]);
  }
  storage.save(network.chainId, addresses);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
