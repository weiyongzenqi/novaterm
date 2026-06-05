你是 NovaTerm 项目的开发者。项目路径：/home/lighthouse/projects/novaterm/

## 你的任务：Phase 2 — SSH 连接后端

### 背景
Phase 1 已完成（Tauri 2 + React + xterm.js 项目骨架）。现在需要实现 SSH 连接功能。

### 步骤

#### 1. 添加 Rust SSH 依赖
编辑 src-tauri/Cargo.toml，添加：
```toml
russh = "0.49"
russh-keys = "0.6"
ssh-key = "0.6"
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
anyhow = "1"
```

#### 2. 实现 SSH 连接管理器 (src-tauri/src/ssh.rs)
创建 SSH 连接管理器，支持：
- 连接到远程服务器（host, port, username）
- 密码认证
- 密钥认证（读取本地私钥文件）
- 打开 PTY 会话
- 发送/接收数据
- 终端 resize
- 断开连接
- **Host key 验证**（重要！比 meatshell 更安全）
  - 实现 known_hosts 文件读取（~/.ssh/known_hosts）
  - 连接时验证服务器密钥
  - 未知主机时返回询问给前端

参考 meatshell 的 ssh.rs 实现（在 /tmp/meatshell/src/ssh.rs），但要改进：
- 不要自动注入 PROMPT_COMMAND 到远程 shell
- 不要自动执行监控脚本
- 必须有 host key 验证

#### 3. Tauri IPC 命令 (src-tauri/src/commands.rs)
创建 Tauri 命令供前端调用：
```rust
#[tauri::command]
async fn ssh_connect(host: String, port: u16, username: String, auth: AuthConfig) -> Result<String, String>

#[tauri::command]
async fn ssh_disconnect(session_id: String) -> Result<(), String>

#[tauri::command]
async fn ssh_send_data(session_id: String, data: Vec<u8>) -> Result<(), String>

#[tauri::command]
async fn ssh_resize(session_id: String, cols: u32, rows: u32) -> Result<(), String>
```

使用 Tauri 的事件系统（app.emit）将 SSH 输出推送到前端：
- `ssh-output` 事件：终端输出数据
- `ssh-connected` 事件：连接成功
- `ssh-closed` 事件：连接关闭
- `ssh-error` 事件：错误信息
- `ssh-host-key-unknown` 事件：未知主机密钥（需要用户确认）

#### 4. TypeScript SSH 接口层 (src/ssh/)
创建前端 SSH 通信层：
- `src/ssh/types.ts` — SSH 相关类型定义
- `src/ssh/useSSH.ts` — React Hook，封装 Tauri invoke + event 监听
- `src/ssh/index.ts` — 模块导出

useSSH Hook 应该：
```typescript
function useSSH() {
  // 连接到服务器
  connect: (config: SSHConfig) => Promise<void>
  // 断开连接
  disconnect: () => Promise<void>
  // 发送数据
  sendData: (data: string) => Promise<void>
  // 终端 resize
  resize: (cols: number, rows: number) => Promise<void>
  // 连接状态
  status: 'disconnected' | 'connecting' | 'connected'
  // 错误信息
  error: string | null
}
```

#### 5. 集成到终端组件
修改 src/terminal/TerminalArea.tsx：
- 每个标签页关联一个 SSH 会话
- 终端输入 → SSH 发送数据
- SSH 输出事件 → 终端写入
- 终端 resize → SSH resize

#### 6. 连接对话框
创建 src/components/ConnectionDialog.tsx：
- 输入 host、port、username
- 选择认证方式（密码/密钥）
- 密码输入框 / 私钥文件路径选择
- 连接按钮
- 错误显示

### 技术约束
- Rust 后端使用 russh 0.49（纯 Rust SSH 实现）
- 使用 tokio 异步运行时
- SSH 输出通过 Tauri 事件系统推送到前端
- 前端使用 @tauri-apps/api 的 invoke + listen
- 必须实现 host key 验证

### 验收标准
1. `cargo check` 在 src-tauri/ 目录下通过（Rust 编译无错误）
2. TypeScript 类型正确（`npm run build` 或 tsc 无错误）
3. SSH 连接命令定义完整
4. 前端 SSH Hook 接口清晰
5. 连接对话框 UI 完成

### 参考
- meatshell SSH 实现: /tmp/meatshell/src/ssh.rs
- russh 文档: https://docs.rs/russh/0.49.0/russh/

完成后输出完成摘要和创建的文件列表。
