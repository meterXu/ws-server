# 🌾☠️信使
基于koa服务的websocket管理工具，支持：
* 消息上报
* 消息推送
* 定时广播
* 消息日志

可用于模拟ws、mqtt服务，ws开发等环境。

## 一键安装
```bash
docker volume create ws_data
docker run -d --name ws-server -p 3000:3000 -v ws_data:/app/data meterxu/ws-server:latest
```
## docker-compose
```bash
services:
  ws-server:
    image: meterxu/ws-server:latest  # 你的镜像名
    ports:
      - "3000:3000"
    volumes:
      - ws_data:/app/data

volumes:
  ws_data:
```

## 系统界面
![20260602081317.jpg](./assets/20260602081317.jpg)
![20260602081340.jpg](./assets/20260602081340.jpg)
![20260602081351.jpg](./assets/20260602081351.jpg)
![20260602081404.jpg](./assets/20260602081404.jpg)
