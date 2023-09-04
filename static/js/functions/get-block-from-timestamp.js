import fetchGql from "./fetch-gql";
const ETHEREUM_BLOCKS_SUBGRAPH =
  "https://api.thegraph.com/subgraphs/name/dasconnor/avalanche-blocks";
const ETHEREUM_BLOCKS_SUBGRAPH_ETH =
  "https://api.thegraph.com/subgraphs/name/blocklytics/ethereum-blocks";

const INDEXING_STATUS_ENDPOINT = window.config.indexing_status_endpoint;
const INDEXING_STATUS_ENDPOINTETH = window.config.indexing_status_endpointeth;
// 'https://api.thegraph.com/index-node/graphql' ||

const INDEXING_STATUS_QUERY = `query health {
    indexingStatusForCurrentVersion(subgraphName: "dasconnor/pangolin-dex") {
      synced
      health
      chains {
        chainHeadBlock {
          number
          __typename
        }
        latestBlock {
          number
          __typename
        }
        __typename
      }
      __typename
    }
  }
  `;

const INDEXING_STATUS_QUERY_ETH = `query health {
    indexingStatusForCurrentVersion(subgraphName: "davekaj/uniswap") {
      synced
      health
      chains {
        chainHeadBlock {
          number
          __typename
        }
        latestBlock {
          number
          __typename
        }
        __typename
      }
      __typename
    }
  }
  `;

const BLOCK_QUERY = `query ($gte: BigInt!, $lt: BigInt!) {
    blocks(orderBy: timestamp, orderDirection: asc, first: 1, where: {timestamp_gte: $gte, timestamp_lt: $lt}) {
      number
      timestamp
    }
  }
`;
const TIMESTAMP_QUERY = `query ($number: BigInt!) {
    blocks(where: {
      number: $number
    }) {
      timestamp
    }
}`;

async function getBlockFromTimestamp(timestamp, network) {
  let variables = {gte: timestamp*1, lt: timestamp*1 + 600}
  let response = await fetchGql(
      BLOCK_QUERY,
      variables,
      (network == 'ethereum' ? ETHEREUM_BLOCKS_SUBGRAPH_ETH : ETHEREUM_BLOCKS_SUBGRAPH))
  // alert(JSON.stringify(response))
  // console.log('getBlockFromTimestamp ', response.data.blocks[0].number)
  return response.data.blocks[0].number
}

async function getTimestampFromBlock(number, network) {
  let variables = {number}
  // console.log({number})
  let response = 0
  while (1){
    response = await fetchGql(
        TIMESTAMP_QUERY,
        variables,
        (network == 'ethereum' ? ETHEREUM_BLOCKS_SUBGRAPH_ETH : ETHEREUM_BLOCKS_SUBGRAPH))
    // console.log('inWhile ', response)
    if (response.data.blocks != undefined && response.data != 0 && response.data.blocks[0] != undefined){
      // console.log(response)

      break
    }

  }

  //response = await fetchGql(TIMESTAMP_QUERY, variables, ETHEREUM_BLOCKS_SUBGRAPH)
  // console.log('inWhileBREAK ', response)

  // console.log('getTimestampFromBlock ', response.data.blocks[0].timestamp)

  return response.data.blocks[0].timestamp
  // let response = await fetchGql(TIMESTAMP_QUERY, variables, ETHEREUM_BLOCKS_SUBGRAPH)
  // return response.data.blocks[0].timestamp
}

async function getLatestBlock(network) {
  let response = await fetchGql(
      (network == 'ethereum' ? INDEXING_STATUS_QUERY_ETH : INDEXING_STATUS_QUERY),
      null,
      (network == 'ethereum' ? INDEXING_STATUS_ENDPOINTETH : INDEXING_STATUS_ENDPOINT))
  // console.log('getLatestBlock ', response.data.indexingStatusForCurrentVersion.chains[0].latestBlock.number)
  return response.data.indexingStatusForCurrentVersion.chains[0].latestBlock.number
}

function get24hEarlierBlock(network) {
  return getLatestBlock(network)
      .then(b => getTimestampFromBlock(Number(b),network))
      // .then()
      .then(t => getBlockFromTimestamp(t - 86400, network))
      .then(a => Number(a))
}

export { getTimestampFromBlock, getLatestBlock, get24hEarlierBlock }
export default getBlockFromTimestamp