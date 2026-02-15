/** @type {import('next').NextConfig} */
const path = require('path')
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'source.unsplash.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'loremflickr.com' },
      { protocol: 'https', hostname: 'i.pravatar.cc' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'placehold.co' },
      { protocol: 'https', hostname: 'api.dicebear.com' },
    ],
  },
  turbopack: {
    root: path.join(__dirname)
  },
  async redirects() {
    return [
      {
        source: '/cv',
        destination: 'https://cv.thedzx.site',
        permanent: true,
      },
    ]
  }
}

module.exports = nextConfig
