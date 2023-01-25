import { readdirSync, readFileSync, writeFileSync } from "fs";

const ROOT_FOLDER = "assets";
const layers = readdirSync(ROOT_FOLDER)
const gradients = []
for (const layer of layers) {
    const layerPath = `${ROOT_FOLDER}/${layer}`
    const attributes = readdirSync(layerPath);
    for (const attribute of attributes) {
        const files = readdirSync(`${layerPath}/${attribute}`)
        for (const fileName of files) {
            let file = readFileSync(`${layerPath}/${attribute}/${fileName}`, "utf8");
            const gradient = file.match(/<(linear|radial)Gradient([\s\S]*)(linear|radial)Gradient>/g) ?? []
            for (const grad of gradient) {
                file = file.replace(grad, "");
            }
            gradients.push(...gradient)
            writeFileSync(`${layerPath}/${attribute}/${fileName}`, file, "utf8");
        }
    }

}
writeFileSync(`data/gradients.json`, JSON.stringify(gradients, null, 2));