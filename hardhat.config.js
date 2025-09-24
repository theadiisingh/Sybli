require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: ".env.contracts" });

// Ensure you have environment variables for your private key and RPC URL
const privateKey = process.env.PRIVATE_KEY || "";
const sepoliaRpcUrl = process.env.SEPOLIA_RPC_URL || "";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  networks: {
    hardhat: {
      // This is the default local network
    },
    sepolia: {
      url: sepoliaRpcUrl,
      accounts: [`0x${privateKey}`],
    },
  },
};
