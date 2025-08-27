// Configuration for the betting system

// This will be updated after contract deployment
export const BETTING_CONFIG = {
  // Contract addresses (to be set after deployment)
  GAME_BETTING_CONTRACT: process.env.NEXT_PUBLIC_GAME_BETTING_CONTRACT || '',
  ARC_TOKEN_CONTRACT: '0xAD75eAb973D5AbB77DAdc0Ec3047008dF3aa094d',
  
  // Network configuration
  NETWORK_NAME: process.env.NEXT_PUBLIC_NETWORK_NAME || 'localhost',
  CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID || '31337',
  
  // Betting limits
  MIN_BET_AMOUNT: '1', // 1 ARC
  MAX_BET_AMOUNT: '1000', // 1000 ARC
  HOUSE_FEE_PERCENT: 5, // 5%
  
  // Game types
  SUPPORTED_GAMES: ['uno', 'chess', 'pool'] as const,
  
  // UI Configuration
  ENABLE_BETTING: process.env.NEXT_PUBLIC_ENABLE_BETTING === 'true',
  
  // Development mode
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development'
};

// Type for supported games
export type SupportedGame = typeof BETTING_CONFIG.SUPPORTED_GAMES[number];

// Validation functions
export const validateBetAmount = (amount: string): boolean => {
  const numAmount = parseFloat(amount);
  return !isNaN(numAmount) && 
         numAmount >= parseFloat(BETTING_CONFIG.MIN_BET_AMOUNT) && 
         numAmount <= parseFloat(BETTING_CONFIG.MAX_BET_AMOUNT);
};

export const isBettingEnabled = (): boolean => {
  return BETTING_CONFIG.ENABLE_BETTING && 
         BETTING_CONFIG.GAME_BETTING_CONTRACT !== '';
};

export const isGameSupported = (gameType: string): gameType is SupportedGame => {
  return BETTING_CONFIG.SUPPORTED_GAMES.includes(gameType as SupportedGame);
};

// Contract deployment helper
export const setContractAddress = (address: string) => {
  // This would typically be done through environment variables in production
  if (BETTING_CONFIG.IS_DEVELOPMENT) {
    (BETTING_CONFIG as any).GAME_BETTING_CONTRACT = address;
  }
};

// Get contract configuration
export const getContractConfig = () => {
  return {
    gameBettingAddress: BETTING_CONFIG.GAME_BETTING_CONTRACT,
    arcTokenAddress: BETTING_CONFIG.ARC_TOKEN_CONTRACT,
    networkName: BETTING_CONFIG.NETWORK_NAME,
    chainId: BETTING_CONFIG.CHAIN_ID
  };
};

// Calculate house fee
export const calculateHouseFee = (totalPot: string): string => {
  const pot = parseFloat(totalPot);
  const fee = (pot * BETTING_CONFIG.HOUSE_FEE_PERCENT) / 100;
  return fee.toFixed(6);
};

// Calculate winnings after house fee
export const calculateWinnings = (betAmount: string): string => {
  const totalPot = parseFloat(betAmount) * 2;
  const houseFee = parseFloat(calculateHouseFee(totalPot.toString()));
  const winnings = totalPot - houseFee;
  return winnings.toFixed(6);
};