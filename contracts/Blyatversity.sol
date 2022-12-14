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
 * TODO: Kein Product -> Produkt
 *       Opensea: 10%
 *       Lock per Product, NFT for 13 months
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
    CountersUpgradeable.Counter private _productId;

    // TokenId to ProductId
    mapping(uint256 => uint256) private _productIds;
    // ProductId => Max Supply
    mapping(uint256 => uint256) private _productMaxSupply;
    // ProductId => Total Supply
    mapping(uint256 => uint256) private _productTotalSupply;
    //ProductId => boolean
    mapping(uint256 => bool) private _productPaused;

    error InvalidTokenId();
    error InvalidProductId();
    error InvalidSupply();

    modifier productValid(uint256 productId) {
        if (productId <= 0 && productId > _productId.current())
            revert InvalidProductId();
        _;
    }

    modifier productPaused(uint256 productId) {
        if (!_productPaused[productId]) revert InvalidProductId();
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
        uint256 productId,
        address to
    )
        external
        productPaused(productId)
        productValid(productId)
        onlyRole(MINTER_ROLE)
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        uint256 _totalSupply = _productTotalSupply[productId];
        uint256 _maxSupply = _productMaxSupply[productId];
        if (_totalSupply >= _maxSupply) revert("MAX_AMOUNT_REACHED");
        uint256 nextToken = _nextTokenId();
        _productIds[nextToken] = productId;
        _mint(to, 1);
    }

    function burn(
        uint256 productId,
        bytes32 productingRef
    ) public onlyRole(DEFAULT_ADMIN_ROLE) productValid(productId) {
        uint256 id = _productingRefs[productId][productingRef];
        if (!_exists(id)) revert InvalidTokenId();
        _burn(id);
    }

    function burn(uint256 id) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _burn(id);
    }

    function addProduct(uint256 supply) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (supply == 0) revert InvalidSupply();
        _productId.increment();
        uint256 productId = _productId.current();
        _productMaxSupply[productId] = supply;
        _productPaused[productId] = false;
    }

    function addProduct() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _productId.increment();
        _productPaused[_productId.current()] = false;
    }

    function getProduct(uint256 tokenId) external view returns (uint256) {
        if (!_exists(tokenId)) revert InvalidTokenId();
        return _productIds[tokenId];
    }

    function getProductMaxSupply(
        uint256 productId
    ) external view returns (uint256) {
        return _productMaxSupply[productId];
    }

    function getProductTotalSupply(
        uint256 productId
    ) external view returns (uint256) {
        return _productTotalSupply[productId];
    }

    function pauseProduct(
        uint256 productId
    ) external onlyRole(DEFAULT_ADMIN_ROLE) productValid(productId) {
        _productPaused[productId] = true;
    }

    function unpauseProduct(
        uint256 productId
    ) external onlyRole(DEFAULT_ADMIN_ROLE) productValid(productId) {
        _productPaused[productId] = false;
    }

    /**
     * @dev Returns the Uniform Resource Identifier (URI) for `tokenId` token.
     */
    function tokenURI(
        uint256 tokenId
    ) public view virtual override returns (string memory) {
        if (!_exists(tokenId)) revert URIQueryForNonexistentToken();
        string memory baseURI = _baseURI();
        uint256 productId = _productIds[tokenId];
        string memory path = string(abi.encodePacked(baseURI, _folderCID));
        string memory tokenPath = string(
            abi.encodePacked(
                abi.encodePacked(_toString(productId), "/"),
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
