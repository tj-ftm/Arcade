"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Users, ArrowLeft, Coins, Trophy, Loader2 } from 'lucide-react';
import { useGameBetting } from '@/lib/game-betting';
import { useWeb3 } from '@/components/web3/Web3Provider';
import { useToast } from '@/hooks/use-toast';
import { useFirebaseMultiplayer } from '@/hooks/use-firebase-multiplayer';

interface Lobby {
  id: string;
  gameType: 'chess' | 'uno' | 'pool';
  player1Id: string;
  player1Name: string;
  player2Id?: string;
  player2Name?: string;
  status: 'waiting' | 'playing' | 'finished';
  createdAt: any;
  betAmount?: string;
  isBetting?: boolean;
}

interface BettingLobbyProps {
  gameType: 'chess' | 'uno' | 'pool';
  onStartGame?: (lobby: Lobby, isHost: boolean) => void;
  onBackToMenu?: () => void;
}

export function BettingLobby({ gameType, onStartGame, onBackToMenu }: BettingLobbyProps) {
  const [activeTab, setActiveTab] = useState('create');
  const [betAmount, setBetAmount] = useState('10');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [arcBalance, setArcBalance] = useState('0');
  const [bettingLobbies, setBettingLobbies] = useState<Lobby[]>([]);
  const [gameStarting, setGameStarting] = useState(false);
  
  const { createService, account, isConnected } = useGameBetting();
  const { username } = useWeb3();
  const { toast } = useToast();
  const { createLobby, joinLobby, lobbies, onLobbyJoined, startGame } = useFirebaseMultiplayer();
  
  const currentUserId = account || `guest-${Date.now()}`;
  const currentUserName = username || 'Anonymous';

  // Filter betting lobbies
  useEffect(() => {
    const bettingLobbiesForGame = lobbies.filter(
      lobby => lobby.gameType === gameType && lobby.isBetting === true
    );
    setBettingLobbies(bettingLobbiesForGame);
  }, [lobbies, gameType]);

  // Get ARC balance
  useEffect(() => {
    const getBalance = async () => {
      if (!isConnected || !account) return;
      
      try {
        const service = await createService();
        const balance = await service.getArcBalance(account);
        setArcBalance(balance);
      } catch (error) {
        console.error('Error getting ARC balance:', error);
      }
    };
    
    getBalance();
  }, [isConnected, account, createService]);

  // Handle lobby joined
  useEffect(() => {
    const unsubscribe = onLobbyJoined((lobby) => {
      if (lobby.isBetting && lobby.gameType === gameType) {
        console.log('🎯 [BETTING LOBBY] Joined betting lobby:', lobby);
        handleGameStart(lobby, false);
      }
    });
    
    return unsubscribe;
  }, [gameType, onLobbyJoined]);

  const handleCreateBettingLobby = async () => {
    if (!isConnected || !account) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet to create a betting lobby.",
        variant: "destructive"
      });
      return;
    }

    const betAmountNum = parseFloat(betAmount);
    if (isNaN(betAmountNum) || betAmountNum <= 0) {
      toast({
        title: "Invalid Bet Amount",
        description: "Please enter a valid bet amount.",
        variant: "destructive"
      });
      return;
    }

    if (parseFloat(arcBalance) < betAmountNum) {
      toast({
        title: "Insufficient Balance",
        description: `You need at least ${betAmount} ARC tokens to create this bet.`,
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);
    
    try {
      // Create betting service
      const service = await createService();
      
      // Check allowance and approve if needed
      const hasAllowance = await service.checkAllowance(account, betAmount);
      if (!hasAllowance) {
        toast({
          title: "Approving Tokens",
          description: "Please approve the transaction to allow betting with ARC tokens."
        });
        
        const approveTx = await service.approveTokens(betAmount);
        await approveTx.wait();
        
        toast({
          title: "Tokens Approved",
          description: "You can now create betting lobbies."
        });
      }
      
      // Create Firebase lobby with betting info
      const lobby = await createLobby(gameType, currentUserName, currentUserId, {
        isBetting: true,
        betAmount: betAmount
      });
      
      // Create blockchain bet
      const createBetTx = await service.createBet(betAmount, gameType, lobby.id);
      await createBetTx.wait();
      
      toast({
        title: "Betting Lobby Created",
        description: `Created ${gameType} betting lobby with ${betAmount} ARC tokens.`
      });
      
      // Switch to browse tab to see the created lobby
      setActiveTab('browse');
      
    } catch (error: any) {
      console.error('Error creating betting lobby:', error);
      toast({
        title: "Error Creating Lobby",
        description: error.message || "Failed to create betting lobby.",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinBettingLobby = async (lobby: Lobby) => {
    if (!isConnected || !account) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet to join a betting lobby.",
        variant: "destructive"
      });
      return;
    }

    const betAmountNum = parseFloat(lobby.betAmount || '0');
    if (parseFloat(arcBalance) < betAmountNum) {
      toast({
        title: "Insufficient Balance",
        description: `You need at least ${lobby.betAmount} ARC tokens to join this bet.`,
        variant: "destructive"
      });
      return;
    }

    setIsJoining(true);
    
    try {
      // Create betting service
      const service = await createService();
      
      // Check allowance and approve if needed
      const hasAllowance = await service.checkAllowance(account, lobby.betAmount || '0');
      if (!hasAllowance) {
        toast({
          title: "Approving Tokens",
          description: "Please approve the transaction to join this betting lobby."
        });
        
        const approveTx = await service.approveTokens(lobby.betAmount || '0');
        await approveTx.wait();
      }
      
      // Join blockchain bet
      const joinBetTx = await service.joinBet(lobby.id);
      await joinBetTx.wait();
      
      // Join Firebase lobby
      await joinLobby(lobby.id, currentUserName, currentUserId);
      
      toast({
        title: "Joined Betting Lobby",
        description: `Joined ${gameType} betting lobby with ${lobby.betAmount} ARC tokens.`
      });
      
    } catch (error: any) {
      console.error('Error joining betting lobby:', error);
      toast({
        title: "Error Joining Lobby",
        description: error.message || "Failed to join betting lobby.",
        variant: "destructive"
      });
    } finally {
      setIsJoining(false);
    }
  };

  const handleGameStart = useCallback(async (lobby: Lobby, isHost: boolean) => {
    if (gameStarting) return;
    
    setGameStarting(true);
    
    try {
      if (isHost) {
        await startGame(lobby.id);
      }
      
      setTimeout(() => {
        if (onStartGame) {
          onStartGame(lobby, isHost);
        }
      }, 1000);
      
    } catch (error) {
      console.error('Error starting game:', error);
    } finally {
      setGameStarting(false);
    }
  }, [gameStarting, startGame, onStartGame]);

  // Show wallet connection prompt only when trying to create/join bets
  const showWalletPrompt = !isConnected && (activeTab === 'create' || bettingLobbies.length === 0);

  const getGameThemeColors = () => {
    switch (gameType) {
      case 'uno':
        return {
          primary: 'text-red-400',
          gradient: 'from-red-900 via-red-700 to-orange-900',
          accent: 'text-yellow-400'
        };
      case 'chess':
        return {
          primary: 'text-purple-400',
          gradient: 'from-purple-900 via-purple-800 to-indigo-900',
          accent: 'text-white'
        };
      case 'pool':
        return {
          primary: 'text-green-400',
          gradient: 'from-green-900 via-green-700 to-emerald-900',
          accent: 'text-lime-400'
        };
      default:
        return {
          primary: 'text-white',
          gradient: 'from-gray-900 to-gray-800',
          accent: 'text-yellow-400'
        };
    }
  };

  const themeColors = getGameThemeColors();

  return (
    <div className="w-full max-w-6xl mx-auto h-full flex flex-col justify-start relative z-20 overflow-auto pb-4 sm:pb-6 pt-20 md:pt-24 lg:pt-28">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-4 sm:p-6 flex-1 max-h-[85vh] sm:max-h-[90vh] overflow-hidden relative z-10">
        <div className="text-center mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-headline uppercase tracking-wider mb-2 sm:mb-4 text-white">
            {gameType.toUpperCase()} Betting
          </h1>
          <div className="flex justify-center items-center gap-4 mb-4">
            <div className="text-center">
              <p className="text-sm text-white/70">Your Balance</p>
              <p className={`text-xl font-bold ${themeColors.accent}`}>{parseFloat(arcBalance).toFixed(2)} ARC</p>
            </div>
          </div>
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col">
          <div className="flex justify-center items-center mb-3 sm:mb-4">
            <TabsList className="grid w-full max-w-md grid-cols-2 bg-white/10">
              <TabsTrigger 
                value="create" 
                className="data-[state=active]:bg-primary data-[state=active]:text-white text-sm sm:text-base"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Bet
              </TabsTrigger>
              <TabsTrigger 
                value="browse"
                className="data-[state=active]:bg-primary data-[state=active]:text-white text-sm sm:text-base"
              >
                <Users className="h-4 w-4 mr-2" />
                Join Bets ({bettingLobbies.length})
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-hidden">

            <TabsContent value="create" className="mt-0 h-full overflow-auto">
              <div className="flex justify-center h-full items-center">
                <Card className="bg-black/20 border-white/20 w-full max-w-md">
                  <CardHeader>
                    <CardTitle className={`text-white flex items-center gap-2 ${themeColors.primary}`}>
                      <Trophy className={`w-5 h-5 ${themeColors.accent}`} />
                      Create Betting Lobby
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!isConnected ? (
                      <div className="text-center py-8">
                        <Coins className="w-12 h-12 mx-auto mb-4 text-yellow-400" />
                        <h3 className="text-lg font-semibold text-white mb-2">Connect Wallet</h3>
                        <p className="text-gray-400 mb-4">
                          Connect your wallet to create betting lobbies and wager ARC tokens.
                        </p>
                        <Button className="bg-blue-600 hover:bg-blue-700">
                          Connect Wallet
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div>
                          <Label htmlFor="betAmount" className="text-white">Bet Amount (ARC Tokens)</Label>
                          <Input
                            id="betAmount"
                            type="number"
                            value={betAmount}
                            onChange={(e) => setBetAmount(e.target.value)}
                            placeholder="Enter bet amount"
                            min="1"
                            max={arcBalance}
                            className="bg-black/20 border-white/20 text-white"
                          />
                          <p className="text-sm text-gray-400 mt-1">
                            Available: {parseFloat(arcBalance).toFixed(2)} ARC
                          </p>
                        </div>
                        
                        <Button
                          onClick={handleCreateBettingLobby}
                          disabled={isCreating || parseFloat(betAmount) <= 0 || parseFloat(betAmount) > parseFloat(arcBalance)}
                          className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500"
                        >
                          {isCreating ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Creating Bet...
                            </>
                          ) : (
                            <>
                              <Coins className="w-4 h-4 mr-2" />
                              Create Bet ({betAmount} ARC)
                            </>
                          )}
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="browse" className="mt-0 h-full overflow-auto">
              <div className="space-y-4">
            {bettingLobbies.length === 0 ? (
              <Card className="bg-black/20 border-white/20">
                <CardContent className="p-8 text-center">
                  <Trophy className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold text-white mb-2">No Betting Lobbies</h3>
                  <p className="text-gray-400">Be the first to create a betting lobby!</p>
                </CardContent>
              </Card>
            ) : (
              bettingLobbies.map((lobby) => (
                <Card key={lobby.id} className="bg-black/20 border-white/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-white">
                          {lobby.player1Name}'s {gameType.toUpperCase()} Bet
                        </h3>
                        <p className="text-gray-400">Bet Amount: {lobby.betAmount} ARC</p>
                        <p className="text-sm text-gray-500">
                          Created {new Date(lobby.createdAt?.seconds * 1000 || Date.now()).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm text-gray-400">Players</p>
                          <p className="text-lg font-bold text-white">1/2</p>
                        </div>
                        {!isConnected ? (
                          <Button
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={() => {
                              toast({
                                title: "Wallet Required",
                                description: "Please connect your wallet to join betting lobbies.",
                                variant: "destructive"
                              });
                            }}
                          >
                            <Users className="w-4 h-4 mr-2" />
                            Connect to Join
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleJoinBettingLobby(lobby)}
                            disabled={isJoining || lobby.player1Id === currentUserId}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            {isJoining ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Joining...
                              </>
                            ) : (
                              <>
                                <Users className="w-4 h-4 mr-2" />
                                Join Bet
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}