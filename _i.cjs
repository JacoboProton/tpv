const fs=require('fs');
const f='modules/reports/InformesView.tsx';
let s=fs.readFileSync(f,'utf8');
if(!s.includes('const { catalog } = useCatalog();')){
  s=s.replace("  const { sales } = useSales();", "  const { sales } = useSales();\n  const { catalog } = useCatalog();");
  console.log('added catalog destructure');
} else console.log('skip destructure');
if(s.includes('for (const p of catalog?.products ?? [])')) {console.log('skip guard');}
else { s=s.replace('for (const p of catalog.products)', 'for (const p of catalog?.products ?? [])'); console.log('guarded null'); }
fs.writeFileSync(f,s);
