import { getAttribsFromFilename, getName } from "../util/metadata";
import { readFile, writeFile, readdir } from "fs/promises";

let lookup = {};

const NFT_TYPE = "";

async function preuploadMetadata(id: string) {
  const metadataTemplate = JSON.parse(
    await readFile("./data/metadatatemplate.json", { encoding: "utf-8" })
  );
  const cids = JSON.parse(
    await readFile(`./data/cids/image-ipfs-lookup-${id}.json`, {
      encoding: "utf-8",
    })
  );
  const artFiles = (await readdir("./data/art")).filter(
    (a) => !a.includes(".gitkeep")
  );
  const fakeLookup: Record<string, string> = {};
  artFiles.forEach((a) => (fakeLookup[a] = a));

  const lookuptableEntries = Object.entries(fakeLookup);

  const metadataArray: { data: Object; filename: string }[] = [];
  for (const artlookup of lookuptableEntries) {
    const metadataAttribs = getAttribsFromFilename(NFT_TYPE, artlookup[0]);
    const metadata = {
      ...metadataTemplate,
      image: `ipfs://${cids[artlookup[1]]}`,
      attributes: metadataAttribs,
      name: getName(NFT_TYPE, metadataAttribs, metadataTemplate),
    };
    metadataArray.push({ data: metadata, filename: artlookup[0] });
  }

  lookup = metadataArray;
}

let id = "";
if (process.argv.length >= 3) {
  id = process.argv[2];
} else {
  throw new Error("Missing id. Usage: prepare-metadata.ts <id>");
  process.exit(1);
}

preuploadMetadata(id)
  .then(() => {
    writeFile(`./data/metadata-${id}.json`, JSON.stringify(lookup));
  })
  .catch((err) => {
    console.log(err);
    writeFile(`./data/metadata-${id}.json`, JSON.stringify(lookup));
    process.exit(1);
  });
