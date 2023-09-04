const BigNumber = window.BigNumber;
window.IS_CONNECTED = false;
window.WALLET_TYPE = "";
window.the_graph_result = {};
const TOKEN_ADDRESS = "0x961c8c0b1aad0c0b10a51fef6a867e3091bcef17";
const TOKEN_IDYP_ADDRESS = "0xbd100d061e120b2c67a24453cf6368e63f1be056";

const TOKENS_DISBURSED_PER_YEAR = [
  360_000, 540_000, 900_000, 1_200_000,

  360_000, 540_000, 900_000, 1_200_000,

  360_000, 540_000, 900_000, 1_200_000,

  360_000, 540_000, 900_000, 1_200_000,
];

const LP_IDs = {
  eth: [
    "0xba7872534a6c9097d805d8bee97e030f4e372e54-0xa7d6f5fa9b0be0e98b3b40e6ac884e53f2f9460e",
    "0xba7872534a6c9097d805d8bee97e030f4e372e54-0x0b0a544ae6131801522e3ac1fbac6d311094c94c",
    "0xba7872534a6c9097d805d8bee97e030f4e372e54-0x16caad63bdfc3ec4a2850336b28efe17e802b896",
    "0xba7872534a6c9097d805d8bee97e030f4e372e54-0x512ff8739d39e55d75d80046921e7de20c3e9bff",
  ],
  wbtc: [
    "0x44b77e9ce8a20160290fcbaa44196744f354c1b7-0xef71de5cb40f7985feb92aa49d8e3e84063af3bb",
    "0x44b77e9ce8a20160290fcbaa44196744f354c1b7-0x8b0e324eede360cab670a6ad12940736d74f701e",
    "0x44b77e9ce8a20160290fcbaa44196744f354c1b7-0x78e2da2eda6df49bae46e3b51528baf5c106e654",
    "0x44b77e9ce8a20160290fcbaa44196744f354c1b7-0x350f3fe979bfad4766298713c83b387c2d2d7a7a",
  ],
  usdt: [
    "0x76911e11fddb742d75b83c9e1f611f48f19234e4-0x4a76fc15d3fbf3855127ec5da8aaf02de7ca06b3",
    "0x76911e11fddb742d75b83c9e1f611f48f19234e4-0xf4abc60a08b546fa879508f4261eb4400b55099d",
    "0x76911e11fddb742d75b83c9e1f611f48f19234e4-0x13f421aa823f7d90730812a33f8cac8656e47dfa",
    "0x76911e11fddb742d75b83c9e1f611f48f19234e4-0x86690bbe7a9683a8bad4812c2e816fd17bc9715c",
  ],
  usdc: [
    "0xabd9c284116b2e757e3d4f6e36c5050aead24e0c-0x2b5d7a865a3888836d15d69dccbad682663dcdbb",
    "0xabd9c284116b2e757e3d4f6e36c5050aead24e0c-0xa52250f98293c17c894d58cf4f78c925dc8955d0",
    "0xabd9c284116b2e757e3d4f6e36c5050aead24e0c-0x924becc8f4059987e4bc4b741b7c354ff52c25e4",
    "0xabd9c284116b2e757e3d4f6e36c5050aead24e0c-0xbe528593781988974d83c2655cba4c45fc75c033",
  ],
};

const LP_ID_LIST = Object.keys(LP_IDs)
  .map((key) => LP_IDs[key])
  .flat();
const TOKENS_DISBURSED_PER_YEAR_BY_LP_ID = {};
LP_ID_LIST.forEach(
  (lp_id, i) =>
    (TOKENS_DISBURSED_PER_YEAR_BY_LP_ID[lp_id] = TOKENS_DISBURSED_PER_YEAR[i])
);
const VAULT_ADDRESSES_LIST = LP_ID_LIST.map((id) => id.split("-")[1]);

window.LP_ID_LIST = LP_ID_LIST;

function getTokenContract(address) {
  return getContract({ key: "token", address, ABI: window.TOKEN_ABI });
}

function getVaultContract(address) {
  return getContract({ key: null, address, ABI: window.VAULT_ABI });
}

function getPrices(coingecko_ids = "ethereum", vs_currencies = "usd") {
  return new Promise((resolve, reject) => {
    window.$.get(
      `https://pro-api.coingecko.com/api/v3/simple/price?ids=${coingecko_ids}&vs_currencies=${vs_currencies}&x_cg_pro_api_key=CG-4cvtCNDCA4oLfmxagFJ84qev`
    )
      .then((result) => {
        resolve(result);
      })
      .catch((error) => {
        reject(error);
      });
  });
}

window.getPrices = getPrices;

class STAKING {
  constructor(ticker = "STAKING", token = "TOKEN") {
    this.ticker = ticker;
    this.token = token;
    let address = window.config[ticker.toLowerCase() + "_address"];
    this._address = address;
    [
      "owner",
      "depositedTokens",
      "depositTime",
      "cliffTime",
      "lastClaimedTime",
      "totalEarnedTokens",
      "totalEarnedEth",
      "getPendingDivs",
      "getPendingDivsEth",
      "tokensToBeDisbursedOrBurnt",
      "tokensToBeSwapped",
      "getNumberOfHolders",
      "getDepositorsList",
      "swapAttemptPeriod",
      "lastSwapExecutionTime",
      "contractDeployTime",
      "disburseDuration",
    ].forEach((fn_name) => {
      this[fn_name] = async function (...args) {
        let contract = await getContract({ key: this.ticker });
        return await contract.methods[fn_name](...args).call();
      };
    });

    ["deposit", "withdraw", "claimAs", "claim"].forEach((fn_name) => {
      this[fn_name] = async function (...args) {
        let contract = await getContract({ key: this.ticker });
        let value = 0;
        console.log(value);

        let { latestGasPrice, maxPriorityFeePerGas } = await getMaxFee();
        console.log({ latestGasPrice, maxPriorityFeePerGas });

        let gas = window.config.default_gas_amount;
        try {
          let estimatedGas = await contract.methods[fn_name](
            ...args
          ).estimateGas({ gas });
          if (estimatedGas) {
            gas = Math.min(estimatedGas, gas);
            //console.log('estimatedgas'+gas)
          }
        } catch (e) {
          console.warn(e);
        }
        return await contract.methods[fn_name](...args).send({
          value,
          gas,
          from: await getCoinbase(),
        });
      };
    });

    // [
    // 	"claim"
    // ].forEach(fn_name => {
    // 	this[fn_name] = async function(...args) {
    // 		let contract = await getContract(this.ticker)
    // 		let value = 0;
    // 		let gas = window.config.default_gas_amount
    // 		return (await contract.methods[fn_name](...args).send({value, gas, from: await getCoinbase(), gasPrice: window.config.default_gasprice_gwei*1e9}))
    // 	}
    // })
  }

  async depositTOKEN(amount) {
    let token_contract = await getContract({ key: this.token });
    let staking_contract = await getContract({ key: this.ticker });
    let batch = new window.web3.eth.BatchRequest();
    batch.add(
      token_contract.methods
        .approve(staking_contract._address, amount)
        .send.request({
          gas: window.config.default_gas_amount,
          from: await getCoinbase(),
        })
    );
    batch.add(
      staking_contract.methods.deposit(amount).send.request({
        gas: window.config.default_gas_amount,
        from: await getCoinbase(),
      })
    );
    return batch.execute();
  }
}

class STAKINGAVAX {
  constructor(ticker = "STAKINGAVAX", token = "TOKENAVAX") {
    this.ticker = ticker;
    this.token = token;
    let address = window.config[ticker.toLowerCase() + "_address"];
    this._address = address;
    [
      "owner",
      "depositedTokens",
      "depositTime",
      "cliffTime",
      "lastClaimedTime",
      "totalEarnedTokens",
      "totalEarnedEth",
      "getPendingDivs",
      "getPendingDivsEth",
      "tokensToBeDisbursedOrBurnt",
      "tokensToBeSwapped",
      "getNumberOfHolders",
      "getDepositorsList",
      "swapAttemptPeriod",
      "lastSwapExecutionTime",
      "contractDeployTime",
      "disburseDuration",
    ].forEach((fn_name) => {
      this[fn_name] = async function (...args) {
        let contract = await getContract({ key: this.ticker });
        return await contract.methods[fn_name](...args).call();
      };
    });

    ["deposit", "withdraw", "claim", "claimAs"].forEach((fn_name) => {
      this[fn_name] = async function (...args) {
        let contract = await getContract({ key: this.ticker });
        let value = 0;

        return await contract.methods[fn_name](...args).send({
          value,
          gas: window.config.default_gas_amount,
          from: await getCoinbase(),
          gasPrice: window.config.default_gasprice_gwei * 1e9,
        });
      };
    });
  }

  async depositTOKEN(amount) {
    let token_contract = await getContract({ key: this.token });
    let staking_contract = await getContract({ key: this.ticker });
    let batch = new window.web3.eth.BatchRequest();
    batch.add(
      token_contract.methods
        .approve(staking_contract._address, amount)
        .send.request({
          gas: window.config.default_gas_amount,
          from: await getCoinbase(),
          gasPrice: window.config.default_gasprice_gwei * 1e9,
        })
    );
    batch.add(
      staking_contract.methods.deposit(amount).send.request({
        gas: window.config.default_gas_amount,
        from: await getCoinbase(),
        gasPrice: window.config.default_gasprice_gwei * 1e9,
      })
    );
    return batch.execute();
  }
}

class STAKINGACTIVEBSC {
  constructor(ticker = "STAKINGACTIVEBSC", token = "TOKEN") {
    this.ticker = ticker;
    this.token = token;
    let address = window.config[ticker.toLowerCase() + "_address"];
    this._address = address;
    [
      "owner",
      "depositedTokens",
      "depositTime",
      "cliffTime",
      "lastClaimedTime",
      "totalEarnedTokens",
      "totalEarnedEth",
      "getPendingDivs",
      "getPendingDivsEth",
      "tokensToBeDisbursedOrBurnt",
      "tokensToBeSwapped",
      "getNumberOfHolders",
      "getDepositorsList",
      "swapAttemptPeriod",
      "lastSwapExecutionTime",
      "contractDeployTime",
      "disburseDuration",
      "getMaxSwappableAmount",
      "getPendingDisbursement",
    ].forEach((fn_name) => {
      this[fn_name] = async function (...args) {
        let contract = await getContract({ key: this.ticker });
        return await contract.methods[fn_name](...args).call();
      };
    });

    ["deposit", "withdraw", "claim", "claimAs"].forEach((fn_name) => {
      this[fn_name] = async function (...args) {
        let contract = await getContract({ key: this.ticker });
        let value = 0;
        console.log(value);
        let gas = window.config.default_gas_amount;

        return await contract.methods[fn_name](...args).send({
          value,
          gas,
          from: await getCoinbase(),
          gasPrice: window.config.default_gasprice_gwei * 1e9,
        });
      };
    });
  }

  async depositTOKEN(amount) {
    let token_contract = await getContract({ key: this.token });
    let staking_contract = await getContract({ key: this.ticker });
    let batch = new window.web3.eth.BatchRequest();
    batch.add(
      token_contract.methods
        .approve(staking_contract._address, amount)
        .send.request({
          gas: window.config.default_gas_amount,
          from: await getCoinbase(),
          gasPrice: window.config.default_gasprice_gwei * 1e9,
        })
    );
    batch.add(
      staking_contract.methods.deposit(amount).send.request({
        gas: window.config.default_gas_amount,
        from: await getCoinbase(),
        gasPrice: window.config.default_gasprice_gwei * 1e9,
      })
    );
    return batch.execute();
  }
}

class STAKINGACTIVEAVAX {
  constructor(ticker = "STAKINGACTIVEAVAX", token = "TOKEN") {
    this.ticker = ticker;
    this.token = token;
    let address = window.config[ticker.toLowerCase() + "_address"];
    this._address = address;
    [
      "owner",
      "depositedTokens",
      "depositTime",
      "cliffTime",
      "lastClaimedTime",
      "totalEarnedTokens",
      "totalEarnedEth",
      "getPendingDivs",
      "getPendingDivsEth",
      "tokensToBeDisbursedOrBurnt",
      "tokensToBeSwapped",
      "getNumberOfHolders",
      "getDepositorsList",
      "swapAttemptPeriod",
      "lastSwapExecutionTime",
      "contractDeployTime",
      "disburseDuration",
      "getMaxSwappableAmount",
      "getPendingDisbursement",
    ].forEach((fn_name) => {
      this[fn_name] = async function (...args) {
        let contract = await getContract({ key: this.ticker });
        return await contract.methods[fn_name](...args).call();
      };
    });

    ["deposit", "withdraw", "claim", "claimAs"].forEach((fn_name) => {
      this[fn_name] = async function (...args) {
        let contract = await getContract({ key: this.ticker });
        let value = 0;
        console.log(value);
        let gas = window.config.default_gas_amount;

        return await contract.methods[fn_name](...args).send({
          value,
          gas,
          from: await getCoinbase(),
          gasPrice: window.config.default_gasprice_gwei * 1e9,
        });
      };
    });
  }

  async depositTOKEN(amount) {
    let token_contract = await getContract({ key: this.token });
    let staking_contract = await getContract({ key: this.ticker });
    let batch = new window.web3.eth.BatchRequest();
    batch.add(
      token_contract.methods
        .approve(staking_contract._address, amount)
        .send.request({
          gas: window.config.default_gas_amount,
          from: await getCoinbase(),
          gasPrice: window.config.default_gasprice_gwei * 1e9,
        })
    );
    batch.add(
      staking_contract.methods.deposit(amount).send.request({
        gas: window.config.default_gas_amount,
        from: await getCoinbase(),
        gasPrice: window.config.default_gasprice_gwei * 1e9,
      })
    );
    return batch.execute();
  }
}

class STAKINGBSC {
  constructor(ticker = "STAKINGBSC", token = "TOKEN") {
    this.ticker = ticker;
    this.token = token;
    let address = window.config[ticker.toLowerCase() + "_address"];
    this._address = address;
    [
      "owner",
      "depositedTokens",
      "depositTime",
      "cliffTime",
      "lastClaimedTime",
      "totalEarnedTokens",
      "totalEarnedEth",
      "getPendingDivs",
      "getPendingDivsEth",
      "tokensToBeDisbursedOrBurnt",
      "tokensToBeSwapped",
      "getNumberOfHolders",
      "getDepositorsList",
      "swapAttemptPeriod",
      "lastSwapExecutionTime",
      "contractDeployTime",
      "disburseDuration",
    ].forEach((fn_name) => {
      this[fn_name] = async function (...args) {
        let contract = await getContract({ key: this.ticker });
        return await contract.methods[fn_name](...args).call();
      };
    });

    ["deposit", "withdraw", "claim", "claimAs"].forEach((fn_name) => {
      this[fn_name] = async function (...args) {
        let contract = await getContract({ key: this.ticker });
        let value = 0;
        console.log(value);
        let gas = window.config.default_gas_amount;

        return await contract.methods[fn_name](...args).send({
          value,
          gas,
          from: await getCoinbase(),
          gasPrice: window.config.default_gasprice_gwei * 1e9,
        });
      };
    });
  }

  async depositTOKEN(amount) {
    let token_contract = await getContract({ key: this.token });
    let staking_contract = await getContract({ key: this.ticker });
    let batch = new window.web3.eth.BatchRequest();
    batch.add(
      token_contract.methods
        .approve(staking_contract._address, amount)
        .send.request({
          gas: window.config.default_gas_amount,
          from: await getCoinbase(),
          gasPrice: window.config.default_gasprice_gwei * 1e9,
        })
    );
    batch.add(
      staking_contract.methods.deposit(amount).send.request({
        gas: window.config.default_gas_amount,
        from: await getCoinbase(),
        gasPrice: window.config.default_gasprice_gwei * 1e9,
      })
    );
    return batch.execute();
  }
}

class TOKEN {
  constructor(key = "TOKEN") {
    this.key = key;
    let address = window.config[key.toLowerCase() + "_address"];
    this._address = address;
  }

  async transfer(to, amount) {
    let contract = await getContract({ key: this.key });

    let { latestGasPrice, maxPriorityFeePerGas } = await getMaxFee();
    console.log({ latestGasPrice, maxPriorityFeePerGas });

    let gas = window.config.default_gas_amount;
    try {
      let estimatedGas = await contract.methods["transfer"](
        to,
        amount
      ).estimateGas({ gas });
      if (estimatedGas) {
        gas = Math.min(estimatedGas, gas);
        //console.log('TRANSFER '+gas)
      }
    } catch (e) {
      console.warn(e);
    }
    return await contract.methods
      .transfer(to, amount)
      .send({ gas, from: await getCoinbase() });
  }
  async totalSupply() {
    let contract = await getContract({ key: this.key });
    return await contract.methods.totalSupply().call();
  }
  async approve(spender, amount) {
    let contract = await getContract({ key: this.key });
    let gas = window.config.default_gas_amount;

    let { latestGasPrice, maxPriorityFeePerGas } = await getMaxFee();
    console.log({ latestGasPrice, maxPriorityFeePerGas });

    try {
      let estimatedGas = await contract.methods["approve"](
        spender,
        amount
      ).estimateGas({ gas });
      if (estimatedGas) {
        gas = Math.min(estimatedGas, gas);
        //console.log('estimatedgas'+gas)
      }
    } catch (e) {
      console.warn(e);
    }
    return await contract.methods
      .approve(spender, amount)
      .send({ gas, from: await getCoinbase() });
  }

  async balanceOf(address) {
    let contract = await getContract({ key: this.key });

    return await contract.methods.balanceOf(address).call();
  }
}

class TOKENAVAX {
  constructor(key = "TOKENAVAX") {
    this.key = key;
    let address = window.config[key.toLowerCase() + "_address"];
    this._address = address;
  }

  async transfer(to, amount) {
    let contract = await getContract({ key: this.key });

    return await contract.methods.transfer(to, amount).send({
      gas: window.config.default_gas_amount,
      from: await getCoinbase(),
      gasPrice: window.config.default_gasprice_gwei * 1e9,
    });
  }
  async totalSupply() {
    let contract = await getContract({ key: this.key });
    return await contract.methods.totalSupply().call();
  }
  async approve(spender, amount) {
    let contract = await getContract({ key: this.key });
    let gas = window.config.default_gas_amount;

    return await contract.methods.approve(spender, amount).send({
      gas,
      from: await getCoinbase(),
      gasPrice: window.config.default_gasprice_gwei * 1e9,
    });
  }
  async balanceOf(address) {
    let contract = await getContract({ key: this.key });
    return await contract.methods.balanceOf(address).call();
  }
}

class TOKENBSC {
  constructor(key = "TOKENBSC") {
    this.key = key;
    let address = window.config[key.toLowerCase() + "_address"];
    this._address = address;
  }

  async transfer(to, amount) {
    let contract = await getContract({ key: this.key });

    let gas = window.config.default_gas_amount;
    try {
      let estimatedGas = await contract.methods["transfer"](
        to,
        amount
      ).estimateGas({ gas });
      if (estimatedGas) {
        gas = Math.min(estimatedGas, gas);
        //console.log('TRANSFER '+gas)
      }
    } catch (e) {
      console.warn(e);
    }
    return await contract.methods.transfer(to, amount).send({
      gas,
      from: await getCoinbase(),
      gasPrice: window.config.default_gasprice_gwei * 1e9,
    });
  }
  async totalSupply() {
    let contract = await getContract({ key: this.key });
    return await contract.methods.totalSupply().call();
  }
  async approve(spender, amount) {
    let contract = await getContract({ key: this.key });
    let gas = window.config.default_gas_amount;
    try {
      let estimatedGas = await contract.methods["approve"](
        spender,
        amount
      ).estimateGas({ gas });
      if (estimatedGas) {
        gas = Math.min(estimatedGas, gas);
        //console.log('estimatedgas'+gas)
      }
    } catch (e) {
      console.warn(e);
    }
    return await contract.methods.approve(spender, amount).send({
      gas,
      from: await getCoinbase(),
      gasPrice: window.config.default_gasprice_gwei * 1e9,
    });
  }
  async balanceOf(address) {
    let contract = await getContract({ key: this.key });
    return await contract.methods.balanceOf(address).call();
  }
}

class CONSTANT_STAKING_NEW {
  constructor(ticker = "CONSTANT_STAKINGNEW", token = "REWARD_TOKEN") {
    this.ticker = ticker;
    this.token = token;
    let address = window.config[ticker.toLowerCase() + "_address"];
    this._address = address;
    [
      "owner",
      "depositedTokens",
      "stakingTime",
      "LOCKUP_TIME",
      "lastClaimedTime",
      "totalEarnedTokens",
      "getPendingDivs",
      "totalReferralFeeEarned",
      "getNumberOfHolders",
      "getStakersList",
      "getTotalPendingDivs",
      "getNumberOfReferredStakers",
      "getReferredStaker",
      "getActiveReferredStaker",
      "contractStartTime",
      "REWARD_INTERVAL",
      "rewardsPendingClaim",
      "getPendingDivs",
      "ADMIN_CAN_CLAIM_AFTER",
    ].forEach((fn_name) => {
      this[fn_name] = async function (...args) {
        let contract = await getContract({ key: this.ticker });
        return await contract.methods[fn_name](...args).call();
      };
    });

    ["stake", "unstake", "claim", "reInvest", "stakeExternal"].forEach(
      (fn_name) => {
        this[fn_name] = async function (...args) {
          let contract = await getContract({ key: this.ticker });
          let value = 0;
          let gas = window.config.default_gas_amount;
          return await contract.methods[fn_name](...args).send({
            value,
            gas,
            from: await getCoinbase(),
            gasPrice: window.config.default_gasprice_gwei * 1e9,
          });
        };
      }
    );
  }

  async depositTOKEN(amount, referrer) {
    let token_contract = await getContract({ key: this.token });
    let staking_contract = await getContract({ key: this.ticker });
    let batch = new window.web3.eth.BatchRequest();
    batch.add(
      token_contract.methods
        .approve(staking_contract._address, amount)
        .send.request({
          gas: window.config.default_gas_amount,
          from: await getCoinbase(),
          gasPrice: window.config.default_gasprice_gwei * 1e9,
        })
    );
    batch.add(
      staking_contract.methods.deposit(amount, referrer).send.request({
        gas: window.config.default_gas_amount,
        from: await getCoinbase(),
        gasPrice: window.config.default_gasprice_gwei * 1e9,
      })
    );
    return batch.execute();
  }
}

class CONSTANT_STAKING_OLD {
  constructor(ticker = "CONSTANT_STAKINGOLD_30", token = "REWARD_TOKEN") {
    this.ticker = ticker;
    this.token = token;

    let address = window.config[ticker.toLowerCase() + "_address"];
    this._address = address;
    [
      "owner",
      "depositedTokens",
      "stakingTime",
      "LOCKUP_TIME",
      "lastClaimedTime",
      "totalEarnedTokens",
      "getPendingDivs",
      "totalReferralFeeEarned",
      "getNumberOfHolders",
      "getStakersList",
      "getTotalPendingDivs",
      "getNumberOfReferredStakers",
      "getReferredStaker",
      "getActiveReferredStaker",
      "contractStartTime",
      "REWARD_INTERVAL",
      "ADMIN_CAN_CLAIM_AFTER",
    ].forEach((fn_name) => {
      this[fn_name] = async function (...args) {
        let contract = await getContract({ key: this.ticker });
        return await contract.methods[fn_name](...args).call();
      };
    });

    ["stake", "unstake", "claim", "reInvest"].forEach((fn_name) => {
      this[fn_name] = async function (...args) {
        let contract = await getContract({ key: this.ticker });
        let value = 0;
        // console.log(value)
        // console.log(contract);

        let { latestGasPrice, maxPriorityFeePerGas } = await getMaxFee();
        console.log({ latestGasPrice, maxPriorityFeePerGas });

        let gas = window.config.default_gas_amount;
        try {
          let estimatedGas = await contract.methods[fn_name](
            ...args
          ).estimateGas({ gas });
          if (estimatedGas) {
            gas = Math.min(estimatedGas, gas);
            console.log("estimatedgas" + gas);
          }
        } catch (e) {
          console.warn(e);
        }
        return await contract.methods[fn_name](...args).send({
          value,
          gas,
          from: await getCoinbase(),
        });
        // return (await contract.methods[fn_name](...args).send({ value, gas, from: await getCoinbase(), maxFeePerGas: latestGasPrice, maxPriorityFeePerGas: maxPriorityFeePerGas }))
      };
    });
  }

  async depositTOKEN(amount, referrer) {
    let token_contract = await getContract({ key: this.token });
    let staking_contract = await getContract({ key: this.ticker });
    let batch = new window.web3.eth.BatchRequest();
    batch.add(
      token_contract.methods
        .approve(staking_contract._address, amount)
        .send.request({
          gas: window.config.default_gas_amount,
          from: await getCoinbase(),
        })
    );
    batch.add(
      staking_contract.methods.deposit(amount, referrer).send.request({
        gas: window.config.default_gas_amount,
        from: await getCoinbase(),
      })
    );
    return batch.execute();
  }
}

class CONSTANT_STAKING {
  constructor(ticker = "CONSTANT_STAKING_30", token = "REWARD_TOKEN") {
    this.ticker = ticker;
    this.token = token;
    let address = window.config[ticker.toLowerCase() + "_address"];
    this._address = address;
    [
      "owner",
      "depositedTokens",
      "stakingTime",
      "LOCKUP_TIME",
      "lastClaimedTime",
      "totalEarnedTokens",
      "getPendingDivs",
      "totalReferralFeeEarned",
      "getNumberOfHolders",
      "getStakersList",
      "getTotalPendingDivs",
      "getNumberOfReferredStakers",
      "getReferredStaker",
      "getActiveReferredStaker",
      "contractStartTime",
      "REWARD_INTERVAL",
      "ADMIN_CAN_CLAIM_AFTER",
    ].forEach((fn_name) => {
      this[fn_name] = async function (...args) {
        let contract = await getContract({ key: this.ticker });
        return await contract.methods[fn_name](...args).call();
      };
    });

    ["stake", "stakeExternal", "unstake", "claim", "reInvest"].forEach(
      (fn_name) => {
        this[fn_name] = async function (...args) {
          let contract = await getContract({ key: this.ticker });
          let value = 0;
          // console.log(value)

          let { latestGasPrice, maxPriorityFeePerGas } = await getMaxFee();
          console.log({ latestGasPrice, maxPriorityFeePerGas });

          let gas = window.config.default_gas_amount;
          try {
            let estimatedGas = await contract.methods[fn_name](
              ...args
            ).estimateGas({ gas });
            if (estimatedGas) {
              gas = Math.min(estimatedGas, gas);
              console.log("estimatedgas" + gas);
            }
          } catch (e) {
            console.warn(e);
          }
          return await contract.methods[fn_name](...args).send({
            value,
            gas,
            from: await getCoinbase(),
          });
          // return (await contract.methods[fn_name](...args).send({ value, gas, from: await getCoinbase(), maxFeePerGas: latestGasPrice, maxPriorityFeePerGas: maxPriorityFeePerGas }))
        };
      }
    );
  }

  async depositTOKEN(amount, referrer) {
    let token_contract = await getContract({ key: this.token });
    let staking_contract = await getContract({ key: this.ticker });
    let batch = new window.web3.eth.BatchRequest();
    batch.add(
      token_contract.methods
        .approve(staking_contract._address, amount)
        .send.request({
          gas: window.config.default_gas_amount,
          from: await getCoinbase(),
        })
    );
    batch.add(
      staking_contract.methods.deposit(amount, referrer).send.request({
        gas: window.config.default_gas_amount,
        from: await getCoinbase(),
      })
    );
    return batch.execute();
  }
}

class CONSTANT_STAKINGAVAX {
  constructor(ticker = "CONSTANT_STAKINGAVAX_30", token = "REWARD_TOKENAVAX") {
    this.ticker = ticker;
    this.token = token;
    let address = window.config[ticker.toLowerCase() + "_address"];
    this._address = address;
    [
      "owner",
      "depositedTokens",
      "stakingTime",
      "LOCKUP_TIME",
      "lastClaimedTime",
      "totalEarnedTokens",
      "getPendingDivs",
      "totalReferralFeeEarned",
      "getNumberOfHolders",
      "getStakersList",
      "getTotalPendingDivs",
      "getNumberOfReferredStakers",
      "getReferredStaker",
      "getActiveReferredStaker",
      "contractStartTime",
      "REWARD_INTERVAL",
      "rewardsPendingClaim",
      "getPendingDivs",
      "ADMIN_CAN_CLAIM_AFTER",
    ].forEach((fn_name) => {
      this[fn_name] = async function (...args) {
        let contract = await getContract({ key: this.ticker });
        return await contract.methods[fn_name](...args).call();
      };
    });

    ["stake", "unstake", "claim", "reInvest", "stakeExternal"].forEach(
      (fn_name) => {
        this[fn_name] = async function (...args) {
          let contract = await getContract({ key: this.ticker });
          let value = 0;
          console.log(value);
          let gas = window.config.default_gas_amount;
          try {
            let estimatedGas = await contract.methods[fn_name](
              ...args
            ).estimateGas({ gas });
            if (estimatedGas) {
              gas = Math.min(estimatedGas, gas);
              console.log("estimatedgas" + gas);
            }
          } catch (e) {
            console.warn(e);
          }
          return await contract.methods[fn_name](...args).send({
            value,
            gas,
            from: await getCoinbase(),
            gasPrice: window.config.default_gasprice_gwei * 1e9,
          });
        };
      }
    );
  }

  async depositTOKEN(amount, referrer) {
    let token_contract = await getContract({ key: this.token });
    let staking_contract = await getContract({ key: this.ticker });
    let batch = new window.web3.eth.BatchRequest();
    batch.add(
      token_contract.methods
        .approve(staking_contract._address, amount)
        .send.request({
          gas: window.config.default_gas_amount,
          from: await getCoinbase(),
          gasPrice: window.config.default_gasprice_gwei * 1e9,
        })
    );
    batch.add(
      staking_contract.methods.deposit(amount, referrer).send.request({
        gas: window.config.default_gas_amount,
        from: await getCoinbase(),
        gasPrice: window.config.default_gasprice_gwei * 1e9,
      })
    );
    return batch.execute();
  }
}

class CONSTANT_STAKINGBSC_NEW {
  constructor(ticker = "CONSTANT_STAKING_30", token = "REWARD_TOKENBSC") {
    this.ticker = ticker;
    this.token = token;
    let address = window.config[ticker.toLowerCase() + "_address"];
    this._address = address;
    [
      "owner",
      "depositedTokens",
      "stakingTime",
      "LOCKUP_TIME",
      "lastClaimedTime",
      "totalEarnedTokens",
      "getPendingDivs",
      "totalReferralFeeEarned",
      "getNumberOfHolders",
      "getStakersList",
      "getTotalPendingDivs",
      "getNumberOfReferredStakers",
      "getReferredStaker",
      "getActiveReferredStaker",
      "contractStartTime",
      "REWARD_INTERVAL",
      "rewardsPendingClaim",
      "getPendingDivs",
      "ADMIN_CAN_CLAIM_AFTER",
    ].forEach((fn_name) => {
      this[fn_name] = async function (...args) {
        let contract = await getContract({ key: this.ticker });
        return await contract.methods[fn_name](...args).call();
      };
    });

    ["stake", "unstake", "claim", "reInvest", "stakeExternal"].forEach(
      (fn_name) => {
        this[fn_name] = async function (...args) {
          let contract = await getContract({ key: this.ticker });
          let value = 0;

          let gas = window.config.default_gas_amount;

          return await contract.methods[fn_name](...args).send({
            value,
            gas,
            from: await getCoinbase(),
            gasPrice: window.config.default_gasprice_gwei * 1e9,
          });
        };
      }
    );
  }

  async depositTOKEN(amount, referrer) {
    let token_contract = await getContract({ key: this.token });
    let staking_contract = await getContract({ key: this.ticker });
    let batch = new window.web3.eth.BatchRequest();
    batch.add(
      token_contract.methods
        .approve(staking_contract._address, amount)
        .send.request({
          gas: window.config.default_gas_amount,
          from: await getCoinbase(),
          gasPrice: window.config.default_gasprice_gwei * 1e9,
        })
    );
    batch.add(
      staking_contract.methods.deposit(amount, referrer).send.request({
        gas: window.config.default_gas_amount,
        from: await getCoinbase(),
        gasPrice: window.config.default_gasprice_gwei * 1e9,
      })
    );
    return batch.execute();
  }
}

class CONSTANT_STAKING_NEWAVAX {
  constructor(ticker = "CONSTANT_STAKINGAVAX_30", token = "REWARD_TOKENAVAX") {
    this.ticker = ticker;
    this.token = token;
    let address = window.config[ticker.toLowerCase() + "_address"];
    this._address = address;
    [
      "owner",
      "depositedTokens",
      "stakingTime",
      "LOCKUP_TIME",
      "lastClaimedTime",
      "totalEarnedTokens",
      "getPendingDivs",
      "totalReferralFeeEarned",
      "getNumberOfHolders",
      "getStakersList",
      "getTotalPendingDivs",
      "getNumberOfReferredStakers",
      "getReferredStaker",
      "getActiveReferredStaker",
      "contractStartTime",
      "REWARD_INTERVAL",
      "rewardsPendingClaim",
      "getPendingDivs",
      "ADMIN_CAN_CLAIM_AFTER",
    ].forEach((fn_name) => {
      this[fn_name] = async function (...args) {
        let contract = await getContract({ key: this.ticker });
        return await contract.methods[fn_name](...args).call();
      };
    });

    ["stake", "unstake", "claim", "reInvest", "stakeExternal"].forEach(
      (fn_name) => {
        this[fn_name] = async function (...args) {
          let contract = await getContract({ key: this.ticker });
          let value = 0;

          let gas = window.config.default_gas_amount;
          return await contract.methods[fn_name](...args).send({
            value,
            gas,
            from: await getCoinbase(),
            gasPrice: window.config.default_gasprice_gwei * 1e9,
          });
        };
      }
    );
  }

  async depositTOKEN(amount, referrer) {
    let token_contract = await getContract({ key: this.token });
    let staking_contract = await getContract({ key: this.ticker });
    let batch = new window.web3.eth.BatchRequest();
    batch.add(
      token_contract.methods
        .approve(staking_contract._address, amount)
        .send.request({
          gas: window.config.default_gas_amount,
          from: await getCoinbase(),
          gasPrice: window.config.default_gasprice_gwei * 1e9,
        })
    );
    batch.add(
      staking_contract.methods.deposit(amount, referrer).send.request({
        gas: window.config.default_gas_amount,
        from: await getCoinbase(),
        gasPrice: window.config.default_gasprice_gwei * 1e9,
      })
    );
    return batch.execute();
  }
}

class BUYBACK_STAKING {
  constructor(ticker = "BUYBACK_STAKING", token = "REWARD_TOKEN") {
    this.ticker = ticker;
    this.token = token;
    let address = window.config[ticker.toLowerCase() + "_address"];
    this._address = address;
    [
      "owner",
      "depositedTokens",
      "stakingTime",
      "LOCKUP_TIME",
      "lastClaimedTime",
      "totalEarnedTokens",
      "getPendingDivs",
      "getNumberOfHolders",
      "getStakersList",
      "getTotalPendingDivs",
      "contractStartTime",
      "REWARD_INTERVAL",
    ].forEach((fn_name) => {
      this[fn_name] = async function (...args) {
        let contract = await getContract({ key: this.ticker });
        return await contract.methods[fn_name](...args).call();
      };
    });

    ["stake", "unstake", "reInvest", "claim"].forEach((fn_name) => {
      this[fn_name] = async function (...args) {
        let contract = await getContract({ key: this.ticker });
        let value = 0;
        console.log(value);
        let gas = window.config.default_gas_amount;

        let { latestGasPrice, maxPriorityFeePerGas } = await getMaxFee();
        console.log({ latestGasPrice, maxPriorityFeePerGas });

        //console.log({latestGasPrice})
        // try {
        // 	let estimatedGas = await contract.methods[fn_name](...args).estimateGas({ gas })
        // 	if (estimatedGas) {
        // 		gas = Math.min(estimatedGas, gas)
        // 		console.log('estimatedgas'+gas)
        // 	}
        // } catch (e) {
        // 	console.warn(e)
        // }
        return await contract.methods[fn_name](...args).send({
          value,
          gas,
          from: await getCoinbase(),
        });
      };
    });
  }
}

class BUYBACK_STAKINGAVAX {
  constructor(ticker = "BUYBACK_STAKINGAVAX", token = "REWARD_TOKEN") {
    this.ticker = ticker;
    this.token = token;
    let address = window.config[ticker.toLowerCase() + "_address"];
    this._address = address;
    [
      "owner",
      "depositedTokens",
      "stakingTime",
      "LOCKUP_TIME",
      "lastClaimedTime",
      "totalEarnedTokens",
      "getPendingDivs",
      "getNumberOfHolders",
      "getStakersList",
      "getTotalPendingDivs",
      "contractStartTime",
      "REWARD_INTERVAL",
    ].forEach((fn_name) => {
      this[fn_name] = async function (...args) {
        let contract = await getContract({ key: this.ticker });
        return await contract.methods[fn_name](...args).call();
      };
    });

    ["stake", "unstake", "reInvest", "claim"].forEach((fn_name) => {
      this[fn_name] = async function (...args) {
        let contract = await getContract({ key: this.ticker });
        let value = 0;
        console.log(value);
        return await contract.methods[fn_name](...args).send({
          value,
          gas: window.config.default_gas_amount,
          from: await getCoinbase(),
          gasPrice: window.config.default_gasprice_gwei * 1e9,
        });
      };
    });
  }
}

class BUYBACK_STAKINGBSC {
  constructor(ticker = "BUYBACK_STAKINGBSC", token = "REWARD_TOKEN") {
    this.ticker = ticker;
    this.token = token;
    let address = window.config[ticker.toLowerCase() + "_address"];
    this._address = address;
    [
      "owner",
      "depositedTokens",
      "stakingTime",
      "LOCKUP_TIME",
      "lastClaimedTime",
      "totalEarnedTokens",
      "getPendingDivs",
      "getNumberOfHolders",
      "getStakersList",
      "getTotalPendingDivs",
      "contractStartTime",
      "REWARD_INTERVAL",
    ].forEach((fn_name) => {
      this[fn_name] = async function (...args) {
        let contract = await getContract({ key: this.ticker });
        return await contract.methods[fn_name](...args).call();
      };
    });

    ["stake", "unstake", "reInvest", "claim"].forEach((fn_name) => {
      this[fn_name] = async function (...args) {
        let contract = await getContract({ key: this.ticker });
        let value = 0;
        console.log(value);
        let gas = window.config.default_gas_amount;

        return await contract.methods[fn_name](...args).send({
          value,
          gas,
          from: await getCoinbase(),
          gasPrice: window.config.default_gasprice_gwei * 1e9,
        });
      };
    });
  }
}

class VAULT {
  constructor(vaultAddress, tokenAddress) {
    this._address = vaultAddress;
    this.tokenAddress = tokenAddress;
    [
      "owner",
      "getExchangeRateStored",
      "LOCKUP_DURATION",
      "UNDERLYING_DECIMALS",
      "TRUSTED_CTOKEN_ADDRESS",
      "MIN_ETH_FEE_IN_WEI",
      "FEE_PERCENT_X_100",
      "FEE_PERCENT_TO_BUYBACK_X_100",
      "REWARD_INTERVAL",
      "contractStartTime",
      "getNumberOfHolders",
      "cTokenBalance",
      "depositTokenBalance",
      "totalTokensDepositedByUser",
      "totalTokensWithdrawnByUser",
      "totalEarnedCompoundDivs",
      "totalEarnedEthDivs",
      "totalEarnedTokenDivs",
      "totalEarnedPlatformTokenDivs",
      "depositTime",
      "lastClaimedTime",
      "totalDepositedTokens",
      "totalCTokens",
      "tokenDivsBalance",
      "ethDivsBalance",
      "platformTokenDivsBalance",
      "totalEthDisbursed",
      "totalTokensDisbursed",
      "tokenDivsOwing",
      "ethDivsOwing",
      "getDepositorsList",
      "platformTokenDivsOwing",
      "getEstimatedCompoundDivsOwing",
    ].forEach((fn_name) => {
      this[fn_name] = async function (...args) {
        let contract = await getVaultContract(vaultAddress);
        return await contract.methods[fn_name](...args).call();
      };
    });

    ["claim", "getExchangeRateCurrent", "deposit", "withdraw"].forEach(
      (fn_name) => {
        this[fn_name] = async function (args, value = 0) {
          let contract = await getVaultContract(vaultAddress);
          return await contract.methods[fn_name](...args).send({
            value,
            from: await getCoinbase(),
          });
        };
      }
    );
  }

  approveToken = async (amount) => {
    let token_contract = await getTokenContract(this.tokenAddress);
    return await token_contract.methods
      .approve(this._address, amount)
      .send({ value, from: await getCoinbase() });
  };

  getTvlUsdAndApyPercent = async (
    UNDERLYING_DECIMALS = 18,
    PLATFORM_TOKEN_DECIMALS = 18
  ) => {
    let ethBalance = await window.web3.eth.getBalance(this._address);
    let underlyingBalance1 = await this.totalDepositedTokens();
    let underlyingBalance2 = await (
      await getTokenContract(this.tokenAddress)
    ).methods
      .balanceOf(this._address)
      .call();
    let platformTokenBalance = await (
      await getTokenContract(window.config.token_dyp_address)
    ).methods
      .balanceOf(this._address)
      .call();

    ethBalance = ethBalance / 1e18;
    underlyingBalance1 = underlyingBalance1 / 10 ** UNDERLYING_DECIMALS;
    underlyingBalance2 = underlyingBalance2 / 10 ** UNDERLYING_DECIMALS;
    let underlyingBalance = underlyingBalance1 + underlyingBalance2;
    platformTokenBalance = platformTokenBalance / 10 ** PLATFORM_TOKEN_DECIMALS;

    let underlyingId = window.config.cg_ids[this.tokenAddress.toLowerCase()];
    let platformTokenId =
      window.config.cg_ids[window.config.token_dyp_address.toLowerCase()];
    let priceIds = `ethereum,${underlyingId},${platformTokenId}`;
    let prices = await getPrices(priceIds);
    console.log(prices);
    let ethUsdValue = ethBalance * prices["ethereum"]["usd"] || 0;
    let underlyingUsdValue =
      underlyingBalance * prices[underlyingId]["usd"] || 0;
    let platformTokenUsdValue =
      platformTokenBalance * prices[platformTokenId]["usd"] || 0;

    let tvlUsd = ethUsdValue + underlyingUsdValue + platformTokenUsdValue || 0;

    // ------- apy percent calculations ----------
    let apyPercent = 0;

    let platformTokenApyPercent = 0;

    let contractStartTime = await this.contractStartTime();
    let now = Math.floor(Date.now() / 1e3);
    let daysSinceDeployment = Math.floor(
      Math.max(1, (now - contractStartTime) / 60 / 60 / 24 || 1)
    );
    let totalEthDisbursed = await this.totalEthDisbursed();
    let totalTokensDisbursed = await this.totalTokensDisbursed();

    totalEthDisbursed = totalEthDisbursed / 1e18;
    totalTokensDisbursed = totalTokensDisbursed / 10 ** UNDERLYING_DECIMALS;

    let usdValueOfEthDisbursed =
      totalEthDisbursed * prices["ethereum"]["usd"] || 0;
    let usdValueOfTokenDisbursed =
      totalTokensDisbursed * prices[underlyingId]["usd"] || 0;
    let usdValueDisbursed =
      usdValueOfEthDisbursed + usdValueOfTokenDisbursed || 0;
    let usdValueDisbursedPerDay = usdValueDisbursed / daysSinceDeployment;

    let usdValueDisbursedPerYear = usdValueDisbursedPerDay * 365;

    let usdValueOfDepositedTokens =
      underlyingBalance1 * prices[underlyingId]["usd"] || 1;

    let feesApyPercent =
      (usdValueDisbursedPerYear / usdValueOfDepositedTokens) * 100;

    let compoundApyPercent = 0;

    let ctokenAddr = await this.TRUSTED_CTOKEN_ADDRESS();

    let compResult = await window.jQuery.ajax({
      url: `https://api.compound.finance/api/v2/ctoken?addresses=${ctokenAddr}&network=${window.config.compound_network}`,
      method: "GET",
      headers: {
        "compound-api-key": window.config.compound_api_key,
      },
    });

    if (!compResult.error) {
      compoundApyPercent =
        (Number(compResult.cToken[0]?.supply_rate?.value) || 0) * 100;
    }

    //console.log({compResult, compoundApyPercent})

    apyPercent =
      platformTokenApyPercent + compoundApyPercent + feesApyPercent || 0;

    // console.log({
    // 	tvlUsd,ethUsdValue,underlyingUsdValue,platformTokenUsdValue,
    // 	underlyingBalance, ethBalance, platformTokenBalance,
    //
    // 	feesApyPercent, platformTokenApyPercent, compoundApyPercent, apyPercent
    // })

    // console.log({
    // 	usdValueDisbursed, usdValueDisbursedPerDay, usdValueDisbursedPerYear,
    // 	usdValueOfDepositedTokens
    // })

    return { tvl_usd: tvlUsd, apy_percent: apyPercent };
  };
}

class VAULT_NEW {
  constructor(vaultAddress, tokenAddress) {
    this._address = vaultAddress;
    this.tokenAddress = tokenAddress;
    [
      "owner",
      "getExchangeRateStored",
      "LOCKUP_DURATION",
      "UNDERLYING_DECIMALS",
      "TRUSTED_CTOKEN_ADDRESS",
      "MIN_ETH_FEE_IN_WEI",
      "FEE_PERCENT_X_100",
      "FEE_PERCENT_TO_BUYBACK_X_100",
      "REWARD_INTERVAL",
      "contractStartTime",
      "getNumberOfHolders",
      "cTokenBalance",
      "depositTokenBalance",
      "totalTokensDepositedByUser",
      "totalTokensWithdrawnByUser",
      "totalEarnedCompoundDivs",
      "totalEarnedEthDivs",
      "totalEarnedTokenDivs",
      "totalEarnedPlatformTokenDivs",
      "depositTime",
      "lastClaimedTime",
      "totalDepositedTokens",
      "totalCTokens",
      "tokenDivsBalance",
      "ethDivsBalance",
      "platformTokenDivsBalance",
      "totalEthDisbursed",
      "totalTokensDisbursed",
      "tokenDivsOwing",
      "ethDivsOwing",
      "getDepositorsList",
      "platformTokenDivsOwing",
      "getEstimatedCompoundDivsOwing",
    ].forEach((fn_name) => {
      this[fn_name] = async function (...args) {
        let contract = await getVaultContract(vaultAddress);
        return await contract.methods[fn_name](...args).call();
      };
    });

    ["claim", "getExchangeRateCurrent", "deposit", "withdraw"].forEach(
      (fn_name) => {
        this[fn_name] = async function (args, value = 0) {
          let contract = await getVaultContract(vaultAddress);
          return await contract.methods[fn_name](...args).send({
            value,
            from: await getCoinbase(),
          });
        };
      }
    );
  }

  approveToken = async (amount) => {
    let token_contract = await getTokenContract(this.tokenAddress);

    return await token_contract.methods
      .approve(this._address, amount)
      .send({ value, from: await getCoinbase() });
  };

  getTvlUsdAndApyPercent = async (
    UNDERLYING_DECIMALS = 18,
    PLATFORM_TOKEN_DECIMALS = 18,
    token_contr,
    token_contridyp
  ) => {
    let ethBalance = await window.infuraWeb3.eth.getBalance(this._address);
    let underlyingBalance1 = await this.totalDepositedTokens();
    let tvlUsd = 0;

    // ------- apy percent calculations ----------
    let apyPercent = 0;
    if (token_contr && token_contridyp) {
      let underlyingBalance2 = await token_contr.methods
        .balanceOf(this._address)
        .call();

      let platformTokenBalance = await token_contridyp.methods
        .balanceOf(this._address)
        .call();

      ethBalance = ethBalance / 1e18;
      underlyingBalance1 = underlyingBalance1 / 10 ** UNDERLYING_DECIMALS;
      underlyingBalance2 = underlyingBalance2 / 10 ** UNDERLYING_DECIMALS;
      let underlyingBalance = underlyingBalance1 + underlyingBalance2;
      platformTokenBalance =
        platformTokenBalance / 10 ** PLATFORM_TOKEN_DECIMALS;

      let underlyingId = window.config.cg_ids[this.tokenAddress.toLowerCase()];

      let platformTokenId =
        window.config.cg_ids[
          window.config.reward_token_idyp_address.toLowerCase()
        ];

      let priceIds = `ethereum,${underlyingId},${platformTokenId}`;

      let prices = await getPrices(priceIds);
      let ethUsdValue = ethBalance * prices["ethereum"]["usd"] || 0;
      let underlyingUsdValue =
        underlyingBalance * prices[underlyingId]["usd"] || 0;
      let platformTokenUsdValue =
        platformTokenBalance * prices[platformTokenId]["usd"] || 0;

      tvlUsd = ethUsdValue + underlyingUsdValue + platformTokenUsdValue || 0;

      // ------- apy percent calculations ----------

      let platformTokenApyPercent = 0;

      let contractStartTime = await this.contractStartTime();
      let now = Math.floor(Date.now() / 1e3);
      let daysSinceDeployment = Math.floor(
        Math.max(1, (now - contractStartTime) / 60 / 60 / 24 || 1)
      );
      let totalEthDisbursed = await this.totalEthDisbursed();
      let totalTokensDisbursed = await this.totalTokensDisbursed();

      totalEthDisbursed = totalEthDisbursed / 1e18;
      totalTokensDisbursed = totalTokensDisbursed / 10 ** UNDERLYING_DECIMALS;

      let usdValueOfEthDisbursed =
        totalEthDisbursed * prices["ethereum"]["usd"] || 0;
      let usdValueOfTokenDisbursed =
        totalTokensDisbursed * prices[underlyingId]["usd"] || 0;
      let usdValueDisbursed =
        usdValueOfEthDisbursed + usdValueOfTokenDisbursed || 0;
      let usdValueDisbursedPerDay = usdValueDisbursed / daysSinceDeployment;

      let usdValueDisbursedPerYear = usdValueDisbursedPerDay * 365;

      let usdValueOfDepositedTokens =
        underlyingBalance1 * prices[underlyingId]["usd"] || 1;

      let feesApyPercent =
        (usdValueDisbursedPerYear / usdValueOfDepositedTokens) * 100;

      let compoundApyPercent = 0;

      let ctokenAddr = await this.TRUSTED_CTOKEN_ADDRESS();

      let compResult = await window.jQuery.ajax({
        url: `https://api.compound.finance/api/v2/ctoken?addresses=${ctokenAddr}&network=${window.config.compound_network}`,
        method: "GET",
        headers: {
          "compound-api-key": window.config.compound_api_key,
        },
      });

      if (!compResult.error) {
        compoundApyPercent =
          (Number(compResult.cToken[0]?.supply_rate?.value) || 0) * 100;
      }

      apyPercent =
        platformTokenApyPercent + compoundApyPercent + feesApyPercent || 0;
    }

    return { tvl_usd: tvlUsd, apy_percent: apyPercent };
  };
}

// ALL THE ADDRESSES IN CONFIG MUST BE LOWERCASE
window.config = {
  cg_ids: {
    // lowercase contract address => coingecko id
    "0x6b175474e89094c44da98b954eedeac495271d0f": "dai",
    "0x961c8c0b1aad0c0b10a51fef6a867e3091bcef17": "defi-yield-protocol",
    "0xdac17f958d2ee523a2206206994597c13d831ec7": "tether",
    "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2": "weth",
    "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599": "bitcoin",
    "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": "dai",
    "0xbd100d061e120b2c67a24453cf6368e63f1be056": "idefiyieldprotocol",
  },
  admin_address: "0x910090Ea889B64B4e722ea4b8fF6D5e734dFb38F",
  vote_duration_in_seconds: 259200, // 5 minutes for test
  weth_address: "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7", // LOWERCASE! avax
  weth2_address: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", // ethereum
  default_gas_amount: 1200000,

  farmweth_address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", //farm weth

  wethavax_address: "0xf20d962a6c8f70c731bd838a3a388d7d48fa6e15",
  wethbsc_address: "0x2170ed0880ac9a755fd29b2688956bd959f933f8",
  bscweth_address: "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c", // LOWERCASE! wbnb
  // WBNB !! weth_address: '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c', // LOWERCASE!

  infura_endpoint:
    "https://mainnet.infura.io/v3/94608dc6ddba490697ec4f9b723b586e",
  bsc_endpoint: "https://bsc-dataseed.binance.org/",
  avax_endpoint: "https://api.avax.network/ext/bc/C/rpc",

  BUSD_address: "0xe9e7cea3dedca5984780bafc599bd69add087d56",
  USDCe_address: "0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664",
  USDC_address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
  platform_token_address: "0x961c8c0b1aad0c0b10a51fef6a867e3091bcef17",
  locker_address: "0x4c695f6198cd4e56efcbf750d0b8961d28885f57",
  lockereth_address: "0x0c5d9AA95329517918AA7b82BfDa25d60446E1ac",

  //DYP-ETH 3 days
  token_address: "0xBa7872534a6C9097d805d8BEE97e030f4e372e54",
  staking_address: "0xa7d6F5fa9b0be0e98b3b40E6aC884e53F2F9460e",

  //DYP-ETH 30 days
  token_dyp30_address: "0xBa7872534a6C9097d805d8BEE97e030f4e372e54",
  staking_dyp30_address: "0x0b0A544AE6131801522E3aC1FBAc6D311094c94c",

  //DYP-ETH 60 days
  token_dyp60_address: "0xBa7872534a6C9097d805d8BEE97e030f4e372e54",
  staking_dyp60_address: "0x16cAaD63BDFC3Ec4A2850336B28efE17e802b896",

  //DYP-ETH 60 days
  token_dyp90_address: "0xBa7872534a6C9097d805d8BEE97e030f4e372e54",
  staking_dyp90_address: "0x512FF8739d39e55d75d80046921E7dE20c3e9BFf",

  //DYP-WBTC 3 days
  token_wbtc3_address: "0x44B77e9cE8A20160290FcBAA44196744F354C1b7",
  staking_wbtc3_address: "0xeF71DE5Cb40f7985FEb92AA49D8e3E84063Af3BB",

  //DYP-WBTC 30 days
  token_wbtc30_address: "0x44B77e9cE8A20160290FcBAA44196744F354C1b7",
  staking_wbtc30_address: "0x8B0e324EEdE360CaB670a6AD12940736d74f701e",

  //DYP-WBTC 60 days
  token_wbtc60_address: "0x44B77e9cE8A20160290FcBAA44196744F354C1b7",
  staking_wbtc60_address: "0x78e2dA2eda6dF49BaE46E3B51528BAF5c106e654",

  //DYP-WBTC 90 days
  token_wbtc90_address: "0x44B77e9cE8A20160290FcBAA44196744F354C1b7",
  staking_wbtc90_address: "0x350F3fE979bfad4766298713c83b387C2D2D7a7a",

  //DYP-USDC 3 days
  token_usdc3_address: "0xabD9C284116B2e757E3D4f6E36C5050AEaD24e0c",
  staking_usdc3_address: "0x2b5D7a865A3888836d15d69dCCBad682663DCDbb",

  //DYP-USDC 30 days
  token_usdc30_address: "0xabD9C284116B2e757E3D4f6E36C5050AEaD24e0c",
  staking_usdc30_address: "0xa52250f98293c17C894d58cf4f78c925dC8955d0",

  //DYP-USDC 60 days
  token_usdc60_address: "0xabD9C284116B2e757E3D4f6E36C5050AEaD24e0c",
  staking_usdc60_address: "0x924BECC8F4059987E4bc4B741B7C354FF52c25e4",

  //DYP-USDC 90 days
  token_usdc90_address: "0xabD9C284116B2e757E3D4f6E36C5050AEaD24e0c",
  staking_usdc90_address: "0xbE528593781988974D83C2655CBA4c45FC75c033",

  //DYP-USDT 3 days
  token_usdt3_address: "0x76911E11FddB742D75b83C9e1F611F48f19234E4",
  staking_usdt3_address: "0x4a76Fc15D3fbf3855127eC5DA8AAf02DE7ca06b3",

  //DYP-USDT 30 days
  token_usdt30_address: "0x76911E11FddB742D75b83C9e1F611F48f19234E4",
  staking_usdt30_address: "0xF4abc60a08B546fA879508F4261eb4400B55099D",

  //DYP-USDT 60 days
  token_usdt60_address: "0x76911E11FddB742D75b83C9e1F611F48f19234E4",
  staking_usdt60_address: "0x13F421Aa823f7D90730812a33F8Cac8656E47dfa",

  //DYP-USDT 90 days
  token_usdt90_address: "0x76911E11FddB742D75b83C9e1F611F48f19234E4",
  staking_usdt90_address: "0x86690BbE7a9683A8bAd4812C2e816fd17bC9715C",

  token_dai_address: "0xa964d4ff6C14822Fc64CE4eC5Dc707D869DaC0bA",
  staking_dai_address: "0x850942B57DD500b73bBdB9F713789Ca72D10D235",

  reward_token_address: "0x961c8c0b1aad0c0b10a51fef6a867e3091bcef17", //REWARD TOKEN
  reward_tokenavax_address: "0x961c8c0b1aad0c0b10a51fef6a867e3091bcef17", //REWARD TOKEN

  weth_address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  etherscan_baseURL: "https://etherscan.io",
  snowtrace_baseURL: "https://snowtrace.io",
  bscscan_baseURL: "https://bscscan.com/",

  max_proposals_per_call: 4,
  // default_gasprice_gwei: 60,
  default_gas_amount: 1200000,
  token_decimals: 18,
  lp_amplify_factor: 1,

  constant_stakingold_30_address: "0x7Fc2174670d672AD7f666aF0704C2D961EF32c73",
  constant_stakingold_60_address: "0x036e336eA3ac2E255124CF775C4FDab94b2C42e4",
  constant_stakingold_90_address: "0x0A32749D95217b7Ee50127E24711c97849b70C6a",
  constant_stakingold_120_address: "0x82df1450eFD6b504EE069F5e4548F2D5Cb229880",

  // Constant staking iDYP
  constant_stakingold_130_address: "0x9ea966b4023049bff858bb5e698ecff24ea54c4a",
  constant_stakingold_140_address: "0x3fab09acaeddaf579d7a72c24ef3e9eb1d2975c4",
  constant_stakingold_150_address: "0x50014432772b4123d04181727c6edeab34f5f988",
  constant_stakingold_160_address: "0xd4be7a106ed193bee39d6389a481ec76027b2660",
  constant_stakingold_170_address: "0x41b8a58f4307ea722ad0a964966caa18a6011d93",

  /*buyback*/
  buyback_staking_address: "0xe5262f38bf13410a79149cb40429f8dc5e830542",
  slippage_tolerance_percent: 3, // 3% slippage tolerance
  slippage_tolerance_percent_liquidity: 3,
  tx_max_wait_seconds: 20 * 60, // 20 mins - deposit and withdraw tx will fail (swap will fail) after this duration of being pending
  uniswap_router_address: "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",

  //constant staking New
  constant_stakingnew_new1_address:
    "0xa4da28B8e42680916b557459D338aF6e2D8d458f",
  constant_stakingnew_new2_address:
    "0x8A30Be7B2780b503ff27dBeaCdecC4Fe2587Af5d",

  constant_staking_newi3_address: "0xeb7dd6B50dB34f7ff14898D0Be57A99A9F158C4D",

  //Buyback new
  buyback_staking1_1_address: "0xdCBB5B2148f0cf1Abd7757Ba04A5821fEaD80587",
  buyback_staking1_2_address: "0xDC65C4277d626d6A29C9Dc42Eb396d354fa5E85b",
  constant_stakingnew_new3_address:
    "0x471beCc72AD487249efE521bf9b6744b882830DF",
  constant_stakingnew_new4_address:
    "0x7b7132E7BF4e754855191a978F3979e1E3c8617b",

  //Buyback new avax
  buyback_stakingavax1_1_address: "0xC905D5DD9A4f26eD059F76929D11476B2844A7c3",
  buyback_stakingavax1_2_address: "0x267434f01ac323C6A5BCf41Fa111701eE0165a37",

  //constant staking for Buyback New avax
  constant_stakingnew_newavax3_address:
    "0xe6B307CD185f2A541a661eA312E3e7939Ea9d218",
  constant_stakingnew_newavax4_address:
    "0x934819D227B7095595eC9cA6604eF2Dd0C3a9EA2",

  //Farming new
  token_new_address: "0x7463286a379f6f128058bb92b355e3d6e8bdb219",
  token_newavax_address: "0x66eecc97203704d9e2db4a431cb0e9ce92539d5a",
  token_newbsc_address: "0x1bC61d08A300892e784eD37b2d0E63C85D1d57fb",

  constant_stakingnew_newavaxactive1_address:
    "0x245978ea5EFc6eec44AF03032F6318a81190DCbF",

  constant_stakingnew_newbscactive1_address:
    "0x52b638ee4c0db759234f792b0ad59a8ce95737f3",

  constant_stakingnew_newavax5_address:
    "0x1cA9Fc98f3b997E08bC04691414e33B1835aa7e5",
  constant_stakingnew_newavax9_address:
    "0x9FF3DC1f7042bAF46651029C7284Fc3B93e21a4D",
  constant_stakingnew_newavax8_address:
    "0x4c16093Da4BA7a604A1Fe8CD5d387cC904B3D407",
  constant_stakingnew_newavax7_address:
    "0xC2ba0abFc89A5A258e6440D82BB95A5e2B541581",
  constant_stakingnew_newavax6_address:
    "0x6a258Bd17456e057A7c6102177EC2f9d64D5F9e4",

  constant_stakingdaiavax_address: "0x16429e51A64B7f88D4C018fbf66266A693df64b3",
  constant_stakingdaieth_address: "0x44bEd8ea3296bda44870d0Da98575520De1735d4",

  constant_stakingdaibsc_address: "0xa9efab22cCbfeAbB6dc4583d81421e76342faf8b",

  farming_new_1_address: "0xa68BBe793ad52d0E62bBf34A67F02235bA69E737",
  farming_newavax_1_address: "0x035d65babF595758D7A439D5870BAdc44218D028",
  farming_newavax_2_address: "0x6c325DfEA0d18387D423C869E328Ef005cBA024F",
  farming_newavax_3_address: "0x85C4f0CEA0994dE365dC47ba22dD0FD9899F93Ab",
  farming_newavax_4_address: "0x6f5dC6777b2B4667Bf183D093111867239518af5",
  farming_newavax_5_address: "0x10E105676CAC55b74cb6500a8Fb5d2f84804393D",

  constant_stakingnew_new5_address:
    "0x0b92E7f074e7Ade0181A29647ea8474522e6A7C2",

  //Farming New
  farming_new_2_address: "0xCFd970494a0b3C52a81dcE1EcBFF2245e6b0B0E7",
  constant_stakingnew_new6_address:
    "0xff32a38016422F51e8C0aF5D333472392822FeEf",

  //Farming New
  farming_new_3_address: "0x49D02CF81Cc352517350F25E200365360426aF94",
  constant_stakingnew_new7_address:
    "0x62AAE8C0c50038236d075AC595Ae0BE4F201bBdd",

  //Farming New
  farming_new_4_address: "0xf51965c570419F2576ec9AeAD6A3C5F674424A99",
  constant_stakingnew_new8_address:
    "0xb67F464b558e3055C2B6F017546Ed53b2e6333d7",

  //Farming New
  farming_new_5_address: "0x997A7254E5567d0A70329DEFCc1E4d29d71Ba224",
  constant_stakingnew_new9_address:
    "0x1aB008CbfC99d0CA7e3FD8987ce1ebf832506F53",

  reward_token_idyp_address: "0xbd100d061e120b2c67a24453cf6368e63f1be056",

  USDC_address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",

  claim_as_eth_address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  claim_as_ethavax_address: "0x49d5c2bdffac6ce2bfdb6640f4f80f226bc10bab",

  claim_as_usdt_address: "0xdac17f958d2ee523a2206206994597c13d831ec7",

  constant_staking_200_address: "0x45152e167cc2ebd4011138f646dc80eec9c8582e",
  constant_staking_300_address: "0x45152e167cc2ebd4011138f646dc80eec9c8582e",

  reward_token_dyps_address: "0xd4f11Bf85D751F426EF59b705E42b3da3357250f",
  reward_token_dypsavax_address: "0x4689545A1389E7778Fd4e66F854C91Bf8aBacBA9",
  reward_token_dypsbsc_address: "0x4B2dfB131B0AE1D6d5D0c9a3a09c028a5cD10554",

  //Constant Staking DYP -> DAI
  reward_token_daieth_address: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
  reward_token_dai_address: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
  reward_token_daiavax_address: "0xd586E7F844cEa2F87f50152665BCbc2C279D8d70",
  reward_token_daibsc_address: "0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3",

  token_weth_address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", //vault weth
  token_wbtc_address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
  token_usdt_address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  token_usdc_address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  token_dai_address: "0x6B175474E89094C44Da98b954EedeAC495271d0F",

  vault_weth_address: "0x28eabA060E5EF0d41eeB20d41aafaE8f685739d9",
  vault_wethnew_address: "0xf4389cd022a0188035f366426364cc079695c436",

  vault_wbtc_address: "0x2F2cff66fEB7320FC9Adf91b7B74bFb5a80C7C35",
  vault_wbtcnew_address: "0x2e660644a5582d23ba274cf406488e18bcd55b06",

  vault_usdt_address: "0xA987aEE0189Af45d5FA95a9FBBCB4374228f375E",
  vault_usdtnew_address: "0xE39BEd1DeC2f97dA3aEb014a28170FE5fB66065F",

  vault_usdc_address: "0x251B9ee6cEd97565A821C5608014a107ddc9C98F",
  vault_usdcnew_address: "0xfc569288c4297419b776c0bdfac677256e10da3f",

  vault_dai_address: "0x54F30bFfeb925F47225e148f0bAe17a452d6b8c0",
  vault_dainew_address: "0xf656dc256c60eb8417366015ee9217462b5a795d",

  subscription_address: "0x5078a4912f6e0d74dcf99482ac5910df123e9b4b",
  subscriptioneth_address: "0x6cc47d895aa6da6012c2b6bfd2f6af3ebbf1d2e4",
  subscriptionbnb_address: "0x0ec59a2d18e1e83ab393b3ac9d7d6d28cbff0d35",
  ZERO_ADDRESS: "0x0000000000000000000000000000000000000000",
  MAX_LOCKS_TO_LOAD_PER_CALL: 10,
  pangolin_router_address: "0xE54Ca86531e17Ef3616d22Ca28b0D458b6C89106",
  pancakeswap_router_address: "0x10ED43C718714eb63d5aA57B78B54704E256024E",

  compound_api_key: null,
  compound_network: "mainnet",

  api_baseurl: "https://app-tools-avax.dyp.finance",
  apieth_baseurl: "https://app-tools.dyp.finance",
  subgraph_url:
    "https://graphiql-avax.dyp.finance/subgraphs/name/dasconnor/pangolin-dex",
  subgrapheth_url:
    "https://graphiql.dyp.finance/subgraphs/name/davekaj/uniswap",
  subgraphGraphEth:
    "https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2",
  subgraphGraphAvax:
    "https://api.thegraph.com/subgraphs/name/dasconnor/pangolin-dex",
  indexing_status_endpoint: "https://graph-node-avax.dyp.finance/graphql",
  indexing_status_endpointeth: "https://graph-node.dyp.finance/graphql",

  farm_api: "https://farm-info.dyp.finance",

  metamask_message: "I want to login, let me in!",
  metamask_message2: "I want to login to ZIS TOOLS, let me in!",
  metamask_admin_account: "0x471ad9812b2537ffc66eba4d474cc55c32dec4f8",
  constant_stakingidypavax_3_address:
    "0xF035ec2562fbc4963e8c1c63f5c473D9696c59E3",
  constant_stakingavax_30_address: "0xF035ec2562fbc4963e8c1c63f5c473D9696c59E3",

  constant_stakingidypavax_4_address:
    "0xb1875eeBbcF4456188968f439896053809698a8B",

  constant_stakingidypavax_40_address:
    "0x6eb643813f0b4351b993f98bdeaef6e0f79573e9",

  constant_stakingidypavax_50_address:
    "0xdb2e1287aac9974ab28a66fabf9bcb34c5f37712",

  constant_stakingnew_newavax1_address:
    "0x1A4fd0E9046aeD92B6344F17B0a53969F4d5309B",
  constant_stakingnew_newavax2_address:
    "0x5566B51a1B7D5E6CAC57a68182C63Cb615cAf3f9",

  //Constant Staking iDYP AVAX
  constant_stakingidypavax_1_address:
    "0x8f28110325a727f70b64bffebf2b9dc94b932452",
  constant_stakingidypavax_2_address:
    "0x5536e02336771cfa0317d4b6a042f3c38749535e",
  constant_stakingidypavax_5_address:
    "0xaf411bf994da1435a3150b874395b86376c5f2d5",
  constant_stakingidypavax_6_address:
    "0xd13bdc0c9a9931cf959739631b1290b6bee0c018",
  constant_stakingidypavax_7_address:
    "0xe026fb242d9523dc8e8d8833f7309dbdbed59d3d",

  //Constant Staking iDYP bsc
  constant_stakingidyp_1_address: "0x58366902082b90fca01be07d929478bd48acfb19",
  constant_stakingidyp_2_address: "0x160ff3c4a6e9aa8e4271aa71226cc811bfef7ed9",
  constant_stakingidyp_5_address: "0x7e766f7005c7a9e74123b156697b582eecb8d2d7",
  constant_stakingidyp_6_address: "0x4c04e53f9aaa17fc2c914694b4aae57a9d1be445",
  constant_stakingidyp_7_address: "0x525cb0f6b5dae73965046bcb4c6f45ce74fb1b5d",

  submission_form_link: "https://forms.gle/SFX1DyUh8TcNeysz6",

  // lowercase base tokens on uniswap
  // order matters!
  base_tokens: [
    "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7", // wavax
    "0xd586e7f844cea2f87f50152665bcbc2c279d8d70", //dai.e
    "0xc7198437980c041c805a1edcba50c1ce5db95118", //usdt.e
  ],

  baseEth_tokens: [
    "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", // usdc
    "0xdac17f958d2ee523a2206206994597c13d831ec7", // usdt
    "0x6b175474e89094c44da98b954eedeac495271d0f", // dai
    "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", // weth
    "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599", // wbtc
  ],

  // add supported subscription tokens here, lowercase
  // THESE TOKENS MUST HAVE BEEN ALREADY ADDED TO SMART CONTRACT!
  subscription_tokens: {
    "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7": {
      symbol: "WAVAX",
      decimals: 18,
    },
    // "0x60781c2586d68229fde47564546784ab3faca982": {
    //   symbol: "PNG",
    //   decimals: 18,
    // },
    // "0x49d5c2bdffac6ce2bfdb6640f4f80f226bc10bab": {
    //   symbol: "WETH.e",
    //   decimals: 18,
    // },
    "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7": {
      symbol: "USDT",
      decimals: 6,
    },
    "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E": {
      symbol: "USDC",
      decimals: 6,
    },
  },

  // add supported subscription tokens here, lowercase
  // THESE TOKENS MUST HAVE BEEN ALREADY ADDED TO SMART CONTRACT!
  subscriptioneth_tokens: {
    "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2": {
      symbol: "WETH",
      decimals: 18,
    },
    // "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599": {
    //   symbol: "WBTC",
    //   decimals: 8,
    // },
    "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48": {
      symbol: "USDC",
      decimals: 6,
    },
    "0xdac17f958d2ee523a2206206994597c13d831ec7": {
      symbol: "USDT",
      decimals: 6,
    },
    // "0x6b175474e89094c44da98b954eedeac495271d0f": {
    //   symbol: "DAI",
    //   decimals: 18,
    // },
  },
  subscriptionbnb_tokens: {
    "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c": {
      symbol: "WBNB",
      decimals: 18,
    },
    // "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599": {
    //   symbol: "WBTC",
    //   decimals: 8,
    // },
    "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56": {
      symbol: "BUSD",
      decimals: 18,
    },
    "0x55d398326f99059fF775485246999027B3197955": {
      symbol: "USDT",
      decimals: 18,
    },
    // "0x6b175474e89094c44da98b954eedeac495271d0f": {
    //   symbol: "DAI",
    //   decimals: 18,
    // },
  },

  automated_trust_scores: {
    perfect_scoring: {
      // minimum numbers for 100% scores
      tx_no: 2000,
      lp_holder_no: 250,
      daily_volume_usd: 10000,
      liquidity_usd: 50000,
    },
    weights: {
      // sum of all weights must be 1, 1 = 100%
      tx_no: 0.1,
      lp_holder_no: 0.2,
      daily_volume_usd: 0.2,
      liquidity_usd: 0.2,
      information: 0.3,
    },
    display_order: [
      "information",
      "liquidity_usd",
      "daily_volume_usd",
      "lp_holder_no",
      "tx_no",
    ],
    display_names: {
      information: "Information",
      liquidity_usd: "Liquidity",
      daily_volume_usd: "Daily Volume",
      lp_holder_no: "LP Holders",
      tx_no: "Transactions",
    },
  },

  //governance eth
  new_governance_address: "0x1766d076ae227443B98AA836Bd43895ADd6B0AB4",

  //governance avax
  new_governanceavax_address: "0x4d3deb73df067d6466facad196b22411422909ab",
  new_governancebsc_address: "0x2cf8b55a6a492c2f8e750ad1fa4e4a858044deea",

  //bridge eth-avax

  token_dyp_eth_address: "0x961C8c0B1aaD0c0b10a51FeF6a867E3091BCef17",
  token_dyp_bsc_address: "0x961C8c0B1aaD0c0b10a51FeF6a867E3091BCef17",

  bridge_eth_address: "0xd374c29d98e9A33FA4D08fca1d72d7319EA4Bc58",
  bridge_bsc_address: "0x229eD0B61bEA41710A79A3634E06B1A619a0EBCb",

  //bridge eth-bsc

  token_dyp_bsceth_address: "0x961C8c0B1aaD0c0b10a51FeF6a867E3091BCef17",
  token_dyp_bscbsc_address: "0x961C8c0B1aaD0c0b10a51FeF6a867E3091BCef17",

  bridge_bsceth_address: "0x81A0d2f173590A23636DB6a475BC7E32aAae946C",
  bridge_bscbsc_address: "0x229eD0B61bEA41710A79A3634E06B1A619a0EBCb",

  //bridge bsc-avax

  token_dyp_bscavax_address: "0x961C8c0B1aaD0c0b10a51FeF6a867E3091BCef17",
  token_dyp_bscavaxbsc_address: "0x961C8c0B1aaD0c0b10a51FeF6a867E3091BCef17",

  bridge_bscavax_address: "0x4D960CDC46E8728eEb26af8105c277Ee5c3CC252",
  bridge_bscavaxbsc_address: "0xF237EA816b52572c4118c9D275b5807369E38d9F",

  //bridge eth-avax idyp
  token_idyp_eth_address: "0xBD100d061E120b2c67A24453CF6368E63f1Be056",
  token_idyp_bsc_address: "0xBD100d061E120b2c67A24453CF6368E63f1Be056",

  bridge_idypeth_address: "0x9D8a633cee6438004099478AF3120Aa7e506b774",
  bridge_idypbsc_address: "0x6e08239150D8E76920Cf5ffaa2293e89bE345CA9",

  //bridge eth-bsc idyp

  token_idyp_bsceth_address: "0xBD100d061E120b2c67A24453CF6368E63f1Be056",
  token_idyp_bscbsc_address: "0xBD100d061E120b2c67A24453CF6368E63f1Be056",

  bridge_idypbsceth_address: "0x70C89Bd30d8543a594f83C57ed92240a1B4925Fe",
  bridge_idypbscbsc_address: "0x66f8449b73C42Bb0820a8132348bfE2820Cfd6B8",

  chain_ids: {
    ETH: 1, // 4 = rinkeby, 1 = main, 42 = kovan, 43114 = AVAX
    AVAX: 43114, // 43114 = AVAX
    BSC: 56, // 97 = testnet, 56 = main
    1: "ETH",
    43114: "AVAX",
    56: "BSC",
  },

  SIGNATURE_API_URLAVAX: "https://bridge-avax.dyp.finance",
  SIGNATURE_API_URLBSC: "https://bridge-api.dyp.finance",
  SIGNATURE_API_URLNEW: "https://bridge-bsc.dyp.finance",

  SIGNATURE_API_URLAVAXiDYP: "https://ibridge-avax.dyp.finance",
  SIGNATURE_API_URLBSCiDYP: "https://ibridge-api.dyp.finance",

  /* MINT NFT Rinkeby */
  // nft_address: "0x3B7E527eFd16cC9E8bEF0F4d3BCD7cCDbb7d6EC4",
  // nftstaking_address: "0x971D729274fD5856E23A0DEB8C7ECB52A5ac6F8f",
  // nftstaking_address50: "0x971D729274fD5856E23A0DEB8C7ECB52A5ac6F8f",

  /* MINT NFT */
  nft_address: "0xd06cf9e1189feab09c844c597abc3767bc12608c",
  nftstaking_address: "0xEe425BbbEC5e9Bf4a59a1c19eFff522AD8b7A47A",
  nftstaking_address50: "0xEe425BbbEC5e9Bf4a59a1c19eFff522AD8b7A47A",

  /* MINT LANDNFT */
  landnft_address: "0xcd60d912655281908ee557ce1add61e983385a03",
  landnftstake_address: "0x6821710b0d6e9e10acfd8433ad023f874ed782f1",

  /* WOD CAWS NFT */
  wod_caws_address: "0xd324a03bf17eee8d34a8843d094a76ff8f561e38",

  //buyback bsc
  buyback_stakingbsc1_1_address: "0x94b1a7b57c441890b7a0f64291b39ad6f7e14804",
  buyback_stakingbsc1_2_address: "0x4ef782e66244a0cf002016aa1db3019448c670ae",

  constant_stakingnewbsc_new3_address:
    "0x9af074cE714FE1Eb32448052a38D274E93C5dc28",
  constant_stakingnewbsc_new4_address:
    "0xDBfb96e2899d52B469C1a1C35eD71fBBa228d2cC",

  reward_tokenbsc_address2: "0xbd100d061e120b2c67a24453cf6368e63f1be056",

  //farming bsc

  farming_activebsc_1_address: "0x5bC3a80A1F2C4fb693d9DddceBbB5A1b5BB15D65",
  farming_activeavax_1_address: "0x6eE20ebFa4A169B2cB03bEB41DA9351a4a879676",

  farming_newbsc_1_address: "0x537dc4fee298ea79a7f65676735415f1e2882f92",
  constant_stakingnewbsc_new5_address:
    "0xc794cdb8d6ac5eb42d5aba9c1e641ae17c239c8c",
  farming_newbsc_2_address: "0x219717bf0bc33b2764a6c1a772f75305458bda3d",
  constant_stakingnewbsc_new6_address:
    "0x23609b1f5274160564e4afc5eb9329a8bf81c744",

  farming_newbsc_3_address: "0xd1151a2434931f34bcfa6c27639b67c1a23d93af",
  constant_stakingnewbsc_new7_address:
    "0x264922696b9972687522b6e98bf78a0430e2163c",

  farming_newbsc_4_address: "0xed869ba773c3f1a1adcc87930ca36ee2dc73435d",
  constant_stakingnewbsc_new8_address:
    "0x9df0a645beb6f7adfadc56f3689e79405337efe2",

  farming_newbsc_5_address: "0x415b1624710296717fa96cad84f53454e8f02d18",
  constant_stakingnewbsc_new9_address:
    "0xbd574278febad04b7a0694c37def4f2ecfa9354a",

  //staking bsc

  constant_stakingbsc_new10_address:
    "0xef9e50A19358CCC8816d9BC2c2355aea596efd06",
  constant_stakingbsc_new11_address:
    "0xfc4493e85fd5424456f22135db6864dd4e4ed662",
  constant_stakingbsc_new111_address:
    "0x7c82513b69c1b42c23760cfc34234558119a3399",

  constant_stakingbsc_new12_address:
    "0xf13aDbEb27ea9d9469D95e925e56a1CF79c06E90",
  constant_stakingbsc_new13_address:
    "0xaF411BF994dA1435A3150B874395B86376C5f2d5",

  constant_stakingbsc_new14_address:
    "0xc03cd383bbbd78e54b8a0dc2ee4342e6d027a487",
};

window.infuraWeb3 = new Web3(window.config.infura_endpoint);
window.bscWeb3 = new Web3(window.config.bsc_endpoint);
window.avaxWeb3 = new Web3(window.config.avax_endpoint);
window.coinbase_address = "0x0000000000000000000000000000000000000111";

window.REWARD_TOKEN_ABI = window.TOKEN_ABI;
window.REWARD_TOKENAVAX_ABI = window.TOKENAVAX_ABI;
window.reward_token = new TOKEN("REWARD_TOKEN");
window.reward_tokenavax = new TOKENAVAX("REWARD_TOKENAVAX");
window.constant_stakingavax_30 = new TOKENAVAX("REWARD_TOKENAVAX");

window.farming_newavax_1 = new STAKINGAVAX("FARMING_NEWAVAX_1");
window.FARMING_NEWAVAX_1_ABI = window.FARMING_NEW_ABI;

window.farming_newavax_2 = new STAKINGAVAX("FARMING_NEWAVAX_2");
window.FARMING_NEWAVAX_2_ABI = window.FARMING_NEW_ABI;

window.farming_newavax_3 = new STAKINGAVAX("FARMING_NEWAVAX_3");
window.FARMING_NEWAVAX_3_ABI = window.FARMING_NEW_ABI;

window.farming_newavax_4 = new STAKINGAVAX("FARMING_NEWAVAX_4");
window.FARMING_NEWAVAX_4_ABI = window.FARMING_NEW_ABI;

window.farming_newavax_5 = new STAKINGAVAX("FARMING_NEWAVAX_5");
window.FARMING_NEWAVAX_5_ABI = window.FARMING_NEW_ABI;

window.FARMWETH_ABI = window.TOKEN_ABI;
window.TOKEN_NEW_ABI = window.TOKEN_ABI;
window.TOKEN_NEWAVAX_ABI = window.TOKEN_ABI;
window.TOKEN_NEWBSC_ABI = window.TOKENBSC_ABI;

window.farmweth = new TOKEN("FARMWETH");

//DYP-ETH
window.token = new TOKEN();
window.staking = new STAKING();

window.wethavax = new TOKENAVAX("WETHAVAX");
window.WETHAVAX_ABI = window.TOKEN_ABI;

window.wethbsc = new TOKENBSC("WETHBSC");
window.WETHBSC_ABI = window.TOKENBSC_ABI;

window.token_dyp_30 = new TOKEN("TOKEN_DYP30");
window.staking_dyp_30 = new STAKING("STAKING_DYP30", "TOKEN_DYP30");

window.token_dyp_60 = new TOKEN("TOKEN_DYP30");
window.staking_dyp_60 = new STAKING("STAKING_DYP60", "TOKEN_DYP60");

window.token_dyp_90 = new TOKEN("TOKEN_DYP90");
window.staking_dyp_90 = new STAKING("STAKING_DYP90", "TOKEN_DYP90");

//DYP-WBTC
window.token_wbtc_3 = new TOKEN("TOKEN_WBTC3");
window.staking_wbtc_3 = new STAKING("STAKING_WBTC3", "TOKEN_WBTC3");

window.token_wbtc_30 = new TOKEN("TOKEN_WBTC30");
window.staking_wbtc_30 = new STAKING("STAKING_WBTC30", "TOKEN_WBTC30");

window.token_wbtc_60 = new TOKEN("TOKEN_WBTC60");
window.staking_wbtc_60 = new STAKING("STAKING_WBTC60", "TOKEN_WBTC60");

window.token_wbtc_90 = new TOKEN("TOKEN_WBTC90");
window.staking_wbtc_90 = new STAKING("STAKING_WBTC90", "TOKEN_WBTC90");

window.farming_activebsc_1 = new STAKINGACTIVEBSC("FARMING_ACTIVEBSC_1");
window.farming_activeavax_1 = new STAKINGACTIVEAVAX("FARMING_ACTIVEAVAX_1");

window.farming_newbsc_1 = new STAKINGBSC("FARMING_NEWBSC_1");
window.farming_newbsc_2 = new STAKINGBSC("FARMING_NEWBSC_2");
window.farming_newbsc_3 = new STAKINGBSC("FARMING_NEWBSC_3");
window.farming_newbsc_4 = new STAKINGBSC("FARMING_NEWBSC_4");
window.farming_newbsc_5 = new STAKINGBSC("FARMING_NEWBSC_5");

window.FARMING_ACTIVEBSC_1_ABI = window.FARMING_ACTIVEBSC_ABI;
window.FARMING_ACTIVEAVAX_1_ABI = window.FARMING_ACTIVEAVAX_ABI;

window.FARMING_NEWBSC_1_ABI = window.FARMING_NEWBSC_ABI;
window.FARMING_NEWBSC_2_ABI = window.FARMING_NEWBSC_ABI;
window.FARMING_NEWBSC_3_ABI = window.FARMING_NEWBSC_ABI;
window.FARMING_NEWBSC_4_ABI = window.FARMING_NEWBSC_ABI;
window.FARMING_NEWBSC_5_ABI = window.FARMING_NEWBSC_ABI;

window.constant_stakingnewbsc_new5 = new CONSTANT_STAKINGBSC_NEW(
  "CONSTANT_STAKINGNEWBSC_NEW5"
);

window.constant_stakingnewbsc_new6 = new CONSTANT_STAKINGBSC_NEW(
  "CONSTANT_STAKINGNEWBSC_NEW6"
);

window.constant_stakingnewbsc_new7 = new CONSTANT_STAKINGBSC_NEW(
  "CONSTANT_STAKINGNEWBSC_NEW7"
);

window.constant_stakingnewbsc_new8 = new CONSTANT_STAKINGBSC_NEW(
  "CONSTANT_STAKINGNEWBSC_NEW8"
);

window.constant_stakingnewbsc_new9 = new CONSTANT_STAKINGBSC_NEW(
  "CONSTANT_STAKINGNEWBSC_NEW9"
);

window.CONSTANT_STAKINGNEWBSC_NEW5_ABI = window.CONSTANT_STAKINGBSC_NEW_ABI;
window.CONSTANT_STAKINGNEWBSC_NEW6_ABI = window.CONSTANT_STAKINGBSC_NEW_ABI;
window.CONSTANT_STAKINGNEWBSC_NEW7_ABI = window.CONSTANT_STAKINGBSC_NEW_ABI;
window.CONSTANT_STAKINGNEWBSC_NEW8_ABI = window.CONSTANT_STAKINGBSC_NEW_ABI;
window.CONSTANT_STAKINGNEWBSC_NEW9_ABI = window.CONSTANT_STAKINGBSC_NEW_ABI;

//staking bsc

window.constant_stakingbsc_new10 = new CONSTANT_STAKINGBSC_NEW(
  "CONSTANT_STAKINGBSC_NEW10"
);
window.constant_stakingbsc_new11 = new CONSTANT_STAKINGBSC_NEW(
  "CONSTANT_STAKINGBSC_NEW11"
);

window.constant_stakingbsc_new111 = new CONSTANT_STAKINGBSC_NEW(
  "CONSTANT_STAKINGBSC_NEW111"
);

window.constant_stakingbsc_new12 = new CONSTANT_STAKINGBSC_NEW(
  "CONSTANT_STAKINGBSC_NEW12"
);
window.constant_stakingbsc_new13 = new CONSTANT_STAKINGBSC_NEW(
  "CONSTANT_STAKINGBSC_NEW13"
);

window.constant_stakingbsc_new14 = new CONSTANT_STAKINGBSC_NEW(
  "CONSTANT_STAKINGBSC_NEW14"
);

window.CONSTANT_STAKINGBSC_NEW10_ABI = window.CONSTANT_STAKING_OLD_ABI;
window.CONSTANT_STAKINGBSC_NEW11_ABI = window.CONSTANT_STAKING_OLD_ABI;
window.CONSTANT_STAKINGBSC_NEW111_ABI = window.CONSTANT_STAKING_OLD_ABI;
window.CONSTANT_STAKINGBSC_NEW14_ABI = window.CONSTANT_STAKING_OLD_ABI;

window.CONSTANT_STAKINGBSC_NEW12_ABI = window.CONSTANT_STAKINGBSC_NEW_ABI;
window.CONSTANT_STAKINGBSC_NEW13_ABI = window.CONSTANT_STAKINGBSC_NEW_ABI;

window.CONSTANT_STAKINGOLD_130 = window.CONSTANT_STAKING_OLD_ABI;
window.CONSTANT_STAKINGOLD_140 = window.CONSTANT_STAKING_OLD_ABI;

//DYP-USDC
window.token_usdc_3 = new TOKEN("TOKEN_USDC3");
window.staking_usdc_3 = new STAKING("STAKING_USDC3", "TOKEN_USDC3");

window.token_usdc_30 = new TOKEN("TOKEN_USDC30");
window.staking_usdc_30 = new STAKING("STAKING_USDC30", "TOKEN_USDC30");

window.token_usdc_60 = new TOKEN("TOKEN_USDC60");
window.staking_usdc_60 = new STAKING("STAKING_USDC60", "TOKEN_USDC60");

window.token_usdc_90 = new TOKEN("TOKEN_USDC90");
window.staking_usdc_90 = new STAKING("STAKING_USDC90", "TOKEN_USDC90");

//DYP-USDT
window.token_usdt_3 = new TOKEN("TOKEN_USDT3");
window.staking_usdt_3 = new STAKING("STAKING_USDT3", "TOKEN_USDT3");

window.token_usdt_30 = new TOKEN("TOKEN_USDT30");
window.staking_usdt_30 = new STAKING("STAKING_USDT30", "TOKEN_USDT30");

window.token_usdt_60 = new TOKEN("TOKEN_USDT60");
window.staking_usdt_60 = new STAKING("STAKING_USDT60", "TOKEN_USDT60");

window.token_usdt_90 = new TOKEN("TOKEN_USDT90");
window.staking_usdt_90 = new STAKING("STAKING_USDT90", "TOKEN_USDT90");

window.token_dai = new TOKEN("TOKEN_DAI");
window.staking_dai = new STAKING("STAKING_DAI", "TOKEN_DAI");

// constant staking
window.constant_staking_30 = new CONSTANT_STAKING_OLD("CONSTANT_STAKINGOLD_30");
window.constant_staking_60 = new CONSTANT_STAKING_OLD("CONSTANT_STAKINGOLD_60");
window.constant_staking_90 = new CONSTANT_STAKING_OLD("CONSTANT_STAKINGOLD_90");
window.constant_staking_120 = new CONSTANT_STAKING_OLD(
  "CONSTANT_STAKINGOLD_120"
);

/*buyback*/
window.buyback_staking = new BUYBACK_STAKING("BUYBACK_STAKING");

window.REWARD_TOKEN_IDYP_ABI = window.TOKEN_ABI;
window.reward_token_idyp = new TOKEN("REWARD_TOKEN_IDYP");

window.REWARD_TOKEN_DYPS_ABI = window.TOKEN_ABI;
window.token_dyps = new TOKEN("REWARD_TOKEN_DYPS");
window.token_dypsavax = new TOKENAVAX("REWARD_TOKEN_DYPSAVAX");
window.REWARD_TOKEN_DYPSAVAX_ABI = window.TOKENAVAX_ABI;

window.token_dypsbsc = new TOKENAVAX("REWARD_TOKEN_DYPSBSC");
window.REWARD_TOKEN_DYPSBSC_ABI = window.TOKENBSC_ABI;

//constant staking for Buyback New
window.constant_stakingbsc_new3 = new CONSTANT_STAKING_NEW(
  "CONSTANT_STAKINGNEWBSC_NEW3"
);

window.constant_stakingbsc_new4 = new CONSTANT_STAKING_NEW(
  "CONSTANT_STAKINGNEWBSC_NEW4"
);

window.CONSTANT_STAKINGNEWBSC_NEW3_ABI = window.CONSTANT_STAKINGNEW_ABI;
window.CONSTANT_STAKINGNEWBSC_NEW4_ABI = window.CONSTANT_STAKINGNEW_ABI;

// window.token_dyps = new TOKEN(window.config.reward_token_dyps_address)
//constant staking NEW CONTRACTS
window.constant_staking_newavax1 = new CONSTANT_STAKING_NEWAVAX(
  "CONSTANT_STAKINGNEW_NEWAVAX1"
);
window.constant_staking_newavax2 = new CONSTANT_STAKING_NEWAVAX(
  "CONSTANT_STAKINGNEW_NEWAVAX2"
);
window.constant_stakingdaieth = new CONSTANT_STAKING_NEW(
  "CONSTANT_STAKINGDAIETH"
);

window.constant_stakingdaiavax = new CONSTANT_STAKING_NEWAVAX(
  "CONSTANT_STAKINGDAIAVAX"
);

window.CONSTANT_STAKINGDAIAVAX_ABI = window.CONSTANT_STAKING_IDYP_ABI;
window.CONSTANT_STAKINGDAIETH_ABI = window.CONSTANT_STAKINGDAI_ABI;

window.constant_stakingdaibsc = new CONSTANT_STAKINGBSC_NEW(
  "CONSTANT_STAKINGDAIBSC"
);

window.CONSTANT_STAKINGDAIBSC_ABI = window.CONSTANT_STAKING_DAI_ABI;

/* Constant Staking iDYP */
window.constant_stakingidyp_1 = new CONSTANT_STAKINGBSC_NEW(
  "CONSTANT_STAKINGIDYP_1"
);
window.constant_stakingidyp_2 = new CONSTANT_STAKINGBSC_NEW(
  "CONSTANT_STAKINGIDYP_2"
);
window.constant_stakingidyp_5 = new CONSTANT_STAKINGBSC_NEW(
  "CONSTANT_STAKINGIDYP_5"
);
window.constant_stakingidyp_6 = new CONSTANT_STAKINGBSC_NEW(
  "CONSTANT_STAKINGIDYP_6"
);

window.constant_stakingidyp_7 = new CONSTANT_STAKINGBSC_NEW(
  "CONSTANT_STAKINGIDYP_7"
);

window.CONSTANT_STAKINGIDYP_1_ABI = window.CONSTANT_STAKING_IDYP_ABI;
window.CONSTANT_STAKINGIDYP_2_ABI = window.CONSTANT_STAKING_IDYP_ABI;
window.CONSTANT_STAKINGIDYP_5_ABI = window.CONSTANT_STAKING_IDYP_ABI;
window.CONSTANT_STAKINGIDYP_6_ABI = window.CONSTANT_STAKING_IDYP_ABI;
window.CONSTANT_STAKINGIDYP_7_ABI = window.CONSTANT_STAKING_IDYP_ABI;

window.constant_staking_new1 = new CONSTANT_STAKING_NEW(
  "CONSTANT_STAKINGNEW_NEW1"
);
window.constant_staking_new2 = new CONSTANT_STAKING_NEW(
  "CONSTANT_STAKINGNEW_NEW2"
);

window.constant_staking_newi3 = new CONSTANT_STAKING_OLD(
  "CONSTANT_STAKING_NEWI3"
);
window.constant_staking_newdai = new CONSTANT_STAKING_NEW(
  "CONSTANT_STAKINGNEW_NEWDAI"
);

window.constant_staking_new10 = new CONSTANT_STAKING_NEWAVAX(
  "CONSTANT_STAKINGIDYPAVAX_3"
);
window.constant_staking_new11 = new CONSTANT_STAKING_NEWAVAX(
  "CONSTANT_STAKINGIDYPAVAX_4"
);

window.constant_staking_new12 = new CONSTANT_STAKING_NEWAVAX(
  "CONSTANT_STAKINGIDYPAVAX_40"
);

window.constant_staking_new13 = new CONSTANT_STAKING_NEWAVAX(
  "CONSTANT_STAKINGIDYPAVAX_50"
);

window.CONSTANT_STAKINGIDYPAVAX_3_ABI = window.CONSTANT_STAKING_IDYP_ABI;
window.CONSTANT_STAKINGIDYPAVAX_4_ABI = window.CONSTANT_STAKING_IDYP_ABI;
window.CONSTANT_STAKINGIDYPAVAX_40_ABI = window.CONSTANT_STAKING_IDYP_ABI;
window.CONSTANT_STAKINGIDYPAVAX_50_ABI = window.CONSTANT_STAKING_IDYP_ABI;

window.CONSTANT_STAKINGNEW_NEW1_ABI = window.CONSTANT_STAKINGNEW_ABI;
window.CONSTANT_STAKINGNEW_NEW2_ABI = window.CONSTANT_STAKINGNEW_ABI;
window.CONSTANT_STAKINGNEW_NEW3_ABI = window.CONSTANT_STAKINGNEW_ABI;
window.CONSTANT_STAKING_NEWI3 = window.CONSTANT_STAKING_OLD_ABI;

window.CONSTANT_STAKINGNEW_NEWAVAX1_ABI = window.CONSTANT_STAKINGNEW_ABI;
window.CONSTANT_STAKINGNEW_NEWAVAX2_ABI = window.CONSTANT_STAKINGNEW_ABI;

//Constant staking DYP -> DAI
window.REWARD_TOKEN_DAI_ABI = window.TOKEN_ABI;
window.reward_token_dai = new TOKEN("REWARD_TOKEN_DAI");

window.reward_token_daiavax = new TOKENAVAX("REWARD_TOKEN_DAIAVAX");
window.REWARD_TOKEN_DAIAVAX_ABI = window.TOKENAVAX_ABI;

window.reward_token_daieth = new TOKEN("REWARD_TOKEN_DAIETH");
window.REWARD_TOKEN_DAIETH_ABI = window.TOKEN_ABI;

window.reward_token_daibsc = new TOKENAVAX("REWARD_TOKEN_DAIBSC");
window.REWARD_TOKEN_DAIBSC_ABI = window.TOKENBSC_ABI;

window.constant_stakingdai = new CONSTANT_STAKING_NEW("CONSTANT_STAKINGDAI");

//Constant staking new for Buyback
window.buyback_staking1_1 = new BUYBACK_STAKING("BUYBACK_STAKING1_1");
window.buyback_staking1_2 = new BUYBACK_STAKING("BUYBACK_STAKING1_2");

window.buyback_stakingavax1_1 = new BUYBACK_STAKINGAVAX(
  "BUYBACK_STAKINGAVAX1_1"
);
window.buyback_stakingavax1_2 = new BUYBACK_STAKINGAVAX(
  "BUYBACK_STAKINGAVAX1_2"
);

window.constant_staking_new3 = new CONSTANT_STAKING_NEW(
  "CONSTANT_STAKINGNEW_NEW3"
);
window.constant_staking_new4 = new CONSTANT_STAKING_NEW(
  "CONSTANT_STAKINGNEW_NEW4"
);

window.constant_staking_newavax3 = new CONSTANT_STAKING_NEWAVAX(
  "CONSTANT_STAKINGNEW_NEWAVAX3"
);
window.constant_staking_newavax4 = new CONSTANT_STAKING_NEWAVAX(
  "CONSTANT_STAKINGNEW_NEWAVAX4"
);

window.CONSTANT_STAKINGNEW_NEWAVAX3_ABI = window.CONSTANT_STAKINGAVAX_ABI;
window.CONSTANT_STAKINGNEW_NEWAVAX4_ABI = window.CONSTANT_STAKINGAVAX_ABI;

/* Farming New */
window.token_new = new TOKEN("TOKEN_NEW");
window.token_newavax = new TOKENAVAX("TOKEN_NEWAVAX");
window.token_newbsc = new TOKENAVAX("TOKEN_NEWBSC");

window.farming_new_1 = new STAKING("FARMING_NEW_1");

window.constant_staking_new5 = new CONSTANT_STAKING_NEW(
  "CONSTANT_STAKINGNEW_NEW5"
);

window.farming_new_2 = new STAKING("FARMING_NEW_2");
window.constant_staking_new6 = new CONSTANT_STAKING_NEW(
  "CONSTANT_STAKINGNEW_NEW6"
);

window.constant_staking_newavax5 = new CONSTANT_STAKING_NEW(
  "CONSTANT_STAKINGNEW_NEWAVAX5"
);

window.constant_staking_newbscactive1 = new CONSTANT_STAKING_NEW(
  "CONSTANT_STAKINGNEW_NEWBSCACTIVE1"
);

window.constant_staking_newavaxactive1 = new CONSTANT_STAKING_NEW(
  "CONSTANT_STAKINGNEW_NEWAVAXACTIVE1"
);

window.constant_staking_newavax6 = new CONSTANT_STAKING_NEW(
  "CONSTANT_STAKINGNEW_NEWAVAX6"
);

window.constant_staking_newavax7 = new CONSTANT_STAKING_NEW(
  "CONSTANT_STAKINGNEW_NEWAVAX7"
);

window.constant_staking_newavax8 = new CONSTANT_STAKING_NEW(
  "CONSTANT_STAKINGNEW_NEWAVAX8"
);

window.constant_staking_newavax9 = new CONSTANT_STAKING_NEW(
  "CONSTANT_STAKINGNEW_NEWAVAX9"
);

window.farming_new_3 = new STAKING("FARMING_NEW_3");
window.constant_staking_new7 = new CONSTANT_STAKING_NEW(
  "CONSTANT_STAKINGNEW_NEW7"
);

window.farming_new_4 = new STAKING("FARMING_NEW_4");
window.constant_staking_new8 = new CONSTANT_STAKING_NEW(
  "CONSTANT_STAKINGNEW_NEW8"
);

window.farming_new_5 = new STAKING("FARMING_NEW_5");
window.constant_staking_new9 = new CONSTANT_STAKING_NEW(
  "CONSTANT_STAKINGNEW_NEW9"
);

/* VST */
window.constant_staking_200 = new CONSTANT_STAKING("CONSTANT_STAKING_200");
window.constant_staking_300 = new CONSTANT_STAKING("CONSTANT_STAKING_300");

/* Constant staking iDYP */
window.constant_staking_idyp_1 = new CONSTANT_STAKING_OLD(
  "CONSTANT_STAKINGOLD_130"
);
window.constant_staking_idyp_2 = new CONSTANT_STAKING_OLD(
  "CONSTANT_STAKINGOLD_140"
);
window.constant_staking_idyp_3 = new CONSTANT_STAKING_OLD(
  "CONSTANT_STAKINGOLD_150"
);
window.constant_staking_idyp_4 = new CONSTANT_STAKING_OLD(
  "CONSTANT_STAKINGOLD_160"
);

window.constant_staking_idyp_5 = new CONSTANT_STAKING_OLD(
  "CONSTANT_STAKINGOLD_170"
);

/* Constant Staking iDYP AVAX */
window.constant_staking_idypavax_1 = new CONSTANT_STAKING_NEWAVAX(
  "CONSTANT_STAKINGIDYPAVAX_1"
);
window.constant_staking_idypavax_2 = new CONSTANT_STAKING_NEWAVAX(
  "CONSTANT_STAKINGIDYPAVAX_2"
);
window.constant_staking_idypavax_5 = new CONSTANT_STAKING_NEWAVAX(
  "CONSTANT_STAKINGIDYPAVAX_5"
);

window.constant_staking_idypavax_6 = new CONSTANT_STAKING_NEWAVAX(
  "CONSTANT_STAKINGIDYPAVAX_6"
);

window.constant_staking_idypavax_7 = new CONSTANT_STAKING_NEWAVAX(
  "CONSTANT_STAKINGIDYPAVAX_7"
);

const checkapproveStakePool = async (useraddr, tokenaddr, stakingaddr) => {
  let token_contract = await getTokenContract(tokenaddr);

  return await token_contract.methods.allowance(useraddr, stakingaddr).call();
};

window.checkapproveStakePool = checkapproveStakePool;

//governance eth

class NEW_GOVERNANCE {
  constructor(ticker = "NEW_GOVERNANCE", token = "REWARD_TOKEN") {
    this.ticker = ticker;
    this.token = token;
    let address = window.config[ticker.toLowerCase() + "_address"];
    this._address = address;
    [
      "QUORUM",
      "MIN_BALANCE_TO_INIT_PROPOSAL",
      "VOTE_DURATION",
      "RESULT_EXECUTION_ALLOWANCE_PERIOD",
      "actions",
      "optionOneVotes",
      "optionTwoVotes",
      "stakingPools",
      "newGovernances",
      "proposalStartTime",
      "isProposalExecuted",
      "totalDepositedTokens",
      "votesForProposalByAddress",
      "votedForOption",
      "lastVotedProposalStartTime",
      "lastIndex",
      "getProposal",
      "isProposalOpen",
      "isProposalExecutible",
    ].forEach((fn_name) => {
      this[fn_name] = async function (...args) {
        let contract = await getContract({ key: this.ticker });
        return await contract.methods[fn_name](...args).call();
      };
    });

    [
      "proposeDisburseOrBurn",
      "proposeNewQuorum",
      "proposeNewMinBalanceToInitProposal",
      "proposeText",
      "proposeUpgradeGovernance",
      "addVotes",
      "removeVotes",
      "withdrawAllTokens",
      "executeProposal",
    ].forEach((fn_name) => {
      this[fn_name] = async function (...args) {
        let contract = await getContract({ key: this.ticker });
        let value = 0;
        console.log(value);
        let gas = window.config.default_gas_amount;
        try {
          let estimatedGas = await contract.methods[fn_name](
            ...args
          ).estimateGas({ gas });
          if (estimatedGas) {
            gas = Math.min(estimatedGas, gas);
            //console.log('estimatedgas'+gas)
          }
        } catch (e) {
          console.warn(e);
        }
        if (fn_name == "proposeText") {
          gas = undefined;
        }
        return await contract.methods[fn_name](...args).send({
          value,
          gas,
          from: await getCoinbase(),
          gasPrice: window.config.default_gasprice_gwei * 1e9,
        });
      };
    });
  }

  async addVotesOneClick(proposalId, option, amount) {
    let token_contract = await getContract({ key: this.token });
    let governance_contract = await getContract({ key: this.ticker });
    let batch = new window.web3.eth.BatchRequest();
    batch.add(
      token_contract.methods
        .approve(governance_contract._address, amount)
        .send.request({
          gas: window.config.default_gas_amount,
          from: await getCoinbase(),
          gasPrice: window.config.default_gasprice_gwei * 1e9,
        })
    );
    batch.add(
      governance_contract.methods
        .addVotes(proposalId, option, amount)
        .send.request({
          gas: window.config.default_gas_amount,
          from: await getCoinbase(),
          gasPrice: window.config.default_gasprice_gwei * 1e9,
        })
    );
    return batch.execute();
  }
}

window.new_governance = new NEW_GOVERNANCE();

//governance avax

class NEW_GOVERNANCEAVAX {
  constructor(ticker = "NEW_GOVERNANCEAVAX", token = "REWARD_TOKEN") {
    this.ticker = ticker;
    this.token = token;
    let address = window.config[ticker.toLowerCase() + "_address"];
    this._address = address;
    [
      "QUORUM",
      "MIN_BALANCE_TO_INIT_PROPOSAL",
      "VOTE_DURATION",
      "RESULT_EXECUTION_ALLOWANCE_PERIOD",
      "actions",
      "optionOneVotes",
      "optionTwoVotes",
      "stakingPools",
      "newGovernances",
      "proposalStartTime",
      "isProposalExecuted",
      "totalDepositedTokens",
      "votesForProposalByAddress",
      "votedForOption",
      "lastVotedProposalStartTime",
      "lastIndex",
      "getProposal",
      "isProposalOpen",
      "isProposalExecutible",
    ].forEach((fn_name) => {
      this[fn_name] = async function (...args) {
        let contract = await getContract({ key: this.ticker });
        return await contract.methods[fn_name](...args).call();
      };
    });

    [
      "proposeDisburseOrBurn",
      "proposeNewQuorum",
      "proposeNewMinBalanceToInitProposal",
      "proposeText",
      "proposeUpgradeGovernance",
      "addVotes",
      "removeVotes",
      "withdrawAllTokens",
      "executeProposal",
    ].forEach((fn_name) => {
      this[fn_name] = async function (...args) {
        let contract = await getContract({ key: this.ticker });
        let value = 0;
        console.log(value);
        let gas = window.config.default_gas_amount;
        try {
          let estimatedGas = await contract.methods[fn_name](
            ...args
          ).estimateGas({ gas });
          if (estimatedGas) {
            gas = Math.min(estimatedGas, gas);
            //console.log('estimatedgas'+gas)
          }
        } catch (e) {
          console.warn(e);
        }
        if (fn_name == "proposeText") {
          gas = undefined;
        }
        return await contract.methods[fn_name](...args).send({
          value,
          gas,
          from: await getCoinbase(),
          gasPrice: window.config.default_gasprice_gwei * 1e9,
        });
      };
    });
  }

  async addVotesOneClick(proposalId, option, amount) {
    let token_contract = await getContract({ key: this.token });
    let governance_contract = await getContract({ key: this.ticker });
    let batch = new window.web3.eth.BatchRequest();
    batch.add(
      token_contract.methods
        .approve(governance_contract._address, amount)
        .send.request({
          gas: window.config.default_gas_amount,
          from: await getCoinbase(),
          gasPrice: window.config.default_gasprice_gwei * 1e9,
        })
    );
    batch.add(
      governance_contract.methods
        .addVotes(proposalId, option, amount)
        .send.request({
          gas: window.config.default_gas_amount,
          from: await getCoinbase(),
          gasPrice: window.config.default_gasprice_gwei * 1e9,
        })
    );
    return batch.execute();
  }
}

window.new_governanceavax = new NEW_GOVERNANCEAVAX();

class NEW_GOVERNANCEBSC {
  constructor(ticker = "NEW_GOVERNANCEBSC", token = "REWARD_TOKEN") {
    this.ticker = ticker;
    this.token = token;
    let address = window.config[ticker.toLowerCase() + "_address"];
    this._address = address;
    [
      "QUORUM",
      "MIN_BALANCE_TO_INIT_PROPOSAL",
      "VOTE_DURATION",
      "RESULT_EXECUTION_ALLOWANCE_PERIOD",
      "actions",
      "optionOneVotes",
      "optionTwoVotes",
      "stakingPools",
      "newGovernances",
      "proposalStartTime",
      "isProposalExecuted",
      "totalDepositedTokens",
      "votesForProposalByAddress",
      "votedForOption",
      "lastVotedProposalStartTime",
      "lastIndex",
      "getProposal",
      "isProposalOpen",
      "isProposalExecutible",
    ].forEach((fn_name) => {
      this[fn_name] = async function (...args) {
        let contract = await getContract({ key: this.ticker });
        return await contract.methods[fn_name](...args).call();
      };
    });

    [
      "proposeDisburseOrBurn",
      "proposeNewQuorum",
      "proposeNewMinBalanceToInitProposal",
      "proposeText",
      "proposeUpgradeGovernance",
      "addVotes",
      "removeVotes",
      "withdrawAllTokens",
      "executeProposal",
    ].forEach((fn_name) => {
      this[fn_name] = async function (...args) {
        let contract = await getContract({ key: this.ticker });
        let value = 0;
        console.log(value);
        let gas = window.config.default_gas_amount;
        try {
          let estimatedGas = await contract.methods[fn_name](
            ...args
          ).estimateGas({ gas });
          if (estimatedGas) {
            gas = Math.min(estimatedGas, gas);
            //console.log('estimatedgas'+gas)
          }
        } catch (e) {
          console.warn(e);
        }
        if (fn_name == "proposeText") {
          gas = undefined;
        }
        return await contract.methods[fn_name](...args).send({
          value,
          gas,
          from: await getCoinbase(),
          gasPrice: window.config.default_gasprice_gwei * 1e9,
        });
      };
    });
  }

  async addVotesOneClick(proposalId, option, amount) {
    let token_contract = await getContract({ key: this.token });
    let governance_contract = await getContract({ key: this.ticker });
    let batch = new window.web3.eth.BatchRequest();
    batch.add(
      token_contract.methods
        .approve(governance_contract._address, amount)
        .send.request({
          gas: window.config.default_gas_amount,
          from: await getCoinbase(),
          gasPrice: window.config.default_gasprice_gwei * 1e9,
        })
    );
    batch.add(
      governance_contract.methods
        .addVotes(proposalId, option, amount)
        .send.request({
          gas: window.config.default_gas_amount,
          from: await getCoinbase(),
          gasPrice: window.config.default_gasprice_gwei * 1e9,
        })
    );
    return batch.execute();
  }
}

window.new_governancebsc = new NEW_GOVERNANCEBSC();

window.CONSTANT_STAKINGIDYPAVAX_1_ABI = window.CONSTANT_STAKING_IDYP_ABI;
window.CONSTANT_STAKINGIDYPAVAX_2_ABI = window.CONSTANT_STAKING_IDYP_ABI;
window.CONSTANT_STAKINGIDYPAVAX_5_ABI = window.CONSTANT_STAKING_IDYP_ABI;
window.CONSTANT_STAKINGIDYPAVAX_6_ABI = window.CONSTANT_STAKING_IDYP_ABI;
window.CONSTANT_STAKINGIDYPAVAX_7_ABI = window.CONSTANT_STAKING_IDYP_ABI;

function getBridgeContract(address) {
  return getContract({ address, ABI: window.BRIDGE_ABI });
}

class BRIDGE {
  constructor(bridgeAddress, tokenAddress) {
    this._address = bridgeAddress;
    this.tokenAddress = tokenAddress;

    ["deposit", "withdraw"].forEach((fn_name) => {
      this[fn_name] = async function (args, value = 0) {
        let contract = await getBridgeContract(bridgeAddress);
        return await contract.methods[fn_name](...args).send({
          value,
          from: await getCoinbase(),
        });
      };
    });
  }

  approveToken = async (amount) => {
    let token_contract = await getTokenContract(this.tokenAddress);
    return await token_contract.methods
      .approve(this._address, amount)
      .send({ value, from: await getCoinbase() });
  };
}

/**
 *
 * @param {"TOKEN" | "STAKING" | "NFTSTAKING" | "NFTSTAKING50" } key
 */
async function getContractNFT(key) {
  let ABI = window[key + "_ABI"];
  let address = window.config[key.toLowerCase() + "_address"];
  if (!window.cached_contracts[key]) {
    window.web3 = new Web3(window.ethereum);
    window.cached_contracts[key] = new window.web3.eth.Contract(
      key === "NFTSTAKING50" ? window.NFTSTAKING_ABI : ABI,
      // key === "NFTSTAKING"
      //     ? "0xEe425BbbEC5e9Bf4a59a1c19eFff522AD8b7A47A"
      //     : key === 'NFTSTAKING50' ? '0xEe425BbbEC5e9Bf4a59a1c19eFff522AD8b7A47A'
      //     : address,
      key === "NFTSTAKING"
        ? "0xEe425BbbEC5e9Bf4a59a1c19eFff522AD8b7A47A"
        : key === "NFTSTAKING50"
        ? "0xEe425BbbEC5e9Bf4a59a1c19eFff522AD8b7A47A"
        : address,
      {
        from: await getCoinbase(),
      }
    );
  }

  return window.cached_contracts[key];
}

class NFT {
  constructor(key = "NFT") {
    this.key = key;
    [
      "MAX_CAWS",
      "balanceOf",
      "baseURI",
      "cawsPrice",
      "maxCawsPurchase",
      "ownerOf",
    ].forEach((fn_name) => {
      this[fn_name] = async function (...args) {
        let contract = await getContractNFT(this.key);
        return await contract.methods[fn_name](...args).call();
      };
    });

    ["mintCaws"].forEach((fn_name) => {
      this[fn_name] = async function (...args) {
        let contract = await getContractNFT(this.key);
        return await contract.methods[fn_name](...args).send({
          from: await getCoinbase(),
        });
      };
    });
  }

  async mintNFT(amount) {
    let nft_contract = await getContractNFT("NFT");
    let priceCaws = await nft_contract.methods.cawsPrice().call();
    let value = new BigNumber(priceCaws).times(amount);

    let second = nft_contract.methods
      .mintCaws(amount)
      .send({ value, from: await getCoinbase() });
    // batch.execute()
    let result = await second;
    let sizeResult = Object.keys(result.events["Transfer"]).length;
    if (result.events["Transfer"].blockNumber > 0) sizeResult = 101;
    if (result.status == true) {
      let nftId = 0;
      if (sizeResult != 101) {
        nftId = window.web3.utils
          .toBN(result.events["Transfer"][sizeResult - 1].raw.topics[3])
          .toString(10);
      } else {
        nftId = window.web3.utils
          .toBN(result.events["Transfer"].raw.topics[3])
          .toString(10);
      }
      return nftId;
    } else {
      throw new Error("Minting failed!");
    }
  }

  async approveStake(addr) {
    let nft_contract = await getContractNFT("NFT");
    let staking_addr = addr;
    return await nft_contract.methods
      .setApprovalForAll(staking_addr, true)
      .send();
  }

  async checkapproveStake(useraddr, addr) {
    let nft_contract = await getContractNFT("NFT");

    return await nft_contract.methods.isApprovedForAll(useraddr, addr).call();
  }

  async depositStake() {
    let nft_contract = await getContractNFT("NFT");

    return await nft_contract.methods.deposit([]).send();
  }

  async checkLockoutTime() {
    let nft_contract = await getContractNFT("NFTSTAKING");
    const time = await nft_contract.methods.LOCKUP_TIME().call();
    return time;
  }

  async checkLockoutTime50() {
    let nft_contract = await getContractNFT("NFTSTAKING50");
    const time = await nft_contract.methods.LOCKUP_TIME().call();
    return time;
  }
}

window.nft = new NFT();

/**
 *
 * @param {"TOKEN" | "LANDNFTSTAKE" } key
 */
async function getContractLandNFT(key) {
  let ABI = window[key + "_ABI"];
  let address = window.config[key.toLowerCase() + "_address"];
  if (!window.cached_contracts[key]) {
    window.web3 = new Web3(window.ethereum);
    window.cached_contracts[key] = new window.web3.eth.Contract(
      key === "LANDNFTSTAKE"
        ? window.LANDMINTING_ABI
        : key === "LANDNFTSTAKING"
        ? window.LANDSTAKING_ABI
        : ABI,

      key === "LANDNFTSTAKE"
        ? "0xcd60d912655281908ee557ce1add61e983385a03"
        : key === "LANDNFTSTAKING"
        ? "0x6821710b0d6e9e10acfd8433ad023f874ed782f1"
        : address,
      {
        from: await getCoinbase(),
      }
    );
  }

  return window.cached_contracts[key];
}

class LANDNFT {
  constructor(key = "LANDNFTSTAKE") {
    this.key = key;
    [
      "MAX_MINT",
      "balanceOf",
      "baseURI",
      "landPrice",
      "maxLandPurchase",
      "ownerOf",
    ].forEach((fn_name) => {
      this[fn_name] = async function (...args) {
        let contract = await getContractLandNFT(this.key);
        return await contract.methods[fn_name](...args).call();
      };
    });

    ["mintWodGenesis"].forEach((fn_name) => {
      this[fn_name] = async function (...args) {
        let contract = await getContractLandNFT(this.key);
        return await contract.methods[fn_name](...args).send({
          from: await getCoinbase(),
        });
      };
    });
  }

  async mintNFT(amount, cawsArray) {
    const nft_contract = await getContractLandNFT("LANDNFTSTAKE");
    let countDiscount = cawsArray.length;

    let newPrice = 0;
    let landnft = await nft_contract.methods.landPrice().call();
    const landPriceDiscount = await nft_contract.methods
      .LandPriceDiscount()
      .call();

    if (countDiscount != 0) {
      newPrice =
        (landPriceDiscount * countDiscount +
          landnft * (amount - countDiscount)) /
        1e18;
    } else newPrice = (landnft * amount) / 1e18;

    const value = newPrice * 1e18;
    console.log(cawsArray, newPrice);
    let second = nft_contract.methods
      .mintWodGenesis(amount, cawsArray)
      .send({ value, from: await getCoinbase() });
    // batch.execute()
    let result = await second;
    let sizeResult = Object.keys(result.events["Transfer"]).length;
    if (result.events["Transfer"].blockNumber > 0) sizeResult = 101;
    if (result.status == true) {
      let nftId = 0;
      if (sizeResult != 101) {
        nftId = window.web3.utils
          .toBN(result.events["Transfer"][sizeResult - 1].raw.topics[3])
          .toString(10);
      } else {
        nftId = window.web3.utils
          .toBN(result.events["Transfer"].raw.topics[3])
          .toString(10);
      }
      return nftId;
    } else {
      throw new Error("Minting failed!");
    }
  }

  async approveStake(addr) {
    let nft_contract = await getContractLandNFT("LANDNFTSTAKE");
    return await nft_contract.methods.setApprovalForAll(addr, true).send();
  }

  async checkapproveStake(useraddr, addr) {
    let nft_contract = await getContractLandNFT("LANDNFTSTAKE");
    return await nft_contract.methods.isApprovedForAll(useraddr, addr).call();
  }

  async depositStake() {
    let nft_contract = await getContractLandNFT("LANDNFTSTAKING");
    return await nft_contract.methods.deposit([]).send();
  }

  async checkLockoutTime() {
    let nft_contract = await getContractLandNFT("LANDNFTSTAKING");
    const time = await nft_contract.methods.LOCKUP_TIME().call();
    return time;
  }
}

/**
 *
 * @param {"TOKEN" | "WOD_CAWS" } key
 */
async function getContractWodCawsNFT(key) {
  let ABI = window[key + "_ABI"];
  let address = window.config[key.toLowerCase() + "_address"];
  if (!window.cached_contracts[key]) {
    window.web3 = new Web3(window.ethereum);
    window.cached_contracts[key] = new window.web3.eth.Contract(
      window.WOD_CAWS_ABI,
      address,
      {
        from: await getCoinbase(),
      }
    );
  }

  return window.cached_contracts[key];
}

class WOD_CAWS {
  constructor(key = "WOD_CAWS") {
    this.key = key;
    [
      "LOCKUP_TIME",
      "WoDcontractaddress",
      "calculateReward",
      "calculateRewards",
      "depositsOf",
      "depositsOfWoD",
      "erc20Address",
      "expiration",
      "onERC721Received",
      "owner",
      "paused",
      "rate",
      "stakingDestinationAddress",
      "stakingTime",
    ].forEach((fn_name) => {
      this[fn_name] = async function (...args) {
        let contract = await getContractWodCawsNFT(this.key);
        return await contract.methods[fn_name](...args).call();
      };
    });

    ["deposit"].forEach((fn_name) => {
      this[fn_name] = async function (...args) {
        let contract = await getContractWodCawsNFT(this.key);
        return await contract.methods[fn_name](...args).send({
          from: await getCoinbase(),
        });
      };
    });

    ["claimRewards"].forEach((fn_name) => {
      this[fn_name] = async function (...args) {
        let contract = await getContractWodCawsNFT(this.key);
        return await contract.methods[fn_name](...args).send({
          from: await getCoinbase(),
        });
      };
    });

    ["withdraw"].forEach((fn_name) => {
      this[fn_name] = async function (...args) {
        let contract = await getContractWodCawsNFT(this.key);
        return await contract.methods[fn_name](...args).send({
          from: await getCoinbase(),
        });
      };
    });

    ["withdrawTokens"].forEach((fn_name) => {
      this[fn_name] = async function (...args) {
        let contract = await getContractWodCawsNFT(this.key);
        return await contract.methods[fn_name](...args).send({
          from: await getCoinbase(),
        });
      };
    });
  }

  async depositWodCaws(cawsArray, landArray) {
    const nft_contract = await getContractWodCawsNFT("WOD_CAWS");
    let second = await nft_contract.methods.deposit(cawsArray, landArray).send({
      from: await getCoinbase(),
    });
  }

  async claimRewardsWodCaws(cawsArray) {
    let nft_contract = await getContractWodCawsNFT("WOD_CAWS");
    return await nft_contract.methods
      .claimRewards(cawsArray)
      .send({ from: await getCoinbase() });
  }

  async withdrawWodCaws(cawsArray, landArray) {
    let nft_contract = await getContractWodCawsNFT("WOD_CAWS");
    return await nft_contract.methods
      .withdraw(cawsArray, landArray)
      .send({ from: await getCoinbase() });
  }

  async calculateRewardWodCaws(address, tokenId) {
    let nft_contract = await getContractWodCawsNFT("WOD_CAWS");
    return await nft_contract.methods.calculateReward(address, tokenId).call();
  }

  async calculateRewardsWodCaws(address, tokenArray) {
    let nft_contract = await getContractWodCawsNFT("WOD_CAWS");
    return await nft_contract.methods
      .calculateRewards(address, tokenArray)
      .call();
  }

  async depositsOfCaws(address) {
    let nft_contract = await getContractWodCawsNFT("WOD_CAWS");
    return await nft_contract.methods.depositsOf(address).call();
  }

  async depositsOfWod(address) {
    let nft_contract = await getContractWodCawsNFT("WOD_CAWS");
    return await nft_contract.methods.depositsOfWoD(address).call();
  }

  async checkLockupTimeWodCaws() {
    let nft_contract = await getContractWodCawsNFT("WOD_CAWS");
    const time = await nft_contract.methods.LOCKUP_TIME().call();

    return time;
  }

  async checkStakingTimeWodCaws(address) {
    let nft_contract = await getContractWodCawsNFT("WOD_CAWS");
    const stakingTime = await nft_contract.methods.stakingTime(address).call();

    return stakingTime;
  }
}

window.wod_caws = new WOD_CAWS();

window.landnft = new LANDNFT();

window.token_dyps = new TOKEN("REWARD_TOKEN_DYPS");

window.token_dyp_eth = new TOKEN("TOKEN_DYP_ETH");
window.token_dyp_bsc = new TOKEN("TOKEN_DYP_BSC");

window.bridge_eth = new BRIDGE(
  window.config.bridge_eth_address,
  window.config.token_dyp_eth_address
);
window.bridge_bsc = new BRIDGE(
  window.config.bridge_bsc_address,
  window.config.token_dyp_bsc_address
);

//bridge eth-bsc
window.bridge_bsceth = new BRIDGE(
  window.config.bridge_bsceth_address,
  window.config.token_dyp_bsceth_address
);
window.bridge_bscbsc = new BRIDGE(
  window.config.bridge_bscbsc_address,
  window.config.token_dyp_bscbsc_address
);

//bridge bsc-avax
window.bridge_bscavaxbsc = new BRIDGE(
  window.config.bridge_bscavaxbsc_address,
  window.config.token_dyp_bscavaxbsc_address
);
window.bridge_bscavax = new BRIDGE(
  window.config.bridge_bscavax_address,
  window.config.token_dyp_bscavax_address
);

window.token_dyp_bscavaxbsc = new TOKEN("TOKEN_DYP_BSCAVAXBSC");
window.token_dyp_bscavax = new TOKEN("TOKEN_DYP_BSCAVAX");

window.token_dyp_bsceth = new TOKEN("TOKEN_DYP_BSCETH");
window.token_dyp_bscbsc = new TOKEN("TOKEN_DYP_BSCBSC");

//bridge eth-avax idyp
window.token_idyp_eth = new TOKEN("TOKEN_IDYP_ETH");
window.token_idyp_bsc = new TOKEN("TOKEN_IDYP_BSC");

window.bridge_idypeth = new BRIDGE(
  window.config.bridge_idypeth_address,
  window.config.token_idyp_eth_address
);
window.bridge_idypbsc = new BRIDGE(
  window.config.bridge_idypbsc_address,
  window.config.token_idyp_bsc_address
);

//bridge eth-bsc idyp
window.token_idyp_bsceth = new TOKEN("TOKEN_IDYP_BSCETH");
window.token_idyp_bscbsc = new TOKEN("TOKEN_IDYP_BSCBSC");

window.bridge_idypbsceth = new BRIDGE(
  window.config.bridge_idypbsceth_address,
  window.config.token_idyp_bsceth_address
);
window.bridge_idypbscbsc = new BRIDGE(
  window.config.bridge_idypbscbsc_address,
  window.config.token_idyp_bscbsc_address
);

window.buyback_stakingbsc1_1 = new BUYBACK_STAKINGBSC("BUYBACK_STAKINGBSC1_1");
window.buyback_stakingbsc1_2 = new BUYBACK_STAKINGBSC("BUYBACK_STAKINGBSC1_2");

window.BUYBACK_STAKINGBSC1_1_ABI = window.BUYBACK_STAKINGBSC1_1_ABI;
window.BUYBACK_STAKINGBSC1_1_ABI = window.BUYBACK_STAKINGBSC1_2_ABI;

async function getTokenHolderBalanceAll(holder, token_address, network) {
  if (network == 1) {
    let tokenContract = new window.infuraWeb3.eth.Contract(
      window.TOKEN_ABI,
      token_address,
      { from: undefined }
    );
    return await tokenContract.methods.balanceOf(holder).call();
  }
  if (network == 2) {
    let tokenContract = new window.avaxWeb3.eth.Contract(
      window.TOKEN_ABI,
      token_address,
      { from: undefined }
    );
    return await tokenContract.methods.balanceOf(holder).call();
  }

  if (network == 3) {
    let tokenContract = new window.bscWeb3.eth.Contract(
      window.TOKEN_ABI,
      token_address,
      { from: undefined }
    );
    return await tokenContract.methods.balanceOf(holder).call();
  }
  return 0;
}

window.getTokenHolderBalanceAll = getTokenHolderBalanceAll;

//mint

async function latestMint() {
  return await window.$.get("https://mint.dyp.finance/api/v1/latest/mint").then(
    (result) => {
      return parseInt(result.total);
    }
  );
}

function range(start, end, step = 1) {
  const len = Math.floor((end - start) / step) + 1;
  return Array(len)
    .fill()
    .map((_, idx) => start + idx * step);
}

async function getNft(id) {
  return await window.$.get(`https://mint.dyp.finance/metadata/${id}`).then(
    (result) => {
      return result;
    }
  );
}

async function getLandNft(id) {
  return await window.$.get(
    `https://mint.worldofdypians.com/metadata/${id}`
  ).then((result) => {
    return result;
  });
}

async function myNftLandListContract(address) {
  let nft_contract = await getContractLandNFT("LANDNFTSTAKE");

  let getBalanceOf = await nft_contract.methods.balanceOf(address).call();

  let nftList = [];

  for (let i = 0; i < getBalanceOf; i++)
    nftList.push(
      await nft_contract.methods.tokenOfOwnerByIndex(address, i).call()
    );

  return nftList;
}

async function myNftListContract(address) {
  let nft_contract = await getContractNFT("NFT");

  let getBalanceOf = await nft_contract.methods.balanceOf(address).call();

  let nftList = [];

  for (let i = 0; i < getBalanceOf; i++)
    nftList.push(
      await nft_contract.methods.tokenOfOwnerByIndex(address, i).call()
    );

  return nftList;
}

async function myNftList(address) {
  return await window.$.get(
    `https://mint.dyp.finance/api/v1/my/${address}`
  ).then((result) => {
    return result;
  });
}

// window.config_eth = {
// 	weth_address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // LOWERCASE!
// 	platform_token_address: '0x961c8c0b1aad0c0b10a51fef6a867e3091bcef17',
// 	locker_address: '0x0c5d9AA95329517918AA7b82BfDa25d60446E1ac',
//
// 	subscription_address: '0x943023d8e0f591C08a0E2B922452a7Dc37173C9b',
// 	ZERO_ADDRESS: '0x0000000000000000000000000000000000000000',
// 	MAX_LOCKS_TO_LOAD_PER_CALL: 10,
//
// 	api_baseurl: 'https://app-tools.dyp.finance',
// 	subgraph_url: 'https://graphiql.dyp.finance/subgraphs/name/davekaj/uniswap',
// 	indexing_status_endpoint: 'https://graph-node.dyp.finance/graphql',
// 	farm_api: 'https://farm-info.dyp.finance',
//
// 	metamask_message: "I want to login, let me in!",
// 	metamask_admin_account: "0x471AD9812B2537Ffc66EbA4d474cC55c32DEc4F8",
//
// 	submission_form_link: 'https://docs.google.com/forms/d/e/1FAIpQLSdstsJBKnWuxCt9uqd2saC7AaRVSpuPtPdoTRmqdzpSdk14HA/viewform?usp=pp_url',
//
// 	// lowercase base tokens on uniswap
// 	// order matters!
// 	base_tokens: [
// 		'0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // usdc
// 		'0xdac17f958d2ee523a2206206994597c13d831ec7', // usdt
// 		'0x6b175474e89094c44da98b954eedeac495271d0f', // dai
// 		'0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // weth
// 		'0x2260fac5e5542a773aa44fbcfedf7c193bc2c599' // wbtc
// 	],
//
// 	// add supported subscription tokens here, lowercase
// 	// THESE TOKENS MUST HAVE BEEN ALREADY ADDED TO SMART CONTRACT!
// 	subscription_tokens: {
// 		'0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': {
// 			symbol: 'WETH', decimals: 18
// 		},
// 		'0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': {
// 			symbol: 'WBTC', decimals: 8
// 		},
// 		'0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': {
// 			symbol: 'USDC', decimals: 6
// 		},
// 		'0xdac17f958d2ee523a2206206994597c13d831ec7': {
// 			symbol: 'USDT', decimals: 6
// 		},
// 		'0x6b175474e89094c44da98b954eedeac495271d0f': {
// 			symbol: 'DAI', decimals: 18
// 		}
// 	},
//
// 	automated_trust_scores: {
// 		perfect_scoring: { // minimum numbers for 100% scores
// 			tx_no: 2000,
// 			lp_holder_no: 250,
// 			daily_volume_usd: 10000,
// 			liquidity_usd: 1000000
// 		},
// 		weights: { // sum of all weights must be 1, 1 = 100%
// 			tx_no: .1,
// 			lp_holder_no: .2,
// 			daily_volume_usd: .2,
// 			liquidity_usd: .2,
// 			information: .3
// 		},
// 		display_order: [
// 			"information",
// 			"liquidity_usd",
// 			"daily_volume_usd",
// 			"lp_holder_no",
// 			"tx_no",
// 		],
// 		display_names: {
// 			"information": "Information",
// 			"liquidity_usd": "Liquidity (Pool)",
// 			"daily_volume_usd": "Daily Volume USD",
// 			"lp_holder_no": "LP Holders",
// 			"tx_no": "Transactions",
// 		}
// 	}
// }

// lowercase coingecko IDs by contract address for basetokens
window.tokenCG = {
  "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984": "uniswap",
  "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": "usd-coin",
};

//window.UNISWAP_PAIR_ABI = [{"inputs":[],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"spender","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"sender","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount0","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount1","type":"uint256"},{"indexed":true,"internalType":"address","name":"to","type":"address"}],"name":"Burn","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"sender","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount0","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount1","type":"uint256"}],"name":"Mint","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"sender","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount0In","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount1In","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount0Out","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount1Out","type":"uint256"},{"indexed":true,"internalType":"address","name":"to","type":"address"}],"name":"Swap","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint112","name":"reserve0","type":"uint112"},{"indexed":false,"internalType":"uint112","name":"reserve1","type":"uint112"}],"name":"Sync","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Transfer","type":"event"},{"constant":true,"inputs":[],"name":"DOMAIN_SEPARATOR","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"MINIMUM_LIQUIDITY","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"PERMIT_TYPEHASH","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"to","type":"address"}],"name":"burn","outputs":[{"internalType":"uint256","name":"amount0","type":"uint256"},{"internalType":"uint256","name":"amount1","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"factory","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"getReserves","outputs":[{"internalType":"uint112","name":"_reserve0","type":"uint112"},{"internalType":"uint112","name":"_reserve1","type":"uint112"},{"internalType":"uint32","name":"_blockTimestampLast","type":"uint32"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"_token0","type":"address"},{"internalType":"address","name":"_token1","type":"address"}],"name":"initialize","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"kLast","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"to","type":"address"}],"name":"mint","outputs":[{"internalType":"uint256","name":"liquidity","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"nonces","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"permit","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"price0CumulativeLast","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"price1CumulativeLast","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"to","type":"address"}],"name":"skim","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"uint256","name":"amount0Out","type":"uint256"},{"internalType":"uint256","name":"amount1Out","type":"uint256"},{"internalType":"address","name":"to","type":"address"},{"internalType":"bytes","name":"data","type":"bytes"}],"name":"swap","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"sync","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"token0","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"token1","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"transferFrom","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"}]
//window.LOCKER_ABI = [{"inputs":[],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"id","type":"uint256"},{"indexed":true,"internalType":"address","name":"token","type":"address"},{"indexed":true,"internalType":"address","name":"recipient","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"unlockTimestamp","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"platformTokensLocked","type":"uint256"},{"indexed":false,"internalType":"bool","name":"claimed","type":"bool"}],"name":"Locked","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"id","type":"uint256"},{"indexed":true,"internalType":"address","name":"token","type":"address"},{"indexed":true,"internalType":"address","name":"recipient","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"unlockTimestamp","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"platformTokensLocked","type":"uint256"},{"indexed":false,"internalType":"bool","name":"claimed","type":"bool"}],"name":"Unlocked","type":"event"},{"inputs":[],"name":"MAX_LOCK_DURATION","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"MINIMUM_BASETOKEN_PERCENT_ETH_X_100","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"ONE_HUNDRED_X_100","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"PLATFORM_TOKEN","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"SLIPPAGE_TOLERANCE_X_100","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"baseToken","type":"address"}],"name":"addBaseToken","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"claimEther","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"}],"name":"claimExtraTokens","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"lockId","type":"uint256"}],"name":"claimUnlocked","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"pair","type":"address"},{"internalType":"address","name":"baseToken","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256","name":"unlockTimestamp","type":"uint256"}],"name":"createLock","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"startIndex","type":"uint256"},{"internalType":"uint256","name":"endIndex","type":"uint256"}],"name":"getActiveLockIds","outputs":[{"internalType":"uint256[]","name":"result","type":"uint256[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"startIndex","type":"uint256"},{"internalType":"uint256","name":"endIndex","type":"uint256"}],"name":"getActiveLockIdsByRecipient","outputs":[{"internalType":"uint256[]","name":"result","type":"uint256[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"startIndex","type":"uint256"},{"internalType":"uint256","name":"endIndex","type":"uint256"}],"name":"getActiveLockIdsByToken","outputs":[{"internalType":"uint256[]","name":"result","type":"uint256[]"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getActiveLockIdsLength","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"recipient","type":"address"}],"name":"getActiveLockIdsLengthByRecipient","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"}],"name":"getActiveLockIdsLengthByToken","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"startIndex","type":"uint256"},{"internalType":"uint256","name":"endIndex","type":"uint256"}],"name":"getBaseTokens","outputs":[{"internalType":"address[]","name":"result","type":"address[]"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getBaseTokensLength","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"startIndex","type":"uint256"},{"internalType":"uint256","name":"endIndex","type":"uint256"}],"name":"getInactiveLockIds","outputs":[{"internalType":"uint256[]","name":"result","type":"uint256[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"startIndex","type":"uint256"},{"internalType":"uint256","name":"endIndex","type":"uint256"}],"name":"getInactiveLockIdsByRecipient","outputs":[{"internalType":"uint256[]","name":"result","type":"uint256[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"startIndex","type":"uint256"},{"internalType":"uint256","name":"endIndex","type":"uint256"}],"name":"getInactiveLockIdsByToken","outputs":[{"internalType":"uint256[]","name":"result","type":"uint256[]"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getInactiveLockIdsLength","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"recipient","type":"address"}],"name":"getInactiveLockIdsLengthByRecipient","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"}],"name":"getInactiveLockIdsLengthByToken","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"id","type":"uint256"}],"name":"getLockById","outputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"unlockTimestamp","type":"uint256"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"bool","name":"claimed","type":"bool"},{"internalType":"uint256","name":"platformTokensLocked","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"startIndex","type":"uint256"},{"internalType":"uint256","name":"endIndex","type":"uint256"}],"name":"getLockedTokens","outputs":[{"internalType":"address[]","name":"tokens","type":"address[]"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getLockedTokensLength","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256[]","name":"ids","type":"uint256[]"}],"name":"getLocksByIds","outputs":[{"internalType":"uint256[]","name":"_ids","type":"uint256[]"},{"internalType":"address[]","name":"tokens","type":"address[]"},{"internalType":"uint256[]","name":"unlockTimestamps","type":"uint256[]"},{"internalType":"uint256[]","name":"amounts","type":"uint256[]"},{"internalType":"address[]","name":"recipients","type":"address[]"},{"internalType":"bool[]","name":"claimeds","type":"bool[]"},{"internalType":"uint256[]","name":"platformTokensLockeds","type":"uint256[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"pair","type":"address"},{"internalType":"address","name":"baseToken","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"getMinLockCreationFeeInWei","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address[]","name":"tokens","type":"address[]"}],"name":"getTokensBalances","outputs":[{"internalType":"uint256[]","name":"balances","type":"uint256[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"locks","outputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"unlockTimestamp","type":"uint256"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"bool","name":"claimed","type":"bool"},{"internalType":"uint256","name":"platformTokensLocked","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"locksLength","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"baseToken","type":"address"}],"name":"removeBaseToken","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"renounceOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"tokenBalances","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"uniswapRouterV2","outputs":[{"internalType":"contract IUniswapV2Router02","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"stateMutability":"payable","type":"receive"}]

window.PAIR_ABI = [
  {
    inputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "Approval",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount0",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount1",
        type: "uint256",
      },
      { indexed: true, internalType: "address", name: "to", type: "address" },
    ],
    name: "Burn",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount0",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount1",
        type: "uint256",
      },
    ],
    name: "Mint",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount0In",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount1In",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount0Out",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount1Out",
        type: "uint256",
      },
      { indexed: true, internalType: "address", name: "to", type: "address" },
    ],
    name: "Swap",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint112",
        name: "reserve0",
        type: "uint112",
      },
      {
        indexed: false,
        internalType: "uint112",
        name: "reserve1",
        type: "uint112",
      },
    ],
    name: "Sync",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "from", type: "address" },
      { indexed: true, internalType: "address", name: "to", type: "address" },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "Transfer",
    type: "event",
  },
  {
    constant: true,
    inputs: [],
    name: "DOMAIN_SEPARATOR",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "MINIMUM_LIQUIDITY",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "PERMIT_TYPEHASH",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [
      { internalType: "address", name: "", type: "address" },
      { internalType: "address", name: "", type: "address" },
    ],
    name: "allowance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "value", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [{ internalType: "address", name: "to", type: "address" }],
    name: "burn",
    outputs: [
      { internalType: "uint256", name: "amount0", type: "uint256" },
      { internalType: "uint256", name: "amount1", type: "uint256" },
    ],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "factory",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "getReserves",
    outputs: [
      { internalType: "uint112", name: "_reserve0", type: "uint112" },
      { internalType: "uint112", name: "_reserve1", type: "uint112" },
      { internalType: "uint32", name: "_blockTimestampLast", type: "uint32" },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { internalType: "address", name: "_token0", type: "address" },
      { internalType: "address", name: "_token1", type: "address" },
    ],
    name: "initialize",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "kLast",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [{ internalType: "address", name: "to", type: "address" }],
    name: "mint",
    outputs: [{ internalType: "uint256", name: "liquidity", type: "uint256" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "name",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "nonces",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "value", type: "uint256" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
      { internalType: "uint8", name: "v", type: "uint8" },
      { internalType: "bytes32", name: "r", type: "bytes32" },
      { internalType: "bytes32", name: "s", type: "bytes32" },
    ],
    name: "permit",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "price0CumulativeLast",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "price1CumulativeLast",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [{ internalType: "address", name: "to", type: "address" }],
    name: "skim",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { internalType: "uint256", name: "amount0Out", type: "uint256" },
      { internalType: "uint256", name: "amount1Out", type: "uint256" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "bytes", name: "data", type: "bytes" },
    ],
    name: "swap",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "symbol",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [],
    name: "sync",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "token0",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "token1",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "totalSupply",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "value", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { internalType: "address", name: "from", type: "address" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "value", type: "uint256" },
    ],
    name: "transferFrom",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
];

window.PAIRAVAX_ABI = [
  {
    inputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "Approval",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount0",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount1",
        type: "uint256",
      },
      { indexed: true, internalType: "address", name: "to", type: "address" },
    ],
    name: "Burn",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount0",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount1",
        type: "uint256",
      },
    ],
    name: "Mint",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount0In",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount1In",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount0Out",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount1Out",
        type: "uint256",
      },
      { indexed: true, internalType: "address", name: "to", type: "address" },
    ],
    name: "Swap",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint112",
        name: "reserve0",
        type: "uint112",
      },
      {
        indexed: false,
        internalType: "uint112",
        name: "reserve1",
        type: "uint112",
      },
    ],
    name: "Sync",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "from", type: "address" },
      { indexed: true, internalType: "address", name: "to", type: "address" },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "Transfer",
    type: "event",
  },
  {
    constant: true,
    inputs: [],
    name: "DOMAIN_SEPARATOR",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "MINIMUM_LIQUIDITY",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "PERMIT_TYPEHASH",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [
      { internalType: "address", name: "", type: "address" },
      { internalType: "address", name: "", type: "address" },
    ],
    name: "allowance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "value", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [{ internalType: "address", name: "to", type: "address" }],
    name: "burn",
    outputs: [
      { internalType: "uint256", name: "amount0", type: "uint256" },
      { internalType: "uint256", name: "amount1", type: "uint256" },
    ],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "factory",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "getReserves",
    outputs: [
      { internalType: "uint112", name: "_reserve0", type: "uint112" },
      { internalType: "uint112", name: "_reserve1", type: "uint112" },
      { internalType: "uint32", name: "_blockTimestampLast", type: "uint32" },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { internalType: "address", name: "_token0", type: "address" },
      { internalType: "address", name: "_token1", type: "address" },
    ],
    name: "initialize",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "kLast",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [{ internalType: "address", name: "to", type: "address" }],
    name: "mint",
    outputs: [{ internalType: "uint256", name: "liquidity", type: "uint256" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "name",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "nonces",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "value", type: "uint256" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
      { internalType: "uint8", name: "v", type: "uint8" },
      { internalType: "bytes32", name: "r", type: "bytes32" },
      { internalType: "bytes32", name: "s", type: "bytes32" },
    ],
    name: "permit",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "price0CumulativeLast",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "price1CumulativeLast",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [{ internalType: "address", name: "to", type: "address" }],
    name: "skim",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { internalType: "uint256", name: "amount0Out", type: "uint256" },
      { internalType: "uint256", name: "amount1Out", type: "uint256" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "bytes", name: "data", type: "bytes" },
    ],
    name: "swap",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "symbol",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [],
    name: "sync",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "token0",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "token1",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "totalSupply",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "value", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { internalType: "address", name: "from", type: "address" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "value", type: "uint256" },
    ],
    name: "transferFrom",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
];

window.CONSTANT_STAKINGDAI_ABI = [
  {
    inputs: [
      {
        internalType: "address",
        name: "_uniswapV2RouterAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "_feeRecipientAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "trustedDepositTokenAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "trustedRewardTokenAddress",
        type: "address",
      },
      { internalType: "uint256", name: "referralFeeRateX100", type: "uint256" },
      { internalType: "uint256", name: "stakingFeeRateX100", type: "uint256" },
      {
        internalType: "uint256",
        name: "unstakingFeeRateX100",
        type: "uint256",
      },
      { internalType: "uint256", name: "rewardRateX100", type: "uint256" },
      { internalType: "uint256", name: "rewardInterval", type: "uint256" },
      { internalType: "uint256", name: "lockupTime", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
    ],
    name: "EmergencyDeclared",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "newAddress",
        type: "address",
      },
    ],
    name: "FeeRecipientAddressChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "_newLockupTime",
        type: "uint256",
      },
    ],
    name: "LockupTimeChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "newFee",
        type: "uint256",
      },
    ],
    name: "ReferralFeeChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "referrer",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "ReferralFeeTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "holder",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "Reinvest",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "holder",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "RewardsTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "Stake",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "newFee",
        type: "uint256",
      },
    ],
    name: "StakingFeeChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "contractAddress",
        type: "address",
      },
    ],
    name: "TrustedDepositContractAdded",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "contractAddress",
        type: "address",
      },
    ],
    name: "TrustedDepositContractRemoved",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "router",
        type: "address",
      },
    ],
    name: "UniswapV2RouterChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "Unstake",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "newFee",
        type: "uint256",
      },
    ],
    name: "UnstakingFeeChanged",
    type: "event",
  },
  {
    inputs: [],
    name: "EMERGENCY_WAIT_TIME",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "LOCKUP_TIME",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "REFERRAL_FEE_RATE_X_100",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "REWARD_INTERVAL",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "REWARD_RATE_X_100",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "STAKING_FEE_RATE_X_100",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "TRUSTED_DEPOSIT_TOKEN_ADDRESS",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "TRUSTED_REWARD_TOKEN_ADDRESS",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "TRUSTED_WETH_TOKEN_ADDRESS",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "UNSTAKING_FEE_RATE_X_100",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_address", type: "address" }],
    name: "addTrustedDepositContractAddress",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "adminCanClaimAfter",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "adminClaimableTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_amountOutMin_referralFee",
        type: "uint256",
      },
      { internalType: "uint256", name: "_amountOutMin_claim", type: "uint256" },
      { internalType: "uint256", name: "_deadline", type: "uint256" },
    ],
    name: "claim",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "address", name: "recipient", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "claimAnyToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "contractStartTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "declareEmergency",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "depositedTokens",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "feeRecipientAddress",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "account", type: "address" },
      { internalType: "uint256", name: "i", type: "uint256" },
    ],
    name: "getActiveReferredStaker",
    outputs: [
      { internalType: "address", name: "_staker", type: "address" },
      { internalType: "uint256", name: "_totalEarned", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getNumberOfHolders",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "referrer", type: "address" }],
    name: "getNumberOfReferredStakers",
    outputs: [
      { internalType: "uint256", name: "_activeStakers", type: "uint256" },
      { internalType: "uint256", name: "_totalStakers", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_holder", type: "address" }],
    name: "getPendingDivs",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "account", type: "address" },
      { internalType: "uint256", name: "i", type: "uint256" },
    ],
    name: "getReferredStaker",
    outputs: [
      { internalType: "address", name: "_staker", type: "address" },
      { internalType: "uint256", name: "_totalEarned", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "startIndex", type: "uint256" },
      { internalType: "uint256", name: "endIndex", type: "uint256" },
    ],
    name: "getStakersList",
    outputs: [
      { internalType: "address[]", name: "stakers", type: "address[]" },
      {
        internalType: "uint256[]",
        name: "stakingTimestamps",
        type: "uint256[]",
      },
      {
        internalType: "uint256[]",
        name: "lastClaimedTimeStamps",
        type: "uint256[]",
      },
      { internalType: "uint256[]", name: "stakedTokens", type: "uint256[]" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_holder", type: "address" }],
    name: "getTotalPendingDivs",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "isEmergency",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "isTrustedDepositContract",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "lastClaimedTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_amountOutMin_referralFee",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_amountOutMin_reinvest",
        type: "uint256",
      },
      { internalType: "uint256", name: "_deadline", type: "uint256" },
    ],
    name: "reInvest",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "referrals",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_address", type: "address" }],
    name: "removeTrustedDepositContractAddress",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "rewardsPendingClaim",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "lockupTime", type: "uint256" },
      { internalType: "uint256", name: "referralFeeRateX100", type: "uint256" },
      { internalType: "uint256", name: "stakingFeeRateX100", type: "uint256" },
      {
        internalType: "uint256",
        name: "unstakingFeeRateX100",
        type: "uint256",
      },
      { internalType: "address", name: "router", type: "address" },
      {
        internalType: "address",
        name: "_feeRecipientAddress",
        type: "address",
      },
    ],
    name: "setContractVariables",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newFeeRecipientAddress",
        type: "address",
      },
    ],
    name: "setFeeRecipientAddress",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_newLockupTime", type: "uint256" },
    ],
    name: "setLockupTime",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_newReferralFeeRateX100",
        type: "uint256",
      },
    ],
    name: "setReferralFeeRateX100",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_newRewardRate", type: "uint256" },
    ],
    name: "setRewardRate",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_newStakingFeeRateX100",
        type: "uint256",
      },
    ],
    name: "setStakingFeeRateX100",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "contract IUniswapV2Router",
        name: "_newUniswapV2Router",
        type: "address",
      },
    ],
    name: "setUniswapV2Router",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_newUnstakingFeeRateX100",
        type: "uint256",
      },
    ],
    name: "setUnstakingFeeRateX100",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountToStake", type: "uint256" },
      { internalType: "address", name: "referrer", type: "address" },
      {
        internalType: "uint256",
        name: "_amountOutMin_referralFee",
        type: "uint256",
      },
      { internalType: "uint256", name: "_deadline", type: "uint256" },
    ],
    name: "stake",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "stakingTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalClaimedReferralFee",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalClaimedRewards",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "totalEarnedTokens",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "totalReferralFeeEarned",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "newOwner", type: "address" }],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "uniswapV2Router",
    outputs: [
      { internalType: "contract IUniswapV2Router", name: "", type: "address" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountToWithdraw", type: "uint256" },
      {
        internalType: "uint256",
        name: "_amountOutMin_referralFee",
        type: "uint256",
      },
      { internalType: "uint256", name: "_deadline", type: "uint256" },
    ],
    name: "unstake",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

window.BUYBACK_STAKING1_1_ABI = [
  {
    inputs: [
      { internalType: "address", name: "router", type: "address" },
      {
        internalType: "address",
        name: "trustedPlatformTokenAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "trustedDepositTokenAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "_feeRecipientAddress",
        type: "address",
      },
      { internalType: "uint256", name: "stakingFeeRateX100", type: "uint256" },
      {
        internalType: "uint256",
        name: "unstakingFeeRateX100",
        type: "uint256",
      },
      { internalType: "uint256", name: "lockupTime", type: "uint256" },
      { internalType: "uint256", name: "adminCanClaimAfter", type: "uint256" },
      { internalType: "uint256", name: "rewardRateX100", type: "uint256" },
      { internalType: "uint256", name: "rewardInterval", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "tokenAddress",
        type: "address",
      },
    ],
    name: "DepositTokenAdded",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "tokenAddress",
        type: "address",
      },
    ],
    name: "DepositTokenRemoved",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
    ],
    name: "EmergencyDeclared",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "newAddress",
        type: "address",
      },
    ],
    name: "FeeRecipientAddressChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "lockupTime",
        type: "uint256",
      },
    ],
    name: "LockupTimeChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "Reinvest",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "holder",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "RewardsTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "holder",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "Stake",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "contractAddress",
        type: "address",
      },
    ],
    name: "StakingContractChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "uint256", name: "fee", type: "uint256" },
    ],
    name: "StakingFeeChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "router",
        type: "address",
      },
    ],
    name: "UniswapV2RouterChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "holder",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "Unstake",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "uint256", name: "fee", type: "uint256" },
    ],
    name: "UnstakingFeeChanged",
    type: "event",
  },
  {
    inputs: [],
    name: "EMERGENCY_WAIT_TIME",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "LOCKUP_TIME",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "REWARD_INTERVAL",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "REWARD_RATE_X_100",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "STAKING_FEE_RATE_X_100",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "TRUSTED_DEPOSIT_TOKEN_ADDRESS",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "TRUSTED_PLATFORM_TOKEN_ADDRESS",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "TRUSTED_STAKING_CONTRACT_ADDRESS",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "UNSTAKING_FEE_RATE_X_100",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_tokenAddress", type: "address" },
    ],
    name: "addTrustedDepositToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "adminClaimableTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_amountOutMin", type: "uint256" },
      { internalType: "uint256", name: "_deadline", type: "uint256" },
    ],
    name: "claim",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "address", name: "recipient", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "claimAnyToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "contractStartTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "declareEmergency",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "depositedTokens",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "feeRecipientAddress",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getNumberOfHolders",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_holder", type: "address" }],
    name: "getPendingDivs",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "startIndex", type: "uint256" },
      { internalType: "uint256", name: "endIndex", type: "uint256" },
    ],
    name: "getStakersList",
    outputs: [
      { internalType: "address[]", name: "stakers", type: "address[]" },
      {
        internalType: "uint256[]",
        name: "stakingTimestamps",
        type: "uint256[]",
      },
      {
        internalType: "uint256[]",
        name: "lastClaimedTimeStamps",
        type: "uint256[]",
      },
      { internalType: "uint256[]", name: "stakedTokens", type: "uint256[]" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_holder", type: "address" }],
    name: "getTotalPendingDivs",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "isEmergency",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "lastClaimedTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "reInvest",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_tokenAddress", type: "address" },
    ],
    name: "removeTrustedDepositToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "rewardsPendingClaim",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "lockupTime", type: "uint256" },
      { internalType: "uint256", name: "stakingFeeRateX100", type: "uint256" },
      {
        internalType: "uint256",
        name: "unstakingFeeRateX100",
        type: "uint256",
      },
      { internalType: "address", name: "router", type: "address" },
      {
        internalType: "address",
        name: "newFeeRecipientAddress",
        type: "address",
      },
    ],
    name: "setContractVariables",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newFeeRecipientAddress",
        type: "address",
      },
    ],
    name: "setFeeRecipientAddress",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "lockupTime", type: "uint256" }],
    name: "setLockupTime",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "trustedStakingContractAddress",
        type: "address",
      },
    ],
    name: "setStakingContractAddress",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "newStakingFeeRateX100",
        type: "uint256",
      },
    ],
    name: "setStakingFeeRateX100",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "contract IUniswapV2Router",
        name: "router",
        type: "address",
      },
    ],
    name: "setUniswapV2Router",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "newUnstakingFeeRateX100",
        type: "uint256",
      },
    ],
    name: "setUnstakingFeeRateX100",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountToDeposit", type: "uint256" },
      { internalType: "address", name: "depositToken", type: "address" },
      {
        internalType: "uint256",
        name: "_amountOutMin_75Percent",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_amountOutMin_25Percent",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_amountOutMin_stakingReferralFee",
        type: "uint256",
      },
      { internalType: "uint256", name: "_deadline", type: "uint256" },
    ],
    name: "stake",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "stakingTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalClaimedRewards",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalDepositedTokens",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "totalEarnedTokens",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "newOwner", type: "address" }],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "trustedDepositTokens",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "uniswapV2Router",
    outputs: [
      { internalType: "contract IUniswapV2Router", name: "", type: "address" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountToWithdraw", type: "uint256" },
      { internalType: "uint256", name: "_amountOutMin", type: "uint256" },
      { internalType: "uint256", name: "_deadline", type: "uint256" },
    ],
    name: "unstake",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

window.BUYBACK_STAKING1_2_ABI = [
  {
    inputs: [
      { internalType: "address", name: "router", type: "address" },
      {
        internalType: "address",
        name: "trustedPlatformTokenAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "trustedDepositTokenAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "_feeRecipientAddress",
        type: "address",
      },
      { internalType: "uint256", name: "stakingFeeRateX100", type: "uint256" },
      {
        internalType: "uint256",
        name: "unstakingFeeRateX100",
        type: "uint256",
      },
      { internalType: "uint256", name: "lockupTime", type: "uint256" },
      { internalType: "uint256", name: "adminCanClaimAfter", type: "uint256" },
      { internalType: "uint256", name: "rewardRateX100", type: "uint256" },
      { internalType: "uint256", name: "rewardInterval", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "tokenAddress",
        type: "address",
      },
    ],
    name: "DepositTokenAdded",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "tokenAddress",
        type: "address",
      },
    ],
    name: "DepositTokenRemoved",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
    ],
    name: "EmergencyDeclared",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "newAddress",
        type: "address",
      },
    ],
    name: "FeeRecipientAddressChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "lockupTime",
        type: "uint256",
      },
    ],
    name: "LockupTimeChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "Reinvest",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "holder",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "RewardsTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "holder",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "Stake",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "contractAddress",
        type: "address",
      },
    ],
    name: "StakingContractChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "uint256", name: "fee", type: "uint256" },
    ],
    name: "StakingFeeChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "router",
        type: "address",
      },
    ],
    name: "UniswapV2RouterChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "holder",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "Unstake",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "uint256", name: "fee", type: "uint256" },
    ],
    name: "UnstakingFeeChanged",
    type: "event",
  },
  {
    inputs: [],
    name: "EMERGENCY_WAIT_TIME",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "LOCKUP_TIME",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "REWARD_INTERVAL",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "REWARD_RATE_X_100",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "STAKING_FEE_RATE_X_100",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "TRUSTED_DEPOSIT_TOKEN_ADDRESS",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "TRUSTED_PLATFORM_TOKEN_ADDRESS",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "TRUSTED_STAKING_CONTRACT_ADDRESS",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "UNSTAKING_FEE_RATE_X_100",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_tokenAddress", type: "address" },
    ],
    name: "addTrustedDepositToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "adminClaimableTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_amountOutMin", type: "uint256" },
      { internalType: "uint256", name: "_deadline", type: "uint256" },
    ],
    name: "claim",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "address", name: "recipient", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "claimAnyToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "contractStartTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "declareEmergency",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "depositedTokens",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "feeRecipientAddress",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getNumberOfHolders",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_holder", type: "address" }],
    name: "getPendingDivs",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "startIndex", type: "uint256" },
      { internalType: "uint256", name: "endIndex", type: "uint256" },
    ],
    name: "getStakersList",
    outputs: [
      { internalType: "address[]", name: "stakers", type: "address[]" },
      {
        internalType: "uint256[]",
        name: "stakingTimestamps",
        type: "uint256[]",
      },
      {
        internalType: "uint256[]",
        name: "lastClaimedTimeStamps",
        type: "uint256[]",
      },
      { internalType: "uint256[]", name: "stakedTokens", type: "uint256[]" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_holder", type: "address" }],
    name: "getTotalPendingDivs",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "isEmergency",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "lastClaimedTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "reInvest",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_tokenAddress", type: "address" },
    ],
    name: "removeTrustedDepositToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "rewardsPendingClaim",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "lockupTime", type: "uint256" },
      { internalType: "uint256", name: "stakingFeeRateX100", type: "uint256" },
      {
        internalType: "uint256",
        name: "unstakingFeeRateX100",
        type: "uint256",
      },
      { internalType: "address", name: "router", type: "address" },
      {
        internalType: "address",
        name: "newFeeRecipientAddress",
        type: "address",
      },
    ],
    name: "setContractVariables",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newFeeRecipientAddress",
        type: "address",
      },
    ],
    name: "setFeeRecipientAddress",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "lockupTime", type: "uint256" }],
    name: "setLockupTime",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "trustedStakingContractAddress",
        type: "address",
      },
    ],
    name: "setStakingContractAddress",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "newStakingFeeRateX100",
        type: "uint256",
      },
    ],
    name: "setStakingFeeRateX100",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "contract IUniswapV2Router",
        name: "router",
        type: "address",
      },
    ],
    name: "setUniswapV2Router",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "newUnstakingFeeRateX100",
        type: "uint256",
      },
    ],
    name: "setUnstakingFeeRateX100",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountToDeposit", type: "uint256" },
      { internalType: "address", name: "depositToken", type: "address" },
      {
        internalType: "uint256",
        name: "_amountOutMin_75Percent",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_amountOutMin_25Percent",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_amountOutMin_stakingReferralFee",
        type: "uint256",
      },
      { internalType: "uint256", name: "_deadline", type: "uint256" },
    ],
    name: "stake",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "stakingTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalClaimedRewards",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalDepositedTokens",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "totalEarnedTokens",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "newOwner", type: "address" }],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "trustedDepositTokens",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "uniswapV2Router",
    outputs: [
      { internalType: "contract IUniswapV2Router", name: "", type: "address" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountToWithdraw", type: "uint256" },
      { internalType: "uint256", name: "_amountOutMin", type: "uint256" },
      { internalType: "uint256", name: "_deadline", type: "uint256" },
    ],
    name: "unstake",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

window.NFTSTAKING_ABI = [
  {
    inputs: [
      {
        internalType: "address",
        name: "_stakingDestinationAddress",
        type: "address",
      },
      { internalType: "uint256", name: "_rate", type: "uint256" },
      {
        internalType: "uint256",
        name: "_expiration",
        type: "uint256",
      },
      { internalType: "address", name: "_erc20Address", type: "address" },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "newExpiration",
        type: "uint256",
      },
    ],
    name: "ExpirationChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "newLockTime",
        type: "uint256",
      },
    ],
    name: "LockTimeChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "Paused",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "newRate",
        type: "uint256",
      },
    ],
    name: "RateChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "Unpaused",
    type: "event",
  },
  {
    inputs: [],
    name: "LOCKUP_TIME",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "", type: "address" },
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "_depositBlocks",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "account", type: "address" },
      {
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
    ],
    name: "calculateReward",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "account", type: "address" },
      {
        internalType: "uint256[]",
        name: "tokenIds",
        type: "uint256[]",
      },
    ],
    name: "calculateRewards",
    outputs: [
      { internalType: "uint256[]", name: "rewards", type: "uint256[]" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256[]", name: "tokenIds", type: "uint256[]" },
    ],
    name: "claimRewards",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256[]", name: "tokenIds", type: "uint256[]" },
    ],
    name: "deposit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "depositsOf",
    outputs: [{ internalType: "uint256[]", name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256[]", name: "tokenIds", type: "uint256[]" },
    ],
    name: "emergencyWithdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "erc20Address",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "expiration",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "", type: "address" },
      {
        internalType: "address",
        name: "",
        type: "address",
      },
      { internalType: "uint256", name: "", type: "uint256" },
      {
        internalType: "bytes",
        name: "",
        type: "bytes",
      },
    ],
    name: "onERC721Received",
    outputs: [{ internalType: "bytes4", name: "", type: "bytes4" }],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "pause",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "paused",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "rate",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "renounceOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_expiration", type: "uint256" }],
    name: "setExpiration",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_lockTime", type: "uint256" }],
    name: "setLockTime",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_rate", type: "uint256" }],
    name: "setRate",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "stakingDestinationAddress",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "stakingTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "newOwner", type: "address" }],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "unpause",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256[]", name: "tokenIds", type: "uint256[]" },
    ],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "withdrawTokens",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

window.NFT_ABI = [
  {
    inputs: [
      { internalType: "string", name: "name", type: "string" },
      { internalType: "string", name: "symbol", type: "string" },
      { internalType: "uint256", name: "maxNftSupply", type: "uint256" },
      { internalType: "uint256", name: "saleStart", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "approved",
        type: "address",
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
    ],
    name: "Approval",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "operator",
        type: "address",
      },
      { indexed: false, internalType: "bool", name: "approved", type: "bool" },
    ],
    name: "ApprovalForAll",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "from", type: "address" },
      { indexed: true, internalType: "address", name: "to", type: "address" },
      {
        indexed: true,
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
    ],
    name: "Transfer",
    type: "event",
  },
  {
    inputs: [],
    name: "CAWS_PROVENANCE",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "MAX_CAWS",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "REVEAL_TIMESTAMP",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "tokenId", type: "uint256" },
    ],
    name: "approve",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "baseURI",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "cawsPrice",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "emergencySetStartingIndexBlock",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "flipSaleState",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "getApproved",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "address", name: "operator", type: "address" },
    ],
    name: "isApprovedForAll",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "maxCawsPurchase",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "numberOfTokens", type: "uint256" },
    ],
    name: "mintCaws",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [],
    name: "name",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "nextOwnerToExplicitlySet",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "ownerOf",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "renounceOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "reserveCaws",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "from", type: "address" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "tokenId", type: "uint256" },
    ],
    name: "safeTransferFrom",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "from", type: "address" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "tokenId", type: "uint256" },
      { internalType: "bytes", name: "_data", type: "bytes" },
    ],
    name: "safeTransferFrom",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "saleIsActive",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "operator", type: "address" },
      { internalType: "bool", name: "approved", type: "bool" },
    ],
    name: "setApprovalForAll",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "string", name: "tokenURI", type: "string" }],
    name: "setBaseURI",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "string", name: "provenanceHash", type: "string" },
    ],
    name: "setProvenanceHash",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "revealTimeStamp", type: "uint256" },
    ],
    name: "setRevealTimestamp",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "setStartingIndex",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "startingIndex",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "startingIndexBlock",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes4", name: "interfaceId", type: "bytes4" }],
    name: "supportsInterface",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "index", type: "uint256" }],
    name: "tokenByIndex",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "uint256", name: "index", type: "uint256" },
    ],
    name: "tokenOfOwnerByIndex",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "tokenURI",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "from", type: "address" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "tokenId", type: "uint256" },
    ],
    name: "transferFrom",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "newOwner", type: "address" }],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

window.LANDMINTING_ABI = [
  {
    inputs: [
      { internalType: "string", name: "name", type: "string" },
      { internalType: "string", name: "symbol", type: "string" },
      { internalType: "uint256", name: "maxNftSupply", type: "uint256" },
      { internalType: "uint256", name: "saleStart", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "approved",
        type: "address",
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
    ],
    name: "Approval",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "operator",
        type: "address",
      },
      { indexed: false, internalType: "bool", name: "approved", type: "bool" },
    ],
    name: "ApprovalForAll",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "from", type: "address" },
      { indexed: true, internalType: "address", name: "to", type: "address" },
      {
        indexed: true,
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
    ],
    name: "Transfer",
    type: "event",
  },
  {
    inputs: [],
    name: "LandPriceDiscount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "MAX_MINT",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "MAX_WOD",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "REVEAL_TIMESTAMP",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "WOD_PROVENANCE",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "tokenId", type: "uint256" },
    ],
    name: "approve",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "baseURI",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "cawsContract",
    outputs: [
      { internalType: "contract CawsContract", name: "", type: "address" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "cawsUsed",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "emergencySetStartingIndexBlock",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "flipSaleState",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "getApproved",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "address", name: "operator", type: "address" },
    ],
    name: "isApprovedForAll",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "landPrice",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "maxLandPurchase",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "numberOfTokens", type: "uint256" },
      { internalType: "uint256[]", name: "tokenIds", type: "uint256[]" },
    ],
    name: "mintWodGenesis",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [],
    name: "name",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "nextOwnerToExplicitlySet",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "ownerOf",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "renounceOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "numberOfTokens", type: "uint256" },
    ],
    name: "reserveWod",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "from", type: "address" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "tokenId", type: "uint256" },
    ],
    name: "safeTransferFrom",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "from", type: "address" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "tokenId", type: "uint256" },
      { internalType: "bytes", name: "_data", type: "bytes" },
    ],
    name: "safeTransferFrom",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "saleIsActive",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "operator", type: "address" },
      { internalType: "bool", name: "approved", type: "bool" },
    ],
    name: "setApprovalForAll",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "string", name: "tokenURI", type: "string" }],
    name: "setBaseURI",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "string", name: "provenanceHash", type: "string" },
    ],
    name: "setProvenanceHash",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "revealTimeStamp", type: "uint256" },
    ],
    name: "setRevealTimestamp",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "setStartingIndex",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "stakeContract",
    outputs: [
      { internalType: "contract StakeContract", name: "", type: "address" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "startingIndex",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "startingIndexBlock",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes4", name: "interfaceId", type: "bytes4" }],
    name: "supportsInterface",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "index", type: "uint256" }],
    name: "tokenByIndex",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "uint256", name: "index", type: "uint256" },
    ],
    name: "tokenOfOwnerByIndex",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "tokenURI",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "from", type: "address" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "tokenId", type: "uint256" },
    ],
    name: "transferFrom",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "newOwner", type: "address" }],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

window.LANDSTAKING_ABI = [
  {
    inputs: [
      {
        internalType: "address",
        name: "_stakingDestinationAddress",
        type: "address",
      },
      { internalType: "uint256", name: "_rate", type: "uint256" },
      { internalType: "uint256", name: "_expiration", type: "uint256" },
      { internalType: "address", name: "_erc20Address", type: "address" },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "newExpiration",
        type: "uint256",
      },
    ],
    name: "ExpirationChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "newLockTime",
        type: "uint256",
      },
    ],
    name: "LockTimeChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "Paused",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "newRate",
        type: "uint256",
      },
    ],
    name: "RateChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "Unpaused",
    type: "event",
  },
  {
    inputs: [],
    name: "LOCKUP_TIME",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "", type: "address" },
      { internalType: "uint256", name: "", type: "uint256" },
    ],
    name: "_depositBlocks",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "account", type: "address" },
      { internalType: "uint256", name: "tokenId", type: "uint256" },
    ],
    name: "calculateReward",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "account", type: "address" },
      { internalType: "uint256[]", name: "tokenIds", type: "uint256[]" },
    ],
    name: "calculateRewards",
    outputs: [
      { internalType: "uint256[]", name: "rewards", type: "uint256[]" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256[]", name: "tokenIds", type: "uint256[]" },
    ],
    name: "claimRewards",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256[]", name: "tokenIds", type: "uint256[]" },
    ],
    name: "deposit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "depositsOf",
    outputs: [{ internalType: "uint256[]", name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256[]", name: "tokenIds", type: "uint256[]" },
    ],
    name: "emergencyWithdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "erc20Address",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "expiration",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "", type: "address" },
      { internalType: "address", name: "", type: "address" },
      { internalType: "uint256", name: "", type: "uint256" },
      { internalType: "bytes", name: "", type: "bytes" },
    ],
    name: "onERC721Received",
    outputs: [{ internalType: "bytes4", name: "", type: "bytes4" }],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "pause",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "paused",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "rate",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "renounceOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_expiration", type: "uint256" }],
    name: "setExpiration",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_lockTime", type: "uint256" }],
    name: "setLockTime",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_rate", type: "uint256" }],
    name: "setRate",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "stakingDestinationAddress",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "stakingTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "newOwner", type: "address" }],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "unpause",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256[]", name: "tokenIds", type: "uint256[]" },
    ],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "withdrawTokens",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

window.WOD_CAWS_ABI = [
  {
    inputs: [
      {
        internalType: "address",
        name: "_stakingDestinationAddress",
        type: "address",
      },
      { internalType: "address", name: "_WoDcontractaddress", type: "address" },
      { internalType: "uint256", name: "_rate", type: "uint256" },
      { internalType: "uint256", name: "_expiration", type: "uint256" },
      { internalType: "address", name: "_erc20Address", type: "address" },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "newExpiration",
        type: "uint256",
      },
    ],
    name: "ExpirationChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "newLockTime",
        type: "uint256",
      },
    ],
    name: "LockTimeChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "Paused",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "newRate",
        type: "uint256",
      },
    ],
    name: "RateChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "Unpaused",
    type: "event",
  },
  {
    inputs: [],
    name: "LOCKUP_TIME",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "WoDcontractaddress",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "", type: "address" },
      { internalType: "uint256", name: "", type: "uint256" },
    ],
    name: "_depositBlocks",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "account", type: "address" },
      { internalType: "uint256", name: "tokenId", type: "uint256" },
    ],
    name: "calculateReward",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "account", type: "address" },
      { internalType: "uint256[]", name: "tokenIds", type: "uint256[]" },
    ],
    name: "calculateRewards",
    outputs: [
      { internalType: "uint256[]", name: "rewards", type: "uint256[]" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256[]", name: "tokenIds", type: "uint256[]" },
    ],
    name: "claimRewards",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256[]", name: "tokenIds", type: "uint256[]" },
      { internalType: "uint256[]", name: "tokenIdsWoD", type: "uint256[]" },
    ],
    name: "deposit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "depositsOf",
    outputs: [{ internalType: "uint256[]", name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "depositsOfWoD",
    outputs: [{ internalType: "uint256[]", name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256[]", name: "tokenIds", type: "uint256[]" },
      { internalType: "uint256[]", name: "tokenIdsWoD", type: "uint256[]" },
    ],
    name: "emergencyWithdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "erc20Address",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "expiration",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "", type: "address" },
      { internalType: "address", name: "", type: "address" },
      { internalType: "uint256", name: "", type: "uint256" },
      { internalType: "bytes", name: "", type: "bytes" },
    ],
    name: "onERC721Received",
    outputs: [{ internalType: "bytes4", name: "", type: "bytes4" }],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "pause",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "paused",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "rate",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "renounceOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_expiration", type: "uint256" }],
    name: "setExpiration",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_lockTime", type: "uint256" }],
    name: "setLockTime",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_rate", type: "uint256" }],
    name: "setRate",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "stakingDestinationAddress",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "stakingTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "newOwner", type: "address" }],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "unpause",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256[]", name: "tokenIds", type: "uint256[]" },
      { internalType: "uint256[]", name: "tokenIdsWoD", type: "uint256[]" },
    ],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "withdrawTokens",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

window.BRIDGE_ABI = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "blocknumber",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "timestamp",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "id",
        type: "uint256",
      },
    ],
    name: "Deposit",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "id",
        type: "uint256",
      },
    ],
    name: "Withdraw",
    type: "event",
  },
  {
    inputs: [],
    name: "CHAIN_ID",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "ONE_DAY",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "TRUSTED_TOKEN_ADDRESS",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "claimedWithdrawalsByOtherChainDepositId",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "dailyTokenWithdrawLimitPerAccount",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "deposit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "lastDepositIndex",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "lastUpdatedTokenWithdrawAmount",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "lastUpdatedTokenWithdrawTimestamp",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "renounceOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "newDailyTokenWithdrawLimitPerAccount",
        type: "uint256",
      },
    ],
    name: "setDailyLimit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newVerifyAddress",
        type: "address",
      },
    ],
    name: "setVerifyAddress",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "tokenAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "recipient",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "transferAnyERC20Token",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "verifyAddress",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "chainId",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "id",
        type: "uint256",
      },
      {
        internalType: "bytes",
        name: "signature",
        type: "bytes",
      },
    ],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

window.NEW_GOVERNANCE_ABI = [
  {
    inputs: [
      {
        internalType: "uint256",
        name: "proposalId",
        type: "uint256",
      },
      {
        internalType: "enum Governance.Option",
        name: "option",
        type: "uint8",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "addVotes",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "newMinBalanceToInitProposal",
        type: "uint256",
      },
    ],
    name: "changeMinBalanceToInitProposal",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "newQuorum",
        type: "uint256",
      },
    ],
    name: "changeQuorum",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "claimOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "proposalId",
        type: "uint256",
      },
    ],
    name: "executeProposal",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "contract StakingPool",
        name: "",
        type: "address",
      },
      {
        indexed: false,
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    name: "PoolCallReverted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "contract StakingPool",
        name: "",
        type: "address",
      },
      {
        indexed: false,
        internalType: "bytes",
        name: "",
        type: "bytes",
      },
    ],
    name: "PoolCallReverted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "contract StakingPool",
        name: "",
        type: "address",
      },
    ],
    name: "PoolCallSucceeded",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "enum Governance.PoolGroupName",
        name: "poolGroupName",
        type: "uint8",
      },
    ],
    name: "proposeDisburseOrBurn",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "newMinBalance",
        type: "uint256",
      },
    ],
    name: "proposeNewMinBalanceToInitProposal",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "newQuorum",
        type: "uint256",
      },
    ],
    name: "proposeNewQuorum",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "text",
        type: "string",
      },
    ],
    name: "proposeText",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "enum Governance.PoolGroupName",
        name: "poolGroupName",
        type: "uint8",
      },
      {
        internalType: "address",
        name: "newGovernance",
        type: "address",
      },
    ],
    name: "proposeUpgradeGovernance",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "proposalId",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "removeVotes",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "tokenAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "recipient",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "transferAnyERC20Token",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "pool",
        type: "address",
      },
      {
        internalType: "address",
        name: "tokenAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "recipient",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "transferAnyERC20TokenFromPool",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "tokenAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "recipient",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "transferAnyLegacyERC20Token",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "pool",
        type: "address",
      },
      {
        internalType: "address",
        name: "tokenAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "recipient",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "transferAnyLegacyERC20TokenFromPool",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_newOwner",
        type: "address",
      },
    ],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "withdrawAllTokens",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "actions",
    outputs: [
      {
        internalType: "enum Governance.Action",
        name: "",
        type: "uint8",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "ADMIN_CAN_CLAIM_AFTER",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "ADMIN_FEATURES_EXPIRE_AFTER",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "contractStartTime",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "proposalId",
        type: "uint256",
      },
    ],
    name: "getProposal",
    outputs: [
      {
        internalType: "uint256",
        name: "_proposalId",
        type: "uint256",
      },
      {
        internalType: "enum Governance.Action",
        name: "_proposalAction",
        type: "uint8",
      },
      {
        internalType: "uint256",
        name: "_optionOneVotes",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_optionTwoVotes",
        type: "uint256",
      },
      {
        internalType: "contract StakingPool[]",
        name: "_stakingPool",
        type: "address[]",
      },
      {
        internalType: "address",
        name: "_newGovernance",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_proposalStartTime",
        type: "uint256",
      },
      {
        internalType: "bool",
        name: "_isProposalExecuted",
        type: "bool",
      },
      {
        internalType: "uint256",
        name: "_newQuorum",
        type: "uint256",
      },
      {
        internalType: "string",
        name: "_proposalText",
        type: "string",
      },
      {
        internalType: "uint256",
        name: "_newMinBalance",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "enum Governance.PoolGroupName",
        name: "",
        type: "uint8",
      },
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "hardcodedStakingPools",
    outputs: [
      {
        internalType: "contract StakingPool",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "isOwner",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "isProposalExecuted",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "proposalId",
        type: "uint256",
      },
    ],
    name: "isProposalExecutible",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "proposalId",
        type: "uint256",
      },
    ],
    name: "isProposalOpen",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "lastIndex",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "lastVotedProposalStartTime",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "MIN_BALANCE_TO_INIT_PROPOSAL",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "newGovernances",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "newMinBalances",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "newQuorums",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "optionOneVotes",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "optionTwoVotes",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "pendingOwner",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "proposalStartTime",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "proposalTexts",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "QUORUM",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "RESULT_EXECUTION_ALLOWANCE_PERIOD",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "stakingPools",
    outputs: [
      {
        internalType: "contract StakingPool",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "totalDepositedTokens",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "TRUSTED_TOKEN_ADDRESS",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "VOTE_DURATION",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "votedForOption",
    outputs: [
      {
        internalType: "enum Governance.Option",
        name: "",
        type: "uint8",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "votesForProposalByAddress",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

window.NEW_GOVERNANCEAVAX_ABI = [
  {
    inputs: [
      {
        internalType: "uint256",
        name: "proposalId",
        type: "uint256",
      },
      {
        internalType: "enum Governance.Option",
        name: "option",
        type: "uint8",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "addVotes",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "newMinBalanceToInitProposal",
        type: "uint256",
      },
    ],
    name: "changeMinBalanceToInitProposal",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "newQuorum",
        type: "uint256",
      },
    ],
    name: "changeQuorum",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "claimOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "proposalId",
        type: "uint256",
      },
    ],
    name: "executeProposal",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "contract StakingPool",
        name: "",
        type: "address",
      },
      {
        indexed: false,
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    name: "PoolCallReverted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "contract StakingPool",
        name: "",
        type: "address",
      },
      {
        indexed: false,
        internalType: "bytes",
        name: "",
        type: "bytes",
      },
    ],
    name: "PoolCallReverted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "contract StakingPool",
        name: "",
        type: "address",
      },
    ],
    name: "PoolCallSucceeded",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "enum Governance.PoolGroupName",
        name: "poolGroupName",
        type: "uint8",
      },
    ],
    name: "proposeDisburseOrBurn",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "newMinBalance",
        type: "uint256",
      },
    ],
    name: "proposeNewMinBalanceToInitProposal",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "newQuorum",
        type: "uint256",
      },
    ],
    name: "proposeNewQuorum",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "text",
        type: "string",
      },
    ],
    name: "proposeText",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "enum Governance.PoolGroupName",
        name: "poolGroupName",
        type: "uint8",
      },
      {
        internalType: "address",
        name: "newGovernance",
        type: "address",
      },
    ],
    name: "proposeUpgradeGovernance",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "proposalId",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "removeVotes",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "tokenAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "recipient",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "transferAnyERC20Token",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "pool",
        type: "address",
      },
      {
        internalType: "address",
        name: "tokenAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "recipient",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "transferAnyERC20TokenFromPool",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "tokenAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "recipient",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "transferAnyLegacyERC20Token",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "pool",
        type: "address",
      },
      {
        internalType: "address",
        name: "tokenAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "recipient",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "transferAnyLegacyERC20TokenFromPool",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_newOwner",
        type: "address",
      },
    ],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "withdrawAllTokens",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "actions",
    outputs: [
      {
        internalType: "enum Governance.Action",
        name: "",
        type: "uint8",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "ADMIN_CAN_CLAIM_AFTER",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "ADMIN_FEATURES_EXPIRE_AFTER",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "contractStartTime",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "proposalId",
        type: "uint256",
      },
    ],
    name: "getProposal",
    outputs: [
      {
        internalType: "uint256",
        name: "_proposalId",
        type: "uint256",
      },
      {
        internalType: "enum Governance.Action",
        name: "_proposalAction",
        type: "uint8",
      },
      {
        internalType: "uint256",
        name: "_optionOneVotes",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_optionTwoVotes",
        type: "uint256",
      },
      {
        internalType: "contract StakingPool[]",
        name: "_stakingPool",
        type: "address[]",
      },
      {
        internalType: "address",
        name: "_newGovernance",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_proposalStartTime",
        type: "uint256",
      },
      {
        internalType: "bool",
        name: "_isProposalExecuted",
        type: "bool",
      },
      {
        internalType: "uint256",
        name: "_newQuorum",
        type: "uint256",
      },
      {
        internalType: "string",
        name: "_proposalText",
        type: "string",
      },
      {
        internalType: "uint256",
        name: "_newMinBalance",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "enum Governance.PoolGroupName",
        name: "",
        type: "uint8",
      },
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "hardcodedStakingPools",
    outputs: [
      {
        internalType: "contract StakingPool",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "isOwner",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "isProposalExecuted",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "proposalId",
        type: "uint256",
      },
    ],
    name: "isProposalExecutible",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "proposalId",
        type: "uint256",
      },
    ],
    name: "isProposalOpen",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "lastIndex",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "lastVotedProposalStartTime",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "MIN_BALANCE_TO_INIT_PROPOSAL",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "newGovernances",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "newMinBalances",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "newQuorums",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "optionOneVotes",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "optionTwoVotes",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "pendingOwner",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "proposalStartTime",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "proposalTexts",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "QUORUM",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "RESULT_EXECUTION_ALLOWANCE_PERIOD",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "stakingPools",
    outputs: [
      {
        internalType: "contract StakingPool",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "totalDepositedTokens",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "TRUSTED_TOKEN_ADDRESS",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "VOTE_DURATION",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "votedForOption",
    outputs: [
      {
        internalType: "enum Governance.Option",
        name: "",
        type: "uint8",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "votesForProposalByAddress",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

window.NEW_GOVERNANCEBSC_ABI = [
  {
    inputs: [
      {
        internalType: "uint256",
        name: "proposalId",
        type: "uint256",
      },
      {
        internalType: "enum Governance.Option",
        name: "option",
        type: "uint8",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "addVotes",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "newMinBalanceToInitProposal",
        type: "uint256",
      },
    ],
    name: "changeMinBalanceToInitProposal",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "newQuorum",
        type: "uint256",
      },
    ],
    name: "changeQuorum",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "claimOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "proposalId",
        type: "uint256",
      },
    ],
    name: "executeProposal",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "contract StakingPool",
        name: "",
        type: "address",
      },
      {
        indexed: false,
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    name: "PoolCallReverted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "contract StakingPool",
        name: "",
        type: "address",
      },
      {
        indexed: false,
        internalType: "bytes",
        name: "",
        type: "bytes",
      },
    ],
    name: "PoolCallReverted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "contract StakingPool",
        name: "",
        type: "address",
      },
    ],
    name: "PoolCallSucceeded",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "enum Governance.PoolGroupName",
        name: "poolGroupName",
        type: "uint8",
      },
    ],
    name: "proposeDisburseOrBurn",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "newMinBalance",
        type: "uint256",
      },
    ],
    name: "proposeNewMinBalanceToInitProposal",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "newQuorum",
        type: "uint256",
      },
    ],
    name: "proposeNewQuorum",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "text",
        type: "string",
      },
    ],
    name: "proposeText",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "enum Governance.PoolGroupName",
        name: "poolGroupName",
        type: "uint8",
      },
      {
        internalType: "address",
        name: "newGovernance",
        type: "address",
      },
    ],
    name: "proposeUpgradeGovernance",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "proposalId",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "removeVotes",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "tokenAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "recipient",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "transferAnyERC20Token",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "pool",
        type: "address",
      },
      {
        internalType: "address",
        name: "tokenAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "recipient",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "transferAnyERC20TokenFromPool",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "tokenAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "recipient",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "transferAnyLegacyERC20Token",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "pool",
        type: "address",
      },
      {
        internalType: "address",
        name: "tokenAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "recipient",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "transferAnyLegacyERC20TokenFromPool",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_newOwner",
        type: "address",
      },
    ],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "withdrawAllTokens",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "actions",
    outputs: [
      {
        internalType: "enum Governance.Action",
        name: "",
        type: "uint8",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "ADMIN_CAN_CLAIM_AFTER",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "ADMIN_FEATURES_EXPIRE_AFTER",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "contractStartTime",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "proposalId",
        type: "uint256",
      },
    ],
    name: "getProposal",
    outputs: [
      {
        internalType: "uint256",
        name: "_proposalId",
        type: "uint256",
      },
      {
        internalType: "enum Governance.Action",
        name: "_proposalAction",
        type: "uint8",
      },
      {
        internalType: "uint256",
        name: "_optionOneVotes",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_optionTwoVotes",
        type: "uint256",
      },
      {
        internalType: "contract StakingPool[]",
        name: "_stakingPool",
        type: "address[]",
      },
      {
        internalType: "address",
        name: "_newGovernance",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_proposalStartTime",
        type: "uint256",
      },
      {
        internalType: "bool",
        name: "_isProposalExecuted",
        type: "bool",
      },
      {
        internalType: "uint256",
        name: "_newQuorum",
        type: "uint256",
      },
      {
        internalType: "string",
        name: "_proposalText",
        type: "string",
      },
      {
        internalType: "uint256",
        name: "_newMinBalance",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "enum Governance.PoolGroupName",
        name: "",
        type: "uint8",
      },
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "hardcodedStakingPools",
    outputs: [
      {
        internalType: "contract StakingPool",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "isOwner",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "isProposalExecuted",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "proposalId",
        type: "uint256",
      },
    ],
    name: "isProposalExecutible",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "proposalId",
        type: "uint256",
      },
    ],
    name: "isProposalOpen",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "lastIndex",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "lastVotedProposalStartTime",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "MIN_BALANCE_TO_INIT_PROPOSAL",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "newGovernances",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "newMinBalances",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "newQuorums",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "optionOneVotes",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "optionTwoVotes",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "pendingOwner",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "proposalStartTime",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "proposalTexts",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "QUORUM",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "RESULT_EXECUTION_ALLOWANCE_PERIOD",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "stakingPools",
    outputs: [
      {
        internalType: "contract StakingPool",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "totalDepositedTokens",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "TRUSTED_TOKEN_ADDRESS",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "VOTE_DURATION",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "votedForOption",
    outputs: [
      {
        internalType: "enum Governance.Option",
        name: "",
        type: "uint8",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "votesForProposalByAddress",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

window.ERC20_ABI = [
  { inputs: [], stateMutability: "nonpayable", type: "constructor" },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "_owner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "_spender",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "_value",
        type: "uint256",
      },
    ],
    name: "Approval",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "_from",
        type: "address",
      },
      { indexed: true, internalType: "address", name: "_to", type: "address" },
      {
        indexed: false,
        internalType: "uint256",
        name: "_value",
        type: "uint256",
      },
    ],
    name: "Transfer",
    type: "event",
  },
  {
    inputs: [],
    name: "acceptOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_owner", type: "address" },
      { internalType: "address", name: "_spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ internalType: "uint256", name: "remaining", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_spender", type: "address" },
      { internalType: "uint256", name: "_amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ internalType: "bool", name: "success", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "balance", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address payable", name: "_newOwner", type: "address" },
    ],
    name: "changeOwner",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "name",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_to", type: "address" },
      { internalType: "uint256", name: "_amount", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ internalType: "bool", name: "success", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_from", type: "address" },
      { internalType: "address", name: "_to", type: "address" },
      { internalType: "uint256", name: "_amount", type: "uint256" },
    ],
    name: "transferFrom",
    outputs: [{ internalType: "bool", name: "success", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  { stateMutability: "payable", type: "receive" },
];

window.TOKEN_ABI = [
  {
    inputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "Approval",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "from",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "Transfer",
    type: "event",
  },
  {
    constant: true,
    inputs: [
      {
        internalType: "address",
        name: "_owner",
        type: "address",
      },
      {
        internalType: "address",
        name: "_spender",
        type: "address",
      },
    ],
    name: "allowance",
    outputs: [
      {
        internalType: "uint256",
        name: "remaining",
        type: "uint256",
      },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      {
        internalType: "address",
        name: "_spender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_value",
        type: "uint256",
      },
    ],
    name: "approve",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      {
        internalType: "address",
        name: "_spender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_value",
        type: "uint256",
      },
      {
        internalType: "bytes",
        name: "_extraData",
        type: "bytes",
      },
    ],
    name: "approveAndCall",
    outputs: [
      {
        internalType: "bool",
        name: "success",
        type: "bool",
      },
    ],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [
      {
        internalType: "address",
        name: "_owner",
        type: "address",
      },
    ],
    name: "balanceOf",
    outputs: [
      {
        internalType: "uint256",
        name: "balance",
        type: "uint256",
      },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      {
        internalType: "address",
        name: "_spender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_subtractedValue",
        type: "uint256",
      },
    ],
    name: "decreaseApproval",
    outputs: [
      {
        internalType: "bool",
        name: "success",
        type: "bool",
      },
    ],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      {
        internalType: "address",
        name: "_spender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_addedValue",
        type: "uint256",
      },
    ],
    name: "increaseApproval",
    outputs: [
      {
        internalType: "bool",
        name: "success",
        type: "bool",
      },
    ],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "initialSupply",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "name",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "owner",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "symbol",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "totalSupply",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      {
        internalType: "address",
        name: "_to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_value",
        type: "uint256",
      },
    ],
    name: "transfer",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      {
        internalType: "address",
        name: "_tokenAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "_to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_amount",
        type: "uint256",
      },
    ],
    name: "transferAnyERC20Token",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      {
        internalType: "address",
        name: "_from",
        type: "address",
      },
      {
        internalType: "address",
        name: "_to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_value",
        type: "uint256",
      },
    ],
    name: "transferFrom",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      {
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "transferOwnership",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
];

window.UNISWAP_PAIR_ABI = [
  {
    type: "constructor",
    stateMutability: "nonpayable",
    payable: false,
    inputs: [],
  },
  {
    type: "event",
    name: "Approval",
    inputs: [
      {
        type: "address",
        name: "owner",
        internalType: "address",
        indexed: true,
      },
      {
        type: "address",
        name: "spender",
        internalType: "address",
        indexed: true,
      },
      {
        type: "uint256",
        name: "value",
        internalType: "uint256",
        indexed: false,
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Burn",
    inputs: [
      {
        type: "address",
        name: "sender",
        internalType: "address",
        indexed: true,
      },
      {
        type: "uint256",
        name: "amount0",
        internalType: "uint256",
        indexed: false,
      },
      {
        type: "uint256",
        name: "amount1",
        internalType: "uint256",
        indexed: false,
      },
      { type: "address", name: "to", internalType: "address", indexed: true },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Mint",
    inputs: [
      {
        type: "address",
        name: "sender",
        internalType: "address",
        indexed: true,
      },
      {
        type: "uint256",
        name: "amount0",
        internalType: "uint256",
        indexed: false,
      },
      {
        type: "uint256",
        name: "amount1",
        internalType: "uint256",
        indexed: false,
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Swap",
    inputs: [
      {
        type: "address",
        name: "sender",
        internalType: "address",
        indexed: true,
      },
      {
        type: "uint256",
        name: "amount0In",
        internalType: "uint256",
        indexed: false,
      },
      {
        type: "uint256",
        name: "amount1In",
        internalType: "uint256",
        indexed: false,
      },
      {
        type: "uint256",
        name: "amount0Out",
        internalType: "uint256",
        indexed: false,
      },
      {
        type: "uint256",
        name: "amount1Out",
        internalType: "uint256",
        indexed: false,
      },
      { type: "address", name: "to", internalType: "address", indexed: true },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Sync",
    inputs: [
      {
        type: "uint112",
        name: "reserve0",
        internalType: "uint112",
        indexed: false,
      },
      {
        type: "uint112",
        name: "reserve1",
        internalType: "uint112",
        indexed: false,
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { type: "address", name: "from", internalType: "address", indexed: true },
      { type: "address", name: "to", internalType: "address", indexed: true },
      {
        type: "uint256",
        name: "value",
        internalType: "uint256",
        indexed: false,
      },
    ],
    anonymous: false,
  },
  {
    type: "function",
    stateMutability: "view",
    payable: false,
    outputs: [{ type: "bytes32", name: "", internalType: "bytes32" }],
    name: "DOMAIN_SEPARATOR",
    inputs: [],
    constant: true,
  },
  {
    type: "function",
    stateMutability: "view",
    payable: false,
    outputs: [{ type: "uint256", name: "", internalType: "uint256" }],
    name: "MINIMUM_LIQUIDITY",
    inputs: [],
    constant: true,
  },
  {
    type: "function",
    stateMutability: "view",
    payable: false,
    outputs: [{ type: "bytes32", name: "", internalType: "bytes32" }],
    name: "PERMIT_TYPEHASH",
    inputs: [],
    constant: true,
  },
  {
    type: "function",
    stateMutability: "view",
    payable: false,
    outputs: [{ type: "uint256", name: "", internalType: "uint256" }],
    name: "allowance",
    inputs: [
      { type: "address", name: "", internalType: "address" },
      { type: "address", name: "", internalType: "address" },
    ],
    constant: true,
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    payable: false,
    outputs: [{ type: "bool", name: "", internalType: "bool" }],
    name: "approve",
    inputs: [
      { type: "address", name: "spender", internalType: "address" },
      { type: "uint256", name: "value", internalType: "uint256" },
    ],
    constant: false,
  },
  {
    type: "function",
    stateMutability: "view",
    payable: false,
    outputs: [{ type: "uint256", name: "", internalType: "uint256" }],
    name: "balanceOf",
    inputs: [{ type: "address", name: "", internalType: "address" }],
    constant: true,
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    payable: false,
    outputs: [
      { type: "uint256", name: "amount0", internalType: "uint256" },
      { type: "uint256", name: "amount1", internalType: "uint256" },
    ],
    name: "burn",
    inputs: [{ type: "address", name: "to", internalType: "address" }],
    constant: false,
  },
  {
    type: "function",
    stateMutability: "view",
    payable: false,
    outputs: [{ type: "uint8", name: "", internalType: "uint8" }],
    name: "decimals",
    inputs: [],
    constant: true,
  },
  {
    type: "function",
    stateMutability: "view",
    payable: false,
    outputs: [{ type: "address", name: "", internalType: "address" }],
    name: "factory",
    inputs: [],
    constant: true,
  },
  {
    type: "function",
    stateMutability: "view",
    payable: false,
    outputs: [
      { type: "uint112", name: "_reserve0", internalType: "uint112" },
      { type: "uint112", name: "_reserve1", internalType: "uint112" },
      { type: "uint32", name: "_blockTimestampLast", internalType: "uint32" },
    ],
    name: "getReserves",
    inputs: [],
    constant: true,
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    payable: false,
    outputs: [],
    name: "initialize",
    inputs: [
      { type: "address", name: "_token0", internalType: "address" },
      { type: "address", name: "_token1", internalType: "address" },
    ],
    constant: false,
  },
  {
    type: "function",
    stateMutability: "view",
    payable: false,
    outputs: [{ type: "uint256", name: "", internalType: "uint256" }],
    name: "kLast",
    inputs: [],
    constant: true,
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    payable: false,
    outputs: [{ type: "uint256", name: "liquidity", internalType: "uint256" }],
    name: "mint",
    inputs: [{ type: "address", name: "to", internalType: "address" }],
    constant: false,
  },
  {
    type: "function",
    stateMutability: "view",
    payable: false,
    outputs: [{ type: "string", name: "", internalType: "string" }],
    name: "name",
    inputs: [],
    constant: true,
  },
  {
    type: "function",
    stateMutability: "view",
    payable: false,
    outputs: [{ type: "uint256", name: "", internalType: "uint256" }],
    name: "nonces",
    inputs: [{ type: "address", name: "", internalType: "address" }],
    constant: true,
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    payable: false,
    outputs: [],
    name: "permit",
    inputs: [
      { type: "address", name: "owner", internalType: "address" },
      { type: "address", name: "spender", internalType: "address" },
      { type: "uint256", name: "value", internalType: "uint256" },
      { type: "uint256", name: "deadline", internalType: "uint256" },
      { type: "uint8", name: "v", internalType: "uint8" },
      { type: "bytes32", name: "r", internalType: "bytes32" },
      { type: "bytes32", name: "s", internalType: "bytes32" },
    ],
    constant: false,
  },
  {
    type: "function",
    stateMutability: "view",
    payable: false,
    outputs: [{ type: "uint256", name: "", internalType: "uint256" }],
    name: "price0CumulativeLast",
    inputs: [],
    constant: true,
  },
  {
    type: "function",
    stateMutability: "view",
    payable: false,
    outputs: [{ type: "uint256", name: "", internalType: "uint256" }],
    name: "price1CumulativeLast",
    inputs: [],
    constant: true,
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    payable: false,
    outputs: [],
    name: "skim",
    inputs: [{ type: "address", name: "to", internalType: "address" }],
    constant: false,
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    payable: false,
    outputs: [],
    name: "swap",
    inputs: [
      { type: "uint256", name: "amount0Out", internalType: "uint256" },
      { type: "uint256", name: "amount1Out", internalType: "uint256" },
      { type: "address", name: "to", internalType: "address" },
      { type: "bytes", name: "data", internalType: "bytes" },
    ],
    constant: false,
  },
  {
    type: "function",
    stateMutability: "view",
    payable: false,
    outputs: [{ type: "string", name: "", internalType: "string" }],
    name: "symbol",
    inputs: [],
    constant: true,
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    payable: false,
    outputs: [],
    name: "sync",
    inputs: [],
    constant: false,
  },
  {
    type: "function",
    stateMutability: "view",
    payable: false,
    outputs: [{ type: "address", name: "", internalType: "address" }],
    name: "token0",
    inputs: [],
    constant: true,
  },
  {
    type: "function",
    stateMutability: "view",
    payable: false,
    outputs: [{ type: "address", name: "", internalType: "address" }],
    name: "token1",
    inputs: [],
    constant: true,
  },
  {
    type: "function",
    stateMutability: "view",
    payable: false,
    outputs: [{ type: "uint256", name: "", internalType: "uint256" }],
    name: "totalSupply",
    inputs: [],
    constant: true,
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    payable: false,
    outputs: [{ type: "bool", name: "", internalType: "bool" }],
    name: "transfer",
    inputs: [
      { type: "address", name: "to", internalType: "address" },
      { type: "uint256", name: "value", internalType: "uint256" },
    ],
    constant: false,
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    payable: false,
    outputs: [{ type: "bool", name: "", internalType: "bool" }],
    name: "transferFrom",
    inputs: [
      { type: "address", name: "from", internalType: "address" },
      { type: "address", name: "to", internalType: "address" },
      { type: "uint256", name: "value", internalType: "uint256" },
    ],
    constant: false,
  },
];

window.UNISWAP_PAIRETH_ABI = [
  {
    inputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "Approval",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount0",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount1",
        type: "uint256",
      },
      { indexed: true, internalType: "address", name: "to", type: "address" },
    ],
    name: "Burn",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount0",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount1",
        type: "uint256",
      },
    ],
    name: "Mint",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount0In",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount1In",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount0Out",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount1Out",
        type: "uint256",
      },
      { indexed: true, internalType: "address", name: "to", type: "address" },
    ],
    name: "Swap",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint112",
        name: "reserve0",
        type: "uint112",
      },
      {
        indexed: false,
        internalType: "uint112",
        name: "reserve1",
        type: "uint112",
      },
    ],
    name: "Sync",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "from", type: "address" },
      { indexed: true, internalType: "address", name: "to", type: "address" },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "Transfer",
    type: "event",
  },
  {
    constant: true,
    inputs: [],
    name: "DOMAIN_SEPARATOR",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "MINIMUM_LIQUIDITY",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "PERMIT_TYPEHASH",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [
      { internalType: "address", name: "", type: "address" },
      { internalType: "address", name: "", type: "address" },
    ],
    name: "allowance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "value", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [{ internalType: "address", name: "to", type: "address" }],
    name: "burn",
    outputs: [
      { internalType: "uint256", name: "amount0", type: "uint256" },
      { internalType: "uint256", name: "amount1", type: "uint256" },
    ],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "factory",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "getReserves",
    outputs: [
      { internalType: "uint112", name: "_reserve0", type: "uint112" },
      { internalType: "uint112", name: "_reserve1", type: "uint112" },
      { internalType: "uint32", name: "_blockTimestampLast", type: "uint32" },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { internalType: "address", name: "_token0", type: "address" },
      { internalType: "address", name: "_token1", type: "address" },
    ],
    name: "initialize",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "kLast",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [{ internalType: "address", name: "to", type: "address" }],
    name: "mint",
    outputs: [{ internalType: "uint256", name: "liquidity", type: "uint256" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "name",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "nonces",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "value", type: "uint256" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
      { internalType: "uint8", name: "v", type: "uint8" },
      { internalType: "bytes32", name: "r", type: "bytes32" },
      { internalType: "bytes32", name: "s", type: "bytes32" },
    ],
    name: "permit",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "price0CumulativeLast",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "price1CumulativeLast",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [{ internalType: "address", name: "to", type: "address" }],
    name: "skim",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { internalType: "uint256", name: "amount0Out", type: "uint256" },
      { internalType: "uint256", name: "amount1Out", type: "uint256" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "bytes", name: "data", type: "bytes" },
    ],
    name: "swap",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "symbol",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [],
    name: "sync",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "token0",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "token1",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "totalSupply",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "value", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { internalType: "address", name: "from", type: "address" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "value", type: "uint256" },
    ],
    name: "transferFrom",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
];

window.LOCKER_ABI = [
  { type: "constructor", stateMutability: "nonpayable", inputs: [] },
  {
    type: "event",
    name: "Locked",
    inputs: [
      { type: "uint256", name: "id", internalType: "uint256", indexed: true },
      {
        type: "address",
        name: "token",
        internalType: "address",
        indexed: true,
      },
      {
        type: "address",
        name: "recipient",
        internalType: "address",
        indexed: true,
      },
      {
        type: "uint256",
        name: "amount",
        internalType: "uint256",
        indexed: false,
      },
      {
        type: "uint256",
        name: "unlockTimestamp",
        internalType: "uint256",
        indexed: false,
      },
      {
        type: "uint256",
        name: "platformTokensLocked",
        internalType: "uint256",
        indexed: false,
      },
      { type: "bool", name: "claimed", internalType: "bool", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "OwnershipTransferred",
    inputs: [
      {
        type: "address",
        name: "previousOwner",
        internalType: "address",
        indexed: true,
      },
      {
        type: "address",
        name: "newOwner",
        internalType: "address",
        indexed: true,
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Unlocked",
    inputs: [
      { type: "uint256", name: "id", internalType: "uint256", indexed: true },
      {
        type: "address",
        name: "token",
        internalType: "address",
        indexed: true,
      },
      {
        type: "address",
        name: "recipient",
        internalType: "address",
        indexed: true,
      },
      {
        type: "uint256",
        name: "amount",
        internalType: "uint256",
        indexed: false,
      },
      {
        type: "uint256",
        name: "unlockTimestamp",
        internalType: "uint256",
        indexed: false,
      },
      {
        type: "uint256",
        name: "platformTokensLocked",
        internalType: "uint256",
        indexed: false,
      },
      { type: "bool", name: "claimed", internalType: "bool", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "function",
    stateMutability: "view",
    outputs: [{ type: "uint256", name: "", internalType: "uint256" }],
    name: "MAX_LOCK_DURATION",
    inputs: [],
  },
  {
    type: "function",
    stateMutability: "view",
    outputs: [{ type: "uint256", name: "", internalType: "uint256" }],
    name: "MINIMUM_BASETOKEN_PERCENT_ETH_X_100",
    inputs: [],
  },
  {
    type: "function",
    stateMutability: "view",
    outputs: [{ type: "uint256", name: "", internalType: "uint256" }],
    name: "ONE_HUNDRED_X_100",
    inputs: [],
  },
  {
    type: "function",
    stateMutability: "view",
    outputs: [{ type: "address", name: "", internalType: "address" }],
    name: "PLATFORM_TOKEN",
    inputs: [],
  },
  {
    type: "function",
    stateMutability: "view",
    outputs: [{ type: "uint256", name: "", internalType: "uint256" }],
    name: "SLIPPAGE_TOLERANCE_X_100",
    inputs: [],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    outputs: [],
    name: "addBaseToken",
    inputs: [{ type: "address", name: "baseToken", internalType: "address" }],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    outputs: [],
    name: "claimEther",
    inputs: [],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    outputs: [],
    name: "claimExtraTokens",
    inputs: [{ type: "address", name: "token", internalType: "address" }],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    outputs: [],
    name: "claimUnlocked",
    inputs: [{ type: "uint256", name: "lockId", internalType: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "payable",
    outputs: [],
    name: "createLock",
    inputs: [
      { type: "address", name: "pair", internalType: "address" },
      { type: "address", name: "baseToken", internalType: "address" },
      { type: "uint256", name: "amount", internalType: "uint256" },
      { type: "uint256", name: "unlockTimestamp", internalType: "uint256" },
    ],
  },
  {
    type: "function",
    stateMutability: "view",
    outputs: [{ type: "uint256[]", name: "result", internalType: "uint256[]" }],
    name: "getActiveLockIds",
    inputs: [
      { type: "uint256", name: "startIndex", internalType: "uint256" },
      { type: "uint256", name: "endIndex", internalType: "uint256" },
    ],
  },
  {
    type: "function",
    stateMutability: "view",
    outputs: [{ type: "uint256[]", name: "result", internalType: "uint256[]" }],
    name: "getActiveLockIdsByRecipient",
    inputs: [
      { type: "address", name: "recipient", internalType: "address" },
      { type: "uint256", name: "startIndex", internalType: "uint256" },
      { type: "uint256", name: "endIndex", internalType: "uint256" },
    ],
  },
  {
    type: "function",
    stateMutability: "view",
    outputs: [{ type: "uint256[]", name: "result", internalType: "uint256[]" }],
    name: "getActiveLockIdsByToken",
    inputs: [
      { type: "address", name: "token", internalType: "address" },
      { type: "uint256", name: "startIndex", internalType: "uint256" },
      { type: "uint256", name: "endIndex", internalType: "uint256" },
    ],
  },
  {
    type: "function",
    stateMutability: "view",
    outputs: [{ type: "uint256", name: "", internalType: "uint256" }],
    name: "getActiveLockIdsLength",
    inputs: [],
  },
  {
    type: "function",
    stateMutability: "view",
    outputs: [{ type: "uint256", name: "", internalType: "uint256" }],
    name: "getActiveLockIdsLengthByRecipient",
    inputs: [{ type: "address", name: "recipient", internalType: "address" }],
  },
  {
    type: "function",
    stateMutability: "view",
    outputs: [{ type: "uint256", name: "", internalType: "uint256" }],
    name: "getActiveLockIdsLengthByToken",
    inputs: [{ type: "address", name: "token", internalType: "address" }],
  },
  {
    type: "function",
    stateMutability: "view",
    outputs: [{ type: "address[]", name: "result", internalType: "address[]" }],
    name: "getBaseTokens",
    inputs: [
      { type: "uint256", name: "startIndex", internalType: "uint256" },
      { type: "uint256", name: "endIndex", internalType: "uint256" },
    ],
  },
  {
    type: "function",
    stateMutability: "view",
    outputs: [{ type: "uint256", name: "", internalType: "uint256" }],
    name: "getBaseTokensLength",
    inputs: [],
  },
  {
    type: "function",
    stateMutability: "view",
    outputs: [{ type: "uint256[]", name: "result", internalType: "uint256[]" }],
    name: "getInactiveLockIds",
    inputs: [
      { type: "uint256", name: "startIndex", internalType: "uint256" },
      { type: "uint256", name: "endIndex", internalType: "uint256" },
    ],
  },
  {
    type: "function",
    stateMutability: "view",
    outputs: [{ type: "uint256[]", name: "result", internalType: "uint256[]" }],
    name: "getInactiveLockIdsByRecipient",
    inputs: [
      { type: "address", name: "recipient", internalType: "address" },
      { type: "uint256", name: "startIndex", internalType: "uint256" },
      { type: "uint256", name: "endIndex", internalType: "uint256" },
    ],
  },
  {
    type: "function",
    stateMutability: "view",
    outputs: [{ type: "uint256[]", name: "result", internalType: "uint256[]" }],
    name: "getInactiveLockIdsByToken",
    inputs: [
      { type: "address", name: "token", internalType: "address" },
      { type: "uint256", name: "startIndex", internalType: "uint256" },
      { type: "uint256", name: "endIndex", internalType: "uint256" },
    ],
  },
  {
    type: "function",
    stateMutability: "view",
    outputs: [{ type: "uint256", name: "", internalType: "uint256" }],
    name: "getInactiveLockIdsLength",
    inputs: [],
  },
  {
    type: "function",
    stateMutability: "view",
    outputs: [{ type: "uint256", name: "", internalType: "uint256" }],
    name: "getInactiveLockIdsLengthByRecipient",
    inputs: [{ type: "address", name: "recipient", internalType: "address" }],
  },
  {
    type: "function",
    stateMutability: "view",
    outputs: [{ type: "uint256", name: "", internalType: "uint256" }],
    name: "getInactiveLockIdsLengthByToken",
    inputs: [{ type: "address", name: "token", internalType: "address" }],
  },
  {
    type: "function",
    stateMutability: "view",
    outputs: [
      { type: "address", name: "token", internalType: "address" },
      { type: "uint256", name: "unlockTimestamp", internalType: "uint256" },
      { type: "uint256", name: "amount", internalType: "uint256" },
      { type: "address", name: "recipient", internalType: "address" },
      { type: "bool", name: "claimed", internalType: "bool" },
      {
        type: "uint256",
        name: "platformTokensLocked",
        internalType: "uint256",
      },
    ],
    name: "getLockById",
    inputs: [{ type: "uint256", name: "id", internalType: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "view",
    outputs: [{ type: "address[]", name: "tokens", internalType: "address[]" }],
    name: "getLockedTokens",
    inputs: [
      { type: "uint256", name: "startIndex", internalType: "uint256" },
      { type: "uint256", name: "endIndex", internalType: "uint256" },
    ],
  },
  {
    type: "function",
    stateMutability: "view",
    outputs: [{ type: "uint256", name: "", internalType: "uint256" }],
    name: "getLockedTokensLength",
    inputs: [],
  },
  {
    type: "function",
    stateMutability: "view",
    outputs: [
      { type: "uint256[]", name: "_ids", internalType: "uint256[]" },
      { type: "address[]", name: "tokens", internalType: "address[]" },
      {
        type: "uint256[]",
        name: "unlockTimestamps",
        internalType: "uint256[]",
      },
      { type: "uint256[]", name: "amounts", internalType: "uint256[]" },
      { type: "address[]", name: "recipients", internalType: "address[]" },
      { type: "bool[]", name: "claimeds", internalType: "bool[]" },
      {
        type: "uint256[]",
        name: "platformTokensLockeds",
        internalType: "uint256[]",
      },
    ],
    name: "getLocksByIds",
    inputs: [{ type: "uint256[]", name: "ids", internalType: "uint256[]" }],
  },
  {
    type: "function",
    stateMutability: "view",
    outputs: [{ type: "uint256", name: "", internalType: "uint256" }],
    name: "getMinLockCreationFeeInWei",
    inputs: [
      { type: "address", name: "pair", internalType: "address" },
      { type: "address", name: "baseToken", internalType: "address" },
      { type: "uint256", name: "amount", internalType: "uint256" },
    ],
  },
  {
    type: "function",
    stateMutability: "view",
    outputs: [
      { type: "uint256[]", name: "balances", internalType: "uint256[]" },
    ],
    name: "getTokensBalances",
    inputs: [{ type: "address[]", name: "tokens", internalType: "address[]" }],
  },
  {
    type: "function",
    stateMutability: "view",
    outputs: [
      { type: "address", name: "token", internalType: "address" },
      { type: "uint256", name: "unlockTimestamp", internalType: "uint256" },
      { type: "uint256", name: "amount", internalType: "uint256" },
      { type: "address", name: "recipient", internalType: "address" },
      { type: "bool", name: "claimed", internalType: "bool" },
      {
        type: "uint256",
        name: "platformTokensLocked",
        internalType: "uint256",
      },
    ],
    name: "locks",
    inputs: [{ type: "uint256", name: "", internalType: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "view",
    outputs: [{ type: "uint256", name: "", internalType: "uint256" }],
    name: "locksLength",
    inputs: [],
  },
  {
    type: "function",
    stateMutability: "view",
    outputs: [{ type: "address", name: "", internalType: "address" }],
    name: "owner",
    inputs: [],
  },
  {
    type: "function",
    stateMutability: "view",
    outputs: [
      { type: "address", name: "", internalType: "contract IPangolinRouter02" },
    ],
    name: "pangolinRouter",
    inputs: [],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    outputs: [],
    name: "removeBaseToken",
    inputs: [{ type: "address", name: "baseToken", internalType: "address" }],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    outputs: [],
    name: "renounceOwnership",
    inputs: [],
  },
  {
    type: "function",
    stateMutability: "view",
    outputs: [{ type: "uint256", name: "", internalType: "uint256" }],
    name: "tokenBalances",
    inputs: [{ type: "address", name: "", internalType: "address" }],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    outputs: [],
    name: "transferOwnership",
    inputs: [{ type: "address", name: "newOwner", internalType: "address" }],
  },
  { type: "receive", stateMutability: "payable" },
];

window.LOCKERETH_ABI = [
  { inputs: [], stateMutability: "nonpayable", type: "constructor" },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "id", type: "uint256" },
      {
        indexed: true,
        internalType: "address",
        name: "token",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "recipient",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "unlockTimestamp",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "platformTokensLocked",
        type: "uint256",
      },
      { indexed: false, internalType: "bool", name: "claimed", type: "bool" },
    ],
    name: "Locked",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "id", type: "uint256" },
      {
        indexed: true,
        internalType: "address",
        name: "token",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "recipient",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "unlockTimestamp",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "platformTokensLocked",
        type: "uint256",
      },
      { indexed: false, internalType: "bool", name: "claimed", type: "bool" },
    ],
    name: "Unlocked",
    type: "event",
  },
  {
    inputs: [],
    name: "MAX_LOCK_DURATION",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "MINIMUM_BASETOKEN_PERCENT_ETH_X_100",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "ONE_HUNDRED_X_100",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "PLATFORM_TOKEN",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "SLIPPAGE_TOLERANCE_X_100",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "baseToken", type: "address" }],
    name: "addBaseToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "claimEther",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "token", type: "address" }],
    name: "claimExtraTokens",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "lockId", type: "uint256" }],
    name: "claimUnlocked",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "pair", type: "address" },
      { internalType: "address", name: "baseToken", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
      { internalType: "uint256", name: "unlockTimestamp", type: "uint256" },
    ],
    name: "createLock",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "startIndex", type: "uint256" },
      { internalType: "uint256", name: "endIndex", type: "uint256" },
    ],
    name: "getActiveLockIds",
    outputs: [{ internalType: "uint256[]", name: "result", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "recipient", type: "address" },
      { internalType: "uint256", name: "startIndex", type: "uint256" },
      { internalType: "uint256", name: "endIndex", type: "uint256" },
    ],
    name: "getActiveLockIdsByRecipient",
    outputs: [{ internalType: "uint256[]", name: "result", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "uint256", name: "startIndex", type: "uint256" },
      { internalType: "uint256", name: "endIndex", type: "uint256" },
    ],
    name: "getActiveLockIdsByToken",
    outputs: [{ internalType: "uint256[]", name: "result", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getActiveLockIdsLength",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "recipient", type: "address" }],
    name: "getActiveLockIdsLengthByRecipient",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "token", type: "address" }],
    name: "getActiveLockIdsLengthByToken",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "startIndex", type: "uint256" },
      { internalType: "uint256", name: "endIndex", type: "uint256" },
    ],
    name: "getBaseTokens",
    outputs: [{ internalType: "address[]", name: "result", type: "address[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getBaseTokensLength",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "startIndex", type: "uint256" },
      { internalType: "uint256", name: "endIndex", type: "uint256" },
    ],
    name: "getInactiveLockIds",
    outputs: [{ internalType: "uint256[]", name: "result", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "recipient", type: "address" },
      { internalType: "uint256", name: "startIndex", type: "uint256" },
      { internalType: "uint256", name: "endIndex", type: "uint256" },
    ],
    name: "getInactiveLockIdsByRecipient",
    outputs: [{ internalType: "uint256[]", name: "result", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "uint256", name: "startIndex", type: "uint256" },
      { internalType: "uint256", name: "endIndex", type: "uint256" },
    ],
    name: "getInactiveLockIdsByToken",
    outputs: [{ internalType: "uint256[]", name: "result", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getInactiveLockIdsLength",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "recipient", type: "address" }],
    name: "getInactiveLockIdsLengthByRecipient",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "token", type: "address" }],
    name: "getInactiveLockIdsLengthByToken",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "id", type: "uint256" }],
    name: "getLockById",
    outputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "uint256", name: "unlockTimestamp", type: "uint256" },
      { internalType: "uint256", name: "amount", type: "uint256" },
      { internalType: "address", name: "recipient", type: "address" },
      { internalType: "bool", name: "claimed", type: "bool" },
      {
        internalType: "uint256",
        name: "platformTokensLocked",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "startIndex", type: "uint256" },
      { internalType: "uint256", name: "endIndex", type: "uint256" },
    ],
    name: "getLockedTokens",
    outputs: [{ internalType: "address[]", name: "tokens", type: "address[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getLockedTokensLength",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256[]", name: "ids", type: "uint256[]" }],
    name: "getLocksByIds",
    outputs: [
      { internalType: "uint256[]", name: "_ids", type: "uint256[]" },
      { internalType: "address[]", name: "tokens", type: "address[]" },
      {
        internalType: "uint256[]",
        name: "unlockTimestamps",
        type: "uint256[]",
      },
      { internalType: "uint256[]", name: "amounts", type: "uint256[]" },
      { internalType: "address[]", name: "recipients", type: "address[]" },
      { internalType: "bool[]", name: "claimeds", type: "bool[]" },
      {
        internalType: "uint256[]",
        name: "platformTokensLockeds",
        type: "uint256[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "pair", type: "address" },
      { internalType: "address", name: "baseToken", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "getMinLockCreationFeeInWei",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address[]", name: "tokens", type: "address[]" }],
    name: "getTokensBalances",
    outputs: [
      { internalType: "uint256[]", name: "balances", type: "uint256[]" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "locks",
    outputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "uint256", name: "unlockTimestamp", type: "uint256" },
      { internalType: "uint256", name: "amount", type: "uint256" },
      { internalType: "address", name: "recipient", type: "address" },
      { internalType: "bool", name: "claimed", type: "bool" },
      {
        internalType: "uint256",
        name: "platformTokensLocked",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "locksLength",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "baseToken", type: "address" }],
    name: "removeBaseToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "renounceOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "tokenBalances",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "newOwner", type: "address" }],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "uniswapRouterV2",
    outputs: [
      {
        internalType: "contract IUniswapV2Router02",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  { stateMutability: "payable", type: "receive" },
];

window.SUBSCRIPTION_ABI = [
  { inputs: [], stateMutability: "nonpayable", type: "constructor" },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "platformTokenAmount",
        type: "uint256",
      },
    ],
    name: "Subscribe",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "amountDai",
        type: "uint256",
      },
    ],
    name: "SubscriptionFeeSet",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "tokenAddress",
        type: "address",
      },
    ],
    name: "SupportedTokenAdded",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "tokenAddress",
        type: "address",
      },
    ],
    name: "SupportedTokenRemoved",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "accountAddress",
        type: "address",
      },
    ],
    name: "UnsubscribeAddress",
    type: "event",
  },
  {
    inputs: [],
    name: "ONE_HUNDRED_X_100",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "SLIPPAGE_TOLERANCE_X_100",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "TRUSTED_DAI_ADDRESS",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "TRUSTED_PLATFORM_TOKEN_ADDRESS",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "tokenAddress", type: "address" },
    ],
    name: "addSupportedToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "tokenAddress", type: "address" },
    ],
    name: "getEstimatedTokenSubscriptionAmount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "isTokenSupported",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "tokenAddress", type: "address" },
    ],
    name: "removeSupportedToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "renounceOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "newSubscriptionFeeInDai",
        type: "uint256",
      },
    ],
    name: "setSubscriptionFee",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "tokenAddress", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "subscribe",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "subscriptionFeeInDai",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "subscriptionPlatformTokenAmount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "address", name: "recipient", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "transferAnyERC20Token",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "newOwner", type: "address" }],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "uniswapRouterV2",
    outputs: [
      { internalType: "contract IUniswapV2Router", name: "", type: "address" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "accountAddress", type: "address" },
    ],
    name: "unsubscribeAddress",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

window.SUBSCRIPTIONETH_ABI = [
  { inputs: [], stateMutability: "nonpayable", type: "constructor" },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "platformTokenAmount",
        type: "uint256",
      },
    ],
    name: "Subscribe",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "amountDai",
        type: "uint256",
      },
    ],
    name: "SubscriptionFeeSet",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "tokenAddress",
        type: "address",
      },
    ],
    name: "SupportedTokenAdded",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "tokenAddress",
        type: "address",
      },
    ],
    name: "SupportedTokenRemoved",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "platformTokenAmount",
        type: "uint256",
      },
    ],
    name: "Unsubscribe",
    type: "event",
  },
  {
    inputs: [],
    name: "ONE_HUNDRED_X_100",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "SLIPPAGE_TOLERANCE_X_100",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "TRUSTED_DAI_ADDRESS",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "TRUSTED_PLATFORM_TOKEN_ADDRESS",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "tokenAddress", type: "address" },
    ],
    name: "addSupportedToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "tokenAddress", type: "address" },
    ],
    name: "getEstimatedTokenSubscriptionAmount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "isTokenSupported",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "tokenAddress", type: "address" },
    ],
    name: "removeSupportedToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "renounceOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "newSubscriptionFeeInDai",
        type: "uint256",
      },
    ],
    name: "setSubscriptionFee",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "tokenAddress", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "subscribe",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "subscriptionFeeInDai",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "subscriptionPlatformTokenAmount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "newOwner", type: "address" }],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "uniswapRouterV2",
    outputs: [
      { internalType: "contract IUniswapV2Router", name: "", type: "address" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "unsubscribe",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

window.SUBSCRIPTIONBNB_ABI = [
  { inputs: [], stateMutability: "nonpayable", type: "constructor" },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "platformTokenAmount",
        type: "uint256",
      },
    ],
    name: "Subscribe",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "amountDai",
        type: "uint256",
      },
    ],
    name: "SubscriptionFeeSet",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "tokenAddress",
        type: "address",
      },
    ],
    name: "SupportedTokenAdded",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "tokenAddress",
        type: "address",
      },
    ],
    name: "SupportedTokenRemoved",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "accountAddress",
        type: "address",
      },
    ],
    name: "UnsubscribeAddress",
    type: "event",
  },
  {
    inputs: [],
    name: "ONE_HUNDRED_X_100",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "SLIPPAGE_TOLERANCE_X_100",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "TRUSTED_DAI_ADDRESS",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "TRUSTED_PLATFORM_TOKEN_ADDRESS",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "tokenAddress", type: "address" },
    ],
    name: "addSupportedToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "tokenAddress", type: "address" },
    ],
    name: "getEstimatedTokenSubscriptionAmount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "isTokenSupported",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "tokenAddress", type: "address" },
    ],
    name: "removeSupportedToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "renounceOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "newSubscriptionFeeInDai",
        type: "uint256",
      },
    ],
    name: "setSubscriptionFee",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "tokenAddress", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "subscribe",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "subscriptionFeeInDai",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "subscriptionPlatformTokenAmount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "address", name: "recipient", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "transferAnyERC20Token",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "newOwner", type: "address" }],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "uniswapRouterV2",
    outputs: [
      { internalType: "contract IUniswapV2Router", name: "", type: "address" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "accountAddress", type: "address" },
    ],
    name: "unsubscribeAddress",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

window.PANGOLIN_ROUTER_ABI = [
  {
    type: "constructor",
    stateMutability: "nonpayable",
    inputs: [
      { type: "address", name: "_factory", internalType: "address" },
      { type: "address", name: "_WAVAX", internalType: "address" },
    ],
  },
  {
    type: "function",
    stateMutability: "view",
    outputs: [{ type: "address", name: "", internalType: "address" }],
    name: "WAVAX",
    inputs: [],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    outputs: [
      { type: "uint256", name: "amountA", internalType: "uint256" },
      { type: "uint256", name: "amountB", internalType: "uint256" },
      { type: "uint256", name: "liquidity", internalType: "uint256" },
    ],
    name: "addLiquidity",
    inputs: [
      { type: "address", name: "tokenA", internalType: "address" },
      { type: "address", name: "tokenB", internalType: "address" },
      { type: "uint256", name: "amountADesired", internalType: "uint256" },
      { type: "uint256", name: "amountBDesired", internalType: "uint256" },
      { type: "uint256", name: "amountAMin", internalType: "uint256" },
      { type: "uint256", name: "amountBMin", internalType: "uint256" },
      { type: "address", name: "to", internalType: "address" },
      { type: "uint256", name: "deadline", internalType: "uint256" },
    ],
  },
  {
    type: "function",
    stateMutability: "payable",
    outputs: [
      { type: "uint256", name: "amountToken", internalType: "uint256" },
      { type: "uint256", name: "amountAVAX", internalType: "uint256" },
      { type: "uint256", name: "liquidity", internalType: "uint256" },
    ],
    name: "addLiquidityAVAX",
    inputs: [
      { type: "address", name: "token", internalType: "address" },
      { type: "uint256", name: "amountTokenDesired", internalType: "uint256" },
      { type: "uint256", name: "amountTokenMin", internalType: "uint256" },
      { type: "uint256", name: "amountAVAXMin", internalType: "uint256" },
      { type: "address", name: "to", internalType: "address" },
      { type: "uint256", name: "deadline", internalType: "uint256" },
    ],
  },
  {
    type: "function",
    stateMutability: "view",
    outputs: [{ type: "address", name: "", internalType: "address" }],
    name: "factory",
    inputs: [],
  },
  {
    type: "function",
    stateMutability: "pure",
    outputs: [{ type: "uint256", name: "amountIn", internalType: "uint256" }],
    name: "getAmountIn",
    inputs: [
      { type: "uint256", name: "amountOut", internalType: "uint256" },
      { type: "uint256", name: "reserveIn", internalType: "uint256" },
      { type: "uint256", name: "reserveOut", internalType: "uint256" },
    ],
  },
  {
    type: "function",
    stateMutability: "pure",
    outputs: [{ type: "uint256", name: "amountOut", internalType: "uint256" }],
    name: "getAmountOut",
    inputs: [
      { type: "uint256", name: "amountIn", internalType: "uint256" },
      { type: "uint256", name: "reserveIn", internalType: "uint256" },
      { type: "uint256", name: "reserveOut", internalType: "uint256" },
    ],
  },
  {
    type: "function",
    stateMutability: "view",
    outputs: [
      { type: "uint256[]", name: "amounts", internalType: "uint256[]" },
    ],
    name: "getAmountsIn",
    inputs: [
      { type: "uint256", name: "amountOut", internalType: "uint256" },
      { type: "address[]", name: "path", internalType: "address[]" },
    ],
  },
  {
    type: "function",
    stateMutability: "view",
    outputs: [
      { type: "uint256[]", name: "amounts", internalType: "uint256[]" },
    ],
    name: "getAmountsOut",
    inputs: [
      { type: "uint256", name: "amountIn", internalType: "uint256" },
      { type: "address[]", name: "path", internalType: "address[]" },
    ],
  },
  {
    type: "function",
    stateMutability: "pure",
    outputs: [{ type: "uint256", name: "amountB", internalType: "uint256" }],
    name: "quote",
    inputs: [
      { type: "uint256", name: "amountA", internalType: "uint256" },
      { type: "uint256", name: "reserveA", internalType: "uint256" },
      { type: "uint256", name: "reserveB", internalType: "uint256" },
    ],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    outputs: [
      { type: "uint256", name: "amountA", internalType: "uint256" },
      { type: "uint256", name: "amountB", internalType: "uint256" },
    ],
    name: "removeLiquidity",
    inputs: [
      { type: "address", name: "tokenA", internalType: "address" },
      { type: "address", name: "tokenB", internalType: "address" },
      { type: "uint256", name: "liquidity", internalType: "uint256" },
      { type: "uint256", name: "amountAMin", internalType: "uint256" },
      { type: "uint256", name: "amountBMin", internalType: "uint256" },
      { type: "address", name: "to", internalType: "address" },
      { type: "uint256", name: "deadline", internalType: "uint256" },
    ],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    outputs: [
      { type: "uint256", name: "amountToken", internalType: "uint256" },
      { type: "uint256", name: "amountAVAX", internalType: "uint256" },
    ],
    name: "removeLiquidityAVAX",
    inputs: [
      { type: "address", name: "token", internalType: "address" },
      { type: "uint256", name: "liquidity", internalType: "uint256" },
      { type: "uint256", name: "amountTokenMin", internalType: "uint256" },
      { type: "uint256", name: "amountAVAXMin", internalType: "uint256" },
      { type: "address", name: "to", internalType: "address" },
      { type: "uint256", name: "deadline", internalType: "uint256" },
    ],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    outputs: [{ type: "uint256", name: "amountAVAX", internalType: "uint256" }],
    name: "removeLiquidityAVAXSupportingFeeOnTransferTokens",
    inputs: [
      { type: "address", name: "token", internalType: "address" },
      { type: "uint256", name: "liquidity", internalType: "uint256" },
      { type: "uint256", name: "amountTokenMin", internalType: "uint256" },
      { type: "uint256", name: "amountAVAXMin", internalType: "uint256" },
      { type: "address", name: "to", internalType: "address" },
      { type: "uint256", name: "deadline", internalType: "uint256" },
    ],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    outputs: [
      { type: "uint256", name: "amountToken", internalType: "uint256" },
      { type: "uint256", name: "amountAVAX", internalType: "uint256" },
    ],
    name: "removeLiquidityAVAXWithPermit",
    inputs: [
      { type: "address", name: "token", internalType: "address" },
      { type: "uint256", name: "liquidity", internalType: "uint256" },
      { type: "uint256", name: "amountTokenMin", internalType: "uint256" },
      { type: "uint256", name: "amountAVAXMin", internalType: "uint256" },
      { type: "address", name: "to", internalType: "address" },
      { type: "uint256", name: "deadline", internalType: "uint256" },
      { type: "bool", name: "approveMax", internalType: "bool" },
      { type: "uint8", name: "v", internalType: "uint8" },
      { type: "bytes32", name: "r", internalType: "bytes32" },
      { type: "bytes32", name: "s", internalType: "bytes32" },
    ],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    outputs: [{ type: "uint256", name: "amountAVAX", internalType: "uint256" }],
    name: "removeLiquidityAVAXWithPermitSupportingFeeOnTransferTokens",
    inputs: [
      { type: "address", name: "token", internalType: "address" },
      { type: "uint256", name: "liquidity", internalType: "uint256" },
      { type: "uint256", name: "amountTokenMin", internalType: "uint256" },
      { type: "uint256", name: "amountAVAXMin", internalType: "uint256" },
      { type: "address", name: "to", internalType: "address" },
      { type: "uint256", name: "deadline", internalType: "uint256" },
      { type: "bool", name: "approveMax", internalType: "bool" },
      { type: "uint8", name: "v", internalType: "uint8" },
      { type: "bytes32", name: "r", internalType: "bytes32" },
      { type: "bytes32", name: "s", internalType: "bytes32" },
    ],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    outputs: [
      { type: "uint256", name: "amountA", internalType: "uint256" },
      { type: "uint256", name: "amountB", internalType: "uint256" },
    ],
    name: "removeLiquidityWithPermit",
    inputs: [
      { type: "address", name: "tokenA", internalType: "address" },
      { type: "address", name: "tokenB", internalType: "address" },
      { type: "uint256", name: "liquidity", internalType: "uint256" },
      { type: "uint256", name: "amountAMin", internalType: "uint256" },
      { type: "uint256", name: "amountBMin", internalType: "uint256" },
      { type: "address", name: "to", internalType: "address" },
      { type: "uint256", name: "deadline", internalType: "uint256" },
      { type: "bool", name: "approveMax", internalType: "bool" },
      { type: "uint8", name: "v", internalType: "uint8" },
      { type: "bytes32", name: "r", internalType: "bytes32" },
      { type: "bytes32", name: "s", internalType: "bytes32" },
    ],
  },
  {
    type: "function",
    stateMutability: "payable",
    outputs: [
      { type: "uint256[]", name: "amounts", internalType: "uint256[]" },
    ],
    name: "swapAVAXForExactTokens",
    inputs: [
      { type: "uint256", name: "amountOut", internalType: "uint256" },
      { type: "address[]", name: "path", internalType: "address[]" },
      { type: "address", name: "to", internalType: "address" },
      { type: "uint256", name: "deadline", internalType: "uint256" },
    ],
  },
  {
    type: "function",
    stateMutability: "payable",
    outputs: [
      { type: "uint256[]", name: "amounts", internalType: "uint256[]" },
    ],
    name: "swapExactAVAXForTokens",
    inputs: [
      { type: "uint256", name: "amountOutMin", internalType: "uint256" },
      { type: "address[]", name: "path", internalType: "address[]" },
      { type: "address", name: "to", internalType: "address" },
      { type: "uint256", name: "deadline", internalType: "uint256" },
    ],
  },
  {
    type: "function",
    stateMutability: "payable",
    outputs: [],
    name: "swapExactAVAXForTokensSupportingFeeOnTransferTokens",
    inputs: [
      { type: "uint256", name: "amountOutMin", internalType: "uint256" },
      { type: "address[]", name: "path", internalType: "address[]" },
      { type: "address", name: "to", internalType: "address" },
      { type: "uint256", name: "deadline", internalType: "uint256" },
    ],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    outputs: [
      { type: "uint256[]", name: "amounts", internalType: "uint256[]" },
    ],
    name: "swapExactTokensForAVAX",
    inputs: [
      { type: "uint256", name: "amountIn", internalType: "uint256" },
      { type: "uint256", name: "amountOutMin", internalType: "uint256" },
      { type: "address[]", name: "path", internalType: "address[]" },
      { type: "address", name: "to", internalType: "address" },
      { type: "uint256", name: "deadline", internalType: "uint256" },
    ],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    outputs: [],
    name: "swapExactTokensForAVAXSupportingFeeOnTransferTokens",
    inputs: [
      { type: "uint256", name: "amountIn", internalType: "uint256" },
      { type: "uint256", name: "amountOutMin", internalType: "uint256" },
      { type: "address[]", name: "path", internalType: "address[]" },
      { type: "address", name: "to", internalType: "address" },
      { type: "uint256", name: "deadline", internalType: "uint256" },
    ],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    outputs: [
      { type: "uint256[]", name: "amounts", internalType: "uint256[]" },
    ],
    name: "swapExactTokensForTokens",
    inputs: [
      { type: "uint256", name: "amountIn", internalType: "uint256" },
      { type: "uint256", name: "amountOutMin", internalType: "uint256" },
      { type: "address[]", name: "path", internalType: "address[]" },
      { type: "address", name: "to", internalType: "address" },
      { type: "uint256", name: "deadline", internalType: "uint256" },
    ],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    outputs: [],
    name: "swapExactTokensForTokensSupportingFeeOnTransferTokens",
    inputs: [
      { type: "uint256", name: "amountIn", internalType: "uint256" },
      { type: "uint256", name: "amountOutMin", internalType: "uint256" },
      { type: "address[]", name: "path", internalType: "address[]" },
      { type: "address", name: "to", internalType: "address" },
      { type: "uint256", name: "deadline", internalType: "uint256" },
    ],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    outputs: [
      { type: "uint256[]", name: "amounts", internalType: "uint256[]" },
    ],
    name: "swapTokensForExactAVAX",
    inputs: [
      { type: "uint256", name: "amountOut", internalType: "uint256" },
      { type: "uint256", name: "amountInMax", internalType: "uint256" },
      { type: "address[]", name: "path", internalType: "address[]" },
      { type: "address", name: "to", internalType: "address" },
      { type: "uint256", name: "deadline", internalType: "uint256" },
    ],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    outputs: [
      { type: "uint256[]", name: "amounts", internalType: "uint256[]" },
    ],
    name: "swapTokensForExactTokens",
    inputs: [
      { type: "uint256", name: "amountOut", internalType: "uint256" },
      { type: "uint256", name: "amountInMax", internalType: "uint256" },
      { type: "address[]", name: "path", internalType: "address[]" },
      { type: "address", name: "to", internalType: "address" },
      { type: "uint256", name: "deadline", internalType: "uint256" },
    ],
  },
  { type: "receive", stateMutability: "payable" },
];

window.UNISWAP_ROUTER_ABI = [
  {
    inputs: [
      { internalType: "address", name: "_factory", type: "address" },
      { internalType: "address", name: "_WETH", type: "address" },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [],
    name: "WETH",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "tokenA", type: "address" },
      { internalType: "address", name: "tokenB", type: "address" },
      { internalType: "uint256", name: "amountADesired", type: "uint256" },
      { internalType: "uint256", name: "amountBDesired", type: "uint256" },
      { internalType: "uint256", name: "amountAMin", type: "uint256" },
      { internalType: "uint256", name: "amountBMin", type: "uint256" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
    ],
    name: "addLiquidity",
    outputs: [
      { internalType: "uint256", name: "amountA", type: "uint256" },
      { internalType: "uint256", name: "amountB", type: "uint256" },
      { internalType: "uint256", name: "liquidity", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "uint256", name: "amountTokenDesired", type: "uint256" },
      { internalType: "uint256", name: "amountTokenMin", type: "uint256" },
      { internalType: "uint256", name: "amountETHMin", type: "uint256" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
    ],
    name: "addLiquidityETH",
    outputs: [
      { internalType: "uint256", name: "amountToken", type: "uint256" },
      { internalType: "uint256", name: "amountETH", type: "uint256" },
      { internalType: "uint256", name: "liquidity", type: "uint256" },
    ],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [],
    name: "factory",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountOut", type: "uint256" },
      { internalType: "uint256", name: "reserveIn", type: "uint256" },
      { internalType: "uint256", name: "reserveOut", type: "uint256" },
    ],
    name: "getAmountIn",
    outputs: [{ internalType: "uint256", name: "amountIn", type: "uint256" }],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountIn", type: "uint256" },
      { internalType: "uint256", name: "reserveIn", type: "uint256" },
      { internalType: "uint256", name: "reserveOut", type: "uint256" },
    ],
    name: "getAmountOut",
    outputs: [{ internalType: "uint256", name: "amountOut", type: "uint256" }],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountOut", type: "uint256" },
      { internalType: "address[]", name: "path", type: "address[]" },
    ],
    name: "getAmountsIn",
    outputs: [
      { internalType: "uint256[]", name: "amounts", type: "uint256[]" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountIn", type: "uint256" },
      { internalType: "address[]", name: "path", type: "address[]" },
    ],
    name: "getAmountsOut",
    outputs: [
      { internalType: "uint256[]", name: "amounts", type: "uint256[]" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountA", type: "uint256" },
      { internalType: "uint256", name: "reserveA", type: "uint256" },
      { internalType: "uint256", name: "reserveB", type: "uint256" },
    ],
    name: "quote",
    outputs: [{ internalType: "uint256", name: "amountB", type: "uint256" }],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "tokenA", type: "address" },
      { internalType: "address", name: "tokenB", type: "address" },
      { internalType: "uint256", name: "liquidity", type: "uint256" },
      { internalType: "uint256", name: "amountAMin", type: "uint256" },
      { internalType: "uint256", name: "amountBMin", type: "uint256" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
    ],
    name: "removeLiquidity",
    outputs: [
      { internalType: "uint256", name: "amountA", type: "uint256" },
      { internalType: "uint256", name: "amountB", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "uint256", name: "liquidity", type: "uint256" },
      { internalType: "uint256", name: "amountTokenMin", type: "uint256" },
      { internalType: "uint256", name: "amountETHMin", type: "uint256" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
    ],
    name: "removeLiquidityETH",
    outputs: [
      { internalType: "uint256", name: "amountToken", type: "uint256" },
      { internalType: "uint256", name: "amountETH", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "uint256", name: "liquidity", type: "uint256" },
      { internalType: "uint256", name: "amountTokenMin", type: "uint256" },
      { internalType: "uint256", name: "amountETHMin", type: "uint256" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
    ],
    name: "removeLiquidityETHSupportingFeeOnTransferTokens",
    outputs: [{ internalType: "uint256", name: "amountETH", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "uint256", name: "liquidity", type: "uint256" },
      { internalType: "uint256", name: "amountTokenMin", type: "uint256" },
      { internalType: "uint256", name: "amountETHMin", type: "uint256" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
      { internalType: "bool", name: "approveMax", type: "bool" },
      { internalType: "uint8", name: "v", type: "uint8" },
      { internalType: "bytes32", name: "r", type: "bytes32" },
      { internalType: "bytes32", name: "s", type: "bytes32" },
    ],
    name: "removeLiquidityETHWithPermit",
    outputs: [
      { internalType: "uint256", name: "amountToken", type: "uint256" },
      { internalType: "uint256", name: "amountETH", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "uint256", name: "liquidity", type: "uint256" },
      { internalType: "uint256", name: "amountTokenMin", type: "uint256" },
      { internalType: "uint256", name: "amountETHMin", type: "uint256" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
      { internalType: "bool", name: "approveMax", type: "bool" },
      { internalType: "uint8", name: "v", type: "uint8" },
      { internalType: "bytes32", name: "r", type: "bytes32" },
      { internalType: "bytes32", name: "s", type: "bytes32" },
    ],
    name: "removeLiquidityETHWithPermitSupportingFeeOnTransferTokens",
    outputs: [{ internalType: "uint256", name: "amountETH", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "tokenA", type: "address" },
      { internalType: "address", name: "tokenB", type: "address" },
      { internalType: "uint256", name: "liquidity", type: "uint256" },
      { internalType: "uint256", name: "amountAMin", type: "uint256" },
      { internalType: "uint256", name: "amountBMin", type: "uint256" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
      { internalType: "bool", name: "approveMax", type: "bool" },
      { internalType: "uint8", name: "v", type: "uint8" },
      { internalType: "bytes32", name: "r", type: "bytes32" },
      { internalType: "bytes32", name: "s", type: "bytes32" },
    ],
    name: "removeLiquidityWithPermit",
    outputs: [
      { internalType: "uint256", name: "amountA", type: "uint256" },
      { internalType: "uint256", name: "amountB", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountOut", type: "uint256" },
      { internalType: "address[]", name: "path", type: "address[]" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
    ],
    name: "swapETHForExactTokens",
    outputs: [
      { internalType: "uint256[]", name: "amounts", type: "uint256[]" },
    ],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountOutMin", type: "uint256" },
      { internalType: "address[]", name: "path", type: "address[]" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
    ],
    name: "swapExactETHForTokens",
    outputs: [
      { internalType: "uint256[]", name: "amounts", type: "uint256[]" },
    ],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountOutMin", type: "uint256" },
      { internalType: "address[]", name: "path", type: "address[]" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
    ],
    name: "swapExactETHForTokensSupportingFeeOnTransferTokens",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountIn", type: "uint256" },
      { internalType: "uint256", name: "amountOutMin", type: "uint256" },
      { internalType: "address[]", name: "path", type: "address[]" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
    ],
    name: "swapExactTokensForETH",
    outputs: [
      { internalType: "uint256[]", name: "amounts", type: "uint256[]" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountIn", type: "uint256" },
      { internalType: "uint256", name: "amountOutMin", type: "uint256" },
      { internalType: "address[]", name: "path", type: "address[]" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
    ],
    name: "swapExactTokensForETHSupportingFeeOnTransferTokens",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountIn", type: "uint256" },
      { internalType: "uint256", name: "amountOutMin", type: "uint256" },
      { internalType: "address[]", name: "path", type: "address[]" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
    ],
    name: "swapExactTokensForTokens",
    outputs: [
      { internalType: "uint256[]", name: "amounts", type: "uint256[]" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountIn", type: "uint256" },
      { internalType: "uint256", name: "amountOutMin", type: "uint256" },
      { internalType: "address[]", name: "path", type: "address[]" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
    ],
    name: "swapExactTokensForTokensSupportingFeeOnTransferTokens",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountOut", type: "uint256" },
      { internalType: "uint256", name: "amountInMax", type: "uint256" },
      { internalType: "address[]", name: "path", type: "address[]" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
    ],
    name: "swapTokensForExactETH",
    outputs: [
      { internalType: "uint256[]", name: "amounts", type: "uint256[]" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountOut", type: "uint256" },
      { internalType: "uint256", name: "amountInMax", type: "uint256" },
      { internalType: "address[]", name: "path", type: "address[]" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
    ],
    name: "swapTokensForExactTokens",
    outputs: [
      { internalType: "uint256[]", name: "amounts", type: "uint256[]" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  { stateMutability: "payable", type: "receive" },
];

window.PANCAKESWAP_ROUTER_ABI = [
  {
    inputs: [
      { internalType: "address", name: "_factory", type: "address" },
      { internalType: "address", name: "_WETH", type: "address" },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [],
    name: "WETH",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "tokenA", type: "address" },
      { internalType: "address", name: "tokenB", type: "address" },
      { internalType: "uint256", name: "amountADesired", type: "uint256" },
      { internalType: "uint256", name: "amountBDesired", type: "uint256" },
      { internalType: "uint256", name: "amountAMin", type: "uint256" },
      { internalType: "uint256", name: "amountBMin", type: "uint256" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
    ],
    name: "addLiquidity",
    outputs: [
      { internalType: "uint256", name: "amountA", type: "uint256" },
      { internalType: "uint256", name: "amountB", type: "uint256" },
      { internalType: "uint256", name: "liquidity", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "uint256", name: "amountTokenDesired", type: "uint256" },
      { internalType: "uint256", name: "amountTokenMin", type: "uint256" },
      { internalType: "uint256", name: "amountETHMin", type: "uint256" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
    ],
    name: "addLiquidityETH",
    outputs: [
      { internalType: "uint256", name: "amountToken", type: "uint256" },
      { internalType: "uint256", name: "amountETH", type: "uint256" },
      { internalType: "uint256", name: "liquidity", type: "uint256" },
    ],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [],
    name: "factory",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountOut", type: "uint256" },
      { internalType: "uint256", name: "reserveIn", type: "uint256" },
      { internalType: "uint256", name: "reserveOut", type: "uint256" },
    ],
    name: "getAmountIn",
    outputs: [{ internalType: "uint256", name: "amountIn", type: "uint256" }],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountIn", type: "uint256" },
      { internalType: "uint256", name: "reserveIn", type: "uint256" },
      { internalType: "uint256", name: "reserveOut", type: "uint256" },
    ],
    name: "getAmountOut",
    outputs: [{ internalType: "uint256", name: "amountOut", type: "uint256" }],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountOut", type: "uint256" },
      { internalType: "address[]", name: "path", type: "address[]" },
    ],
    name: "getAmountsIn",
    outputs: [
      { internalType: "uint256[]", name: "amounts", type: "uint256[]" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountIn", type: "uint256" },
      { internalType: "address[]", name: "path", type: "address[]" },
    ],
    name: "getAmountsOut",
    outputs: [
      { internalType: "uint256[]", name: "amounts", type: "uint256[]" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountA", type: "uint256" },
      { internalType: "uint256", name: "reserveA", type: "uint256" },
      { internalType: "uint256", name: "reserveB", type: "uint256" },
    ],
    name: "quote",
    outputs: [{ internalType: "uint256", name: "amountB", type: "uint256" }],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "tokenA", type: "address" },
      { internalType: "address", name: "tokenB", type: "address" },
      { internalType: "uint256", name: "liquidity", type: "uint256" },
      { internalType: "uint256", name: "amountAMin", type: "uint256" },
      { internalType: "uint256", name: "amountBMin", type: "uint256" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
    ],
    name: "removeLiquidity",
    outputs: [
      { internalType: "uint256", name: "amountA", type: "uint256" },
      { internalType: "uint256", name: "amountB", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "uint256", name: "liquidity", type: "uint256" },
      { internalType: "uint256", name: "amountTokenMin", type: "uint256" },
      { internalType: "uint256", name: "amountETHMin", type: "uint256" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
    ],
    name: "removeLiquidityETH",
    outputs: [
      { internalType: "uint256", name: "amountToken", type: "uint256" },
      { internalType: "uint256", name: "amountETH", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "uint256", name: "liquidity", type: "uint256" },
      { internalType: "uint256", name: "amountTokenMin", type: "uint256" },
      { internalType: "uint256", name: "amountETHMin", type: "uint256" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
    ],
    name: "removeLiquidityETHSupportingFeeOnTransferTokens",
    outputs: [{ internalType: "uint256", name: "amountETH", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "uint256", name: "liquidity", type: "uint256" },
      { internalType: "uint256", name: "amountTokenMin", type: "uint256" },
      { internalType: "uint256", name: "amountETHMin", type: "uint256" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
      { internalType: "bool", name: "approveMax", type: "bool" },
      { internalType: "uint8", name: "v", type: "uint8" },
      { internalType: "bytes32", name: "r", type: "bytes32" },
      { internalType: "bytes32", name: "s", type: "bytes32" },
    ],
    name: "removeLiquidityETHWithPermit",
    outputs: [
      { internalType: "uint256", name: "amountToken", type: "uint256" },
      { internalType: "uint256", name: "amountETH", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "uint256", name: "liquidity", type: "uint256" },
      { internalType: "uint256", name: "amountTokenMin", type: "uint256" },
      { internalType: "uint256", name: "amountETHMin", type: "uint256" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
      { internalType: "bool", name: "approveMax", type: "bool" },
      { internalType: "uint8", name: "v", type: "uint8" },
      { internalType: "bytes32", name: "r", type: "bytes32" },
      { internalType: "bytes32", name: "s", type: "bytes32" },
    ],
    name: "removeLiquidityETHWithPermitSupportingFeeOnTransferTokens",
    outputs: [{ internalType: "uint256", name: "amountETH", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "tokenA", type: "address" },
      { internalType: "address", name: "tokenB", type: "address" },
      { internalType: "uint256", name: "liquidity", type: "uint256" },
      { internalType: "uint256", name: "amountAMin", type: "uint256" },
      { internalType: "uint256", name: "amountBMin", type: "uint256" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
      { internalType: "bool", name: "approveMax", type: "bool" },
      { internalType: "uint8", name: "v", type: "uint8" },
      { internalType: "bytes32", name: "r", type: "bytes32" },
      { internalType: "bytes32", name: "s", type: "bytes32" },
    ],
    name: "removeLiquidityWithPermit",
    outputs: [
      { internalType: "uint256", name: "amountA", type: "uint256" },
      { internalType: "uint256", name: "amountB", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountOut", type: "uint256" },
      { internalType: "address[]", name: "path", type: "address[]" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
    ],
    name: "swapETHForExactTokens",
    outputs: [
      { internalType: "uint256[]", name: "amounts", type: "uint256[]" },
    ],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountOutMin", type: "uint256" },
      { internalType: "address[]", name: "path", type: "address[]" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
    ],
    name: "swapExactETHForTokens",
    outputs: [
      { internalType: "uint256[]", name: "amounts", type: "uint256[]" },
    ],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountOutMin", type: "uint256" },
      { internalType: "address[]", name: "path", type: "address[]" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
    ],
    name: "swapExactETHForTokensSupportingFeeOnTransferTokens",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountIn", type: "uint256" },
      { internalType: "uint256", name: "amountOutMin", type: "uint256" },
      { internalType: "address[]", name: "path", type: "address[]" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
    ],
    name: "swapExactTokensForETH",
    outputs: [
      { internalType: "uint256[]", name: "amounts", type: "uint256[]" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountIn", type: "uint256" },
      { internalType: "uint256", name: "amountOutMin", type: "uint256" },
      { internalType: "address[]", name: "path", type: "address[]" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
    ],
    name: "swapExactTokensForETHSupportingFeeOnTransferTokens",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountIn", type: "uint256" },
      { internalType: "uint256", name: "amountOutMin", type: "uint256" },
      { internalType: "address[]", name: "path", type: "address[]" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
    ],
    name: "swapExactTokensForTokens",
    outputs: [
      { internalType: "uint256[]", name: "amounts", type: "uint256[]" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountIn", type: "uint256" },
      { internalType: "uint256", name: "amountOutMin", type: "uint256" },
      { internalType: "address[]", name: "path", type: "address[]" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
    ],
    name: "swapExactTokensForTokensSupportingFeeOnTransferTokens",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountOut", type: "uint256" },
      { internalType: "uint256", name: "amountInMax", type: "uint256" },
      { internalType: "address[]", name: "path", type: "address[]" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
    ],
    name: "swapTokensForExactETH",
    outputs: [
      { internalType: "uint256[]", name: "amounts", type: "uint256[]" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountOut", type: "uint256" },
      { internalType: "uint256", name: "amountInMax", type: "uint256" },
      { internalType: "address[]", name: "path", type: "address[]" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
    ],
    name: "swapTokensForExactTokens",
    outputs: [
      { internalType: "uint256[]", name: "amounts", type: "uint256[]" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  { stateMutability: "payable", type: "receive" },
];

window.CONSTANT_STAKING_ABI = [
  {
    inputs: [],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "referrer",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "ReferralFeeTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "holder",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "Reinvest",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "holder",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "RewardsTransferred",
    type: "event",
  },
  {
    inputs: [],
    name: "ADMIN_CAN_CLAIM_AFTER",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "LOCKUP_TIME",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "REFERRAL_FEE_RATE_X_100",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "REWARD_INTERVAL",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "REWARD_RATE_X_100",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "STAKING_FEE_RATE_X_100",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "TRUSTED_TOKEN_ADDRESS",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "UNSTAKING_FEE_RATE_X_100",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "claim",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "contractStartTime",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "depositedTokens",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "i",
        type: "uint256",
      },
    ],
    name: "getActiveReferredStaker",
    outputs: [
      {
        internalType: "address",
        name: "_staker",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_totalEarned",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getNumberOfHolders",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "referrer",
        type: "address",
      },
    ],
    name: "getNumberOfReferredStakers",
    outputs: [
      {
        internalType: "uint256",
        name: "_activeStakers",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_totalStakers",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_holder",
        type: "address",
      },
    ],
    name: "getPendingDivs",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "i",
        type: "uint256",
      },
    ],
    name: "getReferredStaker",
    outputs: [
      {
        internalType: "address",
        name: "_staker",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_totalEarned",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "startIndex",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "endIndex",
        type: "uint256",
      },
    ],
    name: "getStakersList",
    outputs: [
      {
        internalType: "address[]",
        name: "stakers",
        type: "address[]",
      },
      {
        internalType: "uint256[]",
        name: "stakingTimestamps",
        type: "uint256[]",
      },
      {
        internalType: "uint256[]",
        name: "lastClaimedTimeStamps",
        type: "uint256[]",
      },
      {
        internalType: "uint256[]",
        name: "stakedTokens",
        type: "uint256[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_holder",
        type: "address",
      },
    ],
    name: "getTotalPendingDivs",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "lastClaimedTime",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "reInvest",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "referrals",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "rewardsPendingClaim",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amountToStake",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "referrer",
        type: "address",
      },
    ],
    name: "stake",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "stakeExternal",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "stakingTime",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalClaimedReferralFee",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalClaimedRewards",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "totalEarnedTokens",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "totalReferralFeeEarned",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "tokenAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "recipient",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "transferAnyERC20Token",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "tokenAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "recipient",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "transferAnyLegacyERC20Token",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "trustedStakingContractAddress",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

window.GOVERNANCE_ABI = [
  {
    inputs: [],
    name: "MIN_BALANCE_TO_INIT_PROPOSAL",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "QUORUM",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "RESULT_EXECUTION_ALLOWANCE_PERIOD",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "TRUSTED_TOKEN_ADDRESS",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "VOTE_DURATION",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "actions",
    outputs: [
      {
        internalType: "enum Governance.Action",
        name: "",
        type: "uint8",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "proposalId",
        type: "uint256",
      },
      {
        internalType: "enum Governance.Option",
        name: "option",
        type: "uint8",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "addVotes",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "proposalId",
        type: "uint256",
      },
    ],
    name: "executeProposal",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "proposalId",
        type: "uint256",
      },
    ],
    name: "getProposal",
    outputs: [
      {
        internalType: "uint256",
        name: "_proposalId",
        type: "uint256",
      },
      {
        internalType: "enum Governance.Action",
        name: "_proposalAction",
        type: "uint8",
      },
      {
        internalType: "uint256",
        name: "_optionOneVotes",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_optionTwoVotes",
        type: "uint256",
      },
      {
        internalType: "contract StakingPool",
        name: "_stakingPool",
        type: "address",
      },
      {
        internalType: "address",
        name: "_newGovernance",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_proposalStartTime",
        type: "uint256",
      },
      {
        internalType: "bool",
        name: "_isProposalExecuted",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "isProposalExecuted",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "proposalId",
        type: "uint256",
      },
    ],
    name: "isProposalExecutible",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "proposalId",
        type: "uint256",
      },
    ],
    name: "isProposalOpen",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "lastIndex",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "lastVotedProposalStartTime",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "newGovernances",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "optionOneVotes",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "optionTwoVotes",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "proposalStartTime",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "contract StakingPool",
        name: "pool",
        type: "address",
      },
    ],
    name: "proposeDisburseOrBurn",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "contract StakingPool",
        name: "pool",
        type: "address",
      },
      {
        internalType: "address",
        name: "newGovernance",
        type: "address",
      },
    ],
    name: "proposeUpgradeGovernance",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "proposalId",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "removeVotes",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "stakingPools",
    outputs: [
      {
        internalType: "contract StakingPool",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "totalDepositedTokens",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "votedForOption",
    outputs: [
      {
        internalType: "enum Governance.Option",
        name: "",
        type: "uint8",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "votesForProposalByAddress",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "withdrawAllTokens",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

window.STAKING_ABI = [
  {
    inputs: [
      {
        internalType: "address[]",
        name: "swapPath",
        type: "address[]",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "EthRewardsDisbursed",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "holder",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "EthRewardsTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "RewardsDisbursed",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "holder",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "RewardsTransferred",
    type: "event",
  },
  {
    inputs: [],
    name: "BURN_ADDRESS",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "MAGIC_NUMBER",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "SLIPPAGE_TOLERANCE_X_100",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "SWAP_PATH",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "addContractBalance",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "adminCanClaimAfter",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "adminClaimableTime",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "burnOrDisburseTokensPeriod",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "burnRewardTokens",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "claim",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "cliffTime",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "contractBalance",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "contractDeployTime",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "amountToDeposit",
        type: "uint256",
      },
    ],
    name: "deposit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "depositTime",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "depositedTokens",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "disburseAmount",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "disburseDuration",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "disbursePercentX100",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "disburseRewardTokens",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "amountToWithdraw",
        type: "uint256",
      },
    ],
    name: "emergencyWithdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "startIndex",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "endIndex",
        type: "uint256",
      },
    ],
    name: "getDepositorsList",
    outputs: [
      {
        internalType: "address[]",
        name: "stakers",
        type: "address[]",
      },
      {
        internalType: "uint256[]",
        name: "stakingTimestamps",
        type: "uint256[]",
      },
      {
        internalType: "uint256[]",
        name: "lastClaimedTimeStamps",
        type: "uint256[]",
      },
      {
        internalType: "uint256[]",
        name: "stakedTokens",
        type: "uint256[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getMaxSwappableAmount",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getNumberOfHolders",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getPendingDisbursement",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_holder",
        type: "address",
      },
    ],
    name: "getPendingDivs",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_holder",
        type: "address",
      },
    ],
    name: "getPendingDivsEth",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "lastBurnOrTokenDistributeTime",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "lastClaimedTime",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "lastDisburseTime",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "lastDivPoints",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "lastEthDivPoints",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "lastSwapExecutionTime",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "swapAttemptPeriod",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "tokensToBeDisbursedOrBurnt",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "tokensToBeSwapped",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalClaimedRewards",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalClaimedRewardsEth",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalDivPoints",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "totalEarnedEth",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "totalEarnedTokens",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalEthDivPoints",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalTokens",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_tokenAddr",
        type: "address",
      },
      {
        internalType: "address",
        name: "_to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_amount",
        type: "uint256",
      },
    ],
    name: "transferAnyERC20Token",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_tokenAddr",
        type: "address",
      },
      {
        internalType: "address",
        name: "_to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_amount",
        type: "uint256",
      },
    ],
    name: "transferAnyOldERC20Token",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "trustedDepositTokenAddress",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "trustedRewardTokenAddress",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "uniswapRouterV2",
    outputs: [
      {
        internalType: "contract IUniswapV2Router02",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "uniswapV2Pair",
    outputs: [
      {
        internalType: "contract IUniswapV2Pair",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "amountToWithdraw",
        type: "uint256",
      },
    ],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

window.BUYBACK_STAKING_ABI = [
  {
    inputs: [],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "tokenAddress",
        type: "address",
      },
    ],
    name: "DepositTokenAdded",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "tokenAddress",
        type: "address",
      },
    ],
    name: "DepositTokenRemoved",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "holder",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "RewardsTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "holder",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "Stake",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "holder",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "Unstake",
    type: "event",
  },
  {
    inputs: [],
    name: "ADMIN_CAN_CLAIM_AFTER",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "LOCKUP_TIME",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "REWARD_INTERVAL",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "REWARD_RATE_X_100",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "TRUSTED_TOKEN_ADDRESS",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_tokenAddress",
        type: "address",
      },
    ],
    name: "addTrustedDepositToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "claim",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "token",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "claimAnyToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "contractStartTime",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "depositedTokens",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "amountToWithdraw",
        type: "uint256",
      },
    ],
    name: "emergencyUnstake",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "getNumberOfHolders",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_holder",
        type: "address",
      },
    ],
    name: "getPendingDivs",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "startIndex",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "endIndex",
        type: "uint256",
      },
    ],
    name: "getStakersList",
    outputs: [
      {
        internalType: "address[]",
        name: "stakers",
        type: "address[]",
      },
      {
        internalType: "uint256[]",
        name: "stakingTimestamps",
        type: "uint256[]",
      },
      {
        internalType: "uint256[]",
        name: "lastClaimedTimeStamps",
        type: "uint256[]",
      },
      {
        internalType: "uint256[]",
        name: "stakedTokens",
        type: "uint256[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_holder",
        type: "address",
      },
    ],
    name: "getTotalPendingDivs",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "lastClaimedTime",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_tokenAddress",
        type: "address",
      },
    ],
    name: "removeTrustedDepositToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "rewardsPendingClaim",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "amountToDeposit",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "depositToken",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_amountOutMin",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_deadline",
        type: "uint256",
      },
    ],
    name: "stake",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "stakingTime",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalClaimedRewards",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "totalEarnedTokens",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "trustedDepositTokens",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "uniswapV2Router",
    outputs: [
      {
        internalType: "contract IUniswapV2Router",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "amountToWithdraw",
        type: "uint256",
      },
    ],
    name: "unstake",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

window.CONSTANT_STAKINGNEW_ABI = [
  {
    inputs: [
      {
        internalType: "address",
        name: "_uniswapV2RouterAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "_feeRecipientAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "trustedDepositTokenAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "trustedRewardTokenAddress",
        type: "address",
      },
      { internalType: "uint256", name: "referralFeeRateX100", type: "uint256" },
      { internalType: "uint256", name: "stakingFeeRateX100", type: "uint256" },
      {
        internalType: "uint256",
        name: "unstakingFeeRateX100",
        type: "uint256",
      },
      { internalType: "uint256", name: "rewardRateX100", type: "uint256" },
      { internalType: "uint256", name: "rewardInterval", type: "uint256" },
      { internalType: "uint256", name: "lockupTime", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
    ],
    name: "EmergencyDeclared",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "newAddress",
        type: "address",
      },
    ],
    name: "FeeRecipientAddressChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "_newLockupTime",
        type: "uint256",
      },
    ],
    name: "LockupTimeChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "newFee",
        type: "uint256",
      },
    ],
    name: "ReferralFeeChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "referrer",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "ReferralFeeTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "holder",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "Reinvest",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "holder",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "RewardsTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "Stake",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "newFee",
        type: "uint256",
      },
    ],
    name: "StakingFeeChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "contractAddress",
        type: "address",
      },
    ],
    name: "TrustedDepositContractAdded",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "contractAddress",
        type: "address",
      },
    ],
    name: "TrustedDepositContractRemoved",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "router",
        type: "address",
      },
    ],
    name: "UniswapV2RouterChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "Unstake",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "newFee",
        type: "uint256",
      },
    ],
    name: "UnstakingFeeChanged",
    type: "event",
  },
  {
    inputs: [],
    name: "EMERGENCY_WAIT_TIME",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "LOCKUP_TIME",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "REFERRAL_FEE_RATE_X_100",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "REWARD_INTERVAL",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "REWARD_RATE_X_100",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "STAKING_FEE_RATE_X_100",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "TRUSTED_DEPOSIT_TOKEN_ADDRESS",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "TRUSTED_REWARD_TOKEN_ADDRESS",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "UNSTAKING_FEE_RATE_X_100",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_address", type: "address" }],
    name: "addTrustedDepositContractAddress",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "adminCanClaimAfter",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "adminClaimableTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_amountOutMin_referralFee",
        type: "uint256",
      },
      { internalType: "uint256", name: "_amountOutMin_claim", type: "uint256" },
      { internalType: "uint256", name: "_deadline", type: "uint256" },
    ],
    name: "claim",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "address", name: "recipient", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "claimAnyToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "contractStartTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "declareEmergency",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "account", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
      {
        internalType: "uint256",
        name: "_amountOutMin_stakingReferralFee",
        type: "uint256",
      },
      { internalType: "uint256", name: "_deadline", type: "uint256" },
    ],
    name: "depositByContract",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "depositedTokens",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "feeRecipientAddress",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "account", type: "address" },
      { internalType: "uint256", name: "i", type: "uint256" },
    ],
    name: "getActiveReferredStaker",
    outputs: [
      { internalType: "address", name: "_staker", type: "address" },
      { internalType: "uint256", name: "_totalEarned", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getNumberOfHolders",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "referrer", type: "address" }],
    name: "getNumberOfReferredStakers",
    outputs: [
      { internalType: "uint256", name: "_activeStakers", type: "uint256" },
      { internalType: "uint256", name: "_totalStakers", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_holder", type: "address" }],
    name: "getPendingDivs",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "account", type: "address" },
      { internalType: "uint256", name: "i", type: "uint256" },
    ],
    name: "getReferredStaker",
    outputs: [
      { internalType: "address", name: "_staker", type: "address" },
      { internalType: "uint256", name: "_totalEarned", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "startIndex", type: "uint256" },
      { internalType: "uint256", name: "endIndex", type: "uint256" },
    ],
    name: "getStakersList",
    outputs: [
      { internalType: "address[]", name: "stakers", type: "address[]" },
      {
        internalType: "uint256[]",
        name: "stakingTimestamps",
        type: "uint256[]",
      },
      {
        internalType: "uint256[]",
        name: "lastClaimedTimeStamps",
        type: "uint256[]",
      },
      { internalType: "uint256[]", name: "stakedTokens", type: "uint256[]" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_holder", type: "address" }],
    name: "getTotalPendingDivs",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "isEmergency",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "isTrustedDepositContract",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "lastClaimedTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_amountOutMin_referralFee",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_amountOutMin_reinvest",
        type: "uint256",
      },
      { internalType: "uint256", name: "_deadline", type: "uint256" },
    ],
    name: "reInvest",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "referrals",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_address", type: "address" }],
    name: "removeTrustedDepositContractAddress",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "rewardsPendingClaim",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "lockupTime", type: "uint256" },
      { internalType: "uint256", name: "referralFeeRateX100", type: "uint256" },
      { internalType: "uint256", name: "stakingFeeRateX100", type: "uint256" },
      {
        internalType: "uint256",
        name: "unstakingFeeRateX100",
        type: "uint256",
      },
      { internalType: "address", name: "router", type: "address" },
      {
        internalType: "address",
        name: "_feeRecipientAddress",
        type: "address",
      },
    ],
    name: "setContractVariables",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newFeeRecipientAddress",
        type: "address",
      },
    ],
    name: "setFeeRecipientAddress",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_newLockupTime", type: "uint256" },
    ],
    name: "setLockupTime",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_newReferralFeeRateX100",
        type: "uint256",
      },
    ],
    name: "setReferralFeeRateX100",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_newStakingFeeRateX100",
        type: "uint256",
      },
    ],
    name: "setStakingFeeRateX100",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "contract IUniswapV2Router",
        name: "_newUniswapV2Router",
        type: "address",
      },
    ],
    name: "setUniswapV2Router",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_newUnstakingFeeRateX100",
        type: "uint256",
      },
    ],
    name: "setUnstakingFeeRateX100",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountToStake", type: "uint256" },
      { internalType: "address", name: "referrer", type: "address" },
      {
        internalType: "uint256",
        name: "_amountOutMin_referralFee",
        type: "uint256",
      },
      { internalType: "uint256", name: "_deadline", type: "uint256" },
    ],
    name: "stake",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "stakingTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalClaimedReferralFee",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalClaimedRewards",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "totalEarnedTokens",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "totalReferralFeeEarned",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "newOwner", type: "address" }],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "uniswapV2Router",
    outputs: [
      { internalType: "contract IUniswapV2Router", name: "", type: "address" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountToWithdraw", type: "uint256" },
      {
        internalType: "uint256",
        name: "_amountOutMin_referralFee",
        type: "uint256",
      },
      { internalType: "uint256", name: "_deadline", type: "uint256" },
    ],
    name: "unstake",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

window.CONSTANT_STAKINGBSC_NEW_ABI = [
  {
    inputs: [
      {
        internalType: "address",
        name: "_uniswapV2RouterAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "_feeRecipientAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "trustedDepositTokenAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "trustedRewardTokenAddress",
        type: "address",
      },
      { internalType: "uint256", name: "referralFeeRateX100", type: "uint256" },
      { internalType: "uint256", name: "stakingFeeRateX100", type: "uint256" },
      {
        internalType: "uint256",
        name: "unstakingFeeRateX100",
        type: "uint256",
      },
      { internalType: "uint256", name: "rewardRateX100", type: "uint256" },
      { internalType: "uint256", name: "rewardInterval", type: "uint256" },
      { internalType: "uint256", name: "lockupTime", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
    ],
    name: "EmergencyDeclared",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "newAddress",
        type: "address",
      },
    ],
    name: "FeeRecipientAddressChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "_newLockupTime",
        type: "uint256",
      },
    ],
    name: "LockupTimeChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "newFee",
        type: "uint256",
      },
    ],
    name: "ReferralFeeChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "referrer",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "ReferralFeeTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "holder",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "Reinvest",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "holder",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "RewardsTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "Stake",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "newFee",
        type: "uint256",
      },
    ],
    name: "StakingFeeChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "contractAddress",
        type: "address",
      },
    ],
    name: "TrustedDepositContractAdded",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "contractAddress",
        type: "address",
      },
    ],
    name: "TrustedDepositContractRemoved",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "router",
        type: "address",
      },
    ],
    name: "UniswapV2RouterChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "Unstake",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "newFee",
        type: "uint256",
      },
    ],
    name: "UnstakingFeeChanged",
    type: "event",
  },
  {
    inputs: [],
    name: "EMERGENCY_WAIT_TIME",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "LOCKUP_TIME",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "REFERRAL_FEE_RATE_X_100",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "REWARD_INTERVAL",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "REWARD_RATE_X_100",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "STAKING_FEE_RATE_X_100",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "TRUSTED_DEPOSIT_TOKEN_ADDRESS",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "TRUSTED_REWARD_TOKEN_ADDRESS",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "UNSTAKING_FEE_RATE_X_100",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_address", type: "address" }],
    name: "addTrustedDepositContractAddress",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "adminCanClaimAfter",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "adminClaimableTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_amountOutMin_referralFee",
        type: "uint256",
      },
      { internalType: "uint256", name: "_amountOutMin_claim", type: "uint256" },
      { internalType: "uint256", name: "_deadline", type: "uint256" },
    ],
    name: "claim",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "address", name: "recipient", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "claimAnyToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "contractStartTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "declareEmergency",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "account", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
      {
        internalType: "uint256",
        name: "_amountOutMin_stakingReferralFee",
        type: "uint256",
      },
      { internalType: "uint256", name: "_deadline", type: "uint256" },
    ],
    name: "depositByContract",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "depositedTokens",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "feeRecipientAddress",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "account", type: "address" },
      { internalType: "uint256", name: "i", type: "uint256" },
    ],
    name: "getActiveReferredStaker",
    outputs: [
      { internalType: "address", name: "_staker", type: "address" },
      { internalType: "uint256", name: "_totalEarned", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getNumberOfHolders",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "referrer", type: "address" }],
    name: "getNumberOfReferredStakers",
    outputs: [
      { internalType: "uint256", name: "_activeStakers", type: "uint256" },
      { internalType: "uint256", name: "_totalStakers", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_holder", type: "address" }],
    name: "getPendingDivs",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "account", type: "address" },
      { internalType: "uint256", name: "i", type: "uint256" },
    ],
    name: "getReferredStaker",
    outputs: [
      { internalType: "address", name: "_staker", type: "address" },
      { internalType: "uint256", name: "_totalEarned", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "startIndex", type: "uint256" },
      { internalType: "uint256", name: "endIndex", type: "uint256" },
    ],
    name: "getStakersList",
    outputs: [
      { internalType: "address[]", name: "stakers", type: "address[]" },
      {
        internalType: "uint256[]",
        name: "stakingTimestamps",
        type: "uint256[]",
      },
      {
        internalType: "uint256[]",
        name: "lastClaimedTimeStamps",
        type: "uint256[]",
      },
      { internalType: "uint256[]", name: "stakedTokens", type: "uint256[]" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_holder", type: "address" }],
    name: "getTotalPendingDivs",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "isEmergency",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "isTrustedDepositContract",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "lastClaimedTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_amountOutMin_referralFee",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_amountOutMin_reinvest",
        type: "uint256",
      },
      { internalType: "uint256", name: "_deadline", type: "uint256" },
    ],
    name: "reInvest",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "referrals",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_address", type: "address" }],
    name: "removeTrustedDepositContractAddress",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "rewardsPendingClaim",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "lockupTime", type: "uint256" },
      { internalType: "uint256", name: "referralFeeRateX100", type: "uint256" },
      { internalType: "uint256", name: "stakingFeeRateX100", type: "uint256" },
      {
        internalType: "uint256",
        name: "unstakingFeeRateX100",
        type: "uint256",
      },
      { internalType: "address", name: "router", type: "address" },
      {
        internalType: "address",
        name: "_feeRecipientAddress",
        type: "address",
      },
    ],
    name: "setContractVariables",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newFeeRecipientAddress",
        type: "address",
      },
    ],
    name: "setFeeRecipientAddress",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_newLockupTime", type: "uint256" },
    ],
    name: "setLockupTime",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_newReferralFeeRateX100",
        type: "uint256",
      },
    ],
    name: "setReferralFeeRateX100",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_newStakingFeeRateX100",
        type: "uint256",
      },
    ],
    name: "setStakingFeeRateX100",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "contract IUniswapV2Router",
        name: "_newUniswapV2Router",
        type: "address",
      },
    ],
    name: "setUniswapV2Router",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_newUnstakingFeeRateX100",
        type: "uint256",
      },
    ],
    name: "setUnstakingFeeRateX100",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountToStake", type: "uint256" },
      { internalType: "address", name: "referrer", type: "address" },
      {
        internalType: "uint256",
        name: "_amountOutMin_referralFee",
        type: "uint256",
      },
      { internalType: "uint256", name: "_deadline", type: "uint256" },
    ],
    name: "stake",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "stakingTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalClaimedReferralFee",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalClaimedRewards",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "totalEarnedTokens",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "totalReferralFeeEarned",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "newOwner", type: "address" }],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "uniswapV2Router",
    outputs: [
      { internalType: "contract IUniswapV2Router", name: "", type: "address" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountToWithdraw", type: "uint256" },
      {
        internalType: "uint256",
        name: "_amountOutMin_referralFee",
        type: "uint256",
      },
      { internalType: "uint256", name: "_deadline", type: "uint256" },
    ],
    name: "unstake",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

window.BUYBACK_STAKINGBSC1_1_ABI = [
  {
    inputs: [
      { internalType: "address", name: "router", type: "address" },
      {
        internalType: "address",
        name: "trustedPlatformTokenAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "trustedDepositTokenAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "_feeRecipientAddress",
        type: "address",
      },
      { internalType: "uint256", name: "stakingFeeRateX100", type: "uint256" },
      {
        internalType: "uint256",
        name: "unstakingFeeRateX100",
        type: "uint256",
      },
      { internalType: "uint256", name: "lockupTime", type: "uint256" },
      { internalType: "uint256", name: "adminCanClaimAfter", type: "uint256" },
      { internalType: "uint256", name: "rewardRateX100", type: "uint256" },
      { internalType: "uint256", name: "rewardInterval", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "tokenAddress",
        type: "address",
      },
    ],
    name: "DepositTokenAdded",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "tokenAddress",
        type: "address",
      },
    ],
    name: "DepositTokenRemoved",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
    ],
    name: "EmergencyDeclared",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "newAddress",
        type: "address",
      },
    ],
    name: "FeeRecipientAddressChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "lockupTime",
        type: "uint256",
      },
    ],
    name: "LockupTimeChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "Reinvest",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "holder",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "RewardsTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "holder",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "Stake",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "contractAddress",
        type: "address",
      },
    ],
    name: "StakingContractChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "uint256", name: "fee", type: "uint256" },
    ],
    name: "StakingFeeChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "router",
        type: "address",
      },
    ],
    name: "UniswapV2RouterChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "holder",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "Unstake",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "uint256", name: "fee", type: "uint256" },
    ],
    name: "UnstakingFeeChanged",
    type: "event",
  },
  {
    inputs: [],
    name: "EMERGENCY_WAIT_TIME",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "LOCKUP_TIME",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "REWARD_INTERVAL",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "REWARD_RATE_X_100",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "STAKING_FEE_RATE_X_100",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "TRUSTED_DEPOSIT_TOKEN_ADDRESS",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "TRUSTED_PLATFORM_TOKEN_ADDRESS",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "TRUSTED_STAKING_CONTRACT_ADDRESS",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "UNSTAKING_FEE_RATE_X_100",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_tokenAddress", type: "address" },
    ],
    name: "addTrustedDepositToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "adminClaimableTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_amountOutMin", type: "uint256" },
      { internalType: "uint256", name: "_deadline", type: "uint256" },
    ],
    name: "claim",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "address", name: "recipient", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "claimAnyToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "contractStartTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "declareEmergency",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "depositedTokens",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "feeRecipientAddress",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getNumberOfHolders",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_holder", type: "address" }],
    name: "getPendingDivs",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "startIndex", type: "uint256" },
      { internalType: "uint256", name: "endIndex", type: "uint256" },
    ],
    name: "getStakersList",
    outputs: [
      { internalType: "address[]", name: "stakers", type: "address[]" },
      {
        internalType: "uint256[]",
        name: "stakingTimestamps",
        type: "uint256[]",
      },
      {
        internalType: "uint256[]",
        name: "lastClaimedTimeStamps",
        type: "uint256[]",
      },
      { internalType: "uint256[]", name: "stakedTokens", type: "uint256[]" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_holder", type: "address" }],
    name: "getTotalPendingDivs",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "isEmergency",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "lastClaimedTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "reInvest",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_tokenAddress", type: "address" },
    ],
    name: "removeTrustedDepositToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "rewardsPendingClaim",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "lockupTime", type: "uint256" },
      { internalType: "uint256", name: "stakingFeeRateX100", type: "uint256" },
      {
        internalType: "uint256",
        name: "unstakingFeeRateX100",
        type: "uint256",
      },
      { internalType: "address", name: "router", type: "address" },
      {
        internalType: "address",
        name: "newFeeRecipientAddress",
        type: "address",
      },
    ],
    name: "setContractVariables",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newFeeRecipientAddress",
        type: "address",
      },
    ],
    name: "setFeeRecipientAddress",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "lockupTime", type: "uint256" }],
    name: "setLockupTime",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "trustedStakingContractAddress",
        type: "address",
      },
    ],
    name: "setStakingContractAddress",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "newStakingFeeRateX100",
        type: "uint256",
      },
    ],
    name: "setStakingFeeRateX100",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "contract IUniswapV2Router",
        name: "router",
        type: "address",
      },
    ],
    name: "setUniswapV2Router",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "newUnstakingFeeRateX100",
        type: "uint256",
      },
    ],
    name: "setUnstakingFeeRateX100",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountToDeposit", type: "uint256" },
      { internalType: "address", name: "depositToken", type: "address" },
      {
        internalType: "uint256",
        name: "_amountOutMin_75Percent",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_amountOutMin_25Percent",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_amountOutMin_stakingReferralFee",
        type: "uint256",
      },
      { internalType: "uint256", name: "_deadline", type: "uint256" },
    ],
    name: "stake",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "stakingTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalClaimedRewards",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalDepositedTokens",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "totalEarnedTokens",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "newOwner", type: "address" }],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "trustedDepositTokens",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "uniswapV2Router",
    outputs: [
      { internalType: "contract IUniswapV2Router", name: "", type: "address" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountToWithdraw", type: "uint256" },
      { internalType: "uint256", name: "_amountOutMin", type: "uint256" },
      { internalType: "uint256", name: "_deadline", type: "uint256" },
    ],
    name: "unstake",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

window.BUYBACK_STAKINGBSC1_2_ABI = [
  {
    inputs: [
      { internalType: "address", name: "router", type: "address" },
      {
        internalType: "address",
        name: "trustedPlatformTokenAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "trustedDepositTokenAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "_feeRecipientAddress",
        type: "address",
      },
      { internalType: "uint256", name: "stakingFeeRateX100", type: "uint256" },
      {
        internalType: "uint256",
        name: "unstakingFeeRateX100",
        type: "uint256",
      },
      { internalType: "uint256", name: "lockupTime", type: "uint256" },
      { internalType: "uint256", name: "adminCanClaimAfter", type: "uint256" },
      { internalType: "uint256", name: "rewardRateX100", type: "uint256" },
      { internalType: "uint256", name: "rewardInterval", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "tokenAddress",
        type: "address",
      },
    ],
    name: "DepositTokenAdded",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "tokenAddress",
        type: "address",
      },
    ],
    name: "DepositTokenRemoved",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
    ],
    name: "EmergencyDeclared",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "newAddress",
        type: "address",
      },
    ],
    name: "FeeRecipientAddressChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "lockupTime",
        type: "uint256",
      },
    ],
    name: "LockupTimeChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "Reinvest",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "holder",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "RewardsTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "holder",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "Stake",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "contractAddress",
        type: "address",
      },
    ],
    name: "StakingContractChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "uint256", name: "fee", type: "uint256" },
    ],
    name: "StakingFeeChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "router",
        type: "address",
      },
    ],
    name: "UniswapV2RouterChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "holder",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "Unstake",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "uint256", name: "fee", type: "uint256" },
    ],
    name: "UnstakingFeeChanged",
    type: "event",
  },
  {
    inputs: [],
    name: "EMERGENCY_WAIT_TIME",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "LOCKUP_TIME",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "REWARD_INTERVAL",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "REWARD_RATE_X_100",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "STAKING_FEE_RATE_X_100",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "TRUSTED_DEPOSIT_TOKEN_ADDRESS",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "TRUSTED_PLATFORM_TOKEN_ADDRESS",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "TRUSTED_STAKING_CONTRACT_ADDRESS",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "UNSTAKING_FEE_RATE_X_100",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_tokenAddress", type: "address" },
    ],
    name: "addTrustedDepositToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "adminClaimableTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_amountOutMin", type: "uint256" },
      { internalType: "uint256", name: "_deadline", type: "uint256" },
    ],
    name: "claim",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "address", name: "recipient", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "claimAnyToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "contractStartTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "declareEmergency",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "depositedTokens",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "feeRecipientAddress",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getNumberOfHolders",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_holder", type: "address" }],
    name: "getPendingDivs",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "startIndex", type: "uint256" },
      { internalType: "uint256", name: "endIndex", type: "uint256" },
    ],
    name: "getStakersList",
    outputs: [
      { internalType: "address[]", name: "stakers", type: "address[]" },
      {
        internalType: "uint256[]",
        name: "stakingTimestamps",
        type: "uint256[]",
      },
      {
        internalType: "uint256[]",
        name: "lastClaimedTimeStamps",
        type: "uint256[]",
      },
      { internalType: "uint256[]", name: "stakedTokens", type: "uint256[]" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_holder", type: "address" }],
    name: "getTotalPendingDivs",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "isEmergency",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "lastClaimedTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "reInvest",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_tokenAddress", type: "address" },
    ],
    name: "removeTrustedDepositToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "rewardsPendingClaim",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "lockupTime", type: "uint256" },
      { internalType: "uint256", name: "stakingFeeRateX100", type: "uint256" },
      {
        internalType: "uint256",
        name: "unstakingFeeRateX100",
        type: "uint256",
      },
      { internalType: "address", name: "router", type: "address" },
      {
        internalType: "address",
        name: "newFeeRecipientAddress",
        type: "address",
      },
    ],
    name: "setContractVariables",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newFeeRecipientAddress",
        type: "address",
      },
    ],
    name: "setFeeRecipientAddress",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "lockupTime", type: "uint256" }],
    name: "setLockupTime",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "trustedStakingContractAddress",
        type: "address",
      },
    ],
    name: "setStakingContractAddress",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "newStakingFeeRateX100",
        type: "uint256",
      },
    ],
    name: "setStakingFeeRateX100",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "contract IUniswapV2Router",
        name: "router",
        type: "address",
      },
    ],
    name: "setUniswapV2Router",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "newUnstakingFeeRateX100",
        type: "uint256",
      },
    ],
    name: "setUnstakingFeeRateX100",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountToDeposit", type: "uint256" },
      { internalType: "address", name: "depositToken", type: "address" },
      {
        internalType: "uint256",
        name: "_amountOutMin_75Percent",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_amountOutMin_25Percent",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_amountOutMin_stakingReferralFee",
        type: "uint256",
      },
      { internalType: "uint256", name: "_deadline", type: "uint256" },
    ],
    name: "stake",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "stakingTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalClaimedRewards",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalDepositedTokens",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "totalEarnedTokens",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "newOwner", type: "address" }],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "trustedDepositTokens",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "uniswapV2Router",
    outputs: [
      { internalType: "contract IUniswapV2Router", name: "", type: "address" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountToWithdraw", type: "uint256" },
      { internalType: "uint256", name: "_amountOutMin", type: "uint256" },
      { internalType: "uint256", name: "_deadline", type: "uint256" },
    ],
    name: "unstake",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

window.FARMING_NEW_ABI = [
  {
    inputs: [
      { internalType: "address[]", name: "swapPath", type: "address[]" },
      {
        internalType: "address",
        name: "_uniswapV2RouterAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "_feeRecipientAddress",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "tokenAddress",
        type: "address",
      },
    ],
    name: "ClaimableTokenAdded",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "tokenAddress",
        type: "address",
      },
    ],
    name: "ClaimableTokenRemoved",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "owner",
        type: "address",
      },
    ],
    name: "EmergencyDeclared",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "EthRewardsDisbursed",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "holder",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "EthRewardsTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "newAddress",
        type: "address",
      },
    ],
    name: "FeeRecipientAddressChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "lockupTime",
        type: "uint256",
      },
    ],
    name: "LockupTimeChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "newMagicNumber",
        type: "uint256",
      },
    ],
    name: "MagicNumberChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "RewardsDisbursed",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "holder",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "RewardsTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "uint256", name: "fee", type: "uint256" },
    ],
    name: "StakingFeeChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "router",
        type: "address",
      },
    ],
    name: "UniswapV2RouterChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "uint256", name: "fee", type: "uint256" },
    ],
    name: "UnstakingFeeChanged",
    type: "event",
  },
  {
    inputs: [],
    name: "BURN_ADDRESS",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "EMERGENCY_WAIT_TIME",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "MAGIC_NUMBER",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "STAKING_FEE_RATE_X_100",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "SWAP_PATH",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "UNSTAKING_FEE_RATE_X_100",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "amount", type: "uint256" }],
    name: "addContractBalance",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "trustedClaimableTokenAddress",
        type: "address",
      },
    ],
    name: "addTrustedClaimableToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "adminCanClaimAfter",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "adminClaimableTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "burnOrDisburseTokensPeriod",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "burnRewardTokens",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_amountOutMin_claimAsToken_dyp",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_amountOutMin_attemptSwap",
        type: "uint256",
      },
      { internalType: "uint256", name: "_deadline", type: "uint256" },
    ],
    name: "claim",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "address", name: "recipient", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "claimAnyToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "claimAsToken", type: "address" },
      {
        internalType: "uint256",
        name: "_amountOutMin_claimAsToken_weth",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_amountOutMin_claimAsToken_dyp",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_amountOutMin_attemptSwap",
        type: "uint256",
      },
      { internalType: "uint256", name: "_deadline", type: "uint256" },
    ],
    name: "claimAs",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "cliffTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "contractBalance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "contractDeployTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "declareEmergency",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "depositToken", type: "address" },
      { internalType: "uint256", name: "amountToStake", type: "uint256" },
      { internalType: "uint256[]", name: "minAmounts", type: "uint256[]" },
      { internalType: "uint256", name: "_deadline", type: "uint256" },
    ],
    name: "deposit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "depositTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "depositedTokens",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "disburseAmount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "disburseDuration",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "disbursePercentX100",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "disburseRewardTokens",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "feeRecipientAddress",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "startIndex", type: "uint256" },
      { internalType: "uint256", name: "endIndex", type: "uint256" },
    ],
    name: "getDepositorsList",
    outputs: [
      { internalType: "address[]", name: "stakers", type: "address[]" },
      {
        internalType: "uint256[]",
        name: "stakingTimestamps",
        type: "uint256[]",
      },
      {
        internalType: "uint256[]",
        name: "lastClaimedTimeStamps",
        type: "uint256[]",
      },
      { internalType: "uint256[]", name: "stakedTokens", type: "uint256[]" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getMaxSwappableAmount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getNumberOfHolders",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getPendingDisbursement",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_holder", type: "address" }],
    name: "getPendingDivs",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_holder", type: "address" }],
    name: "getPendingDivsEth",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "isEmergency",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "lastBurnOrTokenDistributeTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "lastClaimedTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "lastDisburseTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "lastDivPoints",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "lastEthDivPoints",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "lastSwapExecutionTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "trustedClaimableTokenAddress",
        type: "address",
      },
    ],
    name: "removeTrustedClaimableToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "newMagicNumber", type: "uint256" },
      { internalType: "uint256", name: "lockupTime", type: "uint256" },
      { internalType: "uint256", name: "stakingFeeRateX100", type: "uint256" },
      {
        internalType: "uint256",
        name: "unstakingFeeRateX100",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "_uniswapV2RouterAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "newFeeRecipientAddress",
        type: "address",
      },
    ],
    name: "setContractVariables",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newFeeRecipientAddress",
        type: "address",
      },
    ],
    name: "setFeeRecipientAddress",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_newLockupTime", type: "uint256" },
    ],
    name: "setLockupTime",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "newMagicNumber", type: "uint256" },
    ],
    name: "setMagicNumber",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "newStakingFeeRateX100",
        type: "uint256",
      },
    ],
    name: "setStakingFeeRateX100",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "contract IUniswapV2Router",
        name: "router",
        type: "address",
      },
    ],
    name: "setUniswapV2Router",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "newUnstakingFeeRateX100",
        type: "uint256",
      },
    ],
    name: "setUnstakingFeeRateX100",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "swapAttemptPeriod",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "tokensToBeDisbursedOrBurnt",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "tokensToBeSwapped",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalClaimedRewards",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalClaimedRewardsEth",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalDivPoints",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "totalEarnedEth",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "totalEarnedTokens",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalEthDivPoints",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalTokens",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "newOwner", type: "address" }],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "trustedBaseTokenAddress",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "trustedClaimableTokens",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "trustedDepositTokenAddress",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "trustedPlatformTokenAddress",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "trustedRewardTokenAddress",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "trustedStakingContractAddress",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "uniswapRouterV2",
    outputs: [
      { internalType: "contract IUniswapV2Router", name: "", type: "address" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "uniswapV2Pair",
    outputs: [
      { internalType: "contract IUniswapV2Pair", name: "", type: "address" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "withdrawAsToken", type: "address" },
      { internalType: "uint256", name: "amountToWithdraw", type: "uint256" },
      { internalType: "uint256[]", name: "minAmounts", type: "uint256[]" },
      { internalType: "uint256", name: "_deadline", type: "uint256" },
    ],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

window.FARMING_NEWBSC_ABI = [
  {
    inputs: [
      { internalType: "address[]", name: "swapPath", type: "address[]" },
      {
        internalType: "address",
        name: "_uniswapV2RouterAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "_feeRecipientAddress",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "tokenAddress",
        type: "address",
      },
    ],
    name: "ClaimableTokenAdded",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "tokenAddress",
        type: "address",
      },
    ],
    name: "ClaimableTokenRemoved",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "owner",
        type: "address",
      },
    ],
    name: "EmergencyDeclared",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "EthRewardsDisbursed",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "holder",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "EthRewardsTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "newAddress",
        type: "address",
      },
    ],
    name: "FeeRecipientAddressChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "lockupTime",
        type: "uint256",
      },
    ],
    name: "LockupTimeChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "newMagicNumber",
        type: "uint256",
      },
    ],
    name: "MagicNumberChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "RewardsDisbursed",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "holder",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "RewardsTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "uint256", name: "fee", type: "uint256" },
    ],
    name: "StakingFeeChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "router",
        type: "address",
      },
    ],
    name: "UniswapV2RouterChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "uint256", name: "fee", type: "uint256" },
    ],
    name: "UnstakingFeeChanged",
    type: "event",
  },
  {
    inputs: [],
    name: "BURN_ADDRESS",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "EMERGENCY_WAIT_TIME",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "MAGIC_NUMBER",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "STAKING_FEE_RATE_X_100",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "SWAP_PATH",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "UNSTAKING_FEE_RATE_X_100",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "amount", type: "uint256" }],
    name: "addContractBalance",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "trustedClaimableTokenAddress",
        type: "address",
      },
    ],
    name: "addTrustedClaimableToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "adminCanClaimAfter",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "adminClaimableTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "burnOrDisburseTokensPeriod",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "burnRewardTokens",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_amountOutMin_claimAsToken_dyp",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_amountOutMin_attemptSwap",
        type: "uint256",
      },
      { internalType: "uint256", name: "_deadline", type: "uint256" },
    ],
    name: "claim",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "address", name: "recipient", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "claimAnyToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "claimAsToken", type: "address" },
      {
        internalType: "uint256",
        name: "_amountOutMin_claimAsToken_weth",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_amountOutMin_claimAsToken_dyp",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_amountOutMin_attemptSwap",
        type: "uint256",
      },
      { internalType: "uint256", name: "_deadline", type: "uint256" },
    ],
    name: "claimAs",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "cliffTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "contractBalance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "contractDeployTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "declareEmergency",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "depositToken", type: "address" },
      { internalType: "uint256", name: "amountToStake", type: "uint256" },
      { internalType: "uint256[]", name: "minAmounts", type: "uint256[]" },
      { internalType: "uint256", name: "_deadline", type: "uint256" },
    ],
    name: "deposit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "depositTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "depositedTokens",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "disburseAmount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "disburseDuration",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "disbursePercentX100",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "disburseRewardTokens",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "feeRecipientAddress",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "startIndex", type: "uint256" },
      { internalType: "uint256", name: "endIndex", type: "uint256" },
    ],
    name: "getDepositorsList",
    outputs: [
      { internalType: "address[]", name: "stakers", type: "address[]" },
      {
        internalType: "uint256[]",
        name: "stakingTimestamps",
        type: "uint256[]",
      },
      {
        internalType: "uint256[]",
        name: "lastClaimedTimeStamps",
        type: "uint256[]",
      },
      { internalType: "uint256[]", name: "stakedTokens", type: "uint256[]" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getMaxSwappableAmount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getNumberOfHolders",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getPendingDisbursement",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_holder", type: "address" }],
    name: "getPendingDivs",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_holder", type: "address" }],
    name: "getPendingDivsEth",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "isEmergency",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "lastBurnOrTokenDistributeTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "lastClaimedTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "lastDisburseTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "lastDivPoints",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "lastEthDivPoints",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "lastSwapExecutionTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "trustedClaimableTokenAddress",
        type: "address",
      },
    ],
    name: "removeTrustedClaimableToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "newMagicNumber", type: "uint256" },
      { internalType: "uint256", name: "lockupTime", type: "uint256" },
      { internalType: "uint256", name: "stakingFeeRateX100", type: "uint256" },
      {
        internalType: "uint256",
        name: "unstakingFeeRateX100",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "_uniswapV2RouterAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "newFeeRecipientAddress",
        type: "address",
      },
    ],
    name: "setContractVariables",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newFeeRecipientAddress",
        type: "address",
      },
    ],
    name: "setFeeRecipientAddress",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_newLockupTime", type: "uint256" },
    ],
    name: "setLockupTime",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "newMagicNumber", type: "uint256" },
    ],
    name: "setMagicNumber",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "newStakingFeeRateX100",
        type: "uint256",
      },
    ],
    name: "setStakingFeeRateX100",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "contract IUniswapV2Router",
        name: "router",
        type: "address",
      },
    ],
    name: "setUniswapV2Router",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "newUnstakingFeeRateX100",
        type: "uint256",
      },
    ],
    name: "setUnstakingFeeRateX100",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "swapAttemptPeriod",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "tokensToBeDisbursedOrBurnt",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "tokensToBeSwapped",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalClaimedRewards",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalClaimedRewardsEth",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalDivPoints",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "totalEarnedEth",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "totalEarnedTokens",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalEthDivPoints",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalTokens",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "newOwner", type: "address" }],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "trustedBaseTokenAddress",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "trustedClaimableTokens",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "trustedDepositTokenAddress",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "trustedPlatformTokenAddress",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "trustedRewardTokenAddress",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "trustedStakingContractAddress",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "uniswapRouterV2",
    outputs: [
      { internalType: "contract IUniswapV2Router", name: "", type: "address" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "uniswapV2Pair",
    outputs: [
      { internalType: "contract IUniswapV2Pair", name: "", type: "address" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "withdrawAsToken", type: "address" },
      { internalType: "uint256", name: "amountToWithdraw", type: "uint256" },
      { internalType: "uint256[]", name: "minAmounts", type: "uint256[]" },
      { internalType: "uint256", name: "_deadline", type: "uint256" },
    ],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

window.FARMING_ACTIVEBSC_ABI = [
  {
    inputs: [
      { internalType: "address[]", name: "swapPath", type: "address[]" },
      {
        internalType: "address",
        name: "_uniswapV2RouterAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "_feeRecipientAddress",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "tokenAddress",
        type: "address",
      },
    ],
    name: "ClaimableTokenAdded",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "tokenAddress",
        type: "address",
      },
    ],
    name: "ClaimableTokenRemoved",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "owner",
        type: "address",
      },
    ],
    name: "EmergencyDeclared",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "EthRewardsDisbursed",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "holder",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "EthRewardsTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "newAddress",
        type: "address",
      },
    ],
    name: "FeeRecipientAddressChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "lockupTime",
        type: "uint256",
      },
    ],
    name: "LockupTimeChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "newMagicNumber",
        type: "uint256",
      },
    ],
    name: "MagicNumberChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "RewardsDisbursed",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "holder",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "RewardsTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "uint256", name: "fee", type: "uint256" },
    ],
    name: "StakingFeeChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "router",
        type: "address",
      },
    ],
    name: "UniswapV2RouterChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "uint256", name: "fee", type: "uint256" },
    ],
    name: "UnstakingFeeChanged",
    type: "event",
  },
  {
    inputs: [],
    name: "BURN_ADDRESS",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "EMERGENCY_WAIT_TIME",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "MAGIC_NUMBER",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "STAKING_FEE_RATE_X_100",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "SWAP_PATH",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "UNSTAKING_FEE_RATE_X_100",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "amount", type: "uint256" }],
    name: "addContractBalance",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "trustedClaimableTokenAddress",
        type: "address",
      },
    ],
    name: "addTrustedClaimableToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "adminCanClaimAfter",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "adminClaimableTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "burnOrDisburseTokensPeriod",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "burnRewardTokens",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_amountOutMin_claimAsToken_dyp",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_amountOutMin_attemptSwap",
        type: "uint256",
      },
      { internalType: "uint256", name: "_deadline", type: "uint256" },
    ],
    name: "claim",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "address", name: "recipient", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "claimAnyToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "claimAsToken", type: "address" },
      {
        internalType: "uint256",
        name: "_amountOutMin_claimAsToken_weth",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_amountOutMin_claimAsToken_dyp",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_amountOutMin_attemptSwap",
        type: "uint256",
      },
      { internalType: "uint256", name: "_deadline", type: "uint256" },
    ],
    name: "claimAs",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "cliffTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "contractBalance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "contractDeployTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "declareEmergency",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "depositToken", type: "address" },
      { internalType: "uint256", name: "amountToStake", type: "uint256" },
      { internalType: "uint256[]", name: "minAmounts", type: "uint256[]" },
      { internalType: "uint256", name: "_deadline", type: "uint256" },
    ],
    name: "deposit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "depositTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "depositedTokens",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "disburseAmount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "disburseDuration",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "disbursePercentX100",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "disburseRewardTokens",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "feeRecipientAddress",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "startIndex", type: "uint256" },
      { internalType: "uint256", name: "endIndex", type: "uint256" },
    ],
    name: "getDepositorsList",
    outputs: [
      { internalType: "address[]", name: "stakers", type: "address[]" },
      {
        internalType: "uint256[]",
        name: "stakingTimestamps",
        type: "uint256[]",
      },
      {
        internalType: "uint256[]",
        name: "lastClaimedTimeStamps",
        type: "uint256[]",
      },
      { internalType: "uint256[]", name: "stakedTokens", type: "uint256[]" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getMaxSwappableAmount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getNumberOfHolders",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getPendingDisbursement",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_holder", type: "address" }],
    name: "getPendingDivs",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_holder", type: "address" }],
    name: "getPendingDivsEth",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "isEmergency",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "lastBurnOrTokenDistributeTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "lastClaimedTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "lastDisburseTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "lastDivPoints",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "lastEthDivPoints",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "lastSwapExecutionTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "trustedClaimableTokenAddress",
        type: "address",
      },
    ],
    name: "removeTrustedClaimableToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "newMagicNumber", type: "uint256" },
      { internalType: "uint256", name: "lockupTime", type: "uint256" },
      { internalType: "uint256", name: "stakingFeeRateX100", type: "uint256" },
      {
        internalType: "uint256",
        name: "unstakingFeeRateX100",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "_uniswapV2RouterAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "newFeeRecipientAddress",
        type: "address",
      },
    ],
    name: "setContractVariables",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newFeeRecipientAddress",
        type: "address",
      },
    ],
    name: "setFeeRecipientAddress",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_newLockupTime", type: "uint256" },
    ],
    name: "setLockupTime",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "newMagicNumber", type: "uint256" },
    ],
    name: "setMagicNumber",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "newStakingFeeRateX100",
        type: "uint256",
      },
    ],
    name: "setStakingFeeRateX100",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "contract IUniswapV2Router",
        name: "router",
        type: "address",
      },
    ],
    name: "setUniswapV2Router",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "newUnstakingFeeRateX100",
        type: "uint256",
      },
    ],
    name: "setUnstakingFeeRateX100",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "swapAttemptPeriod",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "tokensToBeDisbursedOrBurnt",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "tokensToBeSwapped",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalClaimedRewards",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalClaimedRewardsEth",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalDivPoints",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "totalEarnedEth",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "totalEarnedTokens",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalEthDivPoints",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalTokens",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "newOwner", type: "address" }],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "trustedBaseTokenAddress",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "trustedClaimableTokens",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "trustedDepositTokenAddress",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "trustedPlatformTokenAddress",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "trustedRewardTokenAddress",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "trustedStakingContractAddress",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "uniswapRouterV2",
    outputs: [
      { internalType: "contract IUniswapV2Router", name: "", type: "address" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "uniswapV2Pair",
    outputs: [
      { internalType: "contract IUniswapV2Pair", name: "", type: "address" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "withdrawAsToken", type: "address" },
      { internalType: "uint256", name: "amountToWithdraw", type: "uint256" },
      { internalType: "uint256[]", name: "minAmounts", type: "uint256[]" },
      { internalType: "uint256", name: "_deadline", type: "uint256" },
    ],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

window.FARMING_ACTIVEAVAX_ABI = [
  {
    inputs: [
      { internalType: "address[]", name: "swapPath", type: "address[]" },
      {
        internalType: "address",
        name: "_uniswapV2RouterAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "_feeRecipientAddress",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "tokenAddress",
        type: "address",
      },
    ],
    name: "ClaimableTokenAdded",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "tokenAddress",
        type: "address",
      },
    ],
    name: "ClaimableTokenRemoved",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "owner",
        type: "address",
      },
    ],
    name: "EmergencyDeclared",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "EthRewardsDisbursed",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "holder",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "EthRewardsTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "newAddress",
        type: "address",
      },
    ],
    name: "FeeRecipientAddressChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "lockupTime",
        type: "uint256",
      },
    ],
    name: "LockupTimeChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "newMagicNumber",
        type: "uint256",
      },
    ],
    name: "MagicNumberChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "RewardsDisbursed",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "holder",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "RewardsTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "uint256", name: "fee", type: "uint256" },
    ],
    name: "StakingFeeChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "router",
        type: "address",
      },
    ],
    name: "UniswapV2RouterChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "uint256", name: "fee", type: "uint256" },
    ],
    name: "UnstakingFeeChanged",
    type: "event",
  },
  {
    inputs: [],
    name: "BURN_ADDRESS",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "EMERGENCY_WAIT_TIME",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "MAGIC_NUMBER",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "STAKING_FEE_RATE_X_100",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "SWAP_PATH",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "UNSTAKING_FEE_RATE_X_100",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "amount", type: "uint256" }],
    name: "addContractBalance",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "trustedClaimableTokenAddress",
        type: "address",
      },
    ],
    name: "addTrustedClaimableToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "adminCanClaimAfter",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "adminClaimableTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "burnOrDisburseTokensPeriod",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "burnRewardTokens",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_amountOutMin_claimAsToken_dyp",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_amountOutMin_attemptSwap",
        type: "uint256",
      },
      { internalType: "uint256", name: "_deadline", type: "uint256" },
    ],
    name: "claim",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "address", name: "recipient", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "claimAnyToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "claimAsToken", type: "address" },
      {
        internalType: "uint256",
        name: "_amountOutMin_claimAsToken_weth",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_amountOutMin_claimAsToken_dyp",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_amountOutMin_attemptSwap",
        type: "uint256",
      },
      { internalType: "uint256", name: "_deadline", type: "uint256" },
    ],
    name: "claimAs",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "cliffTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "contractBalance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "contractDeployTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "declareEmergency",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "depositToken", type: "address" },
      { internalType: "uint256", name: "amountToStake", type: "uint256" },
      { internalType: "uint256[]", name: "minAmounts", type: "uint256[]" },
      { internalType: "uint256", name: "_deadline", type: "uint256" },
    ],
    name: "deposit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "depositTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "depositedTokens",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "disburseAmount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "disburseDuration",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "disbursePercentX100",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "disburseRewardTokens",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "feeRecipientAddress",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "startIndex", type: "uint256" },
      { internalType: "uint256", name: "endIndex", type: "uint256" },
    ],
    name: "getDepositorsList",
    outputs: [
      { internalType: "address[]", name: "stakers", type: "address[]" },
      {
        internalType: "uint256[]",
        name: "stakingTimestamps",
        type: "uint256[]",
      },
      {
        internalType: "uint256[]",
        name: "lastClaimedTimeStamps",
        type: "uint256[]",
      },
      { internalType: "uint256[]", name: "stakedTokens", type: "uint256[]" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getMaxSwappableAmount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getNumberOfHolders",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getPendingDisbursement",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_holder", type: "address" }],
    name: "getPendingDivs",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_holder", type: "address" }],
    name: "getPendingDivsEth",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "isEmergency",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "lastBurnOrTokenDistributeTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "lastClaimedTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "lastDisburseTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "lastDivPoints",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "lastEthDivPoints",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "lastSwapExecutionTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "trustedClaimableTokenAddress",
        type: "address",
      },
    ],
    name: "removeTrustedClaimableToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "newMagicNumber", type: "uint256" },
      { internalType: "uint256", name: "lockupTime", type: "uint256" },
      { internalType: "uint256", name: "stakingFeeRateX100", type: "uint256" },
      {
        internalType: "uint256",
        name: "unstakingFeeRateX100",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "_uniswapV2RouterAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "newFeeRecipientAddress",
        type: "address",
      },
    ],
    name: "setContractVariables",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newFeeRecipientAddress",
        type: "address",
      },
    ],
    name: "setFeeRecipientAddress",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_newLockupTime", type: "uint256" },
    ],
    name: "setLockupTime",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "newMagicNumber", type: "uint256" },
    ],
    name: "setMagicNumber",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "newStakingFeeRateX100",
        type: "uint256",
      },
    ],
    name: "setStakingFeeRateX100",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "contract IUniswapV2Router",
        name: "router",
        type: "address",
      },
    ],
    name: "setUniswapV2Router",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "newUnstakingFeeRateX100",
        type: "uint256",
      },
    ],
    name: "setUnstakingFeeRateX100",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "swapAttemptPeriod",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "tokensToBeDisbursedOrBurnt",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "tokensToBeSwapped",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalClaimedRewards",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalClaimedRewardsEth",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalDivPoints",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "totalEarnedEth",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "totalEarnedTokens",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalEthDivPoints",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalTokens",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "newOwner", type: "address" }],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "trustedBaseTokenAddress",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "trustedClaimableTokens",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "trustedDepositTokenAddress",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "trustedPlatformTokenAddress",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "trustedRewardTokenAddress",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "trustedStakingContractAddress",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "uniswapRouterV2",
    outputs: [
      { internalType: "contract IUniswapV2Router", name: "", type: "address" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "uniswapV2Pair",
    outputs: [
      { internalType: "contract IUniswapV2Pair", name: "", type: "address" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "withdrawAsToken", type: "address" },
      { internalType: "uint256", name: "amountToWithdraw", type: "uint256" },
      { internalType: "uint256[]", name: "minAmounts", type: "uint256[]" },
      { internalType: "uint256", name: "_deadline", type: "uint256" },
    ],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

window.CONSTANT_STAKING_OLD_ABI = [
  { inputs: [], stateMutability: "nonpayable", type: "constructor" },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "referrer",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "ReferralFeeTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "holder",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "Reinvest",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "holder",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "RewardsTransferred",
    type: "event",
  },
  {
    inputs: [],
    name: "ADMIN_CAN_CLAIM_AFTER",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "LOCKUP_TIME",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "REFERRAL_FEE_RATE_X_100",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "REWARD_INTERVAL",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "REWARD_RATE_X_100",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "STAKING_FEE_RATE_X_100",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "TRUSTED_TOKEN_ADDRESS",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "UNSTAKING_FEE_RATE_X_100",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "claim",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "contractStartTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "depositedTokens",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountToWithdraw", type: "uint256" },
    ],
    name: "emergencyUnstake",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "account", type: "address" },
      { internalType: "uint256", name: "i", type: "uint256" },
    ],
    name: "getActiveReferredStaker",
    outputs: [
      { internalType: "address", name: "_staker", type: "address" },
      { internalType: "uint256", name: "_totalEarned", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getNumberOfHolders",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "referrer", type: "address" }],
    name: "getNumberOfReferredStakers",
    outputs: [
      { internalType: "uint256", name: "_activeStakers", type: "uint256" },
      { internalType: "uint256", name: "_totalStakers", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_holder", type: "address" }],
    name: "getPendingDivs",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "account", type: "address" },
      { internalType: "uint256", name: "i", type: "uint256" },
    ],
    name: "getReferredStaker",
    outputs: [
      { internalType: "address", name: "_staker", type: "address" },
      { internalType: "uint256", name: "_totalEarned", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "startIndex", type: "uint256" },
      { internalType: "uint256", name: "endIndex", type: "uint256" },
    ],
    name: "getStakersList",
    outputs: [
      { internalType: "address[]", name: "stakers", type: "address[]" },
      {
        internalType: "uint256[]",
        name: "stakingTimestamps",
        type: "uint256[]",
      },
      {
        internalType: "uint256[]",
        name: "lastClaimedTimeStamps",
        type: "uint256[]",
      },
      { internalType: "uint256[]", name: "stakedTokens", type: "uint256[]" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_holder", type: "address" }],
    name: "getTotalPendingDivs",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "lastClaimedTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "reInvest",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "referrals",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "rewardsPendingClaim",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountToStake", type: "uint256" },
      { internalType: "address", name: "referrer", type: "address" },
    ],
    name: "stake",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "stakingTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalClaimedReferralFee",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalClaimedRewards",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "totalEarnedTokens",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "totalReferralFeeEarned",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "tokenAddress", type: "address" },
      { internalType: "address", name: "recipient", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "transferAnyERC20Token",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "tokenAddress", type: "address" },
      { internalType: "address", name: "recipient", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "transferAnyLegacyERC20Token",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "newOwner", type: "address" }],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountToWithdraw", type: "uint256" },
    ],
    name: "unstake",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

window.VAULT_ABI = [
  {
    inputs: [],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "CompoundRewardClaimed",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "Deposit",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "EtherRewardClaimed",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "EtherRewardDisbursed",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "PlatformTokenAdded",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "PlatformTokenRewardClaimed",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "TokenRewardClaimed",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "TokenRewardDisbursed",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "Withdraw",
    type: "event",
  },
  {
    inputs: [],
    name: "BURN_ADDRESS",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "FEE_PERCENT_TO_BUYBACK_X_100",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "FEE_PERCENT_X_100",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "LOCKUP_DURATION",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "MIN_ETH_FEE_IN_WEI",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "ONE_HUNDRED_X_100",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "POINT_MULTIPLIER",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "REWARD_INTERVAL",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "REWARD_RETURN_PERCENT_X_100",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "TRUSTED_CTOKEN_ADDRESS",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "TRUSTED_DEPOSIT_TOKEN_ADDRESS",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "TRUSTED_PLATFORM_TOKEN_ADDRESS",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "addPlatformTokenBalance",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "cTokenBalance",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_amountOutMin_platformTokens",
        type: "uint256",
      },
    ],
    name: "claim",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "claimCompoundDivs",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "claimEthDivs",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "token",
        type: "address",
      },
    ],
    name: "claimExtraTokens",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_amountOutMin_platformTokens",
        type: "uint256",
      },
    ],
    name: "claimPlatformTokenDivs",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "claimTokenDivs",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "contractStartTime",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_amountOutMin_ethFeeBuyBack",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "deadline",
        type: "uint256",
      },
    ],
    name: "deposit",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "depositTime",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "depositTokenBalance",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "ethDivsBalance",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "ethDivsOwing",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_cTokenBalance",
        type: "uint256",
      },
    ],
    name: "getConvertedBalance",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "startIndex",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "endIndex",
        type: "uint256",
      },
    ],
    name: "getDepositorsList",
    outputs: [
      {
        internalType: "address[]",
        name: "stakers",
        type: "address[]",
      },
      {
        internalType: "uint256[]",
        name: "stakingTimestamps",
        type: "uint256[]",
      },
      {
        internalType: "uint256[]",
        name: "lastClaimedTimeStamps",
        type: "uint256[]",
      },
      {
        internalType: "uint256[]",
        name: "stakedTokens",
        type: "uint256[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "getEstimatedCompoundDivsOwing",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getExchangeRateCurrent",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "getExchangeRateStored",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getNumberOfHolders",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "lastClaimedTime",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "lastEthDivPoints",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "lastTokenDivPoints",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "platformTokenDivsBalance",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "platformTokenDivsOwing",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "renounceOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "tokenBalances",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "tokenDivsBalance",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "tokenDivsOwing",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalCTokens",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalDepositedTokens",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "totalEarnedCompoundDivs",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "totalEarnedEthDivs",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "totalEarnedPlatformTokenDivs",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "totalEarnedTokenDivs",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalEthDisbursed",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalEthDivPoints",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalTokenDivPoints",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "totalTokensDepositedByUser",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalTokensDisbursed",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "totalTokensWithdrawnByUser",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "uniswapRouterV2",
    outputs: [
      {
        internalType: "contract IUniswapV2Router",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_amountOutMin_ethFeeBuyBack",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_amountOutMin_tokenFeeBuyBack",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "deadline",
        type: "uint256",
      },
    ],
    name: "withdraw",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    stateMutability: "payable",
    type: "receive",
  },
];

window.STAKINGAVAX_ABI = [
  {
    inputs: [
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "addContractBalance",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "trustedClaimableTokenAddress",
        type: "address",
      },
    ],
    name: "addTrustedClaimableToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "burnRewardTokens",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "claim",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "claimAsToken",
        type: "address",
      },
    ],
    name: "claimAs",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "amountToDeposit",
        type: "uint256",
      },
    ],
    name: "deposit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address[]",
        name: "swapPath",
        type: "address[]",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "tokenAddress",
        type: "address",
      },
    ],
    name: "ClaimableTokenAdded",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "tokenAddress",
        type: "address",
      },
    ],
    name: "ClaimableTokenRemoved",
    type: "event",
  },
  {
    inputs: [],
    name: "disburseRewardTokens",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "amountToWithdraw",
        type: "uint256",
      },
    ],
    name: "emergencyWithdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "EthRewardsDisbursed",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "holder",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "EthRewardsTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "trustedClaimableTokenAddress",
        type: "address",
      },
    ],
    name: "removeTrustedClaimableToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "RewardsDisbursed",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "holder",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "RewardsTransferred",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_tokenAddr",
        type: "address",
      },
      {
        internalType: "address",
        name: "_to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_amount",
        type: "uint256",
      },
    ],
    name: "transferAnyERC20Token",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_tokenAddr",
        type: "address",
      },
      {
        internalType: "address",
        name: "_to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_amount",
        type: "uint256",
      },
    ],
    name: "transferAnyOldERC20Token",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "amountToWithdraw",
        type: "uint256",
      },
    ],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "adminCanClaimAfter",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "adminClaimableTime",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "BURN_ADDRESS",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "burnOrDisburseTokensPeriod",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "cliffTime",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "contractBalance",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "contractDeployTime",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "depositedTokens",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "depositTime",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "disburseAmount",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "disburseDuration",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "disbursePercentX100",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "startIndex",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "endIndex",
        type: "uint256",
      },
    ],
    name: "getDepositorsList",
    outputs: [
      {
        internalType: "address[]",
        name: "stakers",
        type: "address[]",
      },
      {
        internalType: "uint256[]",
        name: "stakingTimestamps",
        type: "uint256[]",
      },
      {
        internalType: "uint256[]",
        name: "lastClaimedTimeStamps",
        type: "uint256[]",
      },
      {
        internalType: "uint256[]",
        name: "stakedTokens",
        type: "uint256[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getMaxSwappableAmount",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getNumberOfHolders",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getPendingDisbursement",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_holder",
        type: "address",
      },
    ],
    name: "getPendingDivs",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_holder",
        type: "address",
      },
    ],
    name: "getPendingDivsEth",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "lastBurnOrTokenDistributeTime",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "lastClaimedTime",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "lastDisburseTime",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "lastDivPoints",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "lastEthDivPoints",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "lastSwapExecutionTime",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "MAGIC_NUMBER",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "SLIPPAGE_TOLERANCE_X_100",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "SWAP_PATH",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "swapAttemptPeriod",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "tokensToBeDisbursedOrBurnt",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "tokensToBeSwapped",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalClaimedRewards",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalClaimedRewardsEth",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalDivPoints",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "totalEarnedEth",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "totalEarnedTokens",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalEthDivPoints",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalTokens",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "trustedClaimableTokens",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "trustedDepositTokenAddress",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "trustedRewardTokenAddress",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "uniswapRouterV2",
    outputs: [
      {
        internalType: "contract IPangolinRouter",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "uniswapV2Pair",
    outputs: [
      {
        internalType: "contract IUniswapV2Pair",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

window.BUYBACK_STAKINGAVAX_ABI = [
  {
    inputs: [],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "tokenAddress",
        type: "address",
      },
    ],
    name: "DepositTokenAdded",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "tokenAddress",
        type: "address",
      },
    ],
    name: "DepositTokenRemoved",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "holder",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "RewardsTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "holder",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "Stake",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "holder",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "Unstake",
    type: "event",
  },
  {
    inputs: [],
    name: "ADMIN_CAN_CLAIM_AFTER",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "LOCKUP_TIME",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "REWARD_INTERVAL",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "REWARD_RATE_X_100",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "TRUSTED_TOKEN_ADDRESS",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_tokenAddress",
        type: "address",
      },
    ],
    name: "addTrustedDepositToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "claim",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "token",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "claimAnyToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "contractStartTime",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "depositedTokens",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "amountToWithdraw",
        type: "uint256",
      },
    ],
    name: "emergencyUnstake",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "getNumberOfHolders",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_holder",
        type: "address",
      },
    ],
    name: "getPendingDivs",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "startIndex",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "endIndex",
        type: "uint256",
      },
    ],
    name: "getStakersList",
    outputs: [
      {
        internalType: "address[]",
        name: "stakers",
        type: "address[]",
      },
      {
        internalType: "uint256[]",
        name: "stakingTimestamps",
        type: "uint256[]",
      },
      {
        internalType: "uint256[]",
        name: "lastClaimedTimeStamps",
        type: "uint256[]",
      },
      {
        internalType: "uint256[]",
        name: "stakedTokens",
        type: "uint256[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_holder",
        type: "address",
      },
    ],
    name: "getTotalPendingDivs",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "lastClaimedTime",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_tokenAddress",
        type: "address",
      },
    ],
    name: "removeTrustedDepositToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "rewardsPendingClaim",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "amountToDeposit",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "depositToken",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_amountOutMin",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_deadline",
        type: "uint256",
      },
    ],
    name: "stake",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "stakingTime",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalClaimedRewards",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "totalEarnedTokens",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "trustedDepositTokens",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "uniswapV2Router",
    outputs: [
      {
        internalType: "contract IUniswapV2Router",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "amountToWithdraw",
        type: "uint256",
      },
    ],
    name: "unstake",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

window.BUYBACK_STAKINGAVAX1_1_ABI = [
  {
    inputs: [
      { internalType: "address", name: "router", type: "address" },
      {
        internalType: "address",
        name: "trustedPlatformTokenAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "trustedDepositTokenAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "_feeRecipientAddress",
        type: "address",
      },
      { internalType: "uint256", name: "stakingFeeRateX100", type: "uint256" },
      {
        internalType: "uint256",
        name: "unstakingFeeRateX100",
        type: "uint256",
      },
      { internalType: "uint256", name: "lockupTime", type: "uint256" },
      { internalType: "uint256", name: "adminCanClaimAfter", type: "uint256" },
      { internalType: "uint256", name: "rewardRateX100", type: "uint256" },
      { internalType: "uint256", name: "rewardInterval", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "tokenAddress",
        type: "address",
      },
    ],
    name: "DepositTokenAdded",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "tokenAddress",
        type: "address",
      },
    ],
    name: "DepositTokenRemoved",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
    ],
    name: "EmergencyDeclared",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "newAddress",
        type: "address",
      },
    ],
    name: "FeeRecipientAddressChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "lockupTime",
        type: "uint256",
      },
    ],
    name: "LockupTimeChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "Reinvest",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "holder",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "RewardsTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "holder",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "Stake",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "contractAddress",
        type: "address",
      },
    ],
    name: "StakingContractChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "uint256", name: "fee", type: "uint256" },
    ],
    name: "StakingFeeChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "router",
        type: "address",
      },
    ],
    name: "UniswapV2RouterChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "holder",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "Unstake",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "uint256", name: "fee", type: "uint256" },
    ],
    name: "UnstakingFeeChanged",
    type: "event",
  },
  {
    inputs: [],
    name: "EMERGENCY_WAIT_TIME",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "LOCKUP_TIME",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "REWARD_INTERVAL",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "REWARD_RATE_X_100",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "STAKING_FEE_RATE_X_100",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "TRUSTED_DEPOSIT_TOKEN_ADDRESS",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "TRUSTED_PLATFORM_TOKEN_ADDRESS",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "TRUSTED_STAKING_CONTRACT_ADDRESS",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "UNSTAKING_FEE_RATE_X_100",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_tokenAddress", type: "address" },
    ],
    name: "addTrustedDepositToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "adminClaimableTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_amountOutMin", type: "uint256" },
      { internalType: "uint256", name: "_deadline", type: "uint256" },
    ],
    name: "claim",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "address", name: "recipient", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "claimAnyToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "contractStartTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "declareEmergency",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "depositedTokens",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "feeRecipientAddress",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getNumberOfHolders",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_holder", type: "address" }],
    name: "getPendingDivs",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "startIndex", type: "uint256" },
      { internalType: "uint256", name: "endIndex", type: "uint256" },
    ],
    name: "getStakersList",
    outputs: [
      { internalType: "address[]", name: "stakers", type: "address[]" },
      {
        internalType: "uint256[]",
        name: "stakingTimestamps",
        type: "uint256[]",
      },
      {
        internalType: "uint256[]",
        name: "lastClaimedTimeStamps",
        type: "uint256[]",
      },
      { internalType: "uint256[]", name: "stakedTokens", type: "uint256[]" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_holder", type: "address" }],
    name: "getTotalPendingDivs",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "isEmergency",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "lastClaimedTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "reInvest",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_tokenAddress", type: "address" },
    ],
    name: "removeTrustedDepositToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "rewardsPendingClaim",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "lockupTime", type: "uint256" },
      { internalType: "uint256", name: "stakingFeeRateX100", type: "uint256" },
      {
        internalType: "uint256",
        name: "unstakingFeeRateX100",
        type: "uint256",
      },
      { internalType: "address", name: "router", type: "address" },
      {
        internalType: "address",
        name: "newFeeRecipientAddress",
        type: "address",
      },
    ],
    name: "setContractVariables",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newFeeRecipientAddress",
        type: "address",
      },
    ],
    name: "setFeeRecipientAddress",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "lockupTime", type: "uint256" }],
    name: "setLockupTime",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "trustedStakingContractAddress",
        type: "address",
      },
    ],
    name: "setStakingContractAddress",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "newStakingFeeRateX100",
        type: "uint256",
      },
    ],
    name: "setStakingFeeRateX100",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "contract IUniswapV2Router",
        name: "router",
        type: "address",
      },
    ],
    name: "setUniswapV2Router",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "newUnstakingFeeRateX100",
        type: "uint256",
      },
    ],
    name: "setUnstakingFeeRateX100",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountToDeposit", type: "uint256" },
      { internalType: "address", name: "depositToken", type: "address" },
      {
        internalType: "uint256",
        name: "_amountOutMin_75Percent",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_amountOutMin_25Percent",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_amountOutMin_stakingReferralFee",
        type: "uint256",
      },
      { internalType: "uint256", name: "_deadline", type: "uint256" },
    ],
    name: "stake",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "stakingTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalClaimedRewards",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalDepositedTokens",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "totalEarnedTokens",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "newOwner", type: "address" }],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "trustedDepositTokens",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "uniswapV2Router",
    outputs: [
      { internalType: "contract IUniswapV2Router", name: "", type: "address" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountToWithdraw", type: "uint256" },
      { internalType: "uint256", name: "_amountOutMin", type: "uint256" },
      { internalType: "uint256", name: "_deadline", type: "uint256" },
    ],
    name: "unstake",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

window.BUYBACK_STAKINGAVAX1_2_ABI = [
  {
    inputs: [
      { internalType: "address", name: "router", type: "address" },
      {
        internalType: "address",
        name: "trustedPlatformTokenAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "trustedDepositTokenAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "_feeRecipientAddress",
        type: "address",
      },
      { internalType: "uint256", name: "stakingFeeRateX100", type: "uint256" },
      {
        internalType: "uint256",
        name: "unstakingFeeRateX100",
        type: "uint256",
      },
      { internalType: "uint256", name: "lockupTime", type: "uint256" },
      { internalType: "uint256", name: "adminCanClaimAfter", type: "uint256" },
      { internalType: "uint256", name: "rewardRateX100", type: "uint256" },
      { internalType: "uint256", name: "rewardInterval", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "tokenAddress",
        type: "address",
      },
    ],
    name: "DepositTokenAdded",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "tokenAddress",
        type: "address",
      },
    ],
    name: "DepositTokenRemoved",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
    ],
    name: "EmergencyDeclared",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "newAddress",
        type: "address",
      },
    ],
    name: "FeeRecipientAddressChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "lockupTime",
        type: "uint256",
      },
    ],
    name: "LockupTimeChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "Reinvest",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "holder",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "RewardsTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "holder",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "Stake",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "contractAddress",
        type: "address",
      },
    ],
    name: "StakingContractChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "uint256", name: "fee", type: "uint256" },
    ],
    name: "StakingFeeChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "router",
        type: "address",
      },
    ],
    name: "UniswapV2RouterChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "holder",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "Unstake",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "uint256", name: "fee", type: "uint256" },
    ],
    name: "UnstakingFeeChanged",
    type: "event",
  },
  {
    inputs: [],
    name: "EMERGENCY_WAIT_TIME",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "LOCKUP_TIME",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "REWARD_INTERVAL",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "REWARD_RATE_X_100",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "STAKING_FEE_RATE_X_100",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "TRUSTED_DEPOSIT_TOKEN_ADDRESS",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "TRUSTED_PLATFORM_TOKEN_ADDRESS",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "TRUSTED_STAKING_CONTRACT_ADDRESS",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "UNSTAKING_FEE_RATE_X_100",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_tokenAddress", type: "address" },
    ],
    name: "addTrustedDepositToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "adminClaimableTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_amountOutMin", type: "uint256" },
      { internalType: "uint256", name: "_deadline", type: "uint256" },
    ],
    name: "claim",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "address", name: "recipient", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "claimAnyToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "contractStartTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "declareEmergency",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "depositedTokens",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "feeRecipientAddress",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getNumberOfHolders",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_holder", type: "address" }],
    name: "getPendingDivs",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "startIndex", type: "uint256" },
      { internalType: "uint256", name: "endIndex", type: "uint256" },
    ],
    name: "getStakersList",
    outputs: [
      { internalType: "address[]", name: "stakers", type: "address[]" },
      {
        internalType: "uint256[]",
        name: "stakingTimestamps",
        type: "uint256[]",
      },
      {
        internalType: "uint256[]",
        name: "lastClaimedTimeStamps",
        type: "uint256[]",
      },
      { internalType: "uint256[]", name: "stakedTokens", type: "uint256[]" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_holder", type: "address" }],
    name: "getTotalPendingDivs",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "isEmergency",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "lastClaimedTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "reInvest",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_tokenAddress", type: "address" },
    ],
    name: "removeTrustedDepositToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "rewardsPendingClaim",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "lockupTime", type: "uint256" },
      { internalType: "uint256", name: "stakingFeeRateX100", type: "uint256" },
      {
        internalType: "uint256",
        name: "unstakingFeeRateX100",
        type: "uint256",
      },
      { internalType: "address", name: "router", type: "address" },
      {
        internalType: "address",
        name: "newFeeRecipientAddress",
        type: "address",
      },
    ],
    name: "setContractVariables",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newFeeRecipientAddress",
        type: "address",
      },
    ],
    name: "setFeeRecipientAddress",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "lockupTime", type: "uint256" }],
    name: "setLockupTime",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "trustedStakingContractAddress",
        type: "address",
      },
    ],
    name: "setStakingContractAddress",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "newStakingFeeRateX100",
        type: "uint256",
      },
    ],
    name: "setStakingFeeRateX100",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "contract IUniswapV2Router",
        name: "router",
        type: "address",
      },
    ],
    name: "setUniswapV2Router",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "newUnstakingFeeRateX100",
        type: "uint256",
      },
    ],
    name: "setUnstakingFeeRateX100",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountToDeposit", type: "uint256" },
      { internalType: "address", name: "depositToken", type: "address" },
      {
        internalType: "uint256",
        name: "_amountOutMin_75Percent",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_amountOutMin_25Percent",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_amountOutMin_stakingReferralFee",
        type: "uint256",
      },
      { internalType: "uint256", name: "_deadline", type: "uint256" },
    ],
    name: "stake",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "stakingTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalClaimedRewards",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalDepositedTokens",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "totalEarnedTokens",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "newOwner", type: "address" }],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "trustedDepositTokens",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "uniswapV2Router",
    outputs: [
      { internalType: "contract IUniswapV2Router", name: "", type: "address" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountToWithdraw", type: "uint256" },
      { internalType: "uint256", name: "_amountOutMin", type: "uint256" },
      { internalType: "uint256", name: "_deadline", type: "uint256" },
    ],
    name: "unstake",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

window.CONSTANT_STAKINGAVAX_ABI = [
  {
    inputs: [],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "referrer",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "ReferralFeeTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "holder",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "Reinvest",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "holder",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "RewardsTransferred",
    type: "event",
  },
  {
    inputs: [],
    name: "ADMIN_CAN_CLAIM_AFTER",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "LOCKUP_TIME",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "REFERRAL_FEE_RATE_X_100",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "REWARD_INTERVAL",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "REWARD_RATE_X_100",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "STAKING_FEE_RATE_X_100",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "TRUSTED_TOKEN_ADDRESS",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "UNSTAKING_FEE_RATE_X_100",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "claim",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "contractStartTime",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "depositedTokens",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "i",
        type: "uint256",
      },
    ],
    name: "getActiveReferredStaker",
    outputs: [
      {
        internalType: "address",
        name: "_staker",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_totalEarned",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getNumberOfHolders",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "referrer",
        type: "address",
      },
    ],
    name: "getNumberOfReferredStakers",
    outputs: [
      {
        internalType: "uint256",
        name: "_activeStakers",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_totalStakers",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_holder",
        type: "address",
      },
    ],
    name: "getPendingDivs",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "i",
        type: "uint256",
      },
    ],
    name: "getReferredStaker",
    outputs: [
      {
        internalType: "address",
        name: "_staker",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_totalEarned",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "startIndex",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "endIndex",
        type: "uint256",
      },
    ],
    name: "getStakersList",
    outputs: [
      {
        internalType: "address[]",
        name: "stakers",
        type: "address[]",
      },
      {
        internalType: "uint256[]",
        name: "stakingTimestamps",
        type: "uint256[]",
      },
      {
        internalType: "uint256[]",
        name: "lastClaimedTimeStamps",
        type: "uint256[]",
      },
      {
        internalType: "uint256[]",
        name: "stakedTokens",
        type: "uint256[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_holder",
        type: "address",
      },
    ],
    name: "getTotalPendingDivs",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "lastClaimedTime",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "reInvest",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "referrals",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "rewardsPendingClaim",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amountToStake",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "referrer",
        type: "address",
      },
    ],
    name: "stake",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "stakeExternal",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "stakingTime",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalClaimedReferralFee",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalClaimedRewards",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "totalEarnedTokens",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "totalReferralFeeEarned",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "tokenAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "recipient",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "transferAnyERC20Token",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "tokenAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "recipient",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "transferAnyLegacyERC20Token",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "trustedStakingContractAddress",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

window.TOKENAVAX_ABI = [
  {
    inputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "Approval",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "from",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "Transfer",
    type: "event",
  },
  {
    constant: true,
    inputs: [
      {
        internalType: "address",
        name: "_owner",
        type: "address",
      },
      {
        internalType: "address",
        name: "_spender",
        type: "address",
      },
    ],
    name: "allowance",
    outputs: [
      {
        internalType: "uint256",
        name: "remaining",
        type: "uint256",
      },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      {
        internalType: "address",
        name: "_spender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_value",
        type: "uint256",
      },
    ],
    name: "approve",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      {
        internalType: "address",
        name: "_spender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_value",
        type: "uint256",
      },
      {
        internalType: "bytes",
        name: "_extraData",
        type: "bytes",
      },
    ],
    name: "approveAndCall",
    outputs: [
      {
        internalType: "bool",
        name: "success",
        type: "bool",
      },
    ],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [
      {
        internalType: "address",
        name: "_owner",
        type: "address",
      },
    ],
    name: "balanceOf",
    outputs: [
      {
        internalType: "uint256",
        name: "balance",
        type: "uint256",
      },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      {
        internalType: "address",
        name: "_spender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_subtractedValue",
        type: "uint256",
      },
    ],
    name: "decreaseApproval",
    outputs: [
      {
        internalType: "bool",
        name: "success",
        type: "bool",
      },
    ],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      {
        internalType: "address",
        name: "_spender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_addedValue",
        type: "uint256",
      },
    ],
    name: "increaseApproval",
    outputs: [
      {
        internalType: "bool",
        name: "success",
        type: "bool",
      },
    ],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "initialSupply",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "name",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "owner",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "symbol",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "totalSupply",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      {
        internalType: "address",
        name: "_to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_value",
        type: "uint256",
      },
    ],
    name: "transfer",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      {
        internalType: "address",
        name: "_tokenAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "_to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_amount",
        type: "uint256",
      },
    ],
    name: "transferAnyERC20Token",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      {
        internalType: "address",
        name: "_from",
        type: "address",
      },
      {
        internalType: "address",
        name: "_to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_value",
        type: "uint256",
      },
    ],
    name: "transferFrom",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      {
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "transferOwnership",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
];

window.TOKENBSC_ABI = [
  {
    inputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "Approval",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "from",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "Transfer",
    type: "event",
  },
  {
    constant: true,
    inputs: [
      {
        internalType: "address",
        name: "_owner",
        type: "address",
      },
      {
        internalType: "address",
        name: "_spender",
        type: "address",
      },
    ],
    name: "allowance",
    outputs: [
      {
        internalType: "uint256",
        name: "remaining",
        type: "uint256",
      },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      {
        internalType: "address",
        name: "_spender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_value",
        type: "uint256",
      },
    ],
    name: "approve",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      {
        internalType: "address",
        name: "_spender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_value",
        type: "uint256",
      },
      {
        internalType: "bytes",
        name: "_extraData",
        type: "bytes",
      },
    ],
    name: "approveAndCall",
    outputs: [
      {
        internalType: "bool",
        name: "success",
        type: "bool",
      },
    ],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [
      {
        internalType: "address",
        name: "_owner",
        type: "address",
      },
    ],
    name: "balanceOf",
    outputs: [
      {
        internalType: "uint256",
        name: "balance",
        type: "uint256",
      },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      {
        internalType: "address",
        name: "_spender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_subtractedValue",
        type: "uint256",
      },
    ],
    name: "decreaseApproval",
    outputs: [
      {
        internalType: "bool",
        name: "success",
        type: "bool",
      },
    ],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      {
        internalType: "address",
        name: "_spender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_addedValue",
        type: "uint256",
      },
    ],
    name: "increaseApproval",
    outputs: [
      {
        internalType: "bool",
        name: "success",
        type: "bool",
      },
    ],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "initialSupply",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "name",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "owner",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "symbol",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "totalSupply",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      {
        internalType: "address",
        name: "_to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_value",
        type: "uint256",
      },
    ],
    name: "transfer",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      {
        internalType: "address",
        name: "_tokenAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "_to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_amount",
        type: "uint256",
      },
    ],
    name: "transferAnyERC20Token",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      {
        internalType: "address",
        name: "_from",
        type: "address",
      },
      {
        internalType: "address",
        name: "_to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_value",
        type: "uint256",
      },
    ],
    name: "transferFrom",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      {
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "transferOwnership",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
];

window.CONSTANT_STAKING_IDYP_ABI = [
  { inputs: [], stateMutability: "nonpayable", type: "constructor" },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "referrer",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "ReferralFeeTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "holder",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "Reinvest",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "holder",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "RewardsTransferred",
    type: "event",
  },
  {
    inputs: [],
    name: "ADMIN_CAN_CLAIM_AFTER",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "LOCKUP_TIME",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "REFERRAL_FEE_RATE_X_100",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "REWARD_INTERVAL",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "REWARD_RATE_X_100",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "STAKING_FEE_RATE_X_100",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "TRUSTED_TOKEN_ADDRESS",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "UNSTAKING_FEE_RATE_X_100",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "claim",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "contractStartTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "depositedTokens",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountToWithdraw", type: "uint256" },
    ],
    name: "emergencyUnstake",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "account", type: "address" },
      { internalType: "uint256", name: "i", type: "uint256" },
    ],
    name: "getActiveReferredStaker",
    outputs: [
      { internalType: "address", name: "_staker", type: "address" },
      { internalType: "uint256", name: "_totalEarned", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getNumberOfHolders",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "referrer", type: "address" }],
    name: "getNumberOfReferredStakers",
    outputs: [
      { internalType: "uint256", name: "_activeStakers", type: "uint256" },
      { internalType: "uint256", name: "_totalStakers", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_holder", type: "address" }],
    name: "getPendingDivs",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "account", type: "address" },
      { internalType: "uint256", name: "i", type: "uint256" },
    ],
    name: "getReferredStaker",
    outputs: [
      { internalType: "address", name: "_staker", type: "address" },
      { internalType: "uint256", name: "_totalEarned", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "startIndex", type: "uint256" },
      { internalType: "uint256", name: "endIndex", type: "uint256" },
    ],
    name: "getStakersList",
    outputs: [
      { internalType: "address[]", name: "stakers", type: "address[]" },
      {
        internalType: "uint256[]",
        name: "stakingTimestamps",
        type: "uint256[]",
      },
      {
        internalType: "uint256[]",
        name: "lastClaimedTimeStamps",
        type: "uint256[]",
      },
      { internalType: "uint256[]", name: "stakedTokens", type: "uint256[]" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_holder", type: "address" }],
    name: "getTotalPendingDivs",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "lastClaimedTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "reInvest",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "referrals",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "rewardsPendingClaim",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountToStake", type: "uint256" },
      { internalType: "address", name: "referrer", type: "address" },
    ],
    name: "stake",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "stakingTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalClaimedReferralFee",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalClaimedRewards",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "totalEarnedTokens",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "totalReferralFeeEarned",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "tokenAddress", type: "address" },
      { internalType: "address", name: "recipient", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "transferAnyERC20Token",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "tokenAddress", type: "address" },
      { internalType: "address", name: "recipient", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "transferAnyLegacyERC20Token",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "newOwner", type: "address" }],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountToWithdraw", type: "uint256" },
    ],
    name: "unstake",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

window.CONSTANT_STAKING_DAI_ABI = [
  {
    inputs: [
      {
        internalType: "address",
        name: "_uniswapV2RouterAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "_feeRecipientAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "trustedDepositTokenAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "trustedRewardTokenAddress",
        type: "address",
      },
      { internalType: "uint256", name: "referralFeeRateX100", type: "uint256" },
      { internalType: "uint256", name: "stakingFeeRateX100", type: "uint256" },
      {
        internalType: "uint256",
        name: "unstakingFeeRateX100",
        type: "uint256",
      },
      { internalType: "uint256", name: "rewardRateX100", type: "uint256" },
      { internalType: "uint256", name: "rewardInterval", type: "uint256" },
      { internalType: "uint256", name: "lockupTime", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
    ],
    name: "EmergencyDeclared",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "newAddress",
        type: "address",
      },
    ],
    name: "FeeRecipientAddressChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "_newLockupTime",
        type: "uint256",
      },
    ],
    name: "LockupTimeChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "newFee",
        type: "uint256",
      },
    ],
    name: "ReferralFeeChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "referrer",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "ReferralFeeTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "holder",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "Reinvest",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "holder",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "RewardsTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "Stake",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "newFee",
        type: "uint256",
      },
    ],
    name: "StakingFeeChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "contractAddress",
        type: "address",
      },
    ],
    name: "TrustedDepositContractAdded",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "contractAddress",
        type: "address",
      },
    ],
    name: "TrustedDepositContractRemoved",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "router",
        type: "address",
      },
    ],
    name: "UniswapV2RouterChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "Unstake",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "newFee",
        type: "uint256",
      },
    ],
    name: "UnstakingFeeChanged",
    type: "event",
  },
  {
    inputs: [],
    name: "EMERGENCY_WAIT_TIME",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "LOCKUP_TIME",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "REFERRAL_FEE_RATE_X_100",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "REWARD_INTERVAL",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "REWARD_RATE_X_100",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "STAKING_FEE_RATE_X_100",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "TRUSTED_DEPOSIT_TOKEN_ADDRESS",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "TRUSTED_REWARD_TOKEN_ADDRESS",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "TRUSTED_WETH_TOKEN_ADDRESS",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "UNSTAKING_FEE_RATE_X_100",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_address", type: "address" }],
    name: "addTrustedDepositContractAddress",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "adminCanClaimAfter",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "adminClaimableTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_amountOutMin_referralFee",
        type: "uint256",
      },
      { internalType: "uint256", name: "_amountOutMin_claim", type: "uint256" },
      { internalType: "uint256", name: "_deadline", type: "uint256" },
    ],
    name: "claim",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "address", name: "recipient", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "claimAnyToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "contractStartTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "declareEmergency",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "depositedTokens",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "feeRecipientAddress",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "account", type: "address" },
      { internalType: "uint256", name: "i", type: "uint256" },
    ],
    name: "getActiveReferredStaker",
    outputs: [
      { internalType: "address", name: "_staker", type: "address" },
      { internalType: "uint256", name: "_totalEarned", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getNumberOfHolders",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "referrer", type: "address" }],
    name: "getNumberOfReferredStakers",
    outputs: [
      { internalType: "uint256", name: "_activeStakers", type: "uint256" },
      { internalType: "uint256", name: "_totalStakers", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_holder", type: "address" }],
    name: "getPendingDivs",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "account", type: "address" },
      { internalType: "uint256", name: "i", type: "uint256" },
    ],
    name: "getReferredStaker",
    outputs: [
      { internalType: "address", name: "_staker", type: "address" },
      { internalType: "uint256", name: "_totalEarned", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "startIndex", type: "uint256" },
      { internalType: "uint256", name: "endIndex", type: "uint256" },
    ],
    name: "getStakersList",
    outputs: [
      { internalType: "address[]", name: "stakers", type: "address[]" },
      {
        internalType: "uint256[]",
        name: "stakingTimestamps",
        type: "uint256[]",
      },
      {
        internalType: "uint256[]",
        name: "lastClaimedTimeStamps",
        type: "uint256[]",
      },
      { internalType: "uint256[]", name: "stakedTokens", type: "uint256[]" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_holder", type: "address" }],
    name: "getTotalPendingDivs",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "isEmergency",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "isTrustedDepositContract",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "lastClaimedTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_amountOutMin_referralFee",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_amountOutMin_reinvest",
        type: "uint256",
      },
      { internalType: "uint256", name: "_deadline", type: "uint256" },
    ],
    name: "reInvest",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "referrals",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_address", type: "address" }],
    name: "removeTrustedDepositContractAddress",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "rewardsPendingClaim",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "lockupTime", type: "uint256" },
      { internalType: "uint256", name: "referralFeeRateX100", type: "uint256" },
      { internalType: "uint256", name: "stakingFeeRateX100", type: "uint256" },
      {
        internalType: "uint256",
        name: "unstakingFeeRateX100",
        type: "uint256",
      },
      { internalType: "address", name: "router", type: "address" },
      {
        internalType: "address",
        name: "_feeRecipientAddress",
        type: "address",
      },
    ],
    name: "setContractVariables",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newFeeRecipientAddress",
        type: "address",
      },
    ],
    name: "setFeeRecipientAddress",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_newLockupTime", type: "uint256" },
    ],
    name: "setLockupTime",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_newReferralFeeRateX100",
        type: "uint256",
      },
    ],
    name: "setReferralFeeRateX100",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_newRewardRate", type: "uint256" },
    ],
    name: "setRewardRate",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_newStakingFeeRateX100",
        type: "uint256",
      },
    ],
    name: "setStakingFeeRateX100",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "contract IUniswapV2Router",
        name: "_newUniswapV2Router",
        type: "address",
      },
    ],
    name: "setUniswapV2Router",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_newUnstakingFeeRateX100",
        type: "uint256",
      },
    ],
    name: "setUnstakingFeeRateX100",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountToStake", type: "uint256" },
      { internalType: "address", name: "referrer", type: "address" },
      {
        internalType: "uint256",
        name: "_amountOutMin_referralFee",
        type: "uint256",
      },
      { internalType: "uint256", name: "_deadline", type: "uint256" },
    ],
    name: "stake",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "stakingTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalClaimedReferralFee",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalClaimedRewards",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "totalEarnedTokens",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "totalReferralFeeEarned",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "newOwner", type: "address" }],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "uniswapV2Router",
    outputs: [
      { internalType: "contract IUniswapV2Router", name: "", type: "address" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountToWithdraw", type: "uint256" },
      {
        internalType: "uint256",
        name: "_amountOutMin_referralFee",
        type: "uint256",
      },
      { internalType: "uint256", name: "_deadline", type: "uint256" },
    ],
    name: "unstake",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

window.FARMWETH_ABI = window.TOKEN_ABI;
window.TOKEN_WETH = window.TOKEN_ABI;
window.TOKEN_WBTC = window.TOKEN_ABI;
window.TOKEN_USDT = window.TOKEN_ABI;
window.TOKEN_USDC = window.TOKEN_ABI;
window.TOKEN_DAI = window.TOKEN_ABI;

window.REWARD_TOKEN_ABI = window.TOKEN_ABI;

window.rebase_factors = [
  1, 1, 1, 1, 1e4, 1e4, 1e4, 1e4, 1e4, 1e4, 1e4, 1e4, 1e4, 1e4, 1e4, 1e4,
];

window.rebase_factorsavax = [1, 1, 1, 1, 1, 1, 1, 1, 1];

window.rebase_factorsbsc = [
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,

  1, 1, 1, 1, 1,
];

/* Farming New */
window.token_new = new TOKEN("TOKEN_NEW");

// window.token_weth = new TOKEN(window.config.token_weth_address)
window.token_weth = new TOKEN("TOKEN_WETH");
window.token_wbtc = new TOKEN("TOKEN_WBTC");
window.token_usdc = new TOKEN("TOKEN_USDC");
window.token_usdt = new TOKEN("TOKEN_USDT");
window.token_dai = new TOKEN("TOKEN_DAI");

window.vault_weth = new VAULT_NEW(
  window.config.vault_weth_address,
  window.config.token_weth_address
);
window.vault_wethnew = new VAULT_NEW(
  window.config.vault_wethnew_address,
  window.config.token_weth_address
);
window.vault_wbtc = new VAULT_NEW(
  window.config.vault_wbtc_address,
  window.config.token_wbtc_address
);
window.vault_wbtcnew = new VAULT_NEW(
  window.config.vault_wbtcnew_address,
  window.config.token_wbtc_address
);
window.vault_usdt = new VAULT_NEW(
  window.config.vault_usdt_address,
  window.config.token_usdt_address
);
window.vault_usdtnew = new VAULT_NEW(
  window.config.vault_usdtnew_address,
  window.config.token_usdt_address
);
window.vault_usdc = new VAULT_NEW(
  window.config.vault_usdc_address,
  window.config.token_usdc_address
);
window.vault_usdcnew = new VAULT_NEW(
  window.config.vault_usdcnew_address,
  window.config.token_usdc_address
);
window.vault_dai = new VAULT_NEW(
  window.config.vault_dai_address,
  window.config.token_dai_address
);
window.vault_dainew = new VAULT_NEW(
  window.config.vault_dainew_address,
  window.config.token_dai_address
);

window.farming_new_1 = new STAKING("FARMING_NEW_1");

window.farming_new_2 = new STAKING("FARMING_NEW_2");

window.farming_new_3 = new STAKING("FARMING_NEW_3");

window.farming_new_4 = new STAKING("FARMING_NEW_4");

window.farming_new_5 = new STAKING("FARMING_NEW_5");

window.constant_staking_30 = new CONSTANT_STAKING_OLD("CONSTANT_STAKINGOLD_30");

// window.token_idyp = new TOKEN(window.config.reward_token_idyp_address)

window.isConnectedOneTime = false;
window.oneTimeConnectionEvents = [];
function addOneTimeWalletConnectionListener(fn) {
  oneTimeConnectionEvents.push(fn);
  console.log({ oneTimeConnectionEvents });
}
function removeOneTimeWalletConnectionListener(fn) {
  oneTimeConnectionEvents = oneTimeConnectionEvents.filter((e) => e != fn);
  console.log({ oneTimeConnectionEvents });
}

function getData(ajaxurl) {
  return $.ajax({
    url: ajaxurl,
    type: "GET",
  });
}

async function getMaxFee() {
  let maxPriorityFeePerGas = new BigNumber(10000000000).toFixed(0) * 1;
  let latestGasPrice = await window.web3.eth.getGasPrice();
  latestGasPrice =
    new BigNumber(latestGasPrice * 1.125 + maxPriorityFeePerGas).toFixed(0) * 1;

  return { latestGasPrice, maxPriorityFeePerGas };
}

// function to connect metamask
async function connectWallet(provider, walletType) {
  //walletConnect
  if (walletType) {
    await provider.enable();
    window.web3 = new Web3(provider);
    let coinbase_address = await window.web3.eth.getAccounts();
    window.coinbase_address = coinbase_address[0];

    window.IS_CONNECTED = true;
    return true;
  } else if (window.ethereum) {
    //Web3 Providers
    window.web3 = new Web3(window.ethereum);
    try {
      await window.ethereum.enable();
      console.log("Connected!");
      window.IS_CONNECTED = true;
      if (window.coin98) window.WALLET_TYPE = "coin98";
      else if (window.ethereum.isMetaMask === true && !window.coin98)
        window.WALLET_TYPE = "metamask";
      else if (window.ethereum.isCoinbaseWallet)
        window.WALLET_TYPE = "coinbase";
      else if (window.trustwallet) window.WALLET_TYPE = "trustwallet";

      let coinbase_address = await window.ethereum.request({
        method: "eth_accounts",
      });

      window.coinbase_address = coinbase_address[0];
      console.log(window.coinbase_address);
      return true;
    } catch (e) {
      console.error(e);
      throw new Error("User denied wallet connection!");
    }
  } else if (window.web3) {
    window.web3 = new Web3(window.web3.currentProvider);
    console.log("connected to old web3");
    window.IS_CONNECTED = true;
    return true;
  } else {
    throw new Error("No web3 detected!");
  }
}
function param(name) {
  var f = new RegExp("\\b" + name + "=([^&]+)").exec(document.location.search);
  if (f) return decodeURIComponent(f[1].replace(/\+/g, " "));
}

window.param = param;

window.cached_contracts = Object.create(null);

async function getCoinbase() {
  if (window.ethereum && (window.coin98 || window.ethereum.isCoinbaseWallet)) {
    return window.coinbase_address.toLowerCase();
  } else if (window.ethereum && !window.coin98) {
    const coinbase = await window.ethereum.request({
      method: "eth_accounts",
    });

    if (coinbase && coinbase.length > 0) {
      window.coinbase_address = coinbase[0];
      return window.coinbase_address.toLowerCase();
    }
  }
}

// function getCoinbase() {
//   if (
//     window.WALLET_TYPE == "coin98" ||
//     (window.ethereum && window.ethereum.isCoin98 && window.ethereum.isMetaMask)
//   ) {
//     console.log("yes");
//     return window.coinbase_address.toLowerCase();
//   } else if (
//     window.WALLET_TYPE == "coin98" ||
//     (window.ethereum && !window.ethereum.isCoin98 && window.ethereum.isMetaMask)
//   ) {
//     console.log("no");
//     return window.web3.eth?.getCoinbase();
//   }
// }

// function getCoinbase() {
//   if ( window.WALLET_TYPE == 'coin98' ) {
//   	return window.coinbase_address.toLowerCase()
//   }
//   else{
//   	return window.web3.eth.getCoinbase()
//   }
//   return window.coinbase_address;
// }

async function getContract({ key, address = null, ABI = null }) {
  ABI = ABI || window[key + "_ABI"];
  address = address || window.config[key.toLowerCase() + "_address"];
  if (!window.cached_contracts[key]) {
    window.web3 = new Web3(window.ethereum);
    window.cached_contracts[key] = new window.web3.eth.Contract(ABI, address, {
      from: await getCoinbase(),
    });
  }
  return window.cached_contracts[key];
}

function wait(ms) {
  console.log("Waiting " + ms + "ms");
  return new Promise((r) =>
    setTimeout(() => {
      r(true);
      console.log("Wait over!");
    }, ms)
  );
}

function getPrice(coingecko_id = "ethereum", vs_currency = "usd") {
  return new Promise((resolve, reject) => {
    window.$.get(
      `https://pro-api.coingecko.com/api/v3/simple/price?ids=${coingecko_id}&vs_currencies=${vs_currency}&x_cg_pro_api_key=CG-4cvtCNDCA4oLfmxagFJ84qev`
    )
      .then((result) => {
        resolve(result[coingecko_id][vs_currency]);
      })
      .catch((error) => {
        reject(error);
      });
  });
}

async function getActiveLockIdsLengthByRecipient(recipient) {
  let lockerContract = await getContract({ key: "LOCKER" });
  return await lockerContract.methods
    .getActiveLockIdsLengthByRecipient(recipient)
    .call();
}

async function getActiveLockIdsLengthByRecipientETH(recipient) {
  let lockerContract = await getContract({ key: "LOCKERETH" });
  return await lockerContract.methods
    .getActiveLockIdsLengthByRecipient(recipient)
    .call();
}

async function getActiveLockIdsLengthByToken(tokenAddress) {
  let lockerContract = await getContract({ key: "LOCKER" });
  return await lockerContract.methods
    .getActiveLockIdsLengthByToken(tokenAddress)
    .call();
}

async function getActiveLockIdsLengthByTokenETH(tokenAddress) {
  let lockerContract = await getContract({ key: "LOCKERETH" });
  return await lockerContract.methods
    .getActiveLockIdsLengthByToken(tokenAddress)
    .call();
}

async function getActiveLocksByToken(tokenAddress, startIndex, endIndex) {
  let lockerContract = await getContract({ key: "LOCKER" });
  let lockIds = await lockerContract.methods
    .getActiveLockIdsByToken(tokenAddress, startIndex, endIndex)
    .call();
  let locks = await lockerContract.methods.getLocksByIds(lockIds).call();
  return processedLocks(locks);
}

window.buyback_tokens = {
  "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2": {
    symbol: "WETH",
    decimals: 18,
  },
  "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599": {
    symbol: "WBTC",
    decimals: 8,
  },
  "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": {
    symbol: "USDC",
    decimals: 6,
  },
  "0xdac17f958d2ee523a2206206994597c13d831ec7": {
    symbol: "USDT",
    decimals: 6,
  },
  // '0x6b175474e89094c44da98b954eedeac495271d0f': {
  // 	symbol: 'DAI', decimals: 18
  // },
  // '0x514910771af9ca656af840dff83e8264ecf986ca': {
  // 	symbol: 'LINK', decimals: 18
  // }
};

window.buyback_tokens_farming = {
  "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2": {
    symbol: "WETH",
    decimals: 18,
  },
  "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599": {
    symbol: "WBTC",
    decimals: 8,
  },
  "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": {
    symbol: "USDC",
    decimals: 6,
  },
  "0xdac17f958d2ee523a2206206994597c13d831ec7": {
    symbol: "USDT",
    decimals: 6,
  },
  // '0x6b175474e89094c44da98b954eedeac495271d0f': {
  // 	symbol: 'DAI', decimals: 18
  // },
  // '0x514910771af9ca656af840dff83e8264ecf986ca': {
  // 	symbol: 'LINK', decimals: 18
  // },
  // '0xbd100d061e120b2c67a24453cf6368e63f1be056': {
  // 	symbol: 'iDYP', decimals: 18
  // }
};

window.buyback_activetokens_farmingavax = {
  "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7": {
    symbol: "WAVAX",
    decimals: 18,
  },
};

window.buyback_tokens_farmingavax = {
  "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7": {
    symbol: "WAVAX",
    decimals: 18,
  },
  "0x49d5c2bdffac6ce2bfdb6640f4f80f226bc10bab": {
    symbol: "WETH.e",
    decimals: 18,
  },
  "0x50b7545627a5162f82a992c33b87adc75187b218": {
    symbol: "WBTC.e",
    decimals: 8,
  },
  "0x60781c2586d68229fde47564546784ab3faca982": {
    symbol: "PNG",
    decimals: 18,
  },
  "0xc7198437980c041c805a1edcba50c1ce5db95118": {
    symbol: "USDT.e",
    decimals: 6,
  },
  "0x8729438eb15e2c8b576fcc6aecda6a148776c0f5": {
    symbol: "QI",
    decimals: 18,
  },
  "0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664": {
    symbol: "USDC.e",
    decimals: 6,
  },
  "0xd586e7f844cea2f87f50152665bcbc2c279d8d70": {
    symbol: "DAI.e",
    decimals: 18,
  },
  "0xd1c3f94de7e5b45fa4edbba472491a9f4b166fc4": {
    symbol: "XAVA",
    decimals: 18,
  },
  "0x5947bb275c521040051d82396192181b413227a3": {
    symbol: "LINK.e",
    decimals: 18,
  },
  "0xbd100d061e120b2c67a24453cf6368e63f1be056": {
    symbol: "iDYP",
    decimals: 18,
  },
};

window.buyback_tokensbsc = {
  "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c": {
    symbol: "WBNB",
    decimals: 18,
  },
  "0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c": {
    symbol: "BTCB",
    decimals: 18,
  },
  "0x2170ed0880ac9a755fd29b2688956bd959f933f8": {
    symbol: "ETH",
    decimals: 18,
  },
  "0xe9e7cea3dedca5984780bafc599bd69add087d56": {
    symbol: "BUSD",
    decimals: 18,
  },
  "0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82": {
    symbol: "CAKE",
    decimals: 18,
  },
};

window.buyback_activetokensbsc = {
  "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c": {
    symbol: "WBNB",
    decimals: 18,
  },
};

const LP_IDs_V2 = {
  weth: [
    "0x7463286a379f6f128058bb92b355e3d6e8bdb219-0xa68bbe793ad52d0e62bbf34a67f02235ba69e737",
    "0x7463286a379f6f128058bb92b355e3d6e8bdb219-0xcfd970494a0b3c52a81dce1ecbff2245e6b0b0e7",
    "0x7463286a379f6f128058bb92b355e3d6e8bdb219-0x49d02cf81cc352517350f25e200365360426af94",
    "0x7463286a379f6f128058bb92b355e3d6e8bdb219-0xf51965c570419f2576ec9aead6a3c5f674424a99",
    "0x7463286a379f6f128058bb92b355e3d6e8bdb219-0x997a7254e5567d0a70329defcc1e4d29d71ba224",
  ],
};

window.LP_IDs_V2 = LP_IDs_V2;

const LP_ID_LIST_V2 = Object.keys(LP_IDs_V2)
  .map((key) => LP_IDs_V2[key])
  .flat();

const LP_IDs_V2Avax = {
  wavax: [
    "0x66eecc97203704d9e2db4a431cb0e9ce92539d5a-0x035d65babf595758d7a439d5870badc44218d028",
    "0x66eecc97203704d9e2db4a431cb0e9ce92539d5a-0x6c325dfea0d18387d423c869e328ef005cba024f",
    "0x66eecc97203704d9e2db4a431cb0e9ce92539d5a-0x85c4f0cea0994de365dc47ba22dd0fd9899f93ab",
    "0x66eecc97203704d9e2db4a431cb0e9ce92539d5a-0x6f5dc6777b2b4667bf183d093111867239518af5",
    "0x66eecc97203704d9e2db4a431cb0e9ce92539d5a-0x10e105676cac55b74cb6500a8fb5d2f84804393d",
  ],
};

const LP_IDs_V2BNB = {
  wbnb: [
    "0x1bc61d08a300892e784ed37b2d0e63c85d1d57fb-0x537dc4fee298ea79a7f65676735415f1e2882f92",
    "0x1bc61d08a300892e784ed37b2d0e63c85d1d57fb-0x219717bf0bc33b2764a6c1a772f75305458bda3d",
    "0x1bc61d08a300892e784ed37b2d0e63c85d1d57fb-0xd1151a2434931f34bcfa6c27639b67c1a23d93af",
    "0x1bc61d08a300892e784ed37b2d0e63c85d1d57fb-0xed869ba773c3f1a1adcc87930ca36ee2dc73435d",
    "0x1bc61d08a300892e784ed37b2d0e63c85d1d57fb-0x415b1624710296717fa96cad84f53454e8f02d18",
  ],
};

window.LP_IDs_V2Avax = LP_IDs_V2Avax;
window.LP_IDs_V2BNB = LP_IDs_V2BNB;

const LP_ID_LIST_V2Avax = Object.keys(LP_IDs_V2Avax)
  .map((key) => LP_IDs_V2Avax[key])
  .flat();
window.LP_ID_LIST_V2Avax = LP_ID_LIST_V2Avax;

const LP_ID_LIST_V2BNB = Object.keys(LP_IDs_V2BNB)
  .map((key) => LP_IDs_V2BNB[key])
  .flat();
window.LP_ID_LIST_V2BNB = LP_ID_LIST_V2BNB;

window.LP_ID_LIST_V2 = LP_ID_LIST_V2;

window.the_graph_result_eth_v2 = {};

window.the_graph_result_avax_v2 = {};

async function get_the_graph_avax_v2() {
  try {
    const res = await getData("https://api.dyp.finance/api/the_graph_avax_v2");
    window.the_graph_result_avax_v2 = res.the_graph_avax_v2;
  } catch (err) {
    console.log(err);
  }
  return window.the_graph_result_avax_v2;
}

window.get_the_graph_avax_v2 = get_the_graph_avax_v2;

async function get_the_graph_eth_v2() {
  try {
    const res = await getData("https://api.dyp.finance/api/the_graph_eth_v2");
    window.the_graph_result_eth_v2 = res.the_graph_eth_v2;
  } catch (err) {
    console.log(err);
  }
  return window.the_graph_result_eth_v2;
}

window.get_the_graph_eth_v2 = get_the_graph_eth_v2;

window.the_graph_result_bsc_v2 = {};

async function get_the_graph_bsc_v2() {
  try {
    const res = await getData("https://api.dyp.finance/api/the_graph_bsc_v2");
    window.the_graph_result_bsc_v2 = res.the_graph_bsc_v2;
  } catch (err) {
    console.log(err);
  }
  return window.the_graph_result_bsc_v2;
}

window.get_the_graph_bsc_v2 = get_the_graph_bsc_v2;

async function get_apy_and_tvl(usd_values) {
  let { token_data, lp_data, usd_per_eth } = usd_values;

  let token_price_usd = token_data[TOKEN_ADDRESS].token_price_usd * 1;
  let balances_by_address = {},
    number_of_holders_by_address = {};
  let lp_ids = Object.keys(lp_data);
  let addrs = lp_ids.map((a) => a.split("-")[1]);
  let token_balances = await get_token_balances({
    TOKEN_ADDRESS,
    HOLDERS_LIST: addrs,
  });
  addrs.forEach((addr, i) => (balances_by_address[addr] = token_balances[i]));

  await wait(2000);

  let number_of_holders = await get_number_of_stakers(addrs);
  addrs.forEach(
    (addr, i) => (number_of_holders_by_address[addr] = number_of_holders[i])
  );

  lp_ids.forEach((lp_id) => {
    let apy = 0,
      tvl_usd = 0;

    let pool_address = lp_id.split("-")[1];
    let token_balance = new BigNumber(balances_by_address[pool_address] || 0);
    let token_balance_value_usd =
      token_balance.div(1e18).times(token_price_usd).toFixed(2) * 1;

    tvl_usd =
      token_balance_value_usd + lp_data[lp_id].usd_value_of_lp_staked * 1;

    apy =
      (
        (TOKENS_DISBURSED_PER_YEAR_BY_LP_ID[lp_id] * token_price_usd * 100) /
        (lp_data[lp_id].usd_value_of_lp_staked || 1)
      ).toFixed(2) * 1;

    lp_data[lp_id].apy = apy;
    lp_data[lp_id].tvl_usd = tvl_usd;
    lp_data[lp_id].stakers_num = number_of_holders_by_address[pool_address];
  });

  return { token_data, lp_data, usd_per_eth, token_price_usd };
}

Object.keys(window.config)
  .filter(
    (k) =>
      k.startsWith("token_") ||
      k.startsWith("staking_") ||
      k.startsWith("stakingavax_") ||
      k.startsWith("reward_tokenavax") ||
      k.startsWith("farming_newavax_1") ||
      k.startsWith("farming_newavax_2") ||
      k.startsWith("farming_newavax_3") ||
      k.startsWith("farming_newavax_4") ||
      k.startsWith("farming_newavax_5") ||
      k.startsWith("farming_newbsc_1") ||
      k.startsWith("farming_activebsc_1") ||
      k.startsWith("farming_activeavax_1") ||
      k.startsWith("farming_newbsc_2") ||
      k.startsWith("farming_newbsc_3") ||
      k.startsWith("farming_newbsc_4") ||
      k.startsWith("farming_newbsc_5") ||
      k.startsWith("constant_stakingnew_new1") ||
      k.startsWith("constant_stakingidyp_6") ||
      k.startsWith("constant_stakingidyp_7") ||
      k.startsWith("constant_stakingidyp_5") ||
      k.startsWith("constant_stakingidyp_2") ||
      k.startsWith("constant_stakingidyp_1") ||
      k.startsWith("constant_stakingnew_new2") ||
      k.startsWith("constant_stakingidypavax_3") ||
      k.startsWith("constant_stakingidypavax_4") ||
      k.startsWith("constant_stakingidypavax_40") ||
      k.startsWith("constant_stakingidypavax_50") ||
      k.startsWith("constant_stakingnew_newavax1") ||
      k.startsWith("constant_stakingnewbsc_new3") ||
      k.startsWith("constant_stakingnewbsc_new4") ||
      k.startsWith("constant_stakingnewbsc_new5") ||
      k.startsWith("constant_stakingnewbsc_new6") ||
      k.startsWith("constant_stakingnewbsc_new7") ||
      k.startsWith("constant_stakingnewbsc_new8") ||
      k.startsWith("constant_stakingnewbsc_new9") ||
      k.startsWith("constant_stakingbsc_new10") ||
      k.startsWith("constant_stakingbsc_new11") ||
      k.startsWith("constant_stakingbsc_new111") ||
      k.startsWith("constant_stakingbsc_new12") ||
      k.startsWith("constant_stakingbsc_new13") ||
      k.startsWith("constant_stakingbsc_new14") ||
      k.startsWith("constant_stakingnew_newavax2") ||
      k.startsWith("constant_stakingdaiavax") ||
      k.startsWith("constant_stakingdaieth") ||
      k.startsWith("constant_stakingdaibsc") ||
      k.startsWith("reward_token_daiavax") ||
      k.startsWith("reward_token_daieth") ||
      k.startsWith("reward_token_daibsc") ||
      k.startsWith("constant_staking_") ||
      k.startsWith("constant_stakingnew_") ||
      k.startsWith("buyback_staking1_1_") ||
      k.startsWith("buyback_staking1_2_") ||
      k.startsWith("buyback_stakingavax1_1_") ||
      k.startsWith("buyback_stakingavax1_2_") ||
      k.startsWith("reward_token_idyp") ||
      k.startsWith("reward_token_dyps") ||
      k.startsWith("token_dyp_eth") ||
      k.startsWith("token_dyp_bsc") ||
      k.startsWith("token_idyp_eth") ||
      k.startsWith("token_idyp_bsc") ||
      k.startsWith("token_dyp_bsceth") ||
      k.startsWith("token_dyp_bscbsc") ||
      k.startsWith("token_dyp_bscavaxbsc") ||
      k.startsWith("token_dyp_bscavax") ||
      k.startsWith("token_idyp_bsceth") ||
      k.startsWith("token_idyp_bscbsc") ||
      k.startsWith("reward_token_dypsavax") ||
      k.startsWith("reward_token_dypsbsc") ||
      k.startsWith("farmweth") ||
      k.startsWith("weth") ||
      k.startsWith("wethavax") ||
      k.startsWith("wethbsc") ||
      k.startsWith("farming_new_") ||
      k.startsWith("constant_stakingdai_") ||
      k.startsWith("constant_stakingidypavax_1") ||
      k.startsWith("constant_stakingidypavax_2") ||
      k.startsWith("constant_stakingidypavax_5") ||
      k.startsWith("constant_stakingidypavax_6") ||
      k.startsWith("constant_stakingidypavax_7") ||
      k.startsWith("constant_stakingnew_newavax3") ||
      k.startsWith("constant_stakingnew_newavax4") ||
      k.startsWith("new_governance") ||
      k.startsWith("new_governanceavax") ||
      k.startsWith("new_governancebsc") ||
      k.startsWith("constant_stakingold_130") ||
      k.startsWith("constant_stakingold_140") ||
      k.startsWith("buyback_stakingbsc1_1") ||
      k.startsWith("buyback_stakingbsc1_2") ||
      k.startsWith("constant_staking_newi3") ||
      (k.startsWith("constant_stakingold_") && k.endsWith("_address"))
  )
  .forEach((k) => {
    window[k.replace("_address", "_ABI").toUpperCase()] = k.startsWith("token_")
      ? window.TOKEN_ABI
      : k.startsWith("reward_token_idyp")
      ? window.TOKEN_ABI
      : k.startsWith("buyback_stakingbsc1_1")
      ? window.BUYBACK_STAKINGBSC1_1_ABI
      : k.startsWith("buyback_stakingbsc1_2")
      ? window.BUYBACK_STAKINGBSC1_2_ABI
      : k.startsWith("constant_staking_newi3")
      ? window.CONSTANT_STAKING_OLD_ABI
      : k.startsWith("stakingavax_")
      ? window.STAKINGAVAX_ABI
      : k.startsWith("reward_token_dyps")
      ? window.TOKEN_ABI
      : k.startsWith("token_dyp_eth")
      ? window.TOKEN_ABI
      : k.startsWith("token_idyp_eth")
      ? window.TOKEN_ABI
      : k.startsWith("token_dyp_bsc")
      ? window.TOKEN_ABI
      : k.startsWith("token_dyp_bscavaxbsc")
      ? window.TOKEN_ABI
      : k.startsWith("token_dyp_bscavax")
      ? window.TOKEN_ABI
      : k.startsWith("token_idyp_bsc")
      ? window.TOKEN_ABI
      : k.startsWith("token_dyp_bscbsc")
      ? window.TOKEN_ABI
      : k.startsWith("token_idyp_bscbsc")
      ? window.TOKEN_ABI
      : k.startsWith("token_dyp_bsceth")
      ? window.TOKEN_ABI
      : k.startsWith("token_idyp_bsceth")
      ? window.TOKEN_ABI
      : k.startsWith("reward_token_dypsavax")
      ? window.TOKENAVAX_ABI
      : k.startsWith("reward_token_dypsbsc")
      ? window.TOKENBSC_ABI
      : k.startsWith("farmweth")
      ? window.TOKEN_ABI
      : k.includes("weth") && !k.includes("wethavax") && !k.includes("wethbsc")
      ? window.VAULT_ABI
      : k.includes("wethavax")
      ? window.TOKENAVAX_ABI
      : k.includes("wethbsc")
      ? window.TOKENBSC_ABI
      : k.includes("reward_token_daiavax")
      ? window.TOKENAVAX_ABI
      : k.includes("reward_token_daieth")
      ? window.TOKEN_ABI
      : k.includes("reward_token_daibsc")
      ? window.TOKENBSC_ABI
      : k.includes("reward_tokenavax")
      ? window.TOKENAVAX_ABI
      : k.includes("farming_newavax_1")
      ? window.FARMING_NEW_ABI
      : k.includes("farming_newavax_2")
      ? window.FARMING_NEW_ABI
      : k.includes("farming_newavax_3")
      ? window.FARMING_NEW_ABI
      : k.includes("farming_newavax_4")
      ? window.FARMING_NEW_ABI
      : k.includes("farming_newavax_5")
      ? window.FARMING_NEW_ABI
      : k.includes("farming_newbsc_1")
      ? window.FARMING_NEWBSC_ABI
      : k.includes("farming_activebsc_1")
      ? window.FARMING_ACTIVEBSC_ABI
      : k.includes("farming_activeavax_1")
      ? window.FARMING_ACTIVEAVAX_ABI
      : k.includes("farming_newbsc_2")
      ? window.FARMING_NEWBSC_ABI
      : k.includes("farming_newbsc_3")
      ? window.FARMING_NEWBSC_ABI
      : k.includes("farming_newbsc_4")
      ? window.FARMING_NEWBSC_ABI
      : k.includes("farming_newbsc_5")
      ? window.FARMING_NEWBSC_ABI
      : k.startsWith("constant_staking_")
      ? window.CONSTANT_STAKING_ABI
      : k.startsWith("constant_stakingnew_")
      ? window.CONSTANT_STAKINGNEW_ABI
      : k.startsWith("buyback_staking1_1_")
      ? window.BUYBACK_STAKING1_1_ABI
      : k.startsWith("buyback_stakingavax1_1_")
      ? window.BUYBACK_STAKINGAVAX1_1_ABI
      : k.startsWith("buyback_stakingavax1_2_")
      ? window.BUYBACK_STAKINGAVAX1_2_ABI
      : k.startsWith("constant_stakingnew_newavax3")
      ? window.CONSTANT_STAKINGAVAX_ABI
      : k.startsWith("constant_stakingnew_newavax4")
      ? window.CONSTANT_STAKINGAVAX_ABI
      : k.startsWith("buyback_staking1_2_")
      ? window.BUYBACK_STAKING1_2_ABI
      : k.startsWith("constant_stakingidypavax_3")
      ? window.CONSTANT_STAKING_IDYP_ABI
      : k.startsWith("constant_stakingnew_new1")
      ? window.CONSTANT_STAKINGNEW_ABI
      : k.startsWith("constant_stakingidyp_6")
      ? window.CONSTANT_STAKING_IDYP_ABI
      : k.startsWith("constant_stakingidyp_7")
      ? window.CONSTANT_STAKING_IDYP_ABI
      : k.startsWith("constant_stakingidyp_5")
      ? window.CONSTANT_STAKING_IDYP_ABI
      : k.startsWith("constant_stakingidyp_2")
      ? window.CONSTANT_STAKING_IDYP_ABI
      : k.startsWith("constant_stakingidyp_1")
      ? window.CONSTANT_STAKING_IDYP_ABI
      : k.startsWith("constant_stakingnew_new2")
      ? window.CONSTANT_STAKINGNEW_ABI
      : k.startsWith("constant_stakingidypavax_4")
      ? window.CONSTANT_STAKING_IDYP_ABI
      : k.startsWith("constant_stakingidypavax_40")
      ? window.CONSTANT_STAKING_IDYP_ABI
      : k.startsWith("constant_stakingidypavax_50")
      ? window.CONSTANT_STAKING_IDYP_ABI
      : k.startsWith("constant_stakingnew_newavax1")
      ? window.CONSTANT_STAKINGNEW_ABI
      : k.startsWith("constant_stakingnewbsc_new3")
      ? window.CONSTANT_STAKINGNEW_ABI
      : k.startsWith("constant_stakingnewbsc_new4")
      ? window.CONSTANT_STAKINGNEW_ABI
      : k.startsWith("constant_stakingnewbsc_new5")
      ? window.CONSTANT_STAKINGBSC_NEW_ABI
      : k.startsWith("constant_stakingnewbsc_new6")
      ? window.CONSTANT_STAKINGBSC_NEW_ABI
      : k.startsWith("constant_stakingnewbsc_new7")
      ? window.CONSTANT_STAKINGBSC_NEW_ABI
      : k.startsWith("constant_stakingnewbsc_new8")
      ? window.CONSTANT_STAKINGBSC_NEW_ABI
      : k.startsWith("constant_stakingnewbsc_new9")
      ? window.CONSTANT_STAKINGBSC_NEW_ABI
      : k.startsWith("constant_stakingbsc_new10")
      ? window.CONSTANT_STAKING_OLD_ABI
      : k.startsWith("constant_stakingbsc_new11")
      ? window.CONSTANT_STAKING_OLD_ABI
      : k.startsWith("constant_stakingbsc_new111")
      ? window.CONSTANT_STAKING_OLD_ABI
      : k.startsWith("constant_stakingold_130")
      ? window.CONSTANT_STAKING_OLD_ABI
      : k.startsWith("constant_stakingold_140")
      ? window.CONSTANT_STAKING_OLD_ABI
      : k.startsWith("constant_stakingbsc_new12")
      ? window.CONSTANT_STAKINGBSC_NEW_ABI
      : k.startsWith("constant_stakingbsc_new13")
      ? window.CONSTANT_STAKINGBSC_NEW_ABI
      : k.startsWith("constant_stakingbsc_new14")
      ? window.CONSTANT_STAKING_OLD_ABI
      : k.startsWith("constant_stakingnew_newavax2")
      ? window.CONSTANT_STAKINGNEW_ABI
      : k.startsWith("constant_stakingdaieth")
      ? window.CONSTANT_STAKINGDAI_ABI
      : k.startsWith("constant_stakingdaiavax")
      ? window.CONSTANT_STAKING_DAI_ABI
      : k.startsWith("constant_stakingdaibsc")
      ? window.CONSTANT_STAKING_DAI_ABI
      : k.startsWith("constant_stakingidypavax_1")
      ? window.CONSTANT_STAKING_IDYP_ABI
      : k.startsWith("constant_stakingidypavax_2")
      ? window.CONSTANT_STAKING_IDYP_ABI
      : k.startsWith("constant_stakingidypavax_5")
      ? window.CONSTANT_STAKING_IDYP_ABI
      : k.startsWith("constant_stakingidypavax_7")
      ? window.CONSTANT_STAKING_IDYP_ABI
      : k.startsWith("constant_stakingidypavax_6")
      ? window.CONSTANT_STAKING_IDYP_ABI
      : k.startsWith("farming_new_")
      ? window.FARMING_NEW_ABI
      : k.startsWith("constant_stakingdai_")
      ? window.CONSTANT_STAKING_DAI_ABI
      : k.startsWith("constant_stakingold_")
      ? window.CONSTANT_STAKING_OLD_ABI
      : k.startsWith("new_governance")
      ? window.NEW_GOVERNANCE_ABI
      : k.startsWith("new_governanceavax")
      ? window.NEW_GOVERNANCEAVAX_ABI
      : k.startsWith("new_governancebsc")
      ? window.NEW_GOVERNANCEBSC_ABI
      : window.STAKING_ABI;
  });

async function refreshBalance() {
  //await wait(10000)
  let coinbase;
  try {
    if (!window.IS_CONNECTED) throw new Error("Wallet Not Connected!");
    coinbase = await getCoinbase();
  } catch (e) {
    console.warn(e);
  }

  let reward_token = window.reward_token;
  //console.log('coinbase' + coinbase)

  let _tvl30 = await reward_token.balanceOf(
    "0x7fc2174670d672ad7f666af0704c2d961ef32c73"
  );
  _tvl30 = _tvl30 / 1e18;

  let _tvl60 = await reward_token.balanceOf(
    "0x036e336ea3ac2e255124cf775c4fdab94b2c42e4"
  );
  _tvl60 = _tvl60 / 1e18;

  let _tvl90 = await reward_token.balanceOf(
    "0x0a32749d95217b7ee50127e24711c97849b70c6a"
  );
  _tvl90 = _tvl90 / 1e18;

  let _tvl120 = await reward_token.balanceOf(
    "0x82df1450efd6b504ee069f5e4548f2d5cb229880"
  );
  _tvl120 = _tvl120 / 1e18 + 0.1;

  let _buyback = await reward_token.balanceOf(
    "0xe5262f38bf13410a79149cb40429f8dc5e830542"
  );
  _buyback = _buyback / 1e18;

  // console.log({_buyback})

  let [usdPerToken] = await Promise.all([
    window.getPrice("defi-yield-protocol"),
  ]);
  let valueee = (_tvl30 + _tvl60 + _tvl90 + _tvl120 + _buyback) * usdPerToken;
  //console.log('usdper '+valueee)
  return valueee;
}

function get_usd_values({ token_contract_addresses, lp_ids }) {
  return new Promise((resolve, reject) => {
    fetch("https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2", {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `{

tokens(where:{
id_in: ${JSON.stringify(
          token_contract_addresses.map((a) => a.toLowerCase())
        )}}) {
id
symbol
name
decimals
untrackedVolumeUSD
derivedETH
}

bundle(id: 1) {
id
ethPrice
}

liquidityPositions(where: 
{id_in: 
${JSON.stringify(lp_ids.map((id) => id.toLowerCase()))},
}) {
id
pair {
reserveUSD
totalSupply
}
liquidityTokenBalance
}
}
`,
        variables: null,
      }),
    })
      .then((res) => res.json())
      .then((res) => handleTheGraphData(res))
      .catch(reject);

    function handleTheGraphData(response) {
      try {
        let data = response.data;
        if (!data) return reject(response);

        console.log(data);

        let usd_per_eth = new BigNumber(data.bundle.ethPrice).toFixed(2) * 1;

        let token_data = {},
          lp_data = {};

        data.tokens.forEach((t) => {
          token_data[t.id] = {
            token_volume_usd_all_time:
              new BigNumber(t.untrackedVolumeUSD).toFixed(2) * 1,
            token_price_usd:
              new BigNumber(t.derivedETH).times(usd_per_eth).toFixed(2) * 1,
          };
        });

        data.liquidityPositions.forEach((lp) => {
          let usd_per_lp =
            new BigNumber(lp.pair.reserveUSD)
              .div(lp.pair.totalSupply)
              .toFixed(2) * 1;
          let lp_staked = lp.liquidityTokenBalance;
          let usd_value_of_lp_staked =
            new BigNumber(lp_staked).times(usd_per_lp).toFixed(2) * 1;
          lp_data[lp.id] = {
            lp_staked,
            usd_per_lp,
            usd_value_of_lp_staked,
          };
        });
        resolve({ token_data, lp_data, usd_per_eth });
      } catch (e) {
        console.error(e);
        reject(e);
      }
    }
  });
}

async function get_number_of_stakers(staking_pools_list) {
  let coinbase;
  try {
    if (!window.IS_CONNECTED) throw new Error("Wallet Not Connected!");
    coinbase = await getCoinbase();
  } catch (e) {
    console.warn(e);
  } finally {
    if (!coinbase) {
      return await Promise.all(
        staking_pools_list.map(() => Promise.resolve(0))
      );
    }
  }

  return (
    await Promise.all(
      staking_pools_list.map((contract_address) => {
        let contract = new window.web3.eth.Contract(
          window.STAKING_ABI,
          contract_address,
          { from: coinbase }
        );
        return contract.methods.getNumberOfHolders().call();
      })
    )
  ).map((h) => Number(h));
}

async function get_token_balances({ TOKEN_ADDRESS, HOLDERS_LIST }) {
  let coinbase;
  try {
    if (!window.IS_CONNECTED) throw new Error("Wallet Not Connected!");
    coinbase = await getCoinbase();
  } catch (e) {
    console.warn(e);
  } finally {
    if (!coinbase) {
      return await Promise.all(HOLDERS_LIST.map(() => Promise.resolve(0)));
    }
  }

  let token_contract = new window.web3.eth.Contract(
    window.TOKEN_ABI,
    TOKEN_ADDRESS,
    { from: coinbase }
  );

  return await Promise.all(
    HOLDERS_LIST.map((h) => {
      return token_contract.methods.balanceOf(h).call();
    })
  );
}

async function get_usd_values_with_apy_and_tvl(...arguments) {
  return await get_apy_and_tvl(await get_usd_values(...arguments));
}

async function refresh_the_graph_result() {
  let result = await get_usd_values_with_apy_and_tvl({
    token_contract_addresses: [TOKEN_ADDRESS],
    lp_ids: LP_ID_LIST,
  });
  window.the_graph_result = result;
  window.TVL_FARMING_POOLS = await refreshBalance();
  return result;
}

async function refresh_the_graph_resultavax() {
  let result = await get_usd_values_with_apy_and_tvl({
    token_contract_addresses: [TOKEN_ADDRESS, TOKEN_IDYP_ADDRESS],
    lp_ids: LP_ID_LIST,
  });
  window.the_graph_result = result;
  //window.TVL_FARMING_POOLS = await refreshBalance()
  return result;
}

window.get_usd_values = get_usd_values;
window.get_token_balances = get_token_balances;
window.get_apy_and_tvl = get_apy_and_tvl;
window.get_number_of_stakers = get_number_of_stakers;
window.refresh_the_graph_result = refresh_the_graph_result;
window.refresh_the_graph_resultavax = refresh_the_graph_resultavax;

async function getActiveLocksByTokenETH(tokenAddress, startIndex, endIndex) {
  let lockerContract = await getContract({ key: "LOCKERETH" });
  let lockIds = await lockerContract.methods
    .getActiveLockIdsByToken(tokenAddress, startIndex, endIndex)
    .call();
  let locks = await lockerContract.methods.getLocksByIds(lockIds).call();
  return processedLocks(locks);
}

async function getActiveLocksByRecipient(recipient, startIndex, endIndex) {
  let lockerContract = await getContract({ key: "LOCKER" });
  let lockIds = await lockerContract.methods
    .getActiveLockIdsByRecipient(recipient, startIndex, endIndex)
    .call();
  let locks = await lockerContract.methods.getLocksByIds(lockIds).call();
  return processedLocks(locks);
}

async function getActiveLocksByRecipientETH(recipient, startIndex, endIndex) {
  let lockerContract = await getContract({ key: "LOCKERETH" });
  let lockIds = await lockerContract.methods
    .getActiveLockIdsByRecipient(recipient, startIndex, endIndex)
    .call();
  let locks = await lockerContract.methods.getLocksByIds(lockIds).call();
  return processedLocks(locks);
}

async function getMinLockCreationFeeInWei(pair, baseToken, amount) {
  let lockerContract = await getContract({ key: "LOCKER" });
  return await lockerContract.methods
    .getMinLockCreationFeeInWei(pair, baseToken, amount)
    .call();
}
async function getPairTokensInfo(pair, network) {
  let pairContract = await getContract({
    key: "PAIR",
    address: pair,
    ABI: network === 1 ? UNISWAP_PAIRETH_ABI : UNISWAP_PAIR_ABI,
  });
  let [token0_address, token1_address] = await Promise.all([
    pairContract.methods.token0().call(),
    pairContract.methods.token1().call(),
  ]);
  let token0 = await getContract({ address: token0_address, ABI: ERC20_ABI });
  let token1 = await getContract({ address: token1_address, ABI: ERC20_ABI });
  let [name0, symbol0, decimals0, name1, symbol1, decimals1] =
    await Promise.all([
      token0.methods.name().call(),
      token0.methods.symbol().call(),
      token0.methods.decimals().call(),
      token1.methods.name().call(),
      token1.methods.symbol().call(),
      token1.methods.decimals().call(),
    ]);
  return {
    token0: {
      address: token0_address.toLowerCase(),
      name: name0,
      symbol: symbol0,
      decimals: decimals0,
      contract: token0,
    },
    token1: {
      address: token1_address.toLowerCase(),
      name: name1,
      symbol: symbol1,
      decimals: decimals1,
      contract: token1,
    },
  };
}
async function getBaseTokens() {
  let lockerContract = await getContract({ key: "LOCKER" });
  let baseTokensLength = await lockerContract.methods
    .getBaseTokensLength()
    .call();
  let baseTokens = await lockerContract.methods
    .getBaseTokens(0, baseTokensLength)
    .call();
  console.log({ baseTokens });
  return baseTokens.map((t) => t.toLowerCase());
}

async function getBaseTokensETH() {
  let lockerContract = await getContract({ key: "LOCKERETH" });
  let baseTokensLength = await lockerContract.methods
    .getBaseTokensLength()
    .call();
  let baseTokens = await lockerContract.methods
    .getBaseTokens(0, baseTokensLength)
    .call();
  console.log({ baseTokens });
  return baseTokens.map((t) => t.toLowerCase());
}

async function claimUnlocked(lockId) {
  let lockerContract = await getContract({ key: "LOCKER" });
  return await lockerContract.methods.claimUnlocked(lockId).send();
}

async function claimUnlockedETH(lockId) {
  let lockerContract = await getContract({ key: "LOCKERETH" });
  return await lockerContract.methods.claimUnlocked(lockId).send();
}

async function getLockedAmount(pair) {
  let lockerContract = await getContract({ key: "LOCKER" });
  return await lockerContract.methods.tokenBalances(pair).call();
}

async function getLockedAmountETH(pair) {
  let lockerContract = await getContract({ key: "LOCKERETH" });
  return await lockerContract.methods.tokenBalances(pair).call();
}

async function getTokenHolderBalance(token, holder) {
  let tokenContract = await getContract({ address: token, ABI: ERC20_ABI });
  return await tokenContract.methods.balanceOf(holder).call();
}
async function getTokenTotalSupply(token) {
  let tokenContract = await getContract({ address: token, ABI: ERC20_ABI });
  return await tokenContract.methods.totalSupply().call();
}
async function approveToken(token, spender, amount) {
  let tokenContract = await getContract({ address: token, ABI: ERC20_ABI });
  return await tokenContract.methods.approve(spender, amount).send();
}
async function createLock(pair, baseToken, amount, unlockTimestamp) {
  let lockerContract = await getContract({ key: "LOCKER" });

  let estimatedValue = await getMinLockCreationFeeInWei(
    pair,
    baseToken,
    amount
  );
  estimatedValue = new BigNumber(estimatedValue).times(1.1).toFixed(0);

  return await lockerContract.methods
    .createLock(pair, baseToken, amount, unlockTimestamp)
    .send({ value: estimatedValue, from: await getCoinbase() });
}

function processedLocks(locks) {
  return locks._ids.map((id, i) => ({
    id,
    token: locks.tokens[i],
    unlockTimestamp: locks.unlockTimestamps[i],
    amount: locks.amounts[i],
    recipient: locks.recipients[i],
    claimed: locks.claimeds[i],
    platformTokensLocked: locks.platformTokensLockeds[i],
  }));
}

async function createLockETH(pair, baseToken, amount, unlockTimestamp) {
  let lockerContract = await getContract({ key: "LOCKERETH" });

  let estimatedValue = await getMinLockCreationFeeInWei(
    pair,
    baseToken,
    amount
  );
  estimatedValue = new BigNumber(estimatedValue).times(1.1).toFixed(0);

  return await lockerContract.methods
    .createLock(pair, baseToken, amount, unlockTimestamp)
    .send({ value: estimatedValue, from: await getCoinbase() });
}

function processedLocks(locks) {
  return locks._ids.map((id, i) => ({
    id,
    token: locks.tokens[i],
    unlockTimestamp: locks.unlockTimestamps[i],
    amount: locks.amounts[i],
    recipient: locks.recipients[i],
    claimed: locks.claimeds[i],
    platformTokensLocked: locks.platformTokensLockeds[i],
  }));
}

// ======================== subscription contract functions ================================

async function subscriptionPlatformTokenAmount(account) {
  if (account) {
    let subscriptionContract = await getContract({ key: "SUBSCRIPTION" });
    return await subscriptionContract.methods
      .subscriptionPlatformTokenAmount(account)
      .call()
      .then();
  }
}

async function subscriptionPlatformTokenAmountETH(account) {
  if (account) {
    let subscriptionContract = await getContract({ key: "SUBSCRIPTIONETH" });
    return await subscriptionContract.methods
      .subscriptionPlatformTokenAmount(account)
      .call()
      .then();
  }
}

async function subscribe(tokenAddress, amount) {
  let subscriptionContract = await getContract({ key: "SUBSCRIPTION" });
  return await subscriptionContract.methods
    .subscribe(tokenAddress, amount)
    .send({ from: await getCoinbase() });
}

async function unsubscribe() {
  let subscriptionContract = await getContract({ key: "SUBSCRIPTION" });
  return await subscriptionContract.methods
    .unsubscribe()
    .send({ from: await getCoinbase() });
}

async function getEstimatedTokenSubscriptionAmount(tokenAddress) {
  let subscriptionContract = await getContract({ key: "SUBSCRIPTION" });
  return await subscriptionContract.methods
    .getEstimatedTokenSubscriptionAmount(tokenAddress)
    .call();
}

async function getEstimatedTokenSubscriptionAmountETH(tokenAddress) {
  let subscriptionContract = await getContract({ key: "SUBSCRIPTIONETH" });
  return await subscriptionContract.methods
    .getEstimatedTokenSubscriptionAmount(tokenAddress)
    .call();
}

async function getEstimatedTokenSubscriptionAmountBNB(tokenAddress) {
  let subscriptionContract = await getContract({ key: "SUBSCRIPTIONBNB" });
  return await subscriptionContract.methods
    .getEstimatedTokenSubscriptionAmount(tokenAddress)
    .call();
}

// ===================== end subscription contract functions ================================

// ========= favorites functions ==========

async function getFavorites() {
  return JSON.parse(localStorage.getItem("favorites") || `[]`);
}
async function isFavorite(pairId) {
  let favorites = await getFavorites();
  return favorites.some((f) => {
    if (f.id == pairId) {
      return true;
    }
    return false;
  });
}
async function toggleFavorite(pair) {
  if (!pair) return false;
  let favorites = await getFavorites();
  let foundIndex;
  if (
    favorites.some((f, i) => {
      if (f.id == pair.id) {
        foundIndex = i;
        return true;
      }
      return false;
    })
  ) {
    favorites.splice(foundIndex, 1);
  } else {
    favorites.push(pair);
  }
  localStorage.setItem("favorites", JSON.stringify(favorites, null, 4));
}

async function getPangolinRouterContract(
  address = window.config.pangolin_router_address
) {
  return new window.avaxWeb3.eth.Contract(window.PANGOLIN_ROUTER_ABI, address, {
    from: undefined,
  });
}

async function getPancakeswapRouterContract(
  address = window.config.pancakeswap_router_address
) {
  return new window.bscWeb3.eth.Contract(
    window.PANCAKESWAP_ROUTER_ABI,
    address,
    { from: undefined }
  );
}

async function getUniswapRouterContract(
  address = window.config.uniswap_router_address
) {
  return new window.infuraWeb3.eth.Contract(
    window.UNISWAP_ROUTER_ABI,
    address,
    { from: await getCoinbase() }
  );
}

async function getPriceiDYP() {
  let amount = new BigNumber(1000000000000000000).toFixed(0);
  let router = await window.getPancakeswapRouterContract();
  let WETH = await router.methods.WETH().call();
  let platformTokenAddress = window.config.BUSD_address;
  let rewardTokenAddress = window.config.reward_token_idyp_address;
  let path = [
    ...new Set(
      [rewardTokenAddress, WETH, platformTokenAddress].map((a) =>
        a.toLowerCase()
      )
    ),
  ];
  let _amountOutMin = await router.methods.getAmountsOut(amount, path).call();
  _amountOutMin = _amountOutMin[_amountOutMin.length - 1];
  _amountOutMin = new BigNumber(_amountOutMin).div(1e18).toFixed(18);
  return _amountOutMin;
}

window.getPriceiDYP = getPriceiDYP;

async function getPriceiDYPAvax() {
  let amount = new BigNumber(1000000000000000000).toFixed(0);
  let router = await window.getPangolinRouterContract();
  let WETH = await router.methods.WAVAX().call();
  let platformTokenAddress = window.config.USDCe_address;
  let rewardTokenAddress = window.config.reward_token_idyp_address;
  let path = [
    ...new Set(
      [rewardTokenAddress, WETH, platformTokenAddress].map((a) =>
        a.toLowerCase()
      )
    ),
  ];
  let _amountOutMin = await router.methods.getAmountsOut(amount, path).call();
  _amountOutMin = _amountOutMin[_amountOutMin.length - 1];
  _amountOutMin = new BigNumber(_amountOutMin).div(1e6).toFixed(18);
  return _amountOutMin;
}

window.getPriceiDYPAvax = getPriceiDYPAvax;

async function getPriceiDYPEth() {
  let amount = new BigNumber(1000000000000000000).toFixed(0);
  let router = await window.getUniswapRouterContract();
  let WETH = await router.methods.WETH().call();
  let platformTokenAddress = window.config.USDC_address;
  let rewardTokenAddress = window.config.reward_token_idyp_address;
  let path = [
    ...new Set(
      [rewardTokenAddress, WETH, platformTokenAddress].map((a) =>
        a.toLowerCase()
      )
    ),
  ];
  let _amountOutMin = await router.methods.getAmountsOut(amount, path).call();
  _amountOutMin = _amountOutMin[_amountOutMin.length - 1];
  _amountOutMin = new BigNumber(_amountOutMin).div(1e6).toFixed(18);
  return _amountOutMin;
}

window.getPriceiDYPEth = getPriceiDYPEth;

async function getFavoritesETH() {
  return JSON.parse(localStorage.getItem("favoritesETH") || `[]`);
}
async function isFavoriteETH(pairId) {
  let favorites = await getFavoritesETH();
  return favorites.some((f) => {
    if (f.id == pairId) {
      return true;
    }
    return false;
  });
}
async function toggleFavoriteETH(pair) {
  if (!pair) return false;
  let favorites = await getFavoritesETH();
  let foundIndex;
  if (
    favorites.some((f, i) => {
      if (f.id == pair.id) {
        foundIndex = i;
        return true;
      }
      return false;
    })
  ) {
    favorites.splice(foundIndex, 1);
  } else {
    favorites.push(pair);
  }
  localStorage.setItem("favoritesETH", JSON.stringify(favorites, null, 4));
}
// ======= end favorites functions ========

// -----------------
async function getMainToken(pair, network) {
  let mainToken = pair.token0 || {};

  if (network === 1) {
    for (let token of window.config.baseEth_tokens) {
      if (mainToken.id == token) {
        mainToken = pair.token1;
        mainToken.__number = 1;
        mainToken.__base_number = 0;
        break;
      } else if (pair.token1.id == token) {
        mainToken = pair.token0;
        mainToken.__number = 0;
        mainToken.__base_number = 1;
        break;
      }
    }
    return mainToken;
  }

  if (network === 43114) {
    for (let token of window.config.base_tokens) {
      if (mainToken.id == token) {
        mainToken = pair.token1;
        mainToken.__number = 1;
        mainToken.__base_number = 0;
        break;
      } else if (pair.token1.id == token) {
        mainToken = pair.token0;
        mainToken.__number = 0;
        mainToken.__base_number = 1;
        break;
      }
    }
    return mainToken;
  }
}
// ------------------

// helper functions for csv json and file reading
// ref: http://stackoverflow.com/a/1293163/2343
// This will parse a delimited string into an array of
// arrays. The default delimiter is the comma, but this
// can be overriden in the second argument.
function CSVToArray(strData, strDelimiter) {
  // Check to see if the delimiter is defined. If not,
  // then default to comma.
  strDelimiter = strDelimiter || ",";

  // Create a regular expression to parse the CSV values.
  var objPattern = new RegExp(
    // Delimiters.
    "(\\" +
      strDelimiter +
      "|\\r?\\n|\\r|^)" +
      // Quoted fields.
      '(?:"([^"]*(?:""[^"]*)*)"|' +
      // Standard fields.
      '([^"\\' +
      strDelimiter +
      "\\r\\n]*))",
    "gi"
  );

  // Create an array to hold our data. Give the array
  // a default empty first row.
  var arrData = [[]];

  // Create an array to hold our individual pattern
  // matching groups.
  var arrMatches = null;

  // Keep looping over the regular expression matches
  // until we can no longer find a match.
  while ((arrMatches = objPattern.exec(strData))) {
    // Get the delimiter that was found.
    var strMatchedDelimiter = arrMatches[1];

    // Check to see if the given delimiter has a length
    // (is not the start of string) and if it matches
    // field delimiter. If id does not, then we know
    // that this delimiter is a row delimiter.
    if (strMatchedDelimiter.length && strMatchedDelimiter !== strDelimiter) {
      // Since we have reached a new row of data,
      // add an empty row to our data array.
      arrData.push([]);
    }

    var strMatchedValue;

    // Now that we have our delimiter out of the way,
    // let's check to see which kind of value we
    // captured (quoted or unquoted).
    if (arrMatches[2]) {
      // We found a quoted value. When we capture
      // this value, unescape any double quotes.
      strMatchedValue = arrMatches[2].replace(new RegExp('""', "g"), '"');
    } else {
      // We found a non-quoted value.
      strMatchedValue = arrMatches[3];
    }

    // Now that we have our value string, let's add
    // it to the data array.
    arrData[arrData.length - 1].push(strMatchedValue);
  }

  // Return the parsed data.
  return arrData;
}

function csvToJSON(csv) {
  csv = csv.trim();
  let arr = CSVToArray(csv);
  return arr.slice(1).map((a) => {
    let res = {};
    arr[0].forEach((field, i) => (res[field] = a[i]));
    return res;
  });
}

function readAsText(file) {
  return new Promise((resolve) => {
    let reader = new FileReader();
    reader.addEventListener("load", () => {
      resolve(reader.result);
    });
    reader.readAsText(file);
  });
}

window.sign = async function (msg, account) {
  let signature = await window.web3.eth.personal.sign(msg, account);
  return signature;
};

window.isAddress = async function (address) {
  const web3 = new Web3(window.config.infura_endpoint);
  const result = await web3.utils.isAddress(address);
  if (result === true) return true;
  else return false;
};
