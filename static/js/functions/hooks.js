import { Web3Provider } from "@ethersproject/providers";
import { useEffect, useState } from "react";
import { useWeb3React as useWeb3ReactCore } from "@web3-react/core";
import { injected } from "./connectors";

import Web3 from "web3";

export default function getLibrary(provider) {
  const library = new Web3Provider(provider, "any");
  library.pollingInterval = 15000;
  return library;
}

let accounts;

const onSignIn = async ({ account, chainId }) => {
  if (!account || !chainId) return;
  if (
    window.ethereum &&
    !window.coin98 &&
    (window.ethereum.isMetaMask === true || window.ethereum.isTrust === true) &&
    (!window.ethereum.isCoinbaseWallet || !window.ethereum.overrideIsMetaMask)
  ) {
    try {
      accounts = await window.ethereum?.request({
        method: "eth_accounts",
      });
    } catch (err) {
      console.log(err);
    }
  }
  const { ethereum } = window;
  const balance = await ethereum.request({
    method: "eth_getBalance",
    params: [accounts[0], "latest"],
  });
  return balance.toSignificant(6);
};

export function useEagerConnect() {
  const { library, account, chainId, active, activate } = useWeb3ReactCore();

  const [tried, setTried] = useState(false);
  const [currencyAmount, setCurrencyAmount] = useState("");

  useEffect(() => {
    if (
      window.ethereum &&
      !window.coin98 &&
      (window.ethereum.isMetaMask === true || window.ethereum.isTrust === true) &&
      (!window.ethereum.isCoinbaseWallet || !window.ethereum.overrideIsMetaMask)
    ) {
      injected.isAuthorized().then((isAuthorized) => {
        if (isAuthorized) {
          activate(injected, undefined, true)
            .then(async () => {
              const ethBalance = await onSignIn({ account, chainId });
              if (ethBalance) {
                setCurrencyAmount(ethBalance);
              }
            })
            .catch(() => {
              setTried(true);
            });
        } else {
          setTried(true);
        }
      });
    }
  }, [activate, library, account, chainId, active]); // intentionally only running on mount (make sure it's only mounted once :))

  // if the connection worked, wait until we get confirmation of that to flip the flag
  useEffect(() => {
    if (
      window.ethereum &&
      !window.coin98 &&
      (window.ethereum.isMetaMask === true || window.ethereum.isTrust === true) &&
      (!window.ethereum.isCoinbaseWallet || !window.ethereum.overrideIsMetaMask)
    ) {
      if (!tried && active) {
        setTried(true);
      }
    }
  }, [tried, active]);

  return [tried, currencyAmount];
}

export function useInactiveListener(suppress = false) {
  const { active, error, activate, account } = useWeb3ReactCore(); // specifically using useWeb3React because of what this hook does

  useEffect(() => {
    const { ethereum } = window;

    ethereum?.removeAllListeners(["networkChanged"]);

    if (
      window.ethereum &&
      !window.coin98 &&
      (window.ethereum.isMetaMask === true || window.ethereum.isTrust === true) &&
      (!window.ethereum.isCoinbaseWallet || !window.ethereum.overrideIsMetaMask)
    ) {
      if (ethereum && ethereum.on && !active && !error && !suppress) {
        const handleChainChanged = () => {
          activate(injected, undefined, true).catch((error) => {
            console.error("Failed to activate after chain changed", error);
          });
        };

        const handleAccountsChanged = (accounts) => {
          if (accounts.length > 0) {
            // eat errors
            activate(injected, undefined, true).catch((error) => {
              console.error("Failed to activate after accounts changed", error);
            });
          }
        };

        ethereum.on("chainChanged", handleChainChanged);
        ethereum.on("accountsChanged", handleAccountsChanged);

        return () => {
          if (ethereum.removeListener) {
            ethereum.removeListener("chainChanged", handleChainChanged);
            ethereum.removeListener("accountsChanged", handleAccountsChanged);
          }
        };
      }
    }

    return undefined;
  }, [active, error, suppress, activate, account]);
}

export const handleSwitchNetworkhook = async (chainID) => {
  const { ethereum } = window;
  let error;

  const ETHPARAMS = {
    chainId: "0x1", // A 0x-prefixed hexadecimal string
    chainName: "Ethereum Mainnet",
    nativeCurrency: {
      name: "Ethereum",
      symbol: "ETH", // 2-6 characters long
      decimals: 18,
    },
    rpcUrls: ["https://mainnet.infura.io/v3/"],
    blockExplorerUrls: ["https://etherscan.io"],
  };

  const AVAXPARAMS = {
    chainId: "0xa86a", // A 0x-prefixed hexadecimal string
    chainName: "Avalanche Network",
    nativeCurrency: {
      name: "Avalanche",
      symbol: "AVAX", // 2-6 characters long
      decimals: 18,
    },
    rpcUrls: ["https://api.avax.network/ext/bc/C/rpc"],
    blockExplorerUrls: ["https://snowtrace.io/"],
  };

  const BNBPARAMS = {
    chainId: "0x38", // A 0x-prefixed hexadecimal string
    chainName: "Smart Chain",
    nativeCurrency: {
      name: "Smart Chain",
      symbol: "BNB", // 2-6 characters long
      decimals: 18,
    },
    rpcUrls: ["https://bsc-dataseed.binance.org/"],
    blockExplorerUrls: ["https://bscscan.com"],
  };

  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainID }],
    });
    if(window.ethereum && window.ethereum.isTrust === true) {
      window.location.reload()
    }
  } catch (switchError) {
    // This error code indicates that the chain has not been added to MetaMask.
    console.log(switchError, "switch");
    if (switchError.code === 4902) {
      try {
        await ethereum.request({
          method: "wallet_addEthereumChain",
          params:
            chainID === "0x1"
              ? [ETHPARAMS]
              : chainID === "0xa86a"
              ? [AVAXPARAMS]
              : chainID === "0x38"
              ? [BNBPARAMS]
              : "",
        });
        if(window.ethereum && window.ethereum.isTrust === true) {
          window.location.reload()
        }
      } catch (addError) {
        console.log(addError);
      }
    }
    // handle other "switch" errors
  }
};
