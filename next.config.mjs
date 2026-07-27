/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // Vercel Blob public URLs — where real uploads land
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' },
      // Only used by the `db:demo` seed listing
      { protocol: 'https', hostname: 'placehold.co' },
    ],
  },
}

export default nextConfig
