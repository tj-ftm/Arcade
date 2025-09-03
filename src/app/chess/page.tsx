import { ChessClient } from '@/components/game/ChessClient';

export default function MultiplayerChessPage() {
  return (
    <main className="h-full w-full flex flex-col items-center justify-center bg-purple-900/50 p-2 sm:p-4 md:p-8 overflow-hidden">
       <div className="absolute inset-0 bg-purple-800 bg-gradient-to-br from-purple-900 via-purple-700 to-indigo-900 z-0"></div>
       
      <div className="z-10 w-full h-full max-w-7xl">
        <p className="text-white text-4xl text-center font-headline pt-20">Multiplayer Chess Coming Soon!</p>
      </div>
    </main>
  );
}
