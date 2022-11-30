/* eslint-disable node/no-missing-import */
// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import hardhat, { ethers } from "hardhat";
import { AddrStorage, Storage } from "../util/storage";
import { verify } from "../util/utils";

async function main() {
  const network = await ethers.provider.getNetwork();
  const { provider } = ethers;
  const chainId = (await provider.getNetwork()).chainId;
  const storage = new Storage("addresses.json");
  let { lock: lockAddress } = storage.fetch(network.chainId);
  const addresses: AddrStorage = {};
  // We get the contract to deploy
  if (!lockAddress) {
    const LOCK = await ethers.getContractFactory("Lock");
    const lock = await LOCK.deploy();
    await lock.deployed();
    addresses.lock = lock.address;
    lockAddress = lock.address;
    console.log("Lock deployed to:", lock.address);

    console.log("Waiting for verification...");
    await verify(hardhat, lock.address, chainId);
  }
  storage.save(network.chainId, addresses);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
