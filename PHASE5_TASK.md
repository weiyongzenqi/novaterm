你是 NovaTerm 项目的开发者。项目路径：/home/lighthouse/projects/novaterm/

## 你的任务：Phase 5 — 会话管理 + 配置持久化

### 背景
Phase 1-4 已完成（骨架、SSH、终端集成、SFTP）。现在需要实现会话管理和配置持久化。

### 步骤

#### 1. 会话数据模型
创建 src/config/types.ts：
```typescript
interface SessionConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  authType: 'password' | 'key';
  // 密码不存储（安全考虑）
  privateKeyPath?: string;
  lastUsed?: string;
  group?: string;
}

interface AppConfig {
  sessions: SessionConfig[];
  activeTheme: string;
  downloadDir: string;
  terminalFontSize: number;
  terminalFontFamily: string;
}
```

#### 2. Zod Schema 验证
创建 src/config/schema.ts：
- 使用 Zod 定义配置 schema
- 提供默认值
- 验证函数

#### 3. 配置管理 Hook
创建 src/config/useConfig.ts：
- 加载配置（从 Tauri app config dir）
- 保存配置
- 添加/更新/删除会话
- 导入/导出会话（JSON 文件）

#### 4. Rust 后端配置支持
在 src-tauri/src/ 中添加或更新 config.rs：
- 使用 tauri::api::path 获取配置目录
- 读写 JSON 配置文件
- 配置目录：~/.config/novaterm/config.json（Linux）
  或 %APPDATA%/novaterm/config.json（Windows）

在 commands.rs 中添加命令：
```rust
#[tauri::command]
async fn load_config() -> Result<AppConfig, String>

#[tauri::command]
async fn save_config(config: AppConfig) -> Result<(), String>

#[tauri::command]
async fn import_sessions(path: String) -> Result<Vec<SessionConfig>, String>

#[tauri::command]
async fn export_sessions(sessions: Vec<SessionConfig>, path: String) -> Result<(), String>
```

#### 5. 会话管理 UI
创建 src/components/SessionManager.tsx + SessionManager.module.css：
- 会话列表（表格：名称、主机、端口、用户名、最后使用）
- 新建会话按钮（复用 ConnectionDialog）
- 编辑会话
- 删除会话（确认对话框）
- 会话分组（可选）
- 搜索/过滤

#### 6. 集成到 Sidebar
修改 Sidebar.tsx：
- 显示已保存的会话列表
- 点击会话 → 快速连接
- 右键菜单（编辑、删除、复制）
- "New Connection" 按钮打开 SessionManager

#### 7. 安全注意事项
- 密码不持久化存储（每次连接时输入）
- 私钥路径可以保存
- 配置文件权限设置（600）

### 验收标准
1. `cargo check` 通过
2. `npx tsc --noEmit` 通过
3. 配置加载/保存功能完整
4. 会话 CRUD 操作正确
5. SessionManager UI 完整
6. Sidebar 集成会话列表

### 技术约束
- 使用 Zod 进行 schema 验证
- JSON 配置格式
- 平台标准配置目录
- CSS Modules 样式

完成后输出完成摘要和创建的文件列表。
