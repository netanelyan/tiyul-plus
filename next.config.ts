import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // מכבה את אינדיקטור הפיתוח הצף של Next - הוא נראה כלשונית שבורה בקצה
  // המסך כשבודקים את שרת הפיתוח מטלפון ברשת המקומית. dev בלבד ממילא.
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};

export default nextConfig;
