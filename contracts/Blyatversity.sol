// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import "erc721a-upgradeable/contracts/ERC721AUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./common/OpenSeaPolygonProxy.sol";
import "./common/meta-transactions/ContentMixin.sol";
import "./common/meta-transactions/NativeMetaTransaction.sol";

/**
 *
 * TODO:
 *       Opensea: 10%
 *       Lock per Item, NFT for 13 months
 *
 * */
contract Blyatversity is
    Initializable,
    ERC721AUpgradeable,
    AccessControlUpgradeable,
    ContextMixin,
    NativeMetaTransaction
{
    using CountersUpgradeable for CountersUpgradeable.Counter;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    address public _proxyRegistryAddress;
    string private _folderCID;
    string private _contractCID;
    CountersUpgradeable.Counter private _itemId;

    // TokenId to ItemId
    mapping(uint256 => uint256) private _itemIds;
    // ItemId => Max Supply
    mapping(uint256 => uint256) private _itemMaxSupply;
    // ItemId => Total Supply
    mapping(uint256 => uint256) private _itemTotalSupply;
    //ItemId => boolean
    mapping(uint256 => bool) private _itemPaused;

    error InvalidTokenId();
    error InvalidItemId();
    error InvalidSupply();
    error MaxSupply();

    modifier itemValid(uint256 itemId) {
        if (itemId <= 0 && itemId > _itemId.current()) revert InvalidItemId();
        _;
    }

    modifier itemPaused(uint256 itemId) {
        if (!_itemPaused[itemId]) revert InvalidItemId();
        _;
    }

    function initialize(
        string memory folderCID_,
        string memory contractCID_,
        address proxyRegistryAddress
    ) public initializer initializerERC721A {
        __ERC721A_init("Blyatversity", "Blyat");
        _folderCID = folderCID_;
        _contractCID = contractCID_;
        _proxyRegistryAddress = proxyRegistryAddress;

        __AccessControl_init();
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

    function mint(
        uint256 itemId,
        address to
    )
        external
        itemPaused(itemId)
        itemValid(itemId)
        onlyRole(MINTER_ROLE)
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        uint256 totalSupply = _itemTotalSupply[itemId];
        uint256 maxSupply = _itemMaxSupply[itemId];
        if (totalSupply >= maxSupply) revert MaxSupply();
        uint256 nextToken = _nextTokenId();
        _itemIds[nextToken] = itemId;
        _mint(to, 1);
    }

    function burn(uint256 id) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _burn(id);
    }

    function addItem(uint256 supply) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (supply == 0) revert InvalidSupply();
        _itemId.increment();
        uint256 itemId = _itemId.current();
        _itemMaxSupply[itemId] = supply;
        _itemPaused[itemId] = false;
    }

    function addItem() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _itemId.increment();
        _itemPaused[_itemId.current()] = false;
    }

    function getItem(uint256 tokenId) external view returns (uint256) {
        if (!_exists(tokenId)) revert InvalidTokenId();
        return _itemIds[tokenId];
    }

    function getItemMaxSupply(uint256 itemId) external view returns (uint256) {
        return _itemMaxSupply[itemId];
    }

    function getItemTotalSupply(
        uint256 itemId
    ) external view returns (uint256) {
        return _itemTotalSupply[itemId];
    }

    function pauseItem(
        uint256 itemId
    ) external onlyRole(DEFAULT_ADMIN_ROLE) itemValid(itemId) {
        _itemPaused[itemId] = true;
    }

    function unpauseItem(
        uint256 itemId
    ) external onlyRole(DEFAULT_ADMIN_ROLE) itemValid(itemId) {
        _itemPaused[itemId] = false;
    }

    /**
     * @dev Returns the Uniform Resource Identifier (URI) for `tokenId` token.
     */
    function tokenURI(
        uint256 tokenId
    ) public view virtual override returns (string memory) {
        if (!_exists(tokenId)) revert URIQueryForNonexistentToken();
        string memory baseURI = _baseURI();
        uint256 itemId = _itemIds[tokenId];
        string memory path = string(abi.encodePacked(baseURI, _folderCID));
        string memory tokenPath = string(
            abi.encodePacked(
                abi.encodePacked(_toString(itemId), "/"),
                _toString(tokenId)
            )
        );
        return
            bytes(baseURI).length != 0
                ? string(abi.encodePacked(path, tokenPath))
                : "";
    }

    /**
     * @dev Override isApprovedForAll to whitelist user's OpenSea proxy accounts to enable gas-less listings.
     */
    function isApprovedForAll(
        address owner,
        address operator
    ) public view override returns (bool) {
        // Whitelist OpenSea proxy contract for easy trading.
        ProxyRegistry proxyRegistry = ProxyRegistry(_proxyRegistryAddress);
        if (address(proxyRegistry.proxies(owner)) == operator) {
            return true;
        }

        return super.isApprovedForAll(owner, operator);
    }

    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        virtual
        override(ERC721AUpgradeable, AccessControlUpgradeable)
        returns (bool)
    {
        // Supports the following `interfaceId`s:
        // - IERC165: 0x01ffc9a7
        // - IERC721: 0x80ac58cd
        // - IERC721Metadata: 0x5b5e139f
        // - IERC2981: 0x2a55205a
        return
            ERC721AUpgradeable.supportsInterface(interfaceId) ||
            AccessControlUpgradeable.supportsInterface(interfaceId);
    }
}
