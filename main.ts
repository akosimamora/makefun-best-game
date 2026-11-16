// Ember Warden — best-game-01 entry program (Node 22, standard library only).
// The game is plain static files under game/ beside this file, plus 3-4
// screenshots/ renders of it. This program hands the entry in: it copies
// game/ and screenshots/ into the output directory and writes dossier.json
// with the kit's buildDossier library, so the judge can read the entry.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function copyTree(from, to) {
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true });
}

copyTree(join(repoRoot, 'game'), join(outputDir, 'game'));
if (existsSync(join(repoRoot, 'screenshots'))) {
  copyTree(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'));
}

// The caps are the scorer's own: only text_max_bytes shapes the dossier's
// bytes; the rest refuse an entry the scorer would refuse anyway, so the
// program never hands in something the gate rejects on size alone.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
