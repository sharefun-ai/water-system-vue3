import test from 'node:test'
import assert from 'node:assert/strict'
import { buildCoverage, missingIntervals, intervalLabel, dailyReport, hourlyReport, monthlyCoverage, rawReportRows, REPORT_GROUPS, monthDays, toCsv, validDate } from '../src/data/waterRecords.js'
const date='2025-05-31',now=new Date('2026-10-02T05:00:00Z')
const row=(id,time,value,extra={})=>({element_no:String(id),date,time,value,id:'1',...extra})

test('coverage uses real IDs, all minutes in an hour, valid zero, and no future periods',()=>{
  const c=buildCoverage([row(106,'00:59',0),row(106,'00:10',4),row(106,'01:59',''),row(106,'24:00',10),row(107,'02:00',7,{date:'2025-05-30'}),row(115,'03:00',1)],date,now)
  assert.equal(c.expected,336);assert.equal(c.recorded,2);assert.equal(c.missing.length,334)
  assert.equal(c.meters.find(m=>m.id===106).present[0],true);assert.equal(c.meters.find(m=>m.id===106).present[1],false)
  const current=buildCoverage([], '2026-10-02',now)
  assert.equal(current.hours,14);assert.equal(current.expected,196);assert.equal(current.meters[0].present[14],null)
})

test('adjacent missing hours group only within their own meter',()=>{
  const result=missingIntervals([{id:106,date,hour:0},{id:106,date,hour:1},{id:106,date,hour:3},{id:107,date,hour:1}])
  assert.equal(result.length,3)
  const first=result.find(r=>r.id===106&&r.start===0)
  assert.equal(first.count,2);assert.equal(intervalLabel(first),'00:00–01:00')
  assert.equal(result.find(r=>r.id===107).count,1)
})

test('daily and hourly report preserve zero, missing values and last cumulative readings rather than maximums',()=>{
  const samples=[row(109,'00:00','8'),row(109,'23:10','4'),row(109,'23:50','0'),row(106,'00:00','2'),row(106,'00:10','6'),row(106,'01:00',''),row(106,'02:00',100,{date:'2025-06-01'})]
  const cumulative=dailyReport(samples,'2025-05',REPORT_GROUPS[0]).at(-1)
  assert.deepEqual(cumulative.values,[0,null,null]);assert.deepEqual(cumulative.counts,[3,0,0])
  const flow=dailyReport(samples,'2025-05',REPORT_GROUPS[1]).at(-1)
  assert.equal(flow.values[0],4)
  assert.equal(hourlyReport(samples,date,REPORT_GROUPS[1])[0].values[0],4)
  assert.equal(hourlyReport(samples,date,REPORT_GROUPS[1])[1].values[0],null)
})

test('monthly completeness counts unique meter/hour slots, not sample count, and ignores other months',()=>{
  const coverage=monthlyCoverage([row(106,'00:00',2),row(106,'00:10',3),row(107,'00:00',0),row(108,'00:00',2,{date:'2025-06-01'})],'2025-05',now)
  assert.equal(coverage.recorded,2);assert.equal(coverage.rawCount,3);assert.equal(coverage.days,1);assert.equal(coverage.expected,31*24*14)
  assert.equal(monthDays('2024-02').length,29)
})

test('raw export selects the full requested range, quotes CSV and leaves absent readings blank',()=>{
  const records=rawReportRows([row(109,'01:10',0),row(110,'01:10',5),row(109,'02:00',6,{date:'2025-06-01'})],date,date,REPORT_GROUPS[0])
  assert.deepEqual(records[1],[date,'01:10',0,5,null]);assert.equal(records.length,2)
  assert.ok(toCsv(records).includes('"2025-05-31","01:10","0","5",""'))
  assert.ok(toCsv([['A,"B"']]).startsWith('\uFEFF"A,""B"""'))
})

test('date validation rejects invalid calendar dates and malformed months',()=>{
  assert.equal(validDate('2025-99-31'),false)
  assert.equal(validDate('2025-02-29'),false)
  assert.equal(validDate('2024-02-29'),true)
  assert.equal(validDate('2025-05-31'),true)
})
