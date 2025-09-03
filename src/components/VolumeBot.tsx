"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useWeb3 } from '@/components/web3/Web3Provider';
import { 
  TrendingUp, 
  Play, 
  Pause, 
  Square, 
  Settings, 
  BarChart3, 
  Wallet, 
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Activity,
  Target,
  Zap,
  RefreshCw,
  ExternalLink,
  Users
} from 'lucide-react';
import { ethers } from 'ethers';

interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
}

interface BotWallet {
  address: string;
  privateKey: string;
  balance: string;
  tokenBalance: string;
}

interface BotConfig {
  tokenAddress: string;
  pairAddress: string;
  usePairAddress: boolean;
  amountPerTx: string;
  totalBudget: string;
  txCount: number;
  intervalMin: number;
  intervalMax: number;
  buyRatio: number;
  sellRatio: number;
  selectedExchanges: string[];
  enableRandomization: boolean;
  enableScheduling: boolean;
  scheduleDuration: number;
  enableStopLoss: boolean;
  stopLossPercent: number;
  enableTakeProfit: boolean;
  takeProfitPercent: number;
  multiWalletCount: number;
  enableMultiWallet: boolean;
  slippageTolerance: number; // Percentage (0.1 = 0.1%)
}

interface BotStats {
  totalVolume: number;
  completedTxs: number;
  successRate: number;
  avgGasUsed: number;
  currentPrice: number;
  priceChange24h: number;
}

interface Transaction {
  id: string;
  type: 'buy' | 'sell';
  amount: string;
  price: string;
  exchange: string;
  status: 'pending' | 'success' | 'failed';
  txHash?: string;
  timestamp: number;
  gasUsed?: string;
}

const EXCHANGES = [
  { 
    id: 'shadow', 
    name: 'Shadow Exchange', 
    url: 'https://shadow.so',
    contracts: {
      v2Router: '0x1D368773735ee1E678950B7A97bcA2CafB330CDc',
      v2Factory: '0x2dA25E7446A70D7be65fd4c053948BEcAA6374c8',
      v3Router: '0x5543c6176feb9b4b179078205d7c29eea2e2d695',
      v3Factory: '0xcD2d0637c94fe77C2896BbCBB174cefFb08DE6d7',
      quoterV2: '0x219b7ADebc0935a3eC889a148c6924D51A07535A'
    }
  },
  { 
    id: 'equalizer', 
    name: 'Equalizer Exchange', 
    url: 'https://equalizer.exchange',
    contracts: {
      v2Router: '0x7635cD591CFE965bE8beC60Da6eA69b6dcD27e4b',
      v3Router: '0xcC6169aA1E879d3a4227536671F85afdb2d23fAD',
      factory: '0xDDD9845Ba0D8f38d3045f804f67A1a8B9A528FcC'
    }
  },
  { 
    id: 'metropolis', 
    name: 'Metropolis Exchange', 
    url: 'https://metropolis.exchange',
    contracts: {
      v2Router: '0x95a7e403d7cF20F675fF9273D66e94d35ba49fA3',
      v2Factory: '0x1570300e9cFEC66c9Fb0C8bc14366C86EB170Ad0',
      lbRouter: '0x67803fe6d76409640efDC9b7ABcD2c6c2E7cBa48',
      lbFactory: '0x39D966c1BaFe7D3F1F53dA4845805E15f7D6EE43',
      lbQuoter: '0x56eaa884F29620fD6914827AaAE9Ee6a5C383149'
    }
  },
  { 
    id: 'fly', 
    name: 'Fly.Trade', 
    url: 'https://fly.trade',
    contracts: {
      router: '0xc325856e5585823aac0d1fd46c35c608d95e65a9'
    }
  }
];

const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

const UNISWAP_V2_ROUTER_ABI = [
  'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
  'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
  'function WETH() external pure returns (address)'
];

const UNISWAP_V2_FACTORY_ABI = [
  'function getPair(address tokenA, address tokenB) external view returns (address pair)',
  'function createPair(address tokenA, address tokenB) external returns (address pair)'
];

const UNISWAP_V3_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const UNISWAP_V3_FACTORY_ABI = [
  'function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)'
];

const PAIR_ABI = [
  'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function token0() external view returns (address)',
  'function token1() external view returns (address)'
];





// Sonic Network WETH address
const WETH_ADDRESS = '0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38';

// Common fee tiers for V3
const V3_FEE_TIERS = [500, 3000, 10000]; // 0.05%, 0.3%, 1%

export const VolumeBot: React.FC = () => {
  const { account, sBalance, currentChain, getProvider } = useWeb3();
  const { toast } = useToast();
  
  const [botConfig, setBotConfig] = useState<BotConfig>({
    tokenAddress: '',
    pairAddress: '',
    usePairAddress: false,
    amountPerTx: '0.1',
    totalBudget: '10',
    txCount: 100,
    intervalMin: 1,
    intervalMax: 2,
    buyRatio: 60,
    sellRatio: 40,
    selectedExchanges: ['shadow'],
    enableRandomization: true,
    enableScheduling: false,
    scheduleDuration: 24,
    enableStopLoss: false,
    stopLossPercent: 5,
    enableTakeProfit: false,
    takeProfitPercent: 10,
    multiWalletCount: 3,
    enableMultiWallet: false,
    slippageTolerance: 0.5 // Default 0.5% slippage
  });
  
  const [botWallet, setBotWallet] = useState<BotWallet | null>(null);
  const [multiWallets, setMultiWallets] = useState<BotWallet[]>([]);
  const [isCreatingWallets, setIsCreatingWallets] = useState(false);
  const [showWalletManager, setShowWalletManager] = useState(false);
  
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [isLoadingToken, setIsLoadingToken] = useState(false);
  const [botStatus, setBotStatus] = useState<'idle' | 'running' | 'paused' | 'stopped'>('idle');
  const [botStats, setBotStats] = useState<BotStats>({
    totalVolume: 0,
    completedTxs: 0,
    successRate: 0,
    avgGasUsed: 0,
    currentPrice: 0,
    priceChange24h: 0
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [progress, setProgress] = useState(0);
  const [estimatedCompletion, setEstimatedCompletion] = useState<Date | null>(null);
  const [pairDetection, setPairDetection] = useState<{[key: string]: any}>({});
  const [isDetectingPairs, setIsDetectingPairs] = useState(false);

  // Load bot wallet from localStorage on mount
  useEffect(() => {
    const savedBotWallet = localStorage.getItem('sonicVolumeBotWallet');
    if (savedBotWallet) {
      try {
        const wallet = JSON.parse(savedBotWallet);
        setBotWallet(wallet);
        updateBotWalletBalance(wallet);
      } catch (error) {
        console.error('Error loading bot wallet:', error);
      }
    }
  }, []);

  // Generate or load bot wallet
  const generateBotWallet = useCallback(() => {
    try {
      const wallet = ethers.Wallet.createRandom();
      const botWalletData: BotWallet = {
        address: wallet.address,
        privateKey: wallet.privateKey,
        balance: '0',
        tokenBalance: '0'
      };
      
      setBotWallet(botWalletData);
      localStorage.setItem('sonicVolumeBotWallet', JSON.stringify(botWalletData));
      
      toast({
        title: "Bot Wallet Created",
        description: `New bot wallet created: ${wallet.address.slice(0, 10)}...`
      });
      
      return botWalletData;
    } catch (error) {
      console.error('Error generating bot wallet:', error);
      toast({
        title: "Error",
        description: "Failed to generate bot wallet",
        variant: "destructive"
      });
      return null;
    }
  }, [toast]);

  // Generate multiple wallets from bot wallet seed
  const generateMultiWallets = useCallback(async () => {
    if (!botWallet) {
      toast({
        title: "No Bot Wallet",
        description: "Please create a bot wallet first",
        variant: "destructive"
      });
      return;
    }

    setIsCreatingWallets(true);
    try {
      const masterWallet = new ethers.Wallet(botWallet.privateKey);
      const wallets: BotWallet[] = [];
      
      for (let i = 0; i < botConfig.multiWalletCount; i++) {
        // Derive wallets using a simple derivation method
        const derivedKey = ethers.keccak256(ethers.toUtf8Bytes(botWallet.privateKey + i.toString()));
        const derivedWallet = new ethers.Wallet(derivedKey);
        
        wallets.push({
          address: derivedWallet.address,
          privateKey: derivedWallet.privateKey,
          balance: '0',
          tokenBalance: '0'
        });
      }
      
      setMultiWallets(wallets);
      
      toast({
        title: "Multi-Wallets Created",
        description: `Generated ${wallets.length} trading wallets`
      });
    } catch (error) {
      console.error('Error generating multi wallets:', error);
      toast({
        title: "Error",
        description: "Failed to generate multi wallets",
        variant: "destructive"
      });
    } finally {
      setIsCreatingWallets(false);
    }
  }, [botWallet, botConfig.multiWalletCount, toast]);

  // Update bot wallet balance
  const updateBotWalletBalance = useCallback(async (wallet: BotWallet) => {
    try {
      const provider = getProvider();
      if (!provider) return;
      
      const balance = await provider.getBalance(wallet.address);
      const formattedBalance = parseFloat(ethers.formatEther(balance)).toFixed(4);
      
      let tokenBalance = '0';
      if (tokenInfo) {
        try {
          const tokenContract = new ethers.Contract(tokenInfo.address, ERC20_ABI, provider);
          const tokenBal = await tokenContract.balanceOf(wallet.address);
          tokenBalance = parseFloat(ethers.formatUnits(tokenBal, tokenInfo.decimals)).toFixed(4);
        } catch (error) {
          console.error('Error fetching token balance:', error);
          tokenBalance = '0.0000';
        }
      }
      
      const updatedWallet = {
        ...wallet,
        balance: formattedBalance,
        tokenBalance
      };
      
      setBotWallet(updatedWallet);
      localStorage.setItem('sonicVolumeBotWallet', JSON.stringify(updatedWallet));
    } catch (error) {
      console.error('Error updating bot wallet balance:', error);
    }
  }, [getProvider, tokenInfo]);

  // Transfer funds to bot wallet
  const transferToBotWallet = useCallback(async (amount: string) => {
    if (!botWallet || !account) {
      toast({
        title: "Error",
        description: "Bot wallet or main wallet not available",
        variant: "destructive"
      });
      return;
    }

    try {
      const provider = getProvider();
      const signer = await provider?.getSigner();
      if (!provider || !signer) {
        throw new Error('Provider or signer not available');
      }

      const amountWei = ethers.parseEther(amount);
      const tx = await signer.sendTransaction({
        to: botWallet.address,
        value: amountWei
      });
      
      await tx.wait();
      
      toast({
        title: "Transfer Successful",
        description: `Transferred ${amount} S to bot wallet`
      });
      
      // Update bot wallet balance
      updateBotWalletBalance(botWallet);
    } catch (error: any) {
      console.error('Error transferring to bot wallet:', error);
      toast({
        title: "Transfer Failed",
        description: error.message || 'Failed to transfer funds',
        variant: "destructive"
      });
    }
  }, [botWallet, account, getProvider, toast, updateBotWalletBalance]);

  // Cash out from bot wallet
  const cashOutFromBotWallet = useCallback(async (amount: string, isToken: boolean = false) => {
    if (!botWallet || !account) {
      toast({
        title: "Error",
        description: "Bot wallet or main wallet not available",
        variant: "destructive"
      });
      return;
    }

    try {
      const provider = getProvider();
      if (!provider) throw new Error('Provider not available');
      
      const botSigner = new ethers.Wallet(botWallet.privateKey, provider);
      
      if (isToken && tokenInfo) {
        // Transfer tokens
        const tokenContract = new ethers.Contract(tokenInfo.address, ERC20_ABI, botSigner);
        const amountWei = ethers.parseUnits(amount, tokenInfo.decimals);
        const tx = await tokenContract.transfer(account, amountWei);
        await tx.wait();
        
        toast({
          title: "Cashout Successful",
          description: `Transferred ${amount} ${tokenInfo.symbol} to main wallet`
        });
      } else {
        // Transfer S tokens
        const amountWei = ethers.parseEther(amount);
        const tx = await botSigner.sendTransaction({
          to: account,
          value: amountWei
        });
        await tx.wait();
        
        toast({
          title: "Cashout Successful",
          description: `Transferred ${amount} S to main wallet`
        });
      }
      
      // Update bot wallet balance
      updateBotWalletBalance(botWallet);
    } catch (error: any) {
      console.error('Error cashing out from bot wallet:', error);
      toast({
        title: "Cashout Failed",
        description: error.message || 'Failed to cash out funds',
        variant: "destructive"
      });
    }
  }, [botWallet, account, getProvider, tokenInfo, toast, updateBotWalletBalance]);

  // Fetch token information
  const fetchTokenInfo = useCallback(async (address: string) => {
    if (!address || !ethers.isAddress(address)) {
      setTokenInfo(null);
      return;
    }

    setIsLoadingToken(true);
    try {
      const provider = getProvider();
      if (!provider) {
        throw new Error('No provider available');
      }

      const contract = new ethers.Contract(address, ERC20_ABI, provider);
      const [name, symbol, decimals, totalSupply] = await Promise.all([
        contract.name(),
        contract.symbol(),
        contract.decimals(),
        contract.totalSupply()
      ]);

      setTokenInfo({
        address,
        name,
        symbol,
        decimals: Number(decimals),
        totalSupply: ethers.formatUnits(totalSupply, decimals)
      });

      toast({
        title: "Token Loaded",
        description: `Successfully loaded ${symbol} (${name})`
      });

      // Detect available pairs for all exchanges
      detectPairsForAllExchanges(address);
    } catch (error) {
      console.error('Error fetching token info:', error);
      toast({
        title: "Error",
        description: "Failed to load token information. Please check the contract address.",
        variant: "destructive"
      });
      setTokenInfo(null);
    } finally {
      setIsLoadingToken(false);
    }
  }, [getProvider, toast]);

  // Detect pairs for all exchanges
  const detectPairsForAllExchanges = async (tokenAddress: string) => {
    setIsDetectingPairs(true);
    const results: {[key: string]: any} = {};
    
    for (const exchange of EXCHANGES) {
      try {
        const pairInfo = await detectPairType(tokenAddress, exchange.id);
        results[exchange.id] = {
          ...pairInfo,
          name: exchange.name,
          hasLiquidity: pairInfo.v2 !== null || pairInfo.v3.length > 0 || pairInfo.dlmm !== null
        };
      } catch (error) {
        console.error(`Error detecting pairs for ${exchange.name}:`, error);
        results[exchange.id] = {
          v2: null,
          v3: [],
          dlmm: null,
          name: exchange.name,
          hasLiquidity: false,
          error: true
        };
      }
    }
    
    setPairDetection(results);
    setIsDetectingPairs(false);
  };

  // Detect token from pair address
  const detectTokenFromPair = useCallback(async (pairAddress: string) => {
    try {
      const provider = getProvider();
      if (!provider) throw new Error('No provider available');
      
      const pairContract = new ethers.Contract(pairAddress, PAIR_ABI, provider);
      const [token0, token1] = await Promise.all([
        pairContract.token0(),
        pairContract.token1()
      ]);
      
      // Determine which token is not WETH
      const targetToken = token0.toLowerCase() === WETH_ADDRESS.toLowerCase() ? token1 : token0;
      
      // Find which exchange this pair belongs to
      let detectedExchange = '';
      for (const exchange of EXCHANGES) {
        if (exchange.contracts.v2Factory) {
          try {
            const factory = new ethers.Contract(exchange.contracts.v2Factory, UNISWAP_V2_FACTORY_ABI, provider);
            const expectedPair = await factory.getPair(token0, token1);
            if (expectedPair.toLowerCase() === pairAddress.toLowerCase()) {
              detectedExchange = exchange.id;
              break;
            }
          } catch (error) {
            // Continue checking other exchanges
          }
        }
      }
      
      return { tokenAddress: targetToken, exchange: detectedExchange };
    } catch (error) {
      console.error('Error detecting token from pair:', error);
      throw error;
    }
  }, [getProvider]);

  // Update token/pair address
  const handleAddressChange = async (address: string, isPair: boolean = false) => {
    if (isPair) {
      setBotConfig(prev => ({ ...prev, pairAddress: address, usePairAddress: true }));
      if (address && ethers.isAddress(address)) {
        try {
          const { tokenAddress, exchange } = await detectTokenFromPair(address);
          setBotConfig(prev => ({ 
            ...prev, 
            tokenAddress,
            selectedExchanges: exchange ? [exchange] : prev.selectedExchanges
          }));
          fetchTokenInfo(tokenAddress);
        } catch (error) {
          toast({
            title: "Invalid Pair",
            description: "Could not detect token from pair address",
            variant: "destructive"
          });
          setTokenInfo(null);
          setPairDetection({});
        }
      } else {
        setTokenInfo(null);
        setPairDetection({});
      }
    } else {
      setBotConfig(prev => ({ ...prev, tokenAddress: address, usePairAddress: false }));
      if (address && ethers.isAddress(address)) {
        fetchTokenInfo(address);
      } else {
        setTokenInfo(null);
        setPairDetection({});
      }
    }
  };

  // Start bot
  const startBot = useCallback(async () => {
    if (!account) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet to start the volume bot.",
        variant: "destructive"
      });
      return;
    }

    if (!botWallet) {
      toast({
        title: "Bot Wallet Required",
        description: "Please create a bot wallet first.",
        variant: "destructive"
      });
      return;
    }

    if (parseFloat(botWallet.balance) < parseFloat(botConfig.totalBudget)) {
      toast({
        title: "Insufficient Bot Wallet Balance",
        description: `Bot wallet needs at least ${botConfig.totalBudget} S. Current balance: ${botWallet.balance} S`,
        variant: "destructive"
      });
      return;
    }

    if (!tokenInfo) {
      toast({
        title: "Token Required",
        description: "Please enter a valid token contract address.",
        variant: "destructive"
      });
      return;
    }

    if (currentChain !== 'sonic') {
      toast({
        title: "Wrong Network",
        description: "Please switch to Sonic Network to use the volume bot.",
        variant: "destructive"
      });
      return;
    }

    // Check if any selected exchanges have liquidity
    const hasLiquidity = botConfig.selectedExchanges.some(exchangeId => 
      pairDetection[exchangeId]?.hasLiquidity
    );
    
    if (!hasLiquidity) {
      toast({
        title: "No Liquidity Found",
        description: "No liquidity pools found for this token on selected exchanges. Please choose a different token or exchanges.",
        variant: "destructive"
      });
      return;
    }

    setBotStatus('running');
    setProgress(0);
    
    // Calculate estimated completion time
    const avgInterval = (botConfig.intervalMin + botConfig.intervalMax) / 2;
    const totalTime = botConfig.txCount * avgInterval * 1000;
    setEstimatedCompletion(new Date(Date.now() + totalTime));

    toast({
      title: "Bot Started",
      description: `Volume bot started with ${botConfig.txCount} transactions planned using ${botConfig.enableMultiWallet ? multiWallets.length : 1} wallet(s).`
    });

    // Execute real transactions
    executeBotTransactions();
  }, [account, botWallet, tokenInfo, currentChain, botConfig, pairDetection, multiWallets.length, toast]);

  // Detect pair type and available liquidity
  const detectPairType = async (tokenAddress: string, exchangeId: string) => {
    try {
      const provider = getProvider();
      if (!provider) throw new Error('No provider available');

      const exchange = EXCHANGES.find(ex => ex.id === exchangeId);
      if (!exchange) throw new Error('Exchange not found');

      const results = {
        v2: null as string | null,
        v3: [] as { pool: string; fee: number }[],
        dlmm: null as string | null
      };

      // If using pair address, check if it belongs to this exchange
      if (botConfig.usePairAddress && botConfig.pairAddress) {
        try {
          const pairContract = new ethers.Contract(botConfig.pairAddress, PAIR_ABI, provider);
          const [token0, token1] = await Promise.all([
            pairContract.token0(),
            pairContract.token1()
          ]);
          
          // Verify this pair contains our token
          if (token0.toLowerCase() === tokenAddress.toLowerCase() || 
              token1.toLowerCase() === tokenAddress.toLowerCase()) {
            results.v2 = botConfig.pairAddress;
            return results;
          }
        } catch (error) {
          console.log('Pair address verification failed:', error);
        }
      }

      // Check V2 pairs
      if (exchange.contracts.v2Factory && ethers.isAddress(exchange.contracts.v2Factory)) {
        try {
          const v2Factory = new ethers.Contract(exchange.contracts.v2Factory, UNISWAP_V2_FACTORY_ABI, provider);
          
          // Try both token orders
          const [pair1, pair2] = await Promise.allSettled([
            v2Factory.getPair(tokenAddress, WETH_ADDRESS),
            v2Factory.getPair(WETH_ADDRESS, tokenAddress)
          ]);

          let v2Pair = ethers.ZeroAddress;
          if (pair1.status === 'fulfilled' && pair1.value !== ethers.ZeroAddress) {
            v2Pair = pair1.value;
          } else if (pair2.status === 'fulfilled' && pair2.value !== ethers.ZeroAddress) {
            v2Pair = pair2.value;
          }
          
          if (v2Pair !== ethers.ZeroAddress && ethers.isAddress(v2Pair)) {
            // Verify pair has liquidity
            try {
              const pairContract = new ethers.Contract(v2Pair, PAIR_ABI, provider);
              const reserves = await pairContract.getReserves();
              if (reserves[0] > 0 && reserves[1] > 0) {
                results.v2 = v2Pair;
                console.log(`✅ V2 pair found for ${exchangeId}:`, v2Pair);
              }
            } catch (error) {
              console.log('Pair liquidity check failed:', error);
            }
          }
        } catch (error) {
          console.log('V2 pair check failed for', exchangeId, ':', error);
        }
      } else {
        console.log(`No valid V2 factory for ${exchangeId}`);
      }

      // Check V3 pools
      if (exchange.contracts.v3Factory && ethers.isAddress(exchange.contracts.v3Factory)) {
        try {
          const v3Factory = new ethers.Contract(exchange.contracts.v3Factory, UNISWAP_V3_FACTORY_ABI, provider);
          
          const poolPromises = V3_FEE_TIERS.flatMap(fee => [
            v3Factory.getPool(tokenAddress, WETH_ADDRESS, fee),
            v3Factory.getPool(WETH_ADDRESS, tokenAddress, fee)
          ]);

          const settledPools = await Promise.allSettled(poolPromises);

          settledPools.forEach((result, index) => {
            if (result.status === 'fulfilled' && result.value !== ethers.ZeroAddress && ethers.isAddress(result.value)) {
              const feeIndex = Math.floor(index / 2);
              const fee = V3_FEE_TIERS[feeIndex];
              results.v3.push({ pool: result.value, fee });
              console.log(`✅ V3 pool found for ${exchangeId} with fee ${fee}:`, result.value);
            }
          });
        } catch (error) {
          console.log('V3 pool check failed for', exchangeId, ':', error);
        }
      } else {
        console.log(`No valid V3 factory for ${exchangeId}`);
      }

      // Special handling for Fly.Trade (aggregator)
      if (exchangeId === 'fly') {
        // Fly.Trade is an aggregator, check if it has a valid router
        if (exchange.contracts.router && ethers.isAddress(exchange.contracts.router)) {
          // For aggregators, we assume they can route if they have liquidity on underlying DEXs
          let hasUnderlyingLiquidity = false;
          
          for (const otherExchange of EXCHANGES) {
            if (otherExchange.id !== 'fly') {
              try {
                const otherResults = await detectPairType(tokenAddress, otherExchange.id);
                if (otherResults.v2 || otherResults.v3.length > 0) {
                  hasUnderlyingLiquidity = true;
                  break;
                }
              } catch (error) {
                console.log(`Error checking ${otherExchange.id} for Fly.Trade:`, error);
              }
            }
          }
          
          if (hasUnderlyingLiquidity) {
            results.v2 = 'aggregator'; // Mark as available through aggregation
            console.log(`✅ Fly.Trade can route through underlying DEX liquidity`);
          }
        } else {
          console.log('Fly.Trade router address invalid');
        }
      }

      // Check DLMM (for Metropolis)
      if (exchange.contracts.lbFactory && exchangeId === 'metropolis') {
        try {
          // For now, mark as available if V2 exists (DLMM detection requires specific ABI)
          if (results.v2) {
            results.dlmm = 'available';
          }
        } catch (error) {
          console.log('DLMM check failed:', error);
        }
      }

      return results;
    } catch (error) {
      console.error('Error detecting pair type for', exchangeId, ':', error);
      return { v2: null, v3: [], dlmm: null };
    }
  };

  // Execute real transaction using bot wallet
  const executeTransaction = async (isBuy: boolean, exchangeId: string, walletToUse?: BotWallet) => {
    try {
      const provider = getProvider();
      if (!provider || !tokenInfo || !botWallet) {
        throw new Error('Provider, token info, or bot wallet not available');
      }

      // Use specified wallet or main bot wallet
      const activeWallet = walletToUse || botWallet;
      
      // Validate wallet has sufficient balance
      const walletBalance = await provider.getBalance(activeWallet.address);
      const requiredAmount = ethers.parseEther(botConfig.amountPerTx);
      
      if (walletBalance < requiredAmount) {
        throw new Error(`Insufficient balance in wallet ${activeWallet.address.slice(0, 10)}...`);
      }
      
      const signer = new ethers.Wallet(activeWallet.privateKey, provider);

      const exchange = EXCHANGES.find(ex => ex.id === exchangeId);
      if (!exchange || !exchange.contracts) {
        throw new Error(`Exchange ${exchangeId} not found or missing contracts`);
      }

      const amountIn = ethers.parseEther(botConfig.amountPerTx);
      const deadline = Math.floor(Date.now() / 1000) + 1200; // 20 minutes

      // Detect available pairs/pools
      const pairInfo = await detectPairType(tokenInfo.address, exchangeId);
      
      if (!pairInfo.v2 && pairInfo.v3.length === 0) {
        throw new Error(`No liquidity found for ${tokenInfo.symbol} on ${exchange.name}`);
      }
      
      let txHash: string;
      let gasUsed = '0';

      if (isBuy) {
        // Buy tokens with ETH/S
        if (pairInfo.v3.length > 0 && exchange.contracts.v3Router) {
          // Use V3 if available (better for larger trades)
          if (!ethers.isAddress(exchange.contracts.v3Router)) {
            throw new Error(`Invalid V3 router address for ${exchange.name}`);
          }
          
          const v3Router = new ethers.Contract(exchange.contracts.v3Router, UNISWAP_V3_ROUTER_ABI, signer);
          // Apply a small dynamic slippage (e.g., 0.5%)
          const slippageFactor = 995n; // 99.5% for 0.5% slippage
          const amountOutMinimum = (amountIn * slippageFactor) / 1000n;
          
          const params = {
            tokenIn: WETH_ADDRESS,
            tokenOut: tokenInfo.address,
            fee: pairInfo.v3[0].fee,
            recipient: activeWallet.address,
            deadline,
            amountIn,
            amountOutMinimum,
            sqrtPriceLimitX96: 0
          };
          // Optimize gas for faster transactions
          const gasPrice = await provider.getFeeData();
          const optimizedGasPrice = gasPrice.gasPrice ? gasPrice.gasPrice * 120n / 100n : undefined; // 20% higher for speed
          
          const estimatedGas = await v3Router.estimateGas.exactInputSingle(params, { value: amountIn });
          const gasLimit = (estimatedGas * 120n) / 100n; // Add 20% buffer
          const tx = await v3Router.exactInputSingle(params, {
            value: amountIn,
            gasPrice: optimizedGasPrice,
            gasLimit: gasLimit
          });
          const receipt = await tx.wait();
          txHash = receipt.hash;
          gasUsed = ethers.formatEther(receipt.gasUsed * receipt.gasPrice);
        } else if (pairInfo.v2 && exchange.contracts.v2Router) {
          // Fallback to V2
          if (!ethers.isAddress(exchange.contracts.v2Router)) {
            throw new Error(`Invalid V2 router address for ${exchange.name}`);
          }
          
          const v2Router = new ethers.Contract(exchange.contracts.v2Router, UNISWAP_V2_ROUTER_ABI, signer);
          
          // Calculate minimum output with slippage protection
          const path = [WETH_ADDRESS, tokenInfo.address];
          const amountsOut = await v2Router.getAmountsOut(amountIn, path);
          const estimatedOutput = amountsOut[amountsOut.length - 1];
          // Apply a small dynamic slippage (e.g., 0.5%)
          const slippageFactor = 995n; // 99.5% for 0.5% slippage
          const amountOutMin = (estimatedOutput * slippageFactor) / 1000n;
          
          // Optimize gas for faster transactions
          const gasPrice = await provider.getFeeData();
          const optimizedGasPrice = gasPrice.gasPrice ? gasPrice.gasPrice * 120n / 100n : undefined;
          
          const estimatedGas = await v2Router.estimateGas.swapExactETHForTokens(
            amountOutMin,
            path,
            activeWallet.address,
            deadline,
            { value: amountIn }
          );
          const gasLimit = (estimatedGas * 120n) / 100n; // Add 20% buffer
          const tx = await v2Router.swapExactETHForTokens(
            amountOutMin,
            path,
            activeWallet.address,
            deadline,
            { 
              value: amountIn,
              gasPrice: optimizedGasPrice,
              gasLimit: gasLimit
            }
          );
          const receipt = await tx.wait();
          txHash = receipt.hash;
          gasUsed = ethers.formatEther(receipt.gasUsed * receipt.gasPrice);
        } else if (exchangeId === 'fly' && exchange.contracts.router) {
          // Special handling for Fly.Trade aggregator
          if (!ethers.isAddress(exchange.contracts.router)) {
            throw new Error(`Invalid router address for ${exchange.name}`);
          }
          
          // For Fly.Trade, we'll use a simple ETH to token swap
          const flyRouter = new ethers.Contract(exchange.contracts.router, UNISWAP_V2_ROUTER_ABI, signer);
          const path = [WETH_ADDRESS, tokenInfo.address];
          const tx = await flyRouter.swapExactETHForTokens(
            0,
            path,
            activeWallet.address,
            deadline,
            { value: amountIn }
          );
          const receipt = await tx.wait();
          txHash = receipt.hash;
          gasUsed = ethers.formatEther(receipt.gasUsed * receipt.gasPrice);
        } else {
          throw new Error(`No valid router found for ${exchange.name}`);
        }
      } else {
        // Sell tokens for ETH/S - sell ALL tokens received from previous buy
        const tokenContract = new ethers.Contract(tokenInfo.address, ERC20_ABI, signer);
        const tokenBalance = await tokenContract.balanceOf(activeWallet.address);
        
        if (tokenBalance === 0n) {
          throw new Error('No tokens to sell');
        }

        // Sell ALL tokens in wallet, not a fixed amount
        const sellAmount = tokenBalance;
        
        // Determine router address with validation
        let routerAddress = '';
        if (pairInfo.v3.length > 0 && exchange.contracts.v3Router) {
          routerAddress = exchange.contracts.v3Router;
        } else if (pairInfo.v2 && exchange.contracts.v2Router) {
          routerAddress = exchange.contracts.v2Router;
        } else if (exchangeId === 'fly' && exchange.contracts.router) {
          routerAddress = exchange.contracts.router;
        } else {
          throw new Error(`No valid router found for selling on ${exchange.name}`);
        }
        
        if (!ethers.isAddress(routerAddress)) {
          throw new Error(`Invalid router address: ${routerAddress}`);
        }
        
        // Approve router to spend tokens
        const allowance = await tokenContract.allowance(activeWallet.address, routerAddress);
        
        if (allowance < sellAmount) {
          const approveTx = await tokenContract.approve(routerAddress, ethers.MaxUint256);
          await approveTx.wait();
        }

        if (pairInfo.v3.length > 0 && exchange.contracts.v3Router) {
          // Use V3
          const v3Router = new ethers.Contract(exchange.contracts.v3Router, UNISWAP_V3_ROUTER_ABI, signer);

          // Estimate ETH output for sell transactions
          const estimatedEthOutput = sellAmount; // Simplified estimation

          // Apply a small dynamic slippage (e.g., 0.5%)
          const slippageFactor = 995n; // 99.5% for 0.5% slippage
          const amountOutMinimum = (estimatedEthOutput * slippageFactor) / 1000n;
          
          const params = {
            tokenIn: tokenInfo.address,
            tokenOut: WETH_ADDRESS,
            fee: pairInfo.v3[0].fee,
            recipient: activeWallet.address,
            deadline,
            amountIn: sellAmount,
            amountOutMinimum,
            sqrtPriceLimitX96: 0
          };
          // Optimize gas for faster transactions
          const gasPrice = await provider.getFeeData();
          const optimizedGasPrice = gasPrice.gasPrice ? gasPrice.gasPrice * 120n / 100n : undefined;
          
          const estimatedGas = await v3Router.estimateGas.exactInputSingle(params);
          const gasLimit = (estimatedGas * 120n) / 100n; // Add 20% buffer
          const tx = await v3Router.exactInputSingle(params, {
            gasPrice: optimizedGasPrice,
            gasLimit: gasLimit
          });
          const receipt = await tx.wait();
          txHash = receipt.hash;
          gasUsed = ethers.formatEther(receipt.gasUsed * receipt.gasPrice);
        } else if (pairInfo.v2 && exchange.contracts.v2Router) {
          // Use V2
          const v2Router = new ethers.Contract(exchange.contracts.v2Router, UNISWAP_V2_ROUTER_ABI, signer);
          const path = [tokenInfo.address, WETH_ADDRESS];

          // Estimate ETH output for sell transactions
          const amountsOut = await v2Router.getAmountsOut(sellAmount, path);
          const estimatedEthOutput = amountsOut[amountsOut.length - 1];
          
          // Apply a small dynamic slippage (e.g., 0.5%)
          const slippageFactor = 995n; // 99.5% for 0.5% slippage
          const amountOutMin = (estimatedEthOutput * slippageFactor) / 1000n;
          
          // Optimize gas for faster transactions
          const gasPrice = await provider.getFeeData();
          const optimizedGasPrice = gasPrice.gasPrice ? gasPrice.gasPrice * 120n / 100n : undefined;
          
          const estimatedGas = await v2Router.estimateGas.swapExactTokensForETH(
            sellAmount,
            amountOutMin,
            path,
            activeWallet.address,
            deadline
          );
          const gasLimit = (estimatedGas * 120n) / 100n; // Add 20% buffer
          const tx = await v2Router.swapExactTokensForETH(
            sellAmount,
            amountOutMin,
            path,
            activeWallet.address,
            deadline,
            {
              gasPrice: optimizedGasPrice,
              gasLimit: gasLimit
            }
          );
          const receipt = await tx.wait();
          txHash = receipt.hash;
          gasUsed = ethers.formatEther(receipt.gasUsed * receipt.gasPrice);
        } else if (exchangeId === 'fly' && exchange.contracts.router) {
          // Use Fly.Trade aggregator
          const flyRouter = new ethers.Contract(exchange.contracts.router, UNISWAP_V2_ROUTER_ABI, signer);
          const path = [tokenInfo.address, WETH_ADDRESS];
          const tx = await flyRouter.swapExactTokensForETH(
            sellAmount,
            0,
            path,
            activeWallet.address,
            deadline
          );
          const receipt = await tx.wait();
          txHash = receipt.hash;
          gasUsed = ethers.formatEther(receipt.gasUsed * receipt.gasPrice);
        } else {
          throw new Error(`No valid router found for selling on ${exchange.name}`);
        }
      }

      return { txHash, gasUsed, success: true, walletUsed: activeWallet.address };
    } catch (error: any) {
      console.error('Transaction failed:', error);
      return { txHash: '', gasUsed: '0', success: false, error: error.message, walletUsed: walletToUse?.address || botWallet?.address };
    }
  };

  // Execute bot with real transactions
  const executeBotTransactions = async () => {
    let completed = 0;
    let isRunning = true;
    let timeoutId: NodeJS.Timeout | null = null;
    
    // Cleanup function to stop the bot
    const cleanup = () => {
      isRunning = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };
    
    const executeNextTransaction = async () => {
      if (!isRunning || botStatus === 'stopped' || completed >= botConfig.txCount) {
        setBotStatus('idle');
        setProgress(100);
        cleanup();
        toast({
          title: "Bot Completed",
          description: `Volume bot completed ${completed} transactions.`
        });
        return;
      }

      if (botStatus === 'paused') {
        // Check again in 1 second if paused
        timeoutId = setTimeout(executeNextTransaction, 1000);
        return;
      }

      try {
        let isBuy = true; // Start with a buy transaction
        // If the last transaction was a buy, the next should be a sell, and vice-versa
        if (transactions.length > 0 && transactions[0].status === 'success') {
          isBuy = transactions[0].type === 'sell';
        }
        const selectedExchange = botConfig.selectedExchanges[Math.floor(Math.random() * botConfig.selectedExchanges.length)];
        
        // Select wallet for transaction
        let walletToUse = botWallet;
        if (botConfig.enableMultiWallet && multiWallets.length > 0) {
          walletToUse = multiWallets[Math.floor(Math.random() * multiWallets.length)];
        }
        
        const newTx: Transaction = {
          id: `tx_${Date.now()}_${Math.random()}`,
          type: isBuy ? 'buy' : 'sell',
          amount: botConfig.amountPerTx,
          price: '0.000000', // Will be updated after transaction
          exchange: selectedExchange,
          status: 'pending',
          timestamp: Date.now()
        };

        setTransactions(prev => [newTx, ...prev.slice(0, 49)]);

        // Execute real transaction
        const result = await executeTransaction(isBuy, selectedExchange, walletToUse);
        
        // Update transaction with result
        setTransactions(prev => prev.map(tx => 
          tx.id === newTx.id 
            ? {
                ...tx,
                status: result.success ? 'success' : 'failed',
                txHash: result.txHash,
                gasUsed: result.gasUsed
              }
            : tx
        ));

        if (result.success) {
          completed++;
          setProgress((completed / botConfig.txCount) * 100);
          
          // Update stats
          setBotStats(prev => ({
            ...prev,
            totalVolume: prev.totalVolume + parseFloat(botConfig.amountPerTx),
            completedTxs: completed,
            successRate: ((prev.completedTxs + 1) / (completed + 1)) * 100,
            avgGasUsed: (prev.avgGasUsed + parseFloat(result.gasUsed)) / 2
          }));

          toast({
            title: "Transaction Successful",
            description: `${isBuy ? 'Bought' : 'Sold'} tokens on ${selectedExchange}`
          });

          // If a transaction was successful, immediately attempt the opposite transaction
          const oppositeTxType = isBuy ? 'sell' : 'buy';
          const oppositeTx: Transaction = {
            id: `tx_${Date.now()}_${Math.random()}`,
            type: oppositeTxType,
            amount: botConfig.amountPerTx,
            price: '0.000000',
            exchange: selectedExchange,
            status: 'pending',
            timestamp: Date.now()
          };

          setTransactions(prev => [oppositeTx, ...prev.slice(0, 49)]);
          const oppositeResult = await executeTransaction(oppositeTxType === 'buy', selectedExchange, walletToUse);

          setTransactions(prev => prev.map(tx => 
            tx.id === oppositeTx.id 
              ? {
                  ...tx,
                  status: oppositeResult.success ? 'success' : 'failed',
                  txHash: oppositeResult.txHash,
                  gasUsed: oppositeResult.gasUsed
                }
              : tx
          ));

          if (oppositeResult.success) {
            completed++;
            setProgress((completed / botConfig.txCount) * 100);
            setBotStats(prev => ({
              ...prev,
              totalVolume: prev.totalVolume + parseFloat(botConfig.amountPerTx),
              completedTxs: completed,
              successRate: ((prev.completedTxs + 1) / (completed + 1)) * 100,
              avgGasUsed: (prev.avgGasUsed + parseFloat(oppositeResult.gasUsed)) / 2
            }));
            toast({
              title: "Transaction Successful",
              description: `${oppositeTxType === 'buy' ? 'Bought' : 'Sold'} tokens on ${selectedExchange}`
            });
          }
        } else {
          toast({
            title: "Transaction Failed",
            description: result.error || 'Unknown error occurred',
            variant: "destructive"
          });
        }

      } catch (error: any) {
        console.error('Error executing transaction:', error);
        toast({
          title: "Transaction Error",
          description: error.message,
          variant: "destructive"
        });
      }

      // Schedule next transaction with improved timing
      const nextInterval = Math.random() * (botConfig.intervalMax - botConfig.intervalMin) + botConfig.intervalMin;
      if (isRunning && botStatus === 'running' && completed < botConfig.txCount) {
        timeoutId = setTimeout(executeNextTransaction, nextInterval * 1000);
      } else if (completed >= botConfig.txCount) {
        setBotStatus('idle');
        setProgress(100);
        cleanup();
        toast({
          title: "Bot Completed",
          description: `Volume bot completed ${completed} transactions.`
        });
      }
    };

    // Start the first transaction
    executeNextTransaction();
  };

  // Pause bot
  const pauseBot = () => {
    setBotStatus('paused');
    toast({
      title: "Bot Paused",
      description: "Volume bot has been paused."
    });
  };

  // Resume bot
  const resumeBot = () => {
    setBotStatus('running');
    toast({
      title: "Bot Resumed",
      description: "Volume bot has been resumed."
    });
  };

  // Stop bot
  const stopBot = () => {
    setBotStatus('stopped');
    setProgress(0);
    setEstimatedCompletion(null);
    toast({
      title: "Bot Stopped",
      description: "Volume bot has been stopped."
    });
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          Sonic Volume Bot
        </h1>
        <p className="text-white/70 text-lg">
          Automated trading bot for generating volume on Sonic Network DEXs
        </p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-black/50 border-blue-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60">Status</p>
                <p className="text-lg font-semibold capitalize text-white">{botStatus}</p>
              </div>
              <Activity className={`w-8 h-8 ${
                botStatus === 'running' ? 'text-green-400' :
                botStatus === 'paused' ? 'text-yellow-400' :
                botStatus === 'stopped' ? 'text-red-400' : 'text-gray-400'
              }`} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black/50 border-green-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60">Total Volume</p>
                <p className="text-lg font-semibold text-white">${botStats.totalVolume.toFixed(2)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black/50 border-purple-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60">Completed TXs</p>
                <p className="text-lg font-semibold text-white">{botStats.completedTxs}</p>
              </div>
              <Target className="w-8 h-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black/50 border-orange-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60">Success Rate</p>
                <p className="text-lg font-semibold text-white">{botStats.successRate.toFixed(1)}%</p>
              </div>
              <CheckCircle className="w-8 h-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      {botStatus !== 'idle' && (
        <Card className="bg-black/50 border-white/20">
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Progress</span>
                <span className="text-white">{progress.toFixed(1)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              {estimatedCompletion && (
                <p className="text-xs text-white/60">
                  Estimated completion: {estimatedCompletion.toLocaleString()}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="config" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-black/50">
          <TabsTrigger value="config" className="data-[state=active]:bg-blue-600">Configuration</TabsTrigger>
          <TabsTrigger value="wallet" className="data-[state=active]:bg-blue-600">Bot Wallet</TabsTrigger>
          <TabsTrigger value="monitor" className="data-[state=active]:bg-blue-600">Monitor</TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-blue-600">History</TabsTrigger>
        </TabsList>

        {/* Configuration Tab */}
        <TabsContent value="config" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Token Configuration */}
            <Card className="bg-black/50 border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Wallet className="w-5 h-5" />
                  Token Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="usePairAddress"
                      checked={botConfig.usePairAddress}
                      onCheckedChange={(checked) => {
                        setBotConfig(prev => ({ ...prev, usePairAddress: checked }));
                        if (!checked) {
                          setBotConfig(prev => ({ ...prev, pairAddress: '' }));
                        }
                      }}
                    />
                    <Label htmlFor="usePairAddress" className="text-white text-sm">
                      Use Pair Address Instead
                    </Label>
                  </div>
                  
                  {botConfig.usePairAddress ? (
                    <div>
                      <Label htmlFor="pairAddress" className="text-white">Pair Contract Address</Label>
                      <Input
                        id="pairAddress"
                        value={botConfig.pairAddress}
                        onChange={(e) => handleAddressChange(e.target.value, true)}
                        placeholder="0x... (Pair Address)"
                        className="bg-black/30 border-white/20 text-white"
                      />
                      <p className="text-xs text-white/60 mt-1">
                        Enter the pair address to automatically detect the token and exchange
                      </p>
                    </div>
                  ) : (
                    <div>
                      <Label htmlFor="tokenAddress" className="text-white">Token Contract Address</Label>
                      <Input
                        id="tokenAddress"
                        value={botConfig.tokenAddress}
                        onChange={(e) => handleAddressChange(e.target.value, false)}
                        placeholder="0x... (Token Address)"
                        className="bg-black/30 border-white/20 text-white"
                      />
                    </div>
                  )}
                  
                  {isLoadingToken && (
                    <p className="text-sm text-blue-400 mt-1 flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      Loading token info...
                    </p>
                  )}
                </div>
                
                {tokenInfo && (
                  <div className="space-y-3">
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                      <h4 className="font-semibold text-green-400 mb-2">Token Information</h4>
                      <div className="space-y-1 text-sm">
                        <p><span className="text-white/60">Name:</span> <span className="text-white">{tokenInfo.name}</span></p>
                        <p><span className="text-white/60">Symbol:</span> <span className="text-white">{tokenInfo.symbol}</span></p>
                        <p><span className="text-white/60">Decimals:</span> <span className="text-white">{tokenInfo.decimals}</span></p>
                        <p><span className="text-white/60">Total Supply:</span> <span className="text-white">{parseFloat(tokenInfo.totalSupply).toLocaleString()}</span></p>
                      </div>
                    </div>
                    
                    {/* Pair Detection Results */}
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                      <h4 className="font-semibold text-blue-400 mb-2 flex items-center gap-2">
                        Liquidity Detection
                        {isDetectingPairs && <RefreshCw className="w-3 h-3 animate-spin" />}
                      </h4>
                      {Object.keys(pairDetection).length > 0 ? (
                        <div className="space-y-2 text-sm">
                          {Object.entries(pairDetection).map(([exchangeId, info]: [string, any]) => (
                            <div key={exchangeId} className="flex items-center justify-between">
                              <span className="text-white/60">{info.name}:</span>
                              <div className="flex items-center gap-2">
                                {info.hasLiquidity ? (
                                  <>
                                    <CheckCircle className="w-3 h-3 text-green-400" />
                                    <span className="text-green-400 text-xs">
                                      {info.v2 && 'V2'} {info.v3.length > 0 && `V3(${info.v3.length})`} {info.dlmm && 'DLMM'}
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <AlertTriangle className="w-3 h-3 text-red-400" />
                                    <span className="text-red-400 text-xs">No liquidity</span>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-white/60 text-sm">Enter a valid token address to detect liquidity</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="amountPerTx" className="text-white">S per Transaction</Label>
                    <Input
                      id="amountPerTx"
                      type="number"
                      value={botConfig.amountPerTx}
                      onChange={(e) => setBotConfig(prev => ({ ...prev, amountPerTx: e.target.value }))}
                      className="bg-black/30 border-white/20 text-white"
                      step="0.01"
                      min="0.01"
                    />
                  </div>
                  <div>
                    <Label htmlFor="totalBudget" className="text-white">Total Budget (S)</Label>
                    <Input
                      id="totalBudget"
                      type="number"
                      value={botConfig.totalBudget}
                      onChange={(e) => setBotConfig(prev => ({ ...prev, totalBudget: e.target.value }))}
                      className="bg-black/30 border-white/20 text-white"
                      step="1"
                      min="1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="txCount" className="text-white">Number of Transactions</Label>
                  <Input
                    id="txCount"
                    type="number"
                    value={botConfig.txCount}
                    onChange={(e) => setBotConfig(prev => ({ ...prev, txCount: parseInt(e.target.value) || 0 }))}
                    className="bg-black/30 border-white/20 text-white"
                    min="1"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Trading Configuration */}
            <Card className="bg-black/50 border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Trading Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="intervalMin" className="text-white">Min Interval (seconds)</Label>
                    <Input
                      id="intervalMin"
                      type="number"
                      value={botConfig.intervalMin}
                      onChange={(e) => setBotConfig(prev => ({ ...prev, intervalMin: parseInt(e.target.value) || 0 }))}
                      className="bg-black/30 border-white/20 text-white"
                      min="1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="intervalMax" className="text-white">Max Interval (seconds)</Label>
                    <Input
                      id="intervalMax"
                      type="number"
                      value={botConfig.intervalMax}
                      onChange={(e) => setBotConfig(prev => ({ ...prev, intervalMax: parseInt(e.target.value) || 0 }))}
                      className="bg-black/30 border-white/20 text-white"
                      min="1"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-white mb-3 block">Buy/Sell Ratio</Label>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-green-400">Buy: {botConfig.buyRatio}%</span>
                      <span className="text-red-400">Sell: {botConfig.sellRatio}%</span>
                    </div>
                    <Slider
                      value={[botConfig.buyRatio]}
                      onValueChange={([value]) => {
                        setBotConfig(prev => ({
                          ...prev,
                          buyRatio: value,
                          sellRatio: 100 - value
                        }));
                      }}
                      max={100}
                      step={1}
                      className="w-full"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-white mb-3 block">Slippage Tolerance</Label>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-white/60">Slippage: {botConfig.slippageTolerance}%</span>
                      <span className="text-white/60">Lower = Less slippage, Higher = More likely to succeed</span>
                    </div>
                    <Slider
                      value={[botConfig.slippageTolerance]}
                      onValueChange={([value]) => {
                        setBotConfig(prev => ({
                          ...prev,
                          slippageTolerance: value
                        }));
                      }}
                      min={0.1}
                      max={5.0}
                      step={0.1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-white/40">
                      <span>0.1%</span>
                      <span>5.0%</span>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-white mb-3 block">Exchanges</Label>
                  <div className="space-y-2">
                    {EXCHANGES.map((exchange) => (
                      <div key={exchange.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id={exchange.id}
                            checked={botConfig.selectedExchanges.includes(exchange.id)}
                            onCheckedChange={(checked) => {
                              setBotConfig(prev => ({
                                ...prev,
                                selectedExchanges: checked
                                  ? [...prev.selectedExchanges, exchange.id]
                                  : prev.selectedExchanges.filter(id => id !== exchange.id)
                              }));
                            }}
                          />
                          <Label htmlFor={exchange.id} className="text-white text-sm">
                            {exchange.name}
                          </Label>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(exchange.url, '_blank')}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Control Buttons */}
          <Card className="bg-black/50 border-white/20">
            <CardContent className="p-4">
              <div className="flex justify-center gap-4">
                {botStatus === 'idle' && (
                  <Button
                    onClick={startBot}
                    className="bg-green-600 hover:bg-green-700 text-white px-8 py-2"
                    disabled={!account || !tokenInfo || !botWallet || currentChain !== 'sonic'}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Start Bot
                  </Button>
                )}
                
                {botStatus === 'running' && (
                  <>
                    <Button
                      onClick={pauseBot}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white px-8 py-2"
                    >
                      <Pause className="w-4 h-4 mr-2" />
                      Pause
                    </Button>
                    <Button
                      onClick={stopBot}
                      className="bg-red-600 hover:bg-red-700 text-white px-8 py-2"
                    >
                      <Square className="w-4 h-4 mr-2" />
                      Stop
                    </Button>
                  </>
                )}
                
                {botStatus === 'paused' && (
                  <>
                    <Button
                      onClick={resumeBot}
                      className="bg-green-600 hover:bg-green-700 text-white px-8 py-2"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Resume
                    </Button>
                    <Button
                      onClick={stopBot}
                      className="bg-red-600 hover:bg-red-700 text-white px-8 py-2"
                    >
                      <Square className="w-4 h-4 mr-2" />
                      Stop
                    </Button>
                  </>
                )}
              </div>
              
              {!account && (
                <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <p className="text-yellow-400 text-sm text-center flex items-center justify-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Please connect your wallet to use the volume bot
                  </p>
                </div>
              )}
              
              {account && currentChain !== 'sonic' && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-red-400 text-sm text-center flex items-center justify-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Please switch to Sonic Network to use the volume bot
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bot Wallet Tab */}
        <TabsContent value="wallet" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bot Wallet Management */}
            <Card className="bg-black/50 border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Wallet className="w-5 h-5" />
                  Bot Wallet
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!botWallet ? (
                  <div className="text-center py-6">
                    <Wallet className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-white/70 mb-4">No bot wallet found</p>
                    <Button
                      onClick={generateBotWallet}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Create Bot Wallet
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                      <h4 className="font-semibold text-green-400 mb-2">Bot Wallet Active</h4>
                      <div className="space-y-2 text-sm">
                        <p><span className="text-white/60">Address:</span> <span className="text-white font-mono">{botWallet.address.slice(0, 10)}...{botWallet.address.slice(-8)}</span></p>
                        <p><span className="text-white/60">S Balance:</span> <span className="text-white">{parseFloat(botWallet.balance).toFixed(4)} S</span></p>
                        {tokenInfo && (
                          <p><span className="text-white/60">{tokenInfo.symbol} Balance:</span> <span className="text-white">{parseFloat(botWallet.tokenBalance).toFixed(4)} {tokenInfo.symbol}</span></p>
                        )}
                      </div>
                    </div>
                    
                    {/* Fund Transfer */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-white">Fund Management</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Amount (S)"
                          className="bg-black/30 border-white/20 text-white"
                          id="transferAmount"
                        />
                        <Button
                          onClick={() => {
                            const input = document.getElementById('transferAmount') as HTMLInputElement;
                            if (input?.value) {
                              transferToBotWallet(input.value);
                              input.value = '';
                            }
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white"
                          disabled={!account}
                        >
                          Transfer to Bot
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Amount (S)"
                          className="bg-black/30 border-white/20 text-white"
                          id="cashoutAmount"
                        />
                        <Button
                          onClick={() => {
                            const input = document.getElementById('cashoutAmount') as HTMLInputElement;
                            if (input?.value) {
                              cashOutFromBotWallet(input.value, false);
                              input.value = '';
                            }
                          }}
                          className="bg-orange-600 hover:bg-orange-700 text-white"
                        >
                          Cash Out S
                        </Button>
                      </div>
                      
                      {tokenInfo && (
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            placeholder={`Amount (${tokenInfo.symbol})`}
                            className="bg-black/30 border-white/20 text-white"
                            id="cashoutTokenAmount"
                          />
                          <Button
                            onClick={() => {
                              const input = document.getElementById('cashoutTokenAmount') as HTMLInputElement;
                              if (input?.value) {
                                cashOutFromBotWallet(input.value, true);
                                input.value = '';
                              }
                            }}
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                          >
                            Cash Out {tokenInfo.symbol}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Multi-Wallet Management */}
            <Card className="bg-black/50 border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Multi-Wallet Trading
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="enableMultiWallet"
                    checked={botConfig.enableMultiWallet}
                    onCheckedChange={(checked) => {
                      setBotConfig(prev => ({ ...prev, enableMultiWallet: checked }));
                    }}
                    disabled={!botWallet}
                  />
                  <Label htmlFor="enableMultiWallet" className="text-white text-sm">
                    Enable Multi-Wallet Trading
                  </Label>
                </div>
                
                {botConfig.enableMultiWallet && (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="multiWalletCount" className="text-white">Number of Wallets</Label>
                      <Input
                        id="multiWalletCount"
                        type="number"
                        value={botConfig.multiWalletCount}
                        onChange={(e) => setBotConfig(prev => ({ ...prev, multiWalletCount: parseInt(e.target.value) || 1 }))}
                        className="bg-black/30 border-white/20 text-white"
                        min="1"
                        max="10"
                      />
                    </div>
                    
                    <Button
                      onClick={generateMultiWallets}
                      disabled={!botWallet || isCreatingWallets}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {isCreatingWallets ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Creating Wallets...
                        </>
                      ) : (
                        `Generate ${botConfig.multiWalletCount} Wallets`
                      )}
                    </Button>
                    
                    {multiWallets.length > 0 && (
                      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                        <h4 className="font-semibold text-blue-400 mb-2">Generated Wallets</h4>
                        <div className="space-y-1 text-xs">
                          {multiWallets.map((wallet, index) => (
                            <div key={wallet.address} className="flex justify-between">
                              <span className="text-white/60">Wallet {index + 1}:</span>
                              <span className="text-white font-mono">{wallet.address.slice(0, 8)}...{wallet.address.slice(-6)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                  <p className="text-yellow-400 text-sm">
                    <AlertTriangle className="w-4 h-4 inline mr-1" />
                    Multi-wallet trading distributes transactions across multiple addresses for better volume distribution.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Monitor Tab */}
        <TabsContent value="monitor" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Real-time Stats */}
            <Card className="bg-black/50 border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Real-time Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                    <p className="text-blue-400 text-sm">Current Price</p>
                    <p className="text-white text-lg font-semibold">${botStats.currentPrice.toFixed(6)}</p>
                  </div>
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                    <p className="text-green-400 text-sm">24h Change</p>
                    <p className={`text-lg font-semibold ${
                      botStats.priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {botStats.priceChange24h >= 0 ? '+' : ''}{botStats.priceChange24h.toFixed(2)}%
                    </p>
                  </div>
                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                    <p className="text-purple-400 text-sm">Avg Gas Used</p>
                    <p className="text-white text-lg font-semibold">{botStats.avgGasUsed.toFixed(6)} S</p>
                  </div>
                  <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
                    <p className="text-orange-400 text-sm">S Balance</p>
                    <p className="text-white text-lg font-semibold">{sBalance || '0.0000'} S</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bot Configuration Summary */}
            <Card className="bg-black/50 border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Current Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/60">Token:</span>
                    <span className="text-white">{tokenInfo?.symbol || 'Not selected'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Amount per TX:</span>
                    <span className="text-white">{botConfig.amountPerTx} S</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Total Budget:</span>
                    <span className="text-white">{botConfig.totalBudget} S</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Transaction Count:</span>
                    <span className="text-white">{botConfig.txCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Interval:</span>
                    <span className="text-white">{botConfig.intervalMin}-{botConfig.intervalMax}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Buy/Sell Ratio:</span>
                    <span className="text-white">{botConfig.buyRatio}%/{botConfig.sellRatio}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Exchanges:</span>
                    <span className="text-white">{botConfig.selectedExchanges.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card className="bg-black/50 border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Transaction History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {transactions.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-white/60">No transactions yet</p>
                    <p className="text-white/40 text-sm mt-1">Start the bot to see transaction history</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {transactions.map((tx) => (
                      <div
                        key={tx.id}
                        className={`p-3 rounded-lg border ${
                          tx.status === 'success'
                            ? 'bg-green-500/10 border-green-500/30'
                            : tx.status === 'failed'
                            ? 'bg-red-500/10 border-red-500/30'
                            : 'bg-yellow-500/10 border-yellow-500/30'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                tx.type === 'buy'
                                  ? 'bg-green-500/20 text-green-400'
                                  : 'bg-red-500/20 text-red-400'
                              }`}>
                                {tx.type.toUpperCase()}
                              </span>
                              <span className="text-white text-sm">{tx.amount} S</span>
                              <span className="text-white/60 text-xs">@ ${tx.price}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-white/60">
                              <span>{tx.exchange}</span>
                              <span>•</span>
                              <span>{new Date(tx.timestamp).toLocaleTimeString()}</span>
                              {tx.gasUsed && (
                                <>
                                  <span>•</span>
                                  <span>Gas: {tx.gasUsed} S</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-1 rounded ${
                              tx.status === 'success'
                                ? 'bg-green-500/20 text-green-400'
                                : tx.status === 'failed'
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {tx.status}
                            </span>
                            {tx.txHash && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(`https://sonicscan.org/tx/${tx.txHash}`, '_blank')}
                                className="text-blue-400 hover:text-blue-300 p-1 h-auto"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VolumeBot;