// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "./IMetadataFactory.sol";
import "./String.sol";
import "hardhat/console.sol";

contract MetadataFactory is IMetadataFactory, AccessControl {
    using String for string;
    using Counters for Counters.Counter;

    Counters.Counter private _attributeCounter;

    string private _description;
    // Id => Attribute
    mapping(uint256 => string) private _attributes;
    // AttributeId => Variant => Id
    mapping(uint256 => mapping(string => uint256)) private _indexedVariants;
    // AttributeId => Variant Amount
    mapping(uint256 => Counters.Counter) private _variantCounter;
    // AttributeId => VariantId => Variant
    mapping(uint256 => mapping(uint256 => string)) private _variants;
    // AttributeId => VariantId => Attribute
    mapping(uint256 => mapping(uint256 => string)) private _variantKind;
    // AttributeId => VariantId => svg
    mapping(uint256 => mapping(uint256 => string)) private _svgs;

    error ZeroValue();
    error EmptyString();
    error UnequalArrays();

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        bytes32 seed = keccak256(abi.encodePacked(tokenId));
        string[] memory variants = _collectVariants(seed);
        string memory attributes = _generateAttributes(variants);
        string memory image = _generateImage(variants);
        string memory name = _getName(variants);
        return
            string(
                abi.encodePacked(
                    "data:application/json,%7B%22name%22%3A%22",
                    name,
                    "%22%2C",
                    "%22description%22%3A%22",
                    _description,
                    "%22%2C",
                    "%22animation_url%22%3A%22data%3Atext%2Fhtml%3Bbase64%2C",
                    image,
                    "%22%2C",
                    "%22attributes%22%3A",
                    attributes,
                    "%7D"
                )
            );
    }

    function setDescription(
        string memory description
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _description = description;
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
            uint variantId = _indexedVariants[attributeId][variant];
            if (variantId == 0) {
                _variantCounter[attributeId].increment();
                variantId = _variantCounter[attributeId].current();
                _indexedVariants[attributeId][variant] = variantId;
                _variants[attributeId][variantId] = variant;
                _svgs[attributeId][variantId] = svgs[i];
                _variantKind[attributeId][variantId] = attribute;
            }
        }
    }

    function setVariant(
        uint256 attributeId,
        string memory variant,
        string memory svg
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint variantId = _indexedVariants[attributeId][variant];
        if (variantId == 0) {
            _variantCounter[attributeId].increment();
            variantId = _variantCounter[attributeId].current();
            _indexedVariants[attributeId][variant] = variantId;
            _variants[attributeId][variantId] = variant;
            string memory attribute = _attributes[attributeId];
            _variantKind[attributeId][variantId] = attribute;
        }
        _svgs[attributeId][variantId] = svg;
    }

    function addVariantChunked(
        uint attributeId,
        string memory variant,
        string memory svgChunk
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint variantId = _indexedVariants[attributeId][variant];
        if (variantId == 0) {
            _variantCounter[attributeId].increment();
            variantId = _variantCounter[attributeId].current();
            _indexedVariants[attributeId][variant] = variantId;
            _variants[attributeId][variantId] = variant;
            string memory attribute = _attributes[attributeId];
            _variantKind[attributeId][variantId] = attribute;
        }
        _svgs[attributeId][variantId] = _svgs[attributeId][variantId].concat(
            svgChunk
        );
    }

    function addAttribute(
        string memory attribute
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _attributeCounter.increment();
        _attributes[_attributeCounter.current()] = attribute;
    }

    function addAttributes(
        string[] memory attributes
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        for (uint i; i < attributes.length; i++) {
            _attributeCounter.increment();
            _attributes[_attributeCounter.current()] = attributes[i];
        }
    }

    function _collectVariants(
        bytes32 seed
    ) internal view returns (string[] memory) {
        uint currentAmount = _attributeCounter.current();
        string[] memory variants = new string[](currentAmount);
        for (uint256 i; i < currentAmount; i++) {
            uint attributeId = i + 1;
            uint variantAmount = _variantCounter[attributeId].current();
            uint randomIndex = uint16((uint(seed) % variantAmount) + 1);
            variants[i] = _variants[attributeId][randomIndex];
        }
        return variants;
    }

    function _generateAttributes(
        string[] memory variants
    ) internal view returns (string memory) {
        string memory base = "%5B";
        for (uint16 i; i < variants.length; i++) {
            uint256 attributeId = i + 1;
            uint variantId = _indexedVariants[attributeId][variants[i]];
            string memory attribute = _variantKind[attributeId][variantId];
            string memory value = string(
                abi.encodePacked(
                    "%7B%22trait_type%22%3A%22",
                    attribute,
                    "%22%2C%22value%22%3A%22",
                    variants[i],
                    "%22%7D"
                )
            );
            base = base.concat(value);
            if (i < _attributeCounter.current() - 1) {
                base = base.concat("%22%2C");
            }
        }
        return base.concat("%5D");
    }

    function _getName(
        string[] memory variants
    ) internal pure returns (string memory) {
        string memory name = "";
        for (uint i; i < variants.length; i++) {
            name = name.concat(variants[i]).concat("%20");
        }
        return name;
    }

    function _generateImage(
        string[] memory variants
    ) internal view returns (string memory) {
        string
            memory base = "<svg xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' width='1000' height='1000' viewBox='0 0 1000 1000'>";
        uint amount = variants.length;
        for (uint16 i; i < amount; i++) {
            uint256 attributeId = i + 1;
            uint variantId = _indexedVariants[attributeId][variants[i]];
            base = base.concat(_svgs[attributeId][variantId]);
        }
        base = base.concat("</svg>");
        return Base64.encode(bytes(base));
    }
}
