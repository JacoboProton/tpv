import { readFileSync, writeFileSync } from 'fs';

const filePath = 'app/page.tsx';
let src = readFileSync(filePath, 'utf8');

const methods = ['filter', 'map', 'forEach', 'find', 'some', 'every', 'flatMap'];

for (const m of methods) {
  const re1 = new RegExp('\\.' + m + '\\(([a-z_$][a-z0-9_$]*)\\s*=>', 'gi');
  src = src.replace(re1, '.' + m + '(($1: any) =>');

  const re2 = new RegExp('\\.' + m + '\\(\\(([a-z_$][a-z0-9_$]*)\\s*,', 'gi');
  src = src.replace(re2, '.' + m + '(($1: any,');
}

const reReduce = /\.reduce\(\(([a-z_$][a-z0-9_$]*)\s*,\s*([a-z_$][a-z0-9_$]*)\)\s*=>/gi;
src = src.replace(reReduce, (m: string, p1: string, p2: string) => '.reduce((' + p1 + ': any, ' + p2 + ': any) =>');

const reSort = /\.sort\(\(([a-z_$][a-z0-9_$]*)\s*,\s*([a-z_$][a-z0-9_$]*)\)\s*=>/gi;
src = src.replace(reSort, (m: string, p1: string, p2: string) => '.sort((' + p1 + ': any, ' + p2 + ': any) =>');

writeFileSync(filePath, src, 'utf8');
console.log('Done - callbacks fixed');
