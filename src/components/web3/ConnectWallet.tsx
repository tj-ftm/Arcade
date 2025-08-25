
"use client";

import { Wallet, LogOut, User, DollarSign, Gem, Edit } from "lucide-react";
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

export const ConnectWallet = () => {
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState("");

  const { account, connect, disconnect, sBalance, arcBalance, username, setUsername } = useWeb3();
  
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

  const isUsingWalletAddress = username === account;

  if (account) {
    return (
      <div className="flex flex-col gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-2 bg-black/30 p-2 rounded-lg cursor-pointer">
                <div className="flex items-center justify-center w-10 h-10 bg-black/50 rounded-full">
                  <Wallet className="h-5 w-5 text-primary/70" />
                </div>
              <div className="flex flex-col text-left">
                <span className="text-white font-bold text-sm leading-tight">{username}</span>
                <span className="text-accent font-bold text-md leading-tight">{sBalance} S</span>
                <span className="text-accent font-bold text-md leading-tight">{arcBalance} ARC</span>
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>
              <span className="font-bold text-accent">{sBalance} S</span>
              <span className="font-bold text-accent">{arcBalance} ARC</span>
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
