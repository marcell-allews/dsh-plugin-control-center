# DSH Plugin Control Center

一个用于管理 DSH 所有已安装插件的设置页面。

## 功能

- **查看所有插件**：列出所有已安装的插件及其状态
- **启用/禁用插件**：一键切换插件的启用状态
- **删除插件**：从配置移除插件，并把外部包移出 node_modules 备份
- **区分原生与外来插件**：清晰标识哪些是 DSH 原生插件，哪些是用户安装的外部插件

## 安装

### 方法 1：本地安装

```bash
cd ~/.dsh/profiles/web
npm install /path/to/dsh-plugin-control-center
```

### 方法 2：链接安装

```bash
cd ~/.dsh/profiles/web
npm link /path/to/dsh-plugin-control-center
```

### 方法 3：通过 pnpm 安装

```bash
cd ~/.dsh/profiles/web
pnpm add file:/path/to/dsh-plugin-control-center
```

## 使用

安装后，插件会自动注册到 DSH 设置面板中。你可以在设置中找到 "Plugin Control Center" 选项卡。

### 界面说明

- **统计信息**：显示已启用、已禁用、原生和外部插件的数量
- **搜索框**：按 ID 或名称搜索插件
- **过滤器**：按状态（启用/禁用）或类型（原生/外部）过滤
- **批量操作**：一键启用或禁用所有插件
- **单个操作**：
  - 切换开关：启用/禁用插件
  - Remove 按钮：从配置移除插件（外部包移出到 .uninstalled/ 备份）

## 原生插件

`moduleName` 以 `@deepseek-ai/` 开头的插件被视为 DSH 原生插件（显示"内置"，移除按钮禁用）；其余为外部插件。原生插件可通过开关禁用，但不能移除。

## 配置

插件通过修改 `~/.dsh/profiles/web/cordis.patch.yml` 文件来管理插件的启用/禁用状态。写入的是插件的**原始 id**（如 `- id: ui-session-manager` + `disabled: true`），由 dsh 的 patch 热重载即时应用，重启后保留。

## 注意事项

- 移除插件不可撤销，请谨慎操作；外部包备份在 `~/.dsh/profiles/web/.uninstalled/`，可手动移回恢复
- 启用/禁用写入配置后立即热重载生效；若 dsh 未运行，下次启动时生效
- 不要写 `- id: include:xxx` 前缀行——dsh 的 patch 按原始 id 匹配，前缀行无效
- 此插件仅管理 cordis.patch.yml 中定义的插件；bundle 层插件（在 `dsh.profile.bundles` 里）只能禁用，不能移除

## 开发

本项目无构建流程，`lib/` 目录就是源码本体（`index.js` 为 Node 端，`client.js` 为浏览器端 bundle）。直接修改 `lib/` 后，把改动同步到 `~/.dsh/profiles/web/node_modules/@dph/dsh-plugin-control-center/lib/` 并重启 dsh 即可生效。

## License

MIT
