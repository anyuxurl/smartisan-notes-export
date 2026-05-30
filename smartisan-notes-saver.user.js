// ==UserScript==
// @name         锤子便签导出助手 (Userscript)
// @name:en      Smartisan Notes Exporter (Userscript)
// @namespace    https://github.com/anyuxurl/smartisan-notes-export
// @version      0.8.0
// @description  一键导出锤子便签：全部导出为 ZIP，或自定义勾选笔记后打包 ZIP / 逐个导出，免装 Chrome 扩展，全平台油猴通用。
// @description:en  Export Smartisan Cloud notes: all as a ZIP, or pick specific notes then export as a ZIP / loose .md files. Userscript port of reed-soul/smartisan-notes-saver.
// @author       qeeryyu (基于 reed-soul/smartisan-notes-saver 移植)
// @match        *://cloud.smartisan.com/*
// @match        *://note.smartisan.com/*
// @match        *://yun.smartisan.com/*
// @icon         https://cloud.smartisan.com/favicon.ico
// @run-at       document-end
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @connect      cloud.smartisan.com
// @homepageURL  https://github.com/anyuxurl/smartisan-notes-export
// @supportURL   https://github.com/anyuxurl/smartisan-notes-export/issues
// @updateURL    https://raw.githubusercontent.com/anyuxurl/smartisan-notes-export/main/smartisan-notes-saver.user.js
// @downloadURL  https://raw.githubusercontent.com/anyuxurl/smartisan-notes-export/main/smartisan-notes-saver.user.js
// @license      MIT
// ==/UserScript==

/* global GM_addStyle, GM_setValue, GM_getValue, GM_registerMenuCommand, GM_xmlhttpRequest */

(function () {
    'use strict';

    // -------- 设置（持久化） --------
    const SETTINGS = {
        includeModifyTime: GM_getValue('includeModifyTime', true),
        includeCreateTime: GM_getValue('includeCreateTime', false),
        zipName: GM_getValue('zipName', 'smartisan-notes.zip'),
        customExportView: GM_getValue('customExportView', 'category'), // 'category' | 'order'
        includeImages: GM_getValue('includeImages', true),
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

        /* -------- 自定义导出模态 -------- */
        #sns-modal-root {
            position: fixed;
            inset: 0;
            z-index: 2147483647;
            display: none;
            font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Helvetica Neue", Arial, sans-serif;
        }
        #sns-modal-root.open { display: block; }
        #sns-modal-root .sns-overlay {
            position: absolute;
            inset: 0;
            background: rgba(0,0,0,0.45);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            box-sizing: border-box;
        }
        #sns-modal-root .sns-modal {
            width: min(92vw, 460px);
            max-height: 80vh;
            background: #fff;
            border-radius: 12px;
            box-shadow: 0 12px 40px rgba(0,0,0,0.28);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            color: #333;
            animation: snsPop .14s ease-out;
        }
        #sns-modal-root .sns-modal-header {
            padding: 14px 16px 10px;
            border-bottom: 1px solid #eee;
        }
        #sns-modal-root .sns-title-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 10px;
        }
        #sns-modal-root .sns-title { font-size: 15px; font-weight: 600; }
        #sns-modal-root .sns-close {
            border: none;
            background: transparent;
            font-size: 20px;
            line-height: 1;
            color: #999;
            cursor: pointer;
            padding: 2px 7px;
            border-radius: 6px;
        }
        #sns-modal-root .sns-close:hover { background: #f3f5f7; color: #333; }
        #sns-modal-root .sns-search {
            width: 100%;
            box-sizing: border-box;
            padding: 7px 10px;
            border: 1px solid #ddd;
            border-radius: 8px;
            font-size: 13px;
            outline: none;
        }
        #sns-modal-root .sns-search:focus { border-color: #1aad19; }
        #sns-modal-root .sns-viewtabs {
            display: flex;
            gap: 2px;
            margin-bottom: 10px;
            background: #f3f5f7;
            border-radius: 8px;
            padding: 2px;
        }
        #sns-modal-root .sns-tab {
            flex: 1;
            border: none;
            background: transparent;
            padding: 6px 10px;
            font-size: 12px;
            color: #666;
            cursor: pointer;
            border-radius: 6px;
            transition: background-color .15s ease, color .15s ease;
        }
        #sns-modal-root .sns-tab:hover { color: #333; }
        #sns-modal-root .sns-tab.active {
            background: #fff;
            color: #1aad19;
            font-weight: 600;
            box-shadow: 0 1px 3px rgba(0,0,0,0.12);
        }
        #sns-modal-root .sns-select-all { margin-top: 8px; }
        #sns-modal-root .sns-body {
            flex: 1;
            overflow-y: auto;
            padding: 6px 8px;
        }
        #sns-modal-root .sns-row {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 6px 8px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            line-height: 1.3;
            user-select: none;
        }
        #sns-modal-root .sns-row:hover { background: #f3f5f7; }
        #sns-modal-root .sns-row input[type="checkbox"] {
            width: 15px;
            height: 15px;
            accent-color: #1aad19;
            cursor: pointer;
            flex: none;
            margin: 0;
        }
        #sns-modal-root .sns-folder-row { font-weight: 600; color: #333; }
        #sns-modal-root .sns-caret {
            width: 14px;
            text-align: center;
            color: #999;
            font-size: 10px;
            flex: none;
        }
        #sns-modal-root .sns-folder-count { color: #999; font-weight: 400; font-size: 12px; }
        #sns-modal-root .sns-note-row { padding-left: 30px; color: #555; }
        #sns-modal-root .view-order .sns-note-row { padding-left: 8px; }
        #sns-modal-root .sns-note-title {
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        #sns-modal-root .sns-note-time {
            flex: none;
            margin-left: 8px;
            color: #aaa;
            font-size: 11px;
            white-space: nowrap;
        }
        #sns-modal-root .sns-empty {
            padding: 28px 12px;
            text-align: center;
            color: #999;
            font-size: 13px;
        }
        #sns-modal-root .sns-modal-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            padding: 12px 16px;
            border-top: 1px solid #eee;
        }
        #sns-modal-root .sns-count { font-size: 13px; color: #666; }
        #sns-modal-root .sns-actions { display: flex; gap: 8px; }
        #sns-modal-root .sns-btn {
            border: 1px solid #ddd;
            background: #fff;
            color: #333;
            padding: 7px 14px;
            border-radius: 8px;
            font-size: 13px;
            cursor: pointer;
            transition: background-color .15s ease, opacity .15s ease;
        }
        #sns-modal-root .sns-btn:hover { background: #f3f5f7; }
        #sns-modal-root .sns-btn-primary {
            background: #1aad19;
            border-color: #1aad19;
            color: #fff;
        }
        #sns-modal-root .sns-btn-primary:hover { background: #129611; }
        #sns-modal-root .sns-btn[disabled] { opacity: 0.5; cursor: not-allowed; }
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

    function buildStoreZip(files /* [{path, content}] 或 {path, bytes:Uint8Array} */) {
        const enc = new TextEncoder();
        const now = new Date();
        const dosTime = ((now.getHours() & 0x1F) << 11) | ((now.getMinutes() & 0x3F) << 5) | (Math.floor(now.getSeconds() / 2) & 0x1F);
        const dosDate = (((now.getFullYear() - 1980) & 0x7F) << 9) | (((now.getMonth() + 1) & 0x0F) << 5) | (now.getDate() & 0x1F);

        const chunks = [];
        const central = [];
        let offset = 0;

        files.forEach((f) => {
            const nameBytes = enc.encode(f.path);
            const dataBytes = f.bytes instanceof Uint8Array ? f.bytes : enc.encode(String(f.content == null ? '' : f.content));
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

    // -------- 图片处理 --------
    // 锤子图片以自定义标签内联在 detail：<image w=.. h=.. describe=.. name=Notes_<ts>.jpeg>
    const IMG_BASE = 'https://cloud.smartisan.com/apps/note/notesimage/';
    const IMG_TAG_RE = /<image\b[^>]*>/gi;

    function parseImageTag(tag) {
        const name = (tag.match(/\bname=([^\s>]+)/) || [])[1] || '';
        const describe = (tag.match(/\bdescribe=(.*?)\s+name=/) || [])[1] || '';
        return { name, describe: describe.trim() };
    }

    function collectImageNames(notesData) {
        const set = new Set();
        Object.values(notesData).forEach((arr) => arr.forEach((note) => {
            const re = new RegExp(IMG_TAG_RE.source, 'gi');
            let m;
            while ((m = re.exec(String(note.content || '')))) {
                const { name } = parseImageTag(m[0]);
                if (name) set.add(name);
            }
        }));
        return [...set];
    }

    function mimeFromName(name) {
        const ext = (name.split('.').pop() || '').toLowerCase();
        return ({ jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', heic: 'image/heic', bmp: 'image/bmp' })[ext] || 'application/octet-stream';
    }

    // GM_xmlhttpRequest 包成 Promise，带 cookie 取图片二进制
    function gmFetchBlob(url, name) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url,
                responseType: 'arraybuffer',
                timeout: 30000,
                onload: (r) => {
                    if (r.status >= 200 && r.status < 300 && r.response) {
                        const ct = (String(r.responseHeaders || '').match(/content-type:\s*([^\r\n;]+)/i) || [])[1];
                        const mime = ct && /image\/[a-z0-9.+-]+/i.test(ct) ? ct.trim() : mimeFromName(name);
                        resolve({ bytes: new Uint8Array(r.response), mime });
                    } else {
                        reject(new Error('HTTP ' + r.status));
                    }
                },
                onerror: () => reject(new Error('network error')),
                ontimeout: () => reject(new Error('timeout')),
            });
        });
    }

    // 固定并发下载，单张失败记 {ok:false} 不中断；返回 Map<name,{bytes,mime,ok}>
    async function downloadImages(names, onProgress) {
        const map = new Map();
        const queue = names.slice();
        let done = 0;
        const CONCURRENCY = 5;
        async function worker() {
            while (queue.length) {
                const name = queue.shift();
                try {
                    const { bytes, mime } = await gmFetchBlob(IMG_BASE + encodeURIComponent(name), name);
                    map.set(name, { bytes, mime, ok: true });
                } catch (err) {
                    console.warn('[smartisan-notes-saver] image failed:', name, err);
                    map.set(name, { ok: false });
                }
                done++;
                if (onProgress) onProgress(done, names.length);
            }
        }
        await Promise.all(Array.from({ length: Math.min(CONCURRENCY, names.length) }, worker));
        return map;
    }

    function bytesToBase64(bytes) {
        let bin = '';
        const CH = 0x8000; // 分块避免 apply 实参过多爆栈
        for (let i = 0; i < bytes.length; i += CH) {
            bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
        }
        return btoa(bin);
    }

    // 把 detail 里的 <image> 私有标签改写为标准 Markdown（按导出模式 / 开关）
    function rewriteImages(notesData, opt) {
        Object.values(notesData).forEach((arr) => arr.forEach((note) => {
            note.content = String(note.content || '').replace(IMG_TAG_RE, (tag) => {
                const { name, describe } = parseImageTag(tag);
                if (!name) return tag;
                if (!opt.wantImages) return `![${describe}](${IMG_BASE}${encodeURIComponent(name)})`;
                const e = opt.imgMap.get(name);
                if (!e || !e.ok) return `[图片下载失败: ${name}]`;
                if (opt.mode === 'loose') return `![${describe}](data:${e.mime};base64,${bytesToBase64(e.bytes)})`;
                return `![${describe}](../images/${name})`;
            });
        }));
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

    async function exportAsZip(notesData, imgMap) {
        setFabBusy('打包');
        const files = buildFileList(notesData);
        if (imgMap) {
            imgMap.forEach((v, name) => {
                if (v && v.ok) files.push({ path: `images/${name}`, bytes: v.bytes });
            });
        }
        console.log('[smartisan-notes-saver] building zip with', files.length, 'files (native STORE)...');
        await new Promise((r) => setTimeout(r, 0));
        const blob = buildStoreZip(files);
        console.log('[smartisan-notes-saver] zip built, size =', blob.size, 'bytes');
        setFabBusy('下载');
        await downloadBlob(blob, SETTINGS.zipName);
        console.log('[smartisan-notes-saver] download triggered.');
    }

    // 不打包，逐个 .md 下载（自定义导出的一种输出方式）
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
    // mode: 'zip' | 'loose'；传入 notesData 则导出该子集（自定义导出），不传则提取全部（全部导出）
    async function runExport(mode, notesData) {
        closeMenu();
        try {
            const isSubset = !!notesData;
            if (!isSubset) {
                setFabBusy('读取');
                notesData = await extractNotes();
            }
            const total = countNotes(notesData);
            console.log('[smartisan-notes-saver] notes loaded:', total, 'in', Object.keys(notesData).length, 'folders');
            if (total === 0) {
                alert(isSubset ? '未选择任何便签。' : '未找到任何便签，请确认已登录并已同步数据。');
                return;
            }
            // 全部导出做二次确认；自定义导出已在面板内明确选择，直接执行
            if (!isSubset) {
                const modeLabel = mode === 'loose' ? '多个独立 .md' : 'ZIP';
                if (!confirm(`共找到 ${total} 条便签，分布在 ${Object.keys(notesData).length} 个分类中。\n导出模式：${modeLabel}\n是否继续？`)) {
                    return;
                }
            }
            // 图片：收集 → 下载 → 改写正文引用（开关关时改写为云端 URL，不下载）
            const wantImages = SETTINGS.includeImages;
            const imgNames = collectImageNames(notesData);
            let imgMap = new Map();
            if (wantImages && imgNames.length) {
                setFabBusy('图片');
                console.log('[smartisan-notes-saver] downloading', imgNames.length, 'images...');
                imgMap = await downloadImages(imgNames, (d, t) => setFabBusy(`图 ${d}/${t}`));
            }
            rewriteImages(notesData, { mode, wantImages, imgMap });

            if (mode === 'loose') await exportAsLooseFiles(notesData);
            else await exportAsZip(notesData, wantImages ? imgMap : null);
        } catch (err) {
            console.error('[smartisan-notes-saver] export failed:', err);
            alert(`导出失败: ${err && err.message ? err.message : err}\n详细信息见控制台。`);
        } finally {
            setFabBusy(null);
        }
    }

    // -------- 自定义导出：勾选面板 --------
    const MODAL_ID = 'sns-modal-root';
    let modalState = null; // { flat:[{id,folder,note}], selected:Set, collapsed:Set, query:'', view:'category'|'order' }

    function flattenNotes(notesData) {
        const flat = [];
        Object.keys(notesData).forEach((folder) => {
            notesData[folder].forEach((note) => {
                flat.push({ id: flat.length, folder, note });
            });
        });
        return flat;
    }

    function buildSubset(flat, selected) {
        const out = {};
        flat.forEach((it) => {
            if (!selected.has(it.id)) return;
            (out[it.folder] || (out[it.folder] = [])).push(it.note);
        });
        return out;
    }

    function escapeHtml(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // 搜索过滤后的可见笔记（仅影响显示，不改动 selected）
    function modalVisible() {
        const q = modalState.query.trim().toLowerCase();
        if (!q) return modalState.flat;
        return modalState.flat.filter((it) => (it.note.title || '').toLowerCase().includes(q));
    }
    function modalVisibleGroups() {
        const groups = new Map();
        modalVisible().forEach((it) => {
            if (!groups.has(it.folder)) groups.set(it.folder, []);
            groups.get(it.folder).push(it);
        });
        return groups;
    }

    // 简短修改时间（M-D HH:mm），用于在行尾佐证排序
    function shortTime(ts) {
        if (!ts) return '';
        try {
            const d = new Date(ts);
            const pad = (n) => String(n).padStart(2, '0');
            return `${d.getMonth() + 1}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
        } catch (_) { return ''; }
    }
    // 按修改时间倒序（最近在前），不改原数组
    function sortByTimeDesc(arr) {
        return arr.slice().sort((a, b) => (b.note.modify_time || 0) - (a.note.modify_time || 0));
    }
    function noteRowHtml(it) {
        return `
                    <div class="sns-row sns-note-row" data-id="${it.id}">
                        <input type="checkbox"${modalState.selected.has(it.id) ? ' checked' : ''} />
                        <span class="sns-note-title">${escapeHtml(it.note.title || '(无标题)')}</span>
                        <span class="sns-note-time">${shortTime(it.note.modify_time)}</span>
                    </div>`;
    }
    function folderRowHtml(folder, collapsed, selCount, total) {
        return `
                    <div class="sns-row sns-folder-row" data-folder="${escapeHtml(folder)}">
                        <span class="sns-caret">${collapsed ? '▶' : '▼'}</span>
                        <input type="checkbox"${selCount === total ? ' checked' : ''} />
                        <span class="sns-note-title">${escapeHtml(folder)}</span>
                        <span class="sns-folder-count">(${selCount}/${total})</span>
                    </div>`;
    }

    function renderModal() {
        const root = document.getElementById(MODAL_ID);
        if (!root || !modalState) return;
        const body = root.querySelector('.sns-body');
        const visible = modalVisible();
        const visibleCount = visible.length;

        // 视图高亮 + body 视图 class（控制顺序视图的缩进）
        root.querySelectorAll('.sns-tab').forEach((t) => {
            t.classList.toggle('active', t.dataset.view === modalState.view);
        });
        body.className = 'sns-body view-' + modalState.view;

        if (visibleCount === 0) {
            body.innerHTML = `<div class="sns-empty">没有匹配的笔记</div>`;
        } else if (modalState.view === 'order') {
            // 不分组，全部按修改时间倒序
            body.innerHTML = sortByTimeDesc(visible).map(noteRowHtml).join('');
        } else {
            // 按分类分组，组内按修改时间倒序
            const groups = modalVisibleGroups();
            let html = '';
            groups.forEach((items, folder) => {
                const collapsed = modalState.collapsed.has(folder);
                const selCount = items.filter((it) => modalState.selected.has(it.id)).length;
                html += folderRowHtml(folder, collapsed, selCount, items.length);
                if (!collapsed) sortByTimeDesc(items).forEach((it) => { html += noteRowHtml(it); });
            });
            body.innerHTML = html;
            // indeterminate 是 DOM 属性，HTML 标记无法表达，渲染后按文件夹顺序补设
            const folderRows = body.querySelectorAll('.sns-folder-row');
            let i = 0;
            groups.forEach((items) => {
                const selCount = items.filter((it) => modalState.selected.has(it.id)).length;
                const cb = folderRows[i] && folderRows[i].querySelector('input[type="checkbox"]');
                if (cb) cb.indeterminate = selCount > 0 && selCount < items.length;
                i++;
            });
        }

        // 底部计数 + 按钮可用性
        const selectedTotal = modalState.selected.size;
        root.querySelector('.sns-count').textContent = `已选 ${selectedTotal} 条`;
        root.querySelectorAll('.sns-actions .sns-btn').forEach((b) => { b.disabled = selectedTotal === 0; });

        // 顶部全选（基于当前可见项）
        const allCb = root.querySelector('.sns-all-cb');
        const visSel = visible.filter((it) => modalState.selected.has(it.id)).length;
        allCb.checked = visibleCount > 0 && visSel === visibleCount;
        allCb.indeterminate = visSel > 0 && visSel < visibleCount;
    }

    function closeModal() {
        const root = document.getElementById(MODAL_ID);
        if (root) root.classList.remove('open');
    }

    function ensureModalRoot() {
        let root = document.getElementById(MODAL_ID);
        if (root) return root;
        root = document.createElement('div');
        root.id = MODAL_ID;
        root.innerHTML = `
            <div class="sns-overlay">
                <div class="sns-modal" role="dialog" aria-modal="true">
                    <div class="sns-modal-header">
                        <div class="sns-title-row">
                            <span class="sns-title">自定义导出</span>
                            <button class="sns-close" type="button" title="关闭">×</button>
                        </div>
                        <div class="sns-viewtabs">
                            <button class="sns-tab" type="button" data-view="category">按分类</button>
                            <button class="sns-tab" type="button" data-view="order">按顺序</button>
                        </div>
                        <input class="sns-search" type="text" placeholder="搜索笔记标题…" />
                        <div class="sns-row sns-select-all">
                            <input type="checkbox" class="sns-all-cb" />
                            <span>全选（当前显示）</span>
                        </div>
                    </div>
                    <div class="sns-body"></div>
                    <div class="sns-modal-footer">
                        <span class="sns-count">已选 0 条</span>
                        <div class="sns-actions">
                            <button class="sns-btn" type="button" data-mode="loose" disabled>逐个导出</button>
                            <button class="sns-btn sns-btn-primary" type="button" data-mode="zip" disabled>打包 ZIP</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(root);

        const overlay = root.querySelector('.sns-overlay');
        const body = root.querySelector('.sns-body');
        const search = root.querySelector('.sns-search');

        // 关闭：× / 点遮罩空白 / ESC
        root.querySelector('.sns-close').addEventListener('click', closeModal);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && root.classList.contains('open')) closeModal();
        });

        // 搜索：仅过滤显示
        search.addEventListener('input', (e) => { modalState.query = e.target.value; renderModal(); });

        // 视图切换：按分类 / 按顺序
        root.querySelector('.sns-viewtabs').addEventListener('click', (e) => {
            const tab = e.target.closest('.sns-tab');
            if (!tab || tab.dataset.view === modalState.view) return;
            modalState.view = tab.dataset.view;
            saveSetting('customExportView', modalState.view);
            renderModal();
        });

        // 顶部全选：作用于当前可见项（整行可点）
        root.querySelector('.sns-select-all').addEventListener('click', () => {
            const visible = modalVisible();
            const allSel = visible.length > 0 && visible.every((it) => modalState.selected.has(it.id));
            visible.forEach((it) => allSel ? modalState.selected.delete(it.id) : modalState.selected.add(it.id));
            renderModal();
        });

        // 列表点击委托：箭头折叠 / 文件夹行全选 / 单条切换
        body.addEventListener('click', (e) => {
            const row = e.target.closest('.sns-row');
            if (!row) return;
            if (e.target.closest('.sns-caret')) {
                const folder = row.dataset.folder;
                if (modalState.collapsed.has(folder)) modalState.collapsed.delete(folder);
                else modalState.collapsed.add(folder);
                renderModal();
                return;
            }
            if (row.classList.contains('sns-folder-row')) {
                const items = modalVisibleGroups().get(row.dataset.folder) || [];
                const allSel = items.length > 0 && items.every((it) => modalState.selected.has(it.id));
                items.forEach((it) => allSel ? modalState.selected.delete(it.id) : modalState.selected.add(it.id));
                renderModal();
            } else if (row.classList.contains('sns-note-row')) {
                const id = Number(row.dataset.id);
                if (modalState.selected.has(id)) modalState.selected.delete(id);
                else modalState.selected.add(id);
                renderModal();
            }
        });

        // 底部导出：把选中项重建为 notesData 子集，复用 runExport
        root.querySelector('.sns-actions').addEventListener('click', (e) => {
            const btn = e.target.closest('.sns-btn');
            if (!btn || btn.disabled) return;
            const subset = buildSubset(modalState.flat, modalState.selected);
            closeModal();
            runExport(btn.dataset.mode, subset);
        });

        return root;
    }

    async function openCustomExport() {
        closeMenu();
        setFabBusy('读取');
        let data;
        try {
            data = await extractNotes();
        } catch (err) {
            console.error('[smartisan-notes-saver] extract failed:', err);
            alert(`读取便签失败: ${err && err.message ? err.message : err}`);
            return;
        } finally {
            setFabBusy(null);
        }
        const total = countNotes(data);
        if (total === 0) {
            alert('未找到任何便签，请确认已登录并已同步数据。');
            return;
        }
        const flat = flattenNotes(data);
        modalState = {
            flat,
            selected: new Set(flat.map((it) => it.id)), // 默认全选
            collapsed: new Set(),
            query: '',
            view: SETTINGS.customExportView,            // 'category' | 'order'
        };
        const root = ensureModalRoot();
        root.querySelector('.sns-search').value = '';
        renderModal();
        root.classList.add('open');
        root.querySelector('.sns-search').focus();
    }

    // -------- UI 注入：FAB + 弹出菜单 --------
    const ICON_DOWNLOAD_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>`;

    function buildMenuHtml() {
        const tickModify = SETTINGS.includeModifyTime ? '<span class="sns-check">✓</span>' : '';
        const tickCreate = SETTINGS.includeCreateTime ? '<span class="sns-check">✓</span>' : '';
        const tickImages = SETTINGS.includeImages ? '<span class="sns-check">✓</span>' : '';
        return `
            <div class="sns-section-label">导出</div>
            <button class="sns-item" data-act="all"><span>全部导出</span><span style="color:#999;font-size:11px">ZIP</span></button>
            <button class="sns-item" data-act="custom"><span>自定义导出…</span><span style="color:#999;font-size:11px">选择笔记</span></button>
            <div class="sns-divider"></div>
            <div class="sns-section-label">选项</div>
            <button class="sns-item" data-act="toggleModify"><span>包含修改时间</span>${tickModify}</button>
            <button class="sns-item" data-act="toggleCreate"><span>包含创建时间</span>${tickCreate}</button>
            <button class="sns-item" data-act="toggleImages"><span>包含图片（联网下载）</span>${tickImages}</button>
            <button class="sns-item" data-act="setZipName"><span>设置 ZIP 文件名…</span></button>
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
            case 'all':    runExport('zip'); break;
            case 'custom': openCustomExport(); break;
            case 'toggleModify':
                saveSetting('includeModifyTime', !SETTINGS.includeModifyTime);
                refreshMenuContent();
                break;
            case 'toggleCreate':
                saveSetting('includeCreateTime', !SETTINGS.includeCreateTime);
                refreshMenuContent();
                break;
            case 'toggleImages':
                saveSetting('includeImages', !SETTINGS.includeImages);
                refreshMenuContent();
                break;
            case 'setZipName': {
                const v = prompt('ZIP 文件名：', SETTINGS.zipName);
                if (v) saveSetting('zipName', v.trim());
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

        // 左键 = 切换菜单；按住 Shift + 点击 = 直接全部导出（ZIP）
        fab.addEventListener('click', (e) => {
            if (fab.disabled) return;
            if (e.shiftKey) { closeMenu(); runExport('zip'); }
            else toggleMenu();
        });
        // 右键 = 直接全部导出（ZIP）
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
    GM_registerMenuCommand('全部导出为 ZIP', () => runExport('zip'));
    GM_registerMenuCommand('自定义导出…（选择笔记）', () => openCustomExport());
    GM_registerMenuCommand(
        `${SETTINGS.includeModifyTime ? '✅' : '⬜'} 包含修改时间`,
        () => { saveSetting('includeModifyTime', !SETTINGS.includeModifyTime); refreshMenuContent(); alert('已切换'); }
    );
    GM_registerMenuCommand(
        `${SETTINGS.includeCreateTime ? '✅' : '⬜'} 包含创建时间`,
        () => { saveSetting('includeCreateTime', !SETTINGS.includeCreateTime); refreshMenuContent(); alert('已切换'); }
    );
    GM_registerMenuCommand(
        `${SETTINGS.includeImages ? '✅' : '⬜'} 包含图片（联网下载）`,
        () => { saveSetting('includeImages', !SETTINGS.includeImages); refreshMenuContent(); alert('已切换'); }
    );
    GM_registerMenuCommand('设置 ZIP 文件名', () => {
        const v = prompt('ZIP 文件名：', SETTINGS.zipName);
        if (v) saveSetting('zipName', v);
    });
})();
