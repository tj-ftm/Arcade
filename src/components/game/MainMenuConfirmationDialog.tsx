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
      <Card className="bg-gray-900 border-orange-500/50 max-w-md w-full mx-4 shadow-2xl">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-orange-400" />
            </div>
          </div>
          <CardTitle className="text-orange-400 text-xl">
            Leave to Main Menu?
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <p className="text-white/80 text-center leading-relaxed">
            {getWarningMessage()}
          </p>
          
          {(isInGame || isInLobby) && (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
              <p className="text-orange-300 text-sm text-center font-medium">
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
              className="flex-1 bg-orange-600 hover:bg-orange-700"
            >
              {getActionText()}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}