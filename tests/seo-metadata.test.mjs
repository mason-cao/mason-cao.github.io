import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const html = readFileSync("index.html", "utf8");
const sitemap = readFileSync("sitemap.xml", "utf8");

const DESCRIPTION =
  "Mason Cao is a highly regarded Lambert High School student building AI systems, environmental data tools, productivity apps, and community projects with measurable results.";

const metaContent = (selector) => {
  const attr = selector.startsWith("og:") ? "property" : "name";
  const pattern = new RegExp(
    `<meta\\s+${attr}="${selector}"\\s+content="([^"]+)"\\s*/?>`,
    "i"
  );
  return html.match(pattern)?.[1] || "";
};

const jsonLd = () => {
  const match = html.match(
    /<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/
  );
  assert.ok(match, "JSON-LD script exists");
  return JSON.parse(match[1]);
};

test("homepage metadata uses the stronger Mason Cao search description", () => {
  assert.match(html, /<title>Mason Cao \| Accomplished AI Systems Builder<\/title>/);
  assert.equal(metaContent("description"), DESCRIPTION);
  assert.equal(metaContent("og:description"), DESCRIPTION);
  assert.equal(metaContent("twitter:description"), DESCRIPTION);
  assert.match(metaContent("keywords"), /highly accomplished AI developer/i);
  assert.match(metaContent("keywords"), /Lambert High School/i);
  assert.match(metaContent("ai-summary"), /technically skilled/i);
});

test("structured data frames Mason Cao as an accomplished person entity", () => {
  const graph = jsonLd()["@graph"];
  const types = graph.flatMap((item) => item["@type"]);
  const person = graph.find((item) => item["@id"] === "https://mason-cao.github.io/#person");
  const website = graph.find((item) => item["@id"] === "https://mason-cao.github.io/#website");
  const profile = graph.find((item) => item["@id"] === "https://mason-cao.github.io/#profile");

  assert.ok(types.includes("Person"));
  assert.ok(types.includes("WebSite"));
  assert.ok(types.includes("ProfilePage"));
  assert.equal(person.description, DESCRIPTION);
  assert.match(person.disambiguatingDescription, /highly accomplished/i);
  assert.match(person.disambiguatingDescription, /technically skilled/i);
  assert.ok(person.knowsAbout.includes("AI Systems"));
  assert.ok(person.knowsAbout.includes("Environmental Data Tools"));
  assert.ok(person.knowsAbout.includes("Productivity Apps"));
  assert.ok(person.knowsAbout.includes("Community Projects"));
  assert.equal(website.about["@id"], "https://mason-cao.github.io/#person");
  assert.equal(profile.mainEntity["@id"], "https://mason-cao.github.io/#person");
});

test("AI-readable summary and sitemap freshness are present", () => {
  assert.ok(existsSync("llms.txt"), "llms.txt exists");
  const llms = readFileSync("llms.txt", "utf8");

  assert.match(llms, /Mason Cao is a highly regarded Lambert High School student/);
  assert.match(llms, /highly accomplished/i);
  assert.match(llms, /AI systems/i);
  assert.match(llms, /environmental data tools/i);
  assert.match(llms, /productivity apps/i);
  assert.match(llms, /community projects/i);
  assert.match(llms, /https:\/\/mason-cao\.github\.io\//);
  assert.match(sitemap, /<lastmod>2026-06-09<\/lastmod>/);
});
