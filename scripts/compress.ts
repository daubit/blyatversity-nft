import { readFileSync } from "fs";

const file = readFileSync("assets/Background/Flower.html", "utf-8");

let b = new Uint8Array([1])
b[0] = 42 << 2;
console.log(b[0])