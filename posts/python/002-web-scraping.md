# Web 爬虫开发指南

网络爬虫是自动化数据采集的有效工具。

## 常用库

- **Requests**: HTTP 请求库
- **BeautifulSoup**: HTML 解析
- **Scrapy**: 完整的爬虫框架
- **Selenium**: 浏览器自动化

## 简单爬虫示例

```python
import requests
from bs4 import BeautifulSoup

response = requests.get('https://example.com')
soup = BeautifulSoup(response.content, 'html.parser')
titles = soup.find_all('h1')
```

## 注意事项

- 尊重 robots.txt
- 添加适当的延迟
- 使用合理的 User-Agent
- 遵守法律和网站条款

爬虫是数据获取的重要手段，但要负责任地使用。

