"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useFirebaseMultiplayer } from '@/hooks/use-firebase-multiplayer';
import { UnoEndGameScreen } from '../UnoEndGameScreen';

type UnoColor = 'red' | 'blue' | 'green' | 'yellow';
type UnoCardType = 'number' | 'skip' | 'reverse' | 'draw2' | 'wild' | 'wild4';

interface UnoCard {
  id: string;
  color: UnoColor | 'black';
  value: string;
  type: UnoCardType;
}

interface Lobby {
  id: string;
  gameType: 'chess' | 'uno';
  player1Id: string;
  player1Name: string;
  player2Id?: string;
  player2Name?: string;
  status: 'waiting' | 'playing' | 'finished';
  createdAt: any; // Firebase timestamp
  player1Color?: 'white' | 'black';
  player2Color?: 'white' | 'black';
}

interface MultiplayerUnoClientProps {
  lobby: Lobby;
  isHost: boolean;
  onGameEnd: () => void;
}

const createDeck = (): UnoCard[] => {
  const deck: UnoCard[] = [];
  const colors: UnoColor[] = ['red', 'blue', 'green', 'yellow'];
  
  // Number cards (0-9)
  colors.forEach(color => {
    for (let i = 0; i <= 9; i++) {
      deck.push({
        id: `${color}-${i}-1`,
        color,
        value: i.toString(),
        type: 'number'
      });
      if (i !== 0) { // Two of each number except 0
        deck.push({
          id: `${color}-${i}-2`,
          color,
          value: i.toString(),
          type: 'number'
        });
      }
    }
    
    // Action cards (2 of each)
    ['skip', 'reverse', 'draw2'].forEach(action => {
      for (let i = 1; i <= 2; i++) {
        deck.push({
          id: `${color}-${action}-${i}`,
          color,
          value: action,
          type: action as UnoCardType
        });
      }
    });
  });
  
  // Wild cards (4 of each)
  for (let i = 1; i <= 4; i++) {
    deck.push({
      id: `wild-${i}`,
      color: 'black',
      value: 'wild',
      type: 'wild'
    });
    deck.push({
      id: `wild4-${i}`,
      color: 'black',
      value: 'wild4',
      type: 'wild4'
    });
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

export const MultiplayerUnoClient = ({ lobby, isHost, onGameEnd }: MultiplayerUnoClientProps) => {
  const [deck, setDeck] = useState<UnoCard[]>([]);
  const [playerHand, setPlayerHand] = useState<UnoCard[]>([]);
  const [opponentHandSize, setOpponentHandSize] = useState(7);
  const [discardPile, setDiscardPile] = useState<UnoCard[]>([]);
  const [currentColor, setCurrentColor] = useState<UnoColor>('red');
  const [isMyTurn, setIsMyTurn] = useState(isHost);
  const [gameDirection, setGameDirection] = useState(1); // 1 for normal, -1 for reverse
  const [winner, setWinner] = useState<string | null>(null);
  const [showEndGameScreen, setShowEndGameScreen] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [pendingWildCard, setPendingWildCard] = useState<UnoCard | null>(null);
  const [opponentName, setOpponentName] = useState('');
  const [gameLog, setGameLog] = useState<string[]>(['Game started!']);
  
  const { sendGameMove, onGameMove, leaveLobby } = useFirebaseMultiplayer();

  const addGameLog = useCallback((message: string) => {
    setGameLog(prev => [...prev, message]);
  }, []);

  const initializeGame = useCallback(() => {
    if (!isHost) return; // Only host initializes the game
    
    const newDeck = shuffleDeck(createDeck());
    const playerCards = newDeck.splice(0, 7);
    const opponentCards = newDeck.splice(0, 7);
    const firstCard = newDeck.splice(0, 1)[0];
    
    setDeck(newDeck);
    setPlayerHand(playerCards);
    setDiscardPile([firstCard]);
    setCurrentColor(firstCard.color as UnoColor);
    
    // Send initial game state to opponent
    sendGameMove(lobby.id, {
      type: 'uno-init',
      deck: newDeck,
      opponentCards: playerCards, // What opponent sees as player's cards
      playerCards: opponentCards, // What opponent gets as their cards
      firstCard,
      currentColor: firstCard.color
    });
    
    addGameLog('Game initialized!');
  }, [isHost, lobby.id, sendGameMove, addGameLog]);

  useEffect(() => {
    setOpponentName(isHost ? (lobby.player2Name || 'Player') : lobby.player1Name);
    
    if (isHost) {
      initializeGame();
    }
    
    // Listen for opponent moves
    onGameMove((moveData: any) => {
      if (moveData.type === 'uno-init' && !isHost) {
        setDeck(moveData.deck);
        setPlayerHand(moveData.playerCards);
        setOpponentHandSize(moveData.opponentCards.length);
        setDiscardPile([moveData.firstCard]);
        setCurrentColor(moveData.currentColor);
        addGameLog('Game initialized!');
      } else if (moveData.type === 'uno-play-card') {
        setDiscardPile(prev => [...prev, moveData.card]);
        setCurrentColor(moveData.newColor);
        setOpponentHandSize(moveData.opponentHandSize);
        setIsMyTurn(true);
        addGameLog(`${opponentName} played ${moveData.card.value}`);
        
        // Handle special cards
        if (moveData.card.type === 'skip') {
          addGameLog('You were skipped!');
          setIsMyTurn(false);
        } else if (moveData.card.type === 'reverse') {
          setGameDirection(prev => prev * -1);
          addGameLog('Direction reversed!');
        } else if (moveData.card.type === 'draw2') {
          drawCards(2);
          addGameLog('You drew 2 cards!');
          setIsMyTurn(false);
        } else if (moveData.card.type === 'wild4') {
          drawCards(4);
          addGameLog('You drew 4 cards!');
          setIsMyTurn(false);
        }
        
        // Check if opponent won
        if (moveData.opponentHandSize === 0) {
          setWinner(opponentName);
          setShowEndGameScreen(true);
        }
      } else if (moveData.type === 'uno-draw-card') {
        setOpponentHandSize(moveData.opponentHandSize);
        addGameLog(`${opponentName} drew a card`);
        setIsMyTurn(true);
      } else if (moveData.type === 'game-end') {
        setWinner(moveData.winner);
        setShowEndGameScreen(true);
      }
    });
  }, [lobby, isHost, opponentName, onGameMove, initializeGame, addGameLog]);

  const drawCards = useCallback((count: number) => {
    const newCards = deck.splice(0, count);
    setPlayerHand(prev => [...prev, ...newCards]);
    setDeck(prev => prev.slice(count));
  }, [deck]);

  const canPlayCard = (card: UnoCard): boolean => {
    const topCard = discardPile[discardPile.length - 1];
    return (
      card.color === 'black' ||
      card.color === currentColor ||
      card.value === topCard.value
    );
  };

  const handlePlayCard = (card: UnoCard) => {
    if (!isMyTurn || !canPlayCard(card)) return;
    
    if (card.type === 'wild' || card.type === 'wild4') {
      setPendingWildCard(card);
      setShowColorPicker(true);
      return;
    }
    
    playCard(card, currentColor);
  };

  const playCard = (card: UnoCard, newColor: UnoColor) => {
    const newPlayerHand = playerHand.filter(c => c.id !== card.id);
    setPlayerHand(newPlayerHand);
    setDiscardPile(prev => [...prev, card]);
    setCurrentColor(newColor);
    setIsMyTurn(false);
    
    // Send move to opponent
    sendGameMove(lobby.id, {
      type: 'uno-play-card',
      card,
      newColor,
      opponentHandSize: newPlayerHand.length
    });
    
    addGameLog(`You played ${card.value}`);
    
    // Check if player won
    if (newPlayerHand.length === 0) {
      setWinner('You');
      setShowEndGameScreen(true);
      sendGameMove(lobby.id, {
        type: 'game-end',
        winner: 'You'
      });
    }
    
    // Handle special cards for opponent
    if (card.type === 'skip') {
      addGameLog(`${opponentName} was skipped!`);
      setIsMyTurn(true);
    } else if (card.type === 'reverse') {
      setGameDirection(prev => prev * -1);
      addGameLog('Direction reversed!');
      setIsMyTurn(true);
    }
  };

  const handleColorPick = (color: UnoColor) => {
    if (pendingWildCard) {
      playCard(pendingWildCard, color);
      setPendingWildCard(null);
      setShowColorPicker(false);
    }
  };

  const handleDrawCard = () => {
    if (!isMyTurn || deck.length === 0) return;
    
    drawCards(1);
    setIsMyTurn(false);
    
    sendGameMove(lobby.id, {
      type: 'uno-draw-card',
      opponentHandSize: playerHand.length + 1
    });
    
    addGameLog('You drew a card');
  };

  const handleLeaveGame = () => {
    leaveLobby(lobby.id);
    onGameEnd();
  };

  const getCardColor = (card: UnoCard) => {
    switch (card.color) {
      case 'red': return 'bg-red-500';
      case 'blue': return 'bg-blue-500';
      case 'green': return 'bg-green-500';
      case 'yellow': return 'bg-yellow-500';
      case 'black': return 'bg-gray-800';
      default: return 'bg-gray-500';
    }
  };

  const getCurrentColorDisplay = () => {
    switch (currentColor) {
      case 'red': return 'bg-red-500';
      case 'blue': return 'bg-blue-500';
      case 'green': return 'bg-green-500';
      case 'yellow': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  if (showEndGameScreen) {
    return (
      <UnoEndGameScreen
        score={playerHand.length === 0 ? 100 : 0}
        onNewGame={() => {
          // Reset game state
          setShowEndGameScreen(false);
          setWinner(null);
          if (isHost) {
            initializeGame();
          }
        }}
        onBackToMenu={handleLeaveGame}
        isMinting={false}
        mintTxHash=""
        tokensEarned={winner === 'You' ? 50 : 0}
      />
    );
  }

  return (
    <div className="w-full h-screen bg-red-800 bg-gradient-to-br from-red-900 via-red-700 to-orange-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Color Picker Modal */}
      {showColorPicker && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 space-y-4">
            <h3 className="text-xl font-bold text-black text-center">Choose a color</h3>
            <div className="grid grid-cols-2 gap-4">
              {(['red', 'blue', 'green', 'yellow'] as UnoColor[]).map(color => (
                <Button
                  key={color}
                  onClick={() => handleColorPick(color)}
                  className={cn(
                    "w-20 h-20 rounded-lg text-white font-bold",
                    getCardColor({ color } as UnoCard)
                  )}
                >
                  {color.toUpperCase()}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Game Info */}
      <div className="absolute top-4 left-4 bg-black/50 rounded-lg p-4 text-white">
        <div className="space-y-2 text-sm">
          <div>You: {playerHand.length} cards</div>
          <div>{opponentName}: {opponentHandSize} cards</div>
          <div className="flex items-center gap-2">
            Current color: 
            <div className={cn("w-4 h-4 rounded", getCurrentColorDisplay())}></div>
          </div>
          <div className={cn("font-bold", isMyTurn ? "text-green-400" : "text-yellow-400")}>
            {isMyTurn ? 'Your turn' : `${opponentName}'s turn`}
          </div>
        </div>
      </div>

      {/* Leave Game Button */}
      <div className="absolute top-4 right-4">
        <Button onClick={handleLeaveGame} variant="destructive">
          Leave Game
        </Button>
      </div>

      {/* Opponent's Hand */}
      <div className="mb-8">
        <h3 className="text-white text-center mb-4 font-bold">{opponentName}</h3>
        <div className="flex gap-1">
          {Array.from({ length: opponentHandSize }).map((_, i) => (
            <div
              key={i}
              className="w-12 h-16 bg-blue-900 border-2 border-white rounded-lg flex items-center justify-center"
            >
              <span className="text-white text-xs">UNO</span>
            </div>
          ))}
        </div>
      </div>

      {/* Discard Pile and Draw Pile */}
      <div className="flex gap-8 mb-8">
        <div className="text-center">
          <h4 className="text-white mb-2">Discard Pile</h4>
          {discardPile.length > 0 && (
            <div className={cn(
              "w-20 h-28 rounded-lg border-2 border-white flex items-center justify-center text-white font-bold",
              getCardColor(discardPile[discardPile.length - 1])
            )}>
              {discardPile[discardPile.length - 1].value.toUpperCase()}
            </div>
          )}
        </div>
        
        <div className="text-center">
          <h4 className="text-white mb-2">Draw Pile</h4>
          <Button
            onClick={handleDrawCard}
            disabled={!isMyTurn || deck.length === 0}
            className="w-20 h-28 bg-gray-800 border-2 border-white rounded-lg text-white font-bold"
          >
            DRAW
          </Button>
        </div>
      </div>

      {/* Player's Hand */}
      <div>
        <h3 className="text-white text-center mb-4 font-bold">Your Hand</h3>
        <div className="flex gap-2 flex-wrap justify-center max-w-4xl">
          {playerHand.map((card) => (
            <Button
              key={card.id}
              onClick={() => handlePlayCard(card)}
              disabled={!isMyTurn || !canPlayCard(card)}
              className={cn(
                "w-16 h-24 rounded-lg border-2 border-white text-white font-bold text-xs transition-all",
                getCardColor(card),
                canPlayCard(card) && isMyTurn ? "hover:scale-105 cursor-pointer" : "opacity-50 cursor-not-allowed"
              )}
            >
              {card.value.toUpperCase()}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};