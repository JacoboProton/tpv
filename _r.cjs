const fs=require('fs');
const f='app/api/catalog/route.ts';
let s=fs.readFileSync(f,'utf8');
const from="      type ProductSet = {\n        name?: string; price?: string; description?: string;\n        showTpv?: boolean; showQr?: boolean; agotado?: boolean;\n        course?: string; ubicacion?: string; carouselSort?: number;\n      };";
const to="      type ProductSet = {\n        name?: string; price?: string; description?: string; cost?: string | number;\n        showTpv?: boolean; showQr?: boolean; agotado?: boolean;\n        course?: string; ubicacion?: string; carouselSort?: number;\n      };";
if(s.includes(to)){console.log('skip route');} else if(!s.includes(from)){console.error('NOT FOUND route');process.exit(1);} else {fs.writeFileSync(f,s.replace(from,to));console.log('ok route');}
