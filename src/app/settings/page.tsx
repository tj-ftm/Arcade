
"use client";

import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { MenuLayout } from "@/components/layout/MenuLayout";
import Link from "next/link";
import { useWeb3 } from "@/components/web3/Web3Provider";

type BackgroundSetting = "random" | "mountains" | "city" | "desert" | "beach" | "dojo" | "volcano";

export default function SettingsPage() {
  const { toast } = useToast();
  const { username, setUsername, account } = useWeb3();
  const [background, setBackground] = useState<BackgroundSetting>("random");
  const [currentUsername, setCurrentUsername] = useState(username);

  useEffect(() => {
    setCurrentUsername(username);
  }, [username]);
  
  useEffect(() => {
    const savedBg = localStorage.getItem("uno-bg-setting") as BackgroundSetting | null;
    if (savedBg) {
      setBackground(savedBg);
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem("uno-bg-setting", background);
    if(account && currentUsername) {
      setUsername(currentUsername);
    }
    toast({
      title: "Settings Saved",
      description: "Your preferences have been updated.",
    });
  };

  return (
    <MenuLayout>
      <div className="w-full max-w-lg z-10 my-auto animate-fade-in">
        <div className="bg-black/50 p-8 rounded-xl">
          <h1 className="text-6xl font-headline uppercase tracking-wider mb-2 text-accent">Options</h1>
          <p className="text-white/70 mb-8 text-lg">Adjust your game experience.</p>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Label htmlFor="username" className="text-xl">Username</Label>
              <Input 
                id="username"
                className="w-[180px] rounded-md"
                value={currentUsername || ""}
                onChange={(e) => setCurrentUsername(e.target.value)}
                placeholder="Enter a cool name..."
                disabled={!account}
              />
            </div>
             <div className="flex items-center justify-between">
              <Label htmlFor="difficulty" className="text-xl">Difficulty</Label>
              <Select defaultValue="medium">
                <SelectTrigger id="difficulty" className="w-[180px] rounded-md">
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="quality" className="text-xl">Graphics Quality</Label>
              <Select defaultValue="high">
                <SelectTrigger id="quality" className="w-[180px] rounded-md">
                  <SelectValue placeholder="Select quality" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="effects" className="text-xl">Particle Effects</Label>
              <Switch id="effects" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="music" className="text-xl">Background Music</Label>
              <Switch id="music" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="sfx" className="text-xl">Sound Effects</Label>
              <Switch id="sfx" defaultChecked />
            </div>
          </div>

          <div className="mt-8 flex justify-between items-center">
            <Link href="/">
                <Button variant="ghost" className="rounded-lg font-headline text-lg">
                    <ArrowLeft className="mr-2 h-5 w-5" /> Back
                </Button>
            </Link>
            <Button onClick={handleSave} className="rounded-lg font-headline text-lg">
              <Save className="mr-2 h-5 w-5" /> Save
            </Button>
          </div>
        </div>
      </div>
    </MenuLayout>
  );
}
