<template>
  <div class="panel">
    <div class="panel__header">
      <el-select v-model="selectedStatus" size="large" class="status-select" :options="statusOptions"
        @change="handleStatusChange" />
      <el-input v-model="filterText" class="custom-input" size="large" clearable placeholder="搜索车牌/设备号" />
    </div>
    <el-divider content-position="center">信息查询</el-divider>
    <el-tree ref="treeRef" class="custom-tree" node-key="key" :data="treeData" :props="defaultProps" default-expand-all
      highlight-current :filter-node-method="filterNode" :render-content="renderTreeNode"
      @node-click="handleNodeClick" />
    <div v-if="loading" class="loading-mask">加载中…</div>
  </div>
</template>

<script>
import { ElTag } from 'element-plus'
import { normalizeListResult } from '@/api/http'
import { fetchRealtimeVehicles, fetchVehicleUnits, fetchVehicleTypes } from '@/api/vehicle'
import { extractDeviceKey, hasValidCoordinates } from '@/utils/vehicle'

const ONLINE_THRESHOLD_MINUTES = 5
const OFFLINE_ABNORMAL_THRESHOLD_MINUTES = 30 * 24 * 60

export default {
  name: 'VehicleTree',
  data() {
    return {
      filterText: '',
      selectedStatus: 'all',
      statusOptions: [
        { label: '全部', value: 'all' },
        { label: '在线', value: 'online' },
        { label: '离线', value: 'offline' },
        { label: '异常', value: 'abnormal' }
      ],
      defaultProps: { children: 'children', label: 'label' },
      treeData: [],
      fullTreeData: [],
      unitSortMap: new Map(),
      typeSortMap: new Map(),
      sortMetadataLoaded: false,
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
        await this.ensureSortMetadata()
        const payload = await fetchRealtimeVehicles()
        const vehicles = normalizeListResult(payload).list

        this.fullTreeData = this.buildHierarchicalTree(vehicles)
        this.treeData = this.filterTreeByStatus(this.selectedStatus)
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('加载车辆树失败', error)
        this.fullTreeData = []
        this.treeData = []
      } finally {
        this.loading = false
      }
    },
    handleStatusChange() {
      this.treeData = this.filterTreeByStatus(this.selectedStatus)
    },
    filterNode(value, data) {
      if (!value) return true
      const keyword = String(value).trim()
      if (!keyword) return true
      return [data.label, data.licensePlate, data.deviceNo]
        .map((v) => (v ? String(v) : ''))
        .some((text) => text.includes(keyword))
    },
    renderTreeNode(hRender, { data }) {
      // 非车辆节点，保持默认样式
      if (data.type !== 'vehicle') {
        return hRender('span', { class: 'tree-label' }, data.label)
      }

      const STATUS_CONFIG = {
        online: { type: 'success', text: '在线' },
        offline: { type: 'warning', text: '离线' },
        abnormal: { type: 'danger', text: '异常' }
      }
      const status = STATUS_CONFIG[data.statusKey] || { type: 'danger', text: '状态' }

      const statusEl = hRender('span', { class: 'tree-node-status' }, [
        hRender(ElTag, { size: 'small', type: status.type, effect: 'plain' }, () => status.text)
      ])

      const labelEl = hRender('span', { class: 'tree-label tree-node-label' }, data.label)

      const timeEl = data.suffixText
        ? hRender('span', { class: 'tree-node-right time-text' }, data.suffixText)
        : hRender('span', { class: 'tree-node-right tree-node-right--placeholder' }, '')

      return hRender('div', { class: 'tree-node-container vehicle-node' }, [
        statusEl,
        labelEl,
        timeEl
      ])
    },
    handleNodeClick(node) {
      if (node.type !== 'vehicle') return
      const detail = node.option || {}
      try {
        window.dispatchEvent(new CustomEvent('vehicle-selected', { detail }))
      } catch (_) {
        // ignore
      }
    },
    buildHierarchicalTree(vehicles) {
      const unitMap = new Map()
      vehicles.forEach((vehicle) => {
        const unitLabel = vehicle.unit_name || vehicle.unit?.name || '未分配单位'
        const unitIdentifier = vehicle.unit_id ?? vehicle.unit?.id ?? vehicle.unit?.value
        const unitSort = this.getSortValue(this.unitSortMap, unitIdentifier, unitLabel)
        const unitKey = vehicle.unit_id ? `unit_${vehicle.unit_id}` : `unit_${unitLabel}`

        if (!unitMap.has(unitKey)) {
          unitMap.set(unitKey, {
            key: unitKey,
            label: unitLabel,
            type: 'unit',
            children: [],
            sortValue: unitSort,
            _typeMap: new Map()
          })
        } else {
          const existing = unitMap.get(unitKey)
          existing.sortValue = Math.min(existing.sortValue ?? unitSort, unitSort)
        }
        const unitNode = unitMap.get(unitKey)
        const typeLabel = vehicle.vehicle_type_name || vehicle.vehicle_type?.name || '未分类'
        const typeIdentifier = vehicle.vehicle_type_id ?? vehicle.vehicle_type?.id ?? vehicle.vehicle_type?.value
        const typeSort = this.getSortValue(this.typeSortMap, typeIdentifier, typeLabel)
        const typeKeyComponent = typeIdentifier ?? typeLabel ?? 'n'
        const typeKey = `${unitKey}_type_${typeKeyComponent}`

        if (!unitNode._typeMap.has(typeKey)) {
          unitNode._typeMap.set(typeKey, {
            key: typeKey,
            label: typeLabel,
            type: 'type',
            children: [],
            sortValue: typeSort
          })
          unitNode.children.push(unitNode._typeMap.get(typeKey))
        } else {
          const existing = unitNode._typeMap.get(typeKey)
          existing.sortValue = Math.min(existing.sortValue ?? typeSort, typeSort)
        }
        const typeNode = unitNode._typeMap.get(typeKey)
        const statusInfo = this.deriveStatusInfo(vehicle)
        const vehicleSort = this.normalizeSortField(vehicle.sort ?? vehicle.sort_order ?? 0)

        typeNode.children.push({
          key: `vehicle_${vehicle.id || statusInfo.option.deviceNo || Math.random()}`,
          label: statusInfo.label,
          type: 'vehicle',
          statusKey: statusInfo.statusKey,
          suffixText: statusInfo.suffixText,
          option: statusInfo.option,
          licensePlate: vehicle.license_plate,
          deviceNo: statusInfo.option.deviceNo,
          isLeaf: true,
          sortValue: vehicleSort
        })
      })

      unitMap.forEach((unitNode) => {
        unitNode.children.forEach((typeNode) => {
          typeNode.children.sort(this.compareNodesBySortThenLabel)
        })
      })
      return Array.from(unitMap.values())
        .map((unitNode) => {
          const children = unitNode.children
            .map((typeNode) => ({
              ...typeNode,
              children: [...typeNode.children]
            }))
            .filter((typeNode) => typeNode.children.length)
            .sort(this.compareNodesBySortThenLabel)
          const label = `${unitNode.label} (${children.reduce((sum, n) => sum + n.children.length, 0)})`
          return {
            key: unitNode.key,
            label,
            type: unitNode.type,
            children,
            sortValue: unitNode.sortValue
          }
        })
        .filter((unitNode) => unitNode.children.length)
        .sort(this.compareNodesBySortThenLabel)
    },
    async ensureSortMetadata() {
      if (this.sortMetadataLoaded) return
      await Promise.allSettled([this.loadUnitSorts(), this.loadTypeSorts()])
      this.sortMetadataLoaded = true
    },
    async loadUnitSorts() {
      if (this.unitSortMap.size) return
      try {
        const payload = await fetchVehicleUnits({ page: 1, page_size: 9999, pageSize: 9999 })
        const { list } = normalizeListResult(payload)
        const map = new Map()
        ;(list || []).forEach((item) => {
          const identifier = item.id ?? item.unit_id ?? item.value ?? item.unitId
          const sortValue = this.normalizeSortField(item.sort ?? item.sort_order ?? item.order ?? 0)
          if (identifier !== undefined && identifier !== null) {
            map.set(String(identifier), sortValue)
          }
          const labelKey = this.normalizeLabelKey(item.name ?? item.unit_name ?? item.label ?? item.unit_code)
          if (labelKey) {
            map.set(`label:${labelKey}`, sortValue)
          }
        })
        this.unitSortMap = map
      } catch (error) {
        console.error('加载车辆单位排序数据失败', error)
      }
    },
    async loadTypeSorts() {
      if (this.typeSortMap.size) return
      try {
        const payload = await fetchVehicleTypes({ page: 1, page_size: 9999, pageSize: 9999 })
        const { list } = normalizeListResult(payload)
        const map = new Map()
        ;(list || []).forEach((item) => {
          const identifier =
            item.id ?? item.type_id ?? item.value ?? item.vehicle_type_id ?? item.vehicleTypeId
          const sortValue = this.normalizeSortField(item.sort ?? item.sort_order ?? item.order ?? 0)
          if (identifier !== undefined && identifier !== null) {
            map.set(String(identifier), sortValue)
          }
          const labelKey = this.normalizeLabelKey(item.name ?? item.type_name ?? item.label ?? item.code)
          if (labelKey) {
            map.set(`label:${labelKey}`, sortValue)
          }
        })
        this.typeSortMap = map
      } catch (error) {
        console.error('加载车辆类型排序数据失败', error)
      }
    },
    normalizeSortField(value) {
      if (value === undefined || value === null) {
        return 0
      }
      if (typeof value === 'number') {
        return Number.isFinite(value) ? value : 0
      }
      const trimmed = String(value).trim()
      if (!trimmed) return 0
      const parsed = Number(trimmed)
      return Number.isNaN(parsed) ? 0 : parsed
    },
    normalizeLabelKey(value) {
      if (typeof value !== 'string') return ''
      return value.trim()
    },
    getSortValue(map, identifier, label) {
      if (identifier !== undefined && identifier !== null) {
        const value = map.get(String(identifier))
        if (value !== undefined) return value
      }
      const labelKey = this.normalizeLabelKey(label)
      if (labelKey) {
        const value = map.get(`label:${labelKey}`)
        if (value !== undefined) return value
      }
      return 0
    },
    compareNodesBySortThenLabel(a, b) {
      const sortA = Number.isFinite(a?.sortValue) ? a.sortValue : 0
      const sortB = Number.isFinite(b?.sortValue) ? b.sortValue : 0
      if (sortA !== sortB) return sortA - sortB
      const labelA = String(a?.label ?? '')
      const labelB = String(b?.label ?? '')
      return labelA.localeCompare(labelB)
    },
    deriveStatusInfo(vehicle) {
      const deviceKey = extractDeviceKey(vehicle)
      const plate = vehicle.license_plate || vehicle.vehicle_name || deviceKey || '未知车辆'
      const option = {
        level: 'vehicle',
        vehicleId: vehicle.id,
        vehicleName: vehicle.vehicle_name,
        licensePlate: vehicle.license_plate,
        deviceNo: deviceKey,
        rawVehicle: vehicle,
      }

      if (!deviceKey) {
        return { statusKey: 'abnormal', label: plate, suffixText: '未绑定设备', option }
      }

      if (!hasValidCoordinates(vehicle)) {
        return { statusKey: 'abnormal', label: plate, suffixText: '缺失经纬度', option }
      }

      const timestamp = this.extractTimestamp(vehicle)
      if (timestamp) {
        const diffMinutes = (Date.now() - timestamp.getTime()) / 60000
        option.rawRealtime = vehicle
        const daysOffline = diffMinutes / (24 * 60)
        if (diffMinutes >= OFFLINE_ABNORMAL_THRESHOLD_MINUTES) {
          const daysText = Math.max(30, Math.round(daysOffline))
          return {
            statusKey: 'abnormal',
            label: plate,
            suffixText: `${daysText} 天未上线`,
            option,
          }
        }
        const statusKey = diffMinutes <= ONLINE_THRESHOLD_MINUTES ? 'online' : 'offline'
        return {
          statusKey,
          label: plate,
          suffixText: `${this.describeElapsed(diffMinutes)}前在线`,
          option,
        }
      }

      return { statusKey: 'offline', label: plate, suffixText: '无时间戳', option }
    },
    extractTimestamp(record) {
      const candidates = [record?.timer, record?.received_at, record?.updated_at, record?.created_at, record?.ts]
      for (const value of candidates) {
        const date = this.normalizeTimestamp(value)
        if (date) return date
      }
      return null
    },
    normalizeTimestamp(value) {
      if (value === null || value === undefined || value === '') {
        return null
      }
      if (typeof value === 'number') {
        const seconds = value > 1e12 ? Math.floor(value / 1000) : value
        return new Date(seconds * 1000)
      }
      const str = String(value).trim()
      if (!str) return null
      if (/^\d{4}\d{2}\d{2}-\d{2}:\d{2}:\d{2}$/.test(str)) {
        const normalized = str.replace(
          /(\d{4})(\d{2})(\d{2})-(\d{2}):(\d{2}):(\d{2})/,
          '$1-$2-$3T$4:$5:$6'
        )
        const date = new Date(normalized)
        return Number.isNaN(date.getTime()) ? null : date
      }
      const parsed = new Date(str)
      return Number.isNaN(parsed.getTime()) ? null : parsed
    },
    describeElapsed(minutes) {
      if (minutes < 1) return '刚刚'
      if (minutes < 60) return `${Math.round(minutes)} 分钟`
      const hours = minutes / 60
      if (hours < 24) return `${Math.round(hours)} 小时`
      const days = hours / 24
      return `${Math.round(days)} 天`
    },
    filterTreeByStatus(targetStatus) {
      if (!this.fullTreeData.length || targetStatus === 'all') {
        return this.fullTreeData
      }
      const cloneNode = (node) => {
        if (node.type === 'vehicle') {
          return node.statusKey === targetStatus ? { ...node } : null
        }
        const children = (node.children || []).map(cloneNode).filter(Boolean)
        if (children.length) {
          return { ...node, children }
        }
        return null
      }
      return this.fullTreeData.map(cloneNode).filter(Boolean)
    }
  }
}
</script>

<style scoped>
.panel {
  width: 100%;
  height: 100%;
  background-color: #0d1421;
  border: 1px solid rgba(255, 255, 255, 0.04);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.25);
  position: relative;
}

.panel__header {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 10px;
}

.status-select {
  width: 110px;
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
  grid-template-columns: auto 1fr auto;
  align-items: center;
  width: 100%;
  gap: 8px;
  min-width: 0;
  box-sizing: border-box;
  padding: 0 4px;
}

:deep(.vehicle-node) {
  width: 100%;
  padding: 2px 0;
}

:deep(.tree-node-status) {
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  justify-self: start;
}

:deep(.tree-node-label) {
  text-align: center;
  justify-self: center;
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
:deep(.custom-input .el-input__wrapper) {
  background-color: rgba(30, 41, 59, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  padding: 0 12px;
  box-sizing: border-box;
}

:deep(.status-select .el-select__input),
:deep(.custom-input .el-input__inner) {
  color: #ffffff;
  padding: 0;
  font-size: 13px;
  background: transparent;
  border: none;
  box-shadow: none;
}

:deep(.status-select .el-select__placeholder),
:deep(.custom-input .el-input__inner::placeholder) {
  color: #99a3b8;
  font-size: 13px;
}

:deep(.status-select .el-select__icon),
:deep(.custom-input .el-input__suffix) {
  color: #94a3b8;
  display: flex;
  align-items: center;
  height: 100%;
}

:deep(.status-select .el-select__icon),
:deep(.custom-input .el-input__suffix-inner .el-icon) {
  width: 16px;
  height: 16px;
  transition: color 0.2s;
}

:deep(.status-select .el-select__icon:hover),
:deep(.custom-input .el-input__suffix-inner .el-icon:hover) {
  color: #ffffff;
}

:deep(.status-select .el-select__wrapper:focus-within),
:deep(.custom-input .el-input__wrapper:focus-within) {
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
  outline: none;
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

:deep(.custom-tree) {
  background-color: #0d1421;
  color: #FFF;
  padding: 8px 0;
  overflow: auto;
  height: calc(100% - 100px);
  /* 1. 重置全局缩进变量（核心：清除默认层级缩进增量） */
  --el-tree-node-indent: 0px;
  /* 如需保留少量基础缩进，可修改为 8px，示例：--el-tree-node-indent: 8px; */
}

:deep(.custom-tree .el-tree-node__label) {
  color: #ffffff;
  font-size: 13px;
  transition: color 0.2s;
}

:deep(.custom-tree .el-tree-node__content) {
  padding-top: 4px !important;
  padding-bottom: 4px !important;
  margin: 0 4px;
  border-radius: 4px;
  transition: all 0.2s ease;
  height: auto;
  line-height: 1.5;
}

:deep(.custom-tree .el-tree-node__content:hover) {
  background-color: #162033;
  transform: translateX(2px);
}

:deep(.el-tree-node.is-current > .el-tree-node__content) {
  background-color: #1e40af;
  font-weight: 500;
}

:deep(.el-tree-node.is-current .el-tree-node__label) {
  color: #ffffff;
}

:deep(.el-tree-node) {
  /* 同步更新节点缩进变量，确保一致性 */
  --el-tree-node-indent: 0px;
}

:deep(.custom-tree .el-tree-node__expand-icon) {
  /* 3. 重置展开/折叠图标位置，避免错位 */
  color: #94a3b8;
  width: 16px;
  height: 16px;
  margin-right: 6px;
  margin-left: 0;
  display: inline-flex;
  align-items: center;
}

:deep(.el-tree-node__expand-icon:hover) {
  color: #e2e8f0;
}

:deep(.el-tree-node__expand-icon.is-leaf) {
  visibility: hidden;
}

/* 4. 清除原有缩进辅助虚线（如需保留，可删除该样式） */
:deep(.el-tree--indent .el-tree-node__content::before) {
  display: none;
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

:deep(.el-tree-node[data-type="unit"] .el-tree-node__label),
:deep(.el-tree-node[data-type="type"] .el-tree-node__label) {
  color: #93c5fd;
  font-weight: 500;
}

:deep(.el-tree-node[data-type="unit"] .el-tree-node__content:hover),
:deep(.el-tree-node[data-type="type"] .el-tree-node__content:hover) {
  background-color: #1e293b80;
}
</style>
