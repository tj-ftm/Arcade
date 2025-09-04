"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { ethers, formatEther } from 'ethers';
import { ARC_TOKEN_ADDRESS } from '@/types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

// Full ABI from contractabi.json (simplified for relevant functions/events)
const ARC_TOKEN_FULL_ABI = [
  {
    "inputs": [],
    "name": "totalSupply",
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
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "value",
        "type": "uint256"
      }
    ],
    "name": "Transfer",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "mintedTo",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "quantityMinted",
        "type": "uint256"
      }
    ],
    "name": "TokensMinted",
    "type": "event"
  }
];

interface MintEvent {
  timestamp: number;
  minter: string;
  amount: number;
  txHash: string;
}

interface TokenomicsChartProps {
  onBack?: () => void;
}

interface GameMintLog {
  id: string;
  timestamp: string;
  playerAddress: string;
  gameType: string;
  gameId?: string;
  amount: number;
  amountFormatted: string;
  txHash: string;
  blockNumber?: number;
  verified: boolean;
  createdAt: string;
}

interface MintStats {
  totalMints: number;
  totalAmountMinted: string;
  mintsByGameType: Record<string, { count: number; amount: string }>;
  mintsByPlayer: Record<string, { count: number; amount: string }>;
  verifiedMints: number;
}

const TokenomicsChart: React.FC<TokenomicsChartProps> = ({ onBack }) => {
  const [sonicSupply, setSonicSupply] = useState<string>('0');
  const [baseSupply, setBaseSupply] = useState<string>('0');
  const [totalSupply, setTotalSupply] = useState<string>('0');
  const [mintEvents, setMintEvents] = useState<MintEvent[]>([]);
  const [chartData, setChartData] = useState<{ date: string; minted: number }[]>([]);
  const [gameMintLogs, setGameMintLogs] = useState<GameMintLog[]>([]);
  const [mintStats, setMintStats] = useState<MintStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [mintLogsLoading, setMintLogsLoading] = useState<boolean>(true);

  const getProvider = useCallback(() => {
    if (typeof window !== "undefined" && window.ethereum) {
      return new ethers.BrowserProvider(window.ethereum);
    } else {
      // Hardcode RPC URLs as they are public endpoints
      const rpcUrls = [
        'https://rpc.soniclabs.com/',
        'https://rpc.sonic.fantom.network/', // Alternative Sonic RPC
        'https://sonic-mainnet.gateway.tatum.io/' // Another alternative
      ];
      
      // Return the first available RPC URL
      for (const url of rpcUrls) {
        try {
          return new ethers.JsonRpcProvider(url);
        } catch (error) {
          console.warn(`Failed to connect to RPC: ${url}`);
        }
      }
    }
    return null;
  }, []);

  const fetchGameMintLogs = useCallback(async () => {
    setMintLogsLoading(true);
    try {
      const response = await fetch('/api/game-complete');
      if (!response.ok) {
        throw new Error('Failed to fetch game mint logs');
      }
      
      const data = await response.json();
      setGameMintLogs(data.mintLogs || []);
      setMintStats(data.mintStats || null);
      console.log('Game mint logs fetched:', data.mintLogs?.length || 0);
    } catch (error: any) {
      console.error('Error fetching game mint logs:', error);
      // Don't set error state for mint logs as it's secondary data
    } finally {
      setMintLogsLoading(false);
    }
  }, []);

  const fetchTokenData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Create providers for both chains
      const sonicProvider = new ethers.JsonRpcProvider('https://rpc.soniclabs.com');
      const baseProvider = new ethers.JsonRpcProvider('https://mainnet.base.org');
      
      const arcTokenAddress = '0xAD75eAb973D5AbB77DAdc0Ec3047008dF3aa094d';
      
      // Create contracts for both chains
      const sonicContract = new ethers.Contract(arcTokenAddress, ARC_TOKEN_FULL_ABI, sonicProvider);
      const baseContract = new ethers.Contract(arcTokenAddress, ARC_TOKEN_FULL_ABI, baseProvider);

      // Fetch supplies from both chains
      const [sonicSupplyRaw, baseSupplyRaw] = await Promise.all([
        sonicContract.totalSupply(),
        baseContract.totalSupply()
      ]);
      
      const sonicSupplyFormatted = formatEther(sonicSupplyRaw);
      const baseSupplyFormatted = formatEther(baseSupplyRaw);
      const totalSupplyFormatted = (parseFloat(sonicSupplyFormatted) + parseFloat(baseSupplyFormatted)).toString();
      
      setSonicSupply(sonicSupplyFormatted);
      setBaseSupply(baseSupplyFormatted);
      setTotalSupply(totalSupplyFormatted);
      
      console.log('Multi-chain supplies:', {
        sonic: sonicSupplyFormatted,
        base: baseSupplyFormatted,
        total: totalSupplyFormatted
      });

      // Use Sonic provider for historical events (main chain)
      const provider = sonicProvider;
      const contract = sonicContract;

      // Fetch all historical minting events using pagination to avoid timeout
      const currentBlock = await provider.getBlockNumber();
      const tokensMintedFilter = contract.filters.TokensMinted();
      const transferMintFilter = contract.filters.Transfer('0x0000000000000000000000000000000000000000');
      
      // Use pagination to fetch all events in chunks
      const chunkSize = 5000; // Smaller chunks to avoid timeout
      let allMintedEvents: any[] = [];
      let allTransferEvents: any[] = [];
      
      // Start from a more recent block to get meaningful data faster
       // Most tokens are likely minted in recent blocks
       const startBlock = Math.max(0, currentBlock - 50000); // Last ~50k blocks for better coverage
       
       console.log(`Fetching minting events from block ${startBlock} to ${currentBlock}`);
       
       // Fetch events in chunks
       for (let fromBlock = startBlock; fromBlock <= currentBlock; fromBlock += chunkSize) {
         const toBlock = Math.min(fromBlock + chunkSize - 1, currentBlock);
         
         try {
           console.log(`Fetching events for blocks ${fromBlock}-${toBlock}`);
           
           const [mintedChunk, transferChunk] = await Promise.all([
             contract.queryFilter(tokensMintedFilter, fromBlock, toBlock),
             contract.queryFilter(transferMintFilter, fromBlock, toBlock)
           ]);
           
           allMintedEvents = allMintedEvents.concat(mintedChunk);
           allTransferEvents = allTransferEvents.concat(transferChunk);
           
           console.log(`Found ${mintedChunk.length} TokensMinted and ${transferChunk.length} Transfer events`);
           
           // Add a small delay to avoid overwhelming the RPC
           await new Promise(resolve => setTimeout(resolve, 200));
         } catch (chunkError) {
           console.warn(`Failed to fetch events for blocks ${fromBlock}-${toBlock}:`, chunkError);
           // If we get too many failures, break to avoid infinite retries
           if (chunkError.message && chunkError.message.includes('timeout')) {
             console.log('RPC timeout detected, stopping chunk fetching');
             break;
           }
         }
       }
      
      const mintedEvents = allMintedEvents;
      const transferEvents = allTransferEvents;

      const allMintEvents: MintEvent[] = [];

      for (const event of mintedEvents) {
        const block = await provider.getBlock(event.blockNumber);
        if (block) {
          allMintEvents.push({
            timestamp: block.timestamp * 1000,
            minter: event.args.mintedTo,
            amount: parseFloat(formatEther(event.args.quantityMinted)),
            txHash: event.transactionHash,
          });
        }
      }

      for (const event of transferEvents) {
        const block = await provider.getBlock(event.blockNumber);
        if (block) {
          allMintEvents.push({
            timestamp: block.timestamp * 1000,
            minter: event.args.to,
            amount: parseFloat(formatEther(event.args.value)),
            txHash: event.transactionHash,
          });
        }
      }

      // Sort events by timestamp
      allMintEvents.sort((a, b) => a.timestamp - b.timestamp);
      setMintEvents(allMintEvents);

      // Prepare data for chart
      const dailyMinted: { [key: string]: number } = {};
      allMintEvents.forEach(event => {
        const date = new Date(event.timestamp).toISOString().split('T')[0];
        dailyMinted[date] = (dailyMinted[date] || 0) + event.amount;
      });

      const chartDataFormatted = Object.keys(dailyMinted).map(date => ({
        date,
        minted: dailyMinted[date],
      }));
      setChartData(chartDataFormatted);
      setLoading(false);

    } catch (error) {
      console.error("Error fetching token data:", error);
      let errorMessage = "Failed to fetch token data. ";
      
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch') || error.message.includes('ERR_ABORTED')) {
          errorMessage += "The RPC endpoint is not accessible. This could be due to CORS restrictions in development mode or the endpoint being down. In production, this should work if the RPC URL is correct.";
        } else {
          errorMessage += error.message;
        }
      } else {
        errorMessage += "Unknown error occurred.";
      }
      
      setError(errorMessage);
      setLoading(false);
    }
  }, [getProvider]);

  useEffect(() => {
    fetchTokenData();
    fetchGameMintLogs();
  }, [fetchTokenData, fetchGameMintLogs]);

  return (
    <div className="w-full h-full flex flex-col z-10 animate-fade-in overflow-y-auto">
      {/* Title and Back Button */}
      <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-20 pb-8">
        <h1 className="text-4xl sm:text-6xl font-headline text-center uppercase tracking-wider mb-6 text-white" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>Tokenomics</h1>
        
        {/* ARC Contract Address */}
        <div className="bg-black/50 backdrop-blur-sm rounded-lg p-4 mb-6 border border-orange-300/20">
          <div className="text-center">
            <p className="text-xs sm:text-sm text-gray-400 mb-2">ARC Token Contract Address (Same on Both Chains)</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
              <code className="bg-black/30 px-2 py-1 rounded text-orange-300 font-mono text-xs sm:text-sm break-all max-w-full overflow-hidden">
                {ARC_TOKEN_ADDRESS}
              </code>
              <div className="flex gap-2">
                <button
                  onClick={() => navigator.clipboard.writeText(ARC_TOKEN_ADDRESS)}
                  className="text-xs bg-orange-600 hover:bg-orange-700 px-2 py-1 rounded transition-colors"
                  title="Copy to clipboard"
                >
                  Copy
                </button>
                <a
                  href={`https://sonicscan.org/token/${ARC_TOKEN_ADDRESS}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs bg-orange-600 hover:bg-orange-700 px-2 py-1 rounded transition-colors flex items-center gap-1"
                  title="View on SonicScan"
                >
                  <img src="/sonic_icon.png" alt="Sonic" className="w-3 h-3" />
                  Sonic Explorer
                </a>
                <a
                  href={`https://basescan.org/token/${ARC_TOKEN_ADDRESS}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded transition-colors flex items-center gap-1"
                  title="View on BaseScan"
                >
                  <img src="/base_icon.png" alt="Base" className="w-3 h-3" />
                  Base Explorer
                </a>
              </div>
            </div>
          </div>
        </div>

      </div>
      
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pb-8">
        {/* Multi-Chain Supply Display */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Sonic Chain Supply */}
          <Card className="bg-black/50 backdrop-blur-sm border border-orange-300/20">
            <CardHeader>
              <CardTitle className="text-orange-300 text-center text-sm sm:text-lg flex items-center justify-center gap-2">
                <img src="/sonic_icon.png" alt="Sonic" className="w-4 h-4 sm:w-6 sm:h-6" />
                Sonic Chain Supply
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                {loading ? (
                  <div className="animate-pulse">
                    <div className="h-10 bg-orange-300/20 rounded mb-2"></div>
                  </div>
                ) : (
                  <p className="text-xl sm:text-2xl font-bold text-orange-300">
                    {parseFloat(sonicSupply).toLocaleString()} ARC
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Base Chain Supply */}
          <Card className="bg-black/50 backdrop-blur-sm border border-blue-300/20">
            <CardHeader>
              <CardTitle className="text-blue-300 text-center text-sm sm:text-lg flex items-center justify-center gap-2">
                <img src="/base_icon.png" alt="Base" className="w-4 h-4 sm:w-6 sm:h-6" />
                Base Chain Supply
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                {loading ? (
                  <div className="animate-pulse">
                    <div className="h-10 bg-blue-300/20 rounded mb-2"></div>
                  </div>
                ) : (
                  <p className="text-xl sm:text-2xl font-bold text-blue-300">
                    {parseFloat(baseSupply).toLocaleString()} ARC
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Total Supply */}
          <Card className="bg-black/50 backdrop-blur-sm border border-green-300/20">
            <CardHeader>
              <CardTitle className="text-green-300 text-center text-sm sm:text-lg">Total Supply</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                {loading ? (
                  <div className="animate-pulse">
                    <div className="h-10 bg-green-300/20 rounded mb-2"></div>
                  </div>
                ) : error ? (
                  <div className="text-red-400">
                    <p className="text-sm">{error}</p>
                  </div>
                ) : (
                  <>
                    <p className="text-xl sm:text-2xl font-bold text-green-300">
                      {parseFloat(totalSupply).toLocaleString()} ARC
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Combined across all chains</p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Per-Game ARC Mint Tracker */}
         {mintStats && (
           <Card className="bg-black/70 backdrop-blur-sm text-white border border-orange-300/20 shadow-xl mb-6">
             <CardHeader>
               <CardTitle className="text-accent">ARC Minted Per Game</CardTitle>
             </CardHeader>
             <CardContent>
               <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                 {Object.entries(mintStats.mintsByGameType).map(([gameType, stats]) => {
                   const gameIcons = {
                     chess: '♔',
                     uno: '🎴',
                     pool: '🎱',
                     snake: '🐍',
                     platformer: '🏃'
                   };
                   const gameIcon = gameIcons[gameType as keyof typeof gameIcons] || '🎮';
                   
                   return (
                     <div key={gameType} className="bg-black/30 rounded-lg p-3 text-center border border-orange-300/20">
                       <div className="text-2xl mb-2">{gameIcon}</div>
                       <div className="text-sm font-semibold text-orange-300 capitalize mb-1">{gameType}</div>
                       <div className="text-lg font-bold text-green-400">{stats.amount} ARC</div>
                       <div className="text-xs text-gray-400">{stats.count} mints</div>
                     </div>
                   );
                 })}
               </div>
               <div className="mt-4 text-center text-sm text-gray-400">
                 Total across all games: {mintStats.totalAmountMinted} ARC from {mintStats.totalMints} mints
               </div>
             </CardContent>
           </Card>
         )}
         
         <div className="grid grid-cols-1 gap-4 md:gap-6">



      {/* Game Mint Logs Card */}
      <Card className="bg-black/70 backdrop-blur-sm text-white border border-orange-300/20 shadow-xl">
        <CardHeader>
          <CardTitle className="text-accent">Game Mint History</CardTitle>
        </CardHeader>
        <CardContent className="min-h-[200px] md:min-h-[250px]">
          {mintLogsLoading ? (
            <div className="flex items-center justify-center h-[200px] md:h-[250px]">
              <p className="text-gray-400">Loading mint logs...</p>
            </div>
          ) : gameMintLogs.length > 0 ? (
            <ScrollArea className="h-[200px] md:h-[250px]">
              <div className="space-y-2">
                {gameMintLogs.slice(0, 20).map((mint) => {
                  // Determine chain from mint data (you may need to add chain field to mint logs)
                  const chain = mint.chain || 'sonic'; // Default to sonic for existing mints
                  const chainIcon = chain === 'base' ? '/base_icon.png' : '/sonic_icon.png';
                  const explorerUrl = chain === 'base' 
                    ? `https://basescan.org/tx/${mint.txHash}`
                    : `https://sonicscan.org/tx/${mint.txHash}`;
                  
                  return (
                    <div key={mint.id} className="bg-black/30 rounded-lg p-3 border border-gray-600">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-green-400">
                              +{mint.amountFormatted} ARC
                            </span>
                            <span className="text-xs bg-blue-600 px-2 py-1 rounded uppercase">
                              {mint.gameType}
                            </span>
                            <img 
                              src={chainIcon} 
                              alt={`${chain} chain`} 
                              className="w-4 h-4" 
                              title={`Minted on ${chain === 'base' ? 'Base' : 'Sonic'} chain`}
                            />
                          </div>
                          <div className="text-xs text-gray-400">
                            Player: {mint.playerAddress.slice(0, 6)}...{mint.playerAddress.slice(-4)}
                          </div>
                          <div className="text-xs text-gray-400">
                            {new Date(mint.timestamp).toLocaleDateString()} {new Date(mint.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <a 
                            href={explorerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-400 hover:text-blue-300 underline"
                          >
                            View TX
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {gameMintLogs.length > 20 && (
                  <div className="text-center text-sm text-gray-400 mt-4">
                    Showing latest 20 of {gameMintLogs.length} total mints
                  </div>
                )}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex items-center justify-center h-[200px] md:h-[250px]">
              <p className="text-gray-400">No game mint logs available</p>
            </div>
          )}
          
          {/* Mint Statistics */}
          {mintStats && (
            <div className="mt-4 pt-4 border-t border-gray-600">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Total Mints:</span>
                  <span className="ml-2 text-white font-semibold">{mintStats.totalMints}</span>
                </div>
                <div>
                  <span className="text-gray-400">Total Amount:</span>
                  <span className="ml-2 text-green-400 font-semibold">{mintStats.totalAmountMinted} ARC</span>
                </div>
              </div>
              
              {/* Game Type Breakdown */}
              <div className="mt-3">
                <div className="text-xs text-gray-400 mb-2">By Game Type:</div>
                <div className="space-y-1">
                  {Object.entries(mintStats.mintsByGameType).map(([gameType, stats]) => (
                    <div key={gameType} className="flex justify-between text-xs">
                      <span className="text-gray-300 capitalize">{gameType}:</span>
                      <span className="text-green-400">{stats.count} mints ({stats.amount} ARC)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

        </div>
      </div>
    </div>
  );
};

export default TokenomicsChart;