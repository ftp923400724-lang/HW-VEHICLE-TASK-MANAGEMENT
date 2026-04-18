<template>
  <div class="dashboard-shell">
    <header class="dashboard-header">
      <AppHeader />
    </header>

    <main class="dashboard-body">
      <aside class="dashboard-aside dashboard-aside--left">
        <AppAside />
      </aside>

      <section class="dashboard-main">
        <AppMain />
      </section>

      <aside class="dashboard-aside dashboard-aside--right">
        <AppFooter />
      </aside>
    </main>
  </div>
</template>

<script>
import './assets/css/global.css'
import AppHeader from './components/header.vue'
import AppAside from './components/aside.vue'
import AppMain from './components/main.vue'
import AppFooter from './components/right.vue'
export default {
  name: 'FullScreenLayout',
  components: {
    AppHeader,
    AppAside,
    AppMain,
    AppFooter,
  }
}
</script>

<style scoped>
.dashboard-shell {
  width: 100%;
  height: 100dvh;
  min-height: 100vh;
  max-height: 100vh;
  --dashboard-header-height: 84px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(circle at top left, rgba(56, 189, 248, 0.14), transparent 24%),
    radial-gradient(circle at top right, rgba(37, 99, 235, 0.12), transparent 22%),
    linear-gradient(180deg, #040a15 0%, #07101d 44%, #050b16 100%);
}

.dashboard-header {
  flex: 0 0 var(--dashboard-header-height);
  height: var(--dashboard-header-height);
  box-sizing: border-box;
  width: 100%;
  min-height: 0;
  overflow: hidden;
}

.dashboard-body {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: clamp(280px, 22vw, 340px) minmax(0, 1fr) clamp(300px, 24vw, 360px);
  box-sizing: border-box;
  overflow: hidden;
}

.dashboard-main {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.dashboard-aside {
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  backdrop-filter: blur(12px);
}

.dashboard-aside--left,
.dashboard-aside--right {
  border: 1px solid rgba(148, 163, 184, 0.12);
}

@media (max-width: 1600px) {
  .dashboard-body {
    grid-template-columns: minmax(260px, 300px) minmax(0, 1fr) minmax(280px, 320px);
  }
}

@media (max-width: 1360px) {
  .dashboard-body {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas:
      'left'
      'main'
      'right';
  }

  .dashboard-aside--left {
    grid-area: left;
  }

  .dashboard-main {
    grid-area: main;
  }

  .dashboard-aside--right {
    grid-area: right;
  }
}

@media (min-width: 1361px) {
  .dashboard-aside--left {
    grid-column: 1;
  }

  .dashboard-main {
    grid-column: 2;
  }

  .dashboard-aside--right {
    grid-column: 3;
  }
}
</style>
