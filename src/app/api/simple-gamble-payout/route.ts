import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

// Simple gamble payout API - handles winner payouts directly from game wallet

const HOUSE_FEE_PERCENT = 5;
const ARC_TOKEN_ADDRESS = '0x1429859428C0aBc9C2C47C8Ee9FBaf82cFA0F20f';

// ARC Token ABI
const ARC_TOKEN_ABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)'
];

export async function POST(request: NextRequest) {
  try {
    const { gameId, winnerAddress, winnerName, totalPot } = await request.json();
    
    if (!gameId || !winnerAddress || !totalPot) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Initialize provider
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.soniclabs.com/';
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // Get game wallet private key from environment
    const gameWalletPrivateKey = process.env.MINTER_PRIVATE_KEY;
    if (!gameWalletPrivateKey) {
      return NextResponse.json(
        { error: 'Game wallet not configured - MINTER_PRIVATE_KEY missing' },
        { status: 500 }
      );
    }
    
    // Create game wallet signer
    const gameWallet = new ethers.Wallet(gameWalletPrivateKey, provider);
    
    // Connect to ARC token contract
    const arcToken = new ethers.Contract(ARC_TOKEN_ADDRESS, ARC_TOKEN_ABI, gameWallet);
    
    console.log('💰 [SIMPLE GAMBLE PAYOUT] Processing payout for game:', gameId);
    console.log('🏆 [SIMPLE GAMBLE PAYOUT] Winner:', winnerAddress, winnerName);
    console.log('💎 [SIMPLE GAMBLE PAYOUT] Total pot:', totalPot, 'ARC');
    
    // Calculate payout amounts
    const totalPotWei = ethers.parseEther(totalPot);
    const houseFeeWei = (totalPotWei * BigInt(HOUSE_FEE_PERCENT)) / BigInt(100);
    const winnerPayoutWei = totalPotWei - houseFeeWei;
    
    const houseFeeARC = ethers.formatEther(houseFeeWei);
    const winnerPayoutARC = ethers.formatEther(winnerPayoutWei);
    
    console.log('📊 [SIMPLE GAMBLE PAYOUT] House fee (5%):', houseFeeARC, 'ARC');
    console.log('📊 [SIMPLE GAMBLE PAYOUT] Winner payout (95%):', winnerPayoutARC, 'ARC');
    
    // Check game wallet ARC balance
    const gameWalletBalance = await arcToken.balanceOf(gameWallet.address);
    console.log('💰 [SIMPLE GAMBLE PAYOUT] Game wallet balance:', ethers.formatEther(gameWalletBalance), 'ARC');
    
    if (gameWalletBalance < totalPotWei) {
      return NextResponse.json(
        { error: `Insufficient game wallet balance. Required: ${totalPot} ARC, Available: ${ethers.formatEther(gameWalletBalance)} ARC` },
        { status: 500 }
      );
    }
    
    // Send payout to winner
    console.log('💸 [SIMPLE GAMBLE PAYOUT] Sending payout to winner...');
    
    const payoutTx = await arcToken.transfer(winnerAddress, winnerPayoutWei, {
      gasLimit: 100000
    });
    
    console.log('📝 [SIMPLE GAMBLE PAYOUT] Payout transaction:', payoutTx.hash);
    await payoutTx.wait();
    
    console.log('✅ [SIMPLE GAMBLE PAYOUT] Payout completed successfully');
    
    // Note: House fee stays in the game wallet (no need to transfer to itself)
    
    return NextResponse.json({
      success: true,
      payoutTxHash: payoutTx.hash,
      winnerPayout: winnerPayoutARC,
      houseFee: houseFeeARC,
      message: `Payout sent to ${winnerName}`
    });
    
  } catch (error: any) {
    console.error('❌ [SIMPLE GAMBLE PAYOUT] Payout failed:', error);
    return NextResponse.json(
      { error: error.message || 'Payout failed' },
      { status: 500 }
    );
  }
}