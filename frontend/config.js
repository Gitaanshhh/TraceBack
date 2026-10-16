const CONTRACT_ADDRESS = "0x44c6212714c9711057baAA5dE2463Ad71bea0920";

const CONTRACT_ABI = [
  "function admin() view returns (address)",
  "function itemCount() view returns (uint256)",
  "function postItem(string _title, string _description, string _location) payable returns (uint256)",
  "function reportFound(uint256 _id, string _note)",
  "function confirmReturn(uint256 _id)",
  "function rejectFinder(uint256 _id)",
  "function cancelItem(uint256 _id)",
  "function adminRemoveItem(uint256 _id)",
  "function getItem(uint256 _id) view returns (tuple(uint256 id, address owner, string title, string description, string location, uint256 reward, address finder, string foundNote, uint8 status, uint256 postedAt))"
];