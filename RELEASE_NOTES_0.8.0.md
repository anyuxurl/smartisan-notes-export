## 🎉 v0.8.0

锤子便签导出助手 —— Tampermonkey / Violentmonkey 油猴脚本，把锤子便签云端的便签一键导出为 Markdown，保留分类结构。零依赖、跨浏览器、全程本地处理不上传。

### ✨ 本次更新
- 新增 `yun.smartisan.com` 域名支持 —— `cloud` / `note` / `yun` 三个入口现在都能用

### 📦 主要功能
- **全部导出**：所有便签按分类打包成 ZIP（UTF-8 文件名，Windows/macOS/Linux 解压中文正常）
- **自定义导出**：勾选面板按分类挑选，支持搜索 / 文件夹整选 / 全选，可在「按分类 / 按时间」排序间切换，再选打包 ZIP 或逐个下载 .md
- **导出笔记内图片**：ZIP 存入 `images/` 用相对路径引用，逐个导出内嵌 base64（可开关）
- 可选元数据（修改 / 创建时间）、自定义 ZIP 文件名、同名便签自动加后缀
- 零依赖自实现 ZIP 打包，右下角浮动按钮（FAB），Tampermonkey 自动检查更新

### 🚀 安装
1. 装 [Tampermonkey](https://www.tampermonkey.net/) 或 [Violentmonkey](https://violentmonkey.github.io/)
2. 一键安装：**[smartisan-notes-saver.user.js](https://raw.githubusercontent.com/anyuxurl/smartisan-notes-export/main/smartisan-notes-saver.user.js)**
3. 登录 cloud / yun.smartisan.com，等便签同步完，点右下角浮动按钮导出

### 🔒 隐私
笔记内容只在本地浏览器读写，**绝不上传**；仅在「包含图片」开启时从 `cloud.smartisan.com` **单向下载**图片用于打包。

### 🙏 致谢
基于 [@reed-soul](https://github.com/reed-soul) 的 smartisan-notes-saver 移植重写。MIT License。
