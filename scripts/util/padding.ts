import { encode } from "js-base64";

export enum PadType {
	Svg,
	Script,
}

export function pad(content: string, type: PadType) {
	switch (type) {
		case PadType.Svg:
			return padSvg(content);
		case PadType.Script:
			return padScript(content);
		default:
			throw new Error(`Unknown PadType ${type}`);
	}
}

function padSvg(content: string) {
	return padAtSymbol(content, "<");
}

function padScript(content: string) {
	return padAtSymbol(content, ";");
}

function padAtSymbol(content: string, padSymbol: string) {
	if (!encode(content, false).endsWith("=")) {
		return content;
	}
	const padPoint = content.indexOf(padSymbol);
	if (padPoint === -1) {
		throw new Error(`Could not find paddpoint for ${padSymbol} in ${content}`);
	}
	const prePad = content.slice(0, padPoint);
	const postPadPad = content.slice(padPoint);
	let padding = "";
	while (encode(`${prePad}${padding}${postPadPad}`, false).endsWith("=")) {
		padding += " ";
	}
	return `${prePad}${padding}${postPadPad}`;
}
