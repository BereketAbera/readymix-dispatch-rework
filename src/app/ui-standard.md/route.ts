import { standardMarkdown } from "@/content/standard";

export const dynamic = "force-static";

/** The standard as Markdown, so a reviewer can paste a rule into a pull request comment. */
export function GET() {
  return new Response(standardMarkdown(), {
    headers: { "content-type": "text/markdown; charset=utf-8" },
  });
}
