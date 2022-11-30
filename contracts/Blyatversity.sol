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
    string private _folderCID;
    string private _contractCID;

    mapping(bytes32 => uint256) private bookingRefs;

    error InvalidTokenId();

    constructor(
        string memory folderCID_,
        string memory contractCID_,
        address _proxyRegistryAddress
    ) ERC721A("Blyatversity", "Blyat") {
        _folderCID = folderCID_;
        _contractCID = contractCID_;
        proxyRegistryAddress = _proxyRegistryAddress;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    function _beforeTokenTransfers(
        address from,
        address to,
        uint256 startTokenId,
        uint256 quantity
    ) internal virtual override {}

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

    function _baseURI() internal pure override returns (string memory) {
        return "ipfs://";
    }

    function setFolderCID(
        string memory folderCID_
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _folderCID = folderCID_;
    }

    function setContractCID(
        string memory contractCID_
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _contractCID = contractCID_;
    }

    /**
     * @dev Returns the contract CID.
     */
    function contractCID() external view returns (string memory) {
        return string(abi.encodePacked(_baseURI(), _contractCID));
    }

    function mint(address to, bytes32 bookingRef) public onlyRole(MINTER_ROLE) {
        bookingRefs[bookingRef] = _nextTokenId();
        _mint(to, 1);
    }

    function mint(address to) public onlyRole(MINTER_ROLE) {
        _mint(to, 1);
    }

    function burn(bytes32 bookingRef) public onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 id = bookingRefs[bookingRef];
        if (!_exists(id)) revert InvalidTokenId();
        _burn(id);
    }

    function burn(uint256 id) public onlyRole(DEFAULT_ADMIN_ROLE){
        _burn(id);
    }

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
