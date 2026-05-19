import Router from 'koa-router'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const demoRouter = new Router();
const dataMap = new Map()
let syncData = ""
import path from "node:path"
import fs from "node:fs"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

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

demoRouter.get('/admin', async (ctx) => {
    const htmlPath = path.join(__dirname, '..', 'views', 'admin.html')
    ctx.type = 'text/html; charset=utf-8'
    ctx.body = fs.readFileSync(htmlPath, 'utf-8')
})

demoRouter.get('/api/clients', async (ctx) => {
    ctx.body = {
        success: true,
        clientCount: global.webSocket ? global.webSocket.getClientCount() : 0
    }
})

demoRouter.post('/api/broadcast', async (ctx) => {
    const count = global.webSocket ? global.webSocket.getClientCount() : 0
    if (count === 0) {
        ctx.body = { success: true, clientCount: 0, message: '当前没有已连接的客户端' }
        return
    }
    global.webSocket.sendToClient(ctx.request.body)
    console.log('[Broadcast] 消息已广播至 ' + count + ' 个客户端:', ctx.request.body)
    ctx.body = { success: true, clientCount: count, message: '广播成功' }
})

// ---- 定时广播 ----

demoRouter.post('/api/timer/start', async (ctx) => {
    const { message, interval } = ctx.request.body
    if (!message) {
        ctx.body = { success: false, message: 'message 不能为空' }
        return
    }
    if (!interval || interval < 1) {
        ctx.body = { success: false, message: 'interval 必须 >= 1 秒' }
        return
    }
    if (!global.webSocket) {
        ctx.body = { success: false, message: 'WebSocket 服务未初始化' }
        return
    }
    const ok = global.webSocket.startTimer(message, interval * 1000)
    if (!ok) {
        ctx.body = { success: false, message: '已有定时任务在运行，请先停止' }
        return
    }
    console.log('[Timer] 定时广播已启动，间隔 ' + interval + 's，消息:', message)
    ctx.body = { success: true, message: '定时广播已启动', status: global.webSocket.getTimerStatus() }
})

demoRouter.post('/api/timer/stop', async (ctx) => {
    if (!global.webSocket) {
        ctx.body = { success: false, message: 'WebSocket 服务未初始化' }
        return
    }
    const ok = global.webSocket.stopTimer()
    if (!ok) {
        ctx.body = { success: false, message: '当前没有定时任务在运行' }
        return
    }
    console.log('[Timer] 定时广播已停止')
    ctx.body = { success: true, message: '定时广播已停止', status: global.webSocket.getTimerStatus() }
})

demoRouter.get('/api/timer/status', async (ctx) => {
    if (!global.webSocket) {
        ctx.body = { success: false, message: 'WebSocket 服务未初始化' }
        return
    }
    ctx.body = { success: true, status: global.webSocket.getTimerStatus() }
})

// ---- 页面 ----

demoRouter.get('/timer', async (ctx) => {
    const htmlPath = path.join(__dirname, '..', 'views', 'timer.html')
    ctx.type = 'text/html; charset=utf-8'
    ctx.body = fs.readFileSync(htmlPath, 'utf-8')
})

export {demoRouter}