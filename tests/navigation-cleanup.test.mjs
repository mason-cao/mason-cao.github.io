import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const html = readFileSync("index.html", "utf8");

assert.ok(
  !html.includes("View featured work"),
  "hero should not include the View featured work CTA"
);
assert.ok(
  !html.includes("Start a conversation"),
  "hero should not include the Start a conversation CTA"
);
assert.ok(
  !html.includes('id="hero-contact-btn"'),
  "removed hero contact button should not leave its id behind"
);
assert.ok(
  !html.includes('class="hero-actions"'),
  "hero action wrapper should be removed when it has no actions"
);

const bottomNav = html.match(/<nav[\s\S]*?<\/nav>/)?.[0];
assert.ok(bottomNav, "expected a bottom navigation bar");

assert.ok(bottomNav.includes('id="open-contact-btn"'), "bottom bar should keep Contact");
assert.ok(bottomNav.includes("Contact"), "bottom bar should show the Contact label");

for (const label of ["Home", "Projects", "About"]) {
  assert.ok(!bottomNav.includes(label), `bottom bar should remove ${label}`);
}

assert.equal(
  [...bottomNav.matchAll(/data-nav-link=/g)].length,
  0,
  "bottom bar should not keep section nav links"
);
assert.equal(
  [...bottomNav.matchAll(/<(?:a|button)\b/g)].length,
  1,
  "bottom bar should contain only the Contact control"
);
