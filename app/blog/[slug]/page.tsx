import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleCta } from "@/components/blog/Article";
import { BlogShell } from "@/components/blog/BlogShell";
import { POST_CONTENT } from "@/components/blog/posts";
import { BLOG_POSTS, formatPostDate, getPost } from "@/lib/blog";
import { appUrl } from "@/lib/format";

export const dynamicParams = false;

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const post = getPost(params.slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: { type: "article", title: post.title, description: post.description, url: `/blog/${post.slug}`, publishedTime: post.published },
    twitter: { card: "summary_large_image", title: post.title, description: post.description },
  };
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = getPost(params.slug);
  const Content = POST_CONTENT[params.slug];
  if (!post || !Content) notFound();

  const structuredData = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.published,
    dateModified: post.published,
    author: { "@type": "Organization", name: "VoteNow", url: appUrl("/") },
    publisher: { "@type": "Organization", name: "VoteNow", url: appUrl("/") },
    mainEntityOfPage: appUrl(`/blog/${post.slug}`),
  }).replace(/</g, "\\u003c");

  return (
    <BlogShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredData }} />
      <article>
        <Link href="/blog" className="mb-8 inline-flex text-sm text-muted-foreground transition-colors hover:text-foreground">
          ← All posts
        </Link>
        <div className="mb-3 text-xs font-medium uppercase tracking-widest text-brand-strong">{post.tag}</div>
        <h1 className="mb-4 text-balance text-4xl font-bold tracking-tight text-foreground md:text-5xl">{post.title}</h1>
        <p className="mb-10 text-sm text-muted-foreground">
          {formatPostDate(post.published)} · {post.readMinutes} min read
        </p>
        <Content />
        <ArticleCta />
      </article>
    </BlogShell>
  );
}
