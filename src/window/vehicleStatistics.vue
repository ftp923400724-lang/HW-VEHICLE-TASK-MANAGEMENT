<template>
  <el-drawer
    v-model="drawerVisible"
    title="车辆基本信息"
    size="1220px"
    direction="rtl"
    :close-on-click-modal="false"
    :append-to-body="true"
    class="vehicle-statistics-drawer"
    modal-class="vehicle-statistics-drawer-overlay"
    @closed="handleDrawerClosed"
  >
    <el-tabs v-model="activeTab" @tab-change="handleTabChange">
      <el-tab-pane label="车辆信息" name="vehicle">
        <div class="toolbar">
          <el-input
            v-model="vehicleQuery.keyword"
            placeholder="搜索车辆名称/车牌号/设备号"
            clearable
            style="width: 240px"
            @keyup.enter="searchVehicles"
          />
          <el-select
            v-model="vehicleQuery.unit_id"
            placeholder="车辆单位"
            clearable
            filterable
            style="width: 180px"
            :loading="dictLoading.units"
          >
            <el-option
              v-for="item in unitOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
          <el-select
            v-model="vehicleQuery.vehicle_type_id"
            placeholder="车辆类型"
            clearable
            filterable
            style="width: 180px"
            :loading="dictLoading.types"
          >
            <el-option
              v-for="item in typeOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
          <el-select v-model="vehicleQuery.status" placeholder="状态" clearable style="width: 120px">
            <el-option label="启用" :value="1" />
            <el-option label="停用" :value="0" />
          </el-select>
          <el-button type="primary" :loading="loading.vehicles" @click="searchVehicles">查询</el-button>
          <el-button :disabled="loading.vehicles" @click="resetVehicleQuery">重置</el-button>
          <div class="spacer" />
          <el-button type="primary" @click="openVehicleDialog()">新增车辆</el-button>
          <el-button :loading="loading.vehicles" @click="loadVehicles">刷新</el-button>
        </div>

        <el-table :data="vehicleList" v-loading="loading.vehicles" height="500" border>
          <el-table-column type="index" width="60" />
          <el-table-column prop="vehicle_name" label="车辆名称" min-width="160" show-overflow-tooltip />
          <el-table-column prop="license_plate" label="车牌号" min-width="120" show-overflow-tooltip />
          <el-table-column prop="device_no" label="设备号" min-width="160" show-overflow-tooltip />
          <el-table-column prop="unit_name" label="车辆单位" min-width="160" show-overflow-tooltip />
          <el-table-column prop="vehicle_type_name" label="车辆类型" min-width="160" show-overflow-tooltip />
          <el-table-column prop="sort" label="排序" width="80" align="center" />
          <el-table-column label="状态" width="90" align="center">
            <template #default="{ row }">
              <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">
                {{ row.status === 1 ? '启用' : '停用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="160" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openVehicleDialog(row)">编辑</el-button>
              <el-button link type="danger" @click="confirmDeleteVehicle(row)">删除</el-button>
            </template>
          </el-table-column>
          <el-table-column prop="updated_at" label="更新时间" width="170" show-overflow-tooltip />
        </el-table>

        <div class="pagination">
          <el-pagination
            background
            layout="total, sizes, prev, pager, next"
            :page-sizes="[10, 20, 50]"
            :page-size="vehicleQuery.pageSize"
            :current-page="vehicleQuery.page"
            :total="vehicleTotal"
            @current-change="handleVehiclePageChange"
            @size-change="handleVehicleSizeChange"
          />
        </div>
      </el-tab-pane>

      <el-tab-pane label="车辆类型" name="type">
        <div class="toolbar">
          <el-input
            v-model="typeQuery.keyword"
            placeholder="搜索类型名称/编码"
            clearable
            style="width: 260px"
            @keyup.enter="searchTypes"
          />
          <el-select v-model="typeQuery.status" placeholder="状态" clearable style="width: 120px">
            <el-option label="启用" :value="1" />
            <el-option label="停用" :value="0" />
          </el-select>
          <el-button type="primary" :loading="loading.types" @click="searchTypes">查询</el-button>
          <el-button :disabled="loading.types" @click="resetTypeQuery">重置</el-button>
          <div class="spacer" />
          <el-button type="primary" @click="openTypeDialog()">新增类型</el-button>
          <el-button :loading="loading.types" @click="loadTypes">刷新</el-button>
        </div>

        <el-table :data="typeList" v-loading="loading.types" height="500" border>
          <el-table-column type="index" width="60" />
          <el-table-column prop="name" label="类型名称" min-width="180" show-overflow-tooltip />
          <el-table-column prop="code" label="类型编码" min-width="140" show-overflow-tooltip />
          <el-table-column prop="sort" label="排序" width="90" align="center" />
          <el-table-column label="状态" width="90" align="center">
            <template #default="{ row }">
              <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">
                {{ row.status === 1 ? '启用' : '停用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="remark" label="备注" min-width="180" show-overflow-tooltip />
          <el-table-column label="操作" width="160" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openTypeDialog(row)">编辑</el-button>
              <el-button link type="danger" @click="confirmDeleteType(row)">删除</el-button>
            </template>
          </el-table-column>
          <el-table-column prop="updated_at" label="更新时间" width="170" show-overflow-tooltip />
        </el-table>

        <div class="pagination">
          <el-pagination
            background
            layout="total, sizes, prev, pager, next"
            :page-sizes="[10, 20, 50]"
            :page-size="typeQuery.pageSize"
            :current-page="typeQuery.page"
            :total="typeTotal"
            @current-change="handleTypePageChange"
            @size-change="handleTypeSizeChange"
          />
        </div>
      </el-tab-pane>

      <el-tab-pane label="车辆单位" name="unit">
        <div class="toolbar">
          <el-input
            v-model="unitQuery.keyword"
            placeholder="搜索单位名称"
            clearable
            style="width: 260px"
            @keyup.enter="searchUnits"
          />
          <el-select v-model="unitQuery.status" placeholder="状态" clearable style="width: 120px">
            <el-option label="启用" :value="1" />
            <el-option label="停用" :value="0" />
          </el-select>
          <el-button type="primary" :loading="loading.units" @click="searchUnits">查询</el-button>
          <el-button :disabled="loading.units" @click="resetUnitQuery">重置</el-button>
          <div class="spacer" />
          <el-button type="primary" @click="openUnitDialog()">新增单位</el-button>
          <el-button :loading="loading.units" @click="loadUnits">刷新</el-button>
        </div>

        <el-table :data="unitList" v-loading="loading.units" height="500" border>
          <el-table-column type="index" width="60" />
          <el-table-column prop="name" label="单位名称" min-width="180" show-overflow-tooltip />
          <el-table-column prop="parent_name" label="上级单位" min-width="160" show-overflow-tooltip />
          <el-table-column prop="sort" label="排序" width="90" align="center" />
          <el-table-column label="状态" width="90" align="center">
            <template #default="{ row }">
              <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">
                {{ row.status === 1 ? '启用' : '停用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="remark" label="备注" min-width="180" show-overflow-tooltip />
          <el-table-column label="操作" width="160" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openUnitDialog(row)">编辑</el-button>
              <el-button link type="danger" @click="confirmDeleteUnit(row)">删除</el-button>
            </template>
          </el-table-column>
          <el-table-column prop="updated_at" label="更新时间" width="170" show-overflow-tooltip />
        </el-table>

        <div class="pagination">
          <el-pagination
            background
            layout="total, sizes, prev, pager, next"
            :page-sizes="[10, 20, 50]"
            :page-size="unitQuery.pageSize"
            :current-page="unitQuery.page"
            :total="unitTotal"
            @current-change="handleUnitPageChange"
            @size-change="handleUnitSizeChange"
          />
        </div>
      </el-tab-pane>
    </el-tabs>

    <el-dialog
      v-model="vehicleDialogVisible"
      :title="vehicleEditingId ? '编辑车辆' : '新增车辆'"
      width="640px"
      :append-to-body="true"
      @closed="resetVehicleDialog"
    >
      <el-form ref="vehicleFormRef" :model="vehicleForm" :rules="vehicleRules" label-width="110px">
        <el-form-item label="车辆名称" prop="vehicle_name">
          <el-input v-model.trim="vehicleForm.vehicle_name" placeholder="请输入车辆名称" />
        </el-form-item>
        <el-form-item label="车牌号" prop="license_plate">
          <el-input v-model.trim="vehicleForm.license_plate" placeholder="请输入车牌号" />
        </el-form-item>
        <el-form-item label="设备号" prop="device_no">
          <el-select
            v-model="vehicleForm.device_no"
            placeholder="请选择设备号"
            filterable
            clearable
            :loading="deviceLoading"
          >
            <el-option label="不绑定设备" value="" />
            <el-option v-for="item in deviceOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="车辆单位" prop="unit_id">
          <el-select v-model="vehicleForm.unit_id" placeholder="请选择车辆单位" filterable clearable>
            <el-option v-for="item in unitOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="车辆类型" prop="vehicle_type_id">
          <el-select v-model="vehicleForm.vehicle_type_id" placeholder="请选择车辆类型" filterable clearable>
            <el-option v-for="item in typeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="排序" prop="sort">
          <el-input-number v-model.number="vehicleForm.sort" :min="0" :max="999999" :step="1" />
        </el-form-item>
        <el-form-item label="司机姓名" prop="driver_name">
          <el-input v-model.trim="vehicleForm.driver_name" placeholder="可选" />
        </el-form-item>
        <el-form-item label="联系方式" prop="driver_phone">
          <el-input v-model.trim="vehicleForm.driver_phone" placeholder="手机号 / 座机" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="vehicleForm.status" placeholder="请选择状态">
            <el-option label="启用" :value="1" />
            <el-option label="停用" :value="0" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model.trim="vehicleForm.remark" type="textarea" :rows="2" placeholder="备注信息" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="vehicleDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="vehicleSubmitting" @click="submitVehicle">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="typeDialogVisible"
      :title="typeEditingId ? '编辑车辆类型' : '新增车辆类型'"
      width="520px"
      :append-to-body="true"
      @closed="resetTypeDialog"
    >
      <el-form ref="typeFormRef" :model="typeForm" :rules="typeRules" label-width="100px">
        <el-form-item label="类型名称" prop="name">
          <el-input v-model.trim="typeForm.name" maxlength="100" placeholder="请输入类型名称" />
        </el-form-item>
        <el-form-item label="类型编码" prop="code">
          <el-input v-model.trim="typeForm.code" maxlength="64" placeholder="字母/数字/下划线/中划线" />
        </el-form-item>
        <el-form-item label="排序" prop="sort">
          <el-input-number v-model.number="typeForm.sort" :min="0" :step="1" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="typeForm.status" placeholder="请选择状态">
            <el-option label="启用" :value="1" />
            <el-option label="停用" :value="0" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model.trim="typeForm.remark" type="textarea" :rows="3" maxlength="255" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="typeDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="typeSubmitting" @click="submitType">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="unitDialogVisible"
      :title="unitEditingId ? '编辑车辆单位' : '新增车辆单位'"
      width="520px"
      :append-to-body="true"
      @closed="resetUnitDialog"
    >
      <el-form ref="unitFormRef" :model="unitForm" :rules="unitRules" label-width="100px">
        <el-form-item label="单位名称" prop="name">
          <el-input v-model.trim="unitForm.name" maxlength="128" placeholder="请输入单位名称" />
        </el-form-item>
        <el-form-item label="上级单位" prop="parent_id">
          <el-select v-model="unitForm.parent_id" filterable clearable placeholder="可选">
            <el-option
              v-for="item in parentUnitOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="排序" prop="sort">
          <el-input-number v-model.number="unitForm.sort" :min="0" :step="1" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="unitForm.status" placeholder="请选择状态">
            <el-option label="启用" :value="1" />
            <el-option label="停用" :value="0" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model.trim="unitForm.remark" type="textarea" :rows="3" maxlength="255" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="unitDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="unitSubmitting" @click="submitUnit">保存</el-button>
      </template>
    </el-dialog>
  </el-drawer>
</template>

<script>
import { ElMessage, ElMessageBox } from 'element-plus'
import { normalizeListResult } from '@/api/http'
import {
  fetchVehicleList,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  fetchVehicleTypes,
  createVehicleType,
  updateVehicleType,
  deleteVehicleType,
  fetchVehicleUnits,
  createVehicleUnit,
  updateVehicleUnit,
  deleteVehicleUnit,
  fetchPermissionGroups,
  fetchDeviceBindings
} from '@/api/vehicle'

export default {
  name: 'VehicleStatisticsWindow',
  props: {
    visible: {
      type: Boolean,
      default: false,
      required: true
    }
  },
  emits: ['update:visible'],
  data() {
    return {
      activeTab: 'vehicle',
      loading: {
        vehicles: false,
        types: false,
        units: false
      },
      dictLoading: {
        types: false,
        units: false
      },

      vehicleList: [],
      vehicleTotal: 0,
      vehicleQuery: {
        keyword: '',
        unit_id: '',
        vehicle_type_id: '',
        status: '',
        page: 1,
        pageSize: 10
      },

      typeList: [],
      typeTotal: 0,
      typeQuery: {
        keyword: '',
        status: '',
        page: 1,
        pageSize: 10
      },

      unitList: [],
      unitTotal: 0,
      unitQuery: {
        keyword: '',
        status: '',
        page: 1,
        pageSize: 10
      },

      unitOptions: [],
      typeOptions: [],

      permissionGroupId: null,
      deviceOptions: [],
      deviceLoading: false,

      vehicleDialogVisible: false,
      vehicleSubmitting: false,
      vehicleEditingId: null,
      vehicleForm: this.getDefaultVehicle(),
      vehicleRules: {
        vehicle_name: [
          { required: true, message: '请输入车辆名称', trigger: 'blur' },
          { min: 2, max: 50, message: '长度限制 2~50 个字符', trigger: 'blur' }
        ],
        license_plate: [{ required: true, message: '请输入车牌号', trigger: 'blur' }],
        unit_id: [{ required: true, message: '请选择车辆单位', trigger: 'change' }],
        vehicle_type_id: [{ required: true, message: '请选择车辆类型', trigger: 'change' }],
        sort: [{ type: 'number', min: 0, message: '排序值需为非负整数', trigger: 'change' }],
        driver_phone: [{ pattern: /^$|^[0-9+-]{6,20}$/, message: '联系方式格式不正确', trigger: 'blur' }]
      },

      typeDialogVisible: false,
      typeSubmitting: false,
      typeEditingId: null,
      typeForm: this.getDefaultType(),
      typeRules: {
        name: [{ required: true, message: '请输入类型名称', trigger: 'blur' }],
        code: [
          { required: true, message: '请输入类型编码', trigger: 'blur' },
          { pattern: /^[A-Za-z0-9_-]+$/, message: '仅支持字母、数字、下划线和中划线', trigger: 'blur' }
        ]
      },

      unitDialogVisible: false,
      unitSubmitting: false,
      unitEditingId: null,
      unitForm: this.getDefaultUnit(),
      unitRules: {
        name: [{ required: true, message: '请输入单位名称', trigger: 'blur' }]
      }
    }
  },
  computed: {
    drawerVisible: {
      get() {
        return this.visible
      },
      set(val) {
        this.$emit('update:visible', val)
      }
    },
    parentUnitOptions() {
      return this.unitOptions.filter((item) => item.value !== this.unitEditingId)
    }
  },
  watch: {
    visible(val) {
      if (!val) return
      this.ensureDictOptions()
      this.loadCurrentTab()
    }
  },
  methods: {
    handleDrawerClosed() {
      this.activeTab = 'vehicle'
      this.vehicleDialogVisible = false
      this.typeDialogVisible = false
      this.unitDialogVisible = false
    },
    handleTabChange() {
      this.loadCurrentTab()
    },
    loadCurrentTab() {
      if (this.activeTab === 'vehicle') {
        this.loadVehicles()
      } else if (this.activeTab === 'type') {
        this.loadTypes()
      } else if (this.activeTab === 'unit') {
        this.loadUnits()
      }
    },
    getId(item) {
      return item?.id ?? item?.vehicle_id ?? item?.vehicleTypeId ?? item?.vehicleUnitId ?? null
    },

    getDefaultVehicle() {
      return {
        vehicle_name: '',
        license_plate: '',
        device_no: '',
        unit_id: '',
        vehicle_type_id: '',
        sort: 0,
        driver_name: '',
        driver_phone: '',
        status: 1,
        remark: ''
      }
    },
    getDefaultType() {
      return {
        name: '',
        code: '',
        sort: 0,
        status: 1,
        remark: ''
      }
    },
    getDefaultUnit() {
      return {
        name: '',
        parent_id: '',
        sort: 0,
        status: 1,
        remark: ''
      }
    },
    async ensureDictOptions(force = false) {
      await Promise.all([this.loadTypeOptions(force), this.loadUnitOptions(force)])
    },
    async loadTypeOptions(force = false) {
      if (!force && this.typeOptions.length) return
      this.dictLoading.types = true
      try {
        const payload = await fetchVehicleTypes({ page: 1, page_size: 500, pageSize: 500 })
        const { list } = normalizeListResult(payload)
        this.typeOptions = (list || []).map((item) => ({
          value: item.id ?? item.type_id ?? item.value,
          label: item.name ?? item.type_name ?? item.vehicle_type_name ?? item.label ?? item.code ?? `类型${item.id ?? ''}`
        }))
      } catch (error) {
        ElMessage.error(error?.message || '加载车辆类型失败')
      } finally {
        this.dictLoading.types = false
      }
    },
    async loadUnitOptions(force = false) {
      if (!force && this.unitOptions.length) return
      this.dictLoading.units = true
      try {
        const payload = await fetchVehicleUnits({ page: 1, page_size: 500, pageSize: 500 })
        const { list } = normalizeListResult(payload)
        this.unitOptions = (list || []).map((item) => ({
          value: item.id ?? item.unit_id ?? item.value,
          label: item.name ?? item.unit_name ?? item.label ?? item.unit_code ?? `单位${item.id ?? ''}`
        }))
      } catch (error) {
        ElMessage.error(error?.message || '加载车辆单位失败')
      } finally {
        this.dictLoading.units = false
      }
    },

    normalizeVehicle(item) {
      return {
        id: item?.id ?? item?.vehicle_id ?? item?.vehicleId,
        vehicle_name: item?.vehicle_name ?? item?.vehicleName ?? item?.name ?? '',
        license_plate: item?.license_plate ?? item?.licensePlate ?? '',
        device_no: item?.device_no ?? item?.deviceNo ?? '',
        unit_id: item?.unit_id ?? item?.unitId ?? item?.unit?.id ?? '',
        unit_name: item?.unit_name ?? item?.unitName ?? item?.unit?.name ?? '',
        vehicle_type_id: item?.vehicle_type_id ?? item?.vehicleTypeId ?? item?.vehicle_type?.id ?? '',
        vehicle_type_name:
          item?.vehicle_type_name ??
          item?.vehicleTypeName ??
          item?.vehicle_type?.name ??
          item?.type_name ??
          item?.typeName ??
          '',
        sort: Number(item?.sort ?? item?.sort_order ?? 0),
        driver_name: item?.driver_name ?? item?.driverName ?? '',
        driver_phone: item?.driver_phone ?? item?.driverPhone ?? '',
        status: Number(item?.status ?? item?.enable_status ?? 1),
        remark: item?.remark ?? '',
        updated_at: item?.updated_at ?? item?.update_time ?? item?.updatedAt ?? item?.updatedTime ?? ''
      }
    },
    normalizeType(item) {
      return {
        id: item?.id ?? item?.type_id ?? item?.vehicle_type_id,
        name: item?.name ?? item?.type_name ?? item?.vehicle_type_name ?? '',
        code: item?.code ?? item?.type_code ?? '',
        sort: Number(item?.sort ?? item?.sort_order ?? 0),
        status: Number(item?.status ?? 1),
        remark: item?.remark ?? '',
        updated_at: item?.updated_at ?? item?.update_time ?? item?.updatedAt ?? ''
      }
    },
    normalizeUnit(item) {
      const id = item?.id ?? item?.unit_id
      const parentId = item?.parent_id ?? item?.pid ?? 0
      const parent = this.unitOptions.find((option) => Number(option.value) === Number(parentId))
      return {
        id,
        name: item?.name ?? item?.unit_name ?? '',
        parent_id: parentId,
        parent_name: item?.parent_name ?? parent?.label ?? '',
        sort: Number(item?.sort ?? item?.sort_order ?? 0),
        status: Number(item?.status ?? 1),
        remark: item?.remark ?? '',
        updated_at: item?.updated_at ?? item?.update_time ?? item?.updatedAt ?? ''
      }
    },

    async loadVehicles() {
      if (!this.drawerVisible) return
      this.loading.vehicles = true
      try {
        const params = {
          keyword: this.vehicleQuery.keyword || undefined,
          unit_id: this.vehicleQuery.unit_id || undefined,
          vehicle_type_id: this.vehicleQuery.vehicle_type_id || undefined,
          status: this.vehicleQuery.status === '' ? undefined : this.vehicleQuery.status,
          page: this.vehicleQuery.page,
          page_size: this.vehicleQuery.pageSize,
          pageSize: this.vehicleQuery.pageSize
        }
        const payload = await fetchVehicleList(params)
        const { list, total } = normalizeListResult(payload)
        this.vehicleList = (list || []).map((item) => this.normalizeVehicle(item))
        this.vehicleTotal = Number(total || this.vehicleList.length)
      } catch (error) {
        ElMessage.error(error?.message || '加载车辆列表失败')
      } finally {
        this.loading.vehicles = false
      }
    },
    searchVehicles() {
      this.vehicleQuery.page = 1
      this.loadVehicles()
    },
    resetVehicleQuery() {
      this.vehicleQuery = {
        keyword: '',
        unit_id: '',
        vehicle_type_id: '',
        status: '',
        page: 1,
        pageSize: 10
      }
      this.loadVehicles()
    },
    handleVehiclePageChange(page) {
      this.vehicleQuery.page = page
      this.loadVehicles()
    },
    handleVehicleSizeChange(size) {
      this.vehicleQuery.pageSize = size
      this.vehicleQuery.page = 1
      this.loadVehicles()
    },
    async openVehicleDialog(row) {
      await this.ensureDictOptions()
      this.vehicleDialogVisible = true
      if (row?.id) {
        this.vehicleEditingId = row.id
        this.vehicleForm = {
          ...this.getDefaultVehicle(),
          ...row
        }
      } else {
        this.vehicleEditingId = null
        this.vehicleForm = this.getDefaultVehicle()
      }
      this.loadDeviceOptions(true)
    },
    resetVehicleDialog() {
      this.vehicleForm = this.getDefaultVehicle()
      this.vehicleEditingId = null
      this.vehicleSubmitting = false
      this.$nextTick(() => this.$refs.vehicleFormRef?.clearValidate?.())
    },
    async submitVehicle() {
      const formRef = this.$refs.vehicleFormRef
      if (!formRef) return
      formRef.validate(async (valid) => {
        if (!valid) return
        this.vehicleSubmitting = true
        try {
          if (this.vehicleEditingId) {
            await updateVehicle(this.vehicleEditingId, this.vehicleForm)
            ElMessage.success('编辑车辆成功')
          } else {
            await createVehicle(this.vehicleForm)
            ElMessage.success('新增车辆成功')
          }
          this.vehicleDialogVisible = false
          this.loadVehicles()
        } catch (error) {
          ElMessage.error(error?.message || '保存车辆失败')
        } finally {
          this.vehicleSubmitting = false
        }
      })
    },
    async confirmDeleteVehicle(row) {
      if (!row?.id) return
      try {
        await ElMessageBox.confirm(`确认删除车辆“${row.vehicle_name || row.license_plate || ''}”？`, '删除提示', {
          type: 'warning',
          confirmButtonText: '删除',
          cancelButtonText: '取消'
        })
      } catch {
        return
      }
      try {
        await deleteVehicle(row.id)
        ElMessage.success('删除成功')
        this.loadVehicles()
      } catch (error) {
        ElMessage.error(error?.message || '删除车辆失败')
      }
    },

    async loadTypes() {
      if (!this.drawerVisible) return
      this.loading.types = true
      try {
        const params = {
          keyword: this.typeQuery.keyword || undefined,
          status: this.typeQuery.status === '' ? undefined : this.typeQuery.status,
          page: this.typeQuery.page,
          page_size: this.typeQuery.pageSize,
          pageSize: this.typeQuery.pageSize
        }
        const payload = await fetchVehicleTypes(params)
        const { list, total } = normalizeListResult(payload)
        this.typeList = (list || []).map((item) => this.normalizeType(item))
        this.typeTotal = Number(total || this.typeList.length)
      } catch (error) {
        ElMessage.error(error?.message || '加载车辆类型失败')
      } finally {
        this.loading.types = false
      }
    },
    searchTypes() {
      this.typeQuery.page = 1
      this.loadTypes()
    },
    resetTypeQuery() {
      this.typeQuery = {
        keyword: '',
        status: '',
        page: 1,
        pageSize: 10
      }
      this.loadTypes()
    },
    handleTypePageChange(page) {
      this.typeQuery.page = page
      this.loadTypes()
    },
    handleTypeSizeChange(size) {
      this.typeQuery.pageSize = size
      this.typeQuery.page = 1
      this.loadTypes()
    },
    openTypeDialog(row) {
      this.typeDialogVisible = true
      if (row?.id) {
        this.typeEditingId = row.id
        this.typeForm = {
          ...this.getDefaultType(),
          ...row
        }
      } else {
        this.typeEditingId = null
        this.typeForm = this.getDefaultType()
      }
    },
    resetTypeDialog() {
      this.typeForm = this.getDefaultType()
      this.typeEditingId = null
      this.typeSubmitting = false
      this.$nextTick(() => this.$refs.typeFormRef?.clearValidate?.())
    },
    submitType() {
      const formRef = this.$refs.typeFormRef
      if (!formRef) return
      formRef.validate(async (valid) => {
        if (!valid) return
        this.typeSubmitting = true
        try {
          const payload = {
            name: this.typeForm.name,
            code: this.typeForm.code,
            sort: Number(this.typeForm.sort || 0),
            status: Number(this.typeForm.status ?? 1),
            remark: this.typeForm.remark || ''
          }
          if (this.typeEditingId) {
            await updateVehicleType(this.typeEditingId, payload)
            ElMessage.success('编辑车辆类型成功')
          } else {
            await createVehicleType(payload)
            ElMessage.success('新增车辆类型成功')
          }
          this.typeDialogVisible = false
          this.loadTypes()
          this.loadTypeOptions(true)
        } catch (error) {
          ElMessage.error(error?.message || '保存车辆类型失败')
        } finally {
          this.typeSubmitting = false
        }
      })
    },
    async confirmDeleteType(row) {
      if (!row?.id) return
      try {
        await ElMessageBox.confirm(`确认删除车辆类型“${row.name || ''}”？`, '删除提示', {
          type: 'warning',
          confirmButtonText: '删除',
          cancelButtonText: '取消'
        })
      } catch {
        return
      }
      try {
        await deleteVehicleType(row.id)
        ElMessage.success('删除成功')
        this.loadTypes()
        this.loadTypeOptions(true)
      } catch (error) {
        ElMessage.error(error?.message || '删除车辆类型失败')
      }
    },

    async loadUnits() {
      if (!this.drawerVisible) return
      this.loading.units = true
      try {
        await this.loadUnitOptions(true)
        const params = {
          keyword: this.unitQuery.keyword || undefined,
          status: this.unitQuery.status === '' ? undefined : this.unitQuery.status,
          page: this.unitQuery.page,
          page_size: this.unitQuery.pageSize,
          pageSize: this.unitQuery.pageSize
        }
        const payload = await fetchVehicleUnits(params)
        const { list, total } = normalizeListResult(payload)
        this.unitList = (list || []).map((item) => this.normalizeUnit(item))
        this.unitTotal = Number(total || this.unitList.length)
      } catch (error) {
        ElMessage.error(error?.message || '加载车辆单位失败')
      } finally {
        this.loading.units = false
      }
    },
    searchUnits() {
      this.unitQuery.page = 1
      this.loadUnits()
    },
    resetUnitQuery() {
      this.unitQuery = {
        keyword: '',
        status: '',
        page: 1,
        pageSize: 10
      }
      this.loadUnits()
    },
    handleUnitPageChange(page) {
      this.unitQuery.page = page
      this.loadUnits()
    },
    handleUnitSizeChange(size) {
      this.unitQuery.pageSize = size
      this.unitQuery.page = 1
      this.loadUnits()
    },
    async openUnitDialog(row) {
      await this.loadUnitOptions(true)
      this.unitDialogVisible = true
      if (row?.id) {
        this.unitEditingId = row.id
        this.unitForm = {
          ...this.getDefaultUnit(),
          ...row
        }
      } else {
        this.unitEditingId = null
        this.unitForm = this.getDefaultUnit()
      }
    },
    resetUnitDialog() {
      this.unitForm = this.getDefaultUnit()
      this.unitEditingId = null
      this.unitSubmitting = false
      this.$nextTick(() => this.$refs.unitFormRef?.clearValidate?.())
    },
    submitUnit() {
      const formRef = this.$refs.unitFormRef
      if (!formRef) return
      formRef.validate(async (valid) => {
        if (!valid) return
        this.unitSubmitting = true
        try {
          const payload = {
            name: this.unitForm.name,
            parent_id: this.unitForm.parent_id || 0,
            sort: Number(this.unitForm.sort || 0),
            status: Number(this.unitForm.status ?? 1),
            remark: this.unitForm.remark || ''
          }
          if (this.unitEditingId) {
            await updateVehicleUnit(this.unitEditingId, payload)
            ElMessage.success('编辑车辆单位成功')
          } else {
            await createVehicleUnit(payload)
            ElMessage.success('新增车辆单位成功')
          }
          this.unitDialogVisible = false
          this.loadUnits()
          this.loadUnitOptions(true)
        } catch (error) {
          ElMessage.error(error?.message || '保存车辆单位失败')
        } finally {
          this.unitSubmitting = false
        }
      })
    },
    async confirmDeleteUnit(row) {
      if (!row?.id) return
      try {
        await ElMessageBox.confirm(`确认删除车辆单位“${row.name || ''}”？`, '删除提示', {
          type: 'warning',
          confirmButtonText: '删除',
          cancelButtonText: '取消'
        })
      } catch {
        return
      }
      try {
        await deleteVehicleUnit(row.id)
        ElMessage.success('删除成功')
        this.loadUnits()
        this.loadUnitOptions(true)
      } catch (error) {
        ElMessage.error(error?.message || '删除车辆单位失败')
      }
    },

    async loadPermissionGroups() {
      if (this.permissionGroupId) return
      try {
        const payload = await fetchPermissionGroups()
        const { list } = normalizeListResult(payload)
        const first = (list || [])[0]
        const rawId = first?.id ?? first?.permission_group_id ?? first?.value ?? null
        this.permissionGroupId = rawId ? Number(rawId) || null : null
      } catch {
        this.permissionGroupId = null
      }
    },
    async loadDeviceOptions(force = false) {
      if (!force && this.deviceOptions.length) return
      await this.loadPermissionGroups()
      if (!this.permissionGroupId) {
        this.deviceOptions = []
        return
      }
      this.deviceLoading = true
      try {
        const payload = await fetchDeviceBindings({
          page: 1,
          page_size: 500,
          pageSize: 500,
          bind_id: this.permissionGroupId,
          bindId: this.permissionGroupId
        })
        const { list } = normalizeListResult(payload)
        const groupId = Number(this.permissionGroupId)
        this.deviceOptions = (list || [])
          .filter((item) => Number(item?.bind_id ?? item?.bindId ?? 0) === groupId)
          .map((item) => {
            const deviceNo = String(
              item?.device_no ?? item?.device?.device_no ?? item?.device?.uuid ?? item?.device?.hardware_id ?? ''
            ).trim()
            if (!deviceNo) return null
            const statusText = item?.is_active === 1 ? '已绑定' : '已停用'
            return { value: deviceNo, label: `${deviceNo}（${statusText}）` }
          })
          .filter(Boolean)
      } catch {
        this.deviceOptions = []
      } finally {
        this.deviceLoading = false
      }
    }
  }
}
</script>

<style>
.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.spacer {
  flex: 1;
}

.pagination {
  margin-top: 12px;
  text-align: right;
}

.vehicle-statistics-drawer-overlay {
  background: rgba(2, 10, 24, 0.66);
  backdrop-filter: blur(2px);
}

.vehicle-statistics-drawer {
  background: linear-gradient(160deg, #081525 0%, #0b1c31 52%, #102743 100%) !important;
  border-left: 1px solid rgba(100, 181, 246, 0.22);
  box-shadow: -16px 0 40px rgba(0, 0, 0, 0.45);
}

.vehicle-statistics-drawer-overlay .el-drawer {
  background: linear-gradient(160deg, #081525 0%, #0b1c31 52%, #102743 100%);
  border-left: 1px solid rgba(100, 181, 246, 0.22);
  box-shadow: -16px 0 40px rgba(0, 0, 0, 0.45);
}

.vehicle-statistics-drawer .el-drawer__header,
.vehicle-statistics-drawer-overlay .el-drawer__header {
  margin-bottom: 0;
  padding: 18px 20px;
  border-bottom: 1px solid rgba(129, 212, 250, 0.2);
}

.vehicle-statistics-drawer .el-drawer__title,
.vehicle-statistics-drawer-overlay .el-drawer__title {
  color: #d7ecff;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 1px;
}

.vehicle-statistics-drawer .el-drawer__headerbtn .el-drawer__close-btn,
.vehicle-statistics-drawer-overlay .el-drawer__headerbtn .el-drawer__close-btn {
  color: #b6d4f2;
}

.vehicle-statistics-drawer .el-drawer__body,
.vehicle-statistics-drawer-overlay .el-drawer__body {
  padding: 14px 16px 18px;
  color: #d5e8ff;
}

.vehicle-statistics-drawer .el-tabs__header,
.vehicle-statistics-drawer-overlay .el-tabs__header {
  margin-bottom: 12px;
}

.vehicle-statistics-drawer .el-tabs__nav-wrap::after,
.vehicle-statistics-drawer-overlay .el-tabs__nav-wrap::after {
  background-color: rgba(148, 182, 216, 0.2);
}

.vehicle-statistics-drawer .el-tabs__item,
.vehicle-statistics-drawer-overlay .el-tabs__item {
  color: #8cb3d7;
}

.vehicle-statistics-drawer .el-tabs__item.is-active,
.vehicle-statistics-drawer-overlay .el-tabs__item.is-active {
  color: #7fd8ff;
}

.vehicle-statistics-drawer .el-tabs__active-bar,
.vehicle-statistics-drawer-overlay .el-tabs__active-bar {
  background: linear-gradient(90deg, #42a5f5, #7fd8ff);
}

.vehicle-statistics-drawer .el-input__wrapper,
.vehicle-statistics-drawer .el-textarea__inner,
.vehicle-statistics-drawer .el-select__wrapper,
.vehicle-statistics-drawer-overlay .el-input__wrapper,
.vehicle-statistics-drawer-overlay .el-textarea__inner,
.vehicle-statistics-drawer-overlay .el-select__wrapper {
  background: #10263f;
  box-shadow: 0 0 0 1px rgba(115, 170, 223, 0.22) inset;
  color: #d9ecff;
}

.vehicle-statistics-drawer .el-input__inner,
.vehicle-statistics-drawer .el-textarea__inner,
.vehicle-statistics-drawer-overlay .el-input__inner,
.vehicle-statistics-drawer-overlay .el-textarea__inner {
  color: #d9ecff;
}

.vehicle-statistics-drawer .el-input__inner::placeholder,
.vehicle-statistics-drawer .el-textarea__inner::placeholder,
.vehicle-statistics-drawer-overlay .el-input__inner::placeholder,
.vehicle-statistics-drawer-overlay .el-textarea__inner::placeholder {
  color: #86a8c8;
}

.vehicle-statistics-drawer .el-form-item__label,
.vehicle-statistics-drawer-overlay .el-form-item__label {
  color: #b9d6f2;
}

.vehicle-statistics-drawer .el-table,
.vehicle-statistics-drawer-overlay .el-table {
  --el-table-bg-color: #0f233a;
  --el-table-tr-bg-color: #0f233a;
  --el-table-header-bg-color: #112c48;
  --el-table-text-color: #d1e8ff;
  --el-table-header-text-color: #8fc8f5;
  --el-table-border-color: rgba(134, 175, 216, 0.2);
  --el-table-row-hover-bg-color: #193651;
}

.vehicle-statistics-drawer .el-table .el-table__cell,
.vehicle-statistics-drawer-overlay .el-table .el-table__cell {
  background: transparent;
}

.vehicle-statistics-drawer .el-pagination,
.vehicle-statistics-drawer-overlay .el-pagination {
  --el-pagination-bg-color: transparent;
  --el-pagination-text-color: #9ec4e7;
  --el-pagination-button-color: #9ec4e7;
}

.vehicle-statistics-drawer .el-pagination .btn-prev,
.vehicle-statistics-drawer .el-pagination .btn-next,
.vehicle-statistics-drawer .el-pagination .el-pager li,
.vehicle-statistics-drawer-overlay .el-pagination .btn-prev,
.vehicle-statistics-drawer-overlay .el-pagination .btn-next,
.vehicle-statistics-drawer-overlay .el-pagination .el-pager li {
  background: #102a44;
  color: #9ec4e7;
  border: 1px solid rgba(126, 170, 214, 0.2);
}

.vehicle-statistics-drawer .el-pagination .el-pager li.is-active,
.vehicle-statistics-drawer-overlay .el-pagination .el-pager li.is-active {
  background: #1d4d75;
  color: #d9f3ff;
}

.vehicle-statistics-drawer .el-dialog,
.vehicle-statistics-drawer-overlay .el-dialog {
  background: #10243c;
  border: 1px solid rgba(122, 170, 215, 0.26);
}

.vehicle-statistics-drawer .el-dialog__title,
.vehicle-statistics-drawer-overlay .el-dialog__title {
  color: #d9ecff;
}

.vehicle-statistics-drawer .el-dialog__header,
.vehicle-statistics-drawer-overlay .el-dialog__header {
  border-bottom: 1px solid rgba(122, 170, 215, 0.2);
  margin-right: 0;
}

.vehicle-statistics-drawer .el-dialog__body,
.vehicle-statistics-drawer .el-dialog__footer,
.vehicle-statistics-drawer-overlay .el-dialog__body,
.vehicle-statistics-drawer-overlay .el-dialog__footer {
  color: #cfe4fa;
}
</style>
