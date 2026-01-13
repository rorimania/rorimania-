# 简易静态博客框架

这是一个轻量的静态博客前端框架示例，包含：

- `index.html`：主页面布局
- `styles.css`：样式
- `script.js`：渲染与交互（内置示例文章）
- `posts/`：示例 Markdown 文件

本地预览建议使用本地静态服务器（避免直接在 file:// 下的跨域或模块限制）：

```bash
# 若安装了 Python 3
python -m http.server 8000

# 打开浏览器访问
# http://localhost:8000/
```

后续建议：将 `script.js` 扩展为从 `posts/` 目录动态加载 Markdown，或集成静态站点生成器（如 Eleventy、Hugo）。
