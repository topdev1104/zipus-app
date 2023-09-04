function fetchGql(query, variables=null, url=null) {
    return new Promise((resolve, reject) => {
        fetch(
            url,
            // ((url) ||
                // window.config.subgraph_url ||
                // 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2'),
            {
                method: 'POST',
                mode: 'cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query,
                    variables
                })
            }).then(res => res.json())
            .then(resolve)
            .catch(reject)
    })
}

export default fetchGql