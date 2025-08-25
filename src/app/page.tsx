
"use client";

import { useState, useCallback } from 'react'; // Added a comment to force re-compilation
import { Button } from "@/components/ui/button";
import { Swords, Users, BarChart, Gamepad2, BrainCircuit, Mountain, Home as HomeIcon, Settings, Play, Ticket, ArrowLeft, Save, Loader2 } from "lucide-react";
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileSidebar } from '@/components/layout/MobileSidebar';

// Game Clients
import { UnoClient } from '@/components/game/UnoClient';
import { SnakeClient } from '@/components/game/SnakeClient';
import { ChessClient } from '@/components/game/ChessClient';
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


type View = 'menu' | 'uno' | 'snake' | 'chess' | 'multiplayer' | 'leaderboard' | 'settings' | 'pay-uno' | 'shop' | 'uno-multiplayer' | 'chess-multiplayer' | 'platformer';

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
    <div className="w-full h-full max-w-4xl z-10 animate-fade-in my-auto overflow-y-auto">
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
    <div className="w-full h-full max-w-lg z-10 my-auto animate-fade-in overflow-y-auto">
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

const UnoStartScreen = ({ onFreePlay, onPaidPlay }: { onFreePlay: () => void, onPaidPlay: () => void }) => (
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
            </div>
        </div>
    </div>
);


// --- Main App Component ---

export default function HomePage() {
  const { toast } = useToast();
  const { account } = useWeb3();
  const [activeView, setActiveView] = useState<View>('menu');
  const [gameKey, setGameKey] = useState(0); // Used to reset game state
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

  const renderContent = () => {
    switch (activeView) {
      case 'uno':
        return <UnoClient key={gameKey} onGameEnd={handleGameEnd} onNavigateToMultiplayer={() => handleNavigate('uno-multiplayer')} />;
      case 'pay-uno':
        
      case 'shop':
         return <ShopContent onBack={() => handleNavigate('menu')} />;
      case 'snake':
        return <SnakeClient key={gameKey} />;
      case 'chess':
        return <ChessClient key={gameKey} onNavigateToMultiplayer={() => handleNavigate('chess-multiplayer')} />;
      case 'uno-multiplayer':
        return (
          <div className="w-full max-w-6xl mx-auto h-full flex flex-col justify-center">
            <MultiplayerLobby
              gameType="uno"
              onStartGame={() => {/* Handle game start */}}
              onBackToMenu={() => handleNavigate('menu')}
            />
          </div>
        );
      case 'chess-multiplayer':
        return (
          <div className="w-full max-w-6xl mx-auto h-full flex flex-col justify-center">
            <MultiplayerLobby
              gameType="chess"
              onStartGame={() => {/* Handle game start */}}
              onBackToMenu={() => handleNavigate('menu')}
            />
          </div>
        );
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
             
             <div className="w-full flex-1 flex flex-col items-center justify-center pt-3 px-3 pb-3 sm:pt-2 sm:px-2 sm:pb-2">
                <div className="grid grid-cols-2 sm:grid sm:grid-cols-4 items-stretch justify-center gap-3 sm:gap-2 w-full max-w-xs sm:max-w-6xl mx-auto h-full">
                  <div className="animate-fade-in text-center">
                    <div className="bg-black/50 py-3 px-3 sm:py-4 sm:px-3 pb-4 sm:pb-6 rounded-xl h-full flex flex-col justify-between border-2 border-primary/30 hover:border-primary/60 transition-all duration-300">
                      <div className="pt-0 sm:pt-1">
                            <h1 className="text-2xl sm:text-5xl font-headline text-accent uppercase tracking-wider mb-2 sm:mb-4 leading-tight" style={{ WebkitTextStroke: '1px black' }}>UNO</h1>
                        </div>
                        <img src="/arcade_icon.png" alt="UNO Game" className="w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-2" />

                        <Button onClick={() => handleNavigate('uno')} variant="default" size="lg" className="w-full py-3 sm:py-6 text-lg sm:text-2xl font-bold bg-gradient-to-br from-red-600 to-red-700 text-white rounded-xl shadow-lg hover:from-red-700 hover:to-red-800 transition-all duration-300 ease-in-out transform hover:scale-105 font-headline group whitespace-normal leading-tight tracking-wider tracking-wider">
                           Play
                         </Button>
                         </div>
                    </div>

                  <div className="animate-fade-in text-center">
                    <div className="bg-black/50 py-3 px-3 sm:py-4 sm:px-3 pb-4 sm:pb-6 rounded-xl h-full flex flex-col justify-between border-2 border-purple-500/30 hover:border-purple-500/60 transition-all duration-300">
                       <div className="pt-0 sm:pt-1">
                            <h1 className="text-2xl sm:text-5xl font-headline text-green-500 uppercase tracking-wider mb-2 sm:mb-4 leading-tight" style={{ WebkitTextStroke: '1px black' }}>SNAKE</h1>
                        </div>
                        <img src="/arcade_icon.png" alt="SNAKE Game" className="w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-2" />

                        <Button onClick={() => handleNavigate('snake')} variant="default" size="lg" className="w-full py-3 sm:py-6 text-lg sm:text-2xl font-bold bg-gradient-to-br from-green-600 to-green-700 text-white rounded-xl shadow-lg hover:from-green-700 hover:to-green-800 transition-all duration-300 ease-in-out transform hover:scale-105 font-headline group mx-auto whitespace-normal leading-tight tracking-wider">
                            Play
                          </Button>
                         </div>
                    </div>
                  
                  <div className="animate-fade-in text-center">
                    <div className="bg-black/50 py-3 px-3 sm:py-4 sm:px-3 pb-4 sm:pb-6 rounded-xl h-full flex flex-col justify-between border-2 border-green-500/30 hover:border-green-500/60 transition-all duration-300">
                       <div className="pt-0 sm:pt-1">
                            <h1 className="text-2xl sm:text-5xl font-headline text-purple-500 uppercase tracking-wider mb-2 sm:mb-4 leading-tight" style={{ WebkitTextStroke: '1px black' }}>CHESS</h1>
                        </div>
                        <img src="/arcade_icon.png" alt="CHESS Game" className="w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-2" />

                        <Button onClick={() => handleNavigate('chess')} variant="default" size="lg" className="w-full py-3 sm:py-6 text-lg sm:text-2xl font-bold bg-gradient-to-br from-purple-600 to-purple-700 text-white rounded-xl shadow-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-300 ease-in-out transform hover:scale-105 font-headline group whitespace-normal leading-tight">
                            Play
                          </Button>
                         </div>
                    </div>
                  
                  <div className="animate-fade-in text-center">
                    <div className="bg-black/50 py-3 px-3 sm:py-4 sm:px-3 pb-4 sm:pb-6 rounded-xl h-full flex flex-col justify-between border-2 border-yellow-500/30 hover:border-yellow-500/60 transition-all duration-300">
                       <div className="pt-0 sm:pt-1">
                             <h1 className="text-2xl sm:text-5xl font-headline text-yellow-500 uppercase tracking-wider mb-0 sm:mb-2 leading-tight" style={{ WebkitTextStroke: '1px black' }}>SHOP</h1>
                        </div>
                        <img src="/arcade_icon.png" alt="SHOP" className="w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-2" />

                        <Button onClick={() => handleNavigate('shop')} variant="default" size="lg" className="w-full py-3 sm:py-6 text-lg sm:text-2xl font-bold bg-gradient-to-br from-yellow-500 to-yellow-600 text-white rounded-xl shadow-lg hover:from-yellow-600 hover:to-yellow-700 transition-all duration-300 ease-in-out transform hover:scale-105 font-headline group whitespace-normal leading-tight">
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
              return 'bg-red-900';
          case 'snake':
              return 'bg-gray-900';
          case 'chess':
          case 'chess-multiplayer':
              return 'bg-purple-900/50';

          case 'shop':
              return 'bg-transparent';
          case 'menu':
          case 'leaderboard':
          case 'settings':
          case 'multiplayer':
          default:
              return 'bg-background';
      }
  }
  
  const showMainMenuHeader = activeView === 'menu' || activeView === 'leaderboard' || activeView === 'settings' || activeView === 'multiplayer';
  const showMultiplayerHeader = activeView === 'uno-multiplayer' || activeView === 'chess-multiplayer';
  const isGameActive = !showMainMenuHeader && !showMultiplayerHeader;

  return (
      <main className={`flex h-screen flex-col items-center overflow-hidden relative ${getBackgroundClass()}`}>
        {showMainMenuHeader ? (
             <>
              <div className="absolute inset-0 bg-red-800 bg-gradient-to-br from-red-900 via-red-700 to-orange-900 z-0"></div>
              
              <div className="absolute inset-0 bg-gradient-to-t from-background/50 via-transparent to-transparent"></div>
            </>
        ) : activeView === 'uno' || activeView === 'pay-uno' || activeView === 'uno-multiplayer' ? (
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
        ) : null}

        
        {showMainMenuHeader && (
             <header className="w-full z-10 animate-fade-in flex-shrink-0 p-4 sm:p-4">
                <div className="flex justify-between items-center bg-black/50 backdrop-blur-sm p-3 sm:p-2 border-b-2 border-primary/50 rounded-lg">
                    <div className="flex items-center gap-1 sm:gap-2">

                         {isMobile && <MobileSidebar onNavigate={handleNavigate} />}
                         {!isMobile && (
                             <Button onClick={() => handleNavigate('leaderboard')} variant="ghost" size="lg" className="text-white/70 hover:text-white hover:bg-white/10 font-headline">
                                 Leaderboard
                             </Button>
                         )}
                         {!isMobile && (
                             <Button onClick={() => handleNavigate('settings')} variant="ghost" size="icon" className="text-white/70 hover:text-white hover:bg-white/10 font-headline">
                                 <Settings className="h-5 w-5" />
                             </Button>
                         )}
                     </div>
                     <div className="flex-grow flex justify-center">
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
             <header className="absolute top-0 left-0 w-full z-20 p-0">
                <div className="flex justify-between items-center w-full">
                    <Button onClick={() => handleNavigate('menu')} variant="ghost" size="lg" className="text-white/70 hover:text-white hover:bg-white/10 font-headline">
                        Main Menu
                    </Button>
                    <div className="flex items-center gap-2">
                        <div className="hidden md:block">
                            <ConnectWallet />
                        </div>
                        {isMobile && <MobileSidebar onNavigate={handleNavigate} />}
                    </div>
                </div>
            </header>
        )}

         {isGameActive && activeView !== 'platformer' && !showMultiplayerHeader && (
             <header className="absolute top-0 left-0 w-full z-20 px-1 pb-1 sm:px-2 sm:pb-2">
                <div className="flex justify-between items-center w-full">
                    <Button onClick={() => handleNavigate('menu')} variant="ghost" size="lg" className="text-white/70 hover:text-white hover:bg-white/10 font-headline">
                        <HomeIcon className="mr-2 h-5 w-5"/> Main Menu
                    </Button>
                    <div className="hidden md:block">
                        <ConnectWallet />
                    </div>
                    {isMobile && <MobileSidebar onNavigate={handleNavigate} />}
                </div>
            </header>
        )}
        
        <div className="flex-1 w-full flex flex-col items-center justify-start overflow-auto relative z-10" style={{paddingTop: (isGameActive && activeView !== 'platformer') || showMultiplayerHeader ? '80px' : showMainMenuHeader ? '0' : '0', minHeight: 0}}>
            {renderContent()}
        </div>
      </main>
  );
}

    