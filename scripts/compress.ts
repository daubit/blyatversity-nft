import { readFileSync } from "fs";

const file = readFileSync("assets/Background/Flower.html", "utf-8");


const bin2String = (b: Uint8Array) => String.fromCharCode(parseInt(b.join(""), 2));

let b = new Uint8Array(8)
for (let i = 0; i < 8; i++) {
    // console.log(file.charCodeAt(0) >> i & 1)
    b[8 - i - 1] = file.charCodeAt(1) >> i & 1
}
console.log(b)
console.log(bin2String(b))