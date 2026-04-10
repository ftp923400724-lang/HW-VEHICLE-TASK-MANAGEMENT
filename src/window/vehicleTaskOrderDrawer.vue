<template>
  <el-drawer
    v-model="drawerVisible"
    title="车辆任务单"
    size="88%"
    direction="rtl"
    :append-to-body="true"
    :close-on-click-modal="false"
    class="task-order-drawer"
    modal-class="task-order-drawer-overlay"
    @closed="handleDrawerClosed"
  >
    <div class="task-order-panel">
      <div class="task-order-toolbar">
        <el-input
          v-model.trim="query.keyword"
          clearable
          placeholder="搜索任务单号/车辆/围栏/作业类型"
          class="task-order-search"
          @keyup.enter="loadTaskOrders(1)"
        />
        <el-select
          v-model="query.status"
          clearable
          placeholder="全部状态"
          class="task-order-status"
          popper-class="task-order-popper"
        >
          <el-option label="草稿" value="draft" />
          <el-option label="已发布" value="published" />
          <el-option label="执行中" value="executing" />
          <el-option label="已完成" value="finished" />
          <el-option label="已验收" value="checked" />
          <el-option label="已取消" value="cancelled" />
        </el-select>
        <el-button type="primary" :loading="loading" @click="loadTaskOrders(1)">查询</el-button>
        <el-button :disabled="loading" @click="resetQuery">重置</el-button>
        <div class="task-order-toolbar__spacer" />
        <el-button type="primary" plain @click="openTaskDialog()">新增任务单</el-button>
        <el-button :loading="loading" @click="loadTaskOrders()">刷新</el-button>
      </div>

      <div class="task-order-summary">
        <div class="task-order-summary__item">
          <span>总任务单</span>
          <strong>{{ summary.total }}</strong>
        </div>
        <div class="task-order-summary__item">
          <span>已发布</span>
          <strong>{{ summary.published }}</strong>
        </div>
        <div class="task-order-summary__item">
          <span>执行中</span>
          <strong>{{ summary.executing }}</strong>
        </div>
        <div class="task-order-summary__item">
          <span>已完成</span>
          <strong>{{ summary.finished }}</strong>
        </div>
      </div>

      <el-table
        ref="taskTableRef"
        v-loading="loading"
        :data="rows"
        border
        stripe
        height="100%"
        class="task-order-table"
        row-key="id"
        empty-text="暂无车辆任务单数据"
      >
        <el-table-column type="index" label="#" width="54" align="center" />
        <el-table-column prop="order_no" label="任务单号" min-width="170" show-overflow-tooltip />
        <el-table-column prop="vehicle_name" label="绑定车辆" min-width="160" show-overflow-tooltip />
        <el-table-column prop="license_plate" label="车牌号" min-width="130" show-overflow-tooltip />
        <el-table-column prop="work_fence_name" label="作业围栏" min-width="170" show-overflow-tooltip />
        <el-table-column prop="work_mode_text" label="作业类型" min-width="150" show-overflow-tooltip />
        <el-table-column prop="statusText" label="任务状态" width="110" align="center" />
        <el-table-column label="开始时间" width="180" align="center">
          <template #default="{ row }">
            <span>{{ row.task_start_time || '--' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="200" show-overflow-tooltip />
        <el-table-column label="操作" width="160" fixed="right" align="center">
          <template #default="{ row }">
            <div class="task-row-actions">
              <el-button size="small" type="primary" plain @click="openTaskDialog(row)">编辑</el-button>
              <el-button size="small" type="danger" plain @click="confirmDeleteTask(row)">删除</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div class="task-order-footer">
        <div class="task-order-footer__meta">共 {{ pagination.total }} 条任务单，当前展示 {{ rows.length }} 条</div>
        <el-pagination
          background
          layout="total, sizes, prev, pager, next, jumper"
          :total="pagination.total"
          :current-page="pagination.page"
          :page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50]"
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>

      <el-dialog
        v-model="taskDialogVisible"
        :title="taskEditingId ? '编辑车辆任务单' : '新增车辆任务单'"
        width="760px"
        :append-to-body="true"
        class="task-order-dialog"
        modal-class="task-order-dialog-overlay"
        @closed="resetTaskDialog"
      >
        <el-form ref="taskFormRef" :model="taskForm" :rules="taskRules" label-width="110px">
          <el-form-item label="任务单号">
            <el-input v-model="taskForm.order_no" disabled placeholder="新增时自动生成" />
          </el-form-item>
          <el-form-item label="绑定车辆" prop="vehicle_id">
            <el-select
              v-model="taskForm.vehicle_id"
              filterable
              clearable
              placeholder="请选择车辆"
              class="task-order-select"
              popper-class="task-order-popper"
              @change="handleVehicleChange"
            >
              <el-option
                v-for="item in vehicleOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="作业围栏" prop="fence_id">
            <el-select
              v-model="taskForm.fence_id"
              filterable
              clearable
              placeholder="请选择围栏"
              class="task-order-select"
              popper-class="task-order-popper"
              @change="handleFenceChange"
            >
              <el-option
                v-for="item in fenceOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="作业类型" prop="work_mode_text">
            <el-select
              v-model="taskForm.work_mode_text"
              filterable
              clearable
              placeholder="请选择作业类型"
              class="task-order-select"
              popper-class="task-order-popper"
            >
              <el-option
                v-for="item in workTypeOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
            <div v-if="selectedWorkTypeTip" class="task-order-field-tip">
              {{ selectedWorkTypeTip }}
            </div>
          </el-form-item>
          <el-form-item label="是否每天自动生成" prop="is_auto_generate_daily">
            <el-radio-group v-model="taskForm.is_auto_generate_daily">
              <el-radio :label="1">是</el-radio>
              <el-radio :label="0">否</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="开始时间" prop="task_start_time">
            <el-date-picker
              v-model="taskForm.task_start_time"
              type="datetime"
              value-format="YYYY-MM-DD HH:mm:ss"
              format="YYYY-MM-DD HH:mm:ss"
              placeholder="请选择任务开始时间"
              class="task-order-select"
            />
          </el-form-item>
          <el-form-item label="任务状态" prop="status">
            <el-select
              v-model="taskForm.status"
              placeholder="请选择状态"
              class="task-order-select"
              popper-class="task-order-popper"
            >
              <el-option label="草稿" value="draft" />
              <el-option label="已发布" value="published" />
              <el-option label="执行中" value="executing" />
              <el-option label="已完成" value="finished" />
              <el-option label="已验收" value="checked" />
              <el-option label="已取消" value="cancelled" />
            </el-select>
          </el-form-item>
          <el-form-item label="备注">
            <el-input
              v-model.trim="taskForm.remark"
              type="textarea"
              :rows="3"
              maxlength="255"
              show-word-limit
              placeholder="请输入备注"
            />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="taskDialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="submitting" @click="submitTaskForm">保存</el-button>
        </template>
      </el-dialog>
    </div>
  </el-drawer>
</template>

<script>
import { ElMessage, ElMessageBox } from 'element-plus'
import { normalizeListResult } from '@/api/http'
import {
  createTaskOrder,
  deleteTaskOrder,
  fetchTaskOrders,
  fetchVehicleFenceTree,
  fetchVehicleList,
  fetchVehicleWorkTypes,
  updateTaskOrder,
} from '@/api/vehicle'

const PAGE_SIZE = 10

const createDefaultTaskForm = () => ({
  order_no: '',
  status: 'draft',
  vehicle_id: '',
  vehicle_name: '',
  license_plate: '',
  fence_id: '',
  fence_name: '',
  work_fence_name: '',
  work_mode_text: '',
  is_auto_generate_daily: 0,
  task_start_time: '',
  remark: '',
})

export default {
  name: 'VehicleTaskOrderDrawer',
  props: {
    visible: {
      type: Boolean,
      default: false,
      required: true,
    },
  },
  emits: ['update:visible'],
  data() {
    return {
      drawerVisible: this.visible,
      loading: false,
      submitting: false,
      rows: [],
      pagination: {
        page: 1,
        pageSize: PAGE_SIZE,
        total: 0,
      },
      query: {
        keyword: '',
        status: '',
      },
      vehicleOptions: [],
      fenceOptions: [],
      workTypeOptions: [],
      taskDialogVisible: false,
      taskEditingId: null,
      taskForm: createDefaultTaskForm(),
      taskRules: {
        vehicle_id: [{ required: true, message: '请选择绑定车辆', trigger: 'change' }],
        fence_id: [{ required: true, message: '请选择作业围栏', trigger: 'change' }],
        work_mode_text: [{ required: true, message: '请选择作业类型', trigger: 'change' }],
        is_auto_generate_daily: [{ required: true, message: '请选择是否每天自动生成', trigger: 'change' }],
        task_start_time: [{ required: true, message: '请选择开始时间', trigger: 'change' }],
      },
    }
  },
  computed: {
    summary() {
      const list = Array.isArray(this.rows) ? this.rows : []
      return {
        total: Number(this.pagination.total || 0),
        published: list.filter((item) => item.status === 'published').length,
        executing: list.filter((item) => item.status === 'executing').length,
        finished: list.filter((item) => item.status === 'finished').length,
      }
    },
    selectedWorkTypeTip() {
      const hit = this.workTypeOptions.find((item) => `${item.value}` === `${this.taskForm.work_mode_text}`)
      return hit?.tip || ''
    },
  },
  watch: {
    visible: {
      immediate: true,
      handler(value) {
        this.drawerVisible = value
        if (value) {
          this.resetPagination()
          this.loadDrawerData()
        }
      },
    },
    drawerVisible(value) {
      this.$emit('update:visible', value)
    },
  },
  methods: {
    createDefaultTaskForm,
    resetPagination() {
      this.pagination.page = 1
      this.pagination.pageSize = PAGE_SIZE
    },
    handleDrawerClosed() {
      this.taskDialogVisible = false
      this.taskEditingId = null
      this.taskForm = createDefaultTaskForm()
      this.query.keyword = ''
      this.query.status = ''
    },
    async loadDrawerData() {
      await Promise.allSettled([
        this.loadVehicleOptions(),
        this.loadFenceOptions(),
        this.loadWorkTypeOptions(),
        this.loadTaskOrders(1, this.pagination.pageSize),
      ])
    },
    normalizeTaskRow(row = {}) {
      const status = String(row?.status || 'draft').trim() || 'draft'
      return {
        ...row,
        id: row?.id ?? row?.task_order_id ?? row?.taskOrderId ?? row?.order_id ?? null,
        order_no: String(row?.order_no ?? row?.orderNo ?? '').trim(),
        status,
        statusText: this.getStatusText(status),
        vehicle_id: row?.vehicle_id ?? row?.vehicleId ?? '',
        vehicle_name: row?.vehicle_name ?? row?.vehicleName ?? '',
        license_plate: row?.license_plate ?? row?.licensePlate ?? '',
        fence_id: row?.fence_id ?? row?.fenceId ?? '',
        fence_name: row?.fence_name ?? row?.fenceName ?? '',
        work_fence_name: row?.work_fence_name ?? row?.workFenceName ?? row?.fence_name ?? row?.fenceName ?? '',
        work_mode_text: row?.work_mode_text ?? row?.workModeText ?? '',
        is_auto_generate_daily: Number(row?.is_auto_generate_daily ?? row?.isAutoGenerateDaily ?? 0) === 1 ? 1 : 0,
        task_start_time: row?.task_start_time ?? row?.taskStartTime ?? row?.start_time ?? row?.startTime ?? '',
        remark: row?.remark ?? '',
        created_at: row?.created_at ?? row?.createdAt ?? '',
        updated_at: row?.updated_at ?? row?.updatedAt ?? '',
      }
    },
    getStatusText(status) {
      const statusMap = {
        draft: '草稿',
        published: '已发布',
        executing: '执行中',
        finished: '已完成',
        checked: '已验收',
        cancelled: '已取消',
      }
      return statusMap[status] || status || '--'
    },
    async loadTaskOrders(page = this.pagination.page, pageSize = this.pagination.pageSize) {
      this.loading = true
      try {
        const params = {
          page,
          pageSize,
        }
        const keyword = String(this.query.keyword || '').trim()
        if (keyword) {
          params.keyword = keyword
        }
        if (this.query.status !== '') {
          params.status = this.query.status
        }

        const payload = await fetchTaskOrders(params)
        const { list, total } = normalizeListResult(payload)
        this.rows = (Array.isArray(list) ? list : []).map((item) => this.normalizeTaskRow(item))
        this.pagination.page = page
        this.pagination.pageSize = pageSize
        this.pagination.total = Number(total || 0)
      } catch (error) {
        this.rows = []
        this.pagination.total = 0
        ElMessage.error(error?.message || '加载车辆任务单失败')
      } finally {
        this.loading = false
      }
    },
    handlePageChange(page) {
      this.loadTaskOrders(page, this.pagination.pageSize)
    },
    handleSizeChange(pageSize) {
      this.loadTaskOrders(1, pageSize)
    },
    async resetQuery() {
      this.query.keyword = ''
      this.query.status = ''
      this.resetPagination()
      await this.loadTaskOrders(1, this.pagination.pageSize)
    },
    async loadVehicleOptions() {
      try {
        const payload = await fetchVehicleList({ page: 1, pageSize: 500 })
        const { list } = normalizeListResult(payload)
        this.vehicleOptions = (Array.isArray(list) ? list : [])
          .map((item) => {
            const id = item?.id ?? item?.vehicle_id ?? item?.vehicleId
            if (!id) return null
            const vehicleName = String(item?.vehicle_name ?? item?.vehicleName ?? item?.name ?? '').trim()
            const licensePlate = String(item?.license_plate ?? item?.licensePlate ?? '').trim()
            const label = [vehicleName, licensePlate].filter(Boolean).join(' / ') || `车辆${id}`
            return {
              value: String(id),
              label,
              vehicle_name: vehicleName,
              license_plate: licensePlate,
            }
          })
          .filter(Boolean)
      } catch (error) {
        this.vehicleOptions = []
        ElMessage.error(error?.message || '加载车辆选项失败')
      }
    },
    flattenFenceNodes(nodes = [], ancestors = []) {
      const result = []
      ;(Array.isArray(nodes) ? nodes : []).forEach((node) => {
        if (!node || typeof node !== 'object') return
        const id = node?.id ?? node?.fence_id ?? node?.fenceId ?? node?.value
        const labelText = String(node?.label ?? node?.name ?? node?.fence_name ?? node?.title ?? '').trim()
        const nextAncestors = labelText ? [...ancestors, labelText] : ancestors
        const isFenceLeaf =
          node?.type === 'fence' || node?.is_leaf === true || node?.fence_id !== undefined || node?.fenceId !== undefined
        if (isFenceLeaf && id !== undefined && id !== null && String(id).trim() !== '' && labelText) {
          result.push({
            value: String(id),
            label: nextAncestors.join(' / '),
            fence_name: labelText,
          })
        }
        if (Array.isArray(node?.children) && node.children.length) {
          result.push(...this.flattenFenceNodes(node.children, nextAncestors))
        }
      })
      return result
    },
    async loadFenceOptions() {
      try {
        const payload = await fetchVehicleFenceTree()
        const tree = Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload?.result)
            ? payload.result
            : Array.isArray(payload)
              ? payload
              : []
        this.fenceOptions = this.flattenFenceNodes(tree)
      } catch (error) {
        this.fenceOptions = []
        ElMessage.error(error?.message || '加载围栏选项失败')
      }
    },
    async loadWorkTypeOptions() {
      try {
        const payload = await fetchVehicleWorkTypes({ page: 1, pageSize: 500 })
        const { list } = normalizeListResult(payload)
        this.workTypeOptions = (Array.isArray(list) ? list : [])
          .map((item) => {
            const name = String(item?.type_name ?? item?.name ?? item?.work_mode_text ?? item?.label ?? '').trim()
            if (!name) return null
            const speedLimitKmh = Number(item?.speed_limit_kmh ?? item?.speedLimitKmh ?? 0)
            const normalizedSpeedLimitKmh = Number.isFinite(speedLimitKmh) && speedLimitKmh > 0 ? Math.trunc(speedLimitKmh) : 0
            return {
              value: name,
              label: normalizedSpeedLimitKmh > 0 ? `${name}（限速 ${normalizedSpeedLimitKmh} km/h）` : name,
              tip: normalizedSpeedLimitKmh > 0 ? `限速规则：${normalizedSpeedLimitKmh} km/h` : '',
            }
          })
          .filter(Boolean)
      } catch (error) {
        this.workTypeOptions = []
        ElMessage.error(error?.message || '加载作业类型失败')
      }
    },
    handleVehicleChange(value) {
      const hit = this.vehicleOptions.find((item) => `${item.value}` === `${value}`)
      this.taskForm.vehicle_name = hit?.vehicle_name || ''
      this.taskForm.license_plate = hit?.license_plate || ''
    },
    handleFenceChange(value) {
      const hit = this.fenceOptions.find((item) => `${item.value}` === `${value}`)
      this.taskForm.fence_name = hit?.fence_name || hit?.label || ''
      this.taskForm.work_fence_name = hit?.label || hit?.fence_name || ''
    },
    resetTaskDialog() {
      this.taskForm = createDefaultTaskForm()
      this.taskEditingId = null
      this.submitting = false
      this.$nextTick(() => this.$refs.taskFormRef?.clearValidate?.())
    },
    fillTaskFormFromRow(row = {}) {
      this.taskForm = {
        ...createDefaultTaskForm(),
        order_no: String(row.order_no || '').trim(),
        status: String(row.status || 'draft').trim() || 'draft',
        vehicle_id: row.vehicle_id ? String(row.vehicle_id) : '',
        vehicle_name: String(row.vehicle_name || '').trim(),
        license_plate: String(row.license_plate || '').trim(),
        fence_id: row.fence_id ? String(row.fence_id) : '',
        fence_name: String(row.fence_name || '').trim(),
        work_fence_name: String(row.work_fence_name || row.fence_name || '').trim(),
        work_mode_text: String(row.work_mode_text || '').trim(),
        task_start_time: String(row.task_start_time || '').trim(),
        remark: String(row.remark || '').trim(),
      }
    },
    async openTaskDialog(row = null) {
      if (row?.id) {
        this.taskEditingId = row.id
        this.fillTaskFormFromRow(row)
      } else {
        this.taskEditingId = null
        this.taskForm = createDefaultTaskForm()
      }
      this.taskDialogVisible = true
      this.$nextTick(() => this.$refs.taskFormRef?.clearValidate?.())
    },
    submitTaskForm() {
      const formRef = this.$refs.taskFormRef
      if (!formRef) return
      formRef.validate(async (valid) => {
        if (!valid) return
        this.submitting = true
        try {
          const payload = {
            vehicle_id: Number(this.taskForm.vehicle_id || 0),
            vehicle_name: String(this.taskForm.vehicle_name || '').trim(),
            license_plate: String(this.taskForm.license_plate || '').trim(),
            fence_id: Number(this.taskForm.fence_id || 0),
            fence_name: String(this.taskForm.fence_name || this.taskForm.work_fence_name || '').trim(),
            work_fence_name: String(this.taskForm.work_fence_name || this.taskForm.fence_name || '').trim(),
            work_mode_text: String(this.taskForm.work_mode_text || '').trim(),
            is_auto_generate_daily: Number(this.taskForm.is_auto_generate_daily || 0) === 1 ? 1 : 0,
            task_start_time: String(this.taskForm.task_start_time || '').trim(),
            status: String(this.taskForm.status || 'draft').trim(),
            remark: String(this.taskForm.remark || '').trim(),
          }

          if (this.taskEditingId) {
            await updateTaskOrder(this.taskEditingId, payload)
            ElMessage.success('编辑车辆任务单成功')
          } else {
            await createTaskOrder(payload)
            ElMessage.success('新增车辆任务单成功')
          }

          this.taskDialogVisible = false
          await this.loadTaskOrders(this.pagination.page, this.pagination.pageSize)
        } catch (error) {
          ElMessage.error(error?.message || '保存车辆任务单失败')
        } finally {
          this.submitting = false
        }
      })
    },
    async confirmDeleteTask(row) {
      if (!row?.id) return
      try {
        await ElMessageBox.confirm(`确认删除车辆任务单“${row.order_no || ''}”？`, '删除提示', {
          type: 'warning',
          confirmButtonText: '删除',
          cancelButtonText: '取消',
        })
      } catch {
        return
      }

      try {
        await deleteTaskOrder(row.id)
        ElMessage.success('删除成功')
        if (this.rows.length <= 1 && this.pagination.page > 1) {
          await this.loadTaskOrders(this.pagination.page - 1, this.pagination.pageSize)
        } else {
          await this.loadTaskOrders(this.pagination.page, this.pagination.pageSize)
        }
      } catch (error) {
        ElMessage.error(error?.message || '删除车辆任务单失败')
      }
    },
  },
}
</script>

<style scoped>
.task-order-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  gap: 12px;
}

.task-order-toolbar {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 14px;
  border-radius: 10px;
  background: rgba(15, 30, 52, 0.78);
  border: 1px solid rgba(96, 137, 204, 0.34);
}

.task-order-search {
  width: 320px;
}

.task-order-status {
  width: 150px;
}

.task-order-toolbar__spacer {
  flex: 1;
}

.task-order-summary {
  flex: 0 0 auto;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.task-order-summary__item {
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(125, 211, 252, 0.12);
}

.task-order-summary__item span {
  display: block;
  font-size: 12px;
  color: #9fb2d6;
}

.task-order-summary__item strong {
  display: block;
  margin-top: 4px;
  font-size: 22px;
  color: #f8fafc;
}

.task-order-field-tip {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.4;
  color: #9fb2d6;
}

.task-order-table {
  flex: 1;
  min-height: 0;
  width: 100%;
  overflow: hidden;
}

.task-order-footer {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  color: #cbd5e1;
}

.task-order-footer__meta {
  white-space: nowrap;
}
</style>
