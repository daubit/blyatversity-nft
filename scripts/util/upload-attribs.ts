import { BigNumber } from "ethers";
import { PathLike, readdirSync, readFileSync } from "fs";
import { minify } from "html-minifier";
import { encode } from "js-base64";
// @ts-ignore
import { MetadataFactory } from "../../typechain-types";
import { wrapInCData } from "./cdata";
import { pad, PadType } from "./padding";
import data from "../data.json";

export interface Variant {
	name: string;
	svg: string;
}

interface Options {
	layer?: number;
	start?: number;
	end?: number;
	startid?: number;
}

export async function uploadAttributes(metadata: MetadataFactory, ROOT_FOLDER: PathLike) {
	//console.log("Adding attributes folder");
	const layers = readdirSync(ROOT_FOLDER);
	for (const layer of layers) {
		const attributes = readdirSync(`${ROOT_FOLDER}/${layer}`);
		const addAttributesTx = await metadata.addAttributes(attributes);
		await addAttributesTx.wait();
	}
	console.log("Added attributes folder");
}

export async function uploadDescription(metadata: MetadataFactory, description: string) {
	//console.log(`Setting Description`);
	const setDescriptionTx = await metadata.setDescription(description);
	await setDescriptionTx.wait();
	//console.log(`Set Description`);
}
export async function uploadStyles(
	metadata: MetadataFactory,
	rootFolder: PathLike,
	options?: Options
) {
	const layerId = options?.layer ?? 0;
	let attributeId = options?.startid ?? 0;
	let attributes = readdirSync(rootFolder);
	if (layerId > 0) {
		const chosenLayer = attributes.find((attribute) => attribute.includes(layerId.toString()));
		attributes = chosenLayer ? [chosenLayer] : attributes;
	}
	for (const attribute of attributes) {
		const variants = readdirSync(`${rootFolder}/${attribute}`).slice(options?.start, options?.end);
		console.log(variants);
		for (const variant of variants) {
			// console.log(`Adding attribute ${attribute}`);
			const stylePath = `${rootFolder}/${attribute}/${variant}`;
			const styles: string[] = readdirSync(stylePath).map((file) =>
				minify(readFileSync(`${stylePath}/${file}`, "utf-8"), {
					collapseWhitespace: true,
					collapseBooleanAttributes: true,
					minifyCSS: true,
					minifyJS: true,
					removeComments: false,
					removeEmptyAttributes: true,
					removeRedundantAttributes: true,
					sortAttributes: true,
					sortClassName: true,
					caseSensitive: true,
				})
			);
			for (const style of styles) {
				const chunkSize = 30_000;
				for (let start = 0; start < style.length; start += chunkSize) {
					console.log(`Adding style for ${attributeId} ${variant} chunk ${start}`);
					const till = start + chunkSize < style.length ? start + chunkSize : style.length;
					let styleChunk = pad(style.slice(start, till), PadType.Svg);
					const addStyleChunkedTx = await metadata.addStyleChunked(
						attributeId,
						variant,
						encodeURIComponent(encode(styleChunk, false))
					);
					await addStyleChunkedTx.wait();
					console.log(`Added style for ${attributeId}, ${attribute} chunk ${start}`);
				}
			}
		}
		attributeId++;
		console.log(`Added attribute ${attribute}`);
	}
}

export async function uploadVariants(metadata: MetadataFactory, ROOT_FOLDER: PathLike, options?: Options) {
	const layerId = options?.layer ?? 0;
	let layers = readdirSync(ROOT_FOLDER);
	if (layerId > 0) {
		const chosenLayer = layers.find((layer) => layer.includes(layerId.toString()));
		layers = chosenLayer ? [chosenLayer] : layers;
	}
	let attributeId = options?.startid ?? 0;
	for (const layer of layers) {
		let attributeFolders = readdirSync(`${ROOT_FOLDER}/${layer}`);
		if (layerId) {
			attributeFolders = attributeFolders.slice(options?.start, options?.end);
		}
		// console.log(`Uploading from ${layer}`)
		for (let i = 0; i < attributeFolders.length; i++) {
			// console.log(`Adding attribute ${attributeFolders[i]}`);
			const attribute = attributeFolders[i];
			attributeId++;
			const variants: Variant[] = readdirSync(`${ROOT_FOLDER}/${layer}/${attribute}`).map((file) => ({
				name: file.replace(".html", ""),
				svg: minify(readFileSync(`${ROOT_FOLDER}/${layer}/${attribute}/${file}`, "utf-8"), {
					collapseWhitespace: true,
					collapseBooleanAttributes: true,
					minifyCSS: true,
					minifyJS: true,
					removeComments: false,
					removeEmptyAttributes: true,
					removeRedundantAttributes: true,
					sortAttributes: true,
					sortClassName: true,
					caseSensitive: true,
				}),
			}));
			const padType = attribute.includes("_Scripts") ? PadType.Script : PadType.Svg;

			for (const variant of variants) {
				let { svg, name } = variant;
				if (attribute === "_Scripts") {
					svg = wrapInCData(svg);
				}
				const chunkSize = 10_000;
				for (let start = 0; start < svg.length; start += chunkSize) {
					const till = start + chunkSize < svg.length ? start + chunkSize : svg.length;
					const svgChunk = pad(svg.slice(start, till), padType);
					const addVariantChunkedTx = await metadata.addVariantChunked(
						attributeId,
						name,
						encodeURIComponent(encode(svgChunk, false))
					);
					await addVariantChunkedTx.wait();
					// console.log(`Added attribute ${attributeId}, ${attributeFolders[i]} chunk ${start}`);
				}
				console.log(`Added variant ${name}`)
			}
			console.log(`Added attribute ${attributeFolders[i]}`);
		}
	}
}

export default async function uploadAll(metadata: MetadataFactory, ROOT_FOLDER: PathLike, options?: Options) {
	await uploadAttributes(metadata, ROOT_FOLDER);
	await uploadVariants(metadata, ROOT_FOLDER, options);
	// 5 ist die Id für das Monster_1 Attribut
	await uploadStyles(metadata, "assets/styles", { startid: 5 });
	await uploadDescription(metadata, encodeURIComponent(data.description));
}
