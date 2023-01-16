library String {
    function equals(
        string memory self,
        string memory s
    ) public view returns (bool) {
        return
            keccak256(abi.encodePacked(self)) == keccak256(abi.encodePacked(s));
    }

    function concat(
        string memory self,
        string memory s
    ) public view returns (string memory) {
        return string(abi.encodePacked(self, s));
    }
}
