import assert from 'node:assert/strict';
import {test} from 'node:test';
import {execFileSync} from 'node:child_process';
import {isStatsDate,rangeErrors,readRevenue,readStatuses} from '../src/utils/adminStatistics.ts';
test('Statistics default dates stay local at the Vietnamese month boundary',()=>{
 const source="import {localDate} from './src/utils/adminStatistics.ts';process.stdout.write(localDate(new Date('2026-11-01T00:00:00+07:00')));";
 assert.equal(execFileSync(process.execPath,['--input-type=module','-e',source],{cwd:process.cwd(),env:{...process.env,TZ:'Asia/Ho_Chi_Minh'},encoding:'utf8'}),'2026-11-01');
});
test('Revenue ranges reject missing, impossible, reversed and future dates before issuing requests',()=>{
 for(const date of ['','2026-02-29','2026-13-01','0000-01-01','2026-1-02'])assert.equal(isStatsDate(date),false);
 assert.equal(isStatsDate('2024-02-29'),true);assert.equal(isStatsDate('2000-02-29'),true);assert.equal(isStatsDate('1900-02-29'),false);
 assert.ok(rangeErrors('','2026-11-03','2026-11-03').start);assert.ok(rangeErrors('2026-11-03','2026-11-01','2026-11-03').end);assert.ok(rangeErrors('2026-11-01','2026-11-04','2026-11-03').end);
 assert.deepEqual(rangeErrors('2026-11-03','2026-11-03','2026-11-03'),{});
});
test('Revenue keeps authoritative zero/totals, sorts rows without mutating and rejects malformed data',()=>{
 const rows=[{date:'2026-11-02',revenue:100,orderCount:1},{date:'2026-11-01',revenue:0,orderCount:1}];const data=readRevenue({totalRevenue:100,totalOrders:2,byDay:rows});assert.equal(data.byDay[0].date,'2026-11-01');assert.equal(rows[0].date,'2026-11-02');assert.equal(data.totalOrders,2);
 assert.deepEqual(readRevenue({totalRevenue:0,totalOrders:0,byDay:[]}),{totalRevenue:0,totalOrders:0,byDay:[]});
 for(const bad of [null,{}, {totalRevenue:NaN,totalOrders:0,byDay:[]},{totalRevenue:0,totalOrders:-1,byDay:[]},{totalRevenue:0,totalOrders:1,byDay:[{date:'invalid',revenue:0,orderCount:1}]}])assert.throws(()=>readRevenue(bad));
});
test('Status totals reject unavailable/bad data while keeping zero and unknown labels as real data',()=>{
 assert.deepEqual(readStatuses([]),[]);const input=[{status:'Trạng thái mới',count:0},{status:'Hoàn thành',count:5},{status:'Chờ xử lý',count:1}];assert.equal(readStatuses(input)[0].status,'Chờ xử lý');assert.equal(input[0].status,'Trạng thái mới');assert.equal(readStatuses(input)[2].count,0);
 for(const bad of [undefined,{},[{status:'Chờ xử lý',count:-1}],[{status:'',count:3}],[{status:'Hoàn thành',count:1.5}]])assert.throws(()=>readStatuses(bad));
});
