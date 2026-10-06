// Generate a compact JSON for the lens configurator
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const wb = XLSX.readFile(path.join(__dirname, 'base_precificacao_lentes_auditada.xlsx'));
const ws = wb.Sheets['EXPORT_WEB'];
const data = XLSX.utils.sheet_to_json(ws);

// Only include DISPONÍVEL items
const available = data.filter(r => r.Status_Disponibilidade === 'DISPONÍVEL');

console.log(`Total available: ${available.length} / ${data.length}`);

// Build a compact tree structure:
// marca → categoria → produto → opção → {material, indice, tratamento, preco}[]
const tree = {};

available.forEach(r => {
  const marca = r.Marca;
  const cat = r.Categoria;
  const produto = r.Produto;
  const opcao = r.Opcao || 'Padrão';
  
  if (!tree[marca]) tree[marca] = {};
  if (!tree[marca][cat]) tree[marca][cat] = {};
  if (!tree[marca][cat][produto]) tree[marca][cat][produto] = {};
  if (!tree[marca][cat][produto][opcao]) tree[marca][cat][produto][opcao] = [];
  
  tree[marca][cat][produto][opcao].push({
    m: r.Material,
    i: r.Indice || '',
    t: r.Tratamento,
    p: r['Preco_Par_R$'],
    e: r.Esferico || ''
  });
});

// Sort variants by price
for (const marca of Object.values(tree)) {
  for (const cat of Object.values(marca)) {
    for (const produto of Object.values(cat)) {
      for (const opcao of Object.keys(produto)) {
        produto[opcao].sort((a, b) => a.p - b.p);
      }
    }
  }
}

const json = JSON.stringify(tree);
fs.writeFileSync(path.join(__dirname, '..', 'lentes-data.json'), json);
console.log(`Output size: ${(json.length / 1024).toFixed(1)} KB`);

// Also compute simplified category labels for better UX
const catLabels = {
  'Visão Simples': 'Visão Simples',
  'Visão Simples Digital': 'Visão Simples Digital',
  'Visão Simples Especial': 'Visão Simples Especial',
  'Visão Simples Jovem': 'Visão Simples Jovem',
  'Progressiva': 'Progressiva',
  'Progressiva Especial': 'Progressiva Especial',
  'Progressiva Freeform': 'Progressiva Freeform',
  'Progressiva ILT': 'Progressiva ILT',
  'Progressiva B.I.G. NORM': 'Progressiva B.I.G. NORM',
  'Progressiva AdaptiveSun': 'Progressiva AdaptiveSun',
  'Ocupacional': 'Ocupacional',
  'Ocupacional B.I.G. NORM': 'Ocupacional B.I.G. NORM',
  'Bifocal': 'Bifocal',
  'Controle de Miopia': 'Controle de Miopia',
  'Monofocal Rodenstock': 'Monofocal',
  'Monofocal Acabada': 'Monofocal Acabada',
  'Monofocal B.I.G. NORM': 'Monofocal B.I.G. NORM',
  'Mono Plus B.I.G. NORM': 'Mono Plus B.I.G. NORM',
  'Especial Digital': 'Especial Digital',
  'Lentes Prontas': 'Lentes Prontas',
  'Netline': 'Netline',
  'AdaptiveSun': 'AdaptiveSun',
  'Asiana': 'Asiana'
};

// Group categories into user-friendly groups
const catGroups = {
  'Visão Simples': ['Visão Simples', 'Visão Simples Digital', 'Visão Simples Especial', 'Visão Simples Jovem', 'Monofocal Rodenstock', 'Monofocal Acabada', 'Monofocal B.I.G. NORM', 'Mono Plus B.I.G. NORM'],
  'Progressiva / Multifocal': ['Progressiva', 'Progressiva Especial', 'Progressiva Freeform', 'Progressiva ILT', 'Progressiva B.I.G. NORM', 'Progressiva AdaptiveSun'],
  'Ocupacional': ['Ocupacional', 'Ocupacional B.I.G. NORM'],
  'Especiais': ['Controle de Miopia', 'Especial Digital', 'Bifocal', 'Lentes Prontas', 'Netline', 'AdaptiveSun', 'Asiana']
};

console.log('\nCategory groups for UX:');
Object.entries(catGroups).forEach(([group, cats]) => {
  const count = cats.reduce((sum, c) => {
    let total = 0;
    Object.values(tree).forEach(marca => {
      if (marca[c]) {
        Object.values(marca[c]).forEach(prod => {
          Object.values(prod).forEach(opts => {
            total += opts.length;
          });
        });
      }
    });
    return sum + total;
  }, 0);
  console.log(`  ${group}: ${count} SKUs (${cats.join(', ')})`);
});
