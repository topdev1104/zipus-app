export default function getProcessedTransactions(network) {
    return new Promise((resolve, reject) => {
        fetch(
            (network == 'ethereum' ? window.config.subgrapheth_url : window.config.subgraph_url),
            //  ||
            // "https://api.thegraph.com/subgraphs/name/dasconnor/pangolin-dex",
            {
                method: "POST",
                mode: "cors",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    query: `{
  bundle(id: 1) {
    ethPrice
  }
  mints(first: 250, orderBy: timestamp, orderDirection: desc) {
    timestamp
    id
    amountUSD
    amount0
    amount1
    pair {
      createdAtTimestamp
      token0Price
      token1Price
      id
      token0 {
        id
        symbol
        decimals
        name
      }
      token1 {
        id
        symbol
        decimals
        name
      }
    }
  }
  burns(first: 250, orderBy: timestamp, orderDirection: desc) {
    timestamp
    id
    amountUSD
    amount0
    amount1
    pair {
      createdAtTimestamp
      id
      token0Price
      token1Price
      token0 {
        id
        symbol
        decimals
        name
      }
      token1 {
        id
        symbol
        decimals
        name
      }
    }
  }
}
`,
                    variables: null,
                }),
            }
        )
            .then((res) => res.json())
            .then((res) => handleTheGraphData(res, network))
            .then(resolve)
            .catch(reject);
    });
}

function handleTheGraphData({data}, network) {
    // console.log(network)
    // console.log(data)
    let burns = data.burns.filter(mintOrBurn => {
        return [mintOrBurn.pair.token0.id, mintOrBurn.pair.token1.id]
            .includes((network == 'ethereum' ? window.config.weth2_address : '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7'))
    }).map(mintOrBurn => getFormattedMintOrBurn(mintOrBurn, 'burn', network))
    let mints = data.mints.filter(mintOrBurn => {
        return [mintOrBurn.pair.token0.id, mintOrBurn.pair.token1.id]
            .includes((network == 'ethereum' ? window.config.weth2_address : '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7'))
    }).map(mintOrBurn => getFormattedMintOrBurn(mintOrBurn, 'mint', network))

    let transactions = burns.concat(mints)
    transactions = transactions.sort((a, b) => {
        return b.timestamp - a.timestamp
    })


    return ({
        transactions,
        ethPrice: data.bundle.ethPrice
    })
}

function getFormattedMintOrBurn(mintOrBurn, type, network) {
    let tokenAmount, ethAmount, tokenDecimals = 18, ethDecimals = 18, tokenPerEth, tokenId, tokenSymbol
    let {token0, token1} = mintOrBurn.pair
    if (token0.id == (network == 'ethereum' ? window.config.weth2_address : window.config.weth_address)) {
        tokenSymbol = token1.symbol
        tokenId = token1.id
        ethAmount = mintOrBurn.amount0
        tokenAmount = mintOrBurn.amount1
        tokenDecimals = token1.decimals * 1
        ethDecimals = token0.decimals * 1
        tokenPerEth = mintOrBurn.pair.token0Price
    } else {
        tokenSymbol = token0.symbol
        tokenId = token0.id
        ethAmount = mintOrBurn.amount1
        tokenAmount = mintOrBurn.amount0
        tokenDecimals = token0.decimals * 1
        ethDecimals = token1.decimals * 1
        tokenPerEth = mintOrBurn.pair.token1Price
    }
    return ({
        key: mintOrBurn.id + '-' + type,
        tokenSymbol,
        tokenPerEth: tokenPerEth * 1,
        tokenId,
        tokenAmount: tokenAmount * 1,
        ethAmount: ethAmount * 1,
        tokenDecimals: tokenDecimals * 1,
        ethDecimals: ethDecimals * 1,
        pairCreationTimestamp: mintOrBurn.pair.createdAtTimestamp * 1,
        pairId: mintOrBurn.pair.id,
        type,
        id: mintOrBurn.id,
        timestamp: mintOrBurn.timestamp * 1,
        amountUSD: mintOrBurn.amountUSD * 1
    })
}
