// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title TraceBack recovery board with ETH reward escrow
contract LostFoundBoard {
    enum Status { Open, FoundReported, Returned, Cancelled }

    struct Item {
        uint256 id;
        address owner;
        string title;
        string description;
        string location;
        uint256 reward;      // wei held in escrow
        address finder;
        string foundNote;
        Status status;
        uint256 postedAt;
    }

    address public admin;
    uint256 public itemCount;
    mapping(uint256 => Item) private items;

    event ItemPosted(uint256 indexed id, address indexed owner, string title, uint256 reward);
    event FoundReported(uint256 indexed id, address indexed finder);
    event FinderRejected(uint256 indexed id, address indexed finder);
    event ItemReturned(uint256 indexed id, address indexed finder, uint256 reward);
    event ItemCancelled(uint256 indexed id, address indexed by);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin allowed");
        _;
    }

    modifier validId(uint256 _id) {
        require(_id > 0 && _id <= itemCount, "Item does not exist");
        _;
    }

    modifier onlyItemOwner(uint256 _id) {
        require(msg.sender == items[_id].owner, "Only item owner allowed");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    /// Owner posts a lost item; any ETH sent becomes the reward (escrowed).
    function postItem(
        string calldata _title,
        string calldata _description,
        string calldata _location
    ) external payable returns (uint256) {
        require(bytes(_title).length > 0, "Title required");
        require(bytes(_title).length <= 100, "Title too long");
        require(bytes(_location).length > 0, "Location required");

        itemCount++;
        items[itemCount] = Item(
            itemCount, msg.sender, _title, _description, _location,
            msg.value, address(0), "", Status.Open, block.timestamp
        );
        emit ItemPosted(itemCount, msg.sender, _title, msg.value);
        return itemCount;
    }

    /// A finder reports they have the item.
    function reportFound(uint256 _id, string calldata _note) external validId(_id) {
        Item storage it = items[_id];
        require(it.status == Status.Open, "Item not open");
        require(msg.sender != it.owner, "Owner cannot report own item");
        require(bytes(_note).length > 0, "Note required");

        it.finder = msg.sender;
        it.foundNote = _note;
        it.status = Status.FoundReported;
        emit FoundReported(_id, msg.sender);
    }

    /// Owner confirms they got the item back; reward is released to finder.
    function confirmReturn(uint256 _id) external validId(_id) onlyItemOwner(_id) {
        Item storage it = items[_id];
        require(it.status == Status.FoundReported, "No found report to confirm");

        uint256 amount = it.reward;
        address finder = it.finder;
        it.reward = 0;
        it.status = Status.Returned;
        _pay(finder, amount);
        emit ItemReturned(_id, finder, amount);
    }

    /// Owner rejects a false found report; item reopens.
    function rejectFinder(uint256 _id) external validId(_id) onlyItemOwner(_id) {
        Item storage it = items[_id];
        require(it.status == Status.FoundReported, "No found report to reject");

        address rejected = it.finder;
        it.finder = address(0);
        it.foundNote = "";
        it.status = Status.Open;
        emit FinderRejected(_id, rejected);
    }

    /// Owner cancels the post and gets the reward refunded.
    function cancelItem(uint256 _id) external validId(_id) onlyItemOwner(_id) {
        _cancel(_id);
    }

    /// Admin removes spam posts; reward refunded to the owner.
    function adminRemoveItem(uint256 _id) external validId(_id) onlyAdmin {
        _cancel(_id);
    }

    function getItem(uint256 _id) external view validId(_id) returns (Item memory) {
        return items[_id];
    }

    function _cancel(uint256 _id) private {
        Item storage it = items[_id];
        require(
            it.status == Status.Open || it.status == Status.FoundReported,
            "Item already closed"
        );
        uint256 amount = it.reward;
        it.reward = 0;
        it.status = Status.Cancelled;
        _pay(it.owner, amount);
        emit ItemCancelled(_id, msg.sender);
    }

    function _pay(address _to, uint256 _amount) private {
        if (_amount > 0) {
            (bool ok, ) = payable(_to).call{value: _amount}("");
            require(ok, "ETH transfer failed");
        }
    }
}