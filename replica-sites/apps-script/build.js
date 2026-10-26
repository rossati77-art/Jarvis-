// node build.js  -> crea index.html (pagina + shim) da incollare in Apps Script
const fs=require('fs');
let h=fs.readFileSync(__dirname+'/../gestionale-sorgente.html','utf8');
const shim=fs.readFileSync(__dirname+'/shim.js','utf8');
if(!h.includes('<body>'))throw new Error('body non trovato');
h=h.replace('<body>','<body>\n<script>\n'+shim+'\n</script>');
fs.writeFileSync(__dirname+'/index.html',h);
console.log('index.html scritto',h.length,'byte');
