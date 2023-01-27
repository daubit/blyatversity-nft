import { readdirSync, readFileSync, writeFileSync } from "fs";
import parse from "node-html-parser";

const ROOT_FOLDER = "assets/layers";
const layers = ["tmp"]; //readdirSync(ROOT_FOLDER);
for (const layer of layers) {
	const layerPath = `${ROOT_FOLDER}/${layer}`;
	const attributes = readdirSync(layerPath);
	for (const attribute of attributes) {
		const files = readdirSync(`${layerPath}/${attribute}`);
		for (const fileName of files) {
			let file = readFileSync(`${layerPath}/${attribute}/${fileName}`, "utf8");
			file = parse(file).toString();
			writeFileSync(`${layerPath}/${attribute}/${fileName.replace(".svg", ".html")}`, file);
		}
	}
}
