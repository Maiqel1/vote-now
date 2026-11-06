import type { Metadata } from "next";
import Link from "next/link";
import { BlogShell } from "@/components/blog/BlogShell";
import { BLOG_POSTS, formatPostDate } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog",
  description: "Guides and real stories on running fair online elections and polls for organizations, student unions and clubs.",
  alternates: { canonical: "/blog" },
};

export default function BlogIndexPage() {
  return (
    <BlogShell>
      <div className="mb-10">
        <p className="mb-2 text-sm font-medium text-brand-strong">VoteNow blog</p>
        <h1 className="mb-3 text-balance text-4xl font-bold tracking-tight text-foreground md:text-5xl">Running elections people trust</h1>
        <p className="text-muted-foreground">Guides and real stories from organizations, student unions and clubs voting online.</p>
      </div>
      <div className="space-y-4">
        {BLOG_POSTS.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="surface block rounded-2xl p-6 transition-colors hover:border-brand/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="mb-2 flex flex-wrap items-center gap-x-2 text-xs">
              <span className="font-medium uppercase tracking-widest text-brand-strong">{post.tag}</span>
              <span className="text-muted-foreground">
                {formatPostDate(post.published)} · {post.readMinutes} min read
              </span>
            </div>
            <h2 className="mb-2 text-xl font-semibold text-foreground">{post.title}</h2>
            <p className="text-sm leading-6 text-muted-foreground">{post.description}</p>
          </Link>
        ))}
      </div>
    </BlogShell>
  );
}
