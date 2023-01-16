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
    // Variant => Attribute
    mapping(string => string) private _variantKind;
    // Variant => svg
    mapping(string => string) private _svgs;

    error NoSVG();
    error UnequalArrays();

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function setDescription(
        string memory description
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _description = description;
    }

    function collectVariants(
        bytes32 seed
    ) internal view returns (string[] memory) {
        string[] memory variants = new string[](_attrAmount.current());
        for (uint256 i; i < _attrAmount.current(); i++) {
            string memory attribute = _attributes[i];
            uint randomIndex = uint16(uint(seed) % _variants[attribute].length);
            variants[i] = _variants[attribute][randomIndex];
        }
        return variants;
    }

    function addVariants(
        uint256 attributeId,
        string[] memory variants,
        string[] memory svgs
    ) external {
        if (variants.length != svgs.length) revert UnequalArrays();
        string memory attribute = _attributes[attributeId];
        for (uint i; i < variants.length; i++) {
            _variants[attribute].push(variants[i]);
            _svgs[variants[i]] = svgs[i];
            _variantKind[variants[i]] = attribute;
        }
    }

    function addAttribute(
        string memory attribute
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _attributes[_attrAmount.current()] = attribute;
        _attrAmount.increment();
    }

    function addAttributes(
        string[] memory attributes
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        for (uint i; i < attributes.length; i++) {
            this.addAttribute(attributes[i]);
        }
    }

    function generateAttributes(
        string[] memory variants
    ) internal view returns (string memory) {
        string memory base = "[";
        for (uint16 i; i < variants.length; i++) {
            string memory attribute = _variantKind[variants[i]];
            string memory value = string('{"trait_type":"')
                .concat(attribute)
                .concat('","value":"')
                .concat(variants[i])
                .concat('"}');
            base = base.concat(value);
            if (i < _attrAmount.current() - 1) {
                base = base.concat(",");
            }
        }
        return base.concat("]");
    }

    function getName(
        string[] memory variants
    ) internal pure returns (string memory) {
        string memory name = "";
        for (uint i; i < variants.length; i++) {
            name.concat(variants[i]).concat(" ");
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
            string memory svg = _svgs[variants[i]];
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
