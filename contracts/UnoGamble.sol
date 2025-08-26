// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract UnoGamble is ReentrancyGuard, Ownable {
    IERC20 public immutable arcToken;
    address public constant HOUSE_WALLET = 0x5AD5aE34265957fB08eA12f77BAFf1200060473e;
    
    struct Game {
        address player1;
        address player2;
        uint256 betAmount;
        uint256 totalPot;
        address winner;
        bool isActive;
        bool isCompleted;
        uint256 createdAt;
        string gameId;
        bool resultVerified;
    }
    
    mapping(bytes32 => Game) public games;
    mapping(bytes32 => mapping(address => bool)) public playerPaid;
    
    uint256 public constant HOUSE_FEE_PERCENT = 5; // 5% house edge
    uint256 public constant GAS_FEE = 0.05 ether; // 0.05 S for gas fees
    
    event GameCreated(bytes32 indexed gameId, address indexed player1, address indexed player2, uint256 betAmount);
    event PlayerPaid(bytes32 indexed gameId, address indexed player, uint256 amount);
    event GameStarted(bytes32 indexed gameId);
    event GameCompleted(bytes32 indexed gameId, address indexed winner, uint256 payout);
    event HouseFeeCollected(bytes32 indexed gameId, uint256 fee);
    event GameResultVerified(bytes32 indexed gameId, address indexed winner, string resultData);
    
    constructor(address _arcToken) {
        arcToken = IERC20(_arcToken);
    }
    
    function createGame(
        bytes32 gameId,
        address player1,
        address player2,
        uint256 betAmount,
        string memory gameIdString
    ) external payable nonReentrant {
        require(msg.value >= GAS_FEE, "Insufficient gas fee");
        require(games[gameId].player1 == address(0), "Game already exists");
        require(player1 != player2, "Players must be different");
        require(betAmount > 0, "Bet amount must be greater than 0");
        
        games[gameId] = Game({
            player1: player1,
            player2: player2,
            betAmount: betAmount,
            totalPot: 0,
            winner: address(0),
            isActive: false,
            isCompleted: false,
            createdAt: block.timestamp,
            gameId: gameIdString,
            resultVerified: false
        });
        
        // Send gas fee to house wallet
        payable(HOUSE_WALLET).transfer(msg.value);
        
        emit GameCreated(gameId, player1, player2, betAmount);
    }
    
    function payBet(bytes32 gameId) external nonReentrant {
        Game storage game = games[gameId];
        require(game.player1 != address(0), "Game does not exist");
        require(!game.isCompleted, "Game already completed");
        require(msg.sender == game.player1 || msg.sender == game.player2, "Not a player in this game");
        require(!playerPaid[gameId][msg.sender], "Player already paid");
        
        // Transfer ARC tokens from player to contract
        require(
            arcToken.transferFrom(msg.sender, address(this), game.betAmount),
            "ARC transfer failed"
        );
        
        playerPaid[gameId][msg.sender] = true;
        game.totalPot += game.betAmount;
        
        emit PlayerPaid(gameId, msg.sender, game.betAmount);
        
        // Check if both players have paid
        if (playerPaid[gameId][game.player1] && playerPaid[gameId][game.player2]) {
            game.isActive = true;
            emit GameStarted(gameId);
        }
    }
    
    function verifyGameResult(
        bytes32 gameId,
        address winner,
        string memory resultData
    ) external nonReentrant {
        Game storage game = games[gameId];
        require(game.isActive, "Game is not active");
        require(!game.isCompleted, "Game already completed");
        require(winner == game.player1 || winner == game.player2, "Invalid winner");
        require(!game.resultVerified, "Result already verified");
        
        game.resultVerified = true;
        
        emit GameResultVerified(gameId, winner, resultData);
        
        // Automatically complete the game after verification
        _completeGame(gameId, winner);
    }
    
    function _completeGame(bytes32 gameId, address winner) internal {
        Game storage game = games[gameId];
        
        game.winner = winner;
        game.isCompleted = true;
        game.isActive = false;
        
        // Calculate payout (95% to winner, 5% house fee)
        uint256 houseFee = (game.totalPot * HOUSE_FEE_PERCENT) / 100;
        uint256 winnerPayout = game.totalPot - houseFee;
        
        // Transfer winnings
        require(arcToken.transfer(winner, winnerPayout), "Winner payout failed");
        require(arcToken.transfer(HOUSE_WALLET, houseFee), "House fee transfer failed");
        
        emit GameCompleted(gameId, winner, winnerPayout);
    }
    
    // Legacy function for manual completion (owner only)
    function completeGame(bytes32 gameId, address winner) external onlyOwner nonReentrant {
        _completeGame(gameId, winner);
    }
    
    function getGame(bytes32 gameId) external view returns (
        address player1,
        address player2,
        uint256 betAmount,
        uint256 totalPot,
        address winner,
        bool isActive,
        bool isCompleted,
        uint256 createdAt
    ) {
        Game memory game = games[gameId];
        return (
            game.player1,
            game.player2,
            game.betAmount,
            game.totalPot,
            game.winner,
            game.isActive,
            game.isCompleted,
            game.createdAt
        );
    }
    
    function hasPlayerPaid(bytes32 gameId, address player) external view returns (bool) {
        return playerPaid[gameId][player];
    }
    
    function isGameReady(bytes32 gameId) external view returns (bool) {
        Game memory game = games[gameId];
        return playerPaid[gameId][game.player1] && playerPaid[gameId][game.player2];
    }
    
    // Emergency function to refund players if game is stuck
    function emergencyRefund(bytes32 gameId) external onlyOwner nonReentrant {
        Game storage game = games[gameId];
        require(!game.isCompleted, "Game already completed");
        require(block.timestamp > game.createdAt + 1 hours, "Too early for emergency refund");
        
        if (playerPaid[gameId][game.player1]) {
            require(arcToken.transfer(game.player1, game.betAmount), "Refund to player1 failed");
        }
        
        if (playerPaid[gameId][game.player2]) {
            require(arcToken.transfer(game.player2, game.betAmount), "Refund to player2 failed");
        }
        
        game.isCompleted = true;
        game.isActive = false;
    }
    
    // Withdraw accumulated gas fees
    function withdrawGasFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No gas fees to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Gas fee withdrawal failed");
    }
}