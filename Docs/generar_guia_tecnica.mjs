import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(new URL('../frontend/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const directory = dirname(fileURLToPath(import.meta.url));
const basename = 'GUIA_TECNICA_CAMBIOS_2026-11-13';
const browser = await chromium.launch();
const screenshots = join(tmpdir(), 'hitschool-technical-guide');
await mkdir(screenshots, { recursive: true });
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 1250 }, deviceScaleFactor: 1.5 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(pathToFileURL(join(directory, `${basename}.html`)).href);
  await page.evaluate(() => document.fonts.ready);
  await page.emulateMedia({ media: 'print' });
  const layout = await page.locator('.page').evaluateAll(pages => pages.map((page, index) => {
    const content = page.querySelector('.page-content').getBoundingClientRect();
    const footer = page.querySelector('.footer').getBoundingClientRect();
    return { page: index + 1, title: page.querySelector('h2,h1').textContent.trim(),
      overflow: Math.round(content.bottom - footer.top + 10), horizontal: page.scrollWidth > page.clientWidth + 1 };
  }));
  const overflowing = layout.filter(page => page.overflow > 0 || page.horizontal);
  assert.deepEqual(errors, [], 'Browser rendering errors');
  assert.deepEqual(overflowing, [], 'Content must not overlap footers or exceed page width');
  const pdf = await page.pdf({ format: 'A4', preferCSSPageSize: true, printBackground: true,
    margin: { top: 0, bottom: 0, left: 0, right: 0 }, tagged: true, outline: true });
  const pageCount = (pdf.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length;
  assert.equal(pageCount, layout.length, 'PDF page count must match the designed layout');
  const pdfPath = join(directory, `${basename}.pdf`);
  await writeFile(pdfPath, pdf);
  await page.emulateMedia({ media: 'screen' });
  for (const index of [0, 4, 8, 11, 14, 17, 19, 20, 21]) {
    await page.locator('.page').nth(index).screenshot({ path: join(screenshots, `page-${index + 1}.png`) });
  }
  console.log(`Generated ${pdfPath}`);
  console.log(`${pageCount} A4 pages; no content/footer overlap or horizontal overflow.`);
  console.log(`Visual checks: ${screenshots}`);
} finally {
  await browser.close();
}