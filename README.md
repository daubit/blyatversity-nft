# Blyatversity NFT

Season NFTs deren Data vollkommen On-Chain sind.

Architektur:

-   ERC721 Contract, baut auf ERC721 auf, speichert zu jedem Token die Season. Bei tokenURI lookup wird an einen IMetadataFactory Contract für jede Season delegiert.
-   MetadataFactory enthält für die Atrribute der passenden SVG Grafiken und baut das NFT dann bei Bedarf zusammen.

# How to use:

Diese Contracts sind in einer generischeren Form hier zu finden: [https://www.npmjs.com/package/erc721-ocf](https://www.npmjs.com/package/erc721-ocf)
