import { requestJson } from '@/api/http'

const UNIT_INDEX_PATH = import.meta.env.VITE_VEHICLE_UNIT_PATH || '/VehicleUnit/index'
const TYPE_INDEX_PATH = import.meta.env.VITE_VEHICLE_TYPE_PATH || '/VehicleType/index'
const PERMISSION_GROUP_INDEX_PATH =
  import.meta.env.VITE_PERMISSION_GROUPS_PATH || '/PermissionGroup/index'
const DEVICE_BINDING_INDEX_PATH =
  import.meta.env.VITE_DEVICE_BINDING_PATH || '/DeviceBinding/index'

export const fetchVehicleUnits = (params = {}) =>
  requestJson(UNIT_INDEX_PATH, { params })

export const fetchVehicleTypes = (params = {}) =>
  requestJson(TYPE_INDEX_PATH, { params })

export const fetchPermissionGroups = () =>
  requestJson(PERMISSION_GROUP_INDEX_PATH)

export const fetchDeviceBindings = (params = {}) =>
  requestJson(DEVICE_BINDING_INDEX_PATH, { params })

export default {
  fetchVehicleUnits,
  fetchVehicleTypes,
  fetchPermissionGroups,
  fetchDeviceBindings
}
