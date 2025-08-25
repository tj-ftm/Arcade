
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import useInterval from 'use-interval';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { RefreshCw, ArrowLeft, ArrowRight, ArrowUp, Play } from 'lucide-react';

// Game constants
const GRAVITY = 0.8;
const JUMP_FORCE = 18;
const ENEMY_JUMP_BOUNCE = 12;
const PLAYER_SPEED = 7;
const PLAYER_WIDTH = 40;
const PLAYER_HEIGHT = 60;
const GAME_LOOP_INTERVAL = 16; // ~60 FPS
const CAMERA_LERP_FACTOR = 0.1;

// Level Generation
const PLATFORM_MIN_WIDTH = 150;
const PLATFORM_MAX_WIDTH = 350;
const PLATFORM_HEIGHT = 30;
const HORIZONTAL_GAP_MIN = 80;
const HORIZONTAL_GAP_MAX = 200;
const VERTICAL_GAP_MIN = -250;
const VERTICAL_GAP_MAX = 250;
const INITIAL_PLATFORMS = 15;
const RENDER_DISTANCE = 2000; // pixels ahead of player to render platforms

type Platform = { id: number; x: number; y: number; width: number; height: number };
type Collectible = { id: number; x: number; y: number; collected: boolean };
type Enemy = { id: number; x: number; y: number; width: number; height: number; vx: number; isDead: boolean; deadTimestamp?: number; };

const useKeyboardControls = (setLeft: (v: boolean) => void, setRight: (v: boolean) => void, setUp: (v: boolean) => void) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      switch (e.key.toLowerCase()) {
        case 'a': case 'arrowleft': setLeft(true); break;
        case 'd': case 'arrowright': setRight(true); break;
        case 'w': case 'arrowup': case ' ': setUp(true); break;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case 'a': case 'arrowleft': setLeft(false); break;
        case 'd': case 'arrowright': setRight(false); break;
        case 'w': case 'arrowup': case ' ': setUp(false); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [setLeft, setRight, setUp]);
};


interface PlatformerClientProps {
  onGameEnd?: () => void;
}

export const PlatformerClient = ({ onGameEnd }: PlatformerClientProps) => {
  const [gameState, setGameState] = useState<'start' | 'playing' | 'lost'>('start');
  
  const [player, setPlayer] = useState({ x: 200, y: 100, vx: 0, vy: 0 });
  const [camera, setCamera] = useState({ x: 0, y: 0 });
  
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [collectibles, setCollectibles] = useState<Collectible[]>([]);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  
  const [score, setScore] = useState(0);
  const [canJump, setCanJump] = useState(false);
  
  const [isLeftPressed, setIsLeftPressed] = useState(false);
  const [isRightPressed, setIsRightPressed] = useState(false);
  const [isUpPressed, setIsUpPressed] = useState(false);

  useKeyboardControls(setIsLeftPressed, setIsRightPressed, setIsUpPressed);
  
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const idCounter = useRef(0);
  const lastPlatformX = useRef(0);

  const generatePlatforms = useCallback((count: number, startX: number, startY: number): Platform[] => {
    const newPlatforms: Platform[] = [];
    let currentX = startX;
    let currentY = startY;

    const gameHeight = gameAreaRef.current?.offsetHeight || 600;
    // Ensure platforms don't spawn too low, leaving space for mobile controls
    const lowestY = gameHeight - 150; 
    const highestY = 200;

    for (let i = 0; i < count; i++) {
        const width = Math.random() * (PLATFORM_MAX_WIDTH - PLATFORM_MIN_WIDTH) + PLATFORM_MIN_WIDTH;
        const x = currentX + HORIZONTAL_GAP_MIN + Math.random() * (HORIZONTAL_GAP_MAX - HORIZONTAL_GAP_MIN);
        let y = currentY + VERTICAL_GAP_MIN + Math.random() * (VERTICAL_GAP_MAX - VERTICAL_GAP_MIN);
        y = Math.max(highestY, Math.min(lowestY, y));

        newPlatforms.push({ id: idCounter.current++, x, y, width, height: PLATFORM_HEIGHT });
        currentX = x + width;
        currentY = y;
    }
    lastPlatformX.current = currentX;
    return newPlatforms;
  }, []);
  
  const generateCollectiblesForPlatform = (platform: Platform): Collectible[] => {
      const newCollectibles: Collectible[] = [];
      const numCollectibles = Math.floor(platform.width / 80);
      for(let i = 1; i <= numCollectibles; i++) {
          const x = platform.x + (platform.width / (numCollectibles + 1)) * i;
          const y = platform.y - 50;
          newCollectibles.push({id: idCounter.current++, x, y, collected: false });
      }
      return newCollectibles;
  }
  
  const generateEnemyForPlatform = (platform: Platform): Enemy | null => {
      if (platform.width > 200 && Math.random() > 0.6) {
          const x = platform.x + platform.width / 2;
          const y = platform.y - 40;
          return { id: idCounter.current++, x, y, width: 40, height: 40, vx: 2, isDead: false };
      }
      return null;
  }

  const resetGame = useCallback(() => {
    idCounter.current = 0;
    
    const startingPlatforms = [
        ...generatePlatforms(INITIAL_PLATFORMS, 0, 500)
    ];

    let startingCollectibles: Collectible[] = [];
    let startingEnemies: Enemy[] = [];

    startingPlatforms.forEach(p => {
        startingCollectibles = [...startingCollectibles, ...generateCollectiblesForPlatform(p)];
        const enemy = generateEnemyForPlatform(p);
        if (enemy) startingEnemies.push(enemy);
    });

    setPlatforms(startingPlatforms);
    setCollectibles(startingCollectibles);
    setEnemies(startingEnemies);
    setPlayer({ x: 200, y: 100, vx: 0, vy: 0 });
    setCamera({ x: 0, y: 0 });
    setScore(0);
    setGameState('playing');
  }, [generatePlatforms]);


  const gameLoop = () => {
    if (gameState !== 'playing' || !gameAreaRef.current) return;

    // Move enemies
    setEnemies(prevEnemies => {
        return prevEnemies.map(enemy => {
            if (enemy.isDead) return enemy;
            let newVx = enemy.vx;
            let newX = enemy.x + newVx;
            
            const platformUnder = platforms.find(p => 
                enemy.y + enemy.height >= p.y && enemy.y + enemy.height <= p.y + 10 &&
                enemy.x + enemy.width > p.x && enemy.x < p.x + p.width
            );
            
            if (!platformUnder || newX <= platformUnder.x || newX + enemy.width >= platformUnder.x + platformUnder.width) {
               newVx = -newVx;
               newX = enemy.x + newVx;
            }

            return { ...enemy, x: newX, vx: newVx };
        }).filter(enemy => !enemy.isDead || (enemy.deadTimestamp && Date.now() - enemy.deadTimestamp < 500)); // remove dead enemies after 0.5s
    });

    setPlayer(p => {
        let newVx = p.vx;
        let newVy = p.vy;
        let newX = p.x;
        let newY = p.y;
        let onGround = false;

        // Horizontal movement
        if (isLeftPressed) {
            newVx = -PLAYER_SPEED;
        } else if (isRightPressed) {
            newVx = PLAYER_SPEED;
        } else {
            newVx = 0;
        }
        newX += newVx;

        // Gravity
        newVy += GRAVITY;
        newY += newVy;
        
        // Collision with platforms
        for (const platform of platforms) {
            if (
                newX + PLAYER_WIDTH > platform.x &&
                newX < platform.x + platform.width &&
                newY + PLAYER_HEIGHT > platform.y &&
                p.y + PLAYER_HEIGHT <= platform.y // Was above platform in previous frame
            ) {
                newY = platform.y - PLAYER_HEIGHT;
                newVy = 0;
                onGround = true;
                setCanJump(true);
            }
        }
        
        // Jump
        if (isUpPressed && canJump) {
            newVy = -JUMP_FORCE;
            setCanJump(false);
            onGround = false;
        }

        // Fall off screen
        if (gameAreaRef.current && newY > gameAreaRef.current.offsetHeight + 100) {
            setGameState('lost');
        }

        // Generate new content
        if(newX > lastPlatformX.current - RENDER_DISTANCE) {
            setPlatforms(prev => {
                const newGenerated = generatePlatforms(5, lastPlatformX.current, newY);
                newGenerated.forEach(pl => {
                    setCollectibles(cPrev => [...cPrev, ...generateCollectiblesForPlatform(pl)]);
                    const enemy = generateEnemyForPlatform(pl);
                    if (enemy) setEnemies(ePrev => [...ePrev, enemy]);
                });
                return [...prev, ...newGenerated];
            });
        }
      
        // Prune old entities
        setPlatforms(prev => prev.filter(pl => pl.x + pl.width > newX - RENDER_DISTANCE));
        setCollectibles(cPrev => cPrev.filter(c => c.x > newX - RENDER_DISTANCE));
        setEnemies(ePrev => ePrev.filter(e => e.x + e.width > newX - RENDER_DISTANCE));


        // Collectibles collision
        setCollectibles(prev => prev.map(c => {
            if (!c.collected && 
                newX < c.x + 30 &&
                newX + PLAYER_WIDTH > c.x &&
                newY < c.y + 30 &&
                newY + PLAYER_HEIGHT > c.y
            ) {
                setScore(s => s + 10);
                return { ...c, collected: true };
            }
            return c;
        }));

        // Enemy collision
        let playerLost = false;
        let tempVy = newVy;
        const updatedEnemies = enemies.map(enemy => {
            if (enemy.isDead || playerLost) return enemy;
            
            const isColliding = newX < enemy.x + enemy.width &&
                                newX + PLAYER_WIDTH > enemy.x &&
                                newY < enemy.y + enemy.height &&
                                newY + PLAYER_HEIGHT > enemy.y;
            
            if (isColliding) {
                const playerBottom = p.y + PLAYER_HEIGHT;
                if (newVy > 0 && playerBottom <= enemy.y + enemy.height / 2) {
                    tempVy = -ENEMY_JUMP_BOUNCE;
                    setScore(s => s + 50);
                    return { ...enemy, isDead: true, deadTimestamp: Date.now() };
                } else {
                    playerLost = true;
                }
            }
            return enemy;
        });
        
        if (playerLost) {
            setGameState('lost');
        } else {
            setEnemies(updatedEnemies);
        }

        return { x: newX, y: newY, vx: newVx, vy: tempVy };
    });
    
    // Update camera
    setCamera(c => {
      const cameraOffset = gameAreaRef.current ? gameAreaRef.current.offsetWidth / 3 : 300;
      return {
        x: c.x + ((player.x - c.x - cameraOffset) * CAMERA_LERP_FACTOR),
        y: 0,
    }});
  };
  
  useInterval(gameLoop, gameState === 'playing' ? GAME_LOOP_INTERVAL : null);
  
  const backgroundStyle = (url: string, parallaxFactor: number) => ({
      backgroundImage: `url(${url})`,
      backgroundPosition: `${-camera.x * parallaxFactor}px bottom`,
      backgroundSize: 'auto 100vh',
      backgroundRepeat: 'repeat-x',
  });

  return (
    <div 
        className="w-full h-full overflow-hidden relative bg-blue-900"
        ref={gameAreaRef}
    >
      <div className="absolute inset-0" style={backgroundStyle('/platformer-bg-back.svg', 0.1)}></div>
      <div className="absolute inset-0" style={backgroundStyle('/platformer-bg-mid.svg', 0.4)}></div>
      <div className="absolute inset-0" style={backgroundStyle('/platformer-bg-front.svg', 0.8)}></div>

      {/* UI Elements */}
      <div className="absolute top-4 left-4 z-20 text-white font-headline text-3xl [text-shadow:2px_2px_4px_#000]">
          Score: {score}
      </div>

      {/* Start/Game Over Screen */}
      {gameState !== 'playing' && (
         <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-30 animate-fade-in">
            <h2 className="text-8xl text-accent font-headline mb-2" style={{ WebkitTextStroke: '4px black' }}>
                {gameState === 'start' ? 'Platformer' : 'Game Over'}
            </h2>
            <p className="text-2xl text-white mb-6">
                {gameState === 'start' ? 'Jump and run as far as you can!' : `Final Score: ${score}`}
            </p>
            <Button onClick={resetGame} size="lg" className="font-headline text-3xl h-16">
                {gameState === 'start' ? <><Play className="mr-4"/>Start Game</> : <><RefreshCw className="mr-2"/>Play Again</>}
            </Button>
         </div>
       )}
      
      {/* Mobile Controls */}
      <div className="md:hidden absolute bottom-4 w-full px-8 flex justify-between items-center z-20">
          <div className="flex gap-4">
            <Button
              size="icon"
              className="w-16 h-16 bg-black/40 rounded-full active:bg-black/60"
              onTouchStart={() => setIsLeftPressed(true)}
              onTouchEnd={() => setIsLeftPressed(false)}
              onMouseDown={() => setIsLeftPressed(true)}
              onMouseUp={() => setIsLeftPressed(false)}
            >
              <ArrowLeft className="w-8 h-8"/>
            </Button>
            <Button
              size="icon"
              className="w-16 h-16 bg-black/40 rounded-full active:bg-black/60"
              onTouchStart={() => setIsRightPressed(true)}
              onTouchEnd={() => setIsRightPressed(false)}
              onMouseDown={() => setIsRightPressed(true)}
              onMouseUp={() => setIsRightPressed(false)}
            >
              <ArrowRight className="w-8 h-8"/>
            </Button>
          </div>
          <Button
            size="icon"
            className="w-20 h-20 bg-black/40 rounded-full active:bg-black/60"
            onTouchStart={() => setIsUpPressed(true)}
            onTouchEnd={() => setIsUpPressed(false)}
            onMouseDown={() => setIsUpPressed(true)}
            onMouseUp={() => setIsUpPressed(false)}
          >
            <ArrowUp className="w-10 h-10"/>
          </Button>
      </div>


      {/* Game World */}
       {gameState === 'playing' && (
          <div className="absolute inset-0" style={{ transform: `translateX(${-camera.x}px)` }}>
              {/* Player */}
              <div className="absolute transition-all duration-75 ease-linear" style={{ left: player.x, top: player.y }}>
                  <div
                    className="bg-blue-500 border-4 border-blue-300 rounded-t-lg rounded-b-md"
                    style={{ width: PLAYER_WIDTH, height: PLAYER_HEIGHT }}
                  >
                      <div className="relative w-full h-full flex items-center justify-center">
                        <div className="w-4 h-4 bg-white rounded-full absolute top-4 left-3"></div>
                        <div className="w-4 h-4 bg-white rounded-full absolute top-4 right-3"></div>
                        <div className="w-2 h-2 bg-black rounded-full absolute top-5 left-4"></div>
                        <div className="w-2 h-2 bg-black rounded-full absolute top-5 right-4"></div>
                      </div>
                  </div>
              </div>

              {/* Platforms */}
              {platforms.map(p => (
                <div
                  key={p.id}
                  className="absolute bg-gradient-to-b from-[#654321] to-[#422d17] border-t-4 border-[#8A6445] rounded-md"
                  style={{ 
                    left: p.x, top: p.y, width: p.width, height: p.height,
                    backgroundImage: 'url(https://www.transparenttextures.com/patterns/rocky-wall.png)',
                    backgroundBlendMode: 'multiply',
                    backgroundSize: 'auto'
                 }}
                />
              ))}
              
              {/* Enemies */}
              {enemies.map(e => (
                  <div
                    key={e.id}
                    className={cn(
                        "absolute bg-red-600 border-2 border-red-400 rounded-md transition-all duration-150",
                        e.isDead && "opacity-0 scale-50 rotate-45"
                    )}
                    style={{ left: e.x, top: e.y, width: e.width, height: e.height }}
                  >
                     <div className="relative w-full h-full flex items-center justify-center">
                        <div className="w-3 h-3 bg-white rounded-full absolute top-2 left-1 -rotate-12 flex items-center justify-center"><div className="w-1 h-1 bg-black rounded-full"></div></div>
                        <div className="w-3 h-3 bg-white rounded-full absolute top-2 right-1 rotate-12 flex items-center justify-center"><div className="w-1 h-1 bg-black rounded-full"></div></div>
                     </div>
                  </div>
              ))}

              {/* Collectibles */}
              {collectibles.map(c => !c.collected && (
                <div
                  key={c.id}
                  className="absolute w-[30px] h-[30px] flex items-center justify-center animate-spin-coin"
                  style={{ left: c.x, top: c.y, transformStyle: 'preserve-3d' }}
                >
                    <div className="absolute w-full h-full rounded-full bg-yellow-400 border-4 border-yellow-600 flex items-center justify-center font-bold text-yellow-800 text-lg">$</div>
                </div>
              ))}
          </div>
        )}
    </div>
  );
};
