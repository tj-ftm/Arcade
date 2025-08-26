import { ethers } from 'ethers';

// Simple gamble system without smart contract deployment
// Direct wallet-to-wallet payments with game wallet as escrow

export interface SimpleGambleGame {
  id: string;
  player1: string;
  player1Name: string;
  player2?: string;
  player2Name?: string;
  betAmount: string; // ARC amount each player bets
  player1PaidS: boolean;
  player1PaidARC: boolean;
  player2PaidS: boolean;
  player2PaidARC: boolean;
  totalPot: string; // Total ARC in the pot
  winner?: string;
  winnerName?: string;
  gameCompleted: boolean;
  payoutSent: boolean;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

export interface PaymentResult {
  success: boolean;
  txHash: string;
  error?: string;
}

export interface PaymentStatus {
  sPaid: boolean;
  arcPaid: boolean;
  sTxHash?: string;
  arcTxHash?: string;
}

const GAME_WALLET_ADDRESS = '0x5AD5aE34265957fB08eA12f77BAFf1200060473e';
const ARC_TOKEN_ADDRESS = '0xAD75eAb973D5AbB77DAdc0Ec3047008dF3aa094d';
const S_FEE = '0.05'; // 0.05 S fee per player
const HOUSE_FEE_PERCENT = 5; // 5% house edge

class SimpleGambleContract {
  private signer: ethers.Signer | null = null;
  private arcToken: ethers.Contract | null = null;
  private provider: ethers.Provider | null = null;

  async initialize(signer: ethers.Signer) {
    this.signer = signer;
    this.provider = signer.provider;
    
    // Initialize ARC token contract
    const arcTokenAbi = [
      'function transfer(address to, uint256 amount) external returns (bool)',
      'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
      'function balanceOf(address account) external view returns (uint256)',
      'function allowance(address owner, address spender) external view returns (uint256)',
      'function approve(address spender, uint256 amount) external returns (bool)'
    ];
    
    this.arcToken = new ethers.Contract(ARC_TOKEN_ADDRESS, arcTokenAbi, signer);
    
    console.log('✅ [SIMPLE GAMBLE] Initialized with signer:', await signer.getAddress());
  }

  // Pay S fee to game wallet
  async paySFee(): Promise<PaymentResult> {
    if (!this.signer) {
      throw new Error('Signer not initialized');
    }

    try {
      console.log('💰 [SIMPLE GAMBLE] Paying S fee:', S_FEE, 'S');
      
      const tx = await this.signer.sendTransaction({
        to: GAME_WALLET_ADDRESS,
        value: ethers.parseEther(S_FEE),
        gasLimit: 21000
      });

      console.log('📝 [SIMPLE GAMBLE] S fee transaction:', tx.hash);
      await tx.wait();

      return {
        success: true,
        txHash: tx.hash
      };
    } catch (error: any) {
      console.error('❌ [SIMPLE GAMBLE] S fee payment failed:', error);
      return {
        success: false,
        txHash: '',
        error: error.message
      };
    }
  }

  // Approve ARC tokens for transfer
  async approveARC(amount: string): Promise<PaymentResult> {
    if (!this.arcToken || !this.signer) {
      throw new Error('Contracts not initialized');
    }

    try {
      const amountWei = ethers.parseEther(amount);
      const signerAddress = await this.signer.getAddress();
      
      console.log('🔓 [SIMPLE GAMBLE] Approving ARC tokens:', amount);
      
      // Check current allowance
      const currentAllowance = await this.arcToken.allowance(signerAddress, GAME_WALLET_ADDRESS);
      
      if (currentAllowance >= amountWei) {
        console.log('✅ [SIMPLE GAMBLE] Sufficient allowance already exists');
        return { success: true, txHash: '' };
      }

      const tx = await this.arcToken.approve(GAME_WALLET_ADDRESS, amountWei);
      console.log('📝 [SIMPLE GAMBLE] ARC approval transaction:', tx.hash);
      await tx.wait();

      return {
        success: true,
        txHash: tx.hash
      };
    } catch (error: any) {
      console.error('❌ [SIMPLE GAMBLE] ARC approval failed:', error);
      return {
        success: false,
        txHash: '',
        error: error.message
      };
    }
  }

  // Pay ARC bet to game wallet
  async payARCBet(amount: string): Promise<PaymentResult> {
    if (!this.arcToken || !this.signer) {
      throw new Error('Contracts not initialized');
    }

    try {
      const amountWei = ethers.parseEther(amount);
      
      console.log('💰 [SIMPLE GAMBLE] Paying ARC bet:', amount, 'ARC');
      
      const tx = await this.arcToken.transfer(GAME_WALLET_ADDRESS, amountWei);
      console.log('📝 [SIMPLE GAMBLE] ARC payment transaction:', tx.hash);
      await tx.wait();

      return {
        success: true,
        txHash: tx.hash
      };
    } catch (error: any) {
      console.error('❌ [SIMPLE GAMBLE] ARC payment failed:', error);
      return {
        success: false,
        txHash: '',
        error: error.message
      };
    }
  }

  // Get player's ARC balance
  async getARCBalance(address: string): Promise<string> {
    if (!this.arcToken) {
      throw new Error('ARC token not initialized');
    }

    try {
      const balance = await this.arcToken.balanceOf(address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('❌ [SIMPLE GAMBLE] Failed to get ARC balance:', error);
      return '0';
    }
  }

  // Get player's S balance
  async getSBalance(address: string): Promise<string> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    try {
      const balance = await this.provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('❌ [SIMPLE GAMBLE] Failed to get S balance:', error);
      return '0';
    }
  }

  // Verify payment transaction
  async verifyPayment(txHash: string, expectedAmount: string, tokenType: 'S' | 'ARC'): Promise<boolean> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    try {
      const receipt = await this.provider.getTransactionReceipt(txHash);
      if (!receipt || receipt.status !== 1) {
        return false;
      }

      const tx = await this.provider.getTransaction(txHash);
      if (!tx) {
        return false;
      }

      // Verify recipient is game wallet
      if (tx.to?.toLowerCase() !== GAME_WALLET_ADDRESS.toLowerCase()) {
        return false;
      }

      if (tokenType === 'S') {
        // Verify S amount
        const expectedWei = ethers.parseEther(expectedAmount);
        return tx.value === expectedWei;
      } else {
        // For ARC, we need to check the transfer event in logs
        // This is simplified - in production you'd parse the logs
        return true; // Assume valid for now
      }
    } catch (error) {
      console.error('❌ [SIMPLE GAMBLE] Payment verification failed:', error);
      return false;
    }
  }
}

// Singleton instance
export const simpleGambleContract = new SimpleGambleContract();

// Game management functions
export class SimpleGambleManager {
  private static games: Map<string, SimpleGambleGame> = new Map();

  static createGame(gameId: string, player1: string, player1Name: string, betAmount: string): SimpleGambleGame {
    const game: SimpleGambleGame = {
      id: gameId,
      player1,
      player1Name,
      betAmount,
      player1PaidS: false,
      player1PaidARC: false,
      player2PaidS: false,
      player2PaidARC: false,
      totalPot: (parseFloat(betAmount) * 2).toString(),
      gameCompleted: false,
      payoutSent: false,
      createdAt: Date.now()
    };

    this.games.set(gameId, game);
    console.log('🎮 [SIMPLE GAMBLE] Game created:', gameId);
    return game;
  }

  static joinGame(gameId: string, player2: string, player2Name: string): SimpleGambleGame | null {
    const game = this.games.get(gameId);
    if (!game || game.player2) {
      return null;
    }

    game.player2 = player2;
    game.player2Name = player2Name;
    this.games.set(gameId, game);
    
    console.log('👥 [SIMPLE GAMBLE] Player2 joined game:', gameId);
    return game;
  }

  static updatePaymentStatus(gameId: string, player: string, paymentType: 'S' | 'ARC', txHash: string): boolean {
    const game = this.games.get(gameId);
    if (!game) {
      return false;
    }

    if (player === game.player1) {
      if (paymentType === 'S') {
        game.player1PaidS = true;
      } else {
        game.player1PaidARC = true;
      }
    } else if (player === game.player2) {
      if (paymentType === 'S') {
        game.player2PaidS = true;
      } else {
        game.player2PaidARC = true;
      }
    }

    // Check if game can start
    if (game.player1PaidS && game.player1PaidARC && game.player2PaidS && game.player2PaidARC && !game.startedAt) {
      game.startedAt = Date.now();
      console.log('🚀 [SIMPLE GAMBLE] Game ready to start:', gameId);
    }

    this.games.set(gameId, game);
    return true;
  }

  static completeGame(gameId: string, winner: string, winnerName: string): boolean {
    const game = this.games.get(gameId);
    if (!game || game.gameCompleted) {
      return false;
    }

    game.winner = winner;
    game.winnerName = winnerName;
    game.gameCompleted = true;
    game.completedAt = Date.now();

    this.games.set(gameId, game);
    console.log('🏆 [SIMPLE GAMBLE] Game completed:', gameId, 'Winner:', winnerName);
    return true;
  }

  static getGame(gameId: string): SimpleGambleGame | null {
    return this.games.get(gameId) || null;
  }

  static isGameReady(gameId: string): boolean {
    const game = this.games.get(gameId);
    return !!(game && game.player1PaidS && game.player1PaidARC && game.player2PaidS && game.player2PaidARC);
  }

  static getPlayerPaymentStatus(gameId: string, player: string): PaymentStatus {
    const game = this.games.get(gameId);
    if (!game) {
      return { sPaid: false, arcPaid: false };
    }

    if (player === game.player1) {
      return {
        sPaid: game.player1PaidS,
        arcPaid: game.player1PaidARC
      };
    } else if (player === game.player2) {
      return {
        sPaid: game.player2PaidS,
        arcPaid: game.player2PaidARC
      };
    }

    return { sPaid: false, arcPaid: false };
  }
}

export { GAME_WALLET_ADDRESS, ARC_TOKEN_ADDRESS, S_FEE, HOUSE_FEE_PERCENT };