"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Menu, X, Settings, BarChart, Ticket, Coins, FileText, BookOpen, TrendingUp } from "lucide-react";
import { ConnectWallet } from '@/components/web3/ConnectWallet';
import { cn } from '@/lib/utils';

interface MobileSidebarProps {
  onNavigate: (view: 'leaderboard' | 'settings' | 'tokenomics' | 'docs' | 'volume-bot') => void;
  theme?: string;
  onShowGameLog?: () => void;
  showGameLogButton?: boolean;
}

export function MobileSidebar({ onNavigate, theme, onShowGameLog, showGameLogButton }: MobileSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = () => setIsOpen(!isOpen);
  const closeSidebar = () => setIsOpen(false);

  const handleNavigation = (view: 'leaderboard' | 'settings' | 'tokenomics' | 'docs' | 'volume-bot') => {
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
      case 'leaderboard':
        return 'linear-gradient(to bottom right, #2563eb, #1d4ed8, #1e40af)';
      case 'profile':
        return 'linear-gradient(to bottom right, #65a30d, #16a34a, #15803d)';
      case 'tokenomics':
        return 'linear-gradient(to bottom right, #fb923c, #f97316, #ea580c)';
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
        className="text-white bg-black/30 hover:text-white hover:bg-black/50 border border-white/40 hover:border-white/60 z-[99999] transition-all duration-200 px-4 py-2"
      >
        <Menu className="h-6 w-6" />
      </Button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[99998]"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-0 z-[99999] transition-transform duration-300 ease-in-out transform-gpu",
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
            <h2 className="text-2xl font-headline text-white">Menu</h2>
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
            (theme === 'snake' || theme === 'chess') ? 'bg-transparent' : 'bg-transparent'
          )}>
            {/* Wallet Connect */}
            <div>
              <ConnectWallet />
            </div>

            {/* Game Log Button - Only show in chess multiplayer */}
            {showGameLogButton && onShowGameLog && (
              <Button
                onClick={() => {
                  onShowGameLog();
                  closeSidebar();
                }}
                variant="ghost"
                className="w-full justify-start text-lg h-12 text-white font-headline border border-white/40 hover:border-white/60 transition-all duration-200 pl-2"
              >
                <FileText className="mr-3 h-5 w-5" />
                Game Log
              </Button>
            )}

            {/* Leaderboard */}
            <Button
              onClick={() => handleNavigation('leaderboard')}
              variant="ghost"
              className="w-full justify-start text-lg h-12 text-white font-headline border border-white/40 hover:border-white/60 pl-2"
            >
              <BarChart className="mr-3 h-5 w-5" />
              Leaderboard
            </Button>

            {/* Tokenomics */}
            <Button
              onClick={() => handleNavigation('tokenomics')}
              variant="ghost"
              className="w-full justify-start text-lg h-12 text-white font-headline border border-white/40 hover:border-white/60 transition-all duration-200 pl-2"
            >
              <Coins className="mr-3 h-5 w-5" />
              Tokenomics
            </Button>

            {/* Volume Bot */}
            <Button
              onClick={() => handleNavigation('volume-bot')}
              variant="ghost"
              className="w-full justify-start text-lg h-12 text-white font-headline border border-white/40 hover:border-white/60 transition-all duration-200 pl-2"
            >
              <TrendingUp className="mr-3 h-5 w-5" />
              Volume Bot
            </Button>

            {/* Documentation */}
            <Button
              onClick={() => handleNavigation('docs')}
              variant="ghost"
              className="w-full justify-start text-lg h-12 text-white font-headline border border-white/40 hover:border-white/60 transition-all duration-200 pl-2"
            >
              <BookOpen className="mr-3 h-5 w-5" />
              Documentation
            </Button>

            {/* Settings */}
            <Button
              onClick={() => handleNavigation('settings')}
              variant="ghost"
              className="w-full justify-start text-lg h-12 text-white font-headline border border-white/40 hover:border-white/60 transition-all duration-200 pl-2"
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