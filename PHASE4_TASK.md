你是 NovaTerm 项目的开发者。项目路径：/home/lighthouse/projects/novaterm/

## 你的任务：Phase 4 — SFTP 文件浏览面板

### 背景
Phase 1-3 已完成，项目可编译通过。现在需要实现 SFTP 文件管理功能。

### 步骤

#### 1. Rust 后端 SFTP 支持
编辑 src-tauri/Cargo.toml，添加 russh-sftp 依赖：
```toml
russh-sftp = "2"
```

创建 src-tauri/src/sftp.rs，实现：
- SFTP 会话管理（独立于 SSH shell 会话）
- 列目录（list_dir）
- 上传文件（upload）
- 下载文件（download）
- 删除文件（delete）
- 创建目录（mkdir）

参考 /tmp/meatshell/src/sftp.rs 的实现模式，但：
- 使用 Tauri 事件系统推送结果到前端
- 不要自动注入远程命令

#### 2. Tauri IPC 命令
在 src-tauri/src/commands.rs 中添加 SFTP 命令：
```rust
#[tauri::command]
async fn sftp_list_dir(session_id: String, path: String) -> Result<Vec<RemoteEntry>, String>

#[tauri::command]
async fn sftp_download(session_id: String, remote_path: String, local_dir: String) -> Result<String, String>

#[tauri::command]
async fn sftp_upload(session_id: String, local_path: String, remote_dir: String) -> Result<String, String>

#[tauri::command]
async fn sftp_delete(session_id: String, path: String) -> Result<(), String>

#[tauri::command]
async fn sftp_mkdir(session_id: String, path: String) -> Result<(), String>
```

#### 3. 前端 SFTP 组件
创建 src/components/SftpPanel.tsx + SftpPanel.module.css：
- 文件列表（表格形式：名称、大小、修改时间、类型图标）
- 地址栏（当前路径 + 导航）
- 面包屑导航
- 工具栏（上传、下载、删除、新建文件夹、刷新）
- 文件选择（单选/多选）
- 拖拽上传支持（可选）

布局：SFTP 面板在终端下方或右侧，可折叠

#### 4. 前端 SFTP Hook
创建 src/ssh/useSFTP.ts：
```typescript
function useSFTP(sessionId: string | null) {
  listDir: (path: string) => Promise<RemoteEntry[]>
  download: (remotePath: string, localDir: string) => Promise<void>
  upload: (localPath: string, remoteDir: string) => Promise<void>
  deleteFile: (path: string) => Promise<void>
  mkdir: (path: string) => Promise<void>
  entries: RemoteEntry[]
  currentPath: string
  loading: boolean
}
```

#### 5. 集成到 AppLayout
修改 AppLayout.tsx：
- 在终端区域下方添加可折叠的 SFTP 面板
- 添加切换按钮显示/隐藏 SFTP 面板
- SFTP 面板跟随当前活动标签页的 SSH 会话

### 技术约束
- Rust 后端使用 russh-sftp 2.x
- 前端使用 CSS Modules
- 文件大小格式化（B/KB/MB/GB）
- 时间格式化（YYYY-MM-DD HH:MM）
- 支持深色主题（使用 CSS Variables）

### 验收标准
1. `cargo check` 通过
2. `npx tsc --noEmit` 通过
3. SFTP 面板 UI 完整（文件列表、地址栏、工具栏）
4. 所有 SFTP 操作命令定义完整
5. useSFTP Hook 接口清晰

### 参考
- meatshell SFTP 实现: /tmp/meatshell/src/sftp.rs
- russh-sftp 文档: https://docs.rs/russh-sftp/2/

完成后输出完成摘要。
