export {
  fetchVehicleList,
  createVehicle,
  updateVehicle,
  deleteVehicle,
} from './crud'

export {
  fetchVehicleUnits,
  createVehicleUnit,
  updateVehicleUnit,
  deleteVehicleUnit,
  fetchVehicleTypes,
  createVehicleType,
  updateVehicleType,
  deleteVehicleType,
  fetchCurrentUserInfo,
  fetchVehicleFenceTree,
  fetchVehicleFence,
  fetchVehicleWorkTypes,
  fetchVehicleWorkType,
  createVehicleWorkType,
  updateVehicleWorkType,
  deleteVehicleWorkType,
  fetchPermissionGroups,
  fetchDeviceBindings
} from './metadata'

export {
  fetchTaskOrders,
  createTaskOrder,
  updateTaskOrder,
  deleteTaskOrder
} from './taskOrder'

import { apiRequest } from '@/utils/request'

const TRAJECTORY_PATHS = {
  realtime: import.meta.env.VITE_VEHICLE_REALTIME_PATH || '/Vehicle/realTimeLocation',
  trajectory: import.meta.env.VITE_VEHICLE_TODAY_PATH || '/Vehicle/trajectoryToday',
  analysis: import.meta.env.VITE_VEHICLE_ANALYSIS_PATH || '/Vehicle/trajectoryAnalysis',
  statusStatistics: import.meta.env.VITE_VEHICLE_STATUS_STATISTICS_PATH || '/Vehicle/statusStatistics',
  mileageStatistics: import.meta.env.VITE_VEHICLE_MILEAGE_STATISTICS_PATH || '/Vehicle/mileageStatistics',
}

export const fetchRealtimeVehicles = () => {
  return apiRequest({ url: TRAJECTORY_PATHS.realtime, method: 'get' })
}

export const fetchTrajectory = (params) => {
  return apiRequest({ url: TRAJECTORY_PATHS.trajectory, method: 'get', params })
}

export const fetchTrajectoryAnalysis = (params) => {
  return apiRequest({ url: TRAJECTORY_PATHS.analysis, method: 'get', params })
}

export const fetchStatusStatistics = (params, options = {}) => {
  return apiRequest({
    url: TRAJECTORY_PATHS.statusStatistics,
    method: 'get',
    params,
    signal: options.signal,
  })
}

export const fetchMileageStatistics = (params, options = {}) => {
  return apiRequest({
    url: TRAJECTORY_PATHS.mileageStatistics,
    method: 'get',
    params,
    signal: options.signal,
  })
}
