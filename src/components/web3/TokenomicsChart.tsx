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

const TokenomicsChart: React.FC<TokenomicsChartProps> = ({ onBack }) => {
  const [totalSupply, setTotalSupply] = useState<string | null>(null);
  const [mintEvents, setMintEvents] = useState<MintEvent[]>([]);
  const [chartData, setChartData] = useState<{ date: string; minted: number }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const getProvider = useCallback(() => {
    if (typeof window !== "undefined" && window.ethereum) {
      return new ethers.BrowserProvider(window.ethereum);
    } else {
      // Hardcode RPC URL as it's not a private link
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

  const fetchTokenData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    const provider = getProvider();
    if (!provider) {
      const errorMsg = "No Ethereum provider available. Please ensure NEXT_PUBLIC_RPC_URL is set in your .env.local file or connect a wallet.";
      console.error(errorMsg);
      setError(errorMsg);
      setLoading(false);
      return;
    }

    try {
      const contract = new ethers.Contract(ARC_TOKEN_ADDRESS, ARC_TOKEN_FULL_ABI, provider);

      // Fetch total supply
      const supply = await contract.totalSupply();
      setTotalSupply(formatEther(supply));

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
  }, [fetchTokenData]);

  return (
    <div className="w-full h-full flex flex-col z-10 animate-fade-in overflow-y-auto">
      {/* Title and Back Button */}
      <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-20 pb-8">
        <h1 className="text-4xl sm:text-6xl font-headline text-center uppercase tracking-wider mb-6 text-white" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>Tokenomics</h1>

      </div>
      
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="bg-black/70 backdrop-blur-sm text-white border border-orange-300/20 shadow-xl">
        <CardHeader>
          <CardTitle className="text-accent">Current Total Supply</CardTitle>
        </CardHeader>
        <CardContent className="min-h-[300px]">
          {loading ? (
            <p className="text-2xl font-bold">Loading...</p>
          ) : error ? (
            <p className="text-red-400">Error loading data</p>
          ) : (
            <p className="text-2xl font-bold">{totalSupply ? `${totalSupply} ARC` : 'No data'}</p>
          )}
        </CardContent>
      </Card>

      <Card className="bg-black/70 backdrop-blur-sm text-white border border-orange-300/20 shadow-xl">
        <CardHeader>
          <CardTitle className="text-accent">Minted Tokens Over Time</CardTitle>
        </CardHeader>
        <CardContent className="min-h-[300px]">
          {loading ? (
            <div className="flex items-center justify-center h-[300px]">
              <p className="text-gray-400">Loading chart data...</p>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-[300px]">
              <div className="text-center">
                <p className="text-red-400 mb-2">Chart data unavailable</p>
                <p className="text-sm text-gray-400">Check console for details</p>
              </div>
            </div>
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="date" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#333', border: 'none' }} 
                  labelStyle={{ color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                  formatter={(value: number) => [`${value.toFixed(4)} ARC`, 'Minted']}
                />
                <Legend />
                <Line type="monotone" dataKey="minted" stroke="#8884d8" activeDot={{ r: 8 }} name="Minted ARC" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px]">
              <p className="text-gray-400">No minting data available</p>
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