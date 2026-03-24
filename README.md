# HW-VEHICLE-POSITIONING

`HW-VEHICLE-POSITIONING` 是车辆定位业务前端，基于 Vue 3 + Vite + Element Plus 构建。

## 启动脚本

```bash
yarn dev
yarn build
yarn build:local
yarn build:online
yarn preview
```

## 环境变量

| 变量 | 说明 |
| --- | --- |
| `VITE_APP_BASE_URL` | 当前前端应用地址 |
| `VITE_API_BASE_URL` | 后端 API 地址 |
| `VITE_TOKEN_EXPIRED_REDIRECT` | token 失效后回跳地址 |
| `VITE_REDIRECT_APPCENTER` | 返回应用中心地址 |
| `VITE_APP_SECRET` | 应用鉴权密钥 |
| `VITE_AMAP_SECURITY_CODE` | 高德地图安全密钥 |

## 约定

- 请求层统一读取 `VITE_API_BASE_URL`
- 鉴权接力优先读取 `VITE_APP_SECRET`
- 本地与线上分别使用 `.env.local` / `.env.online`
