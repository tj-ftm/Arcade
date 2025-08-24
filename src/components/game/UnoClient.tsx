
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import type { UnoGameState, Player, UnoCard, UnoColor, UnoValue } from '@/types';
import { Button } from '@/components/ui/button';
import { RefreshCw, PanelLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useWeb3 } from '../web3/Web3Provider';
import { MintSuccessModal } from './MintSuccessModal';

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

const CardComponent = ({ card, isPlayer, onClick, isPlayable, isLastCard, style, size = 'normal' }: { card: UnoCard, isPlayer: boolean, onClick: () => void, isPlayable: boolean, isLastCard?: boolean, style?: React.CSSProperties, size?: 'normal' | 'large' }) => {
  const colorClasses: Record<UnoColor | 'Wild', string> = {
    Red: 'bg-red-600',
    Green: 'bg-green-600',
    Blue: 'bg-blue-600',
    Yellow: 'bg-yellow-500',
    Wild: 'bg-black',
  };

  const sizeClasses = {
      normal: 'w-full max-w-[70px] md:max-w-[90px] min-w-[50px] md:min-w-[70px] h-auto aspect-[5/7]',
      large: 'w-full max-w-[90px] md:max-w-[138px] min-w-[70px] md:min-w-[106px] h-auto aspect-[5/7]',
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
      normal: 'w-full max-w-[60px] md:max-w-[80px] min-w-[40px] md:min-w-[60px] h-auto aspect-[5/7]',
      large: 'w-full max-w-[80px] md:max-w-[128px] min-w-[60px] md:min-w-[96px] h-auto aspect-[5/7]',
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

export const UnoClient = ({ onGameEnd }: { onGameEnd?: () => void }) => {
    const { username } = useWeb3();
    const [gameState, setGameState] = useState<UnoGameState | null>(null);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [flyingCard, setFlyingCard] = useState<FlyingCard | null>(null);
    const [turnMessage, setTurnMessage] = useState<string | null>(null);
    const [isLogVisible, setIsLogVisible] = useState(false);
    const [showMintSuccess, setShowMintSuccess] = useState(false);
    const [mintTxHash, setMintTxHash] = useState<string>('');

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
      if(gameState?.winner && onGameEnd) {
        onGameEnd();
        // Simulate a transaction hash for now
        const simulatedTxHash = '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');
        setMintTxHash(simulatedTxHash);
        setShowMintSuccess(true);
      }
    }, [gameState?.winner, onGameEnd]);

    const addGameLog = (message: string) => {
        setGameState(prev => {
            if (!prev) return null;
            const newLog = [...prev.gameLog, message];
            if (newLog.length > 20) newLog.shift(); // Keep log size manageable
            return { ...prev, gameLog: newLog };
        });
    }

    const handleNewGame = useCallback(() => {
        let deck = shuffleDeck(createDeck());
        
        const dealHand = () => {
            const hand = [];
            for (let i=0; i<7; i++) hand.push(deck.pop()!);
            return hand;
        }

        const playerHand = dealHand();
        const botHand = dealHand();

        let topCard = deck.pop()!;
        while(topCard.color === 'Wild') { // First card can't be a wild card
            deck.push(topCard);
            deck = shuffleDeck(deck);
            topCard = deck.pop()!;
        }

        setGameState({
            players: [
                { id: 'player', name: username || 'Player', hand: playerHand },
                { id: 'bot', name: 'Bot', hand: botHand },
            ],
            deck,
            discardPile: [topCard],
            activePlayerIndex: 0,
            activeColor: topCard.color,
            winner: null,
            isReversed: false,
            gameLog: ['Game started. Your turn!'],
        });
        setTurnMessage("Your Turn!");
    }, [username]);

    useEffect(() => {
        handleNewGame();
    }, [handleNewGame]);

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

            // Handle card actions
            let tempNextPlayerIndex = nextPlayer(newState);
            
            const handleAction = (value: UnoValue) => {
                const opponent = newState.players[tempNextPlayerIndex];
                switch(value) {
                    case 'Draw Two': {
                        for(let i = 0; i < 2; i++) {
                           if(newState.deck.length > 0) opponent.hand.push(newState.deck.pop());
                        }
                        const msg = `${opponent.id === 'player' ? 'You' : 'Bot'} drew 2 cards.`;
                        addGameLog(msg);
                        setTurnMessage(msg);
                        tempNextPlayerIndex = nextPlayer({ ...newState, activePlayerIndex: tempNextPlayerIndex });
                        break;
                    }
                    case 'Draw Four': {
                        for(let i = 0; i < 4; i++) {
                           if(newState.deck.length > 0) opponent.hand.push(newState.deck.pop());
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
                        newState.isReversed = !newState.isReversed;
                        addGameLog(`Play direction was reversed.`);
                        setTurnMessage("Direction Reversed!");
                        const direction = newState.isReversed ? -1 : 1;
                        let nextIndex = (newState.activePlayerIndex + direction) % newState.players.length;
                        if (nextIndex < 0) nextIndex = newState.players.length - 1;
                        tempNextPlayerIndex = nextIndex;
                        break;
                    }
                }
            }
            
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
            } else {
                if(newState.deck.length > 0) {
                    const card = newState.deck.pop()!;
                    bot.hand.push(card);
                    addGameLog("Bot drew a card.");
                    setTurnMessage("Bot drew a card");
                    
                    if (isCardPlayable(card, topCard, newState.activeColor)) {
                        let chosenColor = card.color;
                         if (card.color === 'Wild') {
                            chosenColor = colors[Math.floor(Math.random() * 4)];
                         }
                        setTimeout(() => playCard(card, chosenColor), 1000);
                    } else {
                         newState.activePlayerIndex = nextPlayer(newState);
                         addGameLog("Your turn.");
                         setTimeout(() => setTurnMessage("Your Turn"), 1600);
                    }
                } else {
                     newState.activePlayerIndex = nextPlayer(newState);
                     addGameLog("Your turn.");
                     setTurnMessage("Your Turn");
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

    if (!gameState) {
        return <div className="text-white text-center text-4xl">Loading Game...</div>;
    }

    const { players, discardPile, winner, activePlayerIndex, gameLog } = gameState;
    const player = players[0];
    const bot = players[1];
    const topCard = discardPile[discardPile.length - 1];
    const playerHasPlayableCard = player.hand.some(card => isCardPlayable(card, topCard, gameState.activeColor));
    
    const handStyle = (index: number, total: number) => {
        const maxWidth = window.innerWidth * (window.innerWidth < 768 ? 0.9 : 0.8); // More space on mobile
        const baseSpread = window.innerWidth < 768 ? 15 : 30; // Adjusted desktop spacing
        const maxSpread = Math.min(baseSpread, maxWidth / Math.max(total, 1));
        const spread = Math.max(window.innerWidth < 768 ? 8 : 10, maxSpread); // Adjusted minimums
        const totalWidth = total * spread;
        const startOffset = -totalWidth / 2;
        const translateX = startOffset + index * spread;
        return {
            transform: `translateX(${translateX}px)`,
        };
    };

    return (
        <div className="w-full h-full flex flex-col md:flex-col justify-end items-center text-white font-headline relative overflow-hidden">
            
            {/* Game Log Button - positioned under connect wallet */}
            <div className={cn("absolute top-16 right-2 z-20", winner && "hidden")}>
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
                <div className="mt-4">
                    <Button variant="secondary" className="w-full font-headline text-lg" onClick={handleNewGame}><RefreshCw className="mr-2 h-5 w-5"/> New Game</Button>
                </div>
            </div>

             <div className="flex-1 h-full flex flex-col justify-between items-center py-0 px-2 md:px-4">
                {/* Bot Area */}
                <div className="flex flex-col items-center gap-1 md:gap-2 h-12 md:h-16 lg:h-24 w-full">
                     <div className={cn("text-xs md:text-lg lg:text-xl uppercase tracking-wider bg-black/50 px-2 md:px-4 py-0.5 md:py-1 rounded-full transition-all duration-300", activePlayerIndex === 1 && "shadow-[0_0_20px_5px] shadow-yellow-400")}>{bot.name} ({bot.hand.length} cards)</div>
                    <div className="relative flex justify-center items-center h-12 md:h-20 lg:h-24 w-full">
                        {bot.hand.map((_, i) => (
                            <div key={i} className="absolute transition-transform duration-300 ease-out" style={{ ...handStyle(i, bot.hand.length), top: 0 }}>
                                <CardBack />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Center Area with Played and Draw Cards */}
                <div className="flex flex-col items-center gap-2 md:gap-4">
                    {/* Labels Row */}
                    <div className="flex items-center justify-center gap-6 md:gap-12">
                        <h3 className="text-xs md:text-lg lg:text-xl font-bold uppercase tracking-wider text-center w-16 md:w-24">Played</h3>
                        <h3 className="text-xs md:text-lg lg:text-xl font-bold uppercase tracking-wider text-center w-16 md:w-24">Draw</h3>
                    </div>
                    
                    {/* Cards Row */}
                    <div className="flex items-start justify-center gap-6 md:gap-12">
                        <div className="flex justify-center items-start w-16 md:w-24">
                            <CardComponent card={topCard} isPlayer={false} onClick={()=>{}} isPlayable={false} size="large" />
                        </div>
                        
                        <div className="flex justify-center items-start w-16 md:w-24">
                            <div onClick={activePlayerIndex === 0 ? handleDrawCard : undefined} className={cn("transition-transform hover:scale-105 relative", activePlayerIndex === 0 && !playerHasPlayableCard ? "cursor-pointer" : "cursor-not-allowed")} style={{transform: 'translateX(-32px)'}}>
                               {Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className="absolute" style={{ top: `${i * 2}px`, left: `${i * 2}px` }}>
                                        <CardBack size="large" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Player Area */}
                <div className="flex flex-col items-center gap-1 md:gap-2 w-full h-16 md:h-24 lg:h-32 pb-0 mb-2 md:mb-4">
                    <div ref={playerHandRef} className="relative flex justify-center items-center h-12 md:h-20 lg:h-24 w-full">
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
                                    onClick={(e) => handlePlayCard(i, e)}
                                    isPlayable={activePlayerIndex === 0 && isCardPlayable(card, topCard, gameState.activeColor)}
                                    isLastCard={player.hand.length === 1}
                                />
                            </div>)
                        )}
                    </div>
                     <div className={cn("text-xs md:text-lg lg:text-xl uppercase tracking-wider bg-black/50 px-4 py-1 rounded-full transition-all duration-300", activePlayerIndex === 0 && "shadow-[0_0_20px_5px] shadow-yellow-400")}>{player.name} ({player.hand.length} cards)</div>
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
            {winner && (
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-4 animate-fade-in rounded-xl z-30">
                    <h2 className="text-6xl md:text-9xl font-headline text-accent uppercase tracking-wider" style={{ WebkitTextStroke: '4px black' }}>UNO!</h2>
                    <p className="text-2xl md:text-4xl text-white -mt-4">{winner} Wins!</p>
                    <div className="flex gap-4">
                        <Button size="lg" onClick={handleNewGame} className="font-headline text-2xl"><RefreshCw className="mr-2"/> New Game</Button>
                    </div>
                </div>
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
            <MintSuccessModal
                isOpen={showMintSuccess}
                onClose={() => setShowMintSuccess(false)}
                txHash={mintTxHash}
                gameName="UNO"
            />
        </div>
    );
}
