"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft, Home, Gamepad2, Users, Trophy, Zap, Target, Crown } from "lucide-react";
import { useState } from "react";

interface DocsPageProps {
  onBack?: () => void;
}

export default function DocsPage({ onBack }: DocsPageProps) {
  const [activeSection, setActiveSection] = useState<string>("");

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setActiveSection(sectionId);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-sm border-b border-white/10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-center">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl sm:text-3xl font-headline text-white uppercase tracking-wider" style={{ WebkitTextStroke: '1px black' }}>
              📚 Game Documentation
            </h1>
            <div className="flex items-center gap-2">
              <Gamepad2 className="w-6 h-6 text-blue-400" />
              <span className="text-sm text-gray-300 font-headline">v1.0</span>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full h-full max-w-4xl animate-fade-in my-auto mx-auto px-4 py-8 pt-24">
        {/* Table of Contents */}
        <div className="mb-12 bg-black/50 rounded-xl p-6 border-2 border-white/20 hover:border-white/40 transition-all duration-300">
          <h2 className="text-3xl sm:text-4xl font-headline text-yellow-500 uppercase tracking-wider mb-6 flex items-center gap-3" style={{ WebkitTextStroke: '1px black' }}>
            📌 Table of Contents
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { id: 'uno', name: '🃏 UNO', color: 'from-red-500 to-red-600' },
              { id: 'chess', name: '♟️ Chess', color: 'from-purple-500 to-purple-600' },
              { id: 'snake', name: '🐍 Snake', color: 'from-green-500 to-green-600' },
              { id: 'pool', name: '🎱 8-Ball Pool', color: 'from-blue-500 to-blue-600' }
            ].map((game) => (
              <Button
                key={game.id}
                onClick={() => scrollToSection(game.id)}
                className={`h-16 text-lg font-semibold bg-gradient-to-r ${game.color} hover:scale-105 transition-all duration-300 shadow-lg`}
              >
                {game.name}
              </Button>
            ))}
          </div>
        </div>

        {/* UNO Section */}
        <section id="uno" className="mb-16 scroll-mt-20">
          <div className="bg-black/50 rounded-xl p-8 border-2 border-red-500/30 hover:border-red-500/60 transition-all duration-300">
            <h2 className="text-4xl sm:text-5xl font-headline text-red-500 uppercase tracking-wider mb-6 flex items-center gap-3" style={{ WebkitTextStroke: '2px black' }}>
              🃏 UNO
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h3 className="text-2xl sm:text-3xl font-headline text-yellow-500 uppercase tracking-wider mb-4 flex items-center gap-2" style={{ WebkitTextStroke: '1px black' }}>
                  📖 Overview
                </h3>
                <p className="text-white/70 mb-6 leading-relaxed text-sm sm:text-base">
                  The classic card game UNO brought to life in digital form! Match colors and numbers, use action cards strategically, and be the first to get rid of all your cards. Features both single-player AI and real-time multiplayer modes.
                </p>

                <h3 className="text-2xl sm:text-3xl font-headline text-green-500 uppercase tracking-wider mb-4 flex items-center gap-2" style={{ WebkitTextStroke: '1px black' }}>
                  🎮 How to Play
                </h3>
                <ul className="space-y-2 text-white/70 mb-6 text-sm sm:text-base">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-1">•</span>
                    <span><strong className="font-headline">Match cards</strong> by color or number with the top card</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-1">•</span>
                    <span><strong className="font-headline">Action Cards:</strong> Skip (⏭️), Reverse (🔄), Draw Two (+2)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-1">•</span>
                    <span><strong className="font-headline">Wild Cards:</strong> Change color, Draw Four (+4)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-1">•</span>
                    <span><strong className="font-headline">Call UNO</strong> when you have one card left!</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-1">•</span>
                    <span><strong className="font-headline">Click cards</strong> to play them</span>
                  </li>
                </ul>

                <h3 className="text-2xl sm:text-3xl font-headline text-purple-500 uppercase tracking-wider mb-4 flex items-center gap-2" style={{ WebkitTextStroke: '1px black' }}>
                  💡 Tips & Strategies
                </h3>
                <ul className="space-y-2 text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-400 mt-1">⚡</span>
                    <span>Save Wild cards for crucial moments</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-400 mt-1">🎯</span>
                    <span>Watch opponent's card count closely</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-400 mt-1">🔄</span>
                    <span>Use Reverse cards strategically in multiplayer</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-400 mt-1">🚀</span>
                    <span>Don't forget to call UNO!</span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  🖼️ <span className="text-cyan-400">Game Modes</span>
                </h3>
                <div className="bg-black/30 rounded-lg p-4 mb-6">
                  <div className="aspect-video bg-gradient-to-br from-red-500/20 to-yellow-500/20 rounded-lg flex items-center justify-center border border-red-500/30">
                    <div className="text-center">
                      <Gamepad2 className="w-16 h-16 mx-auto mb-2 text-red-400" />
                      <p className="text-sm text-gray-300">UNO Game Interface</p>
                    </div>
                  </div>
                </div>

                <h3 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  🧩 <span className="text-green-400">Features</span>
                </h3>
                <ul className="space-y-2 text-gray-300 mb-6">
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✅</span>
                    <span>Single-player vs AI</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✅</span>
                    <span>Real-time multiplayer</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✅</span>
                    <span>Gambling modes</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✅</span>
                    <span>Token rewards</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✅</span>
                    <span>Animated card effects</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✅</span>
                    <span>Game statistics</span>
                  </li>
                </ul>

                <h3 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  🔗 <span className="text-blue-400">Game Modes</span>
                </h3>
                <ul className="space-y-2 text-gray-300">
                  <li className="flex items-center gap-2">
                    <span className="text-blue-400">🆓</span>
                    <span>Free Play - Practice mode</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">💰</span>
                    <span>Pay & Play - Earn tokens</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-purple-400">🎲</span>
                    <span>Simple Gamble - Quick bets</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-yellow-400">🏆</span>
                    <span>Advanced Gamble - High stakes</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Chess Section */}
        <section id="chess" className="mb-16 scroll-mt-20">
          <div className="bg-black/50 rounded-xl p-8 border-2 border-purple-500/30 hover:border-purple-500/60 transition-all duration-300">
            <h2 className="text-4xl sm:text-5xl font-headline text-purple-500 uppercase tracking-wider mb-6 flex items-center gap-3" style={{ WebkitTextStroke: '2px black' }}>
              ♟️ Chess
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h3 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  📖 <span className="text-yellow-400">Overview</span>
                </h3>
                <p className="text-gray-300 mb-6 leading-relaxed">
                  The timeless strategy game of Chess! Command your army of pieces in tactical warfare. Features both single-player against AI and real-time multiplayer battles with players worldwide.
                </p>

                <h3 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  🎮 <span className="text-green-400">How to Play</span>
                </h3>
                <ul className="space-y-2 text-gray-300 mb-6">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-1">•</span>
                    <span><strong>Click to select</strong> a piece, then click destination</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-1">•</span>
                    <span><strong>Pawns:</strong> Move forward, capture diagonally</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-1">•</span>
                    <span><strong>Rooks:</strong> Move horizontally/vertically</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-1">•</span>
                    <span><strong>Bishops:</strong> Move diagonally</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-1">•</span>
                    <span><strong>Knights:</strong> L-shaped moves</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-1">•</span>
                    <span><strong>Queen:</strong> Combines rook + bishop</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-1">•</span>
                    <span><strong>King:</strong> One square in any direction</span>
                  </li>
                </ul>

                <h3 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  💡 <span className="text-purple-400">Tips & Strategies</span>
                </h3>
                <ul className="space-y-2 text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-400 mt-1">🏰</span>
                    <span>Castle early to protect your king</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-400 mt-1">⚔️</span>
                    <span>Control the center of the board</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-400 mt-1">🎯</span>
                    <span>Develop pieces before attacking</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-400 mt-1">👑</span>
                    <span>Always think 3 moves ahead</span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  🖼️ <span className="text-cyan-400">Game Board</span>
                </h3>
                <div className="bg-black/30 rounded-lg p-4 mb-6">
                  <div className="aspect-square bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg flex items-center justify-center border border-purple-500/30">
                    <div className="text-center">
                      <Crown className="w-16 h-16 mx-auto mb-2 text-purple-400" />
                      <p className="text-sm text-gray-300">Chess Board Interface</p>
                    </div>
                  </div>
                </div>

                <h3 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  🧩 <span className="text-green-400">Features</span>
                </h3>
                <ul className="space-y-2 text-gray-300 mb-6">
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✅</span>
                    <span>Single-player vs AI</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✅</span>
                    <span>Real-time multiplayer</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✅</span>
                    <span>Move validation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✅</span>
                    <span>Check/Checkmate detection</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✅</span>
                    <span>Game history</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✅</span>
                    <span>Piece animations</span>
                  </li>
                </ul>

                <h3 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  🔗 <span className="text-blue-400">Special Moves</span>
                </h3>
                <ul className="space-y-2 text-gray-300">
                  <li className="flex items-center gap-2">
                    <span className="text-blue-400">🏰</span>
                    <span>Castling - King & Rook swap</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">👻</span>
                    <span>En Passant - Pawn capture</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-purple-400">👑</span>
                    <span>Pawn Promotion - Upgrade pieces</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Snake Section */}
        <section id="snake" className="mb-16 scroll-mt-20">
          <div className="bg-black/50 rounded-xl p-8 border-2 border-green-500/30 hover:border-green-500/60 transition-all duration-300">
            <h2 className="text-4xl sm:text-5xl font-headline text-green-500 uppercase tracking-wider mb-6 flex items-center gap-3" style={{ WebkitTextStroke: '2px black' }}>
              🐍 Snake
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h3 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  📖 <span className="text-yellow-400">Overview</span>
                </h3>
                <p className="text-gray-300 mb-6 leading-relaxed">
                  The classic arcade game Snake! Guide your serpent to eat food and grow longer while avoiding walls and your own tail. A simple yet addictive game that tests your reflexes and planning skills.
                </p>

                <h3 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  🎮 <span className="text-green-400">How to Play</span>
                </h3>
                <ul className="space-y-2 text-gray-300 mb-6">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-1">•</span>
                    <span><strong>Arrow Keys</strong> or <strong>WASD</strong> to move</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-1">•</span>
                    <span><strong>Eat food</strong> (🍎) to grow and score points</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-1">•</span>
                    <span><strong>Avoid walls</strong> and your own tail</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-1">•</span>
                    <span><strong>Speed increases</strong> as you grow</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-1">•</span>
                    <span><strong>Spacebar</strong> to pause/resume</span>
                  </li>
                </ul>

                <h3 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  💡 <span className="text-purple-400">Tips & Strategies</span>
                </h3>
                <ul className="space-y-2 text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-400 mt-1">🎯</span>
                    <span>Plan your path before moving</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-400 mt-1">🌀</span>
                    <span>Use the edges to create safe zones</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-400 mt-1">⚡</span>
                    <span>Don't rush - patience is key</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-400 mt-1">🔄</span>
                    <span>Create spirals to manage space</span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  🖼️ <span className="text-cyan-400">Game Arena</span>
                </h3>
                <div className="bg-black/30 rounded-lg p-4 mb-6">
                  <div className="aspect-square bg-gradient-to-br from-green-500/20 to-lime-500/20 rounded-lg flex items-center justify-center border border-green-500/30">
                    <div className="text-center">
                      <Target className="w-16 h-16 mx-auto mb-2 text-green-400" />
                      <p className="text-sm text-gray-300">Snake Game Arena</p>
                    </div>
                  </div>
                </div>

                <h3 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  🧩 <span className="text-green-400">Features</span>
                </h3>
                <ul className="space-y-2 text-gray-300 mb-6">
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✅</span>
                    <span>Classic gameplay</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✅</span>
                    <span>Progressive difficulty</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✅</span>
                    <span>High score tracking</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✅</span>
                    <span>Smooth animations</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✅</span>
                    <span>Pause functionality</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✅</span>
                    <span>Responsive controls</span>
                  </li>
                </ul>

                <h3 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  🔗 <span className="text-blue-400">Scoring System</span>
                </h3>
                <ul className="space-y-2 text-gray-300">
                  <li className="flex items-center gap-2">
                    <span className="text-blue-400">🍎</span>
                    <span>+10 points per food eaten</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">⚡</span>
                    <span>Speed bonus multiplier</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-purple-400">🏆</span>
                    <span>Length achievement bonuses</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* 8-Ball Pool Section */}
        <section id="pool" className="mb-16 scroll-mt-20">
          <div className="bg-black/50 rounded-xl p-8 border-2 border-blue-500/30 hover:border-blue-500/60 transition-all duration-300">
            <h2 className="text-4xl sm:text-5xl font-headline text-blue-500 uppercase tracking-wider mb-6 flex items-center gap-3" style={{ WebkitTextStroke: '2px black' }}>
              🎱 8-Ball Pool
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h3 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  📖 <span className="text-yellow-400">Overview</span>
                </h3>
                <p className="text-gray-300 mb-6 leading-relaxed">
                  Professional 8-Ball Pool with realistic physics! Pot your designated balls (solids or stripes) and finish with the 8-ball. Features both single-player practice and competitive multiplayer matches.
                </p>

                <h3 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  🎮 <span className="text-green-400">How to Play</span>
                </h3>
                <ul className="space-y-2 text-gray-300 mb-6">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-1">•</span>
                    <span><strong>Aim</strong> by moving your mouse around the cue ball</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-1">•</span>
                    <span><strong>Click and drag</strong> to set power, release to shoot</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-1">•</span>
                    <span><strong>First ball potted</strong> determines your group (solids/stripes)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-1">•</span>
                    <span><strong>Pot all your balls</strong> before attempting the 8-ball</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-1">•</span>
                    <span><strong>Call your pocket</strong> for the 8-ball to win</span>
                  </li>
                </ul>

                <h3 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  💡 <span className="text-purple-400">Tips & Strategies</span>
                </h3>
                <ul className="space-y-2 text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-400 mt-1">🎯</span>
                    <span>Plan your next shot while shooting</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-400 mt-1">🔄</span>
                    <span>Use spin to control cue ball position</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-400 mt-1">🛡️</span>
                    <span>Play defensively when no clear shots</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-400 mt-1">⚡</span>
                    <span>Control your power - soft shots often work better</span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  🖼️ <span className="text-cyan-400">Pool Table</span>
                </h3>
                <div className="bg-black/30 rounded-lg p-4 mb-6">
                  <div className="aspect-video bg-gradient-to-br from-blue-500/20 to-green-500/20 rounded-lg flex items-center justify-center border border-blue-500/30">
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-2 bg-gradient-to-br from-blue-400 to-green-400 rounded-full flex items-center justify-center">
                        <span className="text-2xl">🎱</span>
                      </div>
                      <p className="text-sm text-gray-300">Pool Table Interface</p>
                    </div>
                  </div>
                </div>

                <h3 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  🧩 <span className="text-green-400">Features</span>
                </h3>
                <ul className="space-y-2 text-gray-300 mb-6">
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✅</span>
                    <span>Realistic physics engine</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✅</span>
                    <span>Single-player practice</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✅</span>
                    <span>Real-time multiplayer</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✅</span>
                    <span>Ball collision physics</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✅</span>
                    <span>Cue stick aiming system</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✅</span>
                    <span>Tournament scoring</span>
                  </li>
                </ul>

                <h3 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  🔗 <span className="text-blue-400">Game Rules</span>
                </h3>
                <ul className="space-y-2 text-gray-300">
                  <li className="flex items-center gap-2">
                    <span className="text-blue-400">🔴</span>
                    <span>Solids (1-7) vs Stripes (9-15)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">⚫</span>
                    <span>8-ball must be potted last</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-purple-400">❌</span>
                    <span>Fouls: Scratch, wrong ball, no contact</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-yellow-400">🏆</span>
                    <span>Win: Pot 8-ball after clearing your group</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center py-8 border-t border-white/20">
          <div className="flex items-center justify-center gap-4 mb-4">
            <Gamepad2 className="w-8 h-8 text-blue-400" />
            <h3 className="text-2xl sm:text-3xl font-headline text-white uppercase tracking-wider" style={{ WebkitTextStroke: '1px black' }}>
              Retro Arcade
            </h3>
            <Users className="w-8 h-8 text-purple-400" />
          </div>
          <p className="text-white/70 mb-2 font-headline text-sm sm:text-base">
            🎮 The ultimate gaming destination with classic and modern games
          </p>
          <p className="text-white/50 text-xs sm:text-sm font-headline">
            Built with ❤️ for gamers worldwide • Version 1.0
          </p>
        </footer>
      </div>
    </div>
  );
}