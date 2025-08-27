
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import type { UnoGameState, Player, UnoCard, UnoColor, UnoValue } from '@/types';
import { Button } from '@/components/ui/button';
import { RefreshCw, PanelLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useWeb3 } from '../web3/Web3Provider';
import { logGameCompletion, createGameResult, isValidWalletAddress } from '@/lib/game-logger';
import { verifyPayment, sendBonusPayment, getBonusReward, PaymentVerificationResult } from '@/lib/payment-verification';


import { UnoEndGameScreen } from './UnoEndGameScreen';
import { UnoStartScreen } from './UnoStartScreen';

const colors: UnoColor[] = ['Red', 'Green', 'Blue', 'Yellow'];
const values: UnoValue[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'Skip', 'Reverse', 'Draw Two'];

const createDeck = (): UnoCard[] => {
  const deck: UnoCard[] = [];
  
  // Number cards: 76 total (19 per color × 4 colors)
  for (const color of colors) {
    // One 0 card per color
    deck.push({ color, value: '0' });
    
    // Two copies of each 1-9 per color
    for (let num = 1; num <= 9; num++) {
      deck.push({ color, value: num.toString() });
      deck.push({ color, value: num.toString() });
    }
    
    // Action cards: 2 of each per color (Skip, Reverse, Draw Two)
    deck.push({ color, value: 'Skip' });
    deck.push({ color, value: 'Skip' });
    deck.push({ color, value: 'Reverse' });
    deck.push({ color, value: 'Reverse' });
    deck.push({ color, value: 'Draw Two' });
    deck.push({ color, value: 'Draw Two' });
  }
  
  // Wild cards: 8 total (4 Wild + 4 Wild Draw Four)
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
      case 'Skip':
      case 'Reverse':
        return score + 20;
      case 'Wild':
      case 'Draw Four':
        return score + 50;
      default:
        return score + parseInt(card.value);
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
      normal: 'w-[12vw] max-w-[70px] md:max-w-[90px] min-w-[40px] md:min-w-[60px] h-auto aspect-[5/7]',
      large: 'w-[15vw] max-w-[90px] md:max-w-[120px] min-w-[50px] md:min-w-[80px] h-auto aspect-[5/7]',
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

interface UnoClientProps {
  onGameEnd?: () => void;
  onNavigateToMultiplayer?: () => void;
  onNavigateToBetting?: () => void;
}

export const UnoClient = ({ onGameEnd, onNavigateToMultiplayer, onNavigateToBetting }: UnoClientProps) => {
    const { username, account, getProvider, getSigner } = useWeb3();
    const [gameState, setGameState] = useState<UnoGameState | null>(null);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [flyingCard, setFlyingCard] = useState<FlyingCard | null>(null);
    const [turnMessage, setTurnMessage] = useState<string | null>(null);
    const [isLogVisible, setIsLogVisible] = useState(false);
    const [gameStartTime, setGameStartTime] = useState<number>(0);
    const [isLoggingGame, setIsLoggingGame] = useState(false);

    const [mintTxHash, setMintTxHash] = useState<string>('');
    const [showEndGameScreen, setShowEndGameScreen] = useState(false);
    const [showStartScreen, setShowStartScreen] = useState(true);
    const [isMinting, setIsMinting] = useState(false);
    const [tokensEarned, setTokensEarned] = useState(0);
    const [isBonusMode, setIsBonusMode] = useState(false);
    const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
    const [paymentTxHash, setPaymentTxHash] = useState<string>('');
    const [hasWon, setHasWon] = useState<boolean>(false);
    const [playerCalledUno, setPlayerCalledUno] = useState(false);
    const [botCalledUno, setBotCalledUno] = useState(false);
    const [showUnoButton, setShowUnoButton] = useState(false);


    const playerHandRef = useRef<HTMLDivElement>(null);

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
    
    useEffect(() => {
      const handleGameWin = async () => {
        if (gameState?.winner === 'player' && !showEndGameScreen) {
          // Set win status immediately
          setHasWon(true);
          setShowEndGameScreen(true);
          
          // Only log game if wallet is connected
          console.log('Player won! Account:', account, 'isValidWallet:', isValidWalletAddress(account || ''), 'isLoggingGame:', isLoggingGame);
          if (!isValidWalletAddress(account || '') || isLoggingGame) {
            console.log('Skipping token minting - wallet not connected or already logging');
            setIsMinting(false);
            return;
          }
          
          console.log('Starting token minting process...');

          setIsLoggingGame(true);
          setIsMinting(true);
          
          try {
            const gameDuration = Math.floor((Date.now() - gameStartTime) / 1000); // in seconds
            const playerScore = calculateUnoScore(gameState.players[0].hand);
            const isWin = true; // Player won
            
            const gameResult = createGameResult(
              account!,
              isBonusMode ? 'uno-bonus' : 'uno',
              playerScore,
              isWin,
              gameDuration
            );
            
            const logResponse = await logGameCompletion(gameResult);

            // Update tokensToMint based on actual reward from backend or calculate bonus
            let tokensToMint = 0;
            console.log('logResponse:', logResponse, 'isBonusMode:', isBonusMode);
            if (logResponse?.reward) {
              tokensToMint = parseFloat(logResponse.reward);
              console.log('Using backend reward:', tokensToMint);
            } else if (isBonusMode) {
              // Fallback for bonus mode: 100 ARC tokens (2x normal 50)
              tokensToMint = getBonusReward('uno', 50);
              console.log('Using bonus mode reward:', tokensToMint);
            } else {
              // Regular mode: 50 ARC tokens for winning
              tokensToMint = 50;
              console.log('Using regular mode reward:', tokensToMint);
            }
            setTokensEarned(tokensToMint);
            console.log('Final tokensEarned set to:', tokensToMint);
                
            // Show mint success modal if tokens were earned
            if (tokensToMint > 0 && logResponse?.mintTransaction) {
              console.log('Setting mint transaction hash:', logResponse.mintTransaction);
              setMintTxHash(logResponse.mintTransaction);
            } else {
              console.log('No mint transaction - tokensToMint:', tokensToMint, 'mintTransaction:', logResponse?.mintTransaction);
            }
          } catch (error) {
            console.error('Failed to log game completion:', error);
          } finally {
            setIsLoggingGame(false);
            setIsMinting(false);
          }
        } else if (gameState?.winner && !showEndGameScreen) {
          // Handle bot win or other end conditions
          setHasWon(false);
          setShowEndGameScreen(true);
        }
      };
      if (gameState?.winner) {
        handleGameWin();
      }
    }, [gameState?.winner, account, gameState?.players, gameStartTime, isLoggingGame, showEndGameScreen]);

    const addGameLog = (message: string) => {
        setGameState(prev => {
            if (!prev) return null;
            const newLog = [...prev.gameLog, message];
            if (newLog.length > 20) newLog.shift(); // Keep log size manageable
            return { ...prev, gameLog: newLog };
        });
    }
    
    const handleUnoCall = () => {
        setPlayerCalledUno(true);
        setShowUnoButton(false);
        addGameLog('You called UNO!');
        setTurnMessage('UNO called!');
    };
    
    const checkUnoPenalty = (playerId: string) => {
        if (!gameState) return;
        
        const player = gameState.players.find(p => p.id === playerId);
        if (!player || player.hand.length !== 1) return;
        
        const calledUno = playerId === 'player' ? playerCalledUno : botCalledUno;
        if (!calledUno) {
            // Player didn't call UNO - penalty: draw 2 cards
            setGameState(prev => {
                if (!prev) return null;
                const newState = { ...prev };
                const penaltyPlayer = newState.players.find(p => p.id === playerId);
                if (penaltyPlayer && newState.deck.length >= 2) {
                    const drawnCards = newState.deck.splice(0, 2);
                    penaltyPlayer.hand = [...penaltyPlayer.hand, ...drawnCards];
                    addGameLog(`${penaltyPlayer.name} didn't call UNO and draws 2 penalty cards!`);
                    setTurnMessage('UNO penalty: +2 cards!');
                }
                return newState;
            });
        }
    };
    


    const handleNewGame = useCallback((bonusMode = false) => {
        let deck = shuffleDeck(createDeck());
        
        const dealHand = () => {
            const hand = [];
            for (let i=0; i<7; i++) hand.push(deck.pop()!);
            return hand;
        }

        const playerHand = dealHand();
        const botHand = dealHand();

        let topCard = deck.pop()!;
        // Handle special starting cards according to official UNO rules
        while(topCard.value === 'Draw Four') { // Wild Draw Four is invalid starter
            deck.push(topCard);
            deck = shuffleDeck(deck);
            topCard = deck.pop()!;
        }
        
        // Handle special starting card effects
        let initialActivePlayer = 0; // Player starts by default
        let initialGameLog = [bonusMode ? 'Bonus Game started.' : 'Game started.'];
        
        if (topCard.value === 'Skip') {
            initialActivePlayer = 1; // Skip first player (player), bot goes first
            initialGameLog.push('Starting card is Skip - Player skipped, Bot\'s turn!');
        } else if (topCard.value === 'Reverse') {
            // With 2 players, Reverse acts as Skip
            initialActivePlayer = 1; // Skip first player (player), bot goes first  
            initialGameLog.push('Starting card is Reverse - Player skipped, Bot\'s turn!');
        } else if (topCard.value === 'Draw Two') {
            // First player draws 2 and loses turn
            const drawnCards = deck.splice(0, 2);
            playerHand.push(...drawnCards);
            initialActivePlayer = 1; // Bot goes first
            initialGameLog.push('Starting card is Draw Two - Player draws 2 cards and is skipped, Bot\'s turn!');
        } else if (topCard.value === 'Wild') {
            // First player chooses color (we'll set it to the card's color for now)
            initialGameLog.push('Starting card is Wild - Player\'s turn to choose color!');
        } else {
            initialGameLog.push('Your turn!');
        }

        setGameState({
            players: [
                { id: 'player', name: username || 'Player', hand: playerHand },
                { id: 'bot', name: 'Bot', hand: botHand },
            ],
            playerHand: playerHand,
            deck,
            discardPile: [topCard],
            activePlayerIndex: initialActivePlayer,
            activeColor: topCard.color === 'Wild' ? 'Red' : topCard.color, // Default Wild to Red
            winner: null,
            isReversed: false,
            direction: 'clockwise',
            gameLog: initialGameLog,
        });
        setGameStartTime(Date.now());
        setTurnMessage("Your Turn!");
        setShowStartScreen(false);
        setShowEndGameScreen(false);
        setIsBonusMode(bonusMode);
        setTokensEarned(0);
        setMintTxHash('');
        setPaymentTxHash('');
        setIsVerifyingPayment(false);
        setHasWon(false);
        setPlayerCalledUno(false);
        setBotCalledUno(false);
        setShowUnoButton(false);
    }, [username]);

    const handleBonusPayment = async () => {
        const provider = getProvider();
        const signer = getSigner();
        
        if (!provider || !signer || !account) {
            alert('Please connect your wallet first');
            return;
        }

        setIsVerifyingPayment(true);
        
        try {
            const signerPromise = getSigner();
            const paymentResult = await sendBonusPayment(provider, signerPromise);
            
            if (paymentResult.success && paymentResult.transactionHash) {
                setPaymentTxHash(paymentResult.transactionHash);
                handleNewGame(true);
            } else {
                alert(`Payment failed: ${paymentResult.error}`);
            }
        } catch (error) {
            console.error('Bonus payment error:', error);
            alert('Failed to process bonus payment');
        } finally {
            setIsVerifyingPayment(false);
        }
    };

    const handleStartBonusMode = () => {
        handleBonusPayment();
    };

    const handleTestWin = async () => {
        if (!gameState) {
            alert('Please start a game first!');
            return;
        }
        
        // Simulate player win and trigger the actual win handling logic
        setHasWon(true);
        setShowEndGameScreen(true);
        
        // Only log game if wallet is connected
        console.log('Test Win - Account:', account, 'isValidWallet:', isValidWalletAddress(account || ''), 'isLoggingGame:', isLoggingGame);
        if (!isValidWalletAddress(account || '') || isLoggingGame) {
            console.log('Test Win - Skipping token minting - wallet not connected or already logging');
            setIsMinting(false);
            // Still set winner for display purposes
            setGameState(prev => prev ? { ...prev, winner: 'player' } : null);
            return;
        }
        
        console.log('Test Win - Starting token minting process...');
        setIsLoggingGame(true);
        setIsMinting(true);
        
        try {
            const gameDuration = Math.floor((Date.now() - gameStartTime) / 1000); // in seconds
            const playerScore = calculateUnoScore(gameState.players[0].hand);
            const isWin = true; // Player won
            
            const gameResult = createGameResult(
                account!,
                isBonusMode ? 'uno-bonus' : 'uno',
                playerScore,
                isWin,
                gameDuration
            );
            
            const logResponse = await logGameCompletion(gameResult);

            // Update tokensToMint based on actual reward from backend or calculate bonus
            let tokensToMint = 0;
            console.log('Test Win - logResponse:', logResponse, 'isBonusMode:', isBonusMode);
            if (logResponse?.reward) {
                tokensToMint = parseFloat(logResponse.reward);
                console.log('Test Win - Using backend reward:', tokensToMint);
            } else if (isBonusMode) {
                // Fallback for bonus mode: 100 ARC tokens (2x normal 50)
                tokensToMint = getBonusReward('uno', 50);
                console.log('Test Win - Using bonus mode reward:', tokensToMint);
            } else {
                // Regular mode: 50 ARC tokens for winning
                tokensToMint = 50;
                console.log('Test Win - Using regular mode reward:', tokensToMint);
            }
            setTokensEarned(tokensToMint);
            console.log('Test Win - Final tokensEarned set to:', tokensToMint);
                
            // Show mint success modal if tokens were earned
            if (tokensToMint > 0 && logResponse?.mintTransaction) {
                console.log('Test Win - Setting mint transaction hash:', logResponse.mintTransaction);
                setMintTxHash(logResponse.mintTransaction);
            } else {
                console.log('Test Win - No mint transaction - tokensToMint:', tokensToMint, 'mintTransaction:', logResponse?.mintTransaction);
            }
        } catch (error) {
            console.error('Test Win - Failed to log game completion:', error);
        } finally {
            setIsLoggingGame(false);
            setIsMinting(false);
        }
        
        // Set winner for display purposes
        setGameState(prev => prev ? { ...prev, winner: 'player' } : null);
    };

    const handleStartMultiplayer = () => {
        // Logic to start multiplayer game
        // This might involve navigating to a different route or showing a multiplayer specific UI
        console.log("Starting multiplayer UNO game...");
        // Navigate to the UNO multiplayer page within the SPA
        if (onNavigateToMultiplayer) {
            onNavigateToMultiplayer();
        }
    };

    // Don't auto-start the game - let the start screen handle it

    const handleShowStartScreen = () => {
        setShowStartScreen(true);
        setShowEndGameScreen(false);
        setGameState(null);
    };

    const nextPlayer = (state: UnoGameState): number => {
        const direction = state.isReversed ? -1 : 1;
        let nextIndex = (state.activePlayerIndex + direction) % state.players.length;
        if (nextIndex < 0) nextIndex = state.players.length - 1;
        return nextIndex;
    }
    
    const handleDrawCard = () => {
        if(flyingCard) return;
        setGameState(prev => {
            if (!prev || prev.activePlayerIndex !== 0 || prev.winner) return prev;
            
            const newState = JSON.parse(JSON.stringify(prev));
            const card = newState.deck.pop();
            if(card) {
                newState.players[0].hand.push(card);
                addGameLog("You drew a card.");
                setTurnMessage("You drew a card");
            }
            newState.activePlayerIndex = nextPlayer(newState);
            addGameLog("Bot's turn.");
            setTurnMessage("Bot's Turn");

            if(newState.deck.length === 0) {
                 const newDeck = shuffleDeck(newState.discardPile.slice(0, -1));
                 newState.deck = newDeck;
                 addGameLog("Deck reshuffled from discard pile.");
            }
            return newState;
        })
    }

    const handlePlayCard = (cardIndex: number, e: React.MouseEvent<HTMLDivElement>) => {
        if (gameState?.winner || flyingCard) return;

        let card = gameState!.players[0].hand[cardIndex];
        const topCard = gameState!.discardPile[gameState!.discardPile.length - 1];

        if (!isCardPlayable(card, topCard, gameState!.activeColor)) {
            return;
        }

        const cardRect = e.currentTarget.getBoundingClientRect();
        setFlyingCard({ card: card, startRect: cardRect });

        setTimeout(() => {
            if (card.color === 'Wild') {

                setShowColorPicker(true);
            } else {
                playCard(card, gameState!.activeColor);
            }
            setFlyingCard(null);
        }, 500);
    };

    const handleColorPick = (color: UnoColor) => {
        setShowColorPicker(false);
        const player = gameState!.players[0];
        // Find the wild card they must have just clicked
        const wildCard = player.hand.find(c => c.color === 'Wild')!;
        playCard(wildCard, color);
    };

    const playCard = (card: UnoCard, chosenColor: UnoColor) => {
        setGameState(prev => {
            if (!prev) return null;
            let newState: UnoGameState = JSON.parse(JSON.stringify(prev));
            const playerIndex = newState.activePlayerIndex;
            const currentPlayer = newState.players[playerIndex];

            // Remove card from hand
            const cardIdx = currentPlayer.hand.findIndex((c: UnoCard) => c.value === card.value && c.color === card.color);
            if (cardIdx === -1) return prev; // Card not found
            currentPlayer.hand.splice(cardIdx, 1);

            // Add card to discard pile
            newState.discardPile.push(card);
            newState.activeColor = card.color === 'Wild' ? chosenColor : card.color;
            
            const playerName = currentPlayer.id === 'player' ? 'You' : 'Bot';
            const logMessage = card.color === 'Wild' ? `${playerName} played a ${card.value} and chose ${chosenColor}.` : `${playerName} played a ${card.color} ${card.value}.`;
            addGameLog(logMessage);

            // Check for winner
            if (currentPlayer.hand.length === 0) {
                newState.winner = currentPlayer.name;
                addGameLog(`${currentPlayer.name} wins!`);
                return newState;
            }
            
            // Check for UNO call requirement
            if (currentPlayer.hand.length === 1) {
                if (currentPlayer.id === 'player' && !playerCalledUno) {
                    // Player has 1 card but didn't call UNO - show UNO button
                    setShowUnoButton(true);
                } else if (currentPlayer.id === 'bot' && !botCalledUno) {
                    // Bot automatically calls UNO
                    setBotCalledUno(true);
                    addGameLog('Bot calls UNO!');
                    setTurnMessage('Bot calls UNO!');
                }
            }

            // Handle card actions
            let tempNextPlayerIndex = nextPlayer(newState);
            
            const handleAction = (value: UnoValue) => {
                const opponent = newState.players[tempNextPlayerIndex];
                switch(value) {
                    case 'Draw Two': {
                        for(let i = 0; i < 2; i++) {
                           const card = newState.deck.pop();
                           if(card) opponent.hand.push(card);
                        }
                        const msg = `${opponent.id === 'player' ? 'You' : 'Bot'} drew 2 cards.`;
                        addGameLog(msg);
                        setTurnMessage(msg);
                        tempNextPlayerIndex = nextPlayer({ ...newState, activePlayerIndex: tempNextPlayerIndex });
                        break;
                    }
                    case 'Draw Four': {
                        for(let i = 0; i < 4; i++) {
                           const card = newState.deck.pop();
                           if(card) opponent.hand.push(card);
                        }
                        const msg = `${opponent.id === 'player' ? 'You' : 'Bot'} drew 4 cards.`;
                        addGameLog(msg);
                        setTurnMessage(msg);
                        tempNextPlayerIndex = nextPlayer({ ...newState, activePlayerIndex: tempNextPlayerIndex }); // Skip opponent's turn
                        break;
                    }
                    case 'Skip': {
                        const msg = `${opponent.id === 'player' ? 'You are' : 'Bot is'} skipped.`;
                        addGameLog(msg);
                        setTurnMessage(msg);
                        tempNextPlayerIndex = nextPlayer({ ...newState, activePlayerIndex: tempNextPlayerIndex });
                        break;
                    }
                    case 'Reverse': {
                        // With 2 players, Reverse acts as Skip
                        if (newState.players.length === 2) {
                            const msg = `${opponent.id === 'player' ? 'You are' : 'Bot is'} skipped by Reverse.`;
                            addGameLog(msg);
                            setTurnMessage("Reverse = Skip!");
                            tempNextPlayerIndex = nextPlayer({ ...newState, activePlayerIndex: tempNextPlayerIndex });
                        } else {
                            // With 3+ players, actually reverse direction
                            newState.isReversed = !newState.isReversed;
                            addGameLog(`Play direction was reversed.`);
                            setTurnMessage("Direction Reversed!");
                            const direction = newState.isReversed ? -1 : 1;
                            let nextIndex = (newState.activePlayerIndex + direction) % newState.players.length;
                            if (nextIndex < 0) nextIndex = newState.players.length - 1;
                            tempNextPlayerIndex = nextIndex;
                        }
                        break;
                    }
                }
            }
            
            // Apply action card effects
            handleAction(card.value);

            newState.activePlayerIndex = tempNextPlayerIndex;

            const nextPlayerName = newState.players[newState.activePlayerIndex].id;
            setTimeout(() => {
                addGameLog(`${nextPlayerName === 'player' ? 'Your' : 'Bot\'s'} turn.`);
                setTurnMessage(`${nextPlayerName === 'player' ? 'Your' : 'Bot\'s'} Turn`);
            }, card.value.startsWith("Draw") || card.value === 'Skip' ? 1600 : 100);
            
            return newState;
        });
    }

    const handleBotTurn = useCallback(() => {
        setGameState(prev => {
            if (!prev || prev.activePlayerIndex !== 1 || prev.winner) return prev;
            
            let newState: UnoGameState = JSON.parse(JSON.stringify(prev));
            const bot = newState.players[1];
            const topCard = newState.discardPile[newState.discardPile.length - 1];
            
            const playableCards = bot.hand.map((card: UnoCard, index: number) => ({ card, index }))
                .filter(item => isCardPlayable(item.card, topCard, newState.activeColor));

            if (playableCards.length > 0) {
                const cardToPlay = playableCards[0].card;
                let chosenColor = newState.activeColor;
                if (cardToPlay.color === 'Wild') {
                    // Bot picks the color it has the most of
                    const colorCounts = bot.hand.reduce((acc: any, c: UnoCard) => {
                        if (c.color !== 'Wild') acc[c.color] = (acc[c.color] || 0) + 1;
                        return acc;
                    }, {});
                    const botColors = Object.keys(colorCounts);
                    if(botColors.length > 0) {
                       chosenColor = botColors.reduce((a, b) => colorCounts[a] > colorCounts[b] ? a : b) as UnoColor;
                    } else {
                       // If bot has only wild cards, pick a random color
                       chosenColor = colors[Math.floor(Math.random() * 4)];
                    }
                }
                // Use a timeout to simulate the bot "thinking"
                setTimeout(() => playCard(cardToPlay, cardToPlay.color === 'Wild' ? chosenColor : cardToPlay.color), 500);
            } else { // Bot has no playable cards
                if(newState.deck.length > 0) { // If deck is not empty, draw a card
                    const card = newState.deck.pop()!;
                    bot.hand.push(card);
                    addGameLog("Bot drew a card.");
                    setTurnMessage("Bot drew a card");
                    
                    if (isCardPlayable(card, topCard, newState.activeColor)) { // If drawn card is playable, play it
                        let chosenColor = card.color;
                         if (card.color === 'Wild') {
                            chosenColor = colors[Math.floor(Math.random() * 4)];
                         }
                        setTimeout(() => playCard(card, chosenColor), 1000);
                        return newState; // Return early to avoid changing activePlayerIndex
                    } else { // If drawn card is not playable, skip bot's turn
                        newState.activePlayerIndex = nextPlayer(newState);
                        addGameLog("Bot could not play a card and skipped its turn.");
                        setTurnMessage("Bot skipped turn");
                    }
                } else { // If deck is empty, bot cannot draw, so skip turn
                    newState.activePlayerIndex = nextPlayer(newState);
                    addGameLog("Bot could not draw a card and skipped its turn.");
                    setTurnMessage("Bot skipped turn");
                }
            }
            return newState;
        });
    }, []);

    useEffect(() => {
        if(gameState?.activePlayerIndex === 1 && !gameState.winner && !showColorPicker) {
            const timer = setTimeout(handleBotTurn, 1500);
            return () => clearTimeout(timer);
        }
    }, [gameState?.activePlayerIndex, gameState?.winner, handleBotTurn, showColorPicker]);

    if (showStartScreen) {
        return (
            <div className="w-full h-full flex flex-col md:flex-col justify-end items-center text-white font-headline relative overflow-hidden">
                <UnoStartScreen
                    onStartGame={() => handleNewGame(false)}
                    onGoToMenu={onGameEnd || (() => {})}
                    onStartMultiplayer={handleStartMultiplayer}
                    onStartBonusMode={handleStartBonusMode}
                    onNavigateToBetting={onNavigateToBetting}
                />
            </div>
        );
    }

    if (!gameState) {
        return <div className="text-white text-center text-4xl">Loading Game...</div>;
    }

    const { players, discardPile, winner, activePlayerIndex, gameLog } = gameState;
    const player = players[0];
    const bot = players[1];
    const topCard = discardPile[discardPile.length - 1];
    const playerHasPlayableCard = player.hand.some(card => isCardPlayable(card, topCard, gameState.activeColor));
    
    const handStyle = (index: number, total: number) => {
        const containerWidth = playerHandRef.current?.offsetWidth || window.innerWidth * 0.9;
        const cardWidth = window.innerWidth < 768 ? 50 : 70; // Estimated card width
        const availableSpace = containerWidth - (cardWidth * 0.5); // More space for better visibility
        const maxCards = Math.max(total, 1);
        const spreadPercentage = Math.min(availableSpace / maxCards / containerWidth * 100, 120); // Doubled max spacing to 120%
        const minSpreadPercentage = window.innerWidth < 768 ? 50 : 80; // Increased minimum spacing - mobile: 50, desktop: 80
        const finalSpread = Math.max(spreadPercentage, minSpreadPercentage);
        const totalSpread = (maxCards - 1) * finalSpread;
        const startOffset = -totalSpread / 2;
        const translateX = startOffset + index * finalSpread;
        return {
            transform: `translateX(${translateX}%)`,
            zIndex: index,
        };
    };

    return (
        <div className="w-full h-full flex flex-col md:flex-col justify-end items-center text-white font-headline relative overflow-hidden">
            
            {/* Game Log Button - positioned under connect wallet */}
            <div className={cn("absolute top-24 right-2 z-20", winner && "hidden")}>
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
                       {gameLog.slice().reverse().map((msg, i) => (
                           <p key={i} className={cn("text-sm text-white/80 border-b border-white/10 pb-1", i === 0 && "text-white font-bold")}>
                               {msg}
                           </p>
                       ))}
                    </div>
                </ScrollArea>
                <div className="mt-4 space-y-2">
                    <Button variant="secondary" className="w-full font-headline text-lg" onClick={handleShowStartScreen}><RefreshCw className="mr-2 h-5 w-5"/> New Game</Button>
                    <Button variant="outline" className="w-full font-headline text-sm" onClick={handleTestWin}>🏆 Test Win</Button>
                </div>
            </div>

             <div className="flex-1 h-full flex flex-col justify-between items-center py-2 md:py-4 px-2 md:px-4">
                {/* Bot Area */}
                <div className="flex flex-col items-center gap-2 md:gap-4 min-h-[6rem] md:min-h-[8rem] lg:min-h-[10rem] w-full max-w-7xl">
                     <div className={cn("text-sm md:text-xl lg:text-2xl uppercase tracking-wider bg-black/50 px-4 md:px-6 py-1 md:py-2 rounded-full transition-all duration-300", activePlayerIndex === 1 && "shadow-[0_0_20px_5px] shadow-yellow-400")}>{bot.name} ({bot.hand.length} cards)</div>
                    <div className="relative flex justify-center items-center flex-1 w-full px-4 md:px-8 overflow-visible">
                        {bot.hand.map((_, i) => (
                            <div key={i} className="absolute transition-transform duration-300 ease-out" style={{ ...handStyle(i, bot.hand.length), top: 0 }}>
                                <CardBack />
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
                            <div onClick={activePlayerIndex === 0 ? handleDrawCard : undefined} className={cn("transition-transform hover:scale-105 relative", activePlayerIndex === 0 && !playerHasPlayableCard ? "cursor-pointer" : "cursor-not-allowed")} style={{transform: 'translateX(-32px)'}}>
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
                                    isPlayable={activePlayerIndex === 0 && isCardPlayable(card, topCard, gameState.activeColor)}
                                    isLastCard={player.hand.length === 1}
                                />
                            </div>
                        )
                        )}
                    </div>
                     <div className="flex items-center gap-4">
                        <div className={cn("text-sm md:text-xl lg:text-2xl uppercase tracking-wider bg-black/50 px-4 md:px-6 py-1 md:py-2 rounded-full transition-all duration-300", activePlayerIndex === 0 && "shadow-[0_0_20px_5px] shadow-yellow-400")}>{player.name} ({player.hand.length} cards)</div>
                        {showUnoButton && (
                            <Button 
                                onClick={handleUnoCall}
                                className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2 rounded-full text-lg animate-pulse"
                                size="lg"
                            >
                                UNO!
                            </Button>
                        )}

                    </div>
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
            {winner && !showEndGameScreen && (
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-4 animate-fade-in rounded-xl z-30">
                    <h2 className="text-6xl md:text-9xl font-headline text-accent uppercase tracking-wider" style={{ WebkitTextStroke: '4px black' }}>UNO!</h2>
                    <p className="text-2xl md:text-4xl text-white -mt-4">{winner} Wins!</p>
                    <div className="flex gap-4">
                        <Button size="lg" onClick={handleShowStartScreen} className="font-headline text-2xl"><RefreshCw className="mr-2"/> New Game</Button>
                    </div>
                </div>
            )}

            {/* End Game Screen */}
            {showEndGameScreen && gameState && (
                <UnoEndGameScreen
                    hasWon={hasWon}
                    onNewGame={handleNewGame}
                    onBackToMenu={onGameEnd || (() => {})}
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
}
