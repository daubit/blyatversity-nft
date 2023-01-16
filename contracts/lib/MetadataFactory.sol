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

    Counters.Counter private _attributeCounter;

    string private _description;
    // Id => Attribute
    mapping(uint256 => string) private _attributes;
    // AttributeId => Id => Variant
    mapping(uint256 => mapping(uint256 => string)) private _variants;
    // Variant => Id
    mapping(string => Counters.Counter) private _indexedVariants;
    // AttributeId => Variant Amount
    mapping(uint256 => Counters.Counter) private _variantCounter;
    // VariantId => Attribute
    mapping(uint256 => string) private _variantKind;
    // VariantId => svg
    mapping(uint256 => string) private _svgs;

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
        string[] memory variants = new string[](_attributeCounter.current());
        for (
            uint256 attributeId;
            attributeId < _attributeCounter.current();
            attributeId++
        ) {
            uint variantAmount = _variantCounter[attributeId].current();
            uint randomIndex = uint16(uint(seed) % variantAmount);
            variants[attributeId] = _variants[attributeId][randomIndex];
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
            string memory variant = variants[i];
            uint variantId = _indexedVariants[variant].current();
            if (variantId == 0) {
                _variantCounter[attributeId].increment();
                variantId = _indexedVariants[variant].current();
                _variants[attributeId][variantId] = variant;
                _svgs[variantId] = svgs[i];
                _variantKind[variantId] = attribute;
            }
        }
    }

    function setVariant(
        uint256 attributeId,
        string memory variant,
        string memory svg
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint variantId = _indexedVariants[variant].current();
        if (variantId == 0) {
            _variantCounter[attributeId].increment();
            variantId = _indexedVariants[variant].current();
            _variants[attributeId][variantId] = variant;
            string memory attribute = _attributes[attributeId];
            _variantKind[variantId] = attribute;
        }
        _svgs[variantId] = svg;
    }

    function addVariantChunked(
        uint attributeId,
        string memory variant,
        string memory svgChunk
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint variantId = _indexedVariants[variant].current();
        if (variantId == 0) {
            _variantCounter[attributeId].increment();
            variantId = _indexedVariants[variant].current();
            _variants[attributeId][variantId] = variant;
            string memory attribute = _attributes[attributeId];
            _variantKind[variantId] = attribute;
        }
        _svgs[variantId].concat(svgChunk);
    }

    function addAttribute(
        string memory attribute
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _attributes[_attributeCounter.current()] = attribute;
        _attributeCounter.increment();
    }

    function addAttributes(
        string[] memory attributes
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        for (uint i; i < attributes.length; i++) {
            _attributes[_attributeCounter.current()] = attributes[i];
            _attributeCounter.increment();
        }
    }

    function generateAttributes(
        string[] memory variants
    ) internal view returns (string memory) {
        string memory base = "[";
        for (uint16 i; i < variants.length; i++) {
            uint variantId = _indexedVariants[variants[i]].current();
            string memory attribute = _variantKind[variantId];
            string memory value = string('{"trait_type":"')
                .concat(attribute)
                .concat('","value":"')
                .concat(variants[i])
                .concat('"}');
            base = base.concat(value);
            if (i < _attributeCounter.current() - 1) {
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
            memory base = "<svg xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' width='1000' height='1000' viewBox='0 0 1000 1000'>";
        for (uint16 i; i < variants.length; i++) {
            uint variantId = _indexedVariants[variants[i]].current();
            string memory svg = _svgs[variantId];
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
