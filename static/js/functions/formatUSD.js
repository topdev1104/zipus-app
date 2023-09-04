import { Numeral } from "numeral"


export const toK = (num) => {
    return Numeral(num).format('0.[00]a')
  }
  
export const formatDollarAmount = (num, digits) => {
    const formatter = new Intl.NumberFormat([], {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    })
    return (formatter.format(num)).toUpperCase()
  }
  
  export const formattedNum = (number, usd = false, acceptNegatives = false) => {
    if (isNaN(number) || number === '' || number === undefined) {
      return usd ? '$0' : 0
    }
    const num = parseFloat(number)
  
    if (num > 500000000) {
      return ((usd ? '$' : '') + toK(num.toFixed(0))).toUpperCase()
    }
  
    if (num === 0) {
      if (usd) {
        return '$0'
      }
      return 0
    }
  
    if (num < 0.0001 && num > 0) {
      return usd ? '< $0.0001' : '< 0.0001'
    }
  
    if (num > 1000) {
      return usd ? formatDollarAmount(num, 0) : Number(parseFloat(num).toFixed(0)).toLocaleString().toUpperCase()
    }
  
    if (usd) {
      if (num < 0.1) {
        return formatDollarAmount(num, 4)
      } else {
        return formatDollarAmount(num, 2)
      }
    }
  
    return Number(parseFloat(num).toFixed(4)).toString().toUpperCase()
  }
  