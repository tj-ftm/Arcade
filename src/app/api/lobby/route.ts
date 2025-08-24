import { NextRequest, NextResponse } from 'next/server';

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

// In-memory storage for lobbies (in production, use a database)
const lobbies = new Map<string, Lobby>();

// GET - List all available lobbies
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const gameType = url.searchParams.get('gameType') as 'chess' | 'uno' | null;
    
    let availableLobbies = Array.from(lobbies.values()).filter(lobby => lobby.status === 'waiting');
    
    if (gameType) {
      availableLobbies = availableLobbies.filter(lobby => lobby.gameType === gameType);
    }
    
    return NextResponse.json({
      success: true,
      lobbies: availableLobbies
    });
  } catch (error) {
    console.error('Error fetching lobbies:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch lobbies' },
      { status: 500 }
    );
  }
}

// POST - Create a new lobby
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gameType, hostName, hostId } = body;
    
    if (!gameType || !hostName || !hostId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: gameType, hostName, hostId' },
        { status: 400 }
      );
    }
    
    if (!['chess', 'uno'].includes(gameType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid game type. Must be chess or uno' },
        { status: 400 }
      );
    }
    
    const lobbyId = `${gameType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const lobby: Lobby = {
      id: lobbyId,
      gameType,
      hostId,
      hostName,
      status: 'waiting',
      createdAt: new Date()
    };
    
    lobbies.set(lobbyId, lobby);
    
    return NextResponse.json({
      success: true,
      lobby
    });
  } catch (error) {
    console.error('Error creating lobby:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create lobby' },
      { status: 500 }
    );
  }
}

// PUT - Join a lobby
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { lobbyId, playerId, playerName } = body;
    
    if (!lobbyId || !playerId || !playerName) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: lobbyId, playerId, playerName' },
        { status: 400 }
      );
    }
    
    const lobby = lobbies.get(lobbyId);
    
    if (!lobby) {
      return NextResponse.json(
        { success: false, error: 'Lobby not found' },
        { status: 404 }
      );
    }
    
    if (lobby.status !== 'waiting') {
      return NextResponse.json(
        { success: false, error: 'Lobby is not available for joining' },
        { status: 400 }
      );
    }
    
    if (lobby.playerId) {
      return NextResponse.json(
        { success: false, error: 'Lobby is already full' },
        { status: 400 }
      );
    }
    
    lobby.playerId = playerId;
    lobby.playerName = playerName;
    lobby.status = 'playing';
    
    return NextResponse.json({
      success: true,
      lobby
    });
  } catch (error) {
    console.error('Error joining lobby:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to join lobby' },
      { status: 500 }
    );
  }
}

// DELETE - Leave/Delete a lobby
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const lobbyId = url.searchParams.get('lobbyId');
    const userId = url.searchParams.get('userId');
    
    if (!lobbyId || !userId) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters: lobbyId, userId' },
        { status: 400 }
      );
    }
    
    const lobby = lobbies.get(lobbyId);
    
    if (!lobby) {
      return NextResponse.json(
        { success: false, error: 'Lobby not found' },
        { status: 404 }
      );
    }
    
    // If host leaves, delete the lobby
    if (lobby.hostId === userId) {
      lobbies.delete(lobbyId);
      return NextResponse.json({
        success: true,
        message: 'Lobby deleted'
      });
    }
    
    // If player leaves, make lobby available again
    if (lobby.playerId === userId) {
      lobby.playerId = undefined;
      lobby.playerName = undefined;
      lobby.status = 'waiting';
      
      return NextResponse.json({
        success: true,
        lobby
      });
    }
    
    return NextResponse.json(
      { success: false, error: 'User not found in this lobby' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error leaving lobby:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to leave lobby' },
      { status: 500 }
    );
  }
}