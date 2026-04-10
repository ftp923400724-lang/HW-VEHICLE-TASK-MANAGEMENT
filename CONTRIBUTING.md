# Contributing

`HW-VEHICLE-TASK-MANAGEMENT` 为车辆任务管理前端项目。改动时请优先保证任务单列表、筛选、增删改和统一鉴权链路兼容。

## 基本要求

- 页面请求统一使用项目内封装层
- 任务表单、列表与统计优先复用统一 API
- 环境变量、任务接口地址、下拉基础数据变更要补文档
- 跳转与 token 处理需遵循仓库统一标准

## 提交前自查

- 任务列表、筛选、编辑、删除是否正常
- 应用中心跳转进入是否正常
- 是否影响 `TS-ADMIN-DB-MIGRATION` 约定字段兼容

## 环境约定

- 本地和线上分别使用 `.env.local` / `.env.online`
- API 地址统一使用 `VITE_API_BASE_URL`
- 鉴权密钥优先使用 `VITE_APP_SECRET`
- 跳转地址优先使用 `VITE_REDIRECT_APPCENTER`

## 参考文档

- `README.md`
- `../README.md`
