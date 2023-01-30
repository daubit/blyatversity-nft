import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs";

const RAW_ROOT = "assets/scripts";
const FINAL_ROOT = "assets/layers/Layer_4/_Scripts";

const files = readdirSync(RAW_ROOT);

if (!existsSync(FINAL_ROOT)) {
	mkdirSync(FINAL_ROOT);
}

let content = "";
for (const file of files) {
	content += readFileSync(`${RAW_ROOT}/${file}`);
}

writeFileSync(`${FINAL_ROOT}/scripts.html`, content);
