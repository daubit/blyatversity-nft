/* eslint-disable node/no-missing-import */
// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import hardhat, { ethers } from "hardhat";
import { AddressStorage, Storage } from "../util/storage";
import { verify } from "../util/utils";
import { REGISTRY_ADDRESS, FOLDER_CID, CONTRACT_METADATA_CID } from "../util/const.json"

async function main() {
  const network = await ethers.provider.getNetwork();
  const { provider } = ethers;
  const chainId = (await provider.getNetwork()).chainId;
  const storage = new Storage("addresses.json");
  let { blyat: blyatAddress } = storage.fetch(network.chainId);
  const addresses: AddressStorage = {};
  // We get the contract to deploy
  if (!blyatAddress) {
    const Blyat = await ethers.getContractFactory("Blyatversity");
    const blyat = await Blyat.deploy(FOLDER_CID, CONTRACT_METADATA_CID, REGISTRY_ADDRESS);
    await blyat.deployed();
    addresses.blyat = blyat.address;
    console.log("Blyat deployed to:", blyat.address);
    console.log("Waiting for verification...");
    await verify(hardhat, blyat.address, chainId, [FOLDER_CID, CONTRACT_METADATA_CID, REGISTRY_ADDRESS]);
  }
  storage.save(network.chainId, addresses);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
