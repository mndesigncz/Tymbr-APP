import sharp from "sharp";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const svgPath = join(__dirname, "../build/dmg-background.svg");
const pngPath = join(__dirname, "../build/dmg-background.png");

const svg = readFileSync(svgPath);
await sharp(svg).png().toFile(pngPath);
console.log("DMG background generated →", pngPath);
