
"use client";

import { useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Swords, Users, BarChart, Gamepad2, BrainCircuit, Mountain, Home, Settings, Play, Ticket, ArrowLeft, Save, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { UnoClient } from '@/components/game/UnoClient';
import { SnakeClient } from '@/components/game/SnakeClient';
import { ChessClient } from '@/components/game/ChessClient';
import { PlatformerClient } from '@/components/game/PlatformerClient';
import { GameRulesModal } from '@/components/game/GameRulesModal';
import { ConnectWallet } from '@/components/web3/ConnectWallet';
import { useWeb3 } from "@/components/web3/Web3Provider";
import { PayToPlayModal } from '@/components/web3/PayToPlayModal';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

type View = 'menu' | 'uno' | 'snake' | 'chess' | 'platformer' | 'multiplayer' | 'leaderboard' | 'settings' | 'pay-uno';

export const GameLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
};

const LeaderboardContent = ({ onBack }: { onBack: () => void }) => {
  const mockData = [
    { rank: 1, player: "0x1234...5678", score: 1250, game: "UNO" },
    { rank: 2, player: "0x9876...5432", score: 1100, game: "Snake" },
    { rank: 3, player: "0xabcd...efgh", score: 950, game: "Chess" },
    { rank: 4, player: "0x1111...2222", score: 800, game: "UNO" },
    { rank: 5, player: "0x3333...4444", score: 750, game: "Snake" },
  ];

  const getGameIcon = (game: string) => {
    switch(game) {
      case 'UNO': return <Swords className="h-4 w-4" />;
      case 'Snake': return <Mountain className="h-4 w-4" />;
      case 'Chess': return <BrainCircuit className="h-4 w-4" />;
      default: return <Gamepad2 className="h-4 w-4" />;
    }
  }

  return (
    <div className="w-full max-w-4xl z-10 animate-fade-in">
      <div className="bg-black/50 p-8 rounded-xl">
        <h1 className="text-6xl font-headline text-accent uppercase tracking-wider mb-8 text-center" style={{ WebkitTextStroke: '3px black' }}>Leaderboard</h1>
        
        <Table className="mb-8">
          <TableHeader>
            <TableRow>
              <TableHead className="text-white font-bold">Rank</TableHead>
              <TableHead className="text-white font-bold">Player</TableHead>
              <TableHead className="text-white font-bold">Game</TableHead>
              <TableHead className="text-white font-bold text-right">Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockData.map((entry) => (
              <TableRow key={entry.rank} className="border-white/20">
                <TableCell className="text-white font-bold text-lg">#{entry.rank}</TableCell>
                <TableCell className="text-white">{entry.player}</TableCell>
                <TableCell className="text-white">
                  <div className="flex items-center gap-2">
                    {getGameIcon(entry.game)}
                    {entry.game}
                  </div>
                </TableCell>
                <TableCell className="text-accent font-bold text-right text-lg">{entry.score.toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        <div className="flex justify-center">
          <Button onClick={onBack} size="lg" className="font-headline text-xl">
            <ArrowLeft className="mr-2" /> Back to Menu
          </Button>
        </div>
      </div>
    </div>
  );
};

const SettingsContent = ({ onBack }: { onBack: () => void }) => {
  const [settings, setSettings] = useState({
    soundEnabled: true,
    musicVolume: 50,
    sfxVolume: 75,
    difficulty: 'normal',
    autoSave: true,
  });

  const handleSave = () => {
    // Save settings logic here
    toast({
      title: "Settings Saved",
      description: "Your preferences have been updated.",
    });
  };

  return (
    <div className="w-full max-w-2xl z-10 animate-fade-in">
      <div className="bg-black/50 p-8 rounded-xl">
        <h1 className="text-6xl font-headline text-accent uppercase tracking-wider mb-8 text-center" style={{ WebkitTextStroke: '3px black' }}>Settings</h1>
        
        <div className="space-y-6 mb-8">
          <div className="flex items-center justify-between">
            <Label htmlFor="sound" className="text-white text-lg">Sound Effects</Label>
            <Switch 
              id="sound" 
              checked={settings.soundEnabled} 
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, soundEnabled: checked }))}
            />
          </div>
          
          <div className="space-y-2">
            <Label className="text-white text-lg">Music Volume</Label>
            <div className="flex items-center gap-4">
              <Progress value={settings.musicVolume} className="flex-1" />
              <span className="text-white w-12">{settings.musicVolume}%</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-white text-lg">SFX Volume</Label>
            <div className="flex items-center gap-4">
              <Progress value={settings.sfxVolume} className="flex-1" />
              <span className="text-white w-12">{settings.sfxVolume}%</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-white text-lg">Difficulty</Label>
            <Select value={settings.difficulty} onValueChange={(value) => setSettings(prev => ({ ...prev, difficulty: value }))}>
              <SelectTrigger className="bg-black/30 text-white border-white/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="autosave" className="text-white text-lg">Auto Save</Label>
            <Switch 
              id="autosave" 
              checked={settings.autoSave} 
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, autoSave: checked }))}
            />
          </div>
        </div>
        
        <div className="flex gap-4 justify-center">
          <Button onClick={handleSave} size="lg" className="font-headline text-xl">
            <Save className="mr-2" /> Save Settings
          </Button>
          <Button onClick={onBack} size="lg" variant="outline" className="font-headline text-xl">
            <ArrowLeft className="mr-2" /> Back to Menu
          </Button>
        </div>
      </div>
    </div>
  );
};

const MultiplayerContent = ({ onBack }: { onBack: () => void }) => {
  const [isSearching, setIsSearching] = useState(false);

  const handleQuickMatch = () => {
    setIsSearching(true);
    // Simulate matchmaking
    setTimeout(() => {
      setIsSearching(false);
      toast({
        title: "Match Found!",
        description: "Connecting to opponent...",
      });
    }, 3000);
  };

  return (
    <div className="w-full max-w-md z-10 text-center animate-fade-in">
      <div className="bg-black/50 p-8 rounded-xl flex flex-col items-center">
        <h1 className="text-6xl font-headline text-accent uppercase tracking-wider mb-4" style={{ WebkitTextStroke: '3px black' }}>Multiplayer</h1>
        <p className="text-white/70 mb-8 text-lg">Challenge players worldwide!</p>
        
        <div className="flex flex-col gap-4 w-full">
          <Button 
            size="lg" 
            onClick={handleQuickMatch} 
            disabled={isSearching}
            className="w-full h-16 text-2xl font-headline rounded-lg"
          >
            {isSearching ? (
              <><Loader2 className="mr-4 animate-spin" /> Searching...</>
            ) : (
              <><Users className="mr-4" /> Quick Match</>
            )}
          </Button>
          
          <Button onClick={onBack} size="lg" variant="outline" className="w-full h-16 text-2xl font-headline rounded-lg">
            <ArrowLeft className="mr-4" /> Back to Menu
          </Button>
        </div>
      </div>
    </div>
  );
};

const UnoStartScreen = ({ onFreePlay, onPaidPlay }: { onFreePlay: () => void, onPaidPlay: () => void }) => (
  <div className="w-full max-w-md z-10 text-center my-auto animate-fade-in">
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
      </div>
    </div>
  </div>
);

export default function MainApp() {
  const [activeView, setActiveView] = useState<View>('menu');
  const [gameKey, setGameKey] = useState(0);
  const [showUnoRules, setShowUnoRules] = useState(false);
  const [showChessRules, setShowChessRules] = useState(false);

  const handleNavigate = (view: View) => {
    setGameKey(prev => prev + 1);
    setActiveView(view);
  };
  
  const handleGameEnd = useCallback(() => {
    setActiveView('menu');
  }, []);

  const handleUnoPlay = () => {
    setShowUnoRules(true);
  };

  const handleChessPlay = () => {
    setShowChessRules(true);
  };

  const renderContent = () => {
    switch (activeView) {
      case 'uno':
        return <UnoClient key={gameKey} onGameEnd={handleGameEnd} />;
      case 'pay-uno':
        return <PayToPlayModal onPaymentSuccess={() => handleNavigate('uno')} onCancel={() => handleNavigate('menu')} />;
      case 'snake':
        return <SnakeClient key={gameKey} />;
      case 'chess':
        return <ChessClient key={gameKey} />;
      case 'platformer':
        return <PlatformerClient key={gameKey} />;
      case 'leaderboard':
        return <LeaderboardContent onBack={() => handleNavigate('menu')} />;
      case 'settings':
        return <SettingsContent onBack={() => handleNavigate('menu')} />;
      case 'multiplayer':
        return <MultiplayerContent onBack={() => handleNavigate('menu')} />;
      default:
        return (
          <div className="w-full max-w-4xl z-10 text-center animate-fade-in">
            <div className="bg-black/50 p-8 rounded-xl">
              <h1 className="text-8xl font-headline text-accent uppercase tracking-wider mb-4" style={{ WebkitTextStroke: '4px black' }}>Sonic Arcade</h1>
              <p className="text-white/70 mb-12 text-xl">Choose your game and start playing!</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <Button size="lg" onClick={handleUnoPlay} className="h-24 text-2xl font-headline rounded-lg bg-red-600 hover:bg-red-700">
                  <Swords className="mr-4 h-8 w-8" /> UNO
                </Button>
                <Button size="lg" onClick={() => handleNavigate('snake')} className="h-24 text-2xl font-headline rounded-lg bg-green-600 hover:bg-green-700">
                  <Mountain className="mr-4 h-8 w-8" /> Snake
                </Button>
                <Button size="lg" onClick={handleChessPlay} className="h-24 text-2xl font-headline rounded-lg bg-purple-600 hover:bg-purple-700">
                  <BrainCircuit className="mr-4 h-8 w-8" /> Chess
                </Button>
                <Button size="lg" onClick={() => handleNavigate('platformer')} className="h-24 text-2xl font-headline rounded-lg bg-blue-600 hover:bg-blue-700">
                  <Gamepad2 className="mr-4 h-8 w-8" /> Platformer
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button size="lg" onClick={() => handleNavigate('multiplayer')} className="h-16 text-xl font-headline rounded-lg bg-orange-600 hover:bg-orange-700">
                  <Users className="mr-3 h-6 w-6" /> Multiplayer
                </Button>
                <Button size="lg" onClick={() => handleNavigate('leaderboard')} className="h-16 text-xl font-headline rounded-lg bg-yellow-600 hover:bg-yellow-700">
                  <BarChart className="mr-3 h-6 w-6" /> Leaderboard
                </Button>
                <Button size="lg" onClick={() => handleNavigate('settings')} className="h-16 text-xl font-headline rounded-lg bg-gray-600 hover:bg-gray-700">
                  <Settings className="mr-3 h-6 w-6" /> Settings
                </Button>
              </div>
            </div>
          </div>
        );
    }
  };

  const getBackgroundClass = () => {
    switch(activeView) {
      case 'uno':
      case 'pay-uno':
        return 'bg-red-900';
      case 'snake':
        return 'bg-gray-900';
      case 'chess':
        return 'bg-purple-900';
      case 'platformer':
        return 'bg-blue-900';
      default:
        return 'bg-red-900';
    }
  };

  const showHeader = activeView === 'menu' || activeView === 'leaderboard' || activeView === 'settings' || activeView === 'multiplayer';
  const showGenericHeader = !showHeader && activeView !== 'platformer';

  return (
    <main className={`flex min-h-screen flex-col items-center justify-center p-2 sm:p-4 md:p-8 overflow-hidden relative ${getBackgroundClass()}`}>
      {activeView === 'menu' || activeView === 'leaderboard' || activeView === 'settings' || activeView === 'multiplayer' ? (
        <>
          <div className="absolute inset-0 bg-red-800 bg-gradient-to-br from-red-900 via-red-700 to-orange-900 z-0"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-background/50 via-transparent to-transparent"></div>
        </>
      ) : activeView === 'uno' ? (
        <>
          <div className="absolute inset-0 bg-red-800 bg-gradient-to-br from-red-900 via-red-700 to-orange-900 z-0"></div>
        </>
      ) : activeView === 'snake' ? (
        <>
          <div className="absolute inset-0 bg-gray-800 bg-gradient-to-br from-gray-900 via-gray-700 to-black z-0"></div>
        </>
      ) : activeView === 'chess' ? (
        <>
          <div className="absolute inset-0 bg-purple-800 bg-gradient-to-br from-purple-900 via-purple-700 to-indigo-900 z-0"></div>
        </>
      ) : null}

      {showHeader && (
        <header className="w-full z-10 animate-fade-in self-start">
          <div className="flex justify-between items-center bg-black/50 backdrop-blur-sm p-2 sm:p-3 border-b-2 border-primary/50 rounded-lg">
            <button onClick={() => handleNavigate('menu')}>
              <div className="font-headline text-3xl sm:text-5xl font-bold text-accent cursor-pointer" style={{ WebkitTextStroke: '2px black' }}>
                Sonic <span className="text-primary">Arcade</span>
              </div>
            </button>
            <div className="flex items-center gap-1 sm:gap-2">
              <Button onClick={() => handleNavigate('settings')} variant="ghost" size="icon" className="text-white/70 hover:text-white hover:bg-white/10">
                <Settings />
              </Button>
              <ConnectWallet />
            </div>
          </div>
        </header>
      )}

      {showGenericHeader && (
        <header className="absolute top-0 left-0 w-full z-20 p-2 sm:p-4">
          <div className="flex justify-between items-center w-full">
            <Button onClick={() => handleNavigate('menu')} variant="secondary" className="font-headline text-lg">
              <Home className="mr-2 h-5 w-5"/> Main Menu
            </Button>
            <ConnectWallet />
          </div>
        </header>
      )}

      <div className="flex-1 w-full flex items-center justify-center">
        {renderContent()}
      </div>

      {showUnoRules && (
        <GameRulesModal
          gameName="UNO"
          rules={[
            "Each player is dealt 7 cards.",
            "Match the top card of the discard pile by color or number.",
            "Action cards (Skip, Reverse, Draw Two) add twists.",
            "Wild cards can change the color.",
            "Say 'UNO' when you have one card left.",
            "First player to empty their hand wins the round.",
            "Points are scored by cards left in opponents' hands.",
            "First player to 500 points wins the game."
          ]}
          onClose={() => setShowUnoRules(false)}
          onStartGame={() => {
            setShowUnoRules(false);
            handleNavigate('uno');
          }}
        />
      )}

      {showChessRules && (
        <GameRulesModal
          gameName="Chess"
          rules={[
            "The goal is to checkmate the opponent's king.",
            "Each piece has unique movement rules (Pawn, Rook, Knight, Bishop, Queen, King).",
            "Players take turns moving one piece at a time.",
            "The game ends when a king is checkmated, a stalemate occurs, or a draw is agreed."
          ]}
          onClose={() => setShowChessRules(false)}
          onStartGame={() => {
            setShowChessRules(false);
            handleNavigate('chess');
          }}
        />
      )}
    </main>
  );
}
