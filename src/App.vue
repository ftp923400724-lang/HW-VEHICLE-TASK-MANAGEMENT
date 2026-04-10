<template>
  <div class="common-layout">
    <el-container class="root">
      <el-header class="header">
        <AppHeader />
      </el-header>
      <el-container class="body">
        <el-aside width="280px" class="aside">
          <AppAside />
        </el-aside>
        <el-container class="content">
          <el-main class="main">
            <AppMain />
          </el-main>
          <el-footer class="footer">
            <AppFooter />
          </el-footer>
        </el-container>
      </el-container>
    </el-container>
  </div>
</template>

<script>
import './assets/css/global.css';
import AppHeader from './components/header.vue';
import AppAside from './components/aside.vue';
import AppMain from './components/main.vue';
import AppFooter from './components/footer.vue';
export default {
  name: "FullScreenLayout",
  components: {
    AppHeader,
    AppAside,
    AppMain,
    AppFooter,
  },
};
</script>
<!-- ✅ 组件样式：可以 scoped -->
<style scoped>
.common-layout {
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

/* 根容器撑满 */
.root {
  width: 100%;
  height: 100%;
}

/* Header 高度可自定义（Element 默认 60px） */
.header {
  height: 100px;
  /* background-color: #020b18; */
}

/* 中间区域必须撑满剩余高度 */
.body {
  flex: 1;
  height: 0;
  /* 关键：让 flex 子项计算高度正确 */
}

/* 右侧内容容器撑满 */
.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-width: 0;
}

/* Main 占剩余空间并允许内部滚动 */
.main {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.aside {
  height: 100%;
  background-color: #0d1421;
  border: 1px solid rgba(255, 255, 255, 0.04);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.25);
  padding-bottom: 30px !important;
  overflow: hidden;
}

.footer {
  height: 250px;
}
</style>
