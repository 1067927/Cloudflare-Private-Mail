# 🚀 Cloudflare Worker 私人临时邮箱 (专业修复版)

这是一个运行在 Cloudflare Worker 上的极简临时邮箱系统。
它解决了市面上开源代码的几个痛点：**乱码问题**、**Cloudflare 额度消耗问题**以及**自定义域名设置难**的问题。

## ✨ 核心特性

1.  **💰 极致省钱逻辑**：移除了后台自动刷新，改为**手动刷新按钮**。即使你开着网页去睡觉，也不会消耗 Cloudflare 的 KV 免费读写额度。
2.  **🖼️ 原版 HTML 还原**：内置深度 MIME 解析，能完美显示带图片、按钮、颜色的注册邮件，不再是乱码。
3.  **🗑️ 物理彻底删除**：一键“彻底清空”，直接从数据库物理抹除数据，释放空间。
4.  **🛡️ 隐私安全**：想要更隐蔽的邮箱入口？支持自定义神秘域名。

---

## 🛠️ 部署教程 (手把手)

### 1. 准备工作
- 你需要一个托管在 Cloudflare 的域名。
- 在 Cloudflare 面板 -> **Email** 处开启 **Email Routing (路由)** 功能。

### 2. 创建数据库 (KV)
- 进入 Cloudflare -> **Workers & Pages** -> **KV**。
- 点击 **Create Namespace**，随便起个名，比如 `TEMP_MAIL`。

### 3. 部署代码
- 创建一个新的 Worker。
- 复制本项目 `index.js` 的所有代码进去。
- **🔴 重要修改**：代码第 71 行左右，将 `'yourdomain.com'` 改成你自己的真实域名。
- 点击 **Deploy**。

### 4. 绑定 KV 数据库
- 进入 Worker 的 **Settings** -> **Variables**。
- 在 **KV Namespace Bindings** 处：
  - Variable name 填：`KV`
  - KV Namespace 选：你刚才创建的 `TEMP_MAIL`
- **保存后，记得重新 Deploy 一次 Worker 才能生效！**

### 5. 📧 设置邮件路由 (Catch-all)
- 进入域名的 **Email** -> **Email Routing** -> **Routing rules**。
- 开启 **Catch-all address** (接管所有邮件)。
- Action 选择 **Send to a Worker**。
- Destination 选择你刚才创建的 Worker 名字。
- *这一步不做，你是收不到信的！*

---

## ⚠️ 常见“坑”与解决方案

### 1. 我想用自定义域名 (如 `vip.example.com`)，但找不到设置？
Cloudflare 改版后入口变了：
- 进入 Worker -> **Settings**。
- 这里的菜单如果不显示 **Triggers**，请直接点击页面顶部的 **Triggers** 标签页。
- 找到 **Custom Domains** (自定义域) -> Add Custom Domain。
- 这里填入你想访问的网址，会自动配置 SSL 证书。

### 2. 挂着 VPN 访问显示 "Relay failed"？
这是因为代理软件拦截了你的新域名。
- **解决方法**：在 SwitchyOmega 等插件中，将你的域名设为 **Direct (直连)**。

### 3. 生成的地址不是我的域名？
- 请检查代码里 `fetch` 函数中 `const myDomain` 那一行。
- 务必确保你已经在代码中填入了真实域名，或者在 Cloudflare 的 Variables 设置里添加了 `DOMAIN` 环境变量。

---

## 📜 开源协议
MIT License. 随意使用，欢迎 Star！
