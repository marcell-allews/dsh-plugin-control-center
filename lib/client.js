window.__ModuleLoader__.load({
  id: "@dph/dsh-plugin-control-center",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    let react = require("react");
    let react_jsx_runtime = require("react/jsx-runtime");
    let _deepseek_ai_dsh_client_runtime_client = require("@deepseek-ai/dsh-client-runtime/client");

    /**
     * Plugin Control Center - Client Side
     *
     * A settings page for managing all installed plugins:
     * - List all plugins with their status
     * - Enable/disable plugins
     * - Remove plugins
     * - Distinguish native vs external plugins
     */

    const API = {
      LIST: "/api/dsh-plugin-control-center/list",
      TOGGLE: "/api/dsh-plugin-control-center/toggle",
      REMOVE: "/api/dsh-plugin-control-center/remove",
      DETAILS: "/api/dsh-plugin-control-center/details",
      PKG: "/api/dsh-plugin-control-center/pkg",
    };

    async function callApi(path, options) {
      const res = await fetch(path, options);
      let body;
      try {
        body = await res.json();
      } catch {
        body = {};
      }
      if (!res.ok) throw new Error((body && body.error) || `HTTP ${res.status}`);
      return body;
    }

    // CSS styles
    const STYLES = `
      .pcc-root {
        padding: 20px;
        max-width: 860px;
        margin: 0 auto;
      }
      .pcc-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 20px;
        padding-bottom: 16px;
        border-bottom: 1px solid var(--dsw-alias-border-l2);
      }
      .pcc-title {
        font-size: 18px;
        font-weight: 600;
        color: var(--dsw-alias-label-primary);
      }
      .pcc-stats {
        display: flex;
        gap: 14px;
        font-size: 13px;
        color: var(--dsw-alias-label-tertiary);
      }
      .pcc-stat {
        display: flex;
        align-items: center;
        gap: 5px;
      }
      .pcc-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        flex-shrink: 0;
      }
      .pcc-dot-on { background: #10b981; }
      .pcc-dot-off { background: #ef4444; }
      .pcc-dot-nat { background: #3b82f6; }
      .pcc-dot-ext { background: #8b5cf6; }

      .pcc-toolbar {
        display: flex;
        gap: 8px;
        margin-bottom: 16px;
        flex-wrap: wrap;
        align-items: center;
      }
      .pcc-search {
        flex: 1;
        min-width: 180px;
        padding: 7px 12px;
        border: 1px solid var(--dsw-alias-border-l2);
        border-radius: 6px;
        font-size: 13px;
        background: var(--dsw-alias-bg-layer-1);
        color: var(--dsw-alias-label-primary);
        outline: none;
      }
      .pcc-search:focus {
        border-color: var(--dsw-alias-brand-primary);
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
      }

      .pcc-btn {
        padding: 6px 14px;
        border: 1px solid var(--dsw-alias-border-l2);
        border-radius: 6px;
        background: var(--dsw-alias-bg-layer-3);
        color: var(--dsw-alias-label-primary);
        font-size: 13px;
        cursor: pointer;
        transition: all 0.15s;
      }
      .pcc-btn:hover {
        background: var(--dsw-alias-bg-layer-2);
      }
      .pcc-btn-active {
        background: var(--dsw-alias-brand-primary);
        color: #fff;
        border-color: var(--dsw-alias-brand-primary);
      }
      .pcc-btn-active:hover {
        background: var(--dsw-alias-brand-primary-hover, #2563eb);
      }
      .pcc-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .pcc-bulk {
        display: flex;
        gap: 8px;
        align-items: center;
        margin-bottom: 12px;
      }
      .pcc-bulk-btn {
        padding: 5px 10px;
        border: 1px solid var(--dsw-alias-border-l2);
        border-radius: 6px;
        background: var(--dsw-alias-bg-layer-3);
        color: var(--dsw-alias-label-primary);
        font-size: 12px;
        cursor: pointer;
        transition: all 0.15s;
      }
      .pcc-bulk-btn:hover {
        background: var(--dsw-alias-bg-layer-2);
      }
      .pcc-bulk-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .pcc-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .pcc-card {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        background: var(--dsw-alias-bg-layer-3);
        border: 1px solid var(--dsw-alias-border-l2);
        border-radius: 8px;
        transition: all 0.15s;
      }
      .pcc-card:hover {
        border-color: var(--dsw-alias-brand-primary);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
      }
      .pcc-card-off {
        opacity: 0.55;
      }
      .pcc-card-body {
        flex: 1;
        min-width: 0;
        margin-right: 12px;
      }
      .pcc-card-top {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .pcc-card-name {
        font-size: 14px;
        font-weight: 500;
        color: var(--dsw-alias-label-primary);
      }
      .pcc-card-badge {
        display: inline-block;
        padding: 1px 7px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 500;
        line-height: 18px;
      }
      .pcc-card-badge-nat {
        background: #dbeafe;
        color: #1e40af;
      }
      .pcc-card-badge-ext {
        background: #ede9fe;
        color: #6d28d9;
      }
      .pcc-card-id {
        font-size: 12px;
        color: var(--dsw-alias-label-tertiary);
        font-family: monospace;
        margin-top: 2px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .pcc-card-actions {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-shrink: 0;
      }

      .pcc-switch {
        position: relative;
        width: 40px;
        height: 22px;
        border-radius: 11px;
        background: #6b7280;
        cursor: pointer;
        transition: background 0.2s;
        flex-shrink: 0;
      }
      .pcc-switch-on {
        background: #10b981;
      }
      .pcc-switch-knob {
        position: absolute;
        top: 2px;
        left: 2px;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #fff;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        transition: transform 0.2s;
      }
      .pcc-switch-on .pcc-switch-knob {
        transform: translateX(18px);
      }

      .pcc-remove {
        padding: 5px 10px;
        border: 1px solid #fca5a5;
        border-radius: 6px;
        background: #fef2f2;
        color: #dc2626;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.15s;
        white-space: nowrap;
      }
      .pcc-remove:hover {
        background: #fee2e2;
        border-color: #dc2626;
      }
      .pcc-remove:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .pcc-empty {
        text-align: center;
        padding: 48px 20px;
        color: var(--dsw-alias-label-tertiary);
        font-size: 14px;
      }
    `;

    // Inject styles
    const styleTagId = "@dph/dsh-plugin-control-center/styles";
    if (typeof document !== "undefined" && !document.querySelector(`style[data-plugin-css="${styleTagId}"]`)) {
      const tag = document.createElement("style");
      tag.dataset.plugin = "@dph/dsh-plugin-control-center";
      tag.dataset.pluginCss = styleTagId;
      tag.textContent = STYLES;
      document.head.appendChild(tag);
    }

    /**
     * Main Plugin Control Center component
     */
    function PluginControlCenter() {
      const [plugins, setPlugins] = react.useState([]);
      const [loading, setLoading] = react.useState(true);
      const [filter, setFilter] = react.useState("all");
      const [search, setSearch] = react.useState("");
      const [busy, setBusy] = react.useState(false);
      const [error, setError] = react.useState(null);
      const [notice, setNotice] = react.useState(null);

      const load = react.useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
          const result = await callApi(API.LIST);
          const plugins = (result.plugins || []).map((e) => ({
            id: e.patchId || e.entryId,
            moduleName: e.moduleName,
            name: e.moduleName || e.entryId,
            disabled: !e.enabled,
            native: (e.moduleName || "").startsWith("@deepseek-ai/"),
            dynamic: !!e.dynamic,
            phase: e.fiberPhase,
          }));
          setPlugins(plugins);
        } catch (e) {
          setError(e.message);
        }
        setLoading(false);
      }, []);

      react.useEffect(() => {
        load();
      }, [load]);

      const doToggle = async (p) => {
        setBusy(true);
        try {
          await callApi(API.TOGGLE, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: p.id, enable: p.disabled }) });
          setNotice(`${p.disabled ? "启用" : "禁用"} ${p.name}，已写入配置，正在热重载…`);
          await load();
        } catch (e) {
          setError(e.message);
        }
        setBusy(false);
      };

      const doRemove = async (p) => {
        if (!confirm(`确定要移除插件 '${p.name}' 吗？将从配置删除并把包移出 node_modules 备份。`)) return;
        setBusy(true);
        try {
          const res = await callApi(API.REMOVE, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: p.id, moduleName: p.moduleName }) });
          const notes = (res.notes || []).join("；");
          setNotice(`已移除 ${p.name}${res.moved ? "，包已移出备份" : ""}${notes ? "。" + notes : ""}`);
          await load();
        } catch (e) {
          setError(e.message);
        }
        setBusy(false);
      };

      const doEnableAll = async () => {
        setBusy(true);
        try {
          for (const p of plugins) {
            if (p.disabled && !p.dynamic) await callApi(API.TOGGLE, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: p.id, enable: true }) });
          }
          await load();
        } catch (e) {
          setError(e.message);
        }
        setBusy(false);
      };

      const doDisableAll = async () => {
        setBusy(true);
        try {
          for (const p of plugins) {
            if (!p.disabled && !p.dynamic) await callApi(API.TOGGLE, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: p.id, enable: false }) });
          }
          await load();
        } catch (e) {
          setError(e.message);
        }
        setBusy(false);
      };

      const filtered = plugins.filter((p) => {
        if (filter === "enabled" && p.disabled) return false;
        if (filter === "disabled" && !p.disabled) return false;
        if (filter === "native" && !p.native) return false;
        if (filter === "external" && p.native) return false;
        if (search) {
          const q = search.toLowerCase();
          return p.id.toLowerCase().includes(q) || (p.name && p.name.toLowerCase().includes(q));
        }
        return true;
      });

      const stats = {
        total: plugins.length,
        enabled: plugins.filter((p) => !p.disabled).length,
        disabled: plugins.filter((p) => p.disabled).length,
        native: plugins.filter((p) => p.native).length,
        external: plugins.filter((p) => !p.native).length,
      };

      if (loading) {
        return react.createElement("div", { className: "pcc-empty" }, "加载插件中...");
      }

      return react.createElement("div", { className: "pcc-root" },
        // Header
        react.createElement("div", { className: "pcc-header" },
          react.createElement("div", { className: "pcc-title" }, "插件控制中心"),
          react.createElement("div", { className: "pcc-stats" },
            react.createElement("span", { className: "pcc-stat" },
              react.createElement("span", { className: "pcc-dot pcc-dot-on" }),
              `${stats.enabled} 已启用`
            ),
            react.createElement("span", { className: "pcc-stat" },
              react.createElement("span", { className: "pcc-dot pcc-dot-off" }),
              `${stats.disabled} 已禁用`
            ),
            react.createElement("span", { className: "pcc-stat" },
              react.createElement("span", { className: "pcc-dot pcc-dot-nat" }),
              `${stats.native} 原生`
            ),
            react.createElement("span", { className: "pcc-stat" },
              react.createElement("span", { className: "pcc-dot pcc-dot-ext" }),
              `${stats.external} 外部`
            )
          )
        ),

        // Error / notice
        error && react.createElement("div", {
          style: { color: "#dc2626", marginBottom: 12, fontSize: 13 }
        }, `错误: ${error}`),

        notice && react.createElement("div", {
          style: { color: "#059669", marginBottom: 12, fontSize: 13 }
        }, notice),

        // Toolbar
        react.createElement("div", { className: "pcc-toolbar" },
          react.createElement("input", {
            className: "pcc-search",
            type: "text",
            placeholder: "按 ID 或名称搜索插件...",
            value: search,
            onChange: (e) => setSearch(e.target.value),
          }),
          [
            { key: "all", label: "全部" },
            { key: "enabled", label: "已启用" },
            { key: "disabled", label: "已禁用" },
            { key: "native", label: "原生" },
            { key: "external", label: "外部" }
          ].map((item) =>
            react.createElement("button", {
              key: item.key,
              className: `pcc-btn${filter === item.key ? " pcc-btn-active" : ""}`,
              onClick: () => setFilter(item.key),
            }, item.label)
          )
        ),

        // Bulk actions
        react.createElement("div", { className: "pcc-bulk" },
          react.createElement("button", {
            className: "pcc-bulk-btn",
            disabled: busy,
            onClick: doEnableAll,
          }, "全部启用"),
          react.createElement("button", {
            className: "pcc-bulk-btn",
            disabled: busy,
            onClick: doDisableAll,
          }, "全部禁用")
        ),

        // Plugin list
        react.createElement("div", { className: "pcc-list" },
          filtered.length === 0
            ? react.createElement("div", { className: "pcc-empty" }, "没有匹配的插件")
            : filtered.map((p) =>
              react.createElement("div", {
                key: p.id,
                className: `pcc-card${p.disabled ? " pcc-card-off" : ""}`,
              },
                // Info
                react.createElement("div", { className: "pcc-card-body" },
                  react.createElement("div", { className: "pcc-card-top" },
                    react.createElement("span", { className: "pcc-card-name" }, p.name || p.id),
                    react.createElement("span", {
                      className: `pcc-card-badge ${p.native ? "pcc-card-badge-nat" : "pcc-card-badge-ext"}`
                    }, p.native ? "原生" : "外部")
                  ),
                  react.createElement("div", { className: "pcc-card-id" }, p.id)
                ),
                // Actions
                react.createElement("div", { className: "pcc-card-actions" },
                  react.createElement("div", {
                    className: `pcc-switch${!p.disabled ? " pcc-switch-on" : ""}`,
                    onClick: p.dynamic ? undefined : () => doToggle(p),
                    title: p.dynamic ? "运行时动态插件，无法用配置开关" : p.disabled ? "启用" : "禁用",
                    style: p.dynamic ? { opacity: 0.35, cursor: "not-allowed" } : undefined,
                  },
                    react.createElement("div", { className: "pcc-switch-knob" })
                  ),
                  react.createElement("button", {
                    className: "pcc-remove",
                    disabled: busy || p.native || p.dynamic || p.moduleName === "@dph/dsh-plugin-control-center",
                    onClick: () => doRemove(p),
                  }, p.native ? "内置" : "移除")
                )
              )
            )
        )
      );
    }

    /**
     * Plugin Settings Card for individual plugin configuration
     * This is a placeholder - individual plugins can extend this
     */
    function PluginSettingsCard(props) {
      return react.createElement("div", {
        style: { padding: "12px 0" }
      },
        react.createElement("div", {
          style: { fontWeight: 500, marginBottom: 4 }
        }, props.name || props.id),
        react.createElement("div", {
          style: { fontSize: 12, color: "#6b7280" }
        }, props.description || "暂无描述")
      );
    }

    /**
     * Renders errors inline so a broken section is visible instead of blank.
     */
    class ErrorBoundary extends react.Component {
      constructor(props) {
        super(props);
        this.state = { error: null };
      }
      static getDerivedStateFromError(error) {
        return { error };
      }
      render() {
        if (this.state.error) {
          const msg = this.state.error && this.state.error.message ? this.state.error.message : String(this.state.error);
          return react.createElement("div", { style: { padding: 20, color: "#dc2626", fontFamily: "monospace", fontSize: 12 } },
            "插件控制中心渲染错误: " + msg);
        }
        return this.props.children;
      }
    }

    /**
     * Browser-side plugin entry (cordis {apply, inject} shape).
     * Injecting "slots" ensures ctx.slots is ready before registering.
     */
    function apply(ctx) {
      ctx.slots.inject("settings.section", () =>
        ctx.slots.register(
          {
            name: "settings.section",
            id: "pcc-center",
            order: 85,
            label: () => "插件控制中心",
          },
          PluginControlCenter
        )
      );
    }

    const inject = ["slots"];

    // Export for module loader
    exports.apply = apply;
    exports.inject = inject;
    exports.PluginControlCenter = PluginControlCenter;
    exports.PluginSettingsCard = PluginSettingsCard;
    return module.exports;
  },
});
