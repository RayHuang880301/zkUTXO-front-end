import { ChainConfig } from "../type";
import { getBigInt, getNumber, getString } from "../utils/helper";
import { mainnet, goerli, arbitrumGoerli, scrollSepolia, mantleTestnet } from "wagmi/chains";

// TODO: MIGRATE FROM .env
export const getChainConfig = (chainId: number): ChainConfig | undefined => {
  switch (chainId) {
    // case mainnet.id:
    //   return MAINNET_CONFIG;
    case goerli.id:
      return GOERLI_CONFIG;
    case arbitrumGoerli.id:
      return ARBITRUM_GOERLI_CONFIG;
    case scrollSepolia.id:
      return SCROLL_SEPOLIA_CONFIG;
    case mantleTestnet.id:
      return MANTLE_TESTNET_CONFIG;
    default:
      throw new Error(`ChainId ${chainId} not supported`);
  }
};

// export const MAINNET_CONFIG: ChainConfig = {
//   chainId: 1,
//   cipherContractAddress: getString(
//     process.env.NEXT_PUBLIC_MAINNET_CIPHER_CONTRACT_ADDRESS
//   ) as `0x${string}`,
//   subgraphUrl: getString(process.env.NEXT_PUBLIC_MAINNET_CIPHER_SUBGRAPH_URL, {
//     required: false,
//   }),
//   startBlock: getBigInt(
//     process.env.NEXT_PUBLIC_MAINNET_CIPHER_START_BLOCK_NUMBER
//   ),
//   syncBlockBatchSize: getNumber(
//     process.env.NEXT_PUBLIC_MAINNET_CIPHER_SYNC_LOGS_BATCH_BLOCK_SIZE,
//     {
//       defaultVal: "1000",
//     }
//   ),
// };

export const GOERLI_CONFIG: ChainConfig = {
  chainId: 5,
  cipherContractAddress: getString(
    process.env.NEXT_PUBLIC_GOERLI_CIPHER_CONTRACT_ADDRESS
  ) as `0x${string}`,
  subgraphUrl: getString(process.env.NEXT_PUBLIC_GOERLI_CIPHER_SUBGRAPH_URL, {
    required: false,
  }),
  startBlock: getBigInt(
    process.env.NEXT_PUBLIC_GOERLI_CIPHER_START_BLOCK_NUMBER
  ),
  syncBlockBatchSize: getNumber(
    process.env.NEXT_PUBLIC_GOERLI_CIPHER_SYNC_LOGS_BATCH_BLOCK_SIZE,
    {
      defaultVal: "1000",
    }
  ),
};

export const ARBITRUM_GOERLI_CONFIG: ChainConfig = {
  chainId: 421613,
  cipherContractAddress: getString(
    process.env.NEXT_PUBLIC_ARBITRUM_GOERLI_CIPHER_CONTRACT_ADDRESS
  ) as `0x${string}`,
  startBlock: getBigInt(
    process.env.NEXT_PUBLIC_ARBITRUM_GOERLI_CIPHER_START_BLOCK_NUMBER
  ),
  subgraphUrl: getString(
    process.env.NEXT_PUBLIC_ARBITRUM_GOERLI_CIPHER_SUBGRAPH_URL,
    {
      required: false,
    }
  ),
  syncBlockBatchSize: getNumber(
    process.env.NEXT_PUBLIC_ARBITRUM_GOERLI_CIPHER_SYNC_LOGS_BATCH_BLOCK_SIZE,
    {
      defaultVal: "1000",
    }
  ),
};

export const SCROLL_SEPOLIA_CONFIG: ChainConfig = {
  chainId: 534351,
  cipherContractAddress: getString(
    process.env.NEXT_PUBLIC_SCROLL_SEPOLIA_CIPHER_CONTRACT_ADDRESS
  ) as `0x${string}`,
  startBlock: getBigInt(
    process.env.NEXT_PUBLIC_SCROLL_SEPOLIA_CIPHER_START_BLOCK_NUMBER
  ),
  subgraphUrl: getString(
    process.env.NEXT_PUBLIC_SCROLL_SEPOLIA_CIPHER_SUBGRAPH_URL,
    {
      required: false,
    }
  ),
  syncBlockBatchSize: getNumber(
    process.env.NEXT_PUBLIC_SCROLL_SEPOLIA_CIPHER_SYNC_LOGS_BATCH_BLOCK_SIZE,
    {
      defaultVal: "1000",
    }
  ),
  legacyTx: true,
};

export const MANTLE_TESTNET_CONFIG: ChainConfig = {
  chainId: 5001,
  cipherContractAddress: getString(
    process.env.NEXT_PUBLIC_MANTLE_TESTNET_CIPHER_CONTRACT_ADDRESS
  ) as `0x${string}`,
  startBlock: getBigInt(
    process.env.NEXT_PUBLIC_MANTLE_TESTNET_CIPHER_START_BLOCK_NUMBER
  ),
  subgraphUrl: getString(
    process.env.NEXT_PUBLIC_MANTLE_TESTNET_CIPHER_SUBGRAPH_URL,
    {
      required: false,
    }
  ),
  syncBlockBatchSize: getNumber(
    process.env.NEXT_PUBLIC_MANTLE_TESTNET_CIPHER_SYNC_LOGS_BATCH_BLOCK_SIZE,
    {
      defaultVal: "1000",
    }
  )
};

console.log({
  message: "chainConfig",
  // MAINNET_CONFIG,
  GOERLI_CONFIG,
  ARBITRUM_GOERLI_CONFIG,
});
