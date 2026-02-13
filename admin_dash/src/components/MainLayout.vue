<template>
  <div class="main-layout">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="logo-container">
        <h1 class="logo-text">Perfect Life</h1>
        <p class="logo-sub">ADMINISTRATION</p>
      </div>

      <nav class="nav-menu">
        <div 
          v-for="item in menuItems" 
          :key="item.path" 
          class="nav-item"
          :class="{ active: currentPath === item.path }"
          @click="navigateTo(item.path)"
        >
          <span class="icon">{{ item.icon }}</span>
          <span class="label">{{ item.label }}</span>
        </div>
      </nav>

      <div class="user-profile">
        <div class="avatar">A</div>
        <div class="info">
          <div class="name">Admin User</div>
          <div class="role">Super Admin</div>
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="content-area">
      <header class="top-header">
        <div class="breadcrumbs">
          <span class="crumb">Dashboard</span>
          <span class="separator">/</span>
          <span class="crumb active">Overview</span>
        </div>
        <div class="header-actions">
          <button class="action-btn">🔔</button>
          <button class="action-btn">⚙️</button>
        </div>
      </header>

      <div class="page-content">
        <slot></slot>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

// Mock current path for now, in real app use route
const currentPath = ref('/dashboard');

const menuItems = [
  { label: 'Dashboard', path: '/dashboard', icon: '📊' },
  { label: 'Products', path: '/products/list', icon: '🍺' },
  { label: 'Orders', path: '/orders/list', icon: '📦' },
  { label: 'Users', path: '/users', icon: '👥' },
  { label: 'Promotion', path: '/promotion/overview', icon: '🚀' },
  { label: 'Finance', path: '/finance', icon: '💰' },
];

const navigateTo = (path: string) => {
  currentPath.value = path;
  uni.navigateTo({ url: `/pages${path}/index` });
};
</script>

<style lang="scss" scoped>
@import "@/styles/variables.scss";

.main-layout {
  display: flex;
  height: 100vh;
  width: 100vw;
  background-color: $bg-content;
  overflow: hidden;
}

.sidebar {
  width: 260px;
  background-color: $bg-primary;
  color: $text-inverse;
  display: flex;
  flex-direction: column;
  padding: $spacing-lg;
  box-sizing: border-box;
  flex-shrink: 0;

  .logo-container {
    margin-bottom: $spacing-xl * 2;
    .logo-text {
      font-family: $font-family-heading;
      font-size: 24px;
      color: $color-amber-gold;
      margin: 0;
      letter-spacing: 1px;
    }
    .logo-sub {
      font-family: $font-family-mono;
      font-size: 10px;
      color: rgba(255, 255, 255, 0.5);
      letter-spacing: 2px;
      margin-top: 4px;
    }
  }

  .nav-menu {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: $spacing-sm;

    .nav-item {
      display: flex;
      align-items: center;
      padding: $spacing-md;
      border-radius: $radius-md;
      cursor: pointer;
      transition: all 0.2s ease;
      opacity: 0.7;

      &:hover {
        opacity: 1;
        background-color: rgba(255, 255, 255, 0.05);
      }

      &.active {
        opacity: 1;
        background-color: rgba($color-amber-gold, 0.15);
        border-left: 3px solid $color-amber-gold;
        .label {
          color: $color-amber-gold;
          font-weight: 600;
        }
      }

      .icon {
        margin-right: $spacing-md;
        font-size: 18px;
      }
      .label {
        font-family: $font-family-body;
        font-size: 14px;
      }
    }
  }

  .user-profile {
    display: flex;
    align-items: center;
    padding-top: $spacing-lg;
    border-top: 1px solid rgba(255, 255, 255, 0.1);

    .avatar {
      width: 40px;
      height: 40px;
      background-color: $color-amber-gold;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: $bg-primary;
      font-weight: bold;
      margin-right: $spacing-md;
    }

    .info {
      .name {
        font-size: 14px;
        font-weight: 600;
      }
      .role {
        font-size: 12px;
        opacity: 0.6;
      }
    }
  }
}

.content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .top-header {
    height: 64px;
    background-color: transparent;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 $spacing-xl;
    
    .breadcrumbs {
      font-family: $font-family-body;
      font-size: 14px;
      color: $text-secondary;
      
      .separator {
        margin: 0 $spacing-xs;
        color: rgba(0,0,0,0.2);
      }
      .active {
        color: $text-primary;
        font-weight: 600;
      }
    }

    .header-actions {
      display: flex;
      gap: $spacing-md;
      
      .action-btn {
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        opacity: 0.6;
        &:hover { opacity: 1; }
      }
    }
  }

  .page-content {
    flex: 1;
    padding: 0 $spacing-xl $spacing-xl;
    overflow-y: auto;
  }
}
</style>
