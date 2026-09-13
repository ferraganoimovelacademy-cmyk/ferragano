import { readFile } from 'fs/promises';
import { join } from 'path';

async function checkRouteFile(filePath: string) {
  try {
    const content = await readFile(filePath, 'utf-8');
    if (!content.includes('createFileRoute')) {
      console.error(`[FAIL] ${filePath} does not export createFileRoute correctly.`);
      process.exit(1);
    }
    console.log(`[OK] ${filePath} checked.`);
  } catch (err) {
    console.error(`[ERROR] Could not read ${filePath}:`, err);
    process.exit(1);
  }
}

async function run() {
  await checkRouteFile(join(process.cwd(), 'src/routes/manifest[.]json.ts'));
  await checkRouteFile(join(process.cwd(), 'src/routes/robots[.]txt.ts'));
}

run();
