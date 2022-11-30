// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

// Import this file to use console.log
import "hardhat/console.sol";
import "erc721a/contracts/ERC721A.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./common/OpenSeaPolygonProxy.sol";
import "./common/meta-transactions/ContentMixin.sol";
import "./common/meta-transactions/NativeMetaTransaction.sol";

contract Blyatversity is
    ERC721A,
    AccessControl,
    Open
    ContextMixin,
    NativeMetaTransaction
{
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    mapping(bytes32 => uint256) private bookingRefs;

    constructor() ERC721A("Blyatversity", "Blyat") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    function mint(address to, bytes32 bookingRef) public onlyRole(MINTER_ROLE) {
        bookingRef[bookingRef] = _nextTokenId();
        _mint(to, amount);
    }

    function burn(bytes32 bookingRef) public onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 id = bookingRefs[bookingRef];
        assert(_exists(id), "INVALID_ID");
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
    function isApprovedForAll(address owner, address operator)
        public
        view
        override
        returns (bool)
    {
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
    function _msgSenderERC721A() internal view override returns (address sender) {
        return ContextMixin.msgSender();
    }
}
