
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { ethers, formatEther, parseEther } from "ethers";
import { GAME_CONTRACT_ADDRESS, GAME_CONTRACT_ABI, ARC_TOKEN_ADDRESS, ARC_TOKEN_ABI } from "@/types";
import { Web3ContextType } from "@/types/web3";

// Extend Window interface for ethereum
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, callback: (...args: any[]) => void) => void;
      removeListener: (event: string, callback: (...args: any[]) => void) => void;
      isRabby?: boolean;
      isMetaMask?: boolean;
      chainId?: string;
    };
  }
}

interface ExtendedWeb3ContextType extends Web3ContextType {
  setUsername: (name: string) => void;
  sBalance: string | null;
  arcBalance: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  payForGame: () => Promise<boolean>;
  getProvider: () => ethers.BrowserProvider | null;
  getSigner: () => Promise<ethers.JsonRpcSigner | null>;
}

export const Web3Context = createContext<ExtendedWeb3ContextType | undefined>(undefined);

const SONIC_NETWORK = {
    chainId: '0x92', // 146
    chainName: 'Sonic',
    nativeCurrency: {
      name: 'Sonic',
      symbol: 'S',
      decimals: 18,
    },
    rpcUrls: ['https://rpc.soniclabs.com'],
    blockExplorerUrls: ['https://sonicscan.org'],
};


export const Web3Provider = ({ children }: { children: React.ReactNode }) => {
  const [account, setAccount] = useState<string | null>(null);
  const [username, setUsernameState] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [arcBalance, setArcBalance] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isValidWallet, setIsValidWallet] = useState<boolean>(false);

  const setUsername = (name: string) => {
    if(account) {
      localStorage.setItem(`username_${account}`, name);
      setUsernameState(name);
    }
  }

  const getProvider = useCallback(() => {
    if (typeof window !== "undefined" && window.ethereum) {
      console.log("Ethereum provider detected:", window.ethereum);
      console.log("Provider details:", {
        isRabby: window.ethereum.isRabby,
        isMetaMask: window.ethereum.isMetaMask,
        chainId: window.ethereum.chainId
      });
      return new ethers.BrowserProvider(window.ethereum);
    }
    console.log("No ethereum provider found");
    return null;
  }, []);
  
  const getBalance = useCallback(async (provider: ethers.BrowserProvider, userAccount: string) => {
    const balance = await provider.getBalance(userAccount);
    const formattedBalance = parseFloat(formatEther(balance)).toFixed(4);
    setBalance(formattedBalance);
    const arcContract = new ethers.Contract(ARC_TOKEN_ADDRESS, ARC_TOKEN_ABI, provider);
    const arcBalanceRaw = await arcContract.balanceOf(userAccount);
    console.log("ARC Balance Raw:", arcBalanceRaw.toString(), "for account:", userAccount);
    const formattedArcBalance = parseFloat(formatEther(arcBalanceRaw)).toFixed(4);
    console.log("ARC Balance Formatted:", formattedArcBalance);
    setArcBalance(formattedArcBalance);
  }, []);

  const handleAccountsChanged = useCallback(async (accounts: string[]) => {
    if (accounts.length === 0) {
      // Clear local state when accounts are disconnected
      setArcBalance(null);
      setAccount(null);
      setUsernameState(null);
      setBalance(null);
      setProvider(null);
      setSigner(null);
      setIsConnected(false);
      setIsValidWallet(false);
    } else {
      const userAccount = accounts[0];
      setAccount(userAccount);
      const storedUsername = localStorage.getItem(`username_${userAccount}`);
      setUsernameState(storedUsername || userAccount);
      const provider = getProvider();
      if (provider) {
        await getBalance(provider, userAccount);
      }
    }
  }, [getBalance]);
  
  const disconnect = async () => {
    try {
      // Clear local state first
      setArcBalance(null);
      setAccount(null);
      setUsernameState(null);
      setBalance(null);
      setProvider(null);
      setSigner(null);
      setIsConnected(false);
      setIsValidWallet(false);
      
      // Try to disconnect from the wallet provider
      if (window.ethereum) {
        // For Rabby and other wallets that support wallet_revokePermissions
        try {
          await window.ethereum.request({
            method: 'wallet_revokePermissions',
            params: [{
              eth_accounts: {}
            }]
          });
          console.log('Wallet permissions revoked successfully');
        } catch (revokeError) {
          console.log('wallet_revokePermissions not supported or failed:', revokeError);
          
          // Fallback: Try to request accounts with empty array (some wallets support this)
          try {
            await window.ethereum.request({
              method: 'wallet_requestPermissions',
              params: [{ eth_accounts: {} }]
            });
          } catch (permError) {
            console.log('wallet_requestPermissions fallback failed:', permError);
          }
        }
        
        // Clear any cached connection data
        if (typeof window !== 'undefined') {
          // Clear localStorage items that might cache wallet connections
          const keysToRemove = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.includes('wallet') || key.includes('ethereum') || key.includes('rabby'))) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach(key => localStorage.removeItem(key));
        }
      }
    } catch (error) {
      console.error('Error during disconnect:', error);
    }
  };
  
  const switchToSonicNetwork = async () => {
    if (!window.ethereum) {
      console.log("No ethereum provider for network switch");
      return;
    }

    try {
        console.log("Switching to Sonic network...");
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: SONIC_NETWORK.chainId }],
        });
        console.log("Successfully switched to Sonic network");
    } catch (switchError: any) {
        console.log("Switch error:", switchError);
        if (switchError.code === 4902) {
            try {
                console.log("Adding Sonic network...");
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [SONIC_NETWORK],
                });
                console.log("Successfully added Sonic network");
            } catch (addError) {
                console.error("Failed to add Sonic network", addError);
                throw addError;
            }
        } else {
            console.error("Failed to switch network", switchError);
            throw switchError;
        }
    }
  };


  const getSigner = useCallback(async (): Promise<ethers.JsonRpcSigner | null> => {
    const provider = getProvider();
    if (provider) {
      return await provider.getSigner();
    }
    return null;
  }, [getProvider]);

  const connect = async () => {
    console.log("Connect function called");
    
    if (typeof window === "undefined" || !window.ethereum) {
      console.log("No ethereum provider found");
      alert("Please install Rabby Wallet, MetaMask, or another Ethereum-compatible wallet.");
      return;
    }
    
    try {
      // First, try to revoke any existing permissions to force wallet selection
      try {
        await window.ethereum.request({
          method: 'wallet_revokePermissions',
          params: [{
            eth_accounts: {}
          }]
        });
        console.log('Previous wallet permissions revoked to force selection');
      } catch (revokeError) {
        console.log('wallet_revokePermissions not supported:', revokeError);
      }
      
      console.log("Attempting to switch to Sonic network...");
      await switchToSonicNetwork();
      
      console.log("Requesting wallet selection...");
      // Request permissions first to ensure wallet selection dialog appears
      try {
        await window.ethereum.request({
          method: 'wallet_requestPermissions',
          params: [{ eth_accounts: {} }]
        });
        console.log('Wallet permissions requested successfully');
      } catch (permError) {
        console.log('wallet_requestPermissions not supported, proceeding with eth_requestAccounts:', permError);
      }
      
      // Now request accounts - this should show wallet selection
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      console.log("Accounts received:", accounts);
      
      if (accounts.length > 0) {
        const userAccount = accounts[0];
        setAccount(userAccount);
        const storedUsername = localStorage.getItem(`username_${userAccount}`);
        setUsernameState(storedUsername || userAccount);
        
        // Get provider for balance checking
        const walletProvider = getProvider();
        if (walletProvider) {
          setProvider(walletProvider);
          const walletSigner = await walletProvider.getSigner();
          setSigner(walletSigner);
          setIsConnected(true);
          setIsValidWallet(true);
          await getBalance(walletProvider, userAccount);
        }
        console.log("Wallet connected successfully:", userAccount);
      }
    } catch (error: any) {
       if (error.code === 4001 || error.code === -32001) { 
        // 4001 is user rejected request
        // -32001 is "Already processing unlock"
        console.log("User rejected or already processing:", error.code);
        return; 
      }
      console.error("Failed to connect wallet", error);
      alert(`Failed to connect wallet: ${error.message}`);
    }
  };
  
  const payForGame = async (): Promise<boolean> => {
    const provider = getProvider();
    if (!provider || !account) {
        throw new Error("Wallet not connected");
    }
    
    try {
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(GAME_CONTRACT_ADDRESS, GAME_CONTRACT_ABI, signer);
        console.log("Signer object in payForGame:", signer);
        console.log("Type of signer:", typeof signer);
        console.log("Signer methods:", Object.keys(Object.getPrototypeOf(signer)));
        console.log("Does signer have sendTransaction?", 'sendTransaction' in signer);
        console.log("Type of signer.sendTransaction:", typeof (signer as any).sendTransaction);

        const fee = parseEther("0.1");
        const tx = await contract.playGame({ value: fee });
        
        await tx.wait(); // Wait for transaction to be mined
        
        await getBalance(provider, account);

        return true;
    } catch (error: any) {
        if (error.code === 'ACTION_REJECTED') {
          throw new Error("Transaction cancelled by user.");
        }
        console.error("Payment failed:", error);
        throw new Error("Payment transaction failed.");
    }
  }


  useEffect(() => {
    if (window.ethereum) {
      const eth = window.ethereum as any;
      eth.on('accountsChanged', handleAccountsChanged);
      eth.on('chainChanged', () => window.location.reload());

      return () => {
        if (eth.removeListener) {
            eth.removeListener('accountsChanged', handleAccountsChanged);
            eth.removeListener('chainChanged', () => window.location.reload());
        }
      };
    }
  }, [handleAccountsChanged]);

  // Refresh balance every 10 seconds when account is connected
  useEffect(() => {
    if (account) {
      const interval = setInterval(async () => {
        const provider = getProvider();
        if (provider) {
          await getBalance(provider, account);
        }
      }, 10000); // 10 seconds

      return () => clearInterval(interval);
    }
  }, [account, getBalance]);

  const connectWallet = connect;
  const disconnectWallet = disconnect;

  const value = { 
    account, 
    provider, 
    signer, 
    isConnected, 
    isValidWallet, 
    username, 
    setUsername, 
    sBalance: balance, 
    arcBalance, 
    connect, 
    disconnect, 
    connectWallet, 
    disconnectWallet, 
    payForGame, 
    getProvider, 
    getSigner 
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
};

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error("useWeb3 must be used within a Web3Provider");
  }
  return context;
};
