/** Images : Supabase Storage + URL de secours (n'importe quel hôte https), servies en WebP via next/image */
module.exports = {
  images: { formats: ['image/webp'], remotePatterns: [{ protocol: 'https', hostname: '**' }] },
};
