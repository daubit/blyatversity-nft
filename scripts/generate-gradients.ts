import gradients from "../data/gradients.json"
import randomColor from "randomcolor"
import { writeFileSync } from "fs"

const gradientColors = gradients.map((gradient => gradient.match(/(#)([a-f]|[0-9]){6}/g)))
const template = (gradients: string) => `<defs>\n${gradients}\n</defs>`
// const colors = randomColor({ count: classes.length })
// const styles = classes.map((className, i) => `${className} {fill: ${colors[i]};}`).join("\n")
const genGradients = gradients.map((gradient, i) => {
    const random = randomColor();
    const newColors = randomColor({ hue: random, count: gradientColors[i]?.length ?? 0 })
    let result = gradient
    for (let j = 0; j < gradientColors[i]?.length!; j++) {
        const oldColor = gradientColors[i]![j];
        result = result.replace(oldColor, newColors[j])
    }
    return result;
}).join("")

writeFileSync("assets/Layer_4/_Styles/grad_1.html", template(genGradients))