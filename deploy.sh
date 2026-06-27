#!/usr/bin/env bash
# 部署前端到 Netlify（指定后端 API 地址）
# 用法: bash deploy.sh https://hotel-api.up.railway.app
#
# 参数：后端 API 完整地址（含 /api），如 https://xxx.up.railway.app/api

set -e

API_URL="${1:-}"
if [ -z "$API_URL" ]; then
  echo "❌ 请提供后端 API 地址"
  echo "用法: bash deploy.sh https://xxx.up.railway.app/api"
  exit 1
fi

echo "🔧 构建前端 (VITE_API_BASE=$API_URL)"
VITE_API_BASE="$API_URL" VITE_MEDIA_BASE="${API_URL%/api}" npm run build

echo "✅ 构建完成: dist/"
echo ""
echo "📤 部署到 Netlify:"
echo "  方法1: npx netlify deploy --prod --dir=dist"
echo "  方法2: 将 dist/ 目录拖拽到 https://app.netlify.com"
echo "  方法3: 推送 Git，Netlify 自动构建（需要设置 VITE_API_BASE 环境变量）"
