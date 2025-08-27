"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { useWeb3 } from '@/components/web3/Web3Provider';
import { useFirebaseMultiplayer } from '@/hooks/use-firebase-multiplayer';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PanelLeft } from 'lucide-react';

interface Ball {
  id: number;
  type: 'cue' | 'solid' | 'stripe' | '8-ball';
  color: string;
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  inPocket: boolean;
  radius: number;
}

interface PoolGameState {
  balls: Ball[];
  activePlayerId: string;
  turn: number;
  gameLog: string[];
  winner: string | null;
  isGameStarted: boolean;
  isGameEnded: boolean;
  cueBallInHand: boolean;
  foul: boolean;
  players: Array<{
    id: string;
    name: string;
    ballType: 'solid' | 'stripe' | null;
    score: number;
  }>;
}

interface PoolGameEngineProps {
  lobby?: any;
  isHost: boolean;
  onGameEnd: (gameResult?: {
    winnerId: string;
    winnerName: string;
    winnerAddress: string;
    loserId: string;
    loserName: string;
    loserAddress: string;
  }) => void;
  gameMode: 'singleplayer' | 'multiplayer';
}

const BALL_RADIUS = 12;
const BASE_TABLE_WIDTH = 800;
const BASE_TABLE_HEIGHT = 400;

// Responsive scaling function
const getResponsiveScale = () => {
  if (typeof window === 'undefined') return 1;
  
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  
  // Calculate scale based on viewport
  const scaleX = Math.min(vw * 0.9, BASE_TABLE_WIDTH) / BASE_TABLE_WIDTH;
  const scaleY = Math.min(vh * 0.6, BASE_TABLE_HEIGHT) / BASE_TABLE_HEIGHT;
  
  return Math.min(scaleX, scaleY, 1);
};

const getTableDimensions = () => {
  const scale = getResponsiveScale();
  return {
    width: BASE_TABLE_WIDTH * scale,
    height: BASE_TABLE_HEIGHT * scale,
    scale
  };
};

const initialBalls: Ball[] = [
  { id: 0, type: 'cue', color: '#FFFFFF', position: { x: 200, y: 200 }, velocity: { x: 0, y: 0 }, inPocket: false, radius: BALL_RADIUS },
  { id: 1, type: 'solid', color: '#FFE135', position: { x: 600, y: 200 }, velocity: { x: 0, y: 0 }, inPocket: false, radius: BALL_RADIUS },
  { id: 2, type: 'solid', color: '#1E90FF', position: { x: 620, y: 185 }, velocity: { x: 0, y: 0 }, inPocket: false, radius: BALL_RADIUS },
  { id: 3, type: 'solid', color: '#FF4444', position: { x: 620, y: 215 }, velocity: { x: 0, y: 0 }, inPocket: false, radius: BALL_RADIUS },
  { id: 4, type: 'solid', color: '#DA70D6', position: { x: 640, y: 170 }, velocity: { x: 0, y: 0 }, inPocket: false, radius: BALL_RADIUS },
  { id: 5, type: 'solid', color: '#FF8C00', position: { x: 640, y: 230 }, velocity: { x: 0, y: 0 }, inPocket: false, radius: BALL_RADIUS },
  { id: 6, type: 'solid', color: '#32CD32', position: { x: 660, y: 155 }, velocity: { x: 0, y: 0 }, inPocket: false, radius: BALL_RADIUS },
  { id: 7, type: 'solid', color: '#DC143C', position: { x: 660, y: 245 }, velocity: { x: 0, y: 0 }, inPocket: false, radius: BALL_RADIUS },
  { id: 8, type: '8-ball', color: '#000000', position: { x: 640, y: 200 }, velocity: { x: 0, y: 0 }, inPocket: false, radius: BALL_RADIUS },
  { id: 9, type: 'stripe', color: '#FFE135', position: { x: 680, y: 140 }, velocity: { x: 0, y: 0 }, inPocket: false, radius: BALL_RADIUS },
  { id: 10, type: 'stripe', color: '#1E90FF', position: { x: 680, y: 260 }, velocity: { x: 0, y: 0 }, inPocket: false, radius: BALL_RADIUS },
  { id: 11, type: 'stripe', color: '#FF4444', position: { x: 680, y: 185 }, velocity: { x: 0, y: 0 }, inPocket: false, radius: BALL_RADIUS },
  { id: 12, type: 'stripe', color: '#DA70D6', position: { x: 680, y: 215 }, velocity: { x: 0, y: 0 }, inPocket: false, radius: BALL_RADIUS },
  { id: 13, type: 'stripe', color: '#FF8C00', position: { x: 700, y: 170 }, velocity: { x: 0, y: 0 }, inPocket: false, radius: BALL_RADIUS },
  { id: 14, type: 'stripe', color: '#32CD32', position: { x: 700, y: 230 }, velocity: { x: 0, y: 0 }, inPocket: false, radius: BALL_RADIUS },
  { id: 15, type: 'stripe', color: '#DC143C', position: { x: 720, y: 200 }, velocity: { x: 0, y: 0 }, inPocket: false, radius: BALL_RADIUS },
];

export const PoolGameEngine = ({ lobby, isHost, onGameEnd, gameMode }: PoolGameEngineProps) => {
  const { username, account } = useWeb3();
  const { sendGameMove, setupGameMovesListener, onGameMove } = useFirebaseMultiplayer();
  const [gameState, setGameState] = useState<PoolGameState | null>(null);
  const [isLogVisible, setIsLogVisible] = useState(false);
  const [gameStartTime, setGameStartTime] = useState<number>(0);
  const [cueAngle, setCueAngle] = useState(0);
  const [cuePower, setCuePower] = useState(0);
  const [isAiming, setIsAiming] = useState(false);
  const [tableDimensions, setTableDimensions] = useState(getTableDimensions());
  const tableRef = useRef<HTMLDivElement>(null);

  // Update dimensions on window resize
  useEffect(() => {
    const handleResize = () => {
      setTableDimensions(getTableDimensions());
    };
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // Initialize game state
  const initializeGame = useCallback(() => {
    const player1Id = lobby?.player1Id || account || 'player1';
    const player1Name = lobby?.player1Name || username || 'Player 1';
    const player2Id = lobby?.player2Id || 'ai';
    const player2Name = lobby?.player2Name || 'AI';

    const initialGameState: PoolGameState = {
      balls: [...initialBalls],
      activePlayerId: isHost ? player1Id : player2Id,
      turn: 1,
      gameLog: ['Game started!'],
      winner: null,
      isGameStarted: true,
      isGameEnded: false,
      cueBallInHand: false,
      foul: false,
      players: [
        { id: player1Id, name: player1Name, ballType: null, score: 0 },
        { id: player2Id, name: player2Name, ballType: null, score: 0 }
      ]
    };

    setGameState(initialGameState);
    setGameStartTime(Date.now());

    if (lobby && gameMode === 'multiplayer') {
      sendGameMove(lobby.id, initialGameState);
    }
  }, [lobby, isHost, account, username, gameMode, sendGameMove]);

  // Set up multiplayer listeners
  useEffect(() => {
    if (gameMode === 'multiplayer' && lobby) {
      setupGameMovesListener(lobby.id);
      
      const unsubscribe = onGameMove((newGameState: PoolGameState) => {
        setGameState(newGameState);
      });
      
      return () => unsubscribe();
    }
  }, [lobby, gameMode, setupGameMovesListener, onGameMove]);

  // Initialize game on mount
  useEffect(() => {
    initializeGame();
  }, []); // Empty dependency array to run only once

  // Handle pointer events for cue aiming (supports both mouse and touch)
  const getPointerPosition = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!tableRef.current) return null;
    
    const rect = tableRef.current.getBoundingClientRect();
    let clientX, clientY;
    
    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }, []);

  const handlePointerMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!gameState) return;
    
    const position = getPointerPosition(e);
    if (!position) return;
    
    const cueBall = gameState.balls.find(ball => ball.type === 'cue' && !ball.inPocket);
    if (!cueBall) return;
    
    const deltaX = position.x - (cueBall.position.x * tableDimensions.scale);
    const deltaY = position.y - (cueBall.position.y * tableDimensions.scale);
    const angle = Math.atan2(deltaY, deltaX);
    
    setCueAngle(angle);
    
    if (isAiming) {
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      setCuePower(Math.min(100, distance / 2));
    }
  }, [gameState, isAiming, getPointerPosition]);

  const handlePointerDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!gameState || gameState.activePlayerId !== account) return;
    e.preventDefault();
    setIsAiming(true);
    setCuePower(0);
  }, [gameState, account]);

  const handlePointerUp = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!gameState || !isAiming || gameState.activePlayerId !== account) return;
    e.preventDefault();
    
    setIsAiming(false);
    
    // Simulate shot
    const newGameState = { ...gameState };
    const cueBall = newGameState.balls.find(ball => ball.type === 'cue' && !ball.inPocket);
    
    if (cueBall && cuePower > 10) {
      const force = cuePower / 10;
      cueBall.velocity.x = Math.cos(cueAngle) * force;
      cueBall.velocity.y = Math.sin(cueAngle) * force;
      
      newGameState.gameLog.push(`${gameState.players.find(p => p.id === gameState.activePlayerId)?.name} took a shot`);
      
      // Switch turns after shot
      setTimeout(() => {
        const currentPlayerIndex = newGameState.players.findIndex(p => p.id === newGameState.activePlayerId);
        const nextPlayerIndex = (currentPlayerIndex + 1) % newGameState.players.length;
        newGameState.activePlayerId = newGameState.players[nextPlayerIndex].id;
        newGameState.turn++;
        
        setGameState(newGameState);
        
        if (lobby && gameMode === 'multiplayer') {
          sendGameMove(lobby.id, newGameState);
        }
      }, 2000);
    }
    
    setCuePower(0);
  }, [gameState, isAiming, account, cuePower, cueAngle, lobby, gameMode, sendGameMove]);

  // Legacy mouse event handlers for backward compatibility
  const handleMouseMove = useCallback((e: React.MouseEvent) => handlePointerMove(e), [handlePointerMove]);
  const handleMouseDown = useCallback((e: React.MouseEvent) => handlePointerDown(e), [handlePointerDown]);
  const handleMouseUp = useCallback((e: React.MouseEvent) => handlePointerUp(e), [handlePointerUp]);
  
  // Touch event handlers
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    handlePointerMove(e);
  }, [handlePointerMove]);
  
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    handlePointerDown(e);
  }, [handlePointerDown]);
  
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    handlePointerUp(e);
  }, [handlePointerUp]);

  // Simple physics simulation
  useEffect(() => {
    if (!gameState) return;
    
    const interval = setInterval(() => {
      setGameState(prevState => {
        if (!prevState) return prevState;
        
        const newState = { ...prevState };
        let hasMovement = false;
        
        newState.balls = newState.balls.map(ball => {
          if (ball.inPocket) return ball;
          
          const newBall = { ...ball };
          
          // Apply velocity
          if (Math.abs(newBall.velocity.x) > 0.1 || Math.abs(newBall.velocity.y) > 0.1) {
            newBall.position.x += newBall.velocity.x;
            newBall.position.y += newBall.velocity.y;
            
            // Apply friction
            newBall.velocity.x *= 0.98;
            newBall.velocity.y *= 0.98;
            
            hasMovement = true;
          } else {
            newBall.velocity.x = 0;
            newBall.velocity.y = 0;
          }
          
          // Boundary collision
           if (newBall.position.x - BALL_RADIUS < 50) {
             newBall.position.x = 50 + BALL_RADIUS;
             newBall.velocity.x *= -0.8;
           }
           if (newBall.position.x + BALL_RADIUS > BASE_TABLE_WIDTH - 50) {
             newBall.position.x = BASE_TABLE_WIDTH - 50 - BALL_RADIUS;
             newBall.velocity.x *= -0.8;
           }
           if (newBall.position.y - BALL_RADIUS < 50) {
             newBall.position.y = 50 + BALL_RADIUS;
             newBall.velocity.y *= -0.8;
           }
           if (newBall.position.y + BALL_RADIUS > BASE_TABLE_HEIGHT - 50) {
             newBall.position.y = BASE_TABLE_HEIGHT - 50 - BALL_RADIUS;
             newBall.velocity.y *= -0.8;
           }
          
          return newBall;
        });
        
        return newState;
      });
    }, 16);
    
    return () => clearInterval(interval);
  }, [gameState]);

  const handleEndGame = useCallback((winnerId: string) => {
    if (!gameState) return;
    
    const winner = gameState.players.find(p => p.id === winnerId);
    const loser = gameState.players.find(p => p.id !== winnerId);
    
    if (winner && loser) {
      onGameEnd({
        winnerId: winner.id,
        winnerName: winner.name,
        winnerAddress: winner.id,
        loserId: loser.id,
        loserName: loser.name,
        loserAddress: loser.id
      });
    }
  }, [gameState, onGameEnd]);

  if (!gameState) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-green-700 to-green-900 text-white">
        <p className="text-2xl">Loading Pool Game...</p>
      </div>
    );
  }

  const activePlayer = gameState.players.find(p => p.id === gameState.activePlayerId);
  const cueBall = gameState.balls.find(ball => ball.type === 'cue' && !ball.inPocket);

  return (
    <div 
      className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at center, #1a4d3a 0%, #0f2419 70%, #000000 100%)',
        paddingTop: '80px', // Space for top UI
        paddingBottom: '80px', // Space for bottom UI
        paddingLeft: '20px',
        paddingRight: '20px',
        minHeight: '100vh'
      }}
    >
      {/* Ambient lighting overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-yellow-200/10 via-transparent to-transparent pointer-events-none" />
      
      {/* Player UI Top Bar */}
      <div className="absolute top-4 left-0 right-0 flex justify-between items-center px-8 z-20">
        {/* Player 1 */}
        <div className="flex items-center gap-3 bg-black/40 backdrop-blur-sm rounded-xl p-3 border border-white/20">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 border-2 border-white/30 flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-sm">P1</span>
          </div>
          <div>
            <p className="text-white font-semibold text-sm">{gameState.players[0]?.name}</p>
            <p className="text-blue-300 text-xs">Score: {gameState.players[0]?.score}</p>
          </div>
        </div>
        
        {/* Center Coins/Rewards */}
        <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 backdrop-blur-sm rounded-xl p-3 border border-yellow-400/30">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg animate-pulse">
            <span className="text-black font-bold text-xs">50</span>
          </div>
          <span className="text-yellow-300 font-semibold text-sm">ARC</span>
        </div>
        
        {/* Player 2 */}
        <div className="flex items-center gap-3 bg-black/40 backdrop-blur-sm rounded-xl p-3 border border-white/20">
          <div>
            <p className="text-white font-semibold text-sm text-right">{gameState.players[1]?.name}</p>
            <p className="text-red-300 text-xs text-right">Score: {gameState.players[1]?.score}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-400 to-red-600 border-2 border-white/30 flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-sm">P2</span>
          </div>
        </div>
      </div>

      {/* Game Table */}
      <div 
        ref={tableRef}
        className="relative shadow-2xl"
        style={{ 
          width: tableDimensions.width, 
          height: tableDimensions.height,
          background: 'linear-gradient(145deg, #8B4513 0%, #A0522D 50%, #8B4513 100%)',
          borderRadius: `${20 * tableDimensions.scale}px`,
          border: `${8 * tableDimensions.scale}px solid #654321`,
          boxShadow: `0 ${20 * tableDimensions.scale}px ${40 * tableDimensions.scale}px rgba(0,0,0,0.5), inset 0 ${2 * tableDimensions.scale}px ${4 * tableDimensions.scale}px rgba(255,255,255,0.1)`,
          touchAction: 'none',
          maxWidth: '90vw',
          maxHeight: '60vh'
        }}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onTouchMove={handleTouchMove}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Table felt with realistic texture */}
        <div 
          className="absolute rounded-xl shadow-inner"
          style={{
            inset: '12px',
            background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 25%, #1d4ed8 50%, #2563eb 75%, #3b82f6 100%)',
            boxShadow: 'inset 0 4px 8px rgba(0,0,0,0.3), inset 0 -2px 4px rgba(255,255,255,0.1)',
            backgroundImage: `
              radial-gradient(circle at 25% 25%, rgba(255,255,255,0.05) 0%, transparent 50%),
              linear-gradient(45deg, rgba(0,0,0,0.05) 25%, transparent 25%),
              linear-gradient(-45deg, rgba(0,0,0,0.05) 25%, transparent 25%)
            `,
            backgroundSize: '100px 100px, 20px 20px, 20px 20px'
          }}
        >
          {/* Metallic corner pockets with depth */}
          {[
            { top: '-16px', left: '-16px', corner: 'tl' },
            { top: '-16px', left: '50%', transform: 'translateX(-50%)', corner: 'tm' },
            { top: '-16px', right: '-16px', corner: 'tr' },
            { bottom: '-16px', left: '-16px', corner: 'bl' },
            { bottom: '-16px', left: '50%', transform: 'translateX(-50%)', corner: 'bm' },
            { bottom: '-16px', right: '-16px', corner: 'br' }
          ].map((pocket, index) => (
            <div
              key={index}
              className="absolute"
              style={{
                ...pocket,
                width: pocket.corner.includes('m') ? '24px' : '32px',
                height: pocket.corner.includes('m') ? '32px' : '32px',
                background: 'radial-gradient(circle, #000000 30%, #1a1a1a 60%, #333333 100%)',
                borderRadius: pocket.corner.includes('m') ? 
                  (pocket.corner === 'tm' ? '0 0 50% 50%' : '50% 50% 0 0') : '50%',
                border: '2px solid #666666',
                boxShadow: 'inset 0 4px 8px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.3)'
              }}
            />
          ))}
          
          {/* Balls with 3D spherical effects */}
          {gameState.balls.map(ball => (
            !ball.inPocket && (
              <div
                key={ball.id}
                className="absolute flex items-center justify-center text-xs font-bold transition-all duration-100"
                style={{
                   left: (ball.position.x * tableDimensions.scale) - (BALL_RADIUS * tableDimensions.scale),
                   top: (ball.position.y * tableDimensions.scale) - (BALL_RADIUS * tableDimensions.scale),
                   width: BALL_RADIUS * 2 * tableDimensions.scale,
                   height: BALL_RADIUS * 2 * tableDimensions.scale,
                  borderRadius: '50%',
                  background: ball.type === '8-ball' ? 
                    'radial-gradient(circle at 30% 30%, #333333, #000000 70%)' :
                    ball.type === 'cue' ?
                    'radial-gradient(circle at 30% 30%, #ffffff, #f0f0f0 70%)' :
                    `radial-gradient(circle at 30% 30%, ${ball.color}, ${ball.color}dd 70%)`,
                  border: '1px solid rgba(255,255,255,0.3)',
                  boxShadow: `
                    0 4px 8px rgba(0,0,0,0.3),
                    inset -2px -2px 4px rgba(0,0,0,0.2),
                    inset 2px 2px 4px rgba(255,255,255,0.3),
                    0 0 10px rgba(255,255,255,0.1)
                  `,
                  color: 'white',
                  textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
                }}
              >
                {ball.id === 0 ? '' : ball.id}
                {/* Ball highlight */}
                <div 
                  className="absolute top-1 left-1 w-2 h-2 rounded-full bg-white/40 blur-sm"
                  style={{ transform: 'translate(-50%, -50%)' }}
                />
              </div>
            )
          ))}
          
          {/* Enhanced Cue stick with wooden texture and golden details */}
          {cueBall && gameState.activePlayerId === account && (
            <>
              {/* Aiming guide line with glow */}
              <div
                 className="absolute pointer-events-none"
                 style={{
                   left: cueBall.position.x * tableDimensions.scale,
                   top: cueBall.position.y * tableDimensions.scale,
                   width: `${200 * tableDimensions.scale}px`,
                   height: `${2 * tableDimensions.scale}px`,
                   background: 'linear-gradient(90deg, rgba(0,255,255,0.8) 0%, rgba(0,255,255,0.4) 50%, transparent 100%)',
                   transform: `rotate(${cueAngle}rad)`,
                   transformOrigin: 'left center',
                   boxShadow: `0 0 ${10 * tableDimensions.scale}px rgba(0,255,255,0.5)`,
                   backgroundImage: `repeating-linear-gradient(90deg, transparent 0px, transparent ${8 * tableDimensions.scale}px, rgba(255,255,255,0.3) ${8 * tableDimensions.scale}px, rgba(255,255,255,0.3) ${12 * tableDimensions.scale}px)`
                 }}
               />
              
              {/* Wooden cue stick with golden details */}
              <div
                 className="absolute pointer-events-none"
                 style={{
                   left: cueBall.position.x * tableDimensions.scale,
                   top: cueBall.position.y * tableDimensions.scale,
                   width: `${(80 + cuePower) * tableDimensions.scale}px`,
                   height: `${6 * tableDimensions.scale}px`,
                   background: 'linear-gradient(90deg, #D4AF37 0%, #DAA520 10%, #8B4513 20%, #A0522D 80%, #654321 100%)',
                   transform: `rotate(${cueAngle}rad) translateX(-${(30 + cuePower / 2) * tableDimensions.scale}px)`,
                   transformOrigin: 'left center',
                   borderRadius: `${3 * tableDimensions.scale}px`,
                   border: `${1 * tableDimensions.scale}px solid rgba(255,215,0,0.3)`,
                   boxShadow: `0 ${2 * tableDimensions.scale}px ${4 * tableDimensions.scale}px rgba(0,0,0,0.3), inset 0 ${1 * tableDimensions.scale}px ${2 * tableDimensions.scale}px rgba(255,255,255,0.2)`,
                   backgroundImage: 'linear-gradient(0deg, rgba(0,0,0,0.1) 0%, transparent 50%, rgba(255,255,255,0.1) 100%)'
                 }}
               >
                 {/* Cue tip */}
                 <div 
                   className="absolute right-0 top-1/2 bg-blue-900 rounded-r transform -translate-y-1/2"
                   style={{ 
                     width: `${2 * tableDimensions.scale}px`,
                     height: `${4 * tableDimensions.scale}px`,
                     boxShadow: `inset 0 ${1 * tableDimensions.scale}px ${2 * tableDimensions.scale}px rgba(0,0,0,0.3)` 
                   }}
                 />
               </div>
            </>
          )}
        </div>
      </div>
      
      {/* Power Meter and Controls - Right Side */}
      {gameState.activePlayerId === account && (
        <div className="absolute right-8 top-1/2 transform -translate-y-1/2 flex flex-col items-center gap-4 z-20">
          {/* Power Meter */}
          <div className="bg-black/40 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <div className="text-white text-sm font-semibold mb-2 text-center">POWER</div>
            <div className="w-6 h-32 bg-gray-800 rounded-full border border-gray-600 relative overflow-hidden">
              <div 
                className="absolute bottom-0 left-0 right-0 rounded-full transition-all duration-100"
                style={{
                  height: `${cuePower}%`,
                  background: cuePower < 30 ? 
                    'linear-gradient(to top, #10b981, #34d399)' :
                    cuePower < 70 ?
                    'linear-gradient(to top, #f59e0b, #fbbf24)' :
                    'linear-gradient(to top, #ef4444, #f87171)',
                  boxShadow: '0 0 10px rgba(255,255,255,0.3)'
                }}
              />
              {/* Power meter segments */}
              {[25, 50, 75].map(segment => (
                <div 
                  key={segment}
                  className="absolute left-0 right-0 h-px bg-white/30"
                  style={{ bottom: `${segment}%` }}
                />
              ))}
            </div>
            <div className="text-white text-xs text-center mt-2">{Math.round(cuePower)}%</div>
          </div>
        </div>
      )}
      
      {/* Turn Indicator - Bottom Center */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20">
        <div className="bg-black/60 backdrop-blur-sm rounded-xl px-6 py-3 border border-white/20">
          <div className="flex items-center gap-3">
            <div 
              className="w-3 h-3 rounded-full animate-pulse"
              style={{
                background: gameState.activePlayerId === gameState.players[0]?.id ? 
                  'linear-gradient(45deg, #3b82f6, #60a5fa)' : 
                  'linear-gradient(45deg, #ef4444, #f87171)'
              }}
            />
            <span className="text-white font-semibold">{activePlayer?.name}'s Turn</span>
            <span className="text-gray-300 text-sm">Turn #{gameState.turn}</span>
          </div>
        </div>
      </div>
      
      {/* Game Controls - Bottom Right */}
      <div className="absolute bottom-8 right-8 flex gap-3 z-20">
        <Button
          onClick={() => setIsLogVisible(!isLogVisible)}
          className="bg-black/60 backdrop-blur-sm border border-white/20 text-white hover:bg-black/80 rounded-xl px-4 py-2 shadow-lg"
          size="sm"
        >
          <PanelLeft className="w-4 h-4 mr-2" />
          Log
        </Button>
        
        <Button
          onClick={() => handleEndGame(gameState.players[0].id)}
          className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl px-4 py-2 shadow-lg border border-red-400/30"
          size="sm"
        >
          End Game
        </Button>
      </div>
      
      {/* Game Log Modal */}
      {isLogVisible && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-30">
          <div className="bg-black/80 backdrop-blur-sm rounded-xl p-6 border border-white/20 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white text-lg font-semibold">Game Log</h3>
              <Button
                onClick={() => setIsLogVisible(false)}
                className="bg-transparent hover:bg-white/10 text-white p-1 rounded"
                size="sm"
              >
                ✕
              </Button>
            </div>
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {gameState.gameLog.map((log, index) => (
                  <div key={index} className="text-gray-300 text-sm p-2 bg-white/5 rounded border border-white/10">
                    {log}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}
    </div>
  );
};

export default PoolGameEngine;