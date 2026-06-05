你是 NovaTerm 项目的开发者。项目路径：/home/lighthouse/projects/novaterm/

## 你的任务：Phase 3 — 终端集成 + 主题联动 + 编译修复

### 背景
Phase 1（骨架）和 Phase 2（SSH 后端）已完成。现在需要：
1. 修复编译错误让项目能通过 cargo check
2. 完善终端与 SSH 的集成
3. 确保主题切换联动正常

### 步骤

#### 1. 修复 Rust 编译错误
先运行 `cargo check` 看看有什么错误，逐个修复：
- 可能有 russh API 变化导致的类型不匹配
- 可能缺少依赖（sha2, base64, uuid, async-trait 等）
- 确保 `cargo check` 在 src-tauri/ 目录下通过

#### 2. 修复 TypeScript 编译错误
运行 `npx tsc --noEmit` 检查 TypeScript 错误，逐个修复。

#### 3. 完善终端与 SSH 集成
检查并完善 src/components/layout/TerminalArea.tsx：
- 确保终端输入通过 useSSH 的 sendData 发送到远程
- 确保 SSH 输出事件写入 xterm.js 终端
- 确保终端 resize 调用 SSH resize
- 每个标签页应有独立的 SSH 会话

#### 4. 完善主题联动
检查 src/themes/ 和 src/components/ThemeSelector.tsx：
- 确保主题切换时 CSS Variables 更新
- 确保 xterm.js 终端主题同步更新
- 确保侧边栏、标签栏、状态栏颜色跟随主题

#### 5. 确保 App.tsx 正确组装
检查 src/App.tsx：
- ThemeProvider 应包裹整个应用
- AppLayout 应包含所有组件
- ConnectionDialog 应能正确打开/关闭

### 验收标准
1. `cargo check` 在 src-tauri/ 下通过（0 errors）
2. `npx tsc --noEmit` 通过（0 errors）
3. 所有组件导入/导出正确
4. 主题切换逻辑完整

### 重要提示
- 如果 cargo check 有错误，优先修复 Rust 代码
- 如果某个依赖版本不对，修改 Cargo.toml
- 不要删除已有功能，只修复和补全
- 参考 /tmp/meatshell/src/ssh.rs 的实现方式

完成后输出修复摘要。
