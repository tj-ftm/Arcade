import { ethers } from 'ethers';
import { ARC_TOKEN_ADDRESS } from '@/types';

// UNO Gamble Smart Contract Interface
export interface UnoGambleGame {
  player1: string;
  player2: string;
  betAmount: string;
  totalPot: string;
  winner: string;
  isActive: boolean;
  isCompleted: boolean;
  createdAt: number;
}

export interface GameCreationResult {
  gameId: string;
  contractAddress: string;
  txHash: string;
}

export interface PaymentResult {
  txHash: string;
  success: boolean;
}

// Contract ABI for UNO Gamble
const UNO_GAMBLE_ABI = [
  "function createGame(bytes32 gameId, address player1, address player2, uint256 betAmount) external payable",
  "function payBet(bytes32 gameId) external",
  "function completeGame(bytes32 gameId, address winner) external",
  "function getGame(bytes32 gameId) external view returns (address, address, uint256, uint256, address, bool, bool, uint256)",
  "function hasPlayerPaid(bytes32 gameId, address player) external view returns (bool)",
  "function isGameReady(bytes32 gameId) external view returns (bool)",
  "event GameCreated(bytes32 indexed gameId, address indexed player1, address indexed player2, uint256 betAmount)",
  "event PlayerPaid(bytes32 indexed gameId, address indexed player, uint256 amount)",
  "event GameStarted(bytes32 indexed gameId)",
  "event GameCompleted(bytes32 indexed gameId, address indexed winner, uint256 payout)"
];

// ARC Token ABI (simplified)
const ARC_TOKEN_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function transfer(address to, uint256 amount) external returns (bool)"
];

export class UnoGambleContract {
  private provider: ethers.JsonRpcProvider;
  private signer: ethers.Signer | null = null;
  private contract: ethers.Contract | null = null;
  private arcToken: ethers.Contract | null = null;
  
  constructor() {
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.soniclabs.com/';
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
  }
  
  async initialize(signer: ethers.Signer, contractAddress: string) {
    this.signer = signer;
    this.contract = new ethers.Contract(contractAddress, UNO_GAMBLE_ABI, signer);
    
    // Initialize ARC token contract
    this.arcToken = new ethers.Contract(ARC_TOKEN_ADDRESS, ARC_TOKEN_ABI, signer);
  }
  
  // Deploy a new UNO Gamble contract for this game
  async deployGameContract(): Promise<string> {
    try {
      console.log('🚀 [UNO GAMBLE] Using pre-deployed contract...');
      
      // Use a fixed contract address for development
      // In production, this would be the actual deployed UnoGamble contract
      const contractAddress = '0x1234567890123456789012345678901234567890';
      
      console.log('✅ [UNO GAMBLE] Contract address:', contractAddress);
      return contractAddress;
      
    } catch (error) {
      console.error('❌ [UNO GAMBLE] Contract deployment failed:', error);
      throw error;
    }
  }
  
  // Create a new gambling game
  async createGame(
    gameId: string,
    player1: string,
    player2: string,
    betAmount: string
  ): Promise<GameCreationResult> {
    if (!this.contract || !this.signer) {
      throw new Error('Contract not initialized');
    }
    
    try {
      console.log('🎮 [UNO GAMBLE] Creating game:', { gameId, player1, player2, betAmount });
      
      const gameIdBytes = ethers.id(gameId); // Convert to bytes32
      const betAmountWei = ethers.parseEther(betAmount);
      const gasFee = ethers.parseEther('0.05'); // 0.05 S for gas
      
      const tx = await this.contract.createGame(
        gameIdBytes,
        player1,
        player2,
        betAmountWei,
        { value: gasFee }
      );
      
      console.log('📝 [UNO GAMBLE] Game creation transaction:', tx.hash);
      await tx.wait();
      
      return {
        gameId,
        contractAddress: await this.contract.getAddress(),
        txHash: tx.hash
      };
      
    } catch (error) {
      console.error('❌ [UNO GAMBLE] Game creation failed:', error);
      throw error;
    }
  }
  
  // Check and approve ARC tokens for betting
  async approveTokens(betAmount: string): Promise<string> {
    if (!this.arcToken || !this.contract || !this.signer) {
      throw new Error('Contracts not initialized');
    }
    
    try {
      const betAmountWei = ethers.parseEther(betAmount);
      const contractAddress = await this.contract.getAddress();
      
      // Check current allowance
      const currentAllowance = await this.arcToken.allowance(
        await this.signer.getAddress(),
        contractAddress
      );
      
      if (currentAllowance >= betAmountWei) {
        console.log('✅ [UNO GAMBLE] Sufficient allowance already exists');
        return '';
      }
      
      console.log('🔓 [UNO GAMBLE] Approving ARC tokens:', betAmount);
      
      const tx = await this.arcToken.approve(contractAddress, betAmountWei);
      console.log('📝 [UNO GAMBLE] Approval transaction:', tx.hash);
      
      await tx.wait();
      return tx.hash;
      
    } catch (error) {
      console.error('❌ [UNO GAMBLE] Token approval failed:', error);
      throw error;
    }
  }
  
  // Pay the bet for a game
  async payBet(gameId: string): Promise<PaymentResult> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }
    
    try {
      console.log('💰 [UNO GAMBLE] Paying bet for game:', gameId);
      
      const gameIdBytes = ethers.id(gameId);
      const tx = await this.contract.payBet(gameIdBytes);
      
      console.log('📝 [UNO GAMBLE] Payment transaction:', tx.hash);
      await tx.wait();
      
      return {
        txHash: tx.hash,
        success: true
      };
      
    } catch (error) {
      console.error('❌ [UNO GAMBLE] Payment failed:', error);
      return {
        txHash: '',
        success: false
      };
    }
  }
  
  // Complete the game and distribute winnings
  async completeGame(gameId: string, winner: string): Promise<string> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }
    
    try {
      console.log('🏆 [UNO GAMBLE] Completing game:', { gameId, winner });
      
      const gameIdBytes = ethers.id(gameId);
      const tx = await this.contract.completeGame(gameIdBytes, winner);
      
      console.log('📝 [UNO GAMBLE] Game completion transaction:', tx.hash);
      await tx.wait();
      
      return tx.hash;
      
    } catch (error) {
      console.error('❌ [UNO GAMBLE] Game completion failed:', error);
      throw error;
    }
  }
  
  // Get game information
  async getGame(gameId: string): Promise<UnoGambleGame | null> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }
    
    try {
      const gameIdBytes = ethers.id(gameId);
      const result = await this.contract.getGame(gameIdBytes);
      
      return {
        player1: result[0],
        player2: result[1],
        betAmount: ethers.formatEther(result[2]),
        totalPot: ethers.formatEther(result[3]),
        winner: result[4],
        isActive: result[5],
        isCompleted: result[6],
        createdAt: Number(result[7])
      };
      
    } catch (error) {
      console.error('❌ [UNO GAMBLE] Failed to get game info:', error);
      return null;
    }
  }
  
  // Check if player has paid
  async hasPlayerPaid(gameId: string, player: string): Promise<boolean> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }
    
    try {
      const gameIdBytes = ethers.id(gameId);
      return await this.contract.hasPlayerPaid(gameIdBytes, player);
    } catch (error) {
      console.error('❌ [UNO GAMBLE] Failed to check payment status:', error);
      return false;
    }
  }
  
  // Check if game is ready to start
  async isGameReady(gameId: string): Promise<boolean> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }
    
    try {
      const gameIdBytes = ethers.id(gameId);
      return await this.contract.isGameReady(gameIdBytes);
    } catch (error) {
      console.error('❌ [UNO GAMBLE] Failed to check game readiness:', error);
      return false;
    }
  }
  
  // Get player's ARC token balance
  async getPlayerBalance(playerAddress: string): Promise<string> {
    try {
      // Create a temporary ARC token contract if not initialized
      let arcTokenContract = this.arcToken;
      if (!arcTokenContract) {
        const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.soniclabs.com/');
        arcTokenContract = new ethers.Contract(ARC_TOKEN_ADDRESS, ARC_TOKEN_ABI, provider);
      }
      
      const balance = await arcTokenContract.balanceOf(playerAddress);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('❌ [UNO GAMBLE] Failed to get player balance:', error);
      return '0';
    }
  }
  
  // Static method to get player balance without initialization
  static async getPlayerBalanceStatic(playerAddress: string): Promise<string> {
    try {
      const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.soniclabs.com/');
      const arcTokenContract = new ethers.Contract(ARC_TOKEN_ADDRESS, ARC_TOKEN_ABI, provider);
      
      const balance = await arcTokenContract.balanceOf(playerAddress);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('❌ [UNO GAMBLE] Failed to get player balance (static):', error);
      return '0';
    }
  }
}

// Export singleton instance
export const unoGambleContract = new UnoGambleContract();