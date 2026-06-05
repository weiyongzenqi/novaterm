你是 NovaTerm 项目的开发者。项目路径：/home/lighthouse/projects/novaterm/

## 你的任务：Phase 1 — 项目骨架搭建

### 步骤

#### 1. 初始化 Tauri 2 项目
在 /home/lighthouse/projects/novaterm/ 目录下初始化 Tauri 2 项目：
- 使用 `npm create tauri-app@latest . -- --template react-ts` 初始化
- 如果目录不为空，先备份再初始化
- 确保使用 Tauri 2.x（不是 1.x）

#### 2. 安装依赖
```bash
npm install @xterm/xterm @xterm/addon-webgl @xterm/addon-fit @xterm/addon-search
npm install zod
```

#### 3. 集成 xterm.js
创建 src/terminal/ 目录，实现：
- Terminal.tsx — xterm.js React 组件，使用 WebGL 渲染器
- useTerminal.ts — 自定义 Hook 管理 terminal 生命周期
- 支持终端 resize（fit addon）
- 支持搜索（search addon）

#### 4. 基础窗口布局
参考 FinalShell/meatshell 风格创建布局：
- 左侧侧边栏（220px，深色背景，预留系统监控区域）
  - 显示连接状态
  - 预留 CPU/内存/网络监控区域
- 顶部标签栏
  - 支持多标签页
  - 新建/关闭标签
  - 标签切换
- 中央终端区域（xterm.js 渲染）
- 底部状态栏

#### 5. 主题系统
创建 src/themes/ 目录：

定义主题类型 (src/themes/types.ts):
```typescript
interface TerminalTheme {
  name: string;
  displayName: string;
  colors: {
    black: string;
    red: string;
    green: string;
    yellow: string;
    blue: string;
    magenta: string;
    cyan: string;
    white: string;
    brightBlack: string;
    brightRed: string;
    brightGreen: string;
    brightYellow: string;
    brightBlue: string;
    brightMagenta: string;
    brightCyan: string;
    brightWhite: string;
    foreground: string;
    background: string;
    cursor: string;
    cursorAccent: string;
    selectionBackground: string;
    selectionForeground: string;
  };
  ui: {
    sidebarBg: string;
    tabBg: string;
    tabActiveBg: string;
    statusBarBg: string;
    borderColor: string;
    accentColor: string;
  };
}
```

创建主题引擎 (src/themes/engine.ts):
- JSON → xterm.js ITheme 转换
- JSON → CSS Variables 映射
- 主题切换函数
- 当前主题状态管理

创建 6 个内置主题 JSON 文件 (themes/):
- dracula.json
- gruvbox-dark.json
- nord.json
- tokyo-night.json
- catppuccin-mocha.json
- one-dark.json

#### 6. 主题切换 UI
在侧边栏底部添加主题选择器下拉框

### 技术约束
- Tauri 2.x
- React 18 函数式组件 + Hooks
- TypeScript strict mode
- xterm.js WebGL 渲染器
- CSS 用 CSS Modules（.module.css 文件）
- 深色主题为默认

### 验收标准
1. `npm run tauri dev` 能启动开发模式
2. 窗口显示正确布局（侧边栏 + 标签栏 + 终端 + 状态栏）
3. xterm.js 终端能显示并接受键盘输入
4. 主题切换功能可用（切换后 UI 和终端颜色都变化）
5. 至少有 3 个内置主题可以切换

完成后请输出完成摘要，包括创建的文件列表和如何启动。
