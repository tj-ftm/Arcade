import { JsonRpcProvider, JsonRpcSigner } from 'ethers';

// Unified Web3 context type definitions
export interface Web3ContextType {
  account: string | null;
  provider: JsonRpcProvider | null;
  signer: JsonRpcSigner | null;
  isConnected: boolean;
  isValidWallet: boolean;
  username: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  switchNetwork?: () => Promise<void>;
  chainId?: number;
}

export interface Web3ProviderProps {
  children: React.ReactNode;
}

export interface WalletConnectionState {
  connecting: boolean;
  error: string | null;
  retryCount: number;
}

export interface TransactionResult {
  hash: string;
  success: boolean;
  error?: string;
  gasUsed?: bigint;
  effectiveGasPrice?: bigint;
}

export interface ContractInteraction {
  contractAddress: string;
  functionName: string;
  args: any[];
  value?: bigint;
  gasLimit?: bigint;
}