"use client";

import { Loader2, Users } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { MenuLayout } from "@/components/layout/MenuLayout";

export default function MultiplayerPage() {
  const [isSearching, setIsSearching] = useState(false);

  const handleFindMatch = () => {
    setIsSearching(true);
    setTimeout(() => {
      setIsSearching(false);
    }, 5000);
  };

  return (
    <MenuLayout>
      <div className="w-full max-w-md z-10 text-center my-auto animate-fade-in">
        <div className="bg-black/50 p-8 rounded-xl">
          <h1 className="text-6xl font-headline uppercase tracking-wider mb-2 text-accent">Multiplayer</h1>
          <p className="text-white/70 mb-8 text-lg">Challenge players from around the world!</p>

          <div className="space-y-6">
            {isSearching ? (
              <div className="flex flex-col items-center space-y-4">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
                <p className="text-xl font-semibold">Searching for opponent...</p>
                <p className="text-md text-muted-foreground">Pairing you with a worthy adversary.</p>
                <Progress value={33} className="w-full animate-pulse" />
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-4">
                <Users className="h-24 w-24 text-primary" />
                <p className="text-xl">Ready to play?</p>
                <Button size="lg" onClick={handleFindMatch} className="w-full h-16 text-2xl font-headline rounded-lg">
                  Find Match
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </MenuLayout>
  );
}
