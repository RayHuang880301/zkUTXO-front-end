import { Button, Flex, useDisclosure, useToast } from "@chakra-ui/react";
import React, { useEffect, useState } from "react";
import { TokenConfig } from "../../type";
import CipherCard from "../shared/CipherCard";
import TokenSelector from "../shared/TokenSelector";
import { decodeCipherCode } from "../../lib/cipher/CipherHelper";
import { useAccount } from "wagmi";
import WithdrawModal from "./WithdrawModal";
import { useDebounce } from "@uidotdev/usehooks";

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

  useEffect(() => {
    if (!tokens) return;
    setSelectedToken(tokens[0]);
  }, [tokens]);

  useEffect(() => {
    if (!debouncedCipherCode) return;

    // 0x + 4 * 32 bytes
    if (cipherCode.length !== 258) {
      setIsValidCode(false);
      return;
    }
    const { tokenAddress, amount, salt, random, isCode } =
      decodeCipherCode(debouncedCipherCode);
    if (!isCode) {
      setIsValidCode(false);
      return;
    } else if (tokenAddress !== selectedToken?.address) {
      setIsValidCode(false);
      return;
    } else {
      setIsValidCode(true);
      setPubOutAmt(amount);
      setSalt(salt);
      setRandom(random);
    }
  }, [debouncedCipherCode, selectedToken]);

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
          bgColor={isValidCode ? "white" : "whiteAlpha.200"}
          textColor={isValidCode ? "black" : "whiteAlpha.400"}
          _hover={
            isValidCode
              ? {
                  transform: "scale(1.05)",
                  textColor: "#6B39AB",
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