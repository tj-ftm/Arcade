
"use client";

import { useState, useCallback, useEffect } from 'react'; // Added a comment to force re-compilation
import { Button } from "@/components/ui/button";

import { Swords, Users, BarChart, Gamepad2, BrainCircuit, Mountain, Home as HomeIcon, Settings, Play, Ticket, ArrowLeft, Save, Loader2, Coins, Trophy, Target, Clock, TrendingUp } from "lucide-react";
import TokenomicsChart from "@/components/web3/TokenomicsChart";
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileSidebar } from '@/components/layout/MobileSidebar';

// Game Clients
import { UnoClient } from '@/components/game/UnoClient';
import { SnakeClient } from '@/components/game/SnakeClient';
import { ChessClient } from '@/components/game/ChessClient';
import { MultiplayerChessClient } from '@/components/game/chess/MultiplayerChessClient';
import { MultiplayerUnoClient } from '@/components/game/uno/MultiplayerUnoClient';
import { UnoGambleClient } from '@/components/game/uno/UnoGambleClient';
import { GambleLobby } from '@/components/game/uno/GambleLobby';
import { SimpleGambleLobby } from '@/components/game/uno/SimpleGambleLobby';
import { SimpleGambleClient } from '@/components/game/uno/SimpleGambleClient';
import { SimpleGambleGame } from '@/lib/simple-gamble';
import ShopContent from '@/components/ShopContent';
import { MultiplayerLobby } from '@/components/game/MultiplayerLobby';


// Page-like components
import { ConnectWallet } from '@/components/web3/ConnectWallet';
import { useWeb3 } from "@/components/web3/Web3Provider";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GameStatistics, type LeaderboardEntry, type PlayerStats, type GameResult } from '@/lib/game-statistics';


type View = 'menu' | 'uno' | 'snake' | 'chess' | 'multiplayer' | 'leaderboard' | 'settings' | 'pay-uno' | 'shop' | 'uno-multiplayer' | 'uno-multiplayer-game' | 'uno-gamble' | 'uno-gamble-game' | 'uno-simple-gamble' | 'uno-simple-gamble-game' | 'chess-multiplayer' | 'chess-multiplayer-game' | 'platformer' | 'tokenomics';

// --- Replicated Page Components ---

// Simplified UI components for consistency
const Badge = ({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'secondary' | 'outline' }) => (
  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
    variant === 'outline' ? 'border border-white/30 text-white/80' :
    variant === 'secondary' ? 'bg-gray-600 text-white' :
    'bg-blue-600 text-white'
  }`}>{children}</span>
);

type GameType = 'all' | 'chess' | 'uno';

const LeaderboardContent = ({ onBack, onNavigate }: { onBack: () => void; onNavigate: (view: View) => void }) => {
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
  }, [loadGameStatistics, selectedGameType]);

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
 

  };

   const formatDate = (timestamp: any): string => {
    const date = timestamp?.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="w-full h-full flex flex-col z-10 animate-fade-in bg-gradient-to-br from-yellow-500 to-yellow-600">
      <header className="absolute top-5 left-0 w-full z-[100000] px-1 pb-1 sm:px-2 sm:pb-2">
          <div className="flex justify-between items-center w-full">
              <Button onClick={() => onNavigate('menu')} variant="ghost" size="lg" className="text-white/70 hover:text-white hover:bg-white/10 font-headline text-xl justify-start">
                  Main Menu
              </Button>
              <div className="flex items-center gap-2">
                  <ConnectWallet />
                  <MobileSidebar onNavigate={onNavigate} theme="leaderboard" />
              </div>
          </div>
      </header>

      <div className="flex-1 w-full max-w-7xl mx-auto px-2 md:px-4 lg:px-6 pt-20 pb-8"> {/* Combined header and content container */}
        <div className="mb-6 text-center">
          <h1 className="text-4xl sm:text-6xl font-headline text-white uppercase tracking-wider mb-2" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
            Leaderboard
          </h1>
          <p className="text-white/70 text-xl">Multiplayer game statistics and rankings</p>
        </div>
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {/* Game Type Tabs */}
        <div className="flex bg-black/20 rounded-lg p-1 mb-6 max-w-md mx-auto">
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
            <div className="bg-black/70 backdrop-blur-sm text-white border border-orange-300/20 shadow-xl rounded-lg p-4 flex flex-col h-full">
              <div className="mb-4">
                <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Total Games
                </h3>
              </div>
              <div>
                <div className="text-3xl font-bold text-accent">{playerStats.totalGames}</div>
                <p className="text-sm text-white/70">
                  {playerStats.wins} wins, {playerStats.losses} losses
                </p>
              </div>
            </div>

            <div className="bg-black/70 backdrop-blur-sm text-white border border-orange-300/20 shadow-xl rounded-lg p-2">
              <div className="mb-4">
                <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Win Rate
                </h3>
              </div>
              <div>
                <div className="text-3xl font-bold text-accent">{playerStats.winRate.toFixed(1)}%</div>
                <p className="text-sm text-white/70">
                  Current streak: {playerStats.currentWinStreak}
                </p>
              </div>
            </div>

            <div className="bg-black/70 backdrop-blur-sm text-white border border-orange-300/20 shadow-xl rounded-lg p-2">
              <div className="mb-4">
                <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Avg Game Time
                </h3>
              </div>
              <div>
                <div className="text-3xl font-bold text-accent">{formatDuration(Math.round(playerStats.averageGameDuration))}</div>
                <p className="text-sm text-white/70">
                  Longest streak: {playerStats.longestWinStreak}
                </p>
              </div>
            </div>

            <div className="bg-black/70 backdrop-blur-sm text-white border border-orange-300/20 shadow-xl rounded-lg p-4 flex flex-col overflow-y-auto min-w-0">
              <div className="mb-4">
                <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Best Game
                </h3>
              </div>
              <div>
                <div className="text-lg font-bold text-accent">
                  Chess: {playerStats.gamesPerType.chess.wins}/{playerStats.gamesPerType.chess.games}
                </div>
                <div className="text-lg font-bold text-accent">
                  UNO: {playerStats.gamesPerType.uno.wins}/{playerStats.gamesPerType.uno.games}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full overflow-hidden">
          {/* Leaderboard */}
          <div className="bg-black/70 backdrop-blur-sm text-white border border-orange-300/20 shadow-xl rounded-lg p-4 min-w-0">
            <div className="mb-4">
              <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                <Trophy className="h-6 w-6" />
                Top Players
                {selectedGameType !== 'all' && (
                  <Badge variant="outline">{selectedGameType.toUpperCase()}</Badge>
                )}
              </h3>
              <p className="text-sm text-white/70">
                Rankings based on wins and current win streaks
              </p>
            </div>
            <div className="flex-1 flex flex-col">
              {loading ? (
                <div className="flex items-center justify-center h-32 text-white/60">
                  <p className="text-lg">Loading Top Players...</p>
                </div>
              ) : leaderboard.length > 0 ? (
                <div className="flex-1 overflow-y-auto overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px] text-xs">Rank</TableHead>
                        <TableHead className="text-xs">Player</TableHead>
                        <TableHead className="text-xs">Wins</TableHead>
                        <TableHead className="text-xs">Streak</TableHead>
                        <TableHead className="text-xs">Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaderboard.map((entry) => (
                        <TableRow key={entry.playerId} className={entry.playerId === account ? 'bg-accent/10' : ''}>
                          <TableCell className="font-bold text-sm">
                            {entry.rank === 1 && <Trophy className="h-4 w-4 text-yellow-500 inline mr-1" />}
                            {entry.rank}
                          </TableCell>
                          <TableCell className="font-medium text-sm">
                            {entry.playerId === account ? (username || 'You') : entry.playerName}
                          </TableCell>
                          <TableCell className="text-sm">{entry.wins}</TableCell>
                          <TableCell className="text-sm">
                            <Badge variant={entry.winStreak > 5 ? "default" : "secondary"}>
                              {entry.winStreak}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{entry.winRate.toFixed(1)}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12 text-white/60">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">No multiplayer games recorded yet</p>
                  <p className="text-sm">Play some multiplayer games to see rankings!</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Games / Match History */}
          <div className="bg-black/70 backdrop-blur-sm text-white border border-orange-300/20 shadow-xl rounded-lg p-4">
            <div className="mb-4">
              <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                <Gamepad2 className="h-6 w-6" />
                Recent Matches
              </h3>
              <p className="text-sm text-white/70">
                Latest completed multiplayer games
              </p>
            </div>
            <div className="flex-1 flex flex-col">
              {loading ? (
                <div className="flex items-center justify-center h-32 text-white/60">
                  <p className="text-lg">Loading Recent Matches...</p>
                </div>
              ) : recentGames.length > 0 ? (
                <div className="flex-1 overflow-y-auto">
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
                </div>
              ) : (
                <div className="text-center py-12 text-white/60">
                  <Gamepad2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">No recent games found</p>
                  <p className="text-sm">Start playing multiplayer games to see match history!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const SettingsContent = ({ onBack }: { onBack: () => void }) => {
  const { toast } = useToast();

  const handleSave = () => {
    toast({
      title: "Settings Saved",
      description: "Your preferences have been updated.",
    });
    onBack();
  };

  return (
    <div className="w-full h-full flex flex-col z-10 animate-fade-in bg-gradient-to-br from-yellow-500 to-yellow-600">
      

      <div className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-20 pb-8"> {/* Combined header and content container */}
        <div className="mb-6 text-center">
          <h1 className="text-4xl sm:text-6xl font-headline text-white uppercase tracking-wider mb-2" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
            Settings
          </h1>
          <p className="text-white/70 text-xl">Adjust your game experience.</p>
        </div>
        <div className="bg-black/70 backdrop-blur-sm text-white border border-orange-300/20 shadow-xl rounded-lg p-8">
          <div className="space-y-6">

            <div className="flex items-center justify-between">
              <Label htmlFor="music" className="text-xl">Background Music</Label>
              <Switch id="music" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="sfx" className="text-xl">Sound Effects</Label>
              <Switch id="sfx" defaultChecked />
            </div>
          </div>

          <div className="mt-8 flex justify-between items-center">
            <Button onClick={onBack} variant="ghost" className="rounded-lg font-headline text-lg">
                <ArrowLeft className="mr-2 h-5 w-5" /> Back
            </Button>
            <Button onClick={handleSave} className="rounded-lg font-headline text-lg">
              <Save className="mr-2 h-5 w-5" /> Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const MultiplayerContent = ({ onBack }: { onBack: () => void }) => {
    const [isSearching, setIsSearching] = useState(false);

    const handleFindMatch = () => {
        setIsSearching(true);
        setTimeout(() => {
        setIsSearching(false);
        }, 5000);
    };
    return (
        <div className="w-full h-full max-w-md z-10 text-center my-auto animate-fade-in overflow-y-auto">
            <div className="bg-black/50 p-8 rounded-xl">
                <h1 className="text-6xl font-headline uppercase tracking-wider mb-2 text-accent">Multiplayer Content Placeholder</h1>
                <Button onClick={onBack} variant="secondary" className="w-full font-headline text-lg">
                    <ArrowLeft className="mr-2 h-5 w-5" /> Back to Menu
                </Button>
            </div>
        </div>
    );
};

const TokenomicsContent = ({ onBack }: { onBack: () => void }) => (
    <TokenomicsChart onBack={onBack} />
);

const UnoStartScreen = ({ onFreePlay, onPaidPlay, onGamblePlay, onSimpleGamblePlay }: { onFreePlay: () => void, onPaidPlay: () => void, onGamblePlay: () => void, onSimpleGamblePlay: () => void }) => (
     <div className="w-full h-full max-w-md z-10 text-center my-auto animate-fade-in overflow-y-auto">
        <div className="bg-black/50 p-8 rounded-xl flex flex-col items-center">
            <h1 className="text-8xl font-headline text-accent uppercase tracking-wider" style={{ WebkitTextStroke: '4px black' }}>UNO</h1>
            <p className="text-white/70 mt-1 mb-8 text-lg">The classic card game!</p>
            <div className="flex flex-col gap-4 w-full">
                <Button size="lg" onClick={onFreePlay} className="w-full h-16 text-2xl font-headline rounded-lg">
                    <Play className="mr-4" /> Free Play
                </Button>
                <Button size="lg" onClick={onPaidPlay} className="w-full h-16 text-2xl font-headline rounded-lg bg-green-600 hover:bg-green-700">
                    <Ticket className="mr-4" /> Pay & Play (0.1 S)
                </Button>
                <Button size="lg" onClick={onSimpleGamblePlay} className="w-full h-16 text-2xl font-headline rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold">
                    <Coins className="mr-4" /> Simple Gamble
                </Button>
                <Button size="lg" onClick={onGamblePlay} className="w-full h-16 text-2xl font-headline rounded-lg bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-black font-bold">
                    <Trophy className="mr-4" /> Advanced Gamble
                </Button>
            </div>
        </div>
    </div>
);


// --- Main App Component ---

interface Lobby {
  id: string;
  gameType: 'chess' | 'uno';
  player1Id: string;
  player1Name: string;
  player2Id?: string;
  player2Name?: string;
  status: 'waiting' | 'playing' | 'finished';
  createdAt: any; // Firebase timestamp
}



export default function HomePage() {
  const { toast } = useToast();
  const { account } = useWeb3();
  const [activeView, setActiveView] = useState<View>('menu');
  const [gameKey, setGameKey] = useState(0); // Used to reset game state
  const [chessLobby, setChessLobby] = useState<Lobby | null>(null);
  const [isChessHost, setIsChessHost] = useState(false);
  const [unoLobby, setUnoLobby] = useState<Lobby | null>(null);
  const [isUnoHost, setIsUnoHost] = useState(false);
  const [simpleGambleGame, setSimpleGambleGame] = useState<SimpleGambleGame | null>(null);
  const [isSimpleGambleHost, setIsSimpleGambleHost] = useState(false);
  const isMobile = useIsMobile();

  const handleMintArc = async () => {
    if (!account) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to mint ARC tokens.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch('/api/mint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerAddress: account,
          amount: 1, // Minting 1 ARC
        }),
      });


      const data = await response.json();
      // Send data to a server-side logging endpoint
      fetch('/api/debug-log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'minting_debug',
          account: account,
          responseData: data,
        }),
      });

      if (response.ok) {
        toast({
          title: "Minting Successful",
          description: `You have successfully minted 1 ARC token! Transaction: ${data.transactionHash}`,
        });
      } else {
        toast({
          title: "Minting Failed",
          description: `Error: ${data.error || 'Unknown error'}. Details: ${data.details || 'No details provided.'}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Minting failed:", error);
      toast({
        title: "Minting Failed",
        description: "There was an error minting ARC tokens. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleNavigate = (view: View) => {
    setGameKey(prev => prev + 1); // Increment key to force re-mount of game components
    setActiveView(view);
  };
  
  const handleGameEnd = useCallback(() => {
    setActiveView('menu');
  }, []);

  const handleChessMultiplayerStart = useCallback((lobby: Lobby, isHost: boolean) => {
    console.log('🎮 [MAIN PAGE] Chess multiplayer game starting:', { lobby, isHost });
    setChessLobby(lobby);
    setIsChessHost(isHost);
    setActiveView('chess-multiplayer-game');
  }, []);

  const handleChessMultiplayerEnd = useCallback(() => {
    console.log('🏁 [MAIN PAGE] Chess multiplayer game ended');
    setChessLobby(null);
    setIsChessHost(false);
    setActiveView('menu');
  }, []);

  const handleUnoMultiplayerStart = useCallback((lobby: Lobby, isHost: boolean) => {
    console.log('🎮 [MAIN PAGE] UNO multiplayer game starting:', { lobby, isHost });
    setUnoLobby(lobby);
    setIsUnoHost(isHost);
    setActiveView('uno-multiplayer-game');
  }, []);

  const handleUnoMultiplayerEnd = useCallback(() => {
    console.log('🏁 [MAIN PAGE] UNO multiplayer game ended');
    setUnoLobby(null);
    setIsUnoHost(false);
    setActiveView('menu');
  }, []);

  const handleUnoGambleStart = useCallback((lobby: Lobby, isHost: boolean) => {
    console.log('🎰 [MAIN PAGE] UNO gamble game starting:', { lobby, isHost });
    setUnoLobby(lobby);
    setIsUnoHost(isHost);
    setActiveView('uno-gamble-game');
  }, []);

  const handleUnoGambleEnd = useCallback(() => {
    console.log('🏁 [MAIN PAGE] UNO gamble game ended');
    setUnoLobby(null);
    setIsUnoHost(false);
    setActiveView('menu');
  }, []);

  const handleSimpleGambleStart = useCallback((game: SimpleGambleGame, isHost: boolean) => {
    console.log('🎰 [MAIN PAGE] Simple gamble game starting:', { game, isHost });
    setSimpleGambleGame(game);
    setIsSimpleGambleHost(isHost);
    setActiveView('uno-simple-gamble-game');
  }, []);

  const handleSimpleGambleEnd = useCallback(() => {
    console.log('🏁 [MAIN PAGE] Simple gamble game ended');
    setSimpleGambleGame(null);
    setIsSimpleGambleHost(false);
    setActiveView('menu');
  }, []);

  const getSidebarTheme = () => {
    switch (activeView) {
      case 'chess':
      case 'chess-multiplayer':
      case 'chess-multiplayer-game':
        return 'chess';
      case 'uno':
      case 'uno-multiplayer':
      case 'uno-multiplayer-game':
      case 'uno-gamble':
      case 'uno-gamble-game':
        return 'uno';
      case 'snake':
        return 'snake';
      case 'shop':
        return 'shop';
      default:
        return undefined;
    }
  };

  const renderContent = () => {
    switch (activeView) {
      case 'uno':
        return <UnoClient key={gameKey} onGameEnd={handleGameEnd} onNavigateToMultiplayer={() => handleNavigate('uno-multiplayer')} onNavigateToGamble={() => handleNavigate('uno-gamble')} onNavigateToSimpleGamble={() => handleNavigate('uno-simple-gamble')} />;
      case 'pay-uno':
        
      case 'shop':
         return <ShopContent onBack={() => handleNavigate('menu')} />;
      case 'snake':
        return <SnakeClient key={gameKey} />;
      case 'chess':
        return <ChessClient key={gameKey} onNavigateToMultiplayer={() => handleNavigate('chess-multiplayer')} />;
      case 'uno-multiplayer':
        return (
          <div className="w-full max-w-6xl mx-auto h-full flex flex-col justify-center pt-16">
            <MultiplayerLobby
              gameType="uno"
              onStartGame={handleUnoMultiplayerStart}
              onBackToMenu={() => handleNavigate('menu')}
            />
          </div>
        );
      case 'uno-multiplayer-game':
        return unoLobby ? (
          <div className="w-full h-full">
            <MultiplayerUnoClient
              lobby={unoLobby}
              isHost={isUnoHost}
              onGameEnd={handleUnoMultiplayerEnd}
            />
          </div>
        ) : null;
      case 'uno-gamble':
        return (
          <div className="w-full max-w-6xl mx-auto h-full flex flex-col justify-center pt-16">
            <GambleLobby
              gameType="uno"
              onStartGame={handleUnoGambleStart}
              onBackToMenu={() => handleNavigate('menu')}
            />
          </div>
        );
      case 'uno-gamble-game':
        return unoLobby ? (
          <div className="w-full h-full">
            <UnoGambleClient
              lobby={unoLobby}
              isHost={isUnoHost}
              onGameEnd={handleUnoGambleEnd}
            />
          </div>
        ) : null;
      case 'uno-simple-gamble':
        return (
          <div className="w-full max-w-6xl mx-auto h-full flex flex-col justify-center pt-16">
            <SimpleGambleLobby
              gameType="uno"
              onStartGame={handleSimpleGambleStart}
              onBackToMenu={() => handleNavigate('menu')}
            />
          </div>
        );
      case 'uno-simple-gamble-game':
        return simpleGambleGame ? (
          <div className="w-full h-full">
            <SimpleGambleClient
              game={simpleGambleGame}
              isHost={isSimpleGambleHost}
              onGameEnd={handleSimpleGambleEnd}
            />
          </div>
        ) : null;
      case 'chess-multiplayer':
        return (
          <div className="w-full max-w-6xl mx-auto h-full flex flex-col justify-center pt-16">
            <MultiplayerLobby
              gameType="chess"
              onStartGame={handleChessMultiplayerStart}
              onBackToMenu={() => handleNavigate('menu')}
            />
          </div>
        );
      case 'chess-multiplayer-game':
        return chessLobby ? (
          <div className="w-full h-full">
            <MultiplayerChessClient
              lobby={chessLobby}
              isHost={isChessHost}
              onGameEnd={handleChessMultiplayerEnd}
            />
          </div>
        ) : null;
      case 'leaderboard':
        return <LeaderboardContent onBack={() => handleNavigate('menu')} onNavigate={handleNavigate} />;
      case 'settings':
        return <SettingsContent onBack={() => handleNavigate('menu')} />;
      case 'tokenomics':
        return <TokenomicsContent onBack={() => handleNavigate('menu')} />;
       case 'multiplayer':
        return <MultiplayerContent onBack={() => handleNavigate('menu')} />;
      case 'menu':
      default:
        return (
          <>
             
             <div className="w-full flex-1 flex flex-col items-center justify-center pt-3 px-3 pb-3 sm:pt-2 sm:px-2 sm:pb-2">
                <div className="grid grid-cols-2 sm:grid sm:grid-cols-4 items-stretch justify-center gap-3 sm:gap-2 w-full max-w-xs sm:max-w-6xl mx-auto h-full overflow-hidden pt-8 pb-8">
                  <div className="animate-fade-in text-center">
                    <div className="py-3 px-3 sm:py-4 sm:px-3 pb-4 sm:pb-6 rounded-xl h-full flex flex-col justify-between bg-gradient-to-br from-red-600 to-red-700 text-white shadow-lg hover:from-red-500 hover:to-red-600 transition-all duration-300 ease-in-out transform hover:scale-105 font-headline group whitespace-normal leading-tight tracking-wider tracking-wider">
                      <div className="pt-0 sm:pt-1">
                            <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-headline text-accent uppercase tracking-wider mb-2 sm:mb-4 leading-tight" style={{ WebkitTextStroke: '2px black' }}>UNO</h1>
                        </div>
                        <div className="relative">
                           <img src="/uno_icon.png" alt="UNO Game" className="w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40 xl:w-48 xl:h-48 mx-auto mb-2" />
                           <img src="/multiplayer_icon.svg" alt="Multiplayer" className="absolute top-0 right-0 w-16 h-auto" />
                         </div>

                        <Button onClick={() => handleNavigate('uno')} variant="default" size="lg" className="w-full py-3 sm:py-6 text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl font-bold bg-gradient-to-br from-red-600 to-red-700 text-white rounded-xl shadow-lg hover:from-red-500 hover:to-red-600 transition-all duration-300 ease-in-out transform hover:scale-105 font-headline group whitespace-normal leading-tight tracking-wider border border-white">
                           Play
                         </Button>
                         </div>
                    </div>

                  <div className="animate-fade-in text-center">
                    <div className="py-3 px-3 sm:py-4 sm:px-3 pb-4 sm:pb-6 rounded-xl h-full flex flex-col justify-between bg-gradient-to-br from-purple-600 to-purple-700 text-white shadow-lg hover:from-purple-500 hover:to-purple-600 transition-all duration-300 ease-in-out transform hover:scale-105 font-headline group whitespace-normal leading-tight">
                       <div className="pt-0 sm:pt-1">
                            <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-headline text-purple-500 uppercase tracking-wider mb-2 sm:mb-4 leading-tight" style={{ WebkitTextStroke: '0.5px white' }}>CHESS</h1>
                        </div>
                        <div className="relative">
                           <img src="/chess_icon.png" alt="CHESS Game" className="w-32 h-32 sm:w-40 sm:h-40 lg:w-48 lg:h-48 xl:w-56 xl:h-56 mx-auto mb-2" />
                           <img src="/multiplayer_icon.svg" alt="Multiplayer" className="absolute top-0 right-0 w-16 h-auto" />
                         </div>

                        <Button onClick={() => handleNavigate('chess')} variant="default" size="lg" className="w-full py-3 sm:py-6 text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl font-bold bg-gradient-to-br from-purple-600 to-purple-700 text-white rounded-xl shadow-lg hover:from-purple-500 hover:to-purple-600 transition-all duration-300 ease-in-out transform hover:scale-105 font-headline group whitespace-normal leading-tight border border-white">
                            Play
                          </Button>
                         </div>
                    </div>
                  
                  <div className="animate-fade-in text-center">
                    <div className="py-3 px-3 sm:py-4 sm:px-3 pb-4 sm:pb-6 rounded-xl h-full flex flex-col justify-between bg-gradient-to-br from-green-600 to-green-700 text-white shadow-lg hover:from-green-500 hover:to-green-600 transition-all duration-300 ease-in-out transform hover:scale-105 font-headline group whitespace-normal leading-tight tracking-wider">
                       <div className="pt-0 sm:pt-1">
                            <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-headline text-green-500 uppercase tracking-wider mb-2 sm:mb-4 leading-tight" style={{ WebkitTextStroke: '0.5px white' }}>SNAKE</h1>
                        </div>
                        <img src="/snake_icon.png" alt="SNAKE Game" className="w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40 xl:w-48 xl:h-48 mb-4 object-contain mx-auto" />

                        <Button onClick={() => handleNavigate('snake')} variant="default" size="lg" className="w-full py-3 sm:py-6 text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl font-bold bg-gradient-to-br from-green-600 to-green-700 text-white rounded-xl shadow-lg hover:from-green-500 hover:to-green-600 transition-all duration-300 ease-in-out transform hover:scale-105 font-headline group mx-auto whitespace-normal leading-tight tracking-wider border border-white">
                            Play
                          </Button>
                         </div>
                    </div>
                  
                  <div className="animate-fade-in text-center">
                    <div className="py-3 px-3 sm:py-4 sm:px-3 pb-4 sm:pb-6 rounded-xl h-full flex flex-col justify-between bg-gradient-to-br from-yellow-500 to-yellow-600 text-white shadow-lg hover:from-yellow-300 hover:to-yellow-400 transition-all duration-300 ease-in-out transform hover:scale-105 font-headline group whitespace-normal leading-tight">
                       <div className="pt-0 sm:pt-1">
                             <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-headline text-yellow-500 uppercase tracking-wider mb-0 sm:mb-2 leading-tight" style={{ WebkitTextStroke: '0.5px white' }}>SHOP</h1>
                        </div>
                        <img src="/shop_icon.png" alt="Shop" className="w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40 xl:w-48 xl:h-48 mb-4 object-contain mx-auto" />

                        <Button onClick={() => handleNavigate('shop')} variant="default" size="lg" className="w-full py-3 sm:py-6 text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl font-bold bg-gradient-to-br from-yellow-500 to-yellow-600 text-white rounded-xl shadow-lg hover:from-yellow-300 hover:to-yellow-400 transition-all duration-300 ease-in-out transform hover:scale-105 font-headline group whitespace-normal leading-tight border border-white">
                            Visit
                          </Button>
                          </div>
                    </div>


                </div>
              </div>

          </>
        );
    }
  };

  const getBackgroundClass = () => {
      switch(activeView) {
          case 'uno':
          case 'pay-uno':
          case 'uno-multiplayer':
          case 'uno-multiplayer-game':
              return 'bg-red-900';
          case 'snake':
              return 'bg-gray-900';
          case 'chess':
          case 'chess-multiplayer':
          case 'chess-multiplayer-game':
              return 'bg-purple-900/50';
          case 'tokenomics':
              return 'bg-orange-500';
          case 'shop':
              return 'bg-transparent';
          case 'menu':
          case 'multiplayer':
          default:
              return 'bg-background';
          case 'leaderboard':
          case 'settings':
              return 'bg-gradient-to-br from-yellow-500 to-yellow-600';

      }
  }
  
  const showMainMenuHeader = activeView === 'menu' || activeView === 'multiplayer';
  const showMultiplayerHeader = activeView === 'uno-multiplayer' || activeView === 'chess-multiplayer';
  const showShopHeader = activeView === 'shop';
  const showLeaderboardHeader = activeView === 'leaderboard';
  const showTokenomicsHeader = activeView === 'tokenomics';
  const isGameActive = !showMainMenuHeader && !showMultiplayerHeader && !showShopHeader && !showLeaderboardHeader;

  return (
    
      <main className={`flex h-screen flex-col items-center overflow-hidden relative ${getBackgroundClass()}`}>
        {showMainMenuHeader ? (
             <>
              <div className="absolute inset-0 bg-red-800 bg-gradient-to-br from-red-900 via-red-700 to-orange-900 z-0"></div>
              
              <div className="absolute inset-0 bg-gradient-to-t from-background/50 via-transparent to-transparent"></div>
            </>
        ) : activeView === 'uno' || activeView === 'pay-uno' || activeView === 'uno-multiplayer' || activeView === 'uno-gamble' ? (
             <>
                <div className="absolute inset-0 bg-red-800 bg-gradient-to-br from-red-900 via-red-700 to-orange-900 z-0"></div>
                
            </>
        ) : activeView === 'snake' ? (
            <>
                <div className="absolute inset-0 bg-gray-800 bg-gradient-to-br from-gray-900 via-gray-700 to-black z-0"></div>
                
            </>
        ) : activeView === 'chess' || activeView === 'chess-multiplayer' ? (
             <>
                <div className="absolute inset-0 bg-purple-800 bg-gradient-to-br from-purple-900 via-purple-700 to-indigo-900 z-0"></div>
                
            </>
        ) : activeView === 'shop' ? (
            <>
                <div className="absolute inset-0 bg-yellow-600 bg-gradient-to-br from-yellow-500 via-orange-500 to-orange-600 z-0"></div>
                
            </>
        ) : activeView === 'tokenomics' ? (
            <>
                <div className="absolute inset-0 bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 z-0"></div>
                
            </>
        ) : null}

        
        {showMainMenuHeader && (
             <header className="w-full z-10 animate-fade-in flex-shrink-0 pt-4 sm:pt-4">
                <div className="flex justify-between items-center p-3 sm:p-2">
                    <div className="flex items-center gap-1 sm:gap-2 order-last">
                         <MobileSidebar onNavigate={handleNavigate} theme={activeView === 'snake' ? 'snake' : activeView === 'chess' ? 'chess' : undefined} />
                     </div>
                     <div className="flex-grow flex justify-center order-2">
                         <button onClick={() => handleNavigate('menu')}>
                             <h1 className="text-4xl sm:text-6xl font-headline uppercase tracking-wider bg-gradient-to-r from-yellow-400 via-yellow-500 to-orange-500 bg-clip-text text-transparent" style={{ WebkitTextStroke: '2px black' }}>
                                 Sonic Arcade
                               </h1>
                             <p className="text-white/70 text-base sm:text-lg font-headline">PLAY. EARN. COMPETE.</p>
                         </button>
                     </div>
                     <div className="flex items-center gap-1 sm:gap-2 mt-2">
                         <div className="hidden md:block">
                             <ConnectWallet />
                         </div>
                     </div>
                 </div>
             </header>
         )}

         {showMultiplayerHeader && (
             <header className="absolute top-5 left-0 w-full z-[100000] p-0">
                <div className="flex justify-between items-center w-full">
                    <Button onClick={() => handleNavigate('menu')} variant="ghost" size="lg" className="text-white/70 hover:text-white hover:bg-white/10 font-headline text-xl justify-start">
                        Main Menu
                    </Button>
                    <div className="flex items-center gap-2">
                        <div className="hidden md:block">
                            <ConnectWallet />
                        </div>
                        <MobileSidebar onNavigate={handleNavigate} theme={getSidebarTheme()} />
                    </div>
                </div>
            </header>
        )}

         {showShopHeader && (
             <header className="w-full z-10 animate-fade-in flex-shrink-0 pt-4 sm:pt-4">
                <div className="flex justify-between items-center p-3 sm:p-2">
                    <Button onClick={() => handleNavigate('menu')} variant="ghost" size="lg" className="text-white/70 hover:text-white hover:bg-white/10 font-headline text-xl justify-start">
                        Main Menu
                    </Button>
                    <div className="flex items-center gap-2">
                         <div className="hidden md:block">
                             <ConnectWallet />
                         </div>
                         <MobileSidebar onNavigate={handleNavigate} theme="shop" />
                     </div>
                </div>
            </header>
        )}



         {isGameActive && activeView !== 'platformer' && !showMultiplayerHeader && (
             <header className="absolute top-5 left-0 w-full z-[100000] px-1 pb-1 sm:px-2 sm:pb-2">
                <div className="flex justify-between items-center w-full">
                    <Button onClick={() => handleNavigate('menu')} variant="ghost" size="lg" className="text-white/70 hover:text-white hover:bg-white/10 font-headline text-xl justify-start">
                        Main Menu
                    </Button>
                    <div className="flex items-center gap-2">
                        <div className="hidden md:block">
                            <ConnectWallet />
                        </div>
                        <MobileSidebar onNavigate={handleNavigate} theme={getSidebarTheme()} />
                    </div>
                </div>
            </header>
        )}
        
        <div className="flex-1 w-full flex flex-col items-center justify-start overflow-auto relative" style={{paddingTop: showMainMenuHeader || showShopHeader || showLeaderboardHeader ? '0' : '0', minHeight: 0}}>
            {renderContent()}
        </div>
      </main>
    
  );
}

    