// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract SimpleFHECounter {
    uint256 public count;
    address public owner;

    event CounterIncremented(address indexed user, uint256 newCount);
    event CounterReset(address indexed user);

    constructor() {
        owner = msg.sender;
        count = 0;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the owner");
        _;
    }

    function increment() public {
        count += 1;
        emit CounterIncremented(msg.sender, count);
    }

    function getCount() public view returns (uint256) {
        return count;
    }

    function add(uint256 value) public {
        count += value;
        emit CounterIncremented(msg.sender, count);
    }

    function reset() public onlyOwner {
        count = 0;
        emit CounterReset(msg.sender);
    }

    // Function to simulate FHE operations for demo
    function addEncrypted(uint256 encryptedValue) public {
        // In a real FHE implementation, this would work with encrypted data
        // For demo purposes, we'll just add the value
        count += encryptedValue;
        emit CounterIncremented(msg.sender, count);
    }

    // Allow users to simulate decryption request
    function requestDecryption() public view returns (uint256) {
        return count;
    }
}