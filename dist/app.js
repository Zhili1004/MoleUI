"use strict";

const inv = (c, a) => window.__TAURI__.core.invoke(c, a);
const tlisten = window.__TAURI__.event.listen;
const convSrc = (p) => window.__TAURI__.core.convertFileSrc(p);

/* ================= helpers ================= */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

function h(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function fmtBytes(n) {
  if (!isFinite(n) || n <= 0) return "0 B";
  const u = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return (n >= 100 ? n.toFixed(0) : n >= 10 ? n.toFixed(1) : n.toFixed(2)) + " " + u[i];
}
function parseSize(s) {
  const m = /([\d.]+)\s*(TB|GB|MB|KB|B)/i.exec(s || "");
  if (!m) return 0;
  const mult = { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4 }[m[2].toUpperCase()];
  return parseFloat(m[1]) * mult;
}
const stripAnsi = (s) => s.replace(/\x1b\[[0-9;?]*[ -\/]*[@-~]/g, "").replace(/\x1b\][^\x07]*\x07/g, "");

function countUp(el, to, fmt = (v) => Math.round(v), dur = 950) {
  if (!isFinite(to)) { el.textContent = "—"; return; }
  const start = performance.now();
  const tick = (now) => {
    const p = Math.min((now - start) / dur, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    el.textContent = fmt(to * ease);
    if (p < 1 && el.isConnected) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function sh(str) { return "'" + String(str).replace(/'/g, "'\\''") + "'"; }

/* ================= i18n ================= */

const I18N = {
  zh: {
    "app.subtitle": "Mac 清理工具箱",
    "group.cleanup": "清理", "group.insight": "洞察", "group.more": "更多",
    "nav.dashboard": "仪表盘", "nav.clean": "深度清理", "nav.uninstall": "应用卸载",
    "nav.optimize": "系统优化", "nav.purge": "项目清理", "nav.installer": "安装包",
    "nav.analyze": "磁盘分析", "nav.status": "系统状态", "nav.history": "清理历史",
    "nav.advanced": "高级模式", "nav.settings": "设置",
    "cli.missing": "Mole 未安装", "cli.checking": "检测中…", "cli.builtin": "内置",
    "dash.morning": "早上好 ☀️", "dash.afternoon": "下午好 🌤️", "dash.evening": "晚上好 🌙",
    "dash.sub": "你的 Mac 由 Mole 守护中",
    "dash.health": "健康评分", "dash.memory": "内存占用", "dash.lastClean": "上次清理",
    "dash.smartScan": "智能扫描", "dash.smartScanSub": "一键找出所有可清理空间",
    "dash.never": "还没清理过", "dash.freed": "释放了",
    "sf.rescan": "重新扫描", "sf.start": "开始扫描", "sf.scanning": "正在扫描…", "sf.scanningSub": "Mole 正在深入检查你的 Mac,通常需要几十秒",
    "sf.found": "发现", "sf.items": "项", "sf.selected": "已选", "sf.cleanNow": "立即清理",
    "sf.working": "处理中…", "sf.done": "搞定 🎉", "sf.failed": "出了点问题",
    "sf.doneSub": "你的 Mac 清爽多了", "sf.log": "查看详细日志", "sf.again": "再扫一次",
    "sf.emptyTitle": "非常干净!", "sf.emptySub": "没有发现可清理的内容,继续保持 ✨",
    "sf.run": "开始", "sf.preview": "以下是预览结果,点击按钮执行",
    "clean.title": "深度清理", "clean.sub": "缓存、日志与孤儿文件,默认勾选安全项",
    "clean.includeSystem": "包含系统级清理",
    "clean.sysNote": "勾选后会弹出系统授权窗口(支持 Touch ID)",
    "clean.confirmTitle": "确认清理", "clean.confirm": "将清理选中的 {size},未勾选的路径已加入白名单。",
    "clean.freed": "已释放", "clean.cleaned": "清理完成",
    "optimize.title": "系统优化", "optimize.sub": "刷新缓存、重建数据库、重置系统服务",
    "optimize.run": "开始优化",
    "purge.title": "项目清理", "purge.sub": "清掉 node_modules、build 等旧项目产物",
    "purge.run": "清理旧产物",
    "installer.title": "安装包清理", "installer.sub": "找出散落各处的 DMG / PKG 安装包",
    "installer.run": "清理安装包",
    "un.sub": "{n} 个应用 · 点击查看残留并卸载", "un.search": "搜索应用…",
    "un.preview": "正在分析关联文件…", "un.willRemove": "将移除以下内容(默认进废纸篓,可恢复):",
    "un.uninstall": "卸载", "un.cancel": "取消", "un.done": "已卸载 {name}",
    "un.confirmTitle": "卸载 {name}?",
    "an.sub": "看看磁盘空间都去哪了", "an.scanning": "正在统计目录大小…",
    "an.home": "主目录", "an.downloads": "下载", "an.apps": "应用", "an.root": "根目录",
    "an.daysAgo": "{d} 天未访问", "an.today": "今天用过",
    "hi.sub": "每一次清理都有记录", "hi.empty": "暂无清理记录",
    "hi.removed": "删除 {n}", "hi.trashed": "进废纸篓 {n}", "hi.failed": "失败 {n}",
    "adv.sub": "完整的 mole 交互式终端,给高级玩家",
    "set.sub": "更新、白名单与更多",
    "set.cliTitle": "Mole 命令行", "set.cliDesc": "当前版本 {v} · 安装于 {p}",
    "set.cliBundledDesc": "内置 Mole v{v},打开 App 即可使用。需要在终端里使用 mo/mole 时,可安装命令行入口。",
    "set.installCli": "安装终端命令", "set.brewInstall": "Homebrew 安装",
    "set.update": "检查更新", "set.force": "强制重装", "set.nightly": "Nightly 版",
    "set.touchTitle": "Touch ID 授权 sudo", "set.touchDesc": "启用后,需要管理员权限时直接用指纹,不用输密码。",
    "set.touchEnable": "启用 Touch ID", "set.touchPreview": "预览改动",
    "set.touchChecking": "正在检测 Touch ID sudo 状态…",
    "set.touchEnabled": "已启用 · 配置在 {p}",
    "set.touchDisabled": "未启用 · 清理系统文件时仍可能多次输入密码",
    "set.touchWorking": "正在启用,请完成系统授权…",
    "set.touchDone": "Touch ID sudo 已启用",
    "set.touchFail": "未检测到 Touch ID sudo 配置,请查看日志",
    "set.compTitle": "Shell 命令补全", "set.compDesc": "为终端里的 mo 命令配置 Tab 补全。",
    "set.compInstall": "安装补全",
    "set.wlTitle": "白名单", "set.wlDesc": "这些路径永远不会被清理。每行一条,支持通配符。",
    "set.wlClean": "清理白名单", "set.wlOpt": "优化白名单", "set.save": "保存", "set.saved": "已保存", "set.addFolder": "＋ 选择文件夹",
    "set.purgeTitle": "项目扫描目录", "set.purgeDesc": "项目清理只扫描这些目录。每行一条绝对路径。",
    "set.aboutTitle": "关于 MoleUI",
    "set.thanksTitle": "致谢原作者 tw93 ❤️",
    "set.thanksBody": "衷心感谢 tw93 创造了 Mole 这个出色的开源 Mac 清理工具。MoleUI 只是它的图形界面,所有核心能力都来自原项目。如果它帮到了你,请去 GitHub 点一颗 Star。",
    "set.repo": "GitHub 仓库", "set.author": "作者主页", "set.star": "点个 Star ⭐",
    "set.aboutFoot": "MoleUI 2.1 · Mole 基于 GPL-3.0 开源 · 与原作者无隶属关系",
    "set.dangerTitle": "危险区", "set.dangerDesc": "从系统中移除 Mole 命令行工具。",
    "set.removeCli": "卸载 Mole CLI", "set.removeConfirm": "确定要卸载 Mole 命令行工具吗?",
    "miss.title": "未检测到 Mole CLI",
    "miss.body": "MoleUI 没找到内置或系统 Mole CLI,选一种方式一键安装:",
    "miss.brew": "Homebrew 安装(推荐)", "miss.script": "官方脚本安装",
    "miss.skip": "稍后再说", "miss.installing": "正在安装 Mole…", "miss.ok": "Mole 安装成功 🎉",
    "miss.fail": "安装没有成功,请重试",
    "confirm.yes": "确定", "confirm.no": "取消",
    "toast.stopped": "已停止", "toast.copied": "已复制",
    "task.stop": "停止任务",
  },
  en: {
    "app.subtitle": "Mac cleanup toolbox",
    "group.cleanup": "Cleanup", "group.insight": "Insight", "group.more": "More",
    "nav.dashboard": "Dashboard", "nav.clean": "Deep Clean", "nav.uninstall": "Uninstaller",
    "nav.optimize": "Optimize", "nav.purge": "Projects", "nav.installer": "Installers",
    "nav.analyze": "Disk Map", "nav.status": "Live Status", "nav.history": "History",
    "nav.advanced": "Advanced", "nav.settings": "Settings",
    "cli.missing": "Mole not installed", "cli.checking": "Checking…", "cli.builtin": "built in",
    "dash.morning": "Good morning ☀️", "dash.afternoon": "Good afternoon 🌤️", "dash.evening": "Good evening 🌙",
    "dash.sub": "Your Mac, guarded by Mole",
    "dash.health": "Health score", "dash.memory": "Memory", "dash.lastClean": "Last cleanup",
    "dash.smartScan": "Smart Scan", "dash.smartScanSub": "Find every reclaimable byte",
    "dash.never": "Never cleaned", "dash.freed": "freed",
    "sf.rescan": "Rescan", "sf.start": "Start scan", "sf.scanning": "Scanning…", "sf.scanningSub": "Mole is inspecting your Mac, this can take a moment",
    "sf.found": "Found", "sf.items": "items", "sf.selected": "Selected", "sf.cleanNow": "Clean Now",
    "sf.working": "Working…", "sf.done": "All done 🎉", "sf.failed": "Something went wrong",
    "sf.doneSub": "Your Mac feels lighter already", "sf.log": "Show full log", "sf.again": "Scan again",
    "sf.emptyTitle": "Squeaky clean!", "sf.emptySub": "Nothing to clean up. Keep it up ✨",
    "sf.run": "Run", "sf.preview": "Preview below — hit the button to apply",
    "clean.title": "Deep Clean", "clean.sub": "Caches, logs & leftovers. Safe items pre-selected",
    "clean.includeSystem": "Include system-level",
    "clean.sysNote": "You'll get a native auth prompt (Touch ID supported)",
    "clean.confirmTitle": "Confirm cleanup", "clean.confirm": "About to clean {size}. Unchecked paths were whitelisted.",
    "clean.freed": "Freed", "clean.cleaned": "Cleanup finished",
    "optimize.title": "Optimize", "optimize.sub": "Refresh caches, rebuild databases, reset services",
    "optimize.run": "Optimize",
    "purge.title": "Project Purge", "purge.sub": "Sweep node_modules, build dirs and stale artifacts",
    "purge.run": "Purge artifacts",
    "installer.title": "Installers", "installer.sub": "Hunt down stray DMG / PKG installer files",
    "installer.run": "Clean installers",
    "un.sub": "{n} apps · click one to inspect & uninstall", "un.search": "Search apps…",
    "un.preview": "Analyzing related files…", "un.willRemove": "Will remove (to Trash, recoverable):",
    "un.uninstall": "Uninstall", "un.cancel": "Cancel", "un.done": "Uninstalled {name}",
    "un.confirmTitle": "Uninstall {name}?",
    "an.sub": "See where your disk space went", "an.scanning": "Sizing up directories…",
    "an.home": "Home", "an.downloads": "Downloads", "an.apps": "Apps", "an.root": "Root",
    "an.daysAgo": "{d}d untouched", "an.today": "used today",
    "hi.sub": "Every cleanup, on the record", "hi.empty": "No cleanup sessions yet",
    "hi.removed": "removed {n}", "hi.trashed": "trashed {n}", "hi.failed": "failed {n}",
    "adv.sub": "The full interactive mole terminal, for power users",
    "set.sub": "Updates, whitelists & more",
    "set.cliTitle": "Mole CLI", "set.cliDesc": "Version {v} · installed at {p}",
    "set.cliBundledDesc": "Bundled Mole v{v}; the app works immediately. Install the terminal entry if you also want mo/mole in your shell.",
    "set.installCli": "Install terminal command", "set.brewInstall": "Install with Homebrew",
    "set.update": "Check updates", "set.force": "Force reinstall", "set.nightly": "Nightly",
    "set.touchTitle": "Touch ID for sudo", "set.touchDesc": "Use your fingerprint instead of typing passwords for admin tasks.",
    "set.touchEnable": "Enable Touch ID", "set.touchPreview": "Preview changes",
    "set.touchChecking": "Checking Touch ID sudo status…",
    "set.touchEnabled": "Enabled · configured at {p}",
    "set.touchDisabled": "Not enabled · system cleanup may still ask for passwords",
    "set.touchWorking": "Enabling, finish the system authorization prompt…",
    "set.touchDone": "Touch ID sudo enabled",
    "set.touchFail": "Touch ID sudo config was not detected; check the log",
    "set.compTitle": "Shell completion", "set.compDesc": "Tab completion for the mo command.",
    "set.compInstall": "Install completion",
    "set.wlTitle": "Whitelists", "set.wlDesc": "These paths are never cleaned. One per line, globs allowed.",
    "set.wlClean": "Clean whitelist", "set.wlOpt": "Optimize whitelist", "set.save": "Save", "set.saved": "Saved", "set.addFolder": "+ Add folder",
    "set.purgeTitle": "Project scan paths", "set.purgeDesc": "Project purge only scans these directories.",
    "set.aboutTitle": "About MoleUI",
    "set.thanksTitle": "Thanks to tw93 ❤️",
    "set.thanksBody": "Heartfelt thanks to tw93 for creating Mole, a brilliant open-source Mac cleanup tool. MoleUI is just a pretty face — all the real power comes from the original project. If it helps you, go star the repo.",
    "set.repo": "GitHub Repo", "set.author": "Author", "set.star": "Star it ⭐",
    "set.aboutFoot": "MoleUI 2.1 · Mole is GPL-3.0 · not affiliated with the author",
    "set.dangerTitle": "Danger zone", "set.dangerDesc": "Remove the Mole CLI from this system.",
    "set.removeCli": "Remove Mole CLI", "set.removeConfirm": "Really remove the Mole CLI?",
    "miss.title": "Mole CLI not found",
    "miss.body": "MoleUI could not find a bundled or system Mole CLI. Pick a one-click install:",
    "miss.brew": "Install via Homebrew", "miss.script": "Install via official script",
    "miss.skip": "Maybe later", "miss.installing": "Installing Mole…", "miss.ok": "Mole installed 🎉",
    "miss.fail": "Install didn't finish — try again",
    "confirm.yes": "OK", "confirm.no": "Cancel",
    "toast.stopped": "Stopped", "toast.copied": "Copied",
    "task.stop": "Stop task",
  },
};

let lang = localStorage.getItem("moleui-lang") ||
  ((navigator.language || "").toLowerCase().startsWith("zh") ? "zh" : "en");
const t = (k, vars) => {
  let s = (I18N[lang] && I18N[lang][k]) || I18N.zh[k] || k;
  if (vars) for (const [key, v] of Object.entries(vars)) s = s.replace("{" + key + "}", v);
  return s;
};
function applyI18n() {
  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  $$("[data-i18n]").forEach((el) => (el.textContent = t(el.dataset.i18n)));
  $("#btn-lang").textContent = lang === "zh" ? "EN" : "中";
  $("#un-search").placeholder = t("un.search");
}

/* ================= task bus ================= */

const taskHandlers = new Map();
tlisten("task-line", (e) => {
  const handler = taskHandlers.get(e.payload.id);
  if (handler && handler.onLine) handler.onLine(stripAnsi(e.payload.line));
});
tlisten("task-done", (e) => {
  const handler = taskHandlers.get(e.payload.id);
  taskHandlers.delete(e.payload.id);
  if (handler && handler.onDone) handler.onDone(e.payload.code);
});
function runTask(id, command, onLine, onDone) {
  taskHandlers.set(id, { onLine, onDone });
  return inv("run_capture", { id, command }).catch((err) => {
    taskHandlers.delete(id);
    if (onDone) onDone(-1);
    toast(String(err), "err");
  });
}
const runJson = (command) => inv("run_json", { command });

/* pty runner (sudo flows share the terminal pty) */
let ptyOwner = null;
let currentGen = 0;
let runnerHandler = null;
let runnerBuf = "";
const b64ToBytes = (b64) => {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
};
tlisten("pty-output", (e) => {
  if (e.payload.gen < currentGen) return;
  if (ptyOwner === "advanced" && term) {
    term.write(b64ToBytes(e.payload.data));
  } else if (ptyOwner === "runner" && runnerHandler) {
    runnerBuf += new TextDecoder().decode(b64ToBytes(e.payload.data));
    const parts = runnerBuf.split("\n");
    runnerBuf = parts.pop();
    parts.forEach((line) => {
      const clean = stripAnsi(line.split("\r").pop()).trimEnd();
      runnerHandler.onLine && runnerHandler.onLine(clean);
    });
  }
});
tlisten("pty-exit", (e) => {
  if (e.payload.gen < currentGen) return;
  if (ptyOwner === "runner" && runnerHandler) {
    const handler = runnerHandler;
    runnerHandler = null;
    ptyOwner = null;
    handler.onDone && handler.onDone(e.payload.code);
  } else if (ptyOwner === "advanced") {
    termRunning = false;
  }
});
async function runPtyTask(command, onLine, onDone) {
  ptyOwner = "runner";
  runnerBuf = "";
  runnerHandler = { onLine, onDone };
  currentGen = await inv("pty_spawn", { command, cols: 160, rows: 40 });
}

/* ================= ui infra ================= */

function toast(msg, type = "") {
  const el = h(`<div class="toast ${type}">${esc(msg)}</div>`);
  $("#toast-container").appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function modal(inner) {
  const mask = h(`<div class="modal-mask"><div class="modal-card"></div></div>`);
  mask.firstElementChild.append(...inner);
  mask.addEventListener("mousedown", (e) => { if (e.target === mask) mask.remove(); });
  $("#modal-root").appendChild(mask);
  return mask;
}

function askConfirm(title, body) {
  return new Promise((resolve) => {
    const yes = h(`<button class="btn grad">${esc(t("confirm.yes"))}</button>`);
    const no = h(`<button class="btn ghost">${esc(t("confirm.no"))}</button>`);
    const mask = modal([
      h(`<h2>${esc(title)}</h2>`),
      h(`<p class="muted">${esc(body || "")}</p>`),
      (() => { const d = h(`<div class="modal-actions"></div>`); d.append(no, yes); return d; })(),
    ]);
    yes.onclick = () => { mask.remove(); resolve(true); };
    no.onclick = () => { mask.remove(); resolve(false); };
  });
}

/* ================= router ================= */

const VIEW_OF = {
  dashboard: "view-dashboard",
  clean: "view-scanflow", optimize: "view-scanflow", purge: "view-scanflow", installer: "view-scanflow",
  uninstall: "view-uninstall", analyze: "view-analyze", status: "view-status",
  history: "view-history", advanced: "view-advanced", settings: "view-settings",
};
let currentView = "dashboard";

function switchView(name) {
  if (statusTimer) { clearInterval(statusTimer); statusTimer = null; }
  currentView = name;
  $$(".view").forEach((v) => (v.hidden = true));
  const el = $("#" + VIEW_OF[name]);
  el.hidden = false;
  el.style.animation = "none";
  void el.offsetWidth;
  el.style.animation = "";
  $$(".nav-item").forEach((b) => b.classList.toggle("active", b.dataset.view === name));
  const enter = {
    dashboard: dashEnter, clean: () => sfEnter("clean"), optimize: () => sfEnter("optimize"),
    purge: () => sfEnter("purge"), installer: () => sfEnter("installer"),
    uninstall: unEnter, analyze: anEnter, status: stEnter, history: hiEnter,
    advanced: advEnter, settings: setEnter,
  }[name];
  if (enter) enter();
}

$("#nav").addEventListener("click", (e) => {
  const b = e.target.closest(".nav-item");
  if (b) switchView(b.dataset.view);
});
const appWindow = window.__TAURI__.window.getCurrentWindow();
document.addEventListener("mousedown", (e) => {
  if (e.button !== 0) return;
  if (e.target.closest("button, input, textarea, select, a, label, img, .chk, .xterm, .log-pre, .file-list, .wl-area, .sec, .an-row, .un-card, .hi-row, .crumb, .modal-card, .toast, .stat-mini, .st-card, details")) return;
  const inDragZone = e.target.closest(".view-head, .logo, #nav, #sidebar") ||
    e.target === document.body || ["app", "bg", "main", "sf-body"].includes(e.target.id) ||
    e.target.classList.contains("view") || e.target.classList.contains("dash-grid");
  if (!inDragZone) return;
  if (e.detail === 2) { appWindow.toggleMaximize().catch(() => {}); return; }
  appWindow.startDragging().catch((err) => {
    if (!window.__dragErr) { window.__dragErr = 1; toast("drag: " + err, "err"); }
  });
});

const HOTKEY_ORDER = ["dashboard", "clean", "uninstall", "optimize", "purge", "installer", "analyze", "status", "history", "advanced"];
window.addEventListener("keydown", (e) => {
  if (!(e.metaKey && !e.shiftKey && !e.altKey)) return;
  if (e.key === ",") { e.preventDefault(); switchView("settings"); return; }
  const idx = e.key === "0" ? 9 : parseInt(e.key, 10) - 1;
  if (idx >= 0 && idx < HOTKEY_ORDER.length) {
    e.preventDefault();
    switchView(HOTKEY_ORDER[idx]);
  }
});
$("#btn-lang").addEventListener("click", () => {
  lang = lang === "zh" ? "en" : "zh";
  localStorage.setItem("moleui-lang", lang);
  applyI18n();
  switchView(currentView);
});

/* ================= cli status ================= */

let moleOk = false;
async function refreshCli() {
  let info = { installed: false };
  try { info = await inv("check_mole"); } catch (_) {}
  moleOk = info.installed;
  $("#cli-dot").className = "dot " + (info.installed ? "ok" : "bad");
  $("#cli-text").textContent = info.installed
    ? "Mole v" + (info.version || "?").replace(/^v/, "") + (info.bundled ? " · " + t("cli.builtin") : "")
    : t("cli.missing");
  return info;
}

/* ================= dashboard ================= */

let lastStatus = null;
async function dashEnter() {
  const hour = new Date().getHours();
  $("#dash-greet").textContent = t(hour < 12 ? "dash.morning" : hour < 18 ? "dash.afternoon" : "dash.evening");
  $("#dash-sub").textContent = t("dash.sub");
  try {
    const root = await getMoleRoot();
    const raw = await runJson(`${sh(root + "/bin/status-go")} -json`);
    const stat = JSON.parse(raw);
    lastStatus = stat;
    const suffix = lang === "zh" ? " 分" : "";
    if (stat.health_score != null) countUp($("#dash-health"), stat.health_score, (v) => Math.round(v) + suffix);
    if (stat.memory) countUp($("#dash-mem"), stat.memory.used_percent, (v) => Math.round(v) + "%");
    const disk = pickMainDisk(stat);
    if (disk) {
      countUp($("#dash-disk-pct"), disk.pct, (v) => Math.round(v) + "%", 1200);
      $("#dash-disk-label").textContent = disk.label;
      requestAnimationFrame(() =>
        ($("#dash-ring-fill").style.strokeDashoffset = 465 * (1 - disk.pct / 100)));
    }
  } catch (_) {}
  try {
    const hist = JSON.parse(await runJson("mole history --json </dev/null"));
    const done = (hist.sessions || []).find((s) => s.ended_at && parseSize(s.size) > 0);
    $("#dash-last").textContent = done
      ? `${done.started_at.split(" ")[0]} · ${t("dash.freed")} ${done.size}`
      : t("dash.never");
  } catch (_) { $("#dash-last").textContent = "—"; }
}
function pickMainDisk(stat) {
  const ds = stat.disks;
  if (!Array.isArray(ds) || !ds.length) return null;
  const d = ds.find((x) => (x.mount_point || x.mount || "") === "/") || ds[0];
  const used = d.used_percent ?? d.usage_percent ?? (d.used && d.total ? (d.used / d.total) * 100 : null);
  if (used == null) return null;
  const label = d.used && d.total ? `${fmtBytes(d.used)} / ${fmtBytes(d.total)}` : (d.mount || d.name || "/");
  return { pct: used, label };
}
$("#btn-smart-scan").addEventListener("click", () => { sfState.clean = null; switchView("clean"); });
$$(".quick").forEach((q) => q.addEventListener("click", () => switchView(q.dataset.goto)));

/* ================= scan flow ================= */

const SECTION_META = {
  "User essentials": { zh: "用户基础", emoji: "🧺" },
  "App caches": { zh: "应用缓存", emoji: "📱" },
  "Browsers": { zh: "浏览器", emoji: "🌐" },
  "Cloud & Office": { zh: "云盘与办公", emoji: "☁️" },
  "Developer tools": { zh: "开发者工具", emoji: "🛠️" },
  "Development": { zh: "开发者工具", emoji: "🛠️" },
  "System": { zh: "系统", emoji: "🔒" },
  "System caches": { zh: "系统缓存", emoji: "🔒" },
  "Trash": { zh: "废纸篓", emoji: "🗑️" },
};

const SF_MODS = {
  clean: {
    title: () => t("clean.title"), sub: () => t("clean.sub"),
    scanCmd: "mole clean --dry-run </dev/null",
    sysToggle: true, sections: true,
    actionLabel: () => t("sf.cleanNow"),
  },
  optimize: {
    title: () => t("optimize.title"), sub: () => t("optimize.sub"),
    scanCmd: "mole optimize --dry-run </dev/null",
    sysToggle: true, sections: false,
    actionLabel: () => t("optimize.run"),
    runCmd: "mole optimize </dev/null",
  },
  purge: {
    title: () => t("purge.title"), sub: () => t("purge.sub"),
    scanCmd: "mole purge --dry-run </dev/null",
    sysToggle: false, sections: false,
    actionLabel: () => t("purge.run"),
    runCmd: "mole purge </dev/null",
  },
  installer: {
    title: () => t("installer.title"), sub: () => t("installer.sub"),
    scanCmd: "mole installer --dry-run </dev/null",
    sysToggle: false, sections: false,
    actionLabel: () => t("installer.run"),
    runCmd: "mole installer </dev/null",
  },
};

const sfState = { clean: null, optimize: null, purge: null, installer: null };
let sfMod = "clean";

function sfEnter(mod) {
  sfMod = mod;
  const conf = SF_MODS[mod];
  $("#sf-title").textContent = conf.title();
  $("#sf-sub").textContent = conf.sub();
  $("#sf-action").textContent = conf.actionLabel();
  $("#sf-sys-wrap").hidden = !conf.sysToggle;
  $("#sf-head-actions").innerHTML = "";
  const st = sfState[mod];
  if (!st || st.phase === "idle") sfScan(mod);
  else sfRender(mod);
}

function sfScan(mod) {
  if (!moleOk) { sfState[mod] = { phase: "results", sections: [], lines: [], empty: true }; sfRender(mod); return; }
  const conf = SF_MODS[mod];
  sfState[mod] = { phase: "scanning", log: [], lastLine: "" };
  sfRender(mod);
  runTask("scan-" + mod, conf.scanCmd,
    (line) => {
      const st = sfState[mod];
      if (!st || st.phase !== "scanning") return;
      st.log.push(line);
      const lt = line.trim();
      if (lt && sfMod === mod && currentView === mod) {
        const el = $("#sf-scan-line");
        if (el) el.textContent = lt.slice(0, 110);
      }
    },
    async () => {
      const st = sfState[mod];
      if (!st || st.phase !== "scanning") return;
      if (conf.sections) {
        const [listRaw, wlRaw] = await Promise.all([
          inv("read_mole_config", { name: "clean-list.txt" }),
          inv("read_mole_config", { name: "whitelist" }),
        ]);
        const wl = new Set(wlRaw.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#")));
        const sections = parseCleanList(listRaw, wl);
        sfState[mod] = { phase: "results", sections, log: st.log, empty: !sections.length };
      } else {
        const items = st.log
          .map((l) => l.trim())
          .filter((l) => l && !/^[-=#]+$/.test(l) && !/^(Running|Scanning|Use |Tip|━|⚠|│|╰|╭)/.test(l))
          .filter((l) => /\d+(\.\d+)?\s?(TB|GB|MB|KB|B)\b/i.test(l) || /^[✓✔•▸›·]|^(Would|发现|Found)/i.test(l))
          .slice(0, 200);
        sfState[mod] = { phase: "results", lines: items, log: st.log, empty: !items.length };
      }
      if (sfMod === mod && currentView === mod) sfRender(mod);
    });
}

function parseCleanList(raw, wl) {
  const sections = [];
  let cur = null;
  raw.split("\n").forEach((line) => {
    const sm = /^=== (.+) ===$/.exec(line.trim());
    if (sm) { cur = { name: sm[1], items: [] }; sections.push(cur); return; }
    const im = /^(\/.+?)\s{2,}#\s*(.+)$/.exec(line);
    if (im && cur) {
      const size = parseSize(im[2]);
      cur.items.push({ path: im[1], meta: im[2], size, checked: !wl.has(im[1]) });
    }
  });
  return sections.filter((s) => s.items.length);
}

function sfRender(mod) {
  const conf = SF_MODS[mod];
  const st = sfState[mod];
  const body = $("#sf-body");
  const bar = $("#sf-bar");
  body.innerHTML = "";
  bar.hidden = true;

  if (!st) return;

  if (st.phase === "scanning") {
    body.appendChild(h(`
      <div class="glass center-card">
        <div class="spin-ring"></div>
        <h3>${esc(t("sf.scanning"))}</h3>
        <p class="muted">${esc(t("sf.scanningSub"))}</p>
        <p class="scan-log-line" id="sf-scan-line"></p>
        <button class="btn ghost small" id="sf-scan-stop">${esc(t("task.stop"))}</button>
      </div>`));
    $("#sf-scan-stop").onclick = async () => {
      await inv("kill_task", { id: "scan-" + mod }).catch(() => {});
      sfState[mod] = { phase: "stopped" };
      toast(t("toast.stopped"));
      if (sfMod === mod && currentView === mod) sfRender(mod);
    };
    return;
  }

  if (st.phase === "stopped") {
    body.appendChild(h(`
      <div class="glass center-card">
        <div class="big-emoji">🐹</div>
        <h3>${esc(conf.title())}</h3>
        <p class="muted">${esc(conf.sub())}</p>
        <button class="btn grad" id="sf-start">${esc(t("sf.start"))}</button>
      </div>`));
    $("#sf-start").onclick = () => sfScan(mod);
    return;
  }

  if (st.phase === "working") {
    body.appendChild(h(`
      <div class="glass center-card">
        <div class="spin-ring"></div>
        <h3>${esc(t("sf.working"))}</h3>
        <div class="prog-wrap"><div class="prog-bar"></div></div>
        <p class="scan-log-line" id="sf-work-line"></p>
        <button class="btn ghost small" id="sf-stop">${esc(t("task.stop"))}</button>
      </div>`));
    $("#sf-stop").onclick = async () => {
      await inv("kill_task", { id: "run-" + mod }).catch(() => {});
      await inv("pty_kill").catch(() => {});
      toast(t("toast.stopped"));
      sfState[mod] = null;
      sfEnter(mod);
    };
    return;
  }

  if (st.phase === "done") {
    const stats = (st.stats || []).map((s) => `<span class="chip">${esc(s)}</span>`).join("");
    body.appendChild(h(`
      <div class="glass center-card">
        <div class="big-emoji">🎉</div>
        <h3>${esc(t("sf.done"))}</h3>
        ${st.freed ? `<p class="grad-num">${esc(st.freed)}</p>` : ""}
        <p class="muted">${esc(t("sf.doneSub"))}</p>
        <div class="done-stats">${stats}</div>
        <details class="log-details"><summary>${esc(t("sf.log"))}</summary>
          <div class="log-pre">${esc((st.log || []).join("\n"))}</div></details>
        <button class="btn grad" id="sf-again">${esc(t("sf.again"))}</button>
      </div>`));
    $("#sf-again").onclick = () => sfScan(mod);
    return;
  }

  /* results */
  if (st.empty) {
    body.appendChild(h(`
      <div class="glass center-card">
        <div class="big-emoji">🫧</div>
        <h3>${esc(t("sf.emptyTitle"))}</h3>
        <p class="muted">${esc(t("sf.emptySub"))}</p>
        ${st.log && st.log.length ? `<details class="log-details"><summary>${esc(t("sf.log"))}</summary><div class="log-pre">${esc(st.log.join("\n"))}</div></details>` : ""}
      </div>`));
    bar.hidden = false;
    $("#sf-action").disabled = true;
    $("#sf-bar-text").textContent = "";
    return;
  }
  $("#sf-action").disabled = false;

  if (conf.sections) {
    const head = h(`<div class="result-head"><span class="grad-num" id="sf-total"></span><span class="muted" id="sf-total-sub"></span></div>`);
    body.appendChild(head);
    st.sections.forEach((sec, si) => {
      const meta = SECTION_META[sec.name] || { zh: sec.name, emoji: "🧩" };
      const total = sec.items.reduce((a, i) => a + i.size, 0);
      const allChecked = sec.items.every((i) => i.checked);
      const someChecked = sec.items.some((i) => i.checked);
      const secEl = h(`
        <div class="glass sec" style="animation: pop .4s cubic-bezier(.22,.9,.32,1.18) ${si * 0.04}s backwards">
          <div class="sec-head">
            <input type="checkbox" class="chk sec-chk" ${allChecked ? "checked" : ""}>
            <div class="sec-emoji">${meta.emoji}</div>
            <div class="sec-info">
              <p class="sec-name">${esc(lang === "zh" ? meta.zh : sec.name)}</p>
              <p class="sec-meta">${sec.items.length} ${esc(t("sf.items"))}</p>
            </div>
            <span class="sec-size">${fmtBytes(total)}</span>
            <span class="sec-chev">▼</span>
          </div>
          <div class="sec-items"></div>
        </div>`);
      const chk = $(".sec-chk", secEl);
      chk.indeterminate = someChecked && !allChecked;
      const itemsEl = $(".sec-items", secEl);
      sec.items.forEach((it) => {
        const row = h(`
          <div class="item-row">
            <input type="checkbox" class="chk mini" ${it.checked ? "checked" : ""}>
            <span class="item-path">${esc(it.path)}</span>
            <span class="item-size">${esc(it.meta.split(",")[0])}</span>
          </div>`);
        $("input", row).addEventListener("change", (e) => {
          it.checked = e.target.checked;
          const all = sec.items.every((i) => i.checked);
          chk.checked = all;
          chk.indeterminate = !all && sec.items.some((i) => i.checked);
          sfUpdateTotals(st);
        });
        itemsEl.appendChild(row);
      });
      chk.addEventListener("change", () => {
        sec.items.forEach((i) => (i.checked = chk.checked));
        $$("input", itemsEl).forEach((c, idx) => (c.checked = sec.items[idx].checked));
        chk.indeterminate = false;
        sfUpdateTotals(st);
      });
      $(".sec-head", secEl).addEventListener("click", (e) => {
        if (e.target.closest("input")) return;
        secEl.classList.toggle("open");
      });
      body.appendChild(secEl);
    });
    bar.hidden = false;
    sfUpdateTotals(st);
  } else {
    body.appendChild(h(`<div class="result-head"><span class="muted">${esc(t("sf.preview"))}</span></div>`));
    const wrap = h(`<div></div>`);
    st.lines.forEach((line, i) => {
      const size = /([\d.]+\s?(TB|GB|MB|KB|B))\b/i.exec(line);
      wrap.appendChild(h(`
        <div class="glass an-row" style="animation-delay:${Math.min(i * 0.03, 0.5)}s">
          <span class="an-emoji">▸</span>
          <span class="an-name" style="font-weight:500; font-size:12px">${esc(line.replace(/[✓✔•▸›·]\s*/, ""))}</span>
          ${size ? `<span class="an-size">${esc(size[1])}</span>` : ""}
        </div>`));
    });
    body.appendChild(wrap);
    bar.hidden = false;
    $("#sf-bar-text").textContent = `${st.lines.length} ${t("sf.items")}`;
  }
}

function sfUpdateTotals(st) {
  let count = 0, size = 0, total = 0;
  st.sections.forEach((s) => s.items.forEach((i) => {
    total += i.size;
    if (i.checked) { count++; size += i.size; }
  }));
  $("#sf-total").textContent = fmtBytes(total);
  $("#sf-total-sub").textContent = `${t("sf.found")} ${st.sections.reduce((a, s) => a + s.items.length, 0)} ${t("sf.items")}`;
  $("#sf-bar-text").textContent = `${t("sf.selected")} ${count} ${t("sf.items")} · ${fmtBytes(size)}`;
  $("#sf-action").disabled = count === 0;
  st.selSize = size;
}

$("#sf-rescan").addEventListener("click", () => sfScan(sfMod));
$("#sf-action").addEventListener("click", () => sfRun(sfMod));

async function sfRun(mod) {
  const conf = SF_MODS[mod];
  const st = sfState[mod];
  if (!st || st.phase !== "results") return;
  const useSystem = conf.sysToggle && $("#sf-sys").checked;

  if (conf.sections) {
    const ok = await askConfirm(t("clean.confirmTitle"), t("clean.confirm", { size: fmtBytes(st.selSize || 0) }));
    if (!ok) return;
    const wlRaw = await inv("read_mole_config", { name: "whitelist" });
    const kept = [];
    let inBlock = false;
    wlRaw.split("\n").forEach((l) => {
      if (l.includes(">>> moleui:unchecked >>>")) { inBlock = true; return; }
      if (l.includes("<<< moleui:unchecked <<<")) { inBlock = false; return; }
      if (!inBlock && l.trim()) kept.push(l);
    });
    const unchecked = [];
    st.sections.forEach((s) => s.items.forEach((i) => { if (!i.checked) unchecked.push(i.path); }));
    let out = kept.join("\n");
    if (unchecked.length) {
      out += (out ? "\n" : "") + "# >>> moleui:unchecked >>>\n" + unchecked.join("\n") + "\n# <<< moleui:unchecked <<<";
    }
    await inv("write_mole_config", { name: "whitelist", content: out + "\n" });
  }

  st.phase = "working";
  st.log = [];
  sfRender(mod);
  const onLine = (line) => {
    if (!line.trim()) return;
    st.log.push(line);
    if (sfMod === mod && currentView === mod) {
      const el = $("#sf-work-line");
      if (el) el.textContent = line.trim().slice(0, 110);
    }
  };
  const onDone = async (code) => {
    if (st.phase !== "working") return;
    let freed = "", stats = [];
    try {
      const histCmd = { clean: "clean", optimize: "optimize", purge: "purge", installer: "installer" }[mod];
      const hist = JSON.parse(await runJson("mole history --json </dev/null"));
      const sess = (hist.sessions || []).find((s) => s.command === histCmd);
      if (sess) {
        if (parseSize(sess.size) > 0) freed = (lang === "zh" ? "释放 " : "freed ") + sess.size;
        stats.push(`${sess.items} ${t("sf.items")}`);
        const a = sess.actions || {};
        if (a.removed) stats.push(t("hi.removed", { n: a.removed }));
        if (a.trashed) stats.push(t("hi.trashed", { n: a.trashed }));
        if (a.failed) stats.push(t("hi.failed", { n: a.failed }));
      }
    } catch (_) {}
    st.phase = "done";
    st.freed = freed;
    st.stats = stats;
    if (code !== 0 && code != null && !freed) toast(t("sf.failed"), "err");
    if (sfMod === mod && currentView === mod) sfRender(mod);
    refreshCli();
  };

  const baseCmd = conf.sections ? "mole clean </dev/null" : conf.runCmd;
  if (useSystem) {
    const ap = await inv("ensure_askpass");
    runPtyTask(`export SUDO_ASKPASS=${sh(ap)}; sudo -A -v && ${baseCmd}`, onLine, onDone);
  } else {
    runTask("run-" + mod, baseCmd, onLine, onDone);
  }
}

/* ================= uninstall ================= */

let unApps = [];
const iconCache = new Map();
async function unEnter() {
  if (!unApps.length) await unLoad();
  unRender();
}
async function unLoad() {
  $("#un-grid").innerHTML = `<div class="glass center-card"><div class="spin-ring"></div></div>`;
  try {
    const raw = await runJson("mole uninstall --list </dev/null");
    unApps = JSON.parse(raw.trim());
    unApps.sort((a, b) => parseSize(b.size) - parseSize(a.size));
  } catch (_) { unApps = []; }
}
function unRender() {
  const q = ($("#un-search").value || "").toLowerCase();
  const grid = $("#un-grid");
  grid.innerHTML = "";
  const list = unApps.filter((a) => a.name.toLowerCase().includes(q));
  $("#un-count").textContent = t("un.sub", { n: list.length });
  list.forEach((app, i) => {
    const card = h(`
      <div class="glass un-card" style="animation-delay:${Math.min(i * 0.02, 0.4)}s">
        <div class="un-icon fallback">📦</div>
        <p class="un-name" title="${esc(app.name)}">${esc(app.name)}</p>
        <p class="un-size">${esc(app.size || "")}</p>
      </div>`);
    card.addEventListener("click", () => unDetail(app));
    grid.appendChild(card);
    loadIcon(app.path, $(".un-icon", card));
  });
}
let iconQueue = Promise.resolve();
function loadIcon(path, el) {
  if (iconCache.has(path)) { applyIcon(el, iconCache.get(path)); return; }
  iconQueue = iconQueue.then(async () => {
    if (iconCache.has(path)) { applyIcon(el, iconCache.get(path)); return; }
    try {
      const png = await inv("app_icon", { bundlePath: path });
      iconCache.set(path, png);
      applyIcon(el, png);
    } catch (err) {
      if (!window.__iconErr) { window.__iconErr = 1; toast("icon: " + err, "err"); }
    }
  });
}
function applyIcon(el, png) {
  if (!png || !el.isConnected) return;
  const img = document.createElement("img");
  img.className = "un-icon";
  img.alt = "";
  img.onload = () => el.replaceWith(img);
  img.src = png;
}
$("#un-search").addEventListener("input", unRender);

function unDetail(app) {
  const list = h(`<div class="file-list">${esc(t("un.preview"))}</div>`);
  const unBtn = h(`<button class="btn danger" disabled>${esc(t("un.uninstall"))}</button>`);
  const cancel = h(`<button class="btn ghost">${esc(t("un.cancel"))}</button>`);
  const icon = iconCache.get(app.path);
  const mask = modal([
    icon ? (() => { const im = h(`<img class="un-icon" style="width:64px;height:64px" alt="">`); im.src = icon; return im; })() : h(`<div class="modal-emoji">📦</div>`),
    h(`<h2>${esc(app.name)}</h2>`),
    h(`<p class="muted">${esc(app.path)} · ${esc(app.size || "")}</p>`),
    list,
    (() => { const d = h(`<div class="modal-actions"></div>`); d.append(cancel, unBtn); return d; })(),
  ]);
  cancel.onclick = () => { inv("kill_task", { id: "un-dry" }).catch(() => {}); mask.remove(); };

  const lines = [];
  runTask("un-dry", `mole uninstall --dry-run ${sh(app.uninstall_name || app.name)} </dev/null`,
    (line) => {
      const lt = line.trim();
      if (lt && (lt.startsWith("/") || lt.includes(" /"))) lines.push(lt);
    },
    () => {
      list.innerHTML = `<p style="font-family:-apple-system; font-size:11.5px; margin-bottom:6px">${esc(t("un.willRemove"))}</p>` +
        (lines.length ? lines.map((l) => esc(l)).join("<br>") : "—");
      unBtn.disabled = false;
    });

  unBtn.onclick = async () => {
    mask.remove();
    const ok = await askConfirm(t("un.confirmTitle", { name: app.name }), "");
    if (!ok) return;
    toast(t("sf.working"));
    runTask("un-run", `mole uninstall ${sh(app.uninstall_name || app.name)} </dev/null`, null, async () => {
      toast(t("un.done", { name: app.name }), "ok");
      await unLoad();
      if (currentView === "uninstall") unRender();
    });
  };
}

/* ================= analyze ================= */

let anStack = [];
let moleRootCache = null;
async function getMoleRoot() {
  if (!moleRootCache) moleRootCache = await inv("mole_root");
  return moleRootCache;
}
function anEnter() {
  if (!anStack.length) anStack = [window.__HOME__ || "/Users"];
  anLoad();
}
async function anLoad() {
  const path = anStack[anStack.length - 1];
  const crumbs = $("#an-crumbs");
  crumbs.innerHTML = "";
  const parts = path === "/" ? [""] : path.split("/");
  parts.forEach((p, i) => {
    const full = i === 0 ? "/" : parts.slice(0, i + 1).join("/");
    const label = i === 0 ? "/" : p;
    const b = h(`<button class="crumb ${i === parts.length - 1 ? "cur" : ""}">${esc(label)}</button>`);
    b.onclick = () => { anStack.push(full); anLoad(); };
    crumbs.appendChild(b);
    if (i < parts.length - 1) crumbs.appendChild(h(`<span class="crumb-sep">›</span>`));
  });

  const listEl = $("#an-list");
  listEl.innerHTML = `<div class="glass center-card"><div class="spin-ring"></div><p class="muted">${esc(t("an.scanning"))}</p></div>`;
  try {
    const root = await getMoleRoot();
    const raw = await runJson(`${sh(root + "/bin/analyze-go")} -json ${sh(path)}`);
    const data = JSON.parse(raw);
    const entries = (data.entries || []).sort((a, b) => b.size - a.size).slice(0, 60);
    listEl.innerHTML = "";
    const max = entries.length ? entries[0].size : 1;
    entries.forEach((en, i) => {
      const days = en.last_access ? Math.floor((Date.now() - new Date(en.last_access)) / 86400000) : null;
      const row = h(`
        <div class="glass an-row ${en.is_dir ? "dir" : ""}" style="animation-delay:${Math.min(i * 0.02, 0.4)}s">
          <div class="an-bar" style="transform: scaleX(${Math.max(en.size / max, 0.004)})"></div>
          <span class="an-emoji">${en.is_dir ? "📁" : "📄"}</span>
          <span class="an-name">${esc(en.name)}</span>
          ${days != null ? `<span class="an-extra">${days < 1 ? esc(t("an.today")) : esc(t("an.daysAgo", { d: days }))}</span>` : ""}
          <span class="an-size">${fmtBytes(en.size)}</span>
        </div>`);
      if (en.is_dir) row.addEventListener("click", () => { anStack.push(en.path); anLoad(); });
      listEl.appendChild(row);
    });
    if (!entries.length) listEl.innerHTML = `<div class="glass center-card"><p class="muted">∅</p></div>`;
  } catch (e) {
    listEl.innerHTML = `<div class="glass center-card"><p class="muted">${esc(String(e))}</p></div>`;
  }
}

/* ================= status ================= */

let statusTimer = null;
function stEnter() {
  stTick();
  statusTimer = setInterval(stTick, 3000);
}
async function stTick() {
  try {
    const root = await getMoleRoot();
    const raw = await runJson(`${sh(root + "/bin/status-go")} -json`);
    const s = JSON.parse(raw);
    lastStatus = s;
    stRender(s);
  } catch (_) {}
}
function stRender(s) {
  if (currentView !== "status") return;
  $("#st-meta").textContent = `${s.hardware?.model || ""} · ${s.hardware?.cpu_model || ""} · ${s.hardware?.os_version || ""} · up ${s.uptime || "?"}`;
  const g = $("#st-grid");
  g.innerHTML = "";

  const score = s.health_score ?? "—";
  g.appendChild(h(`
    <div class="glass st-card">
      <h4>${lang === "zh" ? "健康评分" : "HEALTH"}</h4>
      <p class="st-big grad-num" style="font-size:34px">${score}</p>
      <p class="muted">${esc(s.health_score_msg || "")}</p>
    </div>`));

  if (s.cpu) {
    const cores = (s.cpu.per_core || []).map((c) =>
      `<div class="core" style="height:${Math.max(c, 4)}%"></div>`).join("");
    g.appendChild(h(`
      <div class="glass st-card">
        <h4>CPU</h4>
        <p class="st-big">${Math.round(s.cpu.usage)}%</p>
        <div class="cores">${cores}</div>
      </div>`));
  }
  if (s.memory) {
    const m = s.memory;
    g.appendChild(h(`
      <div class="glass st-card">
        <h4>${lang === "zh" ? "内存" : "MEMORY"}</h4>
        <p class="st-big">${Math.round(m.used_percent)}%</p>
        <div class="bar-track"><div class="bar-fill" style="width:${m.used_percent}%"></div></div>
        <div class="kv" style="margin-top:8px"><span>${fmtBytes(m.used)} / ${fmtBytes(m.total)}</span><b>swap ${fmtBytes(m.swap_used || 0)}</b></div>
      </div>`));
  }
  (Array.isArray(s.disks) ? s.disks : []).slice(0, 3).forEach((d) => {
    const pct = d.used_percent ?? (d.used && d.total ? (d.used / d.total) * 100 : 0);
    const name = d.mount_point || d.mount || d.name || "disk";
    const detail = d.used && d.total ? `${fmtBytes(d.used)} / ${fmtBytes(d.total)}` : (d.used_str || "");
    g.appendChild(h(`
      <div class="glass st-card">
        <h4>${lang === "zh" ? "磁盘" : "DISK"} ${esc(name)}</h4>
        <p class="st-big">${Math.round(pct)}%</p>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
        <div class="kv" style="margin-top:8px"><span>${esc(detail)}</span>${s.trash_size ? `<b>🗑 ${esc(String(s.trash_size))}</b>` : ""}</div>
      </div>`));
  });
  const nets = (Array.isArray(s.network) ? s.network : []).filter((n) => n.ip);
  if (nets.length) {
    const rows = nets.map((n) =>
      `<div class="kv"><span>${esc(n.name)} ${esc(n.ip || "")}</span><b>↓${(n.rx_rate_mbs || 0).toFixed(2)} ↑${(n.tx_rate_mbs || 0).toFixed(2)} MB/s</b></div>`).join("");
    g.appendChild(h(`<div class="glass st-card"><h4>${lang === "zh" ? "网络" : "NETWORK"}</h4>${rows}</div>`));
  }
  const procs = Array.isArray(s.top_processes) ? s.top_processes.slice(0, 6) : [];
  if (procs.length) {
    const rows = procs.map((p) => {
      const name = p.name || p.command || "?";
      const cpu = p.cpu ?? p.cpu_percent ?? p.cpu_usage;
      const mem = p.mem ?? p.memory ?? p.mem_percent;
      return `<div class="proc-row"><span class="proc-name">${esc(name)}</span><b>${cpu != null ? Math.round(cpu) + "%" : ""}</b><span class="muted">${mem != null ? (typeof mem === "number" ? Math.round(mem) + "%" : esc(String(mem))) : ""}</span></div>`;
    }).join("");
    g.appendChild(h(`<div class="glass st-card"><h4>${lang === "zh" ? "占用最高" : "TOP PROCESSES"}</h4>${rows}</div>`));
  }
}

/* ================= history ================= */

const CMD_EMOJI = { clean: "✨", uninstall: "🗑️", optimize: "⚡️", purge: "📦", installer: "💿", touchid: "🔐", analyze: "🧭" };
async function hiEnter() {
  const el = $("#hi-list");
  el.innerHTML = `<div class="glass center-card"><div class="spin-ring"></div></div>`;
  try {
    const hist = JSON.parse(await runJson("mole history --json </dev/null"));
    const sessions = (hist.sessions || []).filter((s) => s.operation_count > 0 || parseSize(s.size) > 0);
    el.innerHTML = "";
    if (!sessions.length) {
      el.innerHTML = `<div class="glass center-card"><div class="big-emoji">🌱</div><p class="muted">${esc(t("hi.empty"))}</p></div>`;
      return;
    }
    sessions.forEach((s, i) => {
      const a = s.actions || {};
      const chips = [];
      if (a.removed) chips.push(t("hi.removed", { n: a.removed }));
      if (a.trashed) chips.push(t("hi.trashed", { n: a.trashed }));
      if (a.failed) chips.push(t("hi.failed", { n: a.failed }));
      el.appendChild(h(`
        <div class="glass hi-row" style="animation-delay:${Math.min(i * 0.03, 0.4)}s">
          <div class="hi-emoji">${CMD_EMOJI[s.command] || "🔧"}</div>
          <div class="hi-info">
            <p class="hi-cmd">${esc(t("nav." + s.command) !== "nav." + s.command ? t("nav." + s.command) : s.command)}</p>
            <p class="hi-date">${esc(s.started_at || "")}${chips.length ? " · " + chips.join(" · ") : ""}</p>
          </div>
          <div style="text-align:right">
            <p class="hi-size">${parseSize(s.size) > 0 ? esc(s.size) : "—"}</p>
            <p class="hi-items">${s.items || 0} ${esc(t("sf.items"))}</p>
          </div>
        </div>`));
    });
  } catch (e) {
    el.innerHTML = `<div class="glass center-card"><p class="muted">${esc(String(e))}</p></div>`;
  }
}

/* ================= advanced terminal ================= */

let term = null, fitAddon = null, termRunning = false;
function advEnter() {
  ptyOwner = "advanced";
  if (!term) {
    term = new Terminal({
      fontFamily: '"SF Mono", Menlo, Monaco, monospace',
      fontSize: 13,
      cursorBlink: true,
      scrollback: 5000,
      theme: { background: "rgba(0,0,0,0)", foreground: "#efe9f7", cursor: "#ff8fb0", selectionBackground: "rgba(255,143,176,.32)" },
      allowTransparency: true,
    });
    fitAddon = new FitAddon.FitAddon();
    term.loadAddon(fitAddon);
    term.open($("#terminal"));
    term.onData((d) => inv("pty_write", { data: d }).catch(() => {}));
    new ResizeObserver(() => {
      if ($("#view-advanced").hidden) return;
      try { fitAddon.fit(); inv("pty_resize", { cols: term.cols, rows: term.rows }).catch(() => {}); } catch (_) {}
    }).observe($("#terminal-wrap"));
    const chips = $("#adv-chips");
    ["mole", "mole clean", "mole status", "mole analyze", "mole update"].forEach((c) => {
      const b = h(`<button class="chip-btn">${esc(c)}</button>`);
      b.onclick = () => advRun(c);
      chips.appendChild(b);
    });
  }
  requestAnimationFrame(() => { try { fitAddon.fit(); } catch (_) {} });
}
async function advRun(cmd) {
  ptyOwner = "advanced";
  term.clear();
  try { fitAddon.fit(); } catch (_) {}
  currentGen = await inv("pty_spawn", { command: cmd, cols: term.cols, rows: term.rows });
  termRunning = true;
  term.focus();
}

/* ================= settings ================= */

async function pickFolders() {
  const script = `osascript -e 'try' -e 'set fs to choose folder with prompt "MoleUI" with multiple selections allowed' -e 'set out to ""' -e 'repeat with f in fs' -e 'set out to out & POSIX path of f & linefeed' -e 'end repeat' -e 'out' -e 'on error' -e '""' -e 'end try'`;
  try {
    const out = await runJson(script);
    return out.split("\n").map((s) => s.trim()).filter(Boolean)
      .map((p) => (p.length > 1 ? p.replace(/\/+$/, "") : p));
  } catch (_) { return []; }
}

function wireFolderAdd(btnId, areaId, saveName) {
  $("#" + btnId).onclick = async () => {
    const paths = await pickFolders();
    if (!paths.length) return;
    const area = $("#" + areaId);
    const cur = area.value.replace(/\s+$/, "");
    area.value = (cur ? cur + "\n" : "") + paths.join("\n") + "\n";
    await inv("write_mole_config", { name: saveName, content: area.value });
    toast(t("set.saved"), "ok");
  };
}

let cliInfo = null;
let touchInfo = null;
function renderCliSettingsCard(info) {
  if (!info) {
    return h(`
      <div class="glass set-card">
        <h3>${esc(t("set.cliTitle"))}</h3>
        <p class="desc">${esc(t("cli.checking"))}</p>
        <div class="set-actions"></div>
        <div class="set-log" hidden></div>
      </div>`);
  }

  const isBundled = !!info.bundled;
  const bp = info.bundled_path || "";
  const installCliCmd = bp
    ? `sudo mkdir -p /usr/local/bin && sudo ln -sf '${bp}' /usr/local/bin/mole && sudo ln -sf '${bp}' /usr/local/bin/mo && echo '✓ /usr/local/bin/mole'`
    : "";
  const cli = h(`
    <div class="glass set-card">
      <h3>${esc(t("set.cliTitle"))}</h3>
      <p class="desc">${esc(isBundled
        ? t("set.cliBundledDesc", { v: info.version || "?" })
        : t("set.cliDesc", { v: info.version || "?", p: info.path || "?" }))}</p>
      <div class="set-actions">
        ${isBundled ? `
        <button class="btn grad small" data-sudo="${esc(installCliCmd)}">${esc(t("set.installCli"))}</button>
        <button class="btn small" data-cmd="brew install mole </dev/null">${esc(t("set.brewInstall"))}</button>
        ` : `
        <button class="btn grad small" data-cmd="mole update </dev/null">${esc(t("set.update"))}</button>
        <button class="btn small" data-cmd="mole update --force </dev/null">${esc(t("set.force"))}</button>
        <button class="btn small" data-cmd="mole update --nightly </dev/null">${esc(t("set.nightly"))}</button>
        `}
      </div>
      <div class="set-log" hidden></div>
    </div>`);
  wireLogButtons(cli, "set-update");
  return cli;
}

function renderTouchSettingsCard(info) {
  const status = info
    ? (info.enabled
      ? `<span class="status-chip ok">${esc(t("set.touchEnabled", { p: info.location || "sudo" }))}</span>`
      : `<span class="status-chip warn">${esc(t("set.touchDisabled"))}</span>`)
    : `<span class="status-chip">${esc(t("set.touchChecking"))}</span>`;
  const card = h(`
    <div class="glass set-card">
      <h3>${esc(t("set.touchTitle"))}</h3>
      <p class="desc">${esc(t("set.touchDesc"))}</p>
      <div class="set-status">${status}</div>
      <div class="set-actions">
        <button class="btn grad small" data-enable-touch>${esc(t("set.touchEnable"))}</button>
        <button class="btn small" data-cmd="mole touchid enable --dry-run </dev/null">${esc(t("set.touchPreview"))}</button>
      </div>
      <div class="set-log" hidden></div>
    </div>`);
  wireLogButtons(card, "set-touch-preview");
  const enable = $("[data-enable-touch]", card);
  enable.disabled = !!(info && info.enabled);
  enable.onclick = async () => {
    const log = $(".set-log", card);
    const chip = $(".status-chip", card);
    log.hidden = false;
    log.textContent = t("set.touchWorking") + "\n";
    chip.className = "status-chip";
    chip.textContent = t("set.touchWorking");
    const ap = await inv("ensure_askpass");
    runPtyTask(`export SUDO_ASKPASS=${sh(ap)}; sudo -A -v && mole touchid enable </dev/null`,
      (l) => { if (l.trim()) { log.textContent += l + "\n"; log.scrollTop = 1e9; } },
      async () => {
        touchInfo = await inv("touchid_status").catch(() => null);
        if (touchInfo && touchInfo.enabled) {
          chip.className = "status-chip ok";
          chip.textContent = t("set.touchEnabled", { p: touchInfo.location || "sudo" });
          enable.disabled = true;
          toast(t("set.touchDone"), "ok");
        } else {
          chip.className = "status-chip warn";
          chip.textContent = t("set.touchFail");
          toast(t("set.touchFail"), "err");
        }
      });
  };
  return card;
}

async function setEnter() {
  const g = $("#set-grid");
  g.innerHTML = "";

  let cli = renderCliSettingsCard(cliInfo);
  g.appendChild(cli);
  refreshCli().then((info) => {
    cliInfo = info || cliInfo;
    if (currentView !== "settings" || !cli.isConnected) return;
    const next = renderCliSettingsCard(cliInfo);
    cli.replaceWith(next);
    cli = next;
  }).catch(() => {});

  let touch = renderTouchSettingsCard(touchInfo);
  g.appendChild(touch);
  inv("touchid_status").then((info) => {
    touchInfo = info;
    if (currentView !== "settings" || !touch.isConnected) return;
    const next = renderTouchSettingsCard(touchInfo);
    touch.replaceWith(next);
    touch = next;
  }).catch(() => {});

  const comp = h(`
    <div class="glass set-card">
      <h3>${esc(t("set.compTitle"))}</h3>
      <p class="desc">${esc(t("set.compDesc"))}</p>
      <div class="set-actions">
        <button class="btn small" data-cmd="mole completion </dev/null">${esc(t("set.compInstall"))}</button>
      </div>
      <div class="set-log" hidden></div>
    </div>`);
  wireLogButtons(comp, "set-comp");
  g.appendChild(comp);

  const danger = h(`
    <div class="glass set-card">
      <h3>${esc(t("set.dangerTitle"))}</h3>
      <p class="desc">${esc(t("set.dangerDesc"))}</p>
      <div class="set-actions"><button class="btn danger small" id="btn-rm-cli">${esc(t("set.removeCli"))}</button></div>
      <div class="set-log" hidden></div>
    </div>`);
  $("#btn-rm-cli", danger).onclick = async () => {
    if (!(await askConfirm(t("set.removeCli"), t("set.removeConfirm")))) return;
    const log = $(".set-log", danger);
    log.hidden = false; log.textContent = "";
    runTask("set-rm", "mole remove </dev/null", (l) => { log.textContent += l + "\n"; log.scrollTop = 1e9; }, () => refreshCli());
  };
  g.appendChild(danger);

  const wl = h(`
    <div class="glass set-card wide">
      <h3>${esc(t("set.wlTitle"))}</h3>
      <p class="desc">${esc(t("set.wlDesc"))}</p>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px">
        <div>
          <p class="muted" style="margin-bottom:6px">${esc(t("set.wlClean"))}</p>
          <textarea class="wl-area" id="wl-clean"></textarea>
          <div class="set-actions" style="margin-top:8px">
            <button class="btn grad small" id="wl-clean-add">${esc(t("set.addFolder"))}</button>
            <button class="btn small" id="wl-clean-save">${esc(t("set.save"))}</button>
          </div>
        </div>
        <div>
          <p class="muted" style="margin-bottom:6px">${esc(t("set.wlOpt"))}</p>
          <textarea class="wl-area" id="wl-opt"></textarea>
          <div class="set-actions" style="margin-top:8px">
            <button class="btn grad small" id="wl-opt-add">${esc(t("set.addFolder"))}</button>
            <button class="btn small" id="wl-opt-save">${esc(t("set.save"))}</button>
          </div>
        </div>
      </div>
      <p class="muted" style="margin-top:14px; margin-bottom:6px">${esc(t("set.purgeTitle"))} · ${esc(t("set.purgeDesc"))}</p>
      <textarea class="wl-area" id="wl-purge" style="min-height:70px"></textarea>
      <div class="set-actions" style="margin-top:8px">
        <button class="btn grad small" id="wl-purge-add">${esc(t("set.addFolder"))}</button>
        <button class="btn small" id="wl-purge-save">${esc(t("set.save"))}</button>
      </div>
    </div>`);
  g.appendChild(wl);
  inv("read_mole_config", { name: "whitelist" }).then((v) => ($("#wl-clean").value = v));
  inv("read_mole_config", { name: "whitelist_optimize" }).then((v) => ($("#wl-opt").value = v));
  inv("read_mole_config", { name: "purge_paths" }).then((v) => ($("#wl-purge").value = v));
  $("#wl-clean-save").onclick = () => inv("write_mole_config", { name: "whitelist", content: $("#wl-clean").value }).then(() => toast(t("set.saved"), "ok"));
  $("#wl-opt-save").onclick = () => inv("write_mole_config", { name: "whitelist_optimize", content: $("#wl-opt").value }).then(() => toast(t("set.saved"), "ok"));
  $("#wl-purge-save").onclick = () => inv("write_mole_config", { name: "purge_paths", content: $("#wl-purge").value }).then(() => toast(t("set.saved"), "ok"));
  wireFolderAdd("wl-clean-add", "wl-clean", "whitelist");
  wireFolderAdd("wl-opt-add", "wl-opt", "whitelist_optimize");
  wireFolderAdd("wl-purge-add", "wl-purge", "purge_paths");

  const about = h(`
    <div class="glass set-card wide">
      <div class="thanks-banner">
        <h3>${esc(t("set.thanksTitle"))}</h3>
        <p>${esc(t("set.thanksBody"))}</p>
        <div class="set-actions">
          <button class="btn small" data-url="https://github.com/tw93/mole">${esc(t("set.repo"))}</button>
          <button class="btn small" data-url="https://github.com/tw93">${esc(t("set.author"))}</button>
          <button class="btn small" data-url="https://github.com/tw93/mole">${esc(t("set.star"))}</button>
        </div>
      </div>
      <p class="muted" style="margin-top:14px; text-align:center">${esc(t("set.aboutFoot"))}</p>
    </div>`);
  $$("[data-url]", about).forEach((b) => (b.onclick = () => inv("open_url", { url: b.dataset.url })));
  g.appendChild(about);
}

function wireLogButtons(card, idPrefix) {
  const log = $(".set-log", card);
  $$("[data-cmd]", card).forEach((b, i) => {
    b.onclick = () => {
      log.hidden = false;
      log.textContent = "";
      runTask(idPrefix + i, b.dataset.cmd,
        (l) => { if (l.trim()) { log.textContent += l + "\n"; log.scrollTop = 1e9; } },
        () => { refreshCli(); });
    };
  });
  $$("[data-sudo]", card).forEach((b) => {
    b.onclick = async () => {
      log.hidden = false;
      log.textContent = "";
      const ap = await inv("ensure_askpass");
      runPtyTask(`export SUDO_ASKPASS=${sh(ap)}; sudo -A -v && ${b.dataset.sudo}`,
        (l) => { if (l.trim()) { log.textContent += l + "\n"; log.scrollTop = 1e9; } },
        () => { refreshCli(); });
    };
  });
}

/* ================= missing mole ================= */

function showMissing() {
  const log = h(`<div class="file-list" hidden></div>`);
  const brew = h(`<button class="btn grad" style="width:100%">${esc(t("miss.brew"))}</button>`);
  const script = h(`<button class="btn" style="width:100%; margin-top:8px">${esc(t("miss.script"))}</button>`);
  const skip = h(`<p class="muted" style="margin-top:12px; cursor:pointer; font-size:12px">${esc(t("miss.skip"))}</p>`);
  const mask = modal([
    h(`<div class="modal-emoji">🐹</div>`),
    h(`<h2>${esc(t("miss.title"))}</h2>`),
    h(`<p class="muted">${esc(t("miss.body"))}</p>`),
    brew, script, log, skip,
  ]);
  skip.onclick = () => mask.remove();
  const install = (cmd) => {
    brew.disabled = script.disabled = true;
    log.hidden = false;
    log.textContent = t("miss.installing") + "\n";
    runTask("install-mole", cmd,
      (l) => { if (l.trim()) { log.textContent += l + "\n"; log.scrollTop = 1e9; } },
      async () => {
        const info = await refreshCli();
        if (info.installed) { toast(t("miss.ok"), "ok"); mask.remove(); switchView("dashboard"); }
        else { toast(t("miss.fail"), "err"); brew.disabled = script.disabled = false; }
      });
  };
  brew.onclick = () => install("brew install mole");
  script.onclick = () => install("curl -fsSL https://raw.githubusercontent.com/tw93/mole/main/install.sh | bash");
}

window.addEventListener("error", (e) => toast("JS: " + e.message, "err"));
window.addEventListener("unhandledrejection", (e) => toast("Promise: " + (e.reason?.message || e.reason), "err"));

/* ================= boot ================= */

(async function boot() {
  applyI18n();
  try { window.__HOME__ = await runJson("echo $HOME").then((s) => s.trim()); } catch (_) {}
  const info = await refreshCli();
  cliInfo = info;
  switchView("dashboard");
  if (!info.installed) showMissing();
})();
