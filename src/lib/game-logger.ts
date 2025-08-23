import { toast } from '@/hooks/use-toast';

interface GameResult {
  playerAddress: string;
  gameType: string;
  score: number;
  duration?: number;
  won: boolean;
  gameId?: string;
}

interface GameLogResponse {
  success: boolean;
  message: string;
  gameLog: any;
  transactions: {
    logTransaction: string;
    mintTransaction?: string;
  };
  reward: string;
}

/**
 * Logs game completion and mints tokens for winners
 * @param gameResult - The game result data
 * @returns Promise with the API response
 */
export async function logGameCompletion(gameResult: GameResult): Promise<GameLogResponse | null> {
  try {
    console.log('Logging game completion:', gameResult);
    
    const response = await fetch('/api/game-complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...gameResult,
        timestamp: new Date().toISOString(),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to log game completion');
    }

    // Show success toast
    if (gameResult.won) {
      toast({
        title: "🎉 Victory!",
        description: `Game logged successfully! You earned 1 ARC token as a reward.`,
        duration: 5000,
      });
    } else {
      toast({
        title: "Game Complete",
        description: "Game result logged on blockchain.",
        duration: 3000,
      });
    }

    return data;

  } catch (error: any) {
    console.error('Error logging game completion:', error);
    
    toast({
      title: "Error",
      description: `Failed to log game: ${error.message}`,
      variant: "destructive",
      duration: 5000,
    });

    return null;
  }
}

/**
 * Retrieves all game logs from the contract
 * @returns Promise with game logs data
 */
export async function getGameLogs(): Promise<any> {
  try {
    const response = await fetch('/api/game-complete', {
      method: 'GET',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch game logs');
    }

    return data;

  } catch (error: any) {
    console.error('Error fetching game logs:', error);
    
    toast({
      title: "Error",
      description: `Failed to fetch game logs: ${error.message}`,
      variant: "destructive",
      duration: 5000,
    });

    return null;
  }
}

/**
 * Helper function to create game result object
 * @param playerAddress - Connected wallet address
 * @param gameType - Type of game (e.g., 'snake', 'chess', 'platformer')
 * @param score - Final score
 * @param won - Whether the player won
 * @param duration - Game duration in seconds (optional)
 * @param gameId - Custom game ID (optional)
 * @returns GameResult object
 */
export function createGameResult(
  playerAddress: string,
  gameType: string,
  score: number,
  won: boolean,
  duration?: number,
  gameId?: string
): GameResult {
  return {
    playerAddress,
    gameType,
    score,
    duration,
    won,
    gameId,
  };
}

/**
 * Validates if a wallet address is connected
 * @param address - Wallet address to validate
 * @returns boolean indicating if address is valid
 */
export function isValidWalletAddress(address: string | undefined): boolean {
  return !!(address && address.length > 0 && address !== '0x0');
}