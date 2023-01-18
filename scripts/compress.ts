import { readFileSync, writeFileSync } from "fs";

// const file = readFileSync("assets/Background/Flower.html", "utf-8");

const TABLE = ",-.0123456789ACHLQSTVZachlmqstvz"

const PATH =
    "m918.17,41.27c5.09,1.14,9.74,2.29,10.28,8.33.44,4.86-1.83,8.68-6.43,10.71-4.43,1.95-10.34,1.12-13.04-1.85-3.09-3.38-2.91-6.8.68-13.21-5.29-7.42-17.01-10.12-24.11-5.2-3.13,2.17-2.72,5.77-.02,7.69,3.69,2.62,8.08,4.28,12.23,6.23,1.1.52,2.41.58,3.63.86-.08.51-.15,1.02-.23,1.53-5.37-.56-10.75-1.12-16.32-1.7.23,1.89.53,4.27.69,5.57,6.12-1.05,12.3-2.11,18.49-3.17.11.56.21,1.11.32,1.67-3.27.99-6.64,1.75-9.8,3.02-6.25,2.51-6.76,7.03-1.45,11.17,7.34,5.71,17.6,1.37,19.52-8.07,1.85,3.69,3.23,7.97,5.85,11.26,2.37,2.99,5.78,5.61,9.28,7.15,5.04,2.21,8.98-1.34,8.26-6.76-.88-6.68-2.95-12.67-9.47-16.46,1.58.45,3.14.93,4.73,1.34,6.46,1.67,14.93-2.41,17.55-8.43,2.67-6.14-.82-11.47-7.39-10.71-4.02.46-7.91,1.93-11.71,2.9,1.98-3.15,4.87-6.36,6.11-10.11,1.18-3.56,1.47-7.88.63-11.51-1.2-5.17-5.78-6.38-10.12-3.13-4.93,3.69-8.9,8.08-8.17,14.99.19,1.8.03,3.64.03,5.9Z"

let BLOCK_SIZE = 8;
const bytes = PATH.split("").map(c => TABLE.indexOf(c).toString(2).padStart(5, "0")).join("")
let result = "";
for (let start = 0; start < bytes.length; start += BLOCK_SIZE) {
    const till = start + BLOCK_SIZE < bytes.length ? start + BLOCK_SIZE : bytes.length;
    const block = bytes.slice(start, till).padEnd(BLOCK_SIZE, "0");
    const c = String.fromCharCode(parseInt(block, 2));
    result += c;
}
let compressedBytes = result.split("").map((v, i) => v.charCodeAt(0).toString(2).padStart(8, "0")).join("")
compressedBytes = compressedBytes.slice(0, compressedBytes.length - compressedBytes.length % 5)
BLOCK_SIZE = 5;
result = "";
for (let start = 0; start < compressedBytes.length; start += BLOCK_SIZE) {
    const till = start + BLOCK_SIZE < compressedBytes.length ? start + BLOCK_SIZE : compressedBytes.length;
    const block = compressedBytes.slice(start, till);
    const c = TABLE[parseInt(block, 2)];
    result += c;
}