# 媒体上传功能 - 配置指南

媒体上传功能已经完成开发！但需要一些配置才能正常工作。

## 使用的技术

**Vercel Blob Storage** - 用于存储图片和音频文件

- 免费额度：100GB/月
- 自动CDN加速
- 适合小型到中型应用

---

## 配置步骤

### 方案 A：使用 Vercel Blob（推荐）

如果你打算部署到 Vercel：

1. **创建 Vercel 项目**（如果还没有）
   ```bash
   vercel link
   ```

2. **启用 Blob 存储**
   - 访问 [Vercel Dashboard](https://vercel.com/dashboard)
   - 进入你的项目
   - 点击 **Storage** 标签页
   - 点击 **Create Database** → 选择 **Blob**

3. **无需额外配置！**
   - Vercel 会自动注入环境变量
   - 上传功能将自动工作

### 方案 B：本地开发测试

本地开发时，Vercel Blob 不会工作。你有两个选择：

#### 选项 1：模拟存储（快速测试）

临时修改 `/app/api/upload/route.ts`：

```typescript
// 简单返回一个假的URL用于测试
return NextResponse.json({ 
    url: 'https://placehold.co/600x400/png',  // 占位图
    type: isImage ? 'image' : 'audio'
});
```

#### 选项 2：使用 Vercel CLI 本地测试

```bash
npm i -g vercel
vercel link
vercel env pull .env.local
npm run dev
```

这会下载生产环境的凭据到本地。

---

## 功能说明

用户在创建漂流瓶时可以：

📷 **上传图片**
- 支持格式：JPG, PNG, GIF, WebP
- 最大大小：2MB
- 自动显示在漂流瓶中

🎵 **上传音频**
- 支持格式：MP3, WAV, OGG
- 最大大小：5MB
- 内置音频播放器

---

## 注意事项

⚠️ **重要**：
- 文件上传到 Vercel Blob 后是**公开可访问**的
- 建议添加内容审核机制防止滥用
- 免费额度：100GB存储 + 100GB流量/月

---

## 故障排查

### 上传失败："Upload failed"

**可能原因**：
1. 未配置 Vercel Blob
2. 文件过大
3. 文件类型不支持

**解决方法**：
- 检查浏览器控制台错误信息
- 确认 Vercel Blob 已启用
- 尝试更小的文件

### 图片/音频无法显示

**可能原因**：
- URL 已过期或无效
- CORS 问题

**解决方法**：
- 检查数据库中的 `imageUrl` / `audioUrl` 是否有效
- 在浏览器中直接访问 URL 测试

---

## 下一步

媒体上传功能已准备就绪！测试步骤：

1. 启动开发服务器：`npm run dev`
2. 创建一个新漂流瓶
3. 点击"📷 Add Image"或"🎵 Add Audio"
4. 选择文件并发布
5. 等待上传完成
6. 点击漂流瓶查看内容

享受你的多媒体漂流瓶功能！🎉
