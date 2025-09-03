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
import { useFirebaseBetting } from '@/hooks/use-firebase-betting';

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
  const [filteredLobbies, setFilteredLobbies] = useState<Lobby[]>([]);
  const [gameStarting, setGameStarting] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);
  
  // Game-specific theming
  const getGameTheme = () => {
    switch (gameType) {
      case 'uno':
        return {
          bg: 'bg-red-800 bg-gradient-to-br from-red-900 via-red-700 to-orange-900',
          cardBg: 'bg-red-900/50',
          border: 'border-red-500/50',
          accent: 'text-yellow-400',
          button: 'bg-red-600 hover:bg-red-700',
          title: 'UNO'
        };
      case 'chess':
        return {
          bg: 'bg-purple-800 bg-gradient-to-br from-purple-900 via-purple-700 to-indigo-900',
          cardBg: 'bg-purple-900/50',
          border: 'border-purple-500/50',
          accent: 'text-amber-400',
          button: 'bg-purple-600 hover:bg-purple-700',
          title: 'CHESS'
        };
      case 'pool':
        return {
          bg: 'bg-green-800 bg-gradient-to-br from-green-900 via-green-700 to-emerald-900',
          cardBg: 'bg-green-900/50',
          border: 'border-green-500/50',
          accent: 'text-lime-400',
          button: 'bg-green-600 hover:bg-green-700',
          title: 'POOL'
        };
      default:
        return {
          bg: 'bg-gray-800',
          cardBg: 'bg-gray-900/50',
          border: 'border-gray-500/50',
          accent: 'text-white',
          button: 'bg-gray-600 hover:bg-gray-700',
          title: gameType.toUpperCase()
        };
    }
  };
  
  const theme = getGameTheme();
  
  const { createService, account, isConnected } = useGameBetting();
  const { username, arcBalance } = useWeb3();
  const { toast } = useToast();
  const { createBettingLobby, joinBettingLobby, bettingLobbies, onBettingLobbyJoined, startBettingGame } = useFirebaseBetting();
  
  const currentUserId = account || `guest-${Date.now()}`;
  const currentUserName = username || 'Anonymous';

  // Filter betting lobbies for current game type
  useEffect(() => {
    const lobbiesForGame = bettingLobbies.filter(
      lobby => lobby.gameType === gameType
    );
    setFilteredLobbies(lobbiesForGame);
  }, [bettingLobbies, gameType]);

  // ARC balance is now fetched from Web3Provider context

  // Handle lobby joined
  useEffect(() => {
    const unsubscribe = onBettingLobbyJoined((lobby) => {
      if (lobby.gameType === gameType) {
        console.log('🎯 [BETTING LOBBY] Joined betting lobby:', lobby);
        handleGameStart(lobby, false);
      }
    });
    
    return unsubscribe;
  }, [gameType, onBettingLobbyJoined]);

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

    if (parseFloat(arcBalance || '0') < betAmountNum) {
      toast({
        title: "Insufficient Balance",
        description: `You need at least ${betAmount} ARC tokens to create this bet.`,
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);
    setLoadingStep('Initializing betting service...');
    setLoadingProgress(10);
    
    try {
      // Create betting service
      const service = await createService();
      setLoadingStep('Checking token allowance...');
      setLoadingProgress(25);
      
      // Check allowance and approve if needed
      const hasAllowance = await service.checkAllowance(account, betAmount);
      if (!hasAllowance) {
        setLoadingStep('Requesting token approval...');
        setLoadingProgress(40);
        toast({
          title: "Approving Tokens",
          description: "Please approve the transaction to allow betting with ARC tokens."
        });
        
        const approveTx = await service.approveTokens(betAmount);
        setLoadingStep('Waiting for approval confirmation...');
        setLoadingProgress(55);
        await approveTx.wait();
        
        toast({
          title: "Tokens Approved",
          description: "You can now create betting lobbies."
        });
      }
      
      setLoadingStep('Creating lobby...');
      setLoadingProgress(70);
      // Create Firebase lobby with betting info
      const lobby = await createBettingLobby(gameType, currentUserName, currentUserId, betAmount);
      
      setLoadingStep('Creating blockchain bet...');
      setLoadingProgress(85);
      // Create blockchain bet
      const createBetTx = await service.createBet(betAmount, gameType, lobby.id);
      setLoadingStep('Confirming bet transaction...');
      setLoadingProgress(95);
      await createBetTx.wait();
      
      setLoadingStep('Lobby created successfully!');
      setLoadingProgress(100);
      
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
      setLoadingStep('');
      setLoadingProgress(0);
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
    if (parseFloat(arcBalance || '0') < betAmountNum) {
      toast({
        title: "Insufficient Balance",
        description: `You need at least ${lobby.betAmount} ARC tokens to join this bet.`,
        variant: "destructive"
      });
      return;
    }

    setIsJoining(true);
    setLoadingStep('Initializing betting service...');
    setLoadingProgress(15);
    
    try {
      // Create betting service
      const service = await createService();
      setLoadingStep('Checking token allowance...');
      setLoadingProgress(30);
      
      // Check allowance and approve if needed
      const hasAllowance = await service.checkAllowance(account, lobby.betAmount || '0');
      if (!hasAllowance) {
        setLoadingStep('Requesting token approval...');
        setLoadingProgress(45);
        toast({
          title: "Approving Tokens",
          description: "Please approve the transaction to join this betting lobby."
        });
        
        const approveTx = await service.approveTokens(lobby.betAmount || '0');
        setLoadingStep('Waiting for approval confirmation...');
        setLoadingProgress(60);
        await approveTx.wait();
      }
      
      setLoadingStep('Joining blockchain bet...');
      setLoadingProgress(75);
      // Join blockchain bet
      const joinBetTx = await service.joinBet(lobby.id);
      setLoadingStep('Confirming bet transaction...');
      setLoadingProgress(90);
      await joinBetTx.wait();
      
      setLoadingStep('Joining lobby...');
      setLoadingProgress(95);
      // Join Firebase lobby
      await joinBettingLobby(lobby.id, currentUserName, currentUserId);
      
      setLoadingStep('Successfully joined!');
      setLoadingProgress(100);
      
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
      setLoadingStep('');
      setLoadingProgress(0);
    }
  };

  const handleGameStart = useCallback(async (lobby: Lobby, isHost: boolean) => {
    if (gameStarting) return;
    
    setGameStarting(true);
    
    try {
      if (isHost) {
        await startBettingGame(lobby.id);
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
  }, [gameStarting, startBettingGame, onStartGame]);

  // Show wallet connection prompt only when trying to create/join bets
  const showWalletPrompt = !isConnected && (activeTab === 'create' || filteredLobbies.length === 0);

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

  const getGameGradient = () => {
    switch (gameType) {
      case 'uno':
        return 'bg-gradient-to-br from-red-900 via-red-700 to-orange-900';
      case 'chess':
        return 'bg-gradient-to-br from-purple-900 via-purple-700 to-indigo-900';
      case 'pool':
        return 'bg-gradient-to-br from-green-900 via-green-700 to-emerald-900';
      default:
        return 'bg-gradient-to-br from-purple-900 via-purple-700 to-indigo-900';
    }
  };

  return (
    <div className={`w-full h-full flex flex-col items-center justify-center p-4 ${theme.bg} text-white overflow-auto`}>
      <div className="w-full max-w-6xl mx-auto h-full flex flex-col justify-start relative z-20 overflow-auto pb-4 sm:pb-6 pt-20 md:pt-24 lg:pt-28">
      <div className={`${theme.cardBg} border ${theme.border} rounded-xl p-4 sm:p-6 flex-1 max-h-[85vh] sm:max-h-[90vh] overflow-hidden relative z-10`}>
        <div className="text-center mb-4 sm:mb-6">
          <h1 className={`text-2xl sm:text-4xl lg:text-5xl font-headline uppercase tracking-wider mb-2 sm:mb-4 ${theme.accent}`} style={{ WebkitTextStroke: '2px black' }}>
            {theme.title} Betting
          </h1>
          <div className="flex justify-center items-center gap-4 mb-4">
            <div className="text-center">
              <p className="text-sm text-white/70">Your Balance</p>
              <p className={`text-xl font-bold ${theme.accent}`}>{parseFloat(arcBalance || '0').toFixed(2)} ARC</p>
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
                            max={arcBalance || '0'}
                            className="bg-black/20 border-white/20 text-white"
                          />
                          <p className="text-sm text-gray-400 mt-1">
                            Available: {parseFloat(arcBalance || '0').toFixed(2)} ARC
                          </p>
                        </div>
                        
                        {isCreating && (
                          <div className="mb-4 p-4 bg-black/30 rounded-lg border border-white/20">
                            <div className="flex items-center gap-2 mb-2">
                              <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
                              <span className="text-white font-medium">Creating Betting Lobby</span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                              <div 
                                className="bg-gradient-to-r from-yellow-500 to-orange-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${loadingProgress}%` }}
                              ></div>
                            </div>
                            <p className="text-sm text-gray-300">{loadingStep}</p>
                            <p className="text-xs text-gray-400 mt-1">{loadingProgress}% complete</p>
                          </div>
                        )}
                        
                        <Button
                          onClick={handleCreateBettingLobby}
                          disabled={isCreating || parseFloat(betAmount) <= 0 || parseFloat(betAmount) > parseFloat(arcBalance || '0')}
                          className={`w-full ${theme.button} font-headline text-white border-2 border-white/20`}
                        >
                          {isCreating ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Creating...
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
            {filteredLobbies.length === 0 ? (
              <Card className="bg-black/20 border-white/20">
                <CardContent className="p-8 text-center">
                  <Trophy className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold text-white mb-2">No Betting Lobbies</h3>
                  <p className="text-gray-400">Be the first to create a betting lobby!</p>
                </CardContent>
              </Card>
            ) : (
              filteredLobbies.map((lobby) => (
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
                          <div className="flex flex-col items-end gap-2">
                            {isJoining && (
                              <div className="p-3 bg-black/30 rounded-lg border border-white/20 min-w-[200px]">
                                <div className="flex items-center gap-2 mb-2">
                                  <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
                                  <span className="text-white text-sm font-medium">Joining Bet</span>
                                </div>
                                <div className="w-full bg-gray-700 rounded-full h-1.5 mb-1">
                                  <div 
                                    className="bg-gradient-to-r from-blue-500 to-blue-400 h-1.5 rounded-full transition-all duration-300"
                                    style={{ width: `${loadingProgress}%` }}
                                  ></div>
                                </div>
                                <p className="text-xs text-gray-300">{loadingStep}</p>
                              </div>
                             )}
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
                           </div>
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
    </div>
  );
}