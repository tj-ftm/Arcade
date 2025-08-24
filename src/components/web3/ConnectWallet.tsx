
"use client";

import { Wallet, LogOut, User, DollarSign, Gem } from "lucide-react";
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

export const ConnectWallet = () => {

  const { account, connect, disconnect, sBalance, arcBalance, username } = useWeb3();
  
  const handleDisconnect = async () => {
    try {
      await disconnect();
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    }
  };

  if (username) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="flex items-center gap-2 bg-black/30 p-2 rounded-lg cursor-pointer">
              <div className="flex items-center justify-center w-10 h-10 bg-black/50 rounded-full">
                <Wallet className="h-5 w-5 text-primary/70" />
              </div>
            <div className="flex flex-col text-right">
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
          <DropdownMenuItem onSelect={handleDisconnect}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Disconnect</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Button onClick={connect} variant="ghost" size="lg" className="w-full justify-start text-lg h-12 text-white font-headline border border-white/40 hover:border-white/60 transition-all duration-200">
      <Wallet className="mr-2 h-5 w-5 sm:mr-0" />
      <span>Connect Wallet</span>
    </Button>

  );
};
