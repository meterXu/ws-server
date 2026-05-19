import Router from 'koa-router'

const demoRouter = new Router();
const dataMap = new Map()
let syncData = ""
import path from "node:path"
import fs from "node:fs"

demoRouter.get('/', async (ctx) => {
    ctx.body = {
        success: true,
        message: 'Hello, Koa!'
    };
});

demoRouter.get('/api', async (ctx) => {
    ctx.body = {
        success: true,
        message: '用于知眸AI数据上报'
    };
});


demoRouter.post('/api/report', (ctx) => {
    console.log(ctx.request.body)
    global.webSocket.sendToClient(ctx.request.body)
    ctx.body = {
        code:0,
        success: true,
        message: `数据接收成功`
    }
})

demoRouter.get('/api/read', (ctx) => {
    if (!ctx.request.query.task_id) {
        ctx.body = {
            success: false,
            message: "task_id不能为空"
        }
        return
    }
    if (dataMap.has(ctx.request.query.task_id)) {
        ctx.body = dataMap.get(ctx.request.query.task_id)
    } else {
        ctx.body = {
            success: false,
            message: "查不到对应任务的数据"
        }
    }
})

demoRouter.get('/api/getSync', (ctx) => {
    ctx.body = {
        success: true,
        data: syncData
    }
})

demoRouter.post('/api/setSync', (ctx) => {
    syncData = ctx.request.body.syncData
    ctx.body = {
        success: true,
        data: '设置成功'
    }
})

demoRouter.delete('/api/clear', (ctx) => {
    if (!ctx.request.query.task_id) {
        ctx.body = {
            success: false,
            message: "task_id不能为空"
        }
        return
    }
    if (!dataMap.has(ctx.request.query.task_id)) {
        ctx.body = {
            success: false,
            message: "查不到对应任务的数据"
        }
        return
    }
    dataMap.delete(ctx.request.query.task_id)
    ctx.body = {
        success: true,
        message: `task_id[${ctx.request.query.task_id}]数据清除成功`
    }
})


demoRouter.post('/api/upload', (ctx) => {
    try {
        let {fileClip, fileName, index, isFinish} = ctx.request.body;
        let savePath = path.join(process.cwd(), 'upload')
        if (!fs.existsSync(savePath)) {
            fs.mkdirSync(savePath)
        }
        if (index === 0 && fs.existsSync(path.join(savePath, fileName))) {
            fs.unlinkSync(path.join(savePath, fileName))
        }
        const fileData = Buffer.from(fileClip, 'base64');
        fs.appendFileSync(path.join(savePath, fileName), fileData)
        ctx.body = {
            success: true,
            message: 'fileClip upload success'
        }
        if (isFinish) {
            ctx.body = {
                success: true,
                message: 'file upload success'
            }
        }
    } catch (err) {
        ctx.status = 500
        ctx.body = {
            success: false,
            message: err.message
        }
    }
})

export {demoRouter}