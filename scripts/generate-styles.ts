import classes from "../assets/Layer_4/_Styles/classes.json"
import randomColor from "randomcolor"
import { readFileSync } from "fs";
import parse from "node-html-parser";

const template = readFileSync("assets/Layer_4/_Styles/default.html", "utf8")
const $ = parse(template);
const style = $.firstChild.childNodes.find((node: any) => node.rawTagName === "style")
console.log(style?.toString())