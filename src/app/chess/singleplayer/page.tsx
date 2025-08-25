
"use client";

import { useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Swords, Users, BarChart, Gamepad2, BrainCircuit, Mountain, Home as HomeIcon, Settings, Play, Ticket, ArrowLeft, Save, Loader2 } from "lucide-react";

// Game Clients
import { UnoClient } from '@/components/game/UnoClient';
import { SnakeClient } from '@/components/game/SnakeClient';
import { ChessClient } from '@/components/game/ChessClient';
import { PlatformerClient } from '@/components/game/PlatformerClient';

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


type View = 'menu' | 'uno' | 'snake' | 'chess' | 'platformer' | 'multiplayer' | 'leaderboard' | 'settings' | 'pay-uno';

// --- Replicated Page Components ---

const LeaderboardContent = ({ onBack }: { onBack: () => void }) => {
  const { username, account } = useWeb3();

  const initialLeaderboardData = [
    { rank: 1, name: "UNO King", wins: 250, winStreak: 25 },
    { rank: 2, name: "Card Shark", wins: 220, winStreak: 15 },
    { rank: 3, name: "Wildcard Willy", wins: 205, winStreak: 18 },
    { rank: 4, name: "Draw 4 Dana", wins: 190, winStreak: 12 },
    { rank: 5, name: "Reverse Queen", wins: 180, winStreak: 20 },
    { rank: 6, name: "Skipper", wins: 150, winStreak: 9 },
    { rank: 7, name: "UNO-it-All", wins: 142, winStreak: 8 },
    { rank: 8, name: "Lucky Linda", wins: 130, winStreak: 7 },
    { rank: 9, name: "Card Master", wins: 121, winStreak: 6 },
    { rank: 10, name: "Joey", wins: 110, winStreak: 5 },
  ];

  const leaderboardData = [...initialLeaderboardData];
  const playerInLeaderboard = leaderboardData.find(p => p.rank === 10);

  if (account && playerInLeaderboard) {
    playerInLeaderboard.name = username || "You";
  }

  return (
    <div className="w-full max-w-4xl z-10 animate-fade-in my-auto">
      <div className="bg-black/50 p-6 rounded-xl">
        <h1 className="text-6xl font-headline text-center uppercase tracking-wider mb-6 text-accent">Leaderboard</h1>
        <Table>
          <TableHeader>
            <TableRow className="border-b-primary/50">
              <TableHead className="w-[50px] text-accent text-lg">Rank</TableHead>
              <TableHead className="text-accent text-lg">Player</TableHead>
              <TableHead className="text-accent text-lg">Win Streak</TableHead>
              <TableHead className="text-right text-accent text-lg">Total Wins</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leaderboardData.map((player) => (
              <TableRow key={player.rank} className="font-medium hover:bg-accent/10 border-b-0 text-xl">
                <TableCell className="text-2xl text-primary font-bold">{player.rank}</TableCell>
                <TableCell>{player.name}</TableCell>
                <TableCell className="text-center">{player.winStreak}</TableCell>
                <TableCell className="text-right font-bold text-white">{player.wins.toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
         <div className="mt-8 flex justify-center">
             <Button onClick={onBack} variant="secondary" className="font-headline text-lg">
                <ArrowLeft className="mr-2 h-5 w-5" /> Back to Menu
            </Button>
        </div>
      </div>
    </div>
  );
};

const SettingsContent = ({ onBack }: { onBack: () => void }) => {
  const { toast } = useToast();
  const { username, setUsername, account } = useWeb3();
  const [currentUsername, setCurrentUsername] = useState(username);

  const handleSave = () => {
    if(account && currentUsername) {
      setUsername(currentUsername);
    }
    toast({
      title: "Settings Saved",
      description: "Your preferences have been updated.",
    });
    onBack();
  };

  return (
    <div className="w-full max-w-lg z-10 my-auto animate-fade-in">
        <div className="bg-black/50 p-8 rounded-xl">
          <h1 className="text-6xl font-headline uppercase tracking-wider mb-2 text-accent">Options</h1>
          <p className="text-white/70 mb-8 text-lg">Adjust your game experience.</p>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Label htmlFor="username" className="text-xl">Username</Label>
              <Input 
                id="username"
                className="w-[180px] rounded-md"
                value={currentUsername || ""}
                onChange={(e) => setCurrentUsername(e.target.value)}
                placeholder="Enter a cool name..."
                disabled={!account}
              />
            </div>
             <div className="flex items-center justify-between">
              <Label htmlFor="difficulty" className="text-xl">Difficulty</Label>
              <Select defaultValue="medium">
                <SelectTrigger id="difficulty" className="w-[180px] rounded-md">
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="quality" className="text-xl">Graphics Quality</Label>
              <Select defaultValue="high">
                <SelectTrigger id="quality" className="w-[180px] rounded-md">
                  <SelectValue placeholder="Select quality" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="effects" className="text-xl">Particle Effects</Label>
              <Switch id="effects" defaultChecked />
            </div>
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
        <div className="w-full max-w-md z-10 text-center my-auto animate-fade-in">
            <div className="bg-black/50 p-8 rounded-xl">
            <h1 className="text-6xl font-headline uppercase tracking-wider mb-2 text-accent">Multiplayer</h1>
            <p className="text-white/70 mb-8 text-lg">Challenge players from around the world!</p>

            <div className="space-y-6">
                {isSearching ? (
                <div className="flex flex-col items-center space-y-4">
                    <Loader2 className="h-16 w-16 animate-spin text-primary" />
                    <p className="text-xl font-semibold">Searching for opponent...</p>
                    <p className="text-md text-muted-foreground">Pairing you with a worthy adversary.</p>
                    <Progress value={33} className="w-full animate-pulse" />
                </div>
                ) : (
                <div className="flex flex-col items-center space-y-4">
                    <Users className="h-24 w-24 text-primary" />
                    <p className="text-xl">Ready to play?</p>
                    <Button size="lg" onClick={handleFindMatch} className="w-full h-16 text-2xl font-headline rounded-lg">
                    Find Match
                    </Button>
                     <Button onClick={onBack} variant="secondary" className="w-full font-headline text-lg">
                        <ArrowLeft className="mr-2 h-5 w-5" /> Back to Menu
                    </Button>
                </div>
                )}
            </div>
            </div>
        </div>
    );
}

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


// --- Main App Component ---

export default function ChessSingleplayerHome() {
  const [activeView, setActiveView] = useState<View>('menu');
  const [gameKey, setGameKey] = useState(0); // Used to reset game state

  const handleNavigate = (view: View) => {
    setGameKey(prev => prev + 1); // Increment key to force re-mount of game components
    setActiveView(view);
  };
  
  const handleGameEnd = useCallback(() => {
    setActiveView('menu');
  }, []);

  const renderContent = () => {
    switch (activeView) {
      case 'uno':
        return <UnoClient key={gameKey} onGameEnd={handleGameEnd} />;
      case 'pay-uno':
        
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
      case 'menu':
      default:
        return (
          <>
             <div className="w-full flex-1 flex flex-col items-center justify-center z-10">
                <div className="flex flex-row flex-wrap items-center justify-center gap-4">
                  <div className="w-full max-w-xs animate-fade-in text-center">
                    <div className="bg-black/50 p-6 rounded-xl h-[320px] flex flex-col justify-center">
                      <h1 className="text-5xl font-headline text-accent uppercase tracking-wider" style={{ WebkitTextStroke: '2px black' }}>UNO</h1>
                      <p className="text-white/70 mt-1 mb-6 text-base">The classic card game!</p>
                      <div className="flex flex-col gap-4">
                        <Button onClick={() => handleNavigate('uno')} variant="default" size="lg" className="w-full text-xl h-14 bg-primary hover:bg-primary/90 rounded-lg font-headline group">
                           <Swords className="mr-4 text-primary-foreground/70 group-hover:text-white transition-colors" /> Single Player
                        </Button>
                        <Button onClick={() => handleNavigate('multiplayer')} variant="default" size="lg" className="w-full text-xl h-14 bg-blue-600 hover:bg-blue-500 rounded-lg font-headline group">
                           <Users className="mr-4 text-primary-foreground/70 group-hover:text-white transition-colors" /> Multiplayer
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="w-full max-w-xs animate-fade-in text-center">
                    <div className="bg-black/50 p-6 rounded-xl h-[320px] flex flex-col justify-center">
                       <h1 className="text-5xl font-headline text-green-500 uppercase tracking-wider" style={{ WebkitTextStroke: '2px black' }}>SNAKE</h1>
                       <p className="text-white/70 mt-1 mb-6 text-base">The retro classic!</p>
                         <Button onClick={() => handleNavigate('snake')} variant="default" size="lg" className="w-full text-xl h-14 bg-green-600 hover:bg-green-500 rounded-lg font-headline group">
                           <Gamepad2 className="mr-4 text-primary-foreground/70 group-hover:text-white transition-colors" /> Play Snake
                         </Button>
                    </div>
                  </div>
                  
                  <div className="w-full max-w-xs animate-fade-in text-center">
                    <div className="bg-black/50 p-6 rounded-xl h-[320px] flex flex-col justify-center">
                       <h1 className="text-5xl font-headline text-purple-500 uppercase tracking-wider" style={{ WebkitTextStroke: '2px black' }}>CHESS</h1>
                       <p className="text-white/70 mt-1 mb-6 text-base">The classic strategy game!</p>
                        <div className="flex flex-col gap-4">
                         <Button onClick={() => handleNavigate('chess')} variant="default" size="lg" className="w-full text-xl h-14 bg-purple-600 hover:bg-purple-500 rounded-lg font-headline group">
                           <BrainCircuit className="mr-4 text-primary-foreground/70 group-hover:text-white transition-colors" /> Single Player
                         </Button>
                        <Button onClick={() => handleNavigate('multiplayer')} variant="default" size="lg" className="w-full text-xl h-14 bg-blue-600 hover:bg-blue-500 rounded-lg font-headline group">
                           <Users className="mr-4 text-primary-foreground/70 group-hover:text-white transition-colors" /> Multiplayer
                        </Button>
                       </div>
                    </div>
                  </div>

                  <div className="w-full max-w-xs animate-fade-in text-center">
                    <div className="bg-black/50 p-6 rounded-xl h-[320px] flex flex-col justify-center">
                       <h1 className="text-5xl font-headline text-orange-500 uppercase tracking-wider" style={{ WebkitTextStroke: '2px black' }}>PLATFORMER</h1>
                       <p className="text-white/70 mt-1 mb-6 text-base">A classic 2D adventure!</p>
                         <Button onClick={() => handleNavigate('platformer')} variant="default" size="lg" className="w-full text-xl h-14 bg-orange-600 hover:bg-orange-500 rounded-lg font-headline group">
                           <Mountain className="mr-4 text-primary-foreground/70 group-hover:text-white transition-colors" /> Play
                         </Button>
                    </div>
                  </div>
                </div>
              </div>
               <div className="w-full max-w-4xl z-10 flex justify-center mt-8">
                  <div className="mt-4 grid grid-cols-1 gap-4 w-full max-w-md">
                      <Button onClick={() => handleNavigate('leaderboard')} variant="secondary" size="lg" className="w-full text-lg sm:text-xl h-12 sm:h-14 rounded-lg font-headline group">
                        <BarChart className="mr-3 text-secondary-foreground/70 group-hover:text-secondary-foreground transition-colors" /> Leaderboard
                      </Button>
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
              return 'bg-red-900';
          case 'snake':
              return 'bg-gray-900';
          case 'chess':
              return 'bg-purple-900/50';
          case 'platformer':
              return 'bg-blue-900'; // Platformer manages its own complex background
          case 'menu':
          case 'leaderboard':
          case 'settings':
          case 'multiplayer':
          default:
              return 'bg-background';
      }
  }
  
  const showHeader = activeView === 'menu' || activeView === 'leaderboard' || activeView === 'settings' || activeView === 'multiplayer';
  const showGenericHeader = !showHeader && activeView !== 'platformer'; // Platformer has no top header

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
             <header className="absolute top-5 left-0 w-full z-20 p-2 sm:p-4">
                <div className="flex justify-between items-center w-full">
                    <Button onClick={() => handleNavigate('menu')} variant="secondary" className="font-headline text-2xl">
                        Main Menu
                    </Button>
                    <ConnectWallet />
                </div>
            </header>
        )}
        
        <div className="flex-1 w-full flex items-center justify-center">
            {renderContent()}
        </div>
      </main>
  );
}
