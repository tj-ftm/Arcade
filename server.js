import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const lobbies = new Map();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Join lobby
    socket.on('join-lobby', (lobbyId, player2Name, player2Id) => {
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
    socket.on('create-lobby', (gameType, player1Name, player1Id) => {
      const pin = Math.floor(1000 + Math.random() * 9000);
      const lobbyId = `${gameType.toUpperCase()}-${pin}`;
      const lobby = {
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
    socket.on('leave-lobby', (lobbyId) => {
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

    // Game moves
    socket.on('game-move', (lobbyId, moveData) => {
      socket.to(lobbyId).emit('game-move', moveData);
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
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

  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});