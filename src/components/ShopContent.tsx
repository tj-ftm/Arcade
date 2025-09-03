import { ArrowLeft, Ticket, Eye, X, Loader2 } from "lucide-react";
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
    
    // Show placeholder NFTs immediately while loading
    const placeholderNFTs: NFT[] = Array.from({ length: 6 }, (_, index) => ({
      tokenId: `loading-${index}`,
      contractAddress: 'loading',
      name: 'Loading...',
      description: 'Fetching NFT data...',
      image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%23374151'/%3E%3Ctext x='100' y='100' text-anchor='middle' dy='0.3em' fill='%23D1D5DB' font-family='Arial' font-size='16'%3ELoading...%3C/text%3E%3C/svg%3E",
      metadata: {}
    }));
    
    setOwnedNFTs(placeholderNFTs);
    setLoading(false); // Set loading to false immediately to show placeholders
    
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
      console.log('API Response type:', typeof data);
      console.log('API Response keys:', Object.keys(data));
      if (Array.isArray(data) && data.length > 0) {
        console.log('First NFT sample:', data[0]);
        console.log('First NFT keys:', Object.keys(data[0]));
      }
      
      // Handle different response formats
      let nftArray = Array.isArray(data) ? data : (data.nfts || data.data || data.result || []);
      console.log('NFT Array length:', nftArray.length);
      
      // Use a data URI for placeholder instead of missing file
      const placeholderImage = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%23374151'/%3E%3Ctext x='100' y='100' text-anchor='middle' dy='0.3em' fill='%23D1D5DB' font-family='Arial' font-size='16'%3ENo Image%3C/text%3E%3C/svg%3E";
      
      // Transform the API response to our NFT interface
      const nfts: NFT[] = await Promise.all(nftArray.map(async (item: any, index: number) => {
        console.log(`Processing NFT ${index}:`, item);
        
        // Access the nested nft object for metadata
        const nftData = item.nft || item;
        const tokenId = item.tokenId || nftData.tokenId || item.id || 'unknown';
        const contractAddress = item.address || nftData.address || item.contractAddress || 'unknown';
        
        console.log(`NFT Data for ${index}:`, nftData);
        console.log(`NFT Data keys:`, Object.keys(nftData));
        console.log(`Token ID: ${tokenId}, Contract: ${contractAddress}`);
        
        // Check if metadata needs to be fetched from IPFS
        let fetchedMetadata = null;
        if (nftData.tokenURI) {
          console.log(`Token URI found: ${nftData.tokenURI}`);
          fetchedMetadata = await fetchMetadataFromURI(nftData.tokenURI);
        }
        if (nftData.metadata) {
          console.log(`Metadata object:`, nftData.metadata);
        }
        
        // Extract image URL using the enhanced extraction function
        const imageUrl = await extractImageUrl(nftData, fetchedMetadata, contractAddress, tokenId);
        
        console.log(`Final Image URL for NFT ${index}:`, imageUrl);
        console.log(`Available image fields:`, {
          image: nftData.image,
          imageUrl: nftData.imageUrl,
          image_url: nftData.image_url,
          thumbnail: nftData.thumbnail,
          cachedFileUrl: nftData.cachedFileUrl,
          cached_file_url: nftData.cached_file_url,
          fileUrl: nftData.fileUrl,
          file_url: nftData.file_url,
          metadataImage: nftData.metadata?.image,
          fetchedImage: fetchedMetadata?.image,
          nftImage: nftData.nft?.image,
          nftCachedFileUrl: nftData.nft?.cached_file_url
        });
        
        return {
          tokenId: tokenId,
          contractAddress: contractAddress,
          name: nftData.name || nftData.title || nftData.metadata?.name || fetchedMetadata?.name || `NFT #${tokenId}`,
          description: nftData.description || nftData.desc || nftData.metadata?.description || fetchedMetadata?.description || "No description available",
          image: imageUrl || placeholderImage,
          metadata: item
        };
      }));
      
      setOwnedNFTs(nfts);
      
      // Start loading images for NFTs that have image URLs
      nfts.forEach((nft, index) => {
        if (nft.image && nft.image !== placeholderImage) {
          const nftKey = `${nft.contractAddress}-${nft.tokenId}-${index}`;
          handleImageLoad(nftKey, nft.image);
        }
      });
    } catch (err) {
      console.error("Error fetching NFTs from Paintswap:", err);
      
      // Try SonicScan as fallback
      try {
        console.log('Trying SonicScan as fallback...');
        const sonicScanNFTs = await fetchNFTFromSonicScan(account);
        
        if (sonicScanNFTs.length > 0) {
          const sonicNFTs: NFT[] = sonicScanNFTs.map((item: any) => ({
            tokenId: item.tokenId,
            contractAddress: item.contractAddress,
            name: item.tokenName || `${item.tokenSymbol} #${item.tokenId}`,
            description: `NFT from ${item.tokenSymbol || 'Unknown'} collection`,
            image: placeholderImage,
            metadata: item
          }));
          
          setOwnedNFTs(sonicNFTs);
          console.log(`Found ${sonicNFTs.length} NFTs via SonicScan`);
        } else {
          setError("No NFTs found via Paintswap or SonicScan APIs");
          setOwnedNFTs([]);
        }
      } catch (sonicErr) {
        console.error("Error fetching NFTs from SonicScan:", sonicErr);
        setError("Failed to fetch NFTs from both Paintswap and SonicScan APIs");
        setOwnedNFTs([]);
      }
    }
    // Note: loading is already set to false above to show placeholders immediately
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
            
            <Button 
              onClick={() => {
                if (account) {
                  window.open(`https://sonicscan.org/address/${account}#tokentxnsErc721`, '_blank');
                } else {
                  setError('Please connect your wallet first');
                }
              }}
              className="w-full text-sm sm:text-lg h-10 sm:h-12 bg-blue-600 hover:bg-blue-500 rounded-lg font-headline group whitespace-normal leading-tight"
              size="lg"
            >
              <Eye className="mr-2 h-5 w-5" />
              Inspect on SonicScan
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
          <div className="bg-gradient-to-br from-yellow-500 via-orange-500 to-orange-600 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-yellow-400/50 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-yellow-400/30">
              <h2 className="text-2xl font-bold text-white font-headline uppercase tracking-wider" style={{ WebkitTextStroke: '1px black' }}>Your Owned NFTs</h2>
              <Button
                onClick={() => setShowNFTModal(false)}
                variant="ghost"
                size="sm"
                className="text-white/70 hover:text-white hover:bg-black/20 rounded-lg"
              >
                <X className="h-6 w-6" />
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
                    const isPlaceholder = nft.contractAddress === 'loading';
                    const placeholderImage = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%23374151'/%3E%3Ctext x='100' y='100' text-anchor='middle' dy='0.3em' fill='%23D1D5DB' font-family='Arial' font-size='16'%3ENo Image%3C/text%3E%3C/svg%3E";
                    
                    return (
                       <div key={nftKey} className={`bg-black/50 rounded-lg overflow-hidden border border-yellow-400/30 hover:border-yellow-400/60 transition-all duration-300 shadow-lg ${isPlaceholder ? 'animate-pulse' : ''}`}>
                         <div className="aspect-square bg-black/30 flex items-center justify-center relative">
                          {/* Placeholder loading state */}
                          {isPlaceholder && (
                            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-yellow-500/20 to-orange-500/20">
                              <div className="text-center">
                                <Loader2 className="h-12 w-12 animate-spin text-yellow-300 mx-auto mb-3" />
                                <p className="text-sm text-white/70 font-headline">Loading NFTs...</p>
                              </div>
                            </div>
                          )}
                          
                          {/* Regular loading state for actual NFTs */}
                           {!isPlaceholder && imageState?.loading && (
                             <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                               <div className="text-center">
                                 <Loader2 className="h-8 w-8 animate-spin text-yellow-300 mx-auto mb-2" />
                                 <p className="text-sm text-white/70 font-headline">Loading image...</p>
                               </div>
                             </div>
                           )}
                          
                          {/* Loaded image */}
                          {!isPlaceholder && imageState?.loaded && imageState.url && (
                            <img 
                              src={imageState.url}
                              alt={nft.name}
                              className="w-full h-full object-cover"
                            />
                          )}
                          
                          {/* Error state or no image */}
                           {!isPlaceholder && (!imageState || imageState.error || (!imageState.loading && !imageState.loaded)) && (
                             <div className="text-white/70 text-center p-4">
                               <div className="w-16 h-16 bg-yellow-600/30 rounded-lg mx-auto mb-2 flex items-center justify-center">
                                 <span className="text-2xl">🖼️</span>
                               </div>
                               <p className="text-sm font-headline">{imageState?.error ? 'Failed to load' : 'No Image'}</p>
                             </div>
                           )}
                        </div>
                        <div className="p-4">
                           <h3 className={`text-white font-semibold text-lg mb-2 truncate font-headline ${isPlaceholder ? 'bg-gray-600/50 rounded animate-pulse' : ''}`}>
                             {isPlaceholder ? '' : nft.name}
                           </h3>
                           <p className={`text-white/70 text-sm mb-2 line-clamp-2 ${isPlaceholder ? 'bg-gray-600/30 rounded animate-pulse' : ''}`}>
                             {isPlaceholder ? '' : nft.description}
                           </p>
                           <div className="text-xs text-white/60">
                             <p className={`truncate font-headline ${isPlaceholder ? 'bg-gray-600/30 rounded animate-pulse mb-1' : ''}`}>
                               {isPlaceholder ? '' : `Token ID: ${nft.tokenId}`}
                             </p>
                             <p className={`truncate font-headline ${isPlaceholder ? 'bg-gray-600/30 rounded animate-pulse' : ''}`}>
                               {isPlaceholder ? '' : `Contract: ${nft.contractAddress}`}
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