import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const html = readFileSync("index.html", "utf8");
const css = readFileSync("style.css", "utf8");

const projectSection = html.match(
  /<section id="projects"[\s\S]*?<div class="mt-8 text-center/
)?.[0];

assert.ok(projectSection, "expected to find the featured projects section");

const projectCards = [...projectSection.matchAll(/<article\b[\s\S]*?<\/article>/g)].map(
  ([card]) => card
);

assert.equal(projectCards.length, 4, "expected exactly four project cards");

for (const card of projectCards) {
  assert.match(
    card,
    /<div class="project-card-main">/,
    "each project card needs a shared main alignment wrapper"
  );
  assert.match(
    card,
    /<div class="project-heading">/,
    "each project card needs a shared heading row"
  );
}

assert.match(
  css,
  /\.project-card\s*{[\s\S]*display:\s*grid;/,
  "project cards should use grid rows so links and stack lines align"
);
assert.match(
  css,
  /\.project-card-main\s*{[\s\S]*grid-template-rows:/,
  "project card main content should define shared rows"
);
assert.match(
  css,
  /--project-heading-row:/,
  "heading row height should be a shared token"
);
assert.match(
  css,
  /--project-copy-row:/,
  "copy row height should be a shared token"
);
assert.match(
  css,
  /--project-stack-row:/,
  "stack row height should be a shared token"
);
assert.match(
  css,
  /@media \(min-width: 1024px\) and \(max-width: 1279px\)[\s\S]*--project-copy-row:/,
  "narrow four-column cards need a copy-row override"
);
assert.match(
  css,
  /@media \(min-width: 1024px\) and \(max-width: 1279px\)[\s\S]*--project-stack-row:/,
  "narrow four-column cards need a stack-row override"
);
