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
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000'); // Use environment variable for production
    socketRef.current = socket;

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
      const newLobby: Lobby = {
        id: generateLobbyId(gameType),
        gameType,
        player1Id: player1Id,
        player1Name: player1Name,
        status: 'waiting',
        createdAt: new Date()
      };
      socket.emit('create-lobby', newLobby.gameType, newLobby.player1Name, newLobby.player1Id);
      setCurrentLobby(newLobby);
    }
  };

  const joinLobby = (lobbyId: string, player2Name: string, player2Id: string) => {
    if (socketRef.current) {
      socket.emit('joinLobby', lobbyId, player2Name, socket.id);
    }
  };

  const leaveLobby = (lobbyId: string) => {
    if (socketRef.current) {
      socket.emit('leaveLobby', lobbyId);
    }
  };

  const sendGameMove = (lobbyId: string, moveData: any) => {
    if (socketRef.current) {
      socket.emit('gameMove', { lobbyId, moveData });
    }
  };

  const onGameMove = (callback: (moveData: any) => void) => {
    if (socketRef.current) {
      socket.on('gameMove', callback);
    }
  };

  const onLobbyJoined = (callback: (lobby: Lobby) => void) => {
    if (socketRef.current) {
      socket.on('lobbyJoined', callback);
    }
  };

  const onLobbyLeft = (callback: (lobby: Lobby) => void) => {
    if (socketRef.current) {
      socket.on('lobbyLeft', callback);
    }
  };

  const onLobbyClosed = (callback: () => void) => {
    if (socketRef.current) {
      socket.on('lobbyClosed', callback);
    }
  };

  useEffect(() => {
    const socket = socketRef.current;
    if (socket) {
      const handleLobbyCreated = (lobby: Lobby) => {
        setLobbies(prev => [...prev, lobby]);
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

      socket.on('lobbyCreated', handleLobbyCreated);
      socket.on('lobbyList', handleLobbyList);
      socket.on('lobbyUpdated', handleLobbyUpdated);
      socket.on('lobbyDeleted', handleLobbyDeleted);

      return () => {
        socket.off('lobbyCreated', handleLobbyCreated);
        socket.off('lobbyList', handleLobbyList);
        socket.off('lobbyUpdated', handleLobbyUpdated);
        socket.off('lobbyDeleted', handleLobbyDeleted);
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