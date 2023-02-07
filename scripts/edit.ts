import { readdirSync, readFileSync, writeFileSync } from "fs";

const ROOT_FOLDER = "assets/layers";
const layers = ["Layer_3"]; //readdirSync(ROOT_FOLDER)
for (const layer of layers) {
	const layerPath = `${ROOT_FOLDER}/${layer}`;
	const attributes = ["Monster_5"]; //readdirSync(layerPath);
	for (const attribute of attributes) {
		const files = readdirSync(`${layerPath}/${attribute}`);
		for (const fileName of files) {
			let file = readFileSync(`${layerPath}/${attribute}/${fileName}`, "utf8");
			const defsTag = file.match(/<defs([\s\S]*)defs>/g) ?? [];
			if (defsTag.length !== 1) continue;
			const styleClasses = [...new Set(defsTag[0].match(/\.[a-zA-Z]\S*[0-9]/g) ?? [])];
			for (let i = 0; i < styleClasses.length; i++) {
				const styleClass = styleClasses[i];
				const className = new RegExp(styleClass.replace(".", ""), "g");
				const newClassName = `${
					attribute.slice(0, 2) + attribute.slice(attribute.length - 2, attribute.length)
				}-${fileName.replace(".html", "").slice(0, 3)}-${i}`;
				file = file.replace(className, newClassName);
				writeFileSync(`${layerPath}/${attribute}/${fileName}`, file);
			}
		}
	}
}
