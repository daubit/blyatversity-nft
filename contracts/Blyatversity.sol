// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import "erc721a/contracts/ERC721A.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./common/OpenSeaPolygonProxy.sol";
import "./common/meta-transactions/ContentMixin.sol";
import "./common/meta-transactions/NativeMetaTransaction.sol";

contract Blyatversity is
    ERC721A,
    AccessControl,
    ContextMixin,
    NativeMetaTransaction
{
    using Counters for Counters.Counter;
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    uint32 constant MAX_AMOUNT = 11233;

    Counters.Counter private _bookId;

    address public proxyRegistryAddress;
    string private _folderCID;
    string private _contractCID;

    // BookId => BookRef => TokenId
    mapping(uint256 => mapping(bytes32 => uint256)) private _bookingRefs;
    // TokenId to BookId
    mapping(uint256 => uint256) private _bookIds;

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

    function mint(
        uint256 bookId,
        address to,
        bytes32 bookingRef
    ) public onlyRole(MINTER_ROLE) {
        uint256 _totalSupply = totalSupply();
        if (_totalSupply >= MAX_AMOUNT) {
            revert("MAX_AMOUNT_REACHED");
        }
        if (bookId > _bookId.current()) {
            revert("INVALID_BOOK");
        }
        uint256 nextToken = _nextTokenId();
        _bookingRefs[bookId][bookingRef] = nextToken;
        _bookIds[nextToken] = bookId;
        _mint(to, 1);
    }

    function mint(uint256 bookId, address to) public onlyRole(MINTER_ROLE) {
        uint256 _totalSupply = totalSupply();
        if (_totalSupply >= MAX_AMOUNT) {
            revert("MAX_AMOUNT_REACHED");
        }
        if (bookId > _bookId.current()) {
            revert("INVALID_BOOK");
        }
        uint256 nextToken = _nextTokenId();
        _bookIds[nextToken] = bookId;
        _mint(to, 1);
    }

    function burn(
        uint256 bookId,
        bytes32 bookingRef
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 id = _bookingRefs[bookId][bookingRef];
        if (!_exists(id) || bookId > _bookId.current()) revert InvalidTokenId();
        _burn(id);
    }

    function burn(uint256 id) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _burn(id);
    }

    function addBook() public onlyRole(DEFAULT_ADMIN_ROLE) {
        _bookId.increment();
    }

    function getBook(uint256 tokenId) external view returns (uint256) {
        if (!_exists(tokenId)) revert InvalidTokenId();
        return _bookIds[tokenId];
    }

    /**
     * @dev Returns the Uniform Resource Identifier (URI) for `tokenId` token.
     */
    function tokenURI(
        uint256 tokenId
    ) public view virtual override returns (string memory) {
        if (!_exists(tokenId)) revert URIQueryForNonexistentToken();

        string memory baseURI = _baseURI();
        uint256 bookId = _bookIds[tokenId];
        string memory path = string(abi.encodePacked(baseURI, _folderCID));
        string memory tokenPath = string(
            abi.encodePacked(
                abi.encodePacked(_toString(bookId), "/"),
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
