// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title GameBetting
 * @dev Smart contract for handling ARC token betting on multiplayer games
 * Supports UNO, Chess, and Pool games with escrow functionality
 */
contract GameBetting is ReentrancyGuard, Ownable, Pausable {
    IERC20 public immutable arcToken;
    
    // House fee percentage (in basis points, e.g., 500 = 5%)
    uint256 public houseFeePercent = 500; // 5%
    uint256 public constant MAX_HOUSE_FEE = 1000; // 10% maximum
    
    // Minimum and maximum bet amounts
    uint256 public minBetAmount = 1e18; // 1 ARC token
    uint256 public maxBetAmount = 1000e18; // 1000 ARC tokens
    
    struct Bet {
        address player1;
        address player2;
        uint256 amount;
        string gameType; // "uno", "chess", "pool"
        string lobbyId;
        bool active;
        uint256 createdAt;
        address winner;
        bool resolved;
    }
    
    mapping(uint256 => Bet) public bets;
    mapping(string => uint256) public lobbyToBetId;
    mapping(address => uint256[]) public playerBets;
    
    uint256 public nextBetId = 1;
    uint256 public totalBetsCreated;
    uint256 public totalBetsResolved;
    uint256 public totalVolumeWagered;
    uint256 public totalHouseFees;
    
    event BetCreated(
        uint256 indexed betId,
        string indexed lobbyId,
        address indexed player1,
        uint256 amount,
        string gameType
    );
    
    event BetJoined(
        uint256 indexed betId,
        string indexed lobbyId,
        address indexed player2,
        uint256 amount
    );
    
    event BetResolved(
        uint256 indexed betId,
        string indexed lobbyId,
        address indexed winner,
        uint256 winnings,
        uint256 houseFee
    );
    
    event BetCancelled(
        uint256 indexed betId,
        string indexed lobbyId,
        address indexed player1,
        uint256 refundAmount
    );
    
    event HouseFeeUpdated(uint256 oldFee, uint256 newFee);
    event BetLimitsUpdated(uint256 newMinBet, uint256 newMaxBet);
    
    constructor(address _arcToken, address _initialOwner) Ownable(_initialOwner) {
        require(_arcToken != address(0), "Invalid ARC token address");
        require(_initialOwner != address(0), "Invalid initial owner address");
        arcToken = IERC20(_arcToken);
    }
    
    /**
     * @dev Create a new bet for a game lobby
     * @param _amount Amount of ARC tokens to bet
     * @param _gameType Type of game ("uno", "chess", "pool")
     * @param _lobbyId Unique identifier for the game lobby
     */
    function createBet(
        uint256 _amount,
        string memory _gameType,
        string memory _lobbyId
    ) external nonReentrant whenNotPaused {
        require(_amount >= minBetAmount && _amount <= maxBetAmount, "Invalid bet amount");
        require(bytes(_lobbyId).length > 0, "Invalid lobby ID");
        require(lobbyToBetId[_lobbyId] == 0, "Bet already exists for this lobby");
        require(
            keccak256(bytes(_gameType)) == keccak256(bytes("uno")) ||
            keccak256(bytes(_gameType)) == keccak256(bytes("chess")) ||
            keccak256(bytes(_gameType)) == keccak256(bytes("pool")),
            "Invalid game type"
        );
        
        // Transfer tokens from player to contract
        require(
            arcToken.transferFrom(msg.sender, address(this), _amount),
            "Token transfer failed"
        );
        
        uint256 betId = nextBetId++;
        
        bets[betId] = Bet({
            player1: msg.sender,
            player2: address(0),
            amount: _amount,
            gameType: _gameType,
            lobbyId: _lobbyId,
            active: true,
            createdAt: block.timestamp,
            winner: address(0),
            resolved: false
        });
        
        lobbyToBetId[_lobbyId] = betId;
        playerBets[msg.sender].push(betId);
        totalBetsCreated++;
        totalVolumeWagered += _amount;
        
        emit BetCreated(betId, _lobbyId, msg.sender, _amount, _gameType);
    }
    
    /**
     * @dev Join an existing bet
     * @param _lobbyId Lobby ID of the bet to join
     */
    function joinBet(string memory _lobbyId) external nonReentrant whenNotPaused {
        uint256 betId = lobbyToBetId[_lobbyId];
        require(betId != 0, "Bet does not exist");
        
        Bet storage bet = bets[betId];
        require(bet.active, "Bet is not active");
        require(bet.player2 == address(0), "Bet already has two players");
        require(bet.player1 != msg.sender, "Cannot join your own bet");
        
        // Transfer tokens from player to contract
        require(
            arcToken.transferFrom(msg.sender, address(this), bet.amount),
            "Token transfer failed"
        );
        
        bet.player2 = msg.sender;
        playerBets[msg.sender].push(betId);
        totalVolumeWagered += bet.amount;
        
        emit BetJoined(betId, _lobbyId, msg.sender, bet.amount);
    }
    
    /**
     * @dev Resolve a bet by declaring the winner
     * @param _lobbyId Lobby ID of the bet to resolve
     * @param _winner Address of the winning player
     */
    function resolveBet(
        string memory _lobbyId,
        address _winner
    ) external onlyOwner nonReentrant {
        uint256 betId = lobbyToBetId[_lobbyId];
        require(betId != 0, "Bet does not exist");
        
        Bet storage bet = bets[betId];
        require(bet.active, "Bet is not active");
        require(bet.player2 != address(0), "Bet does not have two players");
        require(!bet.resolved, "Bet already resolved");
        require(
            _winner == bet.player1 || _winner == bet.player2,
            "Winner must be one of the players"
        );
        
        uint256 totalPot = bet.amount * 2;
        uint256 houseFee = (totalPot * houseFeePercent) / 10000;
        uint256 winnings = totalPot - houseFee;
        
        bet.winner = _winner;
        bet.resolved = true;
        bet.active = false;
        totalBetsResolved++;
        totalHouseFees += houseFee;
        
        // Transfer winnings to winner
        require(arcToken.transfer(_winner, winnings), "Winnings transfer failed");
        
        // Transfer house fee to owner
        if (houseFee > 0) {
            require(arcToken.transfer(owner(), houseFee), "House fee transfer failed");
        }
        
        emit BetResolved(betId, _lobbyId, _winner, winnings, houseFee);
    }
    
    /**
     * @dev Cancel a bet that hasn't been joined yet
     * @param _lobbyId Lobby ID of the bet to cancel
     */
    function cancelBet(string memory _lobbyId) external nonReentrant {
        uint256 betId = lobbyToBetId[_lobbyId];
        require(betId != 0, "Bet does not exist");
        
        Bet storage bet = bets[betId];
        require(bet.active, "Bet is not active");
        require(bet.player1 == msg.sender, "Only bet creator can cancel");
        require(bet.player2 == address(0), "Cannot cancel bet with two players");
        require(
            block.timestamp >= bet.createdAt + 1 hours,
            "Must wait 1 hour before cancelling"
        );
        
        bet.active = false;
        
        // Refund the bet amount to player1
        require(arcToken.transfer(bet.player1, bet.amount), "Refund transfer failed");
        
        emit BetCancelled(betId, _lobbyId, bet.player1, bet.amount);
    }
    
    /**
     * @dev Emergency refund for both players (only owner)
     * @param _lobbyId Lobby ID of the bet to refund
     */
    function emergencyRefund(string memory _lobbyId) external onlyOwner nonReentrant {
        uint256 betId = lobbyToBetId[_lobbyId];
        require(betId != 0, "Bet does not exist");
        
        Bet storage bet = bets[betId];
        require(bet.active, "Bet is not active");
        require(!bet.resolved, "Bet already resolved");
        
        bet.active = false;
        
        // Refund both players
        require(arcToken.transfer(bet.player1, bet.amount), "Player1 refund failed");
        
        if (bet.player2 != address(0)) {
            require(arcToken.transfer(bet.player2, bet.amount), "Player2 refund failed");
        }
        
        emit BetCancelled(betId, _lobbyId, bet.player1, bet.amount);
    }
    
    /**
     * @dev Update house fee percentage (only owner)
     * @param _newFeePercent New fee percentage in basis points
     */
    function updateHouseFee(uint256 _newFeePercent) external onlyOwner {
        require(_newFeePercent <= MAX_HOUSE_FEE, "Fee too high");
        uint256 oldFee = houseFeePercent;
        houseFeePercent = _newFeePercent;
        emit HouseFeeUpdated(oldFee, _newFeePercent);
    }
    
    /**
     * @dev Update bet limits (only owner)
     * @param _newMinBet New minimum bet amount
     * @param _newMaxBet New maximum bet amount
     */
    function updateBetLimits(uint256 _newMinBet, uint256 _newMaxBet) external onlyOwner {
        require(_newMinBet > 0, "Min bet must be positive");
        require(_newMaxBet > _newMinBet, "Max bet must be greater than min bet");
        minBetAmount = _newMinBet;
        maxBetAmount = _newMaxBet;
        emit BetLimitsUpdated(_newMinBet, _newMaxBet);
    }
    
    /**
     * @dev Pause the contract (only owner)
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause the contract (only owner)
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Get bet information by lobby ID
     * @param _lobbyId Lobby ID to query
     * @return Bet information
     */
    function getBetByLobby(string memory _lobbyId) external view returns (Bet memory) {
        uint256 betId = lobbyToBetId[_lobbyId];
        require(betId != 0, "Bet does not exist");
        return bets[betId];
    }
    
    /**
     * @dev Get all bet IDs for a player
     * @param _player Player address
     * @return Array of bet IDs
     */
    function getPlayerBets(address _player) external view returns (uint256[] memory) {
        return playerBets[_player];
    }
    
    /**
     * @dev Get contract statistics
     * @return totalBets, resolvedBets, totalVolume, totalFees
     */
    function getStats() external view returns (uint256, uint256, uint256, uint256) {
        return (totalBetsCreated, totalBetsResolved, totalVolumeWagered, totalHouseFees);
    }
    
    /**
     * @dev Check if a lobby has an active bet
     * @param _lobbyId Lobby ID to check
     * @return True if bet exists and is active
     */
    function hasActiveBet(string memory _lobbyId) external view returns (bool) {
        uint256 betId = lobbyToBetId[_lobbyId];
        if (betId == 0) return false;
        return bets[betId].active;
    }
}