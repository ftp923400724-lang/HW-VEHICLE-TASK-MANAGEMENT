<template>
  <div class="panel">
    <el-splitter>
      <el-splitter-panel :resizable="false" size="18%" style="padding: 20px;">
        <div class="card-content">
          <div class="form-item">
            <el-input v-model="plateNumber" size="large" placeholder="车牌号码" readonly
              style="width: 100%;height: 100%;" />
          </div>
          <div class="form-item">
            <el-row>
              <el-col :span="20">
                <el-date-picker v-model="startTime" size="large" type="datetime" placeholder="开始时间"
                  style="width: 100%;height: 100%;" />
              </el-col>
              <el-col :span="4">
                <el-tag size="large" @click="onPrevDay" style="width: 100%;height: 100%;">
                  <el-icon>
                    <ArrowUp />
                  </el-icon>
                </el-tag>
              </el-col>
            </el-row>
          </div>
          <div class="form-item">
            <el-row>
              <el-col :span="20">
                <el-date-picker v-model="endTime" size="large" type="datetime" placeholder="结束时间"
                  style="width: 100%;height: 100%;" />
              </el-col>
              <el-col :span="4">
                <el-tag size="large" @click="onNextDay" style="width: 100%;height: 100%;">
                  <el-icon>
                    <ArrowDown />
                  </el-icon>
                </el-tag>
              </el-col>
            </el-row>
          </div>
          <div class="form-item">
            <el-row :gutter="10">
              <el-col :span="12">
                <el-button class="track-button track-all" type="primary" size="large" @click="onSearch"
                  style="width: 100%;">全程轨迹</el-button>
              </el-col>
              <el-col :span="12">
                <el-button class="track-button track-work" type="primary" size="large" @click="onSearch"
                  style="width: 100%;">作业轨迹</el-button>
              </el-col>
            </el-row>
          </div>
        </div>
      </el-splitter-panel>
      <el-splitter-panel :resizable="false" size="22%" style="padding: 20px;">
        <div class="card-content playback-card">
          <div class="control-group">
            <div class="speed-options">
              <el-radio-group v-model="speedPreset" size="small" @change="handleSpeedPresetChange">
                <el-radio-button v-for="speed in speedOptions" :key="speed" :label="speed">{{ speed }}
                  km/h</el-radio-button>
              </el-radio-group>
            </div>
          </div>
          <div class="control-group">
            <!-- <div class="group-title">回放进度</div> -->
            <el-slider v-model="progressPercent" :step="1" :format-tooltip="formatProgressTooltip"
              @change="handleSeekChange" />
            <div class="progress-meta">
              <span>进度：{{ progressPercent.toFixed(0) }}%</span>
              <span>状态：{{ statusLabel }}</span>
            </div>
          </div>
          <div class="control-group">
            <!-- <div class="group-title">核心控制</div> -->
            <el-row :gutter="10">
              <el-col :span="8">
                <el-button class="control-button button-play" type="primary" size="large" :icon="VideoPlay"
                  @click="handlePlay" plain style="width: 100%;">播放</el-button>
              </el-col>
              <el-col :span="8">
                <el-button class="control-button button-pause" :type="isPaused ? 'primary' : 'warning'" size="large"
                  style="width: 100%;" :icon="isPaused ? VideoPlay : VideoPause" @click="handleTogglePause" plain>{{
                    isPaused ? '继续' : '暂停'
                  }}</el-button>
              </el-col>
              <el-col :span="8">
                <el-button class="control-button button-stop" type="danger" size="large" :icon="CloseBold"
                  @click="handleStop" plain style="width: 100%;">停止</el-button>
              </el-col>
            </el-row>
          </div>
        </div>
      </el-splitter-panel>
      <el-splitter-panel class="panel-padding" :resizable="false" size="28%" style="padding: 20px;">
        <div class="card-content analysis-card">
          <div class="group-title">对比分析</div>
          <div v-if="analysisSummary" class="analysis-grid">
            <div class="analysis-section">
              <div class="section-title">实际轨迹</div>
              <el-row :gutter="12">
                <el-col :span="12" v-for="stat in actualAnalysisStats" :key="stat.label">
                  <div class="analysis-item">
                    <div class="value">{{ stat.value }}</div>
                    <div class="label">{{ stat.label }}</div>
                  </div>
                </el-col>
              </el-row>
            </div>
            <div class="analysis-section">
              <div class="section-title">规划路线</div>
              <el-row :gutter="12">
                <el-col :span="12" v-for="stat in compareAnalysisStats" :key="stat.label">
                  <div class="analysis-item">
                    <div class="value">{{ stat.value }}</div>
                    <div class="label">{{ stat.label }}</div>
                  </div>
                </el-col>
              </el-row>
            </div>
            <div v-if="analysisFence && analysisFence.issues?.length" class="analysis-issues">
              <div class="label">围栏异常</div>
              <div class="value">{{ analysisFence.issues.join('，') }}</div>
            </div>
          </div>
        </div>
      </el-splitter-panel>
      <el-splitter-panel class="panel-padding video-panel" :resizable="false" size="32%" style="padding: 0;">
        <div class="card-content video-card">
          <div class="video-layout">
            <div class="video-preview">
              <div class="video-preview__badge">{{ videoViewLabel }}</div>
              <div class="video-preview__title">{{ plateNumber || '未选择车辆' }}</div>
              <div class="video-preview__sub">{{ videoViewHint }}</div>
            </div>
            <el-radio-group v-model="videoView" class="video-switcher" size="small" @change="handleVideoViewChange">
              <el-radio-button label="front">前视</el-radio-button>
              <el-radio-button label="back">后视</el-radio-button>
              <el-radio-button label="left">左视</el-radio-button>
              <el-radio-button label="right">右视</el-radio-button>
            </el-radio-group>
          </div>
        </div>
      </el-splitter-panel>
    </el-splitter>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { ElNotification } from 'element-plus';
import { ArrowUp, ArrowDown, CloseBold, VideoPause, VideoPlay } from '@element-plus/icons-vue';
import { toDate } from '@/utils/datetime';
import eventBus, { EventTypes } from '@/utils/eventBus';
import { fetchTrajectory, fetchTrajectoryAnalysis } from '@/api/vehicle';

type PlaybackStatus = 'idle' | 'playing' | 'paused';
const STATUS_LABEL_MAP: Record<PlaybackStatus, string> = {
  idle: '待命',
  playing: '播放中',
  paused: '已暂停',
};

export default defineComponent({
  name: 'TrajectoryFooter',
  components: {
    ArrowUp,
    ArrowDown,
    CloseBold,
    VideoPause,
    VideoPlay,
  },
  data() {
    return {
      plateNumber: '',
      deviceNo: '',
      startTime: getDayRange(new Date()).start as Date | null,
      endTime: getDayRange(new Date()).end as Date | null,
      activities: [
        {
          content: 'Event start',
          timestamp: '2018-04-15',
        },
        {
          content: 'Approved',
          timestamp: '2018-04-13',
        },
        {
          content: 'Success',
          timestamp: '2018-04-11',
        },
      ],
      statistics: [
        { title: '行驶里程', value: 268500 },
        { title: '作业里程', value: 268500 },
        { title: '作业油耗', value: 268500 },
      ],
      tableData: [],
      tableLoading: false,
      analysisLoading: false,
      analysisSummary: null as null | {
        point_count: number;
        duration_seconds: number;
        distance_m: number;
        avg_speed_kmh: number;
        max_speed_kmh: number;
        stop_count: number;
      },
      analysisFence: null as null | {
        inside_ratio: number;
        issues?: string[];
      },
      analysisTimeline: [] as Array<{ time: string; type: string; label: string }>,
      playbackStatus: 'idle' as PlaybackStatus,
      progressPercent: 0,
      currentRowKey: null as null | number,
      speedOptions: [20, 40, 60, 80],
      speedPreset: 40,
      customSpeed: 60,
      useCustomSpeed: false,
      videoView: 'front',
    };
  },
  mounted() {
    eventBus.on(EventTypes.VehicleSelected, this.handleVehicleSelected);
    eventBus.on(EventTypes.PlaybackState, this.handlePlaybackState);
  },
  beforeUnmount() {
    eventBus.off(EventTypes.VehicleSelected, this.handleVehicleSelected);
    eventBus.off(EventTypes.PlaybackState, this.handlePlaybackState);
  },
  methods: {
    async onSearch() {
      if (!this.deviceNo) {
        ElNotification({ title: '提示', message: '请先选择车辆', type: 'warning' });
        return;
      }
      const range = this.normalizeRange();
      if (!range.startTime || !range.endTime) {
        ElNotification({ title: '提示', message: '请选择有效的时间范围', type: 'warning' });
        return;
      }
      this.tableLoading = true;
      try {
        const params = {
          deviceNo: this.deviceNo,
          startTime: String(range.startTime),
          endTime: String(range.endTime),
        };
        const payload = await fetchTrajectory(params);
        const points = this.normalizeTrajectory(payload);
        this.tableData = points;
        this.currentRowKey = null;
        eventBus.emit(EventTypes.TrajectoryFetched, { deviceNo: this.deviceNo, points });
        await this.fetchAnalysis(range);
        if (this.tableData.length === 0) {
          ElNotification({ title: '提示', message: '未查询到轨迹数据', type: 'info' });
        }
      } catch (error: any) {
        const message = error?.message || '查询轨迹失败';
        ElNotification({ title: '错误', message, type: 'error' });
        this.tableData = [];
        this.currentRowKey = null;
        eventBus.emit(EventTypes.TrajectoryFetched, { deviceNo: this.deviceNo, points: [] });
        this.resetAnalysis();
      } finally {
        this.tableLoading = false;
      }
    },
    async fetchAnalysis(range: { startTime: number | string; endTime: number | string }) {
      this.analysisLoading = true;
      try {
        const params = {
          deviceNo: this.deviceNo,
          startTime: String(range.startTime),
          endTime: String(range.endTime),
        };
        const payload = await fetchTrajectoryAnalysis(params);
        const fence = payload?.data?.fence ?? null;
        const timeline = Array.isArray(payload?.data?.timeline) ? payload.data.timeline : [];
        const fenceTimeline = Array.isArray(fence?.timeline) ? fence.timeline : [];
        this.analysisSummary = payload?.data?.summary ?? null;
        this.analysisFence = fence;
        this.analysisTimeline = this.mergeTimeline(timeline, fenceTimeline);
        eventBus.emit(EventTypes.TrajectoryAnalyzed, {
          deviceNo: this.deviceNo,
          summary: this.analysisSummary,
          fence: this.analysisFence,
          timeline: this.analysisTimeline,
        });
      } catch (error: any) {
        const message = error?.message || '轨迹分析失败';
        ElNotification({ title: '错误', message, type: 'error' });
        this.resetAnalysis();
      } finally {
        this.analysisLoading = false;
      }
    },
    resetAnalysis() {
      this.analysisSummary = null;
      this.analysisFence = null;
      this.analysisTimeline = [];
    },
    onPrevDay() {
      this.shiftDay(-1);
    },
    onNextDay() {
      this.shiftDay(1);
    },
    shiftDay(offset: number) {
      const base = this.startTime ? new Date(this.startTime) : new Date();
      base.setDate(base.getDate() + offset);
      const range = getDayRange(base);
      this.startTime = range.start;
      this.endTime = range.end;
    },
    handleVehicleSelected(detail: any) {
      const plate = detail.licensePlate || detail.license_plate || detail.vehicle_name || '';
      const deviceNo = detail.deviceNo || detail.device_no || '';
      if (plate) {
        this.plateNumber = plate;
      }
      if (deviceNo) {
        this.deviceNo = String(deviceNo);
        // 自动触发轨迹查询，保持主面板与表格同步
        this.onSearch();
      }
    },
    normalizeRange() {
      const start = toDate(this.startTime);
      const end = toDate(this.endTime);
      if (!start || !end) return { startTime: '', endTime: '' };
      if (end.getTime() < start.getTime()) return { startTime: '', endTime: '' };
      return {
        startTime: start.getTime(),
        endTime: end.getTime(),
      };
    },
    normalizeTrajectory(payload: any) {
      const list =
        Array.isArray(payload?.data?.list)
          ? payload.data.list
          : Array.isArray(payload?.data)
            ? payload.data
            : Array.isArray(payload)
              ? payload
              : payload?.data
                ? [payload.data]
                : [];
      return list.map((item: any, index: number) => ({
        index,
        time: item?.ts || item?.timer || '',
        lon: item?.lon ?? item?.lng ?? item?.longitude ?? null,
        lat: item?.lat ?? item?.latitude ?? null,
        speed: item?.speed ?? item?.calculatedSpeed ?? null,
        altitude: item?.ASL ?? item?.DEM ?? null,
      }));
    },
    handlePlay() {
      this.emitControl({ action: 'play', speed: this.resolvedSpeed });
    },
    handleTogglePause() {
      if (this.playbackStatus === 'playing') {
        this.emitControl({ action: 'pause' });
      } else if (this.playbackStatus === 'paused') {
        this.emitControl({ action: 'resume', speed: this.resolvedSpeed });
      } else {
        this.handlePlay();
      }
    },
    handleStop() {
      this.emitControl({ action: 'stop' });
    },
    handleSpeedPresetChange() {
      this.useCustomSpeed = false;
      this.emitControl({ action: 'speed', speed: this.resolvedSpeed });
    },
    handleCustomSpeedChange() {
      this.useCustomSpeed = true;
      this.emitControl({ action: 'speed', speed: this.resolvedSpeed });
    },
    handleSpeedModeChange() {
      this.emitControl({ action: 'speed', speed: this.resolvedSpeed });
    },
    handleVideoViewChange() {
      // 这里只切换当前视频视角占位，后续接真实视频流时复用这个状态即可。
    },
    handleSeekChange(val: number) {
      const normalized = Math.min(100, Math.max(0, Number(val)));
      this.progressPercent = normalized;
      this.emitControl({ action: 'seek', progress: normalized / 100 });
    },
    handlePlaybackState(detail: any) {
      const status: PlaybackStatus = detail?.status || 'idle';
      this.playbackStatus = status;
      if (typeof detail?.progressPercent === 'number') {
        this.progressPercent = Math.max(0, Math.min(100, detail.progressPercent));
      } else if (typeof detail?.progress === 'number') {
        this.progressPercent = Math.max(0, Math.min(100, detail.progress * 100));
      }
      if (typeof detail?.speed === 'number') {
        const speed = Number(detail.speed);
        if (this.useCustomSpeed) {
          this.customSpeed = speed;
        } else {
          this.speedPreset = speed;
        }
      }
      this.syncTableSelectionWithProgress();
    },
    getRowIndexForProgress(progressPercent: number) {
      const total = this.tableData.length;
      if (!total) return -1;
      const normalized = Number.isFinite(progressPercent) ? progressPercent : 0;
      const percent = Math.min(100, Math.max(0, normalized));
      const ratio = percent / 100;
      const rawIndex = Math.round(ratio * (total - 1));
      return Math.max(0, Math.min(total - 1, rawIndex));
    },
    getRowForProgress(progressPercent: number) {
      const targetIndex = this.getRowIndexForProgress(progressPercent);
      if (targetIndex < 0) return null;
      return this.tableData[targetIndex] ?? null;
    },
    syncTableSelectionWithProgress() {
      const row = this.getRowForProgress(this.progressPercent);
      if (!row) {
        this.currentRowKey = null;
        return;
      }
      const rowKey = row.index;
      if (rowKey === undefined || rowKey === null) {
        this.currentRowKey = null;
        return;
      }
      const table = this.$refs.trajectoryTable as any;
      const needsSelectionUpdate = this.currentRowKey !== rowKey;
      if (needsSelectionUpdate) {
        this.currentRowKey = rowKey;
        if (table) {
          if (typeof table.clearSelection === 'function') {
            table.clearSelection();
          }
          if (typeof table.toggleRowSelection === 'function') {
            table.toggleRowSelection(row, true);
          }
          if (typeof table.setCurrentRow === 'function') {
            table.setCurrentRow(row);
          }
        }
      }
      this.scrollTableToProgress();
    },
    scrollTableToProgress() {
      this.$nextTick(() => {
        const table = this.$refs.trajectoryTable as any;
        if (!table?.$el) return;
        const bodyWrapper = table.$el.querySelector('.el-table__body-wrapper') as HTMLElement | null;
        const scrollCandidates: Array<HTMLElement | null> = [
          bodyWrapper?.querySelector('.el-scrollbar__wrap') as HTMLElement | null,
          bodyWrapper,
          table.$el.querySelector('.el-scrollbar') as HTMLElement | null,
          table.$el,
        ];
        const scrollContainer =
          scrollCandidates.find((el) => !!el && el.scrollHeight > el.clientHeight) ?? scrollCandidates[0];
        if (!scrollContainer) return;

        const rowIndex = this.getRowIndexForProgress(this.progressPercent);
        if (rowIndex < 0 || rowIndex >= this.tableData.length) {
          const percent = Math.min(100, Math.max(0, this.progressPercent));
          const maxScroll = Math.max(0, scrollContainer.scrollHeight - scrollContainer.clientHeight);
          scrollContainer.scrollTop = (maxScroll * percent) / 100;
          return;
        }

        const rows = scrollContainer.querySelectorAll('.el-table__row');
        const rowElement = rows[rowIndex] as HTMLElement | undefined;
        if (!rowElement) {
          return;
        }

        const containerRect = scrollContainer.getBoundingClientRect();
        const rowRect = rowElement.getBoundingClientRect();
        const rowTopInContainer = rowRect.top - containerRect.top + scrollContainer.scrollTop;
        const targetTop =
          rowTopInContainer - scrollContainer.clientHeight / 2 + rowRect.height / 2;
        const maxScrollTop = Math.max(0, scrollContainer.scrollHeight - scrollContainer.clientHeight);
        const finalTop = Math.max(0, Math.min(maxScrollTop, targetTop));

        if (typeof scrollContainer.scrollTo === 'function') {
          scrollContainer.scrollTo({
            top: finalTop,
            behavior: 'smooth',
          });
        } else {
          scrollContainer.scrollTop = finalTop;
        }
      });
    },
    getRowClassName({ row }: { row: any }) {
      return row?.index === this.currentRowKey ? 'trajectory-progress-row' : '';
    },
    emitControl(payload: Record<string, any>) {
      eventBus.emit(EventTypes.TrajectoryControl, payload);
    },
    formatProgressTooltip(value: number) {
      return `${value.toFixed(0)}%`;
    },
    formatDistance(distance: number) {
      if (!Number.isFinite(distance)) return '-';
      if (distance >= 1000) {
        return `${(distance / 1000).toFixed(2)} km`;
      }
      return `${distance.toFixed(0)} m`;
    },
    formatDuration(seconds: number) {
      if (!Number.isFinite(seconds) || seconds <= 0) return '0s';
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);
      const parts = [];
      if (hours) parts.push(`${hours}h`);
      if (minutes) parts.push(`${minutes}m`);
      if (secs || !parts.length) parts.push(`${secs}s`);
      return parts.join(' ');
    },
    formatPercent(value?: number) {
      if (typeof value !== 'number' || Number.isNaN(value)) return '-';
      return `${value.toFixed(1)}%`;
    },
    timelineType(type: string) {
      if (type === 'start') return 'primary';
      if (type === 'end') return 'success';
      if (type === 'stop') return 'warning';
      if (type === 'start') return 'success';
      if (type === 'overspeed') return 'danger';
      if (type === 'fence_in') return 'success';
      if (type === 'fence_out') return 'danger';
      return 'info';
    },
    timelineLabel(item: any) {
      if (item?.label) return item.label;
      if (item?.type === 'fence_in') return '进入围栏';
      if (item?.type === 'fence_out') return '离开围栏';
      if (item?.type === 'start') return '开始';
      if (item?.type === 'end') return '结束';
      if (item?.type === 'stop') return '停车';
      if (item?.type === 'overspeed') return '超速';
      return '事件';
    },
    timelineMeta(item: any) {
      const detail = item?.detail || {};
      const lines: string[] = [];
      if (detail.fence_name) {
        lines.push(`围栏：${detail.fence_name}`);
      }
      if (detail.lon !== undefined && detail.lat !== undefined) {
        lines.push(`位置：${this.formatCoord(detail.lon, detail.lat)}`);
      }
      if (detail.stay_seconds !== undefined) {
        lines.push(`停留：${this.formatDuration(detail.stay_seconds)}`);
      }
      if (detail.duration !== undefined && item.type !== 'stop') {
        lines.push(`持续：${this.formatDuration(detail.duration)}`);
      }
      if (detail.max_speed !== undefined) {
        lines.push(`最高速度：${Number(detail.max_speed).toFixed(1)} km/h`);
      }
      return lines;
    },
    mergeTimeline(primary: any[], extra: any[]) {
      const list = [...(Array.isArray(primary) ? primary : []), ...(Array.isArray(extra) ? extra : [])];
      if (!list.length) return [];
      const seen = new Set<string>();
      const merged: any[] = [];
      list.forEach((item) => {
        const key = `${item?.time ?? ''}|${item?.type ?? ''}|${item?.label ?? ''}`;
        if (seen.has(key)) return;
        seen.add(key);
        merged.push(item);
      });
      merged.sort((a, b) => String(a?.time ?? '').localeCompare(String(b?.time ?? '')));
      return merged;
    },
    formatCoord(lon: number, lat: number) {
      const lonNum = Number(lon);
      const latNum = Number(lat);
      if (!Number.isFinite(lonNum) || !Number.isFinite(latNum)) return '-';
      return `${lonNum.toFixed(6)}, ${latNum.toFixed(6)}`;
    },
  },
  computed: {
    resolvedSpeed(): number {
      const base = this.useCustomSpeed ? this.customSpeed : this.speedPreset;
      const speed = Number(base);
      return Number.isFinite(speed) && speed > 0 ? speed : 40;
    },
    statusLabel(): string {
      return STATUS_LABEL_MAP[this.playbackStatus] || '待命';
    },
    isPaused(): boolean {
      return this.playbackStatus === 'paused';
    },
    videoViewLabel(): string {
      const map: Record<string, string> = {
        front: '前视',
        back: '后视',
        left: '左视',
        right: '右视',
      };
      return map[this.videoView] || '前视';
    },
    videoViewHint(): string {
      return `当前视角：${this.videoViewLabel} · 车辆 ${this.plateNumber || '未选择'}`;
    },
    actualAnalysisStats() {
      if (!this.analysisSummary) return [];
      const stats = this.analysisSummary;
      return [
        { label: '实际里程', value: this.formatDistance(stats.distance_m) },
        { label: '实际时长', value: this.formatDuration(stats.duration_seconds) },
        { label: '平均速度', value: `${stats.avg_speed_kmh.toFixed(1)} km/h` },
        { label: '最高速度', value: `${stats.max_speed_kmh.toFixed(1)} km/h` },
      ];
    },
    compareAnalysisStats() {
      if (!this.analysisSummary) return [];
      const stats = this.analysisSummary;
      const compareLabel = this.analysisFence?.issues?.length ? '路线贴合率' : '围栏贴合率';
      return [
        { label: compareLabel, value: this.formatPercent(this.analysisFence?.inside_ratio) },
        { label: '异常数量', value: String(this.analysisFence?.issues?.length ?? 0) },
        { label: '停车次数', value: String(stats.stop_count) },
      ];
    },
  },
});

function getDayRange(base: Date) {
  const day = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  const start = new Date(day);
  const end = new Date(day);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}
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

.card-content {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: flex-start;
}

.form-item {
  width: 100%;
}

.analysis-card {
  width: 100%;
  gap: 16px;
  align-items: stretch;
  overflow: hidden;
}

.analysis-grid {
  width: 100%;
  display: flex;
  flex-direction: row;
  gap: 12px;
  align-items: stretch;
  min-width: 0;
  flex-wrap: nowrap;
}

.analysis-section {
  flex: 1 1 0;
  min-width: 0;
  padding: 10px 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.55);
}

.analysis-section + .analysis-section {
  margin-top: 0;
}

.section-title {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #93c5fd;
}

.analysis-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 6px 0;
}

.analysis-item .value {
  font-size: 18px;
  font-weight: 600;
}

.analysis-item .label {
  font-size: 12px;
  color: #9ca3af;
}

.analysis-video,
.video-card {
  display: flex;
  flex-direction: column;
  gap: 0;
  width: 100%;
  min-width: 0;
  height: 100%;
  overflow: hidden;
}

.video-panel {
  padding: 0 !important;
}

.video-layout {
  width: 100%;
  display: flex;
  align-items: stretch;
  gap: 0;
  min-height: 100%;
  height: 100%;
  border: 1px solid rgba(96, 165, 250, 0.18);
  background: rgba(9, 16, 29, 0.98);
  overflow: hidden;
}

.video-preview {
  flex: 1 1 auto;
  position: relative;
  aspect-ratio: 4 / 3;
  min-height: 0;
  max-height: 100%;
  border-radius: 0;
  padding: 16px 16px 14px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 6px;
  background:
    linear-gradient(180deg, rgba(59, 130, 246, 0.24), rgba(13, 20, 33, 0.92)),
    radial-gradient(circle at top right, rgba(96, 165, 250, 0.28), transparent 38%),
    radial-gradient(circle at bottom left, rgba(45, 212, 191, 0.12), transparent 32%),
    linear-gradient(135deg, #09101d 0%, #111f38 100%);
  border: 0;
  box-shadow: none;
  overflow: hidden;
}

.video-preview::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
    linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px);
  background-size: 18px 18px;
  opacity: 0.12;
  pointer-events: none;
}

.video-preview__badge {
  align-self: flex-start;
  position: relative;
  z-index: 1;
  padding: 4px 10px;
  border-radius: 0;
  background: rgba(59, 130, 246, 0.22);
  border: 1px solid rgba(96, 165, 250, 0.32);
  color: #dbeafe;
  font-size: 12px;
  letter-spacing: 0.08em;
}

.video-preview__title {
  position: relative;
  z-index: 1;
  font-size: 17px;
  font-weight: 800;
  color: #ffffff;
  line-height: 1.15;
}

.video-preview__sub {
  position: relative;
  z-index: 1;
  font-size: 12px;
  color: #cbd5e1;
  opacity: 0.92;
}

.video-switcher {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 128px;
  min-width: 128px;
  height: 100%;
  justify-content: flex-start;
  align-self: stretch;
  flex-wrap: nowrap;
  padding: 8px 8px;
  box-sizing: border-box;
  background: rgba(13, 20, 33, 0.98);
  border-left: 1px solid rgba(15, 23, 42, 0.95);
}

.video-switcher :deep(.el-radio-button) {
  width: 100%;
  min-width: 0;
  flex: 1 1 0;
}

.video-switcher :deep(.el-radio-button__inner) {
  width: 100%;
  height: 100%;
  text-align: center;
  border-radius: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 8px;
  line-height: 1;
  font-size: 13px;
  letter-spacing: 0.04em;
  color: #dbe4f0;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(23, 34, 54, 0.96));
  border: 1px solid rgba(15, 23, 42, 0.96);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.video-switcher :deep(.el-radio-button__inner:hover) {
  color: #ffffff;
  border-color: rgba(30, 41, 59, 1);
  background: linear-gradient(180deg, rgba(23, 34, 54, 0.98), rgba(30, 41, 59, 0.98));
}

.video-switcher :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
  color: #ffffff;
  background: linear-gradient(180deg, rgba(37, 99, 235, 0.9), rgba(29, 78, 216, 0.9));
  border-color: rgba(15, 23, 42, 0.98);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.12),
    0 0 0 1px rgba(15, 23, 42, 0.45);
}

.video-switcher :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner:hover) {
  background: linear-gradient(180deg, rgba(37, 99, 235, 0.98), rgba(29, 78, 216, 0.98));
  border-color: rgba(15, 23, 42, 1);
}

.analysis-issues {
  margin-top: 10px;
  padding: 8px;
  text-align: center;
  font-size: 12px;
  color: #f97316;
  background-color: rgba(249, 115, 22, 0.08);
  border-radius: 4px;
}

/* 1. 穿透修改表格整体背景 */
:deep(.el-table) {
  --el-table-row-hover-bg-color: #162033;
  /* 行 hover 背景（自定义深色） */
  --el-table-header-text-color: #e5e7eb;
  /* 表头文字颜色 */
  --el-table-text-color: #d1d5db;
  /* 表格文字颜色 */
  --el-table-border-color: #1e293b;
  /* 表格边框颜色 */

  background-color: #0d1421 !important;
  /* 核心：表格背景色 */
  color: var(--el-table-text-color);
  border: 1px solid var(--el-table-border-color);
}

/* 2. 表头样式 */
:deep(.el-table__header-wrapper) {

  /* 表头单元格 */
  .el-table__cell {
    background-color: #1b2b49 !important;
    color: var(--el-table-header-text-color);
    border-bottom: 1px solid var(--el-table-border-color);
  }
}

/* 3. 表体样式 */
:deep(.el-table__body-wrapper) {

  /* 表体单元格 */
  .el-table__cell {
    background-color: #0d1421 !important;
    border-bottom: 1px solid var(--el-table-border-color);
  }

  :deep(.el-table__row.trajectory-progress-row) {
    background-color: rgba(59, 130, 246, 0.15) !important;
  }

  :deep(.el-table__row.trajectory-progress-row .el-table__cell) {
    background-color: rgba(59, 130, 246, 0.15) !important;
  }

  :deep(.el-table__row.trajectory-progress-row:hover) {
    background-color: rgba(37, 99, 235, 0.25) !important;
  }

  :deep(.el-table__row.trajectory-progress-row:hover .el-table__cell) {
    background-color: rgba(37, 99, 235, 0.25) !important;
  }

  /* 斑马纹（如需开启 stripe 属性，需适配） */
  .el-table__row--striped {
    .el-table__cell {
      background-color: #0f1829 !important;
      /* 斑马纹深色 */
    }
  }

  /* 行 hover 效果 */
  .el-table__row:hover {
    .el-table__cell {
      background-color: var(--el-table-row-hover-bg-color) !important;
    }
  }
}

/* 1. 穿透修改时间轴整体样式 */
:deep(.el-timeline) {
  --el-timeline-node-color: #3b82f6;
  /* 默认节点颜色（主色） */
  --el-timeline-line-color: #1e293b;
  /* 时间轴线颜色（深色适配） */
  --el-timeline-text-color: #d1d5db;
  /* 文字颜色 */
  --el-timeline-timestamp-color: #9ca3af;
  /* 时间戳文字颜色 */

  color: var(--el-timeline-text-color);
}

/* 2. 时间轴节点样式（核心） */
:deep(.el-timeline-item__node) {
  /* 节点背景/边框 */
  background-color: #0d1421 !important;
  border-color: var(--el-timeline-line-color) !important;

  /* 不同类型节点的颜色（保留区分度） */
  &.el-timeline-item__node--primary {
    color: #3b82f6 !important;
    /* 主色节点 */
  }

  &.el-timeline-item__node--success {
    color: #10b981 !important;
    /* 成功色节点 */
  }

  &.el-timeline-item__node--warning {
    color: #f59e0b !important;
    /* 警告色节点 */
  }

  &.el-timeline-item__node--danger {
    color: #ef4444 !important;
    /* 危险色节点 */
  }

  &.el-timeline-item__node--info {
    color: #6366f1 !important;
    /* 信息色节点 */
  }
}

/* 3. 时间轴线样式 */
:deep(.el-timeline-item__tail) {
  background-color: var(--el-timeline-line-color) !important;
  /* 线条颜色 */
}

/* 4. 时间戳样式 */
:deep(.el-timeline-item__timestamp) {
  color: var(--el-timeline-timestamp-color) !important;
  /* 调整时间戳位置（可选） */
  font-size: 12px;
}

/* 5. 时间轴内容区域 */
:deep(.el-timeline-item__content) {
  color: var(--el-timeline-text-color) !important;
  padding-top: 2px;
  /* 微调对齐 */
}

/* 6. 卡片式节点适配（如有 el-card） */
:deep(.el-timeline-item .el-card) {
  background-color: #0d1421 !important;
  border-color: var(--el-timeline-line-color) !important;
  color: var(--el-timeline-text-color);

  .el-card__header {
    border-bottom-color: var(--el-timeline-line-color) !important;
    color: #e5e7eb;
    /* 卡片标题更亮 */
  }
}

/* 7. 反向时间轴适配（reverse 属性） */
:deep(.el-timeline--reverse) {
  .el-timeline-item__tail {
    background-color: var(--el-timeline-line-color) !important;
  }

  .el-timeline-item__node {
    border-color: var(--el-timeline-line-color) !important;
  }
}

/* 1. 穿透修改水平分割线核心样式 */
:deep(.el-divider--horizontal) {
  /* 分割线整体间距（可选，优化视觉） */
  margin: 16px 0;

  /* 分割线边框（核心：替换默认浅灰） */
  border-top-color: #1e293b !important;

  /* 分割线文字容器 */
  .el-divider__text {
    /* 文字背景：与主背景一致，避免透显分割线 */
    background-color: #0d1421 !important;
    /* 文字颜色：适配深色的浅灰 */
    color: #d1d5db !important;
    /* 文字左右间距（可选，优化包裹范围） */
    padding: 0 16px;
    font-size: 14px;
  }
}

/* 1. 穿透修改 Input 核心样式（统一变量） */
:deep(.el-input) {
  --el-input-border-color: #1e293b;
  /* 默认边框色 */
  --el-input-hover-border-color: #3b82f6;
  /* hover/聚焦边框色 */
  --el-input-bg-color: #101a2b;
  /* 输入框背景 */
  --el-input-text-color: #d1d5db;
  /* 输入文字色 */
  --el-input-placeholder-color: #6b7280;
  /* 占位符颜色 */
  --el-input-disabled-bg-color: #162033;
  /* 禁用背景 */
  --el-input-icon-color: #9ca3af;
  /* 图标颜色（清空/密码按钮） */
  --el-input-icon-hover-color: #e5e7eb;
  /* 图标 hover 颜色 */

  font-size: 14px;
}

/* 2. 输入框容器（包裹输入框+图标） */
:deep(.el-input__wrapper) {
  background-color: var(--el-input-bg-color) !important;
  border: 1px solid var(--el-input-border-color) !important;
  border-radius: 4px;
  /* 圆角优化 */
  box-sizing: border-box;
  padding: 0 12px;
  /* 内边距适配 */
  height: 36px;
  /* 统一高度 */
}

/* 3. 输入框 hover 态 */
:deep(.el-input__wrapper:hover) {
  border-color: var(--el-input-hover-border-color) !important;
}

/* 4. 输入框聚焦态 */
:deep(.el-input__wrapper:focus-within) {
  border-color: var(--el-input-hover-border-color) !important;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2) !important;
  /* 聚焦光晕 */
  outline: none;
}

/* 5. 输入框文字与占位符 */
:deep(.el-input__inner) {
  /* 输入文字 */
  color: var(--el-input-text-color) !important;
  /* 背景透明（继承容器背景） */
  background-color: transparent !important;
  /* 取消自带边框/内边距（避免重复） */
  border: none !important;
  padding: 0 !important;
  height: 100%;
  /* 高度继承容器 */
  line-height: 34px;
  /* 垂直居中（容器高度-边框） */
}

/* 占位符样式 */
:deep(.el-input__inner::placeholder) {
  color: var(--el-input-placeholder-color) !important;
  opacity: 1;
  /* 保证占位符颜色不透明 */
}

/* 6. 清空按钮（clearable） */
:deep(.el-input__clear) {
  color: var(--el-input-icon-color) !important;
  width: 16px;
  height: 16px;

  /* hover 提亮 */
  &:hover {
    color: var(--el-input-icon-hover-color) !important;
    background-color: #162033 !important;
    /* hover 背景（避免透显） */
    border-radius: 50%;
  }
}

/* 7. 密码切换按钮（show-password） */
:deep(.el-input__password) {
  color: var(--el-input-icon-color) !important;

  /* hover 提亮 */
  &:hover {
    color: var(--el-input-icon-hover-color) !important;
  }
}

/* 8. 禁用状态适配 */
:deep(.el-input.is-disabled) {
  .el-input__wrapper {
    background-color: var(--el-input-disabled-bg-color) !important;
    border-color: #25334a !important;
    opacity: 0.8;
  }

  .el-input__inner {
    color: #6b7280 !important;
    /* 禁用文字色 */
    cursor: not-allowed;
  }

  .el-input__inner::placeholder {
    color: #4b5563 !important;
    /* 禁用占位符色 */
  }
}

/* 9. 带前缀/后缀图标适配（可选） */
:deep(.el-input__prefix, .el-input__suffix) {
  color: var(--el-input-icon-color) !important;
  /* 图标与文字间距 */
  margin: 0 8px;
}

/* 穿透修改分割条拖拽手柄的伪元素颜色 */
:deep(.el-splitter-bar__dragger) {

  /* 核心：设置 before/after 伪元素背景色为 #0d1421 */
  &::before,
  &::after {
    background-color: #0d1421 !important;
    /* 强制覆盖内置样式 */
    /* 可选：优化伪元素样式（如边框、圆角，适配深色） */
    border: 1px solid #1e293b !important;
    /* 加边框避免与背景完全融合 */
    border-radius: 2px;
  }
}

/* 可选：优化分割条整体样式（适配 #0d1421 背景） */
:deep(.el-splitter-bar) {
  /* 分割条背景（浅于主背景，保证可见） */
  background-color: #1e293b !important;

  /* hover 态加深，强化交互 */
  &:hover {
    background-color: #25334a !important;
  }
}

/* 可选：禁用态分割条适配 */
:deep(.el-splitter-bar.is-disabled) {
  background-color: #25334a !important;

  .el-splitter-bar__dragger::before,
  .el-splitter-bar__dragger::after {
    background-color: #162033 !important;
    /* 禁用态伪元素颜色 */
    border-color: #25334a !important;
  }
}

:deep(.el-statistic__content) {
  color: #eaeff7;
}

/* 1. 穿透修改 Tag 核心样式（统一背景为 #0d1421） */
:deep(.el-tag) {
  --el-tag-bg-color: #0d1421 !important;
  /* 核心：标签背景色 */
  --el-tag-text-color: #d1d5db !important;
  /* 文字颜色 */
  --el-tag-border-color: #1e293b !important;
  /* 边框颜色 */
  --el-tag-hover-bg-color: #162033 !important;
  /* hover 背景色 */
  --el-tag-close-hover-color: #e5e7eb !important;
  /* 关闭按钮 hover 颜色 */
  --el-tag-disabled-bg-color: #162033 !important;
  /* 禁用背景色 */
  --el-tag-disabled-text-color: #6b7280 !important;
  /* 禁用文字色 */

  /* 基础样式优化 */
  border-radius: 4px;
  font-size: 14px;
  padding: 4px 12px;
}

.playback-card {
  gap: 16px;
  align-items: stretch;
}

.playback-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.playback-header .title {
  font-weight: 600;
  font-size: 16px;
}

.control-group {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.group-title {
  font-size: 14px;
  color: #9ca3af;
}

.custom-speed {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}

.speed-options {
  width: 100%;
}

.speed-preview {
  font-size: 13px;
  color: #d1d5db;
}

.progress-meta {
  display: flex;
  justify-content: space-between;
  color: #9ca3af;
  font-size: 12px;
}

.timeline-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.timeline-label {
  font-size: 13px;
  color: #e5e7eb;
}

.timeline-meta {
  font-size: 12px;
  color: #9ca3af;
  line-height: 1.4;
}


:deep(.track-button.track-all) {
  --el-button-bg-color: #2e60e7;
  --el-button-border-color: #2e60e7;
  --el-button-hover-bg-color: #2a57d2;
  --el-button-hover-border-color: #2a57d2;
  --el-button-active-bg-color: #244dbb;
  --el-button-active-border-color: #244dbb;
}

:deep(.track-button.track-work) {
  --el-button-bg-color: #1b2b49;
  --el-button-border-color: #1b2b49;
  --el-button-hover-bg-color: #22355a;
  --el-button-hover-border-color: #22355a;
  --el-button-active-bg-color: #182743;
  --el-button-active-border-color: #182743;
}

:deep(.control-button.button-play) {
  --el-button-bg-color: #2e60e7;
  --el-button-border-color: #2e60e7;
  --el-button-text-color: #ffffff;
  --el-button-hover-bg-color: #2a57d2;
  --el-button-hover-border-color: #2a57d2;
  --el-button-hover-text-color: #ffffff;
  --el-button-active-bg-color: #244dbb;
  --el-button-active-border-color: #244dbb;
  --el-button-active-text-color: #ffffff;
}

:deep(.control-button.button-pause) {
  --el-button-bg-color: #f49d3a;
  --el-button-border-color: #f49d3a;
  --el-button-text-color: #ffffff;
  --el-button-hover-bg-color: #e48f32;
  --el-button-hover-border-color: #e48f32;
  --el-button-hover-text-color: #ffffff;
  --el-button-active-bg-color: #cc812c;
  --el-button-active-border-color: #cc812c;
  --el-button-active-text-color: #ffffff;
}

:deep(.control-button.button-stop) {
  --el-button-bg-color: #d13758;
  --el-button-border-color: #d13758;
  --el-button-text-color: #ffffff;
  --el-button-hover-bg-color: #bd324f;
  --el-button-hover-border-color: #bd324f;
  --el-button-hover-text-color: #ffffff;
  --el-button-active-bg-color: #a92c47;
  --el-button-active-border-color: #a92c47;
  --el-button-active-text-color: #ffffff;
}

:deep(.el-radio-group) {
  background-color: #1b2b49;
  border-radius: 6px;
  padding: 6px;
}

:deep(.el-radio-button__inner) {
  background-color: #1b2b49;
  border-color: #1b2b49;
  color: #e5e7eb;
}

:deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
  background-color: #2e60e7;
  border-color: #2e60e7;
  color: #ffffff;
}

:deep(.el-slider__runway) {
  background-color: #1b2b49 !important;
}

:deep(.el-slider__bar) {
  background-color: #2e60e7 !important;
}

:deep(.el-slider__button) {
  border-color: #2e60e7 !important;
  background-color: #2e60e7 !important;
}

.trajectory-table-wrapper {
  height: 100%;
  width: 100%;
  overflow: hidden;
}

.trajectory-table-wrapper :deep(.el-table) {
  height: 100%;
}

.trajectory-table-wrapper :deep(.el-table__body-wrapper) {
  max-height: 100%;
  overflow-y: auto;
}
</style>
