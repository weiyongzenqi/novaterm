# NovaTerm — 跨平台 SSH 终端客户端

## 项目概述
一个轻量级、高性能的 SSH 终端客户端，类似 FinalShell/meatshell，使用 Tauri 2 + TypeScript + xterm.js 构建。

## 技术栈
- **前端**: TypeScript + React + xterm.js (WebGL renderer)
- **后端**: Rust (Tauri 2)
- **SSH**: russh crate (纯 Rust SSH 实现)
- **SFTP**: russh-sftp
- **终端**: @xterm/xterm + @xterm/addon-webgl + @xterm/addon-fit + @xterm/addon-search
- **配置**: JSON + Zod (TypeScript schema validation)
- **UI 框架**: React 18 + CSS Variables (主题定制)
- **构建**: Vite + @tauri-apps/cli

## 项目路径
- 项目根目录: `/home/lighthouse/projects/novaterm/`
- 前端源码: `src/`
- Rust后端: `src-tauri/`
- 主题文件: `themes/`

## 核心原则
1. **安全第一**: Host key 验证、密码加密存储、SFTP 路径遍历防护
2. **高性能**: xterm.js WebGL 渲染、Rust 后端处理 SSH
3. **主题定制**: JSON 定义颜色方案，CSS Variables 驱动 UI 主题
4. **跨平台**: Windows / macOS / Linux

## 分阶段实现

### Phase 1: 项目骨架
- Tauri 2 项目初始化 (React + TypeScript + Vite)
- xterm.js 集成 + WebGL 渲染器
- 基础窗口布局 (侧边栏 + 标签栏 + 终端区域)
- CSS Variables 主题基础架构

### Phase 2: SSH 连接
- Rust 后端 SSH 连接管理 (russh crate)
- 密码认证 + 密钥认证
- Tauri IPC 命令 (connect, disconnect, send_data, resize)
- Host key 验证 + known_hosts 管理

### Phase 3: 终端 + 主题
- xterm.js 完整集成 (输入/输出/resize)
- 主题引擎 (JSON → xterm.js ITheme + CSS Variables)
- 内置主题: Dracula, Gruvbox, Nord, Tokyo Night, Catppuccin, One Dark
- 主题切换 UI

### Phase 4: SFTP 面板
- Rust 后端 SFTP 操作 (list, download, upload, delete)
- 前端文件浏览器组件
- 拖拽上传支持

### Phase 5: 会话管理
- 会话 CRUD (JSON 配置 + Zod 校验)
- 平台标准配置目录 (%APPDATA%/novaterm/ 或 ~/.config/novaterm/)
- 会话导入/导出

## 开发规范
- 所有 TypeScript 代码使用 strict mode
- Rust 代码遵循 clippy 标准
- 组件使用 React 函数式组件 + Hooks
- IPC 通信使用 Tauri 的 invoke + event 系统
- 配置使用 Zod schema 验证
