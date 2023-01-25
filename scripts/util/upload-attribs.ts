import { BigNumber } from "ethers";
import { PathLike, readdirSync, readFileSync, writeFileSync } from "fs";
import { minify } from "html-minifier";
import { encode } from "js-base64";
import { MetadataFactory, MetadataFactory__factory } from "../../typechain-types";

export interface Variant {
	name: string;
	svg: string;
}

export async function uploadAttributes(metadata: MetadataFactory, ROOT_FOLDER: PathLike) {
	//console.log("Adding attributes folder");
	const layers = readdirSync(ROOT_FOLDER)
	for (const layer of layers) {
		const attributes = readdirSync(`${ROOT_FOLDER}/${layer}`)
		const addAttributesTx = await metadata.addAttributes(attributes);
		await addAttributesTx.wait();
	}
	//console.log("Added attributes folder");
}

export async function uploadDescription(metadata: MetadataFactory, description: string) {
	//console.log(`Setting Description`);
	const setDescriptionTx = await metadata.setDescription(description);
	await setDescriptionTx.wait();
	//console.log(`Set Description`);
}


interface Options {
	layer: number;
	start: number;
	end: number;
}

export async function uploadVariants(metadata: MetadataFactory, ROOT_FOLDER: PathLike, options?: Options) {
	const layerId = options?.layer ?? 0;
	let layers = readdirSync(ROOT_FOLDER)
	if (layerId > 0) {
		const chosenLayer = layers.find(layer => layer.includes(layerId.toString()))
		layers = chosenLayer ? [chosenLayer] : layers;
	}
	let attributeId = 0;
	for (const layer of layers) {
		let attributeFolders = readdirSync(`${ROOT_FOLDER}/${layer}`);
		if (layerId) {
			attributeFolders = attributeFolders.slice(options?.start, options?.end)
		}
		for (let i = 0; i < attributeFolders.length; i++) {
			//console.log(`Adding attribute ${attributeFolders[i]}`);
			const attribute = attributeFolders[i];
			attributeId++;
			const variants: Variant[] = readdirSync(`${ROOT_FOLDER}/${layer}/${attribute}`).map((file) => ({
				name: file.replace(".html", ""),
				svg: minify(readFileSync(`${ROOT_FOLDER}/${layer}/${attribute}/${file}`, "utf-8"), {
					collapseWhitespace: true,
					collapseBooleanAttributes: true,
					minifyCSS: true,
					minifyJS: true,
					removeComments: true,
					removeEmptyAttributes: true,
					removeRedundantAttributes: true,
					sortAttributes: true,
					sortClassName: true,
					caseSensitive: true
				}),
			}));
			for (const variant of variants) {
				const { svg, name } = variant;
				const chunkSize = 30_000;
				for (let start = 0; start < svg.length; start += chunkSize) {
					// console.log(`Adding attribute ${attributeFolders[i]} variant ${name} chunk ${start}`);

					const till = start + chunkSize < svg.length ? start + chunkSize : svg.length;
					let svgChunk = svg.slice(start, till);
					while (encode(svgChunk, false).endsWith("=")) {
						svgChunk += " ";
					}
					const addVariantChunkedTx = await metadata.addVariantChunked(
						attributeId,
						name,
						encodeURIComponent(encode(svgChunk, false)),
						{ gasLimit: BigNumber.from(30_000_000) }
					);
					await addVariantChunkedTx.wait();
					// console.log(`Added attribute ${attributeId}, ${attributeFolders[i]} chunk ${start}`);
				}
			}
			// console.log(`Added attribute ${attributeFolders[i]}`);
		}
	}
}

export default async function uploadAll(metadata: MetadataFactory, ROOT_FOLDER: PathLike) {
	await uploadAttributes(metadata, ROOT_FOLDER);
	await uploadVariants(metadata, ROOT_FOLDER);
	await uploadDescription(metadata, "Monster AG");
}