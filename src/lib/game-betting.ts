import { ethers } from 'ethers';
import { useWeb3 } from '@/components/web3/Web3Provider';

// GameBetting contract ABI (essential functions)
const GAME_BETTING_ABI = [
  "function createBet(uint256 _amount, string memory _gameType, string memory _lobbyId) external",
  "function joinBet(string memory _lobbyId) external",
  "function resolveBet(string memory _lobbyId, address _winner) external",
  "function cancelBet(string memory _lobbyId) external",
  "function emergencyRefund(string memory _lobbyId) external",
  "function getBetByLobby(string memory _lobbyId) external view returns (tuple(address player1, address player2, uint256 amount, string gameType, string lobbyId, bool active, uint256 createdAt, address winner, bool resolved))",
  "function getPlayerBets(address _player) external view returns (uint256[] memory)",
  "function hasActiveBet(string memory _lobbyId) external view returns (bool)",
  "function getStats() external view returns (uint256, uint256, uint256, uint256)",
  "function houseFeePercent() external view returns (uint256)",
  "function minBetAmount() external view returns (uint256)",
  "function maxBetAmount() external view returns (uint256)",
  "function arcToken() external view returns (address)",
  "event BetCreated(uint256 indexed betId, string indexed lobbyId, address indexed player1, uint256 amount, string gameType)",
  "event BetJoined(uint256 indexed betId, string indexed lobbyId, address indexed player2, uint256 amount)",
  "event BetResolved(uint256 indexed betId, string indexed lobbyId, address indexed winner, uint256 winnings, uint256 houseFee)",
  "event BetCancelled(uint256 indexed betId, string indexed lobbyId, address indexed player1, uint256 refundAmount)"
];

// ARC Token ABI (for approvals)
const ARC_TOKEN_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)"
];

import { BETTING_CONFIG, getContractConfig } from './betting-config';

// Contract addresses
const ARC_TOKEN_ADDRESS = BETTING_CONFIG.ARC_TOKEN_CONTRACT;
let GAME_BETTING_CONTRACT_ADDRESS = BETTING_CONFIG.GAME_BETTING_CONTRACT;

// Bet structure
export interface Bet {
  player1: string;
  player2: string;
  amount: string;
  gameType: string;
  lobbyId: string;
  active: boolean;
  createdAt: number;
  winner: string;
  resolved: boolean;
}

export interface BetStats {
  totalBetsCreated: number;
  totalBetsResolved: number;
  totalVolumeWagered: string;
  totalHouseFees: string;
}

export class GameBettingService {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.Signer | null = null;
  private gameBettingContract: ethers.Contract | null = null;
  private arcTokenContract: ethers.Contract | null = null;

  constructor(contractAddress?: string) {
    if (contractAddress) {
      GAME_BETTING_CONTRACT_ADDRESS = contractAddress;
    }
  }

  async initialize(provider: ethers.BrowserProvider, signer: ethers.Signer) {
    this.provider = provider;
    this.signer = signer;
    
    if (!GAME_BETTING_CONTRACT_ADDRESS) {
      throw new Error('GameBetting contract address not set');
    }
    
    this.gameBettingContract = new ethers.Contract(
      GAME_BETTING_CONTRACT_ADDRESS,
      GAME_BETTING_ABI,
      signer
    );
    
    this.arcTokenContract = new ethers.Contract(
      ARC_TOKEN_ADDRESS,
      ARC_TOKEN_ABI,
      signer
    );
  }

  // Check if user has sufficient ARC token balance
  async checkBalance(userAddress: string, amount: string): Promise<boolean> {
    if (!this.arcTokenContract) throw new Error('Not initialized');
    
    const balance = await this.arcTokenContract.balanceOf(userAddress);
    const amountWei = ethers.parseEther(amount);
    
    return balance >= amountWei;
  }

  // Check if user has approved sufficient tokens
  async checkAllowance(userAddress: string, amount: string): Promise<boolean> {
    if (!this.arcTokenContract) throw new Error('Not initialized');
    
    const allowance = await this.arcTokenContract.allowance(userAddress, GAME_BETTING_CONTRACT_ADDRESS);
    const amountWei = ethers.parseEther(amount);
    
    return allowance >= amountWei;
  }

  // Approve tokens for betting
  async approveTokens(amount: string): Promise<ethers.TransactionResponse> {
    if (!this.arcTokenContract) throw new Error('Not initialized');
    
    const amountWei = ethers.parseEther(amount);
    return await this.arcTokenContract.approve(GAME_BETTING_CONTRACT_ADDRESS, amountWei);
  }

  // Create a new bet
  async createBet(amount: string, gameType: string, lobbyId: string): Promise<ethers.TransactionResponse> {
    if (!this.gameBettingContract) throw new Error('Not initialized');
    
    const amountWei = ethers.parseEther(amount);
    return await this.gameBettingContract.createBet(amountWei, gameType, lobbyId);
  }

  // Join an existing bet
  async joinBet(lobbyId: string): Promise<ethers.TransactionResponse> {
    if (!this.gameBettingContract) throw new Error('Not initialized');
    
    return await this.gameBettingContract.joinBet(lobbyId);
  }

  // Cancel a bet (only creator, only if no second player)
  async cancelBet(lobbyId: string): Promise<ethers.TransactionResponse> {
    if (!this.gameBettingContract) throw new Error('Not initialized');
    
    return await this.gameBettingContract.cancelBet(lobbyId);
  }

  // Get bet information by lobby ID
  async getBetByLobby(lobbyId: string): Promise<Bet | null> {
    if (!this.gameBettingContract) throw new Error('Not initialized');
    
    try {
      const bet = await this.gameBettingContract.getBetByLobby(lobbyId);
      return {
        player1: bet.player1,
        player2: bet.player2,
        amount: ethers.formatEther(bet.amount),
        gameType: bet.gameType,
        lobbyId: bet.lobbyId,
        active: bet.active,
        createdAt: Number(bet.createdAt),
        winner: bet.winner,
        resolved: bet.resolved
      };
    } catch (error) {
      console.error('Error getting bet:', error);
      return null;
    }
  }

  // Check if lobby has active bet
  async hasActiveBet(lobbyId: string): Promise<boolean> {
    if (!this.gameBettingContract) throw new Error('Not initialized');
    
    try {
      return await this.gameBettingContract.hasActiveBet(lobbyId);
    } catch (error) {
      console.error('Error checking active bet:', error);
      return false;
    }
  }

  // Get player's bet history
  async getPlayerBets(playerAddress: string): Promise<number[]> {
    if (!this.gameBettingContract) throw new Error('Not initialized');
    
    try {
      const betIds = await this.gameBettingContract.getPlayerBets(playerAddress);
      return betIds.map((id: bigint) => Number(id));
    } catch (error) {
      console.error('Error getting player bets:', error);
      return [];
    }
  }

  // Get contract statistics
  async getStats(): Promise<BetStats> {
    if (!this.gameBettingContract) throw new Error('Not initialized');
    
    try {
      const [totalCreated, totalResolved, totalVolume, totalFees] = await this.gameBettingContract.getStats();
      
      return {
        totalBetsCreated: Number(totalCreated),
        totalBetsResolved: Number(totalResolved),
        totalVolumeWagered: ethers.formatEther(totalVolume),
        totalHouseFees: ethers.formatEther(totalFees)
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      return {
        totalBetsCreated: 0,
        totalBetsResolved: 0,
        totalVolumeWagered: '0',
        totalHouseFees: '0'
      };
    }
  }

  // Get contract configuration
  async getConfig(): Promise<{
    houseFeePercent: number;
    minBetAmount: string;
    maxBetAmount: string;
  }> {
    if (!this.gameBettingContract) throw new Error('Not initialized');
    
    try {
      const [houseFee, minBet, maxBet] = await Promise.all([
        this.gameBettingContract.houseFeePercent(),
        this.gameBettingContract.minBetAmount(),
        this.gameBettingContract.maxBetAmount()
      ]);
      
      return {
        houseFeePercent: Number(houseFee) / 100, // Convert basis points to percentage
        minBetAmount: ethers.formatEther(minBet),
        maxBetAmount: ethers.formatEther(maxBet)
      };
    } catch (error) {
      console.error('Error getting config:', error);
      return {
        houseFeePercent: 5,
        minBetAmount: '1',
        maxBetAmount: '1000'
      };
    }
  }

  // Get user's ARC token balance
  async getArcBalance(userAddress: string): Promise<string> {
    if (!this.arcTokenContract) throw new Error('Not initialized');
    
    try {
      const balance = await this.arcTokenContract.balanceOf(userAddress);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Error getting ARC balance:', error);
      return '0';
    }
  }

  // Listen to contract events
  onBetCreated(callback: (betId: number, lobbyId: string, player1: string, amount: string, gameType: string) => void) {
    if (!this.gameBettingContract) throw new Error('Not initialized');
    
    this.gameBettingContract.on('BetCreated', (betId, lobbyId, player1, amount, gameType) => {
      callback(Number(betId), lobbyId, player1, ethers.formatEther(amount), gameType);
    });
  }

  onBetJoined(callback: (betId: number, lobbyId: string, player2: string, amount: string) => void) {
    if (!this.gameBettingContract) throw new Error('Not initialized');
    
    this.gameBettingContract.on('BetJoined', (betId, lobbyId, player2, amount) => {
      callback(Number(betId), lobbyId, player2, ethers.formatEther(amount));
    });
  }

  onBetResolved(callback: (betId: number, lobbyId: string, winner: string, winnings: string, houseFee: string) => void) {
    if (!this.gameBettingContract) throw new Error('Not initialized');
    
    this.gameBettingContract.on('BetResolved', (betId, lobbyId, winner, winnings, houseFee) => {
      callback(Number(betId), lobbyId, winner, ethers.formatEther(winnings), ethers.formatEther(houseFee));
    });
  }

  // Remove all event listeners
  removeAllListeners() {
    if (this.gameBettingContract) {
      this.gameBettingContract.removeAllListeners();
    }
  }

  // Set contract address (for after deployment)
  static setContractAddress(address: string) {
    GAME_BETTING_CONTRACT_ADDRESS = address;
  }

  // Get contract addresses
  static getAddresses() {
    return {
      gameBetting: GAME_BETTING_CONTRACT_ADDRESS,
      arcToken: ARC_TOKEN_ADDRESS
    };
  }
}

// Hook for using GameBetting service
export const useGameBetting = () => {
  const { provider, signer, account } = useWeb3();
  
  const createService = async (contractAddress?: string): Promise<GameBettingService> => {
    if (!provider || !signer) {
      throw new Error('Web3 not connected');
    }
    
    const service = new GameBettingService(contractAddress);
    await service.initialize(provider, signer);
    return service;
  };
  
  return {
    createService,
    account,
    isConnected: !!provider && !!signer
  };
};

export default GameBettingService;