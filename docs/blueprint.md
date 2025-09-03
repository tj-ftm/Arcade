# **Sonic Arcade - Multichain Gaming Platform**

## Overview

Sonic Arcade is a comprehensive Web3 gaming platform that supports multiple blockchain networks, offering players the ability to earn ARC tokens through gameplay across various classic games.

## Supported Chains

### Sonic Network (Primary)
- **Chain ID**: 146 (0x92)
- **RPC URL**: https://rpc.soniclabs.com
- **Native Currency**: S (Sonic)
- **Block Explorer**: https://sonicscan.org
- **ARC Token Address**: 0xAD75eAb973D5AbB77DAdc0Ec3047008dF3aa094d

### Base Mainnet (Secondary)
- **Chain ID**: 8453 (0x2105)
- **RPC URL**: https://mainnet.base.org
- **Native Currency**: ETH (Ethereum)
- **Block Explorer**: https://basescan.org
- **ARC Token Address**: 0xAD75eAb973D5AbB77DAdc0Ec3047008dF3aa094d

## Core Features

### Games Available
- **UNO**: Classic card game with single-player, multiplayer, and betting modes
- **Chess**: Strategic board game with AI opponents and multiplayer support
- **8-Ball Pool**: Realistic pool simulation with physics-based gameplay
- **Snake**: Classic arcade game with modern enhancements
- **Platformer**: Side-scrolling adventure game

### Game Modes
- **Single Player**: Play against AI opponents to earn ARC tokens
- **Multiplayer**: Real-time matches against other players via Firebase
- **Betting Mode**: Wager ARC tokens in competitive matches
- **Bonus Mode**: Enhanced rewards for premium gameplay

### Multichain Integration

#### Token Rewards
- ARC tokens are minted on both Sonic and Base chains
- Players can switch between chains seamlessly
- Balances are displayed separately for each chain
- Combined total supply shown in tokenomics dashboard

#### Chain Switching
- Automatic network detection and switching
- Manual chain selection via wallet dropdown
- Chain-specific balance updates
- Transaction routing to appropriate explorer

#### Firebase Lobby System
- Chain and game-specific lobby collections
- Format: `multiplayer-lobbies-{chain}-{game}` (e.g., `multiplayer-lobbies-sonic-chess`)
- Separate betting lobbies: `betting-lobbies-{chain}-{game}`
- Game moves: `multiplayer-game-moves-{chain}-{game}`

## Technical Architecture

### Smart Contracts
- **ARC Token**: ERC-20 token deployed on both chains at the same address
- **Game Contracts**: Handle token minting and game verification
- **Betting Contracts**: Manage wagers and payouts for betting modes

### Frontend Components
- **Web3Provider**: Manages wallet connections and chain switching
- **Firebase Hooks**: Handle real-time multiplayer functionality
- **Game Clients**: Individual game implementations with shared UI patterns
- **Tokenomics Dashboard**: Multi-chain supply tracking and mint history

### Security Features
- **Game Verification**: Server-side validation of game results
- **Anti-Cheat**: Multiple validation layers for token minting
- **Secure Minting**: Private key management for token distribution
- **Rate Limiting**: Prevents abuse of reward systems

## User Experience

### Wallet Integration
- **MetaMask Support**: Primary wallet connection method
- **Chain Management**: Automatic network addition and switching
- **Balance Display**: Real-time updates for both native and ARC tokens
- **Transaction History**: Links to appropriate block explorers

### Mobile Optimization
- **Responsive Design**: Optimized layouts for mobile devices
- **Touch Controls**: Mobile-friendly game interactions
- **Auto-Rotation**: Automatic orientation for optimal gameplay
- **Reduced UI**: Smaller buttons and optimized spacing on mobile

### Gaming Features
- **Progress Warnings**: Alerts when leaving games to prevent progress loss
- **Loading Animations**: Enhanced feedback during token minting
- **Game-Specific Styling**: Unique themes for each game type
- **Error Reporting**: Built-in bug reporting system

## Development Guidelines

### Code Organization
- **Modular Architecture**: Separate components for each game and feature
- **Shared Utilities**: Common functions for Web3 interactions
- **Type Safety**: Comprehensive TypeScript definitions
- **Error Handling**: Graceful degradation and user feedback

### Testing
- **Game Logic**: Unit tests for core game mechanics
- **Web3 Integration**: Mock providers for blockchain interactions
- **UI Components**: Component testing with React Testing Library
- **E2E Testing**: Full user journey validation

### Deployment
- **Multi-Environment**: Development, staging, and production builds
- **Chain Configuration**: Environment-specific contract addresses
- **Performance Monitoring**: Real-time error tracking and analytics
- **Continuous Integration**: Automated testing and deployment pipelines