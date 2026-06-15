# HOWE Alpha Research Node

纯静态首版研究档案站，已收录 Notion 中 113 篇「Alpha 新币分析系列」记录。

## 本地预览

在项目目录运行：

```bash
python3 -m http.server 8787
```

然后访问 `http://127.0.0.1:8787/`。

## Vercel 部署

该目录是一个零构建静态网站，可直接作为 Vercel 项目根目录部署：

- Framework Preset：Other
- Build Command：留空
- Output Directory：留空
- Install Command：留空

## 新增记录

1. 打开 `data/research.js`。
2. 在 `RAW_RESEARCH` 最后新增：

```js
[2026, "6.15 $TOKEN", "NOTION_PAGE_ID"],
```

3. 如已确认所属链，在 `CHAIN_OVERRIDES` 中补充：

```js
TOKEN: ["BSC", "Base"],
```

4. 在 `FEATURED_NOTES` 中录入摘要；在 `PAGE_CONTENT_OVERRIDES` 中按 Notion 页面 ID 录入完整正文。正文使用段落数组，`"---"` 会显示为分隔线：

```js
"NOTION_PAGE_ID": [
  "$TOKEN @project",
  "CA(BSC)：0x...",
  "研究正文第一段",
  "---",
  "依旧 DYOR 哈",
  "#Alpha新币分析 #TOKEN",
],
```

5. 提交到 GitHub。Commit 历史即网站的操作历史。

## Notion 图片

Notion 图片链接通常带有临时签名，不能长期作为网站图片源。

手动下载后，请放入 `assets/research-images/`，建议命名：

```text
YYYY-MM-DD-token-01.webp
```

## 安全说明

纯静态网页无法安全实现“只有站长可新增”。正式部署时建议：

- GitHub OAuth 登录
- 仅允许指定 GitHub 用户 ID
- 由服务端调用 GitHub API 创建 Commit
- Vercel / Cloudflare Pages 自动部署
