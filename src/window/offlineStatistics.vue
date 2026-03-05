<template>
  <el-dialog
    v-model="dialogVisible"
    title="车辆在离线统计"
    width="980px"
    :close-on-click-modal="false"
    :append-to-body="true"
  >
    <el-form inline class="statistics-form">
      <el-form-item label="时间范围">
        <el-date-picker
          v-model="statisticsRange"
          type="datetimerange"
          range-separator="-"
          start-placeholder="开始时间"
          end-placeholder="结束时间"
          value-format="YYYY-MM-DD HH:mm:ss"
          :locale="datePickerLocale"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="statisticsLoading" @click="queryOfflineStatistics">
          查询
        </el-button>
        <el-button :disabled="statisticsLoading" @click="resetStatisticsRange">
          重置
        </el-button>
        <el-button
          type="success"
          :disabled="statisticsLoading || statisticsTableData.length === 0"
          @click="exportOfflineStatistics"
        >
          导出Excel
        </el-button>
      </el-form-item>
    </el-form>

    <el-alert v-if="statisticsErrorMessage" type="error" show-icon :title="statisticsErrorMessage" />

    <el-table
      v-loading="statisticsLoading"
      :data="statisticsTableData"
      border
      height="520"
      highlight-current-row
      :loading-text="'正在查询数据...'"
    >
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
  </el-dialog>
</template>

<script>
import { ElNotification } from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import { requestJson, unwrapResponse } from '@/utils/request'

const STATUS_STATISTICS_PATH =
  import.meta.env.VITE_VEHICLE_STATUS_STATISTICS_PATH || '/vehicle/status-statistics'

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
        const payload = await requestJson(STATUS_STATISTICS_PATH, {
          params: {
            start_time: startTime,
            end_time: endTime,
            startTime,
            endTime
          }
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
}
</style>
