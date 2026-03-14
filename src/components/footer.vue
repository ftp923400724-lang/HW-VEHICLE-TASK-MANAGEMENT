<template>
  <div class="panel">
    <div class="chart__wrap">
      <canvas ref="chartRef"></canvas>
    </div>
  </div>
</template>

<script>
import { defineComponent } from 'vue';
import Chart from 'chart.js/auto';
import { fetchHourlyVehicleStatus } from '@/api/vehicle';

export default defineComponent({
  name: 'FooterPanel',
  data() {
    return {
      chart: null,
      hours: Array.from({ length: 24 }, (_, i) => `${i}:00`),
      onlineCounts: Array(24).fill(0),
      offlineCounts: Array(24).fill(0),
      abnormalCounts: Array(24).fill(0),
      onlineRates: [],
      loading: false,
      errorMessage: ''
    };
  },
  computed: {
    onlineRate() {
      if (this.onlineRates.length === this.hours.length) {
        return this.onlineRates;
      }
      return this.hours.map((_, index) => {
        const online = this.onlineCounts[index];
        const offline = this.offlineCounts[index];
        const abnormal = this.abnormalCounts[index];
        const total = online + offline + abnormal;
        if (!total) return 0;
        return Number(((online / total) * 100).toFixed(1));
      });
    }
  },
  mounted() {
    this.loadHourlyStatus();
  },
  beforeUnmount() {
    this.destroyChart();
  },
  methods: {
    destroyChart() {
      if (this.chart) {
        this.chart.destroy();
        this.chart = null;
      }
    },
    async loadHourlyStatus() {
      this.loading = true;
      this.errorMessage = '';
      try {
        const payload = await fetchHourlyVehicleStatus();
        this.applyHourlyPayload(payload?.data || {});
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('加载车辆状态统计失败', error);
        this.errorMessage = '加载失败';
        this.applyHourlyPayload({});
      } finally {
        this.loading = false;
      }
    },
    applyHourlyPayload(data) {
      const hours = Array.isArray(data?.hours) ? data.hours : [];
      if (hours.length) {
        this.hours = hours.slice(0, 24).map((value) => `${value}:00`);
      } else if (this.hours.length !== 24) {
        this.hours = Array.from({ length: 24 }, (_, i) => `${i}:00`);
      }

      this.onlineCounts = this.normalizeCountArray(data?.online_counts ?? data?.onlineCounts);
      this.offlineCounts = this.normalizeCountArray(data?.offline_counts ?? data?.offlineCounts);
      this.abnormalCounts = this.normalizeCountArray(data?.abnormal_counts ?? data?.abnormalCounts);
      this.onlineRates = this.normalizeRateArray(data?.online_rate ?? data?.onlineRate);
      this.applyChartData();
    },
    normalizeCountArray(value) {
      if (!Array.isArray(value)) {
        return Array(24).fill(0);
      }
      const normalized = value.slice(0, 24).map((item) => {
        const num = Number(item);
        return Number.isFinite(num) ? num : 0;
      });
      while (normalized.length < 24) {
        normalized.push(0);
      }
      return normalized;
    },
    normalizeRateArray(value) {
      if (!Array.isArray(value)) {
        return [];
      }
      const normalized = value.slice(0, 24).map((item) => {
        const num = Number(item);
        return Number.isFinite(num) ? Number(num.toFixed(1)) : 0;
      });
      while (normalized.length < 24) {
        normalized.push(0);
      }
      return normalized;
    },
    applyChartData() {
      if (!this.chart) {
        this.renderChart();
        return;
      }
      this.chart.data.labels = this.hours;
      if (this.chart.data.datasets?.[0]) {
        this.chart.data.datasets[0].data = this.onlineCounts;
      }
      if (this.chart.data.datasets?.[1]) {
        this.chart.data.datasets[1].data = this.offlineCounts;
      }
      if (this.chart.data.datasets?.[2]) {
        this.chart.data.datasets[2].data = this.abnormalCounts;
      }
      if (this.chart.data.datasets?.[3]) {
        this.chart.data.datasets[3].data = this.onlineRate;
      }
      this.chart.update();
    },
    renderChart() {
      const ctx = this.$refs.chartRef?.getContext('2d');
      if (!ctx) return;
      this.destroyChart();

      this.chart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: this.hours,
          datasets: [
            {
              type: 'bar',
              label: '在线车辆',
              data: this.onlineCounts,
              backgroundColor: 'rgba(61, 142, 255, 0.75)',
              borderColor: 'rgba(61, 142, 255, 1)',
              borderWidth: 1,
              borderRadius: 6,
              stack: 'counts',
              barPercentage: 0.55,
              categoryPercentage: 0.7
            },
            {
              type: 'bar',
              label: '离线车辆',
              data: this.offlineCounts,
              backgroundColor: 'rgba(113, 135, 160, 0.65)',
              borderColor: 'rgba(113, 135, 160, 1)',
              borderWidth: 1,
              borderRadius: 6,
              stack: 'counts',
              barPercentage: 0.55,
              categoryPercentage: 0.7
            },
            {
              type: 'bar',
              label: '异常车辆',
              data: this.abnormalCounts,
              backgroundColor: 'rgba(255, 99, 132, 0.7)',
              borderColor: 'rgba(255, 99, 132, 1)',
              borderWidth: 1,
              borderRadius: 6,
              stack: 'counts',
              barPercentage: 0.55,
              categoryPercentage: 0.7
            },
            {
              type: 'line',
              label: '在线率',
              data: this.onlineRate,
              yAxisID: 'y1',
              borderColor: 'rgba(46, 204, 113, 1)',
              backgroundColor: 'rgba(46, 204, 113, 0.2)',
              borderWidth: 2,
              tension: 0.3,
              pointRadius: 4,
              pointHoverRadius: 6,
              fill: false
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          // 1. 核心：图表整体内边距（画布内）
          layout: {
            padding: {
              top: 10,     // 顶部内边距（px）
              right: 20,   // 右侧内边距（适配右侧y1轴）
              bottom: 10,  // 底部内边距（适配x轴标签）
              left: 20,    // 左侧内边距
              // 简写：padding: 20 (四周边距统一为20px)
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
              beginAtZero: true,
              min: 0,
              max: 100,
              grid: { drawOnChartArea: false },
              ticks: {
                color: '#2ecc71',
                callback: (value) => `${value}%`
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
                  const label = context.dataset.label || '';
                  const value = context.parsed.y;
                  if (label === '在线率') {
                    return `${label}: ${value.toFixed(1)}%`;
                  }
                  return `${label}: ${value} 辆`;
                },
                footer: (items) => {
                  if (!items.length) return '';
                  const idx = items[0].dataIndex;
                  const online = this.onlineCounts[idx];
                  const offline = this.offlineCounts[idx];
                  const abnormal = this.abnormalCounts[idx];
                  const rate = this.onlineRate[idx];
                  return `在线 ${online} 辆 | 离线 ${offline} 辆 | 异常 ${abnormal} 辆 | 在线率 ${rate}%`;
                }
              }
            }
          }
        }
      });
    }
  }
});
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

.chart__wrap {
  height: 100%;
  width: 100%;
}

canvas {
  width: 100% !important;
  height: 100% !important;
}
</style>
