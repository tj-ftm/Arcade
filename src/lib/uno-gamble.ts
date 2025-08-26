import { ethers } from 'ethers';
import { ARC_TOKEN_ADDRESS } from '@/types';

// UNO Gamble Smart Contract Interface
export interface UnoGambleGame {
  player1: string;
  player2: string;
  betAmount: string;
  totalPot: string;
  winner: string;
  isActive: boolean;
  isCompleted: boolean;
  createdAt: number;
}

export interface GameCreationResult {
  gameId: string;
  contractAddress: string;
  txHash: string;
}

export interface PaymentResult {
  txHash: string;
  success: boolean;
}

// UNO Gamble Smart Contract Bytecode (simplified for development)
const UNO_GAMBLE_BYTECODE = '0x60a060405234801561001057600080fd5b5060405161144e38038061144e83398101604081905261002f91610052565b6001600160a01b0316608052600080546001600160a01b03191633179055610082565b60006020828403121561006457600080fd5b81516001600160a01b038116811461007b57600080fd5b9392505050565b60805161139c6100b2600039600081816102710152818161096301528181610ce50152610dc7015261139c6000f3fe6080604052600436106100c15760003560e01c80637c4398c91161007f578063b0f81bb811610059578063b0f81bb81461023f578063c01126781461025f578063f018ba8f14610293578063f579f882146102b357600080fd5b80637c4398c9146101f15780638da5cb5b14610204578063ab8bb55e1461022457600080fd5b8062578353146100c65780631e8716fe1461010b57806329e824391461012d5780635537be7f1461015d57806373931bbf146101805780637736ea67146101b6575b600080fd5b3480156100d257600080fd5b506100ee735ad5ae34265957fb08ea12f77baff1200060473e81565b6040516001600160a01b0390911681526020015b60405180910390f35b34801561011757600080fd5b5061012b610126366004610f93565b6102d3565b005b34801561013957600080fd5b5061014d610148366004610fea565b61044b565b6040519015158152602001610102565b34801561016957600080fd5b50610172600581565b604051908152602001610102565b34801561018c57600080fd5b506101a061019b366004611016565b610478565b6040516101029a99989796959493929190611075565b3480156101c257600080fd5b5061014d6101d1366004610fea565b600260209081526000928352604080842090915290825290205460ff1681565b61012b6101ff3660046110eb565b6105a3565b34801561021057600080fd5b506000546100ee906001600160a01b031681565b34801561023057600080fd5b5061017266b1a2bc2ec5000081565b34801561024b57600080fd5b5061014d61025a366004611016565b6107e3565b34801561026b57600080fd5b506100ee7f000000000000000000000000000000000000000000000000000000000000000081565b34801561029f57600080fd5b5061012b6102ae366004611016565b61084a565b3480156102bf57600080fd5b506101a06102ce366004611016565b610b01565b60008381526001602052604090206004810154600160a01b900460ff166103155760405162461bcd60e51b815260040161030c9061115d565b60405180910390fd5b80546001600160a01b038481169116148061033f575060018101546001600160a01b038481169116145b61037c5760405162461bcd60e51b815260206004820152600e60248201526d24b73b30b634b2103bb4b73732b960911b604482015260640161030c565b600781015460ff16156103d15760405162461bcd60e51b815260206004820152601760248201527f526573756c7420616c7265616479207665726966696564000000000000000000604482015260640161030c565b60078101805460ff191660011790556004810180546001600160a01b0385166001600160a01b0319909116811790915560405185907f39fb63f85a0caba393e4013252149c548fc684645d32b1b2892424f665d166f390610433908690611186565b60405180910390a36104458484610bf7565b50505050565b60008281526002602090815260408083206001600160a01b038516845290915290205460ff165b92915050565b60008181526001602081905260408220805491810154600282015460038301546004840154600585015460078601546006870180548a998a998a998a998a998a998a996060998b9996986001600160a01b039889169896871697959694959484169460ff600160a01b8604811695600160a81b9004811694939192911690829061050190611199565b80601f016020809104026020016040519081016040528092919081815260200182805461052d90611199565b801561057a5780601f1061054f5761010080835404028352916020019161057a565b820191906000526020600020905b81548152906001019060200180831161055d57829003601f168201915b505050505091509a509a509a509a509a509a509a509a509a509a50509193959799509193959799565b66b1a2bc2ec500003410156105f15760405162461bcd60e51b8152602060048201526014602482015273496e73756666696369656e74206761732066656560601b604482015260640161030c565b6000858152600160205260409020546001600160a01b03161561064c5760405162461bcd60e51b815260206004820152601360248201527247616d6520616c72656164792065786973747360681b604482015260640161030c565b604051806101400160405280856001600160a01b03168152602001846001600160a01b0316815260200183815260200183600261068991906111e9565b8152600060208083018290526001604080850182905260608086018590524260808088019190915260a08088018a905260c09788018790528d875284865295839020885181546001600160a01b039182166001600160a01b0319918216178355968a015195820180549682169690971695909517909555918701516002850155860151600384015585015160048301805494870151958701511515600160a81b0260ff60a81b19961515600160a01b026001600160a81b03199096169290931691909117939093179390931692909217905560e08201516005820155610100820151600682019061077a908261124f565b5061012091909101516007909101805460ff19169115159190911790556040518281526001600160a01b03848116919086169087907fb653067b29ff213be334638862d1e3f28be365b33e8eb9558742962f699a6ffd9060200160405180910390a45050505050565b60008181526001602090815260408083206002835281842081546001600160a01b0316855290925282205460ff1680156108435750600083815260026020908152604080832060018501546001600160a01b0316845290915290205460ff165b9392505050565b60008181526001602052604090206004810154600160a01b900460ff166108835760405162461bcd60e51b815260040161030c9061115d565b80546001600160a01b03163314806108a7575060018101546001600160a01b031633145b6108e25760405162461bcd60e51b815260206004820152600c60248201526b2737ba103090383630bcb2b960a11b604482015260640161030c565b600082815260026020908152604080832033845290915290205460ff161561093b5760405162461bcd60e51b815260206004820152600c60248201526b105b1c9958591e481c185a5960a21b604482015260640161030c565b60028101546040516323b872dd60e01b815233600482015230602482015260448101919091527f00000000000000000000000000000000000000000000000000000000000000006001600160a01b0316906323b872dd906064016020604051808303816000875af11580156109b4573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906109d8919061130f565b610a165760405162461bcd60e51b815260206004820152600f60248201526e151c985b9cd9995c8819985a5b1959608a1b604482015260640161030c565b60008281526002602081815260408084203380865290835293819020805460ff1916600117905591840154915191825284917fc93f6d0048b6bbc9c022a6ab4bf56e25b7cf878e99f831312ec3500ec0eb7b80910160405180910390a3600082815260026020908152604080832084546001600160a01b0316845290915290205460ff168015610acc5750600082815260026020908152604080832060018501546001600160a01b0316845290915290205460ff165b15610afd5760405182907fee5528ba4f234f658c6a97a7e3cba5532e7aad23bb249be4141b62e6a0158a7c90600090a25b5050565b600160208190526000918252604090912080549181015460028201546003830154600484015460058501546006860180546001600160a01b039889169896871697959694959484169460ff600160a01b8604811695600160a81b90041693929091610b6b90611199565b80601f0160208091040260200160405190810160405280929190818152602001828054610b9790611199565b8015610be45780601f10610bb957610100808354040283529160200191610be4565b820191906000526020600020905b815481529060010190602001808311610bc757829003601f168201915b5050506007909301549192505060ff168a565b60008281526001602052604090206004810154600160a01b900460ff16610c305760405162461bcd60e51b815260040161030c9061115d565b600781015460ff16610c7a5760405162461bcd60e51b815260206004820152601360248201527214995cdd5b1d081b9bdd081d995c9a599a5959606a1b604482015260640161030c565b60048101805461ffff60a01b1916600160a81b179055600381015460006064610ca46005846111e9565b610cae9190611331565b90506000610cbc8284611353565b60405163a9059cbb60e01b81526001600160a01b038781166004830152602482018390529192507f00000000000000000000000000000000000000000000000000000000000000009091169063a9059cbb906044016020604051808303816000875af1158015610d30573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190610d54919061130f565b610d975760405162461bcd60e51b815260206004820152601460248201527315da5b9b995c881c185e5bdd5d0819985a5b195960621b604482015260640161030c565b60405163a9059cbb60e01b8152735ad5ae34265957fb08ea12f77baff1200060473e6004820152602481018390527f00000000000000000000000000000000000000000000000000000000000000006001600160a01b03169063a9059cbb906044016020604051808303816000875af1158015610e18573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190610e3c919061130f565b610e885760405162461bcd60e51b815260206004820152601960248201527f486f75736520666565207472616e73666572206661696c656400000000000000604482015260640161030c565b846001600160a01b0316867fd1abccae8934d5ff9b57f5f0a1bebe781f8f34d4c1c7b20e7634381deebc8db583604051610ec491815260200190565b60405180910390a3505050505050565b80356001600160a01b0381168114610eeb57600080fd5b919050565b634e487b7160e01b600052604160045260246000fd5b600082601f830112610f1757600080fd5b813567ffffffffffffffff80821115610f3257610f32610ef0565b604051601f8301601f19908116603f01168101908282118183101715610f5a57610f5a610ef0565b81604052838152866020858801011115610f7357600080fd5b836020870160208301376000602085830101528094505050505092915050565b600080600060608486031215610fa857600080fd5b83359250610fb860208501610ed4565b9150604084013567ffffffffffffffff811115610fd457600080fd5b610fe086828701610f06565b9150509250925092565b60008060408385031215610ffd57600080fd5b8235915061100d60208401610ed4565b90509250929050565b60006020828403121561102857600080fd5b5035919050565b6000815180845260005b8181101561105557602081850181015186830182015201611039565b506000602082860101526020601f19601f83011685010191505092915050565b6001600160a01b038b811682528a81166020830152604082018a9052606082018990528716608082015285151560a082015284151560c082015260e0810184905261014061010082018190526000906110d08382018661102f565b9150508215156101208301529b9a5050505050505050505050565b600080600080600060a0868803121561110357600080fd5b8535945061111360208701610ed4565b935061112160408701610ed4565b925060608601359150608086013567ffffffffffffffff81111561114457600080fd5b61115088828901610f06565b9150509295509295909350565b6020808252600f908201526e47616d65206e6f742061637469766560881b604082015260600190565b602081526000610843602083018461102f565b600181811c908216806111ad57607f821691505b6020821081036111cd57634e487b7160e01b600052602260045260246000fd5b50919050565b634e487b7160e01b600052601160045260246000fd5b8082028115828204841417610472576104726111d3565b601f82111561124a57600081815260208120601f850160051c810160208610156112275750805b601f850160051c820191505b8181101561124657828155600101611233565b5050505b505050565b815167ffffffffffffffff81111561126957611269610ef0565b61127d816112778454611199565b84611200565b602080601f8311600181146112b2576000841561129a5750858301515b600019600386901b1c1916600185901b178555611246565b600085815260208120601f198616915b828110156112e1578886015182559484019460019091019084016112c2565b50858210156112ff5787850151600019600388901b60f8161c191681555b5050505050600190811b01905550565b60006020828403121561132157600080fd5b8151801515811461084357600080fd5b60008261134e57634e487b7160e01b600052601260045260246000fd5b500490565b81810381811115610472576104726111d356fea2646970667358221220227d3dc2e5a8200f4b778b7cd57c1a76050538274a01163f1e0bdfb550abb8bd64736f6c63430008130033';

// UNO Gamble Smart Contract ABI
const UNO_GAMBLE_ABI = [
  "constructor(address _arcToken)",
  "function createGame(bytes32 gameId, address player1, address player2, uint256 betAmount, string memory gameIdString) external payable",
  "function payBet(bytes32 gameId) external",
  "function verifyGameResult(bytes32 gameId, address winner, string memory resultData) external",
  "function completeGame(bytes32 gameId, address winner) external",
  "function getGame(bytes32 gameId) external view returns (address, address, uint256, uint256, address, bool, bool, uint256, string memory, bool)",
  "function hasPlayerPaid(bytes32 gameId, address player) external view returns (bool)",
  "function isGameReady(bytes32 gameId) external view returns (bool)",
  "event GameCreated(bytes32 indexed gameId, address indexed player1, address indexed player2, uint256 betAmount)",
  "event PlayerPaid(bytes32 indexed gameId, address indexed player, uint256 amount)",
  "event GameStarted(bytes32 indexed gameId)",
  "event GameCompleted(bytes32 indexed gameId, address indexed winner, uint256 payout)",
  "event GameResultVerified(bytes32 indexed gameId, address indexed winner, string resultData)"
];

// ARC Token ABI (simplified)
const ARC_TOKEN_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function transfer(address to, uint256 amount) external returns (bool)"
];

export class UnoGambleContract {
  private provider: ethers.JsonRpcProvider;
  private signer: ethers.Signer | null = null;
  private contract: ethers.Contract | null = null;
  private arcToken: ethers.Contract | null = null;
  
  constructor() {
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.soniclabs.com/';
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
  }
  
  // Step 1: Pay deployment fee to game wallet
  async payDeploymentFee(): Promise<string> {
    if (!this.signer) {
      throw new Error('Signer not initialized');
    }
    
    try {
      console.log('💰 [UNO GAMBLE] Paying deployment fee...');
      
      const gameWallet = '0x5AD5aE34265957fB08eA12f77BAFf1200060473e';
      const deploymentFee = ethers.parseEther('0.05'); // 0.05 S
      
      const tx = await this.signer.sendTransaction({
        to: gameWallet,
        value: deploymentFee,
        gasLimit: 21000
      });
      
      console.log('📝 [UNO GAMBLE] Deployment fee transaction:', tx.hash);
      await tx.wait();
      
      return tx.hash;
      
    } catch (error) {
      console.error('❌ [UNO GAMBLE] Deployment fee payment failed:', error);
      throw error;
    }
  }
  
  // Verify deployment fee payment on blockchain
  async verifyDeploymentPayment(txHash: string, playerAddress: string): Promise<boolean> {
    try {
      console.log('🔍 [UNO GAMBLE] Verifying deployment payment:', txHash);
      
      const receipt = await this.provider.getTransactionReceipt(txHash);
      if (!receipt) {
        console.log('❌ [UNO GAMBLE] Transaction not found');
        return false;
      }
      
      const gameWallet = '0x5AD5aE34265957fB08eA12f77BAFf1200060473e';
      const expectedAmount = ethers.parseEther('0.05');
      
      // Get the actual transaction to verify value
      const tx = await this.provider.getTransaction(txHash);
      if (!tx) {
        console.log('❌ [UNO GAMBLE] Transaction details not found');
        return false;
      }
      
      // Verify transaction details
      const isValidRecipient = tx.to?.toLowerCase() === gameWallet.toLowerCase();
      const isValidSender = tx.from?.toLowerCase() === playerAddress.toLowerCase();
      const isValidAmount = tx.value === expectedAmount;
      const isSuccessful = receipt.status === 1;
      
      const isValid = isValidRecipient && isValidSender && isValidAmount && isSuccessful;
      
      console.log('✅ [UNO GAMBLE] Payment verification result:', {
        isValidRecipient,
        isValidSender, 
        isValidAmount: `${ethers.formatEther(tx.value)} S`,
        expectedAmount: `${ethers.formatEther(expectedAmount)} S`,
        isSuccessful,
        isValid
      });
      
      return isValid;
      
    } catch (error) {
      console.error('❌ [UNO GAMBLE] Payment verification failed:', error);
      return false;
    }
  }
  
  async initialize(signer: ethers.Signer, contractAddress: string) {
    this.signer = signer;
    
    // Only initialize contract if we have a valid address
    if (contractAddress && contractAddress !== '') {
      this.contract = new ethers.Contract(contractAddress, UNO_GAMBLE_ABI, signer);
    }
    
    // Initialize ARC token contract
    this.arcToken = new ethers.Contract(ARC_TOKEN_ADDRESS, ARC_TOKEN_ABI, signer);
  }
  
  // Deploy a new UNO Gamble contract after payment verification
  async deployGameContract(): Promise<string> {
    if (!this.signer) {
      throw new Error('Signer not initialized');
    }
    
    try {
      console.log('🚀 [UNO GAMBLE] Deploying new contract...');
      
      // Create contract factory with updated ABI
      const contractFactory = new ethers.ContractFactory(
        UNO_GAMBLE_ABI,
        UNO_GAMBLE_BYTECODE,
        this.signer
      );
      
      console.log('⏳ [UNO GAMBLE] Deploying contract with ARC token:', ARC_TOKEN_ADDRESS);
      
      // Deploy the contract
      const contract = await contractFactory.deploy(ARC_TOKEN_ADDRESS, {
        gasLimit: 2000000
      });
      
      console.log('⏳ [UNO GAMBLE] Waiting for deployment confirmation...');
      await contract.waitForDeployment();
      
      const contractAddress = await contract.getAddress();
      console.log('✅ [UNO GAMBLE] Contract deployed to:', contractAddress);
      
      return contractAddress;
      
    } catch (error) {
      console.error('❌ [UNO GAMBLE] Contract deployment failed:', error);
      throw error;
    }
  }
  
  // Create a new gambling game (after deployment fee is verified)
  async createGame(
    gameId: string,
    player1: string,
    player2: string,
    betAmount: string
  ): Promise<GameCreationResult> {
    if (!this.contract || !this.signer) {
      throw new Error('Contract not initialized');
    }
    
    try {
      console.log('🎮 [UNO GAMBLE] Creating game:', { gameId, player1, player2, betAmount });
      
      const gameIdBytes = ethers.id(gameId); // Convert to bytes32
      const betAmountWei = ethers.parseEther(betAmount);
      const gasFee = ethers.parseEther('0.05'); // 0.05 S for contract operations
      
      // Use zero address if player2 is empty or invalid
      const player2Address = player2 && player2.trim() !== '' ? player2 : ethers.ZeroAddress;
      
      const tx = await this.contract.createGame(
        gameIdBytes,
        player1,
        player2Address,
        betAmountWei,
        gameId, // gameIdString parameter
        { value: gasFee } // Additional 0.05 S to contract for operations
      );
      
      console.log('📝 [UNO GAMBLE] Game creation transaction:', tx.hash);
      await tx.wait();
      
      return {
        gameId,
        contractAddress: await this.contract.getAddress(),
        txHash: tx.hash
      };
      
    } catch (error) {
      console.error('❌ [UNO GAMBLE] Game creation failed:', error);
      throw error;
    }
  }
  
  // Verify game result and trigger winner payout
  async verifyGameResult(
    gameId: string,
    winner: string,
    resultData: string
  ): Promise<string> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }
    
    try {
      console.log('🏆 [UNO GAMBLE] Verifying game result:', { gameId, winner, resultData });
      
      const gameIdBytes = ethers.id(gameId);
      const tx = await this.contract.verifyGameResult(gameIdBytes, winner, resultData);
      
      console.log('📝 [UNO GAMBLE] Game result verification transaction:', tx.hash);
      await tx.wait();
      
      return tx.hash;
      
    } catch (error) {
      console.error('❌ [UNO GAMBLE] Game result verification failed:', error);
      throw error;
    }
  }
  
  // Check and approve ARC tokens for betting
  async approveTokens(betAmount: string): Promise<string> {
    if (!this.arcToken || !this.contract || !this.signer) {
      throw new Error('Contracts not initialized');
    }
    
    try {
      const betAmountWei = ethers.parseEther(betAmount);
      const contractAddress = await this.contract.getAddress();
      
      // Check current allowance
      const currentAllowance = await this.arcToken.allowance(
        await this.signer.getAddress(),
        contractAddress
      );
      
      if (currentAllowance >= betAmountWei) {
        console.log('✅ [UNO GAMBLE] Sufficient allowance already exists');
        return '';
      }
      
      console.log('🔓 [UNO GAMBLE] Approving ARC tokens:', betAmount);
      
      const tx = await this.arcToken.approve(contractAddress, betAmountWei);
      console.log('📝 [UNO GAMBLE] Approval transaction:', tx.hash);
      
      await tx.wait();
      return tx.hash;
      
    } catch (error) {
      console.error('❌ [UNO GAMBLE] Token approval failed:', error);
      throw error;
    }
  }
  
  // Pay the bet for a game
  async payBet(gameId: string): Promise<PaymentResult> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }
    
    try {
      console.log('💰 [UNO GAMBLE] Paying bet for game:', gameId);
      
      const gameIdBytes = ethers.id(gameId);
      const tx = await this.contract.payBet(gameIdBytes);
      
      console.log('📝 [UNO GAMBLE] Payment transaction:', tx.hash);
      await tx.wait();
      
      return {
        txHash: tx.hash,
        success: true
      };
      
    } catch (error) {
      console.error('❌ [UNO GAMBLE] Payment failed:', error);
      return {
        txHash: '',
        success: false
      };
    }
  }
  
  // Complete the game and distribute winnings
  async completeGame(gameId: string, winner: string): Promise<string> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }
    
    try {
      console.log('🏆 [UNO GAMBLE] Completing game:', { gameId, winner });
      
      const gameIdBytes = ethers.id(gameId);
      const tx = await this.contract.completeGame(gameIdBytes, winner);
      
      console.log('📝 [UNO GAMBLE] Game completion transaction:', tx.hash);
      await tx.wait();
      
      return tx.hash;
      
    } catch (error) {
      console.error('❌ [UNO GAMBLE] Game completion failed:', error);
      throw error;
    }
  }
  
  // Get game information
  async getGame(gameId: string): Promise<UnoGambleGame | null> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }
    
    try {
      const gameIdBytes = ethers.id(gameId);
      const result = await this.contract.getGame(gameIdBytes);
      
      return {
        player1: result[0],
        player2: result[1],
        betAmount: ethers.formatEther(result[2]),
        totalPot: ethers.formatEther(result[3]),
        winner: result[4],
        isActive: result[5],
        isCompleted: result[6],
        createdAt: Number(result[7])
      };
      
    } catch (error) {
      console.error('❌ [UNO GAMBLE] Failed to get game info:', error);
      return null;
    }
  }
  
  // Check if player has paid
  async hasPlayerPaid(gameId: string, player: string): Promise<boolean> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }
    
    try {
      const gameIdBytes = ethers.id(gameId);
      return await this.contract.hasPlayerPaid(gameIdBytes, player);
    } catch (error) {
      console.error('❌ [UNO GAMBLE] Failed to check payment status:', error);
      return false;
    }
  }
  
  // Check if game is ready to start
  async isGameReady(gameId: string): Promise<boolean> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }
    
    try {
      const gameIdBytes = ethers.id(gameId);
      return await this.contract.isGameReady(gameIdBytes);
    } catch (error) {
      console.error('❌ [UNO GAMBLE] Failed to check game readiness:', error);
      return false;
    }
  }
  
  // Get player's ARC token balance
  async getPlayerBalance(playerAddress: string): Promise<string> {
    try {
      // Create a temporary ARC token contract if not initialized
      let arcTokenContract = this.arcToken;
      if (!arcTokenContract) {
        const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.soniclabs.com/');
        arcTokenContract = new ethers.Contract(ARC_TOKEN_ADDRESS, ARC_TOKEN_ABI, provider);
      }
      
      const balance = await arcTokenContract.balanceOf(playerAddress);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('❌ [UNO GAMBLE] Failed to get player balance:', error);
      return '0';
    }
  }
  
  // Static method to get player balance without initialization
  static async getPlayerBalanceStatic(playerAddress: string): Promise<string> {
    try {
      const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.soniclabs.com/');
      const arcTokenContract = new ethers.Contract(ARC_TOKEN_ADDRESS, ARC_TOKEN_ABI, provider);
      
      const balance = await arcTokenContract.balanceOf(playerAddress);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('❌ [UNO GAMBLE] Failed to get player balance (static):', error);
      return '0';
    }
  }
}

// Export singleton instance
export const unoGambleContract = new UnoGambleContract();