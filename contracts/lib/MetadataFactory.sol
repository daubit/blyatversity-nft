// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
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
    mapping(uint256 => mapping(uint256 => string)) private _variantName;
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
        bytes memory attributes = _generateAttributes(variants);
        bytes memory image = _generateImage(variants);
        bytes memory name = _getName(variants);
        return
            string(
                abi.encodePacked(
                    "data:application/json,%7B%22name%22%3A%22",
                    name,
                    "%22%2C",
                    "%22description%22%3A%22",
                    _description,
                    "%22%2C",
                    "%22attributes%22%3A",
                    attributes,
                    "%2C",
                    "%22animation_url%22%3A%22data%3Atext%2Fhtml%3Bbase64%2C",
                    image,
                    "%22%7D"
                )
            );
    }

    function setDescription(string memory description)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        _description = description;
    }

    function addVariants(
        uint256 attributeId,
        string[] memory variants,
        string[] memory svgs
    ) external {
        if (variants.length != svgs.length) revert UnequalArrays();
        string memory attribute = _attributes[attributeId];
        for (uint256 i; i < variants.length; i++) {
            string memory variant = variants[i];
            uint256 variantId = _indexedVariants[attributeId][variant];
            if (variantId == 0) {
                _variantCounter[attributeId].increment();
                variantId = _variantCounter[attributeId].current();
                _indexedVariants[attributeId][variant] = variantId;
                _variantName[attributeId][variantId] = variant;
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
        uint256 variantId = _indexedVariants[attributeId][variant];
        if (variantId == 0) {
            _variantCounter[attributeId].increment();
            variantId = _variantCounter[attributeId].current();
            _indexedVariants[attributeId][variant] = variantId;
            _variantName[attributeId][variantId] = variant;
            _variantKind[attributeId][variantId] = _attributes[attributeId];
        }
        _svgs[attributeId][variantId] = svg;
    }

    function addVariantChunked(
        uint256 attributeId,
        string memory variant,
        string memory svgChunk
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 variantId = _indexedVariants[attributeId][variant];
        if (variantId == 0) {
            _variantCounter[attributeId].increment();
            variantId = _variantCounter[attributeId].current();
            _indexedVariants[attributeId][variant] = variantId;
            _variantName[attributeId][variantId] = variant;
            _variantKind[attributeId][variantId] = _attributes[attributeId];
        }
        _svgs[attributeId][variantId] = _svgs[attributeId][variantId].concat(
            svgChunk
        );
    }

    function addAttribute(string memory attribute)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        _attributeCounter.increment();
        _attributes[_attributeCounter.current()] = attribute;
    }

    function addAttributes(string[] memory attributes)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        for (uint256 i; i < attributes.length; i++) {
            _attributeCounter.increment();
            _attributes[_attributeCounter.current()] = attributes[i];
        }
    }

    function _collectVariants(bytes32 seed)
        internal
        view
        returns (string[] memory)
    {
        uint256 currentAmount = _attributeCounter.current();
        string[] memory variants = new string[](currentAmount);
        for (uint256 i; i < currentAmount; i++) {
            uint256 attributeId = i + 1;
            uint256 variantAmount = _variantCounter[attributeId].current();
            uint256 randomIndex = uint16((uint256(seed) % variantAmount) + 1);
            variants[i] = _variantName[attributeId][randomIndex];
        }
        return variants;
    }

    function _generateAttributes(string[] memory variants)
        internal
        view
        returns (bytes memory)
    {
        bytes memory base;
        for (uint16 i; i < variants.length; i++) {
            uint256 attributeId = i + 1;
            uint256 variantId = _indexedVariants[attributeId][variants[i]];
            if (i < _attributeCounter.current() - 1) {
                base = abi.encodePacked(
                    base,
                    "%7B%22trait_type%22%3A%22",
                    _variantKind[attributeId][variantId],
                    "%22%2C%22value%22%3A%22",
                    variants[i],
                    "%22%7D",
                    "%22%2C"
                );
            } else {
                base = abi.encodePacked(
                    base,
                    "%7B%22trait_type%22%3A%22",
                    _variantKind[attributeId][variantId],
                    "%22%2C%22value%22%3A%22",
                    variants[i],
                    "%22%7D"
                );
            }
        }
        return abi.encodePacked("%5B", base, "%5D");
    }

    function _getName(string[] memory variants)
        internal
        pure
        returns (bytes memory)
    {
        bytes memory name;
        for (uint256 i; i < variants.length; i++) {
            name = abi.encodePacked(name, variants[i], "%20");
        }
        return name;
    }

    function _generateImage(string[] memory variants)
        internal
        view
        returns (bytes memory)
    {
        bytes memory base;
        uint256 amount = variants.length;
        uint32 i = 0;
        while (i < amount) {
            if ((amount - i) % 5 == 0) {
                base = abi.encodePacked(
                    base,
                    _svgs[i + 1][_indexedVariants[i + 1][variants[i + 0]]],
                    _svgs[i + 2][_indexedVariants[i + 2][variants[i + 1]]],
                    _svgs[i + 3][_indexedVariants[i + 3][variants[i + 2]]],
                    _svgs[i + 4][_indexedVariants[i + 4][variants[i + 3]]],
                    _svgs[i + 5][_indexedVariants[i + 5][variants[i + 4]]]
                );
                i += 5;
            } else {
                base = abi.encodePacked(
                    base,
                    _svgs[i + 1][_indexedVariants[i + 1][variants[i]]]
                );
                i++;
            }
        }
        base = abi.encodePacked(
            "PHN2ZyB3aWR0aD0nMTAwMCcgaGVpZ2h0PScxMDAwJyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHhtbG5zOnhsaW5rPSdodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rJyB2aWV3Qm94PScwIDAgMTAwMCAxMDAwJz4g",
            base,
            "PC9zdmc+"
        );
        // "<svg width='1000' height='1000' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' viewBox='0 0 1000 1000'>"
        //base.concat("</svg>");
        return base;
    }
}
