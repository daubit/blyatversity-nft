import { PathLike, readdirSync, readFileSync, writeFileSync } from "fs";
import { minify } from "html-minifier";
import { encode } from "js-base64";
import { MetadataFactory } from "../../typechain-types";

export interface Variant {
	name: string;
	svg: string;
}

export default async function uploadAttribs(ROOT_FOLDER: PathLike, metadata: MetadataFactory) {
	const attributesFolder = readdirSync(ROOT_FOLDER);
	console.log("Adding attributes folder");
	const addAttributesTx = await metadata.addAttributes(attributesFolder);
	await addAttributesTx.wait();
	console.log("Added attributes folder");
	for (let i = 0; i < attributesFolder.length; i++) {
		console.log(`Adding attribute ${attributesFolder[i]}`);

		const attribute = attributesFolder[i];
		const attributeId = i + 1;
		const variants: Variant[] = readdirSync(`${ROOT_FOLDER}/${attribute}`).map((file) => ({
			name: file.replace(".html", ""),
			svg: minify(readFileSync(`${ROOT_FOLDER}/${attribute}/${file}`, "utf-8"), {
				collapseWhitespace: true,
				collapseBooleanAttributes: true,
				minifyCSS: true,
				minifyJS: true,
				removeComments: true,
				removeEmptyAttributes: true,
				removeRedundantAttributes: true,
				sortAttributes: true,
				sortClassName: true,
			}),
		}));

		for (const variant of variants) {
			const { svg, name } = variant;
			const chunkSize = 30_000;
			for (let start = 0; start < svg.length; start += chunkSize) {
				console.log(`Adding attribute ${attributesFolder[i]} chunk ${start}`);

				const till = start + chunkSize < svg.length ? start + chunkSize : svg.length;
				let svgChunk = svg.slice(start, till);
				while (svgChunk.length % 3 !== 0) {
					svgChunk += " ";
				}
				// writeFileSync(
				// 	`dist/${variant.name}-${start}.base64.txt`,
				// 	encodeURIComponent(encodeURIComponent(encode(svgChunk))),
				// 	"utf-8"
				// );

				const addVariantChunkedTx = await metadata.addVariantChunked(
					attributeId,
					name,
					encodeURIComponent(encodeURIComponent(encode(svgChunk)))
				);
				await addVariantChunkedTx.wait();
				console.log(`Added attribute ${attributesFolder[i]} chunk ${start}`);
			}
		}
		console.log(`Added attribute ${attributesFolder[i]}`);
	}
	console.log(`Setting Description`);
	const setDescriptionTx = await metadata.setDescription("Monster AG");
	await setDescriptionTx.wait();
	console.log(`Set Description`);
}
