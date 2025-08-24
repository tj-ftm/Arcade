import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface Lobby {
  id: string;
  gameType: 'chess' | 'uno';
  hostId: string;
  hostName: string;
  playerId?: string;
  playerName?: string;
  status: 'waiting' | 'playing' | 'finished';
  createdAt: Date;
}

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  lobbies: Lobby[];
  currentLobby: Lobby | null;
  createLobby: (gameType: 'chess' | 'uno', hostName: string) => void;
  joinLobby: (lobbyId: string, playerName: string) => void;
  leaveLobby: (lobbyId: string) => void;
  sendGameMove: (lobbyId: string, moveData: any) => void;
  onGameMove: (callback: (moveData: any) => void) => void;
  onLobbyJoined: (callback: (lobby: Lobby) => void) => void;
  onLobbyLeft: (callback: (lobby: Lobby) => void) => void;
  onLobbyClosed: (callback: () => void) => void;
}

export const useSocket = (): UseSocketReturn => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(true); // Mock as connected for now
  const [lobbies, setLobbies] = useState<Lobby[]>([
    // Mock lobbies for demonstration
    {
      id: 'CHESS-1234',
      gameType: 'chess',
      hostId: 'demo-host-1',
      hostName: 'ChessMaster',
      status: 'waiting',
      createdAt: new Date(Date.now() - 300000) // 5 minutes ago
    },
    {
      id: 'UNO-5678',
      gameType: 'uno',
      hostId: 'demo-host-2',
      hostName: 'UnoChamp',
      status: 'waiting',
      createdAt: new Date(Date.now() - 120000) // 2 minutes ago
    }
  ]);
  const [currentLobby, setCurrentLobby] = useState<Lobby | null>(null);

  useEffect(() => {
    // Mock socket connection for now
    console.log('Mock socket connection established');
    setIsConnected(true);

    // Mock cleanup
    return () => {
      console.log('Mock socket cleanup');
    };
  }, []);

  const generateLobbyId = (gameType: 'chess' | 'uno'): string => {
    const prefix = gameType.toUpperCase();
    const pin = Math.floor(1000 + Math.random() * 9000); // Generate 4-digit number
    return `${prefix}-${pin}`;
  };

  const createLobby = (gameType: 'chess' | 'uno', hostName: string) => {
    console.log('Mock: Creating lobby', { gameType, hostName });
    const newLobby: Lobby = {
      id: generateLobbyId(gameType),
      gameType,
      hostId: 'mock-user',
      hostName,
      status: 'waiting',
      createdAt: new Date()
    };
    setLobbies(prev => [...prev, newLobby]);
    setCurrentLobby(newLobby);
  };

  const joinLobby = (lobbyId: string, playerName: string) => {
    console.log('Mock: Joining lobby', { lobbyId, playerName });
    const lobby = lobbies.find(l => l.id === lobbyId);
    if (lobby) {
      const updatedLobby = { ...lobby, playerId: 'mock-player', playerName, status: 'playing' as const };
      setCurrentLobby(updatedLobby);
      setLobbies(prev => prev.map(l => l.id === lobbyId ? updatedLobby : l));
    }
  };

  const leaveLobby = (lobbyId: string) => {
    console.log('Mock: Leaving lobby', lobbyId);
    setCurrentLobby(null);
  };

  const sendGameMove = (lobbyId: string, moveData: any) => {
    console.log('Mock: Sending game move', { lobbyId, moveData });
  };

  const onGameMove = (callback: (moveData: any) => void) => {
    console.log('Mock: Setting up game move listener');
  };

  const onLobbyJoined = (callback: (lobby: Lobby) => void) => {
    console.log('Mock: Setting up lobby joined listener');
  };

  const onLobbyLeft = (callback: (lobby: Lobby) => void) => {
    console.log('Mock: Setting up lobby left listener');
  };

  const onLobbyClosed = (callback: () => void) => {
    console.log('Mock: Setting up lobby closed listener');
  };

  return {
    socket: socketRef.current,
    isConnected,
    lobbies,
    currentLobby,
    createLobby,
    joinLobby,
    leaveLobby,
    sendGameMove,
    onGameMove,
    onLobbyJoined,
    onLobbyLeft,
    onLobbyClosed
  };
};