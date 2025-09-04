import { ArrowLeft, Ticket, Eye, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useWeb3 } from "@/components/web3/Web3Provider";

// Add CSS for smooth animations
const styles = `
  @keyframes fadeIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
  
  @keyframes shimmer {
    0% { background-position: -200px 0; }
    100% { background-position: calc(200px + 100%) 0; }
  }
  
  .shimmer {
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
    background-size: 200px 100%;
    animation: shimmer 1.5s infinite;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

interface NFT {
  tokenId: string;
  contractAddress: string;
  name: string;
  description: string;
  image: string;
  metadata: any;
}

interface ImageLoadState {
  [key: string]: {
    loading: boolean;
    loaded: boolean;
    error: boolean;
    url?: string;
  };
}

const ShopContent = ({ onBack }: { onBack: () => void }) => {
  const { account } = useWeb3();
  const [showNFTModal, setShowNFTModal] = useState(false);
  const [ownedNFTs, setOwnedNFTs] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageLoadStates, setImageLoadStates] = useState<ImageLoadState>({});
  
  const placeholderImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjMzMzIi8+Cjx0ZXh0IHg9IjEwMCIgeT0iMTAwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5Mb2FkaW5nLi4uPC90ZXh0Pgo8L3N2Zz4K';

  // Cache images in localStorage
  const cacheImage = (url: string, base64Data: string) => {
    try {
      const cacheKey = `nft_image_${btoa(url).replace(/[^a-zA-Z0-9]/g, '')}`;
      localStorage.setItem(cacheKey, base64Data);
      localStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());
    } catch (error) {
      console.warn('Failed to cache image:', error);
    }
  };

  // Get cached image from localStorage
  const getCachedImage = (url: string): string | null => {
    try {
      const cacheKey = `nft_image_${btoa(url).replace(/[^a-zA-Z0-9]/g, '')}`;
      const timestamp = localStorage.getItem(`${cacheKey}_timestamp`);
      
      // Cache expires after 24 hours
      if (timestamp && Date.now() - parseInt(timestamp) < 24 * 60 * 60 * 1000) {
        return localStorage.getItem(cacheKey);
      } else {
        // Remove expired cache
        localStorage.removeItem(cacheKey);
        localStorage.removeItem(`${cacheKey}_timestamp`);
      }
    } catch (error) {
      console.warn('Failed to get cached image:', error);
    }
    return null;
  };

  // Convert image URL to base64 and cache it with better error handling
  const fetchAndCacheImage = async (url: string): Promise<string> => {
    try {
      // Check cache first
      const cached = getCachedImage(url);
      if (cached) {
        return cached;
      }

      // Try direct image loading first (simpler approach)
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx?.drawImage(img, 0, 0);
            const base64 = canvas.toDataURL();
            cacheImage(url, base64);
            resolve(base64);
          } catch (canvasError) {
            // Fallback to direct URL if canvas fails
            console.warn('Canvas conversion failed, using direct URL:', canvasError);
            resolve(url);
          }
        };
        img.onerror = () => {
          // Fallback to fetch method
          fetch(url, { mode: 'cors' })
            .then(response => {
              if (!response.ok) throw new Error(`HTTP ${response.status}`);
              return response.blob();
            })
            .then(blob => {
              const reader = new FileReader();
              reader.onload = () => {
                const base64 = reader.result as string;
                cacheImage(url, base64);
                resolve(base64);
              };
              reader.onerror = () => reject(new Error('FileReader failed'));
              reader.readAsDataURL(blob);
            })
            .catch(fetchError => {
              console.warn('Fetch method also failed, using direct URL:', fetchError);
              resolve(url); // Use direct URL as final fallback
            });
        };
        img.src = url;
      });
    } catch (error) {
      console.error('Failed to fetch and cache image:', error);
      return url; // Return original URL as fallback
    }
  };

  // Enhanced image URL extraction with multiple fallback strategies
  const extractImageUrl = async (nftData: any, fetchedMetadata: any, contractAddress: string, tokenId: string): Promise<string | null> => {
    // Try multiple possible image URL fields
    const possibleImageFields = [
      nftData.image,
      nftData.imageUrl,
      nftData.image_url,
      nftData.thumbnail,
      nftData.metadata?.image,
      nftData.metadata?.imageUrl,
      nftData.metadata?.image_url,
      fetchedMetadata?.image,
      fetchedMetadata?.imageUrl,
      fetchedMetadata?.image_url,
      // PaintSwap specific fields
      nftData.cachedFileUrl,
      nftData.cached_file_url,
      nftData.fileUrl,
      nftData.file_url,
      // Try nested structures
      nftData.nft?.image,
      nftData.nft?.imageUrl,
      nftData.nft?.cached_file_url,
      // Additional PaintSwap fields
      nftData.nft?.metadata?.image,
      nftData.token?.image,
      nftData.token?.metadata?.image
    ];

    // First, try direct image fields
    for (const field of possibleImageFields) {
      if (field && typeof field === 'string') {
        let imageUrl = field;
        
        // Handle IPFS URLs with multiple gateways
        if (imageUrl.startsWith('ipfs://')) {
          const ipfsHash = imageUrl.replace('ipfs://', '');
          const gateways = [
            `https://ipfs.io/ipfs/${ipfsHash}`,
            `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
            `https://cloudflare-ipfs.com/ipfs/${ipfsHash}`,
            `https://dweb.link/ipfs/${ipfsHash}`
          ];
          
          // Test each gateway to find working one
          for (const gateway of gateways) {
            try {
              const testResponse = await fetch(gateway, { method: 'HEAD', timeout: 5000 } as any);
              if (testResponse.ok) {
                console.log(`Working IPFS gateway found: ${gateway}`);
                return gateway;
              }
            } catch {
              continue;
            }
          }
          // If no gateway works, return the first one as fallback
          return gateways[0];
        }
        
        // Validate URL format
        try {
          new URL(imageUrl);
          return imageUrl;
        } catch {
          // Invalid URL, continue to next field
          continue;
        }
      }
    }
    
    // If no direct image found, try fetching enhanced metadata from Paintswap
    console.log(`No direct image found, trying Paintswap API for ${contractAddress}/${tokenId}`);
    const paintswapData = await fetchNFTFromPaintswap(contractAddress, tokenId);
    if (paintswapData) {
      // Recursively try to extract image from Paintswap data
      const paintswapImage = await extractImageUrl(paintswapData, null, contractAddress, tokenId);
      if (paintswapImage) {
        return paintswapImage;
      }
    }
    
    // Try constructing image from blockchain/metadata
    const blockchainImage = constructImageFromBlockchain(contractAddress, tokenId, fetchedMetadata || nftData.metadata);
    if (blockchainImage) {
      return blockchainImage;
    }
    
    // Final fallback: try to construct common NFT image patterns
    const commonPatterns = [
      `https://ipfs.io/ipfs/${contractAddress}/${tokenId}`,
      `https://gateway.pinata.cloud/ipfs/${contractAddress}/${tokenId}.png`,
      `https://gateway.pinata.cloud/ipfs/${contractAddress}/${tokenId}.jpg`,
      `https://api.paintswap.finance/images/${contractAddress}/${tokenId}`,
      `https://metadata.paintswap.finance/${contractAddress}/${tokenId}.png`
    ];
    
    for (const pattern of commonPatterns) {
      try {
        const testResponse = await fetch(pattern, { method: 'HEAD', timeout: 3000 } as any);
        if (testResponse.ok) {
          console.log(`Found image using pattern: ${pattern}`);
          return pattern;
        }
      } catch {
        continue;
      }
    }
    
    console.log(`No image found for NFT ${contractAddress}/${tokenId}`);
    return null;
  };

  // Handle image loading for individual NFTs
  const handleImageLoad = async (nftKey: string, imageUrl: string) => {
    if (!imageUrl || imageLoadStates[nftKey]?.loaded || imageLoadStates[nftKey]?.loading) {
      return;
    }

    setImageLoadStates(prev => ({
      ...prev,
      [nftKey]: { loading: true, loaded: false, error: false }
    }));

    try {
      const cachedImage = await fetchAndCacheImage(imageUrl);
      setImageLoadStates(prev => ({
        ...prev,
        [nftKey]: { loading: false, loaded: true, error: false, url: cachedImage }
      }));
    } catch (error) {
      console.error(`Failed to load image for NFT ${nftKey}:`, error);
      setImageLoadStates(prev => ({
        ...prev,
        [nftKey]: { loading: false, loaded: false, error: true }
      }));
    }
  };

  // Enhanced function to fetch metadata from multiple sources
  const fetchMetadataFromURI = async (tokenURI: string) => {
    try {
      // Convert IPFS URLs to HTTP gateway URLs with multiple fallbacks
      let metadataUrl = tokenURI;
      if (tokenURI.startsWith('ipfs://')) {
        const ipfsHash = tokenURI.replace('ipfs://', '');
        // Try multiple IPFS gateways for better reliability
        const gateways = [
          `https://ipfs.io/ipfs/${ipfsHash}`,
          `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
          `https://cloudflare-ipfs.com/ipfs/${ipfsHash}`,
          `https://dweb.link/ipfs/${ipfsHash}`
        ];
        
        for (const gateway of gateways) {
          try {
            console.log(`Trying IPFS gateway: ${gateway}`);
            const response = await fetch(gateway, { timeout: 10000 } as any);
            if (response.ok) {
              const metadata = await response.json();
              console.log('Successfully fetched metadata from:', gateway);
              return metadata;
            }
          } catch (err) {
            console.warn(`Gateway ${gateway} failed:`, err);
            continue;
          }
        }
        throw new Error('All IPFS gateways failed');
      } else {
        console.log(`Fetching metadata from: ${metadataUrl}`);
        const response = await fetch(metadataUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch metadata: ${response.status}`);
        }
        
        const metadata = await response.json();
        console.log('Fetched metadata:', metadata);
        return metadata;
      }
    } catch (error) {
      console.error('Error fetching metadata:', error);
      return null;
    }
  };

  // Function to fetch NFT data from Paintswap API with enhanced metadata
  const fetchNFTFromPaintswap = async (contractAddress: string, tokenId: string) => {
    try {
      // Try multiple Paintswap API endpoints
      const endpoints = [
        `https://api.paintswap.finance/metadata/${contractAddress}/${tokenId}`,
        `https://api.paintswap.finance/userNFTs/${contractAddress}/${tokenId}`,
        `https://api.paintswap.finance/extraNFTInfo/${contractAddress}/${tokenId}`
      ];
      
      for (const endpoint of endpoints) {
        try {
          console.log(`Trying Paintswap endpoint: ${endpoint}`);
          const response = await fetch(endpoint);
          if (response.ok) {
            const data = await response.json();
            console.log('Paintswap API response:', data);
            return data;
          }
        } catch (err) {
          console.warn(`Paintswap endpoint ${endpoint} failed:`, err);
          continue;
        }
      }
      return null;
    } catch (error) {
      console.error('Error fetching from Paintswap:', error);
      return null;
    }
  };

  // Function to fetch NFT data from SonicScan Explorer
  const fetchNFTFromSonicScan = async (walletAddress: string) => {
    try {
      // SonicScan API endpoints for NFT transfers
      const endpoints = [
        `https://api.sonicscan.org/api?module=account&action=tokennfttx&address=${walletAddress}&startblock=0&endblock=999999999&sort=desc`,
        `https://api.sonicscan.org/api?module=account&action=tokentx&address=${walletAddress}&startblock=0&endblock=999999999&sort=desc`
      ];
      
      for (const endpoint of endpoints) {
        try {
          console.log(`Trying SonicScan endpoint: ${endpoint}`);
          const response = await fetch(endpoint);
          if (response.ok) {
            const data = await response.json();
            console.log('SonicScan API response:', data);
            
            if (data.status === '1' && data.result) {
              // Filter for NFT transfers where the wallet is the recipient
              const nftTransfers = data.result.filter((tx: any) => 
                tx.to?.toLowerCase() === walletAddress.toLowerCase() && 
                tx.tokenID && 
                tx.contractAddress
              );
              
              // Group by contract and token ID to get unique NFTs
              const uniqueNFTs = new Map();
              nftTransfers.forEach((tx: any) => {
                const key = `${tx.contractAddress}-${tx.tokenID}`;
                if (!uniqueNFTs.has(key)) {
                  uniqueNFTs.set(key, {
                    contractAddress: tx.contractAddress,
                    tokenId: tx.tokenID,
                    tokenName: tx.tokenName || 'Unknown NFT',
                    tokenSymbol: tx.tokenSymbol || 'NFT',
                    blockNumber: tx.blockNumber,
                    hash: tx.hash
                  });
                }
              });
              
              return Array.from(uniqueNFTs.values());
            }
          }
        } catch (err) {
          console.warn(`SonicScan endpoint ${endpoint} failed:`, err);
          continue;
        }
      }
      return [];
    } catch (error) {
      console.error('Error fetching from SonicScan:', error);
      return [];
    }
  };

  // Function to construct image URL from SonicScan/blockchain data
  const constructImageFromBlockchain = (contractAddress: string, tokenId: string, metadata: any): string | null => {
    try {
      // If metadata has IPFS image, convert to HTTP
      if (metadata?.image) {
        let imageUrl = metadata.image;
        if (imageUrl.startsWith('ipfs://')) {
          const ipfsHash = imageUrl.replace('ipfs://', '');
          // Use multiple IPFS gateways
          const gateways = [
            `https://ipfs.io/ipfs/${ipfsHash}`,
            `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
            `https://cloudflare-ipfs.com/ipfs/${ipfsHash}`
          ];
          return gateways[0]; // Return first gateway, others will be tried as fallbacks
        }
        return imageUrl;
      }
      
      // Try to construct OpenSea-style metadata URL
      const openSeaUrl = `https://api.opensea.io/api/v1/asset/${contractAddress}/${tokenId}/`;
      console.log('Constructed OpenSea URL:', openSeaUrl);
      
      return null;
    } catch (error) {
      console.error('Error constructing image URL:', error);
      return null;
    }
  };

  const fetchOwnedNFTs = async () => {
    if (!account) {
      setError("Please connect your wallet first");
      return;
    }

    setLoading(true);
    setError(null);
    setOwnedNFTs([]); // Clear existing NFTs
    setImageLoadStates({}); // Clear image states
    
    try {
      // Use the correct Paintswap API endpoint for user NFTs with query parameter
      const response = await fetch(`https://api.paintswap.finance/userNFTs/?user=${account}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Paintswap API Error:', errorText);
        throw new Error(`API Error ${response.status}: ${errorText || 'Failed to fetch NFTs'}`);
      }
      
      const data = await response.json();
      console.log('Paintswap API Response:', data);
      
      // Paintswap API can return either a direct array or an object with 'nfts' property
      const nftArray = Array.isArray(data) ? data : (data.nfts && Array.isArray(data.nfts) ? data.nfts : []);
      console.log(`Found ${nftArray.length} NFTs from Paintswap API`);
      
      if (nftArray.length === 0) {
        setOwnedNFTs([]);
        setLoading(false);
        return;
      }
      
      const placeholderImage = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%23374151'/%3E%3Ctext x='100' y='100' text-anchor='middle' dy='0.3em' fill='%23D1D5DB' font-family='Arial' font-size='16'%3ENo Image%3C/text%3E%3C/svg%3E";
      
      // Process NFTs from Paintswap API response and fetch metadata
      const nfts: NFT[] = [];
      
      // Process each NFT and fetch its metadata
      for (let i = 0; i < nftArray.length; i++) {
        const item = nftArray[i];
        const nftData = item.nft || item;
        const tokenId = item.tokenId || nftData.tokenId || item.id || 'unknown';
        const contractAddress = item.address || nftData.address || item.contractAddress || 'unknown';
        
        try {
          // Fetch metadata from Paintswap metadata endpoint
          const metadataResponse = await fetch(`https://api.paintswap.finance/metadata/${contractAddress}/${tokenId}`);
          let metadata = null;
          let imageUrl = null;
          let name = `NFT #${tokenId}`;
          let description = "No description available";
          
          if (metadataResponse.ok) {
            metadata = await metadataResponse.json();
            console.log(`Metadata for ${contractAddress}/${tokenId}:`, metadata);
            
            // Extract image URL from metadata
            if (metadata.cachedFileUrl) {
              imageUrl = metadata.cachedFileUrl;
            } else if (metadata.cached_file_url) {
              imageUrl = metadata.cached_file_url;
            } else if (metadata.fileUrl) {
              imageUrl = metadata.fileUrl;
            } else if (metadata.file_url) {
              imageUrl = metadata.file_url;
            } else if (metadata.image) {
              imageUrl = metadata.image;
            } else if (metadata.imageUrl) {
              imageUrl = metadata.imageUrl;
            } else if (metadata.image_url) {
              imageUrl = metadata.image_url;
            } else if (metadata.metadata?.image) {
              imageUrl = metadata.metadata.image;
            }
            
            // Extract name and description
            name = metadata.name || metadata.title || metadata.metadata?.name || `NFT #${tokenId}`;
            description = metadata.description || metadata.desc || metadata.metadata?.description || "No description available";
          } else {
            console.warn(`Failed to fetch metadata for ${contractAddress}/${tokenId}`);
          }
          
          // Convert IPFS URLs to HTTP if needed
          if (imageUrl && imageUrl.startsWith('ipfs://')) {
            const ipfsHash = imageUrl.replace('ipfs://', '');
            imageUrl = `https://ipfs.io/ipfs/${ipfsHash}`;
          }
          
          const nft: NFT = {
            tokenId: tokenId,
            contractAddress: contractAddress,
            name: name,
            description: description,
            image: imageUrl || placeholderImage,
            metadata: { ...item, fetchedMetadata: metadata }
          };
          
          nfts.push(nft);
        } catch (metadataError) {
          console.warn(`Error fetching metadata for ${contractAddress}/${tokenId}:`, metadataError);
          
          // Create NFT with basic info if metadata fetch fails
          const nft: NFT = {
            tokenId: tokenId,
            contractAddress: contractAddress,
            name: `NFT #${tokenId}`,
            description: "Metadata unavailable",
            image: placeholderImage,
            metadata: item
          };
          
          nfts.push(nft);
        }
      }
      
      console.log(`Processed ${nfts.length} NFTs with metadata`);
      setOwnedNFTs(nfts);
      setLoading(false);
      
      // Start loading images asynchronously without blocking UI
      nfts.forEach((nft, index) => {
        if (nft.image && nft.image !== placeholderImage) {
          const nftKey = `${nft.contractAddress}-${nft.tokenId}-${index}`;
          // Use setTimeout to avoid blocking the UI
          setTimeout(() => {
            handleImageLoad(nftKey, nft.image);
          }, index * 100); // Stagger image loading
        }
      });
    } catch (err) {
      console.error("Error fetching NFTs from Paintswap:", err);
      setError("Failed to fetch NFTs from Paintswap API. Please try again.");
      setOwnedNFTs([]);
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
          {/* NFT Buttons */}
          <div className="mb-6 w-full max-w-md space-y-3">
            <Button 
              onClick={handleViewNFTs}
              className="w-full text-sm sm:text-lg h-10 sm:h-12 bg-green-600 hover:bg-green-500 rounded-lg font-headline group whitespace-normal leading-tight"
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
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4 pt-20">
          <div className="bg-gradient-to-br from-yellow-500 via-orange-500 to-orange-600 rounded-xl max-w-4xl w-full max-h-[85vh] overflow-hidden border border-yellow-400/50 shadow-2xl mt-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-yellow-400/30">
              <h2 className="text-2xl font-bold text-white font-headline uppercase tracking-wider" style={{ WebkitTextStroke: '1px black' }}>Your Owned NFTs</h2>
              <Button
                onClick={() => setShowNFTModal(false)}
                variant="ghost"
                size="lg"
                className="text-white/70 hover:text-white hover:bg-black/20 rounded-lg p-3"
              >
                <X className="h-8 w-8" />
              </Button>
            </div>
            
            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {loading && (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-300"></div>
                  <span className="ml-3 text-white font-headline">Loading your NFTs...</span>
                </div>
              )}
              
              {error && (
                <div className="text-center py-12">
                  <p className="text-red-200 mb-4 font-headline">{error}</p>
                  <Button onClick={fetchOwnedNFTs} className="bg-green-600 hover:bg-green-500 font-headline">
                    Try Again
                  </Button>
                </div>
              )}
              
              {!loading && !error && ownedNFTs.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-white text-lg font-headline">No NFTs found in your wallet</p>
                  <p className="text-white/70 text-sm mt-2 font-headline">Connect your wallet and make sure you own some NFTs</p>
                </div>
              )}
              
              {!loading && !error && ownedNFTs.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {ownedNFTs.map((nft, index) => {
                    const nftKey = `${nft.contractAddress}-${nft.tokenId}-${index}`;
                    const imageState = imageLoadStates[nftKey];
                    const placeholderImage = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%23374151'/%3E%3Ctext x='100' y='100' text-anchor='middle' dy='0.3em' fill='%23D1D5DB' font-family='Arial' font-size='16'%3ENo Image%3C/text%3E%3C/svg%3E";
                    
                    return (
                       <div key={nftKey} className="bg-black/50 rounded-lg overflow-hidden border border-yellow-400/30 hover:border-yellow-400/60 transition-all duration-300 shadow-lg">
                         <div className="aspect-square bg-black/30 flex items-center justify-center relative">
                          {/* Image loading state with smooth animation */}
                          {imageState?.loading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-yellow-500/10 to-orange-500/10 backdrop-blur-sm">
                              <div className="text-center">
                                <div className="relative">
                                  <div className="w-12 h-12 border-4 border-yellow-300/30 rounded-full animate-spin border-t-yellow-300"></div>
                                  <div className="absolute inset-0 w-12 h-12 border-4 border-transparent rounded-full animate-ping border-t-yellow-300/50"></div>
                                </div>
                                <p className="text-sm text-white/70 font-headline mt-3">Loading image...</p>
                              </div>
                            </div>
                          )}
                          
                          {/* Loaded image with fade-in animation */}
                          {imageState?.loaded && imageState.url && (
                            <img 
                              src={imageState.url}
                              alt={nft.name}
                              className="w-full h-full object-cover transition-opacity duration-500 ease-in-out opacity-100"
                              style={{ animation: 'fadeIn 0.5s ease-in-out' }}
                            />
                          )}
                          
                          {/* Default state - show placeholder or error */}
                          {(!imageState || (!imageState.loading && !imageState.loaded)) && (
                            <div className="text-white/70 text-center p-4">
                              {imageState?.error ? (
                                <>
                                  <div className="w-16 h-16 bg-red-600/30 rounded-lg mx-auto mb-2 flex items-center justify-center">
                                    <span className="text-2xl">❌</span>
                                  </div>
                                  <p className="text-sm font-headline">Failed to load image</p>
                                </>
                              ) : (
                                <>
                                  <div className="w-16 h-16 bg-yellow-600/30 rounded-lg mx-auto mb-2 flex items-center justify-center">
                                    <span className="text-2xl">🖼️</span>
                                  </div>
                                  <p className="text-sm font-headline">No Image</p>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="p-4">
                           <h3 className="text-white font-semibold text-lg mb-2 truncate font-headline">
                             {nft.name}
                           </h3>
                           <p className="text-white/70 text-sm mb-2 line-clamp-2">
                             {nft.description}
                           </p>
                           <div className="text-xs text-white/60">
                             <p className="truncate font-headline mb-1">
                               Token ID: {nft.tokenId}
                             </p>
                             <p className="truncate font-headline">
                               Contract: {nft.contractAddress}
                             </p>
                           </div>
                         </div>
                      </div>
                    );
                  })}
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