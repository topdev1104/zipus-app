import axios from "axios";

async function getPairCandles(pair, from, to, n = 0, network) {
  let query = "";
  if (from && to) {
    query = `?from=${from}&to=${to}`;
  }
  let candles = await axios.get(
    network === 1
      ? `${window.config.apieth_baseurl}/api/candles/minutes/${pair}${query}`
      : `${window.config.api_baseurl}/api/candles/minutes/${pair}${query}`
  );
  candles = candles.data;
  return processCandles(candles, n);
}

function processCandles(candles, n) {
  let result = candles.map((c) => {
    return {
      time: Math.floor(new Date(c.time).getTime() / 1e3) * 1e3,
      open: c[`o_usdPerToken${n}`],
      high: c[`h_usdPerToken${n}`],
      low: c[`l_usdPerToken${n}`],
      close: c[`c_usdPerToken${n}`],
      volume: c.v_usd,
      isVolumeBarRed: c[`o_usdPerToken${n}`] > c[`c_usdPerToken${n}`],
    };
  });
  return withSpaces(result.sort((a, b) => a.time - b.time));
}

function withSpaces(candles) {
  if (!candles.length) return candles;
  let result = [candles[0]];
  for (let i = 1; i < candles.length; i++) {
    let timediff = candles[i].time - candles[i - 1].time;
    // console.log({timediff})
    let spacesToAdd = Math.abs(Math.round(timediff / 60e3)) - 1;
    for (let j = 0; j < spacesToAdd; j++) {
      let whitespace = {
        time: candles[i - 1].time + (j + 1) * 60e3,
        // value: candles[i-1].close
        open: candles[i - 1].close,
        high: candles[i - 1].close,
        low: candles[i - 1].close,
        close: candles[i - 1].close,
        volume: 0,
        isVolumeBarRed: false,
      };
      result.push(whitespace);
      // console.log("Pushed whitespace", whitespace)
    }
    result.push(candles[i]);
  }
  // console.log({result})
  return result;
}

// export default getPairCandles

export default function getDataFeed({
  symbol,
  pairId,
  registerBarSubscription,
  onBarsRequest,
  mainToken,
    network
}) {
  return {
    onReady: (callback) => {
      console.log("[onReady]: Method call");
      const result = {
        supported_resolutions: ["1", "5", "15", "30", "60"],
        exchanges: [],
        symbols_types: [],
        currency_codes: ["USD"],
      };
      setTimeout(() => callback(result));
    },
    searchSymbols: (userInput, exchange, symbolType, onResultReadyCallback) => {
      console.log("[searchSymbols]: Method call");
      setTimeout(() => onResultReadyCallback([]));
    },
    resolveSymbol: (
      symbolName,
      onSymbolResolvedCallback,
      onResolveErrorCallback
    ) => {
      console.log("[resolveSymbol]: Method call", symbolName);
      setTimeout(() =>
        onSymbolResolvedCallback({
          name: symbol,
          session: "24x7",
          has_intraday: true,
          intraday_multipliers: ["1"],
          has_daily: false,
          pricescale: 100,
          minmov: 1,
        })
      );
    },
    getBars: async (
      symbolInfo,
      resolution,
      from,
      to,
      onHistoryCallback,
      onErrorCallback,
      firstDataRequest
    ) => {
      console.log("[getBars]: Method call", symbolInfo);
      console.log({ symbolInfo, from, to, resolution });
      let pairCandles;
      if (firstDataRequest) {
        pairCandles = await getPairCandles(
          pairId,
          undefined,
          undefined,
          mainToken.__number,
            network
        );
      } else {
        pairCandles = await getPairCandles(
          pairId,
          from,
          to,
          mainToken.__number,
            network
        );
      }

      // return pairCandles
      onBarsRequest(pairCandles);
      onHistoryCallback(pairCandles, { noData: pairCandles.length == 0 });
    },
    subscribeBars: (
      symbolInfo,
      resolution,
      onRealtimeCallback,
      subscribeUID,
      onResetCacheNeededCallback
    ) => {
      console.log(
        "[subscribeBars]: Method call with subscribeUID:",
        subscribeUID
      );
      // alert(`subscribeBars: (symbolInfo, ${resolution}, onRealtimeCallback, ${subscribeUID}, onResetCacheNeededCallback)`)
      registerBarSubscription(resolution, onRealtimeCallback);
    },
    unsubscribeBars: (subscriberUID) => {
      console.log(
        "[unsubscribeBars]: Method call with subscriberUID:",
        subscriberUID
      );
      // alert(`unsubscribeBars: (${subscriberUID})`)
    },
  };
}

export { getPairCandles };
