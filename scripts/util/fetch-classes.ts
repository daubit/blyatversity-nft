import { readdirSync, readFileSync, writeFileSync } from "fs";

const ROOT_FOLDER = "assets/layers";
const layers = readdirSync(ROOT_FOLDER);
const classes = [];
for (const layer of layers) {
	const layerPath = `${ROOT_FOLDER}/${layer}`;
	const attributes = readdirSync(layerPath);
	for (const attribute of attributes) {
		const files = readdirSync(`${layerPath}/${attribute}`);
		for (const fileName of files) {
			let file = readFileSync(`${layerPath}/${attribute}/${fileName}`, "utf8");
			const defsTag = file.match(/<defs([\s\S]*)defs>/g) ?? [];
			if (defsTag.length !== 1) continue;
			const styleClasses = [...new Set(defsTag[0].match(/\.[a-zA-Z](\S*)-(\S*)[0-9]/g) ?? [])];
			for (let i = 0; i < styleClasses.length; i++) {
				const styleClass = styleClasses[i];
				classes.push(styleClass);
			}
		}
	}
}
writeFileSync(`data/classes.json`, JSON.stringify(classes, null, 2));
