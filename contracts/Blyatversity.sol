// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import "erc721a/contracts/ERC721A.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./common/OpenSeaPolygonProxy.sol";
import "./common/meta-transactions/ContentMixin.sol";
import "./common/meta-transactions/NativeMetaTransaction.sol";

contract Blyatversity is
    ERC721A,
    AccessControl,
    ContextMixin,
    NativeMetaTransaction
{
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    address public proxyRegistryAddress;

    mapping(bytes32 => uint256) private bookingRefs;

    error InvalidTokenId();

    constructor(
        address _proxyRegistryAddress
    ) ERC721A("Blyatversity", "Blyat") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        proxyRegistryAddress = _proxyRegistryAddress;
    }

    function mint(address to, bytes32 bookingRef) public onlyRole(MINTER_ROLE) {
        bookingRefs[bookingRef] = _nextTokenId();
        _mint(to, 1);
    }

    function burn(bytes32 bookingRef) public onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 id = bookingRefs[bookingRef];
        if (_exists(id)) revert InvalidTokenId();
        _burn(id);
    }

    function _beforeTokenTransfers(
        address from,
        address to,
        uint256 startTokenId,
        uint256 quantity
    ) internal virtual override {}

    /**
     * @dev Override isApprovedForAll to whitelist user's OpenSea proxy accounts to enable gas-less listings.
     */
    function isApprovedForAll(
        address owner,
        address operator
    ) public view override returns (bool) {
        // Whitelist OpenSea proxy contract for easy trading.
        ProxyRegistry proxyRegistry = ProxyRegistry(proxyRegistryAddress);
        if (address(proxyRegistry.proxies(owner)) == operator) {
            return true;
        }

        return super.isApprovedForAll(owner, operator);
    }

    /**
     * @dev This is used instead of msg.sender as transactions won't be sent by the original token owner, but by OpenSea.
     */
    function _msgSenderERC721A()
        internal
        view
        override
        returns (address sender)
    {
        return ContextMixin.msgSender();
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC721A, AccessControl) returns (bool) {
        // Supports the following `interfaceId`s:
        // - IERC165: 0x01ffc9a7
        // - IERC721: 0x80ac58cd
        // - IERC721Metadata: 0x5b5e139f
        // - IERC2981: 0x2a55205a
        return
            ERC721A.supportsInterface(interfaceId) ||
            AccessControl.supportsInterface(interfaceId);
    }
}
