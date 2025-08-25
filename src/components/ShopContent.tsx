import { ArrowLeft, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";

const ShopContent = ({ onBack }: { onBack: () => void }) => {
  return (
      <div className="w-full h-full max-w-4xl animate-fade-in my-auto">
        <div className="w-full flex-1 flex flex-col items-center justify-center pt-8 sm:pt-8 px-2">
        <div className="grid grid-cols-2 sm:flex sm:flex-row sm:flex-wrap items-center justify-center gap-4 w-full max-w-xs sm:max-w-none mx-auto">
          <div className="sm:flex-1 animate-fade-in text-center">
            <div className="bg-black/50 py-2 px-2 sm:py-4 sm:px-3 rounded-xl h-[300px] flex flex-col justify-between border-2 border-yellow-500/30 hover:border-yellow-500/60 transition-all duration-300">
              <div className="pt-2 sm:pt-3">
                <div className="w-12 h-12 sm:w-24 sm:h-24 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg mb-2 mx-auto flex items-center justify-center">
                  <span className="text-lg sm:text-2xl font-bold text-black">UNO</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-headline text-yellow-500 uppercase tracking-wider mb-2" style={{ WebkitTextStroke: '2px black' }}>Golden Card</h1>
                <p className="text-white/70 mb-3 text-xs sm:text-sm">Premium card back design!</p>
              </div>
              <div className="space-y-2">
                <p className="text-accent text-lg sm:text-xl font-bold">100 ARC</p>
                <Button size="lg" className="w-full text-sm sm:text-lg h-10 sm:h-12 bg-green-600 hover:bg-green-500 rounded-lg font-headline group whitespace-normal leading-tight">
                  Buy
                </Button>
              </div>
            </div>
          </div>

          <div className="sm:flex-1 animate-fade-in text-center">
            <div className="bg-black/50 py-2 px-2 sm:py-4 sm:px-3 rounded-xl h-[360px] flex flex-col justify-between border-2 border-purple-500/30 hover:border-purple-500/60 transition-all duration-300">
              <div className="pt-2 sm:pt-3">
                <div className="w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg mb-2 mx-auto flex items-center justify-center">
                  <span className="text-lg sm:text-2xl font-bold text-white">🐍</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-headline text-purple-500 uppercase tracking-wider mb-2" style={{ WebkitTextStroke: '2px black' }}>Neon Skin</h1>
                <p className="text-white/70 mb-3 text-xs sm:text-sm">Glowing snake trail effect!</p>
              </div>
              <div className="space-y-2">
                <p className="text-accent text-lg sm:text-xl font-bold">150 ARC</p>
                <Button size="lg" className="w-full text-sm sm:text-lg h-10 sm:h-12 bg-green-600 hover:bg-green-500 rounded-lg font-headline group whitespace-normal leading-tight">
                  Buy
                </Button>
              </div>
            </div>
          </div>
          
          <div className="sm:flex-1 animate-fade-in text-center">
            <div className="bg-black/50 py-2 px-2 sm:py-4 sm:px-3 rounded-xl h-[360px] flex flex-col justify-between border-2 border-blue-500/30 hover:border-blue-500/60 transition-all duration-300">
              <div className="pt-2 sm:pt-3">
                <div className="w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg mb-2 mx-auto flex items-center justify-center">
                  <span className="text-lg sm:text-2xl font-bold text-white">♔</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-headline text-blue-500 uppercase tracking-wider mb-2" style={{ WebkitTextStroke: '2px black' }}>Royal Set</h1>
                <p className="text-white/70 mb-3 text-xs sm:text-sm">Elegant chess pieces!</p>
              </div>
              <div className="space-y-2">
                <p className="text-accent text-lg sm:text-xl font-bold">200 ARC</p>
                <Button size="lg" className="w-full text-sm sm:text-lg h-10 sm:h-12 bg-green-600 hover:bg-green-500 rounded-lg font-headline group whitespace-normal leading-tight">
                  Buy
                </Button>
              </div>
            </div>
          </div>
          
          <div className="sm:flex-1 animate-fade-in text-center">
            <div className="bg-black/50 py-2 px-2 sm:py-4 sm:px-3 rounded-xl h-[360px] flex flex-col justify-between border-2 border-red-500/30 hover:border-red-500/60 transition-all duration-300">
              <div className="pt-2 sm:pt-3">
                <div className="w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-br from-red-400 to-red-600 rounded-lg mb-2 mx-auto flex items-center justify-center">
                  <span className="text-lg sm:text-2xl font-bold text-white">🎮</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-headline text-red-500 uppercase tracking-wider mb-2" style={{ WebkitTextStroke: '2px black' }}>Pro Pack</h1>
                <p className="text-white/70 mb-3 text-xs sm:text-sm">Ultimate gaming bundle!</p>
              </div>
              <div className="space-y-2">
                <p className="text-accent text-lg sm:text-xl font-bold">500 ARC</p>
                <Button size="lg" className="w-full text-sm sm:text-lg h-10 sm:h-12 bg-green-600 hover:bg-green-500 rounded-lg font-headline group whitespace-normal leading-tight">
                  Buy
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShopContent;