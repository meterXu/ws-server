import Router from 'koa-router'
const demoRouter = new Router();
const dataMap = new Map()
let syncData = ""

demoRouter.get('/', async (ctx) => {
    ctx.body = {
        success:true,
        message:'Hello, Koa!'
    };
});

demoRouter.get('/api', async (ctx) => {
    ctx.body = {
        success:true,
        message:'用于知眸AI数据上报'
    };
});


demoRouter.post('/api/receive',(ctx)=>{
    console.log(ctx.request.body)
    if(!ctx.request.body.task_id){
        ctx.body = {
            success:false,
            message:"task_id不能为空"
        }
        return
    }
    if(!dataMap.has(ctx.request.body.task_id)){
        dataMap.set(ctx.request.body.task_id, [])
    }
    dataMap.get(ctx.request.body.task_id).push(ctx.request.body)
    ctx.body = {
        success:true,
        message:`task_id[${ctx.request.body.task_id}]数据接收成功`
    }
})

demoRouter.get('/api/read', (ctx) => {
    if(!ctx.request.query.task_id){
        ctx.body = {
            success:false,
            message:"task_id不能为空"
        }
        return
    }
    if(dataMap.has(ctx.request.query.task_id)){
        ctx.body=dataMap.get(ctx.request.query.task_id)
    }else{
        ctx.body={
            success:false,
            message:"查不到对应任务的数据"
        }
    }
})

demoRouter.get('/api/getSync', (ctx) => {
    ctx.body = {
        success:true,
        data:syncData
    }
})

demoRouter.post('/api/setSync', (ctx) => {
    syncData = ctx.request.body.syncData
    ctx.body={
        success:true,
        data:'设置成功'
    }
})

demoRouter.delete('/api/clear',(ctx)=>{
    if(!ctx.request.query.task_id){
        ctx.body = {
            success:false,
            message:"task_id不能为空"
        }
        return
    }
    if(!dataMap.has(ctx.request.query.task_id)){
        ctx.body = {
            success:false,
            message:"查不到对应任务的数据"
        }
        return
    }
    dataMap.delete(ctx.request.query.task_id)
    ctx.body = {
        success:true,
        message:`task_id[${ctx.request.query.task_id}]数据清除成功`
    }
})

export {demoRouter}