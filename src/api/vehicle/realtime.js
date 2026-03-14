import { requestJson } from '@/api/http'

const REALTIME_PATH = import.meta.env.VITE_VEHICLE_REALTIME_PATH || '/Vehicle/realTimeLocation'
const HOURLY_STATUS_PATH = import.meta.env.VITE_VEHICLE_HOURLY_STATUS_PATH || '/Vehicle/hourlyStatus'
const STATUS_STATISTICS_PATH =
  import.meta.env.VITE_VEHICLE_STATUS_STATISTICS_PATH || '/Vehicle/statusStatistics'

export const fetchRealtimeVehicles = () => requestJson(REALTIME_PATH)

export const fetchHourlyVehicleStatus = (params = {}) =>
  requestJson(HOURLY_STATUS_PATH, { params })

export const fetchVehicleStatusStatistics = (params = {}) =>
  requestJson(STATUS_STATISTICS_PATH, { params })

export default {
  fetchRealtimeVehicles,
  fetchHourlyVehicleStatus,
  fetchVehicleStatusStatistics
}
