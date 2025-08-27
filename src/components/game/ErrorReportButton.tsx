"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Bug, Send } from 'lucide-react';
import { errorLogger } from '@/lib/error-logger';
import { useWeb3 } from '@/components/web3/Web3Provider';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ErrorReportButtonProps {
  gameType: 'chess' | 'uno' | 'pool' | 'snake';
  gameMode: 'singleplayer' | 'multiplayer' | 'betting';
  gameState: any;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
}

export const ErrorReportButton = ({
  gameType,
  gameMode,
  gameState,
  className = '',
  variant = 'outline',
  size = 'sm'
}: ErrorReportButtonProps) => {
  const { account, username } = useWeb3();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorType, setErrorType] = useState<'stuck' | 'crash' | 'network' | 'logic' | 'other'>('stuck');
  const [description, setDescription] = useState('');

  const handleSubmitReport = async () => {
    if (!description.trim()) {
      toast({
        title: "Description Required",
        description: "Please describe the issue you're experiencing.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await errorLogger.reportStuckGame(
        gameType,
        gameMode,
        account || 'anonymous',
        username || 'Anonymous Player',
        gameState,
        `${errorType.toUpperCase()}: ${description}`
      );

      toast({
        title: "Report Submitted",
        description: "Thank you! Your error report has been sent to our development team.",
        variant: "default"
      });

      setIsOpen(false);
      setDescription('');
      setErrorType('stuck');
    } catch (error) {
      console.error('Failed to submit error report:', error);
      toast({
        title: "Submission Failed",
        description: "Failed to submit report. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={`${className} text-red-400 border-red-400/30 hover:bg-red-400/10`}
          title="Report a bug or stuck game"
        >
          <Bug className="h-4 w-4 mr-1" />
          Report Issue
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-black/90 border-red-400/30 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-400">
            <AlertTriangle className="h-5 w-5" />
            Report Game Issue
          </DialogTitle>
          <DialogDescription className="text-gray-300">
            Help us improve the game by reporting bugs, stuck games, or other issues.
            Your report will be sent to our development team for investigation.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="error-type" className="text-white">Issue Type</Label>
            <Select value={errorType} onValueChange={(value: any) => setErrorType(value)}>
              <SelectTrigger className="bg-black/50 border-gray-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-black border-gray-600">
                <SelectItem value="stuck">Game Stuck / Can't Move</SelectItem>
                <SelectItem value="crash">Game Crashed</SelectItem>
                <SelectItem value="network">Network/Connection Issue</SelectItem>
                <SelectItem value="logic">Game Logic Error</SelectItem>
                <SelectItem value="other">Other Issue</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="description" className="text-white">Description</Label>
            <Textarea
              id="description"
              placeholder="Please describe what happened, what you were trying to do, and any steps to reproduce the issue..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-black/50 border-gray-600 text-white placeholder-gray-400 min-h-[100px]"
            />
          </div>
          
          <div className="bg-gray-800/50 p-3 rounded text-sm">
            <p className="text-gray-300 mb-2">Game Info:</p>
            <ul className="text-gray-400 space-y-1">
              <li>Game: {gameType.toUpperCase()}</li>
              <li>Mode: {gameMode}</li>
              <li>Player: {username || 'Anonymous'}</li>
              <li>Session: {errorLogger.getGameLog().length} log entries</li>
            </ul>
          </div>
          
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitReport}
              disabled={isSubmitting || !description.trim()}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit Report
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};