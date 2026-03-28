const HOURS = Array.from({ length: 24 }, (_, hour) => `${hour}:00`)

const FLOW_PROFILE = [
  0.35, 0.3, 0.25, 0.22, 0.28, 0.48, 0.82, 1.1,
  1.18, 1.02, 0.9, 0.94, 1.08, 1.24, 1.42, 1.58,
  1.46, 1.28, 1.08, 0.9, 0.72, 0.62, 0.52, 0.42
]

const STATION_CONFIGS = [
  {
    id: 'north-hub',
    name: '北区中转站',
    code: 'TZ-01',
    lng: 118.7746,
    lat: 32.0852,
    platformCount: 4,
    baseInbound: 16,
    baseOutbound: 13,
    peakInbound: 12,
    peakOutbound: 9,
    seed: 1,
    remark: '上午进站集中，晚间出站占比更高'
  },
  {
    id: 'east-hub',
    name: '东区中转站',
    code: 'TZ-02',
    lng: 118.8462,
    lat: 32.0628,
    platformCount: 5,
    baseInbound: 14,
    baseOutbound: 11,
    peakInbound: 10,
    peakOutbound: 8,
    seed: 3,
    remark: '工作日白天吞吐较稳定'
  },
  {
    id: 'south-hub',
    name: '南区中转站',
    code: 'TZ-03',
    lng: 118.8188,
    lat: 31.9897,
    platformCount: 3,
    baseInbound: 12,
    baseOutbound: 15,
    peakInbound: 11,
    peakOutbound: 10,
    seed: 5,
    remark: '晚高峰出站压力更明显'
  }
]

const clampCount = (value) => Math.max(0, Math.round(value))

const buildSeries = (config) => {
  const inboundCounts = HOURS.map((_, hour) => {
    const wave = FLOW_PROFILE[hour]
    const wobble = Math.sin((hour + config.seed) * 0.7) * 1.4
    return clampCount(config.baseInbound + wave * config.peakInbound + wobble)
  })
  const outboundCounts = HOURS.map((_, hour) => {
    const wave = FLOW_PROFILE[(hour + 4) % HOURS.length]
    const wobble = Math.cos((hour + config.seed) * 0.6) * 1.2
    return clampCount(config.baseOutbound + wave * config.peakOutbound + wobble)
  })
  const netFlowCounts = inboundCounts.map((value, index) => value - outboundCounts[index])
  const totalInbound = inboundCounts.reduce((sum, value) => sum + value, 0)
  const totalOutbound = outboundCounts.reduce((sum, value) => sum + value, 0)
  const peakHourIndex = inboundCounts.reduce(
    (bestIndex, value, index, array) => (value > array[bestIndex] ? index : bestIndex),
    0
  )

  return {
    hours: HOURS,
    inboundCounts,
    outboundCounts,
    netFlowCounts,
    totalInbound,
    totalOutbound,
    peakHour: HOURS[peakHourIndex],
    currentLoad: totalInbound - totalOutbound
  }
}

export const TRANSFER_STATIONS = STATION_CONFIGS.map((config) => ({
  ...config,
  traffic: buildSeries(config)
}))

export const TRANSFER_STATION_GROUP = {
  key: 'station_group',
  label: '中转站',
  type: 'station-group',
  children: TRANSFER_STATIONS.map((station) => ({
    key: `station_${station.id}`,
    label: station.name,
    type: 'station',
    stationId: station.id,
    code: station.code,
    location: {
      lng: station.lng,
      lat: station.lat
    },
    platformCount: station.platformCount,
    suffixText: `${station.traffic.totalInbound} / ${station.traffic.totalOutbound}`,
    traffic: station.traffic,
    option: {
      level: 'station',
      stationId: station.id,
      stationName: station.name,
      code: station.code,
      location: {
        lng: station.lng,
        lat: station.lat
      },
      platformCount: station.platformCount,
      traffic: station.traffic,
      remark: station.remark
    },
    remark: station.remark,
    isLeaf: true,
    sortValue: 0
  })),
  sortValue: -1
}

export const DEFAULT_TRANSFER_STATION_ID = TRANSFER_STATIONS[0]?.id || ''

export const getTransferStationById = (stationId) =>
  TRANSFER_STATIONS.find(
    (station) =>
      station.id === stationId ||
      station.code === stationId ||
      station.name === stationId
  ) || TRANSFER_STATIONS[0] || null

export const getTransferStationTreeGroup = () => ({
  ...TRANSFER_STATION_GROUP,
  children: TRANSFER_STATION_GROUP.children.map((station) => ({ ...station }))
})

export const buildTransferStationOverview = (stationId) => {
  const station = getTransferStationById(stationId)
  if (!station) {
    return {
      stationId: '',
      stationName: '中转站',
      hours: HOURS,
      inboundCounts: Array(24).fill(0),
      outboundCounts: Array(24).fill(0),
      netFlowCounts: Array(24).fill(0),
      totalInbound: 0,
      totalOutbound: 0,
      peakHour: ''
    }
  }

  return {
    stationId: station.id,
    stationName: station.name,
    code: station.code,
    remark: station.remark,
    platformCount: station.platformCount,
    ...station.traffic
  }
}

export const buildAggregateTransferStationOverview = () => {
  const aggregate = TRANSFER_STATIONS.reduce(
    (result, station) => {
      station.traffic.inboundCounts.forEach((value, index) => {
        result.inboundCounts[index] += value
      })
      station.traffic.outboundCounts.forEach((value, index) => {
        result.outboundCounts[index] += value
      })
      return result
    },
    {
      hours: HOURS,
      inboundCounts: Array(24).fill(0),
      outboundCounts: Array(24).fill(0)
    }
  )

  aggregate.netFlowCounts = aggregate.inboundCounts.map(
    (value, index) => value - aggregate.outboundCounts[index]
  )
  aggregate.totalInbound = aggregate.inboundCounts.reduce((sum, value) => sum + value, 0)
  aggregate.totalOutbound = aggregate.outboundCounts.reduce((sum, value) => sum + value, 0)
  const peakHourIndex = aggregate.inboundCounts.reduce(
    (bestIndex, value, index, array) => (value > array[bestIndex] ? index : bestIndex),
    0
  )
  aggregate.peakHour = HOURS[peakHourIndex]

  return {
    stationId: 'aggregate',
    stationName: '全部中转站',
    remark: '模拟汇总进出量',
    ...aggregate
  }
}
