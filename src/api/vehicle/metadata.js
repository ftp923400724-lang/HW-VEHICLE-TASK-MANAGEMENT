import { requestJson } from '@/api/http'

const USER_INFO_PATH = import.meta.env.VITE_USER_INFO_PATH || '/Login/getUserInfo'
const UNIT_INDEX_PATH = import.meta.env.VITE_VEHICLE_UNIT_PATH || '/VehicleUnit/index'
const UNIT_SAVE_PATH = import.meta.env.VITE_VEHICLE_UNIT_SAVE_PATH || '/VehicleUnit/save'
const UNIT_UPDATE_PATH = import.meta.env.VITE_VEHICLE_UNIT_UPDATE_PATH || '/VehicleUnit/update'
const UNIT_DELETE_PATH = import.meta.env.VITE_VEHICLE_UNIT_DELETE_PATH || '/VehicleUnit/delete'

const TYPE_INDEX_PATH = import.meta.env.VITE_VEHICLE_TYPE_PATH || '/VehicleType/index'
const TYPE_SAVE_PATH = import.meta.env.VITE_VEHICLE_TYPE_SAVE_PATH || '/VehicleType/save'
const TYPE_UPDATE_PATH = import.meta.env.VITE_VEHICLE_TYPE_UPDATE_PATH || '/VehicleType/update'
const TYPE_DELETE_PATH = import.meta.env.VITE_VEHICLE_TYPE_DELETE_PATH || '/VehicleType/delete'

const FENCE_TREE_PATH = import.meta.env.VITE_VEHICLE_FENCE_TREE_PATH || '/VehicleFence/tree'
const FENCE_READ_PATH = import.meta.env.VITE_VEHICLE_FENCE_READ_PATH || '/VehicleFence/read'
const WORK_TYPE_INDEX_PATH = import.meta.env.VITE_VEHICLE_WORK_TYPES_PATH || '/VehicleWorkTypes/index'
const WORK_TYPE_READ_PATH = import.meta.env.VITE_VEHICLE_WORK_TYPE_READ_PATH || '/VehicleWorkTypes/read'
const WORK_TYPE_SAVE_PATH = import.meta.env.VITE_VEHICLE_WORK_TYPE_SAVE_PATH || '/VehicleWorkTypes/save'
const WORK_TYPE_UPDATE_PATH = import.meta.env.VITE_VEHICLE_WORK_TYPE_UPDATE_PATH || '/VehicleWorkTypes/update'
const WORK_TYPE_DELETE_PATH = import.meta.env.VITE_VEHICLE_WORK_TYPE_DELETE_PATH || '/VehicleWorkTypes/delete'

const PERMISSION_GROUP_INDEX_PATH =
  import.meta.env.VITE_PERMISSION_GROUPS_PATH || '/PermissionGroup/index'
const DEVICE_BINDING_INDEX_PATH =
  import.meta.env.VITE_DEVICE_BINDING_PATH || '/DeviceBinding/index'

export const fetchCurrentUserInfo = () =>
  requestJson(USER_INFO_PATH)

export const fetchVehicleUnits = (params = {}) =>
  requestJson(UNIT_INDEX_PATH, { params })

export const createVehicleUnit = (payload = {}) =>
  requestJson(UNIT_SAVE_PATH, {
    method: 'POST',
    body: payload
  })

export const updateVehicleUnit = (id, payload = {}) =>
  requestJson(UNIT_UPDATE_PATH, {
    method: 'POST',
    body: { ...payload, id }
  })

export const deleteVehicleUnit = (id) =>
  requestJson(UNIT_DELETE_PATH, {
    method: 'POST',
    body: { id }
  })

export const fetchVehicleTypes = (params = {}) =>
  requestJson(TYPE_INDEX_PATH, { params })

export const createVehicleType = (payload = {}) =>
  requestJson(TYPE_SAVE_PATH, {
    method: 'POST',
    body: payload
  })

export const updateVehicleType = (id, payload = {}) =>
  requestJson(TYPE_UPDATE_PATH, {
    method: 'POST',
    body: { ...payload, id }
  })

export const deleteVehicleType = (id) =>
  requestJson(TYPE_DELETE_PATH, {
    method: 'POST',
    body: { id }
  })

export const fetchVehicleFenceTree = (params = {}) =>
  requestJson(FENCE_TREE_PATH, { params })

export const fetchVehicleFence = (id) =>
  requestJson(FENCE_READ_PATH, { params: { id } })

export const fetchVehicleWorkTypes = (params = {}) =>
  requestJson(WORK_TYPE_INDEX_PATH, { params })

export const fetchVehicleWorkType = (id) =>
  requestJson(WORK_TYPE_READ_PATH, { params: { id } })

export const createVehicleWorkType = (payload = {}) =>
  requestJson(WORK_TYPE_SAVE_PATH, {
    method: 'POST',
    body: payload
  })

export const updateVehicleWorkType = (id, payload = {}) =>
  requestJson(WORK_TYPE_UPDATE_PATH, {
    method: 'POST',
    body: { ...payload, id }
  })

export const deleteVehicleWorkType = (id) =>
  requestJson(WORK_TYPE_DELETE_PATH, {
    method: 'POST',
    body: { id }
  })

export const fetchPermissionGroups = () =>
  requestJson(PERMISSION_GROUP_INDEX_PATH)

export const fetchDeviceBindings = (params = {}) =>
  requestJson(DEVICE_BINDING_INDEX_PATH, { params })

export default {
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
}
