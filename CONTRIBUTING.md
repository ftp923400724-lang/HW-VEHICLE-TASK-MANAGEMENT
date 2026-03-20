# Contributing

`HW-VEHICLE-POSITIONING` 为车辆定位前端项目。改动时请优先保证地图渲染、轨迹查询与统一鉴权链路兼容。

## 基本要求

- 页面请求统一使用项目内封装层
- 地图相关逻辑优先复用，避免重复实现
- 环境变量、地图 key、接口地址变更要补文档
- 跳转与 token 处理需遵循仓库统一标准

## 提交前自查

- 定位查询与地图展示是否正常
- 应用中心跳转进入是否正常
- 是否影响 `TS-ADMIN-API` 接口字段兼容

## 参考文档

- `README.md`
- `../CONTRIBUTING.md`
- `../README.md`
- `../CONTRIBUTING.md`
