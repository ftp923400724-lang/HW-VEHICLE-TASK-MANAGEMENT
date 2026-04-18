<template>
  <div class="panel">
    <div class="panel__header">
      <div class="toolbar-row toolbar-row--primary">
        <el-select v-model="selectedStatus" size="large" class="status-select" @change="handleStatusChange">
          <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <el-date-picker
          v-model="selectedDay"
          class="day-picker"
          size="large"
          type="date"
          value-format="YYYY-MM-DD"
          placeholder="按日期搜索"
          clearable
          @change="handleDayChange"
        />
      </div>
      <div class="toolbar-row toolbar-row--secondary">
        <el-input v-model="filterText" class="custom-input" size="large" clearable placeholder="搜索任务单号/车辆/围栏/作业类型" />
      </div>
    </div>
    <el-divider content-position="center" class="tree-divider">信息查询</el-divider>
    <div class="tree-shell">
      <el-tree ref="treeRef" class="custom-tree" node-key="key" :data="treeData" :props="defaultProps" default-expand-all
        highlight-current :filter-node-method="filterNode" :render-content="renderTreeNode"
        @node-click="handleNodeClick" />
    </div>
    <div v-if="loading" class="loading-mask">加载中…</div>
  </div>
</template>

<script>
import eventBus, { EventTypes } from '@/utils/eventBus'
import { fetchRealtimeVehicles, fetchTaskOrders } from '@/api/vehicle'

export default {
  name: 'VehicleTree',
  data() {
    return {
      filterText: '',
      selectedStatus: 'all',
      selectedDay: '',
      statusOptions: [
        { label: '全部', value: 'all' },
        { label: '草稿', value: 'draft' },
        { label: '已发布', value: 'published' },
        { label: '执行中', value: 'executing' },
        { label: '已完成', value: 'finished' },
        { label: '已验收', value: 'checked' },
        { label: '已取消', value: 'cancelled' }
      ],
      defaultProps: { children: 'children', label: 'label' },
      treeData: [],
      fullTreeData: [],
      loading: false
    }
  },
  mounted() {
    this.loadVehicleTree()
  },
  watch: {
    filterText(val) {
      const tree = this.$refs.treeRef
      tree?.filter?.(val)
    }
  },
  methods: {
    async loadVehicleTree() {
      this.loading = true
      try {
        const [taskOrders, realtimeRes] = await Promise.all([
          this.fetchAllTaskOrders(),
          fetchRealtimeVehicles(),
        ])
        const realtimeVehicles = Array.isArray(realtimeRes?.data?.list) ? realtimeRes.data.list : []

        this.fullTreeData = this.buildTaskTree(taskOrders, realtimeVehicles)
        this.treeData = this.filterTreeByConditions(this.selectedStatus, this.selectedDay)
      } catch (error) {
        this.fullTreeData = []
        this.treeData = []
        const message = error?.message || '加载任务单树失败'
        import('element-plus').then(({ ElNotification }) => {
          ElNotification({
            title: '错误',
            message,
            type: 'error',
          })
        })
      } finally {
        this.loading = false
      }
    },
    handleStatusChange() {
      this.treeData = this.filterTreeByConditions(this.selectedStatus, this.selectedDay)
    },
    handleDayChange() {
      this.treeData = this.filterTreeByConditions(this.selectedStatus, this.selectedDay)
    },
    filterNode(value, data) {
      if (!value) return true
      const keyword = String(value).trim()
      if (!keyword) return true
      return [data.searchText, data.label, data.taskOrderNo, data.vehicleName, data.licensePlate, data.deviceNo, data.fenceName, data.workModeText]
        .map((v) => (v ? String(v) : ''))
        .some((text) => text.includes(keyword))
    },
    renderTreeNode(hRender, { data }) {
      // 非车辆节点，保持默认样式
      if (data.type !== 'vehicle') {
        return hRender('span', { class: 'tree-label' }, data.label)
      }

      return hRender('div', { class: 'tree-node-container vehicle-node' }, [
        hRender('span', { class: 'tree-label tree-node-label tree-node-label--vehicle' }, data.label)
      ])
    },
    handleNodeClick(node) {
      if (node.type !== 'vehicle') return
      const detail = { ...node.option, licensePlate: node.option?.licensePlate || node.label }
      try {
        eventBus.emit(EventTypes.VehicleSelected, detail)
      } catch (_) {
        // ignore
      }
    },
    buildTaskTree(tasks = [], realtimeVehicles = []) {
      const workTypeMap = new Map()
      const realtimeMap = this.buildRealtimeVehicleMap(realtimeVehicles)

      const compareTaskPriority = (left, right) => {
        const leftTime = this.resolveTaskTime(left)
        const rightTime = this.resolveTaskTime(right)
        if (leftTime && rightTime) {
          return rightTime.getTime() - leftTime.getTime()
        }
        if (leftTime) return -1
        if (rightTime) return 1
        return 0
      }

      tasks.forEach((task, index) => {
        const normalized = this.normalizeTaskRecord(task, index)
        if (!normalized.vehicleKey) return

        const workTypeKey = normalized.workModeText || '未分类作业'
        const fenceKey = normalized.fenceName || '未分配围栏'
        if (!workTypeMap.has(workTypeKey)) {
          workTypeMap.set(workTypeKey, {
            key: `workType_${workTypeKey}`,
            label: workTypeKey,
            type: 'workType',
            children: [],
            _fenceMap: new Map(),
            searchText: workTypeKey,
          })
        }

        const workTypeNode = workTypeMap.get(workTypeKey)
        if (!workTypeNode._fenceMap.has(fenceKey)) {
          workTypeNode._fenceMap.set(fenceKey, {
            key: `fence_${workTypeKey}_${fenceKey}`,
            label: fenceKey,
            type: 'fence',
            children: [],
            _vehicleMap: new Map(),
            searchText: `${workTypeKey} ${fenceKey}`,
          })
          workTypeNode.children.push(workTypeNode._fenceMap.get(fenceKey))
        }

        const fenceNode = workTypeNode._fenceMap.get(fenceKey)
        const existing = fenceNode._vehicleMap.get(normalized.vehicleKey)
        if (!existing || compareTaskPriority(normalized, existing.rawTask) > 0) {
          fenceNode._vehicleMap.set(normalized.vehicleKey, this.buildTaskVehicleNode(normalized, realtimeMap))
        }
      })

      const sortByLabel = (a, b) => String(a.label || '').localeCompare(String(b.label || ''), 'zh-Hans-CN')

      return Array.from(workTypeMap.values())
        .sort(sortByLabel)
        .map((workTypeNode) => {
          const fences = workTypeNode.children
            .map((fenceNode) => {
              const children = Array.from(fenceNode._vehicleMap.values()).sort(sortByLabel)
              const label = `${fenceNode.label} (${children.length})`
              return {
                key: fenceNode.key,
                label,
                type: fenceNode.type,
                children,
                searchText: fenceNode.searchText,
              }
            })
            .filter((fenceNode) => fenceNode.children.length)
            .sort(sortByLabel)
          const label = `${workTypeNode.label} (${fences.reduce((sum, node) => sum + node.children.length, 0)})`
          return {
            key: workTypeNode.key,
            label,
            type: workTypeNode.type,
            children: fences,
            searchText: workTypeNode.searchText,
          }
        })
        .filter((workTypeNode) => workTypeNode.children.length)
    },
    buildRealtimeVehicleMap(vehicles = []) {
      const map = new Map()
      ;(Array.isArray(vehicles) ? vehicles : []).forEach((vehicle) => {
        const option = this.normalizeRealtimeVehicle(vehicle)
        if (!option) return
        const keys = [option.vehicleId, option.licensePlate, option.deviceNo].filter(Boolean)
        keys.forEach((key) => {
          if (!map.has(key)) {
            map.set(key, option)
          }
        })
      })
      return map
    },
    normalizeRealtimeVehicle(vehicle = {}) {
      const deviceNo = String(vehicle?.device_no ?? vehicle?.deviceNo ?? vehicle?.hardware_id ?? vehicle?.hardwareId ?? vehicle?.uuid ?? '').trim()
      const licensePlate = String(vehicle?.license_plate ?? vehicle?.licensePlate ?? vehicle?.plate_no ?? vehicle?.plate ?? vehicle?.vehicle_name ?? vehicle?.vehicleName ?? '').trim()
      const vehicleName = String(vehicle?.vehicle_name ?? vehicle?.vehicleName ?? '').trim()
      const vehicleId = String(vehicle?.id ?? vehicle?.vehicle_id ?? vehicle?.vehicleId ?? '').trim()
      if (!deviceNo && !licensePlate && !vehicleId) return null
      return {
        vehicleId,
        vehicleName,
        licensePlate,
        deviceNo,
        unitName: vehicle?.unit_name || vehicle?.unitName || vehicle?.unit?.name || '',
        vehicleTypeName: vehicle?.vehicle_type_name || vehicle?.vehicleTypeName || vehicle?.vehicle_type?.name || '',
        rawVehicle: vehicle,
      }
    },
    normalizeTaskRecord(task = {}, index = 0) {
      const taskStatus = String(task?.status || 'draft').trim().toLowerCase() || 'draft'
      const vehicleId = String(task?.vehicle_id ?? task?.vehicleId ?? '').trim()
      const licensePlate = String(task?.license_plate ?? task?.licensePlate ?? '').trim()
      const vehicleName = String(task?.vehicle_name ?? task?.vehicleName ?? '').trim()
      const fenceId = String(task?.fence_id ?? task?.fenceId ?? '').trim()
      const fenceName = String(task?.fence_name ?? task?.fenceName ?? task?.work_fence_name ?? task?.workFenceName ?? '').trim() || '未分配围栏'
      const workModeText = String(task?.work_mode_text ?? task?.workModeText ?? '').trim() || '未分类作业'
      const taskOrderNo = String(task?.order_no ?? task?.orderNo ?? '').trim()
      const taskDateKey = this.formatTaskDayKey(task?.task_start_time ?? task?.taskStartTime ?? task?.start_time ?? task?.startTime ?? task?.created_at ?? task?.createdAt ?? '')
      const vehicleKey = vehicleId || licensePlate || vehicleName || `task_${index}`
      return {
        ...task,
        taskStatus,
        taskOrderNo,
        vehicleId,
        vehicleName,
        licensePlate,
        fenceId,
        fenceName,
        workModeText,
        taskDateKey,
        isAutoGenerateDaily: Number(task?.is_auto_generate_daily ?? task?.isAutoGenerateDaily ?? 0) === 1,
        vehicleKey,
        searchText: [taskOrderNo, vehicleName, licensePlate, fenceName, workModeText, taskDateKey].filter(Boolean).join(' '),
      }
    },
    buildTaskVehicleNode(task = {}, realtimeMap) {
      const realtime = this.findRealtimeVehicle(task, realtimeMap)
      const vehicleLabel = task.vehicleName || realtime?.vehicleName || task.licensePlate || '未知车辆'
      const suffixText = task.isAutoGenerateDaily
        ? '每日自动'
        : this.formatTaskShortTime(task.task_start_time || task.taskStartTime || task.start_time || task.startTime)
      return {
        key: `vehicle_${task.vehicleKey}_${task.taskOrderNo || Math.random().toString(36).slice(2, 8)}`,
        label: vehicleLabel,
        type: 'vehicle',
        statusKey: task.taskStatus,
        suffixText,
        option: {
          level: 'vehicle',
          vehicleId: realtime?.vehicleId || task.vehicleId || '',
          vehicleName: vehicleLabel,
          licensePlate: task.licensePlate || realtime?.licensePlate || vehicleLabel,
          deviceNo: realtime?.deviceNo || '',
          unitName: realtime?.unitName || '',
          vehicleTypeName: realtime?.vehicleTypeName || '',
          fenceId: task.fenceId || '',
          taskOrderNo: task.taskOrderNo,
          taskStatus: task.taskStatus,
          workModeText: task.workModeText,
          fenceName: task.fenceName,
          isAutoGenerateDaily: task.isAutoGenerateDaily ? 1 : 0,
          taskStartTime: task.task_start_time || task.taskStartTime || task.start_time || task.startTime || '',
          rawTask: task,
          rawVehicle: realtime?.rawVehicle || null,
        },
        licensePlate: task.licensePlate || realtime?.licensePlate || vehicleLabel,
        deviceNo: realtime?.deviceNo || '',
        fenceId: task.fenceId || '',
        taskOrderNo: task.taskOrderNo,
        workModeText: task.workModeText,
        fenceName: task.fenceName,
        taskDateKey: task.taskDateKey || '',
        searchText: [vehicleLabel, task.licensePlate, task.taskOrderNo, task.workModeText, task.fenceName, suffixText].filter(Boolean).join(' '),
        isLeaf: true,
      }
    },
    findRealtimeVehicle(task, realtimeMap) {
      if (!(realtimeMap instanceof Map)) return null
      const keys = [task.vehicleId, task.licensePlate, task.vehicleName].map((value) => String(value || '').trim()).filter(Boolean)
      for (const key of keys) {
        if (realtimeMap.has(key)) {
          return realtimeMap.get(key)
        }
      }
      return null
    },
    formatTaskShortTime(value) {
      const date = this.parseTaskTime(value)
      if (!date) return ''
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      return `${month}-${day} ${hours}:${minutes}`
    },
    parseTaskTime(value) {
      if (!value) return null
      if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
      const parsed = new Date(String(value).replace(' ', 'T'))
      return Number.isNaN(parsed.getTime()) ? null : parsed
    },
    formatTaskDayKey(value) {
      const date = this.parseTaskTime(value)
      if (!date) return ''
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    },
    resolveTaskTime(task) {
      const candidates = [
        task?.task_start_time,
        task?.taskStartTime,
        task?.start_time,
        task?.startTime,
        task?.updated_at,
        task?.updatedAt,
        task?.created_at,
        task?.createdAt,
      ]
      for (const candidate of candidates) {
        const date = this.parseTaskTime(candidate)
        if (date) return date
      }
      return null
    },
    filterTreeByConditions(targetStatus, targetDay) {
      if (!this.fullTreeData.length) {
        return []
      }
      const activeStatus = String(targetStatus || 'all')
      const activeDay = String(targetDay || '').trim()
      if (activeStatus === 'all' && !activeDay) {
        return this.fullTreeData
      }
      const cloneNode = (node) => {
        if (node.type === 'vehicle') {
          const statusMatched = activeStatus === 'all' || node.statusKey === activeStatus
          const dayMatched = !activeDay || String(node.taskDateKey || '').trim() === activeDay
          return statusMatched && dayMatched ? { ...node } : null
        }
        const children = (node.children || []).map(cloneNode).filter(Boolean)
        if (children.length) {
          return { ...node, children }
        }
        return null
      }
      return this.fullTreeData.map(cloneNode).filter(Boolean)
    },
    async fetchAllTaskOrders() {
      const collected = []
      let page = 1
      const pageSize = 200

      while (true) {
        const result = await fetchTaskOrders({ page, pageSize })
        const list = Array.isArray(result?.list) ? result.list : []
        const total = Number(result?.total || 0)
        collected.push(...list)
        if (collected.length >= total || list.length < pageSize || page > 20) {
          break
        }
        page += 1
      }

      return collected
    }
  }
}
</script>

<style scoped>
.panel {
  width: 100%;
  height: 100%;
  position: relative;
}

.panel__header {
  display: flex;
  gap: 10px;
  flex-direction: column;
  align-items: stretch;
  padding: 12px 12px 10px;
}

.status-select {
  width: 118px;
}

.day-picker {
  width: 100%;
}

.custom-input {
  width: 100%;
}

.tree-shell {
  padding: 0 10px 12px;
}

.tree-divider {
  margin: 4px 0 8px;
}

.toolbar-row {
  display: flex;
  gap: 8px;
  width: 100%;
}

.toolbar-row--primary {
  align-items: center;
}

.toolbar-row--secondary {
  align-items: stretch;
}

.loading-mask {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(13, 20, 33, 0.72);
  color: #dfe6ee;
  font-size: 13px;
  pointer-events: none;
}

/* 节点布局样式 */
:deep(.custom-tree .tree-node-container) {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  width: 100%;
  gap: 10px;
  min-width: 0;
  box-sizing: border-box;
  padding: 0 8px;
}

:deep(.vehicle-node) {
  width: 100%;
  padding: 4px 0;
}

:deep(.tree-node-center) {
  min-width: 0;
  overflow: hidden;
}

:deep(.tree-node-center .tree-node-label) {
  text-align: left;
  justify-self: stretch;
}

:deep(.tree-node-status) {
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  justify-self: start;
}

:deep(.tree-node-label) {
  text-align: left;
  justify-self: stretch;
}

:deep(.tree-node-right) {
  font-size: 12px;
  color: #9aa1b5;
  white-space: nowrap;
  text-align: right;
  justify-self: end;
}

:deep(.tree-node-right--placeholder) {
  opacity: 0;
}

:deep(.tree-label) {
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tree-status-tag {
  line-height: 1;
}

.plate-number {
  font-size: 14px;
  color: #ffffff;
  font-weight: 500;
}

.time-text {
  font-size: 8px !important;
  color: #909399;
  line-height: 1;
  margin-left: 8px;
  white-space: nowrap;
}

:deep(.status-select .el-select__wrapper),
:deep(.custom-input .el-input__wrapper),
:deep(.day-picker .el-input__wrapper) {
  background-color: #1b2b49;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  padding: 0 12px;
  box-sizing: border-box;
}

:deep(.status-select .el-select__input),
:deep(.custom-input .el-input__inner),
:deep(.day-picker .el-input__inner) {
  color: #ffffff;
  padding: 0;
  font-size: 13px;
  background: transparent;
  border: none;
  box-shadow: none;
}

:deep(.status-select .el-select__placeholder),
:deep(.custom-input .el-input__inner::placeholder),
:deep(.day-picker .el-input__inner::placeholder) {
  color: #99a3b8;
  font-size: 13px;
}

:deep(.status-select .el-select__icon),
:deep(.custom-input .el-input__suffix),
:deep(.day-picker .el-input__suffix) {
  color: #94a3b8;
  display: flex;
  align-items: center;
  height: 100%;
}

:deep(.status-select .el-select__icon),
:deep(.custom-input .el-input__suffix-inner .el-icon),
:deep(.day-picker .el-input__suffix-inner .el-icon) {
  width: 16px;
  height: 16px;
  transition: color 0.2s;
}

:deep(.status-select .el-select__icon:hover),
:deep(.custom-input .el-input__suffix-inner .el-icon:hover),
:deep(.day-picker .el-input__suffix-inner .el-icon:hover) {
  color: #ffffff;
}

:deep(.status-select .el-select__wrapper:focus-within),
:deep(.custom-input .el-input__wrapper:focus-within),
:deep(.day-picker .el-input__wrapper:focus-within) {
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
  outline: none;
}

:deep(.day-picker .el-input__prefix-inner) {
  color: #94a3b8;
}

:deep(.day-picker .el-input__prefix-inner .el-icon) {
  width: 16px;
  height: 16px;
}

:deep(.status-select .el-select-dropdown) {
  background-color: #1e293b;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

:deep(.status-select .el-select-dropdown__item) {
  color: #ffffff;
  padding: 6px 16px;
  font-size: 13px;
  transition: background-color 0.2s;
}

:deep(.status-select .el-select-dropdown__item:hover) {
  background-color: #3b82f6;
}

:deep(.status-select .el-select-dropdown__item.selected) {
  background-color: #1e40af;
}

:deep(.status-select .el-select-dropdown__separator) {
  background-color: rgba(255, 255, 255, 0.1);
}

:deep(.custom-tree) {
  background-color: #0d1421;
  color: #FFF;
  padding: 10px 0 16px;
  overflow: auto;
  height: calc(100% - 94px);
}

:deep(.custom-tree .el-tree-node__label) {
  color: #ffffff;
  font-size: 13px;
  transition: color 0.2s;
}

:deep(.custom-tree .el-tree-node__content) {
  margin: 4px 4px;
  border-radius: 6px;
  transition: all 0.2s ease;
  height: auto;
  line-height: 1.5;
}

:deep(.custom-tree > .el-tree-node:first-child > .el-tree-node__content) {
  margin-top: 0;
}

:deep(.custom-tree > .el-tree-node:last-child > .el-tree-node__content) {
  margin-bottom: 0;
}

:deep(.custom-tree .el-tree-node__content:hover) {
  background-color: #162033;
  transform: translateX(1px);
}

:deep(.el-tree-node.is-current > .el-tree-node__content) {
  background-color: #1e40af;
  font-weight: 500;
}

:deep(.el-tree-node.is-current .el-tree-node__label) {
  color: #ffffff;
}

:deep(.el-tree-node) {
  --el-tree-node-indent: 16px;
}

:deep(.el-tree-node__expand-icon) {
  color: #94a3b8;
  width: 16px;
  height: 16px;
  margin-right: 6px;
}

:deep(.el-tree-node__expand-icon:hover) {
  color: #e2e8f0;
}

:deep(.el-tree-node__expand-icon.is-leaf) {
  visibility: hidden;
}

:deep(.el-divider) {
  border-color: #243048;
}

:deep(.el-divider__text) {
  color: #ffffff;
  background: transparent;
}

:deep(.el-tree .el-icon-caret-right),
:deep(.el-tree .el-icon-caret-bottom) {
  color: #cccccc;
}

:deep(.el-tree--indent .el-tree-node__content) {
  position: relative;
}

:deep(.el-tree--indent .el-tree-node__content::before) {
  content: '';
  position: absolute;
  left: 8px;
  top: 0;
  bottom: 0;
  border-left: 1px dashed #2d3748;
}

:deep(.custom-tree::-webkit-scrollbar) {
  width: 6px;
  height: 6px;
}

:deep(.custom-tree::-webkit-scrollbar-track) {
  background: #1e293b;
  border-radius: 3px;
}

:deep(.custom-tree::-webkit-scrollbar-thumb) {
  background: #475569;
  border-radius: 3px;
}

:deep(.custom-tree::-webkit-scrollbar-thumb:hover) {
  background: #64748b;
}
</style>
