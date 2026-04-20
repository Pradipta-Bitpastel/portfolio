import type { MetadataRoute } from "next";

/**
 * Generates /sitemap.xml. The single-page portfolio only has one URL,
 * but we keep this route so search engines can pick up the canonical
 * domain. Base URL comes from NEXT_PUBLIC_SITE_URL; we fall back to
 * the Vercel preview hostname so it never breaks a preview deploy.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://portfolio.vercel.app"
  ).replace(/\/$/, "");

  return [
    {
      url: `${base}/`,
      lastModified: new Date()
    }
  ];
}
