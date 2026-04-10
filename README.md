# HW-VEHICLE-TASK-MANAGEMENT

`HW-VEHICLE-TASK-MANAGEMENT` 是车辆任务管理前端，基于 Vue 3 + Vite + Element Plus 构建。

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
| `VITE_DISPATCH_SIMPLE_TASK_PATH` | 任务单接口前缀 |
| `VITE_VEHICLE_PATH` | 车辆列表接口 |
| `VITE_VEHICLE_FENCE_TREE_PATH` | 围栏树接口 |
| `VITE_VEHICLE_WORK_TYPES_PATH` | 作业类型接口 |

## 约定

- 请求层统一读取 `VITE_API_BASE_URL`
- 任务管理统一通过 `src/api/vehicle/taskOrder.js` 调用增删改查
- 车辆、围栏、作业类型下拉项统一通过 `src/api/vehicle/metadata.js` 拉取
- 本地与线上分别使用 `.env.local` / `.env.online`
