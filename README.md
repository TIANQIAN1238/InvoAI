# 发票管理系统 (InvoAI)

课程作业版发票管理系统，覆盖以下核心能力：
- 发票上传（图片/PDF）
- OCR 识别并存储要素
- 发票查询（日期范围 + 文字模糊）
- 统计（张数 + 金额总数）
- 单击发票展示原图/PDF

## 技术栈

- 客户端：Vite + React + TypeScript + Tailwind
- 桌面端：Tauri (可选)
- 服务端：Next.js Route Handlers
- 数据库：MySQL 5.6+

## 目录说明

- `src/`：前端客户端
- `server/`：后端 API 与数据库访问
- `src-tauri/`：Tauri 本地文件能力
- `scripts/qa-check.mjs`：自动化验收脚本（支持长期循环）
- `reports/`：验收 CSV 报告输出目录

## 环境变量

### 前端 `.env`

```env
VITE_API_BASE=http://localhost:3000
```

### 后端 `server/.env.local`

```env
DATABASE_URL=mysql://root:root@localhost:4000/invoice_db
JWT_SECRET=your-jwt-secret
AI_API_KEY=your-ai-key
AI_API_BASE=https://api.openai-next.com
```

## 启动方式

### 1) 启动后端

```bash
cd server
npm install
npm run dev
```

### 2) 初始化数据库（首次）

```bash
curl -X POST http://localhost:3000/api/init
```

### 3) 启动前端

```bash
cd ..
npm install
npm run dev
```

## 功能覆盖

- 上传：支持 JPG/JPEG/PNG/BMP/WEBP/PDF
- 识别：OCR 结果标准化后入库（日期/金额格式清洗）
- 存储：
  - Tauri 模式：保存本地路径并可预览
  - Web 模式：文件二进制落库（`invoice_files`），可按发票 ID 取回预览
- 查询：
  - 日期区间
  - 文字模糊（发票号/代码/买卖方/类型/备注/文件名）
- 统计：按当前筛选条件显示张数和金额总数
- 交互：
  - 上传进度提示
  - 删除确认
  - 日期筛选校验
  - 聊天附件链路打通（附件会入库并触发 OCR）

## 验收与质量检查

### 一次性验收

```bash
npm run qa
```

执行项：
- `npm run lint`
- `npm run build`（前端）
- `npm run build`（server）

结果会追加写入：`reports/qa-runs.csv`

### 长时间跑验收（Soak）

```bash
npm run qa:soak
```

默认执行 12 轮，每轮间隔 300 秒（5 分钟）。
也可自定义：

```bash
node scripts/qa-check.mjs --repeat=24 --interval=120 --report=reports/qa-nightly.csv
```

## 作业要求对照

- 详细对照清单见：`reports/acceptance-checklist.csv`
