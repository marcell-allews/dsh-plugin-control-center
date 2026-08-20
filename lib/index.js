import { readFileSync, writeFileSync, existsSync, renameSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";

/**
 * Plugin Control Center - Host Side
 *
 * Registers HTTP API routes (via ctx.webServer) for the client to:
 * - List all plugins from cordis.patch.yml
 * - Toggle plugin enabled/disabled state
 * - Remove plugins from the configuration
 */

// 原生/外部判定在前端完成：moduleName 以 "@deepseek-ai/" 开头 = dsh 自带原生。
// toggle/remove 一律用数据行原始 id（patchId），绝不写 "include:" 前缀行——
// cordis 的 applyEntryPatches 按原始 id 匹配，前缀行是空操作。

/** API route base */
const API_BASE = "/api/dsh-plugin-control-center";

/** Get path to cordis.patch.yml */
function getPatchPath() {
  return join(homedir(), ".dsh", "profiles", "web", "cordis.patch.yml");
}

/** Get path to package.json */
function getPkgPath() {
  return join(homedir(), ".dsh", "profiles", "web", "package.json");
}

/**
 * 定位 id 在 patch 文件中的位置。
 * topIdx = 顶层 "- id: <id>" 行索引；insertIdx = "- insert:" 块内匹配行索引。
 * 顶层行无缩进，insert 块内行有缩进，据此区分。
 */
function locateEntry(lines, id) {
  let topIdx = -1;
  let insertIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    const m = trimmed.match(/^- id:\s*['"]?([^\s'"]+)['"]?\s*$/);
    if (!m || m[1] !== id) continue;
    if (lines[i].startsWith("- ")) {
      topIdx = i;
    } else {
      insertIdx = i;
    }
  }
  return { topIdx, insertIdx };
}

/** 该行是否为 disabled: true */
function isDisabledTrue(line) {
  return /^\s*disabled:\s*true\s*$/.test(line || "");
}

/** 原子写回 patch 文件（临时文件 + rename，避免半截写入被热重载读到） */
function writePatch(patchPath, next) {
  const tmp = patchPath + ".tmp-" + process.pid;
  writeFileSync(tmp, next, "utf-8");
  renameSync(tmp, patchPath);
}

/** 读 profile package.json 的 dsh.profile.bundles */
function readProfileBundles() {
  const pkgPath = getPkgPath();
  if (!existsSync(pkgPath)) return [];
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    return pkg.dsh?.profile?.bundles || [];
  } catch {
    return [];
  }
}

/**
 * 把非核心外部包移出 node_modules 到 profile 下 .uninstalled/ 备份（可恢复）。
 * 返回是否真的移动；不移动的原因写进 notes。
 */
function uninstallPkg(moduleName, notes) {
  if (!moduleName || moduleName.startsWith("@deepseek-ai/")) return false;
  const nm = join(homedir(), ".dsh", "profiles", "web", "node_modules");
  const src = join(nm, moduleName);
  if (!existsSync(src)) return false;
  if (readProfileBundles().includes(moduleName)) {
    notes.push(`包 ${moduleName} 由 dsh.profile.bundles 管理，未移出（只能禁用，不能移除）`);
    return false;
  }
  const dest = join(homedir(), ".dsh", "profiles", "web", ".uninstalled", moduleName);
  try {
    mkdirSync(dirname(dest), { recursive: true });
    renameSync(src, dest);
    return true;
  } catch (e) {
    notes.push(`移出包失败（${e.code || e.message}）：可能被占用，请先关闭 dsh 再试`);
    return false;
  }
}

/**
 * 启用/禁用插件：写 patch 文件原始 id 行。返回 { success, changed }。
 * 改完由 dsh 的 watchUserPatches 热重载即时生效，重启也保留。
 */
function togglePlugin(id, enable) {
  if (id === "include") return { success: false, error: "不能操作根 include 入口" };
  const patchPath = getPatchPath();
  if (!existsSync(patchPath)) return { success: false, error: "Patch file not found" };

  const content = readFileSync(patchPath, "utf-8");
  const lines = content.split("\n");
  const { topIdx } = locateEntry(lines, id);
  const hasTopDisabled = topIdx >= 0 && isDisabledTrue(lines[topIdx + 1]);

  if (enable) {
    // 启用：删除顶层 disabled 行即可（disabled: false 等价，一并删掉更干净）
    if (!hasTopDisabled) return { success: true, changed: false };
    const newLines = lines.slice(0, topIdx + 1).concat(lines.slice(topIdx + 2));
    writePatch(patchPath, newLines.join("\n"));
    return { success: true, changed: true };
  }

  // 禁用
  if (topIdx >= 0) {
    if (hasTopDisabled) return { success: true, changed: false }; // 已禁用
    const indent = (lines[topIdx].match(/^\s*/) || [""])[0];
    const newLines = lines.slice(0, topIdx + 1)
      .concat([`${indent}  disabled: true`], lines.slice(topIdx + 1));
    writePatch(patchPath, newLines.join("\n"));
    return { success: true, changed: true };
  }

  // 顶层无该行（在 insert 块内或根本不存在）：文件尾追加原始 id 禁用行
  const sep = content.endsWith("\n") ? "" : "\n";
  writePatch(patchPath, `${content}${sep}- id: ${id}\n  disabled: true\n`);
  return { success: true, changed: true };
}

/**
 * 移除插件：从 patch 文件删除对应条目（顶层行或 insert 块），并把外部包移出 node_modules 备份。
 */
function removePlugin(id, moduleName) {
  const patchPath = getPatchPath();
  const notes = [];

  if (moduleName === "@dph/dsh-plugin-control-center") {
    return { success: false, error: "不能移除插件控制中心自身" };
  }

  let removed = false;
  if (existsSync(patchPath)) {
    const lines = readFileSync(patchPath, "utf-8").split("\n");
    const newLines = [];
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();

      // insert 块：块内引用目标 id 或 moduleName 则整块删除
      if (trimmed.startsWith("- insert:")) {
        const block = [lines[i]];
        let j = i + 1;
        let hit = false;
        while (j < lines.length) {
          const sub = lines[j].trim();
          if (sub !== "" && !sub.startsWith("- id:") && !sub.startsWith("name:") && !sub.startsWith("disabled:")) break;
          const subId = sub.match(/^- id:\s*['"]?([^\s'"]+)['"]?\s*$/);
          const subName = sub.match(/^name:\s*['"]?([^'"]+)['"]?\s*$/);
          if ((subId && subId[1] === id) || (subName && subName[1] === moduleName)) hit = true;
          block.push(lines[j]);
          j++;
        }
        if (hit) {
          removed = true;
          i = j - 1;
          continue;
        }
        newLines.push(...block);
        i = j - 1;
        continue;
      }

      // 顶层 - id: 行（含后随 disabled/name 行）
      const idMatch = trimmed.match(/^- id:\s*['"]?([^\s'"]+)['"]?\s*$/);
      if (idMatch && idMatch[1] === id) {
        removed = true;
        let j = i + 1;
        while (j < lines.length && /^\s*(disabled:|name:)/.test(lines[j])) j++;
        i = j - 1;
        continue;
      }

      newLines.push(lines[i]);
    }
    if (removed) writePatch(patchPath, newLines.join("\n"));
  }

  const moved = uninstallPkg(moduleName, notes);

  if (!removed && !moved) {
    return { success: false, error: "插件不存在于 patch 文件，且未移出包", notes };
  }
  return { success: true, removed, moved, notes };
}

/**
 * Get plugin details from package.json
 */
function getPluginDetails(id) {
  const basePath = join(homedir(), ".dsh", "profiles", "web", "node_modules");

  // Search in common locations
  const searchPaths = [
    join(basePath, id),
    join(basePath, "@linxin666", id),
    join(basePath, "@deepseek-ai", id),
    join(basePath, "@dph", id),
  ];

  for (const p of searchPaths) {
    const pkgPath = join(p, "package.json");
    if (existsSync(pkgPath)) {
      try {
        const content = readFileSync(pkgPath, "utf-8");
        return JSON.parse(content);
      } catch (e) {
        // continue
      }
    }
  }

  return { error: "Package not found" };
}

/** Write a JSON response. */
function writeJson(res, status, data) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(data));
}

/** Read a JSON request body. */
function readJson(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch {
        resolve({});
      }
    });
  });
}

/** Build the HTTP route table. */
function makeRoutes(ctx) {
  const list = async (req, res) => {
    try {
      const entries = [];
      for (const entry of ctx.loader.entries()) {
        if (entry.options.group) continue;
        const patchId = entry.options.id;
        entries.push({
          entryId: entry.id,
          moduleName: entry.options.name,
          enabled: !entry.disabled,
          fiberPhase: entry.fiber === void 0 ? null : entry.fiber.state,
          patchId: patchId ?? entry.id,
          dynamic: patchId === "include" || /^[0-9a-f]{8}$/i.test(patchId || ""),
        });
      }
      writeJson(res, 200, { plugins: entries });
    } catch (e) {
      writeJson(res, 500, { error: e.message, plugins: [] });
    }
  };

  const toggle = async (req, res) => {
    try {
      const body = await readJson(req);
      const result = togglePlugin(body.id, !!body.enable);
      writeJson(res, result.success ? 200 : 400, result);
    } catch (e) {
      writeJson(res, 500, { error: e.message });
    }
  };

  const remove = async (req, res) => {
    try {
      const body = await readJson(req);
      const result = removePlugin(body.id, body.moduleName);
      writeJson(res, result.success ? 200 : 400, result);
    } catch (e) {
      writeJson(res, 500, { error: e.message });
    }
  };

  const details = async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://localhost");
      const id = url.searchParams.get("id");
      writeJson(res, 200, getPluginDetails(id));
    } catch (e) {
      writeJson(res, 500, { error: e.message });
    }
  };

  const pkg = async (req, res) => {
    try {
      const pkgPath = getPkgPath();
      writeJson(res, 200, existsSync(pkgPath) ? JSON.parse(readFileSync(pkgPath, "utf-8")) : {});
    } catch (e) {
      writeJson(res, 500, { error: e.message });
    }
  };

  return [
    { kind: "exact", path: `${API_BASE}/list`, handler: list },
    { kind: "exact", path: `${API_BASE}/toggle`, handler: toggle },
    { kind: "exact", path: `${API_BASE}/remove`, handler: remove },
    { kind: "exact", path: `${API_BASE}/details`, handler: details },
    { kind: "exact", path: `${API_BASE}/pkg`, handler: pkg },
  ];
}

const inject = ["webServer"];

function apply(ctx) {
  const disposers = makeRoutes(ctx).map((route) => ctx.webServer.register(route));
  ctx.effect(() => () => {
    for (const dispose of disposers) dispose();
  }, "plugin-control-center: routes");
}

export { apply, inject, togglePlugin, removePlugin, locateEntry };
export default { apply, inject };
