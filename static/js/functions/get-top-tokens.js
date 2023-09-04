import fetchGql from './fetch-gql'

import { get24hEarlierBlock } from './get-block-from-timestamp'

const TOKENS_QUERY = `query {
    bundle(id: 1) {
      ethPrice
    }
    tokens(
      orderBy: tradeVolumeUSD, 
      orderDirection: desc, 
      first: 100
    ) {
      id
      name
      symbol
      totalLiquidity
      untrackedVolumeUSD
      derivedETH
    }
}`
const TOKENS_HISTORY_QUERY = `query ($tokens: [ID!], $block: Int!) {
    bundle(id: 1, block: {number: $block}) {
      ethPrice
    }
    tokens(where: {
      id_in: $tokens,
    }, first: 100, block: {number: $block}) {
      id
      untrackedVolumeUSD
      derivedETH
    }
}`

const ETH_PRICE_HISTORY_QUERY = `query ($block: Int!) {
  bundle(id: 1, block: {number: $block}) {
    ethPrice
  }
}`
const TOKEN_HISTORY_QUERY = `query ($token: ID!, $block: Int!) {
  
  token(id: $token, block: {number: $block}) {
    id
    untrackedVolumeUSD
    derivedETH
  }
}`

async function getOldTokenResponse(tokenIdList, _24hEarlierBlock, network) {
    let bundleResponse = await fetchGql(
        ETH_PRICE_HISTORY_QUERY,
        {block: _24hEarlierBlock},
        (network == 'ethereum' ? window.config.subgraphGraphEth : window.config.subgraphGraphAvax))
    let bundle = bundleResponse.data.bundle

    // let oldTokenResponses = await Promise.all(tokenIdList.map(token => fetchGql(TOKEN_HISTORY_QUERY, {token, block: _24hEarlierBlock})))
    let oldTokenResponses = await Promise.all(tokenIdList.map(token =>
        fetchGql(
            TOKEN_HISTORY_QUERY,
            {token, block: _24hEarlierBlock},
            //ADD SUBGRAPH HERE!!
            (network == 'ethereum' ? window.config.subgraphGraphEth : window.config.subgraphGraphAvax))))
    oldTokenResponses = oldTokenResponses.map(r => r.data.token)

    return {data: {bundle, tokens: oldTokenResponses}}
}

export default async function getTopTokens(network) {
    let _24hEarlierBlock = await get24hEarlierBlock(network)
    // console.log('_24hEarlierBlock ', _24hEarlierBlock)
    // alert(_24hEarlierBlock)
    // let response = await fetchGql(TOKENS_QUERY )
    let response = await fetchGql(
        TOKENS_QUERY,
        null,
        //ADD SUBGRAPH HERE!!
        (network == 'ethereum' ? window.config.subgraphGraphEth : window.config.subgraphGraphAvax))
    // console.log(response)
    let {tokens, bundle } = response.data
    let tokenIdList = tokens.map(t => t.id)
    console.time('oldResponse()')
    // let oldResponse = await fetchGql(TOKENS_HISTORY_QUERY, {tokens: tokenIdList, block: _24hEarlierBlock})
    let oldResponse = await getOldTokenResponse(tokenIdList, _24hEarlierBlock, network)
    console.timeEnd('oldResponse()')
    let { tokens: oldTokens, bundle: oldBundle } = oldResponse.data
    let oldEthPrice = oldBundle.ethPrice
    let ethPrice = bundle.ethPrice

    // console.log({tokens, oldTokens})

    let oldVolumeByTokenId = {}
    let oldDerivedEthByTokenId = {}

    for (let oldToken of oldTokens) {
        // console.log({ })
        oldVolumeByTokenId[oldToken.id] = oldToken.untrackedVolumeUSD
        oldDerivedEthByTokenId[oldToken.id] = oldToken.derivedETH
    }

    tokens = tokens.map(t => {
        let oldVolume = oldVolumeByTokenId[t.id] || 0
        let oldDerivedEth = oldDerivedEthByTokenId[t.id] || 0

        let oldPriceUsd = oldDerivedEth * oldEthPrice
        let priceUSD = t.derivedETH * ethPrice

        let priceChange = ((priceUSD - oldPriceUsd)/oldPriceUsd * 100).toFixed(2)*1
        let dailyVolume = t.untrackedVolumeUSD - oldVolume

        t.priceChange = priceChange
        t.priceUSD = priceUSD
        t.dailyVolume = dailyVolume
        t.liquidity = t.priceUSD * t.totalLiquidity

        return t
    })
        .filter(t => !isNaN(t.priceChange) && t.priceChange < Infinity && t.priceChange > -Infinity && t.dailyVolume > 0)
        .sort((a, b) => b.liquidity - a.liquidity)

    return {tokens, ethPrice}
}