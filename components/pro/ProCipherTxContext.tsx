import {
  Dispatch,
  SetStateAction,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import {
  CipherOutputCoin,
  CipherOutputCoinInfo,
  CipherTransferableCoin,
} from "../../lib/cipher/CipherCoin";
import { useToast } from "@chakra-ui/react";
import { CipherTreeProviderContext } from "../../providers/CipherTreeProvider";
import { generateCipherTx } from "../../lib/cipher/CipherCore";
import {
  ProofStruct,
  PublicInfoStruct,
} from "../../lib/cipher/types/CipherContract.type";
import dayjs from "dayjs";
import {
  useAccount,
  useContractWrite,
  useNetwork,
  usePrepareContractWrite,
  useWaitForTransaction,
} from "wagmi";
import { WriteContractResult } from "@wagmi/core";
import { ConfigContext } from "../../providers/ConfigProvider";
import CipherAbi from "../../lib/cipher/CipherAbi.json";
import { DEFAULT_NATIVE_TOKEN_ADDRESS } from "../../configs/tokenConfig";
import { downloadCipher } from "../../lib/downloadCipher";
import { createEvent } from "react-event-hook";

import { encodeCipherCode } from "../../lib/cipher/CipherHelper";
import { TokenConfig } from "../../type";

export const CipherTxProviderContext = createContext<{
  publicInAmt: bigint;
  setPublicInAmt: Dispatch<SetStateAction<bigint>>;
  publicOutAmt: bigint;
  setPublicOutAmt: Dispatch<SetStateAction<bigint>>;
  privateInCoins: Array<CipherTransferableCoin | null>;
  setPrivateInCoins: (coins: Array<CipherTransferableCoin | null>) => void;
  privateOutCoins: Array<CipherOutputCoinInfo | null>;
  setPrivateOutCoins: (coins: Array<CipherOutputCoinInfo | null>) => void;
  recipient: string | null;
  setRecipient: (recipient: string | null) => void;
  totalPrivateInAmt: bigint;
  totalPrivateOutAmt: bigint;
  downloadCipherCodes: () => void;
  prepareProof: () => Promise<void>;
  transactTx: WriteContractResult | undefined;
  transactIsLoading: boolean;
  transactIsSuccess: boolean;
  sendTransaction: () => Promise<void>;
  transactReset: () => void;
  useResetAllListener: (handler: () => void) => void,
  emitResetAll: () => void;
}>({
  publicInAmt: BigInt(0),
  setPublicInAmt: () => {},
  publicOutAmt: BigInt(0),
  setPublicOutAmt: () => {},
  privateInCoins: [],
  setPrivateInCoins: () => {},
  privateOutCoins: [],
  setPrivateOutCoins: () => {},
  recipient: "",
  setRecipient: () => {},
  totalPrivateInAmt: BigInt(0),
  totalPrivateOutAmt: BigInt(0),
  downloadCipherCodes: () => {},
  prepareProof: async () => {},
  transactTx: undefined,
  transactIsLoading: false,
  transactIsSuccess: false,
  sendTransaction: async () => {},
  transactReset: () => {},
  useResetAllListener: () => {},
  emitResetAll: () => {},
});

export const CipherTxProvider = ({
  selectedToken,
  children,
}: {
  selectedToken: TokenConfig | null;
  children: React.ReactNode;
}) => {
  const toast = useToast();
  const { useResetAllListener, emitResetAll } = createEvent("resetAll")();

  const { syncAndGetCipherTree, getUnPaidIndexFromTree } = useContext(
    CipherTreeProviderContext
  );
  const { address } = useAccount();
  const { chain } = useNetwork();

  const [publicInAmt, setPublicInAmt] = useState(BigInt(0));
  const [publicOutAmt, setPublicOutAmt] = useState(BigInt(0));
  const [privateInCoins, setPrivateInCoins] = useState<
    Array<CipherTransferableCoin | null>
  >([]);
  const [privateOutCoins, setPrivateOutCoins] = useState<
    Array<CipherOutputCoinInfo | null>
  >([]);
  const [recipient, setRecipient] = useState<string | null>("");

  const isPrivateInCoinsValid = useMemo(() => {
    return privateInCoins.every((coin) => coin !== null);
  }, [privateInCoins]);

  const isPrivateOutCoinsValid = useMemo(() => {
    return privateOutCoins.every((coin) => coin !== null);
  }, [privateOutCoins]);

  const totalPrivateInAmt = useMemo(() => {
    return privateInCoins.reduce((acc, coin) => {
      if (coin === null) return acc;
      return acc + coin.coinInfo.amount;
    }, BigInt(0));
  }, [privateInCoins]);

  const totalPrivateOutAmt = useMemo(() => {
    return privateOutCoins.reduce((acc, coin) => {
      if (coin === null) return acc;
      return acc + coin.amount;
    }, BigInt(0));
  }, [privateOutCoins]);

  /** CONTRACT: cipherTransact */
  const { cipherContractInfo } = useContext(ConfigContext);
  const [utxoData, setUtxoData] = useState<ProofStruct>();
  const [publicInfo, setPublicInfo] = useState<PublicInfoStruct>();
  const { config: contractTxConfig } = usePrepareContractWrite({
    address: cipherContractInfo?.cipherContractAddress,
    abi: CipherAbi.abi,
    functionName: "cipherTransact",
    args: [utxoData, publicInfo],
    value:
      selectedToken?.address === DEFAULT_NATIVE_TOKEN_ADDRESS
        ? publicInAmt
        : 0n,
    enabled: utxoData && publicInfo ? true : false,
    type: cipherContractInfo?.legacyTx ? "legacy" : undefined,
  });

  const {
    data: transactTx,
    writeAsync: transactAsync,
    reset: transactReset,
  } = useContractWrite(contractTxConfig);

  const { isLoading: _transactIsLoading, isSuccess: transactIsSuccess } =
    useWaitForTransaction({
      hash: transactTx?.hash,
    });

  /** */
  const validate = useCallback(() => {
    if (!selectedToken) {
      throw new Error("Token address is not set");
    }

    if (!address) {
      throw new Error("Address is not set");
    }

    if (privateInCoins.length === 0 && privateOutCoins.length === 0) {
      throw new Error("No input and output coins");
    }

    if (!isPrivateInCoinsValid) {
      throw new Error("Invalid private input coins");
    }

    if (!isPrivateOutCoinsValid) {
      throw new Error("Invalid private output coins");
    }

    if (publicInAmt + totalPrivateInAmt !== publicOutAmt + totalPrivateOutAmt) {
      throw new Error("total IN amount and total OUT amount not match");
    }
    // if(publicOutAmt > 0 && !recipient) {
    //   throw new Error("recipient must be set if public OUT amount is greater than 0");
    // }
  }, [
    address,
    isPrivateInCoinsValid,
    isPrivateOutCoinsValid,
    privateInCoins.length,
    privateOutCoins.length,
    publicInAmt,
    publicOutAmt,
    selectedToken?.address,
    totalPrivateInAmt,
    totalPrivateOutAmt,
  ]);

  const downloadCipherCodes = useCallback(async () => {
    try {
      await validate();
      const privateOutCoinArr = privateOutCoins.map(
        (coinInfo) => new CipherOutputCoin(coinInfo!, selectedToken!.address)
      );

      const allCodes = privateOutCoinArr.map((coin) => {
        return coin.toCipherCode();
      });

      for (let i = 0; i < allCodes.length; i++) {
        downloadCipher(chain!.id, selectedToken!.address, allCodes[i]);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "top",
      });
    }
  }, [privateOutCoins, toast, selectedToken, validate]);

  const prepareProof = async () => {
    await validate();

    const { promise } = await syncAndGetCipherTree(selectedToken!.address);
    const treeCache = await promise;

    const privateOutCoinArr = privateOutCoins.map(
      (coinInfo) => new CipherOutputCoin(coinInfo!, selectedToken!.address)
    );
    const publicInfo: PublicInfoStruct = {
      maxAllowableFeeRate: "0",
      recipient: address as string,
      // recipient: recipient || "",
      token: selectedToken!.address,
      deadline: dayjs().add(1, "month").unix().toString(),
    };

    const result = await generateCipherTx(
      treeCache.cipherTree,
      {
        publicInAmt,
        publicOutAmt,
        privateInCoins: privateInCoins as CipherTransferableCoin[],
        privateOutCoins: privateOutCoinArr,
      },
      publicInfo
    );

    setUtxoData(result.contractCalldata.utxoData);
    setPublicInfo(result.contractCalldata.publicInfo);
  };

  const sendTransaction = async () => {
    if (!utxoData || !publicInfo || !transactAsync) {
      throw new Error("proof or publicInfo is undefined");
    }
    await transactAsync();
  };

  const transactIsLoading = useMemo(() => {
    return _transactIsLoading || !transactAsync;
  }, [_transactIsLoading, transactAsync]);

  return (
    <CipherTxProviderContext.Provider
      value={{
        publicInAmt,
        setPublicInAmt,
        publicOutAmt,
        setPublicOutAmt,
        privateInCoins,
        setPrivateInCoins,
        privateOutCoins,
        setPrivateOutCoins,
        recipient,
        setRecipient,
        totalPrivateInAmt,
        totalPrivateOutAmt,
        downloadCipherCodes,
        prepareProof,
        transactTx,
        transactIsLoading,
        transactIsSuccess,
        sendTransaction,
        transactReset,
        useResetAllListener,
        emitResetAll,
      }}
    >
      {children}
    </CipherTxProviderContext.Provider>
  );
};
