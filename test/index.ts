import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { Blyatversity, MetadataFactory } from "../typechain-types";
import CONST from "../scripts/util/const.json";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { readdirSync, readFileSync, writeFileSync } from "fs";
import { minify } from "html-minifier";
import { encode } from "js-base64";

const { REGISTRY_ADDRESS, CONTRACT_METADATA_CID, ADMIN_ROLE } = CONST;

describe("Blyatversity", function () {
	let blyat: Blyatversity;
	let metadata: MetadataFactory;
	let admin: SignerWithAddress;
	let userA: SignerWithAddress;
	before(async () => {
		const StringLib = await ethers.getContractFactory("String");
		const stringLib = await StringLib.deploy();
		await stringLib.deployed();
		const Blyat = await ethers.getContractFactory("Blyatversity");
		const Metadata = await ethers.getContractFactory("MetadataFactory", {
			libraries: { String: stringLib.address },
		});
		blyat = (await upgrades.deployProxy(Blyat, [CONTRACT_METADATA_CID, REGISTRY_ADDRESS])) as Blyatversity;
		metadata = (await Metadata.deploy()) as MetadataFactory;
		await blyat.deployed();

		const signers = await ethers.getSigners();
		admin = signers[0];
		userA = signers[1];
	});
	describe("Deployment", function () {
		// it("should have contract cid", async () => {
		// 	const cid = await blyat.contractCID()
		// 	expect(cid).equals(`ipfs://${CONTRACT_METADATA_CID}`);
		// })
		it("should have admin", async () => {
			const hasRole = await blyat.hasRole(ADMIN_ROLE, admin.address);
			expect(hasRole).to.be.true;
		});
	});
	describe("NFT", function () {
		describe("Adding Itmes", () => {
			it("should be should to add an unlimited item", async () => {
				const addTx = await blyat["addItem(address)"](metadata.address);
				await addTx.wait();
				const maxSupply = await blyat.getItemMaxSupply(1);
				expect(maxSupply.toNumber()).to.be.equal(0);
			});
			it("should be should to add an limited item", async () => {
				const addTx = await blyat["addItem(address,uint256)"](metadata.address, 3);
				await addTx.wait();
				const maxSupply = await blyat.getItemMaxSupply(2);
				expect(maxSupply.toNumber()).to.be.equal(3);
			});
			it("should be NOT able for user to add an limited item", async () => {
				const addTx = blyat.connect(userA)["addItem(address,uint256)"](metadata.address, 3);
				expect(addTx).to.be.reverted;
			});
			it("should be NOT able for user to add an unlimited item", async () => {
				const addTx = blyat.connect(userA)["addItem(address)"](metadata.address);
				expect(addTx).to.be.reverted;
			});
		});
		describe("Mint", () => {
			it("should be able to mint unlimited", async () => {
				await blyat.mint(1, userA.address);
				const balance = await blyat.balanceOf(userA.address);
				const itemId = await blyat.getItem(0);
				expect(balance.toNumber()).to.be.equal(1);
				expect(itemId.toNumber()).to.be.equal(1);
			});
			it("should be able to mint limited", async () => {
				await blyat.mint(1, userA.address);
				const balance = await blyat.balanceOf(userA.address);
				const itemId = await blyat.getItem(0);
				expect(balance.toNumber()).to.be.equal(2);
				expect(itemId.toNumber()).to.be.equal(1);
			});
			it("should NOT able for user to mint", async () => {
				const mintTx = blyat.mint(1, userA.address, { from: userA.address });
				expect(mintTx).to.be.reverted;
			});
		});
		describe("Burn", () => {
			it("should be able to burn", async () => {
				const burnTx = await blyat.connect(userA).burn(0);
				await burnTx.wait();
				const balance = await blyat.balanceOf(userA.address);
				expect(balance.toNumber()).to.be.equal(1);
			});
			it("should NOT be able for user to burn", async () => {
				const burnTx = blyat.burn(1, { from: userA.address });
				expect(burnTx).to.be.reverted;
			});
		});
	});
	describe("Lock Period", function () {
		describe("should restrain items from transfer", function () {
			const fiveMinPeriod = Date.now() + 1000 * 60 * 5;
			it("should have a correct setup", async () => {
				const addItemTx = await blyat["addItem(address)"](metadata.address);
				await addItemTx.wait();
				const lockTx = await blyat.setLockPeriod(3, fiveMinPeriod);
				await lockTx.wait();
				const mintTx = await blyat.mint(3, userA.address);
				await mintTx.wait();
				const balanceUser = await blyat.balanceOf(userA.address);
				const balanceAdmin = await blyat.balanceOf(admin.address);
				expect(balanceUser.toNumber()).to.be.equal(2, "User balance is incorrect!");
				expect(balanceAdmin.toNumber()).to.be.equal(0, "Admin balance is incorrect!");
			});
			it("should NOT be able to transfer", async () => {
				const transferTx = blyat.connect(userA).transferFrom(userA.address, admin.address, 0);
				expect(transferTx).to.be.reverted;
			});
			it("should be able to transfer now", async () => {
				await time.increaseTo(fiveMinPeriod);
				const transferTx = await blyat.connect(userA).transferFrom(userA.address, admin.address, 1);
				await transferTx.wait();
				const balance = await blyat.balanceOf(admin.address);
				expect(balance.toNumber()).to.be.equal(1);
			});
		});
	});
	describe("Metadata", () => {
		describe("Setup", function () {
			it("should upload data", async function () {
				interface Variant {
					name: string;
					svg: string;
				}
				const ROOT_FOLDER = "assets";
				const attributesFolder = readdirSync(ROOT_FOLDER);
				const addAttributesTx = await metadata.addAttributes(attributesFolder);
				await addAttributesTx.wait();

				for (let i = 0; i < attributesFolder.length; i++) {
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
						writeFileSync(`${variant.name}.txt`, variant.svg, "utf-8");

						const { svg, name } = variant;
						const chunkSize = 30_000;
						for (let start = 0; start < svg.length; start += chunkSize) {
							const till = start + chunkSize < svg.length ? start + chunkSize : svg.length;
							let svgChunk = svg.slice(start, till);
							while (svgChunk.length % 3 !== 0) {
								console.log(`Add padding ${svgChunk.length % 4} to ${variant.name}-${start}`);
								svgChunk += " ";
							}
							//writeFileSync(`${variant.name}-${start}.base64.txt`, encode(svgChunk), "utf-8");
							//writeFileSync(`${variant.name}-${start}.txt`, svgChunk, "utf-8");
							const addVariantChunkedTx = await metadata.addVariantChunked(
								attributeId,
								name,
								encode(svgChunk),
								{
									gasLimit: 30_000_000,
								}
							);
							await addVariantChunkedTx.wait();
						}
					}
				}
				const setDescriptionTx = await metadata.setDescription("Monster AG");
				await setDescriptionTx.wait();
			});
		});
		describe("TokenURI", () => {
			it("should return the corrent token URI", async function () {
				const tokenURI = await blyat.tokenURI(0);
				writeFileSync("dist/token-0.txt", tokenURI, "utf-8");
			});
		});
	});
});
