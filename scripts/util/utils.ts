import { HardhatRuntimeEnvironment } from "hardhat/types";

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const NETWORK_NAME: { [chainId: number]: string } = {
  80001: "mumbai",
  137: "polygon",
  1337: "development",
};

export const networkName = (chainId: number) =>
  NETWORK_NAME[chainId]
    ? NETWORK_NAME[chainId]
    : new Error("Cannot find chain name");

export const verify = async (
  hardhat: HardhatRuntimeEnvironment,
  adddress: string,
  chainId: number,
  params?: unknown[]
) => {
  if ([80001, 137, 1337].includes(chainId)) {
    await sleep(60 * 1000);
    hardhat.run("verify", {
      address: adddress,
      network: networkName(chainId),
      constructorArgsParams: params ?? [],
    });
  } else {
    console.log(`Cannot verify for ChainId ${chainId}`);
  }
};
