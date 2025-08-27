import { GameBettingService } from './game-betting';
import { useWeb3 } from '@/components/web3/Web3Provider';
import { useToast } from '@/hooks/use-toast';

interface BetResolutionResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  winnings?: string;
  houseFee?: string;
}

export class BetResolver {
  private static instance: BetResolver;
  private gameBettingService: GameBettingService;

  private constructor() {
    this.gameBettingService = new GameBettingService();
  }

  public static getInstance(): BetResolver {
    if (!BetResolver.instance) {
      BetResolver.instance = new BetResolver();
    }
    return BetResolver.instance;
  }

  /**
   * Resolve a bet when a game ends
   * @param lobbyId - The lobby ID associated with the bet
   * @param winnerAddress - The wallet address of the winner
   * @param provider - Web3 provider
   * @param signer - Web3 signer
   * @returns Promise<BetResolutionResult>
   */
  async resolveBet(
    lobbyId: string,
    winnerAddress: string,
    provider: any,
    signer: any
  ): Promise<BetResolutionResult> {
    try {
      console.log('🎯 [BET RESOLVER] Starting bet resolution for lobby:', lobbyId, 'Winner:', winnerAddress);
      
      // Initialize the GameBetting service
      await this.gameBettingService.initialize(provider, signer);
      
      // Check if there's an active bet for this lobby
      const bet = await this.gameBettingService.getBetByLobby(lobbyId);
      if (!bet) {
        console.log('⚠️ [BET RESOLVER] No bet found for lobby:', lobbyId);
        return {
          success: false,
          error: 'No bet found for this lobby'
        };
      }
      
      if (bet.resolved) {
        console.log('⚠️ [BET RESOLVER] Bet already resolved for lobby:', lobbyId);
        return {
          success: false,
          error: 'Bet already resolved'
        };
      }
      
      console.log('💰 [BET RESOLVER] Found active bet:', {
        player1: bet.player1,
        player2: bet.player2,
        amount: bet.amount,
        gameType: bet.gameType
      });
      
      // Resolve the bet on the smart contract
      const tx = await this.gameBettingService.resolveBet(lobbyId, winnerAddress);
      console.log('📝 [BET RESOLVER] Bet resolution transaction sent:', tx.hash);
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      console.log('✅ [BET RESOLVER] Bet resolution confirmed:', receipt.transactionHash);
      
      // Calculate winnings (total bet amount minus house fee)
      const totalAmount = parseFloat(bet.amount);
      const config = await this.gameBettingService.getConfig();
      const houseFeePercent = config.houseFeePercent;
      const houseFee = (totalAmount * 2 * houseFeePercent) / 10000; // 2x because both players bet
      const winnings = (totalAmount * 2) - houseFee;
      
      return {
        success: true,
        transactionHash: receipt.transactionHash,
        winnings: winnings.toString(),
        houseFee: houseFee.toString()
      };
      
    } catch (error: any) {
      console.error('❌ [BET RESOLVER] Error resolving bet:', error);
      return {
        success: false,
        error: error.message || 'Failed to resolve bet'
      };
    }
  }

  /**
   * Cancel a bet (for emergency situations)
   * @param lobbyId - The lobby ID associated with the bet
   * @param provider - Web3 provider
   * @param signer - Web3 signer
   * @returns Promise<BetResolutionResult>
   */
  async cancelBet(
    lobbyId: string,
    provider: any,
    signer: any
  ): Promise<BetResolutionResult> {
    try {
      console.log('🚫 [BET RESOLVER] Cancelling bet for lobby:', lobbyId);
      
      await this.gameBettingService.initialize(provider, signer);
      
      const tx = await this.gameBettingService.cancelBet(lobbyId);
      const receipt = await tx.wait();
      
      return {
        success: true,
        transactionHash: receipt.transactionHash
      };
      
    } catch (error: any) {
      console.error('❌ [BET RESOLVER] Error cancelling bet:', error);
      return {
        success: false,
        error: error.message || 'Failed to cancel bet'
      };
    }
  }

  /**
   * Check if a lobby has an active bet
   * @param lobbyId - The lobby ID to check
   * @param provider - Web3 provider
   * @param signer - Web3 signer
   * @returns Promise<boolean>
   */
  async hasActiveBet(
    lobbyId: string,
    provider: any,
    signer: any
  ): Promise<boolean> {
    try {
      await this.gameBettingService.initialize(provider, signer);
      return await this.gameBettingService.hasActiveBet(lobbyId);
    } catch (error) {
      console.error('❌ [BET RESOLVER] Error checking active bet:', error);
      return false;
    }
  }
}

/**
 * Hook for using bet resolution in React components
 */
export const useBetResolver = () => {
  const { provider, signer, account } = useWeb3();
  const { toast } = useToast();
  const betResolver = BetResolver.getInstance();

  const resolveBet = async (lobbyId: string, winnerAddress: string) => {
    if (!provider || !signer) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to resolve the bet.",
        variant: "destructive"
      });
      return { success: false, error: 'Wallet not connected' };
    }

    const result = await betResolver.resolveBet(lobbyId, winnerAddress, provider, signer);
    
    if (result.success) {
      toast({
        title: "Bet Resolved Successfully!",
        description: `Winner received ${result.winnings} ARC tokens. Transaction: ${result.transactionHash?.slice(0, 10)}...`,
        variant: "default"
      });
    } else {
      toast({
        title: "Bet Resolution Failed",
        description: result.error || "Failed to resolve bet on blockchain.",
        variant: "destructive"
      });
    }
    
    return result;
  };

  const cancelBet = async (lobbyId: string) => {
    if (!provider || !signer) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to cancel the bet.",
        variant: "destructive"
      });
      return { success: false, error: 'Wallet not connected' };
    }

    const result = await betResolver.cancelBet(lobbyId, provider, signer);
    
    if (result.success) {
      toast({
        title: "Bet Cancelled",
        description: `Bet cancelled and funds refunded. Transaction: ${result.transactionHash?.slice(0, 10)}...`,
        variant: "default"
      });
    } else {
      toast({
        title: "Bet Cancellation Failed",
        description: result.error || "Failed to cancel bet on blockchain.",
        variant: "destructive"
      });
    }
    
    return result;
  };

  const checkActiveBet = async (lobbyId: string) => {
    if (!provider || !signer) return false;
    return await betResolver.hasActiveBet(lobbyId, provider, signer);
  };

  return {
    resolveBet,
    cancelBet,
    checkActiveBet
  };
};

export default BetResolver;