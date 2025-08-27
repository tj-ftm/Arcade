

export type UnoColor = 'Red' | 'Green' | 'Blue' | 'Yellow' | 'Wild';
export type UnoValue = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'Skip' | 'Reverse' | 'Draw Two' | 'Wild' | 'Draw Four';

export interface UnoCard {
  color: UnoColor;
  value: UnoValue;
}

export interface Player {
  id: 'player' | 'bot';
  name: string;
  hand: UnoCard[];
}

export interface UnoGameState {
  players: Player[];
  playerHand: UnoCard[];
  deck: UnoCard[];
  discardPile: UnoCard[];
  activePlayerIndex: number;
  activeColor: UnoColor;
  winner: string | null;
  isReversed: boolean;
  direction: 'clockwise' | 'counter-clockwise';
  gameLog: string[];
}

export type BallType = 'solid' | 'stripe' | '8-ball' | 'cue';

export interface PoolBall {
  id: number;
  type: BallType;
  color: string;
  position: { x: number; y: number; };
  isInPocket: boolean;
}

export interface PoolPlayer {
  id: string;
  name: string;
  score: number;
  ballType: 'solid' | 'stripe' | null;
  isTurn: boolean;
}

export interface PoolGameState {
  players: PoolPlayer[];
  balls: PoolBall[];
  activePlayerId: string;
  turn: number;
  gameLog: string[];
  winner: string | null;
  isGameStarted: boolean;
  isGameEnded: boolean;
  cueBallPosition: { x: number; y: number; };
  cueBallInHand: boolean;
  lastPocketedBall: PoolBall | null;
  foul: boolean;
  scratchOn8Ball: boolean;
  player1Balls: number[]; // IDs of balls assigned to player 1
  player2Balls: number[]; // IDs of balls assigned to player 2
  firstBallPocketed: boolean; // To track if a player has pocketed their first ball to determine ball type
}

export type BackgroundSetting = "random" | "mountains" | "city" | "desert" | "beach" | "dojo" | "volcano";

export const DERP_ADDRESS = '0x8500d84b203775fc8b418148223872b35c43b050';

export const DERP_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "balanceOf",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "index",
        "type": "uint256"
      }
    ],
    "name": "tokenOfOwnerByIndex",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "tokenURI",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

export const ARC_TOKEN_ADDRESS = '0xAD75eAb973D5AbB77DAdc0Ec3047008dF3aa094d';
export const ARC_TOKEN_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "balanceOf",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

// PLACEHOLDERS: Replace with your deployed smart contract address and ABI
export const GAME_CONTRACT_ADDRESS = '0x4b870044D30d5feaC8561F63dC1CB84Fa8A59880';
export const GAME_CONTRACT_ABI = [
  // A minimal ABI for the playGame function
  {
    "inputs": [],
    "name": "playGame",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  }
];
