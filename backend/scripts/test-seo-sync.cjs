// Ejecuta las pruebas TypeScript con el compilador ya instalado, sin procesos hijos.
const fs = require('node:fs');
const ts = require('typescript');
const previous = require.extensions['.ts'];
require.extensions['.ts'] = (module, filename) => {
  const result = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  module._compile(result.outputText, filename);
};
require('../tests/firebaseSeoSync.test.ts');
if (previous) require.extensions['.ts'] = previous;
else delete require.extensions['.ts'];
