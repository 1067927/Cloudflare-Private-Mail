/**
 * Cloudflare Private Temp Mail (V2.1 - 修复死循环版)
 * 修复：拦截 favicon.ico 请求，防止浏览器无限跳转导致 KV 用量激增
 */

export default {
  // 1. 邮件接收与存储系统
  async email(message, env, ctx) {
    const id = Date.now().toString();
    const raw = await new Response(message.raw).text();

    const Decoder = {
      b64(str) { 
        try { return decodeURIComponent(escape(atob(str.replace(/\s/g, '')))); } 
        catch { try { return atob(str.replace(/\s/g, '')); } catch { return str; } }
      },
      qp(str) { 
        return str.replace(/=([0-9A-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16))).replace(/=\r?\n/g, ''); 
      }
    };

    function parseMime(rawText) {
      const boundaryMatch = rawText.match(/boundary="?([^"\s;]+)"?/i);
      if (!boundaryMatch) return { html: rawText.split(/\r?\n\r?\n/)[1] || "" };
      const boundary = boundaryMatch[1];
      const parts = rawText.split("--" + boundary);
      let bestHtml = "";
      for (const part of parts) {
        if (part.includes("Content-Type: text/html")) {
          const encoding = (part.match(/Content-Transfer-Encoding:\s*([^\s;]+)/i) || [])[1];
          const headerEnd = part.search(/\r?\n\r?\n/);
          if (headerEnd !== -1) {
            let body = part.slice(headerEnd).trim();
            if (encoding?.toLowerCase() === 'base64') body = Decoder.b64(body);
            else if (encoding?.toLowerCase() === 'quoted-printable') body = Decoder.qp(body);
            bestHtml = body; break;
          }
        }
      }
      return { html: bestHtml };
    }

    const parsed = parseMime(raw);
    const emailData = {
      id,
      from: message.from,
      subject: message.headers.get("subject") || "(无主题)",
      date: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
      body: parsed.html || "内容解析失败"
    };

    // 存入 KV，设置 24 小时过期
    await env.KV.put(`msg:${id}`, JSON.stringify(emailData), { expirationTtl: 86400 });
  },

  // 2. 网页渲染系统
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 🛑【关键修复】拦截浏览器图标请求，切断死循环 🛑
    if (url.pathname === '/favicon.ico' || url.pathname === '/robots.txt') {
      return new Response(null, { status: 404 });
    }

    // 一键物理删除
    if (url.searchParams.has("clear")) {
      const list = await env.KV.list({ prefix: "msg:" });
      for (const key of list.keys) { await env.KV.delete(key.name); }
      return new Response("", { status: 302, headers: { "Location": "/" } });
    }

    // 随机地址生成逻辑
    let addr = url.searchParams.get("addr");
    if (!addr || url.searchParams.has("new")) {
      const randomPrefix = Math.random().toString(36).substring(2, 10);
      const newUrl = new URL(request.url);
      
      // 🔴 请确保这里是你自己的域名 (如果还没设环境变量，请直接改这个字符串)
      const myDomain = env.DOMAIN || 'yourdomain.com'; 
      
      newUrl.searchParams.set("addr", `${randomPrefix}@${myDomain}`);
      newUrl.searchParams.delete("new");
      return new Response("", { status: 302, headers: { "Location": newUrl.toString() } });
    }

    // 获取最近 10 封邮件
    const list = await env.KV.list({ prefix: "msg:", limit: 10 });
    const messages = [];
    const results = await Promise.all(list.keys.map(k => env.KV.get(k.name)));
    messages.push(...results.map(v => JSON.parse(v)).filter(m => m));
    messages.sort((a, b) => b.id - a.id);

    return new Response(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Private Temp Mail</title>
      <style>
        body { font-family: -apple-system, sans-serif; background: #f0f2f5; margin: 0; padding: 10px; }
        .box { max-width: 800px; margin: 0 auto; }
        .nav { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); text-align: center; margin-bottom: 15px; }
        .addr { font-size: 1.5em; font-weight: 800; color: #1a73e8; margin: 10px 0; word-break: break-all; }
        .btn { padding: 10px 18px; border-radius: 20px; border: none; cursor: pointer; font-weight: bold; text-decoration: none; display: inline-block; font-size: 13px; margin: 5px; }
        .blue { background: #1a73e8; color: white; }
        .green { background: #34a853; color: white; }
        .red { background: white; color: #d93025; border: 1px solid #d93025; }
        .card { background: white; border-radius: 12px; margin-bottom: 20px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .mail-frame { width: 100%; border: none; min-height: 450px; display: block; }
      </style>
    </head>
    <body>
      <div class="box">
        <div class="nav">
          <div style="color: #5f6368; font-size: 0.9em;">你的临时邮箱地址</div>
          <div id="addr" class="addr">${addr}</div>
          <div>
            <button class="btn blue" onclick="copy()">复制地址</button>
            <button class="btn green" onclick="location.reload()">手动刷新收件箱</button>
            <a href="/?new=1" class="btn" style="background:#fbbc05; color:white;">更换新地址</a>
            <a href="/?clear" class="btn red" onclick="return confirm('确定永久物理删除所有邮件？')">彻底清空</a>
          </div>
        </div>
        ${messages.length === 0 ? '<div style="padding:60px; text-align:center; color:#9aa0a6;">暂无邮件，请点击刷新按钮查看新邮件</div>' : ''}
        ${messages.map(m => `
          <div class="card">
            <div style="padding:15px; background:#f8f9fa; border-bottom:1px solid #eee;">
              <div style="font-weight:bold;">${m.subject}</div>
              <div style="font-size:0.85em; color:#5f6368; margin-top:5px;">来自: ${m.from} | ${m.date}</div>
            </div>
            <iframe class="mail-frame" srcdoc="${m.body.replace(/"/g, '&quot;')}" onload="this.style.height=this.contentWindow.document.documentElement.scrollHeight + 50 + 'px'"></iframe>
          </div>
        `).join('')}
      </div>
      <script>
        function copy() {
          const t = document.createElement('textarea'); t.value = document.getElementById('addr').innerText;
          document.body.appendChild(t); t.select(); document.execCommand('copy'); document.body.removeChild(t);
          alert('地址已复制');
        }
      </script>
    </body>
    </html>`, { headers: { "Content-Type": "text/html;charset=UTF-8" } });
  }
};
