// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title GameTracker
 * @dev Comprehensive smart contract for tracking all game data on Sonic Network
 * Tracks wins, losses, ARC tokens, game modes, and provides full on-chain game history
 */
contract GameTracker is Ownable, ReentrancyGuard {
    // Game types
    enum GameType { UNO, CHESS, POOL, SNAKE, PLATFORMER }
    
    // Game modes
    enum GameMode { 
        FREE_PLAY,      // Free single player
        PAY_TO_EARN,    // 0.1S fee single player
        MULTIPLAYER,    // Free multiplayer
        BET_MODE,       // Betting with ARC tokens
        GAMBLE_MODE     // High stakes gambling
    }
    
    // Game result status
    enum GameResult { WIN, LOSS, DRAW }
    
    // Game data structure
    struct GameData {
        uint256 gameId;
        GameType gameType;
        GameMode gameMode;
        address player1;
        address player2; // address(0) for single player
        address winner;  // address(0) for draw
        GameResult player1Result;
        GameResult player2Result;
        uint256 arcTokensEarned;
        uint256 arcTokensMinted;
        bool tokensMinted;
        uint256 betAmount; // For bet/gamble modes
        uint256 timestamp;
        uint256 gameDuration; // in seconds
        uint256 score;
        string gameSessionId; // For tracking specific game sessions
    }
    
    // Player statistics
    struct PlayerStats {
        uint256 totalGames;
        uint256 wins;
        uint256 losses;
        uint256 draws;
        uint256 totalArcEarned;
        uint256 totalArcMinted;
        uint256 totalBetAmount;
        uint256 totalWinnings;
        uint256 currentWinStreak;
        uint256 bestWinStreak;
        uint256 lastGameTimestamp;
    }
    
    // Game type specific stats
    struct GameTypeStats {
        uint256 gamesPlayed;
        uint256 wins;
        uint256 losses;
        uint256 draws;
        uint256 arcEarned;
        uint256 bestScore;
        uint256 totalScore;
    }
    
    // Events
    event GameCompleted(
        uint256 indexed gameId,
        GameType indexed gameType,
        GameMode indexed gameMode,
        address player1,
        address player2,
        address winner,
        uint256 arcTokensEarned,
        uint256 timestamp
    );
    
    event TokensMinted(
        uint256 indexed gameId,
        address indexed player,
        uint256 amount,
        uint256 timestamp
    );
    
    event BetPlaced(
        uint256 indexed gameId,
        address indexed player,
        uint256 amount,
        uint256 timestamp
    );
    
    event WinningsDistributed(
        uint256 indexed gameId,
        address indexed winner,
        uint256 amount,
        uint256 timestamp
    );
    
    // State variables
    uint256 public nextGameId = 1;
    IERC20 public arcToken;
    
    // Mappings
    mapping(uint256 => GameData) public games;
    mapping(address => PlayerStats) public playerStats;
    mapping(address => mapping(GameType => GameTypeStats)) public playerGameTypeStats;
    mapping(address => uint256[]) public playerGameHistory;
    mapping(string => uint256) public sessionToGameId;
    
    // Game tracking arrays
    uint256[] public allGameIds;
    mapping(GameType => uint256[]) public gamesByType;
    mapping(GameMode => uint256[]) public gamesByMode;
    mapping(address => mapping(GameType => uint256[])) public playerGamesByType;
    
    // Configuration
    uint256 public constant PAY_TO_EARN_FEE = 0.1 ether; // 0.1 S
    uint256 public constant BASE_ARC_REWARD = 10 * 10**18; // 10 ARC base reward
    uint256 public constant PAY_TO_EARN_MULTIPLIER = 2; // 2x rewards for pay-to-earn
    
    constructor(address _arcToken) {
        arcToken = IERC20(_arcToken);
    }
    
    /**
     * @dev Record a completed game
     */
    function recordGame(
        GameType _gameType,
        GameMode _gameMode,
        address _player1,
        address _player2,
        address _winner,
        uint256 _gameDuration,
        uint256 _score,
        string memory _gameSessionId
    ) external returns (uint256 gameId) {
        gameId = nextGameId++;
        
        // Calculate ARC rewards
        uint256 arcReward = calculateArcReward(_gameMode, _score, _gameDuration);
        
        // Determine game results
        GameResult player1Result = GameResult.LOSS;
        GameResult player2Result = GameResult.LOSS;
        
        if (_winner == address(0)) {
            // Draw
            player1Result = GameResult.DRAW;
            player2Result = GameResult.DRAW;
        } else if (_winner == _player1) {
            player1Result = GameResult.WIN;
            player2Result = (_player2 != address(0)) ? GameResult.LOSS : GameResult.LOSS;
        } else if (_winner == _player2) {
            player1Result = GameResult.LOSS;
            player2Result = GameResult.WIN;
        }
        
        // Create game data
        games[gameId] = GameData({
            gameId: gameId,
            gameType: _gameType,
            gameMode: _gameMode,
            player1: _player1,
            player2: _player2,
            winner: _winner,
            player1Result: player1Result,
            player2Result: player2Result,
            arcTokensEarned: arcReward,
            arcTokensMinted: 0,
            tokensMinted: false,
            betAmount: 0,
            timestamp: block.timestamp,
            gameDuration: _gameDuration,
            score: _score,
            gameSessionId: _gameSessionId
        });
        
        // Update tracking arrays
        allGameIds.push(gameId);
        gamesByType[_gameType].push(gameId);
        gamesByMode[_gameMode].push(gameId);
        playerGameHistory[_player1].push(gameId);
        playerGamesByType[_player1][_gameType].push(gameId);
        
        if (_player2 != address(0)) {
            playerGameHistory[_player2].push(gameId);
            playerGamesByType[_player2][_gameType].push(gameId);
        }
        
        // Map session to game ID
        sessionToGameId[_gameSessionId] = gameId;
        
        // Update player statistics
        updatePlayerStats(_player1, player1Result, _gameType, arcReward, _score);
        if (_player2 != address(0)) {
            updatePlayerStats(_player2, player2Result, _gameType, 0, _score);
        }
        
        emit GameCompleted(
            gameId,
            _gameType,
            _gameMode,
            _player1,
            _player2,
            _winner,
            arcReward,
            block.timestamp
        );
        
        return gameId;
    }
    
    /**
     * @dev Record bet for betting/gambling modes
     */
    function recordBet(
        uint256 _gameId,
        address _player,
        uint256 _betAmount
    ) external {
        require(games[_gameId].gameId != 0, "Game does not exist");
        require(
            games[_gameId].gameMode == GameMode.BET_MODE || 
            games[_gameId].gameMode == GameMode.GAMBLE_MODE,
            "Not a betting game"
        );
        
        games[_gameId].betAmount += _betAmount;
        playerStats[_player].totalBetAmount += _betAmount;
        
        emit BetPlaced(_gameId, _player, _betAmount, block.timestamp);
    }
    
    /**
     * @dev Mint ARC tokens for a completed game
     */
    function mintTokens(
        uint256 _gameId,
        address _player
    ) external nonReentrant {
        GameData storage game = games[_gameId];
        require(game.gameId != 0, "Game does not exist");
        require(!game.tokensMinted, "Tokens already minted");
        require(
            game.winner == _player || 
            (game.player1Result == GameResult.DRAW && (game.player1 == _player || game.player2 == _player)),
            "Player did not win or draw"
        );
        
        uint256 mintAmount = game.arcTokensEarned;
        require(mintAmount > 0, "No tokens to mint");
        
        // Update game data
        game.tokensMinted = true;
        game.arcTokensMinted = mintAmount;
        
        // Update player stats
        playerStats[_player].totalArcMinted += mintAmount;
        playerGameTypeStats[_player][game.gameType].arcEarned += mintAmount;
        
        // Transfer tokens (assuming this contract has minting rights or pre-allocated tokens)
        require(arcToken.transfer(_player, mintAmount), "Token transfer failed");
        
        emit TokensMinted(_gameId, _player, mintAmount, block.timestamp);
    }
    
    /**
     * @dev Distribute winnings for bet/gamble modes
     */
    function distributeWinnings(
        uint256 _gameId,
        address _winner,
        uint256 _winAmount
    ) external onlyOwner {
        GameData storage game = games[_gameId];
        require(game.gameId != 0, "Game does not exist");
        require(game.winner == _winner, "Address is not the winner");
        require(
            game.gameMode == GameMode.BET_MODE || 
            game.gameMode == GameMode.GAMBLE_MODE,
            "Not a betting game"
        );
        
        playerStats[_winner].totalWinnings += _winAmount;
        
        emit WinningsDistributed(_gameId, _winner, _winAmount, block.timestamp);
    }
    
    /**
     * @dev Calculate ARC reward based on game mode and performance
     */
    function calculateArcReward(
        GameMode _gameMode,
        uint256 _score,
        uint256 _gameDuration
    ) public pure returns (uint256) {
        uint256 baseReward = BASE_ARC_REWARD;
        
        // Apply mode multipliers
        if (_gameMode == GameMode.PAY_TO_EARN) {
            baseReward = baseReward * PAY_TO_EARN_MULTIPLIER;
        }
        
        // Score bonus (up to 50% bonus)
        uint256 scoreBonus = (_score * baseReward * 50) / (1000 * 100); // Max 50% bonus
        
        // Time bonus for quick games (up to 25% bonus)
        uint256 timeBonus = 0;
        if (_gameDuration < 300) { // Less than 5 minutes
            timeBonus = (baseReward * 25) / 100;
        } else if (_gameDuration < 600) { // Less than 10 minutes
            timeBonus = (baseReward * 10) / 100;
        }
        
        return baseReward + scoreBonus + timeBonus;
    }
    
    /**
     * @dev Update player statistics
     */
    function updatePlayerStats(
        address _player,
        GameResult _result,
        GameType _gameType,
        uint256 _arcEarned,
        uint256 _score
    ) internal {
        PlayerStats storage stats = playerStats[_player];
        GameTypeStats storage gameTypeStats = playerGameTypeStats[_player][_gameType];
        
        // Update general stats
        stats.totalGames++;
        stats.lastGameTimestamp = block.timestamp;
        
        // Update game type stats
        gameTypeStats.gamesPlayed++;
        gameTypeStats.totalScore += _score;
        if (_score > gameTypeStats.bestScore) {
            gameTypeStats.bestScore = _score;
        }
        
        // Update result-specific stats
        if (_result == GameResult.WIN) {
            stats.wins++;
            stats.currentWinStreak++;
            gameTypeStats.wins++;
            
            if (stats.currentWinStreak > stats.bestWinStreak) {
                stats.bestWinStreak = stats.currentWinStreak;
            }
        } else if (_result == GameResult.LOSS) {
            stats.losses++;
            stats.currentWinStreak = 0;
            gameTypeStats.losses++;
        } else {
            stats.draws++;
            gameTypeStats.draws++;
        }
        
        // Update ARC earnings
        if (_arcEarned > 0) {
            stats.totalArcEarned += _arcEarned;
            gameTypeStats.arcEarned += _arcEarned;
        }
    }
    
    // View functions
    
    /**
     * @dev Get player statistics
     */
    function getPlayerStats(address _player) external view returns (PlayerStats memory) {
        return playerStats[_player];
    }
    
    /**
     * @dev Get player game type statistics
     */
    function getPlayerGameTypeStats(address _player, GameType _gameType) external view returns (GameTypeStats memory) {
        return playerGameTypeStats[_player][_gameType];
    }
    
    /**
     * @dev Get game data
     */
    function getGame(uint256 _gameId) external view returns (GameData memory) {
        return games[_gameId];
    }
    
    /**
     * @dev Get player's game history
     */
    function getPlayerGameHistory(address _player) external view returns (uint256[] memory) {
        return playerGameHistory[_player];
    }
    
    /**
     * @dev Get player's games by type
     */
    function getPlayerGamesByType(address _player, GameType _gameType) external view returns (uint256[] memory) {
        return playerGamesByType[_player][_gameType];
    }
    
    /**
     * @dev Get all games of a specific type
     */
    function getGamesByType(GameType _gameType) external view returns (uint256[] memory) {
        return gamesByType[_gameType];
    }
    
    /**
     * @dev Get all games of a specific mode
     */
    function getGamesByMode(GameMode _gameMode) external view returns (uint256[] memory) {
        return gamesByMode[_gameMode];
    }
    
    /**
     * @dev Get recent games (last N games)
     */
    function getRecentGames(uint256 _count) external view returns (uint256[] memory) {
        uint256 totalGames = allGameIds.length;
        if (totalGames == 0) {
            return new uint256[](0);
        }
        
        uint256 count = _count > totalGames ? totalGames : _count;
        uint256[] memory recentGames = new uint256[](count);
        
        for (uint256 i = 0; i < count; i++) {
            recentGames[i] = allGameIds[totalGames - 1 - i];
        }
        
        return recentGames;
    }
    
    /**
     * @dev Get total number of games
     */
    function getTotalGames() external view returns (uint256) {
        return allGameIds.length;
    }
    
    /**
     * @dev Get game ID by session ID
     */
    function getGameBySession(string memory _sessionId) external view returns (uint256) {
        return sessionToGameId[_sessionId];
    }
    
    /**
     * @dev Calculate win rate for a player
     */
    function getWinRate(address _player) external view returns (uint256) {
        PlayerStats memory stats = playerStats[_player];
        if (stats.totalGames == 0) return 0;
        return (stats.wins * 10000) / stats.totalGames; // Returns basis points (e.g., 7500 = 75%)
    }
    
    /**
     * @dev Get leaderboard (top players by wins)
     */
    function getTopPlayersByWins(uint256 _count) external view returns (address[] memory, uint256[] memory) {
        // Note: This is a simplified implementation. In production, you'd want to maintain a sorted list
        // or use a more efficient data structure for leaderboards
        address[] memory topPlayers = new address[](_count);
        uint256[] memory topWins = new uint256[](_count);
        
        // This would need to be implemented with proper sorting logic
        // For now, returning empty arrays as placeholder
        return (topPlayers, topWins);
    }
    
    // Admin functions
    
    /**
     * @dev Update ARC token contract address
     */
    function updateArcToken(address _newArcToken) external onlyOwner {
        arcToken = IERC20(_newArcToken);
    }
    
    /**
     * @dev Emergency withdraw tokens
     */
    function emergencyWithdraw(address _token, uint256 _amount) external onlyOwner {
        IERC20(_token).transfer(owner(), _amount);
    }
    
    /**
     * @dev Emergency withdraw ETH/S
     */
    function emergencyWithdrawETH() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
    
    // Receive function to accept ETH/S payments
    receive() external payable {}
}