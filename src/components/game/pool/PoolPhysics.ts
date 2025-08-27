// PoolPhysics.ts

import { BallState, GameState } from './PoolClient';

export interface Vector2D {
  x: number;
  y: number;
}

export const BALL_RADIUS = 12; // Radius of the balls in game units (pixels)

export interface PhysicsState {
  balls: BallState[];
  // Add other physics-related state here, e.g., friction, elasticity
  allBallsStopped?: boolean;
}

export function initializePhysicsState(initialBalls: BallState[]): PhysicsState {
  return {
    balls: initialBalls.map(ball => ({
      id: ball.id,
      position: { ...ball.position },
      velocity: { x: 0, y: 0 },
      inPocket: false,
      pocketId: null,
      type: ball.type,
      color: ball.color,
    })),
    allBallsStopped: true,
  };
}

export function updatePhysics(physicsState: PhysicsState, deltaTime: number): PhysicsState {
  let newBalls = physicsState.balls.map(ball => ({ ...ball }));

  // Apply friction and update positions
  newBalls.forEach(ball => {
    if (ball.inPocket) return;

    const frictionFactor = 0.98; // Simple friction
    ball.velocity.x *= frictionFactor;
    ball.velocity.y *= frictionFactor;

    // Stop ball if velocity is very low
    if (Math.abs(ball.velocity.x) < 0.01 && Math.abs(ball.velocity.y) < 0.01) {
      ball.velocity.x = 0;
      ball.velocity.y = 0;
    }

    ball.position.x += ball.velocity.x * deltaTime;
    ball.position.y += ball.velocity.y * deltaTime;
  });

  // Handle ball-ball collisions
  for (let i = 0; i < newBalls.length; i++) {
    for (let j = i + 1; j < newBalls.length; j++) {
      const ballA = newBalls[i];
      const ballB = newBalls[j];

      if (ballA.inPocket || ballB.inPocket) continue;

      const dx = ballB.position.x - ballA.position.x;
      const dy = ballB.position.y - ballA.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      const minDistance = BALL_RADIUS * 2;

      if (distance < minDistance && distance !== 0) {
        // Collision detected, resolve overlap
        const overlap = minDistance - distance;
        const nx = dx / distance; // Normal x
        const ny = dy / distance; // Normal y

        // Move balls apart to resolve overlap
        ballA.position.x -= (overlap / 2) * nx;
        ballA.position.y -= (overlap / 2) * ny;
        ballB.position.x += (overlap / 2) * nx;
        ballB.position.y += (overlap / 2) * ny;

        // Relative velocity
        const rvx = ballB.velocity.x - ballA.velocity.x;
        const rvy = ballB.velocity.y - ballA.velocity.y;

        // Velocity along the normal
        const velAlongNormal = rvx * nx + rvy * ny;

        // Do not resolve if velocities are separating
        if (velAlongNormal > 0) continue;

        const elasticity = 0.9; // Coefficient of restitution
        const impulse = -(1 + elasticity) * velAlongNormal;

        ballA.velocity.x -= (impulse / 2) * nx;
        ballA.velocity.y -= (impulse / 2) * ny;
        ballB.velocity.x += (impulse / 2) * nx;
        ballB.velocity.y += (impulse / 2) * ny;
      }
    }
  }

  // Handle ball-wall collisions (simplified for now)
  newBalls.forEach(ball => {
    if (ball.inPocket) return;

    // Left wall
    if (ball.position.x - BALL_RADIUS < 0) {
      ball.position.x = BALL_RADIUS;
      ball.velocity.x *= -0.9; // Bounce with some energy loss
    }
    // Right wall
    if (ball.position.x + BALL_RADIUS > 1000) { // Assuming table width is 1000
      ball.position.x = 1000 - BALL_RADIUS;
      ball.velocity.x *= -0.9;
    }
    // Top wall
    if (ball.position.y - BALL_RADIUS < 0) {
      ball.position.y = BALL_RADIUS;
      ball.velocity.y *= -0.9;
    }
    // Bottom wall
    if (ball.position.y + BALL_RADIUS > 500) { // Assuming table height is 500
      ball.position.y = 500 - BALL_RADIUS;
      ball.velocity.y *= -0.9;
    }
  });

  return { balls: newBalls };
}

export function applyCueShot(physicsState: PhysicsState, cueBallId: number, power: number, rotation: number): PhysicsState {
  const newBalls = physicsState.balls.map(ball => ({ ...ball }));
  const cueBall = newBalls.find(ball => ball.id === cueBallId);

  if (cueBall) {
    const force = power * 0.1; // Scale power to a force value
    const angleRad = rotation * (Math.PI / 180); // Convert degrees to radians

    cueBall.velocity.x = force * Math.cos(angleRad);
    cueBall.velocity.y = force * Math.sin(angleRad);
  }

  return { balls: newBalls };
}