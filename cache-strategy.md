# AI Stock Trader 缓存策略

## 1. 静态资源缓存策略

### 文件类型缓存配置
```nginx
# JavaScript/CSS文件 - 长期缓存
location ~* \.(js|css)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    add_header Vary Accept-Encoding;
}

# 图片资源 - 长期缓存
location ~* \.(png|jpg|jpeg|gif|ico|svg|webp)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# 字体文件 - 长期缓存
location ~* \.(woff|woff2|ttf|eot)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# HTML文件 - 短期缓存
location ~* \.html$ {
    expires 1h;
    add_header Cache-Control "public, must-revalidate";
}
```

## 2. Service Worker 缓存策略（PWA）

创建Service Worker实现离线缓存：<｜tool▁calls▁begin｜><｜tool▁call▁begin｜>Write<｜tool▁sep｜>{"file_path":"/Users/chenlei/Desktop/ai-股市操盘手 (2)/public/sw.js","content":