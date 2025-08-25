import { ethers } from 'ethers';
import { useWeb3 } from '../components/web3/Web3Provider';

const BONUS_MODE_WALLET = '0x5AD5aE34265957fB08eA12f77BAFf1200060473e';
const REQUIRED_PAYMENT = '0.1'; // 0.1 S

export interface PaymentVerificationResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

export async function verifyPayment(
  provider: ethers.BrowserProvider,
  userAddress: string,
  timeWindow: number = 300000 // 5 minutes in milliseconds
): Promise<PaymentVerificationResult> {
  try {
    const currentBlock = await provider.getBlockNumber();
    const blocksToCheck = Math.ceil(timeWindow / 12000); // Assuming ~12 second block time
    const fromBlock = Math.max(0, currentBlock - blocksToCheck);

    // Get transaction history for the user's address
    const filter = {
      fromBlock,
      toBlock: currentBlock,
      address: null,
    };

    // Check recent transactions from user to bonus wallet
    for (let blockNumber = currentBlock; blockNumber >= fromBlock; blockNumber--) {
      try {
        const block = await provider.getBlock(blockNumber, true);
        if (!block || !block.transactions) continue;

        for (const tx of block.transactions) {
          if (typeof tx === 'string') continue;
          
          if (
            tx.from?.toLowerCase() === userAddress.toLowerCase() &&
            tx.to?.toLowerCase() === BONUS_MODE_WALLET.toLowerCase() &&
            tx.value
          ) {
            const valueInEther = ethers.formatEther(tx.value);
            if (parseFloat(valueInEther) >= parseFloat(REQUIRED_PAYMENT)) {
              return {
                success: true,
                transactionHash: tx.hash,
              };
            }
          }
        }
      } catch (blockError) {
        console.warn(`Error checking block ${blockNumber}:`, blockError);
        continue;
      }
    }

    return {
      success: false,
      error: 'No valid payment found in recent transactions',
    };
  } catch (error) {
    console.error('Payment verification error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

export async function sendBonusPayment(
  provider: ethers.BrowserProvider,
  signer: Promise<ethers.JsonRpcSigner>
): Promise<PaymentVerificationResult> {
  try {
    // Await the signer promise
    const actualSigner = await signer;
    
    const transaction = {
      to: BONUS_MODE_WALLET,
      value: ethers.parseEther(REQUIRED_PAYMENT),
    };

    const tx = await actualSigner.sendTransaction(transaction);
    await tx.wait(); // Wait for confirmation

    return {
      success: true,
      transactionHash: tx.hash,
    };
  } catch (error) {
    console.error('Payment sending error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send payment',
    };
  }
}

export function getBonusReward(gameType: 'uno' | 'snake' | 'chess', baseReward: number): number {
  // Return 2x the base reward for bonus mode
  return baseReward * 2;
}

export { BONUS_MODE_WALLET, REQUIRED_PAYMENT };