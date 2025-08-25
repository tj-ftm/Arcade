
"use client";

import { useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Swords, Users, BarChart, Gamepad2, BrainCircuit, Mountain, Home, Settings, Play, Ticket, ArrowLeft, Save, Loader2 } from "lucide-react";

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

export const MenuLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-gray-900 to-black py-12 text-white">
      {children}
    </div>
  );
};

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


// MenuLayout component is exported above - no additional exports needed
