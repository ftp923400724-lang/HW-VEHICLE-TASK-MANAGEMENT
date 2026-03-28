<template>
  <div class="panel">
    <div class="chart__header">
      <div>
        <div class="chart__title">{{ activeStationName }}</div>
        <div class="chart__subtitle">{{ activeStationRemark }}</div>
      </div>
      <div class="chart__summary">
        <span>进站 {{ totalInbound }} 辆</span>
        <span>出站 {{ totalOutbound }} 辆</span>
        <span>峰值 {{ peakHour || '暂无' }}</span>
      </div>
    </div>
    <div class="chart__wrap">
      <canvas ref="chartRef"></canvas>
    </div>
  </div>
</template>

<script>
import { defineComponent, markRaw } from 'vue'
import Chart from 'chart.js/auto'
import {
  buildAggregateTransferStationOverview,
  buildTransferStationOverview,
  getTransferStationById
} from '@/utils/transferStation'

export default defineComponent({
  name: 'FooterPanel',
  data() {
    return {
      chart: null,
      activeStationId: 'aggregate',
      activeStationName: '全部中转站',
      activeStationRemark: '模拟汇总进出量',
      hours: Array.from({ length: 24 }, (_, i) => `${i}:00`),
      inboundCounts: Array(24).fill(0),
      outboundCounts: Array(24).fill(0),
      netFlowCounts: Array(24).fill(0),
      totalInbound: 0,
      totalOutbound: 0,
      peakHour: '',
      loading: false
    }
  },
  mounted() {
    this.loadTrafficOverview()
    window.addEventListener('station-selected', this.handleStationSelected)
  },
  beforeUnmount() {
    window.removeEventListener('station-selected', this.handleStationSelected)
    this.destroyChart()
  },
  methods: {
    destroyChart() {
      if (this.chart) {
        this.chart.destroy()
        this.chart = null
      }
    },
    handleStationSelected(event) {
      const detail = event?.detail || {}
      const stationId = detail?.stationId || detail?.code || detail?.id
      const overview = this.resolveTrafficOverview(stationId, detail)
      if (!overview) return
      this.applyTrafficOverview(overview)
    },
    loadTrafficOverview() {
      this.loading = true
      try {
        const overview = buildAggregateTransferStationOverview()
        this.applyTrafficOverview(overview)
      } finally {
        this.loading = false
      }
    },
    resolveTrafficOverview(stationId, detail = {}) {
      const station = stationId ? getTransferStationById(stationId) : null
      if (!station) {
        return buildAggregateTransferStationOverview()
      }
      const overview = buildTransferStationOverview(station.id)
      if (detail?.traffic) {
        return {
          ...overview,
          ...detail.traffic,
          stationId: detail.stationId || station.id,
          stationName: detail.stationName || station.name,
          remark: detail.remark || station.remark,
          platformCount: detail.platformCount || station.platformCount
        }
      }
      return overview
    },
    applyTrafficOverview(overview) {
      this.activeStationId = overview.stationId || 'aggregate'
      this.activeStationName = overview.stationName || '全部中转站'
      this.activeStationRemark = overview.remark || '模拟汇总进出量'
      this.hours = Array.isArray(overview.hours) && overview.hours.length
        ? overview.hours.slice(0, 24)
        : Array.from({ length: 24 }, (_, i) => `${i}:00`)
      this.inboundCounts = this.normalizeCountArray(overview.inboundCounts)
      this.outboundCounts = this.normalizeCountArray(overview.outboundCounts)
      this.netFlowCounts = this.normalizeCountArray(overview.netFlowCounts)
      this.totalInbound = Number.isFinite(overview.totalInbound) ? overview.totalInbound : this.sumArray(this.inboundCounts)
      this.totalOutbound = Number.isFinite(overview.totalOutbound) ? overview.totalOutbound : this.sumArray(this.outboundCounts)
      this.peakHour = overview.peakHour || ''
      this.applyChartData()
    },
    normalizeCountArray(value) {
      if (!Array.isArray(value)) {
        return Array(24).fill(0)
      }
      const normalized = value.slice(0, 24).map((item) => {
        const num = Number(item)
        return Number.isFinite(num) ? num : 0
      })
      while (normalized.length < 24) {
        normalized.push(0)
      }
      return normalized
    },
    cloneChartSeries(value) {
      return Array.isArray(value) ? value.slice() : []
    },
    sumArray(values) {
      return values.reduce((sum, value) => sum + value, 0)
    },
    applyChartData() {
      if (!this.chart) {
        this.renderChart()
        return
      }
      this.chart.data.labels = this.cloneChartSeries(this.hours)
      if (this.chart.data.datasets?.[0]) {
        this.chart.data.datasets[0].data = this.cloneChartSeries(this.inboundCounts)
      }
      if (this.chart.data.datasets?.[1]) {
        this.chart.data.datasets[1].data = this.cloneChartSeries(this.outboundCounts)
      }
      if (this.chart.data.datasets?.[2]) {
        this.chart.data.datasets[2].data = this.cloneChartSeries(this.netFlowCounts)
      }
      this.chart.update()
    },
    renderChart() {
      const ctx = this.$refs.chartRef?.getContext('2d')
      if (!ctx) return
      this.destroyChart()

      this.chart = markRaw(new Chart(ctx, {
        type: 'bar',
        data: {
          labels: this.cloneChartSeries(this.hours),
          datasets: [
            {
              type: 'bar',
              label: '进站量',
              data: this.cloneChartSeries(this.inboundCounts),
              backgroundColor: 'rgba(61, 142, 255, 0.75)',
              borderColor: 'rgba(61, 142, 255, 1)',
              borderWidth: 1,
              borderRadius: 6,
              stack: 'traffic',
              barPercentage: 0.56,
              categoryPercentage: 0.72
            },
            {
              type: 'bar',
              label: '出站量',
              data: this.outboundCounts,
              backgroundColor: 'rgba(255, 145, 77, 0.68)',
              borderColor: 'rgba(255, 145, 77, 1)',
              borderWidth: 1,
              borderRadius: 6,
              stack: 'traffic',
              barPercentage: 0.56,
              categoryPercentage: 0.72
            },
            {
              type: 'line',
              label: '净流量',
              data: this.netFlowCounts,
              yAxisID: 'y1',
              borderColor: 'rgba(46, 204, 113, 1)',
              backgroundColor: 'rgba(46, 204, 113, 0.18)',
              borderWidth: 2,
              tension: 0.3,
              pointRadius: 3,
              pointHoverRadius: 5,
              fill: false
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          layout: {
            padding: {
              top: 8,
              right: 18,
              bottom: 8,
              left: 18
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: '#dfe6ee', maxRotation: 0, minRotation: 0 }
            },
            y: {
              beginAtZero: true,
              grid: { color: 'rgba(255,255,255,0.05)' },
              ticks: { color: '#dfe6ee' },
              stacked: true
            },
            y1: {
              position: 'right',
              beginAtZero: false,
              grid: { drawOnChartArea: false },
              ticks: {
                color: '#2ecc71',
                callback: (value) => `${value}`
              }
            }
          },
          plugins: {
            legend: {
              labels: { color: '#e8edf5', usePointStyle: true, boxWidth: 10 }
            },
            tooltip: {
              backgroundColor: 'rgba(30, 38, 52, 0.95)',
              borderColor: 'rgba(255,255,255,0.06)',
              borderWidth: 1,
              padding: 10,
              callbacks: {
                label: (context) => {
                  const label = context.dataset.label || ''
                  const value = context.parsed.y
                  return `${label}: ${value} 辆`
                },
                footer: (items) => {
                  if (!items.length) return ''
                  const idx = items[0].dataIndex
                  const inbound = this.inboundCounts[idx]
                  const outbound = this.outboundCounts[idx]
                  const net = this.netFlowCounts[idx]
                  return `进站 ${inbound} 辆 | 出站 ${outbound} 辆 | 净流量 ${net} 辆`
                }
              }
            }
          }
        }
      }))
    }
  }
})
</script>

<style scoped>
.panel {
  width: 100%;
  height: 100%;
  background: #0d1421;
  border: 1px solid rgba(255, 255, 255, 0.04);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  color: #eaeff7;
}

.chart__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 14px 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.chart__title {
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
}

.chart__subtitle {
  margin-top: 4px;
  font-size: 12px;
  color: #9aa1b5;
}

.chart__summary {
  display: flex;
  align-items: center;
  gap: 14px;
  color: #c8d3e0;
  font-size: 12px;
  white-space: nowrap;
}

.chart__wrap {
  flex: 1;
  width: 100%;
  min-height: 0;
}

canvas {
  width: 100% !important;
  height: 100% !important;
}
</style>
