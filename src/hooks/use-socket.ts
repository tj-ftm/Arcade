import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface Lobby {
  id: string;
  gameType: 'chess' | 'uno';
  player1Id: string;
  player1Name: string;
  player2Id?: string;
  player2Name?: string;
  status: 'waiting' | 'playing' | 'finished';
  createdAt: Date;
}

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  lobbies: Lobby[];
  currentLobby: Lobby | null;
  createLobby: (gameType: 'chess' | 'uno', player1Name: string, player1Id: string) => void;
  joinLobby: (lobbyId: string, player2Name: string, player2Id: string) => void;
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
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [currentLobby, setCurrentLobby] = useState<Lobby | null>(null);

  useEffect(() => {
    const serverUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000';
    socketRef.current = io(serverUrl);
    const socket = socketRef.current;

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('Socket connected');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Socket disconnected');
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    const socket = socketRef.current;
    if (isConnected && socket) {
      socket.emit('requestLobbyList');
    }
  }, [isConnected, socketRef.current]);

  const generateLobbyId = (gameType: 'chess' | 'uno'): string => {
    const prefix = gameType.toUpperCase();
    const pin = Math.floor(1000 + Math.random() * 9000); // Generate 4-digit number
    return `${prefix}-${pin}`;
  };

  const createLobby = (gameType: 'chess' | 'uno', player1Name: string, player1Id: string) => {
    if (socketRef.current) {
      socket.emit('create-lobby', gameType, player1Name, player1Id);
    }
  };

  const joinLobby = (lobbyId: string, player2Name: string, player2Id: string) => {
    if (socketRef.current) {
      socket.emit('join-lobby', lobbyId, player2Name, player2Id);
    }
  };

  const leaveLobby = (lobbyId: string) => {
    if (socketRef.current) {
      socket.emit('leave-lobby', lobbyId);
    }
  };

  const sendGameMove = (lobbyId: string, moveData: any) => {
    if (socketRef.current) {
      socket.emit('game-move', lobbyId, moveData);
    }
  };

  const onGameMove = (callback: (moveData: any) => void) => {
    if (socketRef.current) {
      socket.on('game-move', callback);
    }
  };

  const onLobbyJoined = (callback: (lobby: Lobby) => void) => {
    if (socketRef.current) {
      socket.on('lobby-joined', callback);
    }
  };

  const onLobbyLeft = (callback: (lobby: Lobby) => void) => {
    if (socketRef.current) {
      socket.on('lobby-left', callback);
    }
  };

  const onLobbyClosed = (callback: () => void) => {
    if (socketRef.current) {
      socket.on('lobby-closed', callback);
    }
  };

  useEffect(() => {
    const socket = socketRef.current;
    if (socket) {
      const handleLobbyCreated = (lobby: Lobby) => {
        setLobbies(prev => [...prev, lobby]);
        // If this is the lobby we just created, set it as current
        if (lobby.player1Id === socket.id) {
          setCurrentLobby(lobby);
        }
      };

      const handleLobbyList = (lobbies: Lobby[]) => {
        setLobbies(lobbies);
      };

      const handleLobbyUpdated = (updatedLobby: Lobby) => {
        setLobbies(prev => prev.map(l => l.id === updatedLobby.id ? updatedLobby : l));
        if (currentLobby && currentLobby.id === updatedLobby.id) {
          setCurrentLobby(updatedLobby);
        }
      };

      const handleLobbyDeleted = (lobbyId: string) => {
        setLobbies(prev => prev.filter(l => l.id !== lobbyId));
        if (currentLobby && currentLobby.id === lobbyId) {
          setCurrentLobby(null);
        }
      };

      socket.on('lobby-created', handleLobbyCreated);
      socket.on('lobbies-updated', handleLobbyList);
      socket.on('lobby-updated', handleLobbyUpdated);
      socket.on('lobby-deleted', handleLobbyDeleted);
      
      // Request initial lobby list when connected
      socket.emit('get-lobbies');

      return () => {
        socket.off('lobby-created', handleLobbyCreated);
        socket.off('lobbies-updated', handleLobbyList);
        socket.off('lobby-updated', handleLobbyUpdated);
        socket.off('lobby-deleted', handleLobbyDeleted);
      };
    }
  }, [currentLobby, socketRef.current]);

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