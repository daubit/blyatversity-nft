// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./IMetadataFactory.sol";
import "./lib/Base64.sol";
import "./lib/String.sol";

contract MetadataFactory is IMetadataFactory, AccessControl {
    using String for string;

    struct Variant {
        string name;
        string svg;
    }

    struct Attribute {
        string name;
        Variant[] variants;
    }

    struct TmpData {
        string name;
        string variantName;
        string svg;
    }

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    mapping(uint16 => Attribute) private _attribs;
    uint16 private _attribs_length = 0;

    string private _description;

    function setDescription(
        string memory description
    ) external onlyRole(DEFAULT_ADMINE_ROLE) {
        _description = description;
    }

    function collectData(
        bytes32 seed
    ) internal view returns (TmpData[] memory) {
        TmpData[] memory r = new TmpData[](_attribs_length);
        for (uint16 i; i < _attribs_length; i++) {
            Variant memory v = getVariant(i, seed);
            r[i] = TmpData({
                name: _attribs[i].name,
                variantName: v.name,
                svg: v.svg
            });
        }
        return r;
    }

    function getVariantIndex(bytes32 seed) internal view returns (uint16) {
        return 0;
    }

    function getVariant(
        uint16 index,
        bytes32 seed
    ) internal view returns (Variant memory) {
        return _attribs[index].variants[getVariantIndex(seed)];
    }

    function generateAttributes(
        TmpData[] memory d
    ) internal view returns (string memory) {
        string memory base = "[";
        for (uint16 i; i < d.length; i++) {
            string memory value = string('{"trait_type":"')
                .concat(d[i].name)
                .concat('","value":"')
                .concat(d[i].variantName)
                .concat('"}');
            base = base.concat(value);
            if (i < _attribs_length - 1) {
                base = base.concat(",");
            }
        }
        return base.concat("]");
    }

    function getName(TmpData[] memory d) internal view returns (string memory) {
        return "Bruh";
    }

    error NoSVG();

    function generateBase64Image(
        TmpData[] memory d
    ) public view returns (string memory) {
        return Base64.encode(bytes(generateImage(d)));
    }

    function generateImage(
        TmpData[] memory d
    ) internal view returns (string memory) {
        string
            memory base = "<svg xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' width='800' height='800' viewBox='0 0 800 800'>";
        for (uint16 i; i < d.length; i++) {
            string memory svg = d[i].svg;
            if (svg.equals("")) revert NoSVG();
            base = base.concat(svg);
        }
        base = base.concat("</svg>");
        return base;
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        bytes32 seed = keccak256(abi.encodePacked(tokenId));
        TmpData[] memory d = collectData(seed);
        string memory attributes = generateAttributes(d);
        string memory image = generateBase64Image(d);
        string memory name = getName(d);
        return
            Base64.encode(
                abi.encodePacked(
                    '{"name":"',
                    name,
                    '",',
                    '"description":"',
                    _description,
                    '",',
                    '"animation_url":"data:text/html;base64,',
                    image,
                    '",',
                    '"attributes":',
                    attributes,
                    "}"
                )
            );
    }
}
