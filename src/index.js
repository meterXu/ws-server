import Koa from 'koa';
import cors from 'koa2-cors'
import koaBody from 'koa-body'
import {demoRouter} from './router/index.js'
const app = new Koa()
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
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});