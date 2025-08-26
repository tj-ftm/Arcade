
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trophy, Target, Clock, TrendingUp, Users, Gamepad2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GameStatistics, type LeaderboardEntry, type PlayerStats, type GameResult } from '@/lib/game-statistics';
import { useWeb3 } from "@/components/web3/Web3Provider";

// Simplified UI components for consistency
const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-black/30 rounded-lg p-4 ${className}`}>{children}</div>
);
const CardHeader = ({ children }: { children: React.ReactNode }) => <div className="mb-4">{children}</div>;
const CardTitle = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <h3 className={`text-xl font-semibold text-white ${className}`}>{children}</h3>
);
const CardDescription = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm text-white/70">{children}</p>
);
const CardContent = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
const Badge = ({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'secondary' | 'outline' }) => (
  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
    variant === 'outline' ? 'border border-white/30 text-white/80' :
    variant === 'secondary' ? 'bg-gray-600 text-white' :
    'bg-blue-600 text-white'
  }`}>{children}</span>
);

type GameType = 'all' | 'chess' | 'uno';

interface LeaderboardPageProps {
  onBack?: () => void;
}

const LeaderboardPage = ({ onBack }: LeaderboardPageProps) => {
  const [selectedGameType, setSelectedGameType] = useState<GameType>('all');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [recentGames, setRecentGames] = useState<GameResult[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { account, username } = useWeb3();

  const loadGameStatistics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Load leaderboard
      const gameTypeFilter = selectedGameType === 'all' ? undefined : selectedGameType;
      const leaderboardData = await GameStatistics.getLeaderboard(gameTypeFilter, 10);
      setLeaderboard(leaderboardData);

      // Load recent games
      const recentGamesData = await GameStatistics.getRecentGames(20);
      setRecentGames(recentGamesData);

      // Load player stats for current user (if available)
      if (account) {
        const playerStatsData = await GameStatistics.getPlayerStats(account, username);
        setPlayerStats(playerStatsData);
      }
    } catch (error) {
      console.error('Error loading game statistics:', error);
      setError('Failed to load game statistics');
    } finally {
      setLoading(false);
    }
  }, [selectedGameType, account, username]);

  useEffect(() => {
    loadGameStatistics();
  }, [loadGameStatistics]);

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (timestamp: any): string => {
    const date = timestamp?.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getBackgroundClass = () => {
    return "min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900";
  };

  if (loading) {
    return (
      <div className={getBackgroundClass()}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="bg-black/50 p-8 rounded-xl">
            <div className="flex items-center justify-center h-32">
              <div className="text-2xl text-white">Loading leaderboard...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={getBackgroundClass()}>
      <div className="container mx-auto px-4 py-8 min-h-screen">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-6xl font-headline text-accent uppercase tracking-wider mb-2" style={{ WebkitTextStroke: '4px black' }}>
              Leaderboard
            </h1>
            <p className="text-white/70 text-xl">Multiplayer game statistics and rankings</p>
          </div>
          {onBack && (
            <Button onClick={onBack} variant="secondary" className="font-headline text-lg">
              <ArrowLeft className="mr-2 h-5 w-5" /> Back to Menu
            </Button>
          )}
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {/* Game Type Tabs */}
        <div className="flex bg-black/20 rounded-lg p-1 mb-6 max-w-md">
          {(['all', 'chess', 'uno'] as GameType[]).map((gameType) => (
            <button
              key={gameType}
              onClick={() => setSelectedGameType(gameType)}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                selectedGameType === gameType
                  ? 'bg-accent text-black'
                  : 'text-white/70 hover:text-white hover:bg-black/30'
              }`}
            >
              {gameType === 'all' ? 'All Games' : gameType.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Player Stats Cards */}
        {playerStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Target className="h-5 w-5" />
                  Total Games
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-accent">{playerStats.totalGames}</div>
                <p className="text-sm text-white/70">
                  {playerStats.wins} wins, {playerStats.losses} losses
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="h-5 w-5" />
                  Win Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-accent">{playerStats.winRate.toFixed(1)}%</div>
                <p className="text-sm text-white/70">
                  Current streak: {playerStats.currentWinStreak}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="h-5 w-5" />
                  Avg Game Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-accent">{formatDuration(Math.round(playerStats.averageGameDuration))}</div>
                <p className="text-sm text-white/70">
                  Longest streak: {playerStats.longestWinStreak}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Trophy className="h-5 w-5" />
                  Best Game
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold text-accent">
                  Chess: {playerStats.gamesPerType.chess.wins}/{playerStats.gamesPerType.chess.games}
                </div>
                <div className="text-lg font-bold text-accent">
                  UNO: {playerStats.gamesPerType.uno.wins}/{playerStats.gamesPerType.uno.games}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Leaderboard */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-6 w-6" />
                Top Players
                {selectedGameType !== 'all' && (
                  <Badge variant="outline">{selectedGameType.toUpperCase()}</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Rankings based on wins and current win streaks
              </CardDescription>
            </CardHeader>
            <CardContent>
              {leaderboard.length > 0 ? (
                <ScrollArea className="h-96">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">Rank</TableHead>
                        <TableHead>Player</TableHead>
                        <TableHead>Wins</TableHead>
                        <TableHead>Streak</TableHead>
                        <TableHead>Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaderboard.map((entry) => (
                        <TableRow key={entry.playerId} className={entry.playerId === account ? 'bg-accent/10' : ''}>
                          <TableCell className="font-bold">
                            {entry.rank === 1 && <Trophy className="h-4 w-4 text-yellow-500 inline mr-1" />}
                            {entry.rank}
                          </TableCell>
                          <TableCell className="font-medium">
                            {entry.playerId === account ? (username || 'You') : entry.playerName}
                          </TableCell>
                          <TableCell>{entry.wins}</TableCell>
                          <TableCell>
                            <Badge variant={entry.winStreak > 5 ? "default" : "secondary"}>
                              {entry.winStreak}
                            </Badge>
                          </TableCell>
                          <TableCell>{entry.winRate.toFixed(1)}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              ) : (
                <div className="text-center py-12 text-white/60">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">No multiplayer games recorded yet</p>
                  <p className="text-sm">Play some multiplayer games to see rankings!</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Games / Match History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gamepad2 className="h-6 w-6" />
                Recent Matches
              </CardTitle>
              <CardDescription>
                Latest completed multiplayer games
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentGames.length > 0 ? (
                <ScrollArea className="h-96">
                  <div className="space-y-3">
                    {recentGames.map((game) => (
                      <div key={game.id} className="bg-black/20 rounded-lg p-4 border border-white/10">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{game.gameType.toUpperCase()}</Badge>
                            <span className="text-sm text-white/70">{formatDate(game.gameEndTime)}</span>
                          </div>
                          <span className="text-sm text-white/70">{formatDuration(game.gameDuration)}</span>
                        </div>
                        <div className="text-sm">
                          <div className="flex justify-between items-center">
                            <span className={game.winnerId === game.player1Id ? 'text-green-400 font-medium' : 'text-white/70'}>
                              {game.player1Name}
                            </span>
                            <span className="text-white/50">vs</span>
                            <span className={game.winnerId === game.player2Id ? 'text-green-400 font-medium' : 'text-white/70'}>
                              {game.player2Name}
                            </span>
                          </div>
                          <div className="text-center mt-1">
                            <span className="text-accent font-medium">Winner: {game.winnerName}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-12 text-white/60">
                  <Gamepad2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">No recent games found</p>
                  <p className="text-sm">Start playing multiplayer games to see match history!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default function LeaderboardHome() {
  const handleBack = () => {
    window.location.href = '/';
  };

  return <LeaderboardPage onBack={handleBack} />;
}
