"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Users, ArrowLeft, Coins, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { MenuLayout } from '@/components/layout/MenuLayout';
import { useFirebaseMultiplayer } from '@/hooks/use-firebase-multiplayer';
import { useWeb3 } from '@/components/web3/Web3Provider';
import { unoGambleContract, UnoGambleContract } from '@/lib/uno-gamble';

interface GambleLobby {
  id: string;
  gameType: 'chess' | 'uno';
  player1Id: string;
  player1Name: string;
  player2Id?: string;
  player2Name?: string;
  status: 'waiting' | 'playing' | 'finished';
  createdAt: any;
  // Gambling specific properties
  isGamble: boolean;
  betAmount: string;
  contractAddress?: string;
  player1Paid: boolean;
  player2Paid: boolean;
  contractDeployed: boolean;
  player1TxHash?: string;
  player2TxHash?: string;
}

interface GambleLobbyProps {
  gameType: 'chess' | 'uno';
  onStartGame?: (lobby: GambleLobby, isHost: boolean) => void;
  onBackToMenu?: () => void;
}

type LobbyCreationState = 'setup' | 'paying' | 'creating' | 'completed';
type JoinState = 'idle' | 'paying' | 'waiting' | 'ready';

export function GambleLobby({ gameType, onStartGame, onBackToMenu }: GambleLobbyProps) {
  const [activeTab, setActiveTab] = useState('browse');
  const [betAmount, setBetAmount] = useState('1');
  const [playerBalance, setPlayerBalance] = useState('0');
  const [creationState, setCreationState] = useState<LobbyCreationState>('setup');
  const [joinState, setJoinState] = useState<JoinState>('idle');
  const [currentTxHash, setCurrentTxHash] = useState('');
  const [error, setError] = useState('');
  const [gambleLobbies, setGambleLobbies] = useState<GambleLobby[]>([]);
  const [selectedLobby, setSelectedLobby] = useState<GambleLobby | null>(null);
  
  const { account, signer } = useWeb3();
  const { createLobby, joinLobby, onLobbyJoined, startGame } = useFirebaseMultiplayer();
  
  const currentUserId = account || `guest-${Date.now()}`;

  // Initialize and get player balance
  useEffect(() => {
    if (account && signer) {
      initializeGambling();
    }
  }, [account, signer]);

  // Listen for lobby updates
  useEffect(() => {
    // TODO: Set up Firebase listener for gamble lobbies
    // This would filter lobbies where isGamble === true
  }, []);

  const initializeGambling = async () => {
    try {
      if (!account) return;
      
      const balance = await UnoGambleContract.getPlayerBalanceStatic(account);
      setPlayerBalance(balance);
      
    } catch (error) {
      console.error('❌ [GAMBLE LOBBY] Initialization failed:', error);
      setError('Failed to initialize gambling system');
    }
  };
  
  const refreshBalance = async () => {
    if (!account) return;
    
    try {
      const balance = await UnoGambleContract.getPlayerBalanceStatic(account);
      setPlayerBalance(balance);
    } catch (error) {
      console.error('❌ [GAMBLE LOBBY] Balance refresh failed:', error);
    }
  };

  const handleCreateGambleLobby = async () => {
    if (!account || !signer) {
      setError('Please connect your wallet');
      return;
    }

    if (parseFloat(betAmount) > parseFloat(playerBalance)) {
      setError('Insufficient ARC balance');
      return;
    }

    setCreationState('paying');
    setError('');

    try {
      // Deploy contract first
      const contractAddress = await unoGambleContract.deployGameContract();
      await unoGambleContract.initialize(signer, contractAddress);
      
      // Create temporary lobby ID
      const lobbyId = `GAMBLE-${gameType.toUpperCase()}-${Date.now()}`;
      
      // Create the gambling game in smart contract (includes 0.05 S gas fee)
      const gameResult = await unoGambleContract.createGame(
        lobbyId,
        account,
        '', // Player 2 will be set when someone joins
        betAmount
      );
      
      setCurrentTxHash(gameResult.txHash);
      
      // Approve and pay the bet (ARC tokens)
      const approvalTx = await unoGambleContract.approveTokens(betAmount);
      if (approvalTx) {
        setCurrentTxHash(approvalTx);
      }
      
      const paymentResult = await unoGambleContract.payBet(lobbyId);
      
      if (!paymentResult.success) {
        throw new Error('Payment failed');
      }
      
      setCreationState('creating');
      
      // Create Firebase lobby with gambling properties
      const gambleLobbyData = {
        id: lobbyId,
        isGamble: true,
        betAmount,
        contractAddress,
        player1Paid: true,
        player2Paid: false,
        contractDeployed: true,
        player1TxHash: paymentResult.txHash
      };
      
      const lobby = await createLobby(
        gameType,
        account.slice(0, 8) + '...',
        account,
        gambleLobbyData
      );
      
      setCreationState('completed');
      
      // Refresh balance after successful payment
      await refreshBalance();
      
    } catch (error: any) {
      console.error('❌ [GAMBLE LOBBY] Failed to create gamble lobby:', error);
      setError(error.message || 'Failed to create gamble lobby');
      setCreationState('setup');
    }
  };

  const handleJoinGambleLobby = async (lobby: GambleLobby) => {
    if (!account || !signer) {
      setError('Please connect your wallet');
      return;
    }

    if (parseFloat(lobby.betAmount) > parseFloat(playerBalance)) {
      setError('Insufficient ARC balance for this bet');
      return;
    }

    setSelectedLobby(lobby);
    setJoinState('paying');
    setError('');

    try {
      // Initialize contract with the lobby's contract address
      if (lobby.contractAddress) {
        await unoGambleContract.initialize(signer, lobby.contractAddress);
      }
      
      // Approve and pay the bet
      const approvalTx = await unoGambleContract.approveTokens(lobby.betAmount);
      if (approvalTx) {
        setCurrentTxHash(approvalTx);
      }
      
      const paymentResult = await unoGambleContract.payBet(lobby.id);
      
      if (!paymentResult.success) {
        throw new Error('Payment failed');
      }
      
      setCurrentTxHash(paymentResult.txHash);
      setJoinState('waiting');
      
      // Join the Firebase lobby
      await joinLobby(lobby.id, account.slice(0, 8) + '...', account);
      
      setJoinState('ready');
      
      // Refresh balance after successful payment
      await refreshBalance();
      
      // Check if both players have paid and start the game
      const isGameReady = await unoGambleContract.isGameReady(lobby.id);
      if (isGameReady && onStartGame) {
        onStartGame(lobby, false); // false = not host
      }
      
    } catch (error: any) {
      console.error('❌ [GAMBLE LOBBY] Failed to join gamble lobby:', error);
      setError(error.message || 'Failed to join gamble lobby');
      setJoinState('idle');
    }
  };

  const renderCreateLobbyTab = () => (
    <TabsContent value="create" className="flex-1 overflow-hidden">
      <Card className="bg-black/50 border-yellow-400/30 h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-400">
            <Coins className="h-5 w-5" />
            Create Gamble Lobby
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {creationState === 'setup' && (
            <>
              <div>
                <label className="block text-white mb-2 font-semibold">Bet Amount (ARC)</label>
                <Input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  min="0.1"
                  step="0.1"
                  className="bg-black/30 border-yellow-400/30 text-white text-lg"
                  placeholder="Enter bet amount"
                />
              </div>
              
              <div className="bg-yellow-600/20 rounded-lg p-4 border border-yellow-400/30">
                <h3 className="text-yellow-400 font-semibold mb-2">Gambling Details</h3>
                <div className="text-sm text-white/80 space-y-1">
                  <p>• Your ARC Balance: <span className="font-bold text-yellow-300">{playerBalance} ARC</span></p>
                  <p>• Total Pot: {(parseFloat(betAmount) * 2).toFixed(2)} ARC</p>
                  <p>• Winner Gets: {((parseFloat(betAmount) * 2) * 0.95).toFixed(2)} ARC (after 5% house fee)</p>
                  <p>• Gas Fee: 0.05 S (paid by lobby creator)</p>
                </div>
              </div>
              
              {parseFloat(betAmount) > parseFloat(playerBalance) && (
                <div className="text-red-400 text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Insufficient ARC balance
                </div>
              )}
              
              <Button
                onClick={handleCreateGambleLobby}
                disabled={!account || parseFloat(betAmount) > parseFloat(playerBalance) || parseFloat(betAmount) <= 0}
                className="w-full bg-yellow-600 hover:bg-yellow-500 text-black font-bold text-lg py-6"
              >
                Create Gamble Lobby & Pay {betAmount} ARC
              </Button>
            </>
          )}
          
          {creationState === 'paying' && (
            <div className="text-center space-y-4">
              <Loader2 className="w-16 h-16 text-yellow-400 mx-auto animate-spin" />
              <h3 className="text-xl text-white">Processing Payment...</h3>
              <p className="text-white/70">Please confirm the transaction in your wallet</p>
              {currentTxHash && (
                <div>
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
          
          {creationState === 'creating' && (
            <div className="text-center space-y-4">
              <Loader2 className="w-16 h-16 text-yellow-400 mx-auto animate-spin" />
              <h3 className="text-xl text-white">Creating Lobby...</h3>
              <p className="text-white/70">Setting up your gamble lobby</p>
            </div>
          )}
          
          {creationState === 'completed' && (
            <div className="text-center space-y-4">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto" />
              <h3 className="text-xl text-white">Lobby Created!</h3>
              <p className="text-white/70">Waiting for another player to join...</p>
              <Button
                onClick={() => setActiveTab('browse')}
                className="bg-green-600 hover:bg-green-500 text-white"
              >
                View Lobby
              </Button>
            </div>
          )}
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
            Gamble Lobbies
          </CardTitle>
        </CardHeader>
        <CardContent>
          {gambleLobbies.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-white/70 text-lg">No gamble lobbies available</p>
              <p className="text-white/50 text-sm mt-2">Create one to start gambling!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {gambleLobbies.map((lobby) => (
                <Card key={lobby.id} className="bg-black/30 border-yellow-400/20">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-white font-semibold">{lobby.player1Name}'s Lobby</h3>
                        <p className="text-yellow-400">Bet: {lobby.betAmount} ARC</p>
                        <p className="text-white/70 text-sm">Pot: {(parseFloat(lobby.betAmount) * 2).toFixed(2)} ARC</p>
                      </div>
                      <div className="text-right">
                        {lobby.player1Id === currentUserId ? (
                          <div className="text-green-400 text-sm">Your Lobby</div>
                        ) : (
                          <Button
                            onClick={() => handleJoinGambleLobby(lobby)}
                            disabled={joinState === 'paying' || joinState === 'waiting'}
                            className="bg-yellow-600 hover:bg-yellow-500 text-black font-bold"
                          >
                            {joinState === 'paying' && selectedLobby?.id === lobby.id ? (
                              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Paying...</>
                            ) : joinState === 'waiting' && selectedLobby?.id === lobby.id ? (
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
    <div className="w-full max-w-6xl mx-auto h-full flex flex-col justify-start relative z-20 overflow-auto pb-4 sm:pb-6">
      <div className="bg-black/50 rounded-xl p-4 sm:p-6 flex-1 max-h-[85vh] sm:max-h-[90vh] overflow-hidden relative z-10">
        <div className="text-center mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-headline uppercase tracking-wider mb-2 sm:mb-4 text-yellow-400" style={{ WebkitTextStroke: '1px black', textShadow: '0 0 20px rgba(255, 255, 0, 0.3)' }}>
            {gameType.toUpperCase()} GAMBLE
          </h1>
          <p className="text-white/70 text-lg">High-stakes gaming with ARC tokens</p>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col">
          <div className="flex justify-center items-center mb-3 sm:mb-4">
            <TabsList className="grid w-full max-w-md grid-cols-2 bg-white/10">
              <TabsTrigger 
                value="browse" 
                className="data-[state=active]:bg-yellow-600 data-[state=active]:text-black text-sm sm:text-base"
              >
                <Users className="h-4 w-4 mr-2" />
                Browse Lobbies
              </TabsTrigger>
              <TabsTrigger 
                value="create"
                className="data-[state=active]:bg-yellow-600 data-[state=active]:text-black text-sm sm:text-base"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Lobby
              </TabsTrigger>
            </TabsList>
          </div>
          
          <div className="flex-1 overflow-hidden">
            {renderBrowseLobbiesTab()}
            {renderCreateLobbyTab()}
          </div>
        </Tabs>
        
        {error && (
          <Card className="mt-4 bg-red-900/50 border-red-400/30">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-red-400">
                <AlertCircle className="h-5 w-5" />
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        )}
        
        <div className="flex justify-center mt-4">
          <Button onClick={onBackToMenu} variant="outline" className="border-white/30 text-white hover:bg-white/10">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Menu
          </Button>
        </div>
      </div>
    </div>
  );
}