
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import useInterval from 'use-interval';
import { Button } from '@/components/ui/button';
import { RefreshCw, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWeb3 } from '@/components/web3/Web3Provider';
import { logGameCompletion, createGameResult, isValidWalletAddress } from '@/lib/game-logger';
import { MintSuccessModal } from './MintSuccessModal';

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

export const SnakeClient = () => {
    const { account } = useWeb3();
    const [gameState, setGameState] = useState<'idle' | 'running' | 'gameOver'>('idle');
    const [snake, setSnake] = useState(INITIAL_SNAKE);
    const [food, setFood] = useState(INITIAL_FOOD);
    const [direction, setDirection] = useState(INITIAL_DIRECTION);
    const [score, setScore] = useState(0);
    const [gameStartTime, setGameStartTime] = useState<number>(0);
    const [isLoggingGame, setIsLoggingGame] = useState(false);
    const [showMintSuccess, setShowMintSuccess] = useState(false);
    const [mintTxHash, setMintTxHash] = useState<string>('');
    const [tokensEarned, setTokensEarned] = useState<number>(0);

    const generateFood = useCallback(() => {
        let newFoodPosition;
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
        
        // Calculate tokens earned (1 ARC per 10 points)
        const tokensToMint = Math.floor(score / 10);
        setTokensEarned(tokensToMint);
        
        // Only log game if wallet is connected
        if (!isValidWalletAddress(account) || isLoggingGame) {
            return;
        }

        setIsLoggingGame(true);
        
        try {
            const gameDuration = Math.floor((Date.now() - gameStartTime) / 1000); // in seconds
            const isWin = score >= 100; // Consider score >= 100 as a win
            
            const gameResult = createGameResult(
                account!,
                'snake',
                score,
                isWin,
                gameDuration
            );
            
            const logResponse = await logGameCompletion(gameResult);
            
            // Show mint success modal if tokens were earned
            if (tokensToMint > 0 && logResponse?.transactions?.mintTransaction) {
                setMintTxHash(logResponse.transactions.mintTransaction);
                setShowMintSuccess(true);
            }
        } catch (error) {
            console.error('Failed to log game completion:', error);
        } finally {
            setIsLoggingGame(false);
        }
    };

    const handleStartGame = () => {
        setSnake(INITIAL_SNAKE);
        setFood(INITIAL_FOOD);
        setDirection(INITIAL_DIRECTION);
        setScore(0);
        setGameStartTime(Date.now());
        setGameState('running');
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

    useEffect(() => {
        if(gameState === 'running') {
            window.addEventListener('keydown', handleKeyDown);
            return () => {
                window.removeEventListener('keydown', handleKeyDown);
            };
        }
    }, [gameState, handleKeyDown]);
    
    const gameLoop = () => {
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
    };

    useInterval(gameLoop, gameState === 'running' ? GAME_SPEED : null);

    return (
        <div className="flex flex-col items-center justify-center text-white font-headline animate-fade-in">
            <h1 className="text-6xl text-green-500 uppercase tracking-wider mb-2" style={{ WebkitTextStroke: '2px black' }}>Snake</h1>
            <div className="bg-black/50 p-4 rounded-xl shadow-2xl border-2 border-green-500/50 relative">
                <div className="flex justify-between items-center mb-4 px-2">
                    <div className="text-2xl">Score: <span className="text-accent font-bold">{score}</span></div>
                    <div className="flex gap-2">
                       <Button size="icon" variant="secondary" onClick={handleStartGame}><RefreshCw/></Button>
                    </div>
                </div>

                <div
                    className="grid bg-gray-800/50 border-2 border-gray-700 rounded-md relative"
                    style={{
                        gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
                        width: 'clamp(300px, 80vw, 600px)',
                        height: 'clamp(300px, 80vw, 600px)'
                    }}
                >
                    {gameState !== 'running' && (
                        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-10 rounded-md animate-fade-in">
                             <h2 className={cn("font-bold", gameState === 'idle' ? "text-5xl text-green-400" : "text-6xl text-red-500")}>
                                {gameState === 'idle' ? 'Ready to Play?' : 'Game Over'}
                            </h2>
                            {gameState === 'gameOver' && (
                                <div className="text-center">
                                    <p className="text-xl mt-2">Your final score: {score}</p>
                                    {tokensEarned > 0 && (
                                        <p className="text-green-400 text-lg mt-1">🎉 You earned {tokensEarned} ARC token{tokensEarned > 1 ? 's' : ''}!</p>
                                    )}
                                    {tokensEarned === 0 && score > 0 && (
                                        <p className="text-yellow-400 text-sm mt-1">Score 10+ points to earn ARC tokens!</p>
                                    )}
                                    {!isValidWalletAddress(account) && (
                                        <p className="text-yellow-400 text-sm mt-2">Connect wallet to earn rewards</p>
                                    )}
                                    {isLoggingGame && (
                                        <p className="text-blue-400 text-sm mt-2">Logging game result...</p>
                                    )}
                                </div>
                            )}
                            <Button 
                                onClick={handleStartGame} 
                                className="mt-4 text-xl h-12"
                                disabled={isLoggingGame}
                            >
                                {gameState === 'idle' ? <><Play className="mr-2"/>Start Game</> : <><RefreshCw className="mr-2" /> Play Again</>}
                            </Button>
                        </div>
                    )}
                    
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
                 <div className="mt-4 flex justify-center items-center gap-4 md:hidden">
                    <Button size="icon" onClick={() => handleKeyDown({ key: 'a' } as KeyboardEvent)}><ArrowLeft/></Button>
                    <div className="flex flex-col gap-2">
                     <Button size="icon" onClick={() => handleKeyDown({ key: 'w' } as KeyboardEvent)}><ArrowUp/></Button>
                     <Button size="icon" onClick={() => handleKeyDown({ key: 's' } as KeyboardEvent)}><ArrowDown/></Button>
                    </div>
                    <Button size="icon" onClick={() => handleKeyDown({ key: 'd' } as KeyboardEvent)}><ArrowRight/></Button>
                </div>
                <p className="text-center text-sm text-muted-foreground mt-4 hidden md:block">Use arrow keys or WASD to move</p>
            </div>
            
            <MintSuccessModal
                isOpen={showMintSuccess}
                onClose={() => setShowMintSuccess(false)}
                txHash={mintTxHash}
                gameName="Snake"
                tokensEarned={tokensEarned}
            />
        </div>
    );
};
