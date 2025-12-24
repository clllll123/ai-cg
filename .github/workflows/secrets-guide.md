# GitHub Secrets 配置指南

## 必需的环境变量

在GitHub仓库的 Settings → Secrets and variables → Actions 中添加以下secrets：

### 服务器连接配置
```
SSH_PRIVATE_KEY: [您的SSH私钥]
SERVER_HOST: [服务器IP地址，如：47.98.44.27]
```

### 生产环境配置
```
DATABASE_URL: [生产环境数据库连接字符串]
JWT_SECRET: [JWT加密密钥]
GEMINI_API_KEY: [Gemini API密钥]
```

### 可选配置
```
SLACK_WEBHOOK_URL: [Slack通知Webhook]
DISCORD_WEBHOOK_URL: [Discord通知Webhook]
EMAIL_NOTIFICATION: [邮件通知配置]
```

## 安全最佳实践

1. **定期轮换密钥**：每3-6个月更新一次敏感密钥
2. **最小权限原则**：SSH密钥仅授予必要权限
3. **环境分离**：开发、测试、生产环境使用不同密钥
4. **访问日志**：监控密钥使用情况

## 密钥生成指南

### SSH密钥生成
```bash
ssh-keygen -t rsa -b 4096 -C "github-actions@ai-stock-trader" -f github-actions-key
```

### JWT密钥生成
```bash
openssl rand -base64 32
```

## 验证配置

部署前验证所有secrets是否正确设置：
- SSH连接测试
- 数据库连接测试
- API密钥验证