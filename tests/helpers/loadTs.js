import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ts from 'typescript';

/**
 * Loads and transpiles a TypeScript file on-the-fly using the installed TypeScript compiler,
 * allowing pure Node.js execution without tsx or ts-node.
 */
export async function loadTsModule(relativePath, importMetaUrl) {
  const callerDir = path.dirname(fileURLToPath(importMetaUrl));
  const fullPath = path.resolve(callerDir, relativePath);
  const tsCode = fs.readFileSync(fullPath, 'utf8');
  const jsCode = ts.transpileModule(tsCode, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;

  const base64 = Buffer.from(jsCode).toString('base64');
  return import(`data:text/javascript;base64,${base64}`);
}
