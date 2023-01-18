let bytes = result.split("").map((v) => v.charCodeAt(0).toString(2).padStart(8, "0")).join("")
bytes = bytes.slice(0, bytes.length - bytes.length % 5)
let result = "";
for (let start = 0; start < bytes.length; start += 5) {
    const till = start + 5 < bytes.length ? start + 5 : bytes.length;
    const block = bytes.slice(start, till);
    const c = TABLE[parseInt(block, 2)];
    result += c;
}