const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 只用 API Routes，不需要 React 页面
  turbopack: {
    root: path.join(__dirname),
  },
};

module.exports = nextConfig;
