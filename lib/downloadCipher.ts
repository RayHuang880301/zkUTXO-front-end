import dayjs from "dayjs";

export const downloadCipher = (
  chainId: number,
  tokenName: string,
  cipherHex: string
) => {
  const random = Math.random().toString(36).substring(7);
  const blob = new Blob([cipherHex], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const unixTime = dayjs().unix();
  link.download = `cipher-${chainId}-${tokenName}-${random}-${unixTime}.txt`;
  link.href = url;
  link.click();
};
