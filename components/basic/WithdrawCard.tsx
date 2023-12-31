import { Button, Flex, useDisclosure, useToast } from "@chakra-ui/react";
import React, { useContext, useEffect, useState } from "react";
import { TokenConfig } from "../../type";
import CipherCard from "../shared/CipherCard";
import TokenSelector from "../shared/TokenSelector";
import {
  assertCipherCode,
  decodeCipherCode,
} from "../../lib/cipher/CipherHelper";
import { useAccount } from "wagmi";
import WithdrawModal from "./WithdrawModal";
import { useDebounce } from "@uidotdev/usehooks";
import { CipherAccountContext } from "../../providers/CipherProvider";

type Props = {
  tokens: TokenConfig[];
  isLoadingTokens?: boolean;
};

export default function WithdrawCard(props: Props) {
  const { tokens, isLoadingTokens } = props;
  const toast = useToast();
  const { address } = useAccount();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedToken, setSelectedToken] = useState<TokenConfig>(tokens[0]);
  const [cipherCode, setCipherCode] = useState<string>("");
  const [isValidCode, setIsValidCode] = useState<boolean>(false);
  const debouncedCipherCode = useDebounce(cipherCode, 1000);
  const [pubOutAmt, setPubOutAmt] = useState<bigint>();
  const [salt, setSalt] = useState<bigint>();
  const [random, setRandom] = useState<bigint>();

  const { cipherAccount } = useContext(CipherAccountContext);

  useEffect(() => {
    if (!tokens) return;
    setSelectedToken(tokens[0]);
  }, [tokens]);

  useEffect(() => {
    try {
      if (!debouncedCipherCode) return;
      const cipherCodeResult = decodeCipherCode(debouncedCipherCode);
      console.log({
        cipherCodeResult,
        selectedToken,
        cipherAccount,
      });
      if (
        assertCipherCode(
          cipherCodeResult,
          selectedToken?.address,
          BigInt(cipherAccount?.userId || "0")
        )
      ) {
        setIsValidCode(true);
        setPubOutAmt(cipherCodeResult.amount);
        setRandom(cipherCodeResult.random);
        if (cipherCodeResult.userId) {
          const seed = cipherAccount!.seed;
          setSalt(seed);
        } else {
          setSalt(cipherCodeResult.salt);
        }
        return;
      } else {
        throw new Error("cipher code invalid");
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
  }, [cipherAccount, debouncedCipherCode, selectedToken, toast]);

  const onValueChange = (value: string) => {
    setIsValidCode(false);
    setCipherCode(value);
  };

  const handleOpenWithdrawModal = () => {
    if (address === undefined) {
      toast({
        title: "Please connect wallet",
        description: "",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "top",
      });
      return;
    } else if (selectedToken === undefined) {
      toast({
        title: "Please select token",
        description: "",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "top",
      });
    } else {
      onOpen();
    }
  };

  return (
    <>
      <Flex className="flex flex-col justify-between items-center gap-4 h-full pt-10 pb-12">
        <TokenSelector
          tokens={tokens}
          selectedToken={selectedToken}
          isLoadingTokens={isLoadingTokens}
          setSelectedToken={setSelectedToken}
        />
        <Flex className="flex flex-col gap-8 w-[20rem] my-4">
          <CipherCard
            placeholder="Enter your cipher code here"
            onValueChange={onValueChange}
          />
          <Button
            className="w-full py-6"
            bgColor="whiteAlpha.400"
            textColor="white"
            borderRadius="3xl"
            _hover={{
              bgColor: "whiteAlpha.500",
              cursor: "not-allowed",
            }}
          >
            Choose relayer
          </Button>
        </Flex>
        <Button
          disabled={!isValidCode}
          borderRadius={"full"}
          className="w-full py-6 mt-2"
          bgColor={isValidCode ? "white" : "whiteAlpha.400"}
          textColor={isValidCode ? "black" : "white"}
          _hover={
            isValidCode
              ? {
                  transform: "scale(1.05)",
                  textColor: "brand",
                }
              : { cursor: "not-allowed" }
          }
          _active={
            isValidCode
              ? {
                  transform: "scale(0.95)",
                }
              : { cursor: "not-allowed" }
          }
          transitionDuration={"0.2s"}
          onClick={isValidCode ? handleOpenWithdrawModal : () => {}}
        >
          Withdraw
        </Button>
      </Flex>
      <WithdrawModal
        isOpen={isOpen}
        onOpen={onOpen}
        onClose={onClose}
        token={selectedToken}
        pubOutAmt={pubOutAmt || 0n}
        salt={salt || 0n}
        random={random || 0n}
      />
    </>
  );
}
