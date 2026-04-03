<template>
  <div class="alarm-marker-badge" :class="badgeClasses" :style="badgeStyle" :aria-label="text">
    <span class="alarm-marker-badge__text">{{ text }}</span>
  </div>
</template>

<script>
export default {
  name: 'AlarmMarkerBadge',
  props: {
    text: {
      type: String,
      default: '定位点名称',
    },
    variant: {
      type: String,
      default: 'idle',
    },
    glow: {
      type: String,
      default: '',
    },
  },
  computed: {
    badgeClasses() {
      return [`alarm-marker-badge--${this.variant || 'online'}`]
    },
    badgeStyle() {
      return {
        '--alarm-glow': this.glow || this.defaultGlow,
      }
    },
    defaultGlow() {
      if (this.variant === 'danger') return 'rgba(255, 77, 79, 0.34)'
      if (this.variant === 'warning') return 'rgba(255, 176, 32, 0.32)'
      if (this.variant === 'offline') return 'rgba(148, 163, 184, 0.22)'
      if (this.variant === 'online') return 'rgba(55, 210, 138, 0.24)'
      return 'rgba(55, 210, 138, 0.24)'
    },
  },
}
</script>

<style scoped>
.alarm-marker-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 84px;
  max-width: 154px;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid var(--alarm-border, rgba(96, 165, 250, 0.5));
  background: var(--alarm-bg, linear-gradient(180deg, rgba(8, 18, 32, 0.9), rgba(10, 25, 46, 0.72)));
  box-shadow:
    0 12px 28px rgba(3, 10, 24, 0.34),
    0 0 22px var(--alarm-glow, rgba(96, 165, 250, 0.22)),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  color: var(--alarm-color, #f4fbff);
  font: 700 14px SourceHanSansCN, PingFang SC, Microsoft YaHei, sans-serif;
  line-height: 1.15;
  letter-spacing: 0.6px;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.alarm-marker-badge--online {
  --alarm-border: rgba(55, 210, 138, 0.48);
  --alarm-bg: linear-gradient(180deg, rgba(7, 31, 24, 0.9), rgba(8, 46, 35, 0.76));
  --alarm-color: #eafff4;
}

.alarm-marker-badge--idle {
  --alarm-border: rgba(55, 210, 138, 0.48);
  --alarm-bg: linear-gradient(180deg, rgba(7, 31, 24, 0.9), rgba(8, 46, 35, 0.76));
  --alarm-color: #eafff4;
}

.alarm-marker-badge--moving {
  --alarm-border: rgba(55, 210, 138, 0.48);
  --alarm-bg: linear-gradient(180deg, rgba(7, 31, 24, 0.9), rgba(8, 46, 35, 0.76));
  --alarm-color: #eafff4;
}

.alarm-marker-badge--offline {
  --alarm-border: rgba(148, 163, 184, 0.36);
  --alarm-bg: linear-gradient(180deg, rgba(17, 24, 39, 0.92), rgba(31, 41, 55, 0.72));
  --alarm-color: #e5e7eb;
}

.alarm-marker-badge--warning {
  --alarm-border: rgba(255, 181, 72, 0.72);
  --alarm-bg: linear-gradient(180deg, rgba(61, 31, 8, 0.96), rgba(111, 60, 10, 0.82));
  --alarm-color: #fff8e8;
}

.alarm-marker-badge--danger {
  --alarm-border: rgba(255, 92, 96, 0.72);
  --alarm-bg: linear-gradient(180deg, rgba(56, 9, 14, 0.96), rgba(99, 17, 23, 0.82));
  --alarm-color: #fff2f2;
}
</style>
