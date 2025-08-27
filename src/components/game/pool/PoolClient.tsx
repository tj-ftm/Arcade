"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import Ball from './Ball'; // Import the new Ball component
import CueStick from './CueStick'; // Import the CueStick component
import { initializePhysicsState, updatePhysics, applyCueShot, PhysicsState, Vector2D, BALL_RADIUS } from './PoolPhysics';

export interface BallState {
  id: number;
  type: 'cue' | 'solid' | 'stripe' | '8-ball';
  color: string;
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  inPocket: boolean;
  pocketId: string | null;
  radius: number;
}


import type { PoolGameState, PoolPlayer, BallType } from '@/types';
import { Button } from '@/components/ui/button';
import { RefreshCw, PanelLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFirebaseMultiplayer } from '@/hooks/use-firebase-multiplayer';
import { useWeb3 } from '@/components/web3/Web3Provider';
import { logGameCompletion, createGameResult, isValidWalletAddress } from '@/lib/game-logger';

interface Lobby {
  id: string;
  gameType: 'chess' | 'uno' | 'pool';
  player1Id: string;
  player1Name: string;
  player2Id?: string;
  player2Name?: string;
  status: 'waiting' | 'playing' | 'finished';
  createdAt: any; // Firebase timestamp
}

interface PoolClientProps {
  lobby?: Lobby | null; // Make lobby optional and allow null
  isHost: boolean;
  onGameEnd: (gameResult?: {
    winnerId: string;
    winnerName: string;
    winnerAddress: string;
    loserId: string;
    loserName: string;
    loserAddress: string;
  }) => void;
}

export const initialBalls: BallState[] = [
  { id: 0, type: 'cue', color: 'white', position: { x: 250, y: 500 }, velocity: { x: 0, y: 0 }, inPocket: false, pocketId: null, radius: BALL_RADIUS }, // Cue ball
  { id: 1, type: 'solid', color: 'yellow', position: { x: 750, y: 300 }, velocity: { x: 0, y: 0 }, inPocket: false, pocketId: null, radius: BALL_RADIUS }, // Rack position
  { id: 2, type: 'solid', color: 'blue', position: { x: 780, y: 315 }, velocity: { x: 0, y: 0 }, inPocket: false, pocketId: null, radius: BALL_RADIUS },
  { id: 3, type: 'solid', color: 'red', position: { x: 780, y: 285 }, velocity: { x: 0, y: 0 }, inPocket: false, pocketId: null, radius: BALL_RADIUS },
  { id: 4, type: 'solid', color: 'purple', position: { x: 810, y: 330 }, velocity: { x: 0, y: 0 }, inPocket: false, pocketId: null, radius: BALL_RADIUS },
  { id: 5, type: 'solid', color: 'orange', position: { x: 810, y: 270 }, velocity: { x: 0, y: 0 }, inPocket: false, pocketId: null, radius: BALL_RADIUS },
  { id: 6, type: 'solid', color: 'green', position: { x: 840, y: 345 }, velocity: { x: 0, y: 0 }, inPocket: false, pocketId: null, radius: BALL_RADIUS },
  { id: 7, type: 'solid', color: 'maroon', position: { x: 840, y: 255 }, velocity: { x: 0, y: 0 }, inPocket: false, pocketId: null, radius: BALL_RADIUS },
  { id: 8, type: '8-ball', color: 'black', position: { x: 810, y: 300 }, velocity: { x: 0, y: 0 }, inPocket: false, pocketId: null, radius: BALL_RADIUS }, // 8-ball in the middle
  { id: 9, type: 'stripe', color: 'yellow', position: { x: 750, y: 270 }, velocity: { x: 0, y: 0 }, inPocket: false, pocketId: null, radius: BALL_RADIUS },
  { id: 10, type: 'stripe', color: 'blue', position: { x: 810, y: 285 }, velocity: { x: 0, y: 0 }, inPocket: false, pocketId: null, radius: BALL_RADIUS },
  { id: 11, type: 'stripe', color: 'red', position: { x: 840, y: 315 }, velocity: { x: 0, y: 0 }, inPocket: false, pocketId: null, radius: BALL_RADIUS },
  { id: 12, type: 'stripe', color: 'purple', position: { x: 780, y: 300 }, velocity: { x: 0, y: 0 }, inPocket: false, pocketId: null, radius: BALL_RADIUS },
  { id: 13, type: 'stripe', color: 'orange', position: { x: 840, y: 285 }, velocity: { x: 0, y: 0 }, inPocket: false, pocketId: null, radius: BALL_RADIUS },
  { id: 14, type: 'stripe', color: 'green', position: { x: 810, y: 315 }, velocity: { x: 0, y: 0 }, inPocket: false, pocketId: null, radius: BALL_RADIUS },
  { id: 15, type: 'stripe', color: 'maroon', position: { x: 750, y: 330 }, velocity: { x: 0, y: 0 }, inPocket: false, pocketId: null, radius: BALL_RADIUS },
];

export const initialPoolGameState = (player1Id: string, player1Name: string, player2Id: string, player2Name: string): PoolGameState => {
  const player1: PoolPlayer = {
    id: player1Id,
    name: player1Name,
    score: 0,
    ballType: null,
    isTurn: true,
  };
  const player2: PoolPlayer = {
    id: player2Id,
    name: player2Name,
    score: 0,
    ballType: null,
    isTurn: false,
  };

  return {
    players: [player1, player2],
    balls: initialBalls.map(ball => ({ ...ball })),
    activePlayerId: player1Id,
    turn: 1,
    gameLog: ['Game started!'],
    winner: null,
    isGameStarted: true,
    isGameEnded: false,
    cueBallPosition: { x: 50, y: 50 },
    cueBallInHand: true,
    lastPocketedBall: null,
    foul: false,
    scratchOn8Ball: false,
    player1Balls: [],
    player2Balls: [],
    firstBallPocketed: false,
  };
};

export const PoolClient = ({ lobby, isHost, onGameEnd }: PoolClientProps) => {
  const { username, account } = useWeb3();
  const { sendGameMove, setupGameMovesListener, onGameMove } = useFirebaseMultiplayer();
  const [gameState, setGameState] = useState<PoolGameState | null>(null);
  const [turnMessage, setTurnMessage] = useState<string | null>(null);
  const [isLogVisible, setIsLogVisible] = useState(false);
  const [gameStartTime, setGameStartTime] = useState<number>(0);
  const [isLoggingGame, setIsLoggingGame] = useState(false);
  const [isLoadingGame, setIsLoadingGame] = useState(true);
  const [cuePosition, setCuePosition] = useState<Vector2D>({ x: 0, y: 0 });
  const [cueRotation, setCueRotation] = useState<number>(0);
  const [cuePower, setCuePower] = useState<number>(0);
  const [physicsState, setPhysicsState] = useState<PhysicsState>(() => initializePhysicsState(initialBalls));

  // Table dimensions - defined early to avoid hoisting issues
  const TABLE_WIDTH = 1000; // Example width in arbitrary units
  const TABLE_HEIGHT = TABLE_WIDTH / 2; // Standard pool table aspect ratio

  const initializeGame = useCallback(() => {
    const player1Id = lobby?.player1Id || account;
    const player1Name = lobby?.player1Name || username;
    const player2Id = lobby?.player2Id || 'player2-ai'; // Dummy ID for single player
    const player2Name = lobby?.player2Name || 'AI'; // Dummy name for single player

    const player1: PoolPlayer = {
      id: player1Id,
      name: player1Name,
      score: 0,
      ballType: null,
      isTurn: isHost,
    };
    const player2: PoolPlayer = {
      id: player2Id,
      name: player2Name,
      score: 0,
      ballType: null,
      isTurn: !isHost,
    };

    const initialGameState: PoolGameState = {
      players: [player1, player2],
      balls: physicsState.balls.map(ball => ({ ...ball })), // Use predefined initial positions
      activePlayerId: isHost ? player1.id : player2.id,
      turn: 1,
      gameLog: ['Game started!'],
      winner: null,
      isGameStarted: true,
      isGameEnded: false,
      cueBallPosition: { x: 50, y: 50 },
      cueBallInHand: true,
      lastPocketedBall: null,
      foul: false,
      scratchOn8Ball: false,
      player1Balls: [],
      player2Balls: [],
      firstBallPocketed: false,
    };
    setGameState(initialGameState);
    setPhysicsState(initializePhysicsState(initialBalls));
    if (lobby) {
      sendGameMove(lobby.id, initialGameState);
    }
    setGameStartTime(Date.now());
    setIsLoadingGame(false);
  }, [lobby, isHost, sendGameMove, account, username]);

  useEffect(() => {
    if (lobby) {
      setupGameMovesListener(lobby.id);
    }
  }, [lobby, setupGameMovesListener]);

  useEffect(() => {
    const unsubscribe = onGameMove((newPoolGameState) => {
      setGameState(newPoolGameState);
      setIsLoadingGame(false);
      setGameStartTime(Date.now());
    });
    return () => unsubscribe();
  }, [onGameMove]);

  const prevActivePlayerId = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (gameState && gameState.activePlayerId !== prevActivePlayerId.current) {
      const activePlayer = gameState.players.find(p => p.id === gameState.activePlayerId);
      if (activePlayer) {
        setTurnMessage(`${activePlayer.name}'s Turn!`);
      }
      prevActivePlayerId.current = gameState.activePlayerId;
    }
  }, [gameState?.activePlayerId, gameState?.players]);

  useEffect(() => {
    if (!gameState) {
      if (lobby && !isHost) {
        // For multiplayer, if not host, wait for game state from host
        setIsLoadingGame(false);
      } else {
        // For single player, or if host in multiplayer, initialize the game
        initializeGame();
      }
    } else {
      setIsLoadingGame(false);
    }
  }, [gameState, lobby, isHost, initializeGame]);

  useEffect(() => {
    if (turnMessage) {
      const timer = setTimeout(() => {
        setTurnMessage(null);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [turnMessage]);

  const handleEndTurn = useCallback(() => {
    if (!gameState) return;

    const newGameState = { ...gameState };
    const currentPlayerIndex = newGameState.players.findIndex(p => p.id === newGameState.activePlayerId);
    const nextPlayerIndex = (currentPlayerIndex + 1) % newGameState.players.length;
    newGameState.activePlayerId = newGameState.players[nextPlayerIndex].id;
    newGameState.turn += 1;
    newGameState.gameLog.push(`${newGameState.players[currentPlayerIndex].name} ended their turn.`);
    setGameState(newGameState);
    if (lobby) {
         sendGameMove(lobby.id, newGameState);
       }
  }, [gameState, lobby, sendGameMove, physicsState.balls]);

  const handlePocketBall = useCallback((ballId: number, pocketId: string) => {
    if (!gameState) return;

    let updatedPhysicsState: PhysicsState;
    setPhysicsState(prevPhysicsState => {
      const newBalls = prevPhysicsState.balls.map(ball =>
        ball.id === ballId ? { ...ball, inPocket: true, pocketId: pocketId, velocity: { x: 0, y: 0 } } : ball
      );
      updatedPhysicsState = { ...prevPhysicsState, balls: newBalls };
      return updatedPhysicsState;
    });

    setGameState(prevGameState => {
      if (!prevGameState) return prevGameState;

      const newGameState = { ...prevGameState };
      const ball = newGameState.balls.find(b => b.id === ballId);

      if (ball) {
        newGameState.gameLog.push(`${ball.color} ball (${ball.id}) pocketed.`);
        newGameState.lastPocketedBall = ball;

        // Update the ball's inPocket status in gameState as well
        const updatedBallInGameState = newGameState.balls.find(b => b.id === ballId);
        if (updatedBallInGameState) {
          updatedBallInGameState.inPocket = true;
          updatedBallInGameState.pocketId = pocketId;
        }

        // Logic to assign ball types and check for fouls/wins
        const activePlayer = newGameState.players.find(p => p.id === newGameState.activePlayerId);
        if (activePlayer) {
          if (!newGameState.player1BallType && !newGameState.player2BallType) {
            // First ball pocketed determines player's ball type
            if (ball.type === 'solid' || ball.type === 'stripe') {
              if (newGameState.turn === newGameState.players[0].id) {
                newGameState.player1BallType = ball.type;
                newGameState.player2BallType = ball.type === 'solid' ? 'stripe' : 'solid';
              } else {
                newGameState.player1BallType = ball.type === 'solid' ? 'stripe' : 'solid';
                newGameState.player2BallType = ball.type;
              }
              newGameState.gameLog.push(`${activePlayer.name} is now ${ball.type}s.`);
            }
          }

          if (ball.type === 'cue') {
            newGameState.foul = true;
            newGameState.cueBallInHand = true;
            newGameState.gameLog.push(`${activePlayer.name} scratched! Foul.`);
          } else if (ball.type === '8-ball') {
            // 8-ball pocketed - check for win/loss conditions
            const player1BallsRemaining = newGameState.balls.filter(b => b.type === newGameState.player1BallType && !b.inPocket).length;
            const player2BallsRemaining = newGameState.balls.filter(b => b.type === newGameState.player2BallType && !b.inPocket).length;

            if (activePlayer.id === newGameState.players[0].id) { // Player 1's turn
              if (player1BallsRemaining === 0) {
                newGameState.winner = activePlayer.id;
                newGameState.gameLog.push(`${activePlayer.name} wins by pocketing the 8-ball!`);
                newGameState.status = 'ended';
              } else {
                newGameState.winner = newGameState.players[1].id;
                newGameState.gameLog.push(`${activePlayer.name} pocketed the 8-ball too early! ${newGameState.players[1].name} wins!`);
                newGameState.status = 'ended';
                newGameState.foul = true;
              }
            } else { // Player 2's turn
              if (player2BallsRemaining === 0) {
                newGameState.winner = activePlayer.id;
                newGameState.gameLog.push(`${activePlayer.name} wins by pocketing the 8-ball!`);
                newGameState.status = 'ended';
              } else {
                newGameState.winner = newGameState.players[0].id;
                newGameState.gameLog.push(`${activePlayer.name} pocketed the 8-ball too early! ${newGameState.players[0].name} wins!`);
                newGameState.status = 'ended';
                newGameState.foul = true;
              }
            }
          } else if (ball.type !== newGameState.player1BallType && ball.type !== newGameState.player2BallType) {
            // This case should ideally not happen if ball types are assigned correctly
            newGameState.foul = true;
            newGameState.gameLog.push(`${activePlayer.name} pocketed an unassigned ball. Foul.`);
          } else if (activePlayer.id === newGameState.players[0].id && ball.type !== newGameState.player1BallType) {
            newGameState.foul = true;
            newGameState.gameLog.push(`${activePlayer.name} pocketed opponent's ball. Foul.`);
          } else if (activePlayer.id === newGameState.players[1].id && ball.type !== newGameState.player2BallType) {
            newGameState.foul = true;
            newGameState.gameLog.push(`${activePlayer.name} pocketed opponent's ball. Foul.`);
          }
        }
      }

      if (lobby) {
        sendGameMove(lobby.id, newGameState);
      }
      return newGameState;
    });
  }, [gameState, lobby, sendGameMove]);

  // Game loop for physics updates
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const gameLoop = (currentTime: number) => {
      const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
      lastTime = currentTime;

      setPhysicsState(prevPhysicsState => {
        const newPhysicsState = updatePhysics(prevPhysicsState, deltaTime);
        // Update gameState balls with new positions from physicsState
        setGameState(prevGameState => {
          if (!prevGameState) return prevGameState;
          return {
            ...prevGameState,
            balls: newPhysicsState.balls.map(physicsBall => {
              const existingBall = prevGameState.balls.find(b => b.id === physicsBall.id);
              return {
                ...existingBall!,
                position: physicsBall.position,
                velocity: physicsBall.velocity,
              };
            }),
          };
        });
        const allBallsStopped = newPhysicsState.balls.every(ball =>
          Math.abs(ball.velocity.x) < 0.01 && Math.abs(ball.velocity.y) < 0.01
        );

        if (allBallsStopped && !prevPhysicsState.allBallsStopped && !prevGameState.cueBallInHand) {
          // All balls have stopped after a shot
          // Determine next turn or foul
          const newGameState = { ...prevGameState };
          const activePlayer = newGameState.players.find(p => p.id === newGameState.activePlayerId);

          if (newGameState.foul) {
            newGameState.gameLog.push(`${activePlayer?.name} committed a foul. Turn over.`);
            newGameState.foul = false;
            // Switch turn
            const currentPlayerIndex = newGameState.players.findIndex(p => p.id === newGameState.activePlayerId);
            const nextPlayerIndex = (currentPlayerIndex + 1) % newGameState.players.length;
            newGameState.activePlayerId = newGameState.players[nextPlayerIndex].id;
            newGameState.turn += 1;
            newGameState.gameLog.push(`${newGameState.players[currentPlayerIndex].name} ended their turn.`);
            if (lobby) {
               sendGameMove(lobby.id, newGameState);
             }
          } else {
            // No foul, check if player pocketed their own ball
            const lastPocketedBall = newGameState.lastPocketedBall;
            if (lastPocketedBall && activePlayer && lastPocketedBall.type === activePlayer.ballType) {
              newGameState.gameLog.push(`${activePlayer.name} pocketed their own ball. Turn continues.`);
              // Turn continues, no change to activePlayerId
            } else {
              newGameState.gameLog.push(`${activePlayer?.name} did not pocket their own ball. Turn over.`);
              // Switch turn
              const currentPlayerIndex = newGameState.players.findIndex(p => p.id === newGameState.activePlayerId);
              const nextPlayerIndex = (currentPlayerIndex + 1) % newGameState.players.length;
              newGameState.activePlayerId = newGameState.players[nextPlayerIndex].id;
              newGameState.turn += 1;
              newGameState.gameLog.push(`${newGameState.players[currentPlayerIndex].name} ended their turn.`);
              sendGameMove(lobby.id, newGameState);
            }
          }
          // Reset lastPocketedBall after turn logic
          newGameState.lastPocketedBall = null;
          setGameState(newGameState);
          if (lobby) {
            sendGameMove(lobby.id, newGameState);
          }
          return { ...newPhysicsState, allBallsStopped: true };
        }
        return { ...newPhysicsState, allBallsStopped: allBallsStopped };
      });

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);

    return () => cancelAnimationFrame(animationFrameId);
  }, [handlePocketBall, gameState, sendGameMove, lobby]);

  const tableRef = useRef<HTMLDivElement>(null);
  const isAiming = useRef(false);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!gameState || !tableRef.current || !gameState.cueBallInHand) return;

    const tableRect = tableRef.current.getBoundingClientRect();
    const cueBall = gameState.balls.find(ball => ball.type === 'cue');
    if (!cueBall) return;

    // Calculate mouse position relative to the table
    const mouseX = e.clientX - tableRect.left;
    const mouseY = e.clientY - tableRect.top;

    // Convert mouse position to table's internal coordinate system
    const scaledMouseX = (mouseX / tableRect.width) * TABLE_WIDTH;
    const scaledMouseY = (mouseY / tableRect.height) * TABLE_HEIGHT;

    // Calculate angle between cue ball and mouse position
    const deltaX = scaledMouseX - cueBall.position.x;
    const deltaY = scaledMouseY - cueBall.position.y;
    const angleRad = Math.atan2(deltaY, deltaX);
    const angleDeg = angleRad * (180 / Math.PI);

    setCueRotation(angleDeg);

    if (isAiming.current) {
      // Calculate distance for power (simple linear for now)
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const power = Math.min(100, distance / 5); // Max power 100, scale distance
      setCuePower(power);
    }
  }, [gameState, TABLE_WIDTH, TABLE_HEIGHT]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!gameState || !gameState.cueBallInHand) return;
    isAiming.current = true;
    setCuePower(0);
  }, [gameState]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (!gameState || !gameState.cueBallInHand || !isAiming.current) return;
    isAiming.current = false;

    // Trigger shot with current power and rotation
    const cueBall = gameState.balls.find(ball => ball.type === 'cue');
    if (cueBall) {
      const updatedPhysicsState = applyCueShot(physicsState, cueBall.id, cuePower, cueRotation);
      setPhysicsState(updatedPhysicsState);
    }
    setCuePower(0); // Reset power after shot
    setGameState(prevGameState => {
      if (!prevGameState) return prevGameState;
      return {
        ...prevGameState,
        cueBallInHand: false,
      };
    });
  }, [gameState, cuePower, cueRotation]);

  const handleFoul = useCallback(() => {
    if (!gameState) return;
    const newGameState = { ...gameState, foul: true };
    newGameState.gameLog.push(`${newGameState.players.find(p => p.id === newGameState.activePlayerId)?.name} committed a foul.`);
    setGameState(newGameState);
    if (lobby) {
      sendGameMove(lobby.id, newGameState);
    }
  }, [gameState, lobby, sendGameMove]);

  const handlePlaceCueBall = useCallback((x: number, y: number) => {
    if (!gameState) return;
    const newGameState = { ...gameState, cueBallPosition: { x, y }, cueBallInHand: false };
    newGameState.gameLog.push(`${newGameState.players.find(p => p.id === newGameState.activePlayerId)?.name} placed the cue ball.`);
    setGameState(newGameState);
    if (lobby) {
      sendGameMove(lobby.id, newGameState);
    }
  }, [gameState, lobby, sendGameMove]);

  const handleGameEnd = useCallback(async (winnerId: string, winnerName: string) => {
    if (!gameState || isLoggingGame) return;

    setIsLoggingGame(true);
    const loser = gameState.players.find(p => p.id !== winnerId);
    if (!loser) {
      console.error("Loser not found");
      setIsLoggingGame(false);
      return;
    }

    const gameDuration = Math.floor((Date.now() - gameStartTime) / 1000);
    const gameResult = createGameResult(
      lobby.id,
      'pool',
      lobby.player1Id,
      lobby.player1Name,
      lobby.player2Id!,
      lobby.player2Name!,
      winnerId,
      winnerName,
      loser.id,
      loser.name,
      gameStartTime,
      Date.now(),
      gameDuration
    );

    try {
      await logGameCompletion(gameResult);
      console.log('Game result logged successfully.');
    } catch (error) {
      console.error('Failed to log game result:', error);
    } finally {
      setIsLoggingGame(false);
      onGameEnd({
        winnerId: winnerId,
        winnerName: winnerName,
        winnerAddress: winnerId, // Assuming ID is address for simplicity
        loserId: loser.id,
        loserName: loser.name,
        loserAddress: loser.id, // Assuming ID is address for simplicity
      });
    }
  }, [gameState, isLoggingGame, gameStartTime, lobby, onGameEnd]);

  if (isLoadingGame) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-green-700 to-green-900 text-white">
        <p className="text-2xl">Loading Pool Game...</p>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-green-700 to-green-900 text-white">
        <p className="text-2xl">Waiting for opponent to join...</p>
      </div>
    );
  }

  const activePlayer = gameState.players.find(p => p.id === gameState.activePlayerId);
  const currentPlayer = gameState.players.find(p => p.id === account);
  const opponentPlayer = gameState.players.find(p => p.id !== account);

  // Define pocket positions (relative to table dimensions)
  const POCKET_RADIUS = 25; // Example radius, adjust as needed
  const POCKETS = [
    { id: 'top-left', position: { x: 0, y: 0 } },
    { id: 'top-middle', position: { x: TABLE_WIDTH / 2, y: 0 } },
    { id: 'top-right', position: { x: TABLE_WIDTH, y: 0 } },
    { id: 'bottom-left', position: { x: 0, y: TABLE_HEIGHT } },
    { id: 'bottom-middle', position: { x: TABLE_WIDTH / 2, y: TABLE_HEIGHT } },
    { id: 'bottom-right', position: { x: TABLE_WIDTH, y: TABLE_HEIGHT } },
  ];

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen w-full bg-gradient-to-br from-green-700 to-green-900 text-white p-4">
      {/* Game Board (Placeholder) */}
      <div
        ref={tableRef}
        className="relative w-full max-w-4xl aspect-video bg-green-800 border-8 border-amber-900 rounded-lg shadow-lg flex items-center justify-center"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      >
        <h2 className="text-4xl font-bold">Pool Table</h2>
        {/* Render pockets */}
        {POCKETS.map(pocket => (
          <div
            key={pocket.id}
            className="absolute bg-black rounded-full"
            style={{
              left: `${pocket.position.x}px`,
              top: `${pocket.position.y}px`,
              width: `${POCKET_RADIUS * 2}px`,
              height: `${POCKET_RADIUS * 2}px`,
              transform: 'translate(-50%, -50%)'
            }}
          />
        ))}

        {/* Render balls */}
        {physicsState.balls.map(ball => (
            !ball.inPocket && (
              <Ball
                key={ball.id}
                ball={ball}
                tableWidth={TABLE_WIDTH}
                tableHeight={TABLE_HEIGHT}
              />
            )
          ))}

        {/* Render Cue Stick */}
        {gameState.cueBallInHand && (
          <CueStick
            position={gameState.cueBallPosition}
            rotation={cueRotation}
            power={cuePower}
            tableWidth={TABLE_WIDTH}
            tableHeight={TABLE_HEIGHT}
          />
        )}
        {/* Cue Ball in Hand placement (example) */}
        {gameState.cueBallInHand && currentPlayer?.id === gameState.activePlayerId && (
          <div
            className="absolute bg-white w-6 h-6 rounded-full cursor-pointer border-2 border-blue-500"
            style={{ left: gameState.cueBallPosition.x, top: gameState.cueBallPosition.y }}
            onClick={() => handlePlaceCueBall(Math.random() * 100, Math.random() * 100)} // Example placement
          ></div>
        )}
      </div>

      {/* Player Info */}
      <div className="flex justify-around w-full max-w-4xl mt-4">
        <div className={cn("p-4 rounded-lg", currentPlayer?.id === gameState.activePlayerId ? 'bg-blue-600' : 'bg-gray-700')}>
          <h3 className="text-xl font-semibold">{currentPlayer?.name} {currentPlayer?.ballType ? `(${currentPlayer.ballType}s)` : ''}</h3>
          <p>Score: {currentPlayer?.score}</p>
        </div>
        <div className={cn("p-4 rounded-lg", opponentPlayer?.id === gameState.activePlayerId ? 'bg-blue-600' : 'bg-gray-700')}>
          <h3 className="text-xl font-semibold">{opponentPlayer?.name} {opponentPlayer?.ballType ? `(${opponentPlayer.ballType}s)` : ''}</h3>
          <p>Score: {opponentPlayer?.score}</p>
        </div>
      </div>

      {/* Game Controls */}
      <div className="mt-4 flex gap-4">
        {currentPlayer?.id === gameState.activePlayerId && (
          <Button onClick={handleEndTurn} className="bg-blue-500 hover:bg-blue-700">End Turn</Button>
        )}
        <Button onClick={() => handlePocketBall(Math.floor(Math.random() * 15) + 1)} className="bg-red-500 hover:bg-red-700">Pocket Random Ball (Test)</Button>
        <Button onClick={handleFoul} className="bg-yellow-500 hover:bg-yellow-700">Commit Foul (Test)</Button>
        {gameState.winner && (
          <Button onClick={() => handleGameEnd(gameState.winner === currentPlayer?.name ? currentPlayer.id : opponentPlayer!.id, gameState.winner!)} className="bg-green-500 hover:bg-green-700">End Game (Test)</Button>
        )}
      </div>

      {/* Game Log */}
      <div className="mt-4 w-full max-w-4xl bg-gray-800 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Game Log</h3>
        <ScrollArea className="h-32">
          {gameState.gameLog.map((log, index) => (
            <p key={index} className="text-sm text-gray-300">{log}</p>
          ))}
        </ScrollArea>
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
    </div>
  );
};