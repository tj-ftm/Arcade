import { NextRequest } from 'next/server';
import { Server as NetServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

interface SocketServer extends NetServer {
  io?: SocketIOServer;
}

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
      socket.on('join-lobby', (lobbyId: string, player2Name: string, player2Id: string) => {
        const lobby = lobbies.get(lobbyId);
        if (lobby && lobby.status === 'waiting' && !lobby.player2Id) {
          lobby.player2Id = player2Id;
          lobby.player2Name = player2Name;
          lobby.status = 'playing';
          
          socket.join(lobbyId);
          io.to(lobbyId).emit('lobby-joined', lobby);
          io.emit('lobbies-updated', Array.from(lobbies.values()).filter(l => l.status === 'waiting'));
        } else {
          socket.emit('join-error', 'Lobby not available');
        }
      });

      // Create lobby
      socket.on('create-lobby', (gameType: 'chess' | 'uno', player1Name: string, player1Id: string) => {
        const pin = Math.floor(1000 + Math.random() * 9000); // Generate 4-digit number
        const lobbyId = `${gameType.toUpperCase()}-${pin}`;
        const lobby: Lobby = {
          id: lobbyId,
          gameType,
          player1Id: socket.id,
          player1Name: player1Name,
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
          if (lobby.player1Id === socket.id) {
            lobbies.delete(lobbyId);
          } else if (lobby.player2Id === socket.id) {
            lobby.player2Id = undefined;
            lobby.player2Name = undefined;
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
          if (lobby.player1Id === socket.id) {
            lobbies.delete(lobbyId);
            io.to(lobbyId).emit('lobby-closed');
          } else if (lobby.player2Id === socket.id) {
            lobby.player2Id = undefined;
            lobby.player2Name = undefined;
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