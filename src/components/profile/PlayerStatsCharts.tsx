"use client";

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlayerStats } from '@/lib/game-statistics';

interface PlayerStatsChartsProps {
  stats: PlayerStats;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const PlayerStatsCharts: React.FC<PlayerStatsChartsProps> = ({ stats }) => {
  const winLossData = [
    { name: 'Wins', value: stats.wins },
    { name: 'Losses', value: stats.losses },
  ];

  const gameTypeData = [
    { name: 'Chess Wins', value: stats.gamesPerType.chess.wins },
    { name: 'Chess Losses', value: stats.gamesPerType.chess.losses },
    { name: 'Uno Wins', value: stats.gamesPerType.uno.wins },
    { name: 'Uno Losses', value: stats.gamesPerType.uno.losses },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
      <Card className="bg-purple-700/50 text-white border-gray-700">
        <CardHeader>
          <CardTitle className="text-xl font-headline uppercase tracking-wider">Win/Loss Ratio</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={winLossData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                fill="#8884d8"
                paddingAngle={5}
                dataKey="value"
                label
              >
                {winLossData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="bg-purple-700/50 text-white border-gray-700">
        <CardHeader>
          <CardTitle className="text-xl font-headline uppercase tracking-wider">Chess Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Chess Wins', value: stats.gamesPerType.chess.wins },
                  { name: 'Chess Losses', value: stats.gamesPerType.chess.losses },
                ]}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                fill="#8884d8"
                paddingAngle={5}
                dataKey="value"
                label
              >
                {[
                  { name: 'Chess Wins', value: stats.gamesPerType.chess.wins },
                  { name: 'Chess Losses', value: stats.gamesPerType.chess.losses },
                ].map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="bg-purple-700/50 text-white border-gray-700">
        <CardHeader>
          <CardTitle className="text-xl font-headline uppercase tracking-wider">Uno Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Uno Wins', value: stats.gamesPerType.uno.wins },
                  { name: 'Uno Losses', value: stats.gamesPerType.uno.losses },
                ]}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                fill="#8884d8"
                paddingAngle={5}
                dataKey="value"
                label
              >
                {[
                  { name: 'Uno Wins', value: stats.gamesPerType.uno.wins },
                  { name: 'Uno Losses', value: stats.gamesPerType.uno.losses },
                ].map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="bg-purple-700/50 text-white border-gray-700">
        <CardHeader>
          <CardTitle className="text-xl font-headline uppercase tracking-wider">Win Rate & Streaks</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-4xl font-bold mb-2">{stats.winRate.toFixed(2)}%</p>
          <p className="text-lg">Win Rate</p>
          <p className="text-2xl font-bold mt-4 mb-2">{stats.currentWinStreak}</p>
          <p className="text-lg">Current Win Streak</p>
          <p className="text-2xl font-bold mt-4 mb-2">{stats.longestWinStreak}</p>
          <p className="text-lg">Longest Win Streak</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlayerStatsCharts;