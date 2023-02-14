// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "../MetadataFactory.sol";

contract Random is MetadataFactory {
    function randomIndex(
        bytes32 seed,
        uint256 max,
        uint256 offset
    ) external pure returns (uint256) {
        return _randomIndex(seed, max, offset);
    }
}
