
"use client";

import { useWeb3 } from "./Web3Provider";
import { Button } from "@/components/ui/button";
import { LogOut, Wallet } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const ConnectWallet = () => {
  const { connect, disconnect, balance, username } = useWeb3();

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
              <span className="text-accent font-bold text-md leading-tight">{balance} S</span>
            </div>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>
            <span className="font-bold text-accent">{balance} S</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={disconnect}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Disconnect</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Button onClick={connect} className="font-headline text-lg rounded-lg">
      <Wallet className="mr-2 h-5 w-5" />
      Connect Wallet
    </Button>
  );
};
