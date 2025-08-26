"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { GameStatistics, type LeaderboardEntry, type PlayerStats } from '@/lib/game-statistics';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
// Note: These UI components may need to be created if they don't exist
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// import { Badge } from '@/components/ui/badge';

// Simplified versions for demo
const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-black/30 rounded-lg p-4 ${className}`}>{children}</div>
);
const CardHeader = ({ children }: { children: React.ReactNode }) => <div className="mb-2">{children}</div>;
const CardTitle = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <h3 className={`text-lg font-semibold text-white ${className}`}>{children}</h3>
);
const CardDescription = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm text-white/70">{children}</p>
);
const CardContent = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
const Tabs = ({ children, value, onValueChange }: { children: React.ReactNode; value: string; onValueChange: (value: string) => void }) => (
  <div>{children}</div>
);
const TabsList = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`flex bg-black/20 rounded-lg p-1 ${className}`}>{children}</div>
);
const TabsTrigger = ({ children, value, onClick }: { children: React.ReactNode; value: string; onClick?: () => void }) => (
  <button className="flex-1 px-3 py-2 text-sm font-medium text-white/70 hover:text-white rounded-md hover:bg-black/30" onClick={onClick}>
    {children}
  </button>
);
const TabsContent = ({ children, value }: { children: React.ReactNode; value: string }) => <div>{children}</div>;
const Badge = ({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'secondary' | 'outline' }) => (
  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
    variant === 'outline' ? 'border border-white/30 text-white/80' :
    variant === 'secondary' ? 'bg-gray-600 text-white' :
    'bg-blue-600 text-white'
  }`}>{children}</span>
);
import { Trophy, Target, Clock, TrendingUp } from 'lucide-react';

interface GameStatsDemoProps {
  onBack: () => void;
}

export const GameStatsDemo = ({ onBack }: GameStatsDemoProps) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [recentGames, setRecentGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGameType, setSelectedGameType] = useState<'all' | 'chess' | 'uno'>('all');

  useEffect(() => {
    loadGameStatistics();
  }, [selectedGameType]);

  const loadGameStatistics = async () => {
    setLoading(true);
    try {
      // Load leaderboard
      const gameTypeFilter = selectedGameType === 'all' ? undefined : selectedGameType;
      const leaderboardData = await GameStatistics.getLeaderboard(gameTypeFilter, 10);
      setLeaderboard(leaderboardData);

      // Load recent games
      const recentGamesData = await GameStatistics.getRecentGames(10);
      setRecentGames(recentGamesData);

      // Load player stats for current user (if available)
      // This would typically use the current user's ID
      const currentUserId = 'demo-user-id'; // Replace with actual user ID
      const playerStatsData = await GameStatistics.getPlayerStats(currentUserId);
      setPlayerStats(playerStatsData);
    } catch (error) {
      console.error('Error loading game statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (timestamp: any): string => {
    const date = timestamp?.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="w-full h-full max-w-4xl z-10 animate-fade-in my-auto overflow-y-auto">
        <div className="bg-black/50 p-6 rounded-xl">
          <div className="flex items-center justify-center h-64">
            <div className="text-2xl text-white">Loading game statistics...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full max-w-6xl z-10 animate-fade-in my-auto overflow-y-auto">
      <div className="bg-black/50 p-6 rounded-xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-headline text-center uppercase tracking-wider text-accent">Game Statistics</h1>
          <Button onClick={onBack} variant="secondary" className="font-headline text-lg">
            Back to Menu
          </Button>
        </div>

        <Tabs value={selectedGameType} onValueChange={(value) => setSelectedGameType(value as 'all' | 'chess' | 'uno')} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="all">All Games</TabsTrigger>
            <TabsTrigger value="chess">Chess</TabsTrigger>
            <TabsTrigger value="uno">UNO</TabsTrigger>
          </TabsList>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Player Stats Cards */}
            {playerStats && (
              <>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Games</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{playerStats.totalGames}</div>
                    <p className="text-xs text-muted-foreground">
                      {playerStats.wins} wins, {playerStats.losses} losses
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{playerStats.winRate.toFixed(1)}%</div>
                    <p className="text-xs text-muted-foreground">
                      Current streak: {playerStats.currentWinStreak}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg Game Time</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatDuration(Math.round(playerStats.averageGameDuration))}</div>
                    <p className="text-xs text-muted-foreground">
                      Longest streak: {playerStats.longestWinStreak}
                    </p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          <TabsContent value={selectedGameType} className="space-y-6">
            {/* Leaderboard */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Leaderboard
                </CardTitle>
                <CardDescription>
                  Top players {selectedGameType !== 'all' ? `in ${selectedGameType.toUpperCase()}` : 'across all games'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {leaderboard.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">Rank</TableHead>
                        <TableHead>Player</TableHead>
                        <TableHead>Wins</TableHead>
                        <TableHead>Win Streak</TableHead>
                        <TableHead>Win Rate</TableHead>
                        <TableHead>Total Games</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaderboard.map((entry) => (
                        <TableRow key={entry.playerId}>
                          <TableCell className="font-bold">
                            {entry.rank === 1 && <Trophy className="h-4 w-4 text-yellow-500 inline mr-1" />}
                            {entry.rank}
                          </TableCell>
                          <TableCell className="font-medium">{entry.playerName}</TableCell>
                          <TableCell>{entry.wins}</TableCell>
                          <TableCell>
                            <Badge variant={entry.winStreak > 5 ? "default" : "secondary"}>
                              {entry.winStreak}
                            </Badge>
                          </TableCell>
                          <TableCell>{entry.winRate.toFixed(1)}%</TableCell>
                          <TableCell>{entry.totalGames}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No games recorded yet. Play some multiplayer games to see statistics!
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Games */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Games</CardTitle>
                <CardDescription>Latest completed multiplayer matches</CardDescription>
              </CardHeader>
              <CardContent>
                {recentGames.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Game</TableHead>
                        <TableHead>Players</TableHead>
                        <TableHead>Winner</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentGames.map((game) => (
                        <TableRow key={game.id}>
                          <TableCell>
                            <Badge variant="outline">{game.gameType.toUpperCase()}</Badge>
                          </TableCell>
                          <TableCell>
                            {game.player1Name} vs {game.player2Name}
                          </TableCell>
                          <TableCell className="font-medium">{game.winnerName}</TableCell>
                          <TableCell>{formatDuration(game.gameDuration)}</TableCell>
                          <TableCell>{formatDate(game.gameEndTime)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No recent games found.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};