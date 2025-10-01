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
        CLERK_JWT_VERIFICATION_LEEWAY: '120',
        CLERK_CLOCK_SKEW_IN_MS: '60000',
    },
    // Headers for CORS and security
    async headers() {
        return [
            {
                source: '/api/:path*',
                headers: [
                    { key: 'Access-Control-Allow-Credentials', value: 'true' },
                    { key: 'Access-Control-Allow-Origin', value: '*' },
                    { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
                    { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
                ],
            },
        ]
    },
};

export default nextConfig;