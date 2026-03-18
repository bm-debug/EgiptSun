import { promises as fs } from "fs";
import path from "path";
import matter from "gray-matter";
// @ts-ignore - js-yaml types may not be properly resolved
import * as yaml from "js-yaml";
import { PROJECT_SETTINGS } from "@/settings";
import { frontmatterSchema } from "@/packages/lib/validators/content.schema";
import type { Post } from "@/packages/types/post";
import { TextsRepository } from "@/shared/repositories/texts.repository";
import type { altrpTextDataIn } from "@/shared/types/altrp";

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

function extractI18nValue(val: string | Record<string, string> | null | undefined, locale: string): string {
  if (val == null) return "";
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val) as Record<string, string>;
      return parsed[locale] ?? parsed.en ?? parsed.ru ?? Object.values(parsed)[0] ?? val;
    } catch {
      return val;
    }
  }
  if (typeof val === "object") {
    return (val as Record<string, string>)[locale] ?? (val as Record<string, string>).en ?? (val as Record<string, string>).ru ?? Object.values(val as Record<string, string>)[0] ?? "";
  }
  return "";
}

function textToPost(
  text: {
    title: string | Record<string, string> | null;
    content: string | Record<string, string> | null;
    dataIn?: altrpTextDataIn | null;
    taid?: string | null;
  },
  locale: string = PROJECT_SETTINGS.defaultLanguage
): Post {
  type TextDataIn = Omit<altrpTextDataIn, "slug"> & {
    media?: string;
    images?: string[];
    slug?: string | Record<string, string>;
  };
  const dataIn = text.dataIn as TextDataIn | null | undefined;
  const slugRaw: string | Record<string, string> = dataIn?.slug ?? text.taid ?? "";
  const slug =
    typeof slugRaw === "object"
      ? slugRaw[locale] ?? slugRaw.en ?? slugRaw.ru ?? Object.values(slugRaw)[0] ?? ""
      : String(slugRaw ?? "");
  const title = extractI18nValue(text.title, locale);
  const content = extractI18nValue(text.content, locale);
  const excerpt =
    content != null && content !== ""
      ? content.slice(0, 200).trim() + (content.length > 200 ? "…" : "")
      : undefined;
  const media =
    dataIn?.media ??
    (Array.isArray(dataIn?.images) && dataIn.images.length > 0 ? dataIn.images[0] : undefined);
  return {
    slug,
    title,
    description: excerpt,
    date: dataIn?.date,
    author: dataIn?.author,
    excerpt,
    content: content || undefined,
    media,
  };
}

export async function getContent(
  type: string,
  locale: string = PROJECT_SETTINGS.defaultLanguage,
  options = {}
): Promise<Post[]> {
  switch (type) {
    case "blog": {
      try {
        const textsRepository = TextsRepository.getInstance();
        const docs = await textsRepository.findBlogArticles(locale);
        if (docs.length > 0) {
          const withParsedDataIn = docs.map((text) => {
            let parsed: altrpTextDataIn | null = null;
            if (text.dataIn) {
              try {
                parsed =
                  typeof text.dataIn === "string"
                    ? (JSON.parse(text.dataIn) as altrpTextDataIn)
                    : (text.dataIn as altrpTextDataIn);
              } catch {
                // ignore
              }
            }
            return textToPost({ ...text, dataIn: parsed }, locale);
          });
          withParsedDataIn.sort((a, b) => {
            if (!a.date && !b.date) return 0;
            if (!a.date) return 1;
            if (!b.date) return -1;
            return new Date(b.date).getTime() - new Date(a.date).getTime();
          });
          return withParsedDataIn;
        }
      } catch (err) {
        console.error("Blog from DB failed, falling back to files", err);
      }
      return getBlogPosts(locale);
    }
    default:
      return [];
  }
}
