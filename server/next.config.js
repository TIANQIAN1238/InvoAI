const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // API-only backend app.
  turbopack: {
    root: path.join(__dirname),
  },
};

module.exports = nextConfig;
