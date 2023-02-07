import { readdirSync, readFileSync, writeFileSync } from "fs";
import parse from "node-html-parser";

const ROOT_FOLDER = "assets/layers";
const attributes = readdirSync(ROOT_FOLDER).filter((attribute) => attribute !== "_Style");
let styles = "";
for (const attribute of attributes) {
	const files = readdirSync(`${ROOT_FOLDER}/${attribute}`);
	for (const fileName of files) {
		const file = readFileSync(`${ROOT_FOLDER}/${attribute}/${fileName}`, "utf8");
		let html = parse(file);
		const group = html.firstChild.clone();
		const defs = group.childNodes.find((node: any) => node.rawTagName === "defs")!;
		if (!defs) continue;
		styles += defs.childNodes.map((node) => node.toString()).join("");
		console.log(group.childNodes);
		group.childNodes = group.childNodes.filter((node: any) => node.rawTagName !== "defs");
		html = html.exchangeChild(html.firstChild, group);
		writeFileSync(`${ROOT_FOLDER}/${attribute}/${fileName.replace(".svg", ".html")}`, html.toString());
	}
}
writeFileSync(`${ROOT_FOLDER}/_Style/default.html`, styles);
