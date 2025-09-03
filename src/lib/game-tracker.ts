import { ethers } from 'ethers';
import { useWeb3 } from '../components/web3/Web3Provider';

// Game types enum matching the smart contract
export enum GameType {
  UNO = 0,
  CHESS = 1,
  POOL = 2,
  SNAKE = 3,
  PLATFORMER = 4
}

// Game modes enum matching the smart contract
export enum GameMode {
  FREE_PLAY = 0,
  PAY_TO_EARN = 1,
  MULTIPLAYER = 2,
  BET_MODE = 3,
  GAMBLE_MODE = 4
}

// Game result enum matching the smart contract
export enum GameResult {
  WIN = 0,
  LOSS = 1,
  DRAW = 2
}

// TypeScript interfaces
export interface GameData {
  gameId: string;
  gameType: GameType;
  gameMode: GameMode;
  player1: string;
  player2: string;
  winner: string;
  player1Result: GameResult;
  player2Result: GameResult;
  arcTokensEarned: string;
  arcTokensMinted: string;
  tokensMinted: boolean;
  betAmount: string;
  timestamp: string;
  gameDuration: string;
  score: string;
  gameSessionId: string;
}

export interface PlayerStats {
  totalGames: string;
  wins: string;
  losses: string;
  draws: string;
  totalArcEarned: string;
  totalArcMinted: string;
  totalBetAmount: string;
  totalWinnings: string;
  currentWinStreak: string;
  bestWinStreak: string;
  lastGameTimestamp: string;
}

export interface GameTypeStats {
  gamesPlayed: string;
  wins: string;
  losses: string;
  draws: string;
  arcEarned: string;
  bestScore: string;
  totalScore: string;
}

// Contract configuration
const GAME_TRACKER_ADDRESS = '0x1234567890123456789012345678901234567890'; // TODO: Update with deployed address
const GAME_TRACKER_ABI = [
  // Add the ABI here after compilation
  // This is a placeholder - will be updated after contract compilation
  'function recordGame(uint8 gameType, uint8 gameMode, address player1, address player2, address winner, uint256 gameDuration, uint256 score, string gameSessionId) external returns (uint256)',
  'function mintTokens(uint256 gameId, address player) external',
  'function recordBet(uint256 gameId, address player, uint256 betAmount) external',
  'function getPlayerStats(address player) external view returns (tuple(uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256))',
  'function getPlayerGameTypeStats(address player, uint8 gameType) external view returns (tuple(uint256,uint256,uint256,uint256,uint256,uint256,uint256))',
  'function getGame(uint256 gameId) external view returns (tuple(uint256,uint8,uint8,address,address,address,uint8,uint8,uint256,uint256,bool,uint256,uint256,uint256,uint256,string))',
  'function getPlayerGameHistory(address player) external view returns (uint256[])',
  'function getRecentGames(uint256 count) external view returns (uint256[])',
  'function getTotalGames() external view returns (uint256)',
  'function getWinRate(address player) external view returns (uint256)',
  'function calculateArcReward(uint8 gameMode, uint256 score, uint256 gameDuration) external pure returns (uint256)',
  'event GameCompleted(uint256 indexed gameId, uint8 indexed gameType, uint8 indexed gameMode, address player1, address player2, address winner, uint256 arcTokensEarned, uint256 timestamp)',
  'event TokensMinted(uint256 indexed gameId, address indexed player, uint256 amount, uint256 timestamp)'
];

/**
 * GameTracker service for interacting with the smart contract
 */
export class GameTrackerService {
  private contract: ethers.Contract | null = null;
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.JsonRpcSigner | null = null;

  /**
   * Initialize the service with web3 provider
   */
  async initialize(provider: ethers.BrowserProvider, signer: ethers.JsonRpcSigner) {
    this.provider = provider;
    this.signer = signer;
    this.contract = new ethers.Contract(GAME_TRACKER_ADDRESS, GAME_TRACKER_ABI, signer);
  }

  /**
   * Record a completed game on the blockchain
   */
  async recordGame(
    gameType: GameType,
    gameMode: GameMode,
    player1: string,
    player2: string = ethers.ZeroAddress,
    winner: string = ethers.ZeroAddress,
    gameDuration: number,
    score: number,
    gameSessionId: string
  ): Promise<{ gameId: string; txHash: string }> {
    if (!this.contract) throw new Error('Contract not initialized');

    try {
      console.log('🎮 [GAME TRACKER] Recording game:', {
        gameType,
        gameMode,
        player1,
        player2,
        winner,
        gameDuration,
        score,
        gameSessionId
      });

      const tx = await this.contract.recordGame(
        gameType,
        gameMode,
        player1,
        player2,
        winner,
        gameDuration,
        score,
        gameSessionId
      );

      console.log('📝 [GAME TRACKER] Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('✅ [GAME TRACKER] Transaction confirmed:', receipt.hash);

      // Extract game ID from events
      const gameCompletedEvent = receipt.logs.find(
        (log: any) => log.fragment?.name === 'GameCompleted'
      );
      
      const gameId = gameCompletedEvent ? gameCompletedEvent.args[0].toString() : '0';

      return {
        gameId,
        txHash: receipt.hash
      };
    } catch (error) {
      console.error('❌ [GAME TRACKER] Failed to record game:', error);
      throw error;
    }
  }

  /**
   * Mint ARC tokens for a completed game
   */
  async mintTokens(gameId: string, player: string): Promise<string> {
    if (!this.contract) throw new Error('Contract not initialized');

    try {
      console.log('🪙 [GAME TRACKER] Minting tokens for game:', gameId, 'player:', player);

      const tx = await this.contract.mintTokens(gameId, player);
      console.log('📝 [GAME TRACKER] Mint transaction sent:', tx.hash);
      
      const receipt = await tx.wait();
      console.log('✅ [GAME TRACKER] Tokens minted successfully:', receipt.hash);

      return receipt.hash;
    } catch (error) {
      console.error('❌ [GAME TRACKER] Failed to mint tokens:', error);
      throw error;
    }
  }

  /**
   * Record a bet for betting/gambling modes
   */
  async recordBet(gameId: string, player: string, betAmount: string): Promise<string> {
    if (!this.contract) throw new Error('Contract not initialized');

    try {
      console.log('💰 [GAME TRACKER] Recording bet:', { gameId, player, betAmount });

      const tx = await this.contract.recordBet(gameId, player, ethers.parseEther(betAmount));
      console.log('📝 [GAME TRACKER] Bet transaction sent:', tx.hash);
      
      const receipt = await tx.wait();
      console.log('✅ [GAME TRACKER] Bet recorded successfully:', receipt.hash);

      return receipt.hash;
    } catch (error) {
      console.error('❌ [GAME TRACKER] Failed to record bet:', error);
      throw error;
    }
  }

  /**
   * Get player statistics
   */
  async getPlayerStats(playerAddress: string): Promise<PlayerStats> {
    if (!this.contract) throw new Error('Contract not initialized');

    try {
      const stats = await this.contract.getPlayerStats(playerAddress);
      
      return {
        totalGames: stats[0].toString(),
        wins: stats[1].toString(),
        losses: stats[2].toString(),
        draws: stats[3].toString(),
        totalArcEarned: ethers.formatEther(stats[4]),
        totalArcMinted: ethers.formatEther(stats[5]),
        totalBetAmount: ethers.formatEther(stats[6]),
        totalWinnings: ethers.formatEther(stats[7]),
        currentWinStreak: stats[8].toString(),
        bestWinStreak: stats[9].toString(),
        lastGameTimestamp: stats[10].toString()
      };
    } catch (error) {
      console.error('❌ [GAME TRACKER] Failed to get player stats:', error);
      throw error;
    }
  }

  /**
   * Get player game type statistics
   */
  async getPlayerGameTypeStats(playerAddress: string, gameType: GameType): Promise<GameTypeStats> {
    if (!this.contract) throw new Error('Contract not initialized');

    try {
      const stats = await this.contract.getPlayerGameTypeStats(playerAddress, gameType);
      
      return {
        gamesPlayed: stats[0].toString(),
        wins: stats[1].toString(),
        losses: stats[2].toString(),
        draws: stats[3].toString(),
        arcEarned: ethers.formatEther(stats[4]),
        bestScore: stats[5].toString(),
        totalScore: stats[6].toString()
      };
    } catch (error) {
      console.error('❌ [GAME TRACKER] Failed to get game type stats:', error);
      throw error;
    }
  }

  /**
   * Get game data by ID
   */
  async getGame(gameId: string): Promise<GameData> {
    if (!this.contract) throw new Error('Contract not initialized');

    try {
      const game = await this.contract.getGame(gameId);
      
      return {
        gameId: game[0].toString(),
        gameType: game[1],
        gameMode: game[2],
        player1: game[3],
        player2: game[4],
        winner: game[5],
        player1Result: game[6],
        player2Result: game[7],
        arcTokensEarned: ethers.formatEther(game[8]),
        arcTokensMinted: ethers.formatEther(game[9]),
        tokensMinted: game[10],
        betAmount: ethers.formatEther(game[11]),
        timestamp: game[12].toString(),
        gameDuration: game[13].toString(),
        score: game[14].toString(),
        gameSessionId: game[15]
      };
    } catch (error) {
      console.error('❌ [GAME TRACKER] Failed to get game data:', error);
      throw error;
    }
  }

  /**
   * Get player's game history
   */
  async getPlayerGameHistory(playerAddress: string): Promise<string[]> {
    if (!this.contract) throw new Error('Contract not initialized');

    try {
      const gameIds = await this.contract.getPlayerGameHistory(playerAddress);
      return gameIds.map((id: any) => id.toString());
    } catch (error) {
      console.error('❌ [GAME TRACKER] Failed to get game history:', error);
      throw error;
    }
  }

  /**
   * Get recent games
   */
  async getRecentGames(count: number = 10): Promise<string[]> {
    if (!this.contract) throw new Error('Contract not initialized');

    try {
      const gameIds = await this.contract.getRecentGames(count);
      return gameIds.map((id: any) => id.toString());
    } catch (error) {
      console.error('❌ [GAME TRACKER] Failed to get recent games:', error);
      throw error;
    }
  }

  /**
   * Get total number of games
   */
  async getTotalGames(): Promise<number> {
    if (!this.contract) throw new Error('Contract not initialized');

    try {
      const total = await this.contract.getTotalGames();
      return parseInt(total.toString());
    } catch (error) {
      console.error('❌ [GAME TRACKER] Failed to get total games:', error);
      throw error;
    }
  }

  /**
   * Get player win rate (in basis points)
   */
  async getWinRate(playerAddress: string): Promise<number> {
    if (!this.contract) throw new Error('Contract not initialized');

    try {
      const winRate = await this.contract.getWinRate(playerAddress);
      return parseInt(winRate.toString()) / 100; // Convert from basis points to percentage
    } catch (error) {
      console.error('❌ [GAME TRACKER] Failed to get win rate:', error);
      throw error;
    }
  }

  /**
   * Calculate ARC reward for a game
   */
  async calculateArcReward(gameMode: GameMode, score: number, gameDuration: number): Promise<string> {
    if (!this.contract) throw new Error('Contract not initialized');

    try {
      const reward = await this.contract.calculateArcReward(gameMode, score, gameDuration);
      return ethers.formatEther(reward);
    } catch (error) {
      console.error('❌ [GAME TRACKER] Failed to calculate ARC reward:', error);
      throw error;
    }
  }

  /**
   * Helper function to convert game type string to enum
   */
  static getGameTypeEnum(gameType: string): GameType {
    switch (gameType.toLowerCase()) {
      case 'uno': return GameType.UNO;
      case 'chess': return GameType.CHESS;
      case 'pool': return GameType.POOL;
      case 'snake': return GameType.SNAKE;
      case 'platformer': return GameType.PLATFORMER;
      default: throw new Error(`Unknown game type: ${gameType}`);
    }
  }

  /**
   * Helper function to convert game mode string to enum
   */
  static getGameModeEnum(gameMode: string): GameMode {
    switch (gameMode.toLowerCase()) {
      case 'free': 
      case 'free_play': return GameMode.FREE_PLAY;
      case 'bonus':
      case 'pay_to_earn': return GameMode.PAY_TO_EARN;
      case 'multiplayer': return GameMode.MULTIPLAYER;
      case 'betting':
      case 'bet_mode': return GameMode.BET_MODE;
      case 'gamble':
      case 'gamble_mode': return GameMode.GAMBLE_MODE;
      default: throw new Error(`Unknown game mode: ${gameMode}`);
    }
  }
}

// Singleton instance
export const gameTrackerService = new GameTrackerService();

/**
 * Hook for using GameTracker service in React components
 */
export const useGameTracker = () => {
  const { getProvider, getSigner } = useWeb3();

  const initializeTracker = async () => {
    const provider = getProvider();
    const signer = getSigner();
    
    if (provider && signer) {
      await gameTrackerService.initialize(provider, await signer);
    }
  };

  return {
    gameTrackerService,
    initializeTracker
  };
};