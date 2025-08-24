"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Menu, X, Settings, BarChart, Ticket } from "lucide-react";
import { ConnectWallet } from '@/components/web3/ConnectWallet';
import { cn } from '@/lib/utils';

interface MobileSidebarProps {
  onNavigate: (view: 'leaderboard' | 'settings') => void;
  onMintArc: () => void;
}

export function MobileSidebar({ onNavigate, onMintArc }: MobileSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = () => setIsOpen(!isOpen);
  const closeSidebar = () => setIsOpen(false);

  const handleNavigation = (view: 'leaderboard' | 'settings') => {
    onNavigate(view);
    closeSidebar();
  };

  const handleMintArc = () => {
    onMintArc();
    closeSidebar();
  };

  return (
    <>
      {/* Hamburger Menu Button */}
      <Button
        onClick={toggleSidebar}
        variant="ghost"
        size="icon"
        className="md:hidden text-white/70 hover:text-white hover:bg-white/10 z-50"
      >
        <Menu className="h-6 w-6" />
      </Button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full w-80 bg-black/90 backdrop-blur-sm border-l border-primary/50 z-50 transform transition-transform duration-300 ease-in-out md:hidden",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex flex-col h-full p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-headline text-accent">Menu</h2>
            <Button
              onClick={closeSidebar}
              variant="ghost"
              size="icon"
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>

          {/* Menu Items */}
          <div className="flex flex-col space-y-4">
            {/* Wallet Connect */}
            <div className="mb-4">
              <ConnectWallet />
            </div>

            {/* Mint 1 ARC */}
            <Button
              onClick={handleMintArc}
              variant="outline"
              className="w-full justify-start text-lg h-12 bg-transparent border-primary/50 text-white hover:bg-primary/20 font-headline"
            >
              <Ticket className="mr-3 h-5 w-5" />
              Mint 1 ARC
            </Button>

            {/* Leaderboard */}
            <Button
              onClick={() => handleNavigation('leaderboard')}
              variant="outline"
              className="w-full justify-start text-lg h-12 bg-transparent border-primary/50 text-white hover:bg-primary/20 font-headline"
            >
              <BarChart className="mr-3 h-5 w-5" />
              Leaderboard
            </Button>

            {/* Settings */}
            <Button
              onClick={() => handleNavigation('settings')}
              variant="outline"
              className="w-full justify-start text-lg h-12 bg-transparent border-primary/50 text-white hover:bg-primary/20 font-headline"
            >
              <Settings className="mr-3 h-5 w-5" />
              Settings
            </Button>
          </div>

          {/* Footer */}
          <div className="mt-auto pt-8">
            <div className="text-center text-white/50 text-sm">
              <p className="font-headline">Sonic Arcade</p>
              <p className="text-xs">Play • Earn • Compete</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}