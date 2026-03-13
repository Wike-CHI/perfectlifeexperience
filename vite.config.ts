import { defineConfig } from "vite";
import uni from "@dcloudio/vite-plugin-uni";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [uni()],
  base: './',
  css: {
    preprocessorOptions: {
      scss: {
        // 使用新版 Sass API（需要 sass-embedded），消除警告并提升编译速度
        api: 'modern-compiler',
        // 抑制 Dart Sass 弃用警告
        silenceDeprecations: ['legacy-js-api'],
      }
    }
  },
  optimizeDeps: {
    exclude: ['@cloudbase/adapter-uni-app'],  // 排除 @cloudbase/adapter-uni-app 依赖
  },
  server: {
    host: '0.0.0.0',  // 使用IP地址代替localhost
    proxy: {
      '/__auth': {
        target: 'https://envId-appid.tcloudbaseapp.com/',
        changeOrigin: true,
      }
    },
    // allowedHosts: true
  },
  build: {
    // 生产环境压缩配置
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,  // 移除console
        drop_debugger: true, // 移除debugger
        pure_funcs: ['console.log'] // 移除console.log
      }
    },
    // 启用gzip压缩大小报告
    reportCompressedSize: true,
    // chunk大小警告限制
    chunkSizeWarningLimit: 1000,
    // 🔧 排除类型定义文件（不打包到小程序）
    rollupOptions: {
      // 排除纯类型定义文件（因为小程序不需要运行时的类型信息）
      external: ['**/*.d.ts', '**/types/*.ts'],
      onwarn(warning, warn) {
        // 忽略类型定义文件的警告
        if (warning.code === 'UNUSED_EXTERNAL_IMPORT' && warning.message.includes('types/')) {
          return;
        }
        // 忽略关于类型文件的模块警告
        if (warning.message && warning.message.includes('types/')) {
          return;
        }
        warn(warning);
      }
    }
  }
});
