import { readdirSync, readFileSync, writeFileSync } from "fs";
import parse from "node-html-parser";

const ROOT_FOLDER = "assets";
const attributes = readdirSync(ROOT_FOLDER).filter(attribute => attribute !== "styles");
let styles = "";
for (const attribute of attributes) {
    const files = readdirSync(`${ROOT_FOLDER}/${attribute}`)
    for (const fileName of files) {
        const file = readFileSync(`${ROOT_FOLDER}/${attribute}/${fileName}`, "utf8");
        let html = parse(file);
        const group = html.firstChild.clone();
        const defs = group.childNodes.find((node: any) => node.rawTagName === "defs")!
        if (!defs) continue;
        styles += defs.childNodes.map(node => node.toString()).join("");
        group.childNodes = group.childNodes.filter((node: any) => node.rawTagName !== "defs")
        html.exchangeChild(html.firstChild, group);
        writeFileSync(`${ROOT_FOLDER}/${attribute}/${fileName.replace(".svg", ".html")}`, file);
    }
}
writeFileSync(`${ROOT_FOLDER}/_styles/default.html`, styles);
