// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "fhevm/lib/TFHE.sol";
import "fhevm/abstracts/EIP712WithModifier.sol";

/**
 * @title NeonPulseVoting
 * @notice Enhanced encrypted voting system with privacy preservation
 * @dev Optimized FHEVM voting with efficient governance processes
 */
contract NeonPulseVoting is EIP712WithModifier {
    using TFHE for euint32;
    using TFHE for ebool;

    // ============ VOTING ENUMS ============
    
    enum VotingPhase {
        Setup, 
        Active, 
        Validation, 
        Consensus, 
        Resolved
    }
    
    enum ParticipantLevel {
        Basic, 
        Standard, 
        Advanced, 
        Premium, 
        Elite
    }

    // ============ CONTRACT STATE ============
    
    string public proposal;
    uint256 public deadline;
    VotingPhase public currentPhase;
    uint256 public minQuorum;
    uint256 public rewardPool;
    
    euint32 private encryptedYesVotes;
    euint32 private encryptedNoVotes;
    euint32 private totalParticipation;
    
    address public creator;
    bool public votingActive;
    bool public emergencyStop;
    uint256 public startTime;
    uint256 private voterCount;
    
    mapping(address => bool) public hasVoted;
    mapping(address => ParticipantLevel) public participantLevels;
    mapping(address => uint256) public votingHistory;
    mapping(address => euint32) private votingPower;

    // ============ VOTING EVENTS ============
    
    event VotingCreated(
        string indexed proposal, 
        uint256 deadline, 
        address creator, 
        uint256 timestamp
    );
    
    event VoteCasted(
        address indexed voter, 
        ParticipantLevel level, 
        VotingPhase phase, 
        uint256 timestamp
    );
    
    event PhaseTransition(
        VotingPhase newPhase, 
        uint256 participation, 
        uint256 timestamp
    );
    
    event ConsensusReached(
        address indexed initiator, 
        uint256 finalYes, 
        uint256 finalNo, 
        uint256 timestamp
    );
    
    event VotingResolved(
        string proposal, 
        bool approved, 
        uint256 totalVoters, 
        uint256 timestamp
    );

    // ============ MODIFIERS ============
    
    modifier onlyAuthorizedVoter() {
        require(
            participantLevels[msg.sender] != ParticipantLevel.Basic || msg.sender == creator, 
            "Voting: Insufficient authorization"
        );
        _;
    }
    
    modifier onlyDuringVoting() {
        require(votingActive, "Voting: Not active");
        require(block.timestamp <= deadline, "Voting: Deadline passed");
        require(!emergencyStop, "Voting: Emergency stop active");
        _;
    }
    
    modifier hasNotVoted() {
        require(!hasVoted[msg.sender], "Voting: Already voted");
        _;
    }
    
    modifier validPhase(VotingPhase requiredPhase) {
        require(currentPhase == requiredPhase, "Voting: Invalid phase");
        _;
    }

    // ============ CONSTRUCTOR ============
    
    constructor(
        string memory _proposal, 
        uint256 _durationHours
    ) EIP712WithModifier("EnhancedVoting", "1") {
        proposal = _proposal;
        deadline = block.timestamp + (_durationHours * 1 hours);
        creator = msg.sender;
        
        encryptedYesVotes = TFHE.asEuint32(0);
        encryptedNoVotes = TFHE.asEuint32(0);
        totalParticipation = TFHE.asEuint32(0);
        
        currentPhase = VotingPhase.Setup;
        votingActive = false;
        emergencyStop = false;
        startTime = 0;
        voterCount = 0;
        minQuorum = 10;
        rewardPool = 1000;
        
        // Set creator as Premium level
        participantLevels[msg.sender] = ParticipantLevel.Premium;
        votingPower[msg.sender] = TFHE.asEuint32(5);
        
        emit VotingCreated(_proposal, deadline, msg.sender, block.timestamp);
    }

    // ============ CORE VOTING FUNCTIONS ============
    
    /**
     * @notice Start voting phase
     */
    function startVoting() 
        external 
        validPhase(VotingPhase.Setup)
    {
        require(msg.sender == creator, "Voting: Only creator can start");
        
        currentPhase = VotingPhase.Active;
        votingActive = true;
        startTime = block.timestamp;
        
        emit PhaseTransition(currentPhase, voterCount, block.timestamp);
    }
    
    /**
     * @notice Cast YES vote
     */
    function voteYes(
        externalEbool encryptedVote, 
        bytes calldata inputProof
    ) 
        external 
        onlyAuthorizedVoter 
        onlyDuringVoting 
        hasNotVoted 
        validPhase(VotingPhase.Active)
    {
        ebool validatedVote = TFHE.asEbool(encryptedVote, inputProof);
        euint32 power = _getVotingPower(msg.sender);
        
        // Add weighted vote
        euint32 weightedVote = TFHE.select(validatedVote, power, TFHE.asEuint32(0));
        encryptedYesVotes = encryptedYesVotes.add(weightedVote);
        
        // Update participation
        totalParticipation = totalParticipation.add(TFHE.asEuint32(1));
        hasVoted[msg.sender] = true;
        votingHistory[msg.sender]++;
        voterCount++;
        
        // Upgrade participant level
        _upgradeParticipant(msg.sender);
        
        emit VoteCasted(msg.sender, participantLevels[msg.sender], currentPhase, block.timestamp);
        
        // Check phase progression
        _checkPhaseProgression();
    }
    
    /**
     * @notice Cast NO vote
     */
    function voteNo(
        externalEbool encryptedVote, 
        bytes calldata inputProof
    ) 
        external 
        onlyAuthorizedVoter 
        onlyDuringVoting 
        hasNotVoted 
        validPhase(VotingPhase.Active)
    {
        ebool validatedVote = TFHE.asEbool(encryptedVote, inputProof);
        euint32 power = _getVotingPower(msg.sender);
        
        // Add weighted vote (inverted for NO)
        euint32 weightedVote = TFHE.select(validatedVote.not(), power, TFHE.asEuint32(0));
        encryptedNoVotes = encryptedNoVotes.add(weightedVote);
        
        // Update participation
        totalParticipation = totalParticipation.add(TFHE.asEuint32(1));
        hasVoted[msg.sender] = true;
        votingHistory[msg.sender]++;
        voterCount++;
        
        // Upgrade participant level
        _upgradeParticipant(msg.sender);
        
        emit VoteCasted(msg.sender, participantLevels[msg.sender], currentPhase, block.timestamp);
        
        // Check phase progression
        _checkPhaseProgression();
    }
    
    /**
     * @notice Request vote decryption
     */
    function requestDecryption() 
        external 
        validPhase(VotingPhase.Consensus)
    {
        require(block.timestamp > deadline, "Voting: Still in progress");
        
        // Trigger decryption process
        currentPhase = VotingPhase.Resolved;
        
        emit ConsensusReached(msg.sender, voterCount, voterCount, block.timestamp);
    }

    // ============ VIEW FUNCTIONS ============
    
    /**
     * @notice Get proposal information
     */
    function getProposalInfo() 
        external 
        view 
        returns (
            string memory _proposal, 
            uint256 _deadline, 
            VotingPhase phase, 
            bool userHasVoted
        ) 
    {
        return (proposal, deadline, currentPhase, hasVoted[msg.sender]);
    }
    
    /**
     * @notice Get encrypted vote counts
     */
    function getEncryptedVotes() 
        external 
        view 
        returns (euint32 encryptedYes, euint32 encryptedNo) 
    {
        return (encryptedYesVotes, encryptedNoVotes);
    }
    
    /**
     * @notice Get participant information
     */
    function getParticipantInfo(address participant) 
        external 
        view 
        returns (ParticipantLevel level, uint256 history, bool voted) 
    {
        return (participantLevels[participant], votingHistory[participant], hasVoted[participant]);
    }
    
    /**
     * @notice Get voting statistics
     */
    function getVotingStats() 
        external 
        view 
        returns (
            uint256 totalVoters, 
            VotingPhase phase, 
            bool isActive, 
            uint256 timeRemaining
        ) 
    {
        uint256 remaining = block.timestamp >= deadline ? 0 : deadline - block.timestamp;
        return (voterCount, currentPhase, votingActive, remaining);
    }

    // ============ ADMIN FUNCTIONS ============
    
    /**
     * @notice Authorize participant
     */
    function authorizeParticipant(address participant, ParticipantLevel level) 
        external 
    {
        require(msg.sender == creator, "Voting: Only creator can authorize");
        require(level != ParticipantLevel.Elite || participantLevels[msg.sender] == ParticipantLevel.Elite, 
                "Voting: Cannot assign Elite level");
        
        participantLevels[participant] = level;
        votingPower[participant] = TFHE.asEuint32(_getLevelPower(level));
    }
    
    /**
     * @notice Emergency shutdown
     */
    function emergencyShutdown() external {
        require(
            participantLevels[msg.sender] == ParticipantLevel.Premium || 
            participantLevels[msg.sender] == ParticipantLevel.Elite ||
            msg.sender == creator, 
            "Voting: Unauthorized shutdown"
        );
        
        emergencyStop = true;
        votingActive = false;
        currentPhase = VotingPhase.Resolved;
        
        emit VotingResolved(proposal, false, voterCount, block.timestamp);
    }

    // ============ INTERNAL FUNCTIONS ============
    
    /**
     * @dev Get voting power based on participant level
     */
    function _getVotingPower(address participant) private view returns (euint32) {
        if (votingPower[participant].unwrap() != 0) {
            return votingPower[participant];
        }
        
        uint8 levelPower = _getLevelPower(participantLevels[participant]);
        return TFHE.asEuint32(levelPower);
    }
    
    /**
     * @dev Get base power for level
     */
    function _getLevelPower(ParticipantLevel level) private pure returns (uint8) {
        if (level == ParticipantLevel.Elite) return 7;
        if (level == ParticipantLevel.Premium) return 5;
        if (level == ParticipantLevel.Advanced) return 4;
        if (level == ParticipantLevel.Standard) return 2;
        return 1; // Basic
    }
    
    /**
     * @dev Upgrade participant level based on history
     */
    function _upgradeParticipant(address participant) private {
        uint256 history = votingHistory[participant];
        ParticipantLevel currentLevel = participantLevels[participant];
        
        if (history >= 30 && currentLevel == ParticipantLevel.Advanced) {
            participantLevels[participant] = ParticipantLevel.Premium;
            votingPower[participant] = TFHE.asEuint32(5);
        } else if (history >= 15 && currentLevel == ParticipantLevel.Standard) {
            participantLevels[participant] = ParticipantLevel.Advanced;
            votingPower[participant] = TFHE.asEuint32(4);
        } else if (history >= 8 && currentLevel == ParticipantLevel.Basic) {
            participantLevels[participant] = ParticipantLevel.Standard;
            votingPower[participant] = TFHE.asEuint32(2);
        }
    }
    
    /**
     * @dev Check if phase should progress
     */
    function _checkPhaseProgression() private {
        if (voterCount >= 15 && currentPhase == VotingPhase.Active) {
            currentPhase = VotingPhase.Validation;
            emit PhaseTransition(currentPhase, voterCount, block.timestamp);
        }
        
        if (voterCount >= 35 && currentPhase == VotingPhase.Validation) {
            currentPhase = VotingPhase.Consensus;
            emit PhaseTransition(currentPhase, voterCount, block.timestamp);
        }
    }
}