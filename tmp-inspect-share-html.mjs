import { writeFileSync } from "node:fs";

const url =
  "https://truth-news-three.vercel.app/news/4355b7d3-5217-41be-9ca9-441ecd7d8d0b";
const response = await fetch(url, { redirect: "manual" });
const html = await response.text();
writeFileSync(new URL("./tmp-share-html.txt", import.meta.url), html);
const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? "";
const og = [...html.matchAll(/property="(og:[^"]+)" content="([^"]*)"/g)].map(
  (match) => `${match[1]}=${match[2]}`,
);
console.log(
  JSON.stringify(
    {
      status: response.status,
      location: response.headers.get("location"),
      title,
      og,
      hasOpenAI: html.includes("OpenAI"),
      length: html.length,
    },
    null,
    2,
  ),
);
