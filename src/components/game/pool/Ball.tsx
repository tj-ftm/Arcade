"use client";

import React from 'react';
import type { BallState } from './PoolClient';

interface BallProps {
  ball: PoolBall;
  tableWidth: number;
  tableHeight: number;
}

const Ball: React.FC<BallProps> = ({ ball, tableWidth, tableHeight }) => {
  // Calculate position as percentage of table dimensions
  const left = (ball.position.x / tableWidth) * 100;
  const top = (ball.position.y / tableHeight) * 100;

  const BALL_RADIUS_PX = 12; // Define a consistent ball radius in pixels
  const ballSize = (BALL_RADIUS_PX * 2 / tableWidth) * 100; // Percentage of table width for ball size

  let ballColorClass = '';
  switch (ball.color) {
    case 'white': ballColorClass = 'bg-white'; break;
    case 'yellow': ballColorClass = 'bg-yellow-500'; break;
    case 'blue': ballColorClass = 'bg-blue-500'; break;
    case 'red': ballColorClass = 'bg-red-500'; break;
    case 'purple': ballColorClass = 'bg-purple-500'; break;
    case 'orange': ballColorClass = 'bg-orange-500'; break;
    case 'green': ballColorClass = 'bg-green-500'; break;
    case 'maroon': ballColorClass = 'bg-red-800'; break;
    case 'black': ballColorClass = 'bg-black'; break;
    default: ballColorClass = 'bg-gray-400'; break;
  }

  return (
    <div
      className={`absolute rounded-full ${ballColorClass} border border-gray-700`}
      style={{
        left: `${left}%`,
        top: `${top}%`,
        width: `${ballSize}%`,
        height: `${ballSize}%`,
        transform: 'translate(-50%, -50%)', // Center the ball
        zIndex: ball.type === 'cue' ? 10 : 5, // Cue ball on top
      }}
    >
      {/* Optional: Ball number */}
      {ball.type !== 'cue' && (
        <span className="absolute inset-0 flex items-center justify-center text-[0.6vw] font-bold text-white pointer-events-none">
          {ball.id}
        </span>
      )}
    </div>
  );
};

export default Ball;