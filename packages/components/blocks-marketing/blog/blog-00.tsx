"use client";

import { cn } from "@/lib/utils";
import { Container } from "@/components/misc/layout/сontainer";

const DEFAULT_IMAGE = "/images/image.svg";

interface BlogPostCard {
  date: string;
  author: string;
  title: string;
  image: string;
  link: string;
  description: string;
}

const FALLBACK_POSTS: BlogPostCard[] = [
  {
    date: "June 15, 2024",
    author: "Alex Johnson",
    title: "The Future of AI: How Machine Learning is Transforming Industries",
    image: DEFAULT_IMAGE,
    link: "#",
    description:
      "Explore how artificial intelligence and machine learning technologies are revolutionizing various industries.",
  },
  {
    date: "June 12, 2024",
    author: "Maya Patel",
    title: "Principles of Minimalist Design: Less is More in Modern UX/UI",
    image: DEFAULT_IMAGE,
    link: "#",
    description: "Discover the principles of minimalist design and how they can help you create more intuitive interfaces.",
  },
];

interface BlogPostInput {
  slug: string;
  title: string;
  description?: string;
  date?: string;
  author?: string;
  media?: string;
}

function toCard(post: BlogPostInput, basePath = "/blog"): BlogPostCard {
  return {
    title: post.title,
    date: post.date ?? "",
    author: post.author ?? "",
    link: `${basePath}/${post.slug}`,
    image: post.media ?? DEFAULT_IMAGE,
    description: post.description ?? post.title,
  };
}

interface Blog00Props {
  className?: string;
  title?: string;
  blogPosts?: BlogPostInput[];
  basePath?: string;
}

const Blog00 = ({ className, title = "Latest Tech Blog", blogPosts, basePath = "/blog" }: Blog00Props) => {
  const cards: BlogPostCard[] =
    blogPosts?.length ? blogPosts.map((p) => toCard(p, basePath)) : FALLBACK_POSTS;
  const first = cards[0];
  const rest = cards.slice(1);

  return (
    <section className={cn("py-32", className)}>
      <Container>
        <h1 className="mb-12 text-center text-4xl font-medium md:text-7xl">
          {title}
        </h1>
        <div className="xs:grid-cols-1 mt-24 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative md:row-span-2 lg:col-span-2">
            <a
              href={first.link}
              className="block h-fit rounded-lg p-3 md:top-0"
            >
              <img
                src={first.image}
                alt={first.title}
                className="h-48 w-full rounded-lg object-cover hover:opacity-80 md:h-80 lg:h-96"
              />
              <div className="mt-5">
                <div className="mb-2.5 flex items-center gap-1 text-sm text-muted-foreground">
                  <time>{first.date}</time>·<span>{first.author}</span>
                </div>
                <h3 className="text-lg md:text-3xl lg:text-4xl">
                  {first.title}
                </h3>
                <p className="mt-4 text-muted-foreground">
                  {first.description}
                </p>
              </div>
            </a>
          </div>
          {rest.map((post, idx) => (
            <a key={post.link + idx} href={post.link} className="rounded-lg p-3">
              <img
                src={post.image}
                alt={post.title}
                className="h-48 w-full rounded-lg object-cover hover:opacity-80"
              />
              <div className="mt-5">
                <div className="mb-2.5 flex items-center gap-1 text-sm text-muted-foreground">
                  <time>{post.date}</time>·<span>{post.author}</span>
                </div>
                <h3 className="text-lg">{post.title}</h3>
              </div>
            </a>
          ))}
        </div>
      </Container>
    </section>
  );
};

export { Blog00 };
