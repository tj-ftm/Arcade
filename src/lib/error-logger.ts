import { database } from './firebase';
import { ref, push, serverTimestamp } from 'firebase/database';

interface GameErrorLog {
  gameType: 'chess' | 'uno' | 'pool' | 'snake';
  gameMode: 'singleplayer' | 'multiplayer' | 'betting';
  playerId: string;
  playerName: string;
  errorType: 'stuck' | 'crash' | 'network' | 'logic' | 'other';
  errorMessage: string;
  gameState: any;
  gameLog: string[];
  timestamp: any;
  userAgent: string;
  url: string;
  stackTrace?: string;
}

interface GameSessionLog {
  gameType: 'chess' | 'uno' | 'pool' | 'snake';
  gameMode: 'singleplayer' | 'multiplayer' | 'betting';
  playerId: string;
  playerName: string;
  sessionId: string;
  gameState: any;
  gameLog: string[];
  timestamp: any;
  duration: number;
  status: 'active' | 'completed' | 'abandoned' | 'error';
}

export class ErrorLogger {
  private static instance: ErrorLogger;
  private sessionId: string;
  private gameLog: string[] = [];
  private gameStartTime: number = 0;

  private constructor() {
    this.sessionId = this.generateSessionId();
  }

  public static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public startGameSession(gameType: string, gameMode: string, playerId: string, playerName: string) {
    this.gameStartTime = Date.now();
    this.gameLog = [`Game started: ${gameType} - ${gameMode}`];
    this.addToGameLog(`Player: ${playerName} (${playerId})`);
  }

  public addToGameLog(message: string) {
    const timestamp = new Date().toISOString();
    this.gameLog.push(`[${timestamp}] ${message}`);
    
    // Keep only last 100 log entries to prevent memory issues
    if (this.gameLog.length > 100) {
      this.gameLog = this.gameLog.slice(-100);
    }
  }

  public async logError(
    gameType: 'chess' | 'uno' | 'pool' | 'snake',
    gameMode: 'singleplayer' | 'multiplayer' | 'betting',
    playerId: string,
    playerName: string,
    errorType: 'stuck' | 'crash' | 'network' | 'logic' | 'other',
    errorMessage: string,
    gameState: any,
    stackTrace?: string
  ): Promise<void> {
    try {
      const errorLog: GameErrorLog = {
        gameType,
        gameMode,
        playerId,
        playerName,
        errorType,
        errorMessage,
        gameState,
        gameLog: [...this.gameLog],
        timestamp: serverTimestamp(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        stackTrace
      };

      const errorLogsRef = ref(database, 'errorLogs');
      await push(errorLogsRef, errorLog);
      
      console.log('Error logged to Firebase:', errorLog);
    } catch (error) {
      console.error('Failed to log error to Firebase:', error);
    }
  }

  public async logGameSession(
    gameType: 'chess' | 'uno' | 'pool' | 'snake',
    gameMode: 'singleplayer' | 'multiplayer' | 'betting',
    playerId: string,
    playerName: string,
    gameState: any,
    status: 'active' | 'completed' | 'abandoned' | 'error'
  ): Promise<void> {
    try {
      const duration = Date.now() - this.gameStartTime;
      
      const sessionLog: GameSessionLog = {
        gameType,
        gameMode,
        playerId,
        playerName,
        sessionId: this.sessionId,
        gameState,
        gameLog: [...this.gameLog],
        timestamp: serverTimestamp(),
        duration,
        status
      };

      const sessionLogsRef = ref(database, 'gameSessions');
      await push(sessionLogsRef, sessionLog);
      
      console.log('Game session logged to Firebase:', sessionLog);
    } catch (error) {
      console.error('Failed to log game session to Firebase:', error);
    }
  }

  public async reportStuckGame(
    gameType: 'chess' | 'uno' | 'pool' | 'snake',
    gameMode: 'singleplayer' | 'multiplayer' | 'betting',
    playerId: string,
    playerName: string,
    gameState: any,
    description: string
  ): Promise<void> {
    this.addToGameLog(`STUCK GAME REPORTED: ${description}`);
    
    await this.logError(
      gameType,
      gameMode,
      playerId,
      playerName,
      'stuck',
      `Game stuck: ${description}`,
      gameState
    );
  }

  public getGameLog(): string[] {
    return [...this.gameLog];
  }

  public clearGameLog(): void {
    this.gameLog = [];
    this.sessionId = this.generateSessionId();
  }
}

export const errorLogger = ErrorLogger.getInstance();