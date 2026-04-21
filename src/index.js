import Koa from 'koa';
import cors from 'koa2-cors'
import koaBody from 'koa-body'
import {demoRouter} from './router/index.js'
import http from 'http'
import webSocket from "./middleware/webSocket.js";
const app = new Koa()
let server = null
app.use(koaBody({multipart: true}));
app.use(cors());
app.use(async (ctx,next)=>{
    ctx.set('Access-Control-Allow-Origin', '*')
    ctx.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
    ctx.set('Access-Control-Allow-Methods', 'PUT, POST, GET, DELETE, OPTIONS')
    ctx.set('Access-Control-Allow-Credentials', true) // 允许带上 cookie
    await next()
}).use(demoRouter.routes())
const PORT = 3000;
try{
  server = http.createServer(app.callback()).listen(PORT,(err)=>{
    if(!!err){
      console.error('HTTP server FAIL: ', err, (err && err.stack));
    }else{
      console.log(`service started at http://localhost:${PORT}`);
    }
  });
}catch (ex) {
  console.error('Failed to start HTTP server\n', ex, (ex && ex.stack));
}

global.webSocket = new webSocket()
server&&global.webSocket.init(server)