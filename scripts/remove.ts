import { readdirSync, readFileSync, writeFileSync } from "fs";

const ROOT_FOLDER = "assets";
const attributes = readdirSync(ROOT_FOLDER);
for (const attribute of attributes) {
    const files = readdirSync(`${ROOT_FOLDER}/${attribute}`)
    for (const fileName of files) {
        let file = readFileSync(`${ROOT_FOLDER}/${attribute}/${fileName}`, "utf8");
        const ids = file.match(/id=\"\S*\"/g) ?? []
        for(const id of ids){
            file = file.replace(id, "");
        }
        const dataNames = file.match(/data-name=\"\S*\"/g) ?? []
        for(const dataName of dataNames){
            file = file.replace(dataName, "");
        }
        const xmlns = file.match(/xmlns=\"\S*\"/g) ?? []
        for(const xml of xmlns){
            file = file.replace(xml, "");
        }
        const viewBox = file.match(/viewBox=\"(\s\S*)\"/g) ?? []
        for(const box of viewBox){
            file = file.replace(box, "");
        }
        writeFileSync(`${ROOT_FOLDER}/${attribute}/${fileName.replace(".svg", ".html")}`, file);
    }
}
