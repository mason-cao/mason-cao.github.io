// Card stills are shown ~320px wide (640 @2x) and reused as the blurred
// halo, so 800px is plenty. Raw captures are ~2MB PNGs; these land <100KB.
import sharp from "sharp";
import { readdir, unlink } from "node:fs/promises";

const dir = "public/projects";
for (const f of (await readdir(dir)).filter((f) => f.endsWith(".png"))) {
  const src = `${dir}/${f}`;
  const out = src.replace(/\.png$/, ".webp");
  await sharp(src).resize({ width: 800 }).webp({ quality: 80 }).toFile(out);
  await unlink(src);
  console.log(out);
}
