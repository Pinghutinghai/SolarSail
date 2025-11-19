# SolarSail 部署指南

## 方式一：Vercel + Vercel Postgres（推荐，最简单）

### 1. 准备数据库

1. 访问 [Vercel](https://vercel.com) 并注册/登录
2. 在 Dashboard 中，点击 **Storage** 标签页
3. 点击 **Create Database**，选择 **Postgres**
4. 创建数据库后，复制 `POSTGRES_URL` 环境变量

### 2. 部署应用

#### 方法 A：通过 GitHub（推荐）

1. 将代码推送到 GitHub 仓库
2. 在 Vercel Dashboard 中点击 **Add New Project**
3. 导入你的 GitHub 仓库
4. 在 **Environment Variables** 中添加：
   - `DATABASE_URL` = 你的 `POSTGRES_URL`
5. 点击 **Deploy**

#### 方法 B：通过 Vercel CLI

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 部署
vercel

# 设置环境变量
vercel env add DATABASE_URL

# 重新部署
vercel --prod
```

### 3. 初始化数据库

部署完成后，在 Vercel Dashboard 中：

1. 进入你的项目
2. 点击 **Settings** → **Functions**
3. 找到 **Build Command**，改为：
   ```bash
   npx prisma generate && npx prisma db push && npm run build
   ```

或者手动执行：

```bash
# 本地连接生产数据库
DATABASE_URL="你的生产数据库URL" npx prisma db push
```

---

## 方式二：Railway（一键部署，有免费额度）

1. 访问 [Railway.app](https://railway.app)
2. 点击 **Start a New Project**
3. 选择 **Deploy from GitHub repo**
4. Railway 会自动检测到 Next.js 和 Prisma
5. 它会自动创建 PostgreSQL 数据库并设置环境变量
6. 自动部署完成！

---

## 方式三：Render（免费但较慢）

1. 访问 [Render.com](https://render.com)
2. 创建 **PostgreSQL** 数据库
3. 创建 **Web Service**，连接你的代码仓库
4. 设置环境变量 `DATABASE_URL`
5. 部署

---

## 部署后配置

### 环境变量检查清单

确保设置了以下环境变量：

- `DATABASE_URL` - 数据库连接字符串

### 数据库迁移

如果你修改了 `schema.prisma`，需要运行迁移：

```bash
# 开发环境
npx prisma migrate dev

# 生产环境（部署时自动运行）
npx prisma migrate deploy
```

或使用 `db push`（适合快速原型）：

```bash
npx prisma db push
```

---

## 故障排查

### 1. "Cannot find module '@prisma/client'"

**解决方案**：在 `package.json` 中添加 postinstall 脚本：

```json
{
  "scripts": {
    "postinstall": "prisma generate"
  }
}
```

### 2. 数据库连接失败

- 检查 `DATABASE_URL` 是否正确
- 确保数据库允许外部连接
- 检查 SSL 配置（有些数据库需要 `?sslmode=require`）

### 3. 构建超时

- 增加构建内存限制
- 或使用 `prisma generate` 在本地生成，然后提交 `node_modules/.prisma`

---

## 推荐配置

### Vercel 配置文件 (`vercel.json`)

```json
{
  "buildCommand": "prisma generate && prisma db push && next build",
  "installCommand": "npm install"
}
```

### Railway 配置文件 (`railway.json`)

```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

---

## 性能优化建议

1. **启用 Edge Functions**（Vercel）以降低延迟
2. **添加 CDN 缓存**给静态资源
3. **使用连接池**（Prisma 默认启用）
4. **添加数据库索引**：

```prisma
model Capsule {
  // ...
  @@index([solarZoneIndex, expiresAt])
  @@index([opUserId])
}
```

---

## 下一步

部署成功后，你可以：

1. 绑定自定义域名
2. 配置 HTTPS（自动）
3. 设置 Analytics
4. 添加错误监控（如 Sentry）

祝你部署顺利！🚀
