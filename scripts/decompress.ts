export function decompressPath(data: string) {
    const PATH_TABLE = ",-.0123456789ACHLQSTVZachlmqstvz"
    let bytes = data.split("").map((v) => v.charCodeAt(0).toString(2).padStart(8, "0")).join("")
    bytes = bytes.slice(0, bytes.length - bytes.length % 5)
    let result = "";
    for (let start = 0; start < bytes.length; start += 5) {
        const till = start + 5 < bytes.length ? start + 5 : bytes.length;
        const block = bytes.slice(start, till);
        const c = PATH_TABLE[parseInt(block, 2)];
        result += c;
    }
    return result;
}

export function decompressPoints(data: string) {
    const POINTS_TABLE = " .0123456789"
    let bytes = data.split("").map((v) => v.charCodeAt(0).toString(2).padStart(8, "0")).join("")
    bytes = bytes.slice(0, bytes.length - bytes.length % 4)
    let result = "";
    for (let start = 0; start < bytes.length; start += 4) {
        const till = start + 4 < bytes.length ? start + 4 : bytes.length;
        const block = bytes.slice(start, till);
        const c = POINTS_TABLE[parseInt(block, 2)];
        result += c;
    }
    return result;
}

function main(layers: any) {
    // variable for the namespace 
    const svgns = "http://www.w3.org/2000/svg";
    for (const layer of layers) {
        const { groups } = layer;
        for (const group of groups) {
            for (const children of group) {
                const groupTag = document.createElementNS(svgns, "g");
                for (const child of children) {
                    const element = document.createElementNS(svgns, child.tagName);
                    if (child.tagName === "style") {
                        element.textContent = child.content
                    }
                    if (child.attributes.d) { child.attributes.d = decompressPath(child.attributes.d) }
                    if (child.attributes.points) { child.attributes.points = decompressPoints(child.attributes.points) }
                    for (const attribute in child.attributes) {
                        element.setAttribute(attribute, child.attributes[attribute])
                    }
                    groupTag.appendChild(element)
                }
                const svg = document.getElementsByTagName("svg")[0]
                svg.appendChild(groupTag)
            }
        }
    }
}
