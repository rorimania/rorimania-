# Node.js 与 Express 服务器

Node.js 是一个基于 Chrome V8 引擎的 JavaScript 运行环境。Express 是最流行的 Node.js Web 框架。

## Node.js 特点

- 事件驱动、非阻塞 I/O
- 高性能网络应用
- 丰富的包生态系统 (npm)

## Express 服务器示例

```javascript
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

## 常用中间件

- body-parser: 解析请求体
- cors: 跨域资源共享
- morgan: 日志记录

探索 Node.js 的强大功能吧！

