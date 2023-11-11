import { useEffect, useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { CipherAccount } from "../type";
import { toHashedSalt, userSignatureToCipherAccount } from "../lib/cipher/CipherHelper";
const poseidon = require("poseidon-encryption");

export const useCipherAccount = () => {
  const { isConnected } = useAccount();
  const {
    data: signature,
    isSuccess,
    signMessageAsync: signAuthAsync,
  } = useSignMessage({
    message:
      "Authentication on Cipher Protocol, sign this message to generate the unique user ID.",
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [cipherAccount, setCipherAccount] = useState<CipherAccount>({
    seed: undefined,
    userId: undefined,
  });

  useEffect(() => {
    if (!isConnected) {
      breakAuthUser();
    }
  }, [isConnected]);

  useEffect(() => {
    if (isSuccess && signature) {
      const cipherAccount = userSignatureToCipherAccount(signature);
      setCipherAccount(cipherAccount);
      setIsAuthenticated(true);
    }
  }, [isSuccess, signature]);

  const breakAuthUser = () => {
    setCipherAccount({
      seed: undefined,
      userId: undefined,
    });
    setIsAuthenticated(false);
  };

  return { cipherAccount, isAuthenticated, signAuthAsync, breakAuthUser };
};
