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
import { verifyPayment, sendBonusPayment, getBonusReward, PaymentVerificationResult } from '@/lib/payment-verification';
import { ChessStartScreen } from './chess/ChessStartScreen';
import { ChessEndGameScreen } from './chess/ChessEndGameScreen';
import PaymentLoadingScreen from './PaymentLoadingScreen';
import { ErrorReportButton } from './ErrorReportButton';
import { errorLogger } from '@/lib/error-logger';
// import { MobileRotateButton } from './MobileRotateButton'; // Removed as requested

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


interface ChessClientProps {
  onNavigateToMultiplayer?: () => void;
  onNavigateToBetting?: () => void;
  onGameEnd?: () => void;
}

export const ChessClient = ({ onNavigateToMultiplayer, onNavigateToBetting, onGameEnd }: ChessClientProps = {}) => {
    const { account, username, getProvider, getSigner, currentChain } = useWeb3();
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
    const [score, setScore] = useState(0);
    const [tokensEarned, setTokensEarned] = useState<number>(0);
    const [isBonusMode, setIsBonusMode] = useState(false);
    const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
    const [paymentTxHash, setPaymentTxHash] = useState<string>('');
    const [endReason, setEndReason] = useState<string>('');
    const [hasWon, setHasWon] = useState<boolean>(false);
    const [showPaymentScreen, setShowPaymentScreen] = useState(false);
    const [currentTurn, setCurrentTurn] = useState<'white' | 'black'>('white');

    const addGameLog = (message: string) => {
        setGameLog(prev => {
            const newLog = [...prev, message];
            if (newLog.length > 30) newLog.shift();
            return newLog;
        });
    }

    const checkGameState = useCallback(async (currentGame: Chess) => {
        if (currentGame.isCheckmate()) {
            // If it's black's turn and checkmate, black is checkmated (white wins)
            // If it's white's turn and checkmate, white is checkmated (black wins)
            // Player is white, bot is black
            const winnerColor = currentGame.turn() === 'b' ? 'You' : 'Bot';
            const playerWon = winnerColor === 'You';
            setWinner(`${winnerColor} win by checkmate!`);
            addGameLog(`${winnerColor} wins by checkmate!`);
            setHasWon(playerWon);
            await handleGameEnd(playerWon, 'checkmate');
        } else if (currentGame.isStalemate()) {
            setWinner("Draw by stalemate!");
            addGameLog("Draw by stalemate!");
            setHasWon(false);
            await handleGameEnd(false, 'stalemate');
        } else if (currentGame.isDraw()) {
            setWinner("Draw!");
            addGameLog("Draw!");
            setHasWon(false);
            await handleGameEnd(false, 'draw');
        }
    }, []);

    const handleNewGame = useCallback((bonusMode = false) => {
        // Initialize error logging for new game session
        errorLogger.startGameSession('chess', 'singleplayer', account || 'anonymous', username || 'Anonymous Player');
        errorLogger.addToGameLog(`New chess game started - Bonus mode: ${bonusMode}`);
        
        const newGame = new Chess();
        setGame(newGame);
      setBoard(newGame.board());
      setSelectedSquare(null);
      setPossibleMoves([]);
      setGameLog([bonusMode ? 'Bonus Game started. Your turn.' : 'Game started. Your turn.']);
      setWinner(null);
      setIsBotThinking(false);
      setGameStartTime(Date.now());
      setIsLoggingGame(false);
      setMoveCount(0);
      setShowMintSuccess(false);
      setMintTxHash('');
      setShowEndGameScreen(false);
      setTokensEarned(0);
      setIsBonusMode(bonusMode);
      setPaymentTxHash('');
      setIsVerifyingPayment(false);
      setHasWon(false);
      setEndReason('');
      setScore(0);
    }, []);

    const handleGameEnd = async (playerWon: boolean, endReason: string) => {
        if (showEndGameScreen || isLoggingGame) {
            return; // Prevent duplicate calls
        }
        
        // Set win status immediately
        setHasWon(playerWon);
        setEndReason(endReason);
        setShowEndGameScreen(true);
        // Only log game if wallet is connected
        if (!isValidWalletAddress(account || '')) {
            setIsMinting(false);
            return;
        }

        setIsLoggingGame(true);
        setIsMinting(true);
        
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
                isBonusMode ? 'chess-bonus' : 'chess',
                score,
                playerWon,
                gameDuration,
                undefined, // gameId
                web3?.currentChain || 'sonic' // current chain
            );
            
            setScore(score);
            
            const logResponse = await logGameCompletion(gameResult);

            // Update tokensToMint based on actual reward from backend or calculate bonus
            let tokensToMint = 0;
            if (logResponse?.reward) {
                tokensToMint = parseFloat(logResponse.reward);
            } else if (isBonusMode && playerWon) {
                // Fallback for bonus mode: 200 ARC tokens (2x normal 100)
                tokensToMint = getBonusReward('chess', 100);
            } else if (playerWon) {
                // Regular mode: 100 ARC tokens for winning
                tokensToMint = 100;
            }
            setTokensEarned(tokensToMint);
                
            // Show mint success modal if tokens were earned
            if (tokensToMint > 0 && logResponse?.mintTransaction) {
                setMintTxHash(logResponse.mintTransaction);
            }
        } catch (error) {
            console.error('Failed to log chess game completion:', error);
        } finally {
            setIsLoggingGame(false);
            setIsMinting(false);
        }
    };

    const handleBotMove = useCallback((currentGame: Chess) => {
      if (currentGame.isGameOver() || currentGame.turn() !== 'b') return;
      
      setIsBotThinking(true);

      setTimeout(() => {
          const moves = currentGame.moves({ verbose: true });
          
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
              currentGame.move(bestMove);
              // Create a new game instance to ensure React detects the change
              const newGame = new Chess(currentGame.fen());
              setGame(newGame);
              setBoard(newGame.board());
              setMoveCount(prev => prev + 1);
              setCurrentTurn(newGame.turn());
              addGameLog(`Bot: ${bestMove.san}`);
              checkGameState(newGame);
          }
          setIsBotThinking(false);
      }, 1000 + Math.random() * 500); // Simulate "thinking"
    }, [checkGameState]);

    useEffect(() => {
        if (game.turn() === 'b' && !winner && !showStartScreen && !showEndGameScreen) {
            handleBotMove(game);
        }
    }, [game, winner, handleBotMove, showStartScreen, showEndGameScreen]);

    const handleShowStartScreen = useCallback(() => {
        setShowStartScreen(true);
        setShowEndGameScreen(false);
        handleNewGame();
    }, [handleNewGame]);

    const handleBackToMenu = useCallback(() => {
        // Only call onGameEnd once when going back to menu
        if (!showEndGameScreen) return; // Prevent multiple calls
        console.log('🔙 [CHESS SINGLEPLAYER] Back to menu clicked');
        setShowEndGameScreen(false);
        // Simple onGameEnd call like multiplayer - let parent handle navigation
        onGameEnd && onGameEnd();
    }, [showEndGameScreen, onGameEnd]);

    const handleStartMultiplayer = () => {
        console.log("Starting multiplayer Chess game...");
        // Navigate to the multiplayer lobby for chess within the SPA
        if (onNavigateToMultiplayer) {
            onNavigateToMultiplayer();
        }
    };

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
                setShowStartScreen(false);
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
        setShowPaymentScreen(true);
        setShowStartScreen(false);
    };

    const handlePaymentComplete = () => {
        setShowPaymentScreen(false);
        // Start the game directly without additional payment processing
        handleNewGame(true); // true for bonus mode
        setShowStartScreen(false);
    };

    const handlePaymentCancel = () => {
        setShowPaymentScreen(false);
        setShowStartScreen(true);
    };

    const handleTestWin = async () => {
        if (winner || showStartScreen || showEndGameScreen || isLoggingGame) {
            if (!winner && !showStartScreen) {
                return; // Prevent duplicate calls
            }
            alert('Please start a game first!');
            return;
        }
        
        // Simulate player win and trigger the actual win handling logic
        setHasWon(true);
        setEndReason('checkmate');
        setShowEndGameScreen(true);
        
        // Only log game if wallet is connected
        console.log('Test Win - Account:', account, 'isValidWallet:', isValidWalletAddress(account || ''), 'isLoggingGame:', isLoggingGame);
        if (!isValidWalletAddress(account || '') || isLoggingGame) {
            console.log('Test Win - Skipping token minting - wallet not connected or already logging');
            setIsMinting(false);
            // Still set winner for display purposes
            setWinner('white');
            setEndReason('checkmate');
            return;
        }
        
        console.log('Test Win - Starting token minting process...');
        setIsLoggingGame(true);
        setIsMinting(true);
        
        try {
            const gameDuration = Math.floor((Date.now() - gameStartTime) / 1000); // in seconds
            const playerWon = true;
            // Calculate score based on game outcome and moves
            let score = moveCount * 10; // Base score from moves
            if (playerWon) {
                score += 100; // Bonus for winning
                score += 50; // Extra bonus for checkmate
            }
            
            const gameResult = createGameResult(
                account!,
                isBonusMode ? 'chess-bonus' : 'chess',
                score,
                playerWon,
                gameDuration,
                undefined, // gameId
                currentChain || 'sonic' // current chain
            );
            
            setScore(score);
            
            const logResponse = await logGameCompletion(gameResult);

            // Update tokensToMint based on actual reward from backend or calculate bonus
            let tokensToMint = 0;
            console.log('Test Win - logResponse:', logResponse, 'isBonusMode:', isBonusMode);
            if (logResponse?.reward) {
                tokensToMint = parseFloat(logResponse.reward);
                console.log('Test Win - Using backend reward:', tokensToMint);
            } else if (isBonusMode && playerWon) {
                // Fallback for bonus mode: 200 ARC tokens (2x normal 100)
                tokensToMint = getBonusReward('chess', 100);
                console.log('Test Win - Using bonus mode reward:', tokensToMint);
            } else if (playerWon) {
                // Regular mode: 100 ARC tokens for winning
                tokensToMint = 100;
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
            console.error('Test Win - Failed to log chess game completion:', error);
        } finally {
            setIsLoggingGame(false);
            setIsMinting(false);
        }
        
        // Set winner for display purposes
        setWinner('white');
        setEndReason('checkmate');
    };

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
                    // Create a new game instance to trigger React re-render
                    const newGame = new Chess(game.fen());
                    setGame(newGame);
                    setBoard(newGame.board());
                    setMoveCount(prev => prev + 1);
                    setCurrentTurn(newGame.turn());
                    addGameLog(`You: ${move.san}`);
                    checkGameState(newGame);
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
    


    if (showPaymentScreen) {
        return (
            <div className="w-full h-full flex flex-col justify-center items-center text-white font-headline relative overflow-hidden">
                <PaymentLoadingScreen
                    onPaymentComplete={handlePaymentComplete}
                    onCancel={handlePaymentCancel}
                    gameType="chess"
                    amount="0.1 S"
                />
            </div>
        );
    }

    return (
        <div className="w-full h-full flex flex-col md:flex-row justify-between items-center text-white font-headline relative overflow-hidden pt-16 md:pt-8" data-game-container>
            {showStartScreen && (
                <ChessStartScreen 
                    onStartGame={() => { handleNewGame(false); setShowStartScreen(false); }} 
                    onStartMultiplayer={onNavigateToMultiplayer}
                    onStartBonusMode={handleStartBonusMode}
                    onNavigateToBetting={onNavigateToBetting}
                    onGoToMenu={onGameEnd}
                />
            )}

            {!showStartScreen && !showEndGameScreen && (
                <>
                    <div className={cn("absolute top-2 left-2 z-20 md:hidden flex flex-col gap-1", winner && "hidden")}>
                        <Button 
                            variant="secondary" 
                            size="icon" 
                            onClick={() => setIsLogVisible(v => !v)}
                            className="h-6 w-6 text-xs md:h-8 md:w-8 md:text-sm"
                        >
                            Log
                        </Button>
                        <ErrorReportButton
                            gameType="chess"
                            gameMode="singleplayer"
                            gameState={{ board, gameLog, winner, selectedSquare, possibleMoves }}
                            size="sm"
                            className="h-6 px-2 text-xs md:h-8 md:px-3 md:text-sm"
                        />
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
                        <div className="mt-4 space-y-2">
                            <Button variant="secondary" className="w-full font-headline text-lg" onClick={handleShowStartScreen}><RefreshCw className="mr-2 h-5 w-5"/> New Game</Button>
                            <Button variant="outline" className="w-full font-headline text-sm" onClick={handleTestWin}>🏆 Test Win</Button>
                        </div>
                    </div>

                    <div className="flex-1 h-full flex flex-col justify-center items-center py-2 relative mt-4 md:mt-0">
                        {/* Turn Indicator */}
                        {!winner && (
                            <div className="mb-4 text-center">
                                <div className={cn(
                                    "px-6 py-3 rounded-full text-lg font-bold uppercase tracking-wider transition-all duration-500",
                                    currentTurn === 'w' ? "bg-white text-black shadow-lg animate-pulse" : "bg-gray-800 text-white border-2 border-white/30"
                                )}>
                                    {currentTurn === 'w' ? (
                                        <span className="flex items-center gap-2">
                                            <span className="w-3 h-3 bg-black rounded-full"></span>
                                            Your Turn
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            <span className="w-3 h-3 bg-white rounded-full"></span>
                                            {isBotThinking ? 'Bot Thinking...' : "Bot's Turn"}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                        
                        <div className="w-full max-w-[98vw] max-h-[98vh] sm:max-w-[90vmin] md:max-w-[70vh] lg:max-w-[80vh] aspect-square grid grid-cols-8 grid-rows-8 border-4 border-purple-400 rounded-lg shadow-2xl">
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
                    hasWon={hasWon}
                    onNewGame={handleNewGame}
                    onBackToMenu={handleBackToMenu}
                    isMinting={isMinting}
                    tokensEarned={tokensEarned}
                    mintTxHash={mintTxHash}
                />
            )}
            
            {/* Mobile Rotate Button - Removed as requested */}
        </div>
    );
}
