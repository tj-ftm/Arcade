
"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { ethers, formatEther, parseEther } from "ethers";
import Web3 from "web3";
import { useToast } from "@/hooks/use-toast";
import { ARC_TOKEN_ABI, ARC_TOKEN_CONTRACT_ADDRESS, SONIC_CHAIN_ID, SONIC_RPC_URL } from "@/lib/constants";
import Web3Modal from "web3modal";
import WalletConnectProvider from "@walletconnect/web3-provider";
import { GAME_CONTRACT_ADDRESS, GAME_CONTRACT_ABI } from "@/types";

interface Web3ContextType {
  account: string | null;
  username: string | null;
  setUsername: (name: string) => void;
  balance: string | null;
  arcBalance: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  payForGame: () => Promise<boolean>;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

const SONIC_NETWORK = {
    chainId: `0x${SONIC_CHAIN_ID.toString(16)}`, // 146
    chainName: 'Sonic',
    nativeCurrency: {
      name: 'Sonic',
      symbol: 'S',
      decimals: 18,
    },
    rpcUrls: [SONIC_RPC_URL],
    blockExplorerUrls: ['https://sonicscan.org'],
};


export const Web3Provider = ({ children }: { children: React.ReactNode }) => {
  const [account, setAccount] = useState<string | null>(null);
  const [username, setUsernameState] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [arcBalance, setArcBalance] = useState<string | null>(null);

  const { toast } = useToast();

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
    const arcContract = new ethers.Contract(ARC_TOKEN_CONTRACT_ADDRESS, ARC_TOKEN_ABI, provider);
    const arcBalanceRaw = await arcContract.balanceOf(userAccount);
    console.log("ARC Balance Raw:", arcBalanceRaw.toString(), "for account:", userAccount);
    const formattedArcBalance = parseFloat(formatEther(arcBalanceRaw)).toFixed(4);
    console.log("ARC Balance Formatted:", formattedArcBalance);
    setArcBalance(formattedArcBalance);
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
    setArcBalance(null);
    setAccount(null);
    setUsernameState(null);
    setBalance(null);
    if (window.ethereum && window.ethereum.isMetaMask) {
      // For MetaMask, clearing the cache might involve more direct interaction
      // or relying on the wallet's own disconnect mechanism.
      // As a fallback, we can try to clear relevant local storage items.
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('walletconnect') || key.startsWith('WEB3_CONNECT_CACHED_PROVIDER')) {
          localStorage.removeItem(key);
        }
      });
    }
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


  const connect = useCallback(async () => {
    const providerOptions = {
      injected: {
        display: {
          name: "Injected",
          description: "Connect with the browser extension (MetaMask, Rabby, etc.)",
        },
        package: null,
      },
    };

    const web3Modal = new Web3Modal({
      cacheProvider: true,
      network: "mainnet", // or "sonic" or other network
      providerOptions,
    });

    try {
      const instance = await web3Modal.connect();
      const provider = new ethers.BrowserProvider(instance);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      setAccount(address);
      // setProvider(provider); // Removed as setProvider is not defined
      // checkNetwork(provider); // Removed as checkNetwork is not defined
      await getBalance(provider, address); // Call getBalance after successful connection
      await switchToSonicNetwork(); // Ensure correct network is selected
    } catch (error) {
      console.error("Error connecting to wallet:", error);
      toast({
        title: "Connection Error",
        description: "Failed to connect wallet. Please try again.",
        variant: "destructive",
      });
    }
  }, [toast, getBalance]);
  
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

  const value = { account, username, setUsername, balance, arcBalance, connect, disconnect, payForGame };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
};

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error("useWeb3 must be used within a Web3Provider");
  }
  return context;
};
