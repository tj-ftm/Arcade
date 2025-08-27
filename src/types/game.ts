// Unified game type definitions
export type GameType = 'chess' | 'uno' | 'pool';

export type ViewType = 'menu' | 'leaderboard' | 'settings' | 'multiplayer' | 'pay-uno' | 'tokenomics' | 'docs' | 'profile' | 'shop';

export interface GameLobby {
  id: string;
  gameType: GameType;
  player1Id: string;
  player1Name: string;
  player2Id?: string;
  player2Name?: string;
  status: 'waiting' | 'playing' | 'finished';
  createdAt: any;
  betAmount?: string;
  isBetting?: boolean;
}

export interface GameResult {
  gameId: string;
  gameType: GameType;
  winnerId: string;
  winnerName: string;
  loserId?: string;
  loserName?: string;
  duration: number;
  timestamp: string;
}

export interface PlayerStats {
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
    pool: { games: number; wins: number; losses: number };
  };
}