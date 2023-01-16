// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./IMetadataFactory.sol";
import "./Base64.sol";
import "./String.sol";

contract MetadataFactory is IMetadataFactory, AccessControl {
    using String for string;
    using Counters for Counters.Counter;

    Counters.Counter private _attrAmount;

    string private _description;
    // Id => Attribute
    mapping(uint256 => string) private _attributes;
    // Attribute => Variant
    mapping(string => string[]) private _variants;
    // Variant => svg
    mapping(string => string) private _svg;

    error NoSVG();

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function setDescription(
        string memory description
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _description = description;
    }

    function collectData(bytes32 seed) internal view returns (string[] memory) {
        string[] memory variants = new string[](_attrAmount.current());
        for (uint16 i; i < _attrAmount.current(); i++) {
            string memory variant = getVariant(i, seed);
            variants[i] = variant;
        }
        return variants;
    }

    function getVariant(
        uint16 index,
        bytes32 seed
    ) internal view returns (string memory) {
        string memory attribute = _indexedAttributes[index];
        uint randomIndex = uint16(
            uint(seed) % _attributes[attribute].variants.length
        );
        return _attributes[attribute].variants[randomIndex];
    }

    function addAddtribute(
        string memory attribute
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _attributes[attribute] = Attribute({
            name: attribute,
            variants: new string[](0)
        });
        _indexedAttributes[_attrAmount.current()];
        _attrAmount.increment();
    }

    function generateAttributes(
        Element[] memory variants
    ) internal view returns (string memory) {
        string memory base = "[";
        for (uint16 i; i < variants.length; i++) {
            string memory value = string('{"trait_type":"')
                .concat(variants[i].name)
                .concat('","value":"')
                .concat(variants[i].variant)
                .concat('"}');
            base = base.concat(value);
            if (i < _attrAmount.current() - 1) {
                base = base.concat(",");
            }
        }
        return base.concat("]");
    }

    function getName(
        Element[] memory variants
    ) internal pure returns (string memory) {
        string memory name = "";
        for (uint i; i < variants.length; i++) {
            name.concat(variants[i].name).concat(" ");
        }
        return name;
    }

    function generateBase64Image(
        string[] memory variants
    ) public view returns (string memory) {
        return Base64.encode(bytes(generateImage(variants)));
    }

    function generateImage(
        string[] memory variants
    ) internal view returns (string memory) {
        string
            memory base = "<svg xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' width='800' height='800' viewBox='0 0 800 800'>";
        for (uint16 i; i < variants.length; i++) {
            string memory svg = _svg[variants[i]];
            if (svg.equals("")) revert NoSVG();
            base = base.concat(svg);
        }
        base = base.concat("</svg>");
        return base;
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        bytes32 seed = keccak256(abi.encodePacked(tokenId));
        string[] memory variants = collectVariants(seed);
        string memory attributes = generateAttributes(variants);
        string memory image = generateBase64Image(variants);
        string memory name = getName(variants);
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
