"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Users, ArrowLeft, Coins, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { MenuLayout } from '@/components/layout/MenuLayout';
import { useFirebaseMultiplayer } from '@/hooks/use-firebase-multiplayer';
import { useWeb3 } from '@/components/web3/Web3Provider';
import { simpleGambleContract, SimpleGambleManager, SimpleGambleGame, S_FEE, HOUSE_FEE_PERCENT } from '@/lib/simple-gamble';
import { ethers } from 'ethers';

interface SimpleGambleLobbyProps {
  gameType: 'chess' | 'uno';
  onStartGame?: (lobby: SimpleGambleGame, isHost: boolean) => void;
  onBackToMenu?: () => void;
}

type LobbyState = 'setup' | 'waiting_for_player' | 'payment_progress' | 'game_ready';
type PaymentState = 'idle' | 'paying_s' | 'paying_arc' | 'verifying' | 'completed';

export function SimpleGambleLobby({ gameType, onStartGame, onBackToMenu }: SimpleGambleLobbyProps) {
  const [activeTab, setActiveTab] = useState('browse');
  const [betAmount, setBetAmount] = useState('1');
  const [playerBalance, setPlayerBalance] = useState({ s: '0', arc: '0' });
  const [lobbyState, setLobbyState] = useState<LobbyState>('setup');
  const [paymentState, setPaymentState] = useState<PaymentState>('idle');
  const [currentTxHash, setCurrentTxHash] = useState('');
  const [error, setError] = useState('');
  const [gambleLobbies, setGambleLobbies] = useState<SimpleGambleGame[]>([]);
  const [selectedLobby, setSelectedLobby] = useState<SimpleGambleGame | null>(null);
  const [createdGame, setCreatedGame] = useState<SimpleGambleGame | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentProgress, setPaymentProgress] = useState('');
  const [isHost, setIsHost] = useState(false);
  
  const { account, getSigner } = useWeb3();
  const { createLobby, joinLobby, lobbies } = useFirebaseMultiplayer();
  
  const currentUserId = account || `guest-${Date.now()}`;

  // Initialize and get player balance
  useEffect(() => {
    if (account) {
      initializeSimpleGambling();
    }
  }, [account]);

  // Listen for lobby updates
  useEffect(() => {
    const simpleGambleLobbies = lobbies.filter(lobby => 
      (lobby as any).isSimpleGamble === true
    ) as any[];
    
    // Convert Firebase lobbies to SimpleGambleGame format
    const convertedLobbies = simpleGambleLobbies.map(lobby => {
      const game = SimpleGambleManager.getGame(lobby.id);
      return game || {
        id: lobby.id,
        player1: lobby.player1Id,
        player1Name: lobby.player1Name,
        player2: lobby.player2Id,
        player2Name: lobby.player2Name,
        betAmount: lobby.betAmount || '1',
        player1PaidS: false,
        player1PaidARC: false,
        player2PaidS: false,
        player2PaidARC: false,
        totalPot: (parseFloat(lobby.betAmount || '1') * 2).toString(),
        gameCompleted: false,
        payoutSent: false,
        createdAt: lobby.createdAt || Date.now()
      };
    });
    
    setGambleLobbies(convertedLobbies);
  }, [lobbies]);

  // Monitor game state for auto-start
  useEffect(() => {
    if (createdGame && SimpleGambleManager.isGameReady(createdGame.id)) {
      setLobbyState('game_ready');
      setPaymentProgress('Both players paid! Starting game...');
      
      setTimeout(() => {
        if (onStartGame) {
          onStartGame(createdGame, isHost);
        }
      }, 2000);
    }
  }, [createdGame, onStartGame, isHost]);

  const initializeSimpleGambling = async () => {
    try {
      if (!account) return;
      
      const signer = await getSigner();
      if (!signer) return;
      
      await simpleGambleContract.initialize(signer);
      
      const sBalance = await simpleGambleContract.getSBalance(account);
      const arcBalance = await simpleGambleContract.getARCBalance(account);
      
      setPlayerBalance({ s: sBalance, arc: arcBalance });
      
    } catch (error) {
      console.error('❌ [SIMPLE GAMBLE] Initialization failed:', error);
      setError('Failed to initialize gambling system');
    }
  };

  const refreshBalance = async () => {
    if (!account) return;
    
    try {
      const sBalance = await simpleGambleContract.getSBalance(account);
      const arcBalance = await simpleGambleContract.getARCBalance(account);
      setPlayerBalance({ s: sBalance, arc: arcBalance });
    } catch (error) {
      console.error('❌ [SIMPLE GAMBLE] Failed to refresh balance:', error);
    }
  };

  const handleCreateGambleLobby = async () => {
    if (!account) {
      setError('Please connect your wallet');
      return;
    }

    if (parseFloat(betAmount) <= 0) {
      setError('Bet amount must be greater than 0');
      return;
    }

    if (parseFloat(betAmount) > parseFloat(playerBalance.arc)) {
      setError('Insufficient ARC balance for this bet');
      return;
    }

    if (parseFloat(S_FEE) > parseFloat(playerBalance.s)) {
      setError(`Insufficient S balance. Need ${S_FEE} S for fees`);
      return;
    }

    setIsProcessing(true);
    setError('');
    setIsHost(true);
    
    try {
      const lobbyId = `SIMPLE-GAMBLE-${gameType.toUpperCase()}-${Date.now()}`;
      
      // Create game in memory
      const game = SimpleGambleManager.createGame(lobbyId, account, account.slice(0, 8) + '...', betAmount);
      setCreatedGame(game);
      
      // Create Firebase lobby
      const gambleLobbyData = {
        id: lobbyId,
        isSimpleGamble: true,
        betAmount,
        player1Paid: false,
        player2Paid: false
      };
      
      await createLobby(
        gameType,
        account.slice(0, 8) + '...',
        account,
        gambleLobbyData
      );
      
      setLobbyState('waiting_for_player');
      setActiveTab('payment');
      
    } catch (error: any) {
      console.error('❌ [SIMPLE GAMBLE] Failed to create lobby:', error);
      setError(error.message || 'Failed to create gamble lobby');
      setLobbyState('setup');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleJoinGambleLobby = async (lobby: SimpleGambleGame) => {
    if (!account) {
      setError('Please connect your wallet');
      return;
    }

    if (parseFloat(lobby.betAmount) > parseFloat(playerBalance.arc)) {
      setError('Insufficient ARC balance for this bet');
      return;
    }

    if (parseFloat(S_FEE) > parseFloat(playerBalance.s)) {
      setError(`Insufficient S balance. Need ${S_FEE} S for fees`);
      return;
    }

    setSelectedLobby(lobby);
    setIsHost(false);
    setIsProcessing(true);
    setError('');

    try {
      // Join Firebase lobby
      await joinLobby(lobby.id, account.slice(0, 8) + '...', account);
      
      // Join game in memory
      SimpleGambleManager.joinGame(lobby.id, account, account.slice(0, 8) + '...');
      
      setLobbyState('payment_progress');
      setActiveTab('payment');
      
    } catch (error: any) {
      console.error('❌ [SIMPLE GAMBLE] Failed to join lobby:', error);
      setError(error.message || 'Failed to join gamble lobby');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePayment = async () => {
    if (!account) return;
    
    const gameId = createdGame?.id || selectedLobby?.id;
    if (!gameId) return;
    
    setPaymentState('paying_s');
    setPaymentProgress(`Paying ${S_FEE} S fee...`);
    setIsProcessing(true);
    
    try {
      // Step 1: Pay S fee
      const sResult = await simpleGambleContract.paySFee();
      if (!sResult.success) {
        throw new Error(sResult.error || 'S payment failed');
      }
      
      setCurrentTxHash(sResult.txHash);
      SimpleGambleManager.updatePaymentStatus(gameId, account, 'S', sResult.txHash);
      
      // Step 2: Approve ARC
      setPaymentState('paying_arc');
      setPaymentProgress('Approving ARC tokens...');
      
      const betAmount = createdGame?.betAmount || selectedLobby?.betAmount || '1';
      const approveResult = await simpleGambleContract.approveARC(betAmount);
      if (!approveResult.success) {
        throw new Error(approveResult.error || 'ARC approval failed');
      }
      
      if (approveResult.txHash) {
        setCurrentTxHash(approveResult.txHash);
      }
      
      // Step 3: Pay ARC bet
      setPaymentProgress(`Paying ${betAmount} ARC bet...`);
      
      const arcResult = await simpleGambleContract.payARCBet(betAmount);
      if (!arcResult.success) {
        throw new Error(arcResult.error || 'ARC payment failed');
      }
      
      setCurrentTxHash(arcResult.txHash);
      SimpleGambleManager.updatePaymentStatus(gameId, account, 'ARC', arcResult.txHash);
      
      setPaymentState('completed');
      setPaymentProgress('Payment completed! Waiting for other player...');
      
      await refreshBalance();
      
    } catch (error: any) {
      console.error('❌ [SIMPLE GAMBLE] Payment failed:', error);
      setError(error.message || 'Payment failed');
      setPaymentState('idle');
    } finally {
      setIsProcessing(false);
    }
  };

  const renderCreateLobbyTab = () => (
    <TabsContent value="create" className="flex-1 overflow-hidden">
      <Card className="bg-black/50 border-yellow-400/30 h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-400">
            <Plus className="h-5 w-5" />
            Create Simple Gamble Lobby
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Bet Amount (ARC per player)
              </label>
              <Input
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                placeholder="Enter bet amount"
                className="bg-black/30 border-yellow-400/30 text-white"
                min="0.1"
                step="0.1"
              />
            </div>
            
            <div className="bg-yellow-600/20 rounded-lg p-4 border border-yellow-400/30">
              <h3 className="text-yellow-400 font-semibold mb-2">Game Details</h3>
              <div className="space-y-1 text-sm">
                <p className="text-white/70">Each player pays: {betAmount} ARC + {S_FEE} S</p>
                <p className="text-white/70">Total pot: {(parseFloat(betAmount) * 2).toFixed(2)} ARC</p>
                <p className="text-white/70">Winner gets: {((parseFloat(betAmount) * 2) * (100 - HOUSE_FEE_PERCENT) / 100).toFixed(2)} ARC</p>
                <p className="text-white/70">House fee: {HOUSE_FEE_PERCENT}%</p>
              </div>
            </div>
            
            <div className="bg-blue-600/20 rounded-lg p-4 border border-blue-400/30">
              <h3 className="text-blue-400 font-semibold mb-2">Your Balance</h3>
              <div className="space-y-1 text-sm">
                <p className="text-white/70">S: {parseFloat(playerBalance.s).toFixed(4)} S</p>
                <p className="text-white/70">ARC: {parseFloat(playerBalance.arc).toFixed(2)} ARC</p>
              </div>
            </div>
          </div>
          
          {error && (
            <div className="bg-red-600/20 rounded-lg p-3 border border-red-400/30">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
          
          <Button
            onClick={handleCreateGambleLobby}
            disabled={isProcessing || !account}
            className="w-full bg-yellow-600 hover:bg-yellow-500 text-black font-bold"
          >
            {isProcessing ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating Lobby...</>
            ) : (
              `Create Lobby (${betAmount} ARC each)`
            )}
          </Button>
        </CardContent>
      </Card>
    </TabsContent>
  );

  const renderBrowseLobbiesTab = () => (
    <TabsContent value="browse" className="flex-1 overflow-hidden">
      <Card className="bg-black/50 border-yellow-400/30 h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-400">
            <Users className="h-5 w-5" />
            Simple Gamble Lobbies
          </CardTitle>
        </CardHeader>
        <CardContent className="h-full">
          {gambleLobbies.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-white/70 text-lg">No simple gamble lobbies available</p>
              <p className="text-white/50 text-sm mt-2">Create one to start gambling!</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
              {gambleLobbies.map((lobby) => (
                <Card key={lobby.id} className="bg-black/30 border-yellow-400/20">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-white font-semibold">{lobby.player1Name}'s Lobby</h3>
                        <p className="text-yellow-400">Bet: {lobby.betAmount} ARC + {S_FEE} S</p>
                        <p className="text-white/70 text-sm">Total Pot: {lobby.totalPot} ARC</p>
                        <p className="text-white/70 text-sm">Winner Gets: {((parseFloat(lobby.totalPot)) * (100 - HOUSE_FEE_PERCENT) / 100).toFixed(2)} ARC</p>
                      </div>
                      <div className="text-right">
                        {lobby.player1 === currentUserId ? (
                          <div className="text-green-400 text-sm">Your Lobby</div>
                        ) : lobby.player2 ? (
                          <div className="text-blue-400 text-sm">Full</div>
                        ) : (
                          <Button
                            onClick={() => handleJoinGambleLobby(lobby)}
                            disabled={isProcessing}
                            className="bg-yellow-600 hover:bg-yellow-500 text-black font-bold"
                          >
                            {isProcessing && selectedLobby?.id === lobby.id ? (
                              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Joining...</>
                            ) : (
                              `Join & Pay ${lobby.betAmount} ARC`
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  );

  const renderPaymentTab = () => (
    <TabsContent value="payment" className="flex-1 overflow-hidden">
      <Card className="bg-black/50 border-yellow-400/30 h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-400">
            <Coins className="h-5 w-5" />
            Payment Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-4">
            {lobbyState === 'waiting_for_player' && (
              <>
                <div className="animate-pulse">
                  <Users className="w-16 h-16 text-yellow-400 mx-auto" />
                </div>
                <h3 className="text-xl text-white">Lobby Created!</h3>
                <p className="text-white/70">Waiting for second player to join...</p>
                <div className="bg-yellow-600/20 rounded-lg p-4 border border-yellow-400/30">
                  <p className="text-yellow-400 font-semibold">Game ID: {createdGame?.id}</p>
                  <p className="text-white/70 text-sm">Bet Amount: {createdGame?.betAmount} ARC each</p>
                  <p className="text-white/70 text-sm">S Fee: {S_FEE} S each</p>
                </div>
              </>
            )}
            
            {(lobbyState === 'payment_progress' || (lobbyState === 'waiting_for_player' && createdGame?.player2)) && (
              <>
                <div className="bg-blue-600/20 rounded-lg p-4 border border-blue-400/30">
                  <h3 className="text-blue-400 font-semibold mb-2">Payment Required</h3>
                  <div className="space-y-2 text-sm">
                    <p className="text-white/70">S Fee: {S_FEE} S</p>
                    <p className="text-white/70">ARC Bet: {createdGame?.betAmount || selectedLobby?.betAmount} ARC</p>
                  </div>
                </div>
                
                {paymentState === 'idle' && (
                  <Button
                    onClick={handlePayment}
                    disabled={isProcessing}
                    className="w-full bg-green-600 hover:bg-green-500 text-white font-bold"
                  >
                    {isProcessing ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                    ) : (
                      'Pay Now'
                    )}
                  </Button>
                )}
                
                {paymentState !== 'idle' && (
                  <div className="space-y-4">
                    <div className="bg-green-600/20 rounded-lg p-3 border border-green-400/30">
                      <p className="text-green-400 text-sm">{paymentProgress}</p>
                    </div>
                    
                    {currentTxHash && (
                      <div className="text-center">
                        <p className="text-white/70 text-sm">Transaction:</p>
                        <a 
                          href={`https://sonicscan.org/tx/${currentTxHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:underline text-sm break-all"
                        >
                          {currentTxHash}
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
            
            {lobbyState === 'game_ready' && (
              <>
                <CheckCircle className="w-16 h-16 text-green-400 mx-auto" />
                <h3 className="text-xl text-white">Both Players Paid!</h3>
                <p className="text-white/70">Starting UNO Gamble game...</p>
                <div className="animate-pulse bg-green-600/20 rounded-lg p-4 border border-green-400/30">
                  <p className="text-green-400 font-semibold">🎮 Loading Game...</p>
                </div>
              </>
            )}
            
            {error && (
              <div className="bg-red-600/20 rounded-lg p-3 border border-red-400/30">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );

  if (!account) {
    return (
      <MenuLayout>
        <div className="w-full max-w-md mx-auto text-center my-auto">
          <Card className="bg-black/50 border-red-400/30">
            <CardContent className="p-8">
              <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-4">Wallet Required</h3>
              <p className="text-white/70 mb-6">
                Please connect your wallet to participate in UNO gambling.
              </p>
              <Button onClick={onBackToMenu} className="w-full">
                Back to Menu
              </Button>
            </CardContent>
          </Card>
        </div>
      </MenuLayout>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto h-full flex flex-col justify-start relative z-20 overflow-auto pb-2 sm:pb-4">
      <div className="bg-black/50 rounded-xl p-2 sm:p-4 md:p-6 flex-1 max-h-[95vh] overflow-hidden relative z-10">
        <div className="text-center mb-2 sm:mb-4">
          <h1 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-headline uppercase tracking-wider mb-1 sm:mb-2 text-yellow-400" style={{ WebkitTextStroke: '1px black', textShadow: '0 0 20px rgba(255, 255, 0, 0.3)' }}>
            {gameType.toUpperCase()} SIMPLE GAMBLE
          </h1>
          <p className="text-white/70 text-xs sm:text-sm md:text-base">
            Direct wallet payments • No smart contracts • Instant payouts
          </p>
        </div>
        
        <div className="flex items-center justify-between mb-2 sm:mb-4">
          <Button
            onClick={onBackToMenu}
            variant="outline"
            className="border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/10"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Menu
          </Button>
          
          <div className="text-right">
            <p className="text-white/70 text-sm">Balance: {parseFloat(playerBalance.arc).toFixed(2)} ARC</p>
            <p className="text-white/70 text-xs">{parseFloat(playerBalance.s).toFixed(4)} S</p>
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-3 bg-black/30 border border-yellow-400/30">
            <TabsTrigger value="browse" className="data-[state=active]:bg-yellow-400/20 data-[state=active]:text-yellow-400">
              Browse Lobbies
            </TabsTrigger>
            <TabsTrigger value="create" className="data-[state=active]:bg-yellow-400/20 data-[state=active]:text-yellow-400">
              Create Lobby
            </TabsTrigger>
            <TabsTrigger value="payment" className="data-[state=active]:bg-yellow-400/20 data-[state=active]:text-yellow-400">
              Payment
            </TabsTrigger>
          </TabsList>
          
          <div className="flex-1 overflow-hidden mt-4">
            {renderBrowseLobbiesTab()}
            {renderCreateLobbyTab()}
            {renderPaymentTab()}
          </div>
        </Tabs>
      </div>
    </div>
  );
}