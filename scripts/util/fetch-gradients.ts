import { readFileSync, writeFileSync } from "fs";
import parse from "node-html-parser";

const ROOT_FOLDER = "assets/layers/Layer_4/_Styles/grad_1.html";
const file = readFileSync(ROOT_FOLDER, "utf8");
const html = parse(file);
const gradients = html.firstChild.childNodes.filter((node) => node.nodeType !== 3).map((node) => node.toString());
writeFileSync(`data/gradients.json`, JSON.stringify(gradients, null, 2));
