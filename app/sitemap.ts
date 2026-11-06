import type { MetadataRoute } from "next";
import { BLOG_POSTS } from "@/lib/blog";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/poll`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/blog`, changeFrequency: "weekly", priority: 0.7 },
    ...BLOG_POSTS.map((post) => ({
      url: `${base}/blog/${post.slug}`,
      lastModified: post.published,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    { url: `${base}/signup`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/login`, changeFrequency: "monthly", priority: 0.3 },
  ];
}
