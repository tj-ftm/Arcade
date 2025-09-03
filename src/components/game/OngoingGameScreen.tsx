import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, X, Clock, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Lobby {
  id: string;
  gameType: 'chess' | 'uno' | 'pool';
  player1Id: string;
  player1Name: string;
  player2Id?: string;
  player2Name?: string;
  status: 'waiting' | 'playing' | 'finished';
  createdAt: any;
  gameStartTime?: any;
}

interface OngoingGameScreenProps {
  lobby: Lobby;
  isHost: boolean;
  onRejoinGame: (lobby: Lobby, isHost: boolean) => void;
  onTerminateGame: () => void;
  onBackToMenu: () => void;
}

export function OngoingGameScreen({ 
  lobby, 
  isHost, 
  onRejoinGame, 
  onTerminateGame, 
  onBackToMenu 
}: OngoingGameScreenProps) {
  const [isTerminating, setIsTerminating] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleTerminate = async () => {
    setIsTerminating(true);
    try {
      await onTerminateGame();
    } catch (error) {
      console.error('Error terminating game:', error);
    } finally {
      setIsTerminating(false);
      setShowConfirmation(false);
    }
  };

  const getGameTypeIcon = (gameType: string) => {
    switch (gameType) {
      case 'chess':
        return '♔';
      case 'uno':
        return '🎴';
      case 'pool':
        return '🎱';
      default:
        return '🎮';
    }
  };

  const getGameTypeColor = (gameType: string) => {
    switch (gameType) {
      case 'chess':
        return 'from-purple-600 to-indigo-600';
      case 'uno':
        return 'from-red-600 to-orange-600';
      case 'pool':
        return 'from-green-600 to-emerald-600';
      default:
        return 'from-blue-600 to-cyan-600';
    }
  };

  const formatGameDuration = () => {
    if (!lobby.gameStartTime) return 'Unknown duration';
    
    const startTime = lobby.gameStartTime.seconds ? 
      lobby.gameStartTime.seconds * 1000 : 
      lobby.gameStartTime;
    const duration = Math.floor((Date.now() - startTime) / 1000 / 60); // minutes
    
    if (duration < 1) return 'Just started';
    if (duration < 60) return `${duration} minute${duration !== 1 ? 's' : ''} ago`;
    
    const hours = Math.floor(duration / 60);
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      <Card className={cn(
        "bg-gradient-to-br border-2 shadow-2xl",
        getGameTypeColor(lobby.gameType),
        "border-white/20"
      )}>
        <CardHeader className="text-center pb-4">
          <div className="text-6xl mb-4">{getGameTypeIcon(lobby.gameType)}</div>
          <CardTitle className="text-3xl font-headline text-white uppercase tracking-wider">
            Game in Progress
          </CardTitle>
          <p className="text-white/80 text-lg">
            You have an ongoing {lobby.gameType.toUpperCase()} game
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Game Info */}
          <div className="bg-black/20 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-white/70 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Players:
              </span>
              <span className="text-white font-semibold">
                {lobby.player1Name} vs {lobby.player2Name || 'Player 2'}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-white/70 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Started:
              </span>
              <span className="text-white font-semibold">
                {formatGameDuration()}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-white/70">Your Role:</span>
              <span className="text-white font-semibold">
                {isHost ? 'Host' : 'Player 2'}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-white/70">Lobby ID:</span>
              <span className="text-white font-mono text-sm">
                {lobby.id}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={() => onRejoinGame(lobby, isHost)}
              className="w-full h-14 text-xl font-headline bg-green-600 hover:bg-green-700 text-white border-2 border-green-400/30"
              size="lg"
            >
              <Play className="mr-3 h-6 w-6" />
              Rejoin Game
            </Button>
            
            <Button
              onClick={() => setShowConfirmation(true)}
              variant="destructive"
              className="w-full h-12 text-lg font-headline border-2 border-red-400/30"
              size="lg"
            >
              <X className="mr-2 h-5 w-5" />
              Terminate Game
            </Button>
            
            <Button
              onClick={onBackToMenu}
              variant="outline"
              className="w-full h-10 text-base font-headline border-white/30 text-white hover:bg-white/10"
            >
              Back to Main Menu
            </Button>
          </div>

          {/* Confirmation Dialog */}
          {showConfirmation && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <Card className="bg-gray-900 border-red-500/50 max-w-md mx-4">
                <CardHeader>
                  <CardTitle className="text-red-400 text-center">
                    Terminate Game?
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-white/80 text-center">
                    Are you sure you want to terminate this game? This action cannot be undone and will end the game for both players.
                  </p>
                  
                  <div className="flex gap-3">
                    <Button
                      onClick={() => setShowConfirmation(false)}
                      variant="outline"
                      className="flex-1 border-white/30 text-white hover:bg-white/10"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleTerminate}
                      variant="destructive"
                      className="flex-1"
                      disabled={isTerminating}
                    >
                      {isTerminating ? 'Terminating...' : 'Terminate'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}