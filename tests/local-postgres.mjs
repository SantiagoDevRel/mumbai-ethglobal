// Test-only protocol bridge: the installed Neon driver talks to an owned local Postgres.
// Real SQL, transactions and locks run in Postgres; no production endpoint is accepted.
import net from 'node:net';
import {neonConfig, Pool} from '@neondatabase/serverless';

const target = new URL(process.env.DATABASE_URL ?? '');
if (target.hostname !== '127.0.0.1' || target.pathname !== '/surf2_test' || target.username !== 'surf2') throw new Error('Only the throwaway local test database is allowed.');
const port = Number(target.port);
if (!Number.isSafeInteger(port) || port < 1024) throw new Error('Invalid isolated Postgres port.');

class TcpWebSocket extends EventTarget {
  static CONNECTING=0; static OPEN=1; static CLOSING=2; static CLOSED=3;
  readyState=0;
  constructor() {
    super();
    this.socket=net.connect({host:'127.0.0.1',port});
    this.socket.on('connect',()=>{this.readyState=1;this.emit(new Event('open'));});
    this.socket.on('data',data=>this.emit(new MessageEvent('message',{data:data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength)})));
    this.socket.on('error',()=>this.emit(new Event('error')));
    this.socket.on('close',()=>{this.readyState=3;this.emit(new Event('close'));});
  }
  emit(event){this.dispatchEvent(event);this['on'+event.type]?.(event);}
  send(data){this.socket.write(Buffer.from(data));}
  close(){this.readyState=2;this.socket.end();}
}
neonConfig.webSocketConstructor=TcpWebSocket;
neonConfig.useSecureWebSocket=false;
neonConfig.forceDisablePgSSL=true;
neonConfig.pipelineTLS=false;
neonConfig.pipelineConnect=false;
neonConfig.wsProxy=()=>`127.0.0.1:${port}`;
const httpPool=new Pool({connectionString:target.href,max:8,idleTimeoutMillis:100,allowExitOnIdle:true});
neonConfig.fetchEndpoint=()=>`http://127.0.0.1:${port}/sql`;
neonConfig.fetchFunction=async(_url,options)=>{
  const input=JSON.parse(options.body);
  const execute=async query=>{
    const result=await httpPool.query({text:query.query,values:query.params,rowMode:'array',types:{getTypeParser:()=>value=>value}});
    return {fields:result.fields,rows:result.rows,command:result.command,rowCount:result.rowCount,rowAsArray:true};
  };
  try{return Response.json(input.queries?{results:await Promise.all(input.queries.map(execute))}:await execute(input));}
  catch(error){return Response.json({message:error.message,code:error.code,severity:error.severity,detail:error.detail},{status:400});}
};
process.once('beforeExit',()=>httpPool.end());
