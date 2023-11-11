import {
  ARBITRUM_GOERLI_TOKEN_CONFIG,
  GOERLI_TOKEN_CONFIG,
  MAINNET_TOKEN_CONFIG,
  MANTLE_TESTNET_TOKEN_CONFIG,
  SCROLL_SEPOLIA_TOKEN_CONFIG,
} from "../configs/tokenConfig";
import { TokenConfig } from "../type";

export function getTokenConfig(chainId: number): TokenConfig[] {
  // mainnet
  if (chainId === 1) {
    return MAINNET_TOKEN_CONFIG;
    // goerli
  } else if (chainId === 5) {
    return GOERLI_TOKEN_CONFIG;
  } else if (chainId === 421613) {
    return ARBITRUM_GOERLI_TOKEN_CONFIG;
  } else if (chainId === 534351) {
    return SCROLL_SEPOLIA_TOKEN_CONFIG;
  } else if (chainId === 5001) {
    return MANTLE_TESTNET_TOKEN_CONFIG;
  } else {
    return MAINNET_TOKEN_CONFIG;
  }
}
