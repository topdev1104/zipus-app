import React, {useEffect} from "react";
import ReactDOM from 'react-dom/client';
import App from "./App";
import ReactGA from "react-ga";
import { Web3ReactProvider, createWeb3ReactRoot } from "@web3-react/core";
import getLibrary from "./functions/hooks";
import { BrowserRouter } from "react-router-dom";



const Web3ProviderNetwork = createWeb3ReactRoot("NETWORK");

if ('ethereum' in window) {
  ;(window.ethereum).autoRefreshOnNetworkChange = true
}

const GOOGLE_ANALYTICS_ID: string | undefined =
  process.env.REACT_APP_GOOGLE_ANALYTICS_ID;
if (typeof GOOGLE_ANALYTICS_ID === "string") {
  ReactGA.initialize(GOOGLE_ANALYTICS_ID);
  // ReactGA.set({
  //     customBrowserType: !isMobile ? 'desktop' : 'web3' in window || 'ethereum' in window ? 'mobileWeb3' : 'mobileRegular'
  // })
} else {
  ReactGA.initialize("test", { testMode: true, debug: true });
}

window.addEventListener("error", (error) => {
  ReactGA.exception({
    description: `${error.message} @ ${error.filename}:${error.lineno}:${error.colno}`,
    fatal: true,
  });
});


const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <BrowserRouter>
    <Web3ReactProvider getLibrary={getLibrary}>
      <Web3ProviderNetwork>
          <App />
      </Web3ProviderNetwork>
    </Web3ReactProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
