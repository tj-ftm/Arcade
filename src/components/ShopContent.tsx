import { ArrowLeft, Play, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";

const ShopContent = ({ onBack }: { onBack: () => void }) => {
  return (
    <div className="w-full h-full max-w-4xl z-10 animate-fade-in my-auto overflow-y-auto">
      <div className="bg-black/50 p-8 rounded-xl">
        <h1 className="text-8xl font-headline text-center uppercase tracking-wider mb-2 text-accent" style={{ WebkitTextStroke: '4px black' }}>Shop</h1>
        <p className="text-white/70 text-center mb-8 text-lg">Browse and buy in-game cosmetics!</p>

        {/* Shop Categories */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-black/30 p-6 rounded-xl text-center">
            <h2 className="text-4xl font-headline text-accent mb-2" style={{ WebkitTextStroke: '2px black' }}>UNO</h2>
            <p className="text-white/70 mb-4">Custom card backs, avatars, and more!</p>
            <Button size="lg" className="w-full h-12 text-xl font-headline rounded-lg">
              <Play className="mr-2" /> Browse UNO
            </Button>
          </div>
          <div className="bg-black/30 p-6 rounded-xl text-center">
            <h2 className="text-4xl font-headline text-accent mb-2" style={{ WebkitTextStroke: '2px black' }}>SNAKE</h2>
            <p className="text-white/70 mb-4">Unique snake skins and trail effects!</p>
            <Button size="lg" className="w-full h-12 text-xl font-headline rounded-lg">
              <Play className="mr-2" /> Browse Snake
            </Button>
          </div>
          <div className="bg-black/30 p-6 rounded-xl text-center">
            <h2 className="text-4xl font-headline text-accent mb-2" style={{ WebkitTextStroke: '2px black' }}>CHESS</h2>
            <p className="text-white/70 mb-4">Exclusive chess piece sets and board designs!</p>
            <Button size="lg" className="w-full h-12 text-xl font-headline rounded-lg">
              <Play className="mr-2" /> Browse Chess
            </Button>
          </div>
        </div>

        {/* Featured Items */}
        <h2 className="text-6xl font-headline text-accent mb-6 text-center" style={{ WebkitTextStroke: '3px black' }}>Featured Items</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Example Shop Item */}
          <div className="bg-black/30 rounded-xl p-6 flex flex-col items-center">
            <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg mb-4 flex items-center justify-center">
              <span className="text-2xl font-bold text-black">UNO</span>
            </div>
            <h3 className="text-2xl font-headline text-white mb-2">Golden Card Back</h3>
            <p className="text-white/70 text-center mb-4">A shimmering card back for Uno.</p>
            <p className="text-accent text-2xl font-bold mb-4">100 ARC</p>
            <Button size="lg" className="w-full h-12 text-xl font-headline rounded-lg bg-green-600 hover:bg-green-700">
              <Ticket className="mr-2" /> Buy Now
            </Button>
          </div>
          <div className="bg-black/30 rounded-xl p-6 flex flex-col items-center">
            <div className="w-24 h-24 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg mb-4 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">🐍</span>
            </div>
            <h3 className="text-2xl font-headline text-white mb-2">Neon Snake Skin</h3>
            <p className="text-white/70 text-center mb-4">Glow in the dark snake trail.</p>
            <p className="text-accent text-2xl font-bold mb-4">150 ARC</p>
            <Button size="lg" className="w-full h-12 text-xl font-headline rounded-lg bg-green-600 hover:bg-green-700">
              <Ticket className="mr-2" /> Buy Now
            </Button>
          </div>
          <div className="bg-black/30 rounded-xl p-6 flex flex-col items-center">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg mb-4 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">♔</span>
            </div>
            <h3 className="text-2xl font-headline text-white mb-2">Royal Chess Set</h3>
            <p className="text-white/70 text-center mb-4">Elegant golden chess pieces.</p>
            <p className="text-accent text-2xl font-bold mb-4">200 ARC</p>
            <Button size="lg" className="w-full h-12 text-xl font-headline rounded-lg bg-green-600 hover:bg-green-700">
              <Ticket className="mr-2" /> Buy Now
            </Button>
          </div>
        </div>

        <div className="flex justify-center">
          <Button onClick={onBack} variant="secondary" size="lg" className="font-headline text-xl">
            <ArrowLeft className="mr-2 h-5 w-5" /> Back to Menu
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ShopContent;