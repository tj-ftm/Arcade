'use client';

import React, { useState, useEffect } from 'react';

import { GameStatistics, PlayerStats } from '@/lib/game-statistics';
import { useWeb3 } from '@/components/web3/Web3Provider';
import PlayerStatsCharts from '@/components/profile/PlayerStatsCharts';

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

const ProfileContent: React.FC<ProfileContentProps> = ({ onBack }) => {
    const web3 = useWeb3();
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);

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

    fetchStats();
  }, [web3?.account]);

  return (
    <div className="relative flex flex-col items-center justify-center h-full w-full bg-gradient-to-br from-pink-600 to-purple-700 text-white p-4 overflow-auto">
      <h1 className="text-6xl font-headline mb-8 sticky top-0 w-full text-center py-4 z-10">Profile Page</h1>



      <div className="w-full max-w-2xl bg-white/10 rounded-lg p-6 shadow-lg">
        <h2 className="text-2xl font-headline mb-4">Game Statistics</h2>
        {loading ? (
          <p>Loading game statistics...</p>
        ) : playerStats ? (
          <>
            <PlayerStatsCharts stats={playerStats as PlayerStats} />
          </>
        ) : (
          <p>No game statistics available. Play some games to see your stats!</p>
        )}
      </div>
    </div>
  );
};

export default ProfileContent;