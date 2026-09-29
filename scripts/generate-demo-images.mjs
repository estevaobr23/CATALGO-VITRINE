// Gera as ilustrações da vitrine demo "Encanto Cestas" (public/demo/*.webp).
// São ILUSTRAÇÕES, não fotos: servem à demo e à página de vendas até existirem
// fotos reais de cestas. Uso: node scripts/generate-demo-images.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "demo");
mkdirSync(out, { recursive: true });

// ---------------------------------------------------------------- peças
const tissue = (x, y, w, c) =>
  `<g>${Array.from({ length: 11 }, (_, i) => {
    const cx = x - w * 0.47 + (i * w * 0.94) / 10;
    return `<path d="M${cx - w * 0.07} ${y + 6} Q ${cx - w * 0.02} ${y - 46 - (i % 3) * 10} ${cx + w * 0.03} ${y - 10} Q ${cx + w * 0.06} ${y - 34} ${cx + w * 0.08} ${y + 6} Z" fill="${c}" opacity="${i % 2 ? 0.95 : 0.8}"/>`;
  }).join("")}</g>`;
const bow = (x, y, s, c) => `
  <g transform="translate(${x} ${y}) scale(${s})">
    <path d="M0 0 C -60 -46 -86 20 0 0 C 86 20 60 -46 0 0 Z" fill="${c}"/>
    <path d="M-6 4 L -34 70 L -18 64 L -6 80 Z M 6 4 L 34 70 L 18 64 L 6 80 Z" fill="${c}"/>
    <circle r="12" fill="${c}"/><circle r="12" fill="#000" opacity=".12"/>
  </g>`;
const basket = (x, y, w, h, tone = "#b07a45", dark = "#8a5a2e", paper = "#f7efe3", ribbon = "#9a4a36") => `
  <g>
    ${tissue(x, y - h * 0.06, w, paper)}
    <path d="M${x - w / 2} ${y} L${x + w / 2} ${y} L${x + w * 0.42} ${y + h} Q${x} ${y + h * 1.08} ${x - w * 0.42} ${y + h} Z" fill="${tone}"/>
    ${Array.from({ length: 4 }, (_, i) => `<path d="M${x - w * 0.48 + i * 0.01 * w} ${y + h * (0.22 + i * 0.22)} L${x + w * 0.48 - i * 0.01 * w} ${y + h * (0.22 + i * 0.22)}" stroke="${dark}" stroke-opacity=".45" stroke-width="${h * 0.04}"/>`).join("")}
    ${Array.from({ length: 9 }, (_, i) => `<path d="M${x - w * 0.4 + i * w * 0.1} ${y + h * 0.05} L${x - w * 0.36 + i * w * 0.09} ${y + h * 0.95}" stroke="${dark}" stroke-opacity=".25" stroke-width="${w * 0.012}"/>`).join("")}
    <rect x="${x - w * 0.53}" y="${y - h * 0.08}" width="${w * 1.06}" height="${h * 0.16}" rx="${h * 0.08}" fill="${dark}"/>
    ${bow(x + w * 0.3, y + h * 0.18, 0.9, ribbon)}
  </g>`;
const handle = (x, y, w, h, dark = "#8a5a2e") =>
  `<path d="M${x - w * 0.36} ${y - h * 0.05} Q ${x} ${y - h * 1.75} ${x + w * 0.36} ${y - h * 0.05}" fill="none" stroke="${dark}" stroke-width="${w * 0.045}" stroke-linecap="round"/>`;
const bottle = (x, y, s, body, label = "#f3e6c8", cap = "#3b2a22") => `
  <g transform="translate(${x} ${y}) scale(${s})">
    <rect x="-9" y="-150" width="18" height="40" rx="4" fill="${cap}"/>
    <path d="M-10 -112 Q -10 -85 -32 -70 L -32 40 Q -32 50 -22 50 L 22 50 Q 32 50 32 40 L 32 -70 Q 10 -85 10 -112 Z" fill="${body}"/>
    <rect x="-26" y="-30" width="52" height="40" rx="4" fill="${label}"/>
    <rect x="-18" y="-20" width="36" height="5" rx="2" fill="${body}" opacity=".5"/>
    <path d="M-22 -60 L -22 30" stroke="#fff" stroke-opacity=".25" stroke-width="5" stroke-linecap="round"/>
  </g>`;
const rose = (x, y, s, c = "#c2364b") => `
  <g transform="translate(${x} ${y}) scale(${s})">
    <path d="M0 10 Q 4 60 -2 110" stroke="#4f7a3a" stroke-width="6" fill="none"/>
    <path d="M0 60 Q 26 44 34 60 Q 16 72 0 64 Z" fill="#5f8f45"/>
    <circle r="26" fill="${c}"/>
    <path d="M-16 -4 Q 0 -26 16 -4 Q 0 14 -16 -4 Z" fill="#fff" opacity=".18"/>
    <path d="M-20 6 Q 0 26 20 6" stroke="#000" stroke-opacity=".15" stroke-width="4" fill="none"/>
  </g>`;
const heartBalloon = (x, y, s, c = "#d94f63") => `
  <g transform="translate(${x} ${y}) scale(${s})">
    <path d="M0 40 Q 6 110 -8 190" stroke="#8a6d62" stroke-width="3" fill="none"/>
    <path d="M0 40 C -70 -10 -40 -80 0 -45 C 40 -80 70 -10 0 40 Z" fill="${c}"/>
    <path d="M-30 -30 Q -24 -44 -10 -44" stroke="#fff" stroke-opacity=".5" stroke-width="7" stroke-linecap="round" fill="none"/>
  </g>`;
const roundBalloon = (x, y, s, c) => `
  <g transform="translate(${x} ${y}) scale(${s})">
    <path d="M0 52 Q -8 120 6 200" stroke="#8a6d62" stroke-width="3" fill="none"/>
    <ellipse rx="42" ry="52" fill="${c}"/>
    <path d="M-6 52 L 6 52 L 0 62 Z" fill="${c}"/>
    <path d="M-22 -26 Q -16 -40 -2 -42" stroke="#fff" stroke-opacity=".5" stroke-width="7" stroke-linecap="round" fill="none"/>
  </g>`;
const giftBox = (x, y, w, h, c, ribbon) => `
  <g>
    <rect x="${x - w / 2}" y="${y}" width="${w}" height="${h}" rx="6" fill="${c}"/>
    <rect x="${x - w / 2 - 4}" y="${y - 14}" width="${w + 8}" height="22" rx="5" fill="${c}"/>
    <rect x="${x - 7}" y="${y - 14}" width="14" height="${h + 14}" fill="${ribbon}"/>
    <path d="M${x} ${y - 14} C ${x - 40} ${y - 50} ${x - 44} ${y - 10} ${x} ${y - 14} C ${x + 44} ${y - 10} ${x + 40} ${y - 50} ${x} ${y - 14} Z" fill="${ribbon}"/>
  </g>`;
const mug = (x, y, s, c = "#f6f1ea", accent = "#9a4a36") => `
  <g transform="translate(${x} ${y}) scale(${s})">
    <path d="M40 -20 Q 70 -20 70 10 Q 70 40 40 38" stroke="${c}" stroke-width="12" fill="none"/>
    <rect x="-45" y="-45" width="90" height="100" rx="14" fill="${c}"/>
    <path d="M-20 -5 C -35 -25 -8 -32 0 -16 C 8 -32 35 -25 20 -5 L 0 15 Z" fill="${accent}"/>
    <path d="M-10 -70 Q -20 -60 -10 -50 M 10 -72 Q 0 -62 10 -52" stroke="#c9bfb6" stroke-width="5" fill="none" stroke-linecap="round"/>
  </g>`;
const croissant = (x, y, s) => `
  <g transform="translate(${x} ${y}) scale(${s})">
    <path d="M-70 10 Q -60 -40 0 -44 Q 60 -40 70 10 Q 40 -4 0 -2 Q -40 -4 -70 10 Z" fill="#d99a4b"/>
    ${[-40, -14, 14, 40].map((cx) => `<path d="M${cx} -40 Q ${cx + 6} -20 ${cx} -4" stroke="#b5752c" stroke-width="5" fill="none"/>`).join("")}
  </g>`;
const orange = (x, y, r) => `<g><circle cx="${x}" cy="${y}" r="${r}" fill="#f29b30"/><circle cx="${x - r * 0.3}" cy="${y - r * 0.3}" r="${r * 0.25}" fill="#fff" opacity=".25"/><path d="M${x} ${y - r} q 8 -10 18 -6" stroke="#4f7a3a" stroke-width="4" fill="none"/></g>`;
const apple = (x, y, r) => `<g><circle cx="${x}" cy="${y}" r="${r}" fill="#c63d3d"/><path d="M${x} ${y - r} q 2 -14 10 -18" stroke="#6b4a2b" stroke-width="4" fill="none"/><path d="M${x + 4} ${y - r - 6} q 16 -10 22 2 q -12 8 -22 -2 z" fill="#5f8f45"/></g>`;
const bread = (x, y, s) => `
  <g transform="translate(${x} ${y}) scale(${s})">
    <ellipse rx="70" ry="38" fill="#c98a45"/>
    ${[-30, 0, 30].map((cx) => `<path d="M${cx - 12} -24 Q ${cx} -6 ${cx + 12} -24" stroke="#a86a2c" stroke-width="6" fill="none"/>`).join("")}
  </g>`;
const chocoBar = (x, y, s, c = "#5a3526", wrap = "#c9a063", rot = 0) => `
  <g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">
    <rect x="-36" y="-70" width="72" height="140" rx="6" fill="${c}"/>
    ${[0, 1, 2].map((r) => [0, 1].map((col) => `<rect x="${-30 + col * 32}" y="${-64 + r * 30}" width="28" height="26" rx="3" fill="#6b4130"/>`).join("")).join("")}
    <rect x="-38" y="10" width="76" height="62" rx="6" fill="${wrap}"/>
    <rect x="-24" y="30" width="48" height="8" rx="3" fill="#fff" opacity=".6"/>
  </g>`;
const bonbon = (x, y, r, c = "#4a2a1e") => `<g><circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/><path d="M${x - r * 0.6} ${y - r * 0.2} q ${r * 0.6} -${r * 0.6} ${r * 1.2} 0" stroke="#c9a063" stroke-width="3" fill="none"/></g>`;
const cake = (x, y, s) => `
  <g transform="translate(${x} ${y}) scale(${s})">
    <rect x="-60" y="-10" width="120" height="70" rx="10" fill="#f6d2d7"/>
    <path d="M-60 0 Q -45 18 -30 0 Q -15 18 0 0 Q 15 18 30 0 Q 45 18 60 0 L 60 -10 L -60 -10 Z" fill="#fff"/>
    <rect x="-4" y="-50" width="8" height="40" rx="3" fill="#7bb2d9"/>
    <path d="M0 -66 Q 10 -54 0 -50 Q -10 -54 0 -66 Z" fill="#f2b53a"/>
    ${[-40, -15, 15, 40].map((cx) => `<circle cx="${cx}" cy="34" r="5" fill="#d94f63"/>`).join("")}
  </g>`;
const bear = (x, y, s) => `
  <g transform="translate(${x} ${y}) scale(${s})">
    <circle cx="-38" cy="-52" r="18" fill="#a8764c"/><circle cx="38" cy="-52" r="18" fill="#a8764c"/>
    <circle cx="-38" cy="-52" r="9" fill="#e8c7a2"/><circle cx="38" cy="-52" r="9" fill="#e8c7a2"/>
    <circle cy="-20" r="48" fill="#b98457"/>
    <ellipse cy="0" rx="22" ry="16" fill="#e8c7a2"/>
    <circle cx="-16" cy="-28" r="5" fill="#2b1d19"/><circle cx="16" cy="-28" r="5" fill="#2b1d19"/>
    <ellipse cy="-6" rx="7" ry="5" fill="#2b1d19"/>
    <path d="M-30 30 L 0 44 L 30 30 L 0 20 Z" fill="#c2364b"/>
  </g>`;
const card = (x, y, rot = -8) => `
  <g transform="translate(${x} ${y}) rotate(${rot})">
    <rect x="-50" y="-34" width="100" height="68" rx="5" fill="#fffaf2"/>
    <path d="M-50 -34 L 0 4 L 50 -34" stroke="#e0d2c0" stroke-width="3" fill="none"/>
    <path d="M-8 6 C -16 -4 -4 -10 0 -2 C 4 -10 16 -4 8 6 L 0 14 Z" fill="#c2364b"/>
  </g>`;
const bg = (c1, c2) => `
  <defs><radialGradient id="g" cx="50%" cy="38%" r="75%"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></radialGradient></defs>
  <rect width="1200" height="1200" fill="url(#g)"/>
  <ellipse cx="600" cy="1015" rx="430" ry="46" fill="#000" opacity=".08"/>`;
const confetti = (colors) =>
  Array.from({ length: 26 }, (_, i) => {
    const x = (i * 263) % 1180 + 10;
    const y = (i * 151) % 520 + 40;
    return `<rect x="${x}" y="${y}" width="14" height="6" rx="2" fill="${colors[i % colors.length]}" transform="rotate(${(i * 37) % 180} ${x} ${y})" opacity=".7"/>`;
  }).join("");

const svg = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200">${inner}</svg>`;

// ---------------------------------------------------------------- cestas
// Ordem: fundo -> alça -> itens -> cesta (a frente da cesta cobre a base dos itens).
const X = 600, Y = 730, W = 780, H = 310;
const scene = (bgc, back, items, tone, dark, paper, ribbon) =>
  svg(`${bgc}${back}${handle(X, Y, W, H, dark)}${items}${basket(X, Y, W, H, tone, dark, paper, ribbon)}`);

const images = {
  "romantica-premium": scene(bg("#fbe9e7", "#f0cbc6"),
    `${heartBalloon(860, 250, 1.7)}${heartBalloon(980, 360, 1.2, "#e7788a")}`,
    `${bottle(430, 640, 2.4, "#5c1a2b")}${giftBox(830, 560, 190, 170, "#2b1d19", "#c9a063")}
     ${rose(610, 470, 1.8)}${rose(700, 520, 1.6, "#d9566b")}${rose(540, 540, 1.5, "#a82a3f")}${rose(660, 590, 1.3, "#c2364b")}
     ${card(300, 610, -14)}`,
    "#b07a45", "#8a5a2e", "#f4dcd6", "#c2364b"),
  "cafe-da-manha": scene(bg("#fdf3e1", "#f4dcb2"), "",
    `${bottle(380, 650, 2.1, "#f29b30", "#fff6e0", "#f6f1ea")}${mug(840, 560, 1.9)}
     ${croissant(620, 560, 2.2)}${bread(560, 650, 1.6)}
     ${orange(290, 660, 60)}${apple(960, 660, 56)}${orange(730, 650, 52)}`,
    "#c08a52", "#96622f", "#fff5e3", "#5d6b3a"),
  "aniversario": scene(bg("#e9f1f7", "#cbdded"),
    `${confetti(["#d94f63", "#f2b53a", "#7bb2d9", "#5f8f45"])}${roundBalloon(330, 300, 1.8, "#f2b53a")}${roundBalloon(880, 250, 2, "#d94f63")}${roundBalloon(620, 200, 1.6, "#7bb2d9")}`,
    `${cake(600, 560, 2.3)}${giftBox(330, 560, 170, 150, "#7bb2d9", "#fff")}${bottle(880, 640, 2, "#2f5d62", "#f3e6c8", "#c9a063")}`,
    "#b07a45", "#8a5a2e", "#fff", "#7bb2d9"),
  "chocolate": scene(bg("#f4e9e1", "#e0c7b3"), "",
    `${chocoBar(400, 560, 2.2, "#5a3526", "#c9a063", -14)}${chocoBar(560, 520, 2.3, "#3e2419", "#9a4a36", -4)}${chocoBar(720, 540, 2.2, "#6b4130", "#e8c39e", 9)}
     ${mug(900, 590, 1.7, "#fdf7f0", "#5a3526")}
     ${bonbon(300, 670, 44)}${bonbon(400, 690, 38, "#6b4130")}${bonbon(810, 690, 40)}${bonbon(700, 700, 36, "#3e2419")}`,
    "#9c6b3e", "#6f4622", "#e8c39e", "#5a3526"),
  "cafe-mini": scene(bg("#f1f4ea", "#d9e3c8"), "",
    `${mug(500, 570, 2.1, "#fff", "#5d6b3a")}${croissant(780, 600, 1.8)}${apple(300, 660, 62)}${orange(930, 670, 52)}${card(660, 680, 8)}`,
    "#c08a52", "#96622f", "#eef2e2", "#5d6b3a"),
  "mimo-romantico": scene(bg("#f7ecef", "#ebcfd7"), `${heartBalloon(300, 260, 1.5, "#e7788a")}`,
    `${bear(560, 560, 2.8)}${rose(820, 540, 1.8)}${rose(900, 600, 1.4, "#e7788a")}${bonbon(320, 670, 44, "#c2364b")}${bonbon(420, 690, 36)}`,
    "#d9b27c", "#a87c47", "#fff", "#c2364b"),
};

// ---------------------------------------------------------------- logo e capa
const logo = svg(`
  <rect width="1200" height="1200" fill="#fbf3ee"/>
  <circle cx="600" cy="600" r="470" fill="none" stroke="#9a4a36" stroke-width="18"/>
  <circle cx="600" cy="600" r="430" fill="none" stroke="#d9b27c" stroke-width="6"/>
  <text x="600" y="690" font-family="Georgia, 'Times New Roman', serif" font-size="360" font-style="italic" text-anchor="middle" fill="#9a4a36">E</text>
  <path d="M470 820 Q 600 760 730 820" stroke="#d9b27c" stroke-width="12" fill="none" stroke-linecap="round"/>
  <path d="M600 330 C 560 290 520 330 600 360 C 680 330 640 290 600 330 Z" fill="#c2364b"/>`);

// capa decorativa (o logo fica por cima, no centro de baixo): padrão de papel de presente
const cover = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="600" viewBox="0 0 1600 600">
  <defs>
    <linearGradient id="c" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#b8604a"/><stop offset="1" stop-color="#8f3f2e"/></linearGradient>
    <pattern id="p" width="120" height="120" patternUnits="userSpaceOnUse">
      <path d="M60 44 C 50 34 40 44 60 56 C 80 44 70 34 60 44 Z" fill="#f5d7cc" opacity=".35"/>
      <circle cx="0" cy="0" r="4" fill="#e3c07a" opacity=".5"/><circle cx="120" cy="120" r="4" fill="#e3c07a" opacity=".5"/>
      <circle cx="0" cy="120" r="4" fill="#e3c07a" opacity=".5"/><circle cx="120" cy="0" r="4" fill="#e3c07a" opacity=".5"/>
    </pattern>
  </defs>
  <rect width="1600" height="600" fill="url(#c)"/>
  <rect width="1600" height="600" fill="url(#p)"/>
  <path d="M0 300 C 400 240 1200 360 1600 300" stroke="#e3c07a" stroke-width="10" fill="none" opacity=".6"/>
</svg>`;

for (const [name, markup] of Object.entries(images)) {
  await sharp(Buffer.from(markup)).resize(1200, 1200).webp({ quality: 84 }).toFile(join(out, `${name}.webp`));
}
await sharp(Buffer.from(logo)).resize(600, 600).webp({ quality: 88 }).toFile(join(out, "logo.webp"));
await sharp(Buffer.from(cover)).resize(1600, 600).webp({ quality: 82 }).toFile(join(out, "capa.webp"));
writeFileSync(join(out, "LEIA.txt"), "Ilustrações geradas por scripts/generate-demo-images.mjs para a vitrine demo. Troque por fotos reais de cestas quando existirem.\n");
console.log("ok:", Object.keys(images).length + 2, "imagens em public/demo");
