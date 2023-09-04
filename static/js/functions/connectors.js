import { InjectedConnector } from '@web3-react/injected-connector'

export const NETWORK_CHAIN_ID = parseInt(process.env.REACT_APP_CHAIN_ID ?? '1')


export const injected = new InjectedConnector({
    supportedChainIds: [1, 43114, 56]
  })

