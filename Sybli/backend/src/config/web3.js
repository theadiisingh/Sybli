/**
 * Web3 Configuration
 * Blockchain connection and configuration settings
 */

module.exports = {
  // Network configurations
  networks: {
    development: {
      name: 'development',
      chainId: 1337,
      provider: process.env.WEB3_PROVIDER || 'http://localhost:8545',
      gasPrice: '20000000000', // 20 gwei
      gasLimit: 6721975
    },

    test: {
      name: 'test',
      chainId: 1337,
      provider: process.env.WEB3_PROVIDER || 'http://localhost:8545',
      gasPrice: '20000000000', // 20 gwei
      gasLimit: 6721975
    },

    mainnet: {
      name: 'mainnet',
      chainId: 1,
      provider: process.env.MAINNET_PROVIDER,
      gasPrice: '20000000000', // 20 gwei
      gasLimit: 6721975
    },

    polygon: {
      name: 'polygon',
      chainId: 137,
      provider: process.env.POLYGON_PROVIDER,
      gasPrice: '40000000000', // 40 gwei
      gasLimit: 6721975
    }
  },

  // Contract addresses
  contracts: {
    nftContract: process.env.NFT_CONTRACT_ADDRESS,
    daoContract: process.env.DAO_CONTRACT_ADDRESS,
    tokenContract: process.env.TOKEN_CONTRACT_ADDRESS
  },

  // Default settings
  defaultNetwork: process.env.NODE_ENV === 'production' ? 'mainnet' : 'development',

  // Transaction settings
  transactionDefaults: {
    gasPrice: '20000000000', // 20 gwei
    gasLimit: 6721975,
    confirmations: 1
  },

  // ABI paths
  abiPaths: {
    nft: './contracts/abis/NFT.json',
    dao: './contracts/abis/DAO.json',
    token: './contracts/abis/Token.json'
  }
};
