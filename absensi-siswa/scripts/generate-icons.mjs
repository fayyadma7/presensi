import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const src = path.join(root, "public", "icons", "icon-source.png");
const outDir = path.join(root, "public", "icons");
const appDir = path.join(root, "src", "app");

const PRIMARY = "#4F46E5";
const MASKABLE_BG = "#FDEA1C";

async function makePaddedIcon(size, bg) {
  const padded = await sharp(src).resize(Math.round(size * 0.8), Math.round(size * 0.8), { fit: "inside" }).toBuffer();
  const paddedMeta = await sharp(padded).metadata();
  const pw = Math.round((size - paddedMeta.width) / 2);
  const ph = Math.round((size - paddedMeta.height) / 2);
  return sharp(padded)
    .extend({ top: ph, bottom: ph, left: pw, right: pw, background: bg })
    .png();
}

async function main() {
  await mkdir(outDir, { recursive: true });

  const meta = await sharp(src).metadata();
  console.log("Sumber ikon:", meta.width, "x", meta.height, meta.format);

  await sharp(src).resize(48, 48, { fit: "cover" }).png().toFile(path.join(appDir, "icon.png"));
  await sharp(src).resize(180, 180, { fit: "cover" }).png().toFile(path.join(appDir, "apple-icon.png"));
  await sharp(src).resize(192, 192, { fit: "cover" }).png().toFile(path.join(outDir, "icon-192.png"));
  await sharp(src).resize(512, 512, { fit: "cover" }).png().toFile(path.join(outDir, "icon-512.png"));
  await (await makePaddedIcon(512, MASKABLE_BG)).toFile(path.join(outDir, "icon-maskable-512.png"));

  console.log("Ikon berhasil dibuat di public/icons/ dan src/app/.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
