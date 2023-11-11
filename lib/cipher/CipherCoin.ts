import { CipherTree } from "./CipherTree";
import { PoseidonHash } from "../../lib/poseidonHash";
import {
  generateCommitment,
  indicesToPathIndices,
  generateNullifier,
  toHashedSalt,
  encodeCipherCode,
} from "./CipherHelper";
import { assert } from "../helper";

export interface CipherCoinKey {
  inSaltOrSeed?: bigint;
  hashedSaltOrUserId: bigint;
  inRandom: bigint;
}

export interface CipherCoinInfo {
  key: CipherCoinKey;
  amount: bigint;
}

export interface CipherOutputCoinKey {
  salt: bigint;
  random: bigint;
  userId: bigint;
}

export interface CipherOutputCoinInfo{
  key: CipherOutputCoinKey;
  amount: bigint;
}

export class CipherBaseCoin {
  coinInfo!: CipherCoinInfo;

  constructor({ key, amount }: CipherCoinInfo) {
    this.coinInfo = {
      key,
      amount,
    };
    if (this.coinInfo.key.inSaltOrSeed) {
      const hashedSaltOrUserId = toHashedSalt(this.coinInfo.key.inSaltOrSeed);
      assert(
        hashedSaltOrUserId === this.coinInfo.key.hashedSaltOrUserId,
        "hashedSaltOrUserId should be equal"
      );
    }
  }

  getCommitment() {
    return generateCommitment({
      amount: this.coinInfo.amount,
      salt: this.coinInfo.key.inSaltOrSeed,
      hashedSalt: this.coinInfo.key.hashedSaltOrUserId,
      random: this.coinInfo.key.inRandom,
    });
  }
}

export class CipherTransferableCoin extends CipherBaseCoin {
  readonly tree!: CipherTree;
  readonly leafId!: number;

  constructor(coinInfo: CipherCoinInfo, tree: CipherTree, leafId: number) {
    super(coinInfo);
    this.tree = tree;
    this.leafId = leafId;
    assert(this.coinInfo.key.inSaltOrSeed, "privKey should not be null");
  }

  toCipherCode(): string {
    return encodeCipherCode({
      amount: this.coinInfo.amount,
      salt: this.coinInfo.key.inSaltOrSeed,
      random: this.coinInfo.key.inRandom,
      userId: this.coinInfo.key.hashedSaltOrUserId,
      tokenAddress: this.tree.tokenAddress,
    });
  }

  getPathIndices() {
    const { indices } = this.tree.genMerklePath(Number(this.leafId));
    return indicesToPathIndices(indices);
  }

  getPathElements() {
    const { pathElements } = this.tree.genMerklePath(Number(this.leafId));
    assert(
      pathElements.every((v) => v.length === 1),
      "pathElements each length should be 1"
    );
    return pathElements.map((v) => v[0]);
  }

  getNullifier() {
    assert(this.coinInfo.key.inSaltOrSeed, "inSaltOrSeed should not be null");
    const { indices } = this.tree.genMerklePath(this.leafId);
    const pathIndices = indicesToPathIndices(indices);
    const commitment = this.getCommitment();
    return generateNullifier(
      commitment,
      pathIndices,
      this.coinInfo.key.inSaltOrSeed
    );
  }
}

export class CipherOutputCoin {
  readonly tokenAddress!: string;
  readonly coinInfo!: CipherOutputCoinInfo;

  constructor(coinInfo: CipherOutputCoinInfo, tokenAddress: string) {
    this.coinInfo = coinInfo;
    this.tokenAddress = tokenAddress;

    assert(this.coinInfo.key.random > 0n, "random should not be 0");
    if(this.coinInfo.key.salt === 0n && this.coinInfo.key.userId !== 0n) {
      throw new Error("salt should be 0 and userId should not be 0");
    }

    if(this.coinInfo.key.userId === 0n && this.coinInfo.key.salt === 0n) {
      throw new Error("salt and userId should not be 0");
    }
  }

  get hashedSaltOrUserId(): bigint {
    if(this.coinInfo.key.salt === 0n && this.coinInfo.key.userId !== 0n) {
      return this.coinInfo.key.userId;
    }
    if(this.coinInfo.key.salt !== 0n) {
      return toHashedSalt(this.coinInfo.key.salt);
    }
    throw new Error("salt and userId should not be 0");
  }

  toCipherCode(): string {
    return encodeCipherCode({
      amount: this.coinInfo.amount,
      salt: this.coinInfo.key.salt,
      random: this.coinInfo.key.random,
      userId: this.coinInfo.key.userId,
      tokenAddress: this.tokenAddress,
    });
  }

  getCommitment() {
    if(this.coinInfo.key.salt === 0n && this.coinInfo.key.userId !== 0n) {
      return generateCommitment({
        amount: this.coinInfo.amount,
        hashedSalt: this.coinInfo.key.userId,
        random: this.coinInfo.key.random,
      });
    }
    if(this.coinInfo.key.salt !== 0n) {
      return generateCommitment({
        amount: this.coinInfo.amount,
        salt: this.coinInfo.key.salt,
        random: this.coinInfo.key.random,
      });
    }
    throw new Error("salt and userId should not be 0");
  }
}