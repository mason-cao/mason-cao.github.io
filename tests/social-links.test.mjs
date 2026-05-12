import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const html = readFileSync("index.html", "utf8");

const expectedLinks = {
  linkedin: "https://www.linkedin.com/in/mason-cao7/",
  instagram: "https://www.instagram.com/m.zcao/"
};

assert.ok(
  html.includes(`"${expectedLinks.linkedin}"`),
  "structured data should use the current LinkedIn profile"
);
assert.ok(
  html.includes(`"${expectedLinks.instagram}"`),
  "structured data should use the current Instagram profile"
);

const socialLinkPattern =
  /<a\b(?=[^>]*href="https:\/\/www\.(?:linkedin\.com\/in\/mason-cao7|instagram\.com\/m\.zcao)\/")([^>]*)>/g;
const socialLinks = [...html.matchAll(socialLinkPattern)].map((match) => match[0]);

assert.equal(socialLinks.length, 2, "expected LinkedIn and Instagram contact links");

for (const linkMarkup of socialLinks) {
  assert.ok(
    !/target="_blank"/.test(linkMarkup),
    "social contact links should open directly instead of requesting a new window"
  );
}

assert.ok(!html.includes("mason-cao-7a3760390"), "old LinkedIn URL should be removed");
assert.ok(html.includes("in/mason-cao7"), "visible LinkedIn handle should match the URL");
