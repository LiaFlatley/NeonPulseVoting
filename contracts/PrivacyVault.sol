// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@fhevm/solidity/lib/FHE.sol";

/**
 * @title PrivacyVault
 * @dev Advanced FHE vault for private value storage and operations
 * Demonstrates complex FHE operations including comparisons and conditional logic
 */
contract PrivacyVault {
    using FHE for *;

    struct PrivateBalance {
        euint64 amount;
        bool exists;
    }

    // Mapping from user address to their private balance
    mapping(address => PrivateBalance) private balances;
    
    // Total vault value (encrypted)
    euint64 private totalValue;
    
    // Vault owner
    address public owner;
    
    // Events
    event Deposit(address indexed user);
    event Withdrawal(address indexed user);
    event Transfer(address indexed from, address indexed to);
    event BalanceDecrypted(address indexed user, uint256 requestId);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        totalValue = FHE.asEuint64(0);
    }

    /**
     * @dev Deposit encrypted amount to vault
     * @param encryptedAmount Encrypted amount to deposit
     * @param inputProof Proof for the encrypted input
     */
    function deposit(bytes32 encryptedAmount, bytes calldata inputProof) public payable {
        euint64 amount = FHE.asEuint64(encryptedAmount, inputProof);
        
        if (balances[msg.sender].exists) {
            balances[msg.sender].amount = balances[msg.sender].amount + amount;
        } else {
            balances[msg.sender] = PrivateBalance(amount, true);
        }
        
        totalValue = totalValue + amount;
        emit Deposit(msg.sender);
    }

    /**
     * @dev Withdraw encrypted amount from vault
     * @param encryptedAmount Encrypted amount to withdraw
     * @param inputProof Proof for the encrypted input
     */
    function withdraw(bytes32 encryptedAmount, bytes calldata inputProof) public {
        require(balances[msg.sender].exists, "No balance");
        
        euint64 amount = FHE.asEuint64(encryptedAmount, inputProof);
        euint64 currentBalance = balances[msg.sender].amount;
        
        // Check if user has sufficient balance (FHE comparison)
        ebool hasSufficientBalance = currentBalance.gte(amount);
        
        // Conditional subtraction - only subtract if user has enough balance
        euint64 newBalance = FHE.select(hasSufficientBalance, currentBalance - amount, currentBalance);
        balances[msg.sender].amount = newBalance;
        
        // Update total value
        euint64 actualWithdrawAmount = FHE.select(hasSufficientBalance, amount, FHE.asEuint64(0));
        totalValue = totalValue - actualWithdrawAmount;
        
        emit Withdrawal(msg.sender);
    }

    /**
     * @dev Transfer encrypted amount between users
     * @param to Recipient address
     * @param encryptedAmount Encrypted amount to transfer
     * @param inputProof Proof for the encrypted input
     */
    function transfer(address to, bytes32 encryptedAmount, bytes calldata inputProof) public {
        require(balances[msg.sender].exists, "No balance");
        require(to != address(0), "Invalid recipient");
        
        euint64 amount = FHE.asEuint64(encryptedAmount, inputProof);
        euint64 senderBalance = balances[msg.sender].amount;
        
        // Check if sender has sufficient balance
        ebool hasSufficientBalance = senderBalance.gte(amount);
        
        // Update sender balance
        euint64 newSenderBalance = FHE.select(hasSufficientBalance, senderBalance - amount, senderBalance);
        balances[msg.sender].amount = newSenderBalance;
        
        // Update recipient balance
        euint64 actualTransferAmount = FHE.select(hasSufficientBalance, amount, FHE.asEuint64(0));
        
        if (balances[to].exists) {
            balances[to].amount = balances[to].amount + actualTransferAmount;
        } else {
            balances[to] = PrivateBalance(actualTransferAmount, true);
        }
        
        emit Transfer(msg.sender, to);
    }

    /**
     * @dev Get encrypted balance (returns handle for decryption)
     * @return Encrypted balance handle
     */
    function getBalance() public view returns (bytes32) {
        require(balances[msg.sender].exists, "No balance");
        return FHE.decrypt(balances[msg.sender].amount);
    }

    /**
     * @dev Request decryption of balance
     */
    function requestBalanceDecryption() public returns (uint256) {
        require(balances[msg.sender].exists, "No balance");
        
        uint256[] memory cts = new uint256[](1);
        cts[0] = FHE.getValue(balances[msg.sender].amount);
        
        uint256 requestId = FHE.decrypt(cts);
        emit BalanceDecrypted(msg.sender, requestId);
        
        return requestId;
    }

    /**
     * @dev Get total vault value (only owner)
     */
    function getTotalValue() public view onlyOwner returns (bytes32) {
        return FHE.decrypt(totalValue);
    }

    /**
     * @dev Allow user to decrypt their balance
     * @param user User address to grant permission
     */
    function allowUserDecryption(address user) public {
        require(balances[user].exists, "User has no balance");
        require(msg.sender == owner || msg.sender == user, "Not authorized");
        FHE.allow(balances[user].amount, user);
    }

    /**
     * @dev Compare two encrypted balances (demonstration)
     * @param user1 First user
     * @param user2 Second user
     * @return Encrypted boolean result
     */
    function compareBalances(address user1, address user2) public view returns (bytes32) {
        require(balances[user1].exists && balances[user2].exists, "Users must have balances");
        
        ebool user1HasMore = balances[user1].amount.gt(balances[user2].amount);
        return FHE.decrypt(user1HasMore);
    }

    /**
     * @dev Emergency withdrawal by owner
     */
    function emergencyWithdraw() public onlyOwner {
        payable(owner).transfer(address(this).balance);
    }

    /**
     * @dev Transfer ownership
     */
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "Zero address");
        owner = newOwner;
    }
}