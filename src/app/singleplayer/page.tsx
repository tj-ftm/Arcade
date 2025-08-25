
"use client";

import { UnoClient } from '@/components/game/UnoClient';
import { GameLayout } from '@/components/layout/GameLayout';
import { useWeb3 } from '@/components/web3/Web3Provider';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Ticket, Play } from 'lucide-react';

export default function SinglePlayerPage() {
  const { account } = useWeb3();
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'paying'>('idle');
  const [gameId, setGameId] = useState(0);

  const handlePaymentSuccess = () => {
    setGameState('playing');
    setGameId(prevId => prevId + 1); // Reset the game by changing the key
  };

  const handleGameEnd = () => {
    setGameState('idle');
  };
  
  const handleFreePlay = () => {
    setGameState('playing');
    setGameId(prevId => prevId + 1);
  };
  
  const handlePaidPlay = () => {
    setGameState('paying');
  };

  return (
    <GameLayout className="bg-red-900">
      <div className="absolute inset-0 bg-red-800 bg-gradient-to-br from-red-900 via-red-700 to-orange-900 z-0"></div>
      
      <div className="z-10 w-full h-full flex items-center justify-center">
        {gameState === 'playing' && (
          <UnoClient key={gameId} onGameEnd={handleGameEnd} />
        )}
        {gameState === 'paying' && (
          
        )}
        {gameState === 'idle' && (
           <div className="w-full max-w-md z-10 text-center my-auto animate-fade-in">
              <div className="bg-black/50 p-8 rounded-xl flex flex-col items-center">
                  <h1 className="text-8xl font-headline text-accent uppercase tracking-wider" style={{ WebkitTextStroke: '4px black' }}>UNO</h1>
                  <p className="text-white/70 mt-1 mb-8 text-lg">The classic card game!</p>
                  <div className="flex flex-col gap-4 w-full">
                      <Button size="lg" onClick={handleFreePlay} className="w-full h-16 text-2xl font-headline rounded-lg">
                          <Play className="mr-4" /> Free Play
                      </Button>
                      <Button size="lg" onClick={handlePaidPlay} className="w-full h-16 text-2xl font-headline rounded-lg bg-green-600 hover:bg-green-700">
                          <Ticket className="mr-4" /> Pay & Play (0.1 S)
                      </Button>
                  </div>
              </div>
            </div>
        )}
      </div>
    </GameLayout>
  );
}
