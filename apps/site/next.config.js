const path = require('path')
const fs = require('fs')

const withPWA = require('next-pwa')({
  dest: 'public',
  customWorkerDir: 'worker',
  buildExcludes: [/app-build-manifest\.json$/],
  // Disable PWA in development to avoid GenerateSW warning
  disable: process.env.NODE_ENV === 'development',
  // Suppress the GenerateSW warning
  sw: 'sw.js',
  scope: '/',
})
/** @type {import('next').NextConfig} */

const STATIC_EXPORT = process.env.STATIC_EXPORT === 'true'

// Monorepo: app (apps/site) vs repo root. Resolution must find deps in app node_modules (local)
// or root node_modules (Docker: bun install at root). Same logic for webpack and Turbopack.
const APP_DIR = path.resolve(__dirname)
const ROOT_DIR = path.resolve(__dirname, '../..')
const APP_NODE_MODULES = path.join(APP_DIR, 'node_modules')
const ROOT_NODE_MODULES = path.join(ROOT_DIR, 'node_modules')
const useAppNodeModulesFirst = fs.existsSync(APP_NODE_MODULES)

const nextConfig = {
  outputFileTracingRoot: ROOT_DIR,
  transpilePackages: ['packages/components'],
  images: {
    unoptimized: true,
    domains: ['images.unsplash.com', 'images.pexels.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
        pathname: '/**',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
  experimental: {
    // optimizeCss: true, 
    optimizePackageImports: ['lucide-react'],
    optimizeCss: false,
    externalDir: true,
    // inlineCss: true,
    // Exclude Cloudflare Pages Functions from tracing/bundle

  },
  //  
  compiler: {

  },
  webpack: (config) => {
    // Monorepo: resolve all modules from app then root node_modules (covers app code and nested deps).
    config.resolve.modules = [
      APP_NODE_MODULES,
      ROOT_NODE_MODULES,
      ...(config.resolve.modules || []),
    ]
    return config
  },
  turbopack: {
    root: useAppNodeModulesFirst ? APP_DIR : ROOT_DIR,
  },

}


if (STATIC_EXPORT) {
  nextConfig.output = 'export'
  nextConfig.trailingSlash = false
  nextConfig.skipTrailingSlashRedirect = true
  nextConfig.distDir = 'dist'
  nextConfig.reactStrictMode = true
  // Exclude error pages from static generation
  nextConfig.generateBuildId = async () => {
    return 'static-build'
  }
  // Custom webpack config to exclude error pages
  const originalWebpack = nextConfig.webpack
  nextConfig.webpack = (config, options) => {
    // Apply original webpack config (module resolution)
    if (originalWebpack) {
      config = originalWebpack(config, options)
    }
    
    // Add static export specific optimizations
    if (!options.isServer && STATIC_EXPORT) {
      // Exclude error pages from client bundle during static export
      config.optimization = config.optimization || {}
      config.optimization.splitChunks = config.optimization.splitChunks || {}
    }
    return config
  }
}
module.exports = STATIC_EXPORT ? withPWA(nextConfig) : nextConfig