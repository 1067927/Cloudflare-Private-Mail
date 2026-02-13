# 🚀 Cloudflare 私人专属临时邮箱 (保姆级教程版)

这是一个运行在 Cloudflare Worker 上的极简临时邮箱系统。无需购买服务器，永久免费！
它解决了市面上同类项目的痛点：**完美告别乱码**、**手动刷新零消耗**、**支持一键物理删除**。

无论你是技术大牛还是纯小白，只要跟着这篇“保姆级”教程，10 分钟就能拥有属于你自己的私人收信神器。

---

## ✨ 核心特性

1. **💰 极致省钱逻辑**：摒弃后台自动刷新，改为**手动刷新按钮**。即使页面挂机一整晚，也不会消耗 Cloudflare 的免费额度。
2. **🖼️ 原版排版还原**：内置深度 MIME 解析引擎，完美显示带图片、按钮、CSS 颜色的注册确认邮件。
3. **🗑️ 物理彻底删除**：一键“彻底清空”，直接从数据库底层物理抹除数据，保障隐私并释放空间。
4. **🛡️ 隐私与安全**：支持自定义隐蔽的网页入口（如 `vip.yourdomain.com`），不暴露真实接收地址。

---

## 🛠️ 从零开始的部署教程 (Step by Step)

### 🔴 第一阶段：把你的域名交给 Cloudflare 接管
*如果你还没有域名，请先去阿里云、腾讯云或 Namesilo 等平台花几块钱买一个便宜的后缀。*

1. **注册账号**：前往 [Cloudflare 官网](https://dash.cloudflare.com/sign-up) 注册一个免费账号。
2. **添加站点**：点击主页的 **“Add a site”** (添加站点)，输入你买的域名（例如 `yourdomain.com`），选择 **Free (免费版)** 计划。
3. **关键操作：修改 DNS 服务器**：
   - Cloudflare 会给你分配两个 DNS 服务器地址（类似 `xxx.ns.cloudflare.com`）。
   - 登录你**买域名的云服务商后台**（如阿里云控制台）。
   - 找到你的域名，选择“修改 DNS 服务器”或“自定义 DNS”。
   - 将里面默认的地址替换成 Cloudflare 给你的那两个地址。
   - *等待几分钟到几小时不等，直到 Cloudflare 后台显示你的域名已激活 (Active)。*

### 🟡 第二阶段：创建数据仓库 (KV)
我们需要一个地方来临时存放你的邮件。

1. 在 Cloudflare 面板左侧菜单，找到 **Workers & Pages** -> **KV**。
2. 点击右上角的 **Create Namespace** (创建命名空间)。
3. **Namespace Name** 随便填一个（比如 `TEMP_MAIL`），点击 **Add**。

### 🟢 第三阶段：部署 Worker 核心代码
1. 在左侧菜单点击 **Workers & Pages** -> **Overview**。
2. 点击右侧的 **Create Application** -> **Create Worker**。
3. 名字随便起（如 `temp-mail-worker`），点击 **Deploy** (先部署一个空壳)。
4. 点击 **Edit code** (编辑代码)。
5. 清空左侧的大黑框，将本项目中的 `index.js` 代码**全部复制粘贴**进去。
6. **⚠️ 必须修改的配置**：
   - 找到代码第 **72 行** 左右的这一句：`const myDomain = env.DOMAIN || 'yourdomain.com';`
   - 将里面的 `'yourdomain.com'` 替换成你自己的真实域名！
7. 点击右上角的蓝色按钮 **Deploy** 保存。

### 🔵 第四阶段：绑定数据库 (关键！不绑会报错)
1. 退出代码编辑器，回到这个 Worker 的详情页面。
2. 点击顶部的 **Settings** (设置) 选项卡。
3. 左侧找到 **Variables** (变量和机密)。
4. 向下滚动找到 **KV Namespace Bindings**，点击 **Add binding**：
   - **Variable name** 填入：`KV` (必须是大写，与代码对应)。
   - **KV namespace** 选择：你在第二阶段创建的那个 `TEMP_MAIL` 数据库。
5. 点击 **Save and deploy**。

### 🟣 第五阶段：接管并转发邮件
1. 在 Cloudflare 面板左侧，点击返回你的**域名主页**。
2. 在左侧菜单找到 **Email** -> **Email Routing** (电子邮件路由)。
3. 如果是第一次用，按提示点击配置，Cloudflare 会自动帮你添加所需的 DNS 记录（一路点确认即可）。
4. 点击 **Routing rules** (路由规则) 标签页。
5. 向下滚动找到 **Catch-all address** (捕获所有地址)：
   - 点击 **Edit** (编辑) 或开启它。
   - **Action** 选择：**Send to a Worker** (发送到 Worker)。
   - **Destination** 选择：你在第三阶段创建的 Worker (如 `temp-mail-worker`)。
   - 点击 **Save**。

🎉 **大功告成！现在你可以访问你的 Worker 域名来接收邮件了！**

---

## 避坑指南 (FAQ & 高级技巧)

### 1. 怎么给网页换一个更隐蔽的访问地址？
Cloudflare 默认分配的 `*.workers.dev` 域名在国内可能访问不稳定，且不够个性。
- 进入你的 Worker 详情页 -> **Settings**。
- 找到 **Triggers** (触发器) 标签（或者 **Domains & Routes**）。
- 找到 **Custom Domains** (自定义域) -> 点击 **Add Custom Domain**。
- 输入你想要的前缀，比如 `secretbox.yourdomain.com`，点击添加。
- 以后你就可以直接用这个隐蔽的网址打开邮箱网页了！

### 2. 挂着代理/VPN 访问网页时报错 "Relay failed"？
这是因为某些代理软件（如 Geph 迷雾通）无法正确处理 Cloudflare 的 Worker 节点。
- **解决方案**：在浏览器代理插件（如 SwitchyOmega）中，将你的网页域名（如 `secretbox.yourdomain.com`）设置为 **Direct (直接连接)**，不要走代理即可。

### 3. 如何避免 Cloudflare 免费额度被耗尽？
本项目的最新代码已将“自动轮询刷新”改为“手动按钮刷新”。只要你不大规模外泄你的网页入口，每天 10 万次的 KV 免费读取额度对于个人使用来说是**绝对用不完**的。

---

## 📜 许可证
本项目采用 [MIT License](LICENSE) 协议开源。欢迎 Fork 并在保留原作者声明的情况下自由修改使用！
