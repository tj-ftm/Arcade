'use client';

import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { GameStatistics, PlayerStats } from '@/lib/game-statistics';
import { useWeb3 } from '@/components/web3/Web3Provider';
import PlayerStatsCharts from '@/components/profile/PlayerStatsCharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ProfileContentProps {
  onBack: () => void;
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

interface GameMintLog {
  id: string;
  timestamp: string;
  playerAddress: string;
  gameType: string;
  gameId?: string;
  amount: number;
  amountFormatted: string;
  txHash: string;
  blockNumber?: number;
  verified: boolean;
  createdAt: string;
}

const ProfileContent: React.FC<ProfileContentProps> = ({ onBack }) => {
    const web3 = useWeb3();
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [playerMintLogs, setPlayerMintLogs] = useState<GameMintLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [mintLogsLoading, setMintLogsLoading] = useState(true);
  const [gameStatsChartData, setGameStatsChartData] = useState<any[]>([]);
  const [mintHistoryChartData, setMintHistoryChartData] = useState<any[]>([]);
  const [gameTypeData, setGameTypeData] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      if (web3?.account) {
        setLoading(true);
        try {
          const stats = await GameStatistics.getPlayerStats(web3.account);
          setPlayerStats(stats);
        } catch (error) {
          console.error('Error fetching player stats:', error);
          setPlayerStats(null);
        } finally {
          setLoading(false);
        }
      } else {
        setPlayerStats(null);
        setLoading(false);
      }
    };

    const fetchPlayerMintLogs = async () => {
      if (web3?.account) {
        setMintLogsLoading(true);
        try {
          const response = await fetch('/api/game-complete');
          if (response.ok) {
            const data = await response.json();
            const allMintLogs = data.mintLogs || [];
            // Filter mint logs for the current player
            const playerMints = allMintLogs.filter((mint: GameMintLog) => 
              mint.playerAddress.toLowerCase() === web3.account.toLowerCase()
            );
            setPlayerMintLogs(playerMints);
          }
        } catch (error) {
          console.error('Error fetching player mint logs:', error);
          setPlayerMintLogs([]);
        } finally {
          setMintLogsLoading(false);
        }
      } else {
        setPlayerMintLogs([]);
        setMintLogsLoading(false);
      }
    };

    fetchStats();
    fetchPlayerMintLogs();
  }, [web3?.account]);

  // Process chart data when stats change
  useEffect(() => {
    if (playerStats) {
      // Game type performance data
      const gameTypeChartData = Object.entries(playerStats.gamesPerType).map(([gameType, stats]) => ({
        gameType: gameType.toUpperCase(),
        wins: stats.wins,
        losses: stats.losses,
        winRate: stats.games > 0 ? ((stats.wins / stats.games) * 100).toFixed(1) : 0
      }));
      setGameTypeData(gameTypeChartData);

      // Overall stats timeline (mock data for demonstration)
      const statsTimeline = [
        { period: 'Week 1', wins: Math.floor(playerStats.wins * 0.1), games: Math.floor(playerStats.totalGames * 0.1) },
        { period: 'Week 2', wins: Math.floor(playerStats.wins * 0.25), games: Math.floor(playerStats.totalGames * 0.25) },
        { period: 'Week 3', wins: Math.floor(playerStats.wins * 0.5), games: Math.floor(playerStats.totalGames * 0.5) },
        { period: 'Week 4', wins: playerStats.wins, games: playerStats.totalGames }
      ];
      setGameStatsChartData(statsTimeline);
    }
  }, [playerStats]);

  // Process mint history chart data
  useEffect(() => {
    if (playerMintLogs.length > 0) {
      // Group mints by date
      const mintsByDate = playerMintLogs.reduce((acc, mint) => {
        const date = new Date(mint.timestamp).toLocaleDateString();
        if (!acc[date]) {
          acc[date] = { date, amount: 0, count: 0 };
        }
        acc[date].amount += parseFloat(mint.amountFormatted);
        acc[date].count += 1;
        return acc;
      }, {} as Record<string, { date: string; amount: number; count: number }>);

      const chartData = Object.values(mintsByDate).sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      setMintHistoryChartData(chartData);
    }
  }, [playerMintLogs]);

  return (
    <div className="relative flex flex-col items-center justify-start min-h-screen w-full bg-gradient-to-br from-pink-600 to-purple-700 text-white p-2 sm:p-4 pt-20 sm:pt-8 overflow-auto">
      <h1 className="text-3xl sm:text-4xl md:text-6xl font-headline mb-4 sm:mb-8 sticky top-16 sm:top-0 w-full text-center py-2 sm:py-4 z-10">Profile Page</h1>

      {/* Game Statistics Charts */}
       <div className="w-full max-w-xs sm:max-w-lg md:max-w-2xl mb-4 sm:mb-6">
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
           {/* Game Performance Over Time */}
           <Card className="bg-white/10 backdrop-blur-sm text-white border border-white/20 shadow-xl">
             <CardHeader>
               <CardTitle className="text-white">Game Performance Timeline</CardTitle>
             </CardHeader>
             <CardContent className="min-h-[300px]">
               {loading ? (
                 <div className="flex items-center justify-center h-[300px]">
                   <p className="text-white/70">Loading game statistics...</p>
                 </div>
               ) : gameStatsChartData.length > 0 ? (
                 <ResponsiveContainer width="100%" height="100%">
                   <LineChart data={gameStatsChartData}>
                     <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                     <XAxis dataKey="period" stroke="#888" />
                     <YAxis stroke="#888" />
                     <Tooltip 
                       contentStyle={{ backgroundColor: '#333', border: 'none' }} 
                       labelStyle={{ color: '#fff' }}
                       itemStyle={{ color: '#fff' }}
                     />
                     <Legend />
                     <Line type="monotone" dataKey="wins" stroke="#10b981" activeDot={{ r: 8 }} name="Wins" />
                     <Line type="monotone" dataKey="games" stroke="#3b82f6" activeDot={{ r: 8 }} name="Total Games" />
                   </LineChart>
                 </ResponsiveContainer>
               ) : (
                 <div className="flex items-center justify-center h-[300px]">
                   <p className="text-white/70">No game statistics available</p>
                 </div>
               )}
             </CardContent>
           </Card>

           {/* Game Type Performance */}
           <Card className="bg-white/10 backdrop-blur-sm text-white border border-white/20 shadow-xl">
             <CardHeader>
               <CardTitle className="text-white">Performance by Game Type</CardTitle>
             </CardHeader>
             <CardContent className="min-h-[300px]">
               {loading ? (
                 <div className="flex items-center justify-center h-[300px]">
                   <p className="text-white/70">Loading game data...</p>
                 </div>
               ) : gameTypeData.length > 0 ? (
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={gameTypeData}>
                     <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                     <XAxis dataKey="gameType" stroke="#888" />
                     <YAxis stroke="#888" />
                     <Tooltip 
                       contentStyle={{ backgroundColor: '#333', border: 'none' }} 
                       labelStyle={{ color: '#fff' }}
                       itemStyle={{ color: '#fff' }}
                     />
                     <Legend />
                     <Bar dataKey="wins" fill="#10b981" name="Wins" />
                     <Bar dataKey="losses" fill="#ef4444" name="Losses" />
                   </BarChart>
                 </ResponsiveContainer>
               ) : (
                 <div className="flex items-center justify-center h-[300px]">
                   <p className="text-white/70">No game type data available</p>
                 </div>
               )}
             </CardContent>
           </Card>
         </div>
       </div>

      {/* Token Mint History Charts */}
       <div className="w-full max-w-xs sm:max-w-lg md:max-w-2xl">
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
           {/* Mint History Over Time */}
           <Card className="bg-white/10 backdrop-blur-sm text-white border border-white/20 shadow-xl">
             <CardHeader>
               <CardTitle className="text-white">Token Earnings Over Time</CardTitle>
             </CardHeader>
             <CardContent className="min-h-[300px]">
               {mintLogsLoading ? (
                 <div className="flex items-center justify-center h-[300px]">
                   <p className="text-white/70">Loading mint history...</p>
                 </div>
               ) : mintHistoryChartData.length > 0 ? (
                 <ResponsiveContainer width="100%" height="100%">
                   <LineChart data={mintHistoryChartData}>
                     <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                     <XAxis dataKey="date" stroke="#888" />
                     <YAxis stroke="#888" />
                     <Tooltip 
                       contentStyle={{ backgroundColor: '#333', border: 'none' }} 
                       labelStyle={{ color: '#fff' }}
                       itemStyle={{ color: '#fff' }}
                       formatter={(value: number, name: string) => [
                         name === 'amount' ? `${value.toFixed(2)} ARC` : value,
                         name === 'amount' ? 'Tokens Earned' : 'Mint Count'
                       ]}
                     />
                     <Legend />
                     <Line type="monotone" dataKey="amount" stroke="#10b981" activeDot={{ r: 8 }} name="ARC Earned" />
                     <Line type="monotone" dataKey="count" stroke="#f59e0b" activeDot={{ r: 8 }} name="Mint Count" />
                   </LineChart>
                 </ResponsiveContainer>
               ) : (
                 <div className="flex items-center justify-center h-[300px]">
                   <p className="text-white/70">No mint history available</p>
                 </div>
               )}
             </CardContent>
           </Card>

           {/* Recent Mint Logs */}
           <Card className="bg-white/10 backdrop-blur-sm text-white border border-white/20 shadow-xl">
             <CardHeader>
               <CardTitle className="text-white">Recent Token Mints</CardTitle>
             </CardHeader>
             <CardContent className="min-h-[300px]">
               {mintLogsLoading ? (
                 <div className="flex items-center justify-center h-[300px]">
                   <p className="text-white/70">Loading recent mints...</p>
                 </div>
               ) : playerMintLogs.length > 0 ? (
                 <ScrollArea className="h-[300px]">
                   <div className="space-y-2">
                     {playerMintLogs.slice(0, 10).map((mint) => (
                       <div key={mint.id} className="bg-black/20 rounded-lg p-3 border border-white/20">
                         <div className="flex justify-between items-start mb-1">
                           <div className="flex-1">
                             <div className="flex items-center gap-2 mb-1">
                               <span className="text-sm font-semibold text-green-300">
                                 +{mint.amountFormatted} ARC
                               </span>
                               <span className="text-xs bg-blue-600 px-2 py-1 rounded uppercase">
                                 {mint.gameType}
                               </span>
                             </div>
                             <div className="text-xs text-white/70">
                               {new Date(mint.timestamp).toLocaleDateString()}
                             </div>
                           </div>
                           <a 
                             href={`https://sonicscan.org/tx/${mint.txHash}`}
                             target="_blank"
                             rel="noopener noreferrer"
                             className="text-xs text-blue-300 hover:text-blue-200 underline"
                           >
                             View TX
                           </a>
                         </div>
                       </div>
                     ))}
                     {playerMintLogs.length > 10 && (
                       <div className="text-center text-sm text-white/50 mt-2">
                         Showing latest 10 of {playerMintLogs.length} total mints
                       </div>
                     )}
                   </div>
                 </ScrollArea>
               ) : (
                 <div className="flex items-center justify-center h-[300px]">
                   <p className="text-white/70">No token mints found</p>
                 </div>
               )}
               
               {/* Summary Stats */}
               {playerMintLogs.length > 0 && (
                 <div className="mt-4 pt-4 border-t border-white/20">
                   <div className="grid grid-cols-2 gap-4 text-sm">
                     <div>
                       <span className="text-white/70">Total Mints:</span>
                       <span className="ml-2 text-white font-semibold">{playerMintLogs.length}</span>
                     </div>
                     <div>
                       <span className="text-white/70">Total Earned:</span>
                       <span className="ml-2 text-green-300 font-semibold">
                         {playerMintLogs.reduce((sum, mint) => sum + parseFloat(mint.amountFormatted), 0).toFixed(2)} ARC
                       </span>
                     </div>
                   </div>
                 </div>
               )}
             </CardContent>
           </Card>
         </div>
       </div>
    </div>
  );
};

export default ProfileContent;