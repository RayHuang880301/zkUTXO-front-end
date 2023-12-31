import { PublicClient, parseAbiItem } from "viem";
import {
  NewCommitmentLogType,
  NewCommitmentLogsType,
  TreeCacheItem,
  TreeSyncingQueueContext,
  TreeSyncingQueueItem,
} from "./types/CipherNewCommitment.type";
import { assert, retry } from "../helper";
import { delay } from "./CipherHelper";
import CipherAbi from "./CipherAbi.json";
import { ChainConfig } from "../../type";
import { CipherSubgraph } from "../graphql";

// const NewCommitmentAbi = CipherAbi.abi.find((abi) => abi.name === 'NewCommitment' && abi.type === 'event');
// assert(NewCommitmentAbi, `NewCommitmentAbi is undefined`);
// const NewCommitmentAbiType = NewCommitmentAbi.inputs.map((input) => `${input.type} ${input.name}`).join(',');
const NewCommitmentAbiItem = parseAbiItem(
  "event NewCommitment(address indexed token, uint256 newRoot, uint256 commitment, uint256 leafIndex)"
);

type CipherTreeDataCache = Map<string, TreeCacheItem>;

export class CipherTreeDataCollector {
  cipherSubgraph?: CipherSubgraph;
  config!: ChainConfig;
  treeCache!: CipherTreeDataCache;

  constructor(config: ChainConfig) {
    if(!config.cipherContractAddress) throw new Error("cipherContractAddress is undefined");
    if(config.subgraphUrl) {
      this.cipherSubgraph = new CipherSubgraph(config.subgraphUrl);
    }
    this.config = config;
    this.treeCache = new Map<string, TreeCacheItem>();
    console.log({
      message: "CipherTreeDataCollector constructor",
      config,
    });
  }

  async syncNewCommitment(
    treeCacheItem: TreeCacheItem,
    context: TreeSyncingQueueContext
  ) {
    if(!this.config.cipherContractAddress) return Promise.reject("cipherContractAddress is undefined");
    return new Promise<TreeCacheItem>(async (resolve, reject) => {
      if(this.config.subgraphUrl) {
        try {
          const result = await this.syncNewCommitmentFromSubgraph(
            treeCacheItem,
            context
          );
          return resolve(result);
        } catch (subGraphError) {
          console.error(
            "syncNewCommitmentFromSubgraph error, try syncNewCommitmentFromRpc"
          );
        }
      }
  
      try {
        const result = await this.syncNewCommitmentFromRpc(treeCacheItem, context);
        return resolve(result);
      } catch (error) {
        console.error("syncNewCommitmentFromRpc error, stop");
        reject(error);
      }
    });
  }
  
  async syncNewCommitmentFromSubgraph(
    treeCacheItem: TreeCacheItem,
    context: TreeSyncingQueueContext
  ) {
    try {
      if(!this.cipherSubgraph) throw new Error("cipherSubgraph is undefined");
      console.log({
        message: "start syncNewCommitmentFromSubgraph",
        treeCacheItem,
        context,
      });
      const tokenAddress = treeCacheItem.cipherTree.tokenAddress;
      const { data } = await this.cipherSubgraph.fetchNewCommitmentsEvents({
        tokenAddress,
        startBlock: Number(context.currentStartBlock),
      });
      console.log({
        message: "fetchNewCommitmentsEvents success",
        tokenAddress,
        startBlock: Number(context.currentStartBlock),
        tmp: data,
      });
      const events = [...data.newCommitments]; // TODO: handle tricky case: data.newCommitments is readonly array
      console.log({
        message: "end syncNewCommitmentFromSubgraph",
        treeCacheItem,
        context,
        newEvents: events,
      });
      await updateCipherTreeFromEvents(treeCacheItem, events);
      const root = treeCacheItem.cipherTree.root;
      const contractRoot = await getContractTreeRoot(
        context.publicClient,
        this.config.cipherContractAddress,
        treeCacheItem.cipherTree.tokenAddress
      );
      this.treeCache.set(tokenAddress, treeCacheItem);
      if (root !== contractRoot) {
        console.warn(
          `root !== contractRoot, root=${root}, contractRoot=${contractRoot}, endBlock=${treeCacheItem.endBlock}`
        );
        const latestBlockNumber = await retry(
          async () => {
            return await context.publicClient.getBlockNumber();
          },
          5,
          2000
        );
        context.latestBlockNumber = BigInt(latestBlockNumber);
        return await this.syncNewCommitmentFromRpc(treeCacheItem, context);
      } else {
        treeCacheItem.isSyncing = false;
      }
    } catch (error) {
      console.error(error);
    }
    return treeCacheItem;
  }
  
  async syncNewCommitmentFromRpc(
    treeCacheItem: TreeCacheItem,
    context: TreeSyncingQueueContext
  ) {
    console.log({
      message: "start syncNewCommitmentFromRpc",
      treeCacheItem,
      config: context,
    });
    const tokenAddress = treeCacheItem.cipherTree.tokenAddress;
    let tmpEvents: NewCommitmentLogsType = [];
    while (context.currentEndBlock <= context.latestBlockNumber) {
      try {
        if (context.isStop) {
          break;
        }
        console.log(
          `parsing ${context.currentStartBlock} ~ ${context.currentEndBlock} (EndBlockNumber=${context.latestBlockNumber}) ......`
        );
        const rawEvents = await retry(
          async () => {
            const tmpLogs = await getCipherCommitmentLogs(
              context.publicClient,
              this.config.cipherContractAddress,
              context.currentStartBlock,
              context.currentEndBlock
            );
            console.log({
              message: "getCipherCommitmentLogs",
              tmpLogs,
            });
            return tmpLogs;
          },
          5,
          5000,
          async (error, retryTimes) => {
            console.error(
              `ERROR: getCipherCommitmentLogs RETRY, tokenAddress=${tokenAddress}, errorTimes=${retryTimes}`
            );
            console.error(error);
          }
        );
        tmpEvents = tmpEvents.concat(
          rawEvents.map((rawEvent) => {
            const r: NewCommitmentLogType = {
              blockNumber: rawEvent.blockNumber.toString(),
              leafIndex: rawEvent.args.leafIndex?.toString() || "",
              commitment: rawEvent.args.commitment?.toString() || "",
              newRoot: rawEvent.args.newRoot?.toString(),
            };
            return r;
          })
        );
  
        context.currentStartBlock = context.currentEndBlock + 1n;
        context.currentEndBlock =
          context.currentEndBlock + context.batchSize > context.latestBlockNumber
            ? context.latestBlockNumber
            : context.currentEndBlock + context.batchSize;
        if (context.currentStartBlock > context.latestBlockNumber) {
          break;
        }
      } catch (error) {
        console.error(error);
        treeCacheItem.isSyncing = false;
        await updateCipherTreeFromEvents(treeCacheItem, tmpEvents);
        this.treeCache.set(tokenAddress, treeCacheItem);
        throw error;
      }
      await delay(Math.floor(Math.random() * 500 + 300)); // avoid rate limit, 300ms ~ 800ms
    }
    treeCacheItem.isSyncing = false;
    console.log({
      message: "end syncNewCommitmentFromRpc",
      treeCacheItem,
      context,
      tmpEvents,
    });
    await updateCipherTreeFromEvents(treeCacheItem, tmpEvents);
    treeCacheItem.isSyncing = false;

    // NOTE: only sync from rpc would assign `context.currentEndBlock` to treeCacheItem.endBlock
    // due to subgraph doesn't provide latest blockNumber what it has been synced
    treeCacheItem.endBlock = context.currentEndBlock;
    this.treeCache.set(tokenAddress, treeCacheItem);
  
    return treeCacheItem;
  }

  async syncNewCommitmentFromRpcWithRawLogs(
    treeCacheItem: TreeCacheItem,
    context: TreeSyncingQueueContext
  ): Promise<TreeCacheItem> {
    const publicClient = context.publicClient;
    const logs = await publicClient.getLogs({
      address: this.config.cipherContractAddress,
      fromBlock: context.currentStartBlock,
      toBlock: context.currentEndBlock,
    })

    console.log({
      logs,
    })
    
    return treeCacheItem;
  }
}

export async function updateCipherTreeFromEvents(
  treeCacheItem: TreeCacheItem,
  newEvents: NewCommitmentLogsType
) {
  // merge old events and new events, new events will overwrite old events
  const eventMap = new Map<string, NewCommitmentLogType>();
  treeCacheItem.events.forEach((oldEvent) => {
    eventMap.set(oldEvent.leafIndex, oldEvent);
  });
  newEvents.forEach((newEvent) => {
    eventMap.set(newEvent.leafIndex, newEvent);
  });

  // check all events leafIndex is continuous and start from 0
  const sortedAscAndUniqueEvents = Array.from(eventMap.values()).sort(
    (a, b) => Number(a.leafIndex) - Number(b.leafIndex)
  );
  for (let i = 0; i < sortedAscAndUniqueEvents.length; i++) {
    const event = sortedAscAndUniqueEvents[i];
    assert(
      Number(event.leafIndex) === i,
      `leafIndex is not continuous, leafIndex=${event.leafIndex}, index=${i}`
    );
  }

  // insert commitment to tree from nextLeafIndex
  const cipherTree = treeCacheItem.cipherTree;
  const nextLeafIndex = cipherTree.nextIndex;
  for (
    let leafIndex = nextLeafIndex;
    leafIndex < sortedAscAndUniqueEvents.length;
    leafIndex++
  ) {
    const event = sortedAscAndUniqueEvents[leafIndex];
    const commitment = event.commitment;
    assert(commitment !== undefined, `commitment is undefined`);
    cipherTree.insert(BigInt(commitment));
  }

  // update treeCacheItem
  treeCacheItem.events = sortedAscAndUniqueEvents;
  if (treeCacheItem.events.length > 0) {
    const firstEvent = treeCacheItem.events[0];
    treeCacheItem.fromBlock = BigInt(firstEvent.blockNumber);
    const lastEvent = treeCacheItem.events[treeCacheItem.events.length - 1];
    treeCacheItem.endBlock = BigInt(lastEvent.blockNumber);
  }

  return {
    cipherTree,
    events: sortedAscAndUniqueEvents,
  };
}

export async function getCipherCommitmentLogs(
  publicClient: PublicClient,
  cipherContractAddress: string,
  fromBlock: bigint,
  toBlock: bigint
) {
  try {
    const filter = await publicClient.createEventFilter({
      address: cipherContractAddress as any as `0x${string}`,
      event: NewCommitmentAbiItem,
      fromBlock,
      toBlock,
    });
  
    const logs = await publicClient.getFilterLogs({
      filter,
    });
    return logs;
  } catch (error: any) {
    if(error.code === -32601) {
      // the method eth_newFilter does not exist/is not available
      console.warn("eth_newFilter is not available, try eth_getLogs");
      return await getCipherRawLogs(publicClient, cipherContractAddress, fromBlock, toBlock);
    }
    throw error;
  }
}

export async function getCipherRawLogs(
  publicClient: PublicClient,
  cipherContractAddress: string,
  fromBlock: bigint,
  toBlock: bigint
) {
  const logs = await publicClient.getLogs({
    address: cipherContractAddress as any as `0x${string}`,
    event: NewCommitmentAbiItem,
    fromBlock,
    toBlock,
  })
  return logs;
}

async function getContractTreeRoot(
  publicClient: PublicClient,
  cipherAddress: string,
  token: string
) {
  const d = await publicClient.readContract({
    abi: CipherAbi.abi,
    address: cipherAddress as any as `0x${string}`,
    functionName: "getTreeRoot",
    args: [token],
  });
  return d as bigint;
}
