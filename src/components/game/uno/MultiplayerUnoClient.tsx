"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import type { UnoGameState, Player, UnoCard, UnoColor, UnoValue } from '@/types';
import { Button } from '@/components/ui/button';
import { RefreshCw, PanelLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFirebaseMultiplayer } from '@/hooks/use-firebase-multiplayer';
import { useWeb3 } from '@/components/web3/Web3Provider';
import { UnoEndGameScreen } from '../UnoEndGameScreen';
import { logGameCompletion, createGameResult, isValidWalletAddress } from '@/lib/game-logger';
import { verifyPayment, sendBonusPayment, getBonusReward, PaymentVerificationResult } from '@/lib/payment-verification';

interface Lobby {
  id: string;
  gameType: 'chess' | 'uno';
  player1Id: string;
  player1Name: string;
  player2Id?: string;
  player2Name?: string;
  status: 'waiting' | 'playing' | 'finished';
  createdAt: any; // Firebase timestamp
}

interface MultiplayerUnoClientProps {
  lobby: Lobby;
  isHost: boolean;
  onGameEnd: () => void;
}

const colors: UnoColor[] = ['Red', 'Green', 'Blue', 'Yellow'];
const values: UnoValue[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'Skip', 'Reverse', 'Draw Two'];

const createDeck = (): UnoCard[] => {
  const deck: UnoCard[] = [];
  for (const color of colors) {
    deck.push({ color, value: '0' });
    for (let i = 0; i < 2; i++) {
      for (const value of values.slice(1)) {
        deck.push({ color, value });
      }
    }
  }
  for (let i = 0; i < 4; i++) {
    deck.push({ color: 'Wild', value: 'Wild' });
    deck.push({ color: 'Wild', value: 'Draw Four' });
  }
  return deck;
};

const shuffleDeck = (deck: UnoCard[]): UnoCard[] => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const calculateUnoScore = (hand: UnoCard[]): number => {
  return hand.reduce((score, card) => {
    switch (card.value) {
      case 'Draw Two':
      case 'Reverse':
      case 'Skip':
        return score + 20;
      case 'Wild':
      case 'Draw Four':
        return score + 50;
      default:
        return score + parseInt(card.value, 10) || 0;
    }
  }, 0);
};

const CardComponent = ({ card, isPlayer, onClick, isPlayable, isLastCard, style, size = 'normal' }: { card: UnoCard, isPlayer: boolean, onClick?: (e: React.MouseEvent) => void, isPlayable: boolean, isLastCard?: boolean, style?: React.CSSProperties, size?: 'normal' | 'large' }) => {
  const colorClasses: Record<UnoColor | 'Wild', string> = {
    Red: 'bg-red-600',
    Green: 'bg-green-600',
    Blue: 'bg-blue-600',
    Yellow: 'bg-yellow-500',
    Wild: 'bg-black',
  };

  const sizeClasses = {
      normal: 'w-[18vw] max-w-[100px] md:max-w-[90px] min-w-[60px] md:min-w-[60px] h-auto aspect-[5/7]', // Increased mobile size
      large: 'w-[22vw] max-w-[130px] md:max-w-[120px] min-w-[80px] md:min-w-[80px] h-auto aspect-[5/7]', // Increased mobile size
  }

  const cardStyle = {
    ...style,
    transition: 'all 0.3s ease',
    boxShadow: isPlayable && isPlayer ? '0 0 25px 8px #fbbf24, 0 0 10px 2px #fff' : '0 4px 6px rgba(0,0,0,0.3)',
  };

  const InnerContent = () => {
    if (card.value === 'Wild' || card.value === 'Draw Four') {
      return (
        <div className="relative w-full h-full flex items-center justify-center">
          <div className="absolute w-1/2 h-1/2 bg-red-600 top-0 left-0"></div>
          <div className="absolute w-1/2 h-1/2 bg-green-600 top-0 right-0"></div>
          <div className="absolute w-1/2 h-1/2 bg-blue-600 bottom-0 left-0"></div>
          <div className="absolute w-1/2 h-1/2 bg-yellow-500 bottom-0 right-0"></div>
          <span className="relative text-white font-bold text-sm md:text-lg drop-shadow-lg">{card.value === 'Draw Four' ? '+4' : ''}</span>
        </div>
      );
    }
    const text = card.value === 'Draw Two' ? '+2' : card.value === 'Skip' ? '⊘' : card.value === 'Reverse' ? '⟷' : card.value;
    const textSize = size === 'large' ? 'text-3xl md:text-5xl lg:text-6xl' : 'text-2xl md:text-4xl lg:text-5xl';
    const cornerTextSize = size === 'large' ? 'text-lg md:text-xl lg:text-2xl' : 'text-base md:text-lg lg:text-xl';

    return (
      <>
        <div className={cn("absolute top-0.5 left-1 md:top-1 md:left-2 font-bold", cornerTextSize)}>{text}</div>
        <div className={cn("font-bold drop-shadow-md", textSize)}>{text}</div>
        <div className={cn("absolute bottom-0.5 right-1 md:bottom-1 md:right-2 font-bold transform rotate-180", cornerTextSize)}>{text}</div>
      </>
    )
  }

  return (
    <div
      className={cn(
        "rounded-lg flex items-center justify-center text-white relative border-2 md:border-4 border-white/80",
        onClick ? "cursor-pointer" : "cursor-default",
        colorClasses[card.color],
        sizeClasses[size],
         "transition-transform duration-300 ease-out",
        isPlayer && "hover:-translate-y-4 hover:scale-110 z-0 hover:z-20"
      )}
      style={cardStyle}
      onClick={isPlayable && isPlayer ? onClick : undefined}
    >
      <div className="absolute inset-0 w-full h-full bg-black/20 rounded-md"></div>
       <div className={cn("absolute rounded-full bg-white/20 w-10 h-10 md:w-14 md:h-14", size === 'large' ? "lg:w-20 lg:h-20" : "lg:w-16 lg:h-16")}></div>
      <div className="relative z-10 flex flex-col items-center justify-center w-full h-full">
        <InnerContent />
      </div>
      {isLastCard && <div className="absolute -top-3 -left-3 px-2 py-1 bg-yellow-400 text-black text-xs font-bold rounded-full animate-pulse">UNO!</div>}
    </div>
  );
};

const CardBack = ({ style, size = 'normal' }: { style?: React.CSSProperties, size?: 'normal' | 'large' }) => {
    const sizeClasses = {
      normal: 'w-[12vw] max-w-[60px] md:max-w-[80px] min-w-[35px] md:min-w-[55px] h-auto aspect-[5/7]',
      large: 'w-[15vw] max-w-[80px] md:max-w-[110px] min-w-[45px] md:min-w-[75px] h-auto aspect-[5/7]',
    }
    const logoSize = size === 'large' ? 'text-lg md:text-3xl lg:text-6xl' : 'text-sm md:text-2xl lg:text-5xl';
    return (
        <div className={cn("rounded-lg flex items-center justify-center text-white relative border-2 md:border-4 border-white/80 bg-neutral-800", sizeClasses[size])} style={style}>
             <div className="absolute inset-0 w-full h-full bg-black/20 rounded-md"></div>
            <h1 className={cn("text-red-600 font-headline", logoSize)} style={{textShadow: '2px 2px 0 #000'}}>UNO</h1>
        </div>
    );
};

type FlyingCard = {
  card: UnoCard;
  startRect: DOMRect;
};

export const MultiplayerUnoClient = ({ lobby, isHost, onGameEnd }: MultiplayerUnoClientProps) => {
    const { username, account } = useWeb3();
    const [gameState, setGameState] = useState<UnoGameState | null>(null);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [flyingCard, setFlyingCard] = useState<FlyingCard | null>(null);
    const [turnMessage, setTurnMessage] = useState<string | null>(null);
    const [isLogVisible, setIsLogVisible] = useState(false);
    const [gameStartTime, setGameStartTime] = useState<number>(0);
    const [isLoggingGame, setIsLoggingGame] = useState(false);
    const [isLoadingGame, setIsLoadingGame] = useState(true);

    const [mintTxHash, setMintTxHash] = useState<string>('');
    const [showEndGameScreen, setShowEndGameScreen] = useState(false);
    const [isMinting, setIsMinting] = useState(false);
    const [tokensEarned, setTokensEarned] = useState(0);
    const [hasWon, setHasWon] = useState<boolean>(false);
    const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

    // Handle window resize for responsive card spacing
    useEffect(() => {
        const handleResize = () => {
            setWindowWidth(window.innerWidth);
        };
        
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const playerHandRef = useRef<HTMLDivElement>(null);
    
    // Firebase multiplayer hooks
    const { sendGameMove, onGameMove, startGame, setupGameMovesListener } = useFirebaseMultiplayer();

    const isCardPlayable = (card: UnoCard, topCard: UnoCard, activeColor: UnoColor): boolean => {
        if (card.color === 'Wild') return true;
        if (card.color === activeColor) return true;
        if (card.value === topCard.value) return true;
        return false;
    };
    
    useEffect(() => {
        if (turnMessage) {
            const timer = setTimeout(() => {
                setTurnMessage(null);
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [turnMessage]);

    // Set up game moves listener for this lobby
    useEffect(() => {
        console.log('🔗 [UNO MULTIPLAYER] Setting up game moves listener for lobby:', lobby.id);
        setupGameMovesListener(lobby.id);
    }, [lobby.id, setupGameMovesListener]);

    // Initialize game - always try to initialize for both players
    useEffect(() => {
        const conditions = {
             player2Id: lobby.player2Id,
             status: lobby.status,
             hasGameState: !!gameState,
             isHost: isHost,
             lobbyObject: lobby
         };
         console.log('🔍 [UNO MULTIPLAYER] Checking initialization conditions:', JSON.stringify(conditions, null, 2));
         console.log('🔍 [UNO MULTIPLAYER] Full lobby object received:', lobby);
         
        if (!gameState) {
            console.log('🎮 [UNO MULTIPLAYER] No game state found, initializing game for both players');
            
            // Add a delay to ensure Firebase listeners are set up
            setTimeout(() => {
                // Check if game state still doesn't exist (no one else initialized it)
                if (!gameState) {
                    console.log('🎮 [UNO MULTIPLAYER] Initializing game now');
                    initializeGame();
                } else {
                    console.log('🎮 [UNO MULTIPLAYER] Game state already exists, skipping initialization');
                }
            }, 1000); // 1 second delay
        } else {
            console.log('✅ [UNO MULTIPLAYER] Game state already exists');
        }
    }, [gameState, isHost]);

    // Handle loading state - always show game interface
    useEffect(() => {
        console.log('🎮 [UNO MULTIPLAYER] Always showing game interface, initialization will happen in background');
        setIsLoadingGame(false); // Always show game interface
    }, []);

    const initializeGame = () => {
        const deck = shuffleDeck(createDeck());
        const player1Hand = deck.splice(0, 7);
        const player2Hand = deck.splice(0, 7);
        const topCard = deck.splice(0, 1)[0];
        
        // Ensure starting card is not a wild card
        while (topCard.color === 'Wild') {
            deck.push(topCard);
            const newTopCard = deck.splice(0, 1)[0];
            if (newTopCard) {
                topCard.color = newTopCard.color;
                topCard.value = newTopCard.value;
            }
        }

        // Ensure proper player assignment: lobby creator = player1, joiner = player2
        const player1 = {
            id: lobby.player1Id,
            name: lobby.player1Name,
            hand: player1Hand,
            handSize: player1Hand.length
        };
        
        const player2 = {
            id: lobby.player2Id || 'player2',
            name: lobby.player2Name || 'Player 2',
            hand: player2Hand,
            handSize: player2Hand.length
        };
        
        console.log('🎮 [UNO MULTIPLAYER] Player assignment - Player1 (creator):', player1.id, player1.name, '| Player2 (joiner):', player2.id, player2.name);

        const initialGameState: UnoGameState = {
            players: [player1, player2],
            playerHand: player1Hand,
            deck: deck,
            discardPile: [topCard],
            activePlayerIndex: 0,
            activeColor: topCard.color,
            winner: null,
            isReversed: false,
            direction: 'clockwise',
            gameLog: ['Game started!']
        };

        setGameState(initialGameState);
        setGameStartTime(Date.now());
        
        // Send initial game state to opponent
        sendGameMove(lobby.id, {
            type: 'uno-init',
            gameState: initialGameState
        });
        console.log('🚀 [UNO MULTIPLAYER] Game initialized and sent to opponent (player2Id:', lobby.player2Id || 'missing', ')');
    };

    // Listen for game state updates from opponent
    useEffect(() => {
        const unsubscribe = onGameMove((moveData: any) => {
            console.log('📨 [UNO MULTIPLAYER] Received move data:', moveData);
            if (moveData.type === 'uno-init' && moveData.gameState) {
                console.log('🎮 [UNO MULTIPLAYER] Non-host receiving initial game state');
                // For non-host players, we need to adjust the game state
                const receivedGameState = moveData.gameState;
                if (!isHost) {
                    // Swap the player hands so non-host sees their own hand
                    const adjustedGameState = {
                        ...receivedGameState,
                        playerHand: receivedGameState.players[1].hand, // Non-host gets player2's hand
                        players: [
                            receivedGameState.players[0], // Host player (opponent for non-host)
                            receivedGameState.players[1]  // Non-host player (current player)
                        ]
                    };
                    setGameState(adjustedGameState);
                    console.log('🔄 [UNO MULTIPLAYER] Adjusted game state for non-host player');
                } else {
                    setGameState(receivedGameState);
                }
                setIsLoadingGame(false);
            } else if (moveData.type === 'uno-update' && moveData.gameState) {
                setGameState(moveData.gameState);
            }
        });

        return unsubscribe;
    }, [onGameMove, isHost]);

    const handlePlayCard = (cardIndex: number, e: React.MouseEvent<HTMLDivElement>) => {
        if (!gameState || gameState.winner) return;
        
        const currentPlayer = gameState.players[gameState.activePlayerIndex];
        const isMyTurn = (gameState.activePlayerIndex === 0 && isHost) || (gameState.activePlayerIndex === 1 && !isHost);
        
        if (!isMyTurn) {
            setTurnMessage("Not your turn!");
            return;
        }

        const card = currentPlayer.hand[cardIndex];
        const topCard = gameState.discardPile[gameState.discardPile.length - 1];
        
        if (!isCardPlayable(card, topCard, gameState.activeColor)) {
            setTurnMessage("Can't play that card!");
            return;
        }

        // Handle wild cards
        if (card.color === 'Wild') {
            setShowColorPicker(true);
            return;
        }

        playCard(cardIndex, card.color);
    };

    const playCard = (cardIndex: number, chosenColor?: UnoColor) => {
        if (!gameState) return;
        
        const currentPlayer = gameState.players[gameState.activePlayerIndex];
        const card = currentPlayer.hand[cardIndex];
        
        // Create flying card animation
        if (playerHandRef.current) {
            const cardElement = playerHandRef.current.children[cardIndex] as HTMLElement;
            if (cardElement) {
                setFlyingCard({
                    card,
                    startRect: cardElement.getBoundingClientRect()
                });
                
                setTimeout(() => setFlyingCard(null), 600);
            }
        }

        // Update game state
        const newGameState = { ...gameState };
        const newCurrentPlayer = { ...currentPlayer };
        newCurrentPlayer.hand = [...currentPlayer.hand];
        newCurrentPlayer.hand.splice(cardIndex, 1);
        newGameState.players[gameState.activePlayerIndex] = newCurrentPlayer;
        
        // Add card to discard pile
        newGameState.discardPile = [...gameState.discardPile, card];
        
        // Set active color
        newGameState.activeColor = chosenColor || card.color;
        
        // Add to game log
        newGameState.gameLog = [...gameState.gameLog, `${currentPlayer.name} played ${card.value} ${card.color}`];
        
        // Check for winner
        if (newCurrentPlayer.hand.length === 0) {
            newGameState.winner = currentPlayer.name;
            newGameState.gameLog.push(`${currentPlayer.name} wins!`);
            setHasWon(currentPlayer.id === 'player');
        }
        
        // Handle special cards
        let nextPlayerIndex = gameState.activePlayerIndex;
        if (card.value === 'Skip') {
            nextPlayerIndex = (nextPlayerIndex + 1) % 2;
            newGameState.gameLog.push(`${gameState.players[nextPlayerIndex].name} was skipped!`);
        } else if (card.value === 'Reverse') {
            newGameState.isReversed = !gameState.isReversed;
            newGameState.gameLog.push('Direction reversed!');
        } else if (card.value === 'Draw Two') {
            const targetPlayerIndex = (nextPlayerIndex + 1) % 2;
            const targetPlayer = { ...newGameState.players[targetPlayerIndex] };
            const drawnCards = newGameState.deck.splice(0, 2);
            targetPlayer.hand = [...targetPlayer.hand, ...drawnCards];
            newGameState.players[targetPlayerIndex] = targetPlayer;
            newGameState.gameLog.push(`${targetPlayer.name} draws 2 cards!`);
        } else if (card.value === 'Draw Four') {
            const targetPlayerIndex = (nextPlayerIndex + 1) % 2;
            const targetPlayer = { ...newGameState.players[targetPlayerIndex] };
            const drawnCards = newGameState.deck.splice(0, 4);
            targetPlayer.hand = [...targetPlayer.hand, ...drawnCards];
            newGameState.players[targetPlayerIndex] = targetPlayer;
            newGameState.gameLog.push(`${targetPlayer.name} draws 4 cards!`);
        }
        
        // Move to next player
        if (!newGameState.winner) {
            newGameState.activePlayerIndex = (gameState.activePlayerIndex + 1) % 2;
        }
        
        setGameState(newGameState);
        sendGameMove(lobby.id, {
            type: 'uno-update',
            gameState: newGameState
        });
    };

    const handleColorPick = (color: UnoColor) => {
        setShowColorPicker(false);
        if (!gameState) return;
        
        const currentPlayer = gameState.players[gameState.activePlayerIndex];
        const cardIndex = currentPlayer.hand.findIndex(card => card.color === 'Wild');
        if (cardIndex !== -1) {
            playCard(cardIndex, color);
        }
    };

    const handleDrawCard = () => {
        if (!gameState || gameState.winner) return;
        
        const isMyTurn = (gameState.activePlayerIndex === 0 && isHost) || (gameState.activePlayerIndex === 1 && !isHost);
        if (!isMyTurn) {
            setTurnMessage("Not your turn!");
            return;
        }

        const newGameState = { ...gameState };
        const currentPlayer = { ...gameState.players[gameState.activePlayerIndex] };
        
        if (newGameState.deck.length === 0) {
            // Reshuffle discard pile into deck
            const newDeck = shuffleDeck(newGameState.discardPile.slice(0, -1));
            newGameState.deck = newDeck;
            newGameState.discardPile = [newGameState.discardPile[newGameState.discardPile.length - 1]];
        }
        
        const drawnCard = newGameState.deck.splice(0, 1)[0];
        currentPlayer.hand = [...currentPlayer.hand, drawnCard];
        newGameState.players[gameState.activePlayerIndex] = currentPlayer;
        newGameState.gameLog = [...gameState.gameLog, `${currentPlayer.name} drew a card`];
        
        // Move to next player
        newGameState.activePlayerIndex = (gameState.activePlayerIndex + 1) % 2;
        
        setGameState(newGameState);
        sendGameMove(lobby.id, {
            type: 'uno-update',
            gameState: newGameState
        });
    };

    const handleNewGame = () => {
        setGameState(null);
        setShowEndGameScreen(false);
        setHasWon(false);
        setIsLoadingGame(true);
        if (isHost) {
            initializeGame();
        }
    };

    // Show loading screen
    if (isLoadingGame || !gameState) {
        const message = !lobby.player2Id && lobby.status !== 'playing' 
            ? "Waiting for opponent..." 
            : "Starting game...";
            
        return (
            <div className="w-full h-full flex items-center justify-center text-white">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto mb-4"></div>
                    <p className="text-2xl font-headline">{message}</p>
                </div>
            </div>
        );
    }

    const player = gameState.players[isHost ? 0 : 1];
    const opponent = gameState.players[isHost ? 1 : 0];
    const topCard = gameState.discardPile[gameState.discardPile.length - 1];
    const isMyTurn = (gameState.activePlayerIndex === 0 && isHost) || (gameState.activePlayerIndex === 1 && !isHost);
    const playerHasPlayableCard = player.hand.some(card => isCardPlayable(card, topCard, gameState.activeColor));

    // Hand styling function - sophisticated spacing like singleplayer
    const handStyle = (index: number, handSize: number) => {
        const isMobile = windowWidth < 768;
        
        if (isMobile) {
            // Mobile: Use much larger spacing for touch-friendly interaction
            const spacingMultiplier = 40;
            const maxSpreadLimit = 400;
            const maxSpread = Math.min(handSize * spacingMultiplier, maxSpreadLimit);
            const finalSpread = maxSpread / handSize;
            const startOffset = -(maxSpread / 2) + (finalSpread / 2);
            const translateX = startOffset + index * finalSpread;
            return {
                transform: `translateX(${translateX}%)`,
                zIndex: index,
            };
        } else {
            // Desktop: Use sophisticated spacing algorithm from singleplayer
            const containerWidth = playerHandRef.current?.offsetWidth || window.innerWidth * 0.9;
            const cardWidth = 70; // Estimated card width for desktop
            const availableSpace = containerWidth - (cardWidth * 0.5);
            const maxCards = Math.max(handSize, 1);
            const spreadPercentage = Math.min(availableSpace / maxCards / containerWidth * 100, 120);
            const minSpreadPercentage = 60; // Minimum spacing for desktop
            const finalSpread = Math.max(spreadPercentage, minSpreadPercentage);
            const totalSpread = (maxCards - 1) * finalSpread;
            const startOffset = -totalSpread / 2;
            const translateX = startOffset + index * finalSpread;
            return {
                transform: `translateX(${translateX}%)`,
                zIndex: index,
            };
        }
    };

    return (
        <div className="w-full h-full flex flex-col md:flex-col justify-end items-center text-white font-headline relative overflow-hidden">
            
            {/* Game Log Button */}
            <div className={cn("absolute top-24 right-2 z-20", gameState.winner && "hidden")}>
                <Button variant="secondary" size="sm" onClick={() => setIsLogVisible(v => !v)}>
                    Log
                </Button>
            </div>

            {/* Game Log Panel */}
            <div className={cn(
                "fixed top-0 right-0 h-full w-64 md:w-72 bg-black/80 md:bg-black/50 rounded-l-lg md:rounded-lg p-4 flex flex-col z-30 transition-transform duration-300 ease-in-out",
                isLogVisible ? "translate-x-0" : "translate-x-full"
            )}>
                 <Button variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => setIsLogVisible(false)}>
                    X
                 </Button>
                <h3 className="text-2xl text-accent text-center font-bold uppercase tracking-wider mb-4">Game Log</h3>
                <ScrollArea className="flex-1">
                    <div className="flex flex-col gap-2">
                       {gameState.gameLog.slice().reverse().map((msg, i) => (
                           <p key={i} className={cn("text-sm text-white/80 border-b border-white/10 pb-1", i === 0 && "text-white font-bold")}>
                               {msg}
                           </p>
                       ))}
                    </div>
                </ScrollArea>
                <div className="mt-4 space-y-2">
                    <Button variant="secondary" className="w-full font-headline text-lg" onClick={handleNewGame}><RefreshCw className="mr-2 h-5 w-5"/> New Game</Button>
                </div>
            </div>

             <div className="flex-1 h-full flex flex-col justify-between items-center py-2 md:py-4 px-2 md:px-4">
                {/* Opponent Area */}
                <div className="flex flex-col items-center gap-2 md:gap-4 min-h-[6rem] md:min-h-[8rem] lg:min-h-[10rem] w-full max-w-7xl">
                     <div className={cn("text-sm md:text-xl lg:text-2xl uppercase tracking-wider bg-black/50 px-4 md:px-6 py-1 md:py-2 rounded-full transition-all duration-300", !isMyTurn && "shadow-[0_0_20px_5px] shadow-yellow-400")}>{opponent.name} ({opponent.hand.length} cards)</div>
                    <div className="relative flex justify-center items-center flex-1 w-full px-4 md:px-8 overflow-visible">
                        {opponent.hand.map((_, i) => (
                            <div key={i} className="absolute transition-transform duration-300 ease-out" style={{ ...handStyle(i, opponent.hand.length), top: 0 }}>
                                <CardBack size={windowWidth < 768 ? 'large' : 'normal'} />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Center Area with Draw and Played Cards */}
                <div className="flex flex-col items-center gap-3 md:gap-6 my-4 md:my-6">
                    {/* Labels Row */}
                    <div className="flex items-center justify-center gap-12 md:gap-20">
                        <h3 className="text-sm md:text-xl lg:text-2xl font-bold uppercase tracking-wider text-center w-20 md:w-32">Draw</h3>
                        <h3 className="text-sm md:text-xl lg:text-2xl font-bold uppercase tracking-wider text-center w-20 md:w-32">Played</h3>
                    </div>
                    
                    {/* Cards Row */}
                    <div className="flex items-start justify-center gap-12 md:gap-20">
                        <div className="flex justify-center items-start w-20 md:w-32">
                            <div onClick={isMyTurn ? handleDrawCard : undefined} className={cn("transition-transform hover:scale-105 relative", isMyTurn && !playerHasPlayableCard ? "cursor-pointer" : "cursor-not-allowed")} style={{transform: 'translateX(-32px)'}}>
                               {Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className="absolute" style={{ top: `${i * 2}px`, left: `${i * 2}px` }}>
                                        <CardBack size="large" />
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        <div className="flex justify-center items-start w-20 md:w-32">
                            <CardComponent card={topCard} isPlayer={false} onClick={()=>{}} isPlayable={false} size="large" />
                        </div>
                    </div>
                </div>
                
                {/* Player Area */}
                <div className="flex flex-col items-center gap-2 md:gap-4 w-full max-w-7xl min-h-[6rem] md:min-h-[8rem] lg:min-h-[10rem] pb-0 mb-2 md:mb-4">
                    <div ref={playerHandRef} className="relative flex justify-center items-center flex-1 w-full px-4 md:px-8 overflow-visible">
                        {player.hand.map((card, i) => (
                            <div
                              key={`${card.color}-${card.value}-${i}`}
                              className="absolute"
                              style={{
                                  ...handStyle(i, player.hand.length),
                                  visibility: flyingCard?.card === card ? 'hidden' : 'visible',
                                  bottom: 0,
                              }}
                            >
                                <CardComponent 
                                    card={card} 
                                    isPlayer={true} 
                                    onClick={(e: React.MouseEvent<HTMLDivElement>) => handlePlayCard(i, e)}
                                    isPlayable={isMyTurn && isCardPlayable(card, topCard, gameState.activeColor)}
                                    isLastCard={player.hand.length === 1}
                                    size={windowWidth < 768 ? 'large' : 'normal'}
                                />
                            </div>
                        )
                        )}
                    </div>
                     <div className={cn("text-sm md:text-xl lg:text-2xl uppercase tracking-wider bg-black/50 px-4 md:px-6 py-1 md:py-2 rounded-full transition-all duration-300", isMyTurn && "shadow-[0_0_20px_5px] shadow-yellow-400")}>{player.name} ({player.hand.length} cards)</div>
                </div>
            </div>

            {/* Turn Message Overlay */}
            {turnMessage && (
                <div className="absolute inset-0 z-50 flex items-center justify-center animate-message pointer-events-none">
                    <div className="bg-black/50 p-4 md:p-8 rounded-xl backdrop-blur-sm">
                        <h2 className="text-4xl md:text-6xl text-white font-headline uppercase tracking-wider text-center" style={{ WebkitTextStroke: '2px black' }}>
                            {turnMessage}
                        </h2>
                    </div>
                </div>
            )}

            {/* Flying Card Animation */}
            {flyingCard && (
                <div
                    className="absolute z-50 animate-fly"
                    style={
                        {
                            '--start-x': `${flyingCard.startRect.left}px`,
                            '--start-y': `${flyingCard.startRect.top}px`,
                            '--start-rotate': `${(Math.random() - 0.5) * 15}deg`,
                            left: 0,
                            top: 0
                        } as React.CSSProperties
                    }
                >
                    <CardComponent card={flyingCard.card} isPlayer={false} onClick={()=>{}} isPlayable={false} />
                </div>
            )}

            {/* Winner Overlay */}
            {gameState.winner && !showEndGameScreen && (
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-4 animate-fade-in rounded-xl z-30">
                    <h2 className="text-6xl md:text-9xl font-headline text-accent uppercase tracking-wider" style={{ WebkitTextStroke: '4px black' }}>UNO!</h2>
                    <p className="text-2xl md:text-4xl text-white -mt-4">{gameState.winner} Wins!</p>
                    <div className="flex gap-4">
                        <Button size="lg" onClick={handleNewGame} className="font-headline text-2xl"><RefreshCw className="mr-2"/> New Game</Button>
                        <Button size="lg" onClick={onGameEnd} className="font-headline text-2xl">Back to Menu</Button>
                    </div>
                </div>
            )}

            {/* End Game Screen */}
            {showEndGameScreen && gameState && (
                <UnoEndGameScreen
                    hasWon={hasWon}
                    onNewGame={handleNewGame}
                    onBackToMenu={onGameEnd}
                    isMinting={isMinting}
                    mintTxHash={mintTxHash}
                    tokensEarned={tokensEarned}
                />
            )}
            
            {/* Color Picker Modal */}
            {showColorPicker && (
                 <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-4 animate-fade-in rounded-xl z-20">
                     <h2 className="text-3xl md:text-6xl text-white font-bold drop-shadow-lg mb-4">Choose a color</h2>
                     <div className="grid grid-cols-2 md:flex gap-4">
                        {colors.map(color => (
                            <button key={color} onClick={() => handleColorPick(color)} className={cn("w-24 h-24 md:w-32 md:h-32 rounded-full cursor-pointer border-8 border-white flex items-center justify-center transition-transform hover:scale-110", {
                              'bg-red-600': color === 'Red',
                              'bg-green-600': color === 'Green',
                              'bg-blue-600': color === 'Blue',
                              'bg-yellow-500': color === 'Yellow',
                            })}>
                                <span className="text-white text-lg md:text-2xl font-bold">{color}</span>
                            </button>
                        ))}
                     </div>
                 </div>
            )}

        </div>
    );
};