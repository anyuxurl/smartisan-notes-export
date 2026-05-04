// ==UserScript==
// @name         锤子便签导出助手 (Userscript)
// @name:en      Smartisan Notes Exporter (Userscript)
// @namespace    https://github.com/anyuxurl/smartisan-notes-export
// @version      0.5.0
// @description  一键导出锤子便签为 Markdown / ZIP / 多文件，免装 Chrome 扩展，全平台油猴通用。
// @description:en  Export all Smartisan Cloud notes to Markdown / ZIP / loose .md files. Userscript port of reed-soul/smartisan-notes-saver.
// @author       qeeryyu (基于 reed-soul/smartisan-notes-saver 移植)
// @match        *://cloud.smartisan.com/*
// @match        *://note.smartisan.com/*
// @icon         https://cloud.smartisan.com/favicon.ico
// @run-at       document-end
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @homepageURL  https://github.com/anyuxurl/smartisan-notes-export
// @supportURL   https://github.com/anyuxurl/smartisan-notes-export/issues
// @updateURL    https://raw.githubusercontent.com/anyuxurl/smartisan-notes-export/main/smartisan-notes-saver.user.js
// @downloadURL  https://raw.githubusercontent.com/anyuxurl/smartisan-notes-export/main/smartisan-notes-saver.user.js
// @license      MIT
// ==/UserScript==

/* global GM_addStyle, GM_setValue, GM_getValue, GM_registerMenuCommand */

(function () {
    'use strict';

    // -------- 设置（持久化） --------
    const SETTINGS = {
        includeModifyTime: GM_getValue('includeModifyTime', true),
        includeCreateTime: GM_getValue('includeCreateTime', false),
        zipName: GM_getValue('zipName', 'smartisan-notes.zip'),
        singleFileName: GM_getValue('singleFileName', 'smartisan-notes.md'),
    };

    function saveSetting(key, value) {
        SETTINGS[key] = value;
        GM_setValue(key, value);
    }

    // -------- 样式 --------
    const ROOT_ID = 'sns-fab-root';
    const FAB_ID = 'sns-fab';
    const MENU_ID = 'sns-menu';
    GM_addStyle(`
        #${ROOT_ID} {
            position: fixed;
            right: 24px;
            bottom: 24px;
            z-index: 2147483647;
            font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Helvetica Neue", Arial, sans-serif;
        }
        #${FAB_ID} {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: #1aad19;
            color: white;
            border: none;
            cursor: pointer;
            box-shadow: 0 3px 10px rgba(0,0,0,0.22);
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform .18s ease, box-shadow .18s ease, background-color .18s ease;
            opacity: 0.85;
        }
        #${FAB_ID}:hover  { background: #129611; opacity: 1; transform: translateY(-1px); box-shadow: 0 5px 14px rgba(0,0,0,0.28); }
        #${FAB_ID}:active { background: #3d8b40; transform: translateY(0); }
        #${FAB_ID}[disabled] { opacity: 0.55; cursor: wait; transform: none; }
        #${FAB_ID} svg { width: 22px; height: 22px; fill: currentColor; }

        #${MENU_ID} {
            position: absolute;
            right: 0;
            bottom: 60px;
            min-width: 220px;
            background: #fff;
            border-radius: 10px;
            box-shadow: 0 6px 24px rgba(0,0,0,0.18);
            padding: 6px;
            display: none;
            color: #333;
            transform-origin: bottom right;
            animation: snsPop .14s ease-out;
        }
        @keyframes snsPop {
            from { opacity: 0; transform: scale(.92); }
            to   { opacity: 1; transform: scale(1); }
        }
        #${MENU_ID}.open { display: block; }
        #${MENU_ID} .sns-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            width: 100%;
            text-align: left;
            border: none;
            background: transparent;
            padding: 9px 12px;
            cursor: pointer;
            font-size: 13px;
            color: #333;
            border-radius: 6px;
            line-height: 1.3;
            box-sizing: border-box;
        }
        #${MENU_ID} .sns-item:hover { background: #f3f5f7; }
        #${MENU_ID} .sns-section-label {
            padding: 8px 12px 4px;
            font-size: 11px;
            color: #999;
            text-transform: uppercase;
            letter-spacing: .5px;
        }
        #${MENU_ID} .sns-divider { height: 1px; background: #eee; margin: 4px 0; }
        #${MENU_ID} .sns-check { color: #1aad19; font-weight: bold; }
        #${MENU_ID} .sns-status {
            padding: 8px 12px;
            font-size: 12px;
            color: #666;
            background: #f8f8f8;
            border-radius: 6px;
            margin-top: 4px;
            display: none;
        }
        #${MENU_ID} .sns-status.show { display: block; }
    `);

    // -------- IndexedDB 读取 --------
    function openDatabase(dbName) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(dbName, 5);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    function getAllFromStore(db, storeName) {
        return new Promise((resolve, reject) => {
            const tx = db.transaction([storeName], 'readonly');
            const store = tx.objectStore(storeName);
            const req = store.getAll();
            req.onerror = () => reject(req.error);
            req.onsuccess = () => resolve(req.result);
        });
    }

    function formatTime(ts) {
        if (!ts) return '';
        try {
            return new Date(ts).toLocaleString('zh-CN', {
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', second: '2-digit',
            });
        } catch (_) {
            return String(ts);
        }
    }

    async function extractNotes() {
        const folderDb = await openDatabase('_pouch_folder');
        const noteDb = await openDatabase('_pouch_note');
        try {
            const folders = await getAllFromStore(folderDb, 'by-sequence');
            const notes = await getAllFromStore(noteDb, 'by-sequence');

            const folderMap = new Map();
            folders.forEach((item) => {
                if (item.folder && !item._deleted) {
                    folderMap.set(item.folder.sync_id, item.folder.title);
                }
            });

            const notesData = {};
            notes.forEach((item) => {
                if (!item.note || item._deleted) return;
                const note = item.note;
                const folderName = folderMap.get(note.folderId) || '未分类';
                if (!notesData[folderName]) notesData[folderName] = [];

                const headerLines = [];
                if (SETTINGS.includeModifyTime && note.modify_time) {
                    headerLines.push(`修改时间：${formatTime(note.modify_time)}`);
                }
                if (SETTINGS.includeCreateTime && note.create_time) {
                    headerLines.push(`创建时间：${formatTime(note.create_time)}`);
                }
                const header = headerLines.length ? headerLines.join('\n') + '\n\n' : '';
                const content = header + (note.detail || '');

                notesData[folderName].push({
                    title: note.title || `note_${note._id}`,
                    content,
                    modify_time: note.modify_time || 0,
                });
            });

            return notesData;
        } finally {
            folderDb.close();
            noteDb.close();
        }
    }

    function safeName(s) {
        return String(s).replace(/[\\/:*?"<>|]/g, '_').trim() || 'untitled';
    }

    function countNotes(notesData) {
        return Object.values(notesData).reduce((acc, arr) => acc + arr.length, 0);
    }

    // -------- 通用下载（绕过 FileSaver，避免 CSP 静默拦截） --------
    function downloadBlob(blob, filename) {
        return new Promise((resolve) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            // 给浏览器一点时间触发下载，再清理
            setTimeout(() => {
                URL.revokeObjectURL(url);
                a.remove();
                resolve();
            }, 1500);
        });
    }

    // -------- 导出实现 --------
    // 自实现的 STORE 模式 ZIP 打包器（无外部依赖，规避 JSZip 在沙盒里卡死的问题）
    const CRC32_TABLE = (() => {
        const t = new Uint32Array(256);
        for (let n = 0; n < 256; n++) {
            let c = n;
            for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
            t[n] = c >>> 0;
        }
        return t;
    })();
    function crc32(u8) {
        let c = 0xFFFFFFFF;
        for (let i = 0; i < u8.length; i++) c = CRC32_TABLE[(c ^ u8[i]) & 0xFF] ^ (c >>> 8);
        return (c ^ 0xFFFFFFFF) >>> 0;
    }

    function buildStoreZip(files /* [{path, content}] */) {
        const enc = new TextEncoder();
        const now = new Date();
        const dosTime = ((now.getHours() & 0x1F) << 11) | ((now.getMinutes() & 0x3F) << 5) | (Math.floor(now.getSeconds() / 2) & 0x1F);
        const dosDate = (((now.getFullYear() - 1980) & 0x7F) << 9) | (((now.getMonth() + 1) & 0x0F) << 5) | (now.getDate() & 0x1F);

        const chunks = [];
        const central = [];
        let offset = 0;

        files.forEach((f) => {
            const nameBytes = enc.encode(f.path);
            const dataBytes = enc.encode(String(f.content == null ? '' : f.content));
            const crc = crc32(dataBytes);

            // Local file header
            const lfh = new Uint8Array(30 + nameBytes.length);
            const dv = new DataView(lfh.buffer);
            dv.setUint32(0, 0x04034b50, true);
            dv.setUint16(4, 20, true);              // version
            dv.setUint16(6, 0x0800, true);          // flags: bit11 = UTF-8 names
            dv.setUint16(8, 0, true);               // compression: 0 = STORE
            dv.setUint16(10, dosTime, true);
            dv.setUint16(12, dosDate, true);
            dv.setUint32(14, crc, true);
            dv.setUint32(18, dataBytes.length, true);
            dv.setUint32(22, dataBytes.length, true);
            dv.setUint16(26, nameBytes.length, true);
            dv.setUint16(28, 0, true);
            lfh.set(nameBytes, 30);
            chunks.push(lfh);
            chunks.push(dataBytes);

            central.push({ nameBytes, crc, size: dataBytes.length, localOffset: offset });
            offset += lfh.byteLength + dataBytes.length;
        });

        const centralStart = offset;
        let centralSize = 0;
        central.forEach((e) => {
            const cdh = new Uint8Array(46 + e.nameBytes.length);
            const dv = new DataView(cdh.buffer);
            dv.setUint32(0, 0x02014b50, true);
            dv.setUint16(4, 20, true);
            dv.setUint16(6, 20, true);
            dv.setUint16(8, 0x0800, true);
            dv.setUint16(10, 0, true);
            dv.setUint16(12, dosTime, true);
            dv.setUint16(14, dosDate, true);
            dv.setUint32(16, e.crc, true);
            dv.setUint32(20, e.size, true);
            dv.setUint32(24, e.size, true);
            dv.setUint16(28, e.nameBytes.length, true);
            dv.setUint16(30, 0, true);
            dv.setUint16(32, 0, true);
            dv.setUint16(34, 0, true);
            dv.setUint16(36, 0, true);
            dv.setUint32(38, 0, true);
            dv.setUint32(42, e.localOffset, true);
            cdh.set(e.nameBytes, 46);
            chunks.push(cdh);
            centralSize += cdh.byteLength;
        });

        // End of central directory record
        const eocd = new Uint8Array(22);
        const dvE = new DataView(eocd.buffer);
        dvE.setUint32(0, 0x06054b50, true);
        dvE.setUint16(4, 0, true);
        dvE.setUint16(6, 0, true);
        dvE.setUint16(8, central.length, true);
        dvE.setUint16(10, central.length, true);
        dvE.setUint32(12, centralSize, true);
        dvE.setUint32(16, centralStart, true);
        dvE.setUint16(20, 0, true);
        chunks.push(eocd);

        return new Blob(chunks, { type: 'application/zip' });
    }

    function buildFileList(notesData) {
        const files = [];
        Object.keys(notesData).forEach((category) => {
            const cat = safeName(category);
            const used = new Map();
            notesData[category].forEach((note) => {
                const base = safeName(note.title);
                const n = (used.get(base) || 0) + 1;
                used.set(base, n);
                const fname = n === 1 ? `${base}.md` : `${base}_${n}.md`;
                files.push({ path: `${cat}/${fname}`, content: note.content });
            });
        });
        return files;
    }

    // -------- UI 状态辅助 --------
    function getFab() { return document.getElementById(FAB_ID); }
    function setFabBusy(label) {
        const fab = getFab();
        if (!fab) return;
        fab.disabled = !!label;
        if (label) {
            fab.dataset.label = label;
            fab.title = label;
            // 用文字代替图标显示状态（短文本，最多 2-4 字）
            fab.innerHTML = `<span style="font-size:11px;line-height:1;text-align:center;color:#fff;padding:2px 4px;">${label}</span>`;
        } else {
            fab.title = '锤子便签导出';
            fab.innerHTML = ICON_DOWNLOAD_SVG;
        }
    }
    function setStatus(text) {
        const status = document.getElementById('sns-status');
        if (!status) return;
        if (text) { status.textContent = text; status.classList.add('show'); }
        else { status.classList.remove('show'); }
    }

    async function exportAsZip(notesData) {
        setFabBusy('打包');
        const files = buildFileList(notesData);
        console.log('[smartisan-notes-saver] building zip with', files.length, 'files (native STORE)...');
        await new Promise((r) => setTimeout(r, 0));
        const blob = buildStoreZip(files);
        console.log('[smartisan-notes-saver] zip built, size =', blob.size, 'bytes');
        setFabBusy('下载');
        await downloadBlob(blob, SETTINGS.zipName);
        console.log('[smartisan-notes-saver] download triggered.');
    }

    async function exportAsSingleMarkdown(notesData) {
        setFabBusy('生成');
        const parts = [];
        Object.keys(notesData).sort().forEach((category) => {
            parts.push(`# ${category}\n`);
            notesData[category]
                .slice()
                .sort((a, b) => (b.modify_time || 0) - (a.modify_time || 0))
                .forEach((note) => {
                    parts.push(`## ${note.title}\n\n${note.content}\n`);
                });
            parts.push('\n---\n');
        });
        const blob = new Blob([parts.join('\n')], { type: 'text/markdown;charset=utf-8' });
        await downloadBlob(blob, SETTINGS.singleFileName);
    }

    // 不打包，逐个 .md 下载——最后兜底
    async function exportAsLooseFiles(notesData) {
        const all = buildFileList(notesData).map((f) => ({
            name: f.path.replace(/\//g, '__'),
            content: f.content,
        }));
        console.log('[smartisan-notes-saver] downloading', all.length, 'loose .md files');
        for (let i = 0; i < all.length; i++) {
            setFabBusy(`${i + 1}/${all.length}`);
            const blob = new Blob([all[i].content], { type: 'text/markdown;charset=utf-8' });
            await downloadBlob(blob, all[i].name);
            await new Promise((r) => setTimeout(r, 120));
        }
    }

    // -------- 主流程 --------
    async function runExport(mode /* 'zip' | 'single' | 'loose' */) {
        closeMenu();
        setFabBusy('读取');
        try {
            const notesData = await extractNotes();
            const total = countNotes(notesData);
            console.log('[smartisan-notes-saver] notes loaded:', total, 'in', Object.keys(notesData).length, 'folders');
            if (total === 0) {
                alert('未找到任何便签，请确认已登录并已同步数据。');
                return;
            }
            const modeLabel = mode === 'single' ? '单个 Markdown' : mode === 'loose' ? '多个独立 .md' : 'ZIP';
            if (!confirm(`共找到 ${total} 条便签，分布在 ${Object.keys(notesData).length} 个分类中。\n导出模式：${modeLabel}\n是否继续？`)) {
                return;
            }
            if (mode === 'single') await exportAsSingleMarkdown(notesData);
            else if (mode === 'loose') await exportAsLooseFiles(notesData);
            else await exportAsZip(notesData);
        } catch (err) {
            console.error('[smartisan-notes-saver] export failed:', err);
            alert(`导出失败: ${err && err.message ? err.message : err}\n详细信息见控制台。`);
        } finally {
            setFabBusy(null);
        }
    }

    // -------- UI 注入：FAB + 弹出菜单 --------
    const ICON_DOWNLOAD_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>`;

    function buildMenuHtml() {
        const tickModify = SETTINGS.includeModifyTime ? '<span class="sns-check">✓</span>' : '';
        const tickCreate = SETTINGS.includeCreateTime ? '<span class="sns-check">✓</span>' : '';
        return `
            <div class="sns-section-label">导出</div>
            <button class="sns-item" data-act="zip"><span>导出为 ZIP</span><span style="color:#999;font-size:11px">推荐</span></button>
            <button class="sns-item" data-act="single"><span>导出为单个 Markdown</span></button>
            <button class="sns-item" data-act="loose"><span>导出为多个独立 .md</span></button>
            <div class="sns-divider"></div>
            <div class="sns-section-label">选项</div>
            <button class="sns-item" data-act="toggleModify"><span>包含修改时间</span>${tickModify}</button>
            <button class="sns-item" data-act="toggleCreate"><span>包含创建时间</span>${tickCreate}</button>
            <button class="sns-item" data-act="setZipName"><span>设置 ZIP 文件名…</span></button>
            <button class="sns-item" data-act="setMdName"><span>设置单文件名…</span></button>
            <div id="sns-status" class="sns-status"></div>
        `;
    }

    function refreshMenuContent() {
        const menu = document.getElementById(MENU_ID);
        if (menu) menu.innerHTML = buildMenuHtml();
    }

    function openMenu() {
        const menu = document.getElementById(MENU_ID);
        if (menu) { refreshMenuContent(); menu.classList.add('open'); }
    }
    function closeMenu() {
        const menu = document.getElementById(MENU_ID);
        if (menu) menu.classList.remove('open');
    }
    function toggleMenu() {
        const menu = document.getElementById(MENU_ID);
        if (!menu) return;
        if (menu.classList.contains('open')) closeMenu(); else openMenu();
    }

    function handleMenuAction(act) {
        switch (act) {
            case 'zip':    runExport('zip'); break;
            case 'single': runExport('single'); break;
            case 'loose':  runExport('loose'); break;
            case 'toggleModify':
                saveSetting('includeModifyTime', !SETTINGS.includeModifyTime);
                refreshMenuContent();
                break;
            case 'toggleCreate':
                saveSetting('includeCreateTime', !SETTINGS.includeCreateTime);
                refreshMenuContent();
                break;
            case 'setZipName': {
                const v = prompt('ZIP 文件名：', SETTINGS.zipName);
                if (v) saveSetting('zipName', v.trim());
                break;
            }
            case 'setMdName': {
                const v = prompt('单文件 Markdown 文件名：', SETTINGS.singleFileName);
                if (v) saveSetting('singleFileName', v.trim());
                break;
            }
        }
    }

    function ensureFab() {
        if (!document.body) return;
        // 强力去重：删除所有同 ID 的旧实例（解决 SPA 二次注入造成两个按钮的问题）
        const existing = document.querySelectorAll('#' + ROOT_ID);
        if (existing.length === 1) return;     // 已有且只有一个，正常
        existing.forEach((el) => el.remove()); // 0 个或 ≥2 个都重建

        const root = document.createElement('div');
        root.id = ROOT_ID;
        root.innerHTML = `
            <div id="${MENU_ID}"></div>
            <button id="${FAB_ID}" type="button" title="锤子便签导出">${ICON_DOWNLOAD_SVG}</button>
        `;
        document.body.appendChild(root);

        const fab = root.querySelector('#' + FAB_ID);
        const menu = root.querySelector('#' + MENU_ID);
        refreshMenuContent();

        // 左键 = 切换菜单；按住 Shift + 点击 = 直接 ZIP 导出
        fab.addEventListener('click', (e) => {
            if (fab.disabled) return;
            if (e.shiftKey) { closeMenu(); runExport('zip'); }
            else toggleMenu();
        });
        // 右键 = 直接默认导出 ZIP
        fab.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (!fab.disabled) { closeMenu(); runExport('zip'); }
        });

        // 菜单内项目点击委托
        menu.addEventListener('click', (e) => {
            const target = e.target.closest('.sns-item');
            if (!target) return;
            const act = target.dataset.act;
            handleMenuAction(act);
        });

        // 点击外部关闭菜单
        document.addEventListener('click', (e) => {
            if (!root.contains(e.target)) closeMenu();
        }, true);
        // ESC 关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeMenu();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', ensureFab);
    } else {
        ensureFab();
    }

    // SPA 路由切换 / 二次注入造成的多按钮 —— 监听 body 变化时去重并保证单实例
    const mo = new MutationObserver(() => {
        if (!document.body) return;
        const count = document.querySelectorAll('#' + ROOT_ID).length;
        if (count !== 1) ensureFab();
    });
    if (document.body) mo.observe(document.body, { childList: true, subtree: false });

    // -------- 油猴菜单（保留作为备选入口）--------
    GM_registerMenuCommand('导出便签为 ZIP', () => runExport('zip'));
    GM_registerMenuCommand('导出便签为单个 Markdown', () => runExport('single'));
    GM_registerMenuCommand('导出为多个独立 .md 文件 (不打包，兜底)', () => runExport('loose'));
    GM_registerMenuCommand(
        `${SETTINGS.includeModifyTime ? '✅' : '⬜'} 包含修改时间`,
        () => { saveSetting('includeModifyTime', !SETTINGS.includeModifyTime); refreshMenuContent(); alert('已切换'); }
    );
    GM_registerMenuCommand(
        `${SETTINGS.includeCreateTime ? '✅' : '⬜'} 包含创建时间`,
        () => { saveSetting('includeCreateTime', !SETTINGS.includeCreateTime); refreshMenuContent(); alert('已切换'); }
    );
    GM_registerMenuCommand('设置 ZIP 文件名', () => {
        const v = prompt('ZIP 文件名：', SETTINGS.zipName);
        if (v) saveSetting('zipName', v);
    });
    GM_registerMenuCommand('设置单文件 Markdown 文件名', () => {
        const v = prompt('单文件 Markdown 文件名：', SETTINGS.singleFileName);
        if (v) saveSetting('singleFileName', v);
    });
})();
