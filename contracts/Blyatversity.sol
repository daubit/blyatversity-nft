// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "erc721a-upgradeable/contracts/ERC721AUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./lib/IMetadataFactory.sol";
import "./common/OpenSeaPolygonProxy.sol";
import "./common/meta-transactions/ContentMixin.sol";
import "./common/meta-transactions/NativeMetaTransaction.sol";

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
    string private _contractCID;
    CountersUpgradeable.Counter private _itemId;

    // TokenId => internal itemId tokenId
    mapping(uint256 => uint256) private _itemInternalIds;
    // TokenId => ItemId
    mapping(uint256 => uint256) private _itemIds;
    // ItemId => internal itemId tokenId Counter
    mapping(uint256 => CountersUpgradeable.Counter) private _itemIdCounters;
    // ItemId => Max Supply
    mapping(uint256 => uint256) private _itemMaxSupply;
    // ItemId => Limited|Unlimited
    mapping(uint256 => bool) private _itemLimited;
    // ItemId => Paused/Unpaused
    mapping(uint256 => bool) private _itemPaused;
    //ItemId => Lock Period
    mapping(uint256 => uint256) private _itemLockPeriod;
    // ItemId => Metadata Contracts
    mapping(uint256 => address) private _metadataFactory;

    error InvalidTokenId();
    error InvalidItemId();
    error ItemPaused();
    error InvalidSupply();
    error MaxSupply();
    error ItemLocked();

    modifier onlyValidItem(uint256 itemId) {
        if (itemId <= 0 && itemId > _itemId.current()) revert InvalidItemId();
        uint256 totalSupply = _itemIdCounters[itemId].current();
        uint256 maxSupply = _itemMaxSupply[itemId];
        if (_itemPaused[itemId]) revert ItemPaused();
        if (_itemLimited[itemId] && totalSupply >= maxSupply) revert MaxSupply();
        _;
    }

    function initialize(
        string memory contractCID_,
        address proxyRegistryAddress
    ) public initializer initializerERC721A {
        __ERC721A_init("Blyatversity", "Blyat");
        _contractCID = contractCID_;
        _proxyRegistryAddress = proxyRegistryAddress;

        __AccessControl_init();
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    function _beforeTokenTransfers(
        address from,
        address, // to,
        uint256 startTokenId,
        uint256 // quantity
    ) internal virtual override {
        // Ignore mints
        if (from == address(0)) return;
        if (hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) return;
        uint256 currentTimestamp = block.timestamp;
        uint256 itemId = _itemIds[startTokenId];
        uint256 lockPeriod = _itemLockPeriod[itemId];
        if (currentTimestamp < lockPeriod) revert ItemLocked();
    }

    /**
     * @dev This is used instead of msg.sender as transactions won't be sent by the original token owner, but by OpenSea.
     */
    function _msgSenderERC721A() internal view override returns (address sender) {
        return ContextMixin.msgSender();
    }

    function setContractCID(string memory contractCID_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _contractCID = contractCID_;
    }

    /**
     * @dev Returns the contract CID.
     */
    function contractCID() external view returns (string memory) {
        return string(abi.encodePacked(_baseURI(), _contractCID));
    }

    function mint(uint256 itemId, address to) external onlyValidItem(itemId) onlyRole(MINTER_ROLE) returns (uint256) {
        uint256 nextToken = _nextTokenId();
        _itemIds[nextToken] = itemId;
        _itemInternalIds[nextToken] = _itemIdCounters[itemId].current();
        _itemIdCounters[itemId].increment();
        _mint(to, 1);
        return nextToken;
    }

    /**
     * @dev Burns token owned by sender
     * @param id, tokenId
     */
    function burn(uint256 id) external {
        _burn(id, true); // Boolean is used to check for approvals
    }

    /**
     * @dev Burns any token. Only callable as an admin
     * @param id, tokenId
     */
    function burnAdmin(uint256 id) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _burn(id, false); // Boolean is used to check for approvals
    }

    /**
     * @dev Adds a new limited item.
     * @param factory, Metadata contract responsible for supplying a tokenURI
     * @param supply, Amount of tokens this item holds
     */
    function addItem(address factory, uint256 supply) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (supply == 0) revert InvalidSupply();
        _itemId.increment();
        uint256 itemId = _itemId.current();
        _itemMaxSupply[itemId] = supply;
        _itemLimited[itemId] = true;
        _metadataFactory[itemId] = factory;
    }

    /**
     * @dev Adds a new unlimited item.
     * @param factory, Metadata contract responsible for supplying a tokenURI
     */
    function addItem(address factory) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _itemId.increment();
        uint256 itemId = _itemId.current();
        _metadataFactory[itemId] = factory;
    }

    /**
     * @dev Returns the item id of the token
     * @param tokenId, id of the token
     */
    function getItem(uint256 tokenId) external view returns (uint256) {
        if (!_exists(tokenId)) revert InvalidTokenId();
        return _itemIds[tokenId];
    }

    /**
     * @dev Returns the maximum amount of token this item can mint
     * @param itemId, id of the item
     */
    function getItemMaxSupply(uint256 itemId) external view onlyValidItem(itemId) returns (uint256) {
        return _itemMaxSupply[itemId];
    }

    /**
     * @dev Returns the current amount of tokens this item holds
     * @param itemId, id of the item
     */
    function getItemTotalSupply(uint256 itemId) external view onlyValidItem(itemId) returns (uint256) {
        return _itemIdCounters[itemId].current();
    }

    /**
     * @dev Pauses the item state to stop the minting process
     * @param itemId, id of the item
     */
    function pauseItem(uint256 itemId) external onlyRole(DEFAULT_ADMIN_ROLE) onlyValidItem(itemId) {
        _itemPaused[itemId] = true;
    }

    /**
     * @dev Unpauses the item state to continue the minting process
     * @param itemId, id of the item
     */
    function unpauseItem(uint256 itemId) external onlyRole(DEFAULT_ADMIN_ROLE) onlyValidItem(itemId) {
        _itemPaused[itemId] = false;
    }

    /**
     * @dev Sets the date till the token of an item is locked
     * @param itemId, id of the item
     * @param timePeriod, Unix timestamp of the deadline
     */
    function setLockPeriod(uint256 itemId, uint256 timePeriod) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _itemLockPeriod[itemId] = timePeriod;
    }

    /**
     * @dev Returns the internal id within an item collection
     * @param tokenId, id of the token
     */
    function getInternalItemId(uint256 tokenId) external view returns (uint256) {
        return _itemInternalIds[tokenId];
    }

    /**
     * @dev Returns the Uniform Resource Identifier (URI) for `tokenId` token.
     */
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        uint256 itemId = _itemIds[tokenId];
        IMetadataFactory metadata = IMetadataFactory(_metadataFactory[itemId]);
        return metadata.tokenURI(_itemInternalIds[tokenId]);
    }

    /**
     * @dev Override isApprovedForAll to whitelist user's OpenSea proxy accounts to enable gas-less listings.
     */
    function isApprovedForAll(address owner, address operator) public view override returns (bool) {
        // Whitelist OpenSea proxy contract for easy trading.
        ProxyRegistry proxyRegistry = ProxyRegistry(_proxyRegistryAddress);
        if (address(proxyRegistry.proxies(owner)) == operator) {
            return true;
        }

        return super.isApprovedForAll(owner, operator);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC721AUpgradeable, AccessControlUpgradeable) returns (bool) {
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
