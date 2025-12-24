import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    // 构建分析插件（仅在生产环境启用）
    process.env.ANALYZE === 'true' && visualizer({
      open: true,
      filename: 'dist/stats.html',
      gzipSize: true,
      brotliSize: true,
    })
  ].filter(Boolean),
  
  base: './', // 确保资源从相对路径正确加载
  
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1000,
    
    // 生产环境优化配置
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // 移除console.log
        drop_debugger: true, // 移除debugger
      },
    },
    
    // 代码分割优化
    rollupOptions: {
      output: {
        manualChunks: {
          // 将第三方库单独打包
          vendor: ['react', 'react-dom'],
          charts: ['recharts'],
          ui: ['lucide-react', 'framer-motion'],
        },
        // 文件命名优化
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    
    // 资源优化
    assetsInlineLimit: 4096, // 小于4KB的资源内联
    
    // 源映射配置
    sourcemap: process.env.NODE_ENV === 'development',
  },
  
  // 开发服务器配置
  server: {
    port: 3001,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  
  // 预览服务器配置
  preview: {
    port: 3002,
    host: true,
  },
});