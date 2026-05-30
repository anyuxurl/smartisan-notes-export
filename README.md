# 锤子便签导出助手 (Userscript)

> Tampermonkey / Violentmonkey 油猴版的锤子便签批量导出工具。在 [reed-soul/smartisan-notes-saver](https://github.com/reed-soul/smartisan-notes-saver) Chrome 扩展基础上重写，移除了所有外部依赖，跨浏览器通用。

一键把 [锤子便签云端](https://cloud.smartisan.com) 里的全部便签导出为 Markdown 文件，保留分类结构，无需安装专属 Chrome 扩展。

## 功能

- ✅ 笔记文本直接读取浏览器本地 IndexedDB（`_pouch_folder` / `_pouch_note`），全程不上传任何数据（仅在「包含图片」开启时，从锤子云端**下载**图片）
- ✅ 两种导出流程：
  - **全部导出**：一键把所有便签按分类打成 ZIP 压缩包，含 UTF-8 文件名，Windows / macOS / Linux 解压都能正确显示中文
  - **自定义导出**：弹出面板，按分类勾选需要的便签（支持搜索、文件夹整选、全选，可在「按分类 / 按修改时间」两种顺序间切换），再选择打包成 ZIP 或逐个下载 .md
- ✅ **导出笔记内的图片**：可开关（默认开）。开启后从锤子云端下载图片——ZIP 模式存入 `images/` 文件夹并用相对路径 `![](../images/…)` 引用，逐个导出则内嵌为 base64；下载失败会在正文标注 `[图片下载失败: …]`。关闭则把图片转为云端链接
- ✅ 可选导出元数据：是否包含修改时间 / 创建时间
- ✅ 自定义 ZIP 文件名（持久化保存）
- ✅ 同分类下重名便签自动加 `_2`、`_3` 后缀，避免文件覆盖丢失
- ✅ 自实现 ZIP 打包器，零依赖（移除 JSZip / FileSaver，规避部分浏览器沙盒下的卡死问题）
- ✅ 浮动操作按钮 (FAB)，不占据顶部工具栏空间
- ✅ Tampermonkey 自动检查更新

## 安装

### 方式一：一键安装（推荐）

1. 先装好 [Tampermonkey](https://www.tampermonkey.net/)（Chrome / Edge / Firefox / Safari 都有）或 [Violentmonkey](https://violentmonkey.github.io/)
2. 点击下方链接，浏览器会自动识别并提示安装：

   👉 **[smartisan-notes-saver.user.js](https://raw.githubusercontent.com/anyuxurl/smartisan-notes-export/main/smartisan-notes-saver.user.js)**

3. 在弹出的安装确认页点 "安装"

### 方式二：Greasy Fork

> _Greasy Fork 链接发布后会更新到这里_

### 方式三：手动安装

1. 打开 Tampermonkey 控制台 → 创建新脚本
2. 复制本仓库根目录下的 `smartisan-notes-saver.user.js` 全部内容粘贴进去
3. Ctrl+S 保存

## 使用

1. 登录 [cloud.smartisan.com](https://cloud.smartisan.com) 并等待便签数据完成同步
2. 页面右下角会出现一个圆形浮动按钮（绿色下载图标）
3. 点击按钮，弹出菜单：
   - **全部导出** — 把所有便签按分类打包成 ZIP
   - **自定义导出…** — 打开勾选面板，挑选便签后再选「打包 ZIP」或「逐个导出」
4. 全部导出会先弹窗确认数量；自定义导出在面板内点按钮即开始下载

### 快捷操作

| 操作                | 效果                  |
| ------------------- | --------------------- |
| 左键 FAB            | 切换菜单              |
| 右键 FAB            | 直接全部导出（ZIP）   |
| `Shift` + 左键 FAB  | 直接全部导出（ZIP）   |
| 点击页面其他位置    | 关闭菜单              |
| `ESC`               | 关闭菜单 / 导出面板   |

### 油猴菜单

Tampermonkey 浏览器扩展图标 → 本脚本下，也提供了同样的入口（导出 / 设置项），适合 FAB 被页面遮挡时使用。

## 导出文件结构

ZIP 模式：

```
smartisan-notes.zip
├── 工作/
│   ├── 周报模板.md
│   ├── 周报模板_2.md   ← 同名自动加后缀
│   └── ...
├── 生活/
│   └── ...
└── 未分类/
    └── ...
```

每个 `.md` 文件的内容：

```markdown
修改时间：2024-08-15 14:32:11

便签正文……
```

## 与原 Chrome 扩展的差异

| 项                       | reed-soul 原版           | 本油猴版                                |
| ------------------------ | ------------------------ | --------------------------------------- |
| 安装方式                 | Chrome 应用商店 / 解包   | 任何油猴管理器，跨浏览器                |
| 依赖                     | JSZip + FileSaver (打包) | 零依赖（自实现 STORE ZIP）              |
| 导出模式                 | 仅 ZIP                   | 全部导出 ZIP / 自定义勾选后 ZIP·逐个    |
| 元数据可选               | 固定包含修改时间         | 可切换修改时间 / 创建时间               |
| 同名便签                 | 会被覆盖                 | 自动 `_2`、`_3`                         |
| 中文文件名               | 取决于解压器             | UTF-8 标志位，全平台正常                |
| UI                       | 顶部矩形按钮             | 右下角浮动 FAB + 弹出菜单               |
| 自动更新                 | 应用商店推送             | Tampermonkey 自动检查 GitHub raw        |

## 隐私

- 笔记内容只在你本地浏览器内读写，**绝不上传任何数据**
- 开启「包含图片」时，会用 `GM_xmlhttpRequest` 从 `cloud.smartisan.com` **下载**(GET)笔记里的图片用于打包——单向下载，同样不上传
- 仅在 `cloud.smartisan.com` / `note.smartisan.com` 两个域名生效
- 持久化仅用 `GM_setValue` / `GM_getValue` 保存设置（文件名、时间戳 / 图片开关等）

## 技术细节

- **数据源**：IndexedDB 中两个 PouchDB 库 `_pouch_folder` 和 `_pouch_note` 的 `by-sequence` object store
- **去重**：`_deleted` 字段过滤已删除条目
- **ZIP 打包**：手写 STORE 模式 ZIP 二进制流（Local File Header / Central Directory / EOCD），CRC-32 计算用 256 项查表，文件名 UTF-8 + flag bit 0x0800
- **下载**：`<a download>` + `URL.createObjectURL`，绕开 FileSaver 在某些 CSP 下的静默失败
- **图片**：`detail` 内联私有标签 `<image … name=Notes_<ts>.jpeg>`，拼成 `notesimage/<name>` 经 `GM_xmlhttpRequest` 下载，再改写为标准 Markdown（ZIP 存 `images/` 相对引用 / 逐个导出内嵌 base64）

## 已知限制

- 图片不存在本地，需联网从锤子云端下载（依赖 `cloud.smartisan.com` 存活，建议尽早导出）
- 不保留便签的富文本样式，输出为纯文本 Markdown
- 笔记数量极多（>1 万条）时，浏览器可能会先卡顿一秒打包

## 致谢

- 原 Chrome 扩展作者 [@reed-soul](https://github.com/reed-soul) 提供了 IndexedDB schema 的逆向与原始实现思路
- 移植 / 重写 / 维护：[@qeeryyu](https://github.com/anyuxurl)

## License

MIT — 见 [LICENSE](./LICENSE)
