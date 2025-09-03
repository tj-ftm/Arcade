import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, X } from 'lucide-react';

interface MainMenuConfirmationDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  gameType?: string;
  isInLobby?: boolean;
  isInGame?: boolean;
  isSinglePlayer?: boolean;
}

export function MainMenuConfirmationDialog({
  isOpen,
  onConfirm,
  onCancel,
  gameType = 'game',
  isInLobby = false,
  isInGame = false,
  isSinglePlayer = false
}: MainMenuConfirmationDialogProps) {
  if (!isOpen) return null;

  // Get game-specific styling
  const getGameTheme = () => {
    switch (gameType.toLowerCase()) {
      case 'uno':
        return {
          bg: 'bg-red-900',
          border: 'border-red-500/50',
          accent: 'text-red-400',
          iconBg: 'bg-red-500/20',
          warningBg: 'bg-red-500/10',
          warningBorder: 'border-red-500/30',
          warningText: 'text-red-300',
          buttonBg: 'bg-red-600 hover:bg-red-700'
        };
      case 'chess':
        return {
          bg: 'bg-purple-900',
          border: 'border-purple-500/50',
          accent: 'text-purple-400',
          iconBg: 'bg-purple-500/20',
          warningBg: 'bg-purple-500/10',
          warningBorder: 'border-purple-500/30',
          warningText: 'text-purple-300',
          buttonBg: 'bg-purple-600 hover:bg-purple-700'
        };
      case 'pool':
        return {
          bg: 'bg-green-900',
          border: 'border-green-500/50',
          accent: 'text-green-400',
          iconBg: 'bg-green-500/20',
          warningBg: 'bg-green-500/10',
          warningBorder: 'border-green-500/30',
          warningText: 'text-green-300',
          buttonBg: 'bg-green-600 hover:bg-green-700'
        };
      case 'snake':
        return {
          bg: 'bg-lime-900',
          border: 'border-lime-500/50',
          accent: 'text-lime-400',
          iconBg: 'bg-lime-500/20',
          warningBg: 'bg-lime-500/10',
          warningBorder: 'border-lime-500/30',
          warningText: 'text-lime-300',
          buttonBg: 'bg-lime-600 hover:bg-lime-700'
        };
      default:
        return {
          bg: 'bg-gray-900',
          border: 'border-orange-500/50',
          accent: 'text-orange-400',
          iconBg: 'bg-orange-500/20',
          warningBg: 'bg-orange-500/10',
          warningBorder: 'border-orange-500/30',
          warningText: 'text-orange-300',
          buttonBg: 'bg-orange-600 hover:bg-orange-700'
        };
    }
  };

  const theme = getGameTheme();

  const getWarningMessage = () => {
    if (isInGame && !isSinglePlayer) {
      return `You are currently in an active ${gameType.toUpperCase()} game. Leaving will end the game for both players and may affect your statistics.`;
    } else if (isInGame && isSinglePlayer) {
      return `You are currently playing ${gameType.toUpperCase()}. Leaving will end your current game and you will lose all progress, including your current score and any potential token rewards.`;
    } else if (isInLobby) {
      return `You are currently in a ${gameType.toUpperCase()} lobby. Leaving will close the lobby and disconnect any other players.`;
    }
    return 'Are you sure you want to return to the main menu?';
  };

  const getActionText = () => {
    if (isInGame) {
      return 'End Game & Leave';
    } else if (isInLobby) {
      return 'Leave Lobby';
    }
    return 'Leave';
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999] p-4">
      <Card className={`${theme.bg} ${theme.border} max-w-md w-full mx-4 shadow-2xl`}>
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className={`w-16 h-16 ${theme.iconBg} rounded-full flex items-center justify-center`}>
              <AlertTriangle className={`w-8 h-8 ${theme.accent}`} />
            </div>
          </div>
          <CardTitle className={`${theme.accent} text-xl`}>
            Leave to Main Menu?
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <p className="text-white/80 text-center leading-relaxed">
            {getWarningMessage()}
          </p>
          
          {(isInGame || isInLobby) && (
            <div className={`${theme.warningBg} border ${theme.warningBorder} rounded-lg p-3`}>
              <p className={`${theme.warningText} text-sm text-center font-medium`}>
                ⚠️ This action cannot be undone
              </p>
            </div>
          )}
          
          <div className="flex gap-3">
            <Button
              onClick={onCancel}
              variant="outline"
              className="flex-1 border-white/30 text-white hover:bg-white/10"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              variant="destructive"
              className={`flex-1 ${theme.buttonBg}`}
            >
              {getActionText()}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}