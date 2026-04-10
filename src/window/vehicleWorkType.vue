<template>
  <el-drawer
    v-model="drawerVisible"
    title="车辆作业类型"
    class="task-order-drawer"
    modal-class="task-order-drawer-overlay"
    size="86%"
    direction="rtl"
    :append-to-body="true"
    :close-on-click-modal="false"
    @opened="handleDrawerOpened"
  >
    <div class="work-type-panel">
      <div class="work-type-toolbar">
        <el-input
          v-model.trim="keyword"
          clearable
          placeholder="搜索类型编码/作业类型/描述"
          class="work-type-search"
          @keyup.enter="loadWorkTypeReport(1)"
        />
        <el-select
          v-model="statusFilter"
          clearable
          placeholder="全部状态"
          class="work-type-status"
          popper-class="task-order-popper"
        >
          <el-option label="启用" :value="1" />
          <el-option label="停用" :value="0" />
        </el-select>
        <el-button type="primary" :loading="loading" @click="loadWorkTypeReport(1)">查询</el-button>
        <el-button :disabled="loading" @click="resetFilters">重置</el-button>
        <el-button type="primary" plain @click="openWorkTypeDialog()">新增作业类型</el-button>
      </div>

      <div class="work-type-summary">
        <div class="work-type-summary__item">
          <span>总类型</span>
          <strong>{{ summary.total }}</strong>
        </div>
        <div class="work-type-summary__item">
          <span>启用</span>
          <strong>{{ summary.enabled }}</strong>
        </div>
        <div class="work-type-summary__item">
          <span>停用</span>
          <strong>{{ summary.disabled }}</strong>
        </div>
        <div class="work-type-summary__item">
          <span>带限速</span>
          <strong>{{ summary.withSpeedLimit }}</strong>
        </div>
      </div>

      <el-alert v-if="errorMessage" type="error" show-icon :title="errorMessage" class="work-type-alert" />

      <div class="work-type-table-shell">
        <el-table
          ref="workTypeTableRef"
          v-loading="loading"
          :data="pagedRows"
          border
          stripe
          class="work-type-table"
          row-key="id"
          empty-text="暂无作业类型数据"
          height="100%"
        >
          <el-table-column type="index" label="#" width="54" align="center" />
          <el-table-column prop="type_code" label="类型编码" min-width="150" show-overflow-tooltip />
          <el-table-column prop="type_name" label="作业类型" min-width="170" show-overflow-tooltip />
          <el-table-column prop="speed_limit_kmh" label="限速规则(km/h)" width="150" align="center">
            <template #default="{ row }">
              <span>{{ row.speedLimitDisplay }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="description" label="描述" min-width="220" show-overflow-tooltip />
          <el-table-column prop="status" label="状态" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="row.statusTag" effect="dark">{{ row.statusLabel }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="created_at" label="创建时间" width="180" show-overflow-tooltip />
          <el-table-column prop="updated_at" label="更新时间" width="180" show-overflow-tooltip />
          <el-table-column label="操作" width="160" fixed="right" align="center">
            <template #default="{ row }">
              <div class="work-type-row-actions">
                <el-button size="small" type="primary" plain @click="openWorkTypeDialog(row)">编辑</el-button>
                <el-button size="small" type="danger" plain @click="confirmDeleteWorkType(row)">删除</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="work-type-footer">
        <div class="work-type-footer__meta">
          当前条件下共 <strong>{{ pagination.total }}</strong> 条作业类型，已展示 <strong>{{ pagedRows.length }}</strong> 条
        </div>
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
        v-model="workTypeDialogVisible"
        :title="workTypeEditingId ? '编辑作业类型' : '新增作业类型'"
        width="720px"
        :append-to-body="true"
        class="task-order-dialog"
        modal-class="task-order-dialog-overlay"
        @closed="resetWorkTypeDialog"
      >
        <el-form ref="workTypeFormRef" :model="workTypeForm" :rules="workTypeRules" label-width="110px">
          <el-form-item label="类型编码" prop="type_code">
            <el-input v-model.trim="workTypeForm.type_code" placeholder="请输入类型编码" />
          </el-form-item>
          <el-form-item label="作业类型" prop="type_name">
            <el-input v-model.trim="workTypeForm.type_name" placeholder="请输入作业类型名称" />
          </el-form-item>
          <el-form-item label="状态" prop="status">
            <el-select v-model="workTypeForm.status" placeholder="请选择状态" class="work-type-dialog__select">
              <el-option label="启用" :value="1" />
              <el-option label="停用" :value="0" />
            </el-select>
          </el-form-item>
          <el-form-item label="限速规则(km/h)" prop="speed_limit_kmh">
            <el-input-number
              v-model.number="workTypeForm.speed_limit_kmh"
              :min="0"
              :max="200"
              :step="1"
              controls-position="right"
            />
          </el-form-item>
          <el-form-item label="描述" prop="description">
            <el-input v-model.trim="workTypeForm.description" type="textarea" :rows="4" placeholder="请输入描述" />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="workTypeDialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="submitting" @click="submitWorkTypeForm">保存</el-button>
        </template>
      </el-dialog>
    </div>
  </el-drawer>
</template>

<script>
import { ElMessage, ElMessageBox, ElNotification } from 'element-plus'
import { createVehicleWorkType, deleteVehicleWorkType, fetchVehicleWorkType, fetchVehicleWorkTypes, updateVehicleWorkType } from '@/api/vehicle'
import { normalizeListResult } from '@/api/http'

const PAGE_SIZE = 10

const createDefaultWorkTypeForm = () => ({
  type_code: '',
  type_name: '',
  status: 1,
  speed_limit_kmh: 0,
  description: '',
})

export default {
  name: 'VehicleWorkTypeWindow',
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
      errorMessage: '',
      keyword: '',
      statusFilter: '',
      rows: [],
      pagination: {
        page: 1,
        pageSize: PAGE_SIZE,
        total: 0,
      },
      workTypeDialogVisible: false,
      submitting: false,
      workTypeEditingId: null,
      workTypeForm: createDefaultWorkTypeForm(),
      workTypeRules: {
        type_code: [{ required: true, message: '请输入类型编码', trigger: 'blur' }],
        type_name: [{ required: true, message: '请输入作业类型名称', trigger: 'blur' }],
        status: [{ required: true, message: '请选择状态', trigger: 'change' }],
        speed_limit_kmh: [{ type: 'number', min: 0, message: '请输入有效的限速规则', trigger: 'change' }],
      },
    }
  },
  computed: {
    summary() {
      const list = Array.isArray(this.rows) ? this.rows : []
      return {
        total: Number(this.pagination.total || 0),
        enabled: list.filter((item) => Number(item.status) === 1).length,
        disabled: list.filter((item) => Number(item.status) !== 1).length,
        withSpeedLimit: list.filter((item) => Number(item.speed_limit_kmh || 0) > 0).length,
      }
    },
    pagedRows() {
      return Array.isArray(this.rows) ? this.rows : []
    },
  },
  watch: {
    visible: {
      immediate: true,
      handler(value) {
        this.drawerVisible = value
        if (value) {
          this.resetPagination()
          this.loadWorkTypeReport(1)
        }
      },
    },
    drawerVisible(value) {
      this.$emit('update:visible', value)
    },
  },
  methods: {
    createDefaultWorkTypeForm,
    resetPagination() {
      this.pagination.page = 1
      this.pagination.pageSize = PAGE_SIZE
    },
    handleDrawerOpened() {
      this.syncWorkTypeTableLayout()
    },
    syncWorkTypeTableLayout() {
      this.$nextTick(() => {
        window.requestAnimationFrame(() => {
          this.$refs.workTypeTableRef?.doLayout?.()
        })
      })
    },
    normalizeWorkTypeRow(row = {}) {
      const status = Number(row?.status || 0) === 1 ? 1 : 0
      const speedLimitKmh = Number(row?.speed_limit_kmh ?? row?.speedLimitKmh ?? 0)
      const normalizedSpeedLimitKmh = Number.isFinite(speedLimitKmh) && speedLimitKmh > 0 ? Math.trunc(speedLimitKmh) : 0
      return {
        ...row,
        status,
        speed_limit_kmh: normalizedSpeedLimitKmh,
        speedLimitDisplay: normalizedSpeedLimitKmh > 0 ? `${normalizedSpeedLimitKmh} km/h` : '--',
        statusLabel: status === 1 ? '启用' : '停用',
        statusTag: status === 1 ? 'success' : 'info',
      }
    },
    async loadWorkTypeReport(page = this.pagination.page, pageSize = this.pagination.pageSize) {
      if (this.loading) return
      this.loading = true
      this.errorMessage = ''
      try {
        const params = { page, pageSize }
        const keyword = String(this.keyword || '').trim()
        if (keyword) {
          params.keyword = keyword
        }
        if (this.statusFilter !== '' && this.statusFilter !== null && this.statusFilter !== undefined) {
          params.status = Number(this.statusFilter)
        }

        const payload = await fetchVehicleWorkTypes(params)
        const { list, total } = normalizeListResult(payload)
        this.rows = (Array.isArray(list) ? list : []).map((item) => this.normalizeWorkTypeRow(item))
        this.pagination.page = page
        this.pagination.pageSize = pageSize
        this.pagination.total = Number(total || 0)
        this.syncWorkTypeTableLayout()

        if (!this.rows.length) {
          ElNotification({
            title: '提示',
            message: '未查询到作业类型数据',
            type: 'info',
          })
        }
      } catch (error) {
        this.rows = []
        this.pagination.total = 0
        this.errorMessage = error?.message ? `查询失败：${error.message}` : '查询失败'
        ElNotification({
          title: '错误',
          message: this.errorMessage,
          type: 'error',
        })
      } finally {
        this.loading = false
      }
    },
    handlePageChange(page) {
      this.loadWorkTypeReport(page, this.pagination.pageSize)
      this.syncWorkTypeTableLayout()
    },
    handleSizeChange(pageSize) {
      this.loadWorkTypeReport(1, pageSize)
      this.syncWorkTypeTableLayout()
    },
    async resetFilters() {
      this.keyword = ''
      this.statusFilter = ''
      this.resetPagination()
      await this.loadWorkTypeReport(1, this.pagination.pageSize)
      this.syncWorkTypeTableLayout()
    },
    resetWorkTypeDialog() {
      this.workTypeEditingId = null
      this.submitting = false
      this.workTypeForm = createDefaultWorkTypeForm()
      this.$nextTick(() => {
        this.$refs.workTypeFormRef?.clearValidate?.()
      })
    },
    fillWorkTypeFormFromRecord(record = {}) {
      const normalized = this.normalizeWorkTypeRow(record)
      this.workTypeForm = {
        type_code: String(normalized.type_code || '').trim(),
        type_name: String(normalized.type_name || '').trim(),
        status: Number(normalized.status) === 0 ? 0 : 1,
        speed_limit_kmh: Number(normalized.speed_limit_kmh || 0),
        description: String(normalized.description || '').trim(),
      }
    },
    async openWorkTypeDialog(row = null) {
      if (row?.id) {
        this.workTypeEditingId = row.id
        try {
          const payload = await fetchVehicleWorkType(row.id)
          const detail = payload?.data || payload?.result || payload || row
          this.fillWorkTypeFormFromRecord(detail)
        } catch (error) {
          this.fillWorkTypeFormFromRecord(row)
        }
      } else {
        this.workTypeEditingId = null
        this.workTypeForm = createDefaultWorkTypeForm()
      }
      this.workTypeDialogVisible = true
      this.$nextTick(() => {
        this.$refs.workTypeFormRef?.clearValidate?.()
      })
    },
    submitWorkTypeForm() {
      const formRef = this.$refs.workTypeFormRef
      if (!formRef) return
      formRef.validate(async (valid) => {
        if (!valid) return
        this.submitting = true
        try {
          const payload = {
            type_code: String(this.workTypeForm.type_code || '').trim(),
            type_name: String(this.workTypeForm.type_name || '').trim(),
            status: Number(this.workTypeForm.status) === 1 ? 1 : 0,
            speed_limit_kmh: Number(this.workTypeForm.speed_limit_kmh || 0),
            description: String(this.workTypeForm.description || '').trim(),
          }

          if (this.workTypeEditingId) {
            await updateVehicleWorkType(this.workTypeEditingId, payload)
            ElMessage.success('编辑作业类型成功')
          } else {
            await createVehicleWorkType(payload)
            ElMessage.success('新增作业类型成功')
          }

          this.workTypeDialogVisible = false
          await this.loadWorkTypeReport(this.pagination.page, this.pagination.pageSize)
        } catch (error) {
          ElNotification({
            title: '错误',
            message: error?.message ? `保存失败：${error.message}` : '保存失败',
            type: 'error',
          })
        } finally {
          this.submitting = false
        }
      })
    },
    async confirmDeleteWorkType(row) {
      if (!row?.id) return
      try {
        await ElMessageBox.confirm(`确认删除作业类型“${row.type_name || row.type_code || ''}”？`, '删除提示', {
          type: 'warning',
          confirmButtonText: '删除',
          cancelButtonText: '取消',
          customClass: 'work-type-delete-confirm',
        })
      } catch {
        return
      }

      try {
        await deleteVehicleWorkType(row.id)
        ElMessage.success('删除成功')
        await this.loadWorkTypeReport(this.pagination.page, this.pagination.pageSize)
        if (!this.rows.length && this.pagination.page > 1 && this.pagination.total > 0) {
          await this.loadWorkTypeReport(this.pagination.page - 1, this.pagination.pageSize)
        }
      } catch (error) {
        ElNotification({
          title: '错误',
          message: error?.message ? `删除失败：${error.message}` : '删除失败',
          type: 'error',
        })
      }
    },
  },
}
</script>

<style scoped>
.work-type-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 10px 8px 0;
  overflow: hidden;
}

.work-type-toolbar {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 12px;
  padding: 14px;
  border-radius: 10px;
  background: rgba(15, 30, 52, 0.78);
  border: 1px solid rgba(96, 137, 204, 0.34);
}

.work-type-search {
  width: 320px;
}

.work-type-status {
  width: 150px;
}

.work-type-summary {
  flex: 0 0 auto;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 12px;
}

.work-type-summary__item {
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(125, 211, 252, 0.12);
}

.work-type-summary__item span {
  display: block;
  font-size: 12px;
  color: #9fb2d6;
}

.work-type-summary__item strong {
  display: block;
  margin-top: 4px;
  font-size: 22px;
  color: #f8fafc;
}

.work-type-alert {
  flex: 0 0 auto;
  margin-bottom: 12px;
}

.work-type-table-shell {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
}

.work-type-table {
  flex: 1;
  width: 100%;
  min-height: 0;
  border-radius: 10px;
  overflow: hidden;
}

.work-type-row-actions {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.work-type-footer {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-top: 12px;
  color: #cbd5e1;
}

.work-type-footer__meta strong {
  color: #f8fafc;
}

.work-type-dialog__select {
  width: 100%;
}

@media (max-width: 1400px) {
  .work-type-search {
    width: 260px;
  }
}
</style>
