# API 管理说明（TS-VEHICLE-POSITIONING）

本项目 API 管理遵循仓库统一说明（Axios API 管理标准）。

## 分层结构

- `src/api/http.js`
  - 统一 axios 实例、请求/响应拦截、鉴权头注入、错误处理。
- `src/api/vehicle/`
  - `realtime.js`：实时定位与统计接口。
  - `crud.js`：车辆列表与增删改。
  - `metadata.js`：单位、类型、权限组、设备绑定。
  - `index.js`：统一导出。
- 页面层（`src/components`、`src/window`）
  - 只调用 `src/api/vehicle` 导出的业务函数。
  - 不直接 `import axios`，不直接拼鉴权头。

## 成功码与失败规则

- 业务成功：`code >= 1`（当前后端成功码为 `1`）。
- 业务失败：`code < 1`，会在 `unwrapResponse` 中抛错。
- HTTP 失败：
  - `401/403`：非开发模式下清理 token 并跳转登录。
  - 其他状态：统一抛出错误，页面按需展示提示。

## 鉴权头策略

- 默认自动注入：
  - `AppSecret`（来自 `VITE_APP_SECRET`，并兼容从 URL 参数 `AppSecret/appSecret/accessToken` 注入后缓存）。
  - `User-Token` / `Authorization` / `Api-Auth`（来自 token 工具）。
- 开发模式可注入：
  - `X-Dev-Super-Admin: 1`（用于本地联调兜底）。

## 返回结构约定

- 原始响应统一通过 `requestJson` 返回 `response.data`。
- 常用解包函数：
  - `unwrapResponse(payload)`：提取 `payload.data` / `payload.result` 并做失败判断。
  - `normalizeListResult(payload)`：规范化为 `{ list, total }`，兼容 `list/records/rows`。

## 使用示例

```js
import { fetchVehicleList } from '@/api/vehicle'
import { normalizeListResult } from '@/api/http'

const payload = await fetchVehicleList({ page: 1, pageSize: 10 })
const { list, total } = normalizeListResult(payload)
```

## 新增接口时的约束

1. 优先在 `src/api/vehicle/*` 中新增函数，不在页面写 URL。
2. `GET` 走 `params`，`POST`/`PUT` 走 `body`。
3. 统一复用 `src/api/http.js`，禁止新增第二套未受管请求实例。
