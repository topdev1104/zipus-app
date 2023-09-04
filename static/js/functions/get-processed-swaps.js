const SWAP_QUERY = `query ($pair: String) {
    bundle(id: 1) {
      ethPrice
    }
    swaps(orderBy: timestamp, orderDirection: desc, where: {
      pair: $pair
    }, first: 333) {
      id
      timestamp
      from
      amountUSD
      amount0In
      amount1In
      amount0Out
      amount1Out
    }
    
    pair(id: $pair) {
        id
        createdAtTimestamp
        txCount
        liquidityProviderCount
        reserveUSD
        reserve0
        reserve1
        reserveETH
        token0 {
          id
          decimals
          name
          symbol
          derivedETH
        }
        token1 {
          id
          decimals
          name
          symbol
          derivedETH
        }
    }
}`

const BIG_SWAP_QUERY = `query {
    bundle(id: 1) {
      ethPrice
    }
    swaps(orderBy: timestamp, orderDirection: desc, first: 333, where: {
      amountUSD_gte: 10000
    }) {
      id
      timestamp
      from
      amountUSD
      amount0In
      amount1In
      amount0Out
      amount1Out
      pair {
        id
        txCount
        liquidityProviderCount
        reserveUSD
        reserve0
        reserve1
        reserveETH
        token0 {
          id
          decimals
          name
          symbol
          derivedETH
        }
        token1 {
          id
          decimals
          name
          symbol
          derivedETH
        }
      }
    }   
}`

export default function getProcessedSwaps(pair, bigSwaps = false, network) {
    let body = JSON.stringify({
        query: bigSwaps ? BIG_SWAP_QUERY : SWAP_QUERY,
        variables: bigSwaps ? null : {pair}
    })
    return new Promise((resolve, reject) => {
        fetch(
            (network == 'ethereum' ? window.config.subgrapheth_url : window.config.subgraph_url),
            //'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2',
            {
                method: 'POST',
                mode: 'cors',
                headers: { 'Content-Type': 'application/json' },
                body
            }).then(res => res.json())
            .then(res => handleTheGraphData(res, bigSwaps))
            .then(resolve)
            .catch(reject)
    })
}

// for now, base is token1, and token0 is the token to consider
function handleTheGraphData({data}, bigSwaps) {
    let swaps = data.swaps.map(swap => {
        let type
        let amount0, amount1
        if (1*swap.amount0In > 0) {
            type = 'sell'
            amount0 = 1*swap.amount0In
            amount1 = 1*swap.amount1Out
        } else {
            type = 'buy'
            amount0 = 1*swap.amount0Out
            amount1 = 1*swap.amount1In
        }
        let amountUSD = swap.amountUSD
        let txHash = swap.id.split('-')[0]
        let timestamp = 1*swap.timestamp
        let maker = swap.from

        let usdPerToken0 = amountUSD / amount0
        let usdPerToken1 = amountUSD / amount1
        let token1PerToken0 = amount1/amount0
        let token0PerToken1 = amount0/amount1

        return {
            id: swap.id,
            type,
            txHash,
            amount0,
            amount1,
            amountUSD,
            usdPerToken0,
            usdPerToken1,
            token0PerToken1,
            token1PerToken0,
            maker,
            timestamp,
            pair: !bigSwaps ? null : swap.pair
        }
    })
    return {
        pair: bigSwaps ? null : data.pair,
        swaps: bigSwaps ? swaps.map(s => {
            s.pair_symbols = s.pair.token0.symbol+'-'+s.pair.token1.symbol
            return s
        }) : swaps,
        ethPrice: data.bundle.ethPrice*1
    }
}