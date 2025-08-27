import React from 'react';
import { GameType, GameLobby } from './game';

// Unified component prop type definitions
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface GameComponentProps extends BaseComponentProps {
  gameType: GameType;
  onBack?: () => void;
  onStartGame?: (lobby: GameLobby, isHost: boolean) => void;
}

export interface BettingLobbyProps extends GameComponentProps {
  onBackToMenu?: () => void;
}

export interface CardComponentProps extends BaseComponentProps {
  card: any;
  isPlayer: boolean;
  onClick?: (e: React.MouseEvent<Element>) => void;
  isPlayable: boolean;
  isLastCard?: boolean;
  style?: React.CSSProperties;
  size?: 'normal' | 'large';
}

export interface MobileSidebarProps extends BaseComponentProps {
  onNavigate: (view: 'leaderboard' | 'settings' | 'tokenomics' | 'docs' | 'profile' | 'shop') => void;
  theme?: string;
}

export interface EndGameScreenProps extends BaseComponentProps {
  winner: string;
  gameType: GameType;
  onPlayAgain?: () => void;
  onBackToMenu?: () => void;
  tokensEarned?: number;
}

export interface LobbyListProps extends BaseComponentProps {
  gameType: GameType;
  lobbies: GameLobby[];
  onJoinLobby: (lobbyId: string) => void;
  isJoining: boolean;
}

export interface GameStatsProps extends BaseComponentProps {
  gameType: GameType;
  stats: any;
  loading?: boolean;
}