import {test} from 'node:test';
import assert from 'node:assert/strict';
import {inspect} from 'node:util';
import {privateKeyToAccount} from 'viem/accounts';
import {createWriter} from '../lib/server/writer.ts';
import type {Db} from '../lib/server/db.ts';
const keyed='https://rpc.rabdi.db-chain.testnet.arkiv.network/surf2-synthetic-key';
for(const mode of ['http','jsonrpc','jsonrpc-code','network']) test('writer proxy sanitizes '+mode+' provider diagnostics',async()=>{
 const original=globalThis.fetch, log=console.error, lines:unknown[][]=[];
 const privateKey=('0x'+'22'.repeat(32)) as `0x${string}`;
 const db:Db={t:name=>name,query:async()=>{throw new Error('No database access expected');},transaction:async()=>{throw new Error('No transaction expected');},close:async()=>{}};
 console.error=(...fields)=>{lines.push(fields);};
 globalThis.fetch=async(_input,init)=>{
  const call=JSON.parse(String(init?.body)) as {id:number;method:string};
  if(call.method==='eth_chainId')return Response.json({jsonrpc:'2.0',id:call.id,result:'0x76edaf'});
  if(call.method==='arkiv_getBlockTiming')return Response.json({jsonrpc:'2.0',id:call.id,result:{current_block:100,current_block_time:Date.now()/1000,duration:2}});
  if(mode==='network')throw Object.assign(new Error(keyed),{cause:{url:keyed}});
  if(mode.startsWith('jsonrpc'))return Response.json({jsonrpc:'2.0',id:call.id,error:{code:mode==='jsonrpc-code'?keyed:-32000,message:keyed,data:{url:keyed}}});
  return new Response(keyed,{status:503,headers:{ratelimit:keyed}});
 };
 try{
 const writer=createWriter({db,env:{ARKIV_PROFILE:'rabdi',RPC:'https://rpc.example',ACCESS_KEY:'fixture',WORKSHOP_WRITER_PRIVATE_KEY:privateKey,WORKSHOP_PRESENTER_TOKEN:'fixture-presenter'},writerAddress:privateKeyToAccount(privateKey).address,defer:()=>{throw new Error('No write permitted');}});
 const response=await writer.handle(new Request('https://app.example/api/rpc',{method:'POST',headers:{authorization:'Bearer fixture-presenter','content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'eth_blockNumber',params:[]})}));
 const body=await response.json();assert.ok(body.error,'provider failure remains visible as a fixed error');
 assert.ok(![String(body.error.message),JSON.stringify(body),JSON.stringify(lines),inspect(body,{depth:20}),inspect(lines,{depth:20})].join(' ').includes(keyed));
 if(mode==='http')assert.equal(lines[0]?.[0],'RPC_READ_REJECTED');
 }finally{globalThis.fetch=original;console.error=log;}
});
