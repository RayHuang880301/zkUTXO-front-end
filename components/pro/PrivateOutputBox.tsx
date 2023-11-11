import { Button, Flex, Image, useToast } from "@chakra-ui/react";
import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { TokenConfig } from "../../type";
import { CipherTxProviderContext } from "./ProCipherTxContext";
import { CipherOutputCoinInfo } from "../../lib/cipher/CipherCoin";
import PrivateOutputItem from "./PrivateOutputItem";
import dropImg from "../../assets/images/drop.png";

const mOutsNum = [0, 1, 2, 4];
const mOutsMax = 4;

interface InputItemInterface {
  coin: CipherOutputCoinInfo | null;
  Element: React.JSX.Element;
}

type Props = {
  selectedToken: TokenConfig;
};

export default function PrivateOutputBox(props: Props) {
  const { selectedToken } = props;
  const toast = useToast();
  const [mOuts, setMOuts] = useState(1);
  const { setPrivateOutCoins, useResetAllListener } = useContext(
    CipherTxProviderContext
  );

  const [coinInfoMap, setCoinInfoMap] = useState<
    Map<string, CipherOutputCoinInfo | null>
  >(new Map());

  useEffect(() => {
    const coins: Array<CipherOutputCoinInfo | null> = [];
    for (let index = 0; index < mOuts; index++) {
      const coin = coinInfoMap.get(index.toString()) || null;
      coins.push(coin);
    }
    setPrivateOutCoins(coins);
  }, [mOuts, setPrivateOutCoins, coinInfoMap]);

  const outCoinInfoItems = useMemo(() => {
    const items: InputItemInterface[] = [];
    for (let index = 0; index < mOuts; index++) {
      const onUpdateCoin = (coin: CipherOutputCoinInfo | null) => {
        console.log("onUpdateCoin", index, coin);
        setCoinInfoMap((prev) => new Map(prev).set(index.toString(), coin));
      };
      const coin = coinInfoMap.get(index.toString());
      console.log({
        coin,
        selectedToken,
        onUpdateCoin,
      })
      const item: InputItemInterface = {
        coin: coin ? coin : null,
        Element: (
          <PrivateOutputItem
            key={index}
            coin={coin ? coin : undefined}
            selectedToken={selectedToken}
            onUpdateCoin={onUpdateCoin}
          />
        ),
      };
      items.push(item);
    }
    return items;
  }, [mOuts, selectedToken]);

  const handleAddMOut = () => {
    if (mOuts < mOutsMax) {
      setMOuts(mOuts + 1);
    } else {
      toast({
        title: "Over max output",
        description: "",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "top",
      });
    }
  };

  const removeItem = useCallback((index: number) => {
    setMOuts(mOuts - 1);
    setCoinInfoMap((prev) => {
      const prevArr = Array.from(prev).sort((a, b) => {
        return parseInt(a[0]) - parseInt(b[0]);
      }).map((item) => item[1]);
      prevArr.splice(index, 1);
      const next = new Map();
      prevArr.forEach((item, idx) => {
        if(item) {
          next.set(idx.toString(), item);
        }
      });
      setPrivateOutCoins(Array.from(next.values()));
      return next;
    });
  }, [mOuts, setPrivateOutCoins]);

  const reset = () => {
    const newMap = new Map();
    for(let index = 0; index < mOuts; index++) {
      newMap.set(index.toString(), null);
    }
    setCoinInfoMap(newMap);
    setPrivateOutCoins(Array.from(newMap.values()));
  }

  useResetAllListener(() => {
    console.log('reset PrivateOutputBox');
    reset();
    setMOuts(0);
  });

  return (
    <Flex
      className="flex flex-col w-full rounded-3xl py-6 px-12 h-fit"
      bgColor="whiteAlpha.400"
      backdropFilter="blur(10px)"
    >
      <Flex className="flex w-full mx-auto flex-col items-center gap-2">
        {outCoinInfoItems.map(({ Element }, idx) => (
          <Flex key={idx} className="flex flex-row items-start w-full gap-8">
            {Element}


            <Image
              className="my-2"
              boxSize={"8"}
              src={dropImg.src}
              alt="drop-image"
              _hover={{
                cursor: "pointer",
                transform: "scale(1.1)",
              }}
              _active={{
                transform: "scale(0.9)",
              }}
              transitionDuration={"0.2s"}
              onClick={() => removeItem(idx)}
            />
          </Flex>
        ))}
        <Button
          className="w-full py-4 mt-4"
          borderRadius="full"
          textColor={"white"}
          bgColor="whiteAlpha.400"
          _hover={{
            bgColor: "whiteAlpha.500",
          }}
          _active={{
            transform: "scale(0.95)",
          }}
          transitionDuration={"0.2s"}
          onClick={handleAddMOut}
        >
          Add +
        </Button>
      </Flex>
    </Flex>
  );
}
