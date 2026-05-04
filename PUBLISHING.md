# Greasy Fork 发布指南

> Greasy Fork 必须由作者本人在网页端登录提交，无法用 API 自动化。下面是完整步骤 + 已经准备好可以直接复制粘贴的描述文案。

## 1. 注册 / 登录

打开 <https://greasyfork.org/zh-CN>，右上角点击"登录"。可以用：

- GitHub 账号（推荐，方便绑定本仓库后续的源码同步）
- Google
- 自建账号（邮箱 + 密码）

建议直接用你的 GitHub 账号 `anyuxurl` 登录。

## 2. 提交新脚本

登录后，右上角头像下拉 → **"发布脚本"** （或直接打开 <https://greasyfork.org/zh-CN/script_versions/new>）。

进入提交页面后填写：

### 脚本代码

把仓库里 `smartisan-notes-saver.user.js` 的**全部内容**复制粘贴进代码框。Greasy Fork 会自动从 `==UserScript==` 元数据块解析名称、版本、描述、作者、license 等字段，无需额外填写。

如果它要你确认默认 namespace，使用元数据里已配置的：
```
https://github.com/anyuxurl/smartisan-notes-export
```

### 附加信息（"Additional info"）

直接复制下方文案到 Markdown 输入框：

```markdown
## 锤子便签导出助手 (Userscript)

一键把 [锤子便签云端](https://cloud.smartisan.com) 里的全部便签批量导出为 Markdown 文件，保留分类结构，零依赖、跨浏览器通用。

油猴版移植自 [reed-soul/smartisan-notes-saver](https://github.com/reed-soul/smartisan-notes-saver) Chrome 扩展。

### 特性

- ✅ 直接读取浏览器本地 IndexedDB，**不上传任何数据**
- ✅ 三种导出模式：ZIP / 单个 Markdown / 多个独立 .md
- ✅ 浮动操作按钮 (FAB)，不占用顶部工具栏
- ✅ 可选元数据（修改时间 / 创建时间），可自定义文件名
- ✅ UTF-8 ZIP 文件名，Windows / macOS / Linux 解压均正确显示中文
- ✅ 同名便签自动加后缀避免覆盖
- ✅ 完全零外部依赖（手写 STORE 模式 ZIP 打包器）

### 使用

1. 安装脚本后访问 [cloud.smartisan.com](https://cloud.smartisan.com) 登录账号
2. 等便签同步完成
3. 页面右下角圆形浮动按钮 → 选择导出模式 → 自动下载

### 快捷键

- 左键 FAB：弹出菜单
- 右键 FAB：直接 ZIP 导出
- Shift + 左键：直接 ZIP 导出

### 隐私声明

所有数据读写都在你本地浏览器内完成，**不发起任何网络请求**，不上传不分享。脚本仅在 `cloud.smartisan.com` / `note.smartisan.com` 两个域名下生效。

### 反馈

源码与 issue：<https://github.com/anyuxurl/smartisan-notes-export>
```

### License

下拉选 **MIT License**（与脚本元数据 `@license MIT` 保持一致）。

### 应用范围（Applies to）

无需手填，Greasy Fork 会从 `@match` 自动识别为 `cloud.smartisan.com` / `note.smartisan.com`。

### 分类

选 **工具** 或 **其他**，再加几个标签便于检索：

```
锤子便签   smartisan   导出   markdown   笔记   备份
```

## 3.（可选）启用从 GitHub 自动同步

提交成功后进入脚本管理页：**Admin → Sync from external source**，填：

| 字段        | 值                                                                              |
| ----------- | ------------------------------------------------------------------------------- |
| Sync type   | `Public source`                                                                 |
| URL         | `https://raw.githubusercontent.com/anyuxurl/smartisan-notes-export/main/smartisan-notes-saver.user.js` |
| Sync interval | `daily`                                                                       |

启用后每次你 push 新版本到 GitHub，Greasy Fork 会自动拉取并发布新版本，不用手动改两次。

## 4. 验证

发布完成后，在隐身窗口（确认 Greasy Fork 没缓存到你的登录态）打开你的脚本页，点 **"安装此脚本"** → 跳转到 Tampermonkey 安装确认页 → 安装 → 访问 cloud.smartisan.com 确认 FAB 出现。

## 备选：OpenUserJS

如果你也想多铺一个渠道，<https://openuserjs.org/> 流程类似（同样要在网页端手动提交）：

1. 用 GitHub 登录
2. 主页 → "Upload New Script" → 粘贴源码
3. 自动从 `==UserScript==` 解析元数据
4. License 选 MIT

---

## 推广小贴士

- 在原仓库 [reed-soul/smartisan-notes-saver](https://github.com/reed-soul/smartisan-notes-saver) 提一条 Issue 或 PR，告知"这里有个油猴移植版可供 Firefox 用户使用"，往往能从原项目导一波流量
- 在 V2EX / 少数派 / 知乎写一篇短帖介绍，关键词 "锤子便签 导出 Firefox"
- 把脚本主页 README 里的截图换成实拍 GIF（FAB 弹出 → 选择模式 → 下载完成）效果最好
