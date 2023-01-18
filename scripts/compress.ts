import { readFileSync, writeFileSync } from "fs";

const file = readFileSync("assets/Background/Flower.html", "utf-8");

const TABLE = ",-.0123456789ACHLQSTVZachlmqstvz"

const group = file.match(/<g>([\s\S]*)<\/g>/g) ?? []
console.log({ size: group.length })
const styleElemets = group.at(0)?.match(/<style>[\s\S]*<\/style>/g) ?? []
const pathElemets = group.at(0)?.match(/<path([\s\S]*)d="([\s\S]*)">/g) ?? []

console.log({ size: pathElemets })

// let BLOCK_SIZE = 8;
// const bytes = PATH.split("").map(c => TABLE.indexOf(c).toString(2).padStart(5, "0")).join("")
// let result = "";
// for (let start = 0; start < bytes.length; start += BLOCK_SIZE) {
//     const till = start + BLOCK_SIZE < bytes.length ? start + BLOCK_SIZE : bytes.length;
//     const block = bytes.slice(start, till).padEnd(BLOCK_SIZE, "0");
//     const c = String.fromCharCode(parseInt(block, 2));
//     result += c;
// }
// let compressedBytes = result.split("").map((v, i) => v.charCodeAt(0).toString(2).padStart(8, "0")).join("")
// compressedBytes = compressedBytes.slice(0, compressedBytes.length - compressedBytes.length % 5)
// BLOCK_SIZE = 5;
// result = "";
// for (let start = 0; start < compressedBytes.length; start += BLOCK_SIZE) {
//     const till = start + BLOCK_SIZE < compressedBytes.length ? start + BLOCK_SIZE : compressedBytes.length;
//     const block = compressedBytes.slice(start, till);
//     const c = TABLE[parseInt(block, 2)];
//     result += c;
// }