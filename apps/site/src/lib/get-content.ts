import { promises as fs } from "fs";
import path from "path";
import matter from "gray-matter";
// @ts-ignore - js-yaml types may not be properly resolved
import * as yaml from "js-yaml";
import { PROJECT_SETTINGS } from "@/settings";
import { frontmatterSchema } from "@/packages/lib/validators/content.schema";
import type { Post } from "@/packages/types/post";

function getBlogContentDir(): string {
  const cwd = process.cwd();
  const fromRoot = path.resolve(cwd, "packages/content/mdxs/blog");
  const fromApp = path.resolve(cwd, "../../packages/content/mdxs/blog");
  const fsSync = require("fs") as { existsSync: (p: string) => boolean };
  if (fsSync.existsSync(fromRoot)) return fromRoot;
  return fromApp;
}

async function getBlogPosts(
  locale: string = PROJECT_SETTINGS.defaultLanguage
): Promise<Post[]> {
  const contentDir = getBlogContentDir();
  const posts: Post[] = [];

  try {
    const entries = await fs.readdir(contentDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const slug = entry.name;
        let fileName = "index.mdx";

        // Try to find locale-specific file first
        if (locale !== PROJECT_SETTINGS.defaultLanguage) {
          const localeFile = path.join(contentDir, slug, `${locale}.mdx`);
          try {
            await fs.access(localeFile);
            fileName = `${locale}.mdx`;
          } catch {
            // Fallback to index.mdx if locale file doesn't exist
            fileName = "index.mdx";
          }
        }

        const filePath = path.join(contentDir, slug, fileName);
        try {
          const raw = await fs.readFile(filePath, "utf8");
          const { data, content } = matter(raw, {
            engines: {
              yaml: {
                parse: (str: string) => yaml.load(str) as any,
                stringify: (obj: any) => yaml.dump(obj),
              },
            },
          });

          const processed = {
            ...data,
            date:
              data.date instanceof Date
                ? data.date.toISOString()
                : data.date || undefined,
          };

          const validated = frontmatterSchema.parse(processed);

          posts.push({
            slug,
            title: validated.title,
            description: validated.description,
            date: validated.date,
            tags: validated.tags,
            excerpt: validated.excerpt,
            content: content.trim(),
            category: (data as any).category,
            author: (data as any).author,
            media: validated.media,
            seoTitle: (data as any).seoTitle,
            seoDescription: (data as any).seoDescription,
            seoKeywords: (data as any).seoKeywords,
          });
        } catch (error) {
          // Skip files that can't be parsed
          console.error(`Error reading post ${slug}:`, error);
        }
      }
    }

    // Sort by date (newest first) if date is available
    posts.sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    return posts;
  } catch (error) {
    console.error("Error reading blog directory:", error);
    return [];
  }
}

const ALTRP_API_BASE =
  typeof process !== "undefined"
    ? process.env.NEXT_PUBLIC_ALTRP_API_URL ??
      process.env.ALTRP_API_URL ??
      process.env.ALTRP_APP_URL
    : "";

export async function getContent(
  type: string,
  locale: string = PROJECT_SETTINGS.defaultLanguage,
  options = {}
): Promise<Post[]> {
  switch (type) {
    case "blog": {
      if (ALTRP_API_BASE) {
        try {
          const url = new URL(`${ALTRP_API_BASE}/api/altrp/v1/public/content/blog`);
          url.searchParams.set("locale", locale);
          const res = await fetch(url.toString(), {
            next: { revalidate: 60 },
          });
          if (!res.ok) throw new Error(String(res.status));
          const { docs } = (await res.json()) as {
            docs: Array<{
              title: string | null;
              content: string | null;
              taid?: string | null;
              dataIn?: { slug?: string; date?: string; author?: string } | null;
            }>;
          };
          if (docs?.length) {
            const posts: Post[] = docs.map((text) => {
              const d = text.dataIn as { slug?: string; date?: string; author?: string; media?: string } | undefined;
              const slug = d?.slug ?? text.taid ?? "";
              const excerpt =
                text.content != null
                  ? text.content.slice(0, 200).trim() +
                    (text.content.length > 200 ? "…" : "")
                  : undefined;
              return {
                slug,
                title: text.title ?? "",
                description: excerpt,
                date: d?.date,
                author: d?.author,
                excerpt,
                content: text.content ?? undefined,
                media: d?.media ?? "/images/image.svg",
              };
            });
            posts.sort((a, b) => {
              if (!a.date && !b.date) return 0;
              if (!a.date) return 1;
              if (!b.date) return -1;
              return new Date(b.date).getTime() - new Date(a.date).getTime();
            });
            return posts;
          }
        } catch (err) {
          console.error("Blog from API failed, falling back to files", err);
        }
      }
      return getBlogPosts(locale);
    }
    default:
      return [];
  }
}