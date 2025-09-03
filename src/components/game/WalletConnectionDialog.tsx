import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, X } from 'lucide-react';
import { useWeb3 } from '../web3/Web3Provider';

interface WalletConnectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  gameType?: string;
  message?: string;
}

export function WalletConnectionDialog({
  isOpen,
  onClose,
  gameType = 'game',
  message = 'Please connect your wallet first to play this game mode.'
}: WalletConnectionDialogProps) {
  const { connect, isConnected } = useWeb3();

  if (!isOpen) return null;

  const handleConnect = async () => {
    try {
      await connect();
      if (isConnected) {
        onClose();
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  const getGameTheme = () => {
    switch (gameType.toLowerCase()) {
      case 'uno':
        return {
          background: 'from-red-900 via-red-700 to-orange-900',
          cardBg: 'bg-red-900/80',
          borderColor: 'border-yellow-400/50',
          titleColor: 'text-yellow-400',
          iconBg: 'bg-yellow-400/20',
          iconColor: 'text-yellow-400',
          buttonBg: 'bg-yellow-600 hover:bg-yellow-700'
        };
      case 'chess':
        return {
          background: 'from-purple-900 via-purple-700 to-indigo-900',
          cardBg: 'bg-purple-900/80',
          borderColor: 'border-purple-400/50',
          titleColor: 'text-purple-400',
          iconBg: 'bg-purple-400/20',
          iconColor: 'text-purple-400',
          buttonBg: 'bg-purple-600 hover:bg-purple-700'
        };
      case 'snake':
        return {
          background: 'from-gray-900 via-gray-700 to-black',
          cardBg: 'bg-gray-900/80',
          borderColor: 'border-green-400/50',
          titleColor: 'text-green-400',
          iconBg: 'bg-green-400/20',
          iconColor: 'text-green-400',
          buttonBg: 'bg-green-600 hover:bg-green-700'
        };
      default:
        return {
          background: 'from-gray-900 via-gray-700 to-black',
          cardBg: 'bg-gray-900/80',
          borderColor: 'border-orange-500/50',
          titleColor: 'text-orange-400',
          iconBg: 'bg-orange-500/20',
          iconColor: 'text-orange-400',
          buttonBg: 'bg-orange-600 hover:bg-orange-700'
        };
    }
  };

  const theme = getGameTheme();

  return (
    <div className={`fixed inset-0 bg-gradient-to-br ${theme.background} bg-opacity-90 flex items-center justify-center z-[9999] p-4`}>
      <Card className={`${theme.cardBg} ${theme.borderColor} max-w-md w-full mx-4 shadow-2xl backdrop-blur-sm`}>
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className={`w-16 h-16 ${theme.iconBg} rounded-full flex items-center justify-center`}>
              <Wallet className={`w-8 h-8 ${theme.iconColor}`} />
            </div>
          </div>
          <CardTitle className={`${theme.titleColor} text-xl font-headline uppercase tracking-wider`}>
            Wallet Required
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <p className="text-white/80 text-center leading-relaxed font-headline">
            {message}
          </p>
          
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
            <p className="text-blue-300 text-sm text-center font-medium font-headline">
              💡 Connect your wallet to unlock pay-to-earn features and token rewards
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 border-white/30 text-white hover:bg-white/10 font-headline"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleConnect}
              className={`flex-1 ${theme.buttonBg} text-white font-headline`}
            >
              <Wallet className="w-4 h-4 mr-2" />
              Connect Wallet
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}