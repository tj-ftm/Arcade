import { NextRequest } from 'next/server';
import { Server as NetServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

interface SocketServer extends NetServer {
  io?: SocketIOServer;
}

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

const lobbies = new Map<string, Lobby>();

export async function GET(req: NextRequest) {
  const res = new Response();
  const server = (res as any).socket?.server as SocketServer;

  if (!server?.io) {
    console.log('Initializing Socket.IO server...');
    const io = new SocketIOServer(server, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      // Join lobby
      socket.on('join-lobby', (lobbyId: string, playerName: string) => {
        const lobby = lobbies.get(lobbyId);
        if (lobby && lobby.status === 'waiting' && !lobby.playerId) {
          lobby.playerId = socket.id;
          lobby.playerName = playerName;
          lobby.status = 'playing';
          
          socket.join(lobbyId);
          io.to(lobbyId).emit('lobby-joined', lobby);
          io.emit('lobbies-updated', Array.from(lobbies.values()).filter(l => l.status === 'waiting'));
        } else {
          socket.emit('join-error', 'Lobby not available');
        }
      });

      // Create lobby
      socket.on('create-lobby', (gameType: 'chess' | 'uno', hostName: string) => {
        const lobbyId = `${gameType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const lobby: Lobby = {
          id: lobbyId,
          gameType,
          hostId: socket.id,
          hostName,
          status: 'waiting',
          createdAt: new Date()
        };
        
        lobbies.set(lobbyId, lobby);
        socket.join(lobbyId);
        socket.emit('lobby-created', lobby);
        io.emit('lobbies-updated', Array.from(lobbies.values()).filter(l => l.status === 'waiting'));
      });

      // Leave lobby
      socket.on('leave-lobby', (lobbyId: string) => {
        const lobby = lobbies.get(lobbyId);
        if (lobby) {
          if (lobby.hostId === socket.id) {
            lobbies.delete(lobbyId);
          } else if (lobby.playerId === socket.id) {
            lobby.playerId = undefined;
            lobby.playerName = undefined;
            lobby.status = 'waiting';
          }
          socket.leave(lobbyId);
          io.to(lobbyId).emit('lobby-left', lobby);
          io.emit('lobbies-updated', Array.from(lobbies.values()).filter(l => l.status === 'waiting'));
        }
      });

      // Get lobbies
      socket.on('get-lobbies', () => {
        socket.emit('lobbies-updated', Array.from(lobbies.values()).filter(l => l.status === 'waiting'));
      });

      // Game moves (for chess and uno)
      socket.on('game-move', (lobbyId: string, moveData: any) => {
        socket.to(lobbyId).emit('game-move', moveData);
      });

      // Disconnect
      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        // Clean up lobbies where this socket was involved
        for (const [lobbyId, lobby] of lobbies.entries()) {
          if (lobby.hostId === socket.id) {
            lobbies.delete(lobbyId);
            io.to(lobbyId).emit('lobby-closed');
          } else if (lobby.playerId === socket.id) {
            lobby.playerId = undefined;
            lobby.playerName = undefined;
            lobby.status = 'waiting';
            io.to(lobbyId).emit('lobby-left', lobby);
          }
        }
        io.emit('lobbies-updated', Array.from(lobbies.values()).filter(l => l.status === 'waiting'));
      });
    });

    server.io = io;
  }

  return new Response('Socket.IO server initialized', { status: 200 });
}