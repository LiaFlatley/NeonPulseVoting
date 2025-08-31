// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import "@fhevm/solidity/contracts/TFHE.sol";

/**
 * @title FHECounter
 * @dev A simple FHE counter contract demonstrating encrypted operations
 * Based on Zama's official examples for Sepolia deployment
 */
contract FHECounter {
    euint32 private counter;
    address public owner;
    
    event CounterIncremented(address indexed user);
    event CounterDecremented(address indexed user);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    constructor() {
        owner = msg.sender;
        counter = TFHE.asEuint32(0);
        TFHE.allow(counter, address(this));
        TFHE.allow(counter, owner);
    }

    function increment() public {
        counter = TFHE.add(counter, TFHE.asEuint32(1));
        emit CounterIncremented(msg.sender);
    }

    function add(einput encryptedValue, bytes calldata inputProof) public {
        euint32 value = TFHE.asEuint32(encryptedValue, inputProof);
        counter = TFHE.add(counter, value);
        emit CounterIncremented(msg.sender);
    }

    function getCount() public view returns (euint32) {
        return counter;
    }

    function getCountHandle() public view returns (bytes32) {
        return TFHE.decrypt(counter);
    }

    function allowUser(address user) public onlyOwner {
        TFHE.allow(counter, user);
    }

    function reset() public onlyOwner {
        counter = TFHE.asEuint32(0);
        TFHE.allow(counter, address(this));
        TFHE.allow(counter, owner);
    }
}