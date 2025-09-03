
"use client";

import { Wallet, LogOut, User, DollarSign, Gem, Edit, RefreshCw, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWeb3 } from "@/components/web3/Web3Provider";
import { formatEther } from "ethers";
import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import Image from "next/image";

export const ConnectWallet = () => {
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [isSwitchingChain, setIsSwitchingChain] = useState(false);
  const [imageError, setImageError] = useState(false);

  const { 
    account, 
    connect, 
    disconnect, 
    sBalance, 
    arcBalance, 
    username, 
    setUsername, 
    currentChain, 
    switchChain, 
    getCurrentChainConfig 
  } = useWeb3();
  
  const handleDisconnect = async () => {
    try {
      await disconnect();
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    }
  };

  const handleUsernameSubmit = () => {
    if (newUsername.trim()) {
      setUsername(newUsername.trim());
      setIsEditingUsername(false);
      setNewUsername("");
    }
  };

  const handleUsernameCancel = () => {
    setIsEditingUsername(false);
    setNewUsername("");
  };

  const handleChainSwitch = async (chain: 'sonic' | 'base') => {
    if (chain === currentChain) return;
    
    setIsSwitchingChain(true);
    setImageError(false); // Reset image error when switching chains
    try {
      await switchChain(chain);
    } catch (error) {
      console.error('Failed to switch chain:', error);
    } finally {
      setIsSwitchingChain(false);
    }
  };

  const getChainIcon = () => {
    return currentChain === 'base' ? '/base_icon.png' : '/sonic_icon.png';
  };

  const getChainName = () => {
    return currentChain === 'base' ? 'Base' : 'Sonic';
  };

  const getNativeSymbol = () => {
    return getCurrentChainConfig().nativeSymbol;
  };

  const isUsingWalletAddress = username === account;

  if (account) {
    return (
      <div className="flex flex-col gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-2 bg-black/30 p-2 rounded-lg cursor-pointer">
                <div className="flex items-center justify-center w-10 h-10 bg-black/50 rounded-full overflow-hidden">
                  {!imageError ? (
                    <Image 
                      src={getChainIcon()} 
                      alt={`${getChainName()} Chain`} 
                      width={32} 
                      height={32} 
                      className="w-8 h-8 object-contain"
                      onError={() => {
                        console.log('Image load error for:', getChainIcon());
                        setImageError(true);
                      }}
                      priority
                    />
                  ) : (
                    <div className={`w-8 h-8 rounded-full ${currentChain === 'base' ? 'bg-blue-500' : 'bg-orange-500'} flex items-center justify-center text-white text-xs font-bold`}>
                      {currentChain === 'base' ? 'B' : 'S'}
                    </div>
                  )}
                </div>
              <div className="flex flex-col text-left">
                <span className="text-white font-bold text-sm leading-tight">{username}</span>
                <span className="text-accent font-bold text-md leading-tight">{sBalance} {getNativeSymbol()}</span>
                <span className="text-accent font-bold text-md leading-tight">{arcBalance} ARC</span>
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64" align="end">
            <DropdownMenuLabel>My Account - {getChainName()} Chain</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>
              <span className="font-bold text-accent">{sBalance} {getNativeSymbol()}</span>
              <span className="font-bold text-accent">{arcBalance} ARC</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Switch Chain</DropdownMenuLabel>
            <DropdownMenuItem 
              onSelect={() => handleChainSwitch('sonic')} 
              disabled={currentChain === 'sonic' || isSwitchingChain}
              className={currentChain === 'sonic' ? 'bg-accent/10' : ''}
            >
              <Image src="/sonic_icon.png" alt="Sonic" width={16} height={16} className="mr-2 w-4 h-4" />
              <span>Sonic Network</span>
              {currentChain === 'sonic' && <span className="ml-auto text-xs text-accent">Active</span>}
            </DropdownMenuItem>
            <DropdownMenuItem 
              onSelect={() => handleChainSwitch('base')} 
              disabled={currentChain === 'base' || isSwitchingChain}
              className={currentChain === 'base' ? 'bg-accent/10' : ''}
            >
              <Image src="/base_icon.png" alt="Base" width={16} height={16} className="mr-2 w-4 h-4" />
              <span>Base Mainnet</span>
              {currentChain === 'base' && <span className="ml-auto text-xs text-accent">Active</span>}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => {
              // Use proper navigation instead of window.location
              if (typeof window !== 'undefined') {
                window.history.pushState({}, '', '/profile');
                window.location.reload();
              }
            }}>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setIsEditingUsername(true)}>
              <Edit className="mr-2 h-4 w-4" />
              <span>Edit Username</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={handleDisconnect}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Disconnect</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        {(isUsingWalletAddress || isEditingUsername) && (
          <div className="bg-black/30 p-3 rounded-lg">
            {isEditingUsername ? (
              <div className="flex flex-col gap-2">
                <Input
                  placeholder="Enter your username"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="bg-black/50 border-accent/40 text-white"
                  onKeyPress={(e) => e.key === 'Enter' && handleUsernameSubmit()}
                />
                <div className="flex gap-2">
                  <Button 
                    onClick={handleUsernameSubmit} 
                    size="sm" 
                    className="flex-1 bg-accent hover:bg-accent/80 text-black"
                    disabled={!newUsername.trim()}
                  >
                    Save
                  </Button>
                  <Button 
                    onClick={handleUsernameCancel} 
                    size="sm" 
                    variant="outline" 
                    className="flex-1 border-accent/40 text-accent hover:bg-accent/10"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button 
                onClick={() => setIsEditingUsername(true)} 
                variant="ghost" 
                size="sm" 
                className="w-full justify-start text-accent border border-accent/40 hover:border-accent/60"
              >
                <User className="mr-2 h-4 w-4" />
                <span>Set Username</span>
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <Button onClick={connect} variant="ghost" size="lg" className="w-full justify-start text-lg h-12 text-white font-headline border border-white/40 hover:border-white/60 pl-2">
      <Wallet className="mr-2 h-5 w-5" />
      <span>Connect Wallet</span>
    </Button>
  );
};
