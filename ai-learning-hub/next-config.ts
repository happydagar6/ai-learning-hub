import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    eslint: {
        // Allow production builds to succeed even if there are ESLint errors
        ignoreDuringBuilds: false, // Set to true only if needed for emergency deployment
    },
    typescript: {
        // Ensure TypeScript errors block the build
        ignoreBuildErrors: false,
    },
    experimental: {
        // External packages that should not be bundled
        serverComponentsExternalPackages: ['pdf-parse', 'mammoth', 'sharp'],
    },
    // Image optimization
    images: {
        domains: ['localhost', 'your-domain.com'],
        unoptimized: process.env.NODE_ENV === 'development',
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**',
            },
        ],
    },
    // Environment variables validation
    env: {
        CUSTOM_KEY: process.env.CUSTOM_KEY,
    },
};

export default nextConfig;