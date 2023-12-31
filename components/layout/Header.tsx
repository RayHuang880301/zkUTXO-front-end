import { Box, Flex, Image } from "@chakra-ui/react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import React, { Dispatch, SetStateAction } from "react";
import { Mode } from "../../type";
import ModeTab from "./ModeTab";
import CipherProfileBtn from "./CipherProfileBtn";
import logo from "../../assets/images/logo2.png";

type Props = {
  setMode: Dispatch<SetStateAction<Mode>>;
};

export default function Header(props: Props) {
  const { setMode } = props;

  const reload = () => {
    window.location.reload();
  };

  return (
    <Flex className="w-[90%] m-auto py-4 gap-2 justify-between items-start">
      <Box className="py-2 w-[30%]">
        <Image
          src={logo.src}
          h={10}
          _hover={{
            cursor: "pointer",
            transform: "scale(1.1)",
          }}
          _active={{
            transform: "scale(0.9)",
          }}
          transitionDuration={"0.2s"}
          alt="logo"
          onClick={reload}
        />
      </Box>
      {/* <SimpleBtn colorScheme="teal" className="w-32">
          Integration
        </SimpleBtn>
        <SimpleBtn colorScheme="teal" className="w-32">
          Docs
        </SimpleBtn> */}
      <ModeTab setMode={setMode} />
      <Box className="flex flex-row justify-end items-center w-[30%] gap-2">
        <ConnectButton
          chainStatus="icon"
          accountStatus="address"
          showBalance={false}
        />
        <CipherProfileBtn />
      </Box>
    </Flex>
  );
}
