import classes from "../../data/classes.json";
import randomColor from "randomcolor";
import { writeFileSync } from "fs";

const template = (innerText: string, gradients: string) => `<defs><style>${innerText}</style>${gradients}</defs>`;
const colors = randomColor({ count: classes.length });
const styles = classes.map((className, i) => `${className} {fill: ${colors[i]};}`).join("\n");
writeFileSync("assets/layers/Layer_4/_Styles/var_1.html", template(styles, ""));
