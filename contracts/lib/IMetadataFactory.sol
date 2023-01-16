// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

interface IMetadataFactory {
    function tokenURI(uint256 id) external returns (string memory);
}
