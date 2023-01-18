import { existsSync, mkdirSync, readdir, readdirSync, readFileSync, writeFileSync } from "fs";
import { parse } from "node-html-parser"

const PATH_TABLE = ",-.0123456789ACHLQSTVZachlmqstvz"
const POINTS_TABLE = " .0123456789"

export function compressPath(data: string) {
    const BLOCK_SIZE = 8;
    const bytes = data.split("").map(c => PATH_TABLE.indexOf(c).toString(2).padStart(5, "0")).join("")
    let result = "";
    for (let start = 0; start < bytes.length; start += BLOCK_SIZE) {
        const till = start + BLOCK_SIZE < bytes.length ? start + BLOCK_SIZE : bytes.length;
        const block = bytes.slice(start, till).padEnd(BLOCK_SIZE, "0");
        const c = String.fromCharCode(parseInt(block, 2));
        result += c;
    }
    return result;
}

export function compressPoints(data: string) {
    const BLOCK_SIZE = 8;
    const bytes = data.split("").map(c => POINTS_TABLE.indexOf(c).toString(2).padStart(4, "0")).join("")
    let result = "";
    for (let start = 0; start < bytes.length; start += BLOCK_SIZE) {
        const till = start + BLOCK_SIZE < bytes.length ? start + BLOCK_SIZE : bytes.length;
        const block = bytes.slice(start, till).padEnd(BLOCK_SIZE, "0");
        const c = String.fromCharCode(parseInt(block, 2));
        result += c;
    }
    return result;
}

function main() {
    const ROOT_FOLDER = "assets";
    const attributes = readdirSync(ROOT_FOLDER);
    for (const attribute of attributes) {
        const files = readdirSync(`${ROOT_FOLDER}/${attribute}`);
        for (const fileName of files) {
            const file = readFileSync(`${ROOT_FOLDER}/${attribute}/${fileName}`, "utf-8");
            const groupTag = parse(file).childNodes[0]
            const elements = groupTag.childNodes.filter((n) => n.nodeType !== 3)
            const result = []
            for (const element of elements) {
                const attributes = (element as any).attributes as { class?: string, d?: string, points?: string };
                const compElement: any = {};
                compElement.attributes = JSON.parse(JSON.stringify(attributes));
                if (attributes.d) {
                    compElement.attributes.d = compressPath(attributes.d)
                }
                if (attributes.points) {
                    compElement.attributes.points = compressPoints(attributes.points);
                }
                compElement.tagName = (element as any).rawTagName
                if (compElement.tagName === "style") {
                    compElement.content = element.textContent
                }
                result.push(compElement);
            }
            const cFile = JSON.stringify({ tagName: "g", children: result }, null, 2)
            if (!existsSync(`tmp/${ROOT_FOLDER}/${attribute}`)) {
                mkdirSync(`tmp/${ROOT_FOLDER}/${attribute}`)
            }
            writeFileSync(`tmp/${ROOT_FOLDER}/${attribute}/${fileName.replace(".html", ".json")}`, cFile);
        }
    }
}

main();
