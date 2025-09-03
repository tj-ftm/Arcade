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

  // Define handleGameStart before it's used in useEffect
  const handleGameStart = useCallback(async (lobby: Lobby, isHost: boolean) => {
    console.log('🎯 [BETTING LOBBY] Game start triggered:', {
      lobby: lobby,
      isHost: isHost,
      currentUserId: currentUserId
    });
    
    setGameStarting(true);
    
    try {
      if (isHost) {
        console.log('🔥 [BETTING LOBBY] Host updating betting game status:', lobby.id);
        await startBettingGame(lobby.id);
        console.log('✅ [BETTING LOBBY] Betting game status updated');
      } else {
        console.log('👥 [BETTING LOBBY] Non-host player, waiting for host to start game');
      }
      
      // Immediate transition to game for both players
      console.log('🚀 [BETTING LOBBY] Starting betting game immediately for both players');
      if (onStartGame) {
        onStartGame(lobby, isHost);
        console.log('✅ [BETTING LOBBY] onStartGame callback completed successfully');
      }
      
    } catch (error) {
      console.error('🚨 [BETTING LOBBY] Error in handleGameStart:', error);
      toast({
        title: "Game Start Error",
        description: "Failed to start the betting game. Please try again.",
        variant: "destructive"
      });
    }
  }, [currentUserId, startBettingGame, onStartGame, toast]);

  // Filter betting lobbies for current game type
  useEffect(() => {
    const lobbiesForGame = bettingLobbies.filter(
      lobby => lobby.gameType === gameType
    );
    setFilteredLobbies(lobbiesForGame);
  }, [bettingLobbies, gameType]);

  // Handle lobby joined
  useEffect(() => {
    const unsubscribe = onBettingLobbyJoined((lobby) => {
      if (lobby.gameType === gameType) {
        console.log('🎯 [BETTING LOBBY] Joined betting lobby:', lobby);
        
        const isHost = currentUserId === lobby.player1Id;
        const isJoiningPlayer = currentUserId === lobby.player2Id;
        
        console.log('🔍 [BETTING LOBBY] Player role analysis:', {
          isHost: isHost,
          isJoiningPlayer: isJoiningPlayer,
          player1Id: lobby.player1Id,
          player2Id: lobby.player2Id,
          hasPlayer2: !!lobby.player2Id
        });
        
        // Trigger for both host and joining player when lobby has both players and is playing
        if ((isHost || isJoiningPlayer) && lobby.player2Id && lobby.status === 'playing') {
          console.log('🚀 [BETTING LOBBY] Conditions met, starting betting game immediately:', {
            isHost: isHost,
            isJoiningPlayer: isJoiningPlayer,
            hasPlayer2: !!lobby.player2Id,
            status: lobby.status
          });
          handleGameStart(lobby, isHost);
        } else {
          console.log('⏸️ [BETTING LOBBY] Game start conditions not met:', {
            isHost: isHost,
            isJoiningPlayer: isJoiningPlayer,
            hasPlayer2: !!lobby.player2Id,
            status: lobby.status,
            reason: !isHost && !isJoiningPlayer ? 'Not host or joining player' :
                    !lobby.player2Id ? 'No player 2' :
                    lobby.status !== 'playing' ? 'Status not playing' : 'Unknown'
          });
        }
      }
    });
    
    return unsubscribe;
  }, [gameType, onBettingLobbyJoined, currentUserId, handleGameStart]);

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
      const service = await createService();
      setLoadingStep('Checking token allowance...');
      setLoadingProgress(25);
      
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
      const lobby = await createBettingLobby(gameType, currentUserName, currentUserId, betAmount);
      
      setLoadingStep('Creating blockchain bet...');
      setLoadingProgress(85);
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
      
      setGameStarting(true);
      setLoadingStep('Waiting for opponent...');
      setLoadingProgress(100);
      
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
      const service = await createService();
      setLoadingStep('Checking token allowance...');
      setLoadingProgress(30);
      
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
      const joinBetTx = await service.joinBet(lobby.id);
      setLoadingStep('Confirming bet transaction...');
      setLoadingProgress(90);
      await joinBetTx.wait();
      
      setLoadingStep('Joining lobby...');
      setLoadingProgress(95);
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

  return (
    <div className={`w-full h-full flex flex-col items-center justify-center p-4 ${theme.bg} text-white overflow-auto`}>
      <div className="w-full max-w-6xl mx-auto h-full flex flex-col justify-start relative z-20 overflow-auto pb-4 sm:pb-6 pt-20 md:pt-24 lg:pt-28">
        <div className={`${theme.cardBg} border ${theme.border} rounded-xl p-4 sm:p-6 flex-1 min-h-[90vh] sm:min-h-[95vh] overflow-auto relative z-10`}>
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
          
          {gameStarting && loadingStep === 'Waiting for opponent...' ? (
            <div className="flex justify-center items-center h-full">
              <Card className="bg-black/50 border-white/10 w-full max-w-md">
                <CardHeader className="text-center pb-3 sm:pb-4">
                  <CardTitle className="text-lg sm:text-xl lg:text-2xl font-headline uppercase tracking-wider text-white" style={{ WebkitTextStroke: '1px black' }}>
                    Betting Lobby Created
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4 lg:space-y-6 text-center pb-4 sm:pb-6">
                  <div className="space-y-2 sm:space-y-3 lg:space-y-4">
                    <div className="flex items-center justify-center">
                      <Loader2 className="h-10 w-10 sm:h-12 sm:w-12 lg:h-16 lg:w-16 animate-spin text-primary" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-white mb-1 sm:mb-2">
                        Waiting for opponent...
                      </h3>
                      <p className="text-white/70 text-xs sm:text-sm lg:text-base">
                        Another player will join your betting lobby soon
                      </p>
                    </div>
                  </div>

                  <div className="bg-white/10 rounded-lg p-2 sm:p-3 lg:p-4 space-y-1 sm:space-y-2">
                    <p className="text-xs sm:text-sm text-white/70">Bet Amount:</p>
                    <p className="font-mono text-sm sm:text-lg lg:text-xl text-primary">
                      {betAmount} ARC
                    </p>
                  </div>

                  <div className="space-y-1 sm:space-y-2">
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-white/70 justify-center">
                      <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span>Game: {gameType.toUpperCase()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-white/70 justify-center">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span>Status: Waiting for Player 2</span>
                    </div>
                  </div>

                  <Button
                    onClick={() => {
                      setGameStarting(false);
                      setActiveTab('browse');
                    }}
                    variant="outline"
                    className="w-full bg-transparent text-white border-white/50 hover:bg-white/10"
                  >
                    Back to Lobby List
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : (
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
                                className="bg-white/10 border-white/20 text-white"
                                placeholder="Enter bet amount"
                                min="0.1"
                                step="0.1"
                              />
                            </div>
                            <div className="text-sm text-gray-400">
                              <p>Available Balance: {parseFloat(arcBalance || '0').toFixed(2)} ARC</p>
                            </div>
                            <Button
                              onClick={handleCreateBettingLobby}
                              disabled={isCreating || parseFloat(betAmount) <= 0 || parseFloat(arcBalance || '0') < parseFloat(betAmount)}
                              className={`w-full ${theme.button}`}
                            >
                              {isCreating ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Creating...
                                </>
                              ) : (
                                <>
                                  <Plus className="w-4 w-4 mr-2" />
                                  Create Betting Lobby
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
                      <div className="text-center py-12">
                        <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                        <h3 className="text-xl font-semibold text-white mb-2">No Betting Lobbies</h3>
                        <p className="text-gray-400 mb-6">
                          No betting lobbies available for {gameType}. Create one to start playing!
                        </p>
                        <Button
                          onClick={() => setActiveTab('create')}
                          className={theme.button}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Create Betting Lobby
                        </Button>
                      </div>
                    ) : (
                      filteredLobbies.map((lobby) => (
                        <Card key={lobby.id} className="bg-black/20 border-white/20">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-center">
                              <div className="space-y-1">
                                <h3 className="font-semibold text-white">
                                  {lobby.player1Name}'s Lobby
                                </h3>
                                <div className="flex items-center gap-4 text-sm text-gray-400">
                                  <span>Bet: {lobby.betAmount} ARC</span>
                                  <span>Game: {lobby.gameType.toUpperCase()}</span>
                                  <span className="flex items-center gap-1">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    Waiting
                                  </span>
                                </div>
                              </div>
                              {lobby.player1Id !== currentUserId && (
                                <div className="flex gap-2">
                                  <Button
                                    onClick={() => handleJoinBettingLobby(lobby)}
                                    disabled={isJoining || !isConnected || parseFloat(arcBalance || '0') < parseFloat(lobby.betAmount || '0')}
                                    className={theme.button}
                                    size="sm"
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
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}