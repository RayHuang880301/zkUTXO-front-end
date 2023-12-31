declare module "circomlibjs";
declare module "snarkjs";
declare global {
  interface Window {
    ethereum: any;
  }
}

export enum Mode {
  SIMPLE,
  PRO,
}

export enum SimpleType {
  DEPOSIT,
  WITHDRAW,
}

export type ChainConfig = {
  chainId: number;
  cipherContractAddress: `0x${string}`;
  startBlock: bigint;
  subgraphUrl?: string;
  syncBlockBatchSize: number;
  legacyTx?: boolean;
};

export type TokenConfig = {
  iconUri: StaticImageData;
  address: `0x${string}`;
  symbol: string;
  decimals: number;
  amountTable: number[];
};

export type CipherAccount = {
  seed: bigint | undefined;
  userId: string | undefined;
};

// from wagmi
export type FetchBalanceResult = {
  decimals: number;
  formatted: string;
  symbol: string;
  value: bigint;
};
