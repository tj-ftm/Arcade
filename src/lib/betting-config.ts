// Configuration for the betting system

// Multi-chain contract addresses
export const CHAIN_CONFIGS = {
  sonic: {
    chainId: 146,
    name: 'Sonic',
    rpcUrl: 'https://rpc.soniclabs.com',
    gameBettingContract: process.env.NEXT_PUBLIC_GAME_BETTING_CONTRACT_SONIC || '0x4b870044D30d5feaC8561F63dC1CB84Fa8A59880',
    arcTokenContract: '0xAD75eAb973D5AbB77DAdc0Ec3047008dF3aa094d',
    explorerUrl: 'https://sonicscan.org'
  },
  base: {
    chainId: 8453,
    name: 'Base',
    rpcUrl: 'https://mainnet.base.org',
    gameBettingContract: process.env.NEXT_PUBLIC_GAME_BETTING_CONTRACT_BASE || '', // To be updated after deployment
    arcTokenContract: '0xAD75eAb973D5AbB77DAdc0Ec3047008dF3aa094d',
    explorerUrl: 'https://basescan.org'
  }
} as const;

export type SupportedChain = keyof typeof CHAIN_CONFIGS;

// Legacy config for backward compatibility
export const BETTING_CONFIG = {
  // Contract addresses (defaults to Sonic network)
  GAME_BETTING_CONTRACT: CHAIN_CONFIGS.sonic.gameBettingContract,
  ARC_TOKEN_CONTRACT: CHAIN_CONFIGS.sonic.arcTokenContract,
  
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
export const getContractConfig = (chain: SupportedChain = 'sonic') => {
  const chainConfig = CHAIN_CONFIGS[chain];
  return {
    gameBettingContract: chainConfig.gameBettingContract,
    arcTokenContract: chainConfig.arcTokenContract,
    networkName: chainConfig.name,
    chainId: chainConfig.chainId.toString(),
    rpcUrl: chainConfig.rpcUrl,
    explorerUrl: chainConfig.explorerUrl
  };
};

// Get betting config for specific chain
export const getChainBettingConfig = (chain: SupportedChain) => {
  return CHAIN_CONFIGS[chain];
};

// Check if betting is enabled for a specific chain
export const isBettingEnabledForChain = (chain: SupportedChain): boolean => {
  const chainConfig = CHAIN_CONFIGS[chain];
  return BETTING_CONFIG.ENABLE_BETTING && 
         chainConfig.gameBettingContract !== '';
};

// Get supported chains for betting
export const getSupportedBettingChains = (): SupportedChain[] => {
  return Object.keys(CHAIN_CONFIGS).filter(chain => 
    isBettingEnabledForChain(chain as SupportedChain)
  ) as SupportedChain[];
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