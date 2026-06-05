export const zh = {
  // 通用
  'app.name': 'NovaTerm',
  'common.cancel': '取消',
  'common.confirm': '确认',
  'common.save': '保存',
  'common.delete': '删除',
  'common.close': '关闭',
  'common.loading': '加载中...',
  'common.error': '错误',

  // 侧边栏
  'sidebar.connection': '连接',
  'sidebar.newConnection': '+ 新建连接',
  'sidebar.sessions': '会话',
  'sidebar.manage': '管理',
  'sidebar.noSessions': '暂无保存的会话',
  'sidebar.systemMonitor': '系统监控',
  'sidebar.cpu': 'CPU',
  'sidebar.memory': '内存',
  'sidebar.network': '网络',

  // 连接对话框
  'dialog.newConnection': '新建 SSH 连接',
  'dialog.host': '主机',
  'dialog.port': '端口',
  'dialog.username': '用户名',
  'dialog.authentication': '认证方式',
  'dialog.password': '密码',
  'dialog.privateKeyPath': '私钥路径',
  'dialog.connect': '连接',

  // 终端
  'terminal.ready': '终端就绪',
  'terminal.connected': '已连接到服务器',
  'terminal.clickToConnect': '点击"新建连接"开始 SSH 会话',

  // SFTP
  'sftp.title': 'SFTP 文件管理',
  'sftp.hide': '隐藏 SFTP',
  'sftp.show': '显示 SFTP',
  'sftp.upload': '上传',
  'sftp.download': '下载',
  'sftp.delete': '删除',
  'sftp.newFolder': '新建文件夹',
  'sftp.parentDir': '上级目录',
  'sftp.refresh': '刷新',
  'sftp.emptyDir': '空目录',
  'sftp.name': '名称',
  'sftp.size': '大小',
  'sftp.modified': '修改时间',
  'sftp.saveFile': '保存文件',
  'sftp.enterFolderName': '请输入文件夹名称',

  // 状态栏
  'status.disconnected': '未连接',
  'status.connecting': '连接中...',
  'status.connected': '已连接',

  // 会话管理
  'session.title': '会话管理',
  'session.new': '新建会话',
  'session.edit': '编辑',
  'session.name': '会话名称',
  'session.host': '主机',
  'session.port': '端口',
  'session.username': '用户名',
  'session.authType': '认证类型',
  'session.group': '分组',
  'session.lastUsed': '上次使用',
  'session.export': '导出',
  'session.import': '导入',
} as const;

export type TranslationKey = keyof typeof zh;
export function t(key: TranslationKey): string {
  return zh[key];
}
