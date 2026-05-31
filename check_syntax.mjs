import { readFileSync } from 'fs';
import { parse } from '@babel/parser';

const code = readFileSync('All Module/Document/InternalTemplates.js', 'utf8');

try {
  parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'classProperties', 'optionalChaining', 'nullishCoalescingOperator'],
  });
  console.log('✅ No syntax errors found!');
} catch (e) {
  const lines = code.split('\n');
  const errLine = e.loc?.line;
  if (errLine) {
    console.error(`❌ Syntax error at line ${errLine}, column ${e.loc.column}:`);
    console.error(e.message);
    console.error('\nContext:');
    for (let i = Math.max(0, errLine - 5); i < Math.min(lines.length, errLine + 2); i++) {
      const marker = i + 1 === errLine ? '>>>' : '   ';
      console.error(`${marker} ${i + 1}: ${lines[i]}`);
    }
  } else {
    console.error(e.message);
  }
}
