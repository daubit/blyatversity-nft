import gradients from "../data/gradients.json"
import names from "../data/names.json"
import randomColor from "randomcolor"
import { mkdirSync, appendFileSync } from "fs"

type NameMap = { [id: string]: string }

const amount = 2;
// const gradientColors = gradients.map((gradient => gradient.match(/(#)([a-f]|[0-9]){6}/g)))
const getId = (gradient: string) => gradient.match(/id=\"(\S){10}\"/g)![0].replace(/(id=|\")/g, "")
const getVariant = (id: string) => id.match(/Mo_[0-9]/g)![0].replace("Mo", "Monster")
const template = (gradients: string) => `<defs>\n${gradients}\n</defs>`

for (const gradient of gradients) {
    for (let k = 0; k < amount; k++) {
        // const colors = randomColor({ count: classes.length })
        // const styles = classes.map((className, i) => `${className} {fill: ${colors[i]};}`).join("\n")
        const id = getId(gradient);
        const variant = getVariant(id);
        const name = (names as NameMap)[id]
        const gradientColors = gradient.match(/(#)([a-f]|[0-9]){6}/g)!
        let result = gradient
        for (const oldColor of gradientColors) {
            const random = randomColor();
            const newColors = randomColor({ hue: random, count: gradientColors.length ?? 0 })
            result = result.replace(oldColor, newColors[0])
        }
        mkdirSync(`styles/${variant}/${name}`, { recursive: true })
        appendFileSync(`styles/${variant}/${name}/style_${k}.html`, template(result))
    }
}