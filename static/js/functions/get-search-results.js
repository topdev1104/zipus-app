import fetchGql from "./fetch-gql"

const TOKEN_QUERY = `query tokens($value: String, $id: String) {
    asSymbol: tokens(where: {symbol_contains: $value}, orderBy: totalLiquidity, orderDirection: desc) {
      id
      symbol
      name
      totalLiquidity
      __typename
    }
    asName: tokens(where: {name_contains: $value}, orderBy: totalLiquidity, orderDirection: desc) {
      id
      symbol
      name
      totalLiquidity
      __typename
    }
    asAddress: tokens(where: {id: $id}, orderBy: totalLiquidity, orderDirection: desc) {
      id
      symbol
      name
      totalLiquidity
      __typename
    }
  }
`  
const PAIR_QUERY = `query pairs($tokens: [Bytes]!, $id: String) {
    as0: pairs(where: {token0_in: $tokens}) {
      id
      reserveUSD
      token0 {
        id
        symbol
        name
        __typename
      }
      token1 {
        id
        symbol
        name
        __typename
      }
      __typename
    }
    as1: pairs(where: {token1_in: $tokens}) {
      id
      reserveUSD
      token0 {
        id
        symbol
        name
        __typename
      }
      token1 {
        id
        symbol
        name
        __typename
      }
      __typename
    }
    asAddress: pairs(where: {id: $id}) {
      id
      reserveUSD
      token0 {
        id
        symbol
        name
        __typename
      }
      token1 {
        id
        symbol
        name
        __typename
      }
      __typename
    }
  }
`
async function getSearchResults(query) {
    let uppercaseQuery = query.toLowerCase()

    if (uppercaseQuery == "idyp")
        uppercaseQuery = "iDYP"
    else
        uppercaseQuery = uppercaseQuery.toUpperCase()

    // console.log(uppercaseQuery)

    let tokens = await fetchGql(TOKEN_QUERY, {value: uppercaseQuery, id: query})
    let seenTokens = {}
    tokens =  tokens.data.asSymbol.concat(tokens.data.asName).concat(tokens.data.asAddress).filter(token => {
        if (seenTokens[token.id]) return false
        seenTokens[token.id] = true
        return true
    }).sort((t1, t2) => t2.totalLiquidity - t1.totalLiquidity)

    let tokenIds = tokens.map(t => t.id)
    console.log(tokenIds)

    let pairs = await fetchGql(PAIR_QUERY, {tokens: tokenIds, id: query})
    console.log({pairs})
    let seenPairs = {}
    pairs = pairs.data.as0.concat(pairs.data.as1).concat(pairs.data.asAddress).filter(p => {
        if (seenPairs[p.id]) return false
        seenPairs[p.id] = true
        return true
    }).sort((p1, p2) => p2.reserveUSD - p1.reserveUSD)

    return pairs
}

export default getSearchResults