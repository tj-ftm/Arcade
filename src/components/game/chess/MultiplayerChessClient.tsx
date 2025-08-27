"use client";

import { useState, useEffect, useCallback } from 'react';
import { Chess } from 'chess.js';
import type { Square, PieceSymbol, Color, Move } from 'chess.js';
import { Button } from '@/components/ui/button';
import { RefreshCw, PanelLeft, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFirebaseMultiplayer } from '@/hooks/use-firebase-multiplayer';
import { useWeb3 } from '@/components/web3/Web3Provider';
import { ChessEndGameScreen } from './ChessEndGameScreen';
import { useIsMobile } from '@/hooks/use-mobile';

const pieceToUnicode: Record<PieceSymbol, string> = {
  p: '♙', r: '♖', n: '♘', b: '♗', q: '♕', k: '♔',
};

const pieceValues: Record<PieceSymbol, number> = {
  p: 1, n: 3, b: 3, r: 5, q: 9, k: 900,
};

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

interface ChessGameState {
  gameId: string;
  player1: {
    id: string;
    name: string;
    color: Color;
  };
  player2: {
    id: string;
    name: string;
    color: Color;
  };
  currentTurn: Color;
  activePlayerIndex: number; // 0 for player1, 1 for player2
  gameLog: string[];
  fen: string; // Chess position in FEN notation
  moveCount: number;
  winner: string | null;
  gameStartTime: number;
  lastMoveTime: number;
}

interface MultiplayerChessClientProps {
  lobby: Lobby;
  isHost: boolean;
  onGameEnd: (gameResult?: {
    winnerId: string;
    winnerName: string;
    winnerAddress: string;
    loserId: string;
    loserName: string;
    loserAddress: string;
  }) => void;
  showGameLogModal?: boolean;
  onCloseGameLogModal?: () => void;
}

const ChessSquare = ({ piece, square, isLight, onSquareClick, isSelected, isPossibleMove }: { 
  piece: { type: PieceSymbol; color: Color } | null; 
  square: Square; 
  isLight: boolean; 
  onSquareClick: (square: Square) => void; 
  isSelected: boolean; 
  isPossibleMove: boolean; 
}) => {
  const pieceSymbol = piece ? pieceToUnicode[piece.type] : '';
  const isWhitePiece = piece?.color === 'w';
  
  return (
    <div
      className={cn(
        "w-full h-full aspect-square flex items-center justify-center text-3xl sm:text-4xl md:text-5xl lg:text-6xl cursor-pointer transition-all duration-200",
        isLight ? "bg-purple-200/80" : "bg-purple-800/80",
        isSelected && "ring-4 ring-yellow-400 bg-yellow-200/50",
        isPossibleMove && "ring-2 ring-green-400 bg-green-200/30",
        "hover:brightness-110"
      )}
      onClick={() => onSquareClick(square)}
    >
      <span className={cn(
        "select-none font-bold drop-shadow-lg",
        isWhitePiece ? "text-white" : "text-black",
        piece && "hover:scale-110 transition-transform"
      )}>
        {pieceSymbol}
      </span>
    </div>
  );
};

export const MultiplayerChessClient = ({ lobby, isHost, onGameEnd, showGameLogModal = false, onCloseGameLogModal }: MultiplayerChessClientProps) => {
  const isMobile = useIsMobile();
  console.log('🏁 [CHESS MULTIPLAYER] Component initialized with:', {
    lobbyId: lobby.id,
    lobbyStatus: lobby.status,
    player1Id: lobby.player1Id,
    player1Name: lobby.player1Name,
    player2Id: lobby.player2Id,
    player2Name: lobby.player2Name,
    isHost: isHost,
    hasPlayer2: !!lobby.player2Id
  });
  console.log('🔍 [CHESS MULTIPLAYER] Loading condition check:', {
    hasNoPlayer2: !lobby.player2Id,
    statusNotPlaying: lobby.status !== 'playing',
    shouldShowLoading: !lobby.player2Id && lobby.status !== 'playing'
  });
  const [game] = useState(() => new Chess());
  const [board, setBoard] = useState(() => {
    const chessGame = new Chess();
    return chessGame.board();
  });
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<Square[]>([]);
  const [chessGameState, setChessGameState] = useState<ChessGameState | null>(null);
  const [score, setScore] = useState(0);
  const [isLogVisible, setIsLogVisible] = useState(false);
  const [showEndGameScreen, setShowEndGameScreen] = useState(false);
  const [isLoadingGame, setIsLoadingGame] = useState(true);
  const [gameStartTime, setGameStartTime] = useState<number>(0);
  const [turnMessage, setTurnMessage] = useState<string | null>(null);
  
  const { account, username } = useWeb3();
  const currentUserId = account || `guest-${Date.now()}`;
  
  const { sendGameMove, onGameMove, leaveLobby, onLobbyJoined, setupGameMovesListener, endGame } = useFirebaseMultiplayer();

  // Set up Firebase game moves listener
  useEffect(() => {
    console.log('🔗 [CHESS MULTIPLAYER] Setting up game moves listener for lobby:', lobby.id);
    setupGameMovesListener(lobby.id);
  }, [lobby.id, setupGameMovesListener]);

  // Initialize board from game instance
  useEffect(() => {
    setBoard(game.board());
  }, [game]);

  // Game initialization logic similar to UNO
  useEffect(() => {
    console.log('🔍 [CHESS MULTIPLAYER] Checking initialization conditions:', {
      hasGameState: !!chessGameState,
      isHost,
      player2Id: lobby.player2Id,
      status: lobby.status
    });
    
    if (!chessGameState) {
      console.log('🎮 [CHESS MULTIPLAYER] No game state found, initializing game');
      
      // Add a delay to ensure Firebase listeners are set up
      setTimeout(() => {
        // Check if game state still doesn't exist (no one else initialized it)
        if (!chessGameState) {
          console.log('🎮 [CHESS MULTIPLAYER] Initializing game now');
          initializeChessGame();
        } else {
          console.log('🎮 [CHESS MULTIPLAYER] Game state already exists, skipping initialization');
        }
      }, 1000); // 1 second delay
    } else {
      console.log('✅ [CHESS MULTIPLAYER] Game state already exists');
    }
  }, [chessGameState, isHost]);

  // Handle loading state - always show game interface
  useEffect(() => {
    console.log('🎮 [CHESS MULTIPLAYER] Always showing game interface, initialization will happen in background');
    setIsLoadingGame(false); // Always show game interface
  }, []);

  // Auto-clear turn messages
  useEffect(() => {
    if (turnMessage) {
      const timer = setTimeout(() => {
        setTurnMessage(null);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [turnMessage]);

  // Listen for game state updates from opponent
  useEffect(() => {
    const unsubscribe = onGameMove((moveData: any) => {
      console.log('📨 [CHESS MULTIPLAYER] Received move data:', moveData);
      if (moveData.type === 'chess-init' && moveData.gameState) {
        console.log('🎮 [CHESS MULTIPLAYER] Receiving initial game state');
        const receivedGameState = moveData.gameState;
        setChessGameState(receivedGameState);
        
        // Load the game position from FEN
        game.load(receivedGameState.fen);
        setBoard(game.board());
        setIsLoadingGame(false);
        
        // Show initial turn message
        const isMyTurn = (receivedGameState.activePlayerIndex === 0 && isHost) || (receivedGameState.activePlayerIndex === 1 && !isHost);
        const currentPlayerName = receivedGameState.activePlayerIndex === 0 ? receivedGameState.player1.name : receivedGameState.player2.name;
        setTurnMessage(isMyTurn ? "Your Turn!" : `${currentPlayerName}'s Turn!`);
        
        console.log('🔄 [CHESS MULTIPLAYER] Game state received and applied');
      } else if (moveData.type === 'chess-update' && moveData.gameState) {
        console.log('🎮 [CHESS MULTIPLAYER] Receiving game state update');
        const newGameState = moveData.gameState;
        setChessGameState(newGameState);
        
        // Load the updated position from FEN
        game.load(newGameState.fen);
        setBoard(game.board());
        
        // Show turn message based on updated game state
        const isMyTurn = (newGameState.activePlayerIndex === 0 && isHost) || (newGameState.activePlayerIndex === 1 && !isHost);
        const currentPlayerName = newGameState.activePlayerIndex === 0 ? newGameState.player1.name : newGameState.player2.name;
        setTurnMessage(isMyTurn ? "Your Turn!" : `${currentPlayerName}'s Turn!`);
        
        console.log('🔄 [CHESS MULTIPLAYER] Game state updated and synchronized');
      } else if (moveData.type === 'chess-move') {
        console.log('🎮 [CHESS MULTIPLAYER] Receiving individual move');
        try {
          const move = game.move(moveData.move);
          if (move && chessGameState) {
            setBoard(game.board());
            
            // Update game state
            const newGameState = { ...chessGameState };
            newGameState.fen = game.fen();
            newGameState.moveCount += 1;
            newGameState.currentTurn = game.turn();
            // Switch to next player (UNO-style)
            newGameState.activePlayerIndex = newGameState.activePlayerIndex === 0 ? 1 : 0;
            newGameState.lastMoveTime = Date.now();
            
            const opponentName = isHost ? 
              (newGameState.player2.name || 'Player 2') : 
              newGameState.player1.name;
            newGameState.gameLog.push(`${opponentName}: ${move.san}`);
            
            setChessGameState(newGameState);
            
            // Show turn message - now it's my turn
            setTurnMessage("Your Turn!");
            
            checkGameState();
          }
        } catch (error) {
          console.error('Invalid move received:', error);
        }
      } else if (moveData.type === 'game-end') {
        if (chessGameState) {
          const newGameState = { ...chessGameState };
          newGameState.winner = moveData.winner;
          setChessGameState(newGameState);
        }
        setShowEndGameScreen(true);
      }
    });

    return unsubscribe;
  }, [onGameMove, isHost, game, chessGameState]);

  const initializeChessGame = () => {
    // Randomly assign colors - host gets random color, guest gets opposite
    const hostIsWhite = Math.random() < 0.5;
    const player1Color = hostIsWhite ? 'w' : 'b';
    const player2Color = hostIsWhite ? 'b' : 'w';
    
    console.log('🎨 [CHESS MULTIPLAYER] Color assignment:', {
      isHost,
      hostIsWhite,
      player1Color,
      player2Color
    });

    // Ensure proper player assignment: lobby creator = player1, joiner = player2
    const player1 = {
      id: lobby.player1Id,
      name: lobby.player1Name,
      color: player1Color
    };
    
    const player2 = {
      id: lobby.player2Id || 'player2',
      name: lobby.player2Name || 'Player 2',
      color: player2Color
    };
    
    console.log('🎮 [CHESS MULTIPLAYER] Player assignment - Player1 (creator):', player1.id, player1.name, player1.color, '| Player2 (joiner):', player2.id, player2.name, player2.color);

    const initialGameState: ChessGameState = {
      gameId: lobby.id,
      player1,
      player2,
      currentTurn: 'w', // White always starts
      activePlayerIndex: player1Color === 'w' ? 0 : 1, // Player with white pieces starts
      gameLog: ['Game started!', `${player1Color === 'w' ? player1.name : player2.name} (White) goes first!`],
      fen: game.fen(),
      moveCount: 0,
      winner: null,
      gameStartTime: Date.now(),
      lastMoveTime: Date.now()
    };

    setChessGameState(initialGameState);
    setGameStartTime(Date.now());
    
    // Show initial turn message
    const isMyTurn = (initialGameState.activePlayerIndex === 0 && isHost) || (initialGameState.activePlayerIndex === 1 && !isHost);
    const whitePlayerName = player1Color === 'w' ? player1.name : player2.name;
    setTurnMessage(isMyTurn ? "Your Turn!" : `${whitePlayerName}'s Turn!`);
    
    // Send initial game state to opponent
    sendGameMove(lobby.id, {
      type: 'chess-init',
      gameState: initialGameState
    });
    console.log('🚀 [CHESS MULTIPLAYER] Game initialized and sent to opponent (player2Id:', lobby.player2Id || 'missing', ')');
  };

  const addGameLog = useCallback((message: string) => {
    if (chessGameState) {
      const newGameState = { ...chessGameState };
      newGameState.gameLog = [...chessGameState.gameLog, message];
      if (newGameState.gameLog.length > 30) newGameState.gameLog.shift(); // Keep log size manageable
      setChessGameState(newGameState);
    }
  }, [chessGameState]);

  const calculateScore = useCallback(() => {
    if (!chessGameState) return 0;
    
    let totalScore = 0;
    const currentBoard = game.board();
    const myColor = isHost ? chessGameState.player1.color : chessGameState.player2.color;
    
    currentBoard.forEach(row => {
      row.forEach(square => {
        if (square && square.color === myColor) {
          totalScore += pieceValues[square.type];
        }
      });
    });
    
    return totalScore + chessGameState.moveCount * 10;
  }, [game, chessGameState, isHost]);

  const checkGameState = useCallback(() => {
    if (!chessGameState) return;
    
    // Check for check condition
    if (game.isCheck() && !game.isGameOver()) {
      setTurnMessage("CHECK!");
    }
    
    if (game.isGameOver()) {
      let gameWinner = null;
      let endMessage = '';
      
      if (game.isCheckmate()) {
        gameWinner = game.turn() === 'w' ? 'Black' : 'White';
        endMessage = `Checkmate! ${gameWinner} wins!`;
        setTurnMessage(`CHECKMATE! ${gameWinner} Wins!`);
      } else if (game.isDraw()) {
        endMessage = 'Game ended in a draw!';
        gameWinner = 'Draw';
        setTurnMessage("DRAW!");
      } else if (game.isStalemate()) {
        endMessage = 'Stalemate! Game is a draw!';
        gameWinner = 'Draw';
        setTurnMessage("STALEMATE!");
      }
      
      // Update game state with winner
      const newGameState = { ...chessGameState };
      newGameState.winner = gameWinner;
      newGameState.gameLog.push(endMessage);
      setChessGameState(newGameState);
      
      setScore(calculateScore());
      
      // Delay showing end game screen to show the final message
      setTimeout(() => {
        setShowEndGameScreen(true);
      }, 2000);
      
      // Record game result in Firebase (only if not a draw)
      if (gameWinner && gameWinner !== 'Draw') {
        const winnerId = gameWinner === 'White' ? 
          (chessGameState.player1.color === 'w' ? chessGameState.player1.id : chessGameState.player2.id) :
          (chessGameState.player1.color === 'b' ? chessGameState.player1.id : chessGameState.player2.id);
        const winnerName = gameWinner === 'White' ? 
          (chessGameState.player1.color === 'w' ? chessGameState.player1.name : chessGameState.player2.name) :
          (chessGameState.player1.color === 'b' ? chessGameState.player1.name : chessGameState.player2.name);
        const loserId = gameWinner === 'White' ? 
          (chessGameState.player1.color === 'w' ? chessGameState.player2.id : chessGameState.player1.id) :
          (chessGameState.player1.color === 'b' ? chessGameState.player2.id : chessGameState.player1.id);
        const loserName = gameWinner === 'White' ? 
          (chessGameState.player1.color === 'w' ? chessGameState.player2.name : chessGameState.player1.name) :
          (chessGameState.player1.color === 'b' ? chessGameState.player2.name : chessGameState.player1.name);
        
        console.log('🏆 [CHESS MULTIPLAYER] Game ended - Winner:', winnerName, 'Loser:', loserName);
        
        // Call endGame to record statistics and cleanup lobby
        endGame(lobby.id, winnerId, winnerName, loserId, loserName);
        
        // Call onGameEnd with game result
        const gameResult = {
          winnerId,
          winnerName,
          winnerAddress: winnerId,
          loserId,
          loserName,
          loserAddress: loserId
        };
        
        setTimeout(() => {
          onGameEnd(gameResult);
        }, 2000);
      } else if (gameWinner === 'Draw') {
        // For draws, we still want to cleanup the lobby but not record win/loss stats
        console.log('🤝 [CHESS MULTIPLAYER] Game ended in draw');
        endGame(lobby.id, chessGameState.player1.id, `${chessGameState.player1.name} (Draw)`, chessGameState.player1.id, `${chessGameState.player1.name} (Draw)`);
        
        // For draws, call onGameEnd without parameters
        setTimeout(() => {
          onGameEnd();
        }, 2000);
      }
      
      // Notify opponent of game end
      sendGameMove(lobby.id, {
        type: 'game-end',
        winner: gameWinner
      });
    }
  }, [game, chessGameState, calculateScore, lobby.id, sendGameMove, endGame]);

  const handleNewGame = useCallback(() => {
    if (!chessGameState) return;
    
    game.reset();
    setBoard(game.board());
    setSelectedSquare(null);
    setPossibleMoves([]);
    setScore(0);
    setShowEndGameScreen(false);
    
    // Reset game state
    const newGameState = { ...chessGameState };
    newGameState.fen = game.fen();
    newGameState.moveCount = 0;
    newGameState.currentTurn = 'w';
    newGameState.activePlayerIndex = newGameState.player1.color === 'w' ? 0 : 1;
    newGameState.gameLog = ['New game started!', `${newGameState.player1.color === 'w' ? newGameState.player1.name : newGameState.player2.name} (White) goes first!`];
    newGameState.winner = null;
    newGameState.gameStartTime = Date.now();
    newGameState.lastMoveTime = Date.now();
    
    setChessGameState(newGameState);
    
    // Send updated game state to opponent
    sendGameMove(lobby.id, {
      type: 'chess-update',
      gameState: newGameState
    });
  }, [game, chessGameState, lobby.id, sendGameMove]);

  const handleSquareClick = (square: Square) => {
    if (!chessGameState || chessGameState.winner) return;
    
    // Use UNO-style turn validation with activePlayerIndex
    const isMyTurn = (chessGameState.activePlayerIndex === 0 && isHost) || (chessGameState.activePlayerIndex === 1 && !isHost);
    const myColor = isHost ? chessGameState.player1.color : chessGameState.player2.color;
    
    if (!isMyTurn) {
      console.log('🚫 [CHESS MULTIPLAYER] Not your turn!', { activePlayerIndex: chessGameState.activePlayerIndex, isHost, isMyTurn });
      setTurnMessage("Not your turn!");
      return;
    }

    if (selectedSquare) {
      try {
        const move = game.move({
          from: selectedSquare,
          to: square,
          promotion: 'q', // auto-promote to queen
        });

        if (move) {
          setBoard(game.board());
          
          // Update game state
          const newGameState = { ...chessGameState };
          newGameState.fen = game.fen();
          newGameState.moveCount += 1;
          newGameState.currentTurn = game.turn();
          // Switch to next player (UNO-style)
          newGameState.activePlayerIndex = newGameState.activePlayerIndex === 0 ? 1 : 0;
          newGameState.lastMoveTime = Date.now();
          
          const myName = isHost ? newGameState.player1.name : newGameState.player2.name;
          newGameState.gameLog.push(`${myName}: ${move.san}`);
          
          setChessGameState(newGameState);
          
          console.log('♟️ [CHESS MULTIPLAYER] Move made:', move.san, 'New turn:', game.turn());
          
          // Show turn message - now it's opponent's turn
          const opponentName = isHost ? (newGameState.player2.name || 'Player 2') : newGameState.player1.name;
          setTurnMessage(`${opponentName}'s Turn!`);
          
          // Send updated game state to opponent (robust synchronization like UNO)
          sendGameMove(lobby.id, {
            type: 'chess-update',
            gameState: newGameState,
            move: move // Include move for logging
          });
          
          checkGameState();
        }
      } catch (e) {
        console.log('❌ [CHESS MULTIPLAYER] Invalid move attempted');
        // Invalid move, maybe they clicked on another of their pieces
        const piece = game.get(square);
        if (piece && piece.color === myColor) {
          setSelectedSquare(square);
          const moves = game.moves({ square, verbose: true });
          setPossibleMoves(moves.map(m => m.to));
          return;
        }
      } finally {
        setSelectedSquare(null);
        setPossibleMoves([]);
      }
    } else {
      const piece = game.get(square);
      if (piece && piece.color === myColor) {
        setSelectedSquare(square);
        const moves = game.moves({ square, verbose: true });
        setPossibleMoves(moves.map(m => m.to));
      }
    }
  };

  const handleLeaveGame = () => {
    leaveLobby(lobby.id, currentUserId);
    onGameEnd();
  };

  return (
    <div className="w-full h-full flex flex-col md:flex-row justify-between items-center text-white font-headline relative overflow-hidden pt-16 md:pt-8">
      {isLoadingGame ? (
        <div className="flex flex-col items-center justify-center w-full h-full">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mb-4"></div>
          <h2 className="text-4xl font-bold mb-4">
            {(!lobby.player2Id && lobby.status !== 'playing') ? 'Waiting for opponent...' : 'Starting game...'}
          </h2>
          <p className="text-lg">Lobby ID: {lobby.id}</p>
          {lobby.player2Id && (
            <p className="text-sm text-white/70 mt-2">Both players connected, initializing game...</p>
          )}
          <div className="mt-4 text-xs text-white/50 space-y-1">
            <p>🔍 Debug Info:</p>
            <p>Player 1: {lobby.player1Name} ({lobby.player1Id})</p>
            <p>Player 2: {lobby.player2Name || 'None'} ({lobby.player2Id || 'None'})</p>
            <p>Status: {lobby.status}</p>
            <p>Is Host: {isHost ? 'Yes' : 'No'}</p>
            <p>Loading: {isLoadingGame ? 'Yes' : 'No'}</p>
          </div>
        </div>
      ) : (
        !showEndGameScreen && (
          <>
            {/* Game Info Sidebar - Hidden on mobile */}
            <div className={cn(
              "h-full flex flex-col bg-black/20 backdrop-blur-sm border border-purple-400/30 rounded-lg p-4",
              isMobile ? "hidden" : "w-80"
            )}>
              <div className="mb-4">
              <h3 className="text-xl font-bold mb-2">Game Info</h3>
              {chessGameState && (
                <>
                  <div className="text-sm">
                    <span className="text-white/70">You are: </span>
                    <span className={cn("font-bold", (isHost ? chessGameState.player1.color : chessGameState.player2.color) === 'w' ? "text-white" : "text-gray-400")}>
                      {(isHost ? chessGameState.player1.color : chessGameState.player2.color) === 'w' ? 'White' : 'Black'}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-white/70">Opponent: </span>
                    <span className="font-bold">{isHost ? (chessGameState.player2.name || 'Player 2') : chessGameState.player1.name}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-white/70">Turn: </span>
                    <span className={cn("font-bold", ((chessGameState.activePlayerIndex === 0 && isHost) || (chessGameState.activePlayerIndex === 1 && !isHost)) ? "text-green-400" : "text-yellow-400")}>
                      {((chessGameState.activePlayerIndex === 0 && isHost) || (chessGameState.activePlayerIndex === 1 && !isHost)) ? 'Your turn' : `${isHost ? (chessGameState.player2.name || 'Player 2') : chessGameState.player1.name}'s turn`}
                    </span>
                  </div>
                </>
              )}
            </div>
            
            <ScrollArea className="flex-1">
              <div className="flex flex-col gap-2">
                {chessGameState && chessGameState.gameLog.slice().reverse().map((msg, i) => (
                  <p key={i} className={cn("text-sm text-white/80 border-b border-white/10 pb-1", i === 0 && "text-white font-bold")}>
                    {msg}
                  </p>
                ))}
              </div>
            </ScrollArea>
            
            <div className="mt-4 space-y-2">
              <Button variant="secondary" className="w-full font-headline text-lg" onClick={handleNewGame}>
                <RefreshCw className="mr-2 h-5 w-5"/> New Game
              </Button>
              <Button variant="destructive" className="w-full font-headline text-lg" onClick={handleLeaveGame}>
                Leave Game
              </Button>
            </div>
          </div>

          <div className="flex-1 h-full flex flex-col justify-center items-center py-2 relative mt-4 md:mt-0">
            {/* Top Player Name Tag */}
            {chessGameState && (
              <div className={cn(
                "mb-2 md:mb-4 px-3 md:px-6 py-1 md:py-3 rounded-full border-2 transition-all duration-300",
                ((chessGameState.activePlayerIndex === 0 && !isHost) || (chessGameState.activePlayerIndex === 1 && isHost))
                  ? "bg-yellow-400/20 border-yellow-400 shadow-[0_0_20px_5px] shadow-yellow-400/50" 
                  : "bg-gray-600/20 border-gray-400"
              )}>
                <h3 className="text-sm md:text-xl font-bold text-white text-center">
                  {isHost ? (chessGameState.player2.name || 'Player 2') : chessGameState.player1.name}
                  <span className="text-xs md:text-sm ml-1 md:ml-2 opacity-70">
                    ({isHost ? (chessGameState.player2.color === 'w' ? 'W' : 'B') : (chessGameState.player1.color === 'w' ? 'W' : 'B')})
                  </span>
                </h3>
              </div>
            )}
            
            <div className="w-full max-w-[100vw] sm:max-w-[90vw] md:max-w-[70vh] lg:max-w-[80vh] aspect-square grid grid-cols-8 grid-rows-8 border-4 border-purple-400 rounded-lg shadow-2xl gap-0 overflow-hidden">
              {(() => {
                // Determine if board should be flipped (player with black pieces sees their pieces at bottom)
                const myColor = chessGameState ? (isHost ? chessGameState.player1.color : chessGameState.player2.color) : 'w';
                const shouldFlipBoard = myColor === 'b';
                
                return board.map((row, rowIndex) =>
                  row.map((piece, colIndex) => {
                    // Calculate square coordinates - flip if player is black
                    const displayRowIndex = shouldFlipBoard ? 7 - rowIndex : rowIndex;
                    const displayColIndex = shouldFlipBoard ? 7 - colIndex : colIndex;
                    const square = `${String.fromCharCode(97 + colIndex)}${8 - rowIndex}` as Square;
                    const isLight = (rowIndex + colIndex) % 2 === 0;
                    const isSelected = selectedSquare === square;
                    const isPossibleMove = possibleMoves.includes(square);
                    
                    return (
                      <div
                        key={square}
                        style={{
                          gridRow: displayRowIndex + 1,
                          gridColumn: displayColIndex + 1
                        }}
                      >
                        <ChessSquare
                          piece={piece}
                          square={square}
                          isLight={isLight}
                          onSquareClick={handleSquareClick}
                          isSelected={isSelected}
                          isPossibleMove={isPossibleMove}
                        />
                      </div>
                    );
                  })
                );
              })()}
            </div>
            
            {/* Bottom Player Name Tag */}
            {chessGameState && (
              <div className={cn(
                "mt-2 md:mt-4 px-3 md:px-6 py-1 md:py-3 rounded-full border-2 transition-all duration-300",
                ((chessGameState.activePlayerIndex === 0 && isHost) || (chessGameState.activePlayerIndex === 1 && !isHost))
                  ? "bg-yellow-400/20 border-yellow-400 shadow-[0_0_20px_5px] shadow-yellow-400/50" 
                  : "bg-gray-600/20 border-gray-400"
              )}>
                <h3 className="text-sm md:text-xl font-bold text-white text-center">
                  {isHost ? chessGameState.player1.name : (chessGameState.player2.name || 'Player 2')}
                  <span className="text-xs md:text-sm ml-1 md:ml-2 opacity-70">
                    ({isHost ? (chessGameState.player1.color === 'w' ? 'W' : 'B') : (chessGameState.player2.color === 'w' ? 'W' : 'B')})
                  </span>
                </h3>
              </div>
            )}
          </div>
        </>
        )
      )}

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

      {showEndGameScreen && chessGameState && (
        <ChessEndGameScreen
          score={score}
          onNewGame={handleNewGame}
          onBackToMenu={handleLeaveGame}
          isMinting={false}
          mintTxHash=""
          tokensEarned={(() => {
            if (!chessGameState.winner || chessGameState.winner === 'Draw') return 0;
            const myColor = isHost ? chessGameState.player1.color : chessGameState.player2.color;
            const didIWin = chessGameState.winner === (myColor === 'w' ? 'White' : 'Black');
            return didIWin ? 100 : 0;
          })()}
        />
      )}

      {/* Mobile Game Log Modal */}
      {showGameLogModal && isMobile && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[99999] flex items-center justify-center p-4">
          <div className="bg-black/40 backdrop-blur-sm border border-purple-400/30 rounded-lg p-6 w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Game Info & Log</h3>
              <Button
                onClick={onCloseGameLogModal}
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/10"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
            
            <div className="mb-4">
              {chessGameState && (
                <>
                  <div className="text-sm">
                    <span className="text-white/70">You are: </span>
                    <span className={cn("font-bold", (isHost ? chessGameState.player1.color : chessGameState.player2.color) === 'w' ? "text-white" : "text-gray-400")}>
                      {(isHost ? chessGameState.player1.color : chessGameState.player2.color) === 'w' ? 'White' : 'Black'}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-white/70">Opponent: </span>
                    <span className="font-bold text-white">{isHost ? (chessGameState.player2.name || 'Player 2') : chessGameState.player1.name}</span>
                  </div>
                  <div className="text-sm">
                      <span className="text-white/70">Turn: </span>
                      <span className={cn("font-bold", ((chessGameState.activePlayerIndex === 0 && isHost) || (chessGameState.activePlayerIndex === 1 && !isHost)) ? "text-green-400" : "text-yellow-400")}>
                        {((chessGameState.activePlayerIndex === 0 && isHost) || (chessGameState.activePlayerIndex === 1 && !isHost)) ? 'Your turn' : `${isHost ? (chessGameState.player2.name || 'Player 2') : chessGameState.player1.name}'s turn`}
                      </span>
                    </div>
                </>
              )}
            </div>
            
            <ScrollArea className="flex-1 mb-4">
              <div className="flex flex-col gap-2">
                {chessGameState && chessGameState.gameLog.slice().reverse().map((msg, i) => (
                  <p key={i} className={cn("text-sm text-white/80 border-b border-white/10 pb-1", i === 0 && "text-white font-bold")}>
                    {msg}
                  </p>
                ))}
              </div>
            </ScrollArea>
            
            <div className="space-y-2">
              <Button variant="secondary" className="w-full font-headline text-lg" onClick={handleNewGame}>
                <RefreshCw className="mr-2 h-5 w-5"/> New Game
              </Button>
              <Button variant="destructive" className="w-full font-headline text-lg" onClick={handleLeaveGame}>
                Leave Game
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};