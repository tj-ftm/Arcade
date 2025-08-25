"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { ethers, formatEther } from 'ethers';
import { ARC_TOKEN_ADDRESS } from '@/types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

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

const TokenomicsChart: React.FC = () => {
  const [totalSupply, setTotalSupply] = useState<string | null>(null);
  const [mintEvents, setMintEvents] = useState<MintEvent[]>([]);
  const [chartData, setChartData] = useState<{ date: string; minted: number }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const getProvider = useCallback(() => {
    if (typeof window !== "undefined" && window.ethereum) {
      return new ethers.BrowserProvider(window.ethereum);
    } else if (typeof process.env.NEXT_PUBLIC_RPC_URL === 'string' && process.env.NEXT_PUBLIC_RPC_URL.length > 0) {
      // Fallback for environments without window.ethereum (e.g., server-side or if wallet not connected)
      return new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
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

      // Fetch past minting events (TokensMinted and Transfer events from address 0x0)
      const tokensMintedFilter = contract.filters.TokensMinted();
      const transferMintFilter = contract.filters.Transfer('0x0000000000000000000000000000000000000000');

      const [mintedEvents, transferEvents] = await Promise.all([
        contract.queryFilter(tokensMintedFilter, 0),
        contract.queryFilter(transferMintFilter, 0)
      ]);

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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="bg-black/30 text-white border-none">
        <CardHeader>
          <CardTitle className="text-accent">Current Total Supply</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-2xl font-bold">Loading...</p>
          ) : error ? (
            <p className="text-red-400">Error loading data</p>
          ) : (
            <p className="text-2xl font-bold">{totalSupply ? `${totalSupply} ARC` : 'No data'}</p>
          )}
        </CardContent>
      </Card>

      <Card className="bg-black/30 text-white border-none">
        <CardHeader>
          <CardTitle className="text-accent">Minted Tokens Over Time</CardTitle>
        </CardHeader>
        <CardContent>
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
            <ResponsiveContainer width="100%" height={300}>
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

      <Card className="lg:col-span-2 bg-black/30 text-white border-none">
        <CardHeader>
          <CardTitle className="text-accent">Minting Log</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px] w-full rounded-md border border-gray-700 p-4">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-400">Loading minting events...</p>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <p className="text-red-400 mb-2">Failed to load minting events</p>
                  <p className="text-sm text-gray-400">{error}</p>
                </div>
              </div>
            ) : mintEvents.length > 0 ? (
              <ul className="space-y-2">
                {mintEvents.map((event, index) => (
                  <li key={index} className="text-sm">
                    <span className="font-semibold">{new Date(event.timestamp).toLocaleString()}:</span>
                    {' '}{event.amount.toFixed(4)} ARC minted to <span className="font-mono text-blue-400">{event.minter}</span>
                    {' '}(Tx:{' '}<a href={`https://sonicscan.org/tx/${event.txHash}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                      {event.txHash.substring(0, 6)}...{event.txHash.substring(event.txHash.length - 4)}
                    </a>)
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-400">No minting events found.</p>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default TokenomicsChart;