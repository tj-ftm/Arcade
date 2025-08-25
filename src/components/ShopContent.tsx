import { ArrowLeft, Ticket, Eye, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useWeb3 } from "@/components/web3/Web3Provider";

interface NFT {
  tokenId: string;
  contractAddress: string;
  name: string;
  description: string;
  image: string;
  metadata: any;
}

const ShopContent = ({ onBack }: { onBack: () => void }) => {
  const { account } = useWeb3();
  const [showNFTModal, setShowNFTModal] = useState(false);
  const [ownedNFTs, setOwnedNFTs] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOwnedNFTs = async () => {
    if (!account) {
      setError("Please connect your wallet first");
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // Try the userNFTs endpoint with query parameter
      let response = await fetch(`https://api.paintswap.finance/userNFTs?user=${account}`);
      
      if (!response.ok) {
        // If that fails, try the alternative endpoint format
        console.log(`First endpoint failed with ${response.status}, trying alternative...`);
        response = await fetch(`https://api.paintswap.finance/userOwned?user=${account}`);
      }
      
      if (!response.ok) {
        // If both fail, try without query parameter
        console.log(`Second endpoint failed with ${response.status}, trying third option...`);
        response = await fetch(`https://api.paintswap.finance/userNFTs/${account}`);
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`API Error ${response.status}: ${errorText || 'Unknown error'}`);
      }
      
      const data = await response.json();
      console.log('API Response:', data);
      
      // Handle different response formats
      let nftArray = Array.isArray(data) ? data : (data.nfts || data.data || []);
      
      // Transform the API response to our NFT interface
      const nfts: NFT[] = nftArray.map((nft: any) => ({
        tokenId: nft.tokenId || nft.id || nft.token_id || 'unknown',
        contractAddress: nft.contractAddress || nft.contract || nft.contract_address || 'unknown',
        name: nft.name || nft.title || `NFT #${nft.tokenId || nft.id || 'unknown'}`,
        description: nft.description || nft.desc || "No description available",
        image: nft.image || nft.imageUrl || nft.image_url || nft.thumbnail || "/placeholder-nft.png",
        metadata: nft
      }));
      
      setOwnedNFTs(nfts);
    } catch (err) {
      console.error("Error fetching NFTs:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch NFTs");
    } finally {
      setLoading(false);
    }
  };

  const handleViewNFTs = () => {
    setShowNFTModal(true);
    fetchOwnedNFTs();
  };

  return (
      <div className="w-full h-full max-w-4xl animate-fade-in my-auto">
        <div className="w-full flex-1 flex flex-col items-center justify-center pt-8 sm:pt-8 px-2">
          {/* View Owned NFTs Button */}
          <div className="mb-6 w-full max-w-md">
            <Button 
              onClick={handleViewNFTs}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
              size="lg"
            >
              <Eye className="mr-2 h-5 w-5" />
              View Owned NFTs
            </Button>
          </div>
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
            <div className="bg-black/50 py-2 px-2 sm:py-4 sm:px-3 rounded-xl h-[300px] flex flex-col justify-between border-2 border-purple-500/30 hover:border-purple-500/60 transition-all duration-300">
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
            <div className="bg-black/50 py-2 px-2 sm:py-4 sm:px-3 rounded-xl h-[300px] flex flex-col justify-between border-2 border-blue-500/30 hover:border-blue-500/60 transition-all duration-300">
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
            <div className="bg-black/50 py-2 px-2 sm:py-4 sm:px-3 rounded-xl h-[300px] flex flex-col justify-between border-2 border-red-500/30 hover:border-red-500/60 transition-all duration-300">
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
      
      {/* NFT Modal */}
      {showNFTModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-gray-700">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-2xl font-bold text-white">Your Owned NFTs</h2>
              <Button
                onClick={() => setShowNFTModal(false)}
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
            
            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {loading && (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
                  <span className="ml-3 text-white">Loading your NFTs...</span>
                </div>
              )}
              
              {error && (
                <div className="text-center py-12">
                  <p className="text-red-400 mb-4">{error}</p>
                  <Button onClick={fetchOwnedNFTs} className="bg-purple-600 hover:bg-purple-700">
                    Try Again
                  </Button>
                </div>
              )}
              
              {!loading && !error && ownedNFTs.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-400 text-lg">No NFTs found in your wallet</p>
                  <p className="text-gray-500 text-sm mt-2">Connect your wallet and make sure you own some NFTs</p>
                </div>
              )}
              
              {!loading && !error && ownedNFTs.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {ownedNFTs.map((nft, index) => (
                    <div key={`${nft.contractAddress}-${nft.tokenId}-${index}`} className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-purple-500 transition-all duration-300">
                      <div className="aspect-square bg-gray-700 flex items-center justify-center">
                        {nft.image ? (
                          <img 
                            src={nft.image} 
                            alt={nft.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = '/placeholder-nft.png';
                            }}
                          />
                        ) : (
                          <div className="text-gray-500 text-center p-4">
                            <div className="w-16 h-16 bg-gray-600 rounded-lg mx-auto mb-2 flex items-center justify-center">
                              <span className="text-2xl">🖼️</span>
                            </div>
                            <p className="text-sm">No Image</p>
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="text-white font-semibold text-lg mb-2 truncate">{nft.name}</h3>
                        <p className="text-gray-400 text-sm mb-2 line-clamp-2">{nft.description}</p>
                        <div className="text-xs text-gray-500">
                          <p className="truncate">Token ID: {nft.tokenId}</p>
                          <p className="truncate">Contract: {nft.contractAddress}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopContent;