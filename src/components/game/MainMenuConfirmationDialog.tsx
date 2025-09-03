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

  const getGameTheme = () => {
    switch (gameType) {
      case 'uno':
        return {
          background: 'from-red-900 via-red-700 to-orange-900',
          cardBg: 'bg-red-900/80',
          borderColor: 'border-yellow-400/50',
          titleColor: 'text-yellow-400',
          iconBg: 'bg-yellow-400/20',
          iconColor: 'text-yellow-400',
          warningBg: 'bg-yellow-400/10',
          warningBorder: 'border-yellow-400/30',
          warningText: 'text-yellow-300',
          confirmBg: 'bg-red-600 hover:bg-red-700'
        };
      case 'chess':
        return {
          background: 'from-purple-900 via-purple-700 to-indigo-900',
          cardBg: 'bg-purple-900/80',
          borderColor: 'border-purple-400/50',
          titleColor: 'text-purple-400',
          iconBg: 'bg-purple-400/20',
          iconColor: 'text-purple-400',
          warningBg: 'bg-purple-400/10',
          warningBorder: 'border-purple-400/30',
          warningText: 'text-purple-300',
          confirmBg: 'bg-purple-600 hover:bg-purple-700'
        };
      case 'pool':
        return {
          background: 'from-green-900 via-green-700 to-emerald-900',
          cardBg: 'bg-green-900/80',
          borderColor: 'border-lime-400/50',
          titleColor: 'text-lime-400',
          iconBg: 'bg-lime-400/20',
          iconColor: 'text-lime-400',
          warningBg: 'bg-lime-400/10',
          warningBorder: 'border-lime-400/30',
          warningText: 'text-lime-300',
          confirmBg: 'bg-green-600 hover:bg-green-700'
        };
      case 'snake':
        return {
          background: 'from-gray-900 via-gray-700 to-black',
          cardBg: 'bg-gray-900/80',
          borderColor: 'border-green-400/50',
          titleColor: 'text-green-400',
          iconBg: 'bg-green-400/20',
          iconColor: 'text-green-400',
          warningBg: 'bg-green-400/10',
          warningBorder: 'border-green-400/30',
          warningText: 'text-green-300',
          confirmBg: 'bg-green-600 hover:bg-green-700'
        };
      default:
        return {
          background: 'from-gray-900 via-gray-700 to-black',
          cardBg: 'bg-gray-900/80',
          borderColor: 'border-orange-500/50',
          titleColor: 'text-orange-400',
          iconBg: 'bg-orange-500/20',
          iconColor: 'text-orange-400',
          warningBg: 'bg-orange-500/10',
          warningBorder: 'border-orange-500/30',
          warningText: 'text-orange-300',
          confirmBg: 'bg-orange-600 hover:bg-orange-700'
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
    <div className={`fixed inset-0 bg-gradient-to-br ${theme.background} bg-opacity-90 flex items-center justify-center z-[9999] p-4`}>
      <Card className={`${theme.cardBg} ${theme.borderColor} max-w-md w-full mx-4 shadow-2xl backdrop-blur-sm`}>
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className={`w-16 h-16 ${theme.iconBg} rounded-full flex items-center justify-center`}>
              <AlertTriangle className={`w-8 h-8 ${theme.iconColor}`} />
            </div>
          </div>
          <CardTitle className={`${theme.titleColor} text-xl font-headline uppercase tracking-wider`}>
            Leave to Main Menu?
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <p className="text-white/80 text-center leading-relaxed font-headline">
            {getWarningMessage()}
          </p>
          
          {(isInGame || isInLobby) && (
            <div className={`${theme.warningBg} border ${theme.warningBorder} rounded-lg p-3`}>
              <p className={`${theme.warningText} text-sm text-center font-medium font-headline`}>
                ⚠️ This action cannot be undone
              </p>
            </div>
          )}
          
          <div className="flex gap-3">
            <Button
              onClick={onCancel}
              variant="outline"
              className="flex-1 border-white/30 text-white hover:bg-white/10 font-headline"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              className={`flex-1 ${theme.confirmBg} text-white font-headline`}
            >
              {getActionText()}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}