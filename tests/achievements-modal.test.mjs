import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const html = readFileSync("index.html", "utf8");
const css = readFileSync("style.css", "utf8");

const achievementsTrigger = html.match(
  /<button\b(?=[^>]*id="open-achievements-btn")[\s\S]*?<\/button>/
)?.[0];
assert.ok(achievementsTrigger, "expected the achievements trigger button");
assert.match(
  achievementsTrigger,
  />\s*17\s*<\/span\s*>/,
  "games peaked counter should include the new Word Hunt entry"
);

const achievementsList = html.match(
  /<dl class="achievements-list">[\s\S]*?<\/dl>/
)?.[0];
assert.ok(achievementsList, "expected the achievements list");
assert.ok(
  achievementsList.includes("<dt>GamePigeon Word Hunt</dt>"),
  "achievements list should include GamePigeon Word Hunt"
);
assert.ok(
  achievementsList.includes("2.5K wins &middot; 52K high score"),
  "Word Hunt row should include wins and high score"
);

for (const id of ["close-modal-btn", "close-achievements-btn"]) {
  const closeButton = html.match(
    new RegExp(`<button\\b(?=[^>]*id="${id}")[\\s\\S]*?>`)
  )?.[0];
  assert.ok(closeButton, `expected ${id}`);
  assert.match(
    closeButton,
    /class="[^"]*\bmodal-close-button\b/,
    `${id} should use the shared mobile close-button hit target`
  );
}

assert.match(
  css,
  /\.modal-close-button\s*{[\s\S]*min-width:\s*2\.75rem;/,
  "modal close buttons should be at least 44px wide for mobile taps"
);
assert.match(
  css,
  /\.modal-close-button\s*{[\s\S]*min-height:\s*2\.75rem;/,
  "modal close buttons should be at least 44px tall for mobile taps"
);
assert.match(
  css,
  /\.achievements-box\s*{[\s\S]*max-height:\s*min\(calc\(100dvh - 2rem\),\s*44rem\);/,
  "achievements modal should fit within the mobile viewport"
);
assert.match(
  css,
  /\.achievements-box\s*{[\s\S]*overflow-y:\s*auto;/,
  "achievements modal should scroll internally on short mobile screens"
);
