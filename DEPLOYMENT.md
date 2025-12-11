# AI思维导图生成器 - 部署指南

## 项目概述

AI思维导图生成器是一个基于React的单页应用（SPA），使用Gemini AI API将各种格式的内容智能转换为可视化思维导图。

## 技术栈

- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite
- **UI库**: Tailwind CSS
- **思维导图渲染**: ReactFlow
- **AI集成**: Google Gemini API
- **状态管理**: Zustand
- **测试框架**: Vitest + Testing Library

## 构建要求

### 系统要求
- Node.js 18+ 
- npm 或 yarn
- 现代浏览器支持（Chrome 90+, Firefox 88+, Safari 14+）

### 依赖安装
```bash
npm install
```

## 构建命令

### 开发环境
```bash
npm run dev
```
启动开发服务器，默认端口 5173

### 生产构建
```bash
npm run build
```
生成优化的生产版本到 `dist/` 目录

### 类型检查构建
```bash
npm run build:check
```
先进行TypeScript类型检查，然后构建

### 预览构建
```bash
npm run preview
```
本地预览生产构建版本

### 测试
```bash
npm test
```
运行所有测试套件

## 构建优化

### 代码分割
项目已配置自动代码分割：
- `react-vendor`: React核心库
- `reactflow`: 思维导图渲染库  
- `gemini`: Google AI SDK

### 打包大小优化
- 使用Terser进行代码压缩
- 启用Tree Shaking移除未使用代码
- CSS压缩和优化
- 图片资源优化

### 性能特性
- 虚拟化渲染（大型思维导图）
- 懒加载组件
- 防抖和节流优化
- 内存缓存策略

## 部署选项

### 1. Vercel（推荐）

**优势**: 零配置部署，自动HTTPS，全球CDN

**部署步骤**:
1. 将代码推送到GitHub仓库
2. 在Vercel中导入项目
3. 自动检测Vite配置并部署

**配置文件** (`vercel.json`):
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite"
}
```

### 2. Netlify

**优势**: 持续部署，表单处理，边缘函数

**部署步骤**:
1. 连接GitHub仓库
2. 设置构建命令: `npm run build`
3. 设置发布目录: `dist`

**配置文件** (`netlify.toml`):
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### 3. GitHub Pages

**优势**: 免费托管，适合开源项目

**部署步骤**:
1. 安装gh-pages: `npm install --save-dev gh-pages`
2. 添加部署脚本到package.json:
```json
{
  "scripts": {
    "deploy": "npm run build && gh-pages -d dist"
  }
}
```
3. 运行: `npm run deploy`

### 4. 自托管服务器

**Nginx配置示例**:
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/dist;
    index index.html;

    # 处理SPA路由
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 静态资源缓存
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    add_header X-XSS-Protection "1; mode=block";
}
```

## 环境配置

### 环境变量
应用不需要服务器端环境变量，所有配置在客户端完成：
- API密钥由用户在设置中配置
- 数据存储在浏览器本地存储

### 浏览器兼容性
- Chrome 90+
- Firefox 88+  
- Safari 14+
- Edge 90+

## 安全考虑

### 客户端安全
- API密钥使用Web Crypto API加密存储
- 输入验证和XSS防护
- 文件大小和类型限制
- 内容安全策略(CSP)

### 推荐CSP头
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://generativelanguage.googleapis.com;
```

## 监控和分析

### 性能监控
- 使用浏览器开发者工具监控性能
- 配置Web Vitals监控
- 设置错误追踪（如Sentry）

### 分析工具
- Google Analytics
- 用户行为分析
- 性能指标收集

## 故障排除

### 常见问题

**1. 构建失败**
- 检查Node.js版本（需要18+）
- 清除node_modules并重新安装
- 检查TypeScript错误

**2. 运行时错误**
- 检查浏览器控制台错误
- 验证API密钥配置
- 检查网络连接

**3. 性能问题**
- 启用虚拟化渲染
- 检查内存使用情况
- 优化思维导图节点数量

### 调试模式
开发环境下启用详细日志：
```javascript
// 在浏览器控制台中
localStorage.setItem('debug', 'true')
```

## 更新和维护

### 依赖更新
```bash
npm update
npm audit fix
```

### 版本发布
1. 更新版本号: `npm version patch/minor/major`
2. 构建生产版本: `npm run build`
3. 部署到生产环境
4. 创建Git标签和发布说明

## 支持和文档

- 项目文档: README.md
- API文档: 查看各服务模块注释
- 问题反馈: GitHub Issues
- 技术支持: 查看故障排除指南

---

**注意**: 本应用为纯前端应用，不需要后端服务器。所有数据处理在浏览器中完成，确保用户数据隐私和安全。