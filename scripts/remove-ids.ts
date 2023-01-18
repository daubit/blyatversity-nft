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
        writeFileSync(`${ROOT_FOLDER}/${attribute}/${fileName}`, file);
    }
}
