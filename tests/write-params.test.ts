import {test} from 'node:test';
import assert from 'node:assert/strict';
import {inspect} from 'node:util';
import {defineSchema, str, ExpirationTime} from '@arkiv-network/sdk';
import {writeParams} from '../shared/arkiv/sdk-1.0.ts';
const address='0x1111111111111111111111111111111111111111' as const;
const schema=defineSchema({name:str()});
const keyed='https://rpc.rabdi.db-chain.testnet.arkiv.network/surf2-synthetic-key';
for(const [label,estimate,limit,wanted] of [['floor',100000n,30000000n,1000000n],['two-operation floor',100000n,30000000n,1400000n],['headroom',800000n,30000000n,1600000n],['half equality',800000n,3200001n,1600000n],['bound',800000n,3199999n,null],['failure',null,30000000n,null]] as const) test('unsigned latest estimate '+label,async()=>{
 const calls: {method:string;params?:unknown}[]=[];
 const batch={creates:[{schema,values:{name:'test'},expiration:ExpirationTime.fromBlocks(20)}]};
 if(label==='two-operation floor')batch.creates.push({...batch.creates[0]!});
 const reader={
  chain:{id:1337,name:"Test",nativeCurrency:{name:"Test",symbol:"T",decimals:18},rpcUrls:{default:{http:["https://offline.invalid"]}}},
  async getTransactionCount(args:unknown){assert.deepEqual(args,{address,blockTag:'latest'});return 7;},
  async getTransactionReceipt(){throw new Error('must not read receipt');},
  async request(call:{method:string;params?:unknown[]}){calls.push(call);
   if(call.method==='eth_gasPrice')return '0x3';
   if(call.method==='eth_blockNumber')return '0x64';
   if(call.method==='eth_getBlockByNumber'){assert.deepEqual(call.params,['latest',false]);return {gasLimit:'0x'+limit.toString(16)};}
   if(call.method==='eth_estimateGas'){assert.equal(call.params?.[1],'latest'); const tx=call.params?.[0] as {from:string;data:string};assert.equal(tx.from,address);assert.ok(tx.data.length>10);if(estimate===null)throw Object.assign(new Error(keyed),{cause:keyed});return '0x'+estimate.toString(16);}
   throw new Error('unexpected request');
  }
 };
 if(wanted!==null){const result=await writeParams(reader as never,address,batch.creates.length,undefined, batch);assert.equal(result.gas,wanted);assert.equal(result.nonce,7);assert.equal(result.gasPrice,3n);assert.equal(calls.filter(c=>c.method==='eth_estimateGas').length,1);}
 else {await assert.rejects(writeParams(reader as never,address,batch.creates.length,undefined, batch),error=>{assert.ok(![String(error),JSON.stringify(error),inspect(error,{depth:20})].join(' ').includes(keyed));return true;});}
});

import {createArkivAdapter} from '../shared/arkiv/sdk-1.0.ts';
import {getProfile,WRITER_ADDRESS} from '../shared/arkiv/profiles.ts';
for(const mode of ['failed estimate','oversized batch'])test('adapter never prompts or sends after '+mode,async()=>{
 let prompts=0;const adapter=createArkivAdapter({profile:getProfile('rabdi'),creator:WRITER_ADDRESS,read:{kind:'relay',send:async(method)=>{
 if(method==='eth_chainId')return '0x76edaf';if(method==='eth_blockNumber')return '0x64';if(method==='eth_getTransactionCount')return '0x0';if(method==='eth_gasPrice')return '0x1';
 if(method==='eth_getBlockByNumber')return {gasLimit:'0x1c9c380'};
 if(method==='eth_estimateGas'){if(mode==='failed estimate')throw new Error(keyed);return '0x1c9c380';}throw new Error('Unexpected read');
 }},wallet:{kind:'eip1193',account:WRITER_ADDRESS,provider:{request:async()=>{prompts++;throw new Error('No wallet call allowed');}}}});
 const dots=[{session:'TEST',name:'test',country:'IN',color:'#fe7446',lat:20,lng:75,lifetimeSec:20}];
 for(let attempt=0;attempt<2;attempt++)await assert.rejects(adapter.createDots(dots),error=>{assert.ok(!inspect(error,{depth:20}).includes(keyed));return true;});assert.equal(prompts,0);
});

import {createWalletClient as sdkWallet} from '@arkiv-network/sdk';
import {custom} from 'viem';
test('unsigned estimate matches the exact SDK call with its retained salt',async()=>{
 let estimated:string|undefined, sent=0;const chain={id:1337,name:'Test',nativeCurrency:{name:'Test',symbol:'T',decimals:18},rpcUrls:{default:{http:['https://offline.invalid']}}};
 const batch={creates:[{schema,values:{name:'test'},expiration:ExpirationTime.fromBlocks(20)}]};
 const reader={chain,getTransactionCount:async()=>7,getTransactionReceipt:async()=>{throw new Error('No receipt read');},request:async({method,params}:{method:string;params?:unknown[]})=>{
  if(method==='eth_gasPrice')return '0x3';if(method==='eth_blockNumber')return '0x64';if(method==='eth_getBlockByNumber')return {gasLimit:'0x1c9c380'};
  if(method==='eth_estimateGas'){estimated=(params?.[0] as {data:string}).data;return '0x30d40';}throw new Error('Unexpected read');
 }};
 const params=await writeParams(reader as never,address,1,undefined,batch);
 const wallet=sdkWallet({chain,account:address,transport:custom({request:async({method,params:args})=>{
  if(method==='eth_chainId')return '0x539';if(method==='eth_blockNumber')return '0x65';if(method==='eth_sendTransaction'){sent++;const tx=(args as [{data:string;gas:string;nonce:string;gasPrice:string}])[0];assert.equal(tx.data,estimated);assert.equal(tx.gas,'0xf4240');assert.equal(tx.nonce,'0x7');assert.equal(tx.gasPrice,'0x3');throw new Error('Synthetic send refused');}throw new Error('Unexpected wallet call');
 }},{retryCount:0})});
 await assert.rejects(wallet.executeBatch(batch,params));assert.equal(sent,1);assert.ok(estimated);
});
