const STATUS_META = {
  draft: {
    label: '草稿',
    tag: 'info',
    tone: 'draft',
  },
  published: {
    label: '已发布',
    tag: 'warning',
    tone: 'published',
  },
  executing: {
    label: '执行中',
    tag: 'success',
    tone: 'executing',
  },
  finished: {
    label: '已完成',
    tag: 'primary',
    tone: 'finished',
  },
  checked: {
    label: '已验收',
    tag: 'success',
    tone: 'checked',
  },
  cancelled: {
    label: '已取消',
    tag: 'danger',
    tone: 'cancelled',
  },
}

export const TASK_STATUS_OPTIONS = [
  { label: '全部状态', value: 'all' },
  { label: '草稿', value: 'draft' },
  { label: '已发布', value: 'published' },
  { label: '执行中', value: 'executing' },
  { label: '已完成', value: 'finished' },
  { label: '已验收', value: 'checked' },
  { label: '已取消', value: 'cancelled' },
]

export const TASK_QUICK_FILTERS = [
  { label: '全部任务', value: 'all' },
  { label: '待处理', value: 'draft' },
  { label: '执行中', value: 'executing' },
  { label: '已完成', value: 'finished' },
  { label: '已取消', value: 'cancelled' },
]

const pad = (value) => String(value).padStart(2, '0')

export const getTaskStatusMeta = (status) => {
  const normalized = String(status || '').trim().toLowerCase()
  return (
    STATUS_META[normalized] || {
      label: normalized ? String(status) : '未知',
      tag: 'info',
      tone: 'unknown',
    }
  )
}

export const parseDateTime = (value) => {
  if (!value) return null
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export const formatDateTime = (value) => {
  const date = parseDateTime(value)
  if (!date) return '--'
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

export const formatDateOnly = (value) => {
  const date = parseDateTime(value)
  if (!date) return ''
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export const buildTaskSummary = (list = []) => {
  const summary = {
    total: 0,
    draft: 0,
    published: 0,
    executing: 0,
    finished: 0,
    checked: 0,
    cancelled: 0,
    overdue: 0,
  }

  const now = Date.now()
  list.forEach((item) => {
    summary.total += 1
    const status = String(item?.status || 'draft').toLowerCase()
    if (Object.prototype.hasOwnProperty.call(summary, status)) {
      summary[status] += 1
    }
    const startedAt = parseDateTime(item?.task_start_time || item?.start_time || item?.created_at || item?.createdAt)
    const statusIsActive = !['finished', 'checked', 'cancelled'].includes(status)
    if (startedAt && statusIsActive && startedAt.getTime() < now) {
      summary.overdue += 1
    }
  })

  summary.pending = summary.draft + summary.published
  summary.completed = summary.finished + summary.checked
  summary.active = summary.executing + summary.pending
  return summary
}

export const buildTaskTimeline = (list = []) => {
  const labels = Array.from({ length: 24 }, (_, index) => `${pad(index)}:00`)
  const createSeries = () => Array(24).fill(0)
  const draft = createSeries()
  const published = createSeries()
  const executing = createSeries()
  const completed = createSeries()
  const cancelled = createSeries()

  list.forEach((item) => {
    const date = parseDateTime(item?.task_start_time || item?.start_time || item?.created_at || item?.createdAt)
    if (!date) return
    const hour = date.getHours()
    const status = String(item?.status || 'draft').toLowerCase()
    if (status === 'draft') {
      draft[hour] += 1
    } else if (status === 'published') {
      published[hour] += 1
    } else if (status === 'executing') {
      executing[hour] += 1
    } else if (status === 'finished' || status === 'checked') {
      completed[hour] += 1
    } else if (status === 'cancelled') {
      cancelled[hour] += 1
    } else {
      draft[hour] += 1
    }
  })

  const completionRate = labels.map((_, index) => {
    const total = draft[index] + published[index] + executing[index] + completed[index] + cancelled[index]
    if (!total) return 0
    return Number((((completed[index] + cancelled[index]) / total) * 100).toFixed(1))
  })

  return {
    labels,
    draft,
    published,
    executing,
    completed,
    cancelled,
    completionRate,
  }
}

export const normalizeOptionValue = (item = {}) => {
  const rawId =
    item.id ??
    item.value ??
    item.vehicle_id ??
    item.vehicleId ??
    item.fence_id ??
    item.fenceId ??
    item.type_id ??
    item.typeId ??
    item.code ??
    item.type_code
  return rawId === undefined || rawId === null ? '' : String(rawId)
}

export const normalizeOptionLabel = (item = {}, fallback = '') => {
  const label =
    item.label ||
    item.name ||
    item.vehicle_name ||
    item.license_plate ||
    item.fence_name ||
    item.type_name ||
    item.title ||
    item.code ||
    item.type_code ||
    fallback
  return String(label || '').trim()
}

export const flattenTreeOptions = (items = [], fallbackPrefix = '节点') => {
  const result = []
  const walk = (nodes = [], prefix = fallbackPrefix) => {
    nodes.forEach((node, index) => {
      const value = normalizeOptionValue(node)
      const label = normalizeOptionLabel(node, `${prefix}${index + 1}`)
      if (value) {
        result.push({
          value,
          label,
          raw: node,
        })
      }
      if (Array.isArray(node?.children) && node.children.length) {
        walk(node.children, label || prefix)
      }
    })
  }
  walk(items)
  return result
}

export default {
  TASK_STATUS_OPTIONS,
  TASK_QUICK_FILTERS,
  getTaskStatusMeta,
  parseDateTime,
  formatDateTime,
  formatDateOnly,
  buildTaskSummary,
  buildTaskTimeline,
  normalizeOptionValue,
  normalizeOptionLabel,
  flattenTreeOptions,
}
