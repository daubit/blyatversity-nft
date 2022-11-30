import { assert } from "console";
import { existsSync, readFileSync, writeFileSync } from "fs";

export interface AddressStorage {
  [contract: string]: string;
}

export interface ChainStorage {
  [network: number]: AddressStorage;
}

export class Storage {
  private path: string;
  private addresses: ChainStorage;

  constructor(filePath: string) {
    assert(filePath.length > 0, "No file path given!");
    this.addresses = {};
    this.path = filePath;
    if (!existsSync(filePath)) {
      console.log("Creating storage!")
      writeFileSync(this.path, JSON.stringify(this.addresses, null, 2));
    }
  }

  fetch(network: number) {
    this.addresses = JSON.parse(readFileSync(this.path, "utf8"));
    return this.addresses[network] || {};
  }

  save(network: number, addresses: AddressStorage) {
    this.addresses[network] = { ...this.addresses[network], ...addresses };
    const result = JSON.stringify(this.addresses, null, 2);
    writeFileSync(this.path, result);
  }
}
