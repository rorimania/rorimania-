# 前端性能优化入门

性能对用户体验非常重要。本文介绍一些常见且高效的优化方法：

1. 减少 HTTP 请求
2. 使用资源压缩（Gzip/ Brotli）
3. 图片按需加载与 WebP
4. 使用浏览器缓存与 CDN

代码示例：懒加载图片（示意）

```html
<img loading="lazy" src="/images/photo.jpg" alt="示例">
```

更多实践可以结合 Lighthouse 审核结果进行针对性优化。
