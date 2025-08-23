
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { ethers, formatEther, parseEther } from "ethers";
import { GAME_CONTRACT_ADDRESS, GAME_CONTRACT_ABI } from "@/types";

interface Web3ContextType {
  account: string | null;
  username: string | null;
  setUsername: (name: string) => void;
  balance: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  payForGame: () => Promise<boolean>;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

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

  const setUsername = (name: string) => {
    if(account) {
      localStorage.setItem(`username_${account}`, name);
      setUsernameState(name);
    }
  }

  const getProvider = () => {
    if (typeof window !== "undefined" && window.ethereum) {
      return new ethers.BrowserProvider(window.ethereum);
    }
    return null;
  };
  
  const getBalance = useCallback(async (provider: ethers.BrowserProvider, userAccount: string) => {
    const balance = await provider.getBalance(userAccount);
    const formattedBalance = parseFloat(formatEther(balance)).toFixed(4);
    setBalance(formattedBalance);
  }, []);

  const handleAccountsChanged = useCallback(async (accounts: string[]) => {
    if (accounts.length === 0) {
      disconnect();
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
  
  const disconnect = () => {
    setAccount(null);
    setUsernameState(null);
    setBalance(null);
  };
  
  const switchToSonicNetwork = async () => {
    const provider = getProvider();
    if (!provider || !window.ethereum) return;

    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: SONIC_NETWORK.chainId }],
        });
    } catch (switchError: any) {
        if (switchError.code === 4902) {
            try {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [SONIC_NETWORK],
                });
            } catch (addError) {
                console.error("Failed to add Sonic network", addError);
            }
        }
    }
  };


  const connect = async () => {
    const provider = getProvider();
    if (!provider) {
      alert("Please install Rabby Wallet or another Ethereum-compatible wallet.");
      return;
    }
    
    try {
      await switchToSonicNetwork();
      const accounts = await provider.send("eth_requestAccounts", []);
      
      if (accounts.length > 0) {
        const userAccount = accounts[0];
        setAccount(userAccount);
        const storedUsername = localStorage.getItem(`username_${userAccount}`);
        setUsernameState(storedUsername || userAccount);
        await getBalance(provider, userAccount);
      }
    } catch (error: any) {
       if (error.code === 4001 || error.code === -32001) { 
        // 4001 is user rejected request
        // -32001 is "Already processing unlock"
        return; 
      }
      console.error("Failed to connect wallet", error);
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

  const value = { account, username, setUsername, balance, connect, disconnect, payForGame };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
};

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error("useWeb3 must be used within a Web3Provider");
  }
  return context;
};
