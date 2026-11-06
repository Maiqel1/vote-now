export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  published: string;
  readMinutes: number;
  tag: "Guide" | "Case study";
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "how-to-run-an-election-with-unlimited-voters",
    title: "How to run an election with unlimited voters",
    description:
      "Skip the emails: voters sign in with Google, share one link, and there's no voter limit. A step-by-step guide for large student unions, schools and organizations.",
    published: "2026-11-06",
    readMinutes: 5,
    tag: "Guide",
  },
  {
    slug: "state-house-medical-centre-corps-members",
    title: "How State House Medical Centre corps members run their elections online",
    description:
      "Four committee elections since 2024, 86% turnout two years running, and no help needed: how the corps members at State House Medical Centre vote on VoteNow.",
    published: "2026-11-06",
    readMinutes: 4,
    tag: "Case study",
  },
  {
    slug: "how-to-run-a-student-union-election-online",
    title: "How to run a student union election online",
    description:
      "A step-by-step guide for electoral committees: building the ballot, inviting voters, keeping every vote secret and publishing results people trust.",
    published: "2026-11-06",
    readMinutes: 6,
    tag: "Guide",
  },
];

export function getPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug);
}

export function formatPostDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}
