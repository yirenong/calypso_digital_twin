import { rangeKey, inputValue } from './chart-range.js'

export function shiftInterval(period, key, amount) {
  const date=new Date(`${period==='yearly'?key+'-01-01':period==='monthly'?key+'-01':period==='hourly'?key+':00':key}${period==='hourly'?'Z':'T00:00:00Z'}`)
  if(period==='yearly')date.setUTCFullYear(date.getUTCFullYear()+amount)
  else if(period==='monthly')date.setUTCMonth(date.getUTCMonth()+amount)
  else if(period==='hourly')date.setUTCHours(date.getUTCHours()+amount)
  else date.setUTCDate(date.getUTCDate()+amount*(period==='weekly'?7:1))
  return date.toISOString().slice(0,period==='yearly'?4:period==='monthly'?7:period==='hourly'?16:10)
}

export function reportIntervals(period,from,to) {
  const end=rangeKey(period,to),result=[]
  for(let key=rangeKey(period,from);key<=end;key=shiftInterval(period,key,1)){
    if(result.length>=10000)throw new Error('This range exceeds 10,000 intervals. Choose a shorter range or a broader interval.')
    result.push({key,label:period==='weekly'?`${inputValue(period,key)} (${key})`:key})
  }
  return result
}
