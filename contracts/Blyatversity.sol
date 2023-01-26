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
import "hardhat/console.sol";

/**
 *
 * TODO:
 *       Opensea: 10%
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
    string private _contractCID;
    CountersUpgradeable.Counter private _itemId;

    enum ItemState {
        Paused,
        Limited,
        Unlimited
    }

    // TokenId to internal itemId tokenId
    mapping(uint256 => uint256) private _itemInternalIds;
    // ItemId to internal itemId tokenId Counter
    mapping(uint256 => CountersUpgradeable.Counter) private _itemIdCounters;
    // TokenId to ItemId
    mapping(uint256 => uint256) private _itemIds;
    // ItemId => Max Supply
    mapping(uint256 => uint256) private _itemMaxSupply;
    //ItemId => boolean
    mapping(uint256 => ItemState) private _itemState;
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

    modifier itemValid(uint256 itemId) {
        if (itemId <= 0 && itemId > _itemId.current()) revert InvalidItemId();
        uint256 totalSupply = _itemIdCounters[itemId].current();
        uint256 maxSupply = _itemMaxSupply[itemId];
        ItemState state = _itemState[itemId];
        if (state == ItemState.Paused) revert ItemPaused();
        if (state == ItemState.Limited && totalSupply >= maxSupply) revert MaxSupply();
        _;
    }

    function initialize(string memory contractCID_, address proxyRegistryAddress)
        public
        initializer
        initializerERC721A
    {
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

    function mint(uint256 itemId, address to)
        external
        itemValid(itemId)
        onlyRole(MINTER_ROLE)
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        uint256 nextToken = _nextTokenId();
        _itemIds[nextToken] = itemId;
        _itemInternalIds[nextToken] = _itemIdCounters[itemId].current();
        _itemIdCounters[itemId].increment();
        _mint(to, 1);
    }

    function burn(uint256 id) external {
        _burn(id);
    }

    function addItem(address factory, uint256 supply) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (supply == 0) revert InvalidSupply();
        _itemId.increment();
        uint256 itemId = _itemId.current();
        _itemMaxSupply[itemId] = supply;
        _itemState[itemId] = ItemState.Limited;
        _metadataFactory[itemId] = factory;
    }

    function addItem(address factory) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _itemId.increment();
        uint256 itemId = _itemId.current();
        _itemState[itemId] = ItemState.Unlimited;
        _metadataFactory[itemId] = factory;
    }

    function getItem(uint256 tokenId) external view returns (uint256) {
        if (!_exists(tokenId)) revert InvalidTokenId();
        return _itemIds[tokenId];
    }

    function getItemMaxSupply(uint256 itemId) external view returns (uint256) {
        return _itemMaxSupply[itemId];
    }

    function getItemTotalSupply(uint256 itemId) external view returns (uint256) {
        return _itemIdCounters[itemId].current();
    }

    function pauseItem(uint256 itemId) external onlyRole(DEFAULT_ADMIN_ROLE) itemValid(itemId) {
        _itemState[itemId] = ItemState.Paused;
    }

    function unpauseItem(uint256 itemId) external onlyRole(DEFAULT_ADMIN_ROLE) itemValid(itemId) {
        _itemState[itemId] = ItemState.Paused;
    }

    function setLockPeriod(uint256 itemId, uint256 timePeriod) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _itemLockPeriod[itemId] = timePeriod;
    }

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

    function supportsInterface(bytes4 interfaceId)
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
