"use client";

import { useState, useEffect, useCallback } from 'react';
import { Chess } from 'chess.js';
import type { Square, PieceSymbol, Color, Move } from 'chess.js';
import { Button } from '@/components/ui/button';
import { RefreshCw, PanelLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFirebaseMultiplayer } from '@/hooks/use-firebase-multiplayer';
import { useWeb3 } from '@/components/web3/Web3Provider';
import { ChessEndGameScreen } from './ChessEndGameScreen';

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
  player1Color?: 'white' | 'black';
  player2Color?: 'white' | 'black';
}

interface MultiplayerChessClientProps {
  lobby: Lobby;
  isHost: boolean;
  onGameEnd: () => void;
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
        "aspect-square flex items-center justify-center text-4xl md:text-5xl lg:text-6xl cursor-pointer border border-purple-300/20 transition-all duration-200",
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

export const MultiplayerChessClient = ({ lobby, isHost, onGameEnd }: MultiplayerChessClientProps) => {
  const [game] = useState(() => new Chess());
  const [board, setBoard] = useState(() => {
    const chessGame = new Chess();
    return chessGame.board();
  });
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<Square[]>([]);
  const [gameLog, setGameLog] = useState<string[]>(['Game started!']);
  const [moveCount, setMoveCount] = useState(0);
  const [winner, setWinner] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [isLogVisible, setIsLogVisible] = useState(false);
  const [showEndGameScreen, setShowEndGameScreen] = useState(false);
  const [playerColor, setPlayerColor] = useState<Color>('w');
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [opponentName, setOpponentName] = useState('');
  const [isLoadingGame, setIsLoadingGame] = useState(true); // New state for loading screen
  
  const { account } = useWeb3();
  const currentUserId = account || 'mock-user';
  
  const { sendGameMove, onGameMove, leaveLobby, onLobbyJoined } = useFirebaseMultiplayer();

  // Initialize board from game instance
  useEffect(() => {
    setBoard(game.board());
  }, [game]);

  useEffect(() => {
    if (lobby.status === 'waiting') {
      setIsLoadingGame(true);
    } else if (lobby.status === 'playing' && lobby.player1Color && lobby.player2Color) {
      setIsLoadingGame(false);
      // Determine player color and starting turn
      const myColor = isHost ? lobby.player1Color : lobby.player2Color;

      if (myColor === 'white') {
        setPlayerColor('w');
        setIsMyTurn(true); // White always starts
      } else if (myColor === 'black') {
        setPlayerColor('b');
        setIsMyTurn(false); // Black waits for white's first move
      }

      // Set opponent name
      setOpponentName(isHost ? (lobby.player2Name || 'Player') : lobby.player1Name);
      
      // Listen for opponent moves
      onGameMove((moveData: any) => {
        if (moveData.type === 'chess-move') {
          try {
            const move = game.move(moveData.move);
            if (move) {
              setBoard(game.board());
              setMoveCount(prev => prev + 1);
              addGameLog(`${opponentName}: ${move.san}`);
              setIsMyTurn(true); // Now it's my turn
              checkGameState();
            }
          } catch (error) {
            console.error('Invalid move received:', error);
          }
        } else if (moveData.type === 'game-end') {
          setWinner(moveData.winner);
          setShowEndGameScreen(true);
        }
      });
    }
  }, [game, lobby, isHost, opponentName, onGameMove]);

  useEffect(() => {
    const unsubscribe = onLobbyJoined((joinedLobby) => {
      if (joinedLobby.id === lobby.id && joinedLobby.status === 'playing') {
        setIsLoadingGame(false);
      }
    });
    return () => unsubscribe();
  }, [lobby.id, onLobbyJoined]);

  const addGameLog = useCallback((message: string) => {
    setGameLog(prev => [...prev, message]);
  }, []);

  const calculateScore = useCallback(() => {
    let totalScore = 0;
    const currentBoard = game.board();
    
    currentBoard.forEach(row => {
      row.forEach(square => {
        if (square && square.color === playerColor) {
          totalScore += pieceValues[square.type];
        }
      });
    });
    
    return totalScore + moveCount * 10;
  }, [game, moveCount, playerColor]);

  const checkGameState = useCallback(() => {
    if (game.isGameOver()) {
      let gameWinner = null;
      let endMessage = '';
      
      if (game.isCheckmate()) {
        gameWinner = game.turn() === 'w' ? 'Black' : 'White';
        endMessage = `Checkmate! ${gameWinner} wins!`;
      } else if (game.isDraw()) {
        endMessage = 'Game ended in a draw!';
        gameWinner = 'Draw';
      } else if (game.isStalemate()) {
        endMessage = 'Stalemate! Game is a draw!';
        gameWinner = 'Draw';
      }
      
      setWinner(gameWinner);
      addGameLog(endMessage);
      setScore(calculateScore());
      setShowEndGameScreen(true);
      
      // Notify opponent of game end
      sendGameMove(lobby.id, {
        type: 'game-end',
        winner: gameWinner
      });
    }
  }, [game, addGameLog, calculateScore, lobby.id, sendGameMove]);

  const handleNewGame = useCallback(() => {
    game.reset();
    setBoard(game.board());
    setSelectedSquare(null);
    setPossibleMoves([]);
    setGameLog(['New game started!']);
    setMoveCount(0);
    setWinner(null);
    setScore(0);
    setShowEndGameScreen(false);
    setIsMyTurn(playerColor === 'w'); // White always starts
  }, [game, playerColor]);

  const handleSquareClick = (square: Square) => {
    if (winner || !isMyTurn || game.turn() !== playerColor) return;

    if (selectedSquare) {
      try {
        const move = game.move({
          from: selectedSquare,
          to: square,
          promotion: 'q', // auto-promote to queen
        });

        if (move) {
          setBoard(game.board());
          setMoveCount(prev => prev + 1);
          addGameLog(`You: ${move.san}`);
          setIsMyTurn(false); // Now it's opponent's turn
          
          // Send move to opponent
          sendGameMove(lobby.id, {
            type: 'chess-move',
            move: {
              from: selectedSquare,
              to: square,
              promotion: 'q'
            }
          });
          
          checkGameState();
        }
      } catch (e) {
        // Invalid move, maybe they clicked on another of their pieces
        const piece = game.get(square);
        if (piece && piece.color === playerColor) {
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
      if (piece && piece.color === playerColor) {
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
          <h2 className="text-4xl font-bold mb-4">Waiting for opponent...</h2>
          <p className="text-lg">Lobby ID: {lobby.id}</p>
        </div>
      ) : (
        !showEndGameScreen && (
          <>
            <div className="w-full md:w-80 h-full flex flex-col bg-black/20 backdrop-blur-sm border border-purple-400/30 rounded-lg p-4">
              <div className="mb-4">
                <h3 className="text-xl font-bold mb-2">Game Info</h3>
                <div className="text-sm">
                  <span className="text-white/70">You are: </span>
                  <span className={cn("font-bold", playerColor === 'w' ? "text-white" : "text-gray-400")}>
                    {playerColor === 'w' ? 'White' : 'Black'}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-white/70">Opponent: </span>
                  <span className="font-bold">{opponentName}</span>
                </div>
                <div className="text-sm">
                  <span className="text-white/70">Turn: </span>
                  <span className={cn("font-bold", isMyTurn ? "text-green-400" : "text-yellow-400")}>
                    {isMyTurn ? 'Your turn' : `${opponentName}'s turn`}
                  </span>
                </div>
              </div>
            
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
              <Button variant="secondary" className="w-full font-headline text-lg" onClick={handleNewGame}>
                <RefreshCw className="mr-2 h-5 w-5"/> New Game
              </Button>
              <Button variant="destructive" className="w-full font-headline text-lg" onClick={handleLeaveGame}>
                Leave Game
              </Button>
            </div>
          </div>

          <div className="flex-1 h-full flex flex-col justify-center items-center py-2 relative mt-4 md:mt-0">
            <div className="w-full max-w-[80vh] md:max-w-[70vh] lg:max-w-[80vh] aspect-square grid grid-cols-8 grid-rows-8 border-4 border-purple-400 rounded-lg shadow-2xl">
              {board.map((row, rowIndex) =>
                row.map((piece, colIndex) => {
                  const square = `${String.fromCharCode(97 + colIndex)}${8 - rowIndex}` as Square;
                  const isLight = (rowIndex + colIndex) % 2 === 0;
                  const isSelected = selectedSquare === square;
                  const isPossibleMove = possibleMoves.includes(square);
                  
                  return (
                    <ChessSquare
                      key={square}
                      piece={piece}
                      square={square}
                      isLight={isLight}
                      onSquareClick={handleSquareClick}
                      isSelected={isSelected}
                      isPossibleMove={isPossibleMove}
                    />
                  );
                })
              )}
            </div>
            {game.isCheck() && !winner && <div className="mt-2 text-2xl text-red-500 font-bold animate-pulse">CHECK!</div>}
          </div>
        </>
        )
      )}

      {showEndGameScreen && (
        <ChessEndGameScreen
          score={score}
          onNewGame={handleNewGame}
          onBackToMenu={handleLeaveGame}
          isMinting={false}
          mintTxHash=""
          tokensEarned={winner === (playerColor === 'w' ? 'White' : 'Black') ? 100 : 0}
        />
      )}
    </div>
  );
};