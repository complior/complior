const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    const oryUrl = process.env.ORY_INTERNAL_URL || 'http://localhost:4433';
    return [
      {
        source: '/.ory/:path*',
        destination: `${oryUrl}/:path*`,
      },
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

module.exports = withNextIntl(nextConfig);
