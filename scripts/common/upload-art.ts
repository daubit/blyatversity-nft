import * as dotenv from "dotenv";
dotenv.config({ path: "./.env" });
import { chunk } from "lodash";
import { readdir, writeFile } from "fs/promises";
import { uploadFileToIPFS } from "../util/upload";
import { sleep } from "../util/utils";

const NUM_THREADS = 2;

let lookup = {};
let id: number | string = Date.now();

async function preuploadArt() {
  const _allPictures = await readdir("./data/art");
  const index = _allPictures.indexOf(".gitkeep");
  if (index > -1) {
    _allPictures.splice(index, 1);
  }
  const allPictures = _allPictures;
  console.log(`Pictures: ${allPictures.length}`);
  const chunckSize = Math.floor(allPictures.length / NUM_THREADS);
  const batch = chunk(allPictures, chunckSize);
  if (allPictures.length !== batch.flat().length) {
    throw new Error(`${allPictures.length} ${batch.flat().length}`);
  }

  const batchResult = await Promise.all(
    batch.map(async (arts) => {
      const batchLookup: Record<string, string> = {};
      for (const art of arts) {
        const ipfsArtUploadResult = await uploadFileToIPFS(`./data/art/${art}`);

        console.log(
          `Uploaded ${art} result: ${JSON.stringify(ipfsArtUploadResult)}`
        );

        if (ipfsArtUploadResult.IpfsHash) {
          batchLookup[art] = ipfsArtUploadResult.IpfsHash;
          console.log(
            `Uploaded ${art} to ipfs hash: ${ipfsArtUploadResult.IpfsHash}`
          );
          await sleep(500);
        } else {
          throw new Error(`there was an error uploading ${art} to ipfs.`);
        }
      }
      return batchLookup;
    })
  );
  lookup = Object.assign(lookup, ...batchResult);
}

if (process.argv.length >= 3) {
  id = process.argv[2];
}

preuploadArt()
  .then(() => {
    writeFile(
      `./data/cids/image-ipfs-lookup-${id}.json`,
      JSON.stringify(lookup)
    );
    console.log(
      `wrote cids to ./data/cids/image-ipfs-lookup-${id}.json ${
        Object.keys(lookup).length
      }`
    );
  })
  .catch((err) => {
    console.log(err);
    writeFile(
      `./data/cids/image-ipfs-lookup-${id}.json`,
      JSON.stringify(lookup)
    );
    console.log(`wrote cids to ./data/cids/image-ipfs-lookup-${id}.json`);
    process.exit(1);
  });
