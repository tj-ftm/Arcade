"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Menu, X, Settings, BarChart, Ticket } from "lucide-react";
import { ConnectWallet } from '@/components/web3/ConnectWallet';
import { cn } from '@/lib/utils';

interface MobileSidebarProps {
  onNavigate: (view: 'leaderboard' | 'settings') => void;
  theme?: string;

}

export function MobileSidebar({ onNavigate, theme }: MobileSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = () => setIsOpen(!isOpen);
  const closeSidebar = () => setIsOpen(false);

  const handleNavigation = (view: 'leaderboard' | 'settings') => {
    onNavigate(view);
    closeSidebar();
  };

  const getThemeBackground = (theme?: string) => {
    switch (theme) {
      case 'chess':
        return 'linear-gradient(to bottom right, #581c87, #7c3aed, #6366f1)';
      case 'snake':
        return 'linear-gradient(to bottom right, #166534, #16a34a, #22c55e)';
      case 'shop':
        return 'linear-gradient(to bottom right, #d97706, #f59e0b, #fbbf24)';
      default:
        return 'linear-gradient(to bottom right, #7f1d1d, #991b1b, #dc2626)';
    }
  };



  return (
    <>
      {/* Hamburger Menu Button */}
      <Button
        onClick={toggleSidebar}
        variant="ghost"
        size="default"
        className="md:hidden text-white bg-black/30 hover:text-white hover:bg-black/50 border border-white/40 hover:border-white/60 z-[99999] transition-all duration-200 px-4 py-2"
      >
        <Menu className="h-6 w-6" />
      </Button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[99998] md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-0 z-[99999] md:hidden transition-transform duration-300 ease-in-out transform-gpu",
          isOpen ? "translate-x-0" : "-translate-x-full",
          !isOpen && "pointer-events-none"
        )}
        style={{
          background: getThemeBackground(theme),
          backdropFilter: 'blur(10px)',
          width: '100vw',
          height: '100vh',
          left: 0,
          top: 0,
          visibility: isOpen ? 'visible' : 'hidden'
        }}
      >
        <div className="flex flex-col h-full p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-headline text-accent">Menu</h2>
            <Button
              onClick={closeSidebar}
              variant="ghost"
              size="icon"
              className="text-white bg-black/30 hover:text-white hover:bg-black/50 border border-white/40 hover:border-white/60 transition-all duration-200"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>

          {/* Menu Items */}
          <div className={cn(
            "flex flex-col gap-2 rounded-lg",
            (theme === 'snake' || theme === 'chess') ? 'bg-transparent' : 'bg-red-800'
          )}>
            {/* Wallet Connect */}
            <div>
              <ConnectWallet />
            </div>



            {/* Leaderboard */}
            <Button
              onClick={() => handleNavigation('leaderboard')}
              variant="ghost"
              className="w-full justify-start text-lg h-12 text-accent font-headline border border-accent/40 hover:border-accent/60 pl-2"
            >
              <BarChart className="mr-3 h-5 w-5" />
              Leaderboard
            </Button>

            {/* Settings */}
            <Button
              onClick={() => handleNavigation('settings')}
              variant="ghost"
              className="w-full justify-start text-lg h-12 text-accent font-headline border border-accent/40 hover:border-accent/60 transition-all duration-200 pl-2"
            >
              <Settings className="mr-3 h-5 w-5" />
              Settings
            </Button>
          </div>


        </div>
      </div>
    </>
  );
}