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
import { ethers } from 'ethers';

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

type LobbyCreationState = 'setup' | 'paying_deployment_fee' | 'verifying_payment' | 'deploying' | 'paying_tokens' | 'creating' | 'completed';
type JoinState = 'idle' | 'paying' | 'waiting' | 'ready';
type DeploymentStep = 'deploying' | 'confirming' | 'initializing' | 'completed';

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
  const [deploymentStep, setDeploymentStep] = useState<DeploymentStep>('deploying');
  const [deploymentProgress, setDeploymentProgress] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [deploymentTxHash, setDeploymentTxHash] = useState<string>('');
  
  const { account, getSigner } = useWeb3();
  const { createLobby, joinLobby, onLobbyJoined, startGame } = useFirebaseMultiplayer();
  
  const currentUserId = account || `guest-${Date.now()}`;

  // Initialize and get player balance
  useEffect(() => {
    if (account) {
      initializeGambling();
    }
  }, [account]);

  // Listen for lobby updates
  useEffect(() => {
    // TODO: Set up Firebase listener for gamble lobbies
    // This would filter lobbies where isGamble === true
  }, []);

  // Periodic balance refresh when on create lobby tab
  useEffect(() => {
    if (activeTab === 'create' && account && creationState === 'setup') {
      const interval = setInterval(() => {
        refreshBalance();
      }, 2000); // Refresh every 2 seconds
      
      return () => clearInterval(interval);
    }
  }, [activeTab, account, creationState]);

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
    if (!account) {
      setError('Please connect your wallet');
      return;
    }

    const signer = await getSigner();
    if (!signer) {
      setError('Failed to get wallet signer');
      return;
    }

    if (parseFloat(betAmount) > parseFloat(playerBalance)) {
      setError('Insufficient ARC balance');
      return;
    }

    setError('');
    setIsProcessing(true);
    const lobbyId = `GAMBLE-${gameType.toUpperCase()}-${Date.now()}`;
    let contractAddress = '';

    try {
      // Step 1: Pay deployment fee to game wallet
      setCreationState('paying_deployment_fee');
      setDeploymentProgress('Paying 0.05 S deployment fee to game wallet...');
      
      await unoGambleContract.initialize(signer, '');
      const deploymentFeeTxHash = await unoGambleContract.payDeploymentFee();
      setDeploymentTxHash(deploymentFeeTxHash);
      setCurrentTxHash(deploymentFeeTxHash);
      
      // Step 2: Verify payment on blockchain
      setCreationState('verifying_payment');
      setDeploymentProgress('Verifying deployment fee payment on blockchain...');
      
      const isPaymentValid = await unoGambleContract.verifyDeploymentPayment(deploymentFeeTxHash, account);
      if (!isPaymentValid) {
        throw new Error('Deployment fee payment verification failed');
      }
      
      // Step 3: Deploy smart contract
      setCreationState('deploying');
      setDeploymentStep('deploying');
      setDeploymentProgress('Deploying UNO Gamble smart contract...');
      
      contractAddress = await unoGambleContract.deployGameContract();
      
      setDeploymentStep('initializing');
      setDeploymentProgress('Initializing contract with game parameters...');
      
      await unoGambleContract.initialize(signer, contractAddress);
      
      // Step 4: Create game in smart contract
      setDeploymentProgress('Creating game in smart contract...');
      
      const gameResult = await unoGambleContract.createGame(
        lobbyId,
        account,
        '', // Player 2 will be set when someone joins
        betAmount
      );
      
      setCurrentTxHash(gameResult.txHash);
      
      // Step 5: Pay ARC tokens to deployed contract
      setCreationState('paying_tokens');
      setDeploymentProgress('Approving ARC tokens for transfer...');
      
      const approvalTx = await unoGambleContract.approveTokens(betAmount);
      if (approvalTx) {
        setCurrentTxHash(approvalTx);
      }
      
      setDeploymentProgress('Paying ARC bet to deployed contract...');
      
      // Pay the bet through the smart contract
      const paymentResult = await unoGambleContract.payBet(lobbyId);
      
      if (!paymentResult.success) {
        throw new Error('ARC payment failed');
      }
      
      setCurrentTxHash(paymentResult.txHash);
      
      // Step 6: Create Firebase Lobby
      setCreationState('creating');
      setDeploymentProgress('Creating lobby and waiting for players...');
      
      const gambleLobbyData = {
        id: lobbyId,
        isGamble: true,
        betAmount,
        contractAddress,
        player1Paid: true,
        player2Paid: false,
        contractDeployed: true,
        player1TxHash: gameResult.txHash
      };
      
      const lobby = await createLobby(
        gameType,
        account.slice(0, 8) + '...',
        account,
        gambleLobbyData
      );
      
      setCreationState('completed');
      setDeploymentStep('completed');
      setDeploymentProgress('Lobby created successfully! Waiting for players...');
      
      // Refresh balance after successful payment
      await refreshBalance();
      
    } catch (error: any) {
      console.error('❌ [GAMBLE LOBBY] Failed to create gamble lobby:', error);
      setError(error.message || 'Failed to create gamble lobby');
      setCreationState('setup');
      setDeploymentStep('deploying');
      setDeploymentProgress('');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleJoinGambleLobby = async (lobby: GambleLobby) => {
    if (!account) {
      setError('Please connect your wallet');
      return;
    }

    const signer = await getSigner();
    if (!signer) {
      setError('Failed to get wallet signer');
      return;
    }

    if (parseFloat(lobby.betAmount) > parseFloat(playerBalance)) {
      setError('Insufficient ARC balance for this bet');
      return;
    }

    setSelectedLobby(lobby);
    setJoinState('paying');
    setError('');
    setIsProcessing(true);

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
    } finally {
      setIsProcessing(false);
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
                <label className="block text-white mb-1 sm:mb-2 font-semibold text-sm sm:text-base">Bet Amount (ARC)</label>
                <div className="flex gap-1 sm:gap-2">
                  <Input
                    type="number"
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    min="0.1"
                    step="0.1"
                    className="bg-black/30 border-yellow-400/30 text-white text-sm sm:text-base md:text-lg flex-1"
                    placeholder="Enter bet amount"
                  />
                  <Button
                    onClick={refreshBalance}
                    variant="outline"
                    size="sm"
                    className="border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/10 px-2 sm:px-3"
                    title="Refresh ARC Balance"
                  >
                    🔄
                  </Button>
                </div>
              </div>
              
              <div className="bg-yellow-600/20 rounded-lg p-2 sm:p-3 md:p-4 border border-yellow-400/30">
                <h3 className="text-yellow-400 font-semibold mb-1 sm:mb-2 text-sm sm:text-base">Gambling Details</h3>
                <div className="text-xs sm:text-sm text-white/80 space-y-0.5 sm:space-y-1">
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
                disabled={isProcessing || !account || parseFloat(betAmount) > parseFloat(playerBalance) || parseFloat(betAmount) <= 0}
                className="w-full bg-yellow-600 hover:bg-yellow-500 text-black font-bold text-sm sm:text-base md:text-lg py-3 sm:py-4 md:py-6"
              >
                <span className="hidden sm:inline">Create Gamble Lobby & Pay {betAmount} ARC</span>
                <span className="sm:hidden">Create & Pay {betAmount} ARC</span>
              </Button>
            </>
          )}
          
          {(creationState === 'paying_deployment_fee' || creationState === 'verifying_payment' || creationState === 'deploying' || creationState === 'paying_tokens') && (
            <div className="text-center py-6 sm:py-8">
              <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin mx-auto mb-3 sm:mb-4 text-yellow-400" />
              
              {/* Deployment Progress */}
              <div className="mb-4 sm:mb-6">
                 <h3 className="text-white font-semibold mb-2 text-sm sm:text-base">
                   {creationState === 'paying_deployment_fee' && 'Paying Deployment Fee'}
                   {creationState === 'verifying_payment' && 'Verifying Payment'}
                   {creationState === 'deploying' && 'Deploying Smart Contract'}
                   {creationState === 'paying_tokens' && 'Transferring ARC Tokens'}
                 </h3>
                 
                 {/* Progress Steps */}
                 <div className="flex justify-center items-center space-x-1 sm:space-x-2 mb-3 sm:mb-4">
                   <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${
                     creationState === 'paying_deployment_fee' ? 'bg-yellow-400 animate-pulse' : 
                     (creationState === 'verifying_payment' || creationState === 'deploying' || creationState === 'paying_tokens') ? 'bg-green-400' : 'bg-white/30'
                   }`} />
                   <div className="w-2 sm:w-4 h-0.5 bg-white/30" />
                   <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${
                     creationState === 'verifying_payment' ? 'bg-yellow-400 animate-pulse' : 
                     (creationState === 'deploying' || creationState === 'paying_tokens') ? 'bg-green-400' : 'bg-white/30'
                   }`} />
                   <div className="w-2 sm:w-4 h-0.5 bg-white/30" />
                   <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${
                     creationState === 'deploying' ? 'bg-yellow-400 animate-pulse' : 
                     creationState === 'paying_tokens' ? 'bg-green-400' : 'bg-white/30'
                   }`} />
                   <div className="w-2 sm:w-4 h-0.5 bg-white/30" />
                   <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${
                     creationState === 'paying_tokens' ? 'bg-yellow-400 animate-pulse' : 'bg-white/30'
                   }`} />
                 </div>
                 
                 {/* Deployment Progress */}
                  {deploymentProgress && (
                    <p className="text-white/80 text-xs sm:text-sm mb-2">{deploymentProgress}</p>
                  )}
              </div>
              
              {/* Transaction Details */}
              {currentTxHash && (
                <div className="bg-black/30 rounded-lg p-2 sm:p-3 border border-yellow-400/30">
                  <p className="text-yellow-400 font-semibold text-xs sm:text-sm mb-1">Current Transaction:</p>
                  <p className="text-white/70 text-xs break-all">
                    {currentTxHash.slice(0, 10)}...{currentTxHash.slice(-8)}
                  </p>
                  <a 
                    href={`https://sonicscan.org/tx/${currentTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-yellow-400 hover:text-yellow-300 text-xs underline mt-1 inline-block"
                  >
                    View on Sonic Explorer
                  </a>
                </div>
              )}
              
              {/* Step Details */}
              <div className="mt-3 sm:mt-4 text-xs sm:text-sm text-white/60">
                {creationState === 'paying_deployment_fee' && (
                  <p>Paying 0.05 S deployment fee to game wallet...</p>
                )}
                {creationState === 'verifying_payment' && (
                  <p>Verifying deployment fee payment on blockchain...</p>
                )}
                {creationState === 'deploying' && (
                  <p>Deploying a new smart contract for this game...</p>
                )}
                {creationState === 'paying_tokens' && (
                  <p>Transferring {betAmount} ARC tokens to contract...</p>
                )}
              </div>
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
    <div className="w-full max-w-6xl mx-auto h-full flex flex-col justify-start relative z-20 overflow-auto pb-2 sm:pb-4">
      <div className="bg-black/50 rounded-xl p-2 sm:p-4 md:p-6 flex-1 max-h-[95vh] overflow-hidden relative z-10">
        <div className="text-center mb-2 sm:mb-4">
          <h1 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-headline uppercase tracking-wider mb-1 sm:mb-2 text-yellow-400" style={{ WebkitTextStroke: '1px black', textShadow: '0 0 20px rgba(255, 255, 0, 0.3)' }}>
            {gameType.toUpperCase()} GAMBLE
          </h1>
          <p className="text-white/70 text-sm sm:text-base md:text-lg">High-stakes gaming with ARC tokens</p>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col">
          <div className="flex justify-center items-center mb-2 sm:mb-3">
            <TabsList className="grid w-full max-w-md grid-cols-2 bg-white/10">
              <TabsTrigger 
                value="browse" 
                className="data-[state=active]:bg-yellow-600 data-[state=active]:text-black text-xs sm:text-sm md:text-base py-1 sm:py-2"
              >
                <Users className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Browse Lobbies</span>
                <span className="sm:hidden">Browse</span>
              </TabsTrigger>
              <TabsTrigger 
                value="create"
                className="data-[state=active]:bg-yellow-600 data-[state=active]:text-black text-xs sm:text-sm md:text-base py-1 sm:py-2"
              >
                <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Create Lobby</span>
                <span className="sm:hidden">Create</span>
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