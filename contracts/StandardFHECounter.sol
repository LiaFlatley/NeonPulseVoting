// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import "@fhevm/solidity/contracts/TFHE.sol";

/**
 * @title StandardFHECounter
 * @dev A standard FHE counter contract compatible with the frontend interface
 * Matches the ABI expected by the React frontend
 */
contract StandardFHECounter {
    euint32 private counter;
    address public owner;
    
    event CounterIncremented(address indexed user);
    event CounterDecremented(address indexed user);
    
    constructor() {
        owner = msg.sender;
        counter = TFHE.asEuint32(0);
        TFHE.allow(counter, address(this));
        TFHE.allow(counter, owner);
    }

    /**
     * @dev Increment the counter with an encrypted value
     * @param inputEuint32 The encrypted input value as bytes32
     * @param inputProof The proof for the encrypted input
     */
    function increment(bytes32 inputEuint32, bytes calldata inputProof) external {
        euint32 value = TFHE.asEuint32(inputEuint32, inputProof);
        counter = TFHE.add(counter, value);
        TFHE.allow(counter, msg.sender);
        emit CounterIncremented(msg.sender);
    }

    /**
     * @dev Decrement the counter with an encrypted value
     * @param inputEuint32 The encrypted input value as bytes32
     * @param inputProof The proof for the encrypted input
     */
    function decrement(bytes32 inputEuint32, bytes calldata inputProof) external {
        euint32 value = TFHE.asEuint32(inputEuint32, inputProof);
        counter = TFHE.sub(counter, value);
        TFHE.allow(counter, msg.sender);
        emit CounterDecremented(msg.sender);
    }

    /**
     * @dev Get the encrypted counter value
     * @return The encrypted counter value as bytes32
     */
    function getCount() external view returns (euint32) {
        return counter;
    }

    /**
     * @dev Allow a user to decrypt the counter value
     * @param user The address to allow decryption
     */
    function allowUser(address user) external {
        TFHE.allow(counter, user);
    }

    /**
     * @dev Get contract owner
     * @return The owner address
     */
    function getOwner() external view returns (address) {
        return owner;
    }
}