
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import useInterval from 'use-interval';
import { Button } from '@/components/ui/button';
import { RefreshCw, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWeb3 } from '../web3/Web3Provider';
import { logGameCompletion, createGameResult, isValidWalletAddress } from '@/lib/game-logger';
import { verifyPayment, sendBonusPayment, getBonusReward, PaymentVerificationResult } from '@/lib/payment-verification';
import { ErrorReportButton } from './ErrorReportButton';
import { errorLogger } from '@/lib/error-logger';
import { MintSuccessModal } from './MintSuccessModal';
import { SnakeStartScreen } from './snake/SnakeStartScreen';
import { SnakeEndGameScreen } from './snake/SnakeEndGameScreen';
import PaymentLoadingScreen from './PaymentLoadingScreen';
import CountdownScreen from './CountdownScreen';
import { useIsMobile } from '@/hooks/use-mobile';

const GRID_SIZE = 20;
const INITIAL_SNAKE = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
const INITIAL_FOOD = { x: 15, y: 15 };
const INITIAL_DIRECTION = { x: 1, y: 0 }; // Moving Right
const GAME_SPEED = 120; // ms

const SnakeCell = ({ type }: { type: 'snake' | 'food' | 'empty' }) => {
    const cellClasses = {
        snake: 'bg-green-500 rounded-sm shadow-[0_0_10px] shadow-green-400 scale-[0.9]',
        food: 'bg-red-500 rounded-full shadow-[0_0_10px] shadow-red-400',
        empty: ''
    };
    return <div className={cn("w-full h-full flex items-center justify-center")}><div className={cn("w-full h-full", cellClasses[type])}></div></div>;
};

interface SnakeClientProps {
  onGameEnd?: () => void;
}

export const SnakeClient = ({ onGameEnd }: SnakeClientProps) => {
    const { account, getProvider, getSigner, currentChain, username } = useWeb3();
    const isMobile = useIsMobile();
    const gameAreaRef = useRef<HTMLDivElement>(null);
    const touchStartRef = useRef<{ x: number; y: number } | null>(null);
    const [gameState, setGameState] = useState<'idle' | 'running' | 'gameOver'>('idle');
    const [snake, setSnake] = useState(INITIAL_SNAKE);
    const [food, setFood] = useState(INITIAL_FOOD);
    const [direction, setDirection] = useState(INITIAL_DIRECTION);
    const [score, setScore] = useState(0);
    const [gameStartTime, setGameStartTime] = useState<number>(0);
    const [isLoggingGame, setIsLoggingGame] = useState(false);
    const [isMinting, setIsMinting] = useState(false);
    const [mintTxHash, setMintTxHash] = useState<string>('');
    const [tokensEarned, setTokensEarned] = useState<number>(0);
    const [showStartScreen, setShowStartScreen] = useState(true);
    const [showEndGameScreen, setShowEndGameScreen] = useState(false);
    const [isBonusMode, setIsBonusMode] = useState(false);
    const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
    const [paymentTxHash, setPaymentTxHash] = useState<string>('');
    const [showPaymentScreen, setShowPaymentScreen] = useState(false);
    const [showCountdown, setShowCountdown] = useState(false);

    const generateFood = useCallback(() => {
        let newFoodPosition: { x: number; y: number };
        do {
            newFoodPosition = {
                x: Math.floor(Math.random() * GRID_SIZE),
                y: Math.floor(Math.random() * GRID_SIZE),
            };
        } while (snake.some(segment => segment.x === newFoodPosition.x && segment.y === newFoodPosition.y));
        setFood(newFoodPosition);
    }, [snake]);

    const handleGameOver = async () => {
        setGameState('gameOver');
        setShowEndGameScreen(true);
        

        
        // Only log game if wallet is connected
        if (!isValidWalletAddress(account || '') || isLoggingGame) {
            setIsMinting(false);
            return;
        }

        setIsLoggingGame(true);
        setIsMinting(true);
        
        try {
            const gameDuration = Math.floor((Date.now() - gameStartTime) / 1000); // in seconds
            const isWin = score >= 100; // Consider score >= 100 as a win
            
            const gameResult = createGameResult(
                account!,
                isBonusMode ? 'snake-bonus' : 'snake',
                score,
                isWin,
                gameDuration,
                undefined, // gameId
                currentChain || 'sonic' // current chain
            );
            
            const logResponse = await logGameCompletion(gameResult);

            // Update tokensToMint based on actual reward from backend or calculate bonus
            let tokensToMint = 0;
            if (logResponse?.reward) {
                tokensToMint = parseFloat(logResponse.reward);
            } else if (isBonusMode) {
                // Fallback for bonus mode: 2 ARC per 10 score (2x normal)
                const baseReward = Math.floor(score / 10);
                tokensToMint = getBonusReward('snake', baseReward);
            }
            setTokensEarned(tokensToMint);
                
            // Show mint success modal if tokens were earned
            if (tokensToMint > 0 && logResponse?.mintTransaction) {
                setMintTxHash(logResponse.mintTransaction);
            }
        } catch (error) {
            console.error('Failed to log game completion:', error);
        } finally {
            setIsLoggingGame(false);
            setIsMinting(false);
        }
    };

    const handleStartGame = (bonusMode = false) => {
        setSnake(INITIAL_SNAKE);
        setFood(INITIAL_FOOD);
        setDirection(INITIAL_DIRECTION);
        setScore(0);
        setGameStartTime(Date.now());
        setGameState('running');
        setShowStartScreen(false);
        setShowEndGameScreen(false);
        setIsBonusMode(bonusMode);
        setTokensEarned(0);
        setMintTxHash('');
        setPaymentTxHash('');
        setIsVerifyingPayment(false);
    };

    const handleNewGame = () => {
        // Initialize error logging for new game session
        errorLogger.startGameSession('snake', 'singleplayer', account || 'anonymous', username || 'Anonymous Player');
        errorLogger.addToGameLog('New snake game started');
        
        handleStartGame();
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
                handleStartGame(true);
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
        setShowCountdown(true);
    };
    
    const handleCountdownComplete = () => {
        setShowCountdown(false);
        handleStartGame(isBonusMode);
    };

    const handlePaymentCancel = () => {
        setShowPaymentScreen(false);
        setShowStartScreen(true);
    };

    const handleShowStartScreen = () => {
        setShowStartScreen(true);
        setShowEndGameScreen(false);
        setGameState('idle');
    };

    const handleBackToMenu = () => {
        // Only call onGameEnd once when going back to menu
        if (!showEndGameScreen) return; // Prevent multiple calls
        console.log('🔙 [SNAKE SINGLEPLAYER] Back to menu clicked');
        setShowEndGameScreen(false);
        // Reset all game state
        setSnake(INITIAL_SNAKE);
        setFood(INITIAL_FOOD);
        setDirection(INITIAL_DIRECTION);
        setScore(0);
        setGameState('idle');
        setShowStartScreen(true);
        setIsMinting(false);
        setMintTxHash('');
        setTokensEarned(0);
        setIsLoggingGame(false);
        // Don't call onGameEnd to prevent duplicate screens
        if (onGameEnd) {
            onGameEnd();
        }
    };

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        switch (e.key.toLowerCase()) {
            case 'arrowup': case 'w':
                if (direction.y === 0) setDirection({ x: 0, y: -1 });
                break;
            case 'arrowdown': case 's':
                if (direction.y === 0) setDirection({ x: 0, y: 1 });
                break;
            case 'arrowleft': case 'a':
                if (direction.x === 0) setDirection({ x: -1, y: 0 });
                break;
            case 'arrowright': case 'd':
                if (direction.x === 0) setDirection({ x: 1, y: 0 });
                break;
        }
    }, [direction]);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (gameState !== 'running') return;
        const touch = e.touches[0];
        touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    }, [gameState]);

    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
        if (gameState !== 'running' || !touchStartRef.current) return;
        
        const touch = e.changedTouches[0];
        const deltaX = touch.clientX - touchStartRef.current.x;
        const deltaY = touch.clientY - touchStartRef.current.y;
        const minSwipeDistance = 30;
        
        if (Math.abs(deltaX) < minSwipeDistance && Math.abs(deltaY) < minSwipeDistance) {
            touchStartRef.current = null;
            return;
        }
        
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            // Horizontal swipe
            if (deltaX > 0 && direction.x === 0) {
                setDirection({ x: 1, y: 0 }); // Right
            } else if (deltaX < 0 && direction.x === 0) {
                setDirection({ x: -1, y: 0 }); // Left
            }
        } else {
            // Vertical swipe
            if (deltaY > 0 && direction.y === 0) {
                setDirection({ x: 0, y: 1 }); // Down
            } else if (deltaY < 0 && direction.y === 0) {
                setDirection({ x: 0, y: -1 }); // Up
            }
        }
        
        touchStartRef.current = null;
    }, [gameState, direction]);

    useEffect(() => {
        if(gameState === 'running') {
            window.addEventListener('keydown', handleKeyDown);
            return () => {
                window.removeEventListener('keydown', handleKeyDown);
            };
        }
    }, [gameState, handleKeyDown]);
    
    const gameLoop = useCallback(() => {
        if (gameState !== 'running') return;

        const newSnake = [...snake];
        const head = { ...newSnake[0] };
        head.x += direction.x;
        head.y += direction.y;

        // Wall collision
        if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
            handleGameOver();
            return;
        }

        // Self collision
        for (let i = 1; i < newSnake.length; i++) {
            if (head.x === newSnake[i].x && head.y === newSnake[i].y) {
                handleGameOver();
                return;
            }
        }

        newSnake.unshift(head);

        // Food collision
        if (head.x === food.x && head.y === food.y) {
            setScore(prev => prev + 10);
            generateFood();
        } else {
            newSnake.pop();
        }

        setSnake(newSnake);
    }, [gameState, snake, direction, food, handleGameOver, setScore, generateFood, setSnake]);

    useInterval(gameLoop, gameState === 'running' ? GAME_SPEED : null);

    if (showPaymentScreen) {
        return (
            <div className="w-full h-full flex flex-col justify-center items-center text-white font-headline relative overflow-hidden">
                <PaymentLoadingScreen
                    onPaymentComplete={handlePaymentComplete}
                    onCancel={handlePaymentCancel}
                    gameType="snake"
                    amount="0.1 S"
                />
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center text-white font-headline animate-fade-in h-full w-full max-w-4xl mx-auto p-4 overflow-hidden touch-none">
            {showCountdown && (
                <div className="absolute inset-0 z-50">
                    <CountdownScreen
                        onCountdownComplete={handleCountdownComplete}
                        gameType="snake"
                    />
                </div>
            )}

            {showStartScreen && (
                <SnakeStartScreen 
                    onStartGame={() => {
                        setShowStartScreen(false);
                        setIsBonusMode(false);
                        setShowCountdown(true);
                    }} 
                    onStartBonusMode={handleStartBonusMode}
                />
            )}

            {showEndGameScreen && (
                <SnakeEndGameScreen
                    score={score}
                    onPlayAgain={handleNewGame}
                    onGoToMenu={handleBackToMenu}
                    mintTxHash={mintTxHash}
                    account={account}
                    isMinting={isMinting}
                    tokensEarned={tokensEarned}
                />
            )}

            {!showStartScreen && !showEndGameScreen && (
                <>
                    <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 shadow-lg relative w-full max-w-[80vh] md:max-w-[70vh] lg:max-w-[80vh]">
                        <div className="flex justify-between items-center mb-4 px-2">
                            <div className="text-xl md:text-2xl">Score: <span className="text-accent font-bold">{score}</span></div>
                            <h1 className="text-4xl md:text-6xl text-green-500 uppercase tracking-wider" style={{ WebkitTextStroke: '2px black' }}>Snake</h1>
                            <div className="flex gap-2">
                               <Button size="icon" variant="secondary" onClick={handleStartGame}><RefreshCw/></Button>
                               <ErrorReportButton
                                   gameType="snake"
                                   gameMode="singleplayer"
                                   gameState={{ snake, food, score, gameState, direction }}
                                   size="sm"
                               />
                            </div>
                        </div>

                        <div
                            ref={gameAreaRef}
                            className="grid bg-gray-800 rounded-lg shadow-lg relative overflow-hidden focus:outline-none mx-auto aspect-square"
                            style={{
                                width: '100%',
                                maxWidth: '80vh',
                                gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
                                gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`,
                            }}
                            tabIndex={0}
                            onTouchStart={handleTouchStart}
                            onTouchEnd={handleTouchEnd}
                        >
                            {gameState === 'running' && (
                                <>
                                    {[...Array(GRID_SIZE * GRID_SIZE)].map((_, i) => {
                                        const x = i % GRID_SIZE;
                                        const y = Math.floor(i / GRID_SIZE);
                                        const isSnake = snake.some(seg => seg.x === x && seg.y === y);
                                        const isFood = food.x === x && food.y === y;
                                        let type: 'snake' | 'food' | 'empty' = 'empty';
                                        if (isSnake) type = 'snake';
                                        if (isFood) type = 'food';

                                        return <SnakeCell key={i} type={type} />;
                                    })}
                                </>
                            )}
                        </div>

                        <p className="text-center text-sm text-muted-foreground mt-4">
                            {isMobile ? 'Swipe on the game area to move' : 'Use arrow keys or WASD to move'}
                        </p>
                    </div>
                </>
            )}
            

        </div>
    );
};
