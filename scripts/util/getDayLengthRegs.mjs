import { readFileSync, writeFileSync } from "fs";
import { readFile } from "fs/promises";
import pkg from "lodash";
const { sum, chunk } = pkg;
import PolynomialRegression from "./reg/PolynomialRegression.mjs";

function parseDate(x) {
	const split = x.split(":");
	return parseInt(split[0]) * 60 * 60 + parseInt(split[1]) * 60 + parseInt(split[2]);
}

async function main() {
	writeFileSync(
		"out.json",
		JSON.stringify(
			readFileSync("astro-202301-202312.csv", { encoding: "utf8" })
				.split("\n")
				.filter((x, i) => i > 0 && x.length > 0)
				.map((x) => x.split(";"))
				.map((x) => {
					return {
						dayStart: parseDate(x[1]),
						dayLength: parseDate(x[3]),
					};
				})
		)
	);
	writeFileSync(
		"out2.json",
		JSON.stringify(
			chunk(
				readFileSync("astro-202301-202312.csv", { encoding: "utf8" })
					.split("\n")
					.filter((x, i) => i > 0 && x.length > 0)
					.map((x) => x.split(";"))
					.map((x) => {
						return {
							dayStart: parseDate(x[1]),
							dayLength: parseDate(x[3]),
						};
					}),
				7
			)
				.map((x) => {
					return {
						dayStart: Math.round(sum(x.map((x) => x.dayStart)) / x.length),
						dayLength: Math.round(sum(x.map((x) => x.dayLength)) / x.length),
					};
				})
				.map((x) => {
					const model = PolynomialRegression.read(
						[
							{ x: 0, y: 0 },
							{ x: x.dayLength / 2, y: 1 },
							{ x: x.dayLength, y: 0 },
						],
						2
					);
					const terms = model.getTerms();
					return {
						s: x.dayStart,
						c: terms[0],
						b: terms[1],
						a: terms[2],
					};
				})
				.map((x) => [x.s, x.a, x.b, x.c])
		)
	);
}

main().then(() => console.log("done"));

/*
				.map((x) => [
					{ x: 0, y: 0 },
					{ x: x / 2, y: 1 },
					{ x: x, y: 0 },
				])
				.map((x) => {
					;
					return model.getTerms();
				})
*/
