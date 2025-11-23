# Interview Questions Platform

一个基于 Angular 构建的现代化面试题浏览平台，集成了 AI 智能问答流式响应功能。

![Angular](https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![SCSS](https://img.shields.io/badge/SCSS-CC6699?style=for-the-badge&logo=sass&logoColor=white)

## ✨ 主要功能

- **🗂️ 分类浏览**：首页展示技术栈分类卡片，支持按层级浏览。
- **🔐 访问控制**：
  - 首次访问需阅读并同意免责声明（模拟登录）。
- **📝 详情页与导航**：
  - 左侧侧边栏展示该分类下的问题列表。
  - 支持 URL 深层链接 (`/detail/:id/:questionId`)，方便分享。
- **🤖 AI 流式问答**：
  - 接入后端 AI 接口，支持打字机效果的流式答案渲染。
  - **Markdown 支持**：集成 `marked` 库，完美渲染代码块、列表等富文本格式。
  - **实时刷新**：支持重新获取 AI 回答。
- **🎨 现代化 UI**：
  - **暗黑模式**：支持明亮/暗黑主题一键切换。
  - **响应式设计**：适配移动端和桌面端布局。
  - **动态背景**：优雅的粒子背景动画。

## 🛠️ 技术栈

- **核心框架**: Angular (Latest)
- **状态管理**: Angular Signals (原生响应式)
- **样式**: SCSS (CSS Variables 实现主题切换)
- **工具库**:
  - `marked`: Markdown 解析
  - `rxjs`: 异步数据流处理

## 🚀 快速开始

### 环境要求

- Node.js
- npm

### 安装

```bash
# 克隆项目
git clone https://github.com/kidwen/interview-questions.git

# 进入目录
cd interview-questions

# 安装依赖
npm install
```

### 运行开发服务器

```bash
npm start
# 或
ng serve
```

访问 `http://localhost:4200/` 查看效果。

## 📦 构建部署

```bash
npm run build
```

构建产物将输出到 `dist/` 目录。

## 🤝 贡献

欢迎提交 Issue 或 Pull Request！

## 📄 许可证

MIT License
