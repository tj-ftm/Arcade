
'use client';

import React, { useState, useMemo, useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Chess, Square, Piece } from 'chess.js';
import { Pieces } from './ChessPieces';
import { Button } from '@/components/ui/button';
import { Home, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const BOARD_SIZE = 8;
const TILE_SIZE = 1;

const getPosition = (square: Square) => {
  const col = square.charCodeAt(0) - 'a'.charCodeAt(0);
  const row = parseInt(square.charAt(1), 10) - 1;
  return new THREE.Vector3((col - BOARD_SIZE / 2 + 0.5) * TILE_SIZE, 0, (row - BOARD_SIZE / 2 + 0.5) * TILE_SIZE);
};

const getSquareFromPosition = (pos: THREE.Vector3): Square | null => {
    const col = Math.floor(pos.x / TILE_SIZE + BOARD_SIZE / 2);
    const row = Math.floor(pos.z / TILE_SIZE + BOARD_SIZE / 2);
    if (col < 0 || col >= BOARD_SIZE || row < 0 || row >= BOARD_SIZE) return null;
    return `${String.fromCharCode('a'.charCodeAt(0) + col)}${row + 1}` as Square;
};

const ChessBoard = ({ onSquareClick, selectedSquare, highlightedSquares, position, scale }: { onSquareClick: (square: Square) => void, selectedSquare: Square | null, highlightedSquares: Square[], position?: [number, number, number], scale?: number }) => {
    const boardTiles = useMemo(() => {
        const tiles = [];
        for (let i = 0; i < BOARD_SIZE; i++) {
            for (let j = 0; j < BOARD_SIZE; j++) {
                tiles.push({
                    color: (i + j) % 2 === 0 ? '#b58863' : '#f0d9b5', // Wood colors
                    position: [(j - BOARD_SIZE / 2 + 0.5) * TILE_SIZE, -0.01, (i - BOARD_SIZE / 2 + 0.5) * TILE_SIZE],
                    square: `${String.fromCharCode('a'.charCodeAt(0) + j)}${i + 1}` as Square,
                });
            }
        }
        return tiles;
    }, []);

    const handlePointerDown = (e: any) => {
        e.stopPropagation();
        const square = getSquareFromPosition(e.point);
        if (square) {
            onSquareClick(square);
        }
    };

    return (
        <group position={position} scale={scale}>
            <mesh receiveShadow onPointerDown={handlePointerDown}>
                <boxGeometry args={[BOARD_SIZE * TILE_SIZE, 0.02, BOARD_SIZE * TILE_SIZE]} />
                <meshStandardMaterial color="#6b4a33" />
            </mesh>
            {boardTiles.map(({ color, position, square }) => (
                <mesh key={square} position={new THREE.Vector3(...position)} rotation={[-Math.PI / 2, 0, 0]}>
                    <planeGeometry args={[TILE_SIZE, TILE_SIZE]} />
                    <meshStandardMaterial color={color} />
                </mesh>
            ))}
            {highlightedSquares.map(square => (
                <mesh key={`h-${square}`} position={getPosition(square)} rotation={[-Math.PI / 2, 0, 0]}>
                    <circleGeometry args={[TILE_SIZE/4, 32]} />
                    <meshStandardMaterial color="rgba(255, 255, 0, 0.5)" transparent opacity={0.5} />
                </mesh>
            ))}
            
            {selectedSquare && (
                 <mesh position={getPosition(selectedSquare)} rotation={[-Math.PI / 2, 0, 0]}>
                    <planeGeometry args={[TILE_SIZE, TILE_SIZE]} />
                    <meshStandardMaterial color="rgba(0, 255, 0, 0.5)" transparent opacity={0.4} />
                </mesh>
            )}
        </group>
    );
};

const AnimatedPiece = ({ piece, position, scale }: { piece: Piece; position: THREE.Vector3, scale?: number }) => {
    const ref = useRef<THREE.Group>(null!);
    
    useFrame((state, delta) => {
        if(ref.current) {
            ref.current.position.lerp(position, delta * 10);
        }
    });

    return (
        <group ref={ref} position={position} scale={scale}>
            <Suspense fallback={null}>
              <Pieces piece={piece} />
            </Suspense>
        </group>
    );
};

const GameUI = ({ turn, status, onReset }: { turn: 'White' | 'Black', status: string, onReset: () => void }) => (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none p-4 md:p-8">
        <div className="flex justify-between items-start">
            <div className="bg-black/50 p-4 rounded-xl pointer-events-auto">
                <h1 className="text-4xl md:text-6xl font-headline text-accent uppercase tracking-wider">3D Chess</h1>
                <p className="text-xl md:text-2xl text-white/80">Turn: <span className={cn("font-bold", turn === 'White' ? "text-white" : "text-gray-400")}>{turn}</span></p>
            </div>
             <div className="flex flex-col gap-2 pointer-events-auto">
                <Button size="lg" onClick={onReset} className="font-headline text-2xl"><RefreshCw className="mr-2"/> New Game</Button>
                <Link href="/">
                    <Button size="lg" variant="secondary" className="font-headline text-2xl w-full"><Home className="mr-2"/> Main Menu</Button>
                </Link>
            </div>
        </div>
        
        {status && status !== 'in_progress' && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-4 animate-fade-in rounded-xl z-30 pointer-events-auto">
                <h2 className="text-6xl md:text-9xl font-headline text-accent uppercase tracking-wider" style={{ WebkitTextStroke: '4px black' }}>Game Over</h2>
                <p className="text-2xl md:text-4xl text-white -mt-4">{status}</p>
                <Button size="lg" onClick={onReset} className="font-headline text-2xl"><RefreshCw className="mr-2"/> Play Again</Button>
            </div>
        )}
    </div>
);

export const ChessGame = () => {
    const [boardScale, setBoardScale] = useState(1);

    useEffect(() => {
        const handleResize = () => {
            const newScale = Math.min(window.innerWidth / 1024, 1);
            setBoardScale(newScale);
        };

        window.addEventListener('resize', handleResize);
        handleResize(); // Set initial size

        return () => window.removeEventListener('resize', handleResize);
    }, []);
    const [game, setGame] = useState(() => new Chess());
    const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
    
    // We need a way to force-update the game state for chess.js
    const [gameKey, setGameKey] = useState(Date.now());
    const forceUpdate = () => setGameKey(Date.now());

    const boardState = useMemo(() => {
        const board = game.board();
        const pieces: { square: Square, piece: Piece }[] = [];
        board.forEach((row) => {
            row.forEach((p) => {
                if (p) {
                    pieces.push({ square: p.square, piece: p });
                }
            });
        });
        return pieces;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [game, gameKey]);

    const highlightedSquares = useMemo(() => {
        if (!selectedSquare) return [];
        const moves = game.moves({ square: selectedSquare, verbose: true });
        return moves.map(m => m.to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [game, selectedSquare, gameKey]);

    const gameStatus = useMemo(() => {
        if (game.isCheckmate()) return 'Checkmate!';
        if (game.isStalemate()) return 'Stalemate!';
        if (game.isDraw()) return 'Draw!';
        if (game.isThreefoldRepetition()) return 'Threefold Repetition!';
        if (game.isInsufficientMaterial()) return 'Insufficient Material!';
        return 'in_progress';
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [game, gameKey]);

    const handleSquareClick = (square: Square) => {
        if (gameStatus !== 'in_progress') return;

        if (selectedSquare) {
            try {
                const moveResult = game.move({
                    from: selectedSquare,
                    to: square,
                    promotion: 'q' // auto-promote to queen for simplicity
                });
                
                if (moveResult) {
                  forceUpdate();
                }
            } catch (e) {
                // This is expected for invalid moves, so we can ignore the error
            }
            setSelectedSquare(null);

        } else {
            const piece = game.get(square);
            if (piece && piece.color === game.turn()) {
                setSelectedSquare(square);
            }
        }
    };
    
    const resetGame = () => {
        game.reset();
        setSelectedSquare(null);
        forceUpdate();
    }

    return (
        <div key={gameKey} className="w-full h-full relative">
            <Canvas shadows camera={{ position: [0, 6, 7], fov: 45 }}>
                <ambientLight intensity={1.5} />
                <directionalLight 
                    position={[10, 10, 5]} 
                    intensity={2.5} 
                    castShadow 
                    shadow-mapSize-width={2048}
                    shadow-mapSize-height={2048}
                />
                
                <ChessBoard onSquareClick={handleSquareClick} selectedSquare={selectedSquare} highlightedSquares={highlightedSquares} position={[0, -0.5, 0]} scale={boardScale} />

                {boardState.map(({ square, piece }) => (
                    <AnimatedPiece key={square} piece={piece} position={getPosition(square)} scale={boardScale} />
                ))}

                <OrbitControls 
                    enablePan={false} 
                    minDistance={5} 
                    maxDistance={12}
                    minPolarAngle={Math.PI / 4}
                    maxPolarAngle={Math.PI / 2.2}
                />
            </Canvas>
            <GameUI turn={game.turn() === 'w' ? 'White' : 'Black'} status={gameStatus} onReset={resetGame} />
        </div>
    );
}
