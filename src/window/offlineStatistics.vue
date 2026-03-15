<template>
  <el-drawer v-model="dialogVisible" title="车辆在离线统计" size="980px" direction="rtl" :close-on-click-modal="false"
    :append-to-body="true" class="offline-statistics-drawer" modal-class="offline-statistics-drawer-overlay">
    <el-form inline class="statistics-form">
      <el-form-item label="时间范围">
        <el-date-picker v-model="statisticsRange" type="datetimerange" range-separator="-" start-placeholder="开始时间"
          end-placeholder="结束时间" value-format="YYYY-MM-DD HH:mm:ss" :locale="datePickerLocale"
          popper-class="offline-statistics-drawer-picker" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="statisticsLoading" @click="queryOfflineStatistics">
          查询
        </el-button>
        <el-button :disabled="statisticsLoading" @click="resetStatisticsRange">
          重置
        </el-button>
        <el-button type="success" :disabled="statisticsLoading || statisticsTableData.length === 0"
          @click="exportOfflineStatistics">
          导出Excel
        </el-button>
      </el-form-item>
    </el-form>

    <el-alert v-if="statisticsErrorMessage" type="error" show-icon :title="statisticsErrorMessage" />

    <el-table v-loading="statisticsLoading" :data="statisticsTableData" border height="calc(100vh - 280px)"
      highlight-current-row :loading-text="'正在查询数据...'" class="offline-dark-table"
      :header-cell-style="getTableHeaderCellStyle" :cell-style="getTableCellStyle" :row-style="getTableRowStyle"
      :style="tableStyleVars">
      <el-table-column type="index" label="#" width="54" align="center" />
      <el-table-column prop="periodDisplay" label="时间" min-width="180" show-overflow-tooltip align="center" />
      <el-table-column prop="totalCount" label="总车辆(辆)" width="120" align="center" />
      <el-table-column prop="onlineCount" label="在线(辆)" width="110" align="center" />
      <el-table-column prop="offlineCount" label="离线(辆)" width="110" align="center" />
      <el-table-column prop="abnormalCount" label="异常(辆)" width="110" align="center" />
      <el-table-column label="在线率" width="110" align="center">
        <template #default="{ row }">
          <span>{{ row.onlineRateDisplay }}</span>
        </template>
      </el-table-column>
    </el-table>
  </el-drawer>
</template>

<script>
import { ElNotification } from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import { unwrapResponse } from '@/api/http'
import { fetchVehicleStatusStatistics } from '@/api/vehicle'

export default {
  name: 'OfflineStatisticsWindow',
  props: {
    visible: {
      type: Boolean,
      default: false,
      required: true
    }
  },
  emits: ['update:visible'],
  data() {
    return {
      statisticsLoading: false,
      statisticsErrorMessage: '',
      statisticsRange: [],
      statisticsTableData: [],
      datePickerLocale: zhCn
    }
  },
  computed: {
    dialogVisible: {
      get() {
        return this.visible
      },
      set(value) {
        this.$emit('update:visible', value)
      }
    },
    isRangeValid() {
      return (
        Array.isArray(this.statisticsRange) &&
        this.statisticsRange.length === 2 &&
        !!this.statisticsRange[0] &&
        !!this.statisticsRange[1]
      )
    },
    tableStyleVars() {
      return {
        '--el-table-bg-color': 'rgba(8, 20, 36, 0.92)',
        '--el-table-tr-bg-color': 'rgba(8, 20, 36, 0.92)',
        '--el-table-header-bg-color': 'rgba(16, 38, 66, 0.96)',
        '--el-table-border-color': 'rgba(108, 152, 218, 0.34)',
        '--el-table-row-hover-bg-color': 'rgba(31, 72, 121, 0.58)',
        '--el-table-text-color': '#d7e7ff',
        '--el-table-header-text-color': '#c8ddff',
        background: 'rgba(8, 20, 36, 0.92)',
        color: '#d7e7ff'
      }
    }
  },
  watch: {
    visible(val) {
      if (!val) {
        this.statisticsErrorMessage = ''
        this.statisticsLoading = false
        return
      }
      if (!this.isRangeValid) {
        this.statisticsRange = this.getDefaultStatisticsRange()
      }
      this.queryOfflineStatistics()
    }
  },
  methods: {
    getTableHeaderCellStyle() {
      return {
        background: 'linear-gradient(180deg, rgba(24, 54, 91, 0.96) 0%, rgba(16, 38, 66, 0.96) 100%)',
        color: '#c8ddff',
        borderColor: 'rgba(108, 152, 218, 0.34)',
        fontWeight: 600
      }
    },
    getTableCellStyle() {
      return {
        background: 'rgba(8, 20, 36, 0.92)',
        color: '#d7e7ff',
        borderColor: 'rgba(108, 152, 218, 0.26)'
      }
    },
    getTableRowStyle() {
      return {
        background: 'rgba(8, 20, 36, 0.92)'
      }
    },
    resetStatisticsRange() {
      this.statisticsRange = this.getDefaultStatisticsRange()
      this.queryOfflineStatistics()
    },
    getDefaultStatisticsRange() {
      const now = new Date()
      const start = new Date(now)
      start.setHours(0, 0, 0, 0)
      return [this.formatDateTime(start), this.formatDateTime(now)]
    },
    formatDateTime(date) {
      if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
        return ''
      }
      const pad = (num) => String(num).padStart(2, '0')
      const y = date.getFullYear()
      const m = pad(date.getMonth() + 1)
      const d = pad(date.getDate())
      const h = pad(date.getHours())
      const min = pad(date.getMinutes())
      const s = pad(date.getSeconds())
      return `${y}-${m}-${d} ${h}:${min}:${s}`
    },
    normalizeStatisticsRows(payload) {
      const data = unwrapResponse(payload)
      const rawList = [
        data?.list,
        data?.rows,
        data,
        payload?.list,
        payload?.rows,
        payload?.data
      ].find(Array.isArray) || []

      return rawList.map((item) => {
        const totalCount = this.toNonNegativeInt(item, [
          'total_count',
          'totalCount',
          'total_vehicles',
          'totalVehicles',
          'total'
        ])
        const onlineCount = this.toNonNegativeInt(item, ['online_count', 'onlineCount', 'online'])
        const offlineCount = this.toNonNegativeInt(item, ['offline_count', 'offlineCount', 'offline'])
        const abnormalCount = this.toNonNegativeInt(item, ['abnormal_count', 'abnormalCount', 'abnormal'])
        const onlineRate = this.calculateOnlineRate(item, onlineCount, offlineCount, abnormalCount)
        const periodDisplay =
          item?.period ??
          item?.time ??
          item?.stat_time ??
          item?.statistics_time ??
          item?.date ??
          item?.hour ??
          ''

        return {
          periodDisplay: String(periodDisplay || ''),
          totalCount,
          onlineCount,
          offlineCount,
          abnormalCount,
          onlineRate,
          onlineRateDisplay: onlineRate === null ? '—' : `${onlineRate.toFixed(1)}%`
        }
      })
    },
    toNonNegativeInt(item, keys) {
      for (const key of keys) {
        const value = item?.[key]
        if (value !== undefined && value !== null) {
          const num = Number(value)
          return Number.isFinite(num) ? Math.max(0, Math.trunc(num)) : 0
        }
      }
      return 0
    },
    calculateOnlineRate(item, onlineCount, offlineCount, abnormalCount) {
      const rateValue = item?.online_rate ?? item?.onlineRate ?? item?.rate
      if (rateValue !== null && rateValue !== undefined && rateValue !== '') {
        let num
        if (typeof rateValue === 'string') {
          const trimmed = rateValue.trim()
          num = trimmed.endsWith('%') ? Number(trimmed.slice(0, -1)) : Number(trimmed)
        } else {
          num = Number(rateValue)
        }
        if (Number.isFinite(num)) {
          return this.clampRate(num <= 1 ? num * 100 : num)
        }
      }
      const total = onlineCount + offlineCount + abnormalCount
      return total === 0 ? null : this.clampRate((onlineCount / total) * 100)
    },
    clampRate(value) {
      return Math.max(0, Math.min(100, Number(value)))
    },
    async queryOfflineStatistics() {
      if (!this.isRangeValid) {
        ElNotification({
          title: '提示',
          message: '请选择有效的开始时间和结束时间',
          type: 'warning'
        })
        return
      }

      const [startTime, endTime] = this.statisticsRange
      this.statisticsLoading = true
      this.statisticsErrorMessage = ''
      try {
        const payload = await fetchVehicleStatusStatistics({
          start_time: startTime,
          end_time: endTime,
          startTime,
          endTime
        })
        this.statisticsTableData = this.normalizeStatisticsRows(payload)
        if (this.statisticsTableData.length === 0) {
          ElNotification({
            title: '提示',
            message: '未查询到统计数据',
            type: 'info'
          })
        }
      } catch (error) {
        console.error('查询车辆在离线统计失败：', error)
        this.statisticsErrorMessage = error?.message ? `查询失败：${error.message}` : '查询失败'
        this.statisticsTableData = []
      } finally {
        this.statisticsLoading = false
      }
    },
    exportOfflineStatistics() {
      if (this.statisticsLoading) return
      if (!Array.isArray(this.statisticsTableData) || this.statisticsTableData.length === 0) {
        ElNotification({
          title: '提示',
          message: '没有可导出的数据',
          type: 'warning'
        })
        return
      }

      const [startTime, endTime] = Array.isArray(this.statisticsRange) ? this.statisticsRange : []
      const safe = (v) => String(v || '').replace(/[\\/:*?"<>|]/g, '-').trim()
      const filename = `车辆在离线统计_${safe(startTime)}_${safe(endTime)}.xls`
      const html = this.buildExcelHtml(this.statisticsTableData, { startTime, endTime })
      const blob = new Blob([`\ufeff${html}`], { type: 'application/vnd.ms-excel;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    },
    buildExcelHtml(rows, meta = {}) {
      const escapeHtml = (value) =>
        String(value ?? '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;')

      const headerCells = ['时间', '总车辆(辆)', '在线(辆)', '离线(辆)', '异常(辆)', '在线率']
        .map(
          (h) =>
            `<th style="border:1px solid #333;padding:6px;text-align:center;background:#f5f7fa;">${escapeHtml(h)}</th>`
        )
        .join('')

      const bodyRows = rows
        .map((r) => {
          const cells = [
            r?.periodDisplay ?? '',
            r?.totalCount ?? '',
            r?.onlineCount ?? '',
            r?.offlineCount ?? '',
            r?.abnormalCount ?? '',
            r?.onlineRateDisplay ?? ''
          ]
            .map(
              (v) =>
                `<td style="border:1px solid #333;padding:6px;text-align:center;">${escapeHtml(v)}</td>`
            )
            .join('')
          return `<tr>${cells}</tr>`
        })
        .join('')

      const title =
        meta?.startTime && meta?.endTime
          ? `车辆在离线统计（${escapeHtml(meta.startTime)} ~ ${escapeHtml(meta.endTime)}）`
          : '车辆在离线统计'

      return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body>
    <table style="border-collapse:collapse;font-size:12px;">
      <tr>
        <th colspan="6" style="border:1px solid #333;padding:8px;text-align:center;font-size:14px;">
          ${escapeHtml(title)}
        </th>
      </tr>
      <tr>${headerCells}</tr>
      ${bodyRows}
    </table>
  </body>
</html>`.trim()
    }
  }
}
</script>

<style scoped>
.statistics-form {
  margin-bottom: 16px;
  padding: 16px;
  border-radius: 10px;
  background: rgba(18, 28, 46, 0.72);
  border: 1px solid rgba(83, 122, 183, 0.35);
}

:deep(.statistics-form .el-form-item__label) {
  color: #d7e5ff;
}

:deep(.statistics-form .el-input__wrapper),
:deep(.statistics-form .el-range-editor.el-input__wrapper) {
  background: rgba(8, 20, 38, 0.9);
  box-shadow: 0 0 0 1px rgba(110, 153, 223, 0.38) inset;
}

:deep(.statistics-form .el-input__inner),
:deep(.statistics-form .el-range-input) {
  color: #e6f1ff;
}

:deep(.statistics-form .el-range-separator),
:deep(.statistics-form .el-range__icon) {
  color: #9fbae8;
}

:deep(.offline-statistics-drawer .el-alert--error) {
  margin-bottom: 10px;
  border: 1px solid rgba(255, 120, 120, 0.35);
  background-color: rgba(78, 22, 28, 0.8);
}

:deep(.offline-statistics-drawer .el-table) {
  --el-table-bg-color: rgba(8, 20, 36, 0.88);
  --el-table-tr-bg-color: rgba(8, 20, 36, 0.82);
  --el-table-header-bg-color: rgba(14, 32, 56, 0.95);
  --el-table-border-color: rgba(108, 152, 218, 0.34);
  --el-table-row-hover-bg-color: rgba(32, 69, 117, 0.5);
  --el-table-text-color: #d7e7ff;
  --el-table-header-text-color: #b5d0f5;
  background: rgba(8, 20, 36, 0.9) !important;
  color: #d7e7ff !important;
}

:deep(.offline-statistics-drawer .el-table__inner-wrapper::before) {
  background-color: rgba(108, 152, 218, 0.34);
}

:deep(.offline-statistics-drawer .el-table__header-wrapper),
:deep(.offline-statistics-drawer .el-table__body-wrapper),
:deep(.offline-statistics-drawer .el-table__empty-block),
:deep(.offline-statistics-drawer .el-table__empty-text),
:deep(.offline-statistics-drawer .el-scrollbar__view) {
  background: rgba(8, 20, 36, 0.9) !important;
  color: #d7e7ff !important;
}

:deep(.offline-statistics-drawer .el-table th.el-table__cell) {
  background: linear-gradient(180deg, rgba(24, 54, 91, 0.96) 0%, rgba(16, 38, 66, 0.96) 100%) !important;
  color: #c8ddff !important;
  border-bottom: 1px solid rgba(108, 152, 218, 0.4) !important;
}

:deep(.offline-statistics-drawer .el-table tr) {
  background: rgba(8, 20, 36, 0.9) !important;
}

:deep(.offline-statistics-drawer .el-table .el-table__cell) {
  background: rgba(8, 20, 36, 0.9) !important;
  color: #d7e7ff !important;
  border-right: 1px solid rgba(108, 152, 218, 0.26) !important;
  border-bottom: 1px solid rgba(108, 152, 218, 0.26) !important;
}

:deep(.offline-statistics-drawer .el-table--border::before),
:deep(.offline-statistics-drawer .el-table--border::after),
:deep(.offline-statistics-drawer .el-table__inner-wrapper::before) {
  background-color: rgba(108, 152, 218, 0.35) !important;
}

:deep(.offline-statistics-drawer .el-table .el-table__body tr:hover > td.el-table__cell) {
  background: rgba(31, 72, 121, 0.58) !important;
}

:deep(.offline-statistics-drawer .el-table .el-table__body tr.current-row > td.el-table__cell) {
  background: rgba(48, 88, 140, 0.62) !important;
}

:deep(.offline-statistics-drawer .statistics-form .el-button--primary) {
  background: linear-gradient(135deg, #2f94ff 0%, #1f6fd6 100%);
  border-color: #3a86df;
}

:deep(.offline-statistics-drawer .statistics-form .el-button--success) {
  background: linear-gradient(135deg, #39d87b 0%, #1fb35d 100%);
  border-color: #39d87b;
}

:deep(.offline-statistics-drawer .statistics-form .el-button:not(.el-button--primary):not(.el-button--success)) {
  color: #d5e5ff;
  background: rgba(18, 34, 56, 0.85);
  border-color: rgba(109, 150, 210, 0.35);
}

:deep(.offline-statistics-drawer-picker) {
  border: 1px solid rgba(99, 145, 210, 0.45);
  background: #0a1a2d;
}

:deep(.offline-statistics-drawer-picker .el-picker-panel__body),
:deep(.offline-statistics-drawer-picker .el-picker-panel__content),
:deep(.offline-statistics-drawer-picker .el-date-range-picker__content),
:deep(.offline-statistics-drawer-picker .el-date-table),
:deep(.offline-statistics-drawer-picker .el-time-panel) {
  background: #0a1a2d;
  color: #dbe9ff;
}

:deep(.offline-statistics-drawer-picker .el-date-table th),
:deep(.offline-statistics-drawer-picker .el-picker-panel__icon-btn),
:deep(.offline-statistics-drawer-picker .el-time-spinner__item) {
  color: #b9d4fb;
}

:deep(.offline-statistics-drawer-picker .el-date-table td.available:hover),
:deep(.offline-statistics-drawer-picker .el-time-spinner__item:hover:not(.disabled):not(.active)) {
  color: #ffffff;
  background: rgba(42, 91, 154, 0.7);
}
</style>

<style>
.offline-statistics-drawer-overlay .el-drawer {
  background: radial-gradient(circle at top right, #142742 0%, #081423 56%, #060f1b 100%);
  box-shadow: -12px 0 28px rgba(0, 0, 0, 0.45);
}

.offline-statistics-drawer-overlay .el-drawer__header {
  margin-bottom: 0;
  padding: 18px 20px;
  background: linear-gradient(120deg, #0d1b2d 0%, #112844 100%);
  color: #e9f2ff;
  border-bottom: 1px solid rgba(107, 151, 219, 0.36);
}

.offline-statistics-drawer-overlay .el-drawer__title {
  color: #e9f2ff;
  font-weight: 600;
}

.offline-statistics-drawer-overlay .el-drawer__headerbtn .el-drawer__close-btn {
  color: #c5dbff;
}

.offline-statistics-drawer-overlay .el-drawer__body {
  padding: 16px 18px 18px;
}

.offline-statistics-drawer-overlay {
  background: rgba(2, 8, 18, 0.34);
  backdrop-filter: blur(1px);
}

.offline-statistics-drawer-overlay .offline-dark-table,
.offline-statistics-drawer-overlay .offline-dark-table .el-table__inner-wrapper,
.offline-statistics-drawer-overlay .offline-dark-table .el-table__header-wrapper,
.offline-statistics-drawer-overlay .offline-dark-table .el-table__body-wrapper,
.offline-statistics-drawer-overlay .offline-dark-table .el-scrollbar__view,
.offline-statistics-drawer-overlay .offline-dark-table .el-table__empty-block {
  background: rgba(8, 20, 36, 0.92) !important;
  color: #d7e7ff !important;
}
</style>
