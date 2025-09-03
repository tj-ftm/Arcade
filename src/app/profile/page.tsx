'use client';

import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { GameStatistics, PlayerStats } from '@/lib/game-statistics';
import { useWeb3 } from '@/components/web3/Web3Provider';
import PlayerStatsCharts from '@/components/profile/PlayerStatsCharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { RefreshCw, Wallet, Copy, ExternalLink, Settings, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatEther } from 'ethers';
import Image from 'next/image';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  const { toast } = useToast();
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [playerMintLogs, setPlayerMintLogs] = useState<GameMintLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [mintLogsLoading, setMintLogsLoading] = useState(true);
  const [gameStatsChartData, setGameStatsChartData] = useState<any[]>([]);
  const [mintHistoryChartData, setMintHistoryChartData] = useState<any[]>([]);
  const [gameTypeData, setGameTypeData] = useState<any[]>([]);
  const [walletBalance, setWalletBalance] = useState<string>('0');
  const [refreshing, setRefreshing] = useState(false);
  const [isSwitchingChain, setIsSwitchingChain] = useState(false);

  const fetchWalletBalance = async () => {
    if (web3?.account && web3?.provider) {
      try {
        const balance = await web3.provider.getBalance(web3.account);
        setWalletBalance(formatEther(balance));
      } catch (error) {
        console.error('Error fetching wallet balance:', error);
        setWalletBalance('0');
      }
    } else {
      setWalletBalance('0');
    }
  };

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

  const refreshAllData = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchStats(),
        fetchPlayerMintLogs(),
        fetchWalletBalance()
      ]);
      toast({
        title: "Data Refreshed",
        description: "Profile data has been updated successfully."
      });
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh profile data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setRefreshing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Address copied to clipboard."
    });
  };

  const handleChainSwitch = async (chain: 'sonic' | 'base') => {
    if (!web3?.switchChain || chain === web3.currentChain) return;
    
    setIsSwitchingChain(true);
    try {
      await web3.switchChain(chain);
      toast({
        title: "Chain Switched",
        description: `Successfully switched to ${chain === 'base' ? 'Base Mainnet' : 'Sonic Network'}`
      });
      // Refresh data after chain switch
      await refreshAllData();
    } catch (error) {
      console.error('Failed to switch chain:', error);
      toast({
        title: "Chain Switch Failed",
        description: "Failed to switch blockchain network. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSwitchingChain(false);
    }
  };

  const getChainIcon = (chain: string) => {
    return chain === 'base' ? '/base_icon.png' : '/sonic_icon.png';
  };

  const getChainName = (chain: string) => {
    return chain === 'base' ? 'Base Mainnet' : 'Sonic Network';
  };

  const getExplorerUrl = (address: string) => {
    if (web3?.currentChain === 'base') {
      return `https://base.blockscout.com/address/${address}`;
    }
    return `https://sonicscan.org/address/${address}`;
  };

  const getNativeSymbol = () => {
    return web3?.getCurrentChainConfig?.()?.nativeSymbol || 'S';
  };

  useEffect(() => {
     fetchStats();
     fetchPlayerMintLogs();
     fetchWalletBalance();
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
      <div className="w-full max-w-6xl">
        <div className="flex justify-between items-center mb-4 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-headline">Profile Page</h1>
          <Button 
            onClick={refreshAllData} 
            disabled={refreshing}
            className="bg-white/20 hover:bg-white/30 text-white border-white/30"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Wallet Information */}
        {web3?.account && (
          <Card className="bg-white/10 backdrop-blur-sm text-white border border-white/20 shadow-xl mb-6">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                Wallet Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-white/70 mb-1">Wallet Address</p>
                  <div className="flex items-center gap-2">
                    <code className="bg-black/30 px-2 py-1 rounded text-sm font-mono">
                      {web3.account.slice(0, 6)}...{web3.account.slice(-4)}
                    </code>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => copyToClipboard(web3.account)}
                      className="h-8 w-8 p-0 hover:bg-white/20"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => window.open(getExplorerUrl(web3.account), '_blank')}
                      className="h-8 w-8 p-0 hover:bg-white/20"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-white/70 mb-1">{getNativeSymbol()} Balance</p>
                  <p className="text-lg font-semibold text-green-300">
                    {parseFloat(walletBalance).toFixed(4)} {getNativeSymbol()}
                  </p>
                  <p className="text-sm text-white/70 mt-2">ARC Balance</p>
                  <p className="text-lg font-semibold text-yellow-300">
                    {web3.arcBalance || '0.0000'} ARC
                  </p>
                </div>
                <div>
                  <p className="text-sm text-white/70 mb-1">Current Network</p>
                  <div className="flex items-center gap-2 mb-3">
                    <Image 
                      src={getChainIcon(web3.currentChain || 'sonic')} 
                      alt={getChainName(web3.currentChain || 'sonic')} 
                      width={20} 
                      height={20} 
                      className="w-5 h-5"
                    />
                    <span className="text-lg font-semibold">{getChainName(web3.currentChain || 'sonic')}</span>
                  </div>
                  <div>
                    <p className="text-sm text-white/70 mb-2">Switch Network</p>
                    <Select 
                      value={web3.currentChain || 'sonic'} 
                      onValueChange={handleChainSwitch}
                      disabled={isSwitchingChain}
                    >
                      <SelectTrigger className="w-full bg-black/30 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-black/90 border-white/20">
                        <SelectItem value="sonic" className="text-white hover:bg-white/10">
                          <div className="flex items-center gap-2">
                            <Image src="/sonic_icon.png" alt="Sonic" width={16} height={16} className="w-4 h-4" />
                            Sonic Network
                          </div>
                        </SelectItem>
                        <SelectItem value="base" className="text-white hover:bg-white/10">
                          <div className="flex items-center gap-2">
                            <Image src="/base_icon.png" alt="Base" width={16} height={16} className="w-4 h-4" />
                            Base Mainnet
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {isSwitchingChain && (
                      <p className="text-xs text-white/70 mt-1 flex items-center gap-1">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        Switching network...
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Game Tokens & Betting History Section */}
      <div className="w-full max-w-4xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

           {/* Game Token Earnings */}
           <Card className="bg-white/10 backdrop-blur-sm text-white border border-white/20 shadow-xl">
             <CardHeader>
               <CardTitle className="text-white">Token Earnings by Game</CardTitle>
             </CardHeader>
             <CardContent className="min-h-[300px]">
               {mintLogsLoading ? (
                 <div className="flex items-center justify-center h-[300px]">
                   <p className="text-white/70">Loading token data...</p>
                 </div>
               ) : playerMintLogs.length > 0 ? (
                 <ScrollArea className="h-[300px]">
                   <div className="space-y-3">
                     {/* Group tokens by game type */}
                     {Object.entries(
                       playerMintLogs.reduce((acc, mint) => {
                         if (!acc[mint.gameType]) {
                           acc[mint.gameType] = { total: 0, count: 0, mints: [] };
                         }
                         acc[mint.gameType].total += mint.amount;
                         acc[mint.gameType].count += 1;
                         acc[mint.gameType].mints.push(mint);
                         return acc;
                       }, {} as Record<string, { total: number; count: number; mints: any[] }>)
                     ).map(([gameType, data]) => (
                       <div key={gameType} className="bg-black/20 rounded-lg p-4 border border-white/20">
                         <div className="flex justify-between items-center mb-2">
                           <div className="flex items-center gap-2">
                             <span className={`text-xs px-2 py-1 rounded uppercase font-bold ${
                               gameType === 'uno' ? 'bg-red-600' :
                               gameType === 'chess' ? 'bg-purple-600' :
                               gameType === 'snake' ? 'bg-green-600' : 'bg-blue-600'
                             }`}>
                               {gameType}
                             </span>
                           </div>
                           <span className="text-lg font-bold text-green-300">
                             {data.total.toFixed(2)} ARC
                           </span>
                         </div>
                         <div className="text-sm text-white/70">
                           {data.count} games played • Avg: {(data.total / data.count).toFixed(2)} ARC per game
                         </div>
                       </div>
                     ))}
                   </div>
                 </ScrollArea>
               ) : (
                 <div className="flex items-center justify-center h-[300px]">
                   <p className="text-white/70">No token earnings found</p>
                 </div>
               )}
             </CardContent>
           </Card>

           {/* Betting History */}
           <Card className="bg-white/10 backdrop-blur-sm text-white border border-white/20 shadow-xl">
             <CardHeader>
               <CardTitle className="text-white">Betting History</CardTitle>
             </CardHeader>
             <CardContent className="min-h-[300px]">
               <ScrollArea className="h-[300px]">
                 <div className="space-y-3">
                   {/* Placeholder for betting history - will be populated from Firebase */}
                   <div className="text-center text-white/70 mt-20">
                     <p>Betting history coming soon!</p>
                     <p className="text-sm mt-2">Your betting stats will appear here</p>
                   </div>
                 </div>
               </ScrollArea>
               
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