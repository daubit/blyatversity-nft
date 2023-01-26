// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

interface IMetadataFactory {
	function tokenURI(uint256 idExternal, uint256 idInternal) external view returns (string memory);
}
