import { database } from '@/lib/firebase';
import { ref, get, query, orderByChild, equalTo, limitToLast, remove } from 'firebase/database';

interface GameResult {
  id: string;
  gameType: 'chess' | 'uno';
  player1Id: string;
  player1Name: string;
  player2Id: string;
  player2Name: string;
  winnerId: string;
  winnerName: string;
  loserId: string;
  loserName: string;
  gameStartTime: any;
  gameEndTime: any;
  gameDuration: number;
  lobbyId: string;
}

interface PlayerStats {
  playerId: string;
  playerName: string;
  totalGames: number;
  wins: number;
  losses: number;
  winRate: number;
  averageGameDuration: number;
  longestWinStreak: number;
  currentWinStreak: number;
  gamesPerType: {
    chess: { games: number; wins: number; losses: number };
    uno: { games: number; wins: number; losses: number };
  };
}

interface LeaderboardEntry {
  rank: number;
  playerId: string;
  playerName: string;
  wins: number;
  winStreak: number;
  totalGames: number;
  winRate: number;
}

export class GameStatistics {
  /**
   * Get all game results from Firebase
   */
  static async getAllGameResults(): Promise<GameResult[]> {
    try {
      if (!database) {
        console.warn('Firebase not configured');
        return [];
      }

      const gameStatsRef = ref(database, 'game-statistics');
      const snapshot = await get(gameStatsRef);
      const data = snapshot.val();

      if (!data) return [];

      return Object.entries(data).map(([id, gameData]: [string, any]) => ({
        ...gameData,
        id
      }));
    } catch (error) {
      console.error('Error fetching game results:', error);
      return [];
    }
  }

  /**
   * Get game results for a specific player
   */
  static async getPlayerGameResults(playerId: string): Promise<GameResult[]> {
    try {
      const allResults = await this.getAllGameResults();
      return allResults.filter(result => 
        result.player1Id === playerId || result.player2Id === playerId
      );
    } catch (error) {
      console.error('Error fetching player game results:', error);
      return [];
    }
  }

  /**
   * Calculate comprehensive player statistics
   */
  static async getPlayerStats(playerId: string, playerName?: string): Promise<PlayerStats | null> {
    try {
      const playerResults = await this.getPlayerGameResults(playerId);
      
      if (playerResults.length === 0) {
        return null;
      }

      const wins = playerResults.filter(result => result.winnerId === playerId).length;
      const losses = playerResults.length - wins;
      const winRate = playerResults.length > 0 ? (wins / playerResults.length) * 100 : 0;
      
      // Calculate average game duration
      const totalDuration = playerResults.reduce((sum, result) => sum + result.gameDuration, 0);
      const averageGameDuration = totalDuration / playerResults.length;

      // Calculate win streaks
      const { longestWinStreak, currentWinStreak } = this.calculateWinStreaks(playerResults, playerId);

      // Calculate games per type
      const chessGames = playerResults.filter(result => result.gameType === 'chess');
      const unoGames = playerResults.filter(result => result.gameType === 'uno');

      const gamesPerType = {
        chess: {
          games: chessGames.length,
          wins: chessGames.filter(result => result.winnerId === playerId).length,
          losses: chessGames.filter(result => result.loserId === playerId).length
        },
        uno: {
          games: unoGames.length,
          wins: unoGames.filter(result => result.winnerId === playerId).length,
          losses: unoGames.filter(result => result.loserId === playerId).length
        }
      };

      // Use provided playerName or extract from most recent game
      const finalPlayerName = playerName || 
        (playerResults[0]?.player1Id === playerId ? playerResults[0]?.player1Name : playerResults[0]?.player2Name) || 
        'Unknown Player';

      return {
        playerId,
        playerName: finalPlayerName,
        totalGames: playerResults.length,
        wins,
        losses,
        winRate,
        averageGameDuration,
        longestWinStreak,
        currentWinStreak,
        gamesPerType
      };
    } catch (error) {
      console.error('Error calculating player stats:', error);
      return null;
    }
  }

  /**
   * Calculate win streaks for a player
   */
  private static calculateWinStreaks(results: GameResult[], playerId: string): { longestWinStreak: number; currentWinStreak: number } {
    // Sort by game end time (most recent first)
    const sortedResults = results.sort((a, b) => {
      const timeA = a.gameEndTime?.seconds ? a.gameEndTime.seconds * 1000 : a.gameEndTime;
      const timeB = b.gameEndTime?.seconds ? b.gameEndTime.seconds * 1000 : b.gameEndTime;
      return timeB - timeA;
    });

    let currentWinStreak = 0;
    let longestWinStreak = 0;
    let tempStreak = 0;

    // Calculate current win streak (from most recent games)
    for (const result of sortedResults) {
      if (result.winnerId === playerId) {
        currentWinStreak++;
      } else {
        break;
      }
    }

    // Calculate longest win streak
    for (const result of sortedResults.reverse()) { // Reverse to go chronologically
      if (result.winnerId === playerId) {
        tempStreak++;
        longestWinStreak = Math.max(longestWinStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }

    return { longestWinStreak, currentWinStreak };
  }

  /**
   * Generate leaderboard based on wins and win streaks
   */
  static async getLeaderboard(gameType?: 'chess' | 'uno', limit: number = 10): Promise<LeaderboardEntry[]> {
    try {
      const allResults = await this.getAllGameResults();
      
      // Filter by game type if specified
      const filteredResults = gameType 
        ? allResults.filter(result => result.gameType === gameType)
        : allResults;

      // Get unique players
      const playerIds = new Set<string>();
      filteredResults.forEach(result => {
        playerIds.add(result.player1Id);
        playerIds.add(result.player2Id);
      });

      // Calculate stats for each player
      const playerStats: PlayerStats[] = [];
      for (const playerId of playerIds) {
        const stats = await this.getPlayerStats(playerId);
        if (stats && stats.totalGames > 0) {
          playerStats.push(stats);
        }
      }

      // Sort by wins (primary) and current win streak (secondary)
      const sortedPlayers = playerStats.sort((a, b) => {
        if (a.wins !== b.wins) {
          return b.wins - a.wins; // Higher wins first
        }
        return b.currentWinStreak - a.currentWinStreak; // Higher win streak second
      });

      // Create leaderboard entries
      return sortedPlayers.slice(0, limit).map((player, index) => ({
        rank: index + 1,
        playerId: player.playerId,
        playerName: player.playerName,
        wins: player.wins,
        winStreak: player.currentWinStreak,
        totalGames: player.totalGames,
        winRate: player.winRate
      }));
    } catch (error) {
      console.error('Error generating leaderboard:', error);
      return [];
    }
  }

  /**
   * Get recent games (last N games)
   */
  static async getRecentGames(limit: number = 20): Promise<GameResult[]> {
    try {
      const allResults = await this.getAllGameResults();
      
      // Sort by game end time (most recent first)
      return allResults
        .sort((a, b) => {
          const timeA = a.gameEndTime?.seconds ? a.gameEndTime.seconds * 1000 : a.gameEndTime;
          const timeB = b.gameEndTime?.seconds ? b.gameEndTime.seconds * 1000 : b.gameEndTime;
          return timeB - timeA;
        })
        .slice(0, limit);
    } catch (error) {
      console.error('Error fetching recent games:', error);
      return [];
    }
  }

  /**
   * Clean up old game statistics (older than specified days)
   */
  static async cleanupOldStatistics(daysToKeep: number = 90): Promise<void> {
    try {
      if (!database) {
        console.warn('Firebase not configured');
        return;
      }

      const gameStatsRef = ref(database, 'game-statistics');
      const snapshot = await get(gameStatsRef);
      const data = snapshot.val();

      if (!data) return;

      const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
      const entriesToDelete: string[] = [];

      Object.entries(data).forEach(([id, gameData]: [string, any]) => {
        const gameEndTime = gameData.gameEndTime?.seconds 
          ? gameData.gameEndTime.seconds * 1000 
          : gameData.gameEndTime;
        
        if (gameEndTime < cutoffTime) {
          entriesToDelete.push(id);
        }
      });

      // Delete old entries
      for (const id of entriesToDelete) {
        const entryRef = ref(database, `game-statistics/${id}`);
        await remove(entryRef);
      }

      if (entriesToDelete.length > 0) {
        console.log(`Cleaned up ${entriesToDelete.length} old game statistics`);
      }
    } catch (error) {
      console.error('Error cleaning up old statistics:', error);
    }
  }
}

export type { GameResult, PlayerStats, LeaderboardEntry };