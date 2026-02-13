import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export", // 纯静态导出，兼容 EdgeOne Pages
  images: { unoptimized: true }, // 无服务端图片优化
  trailingSlash: true, // 兼容静态文件服务
};

export default nextConfig;
