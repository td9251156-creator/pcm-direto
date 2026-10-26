import {it,expect} from 'vitest';
import {existsSync,readFileSync} from 'node:fs';

it('mantém as referências internas da marca e o pacote de modelos fora da distribuição pública',()=>{
  for(const arquivo of ['marca/PCM-Direto-Manual-da-Marca.pptx','marca/PCM-Direto-Design-System.zip','marca/templates/PCMD-Modelo-Padrao.docx','marca/templates/PCMD-Modelo-Padrao.xlsx','modelos/refeitos/PCMD-refeitos.zip']){
    expect(existsSync('public/'+arquivo),arquivo).toBe(false);
  }
});

it('não oferece manual da marca nem downloads de modelos agrupados nas telas',()=>{
  const arquivos=['index.html','src/main.js','src/telas/mais.js','src/telas/modelos.js','src/telas/entrega-modelos.js','src/telas/documentos.js','src/telas/comunidade.js'];
  for(const arquivo of arquivos){
    const texto=readFileSync(arquivo,'utf8');
    expect(texto,arquivo).not.toMatch(/href=["']#marca["']|telaMarca|Manual da marca|\.zip/i);
  }
});
