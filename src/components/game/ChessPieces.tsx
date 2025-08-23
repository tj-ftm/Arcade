'use client';

import React, { useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import type { Piece } from 'chess.js';
import * as THREE from 'three';

// This is a placeholder URL. You would need to host your GLTF file.
// For this example, I'll use a single file with all pieces.
const modelUrl = 'https://storage.googleapis.com/static.invertase.io/assets/chess-pieces.glb';

useGLTF.preload(modelUrl);

const PIECE_NAMES = {
    p: 'Pawn',
    r: 'Rook',
    n: 'Knight',
    b: 'Bishop',
    q: 'Queen',
    k: 'King'
}

export function Pieces({ piece }: { piece: Piece }) {
    const { nodes } = useGLTF(modelUrl);
    const pieceRef = useRef<THREE.Group>(null!);

    const pieceName = PIECE_NAMES[piece.type];
    const model = nodes[pieceName] as THREE.Mesh;
    
    if (!model) {
        console.error(`Model not found for piece: ${pieceName}`);
        return null;
    }

    const color = piece.color === 'w' ? '#e0e0e0' : '#333333';
    const rotationY = piece.color === 'b' ? Math.PI : 0;
    
    // Scale might need adjustment based on your model
    const scale = piece.type === 'p' ? 0.3 : 0.35;

    return (
        <group ref={pieceRef} dispose={null} scale={[scale, scale, scale]} rotation={[0, rotationY, 0]}>
            <mesh
                castShadow
                receiveShadow
                geometry={model.geometry}
            >
                <meshStandardMaterial color={color} roughness={0.3} metalness={0.7} />
            </mesh>
        </group>
    );
}
