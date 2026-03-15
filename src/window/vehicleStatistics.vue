<template>
  <el-dialog v-model="dialogVisible" title="车辆统计" width="1100px" :close-on-click-modal="false" :append-to-body="true"
    @closed="handleDialogClosed">
    <div class="toolbar">
      <el-input v-model="query.keyword" placeholder="搜索车辆名称/车牌号/设备号" clearable style="width: 240px"
        @keyup.enter="handleSearch" />
      <el-select v-model="query.unit_id" placeholder="车辆单位" clearable filterable style="width: 180px"
        :loading="unitLoading">
        <el-option v-for="item in unitOptions" :key="item.value" :label="item.label" :value="item.value" />
      </el-select>
      <el-select v-model="query.vehicle_type_id" placeholder="车辆类型" clearable filterable style="width: 180px"
        :loading="typeLoading">
        <el-option v-for="item in typeOptions" :key="item.value" :label="item.label" :value="item.value" />
      </el-select>
      <el-select v-model="query.status" placeholder="状态" clearable style="width: 120px">
        <el-option label="启用" :value="1" />
        <el-option label="停用" :value="0" />
      </el-select>
      <el-button type="primary" @click="handleSearch" :loading="loading">查询</el-button>
      <el-button @click="resetQuery" :disabled="loading">重置</el-button>
      <div class="spacer"></div>
      <el-button type="primary" @click="openVehicleDialog">新增车辆</el-button>
      <el-button @click="loadVehicles" :loading="loading">刷新</el-button>
    </div>

    <el-table :data="list" v-loading="loading" height="520" border>
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
          <el-button link type="danger" @click="confirmDelete(row)">删除</el-button>
        </template>
      </el-table-column>
      <el-table-column prop="updated_at" label="更新时间" width="170" show-overflow-tooltip />
    </el-table>

    <div class="pagination">
      <el-pagination background layout="total, sizes, prev, pager, next" :page-sizes="[10, 20, 50]"
        :page-size="query.pageSize" :current-page="query.page" :total="total" @current-change="handlePageChange"
        @size-change="handleSizeChange" />
    </div>

    <el-dialog v-model="vehicleDialogVisible" :title="vehicleDialogTitle" width="640px" :append-to-body="true"
      @closed="resetVehicleDialog">
      <el-form ref="vehicleFormRef" :model="vehicleForm" :rules="vehicleRules" label-width="110px">
        <el-form-item label="车辆名称" prop="vehicle_name">
          <el-input v-model.trim="vehicleForm.vehicle_name" placeholder="请输入车辆名称" />
        </el-form-item>
        <el-form-item label="车牌号" prop="license_plate">
          <el-input v-model.trim="vehicleForm.license_plate" placeholder="请输入车牌号" />
        </el-form-item>
        <el-form-item label="设备号" prop="device_no">
          <el-select v-model="vehicleForm.device_no" placeholder="请选择设备号" filterable clearable :loading="deviceLoading"
            :disabled="deviceLoading && !deviceOptions.length">
            <el-option label="不绑定设备" value="" />
            <el-option v-for="item in deviceOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="车辆单位" prop="unit_id">
          <el-select v-model="vehicleForm.unit_id" placeholder="请选择车辆单位" filterable clearable :loading="unitLoading">
            <el-option v-for="item in unitOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="车辆类型" prop="vehicle_type_id">
          <el-select v-model="vehicleForm.vehicle_type_id" placeholder="请选择车辆类型" filterable clearable
            :loading="typeLoading">
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
  </el-dialog>
</template>

<script>
import { ElMessage, ElMessageBox } from 'element-plus'
import { normalizeListResult } from '@/api/http'
import {
  fetchVehicleList,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  fetchVehicleUnits,
  fetchVehicleTypes,
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
      list: [],
      total: 0,
      loading: false,
      unitLoading: false,
      typeLoading: false,
      unitOptions: [],
      typeOptions: [],
      deviceOptions: [],
      deviceLoading: false,
      permissionGroups: [],
      permissionGroupId: null,
      permissionGroupLoading: false,
      vehicleDialogVisible: false,
      vehicleSubmitting: false,
      editingId: null,
      vehicleForm: this.getDefaultVehicle(),
      vehicleRules: {
        vehicle_name: [
          { required: true, message: '请输入车辆名称', trigger: 'blur' },
          { min: 2, max: 50, message: '长度限制 2~50 个字符', trigger: 'blur' }
        ],
        license_plate: [{ required: true, message: '请输入车牌号', trigger: 'blur' }],
        device_no: [],
        unit_id: [{ required: true, message: '请选择车辆单位', trigger: 'change' }],
        vehicle_type_id: [{ required: true, message: '请选择车辆类型', trigger: 'change' }],
        sort: [
          { type: 'number', min: 0, message: '排序值需为非负整数', trigger: 'change' }
        ],
        driver_phone: [
          { pattern: /^$|^[0-9+-]{6,20}$/, message: '联系方式格式不正确', trigger: 'blur' }
        ]
      },
      query: {
        keyword: '',
        unit_id: '',
        vehicle_type_id: '',
        status: '',
        page: 1,
        pageSize: 10
      }
    }
  },
  computed: {
    vehicleDialogTitle() {
      return this.editingId ? '编辑车辆' : '新增车辆'
    },
    dialogVisible: {
      get() {
        return this.visible
      },
      set(val) {
        this.$emit('update:visible', val)
      }
    }
  },
  watch: {
    visible(val) {
      if (val) {
        this.loadBaseData()
        this.loadVehicles()
      }
    }
  },
  methods: {
    handleDialogClosed() {
      this.resetQuery(false)
      this.list = []
      this.total = 0
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
    openVehicleDialog(row) {
      this.vehicleDialogVisible = true
      if (row && row.id) {
        this.editingId = row.id
        this.vehicleForm = {
          ...this.getDefaultVehicle(),
          id: row.id,
          vehicle_name: row.vehicle_name,
          license_plate: row.license_plate,
          device_no: row.device_no,
          unit_id: row.unit_id,
          vehicle_type_id: row.vehicle_type_id,
          sort: row.sort ?? row.sort_order ?? 0,
          driver_name: row.driver_name,
          driver_phone: row.driver_phone,
          status: row.status ?? 1,
          remark: row.remark
        }
      } else {
        this.editingId = null
        this.vehicleForm = this.getDefaultVehicle()
      }
      if (!this.unitOptions.length) {
        this.loadUnits()
      }
      if (!this.typeOptions.length) {
        this.loadTypes()
      }
      this.loadDeviceOptions(true)
    },
    resetVehicleDialog() {
      this.vehicleForm = this.getDefaultVehicle()
      this.vehicleSubmitting = false
      this.editingId = null
      this.$nextTick(() => this.$refs.vehicleFormRef?.clearValidate?.())
    },
    async loadBaseData() {
      if (!this.unitOptions.length) {
        await this.loadUnits()
      }
      if (!this.typeOptions.length) {
        await this.loadTypes()
      }
    },
    async loadUnits() {
      this.unitLoading = true
      try {
        const payload = await fetchVehicleUnits({ page: 1, page_size: 200, pageSize: 200 })
        const { list } = normalizeListResult(payload)
        this.unitOptions = (list || []).map((item) => ({
          value: item.id ?? item.unit_id ?? item.value,
          label: item.name ?? item.unit_name ?? item.label ?? item.unit_code ?? `单位${item.id ?? ''}`
        }))
      } catch (error) {
        console.error('加载车辆单位失败', error)
        ElMessage.error(error?.message || '加载车辆单位失败')
      } finally {
        this.unitLoading = false
      }
    },
    async loadTypes() {
      this.typeLoading = true
      try {
        const payload = await fetchVehicleTypes({ page: 1, page_size: 200, pageSize: 200 })
        const { list } = normalizeListResult(payload)
        this.typeOptions = (list || []).map((item) => ({
          value: item.id ?? item.type_id ?? item.value,
          label: item.name ?? item.type_name ?? item.vehicle_type_name ?? item.label ?? item.code ?? `类型${item.id ?? ''}`
        }))
      } catch (error) {
        console.error('加载车辆类型失败', error)
        ElMessage.error(error?.message || '加载车辆类型失败')
      } finally {
        this.typeLoading = false
      }
    },
    async loadPermissionGroups(force = false) {
      if (!force && this.permissionGroups.length) {
        if (this.permissionGroupId) {
          return
        }
      }
      this.permissionGroupLoading = true
      try {
        const payload = await fetchPermissionGroups()
        const { list } = normalizeListResult(payload)
        this.permissionGroups = list || []
        if (!this.permissionGroupId && this.permissionGroups.length) {
          const firstGroup = this.permissionGroups[0]
          const rawId = firstGroup?.id ?? firstGroup?.permission_group_id ?? firstGroup?.value ?? firstGroup?.group_id
          this.permissionGroupId = rawId ? Number(rawId) || null : null
        }
      } catch (error) {
        console.error('加载权限组失败', error)
        ElMessage.error(error?.message || '加载权限组失败')
      } finally {
        this.permissionGroupLoading = false
      }
    },
    async loadDeviceOptions(force = false) {
      if (!force && this.deviceOptions.length) {
        return
      }
      await this.loadPermissionGroups()
      if (!this.permissionGroupId) {
        this.deviceOptions = []
        return
      }
      this.deviceLoading = true
      try {
        const params = {
          page: 1,
          page_size: 200,
          pageSize: 200,
          bind_id: this.permissionGroupId,
          bindId: this.permissionGroupId
        }
        const payload = await fetchDeviceBindings(params)
        const { list } = normalizeListResult(payload)
        const groupId = Number(this.permissionGroupId)
        const normalized = (list || [])
          .filter((item) => {
            const bindId = Number(item?.bind_id ?? item?.bindId ?? item?.bind_id ?? 0)
            return bindId === groupId
          })
          .map((item) => {
            const deviceNo =
              String(
                item?.device_no ??
                item?.device?.device_no ??
                item?.device?.uuid ??
                item?.device?.hardware_id ??
                item?.device_no ??
                ''
              ).trim()
            if (!deviceNo) {
              return null
            }
            const statusText = item?.is_active === 1 ? '已绑定' : '已停用'
            const label = statusText ? `${deviceNo}（${statusText}）` : deviceNo
            return { value: deviceNo, label, active: item?.is_active === 1 }
          })
          .filter(Boolean)
          .sort((a, b) => (a?.value ?? '').localeCompare(b?.value ?? ''))
        this.deviceOptions = normalized
        this.ensureSelectedDeviceIsListed()
      } catch (error) {
        console.error('加载设备绑定列表失败', error)
        ElMessage.error(error?.message || '加载设备绑定列表失败')
      } finally {
        this.deviceLoading = false
      }
    },
    ensureSelectedDeviceIsListed() {
      const selected = String(this.vehicleForm.device_no ?? '').trim()
      if (!selected) {
        return
      }
      if (this.deviceOptions.some((option) => option.value === selected)) {
        return
      }
      this.deviceOptions = [
        {
          value: selected,
          label: `${selected}（当前）`,
          active: null
        },
        ...this.deviceOptions
      ]
    },
    async loadVehicles() {
      if (!this.dialogVisible) return
      this.loading = true
      try {
        const params = {
          keyword: this.query.keyword,
          unit_id: this.query.unit_id,
          vehicle_type_id: this.query.vehicle_type_id,
          status: this.query.status,
          page: this.query.page,
          page_size: this.query.pageSize,
          pageSize: this.query.pageSize
        }
        const payload = await fetchVehicleList(params)
        const { list, total } = normalizeListResult(payload)
        this.list = (list || []).map((item) => this.normalizeVehicle(item))
        this.total = total || this.list.length
      } catch (error) {
        console.error('加载车辆列表失败', error)
        ElMessage.error(error?.message || '加载车辆列表失败')
      } finally {
        this.loading = false
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
        sort: item?.sort ?? item?.sort_order ?? 0,
        driver_name: item?.driver_name ?? item?.driverName ?? '',
        driver_phone: item?.driver_phone ?? item?.driverPhone ?? '',
        status: item?.status ?? item?.enable_status ?? 1,
        remark: item?.remark ?? '',
        updated_at: item?.updated_at ?? item?.update_time ?? item?.updatedAt ?? item?.updatedTime ?? ''
      }
    },
    handleSearch() {
      this.query.page = 1
      this.loadVehicles()
    },
    resetQuery(triggerLoad = true) {
      this.query = {
        keyword: '',
        unit_id: '',
        vehicle_type_id: '',
        status: '',
        page: 1,
        pageSize: 10
      }
      if (triggerLoad) this.loadVehicles()
    },
    handlePageChange(page) {
      this.query.page = page
      this.loadVehicles()
    },
    handleSizeChange(size) {
      this.query.pageSize = size
      this.query.page = 1
      this.loadVehicles()
    },
    submitVehicle() {
      const formRef = this.$refs.vehicleFormRef
      if (!formRef) return
      formRef.validate(async (valid) => {
        if (!valid) return
        this.vehicleSubmitting = true
        try {
          if (this.editingId) {
            await updateVehicle(this.editingId, this.vehicleForm)
            ElMessage.success('编辑车辆成功')
          } else {
            await createVehicle(this.vehicleForm)
            ElMessage.success('新增车辆成功')
          }
          this.vehicleDialogVisible = false
          this.loadVehicles()
        } catch (error) {
          console.error('保存车辆失败', error)
          ElMessage.error(error?.message || '保存车辆失败')
        } finally {
          this.vehicleSubmitting = false
        }
      })
    },
    async confirmDelete(row) {
      if (!row?.id) return
      try {
        await ElMessageBox.confirm(`确认删除车辆“${row.vehicle_name || row.license_plate || ''}”？`, '删除提示', {
          type: 'warning',
          confirmButtonText: '删除',
          cancelButtonText: '取消'
        })
      } catch (error) {
        if (error !== 'cancel') {
          console.error('取消删除时出现异常', error)
        }
        return
      }
      this.loading = true
      try {
        await deleteVehicle(row.id)
        ElMessage.success('删除成功')
        this.loadVehicles()
      } catch (error) {
        console.error('删除车辆失败', error)
        ElMessage.error(error?.message || '删除车辆失败')
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped>
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
</style>
