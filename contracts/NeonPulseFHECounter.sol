// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "fhevm/lib/TFHE.sol";
import "fhevm/abstracts/EIP712WithModifier.sol";

/**
 * @title NeonPulseFHECounter
 * @notice Enhanced FHE counter with dynamic energy management
 * @dev Optimized FHEVM counter with efficient state transitions
 */
contract NeonPulseFHECounter is EIP712WithModifier {
    using TFHE for euint32;
    using TFHE for ebool;

    // ============ STATE ENUMS ============
    
    enum CounterLevel { 
        Inactive, 
        Low, 
        Medium, 
        High, 
        Maximum
    }
    
    enum OperationState {
        Stopped, 
        Initializing, 
        Running, 
        Accelerated, 
        Optimized
    }

    // ============ CONTRACT STATE ============
    
    CounterLevel public currentLevel;
    OperationState public currentState;
    address public operator;
    bool public emergencyStop;
    uint256 public lastActivity;
    uint256 public totalOperations;
    uint256 public multiplier;
    uint256 public maxCapacity;
    
    euint32 private counter;
    euint32 private energy;
    euint32 private amplifier;
    
    mapping(address => bool) public authorized;
    mapping(address => uint256) public operationCount;
    mapping(address => euint32) private userReserve;

    // ============ CONTRACT EVENTS ============
    
    event CounterActivated(
        address indexed operator, 
        CounterLevel newLevel, 
        uint256 energyAmount, 
        uint256 timestamp
    );
    
    event EnergyCharged(
        address indexed charger, 
        uint256 chargeAmount, 
        OperationState newState, 
        uint256 timestamp
    );
    
    event CounterUpdated(
        address indexed updater, 
        CounterLevel level, 
        uint256 operationCount, 
        uint256 timestamp
    );
    
    event EmergencyShutdown(
        address indexed initiator, 
        CounterLevel finalLevel, 
        uint256 timestamp
    );

    // ============ MODIFIERS ============
    
    modifier onlyAuthorized() {
        require(
            authorized[msg.sender] || msg.sender == operator, 
            "Counter: Unauthorized access"
        );
        _;
    }
    
    modifier onlyActive() {
        require(!emergencyStop, "Counter: Emergency stop active");
        require(currentState != OperationState.Stopped, "Counter: Operations stopped");
        _;
    }
    
    modifier validState(OperationState requiredState) {
        require(
            uint8(currentState) >= uint8(requiredState), 
            "Counter: Insufficient operation state"
        );
        _;
    }

    // ============ CONSTRUCTOR ============
    
    constructor() EIP712WithModifier("EnhancedFHECounter", "1") {
        operator = msg.sender;
        authorized[msg.sender] = true;
        
        currentLevel = CounterLevel.Inactive;
        currentState = OperationState.Stopped;
        emergencyStop = false;
        lastActivity = block.timestamp;
        totalOperations = 0;
        
        counter = TFHE.asEuint32(0);
        energy = TFHE.asEuint32(100);
        amplifier = TFHE.asEuint32(2);
        multiplier = 1;
        maxCapacity = 10000;
    }

    // ============ CORE FUNCTIONS ============
    
    /**
     * @notice Increment counter with encrypted value
     * @param encryptedValue Encrypted value to add
     * @param inputProof Proof for encrypted input validation
     */
    function increment(
        externalEuint32 encryptedValue, 
        bytes calldata inputProof
    ) 
        external 
        onlyAuthorized 
        onlyActive
    {
        euint32 validatedValue = TFHE.asEuint32(encryptedValue, inputProof);
        
        // Apply amplification with multiplier
        euint32 dynamicMultiplier = TFHE.asEuint32(multiplier);
        euint32 amplifiedValue = validatedValue.mul(amplifier).mul(dynamicMultiplier);
        counter = counter.add(amplifiedValue);
        
        // Boost energy
        euint32 energyBoost = validatedValue.div(TFHE.asEuint32(2));
        energy = energy.add(energyBoost);
        
        // Update levels
        _updateLevels();
        
        totalOperations++;
        operationCount[msg.sender]++;
        lastActivity = block.timestamp;
        
        emit CounterActivated(
            msg.sender, 
            currentLevel, 
            totalOperations, 
            block.timestamp
        );
        
        emit EnergyCharged(
            msg.sender, 
            operationCount[msg.sender], 
            currentState, 
            block.timestamp
        );
    }
    
    /**
     * @notice Decrement counter with encrypted value
     * @param encryptedValue Encrypted value to subtract
     * @param inputProof Proof for encrypted input validation
     */
    function decrement(
        externalEuint32 encryptedValue, 
        bytes calldata inputProof
    ) 
        external 
        onlyAuthorized 
        validState(OperationState.Initializing)
    {
        euint32 validatedValue = TFHE.asEuint32(encryptedValue, inputProof);
        
        // Check if we have enough to subtract
        ebool canSubtract = counter.gte(validatedValue);
        counter = TFHE.select(canSubtract, counter.sub(validatedValue), counter);
        
        // Consume energy for operation
        euint32 energyCost = validatedValue.div(TFHE.asEuint32(3));
        ebool canAfford = energy.gte(energyCost);
        energy = TFHE.select(canAfford, energy.sub(energyCost), energy);
        
        _updateLevels();
        
        totalOperations++;
        operationCount[msg.sender]++;
        lastActivity = block.timestamp;
        
        emit CounterUpdated(
            msg.sender, 
            currentLevel, 
            totalOperations, 
            block.timestamp
        );
    }

    // ============ VIEW FUNCTIONS ============
    
    /**
     * @notice Get current counter level
     */
    function getLevel() external view returns (CounterLevel) {
        return currentLevel;
    }
    
    /**
     * @notice Get current operation state
     */
    function getState() external view returns (OperationState) {
        return currentState;
    }
    
    /**
     * @notice Get encrypted counter value
     */
    function getCounter() external view returns (euint32) {
        return counter;
    }
    
    /**
     * @notice Get encrypted energy level
     */
    function getEnergy() external view returns (euint32) {
        return energy;
    }
    
    /**
     * @notice Get operator information
     */
    function getOperatorInfo(address op) 
        external 
        view 
        returns (bool isAuthorized, uint256 operations) 
    {
        return (authorized[op], operationCount[op]);
    }
    
    /**
     * @notice Get comprehensive statistics
     */
    function getStats() 
        external 
        view 
        returns (
            CounterLevel level, 
            OperationState state, 
            uint256 totalOps, 
            uint256 lastAct, 
            bool stopped
        ) 
    {
        return (
            currentLevel, 
            currentState, 
            totalOperations, 
            lastActivity, 
            emergencyStop
        );
    }

    // ============ ADMIN FUNCTIONS ============
    
    /**
     * @notice Authorize operator
     */
    function authorize(address op) external {
        require(msg.sender == operator, "Counter: Only operator can authorize");
        authorized[op] = true;
    }
    
    /**
     * @notice Emergency shutdown
     */
    function emergencyShutdown() external {
        require(
            msg.sender == operator || authorized[msg.sender], 
            "Counter: Unauthorized shutdown"
        );
        
        emergencyStop = true;
        currentState = OperationState.Stopped;
        currentLevel = CounterLevel.Inactive;
        
        emit EmergencyShutdown(msg.sender, currentLevel, block.timestamp);
    }
    
    /**
     * @notice Reactivate system
     */
    function reactivate() external {
        require(msg.sender == operator, "Counter: Only operator can reactivate");
        
        emergencyStop = false;
        currentState = OperationState.Initializing;
        currentLevel = CounterLevel.Low;
    }

    // ============ INTERNAL FUNCTIONS ============
    
    /**
     * @dev Update levels based on activity
     */
    function _updateLevels() private {
        if (emergencyStop) {
            currentLevel = CounterLevel.Inactive;
            currentState = OperationState.Stopped;
            return;
        }
        
        if (totalOperations >= 500) {
            currentLevel = CounterLevel.Maximum;
            currentState = OperationState.Optimized;
        } else if (totalOperations >= 200) {
            currentLevel = CounterLevel.High;
            currentState = OperationState.Accelerated;
        } else if (totalOperations >= 50) {
            currentLevel = CounterLevel.Medium;
            currentState = OperationState.Running;
        } else if (totalOperations >= 10) {
            currentLevel = CounterLevel.Low;
            currentState = OperationState.Initializing;
        } else {
            currentLevel = CounterLevel.Inactive;
            currentState = OperationState.Stopped;
        }
    }
}