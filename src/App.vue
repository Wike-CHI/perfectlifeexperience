<script setup lang="ts">
import { onLaunch, onShow, onHide } from "@dcloudio/uni-app";
import { initCloudBase, checkEnvironment } from "./utils/cloudbase";

onLaunch(async () => {
  console.log("App Launch");

  // 检查云开发环境配置
   if (checkEnvironment()) {
     try {
       // 初始化云开发
       const success = await initCloudBase();
       if (success) {
         console.log("云开发初始化成功");
       } else {
        console.warn("云开发初始化失败");
       }
     } catch (error) {
       console.error("云开发初始化异常:", error);
     }
   } else {
     console.warn("云开发环境ID未配置，请在 src/utils/cloudbase.ts 中配置");
   }
});

onShow(() => {
  console.log("App Show");
});

onHide(() => {
  console.log("App Hide");
});
</script>

<style>
/* ============================================
   大友元气 - 东方美学配色系统
   ============================================ */

/* CSS变量定义 */
page {
  /* 主色调 - 墨黑系列 */
  --primary-black: #1A1A1A;
  --ink-wash: #2C2C2C;
  --charcoal: #4A4A4A;
  
  /* 强调色 - 金棕系列 */
  --amber-gold: #C9A962;
  --amber-light: #D4B978;
  --amber-dark: #B8984A;
  
  /* 背景色 - 米白系列 */
  --paper-white: #FAF9F7;
  --warm-beige: #F5F0E8;
  --cream: #FDFBF7;
  
  /* 功能色 */
  --cinnabar: #B54A3F;
  --jade-green: #5B7A6E;
  
  /* 文字色 */
  --text-primary: #1A1A1A;
  --text-secondary: #4A4A4A;
  --text-tertiary: #666666;
  --text-muted: #999999;
  
  /* 全局背景 */
  background-color: var(--paper-white);
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue', sans-serif;
}

/* ============================================
   通用按钮样式 - 黑金主题
   ============================================ */
.btn {
  border-radius: 40rpx;
  font-size: 28rpx;
  padding: 24rpx 48rpx;
  border: none;
  font-weight: 500;
  transition: all 0.3s ease;
}

.btn-primary {
  background: linear-gradient(135deg, var(--amber-gold) 0%, var(--amber-dark) 100%);
  color: white;
  box-shadow: 0 4rpx 16rpx rgba(201, 169, 98, 0.3);
}

.btn-primary:active {
  background: linear-gradient(135deg, var(--amber-dark) 0%, #A08030 100%);
  transform: scale(0.98);
}

.btn-secondary {
  background: var(--warm-beige);
  color: var(--text-primary);
  border: 2rpx solid rgba(201, 169, 98, 0.3);
}

.btn-secondary:active {
  background-color: #E8DCC8;
}
</style>
