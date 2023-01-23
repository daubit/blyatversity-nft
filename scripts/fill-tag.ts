import { readdirSync, readFileSync, writeFileSync } from "fs";
import parse from "node-html-parser";

const ROOT_FOLDER = "assets";
const attributes = readdirSync(ROOT_FOLDER);
for (const attribute of attributes) {
    const files = readdirSync(`${ROOT_FOLDER}/${attribute}`)
    for (const fileName of files) {
        let file = readFileSync(`${ROOT_FOLDER}/${attribute}/${fileName}`, "utf8");
        file = parse(file).toString()
        writeFileSync(`${ROOT_FOLDER}/${attribute}/${fileName.replace(".svg", ".html")}`, file);
    }
}
