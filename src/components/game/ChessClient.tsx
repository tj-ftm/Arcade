"use client";

import { useState, useEffect, useCallback } from 'react';
import { Chess } from 'chess.js';
import type { Square, PieceSymbol, Color, Move } from 'chess.js';
import { Button } from '@/components/ui/button';
import { RefreshCw, PanelLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useWeb3 } from '@/components/web3/Web3Provider';
import { logGameCompletion, createGameResult, isValidWalletAddress } from '@/lib/game-logger';
import { MintSuccessModal } from './MintSuccessModal';
import { ChessStartScreen } from './chess/ChessStartScreen';
import { ChessEndGameScreen } from './chess/ChessEndGameScreen';

const pieceToUnicode: Record<PieceSymbol, string> = {
  p: '♙', r: '♖', n: '♘', b: '♗', q: '♕', k: '♔',
};

const pieceValues: Record<PieceSymbol, number> = {
  p: 1, n: 3, b: 3, r: 5, q: 9, k: 900,
};

const ChessSquare = ({ piece, square, isLight, onSquareClick, isSelected, isPossibleMove }: { piece: { type: PieceSymbol; color: Color } | null; square: Square; isLight: boolean; onSquareClick: (square: Square) => void; isSelected: boolean; isPossibleMove: boolean; }) => {
  const pieceColorClass = piece?.color === 'w' ? 'text-white' : 'text-black';
  
  return (
    <div
      onClick={() => onSquareClick(square)}
      className={cn(
        "w-full h-full flex justify-center items-center cursor-pointer relative",
        isLight ? 'bg-gray-300' : 'bg-gray-700',
      )}
    >
      {piece && (
        <span className={cn("text-5xl md:text-6xl drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] transition-transform duration-100 ease-in-out hover:scale-110", pieceColorClass)}>
          {pieceToUnicode[piece.type]}
        </span>
      )}
      {isSelected && (
          <div className="absolute inset-0 bg-green-500/50 border-4 border-green-400 rounded-md" />
      )}
       {isPossibleMove && (
        <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-1/3 h-1/3 bg-yellow-400/50 rounded-full shadow-[0_0_15px_5px] shadow-yellow-400/80" />
        </div>
      )}
    </div>
  );
};


export const ChessClient = () => {
    const { account } = useWeb3();
    const [game, setGame] = useState(new Chess());
    const [board, setBoard] = useState(game.board());
    const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
    const [possibleMoves, setPossibleMoves] = useState<Square[]>([]);
    const [gameLog, setGameLog] = useState<string[]>(['Game started. Your turn.']);
    const [winner, setWinner] = useState<string | null>(null);
    const [isLogVisible, setIsLogVisible] = useState(false);
    const [isBotThinking, setIsBotThinking] = useState(false);
    const [gameStartTime, setGameStartTime] = useState<number>(Date.now());
    const [isLoggingGame, setIsLoggingGame] = useState(false);
    const [moveCount, setMoveCount] = useState(0);
    const [showMintSuccess, setShowMintSuccess] = useState(false);
    const [mintTxHash, setMintTxHash] = useState<string>('');
    const [showStartScreen, setShowStartScreen] = useState(true);
    const [showEndGameScreen, setShowEndGameScreen] = useState(false);
    const [isMinting, setIsMinting] = useState(false);

    const addGameLog = (message: string) => {
        setGameLog(prev => {
            const newLog = [...prev, message];
            if (newLog.length > 30) newLog.shift();
            return newLog;
        });
    }

    const checkGameState = useCallback(async () => {
        if (game.isCheckmate()) {
            const winnerColor = game.turn() === 'b' ? 'You' : 'Bot';
            const playerWon = winnerColor === 'You';
            setWinner(`${winnerColor} win by checkmate!`);
            addGameLog(`${winnerColor} wins by checkmate!`);
            await handleGameEnd(playerWon, 'checkmate');
        } else if (game.isStalemate()) {
            setWinner("Draw by stalemate!");
            addGameLog("Draw by stalemate!");
            await handleGameEnd(false, 'stalemate');
        } else if (game.isDraw()) {
            setWinner("Draw!");
            addGameLog("Draw!");
            await handleGameEnd(false, 'draw');
        }
    }, [game]);

    const handleNewGame = useCallback(() => {
      setGame(new Chess());
      setBoard(new Chess().board());
      setSelectedSquare(null);
      setPossibleMoves([]);
      setGameLog(['Game started. Your turn.']);
      setWinner(null);
      setIsBotThinking(false);
      setGameStartTime(Date.now());
      setIsLoggingGame(false);
      setMoveCount(0);
      setShowMintSuccess(false);
      setMintTxHash('');
      setShowEndGameScreen(false);
    }, []);

    const handleGameEnd = async (playerWon: boolean, endReason: string) => {
        setShowEndGameScreen(true);
        // Only log game if wallet is connected
        if (!isValidWalletAddress(account) || isLoggingGame) {
            return;
        }

        setIsLoggingGame(true);
        
        try {
            const gameDuration = Math.floor((Date.now() - gameStartTime) / 1000); // in seconds
            // Calculate score based on game outcome and moves
            let score = moveCount * 10; // Base score from moves
            if (playerWon) {
                score += 100; // Bonus for winning
                if (endReason === 'checkmate') score += 50; // Extra bonus for checkmate
            }
            
            const gameResult = createGameResult(
                account!,
                'chess',
                score,
                playerWon,
                gameDuration
            );
            
            const logResponse = await logGameCompletion(gameResult);
            if (playerWon && logResponse?.mintTransaction) {
                setIsMinting(true);
                setTimeout(() => {
                    setMintTxHash(logResponse.mintTransaction);
                    setIsMinting(false);
                }, 3000); // Simulate 3-second minting process
            }
        } catch (error) {
            console.error('Failed to log chess game completion:', error);
        } finally {
            setIsLoggingGame(false);
        }
    };

    const handleBotMove = useCallback(() => {
      if (game.isGameOver() || game.turn() !== 'b') return;
      
      setIsBotThinking(true);

      setTimeout(() => {
          const moves = game.moves({ verbose: true });
          
          let bestMove: Move | null = null;
          let maxScore = -Infinity;

          // Find the best capturing move
          for (const move of moves) {
              if (move.captured) {
                  const score = pieceValues[move.captured];
                  if (score > maxScore) {
                      maxScore = score;
                      bestMove = move;
                  }
              }
          }

          // If no capture, pick a random move
          if (!bestMove) {
              bestMove = moves[Math.floor(Math.random() * moves.length)];
          }

          if (bestMove) {
              game.move(bestMove);
              setBoard(game.board());
              setMoveCount(prev => prev + 1);
              addGameLog(`Bot: ${bestMove.san}`);
              checkGameState();
          }
          setIsBotThinking(false);
      }, 1000 + Math.random() * 500); // Simulate "thinking"
    }, [game, checkGameState]);

    useEffect(() => {
        if (game.turn() === 'b' && !winner) {
            handleBotMove();
        }
    }, [game, game.turn(), winner, handleBotMove]);

    useEffect(() => {
      if (!showStartScreen) {
        handleNewGame();
      }
    }, [showStartScreen, handleNewGame]);

    const handleShowStartScreen = useCallback(() => {
      setShowStartScreen(true);
      setShowEndGameScreen(false);
      handleNewGame();
    }, [handleNewGame]);

    const handleSquareClick = (square: Square) => {
        if (winner || game.turn() !== 'w' || isBotThinking) return;

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
                    checkGameState();
                }
            } catch (e) {
                // Invalid move, maybe they clicked on another of their pieces
                const piece = game.get(square);
                if (piece && piece.color === 'w') {
                     setSelectedSquare(square);
                     const moves = game.moves({ square, verbose: true });
                     setPossibleMoves(moves.map(m => m.to));
                     return; // exit early
                }
            } finally {
                setSelectedSquare(null);
                setPossibleMoves([]);
            }
        } else {
            const piece = game.get(square);
            if (piece && piece.color === 'w') {
                setSelectedSquare(square);
                const moves = game.moves({ square, verbose: true });
                setPossibleMoves(moves.map(m => m.to));
            }
        }
    };
    


    return (
        <div className="w-full h-full flex flex-col md:flex-row justify-between items-center text-white font-headline relative overflow-hidden">
            {showStartScreen && (
                <ChessStartScreen onStartGame={() => setShowStartScreen(false)} />
            )}

            {!showStartScreen && !showEndGameScreen && (
                <>
                    <div className={cn("absolute top-2 left-2 z-20 md:hidden", winner && "hidden")}>
                        <Button variant="secondary" size="icon" onClick={() => setIsLogVisible(v => !v)}>
                            Log
                        </Button>
                    </div>
                    
                    <div className={cn(
                        "fixed md:static top-0 right-0 h-full w-64 md:w-72 bg-black/80 md:bg-black/50 rounded-l-lg md:rounded-lg p-4 flex flex-col z-30 transition-transform duration-300 ease-in-out",
                        isLogVisible ? "translate-x-0" : "translate-x-full",
                        "md:translate-x-0 md:h-full"
                    )}>
                        <Button variant="ghost" size="icon" className="absolute top-2 right-2 md:hidden" onClick={() => setIsLogVisible(false)}>
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
                            <Button variant="secondary" className="w-full font-headline text-lg" onClick={handleShowStartScreen}><RefreshCw className="mr-2 h-5 w-5"/> New Game</Button>
                        </div>
                    </div>

                    <div className="flex-1 h-full flex flex-col justify-center items-center py-2 relative">
                        <div className="w-full max-w-[80vh] md:max-w-[70vh] lg:max-w-[80vh] aspect-square grid grid-cols-8 grid-rows-8 border-4 border-purple-400 rounded-lg shadow-2xl">
                            {board.map((row, rowIndex) =>
                                row.map((piece, colIndex) => {
                                    const square: Square = `${String.fromCharCode(97 + colIndex)}${8 - rowIndex}` as Square;
                                    const isLight = (rowIndex + colIndex) % 2 !== 0;
                                    return (
                                        <ChessSquare
                                            key={square}
                                            piece={piece}
                                            square={square}
                                            isLight={isLight}
                                            onSquareClick={handleSquareClick}
                                            isSelected={selectedSquare === square}
                                            isPossibleMove={possibleMoves.includes(square)}
                                        />
                                    );
                                })
                            )}
                        </div>
                        <div className="mt-4 bg-black/50 px-6 py-2 rounded-full">
                            <h2 className="text-2xl font-bold uppercase tracking-wider">
                                {winner ? "Game Over" : isBotThinking ? "Bot is thinking..." : `${game.turn() === 'w' ? 'Your' : 'Bot\'s'} Turn`}
                            </h2>
                        </div>
                        {game.isCheck() && !winner && <div className="mt-2 text-2xl text-red-500 font-bold animate-pulse">CHECK!</div>}
                    </div>
                </>
            )}

            {showEndGameScreen && (
                <ChessEndGameScreen
                    score={score}
                    onNewGame={handleNewGame}
                    onBackToMenu={handleShowStartScreen}
                    isMinting={isMinting}
                    mintTxHash={mintTxHash}
                    tokensEarned={100}
                />
            )}

            <MintSuccessModal
                isOpen={showMintSuccess}
                onClose={() => setShowMintSuccess(false)}
                txHash={mintTxHash}
                gameName="Chess"
            />
        </div>
    );
}
