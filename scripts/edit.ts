import { readdirSync, readFileSync, writeFileSync } from "fs";

const ROOT_FOLDER = "assets";
const attributes = readdirSync(ROOT_FOLDER);
for (const attribute of attributes) {
    const files = readdirSync(`${ROOT_FOLDER}/${attribute}`)
    for (const fileName of files) {
        let file = readFileSync(`${ROOT_FOLDER}/${attribute}/${fileName}`, "utf8");
        const defsTag = file.match(/<defs([\s\S]*)defs>/g) ?? []
        if (defsTag.length !== 1) throw new Error(defsTag.toString())
        const styleClasses = [...new Set(defsTag[0].match(/\.[a-zA-Z]\S*[0-9]/g) ?? [])]
        for (let i = 0; i < styleClasses.length; i++) {
            const styleClass = styleClasses[i];
            const className = new RegExp(styleClass.replace(".", ""), "g");
            console.log({ className })
            const newClassName = `${attribute}-${fileName.replace(".html", "")}-${i}`
            file = file.replace(className, newClassName);
            writeFileSync(`${ROOT_FOLDER}/${attribute}/${fileName}`, file);
        }
    }
}
