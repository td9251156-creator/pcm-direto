import { describe, it, expect } from 'vitest';
import { CAMPOS_FEEDBACK, OPCOES_APOIO, novoFeedback, prepararFeedback } from '../src/logica/feedback.js';
import { readFileSync } from 'node:fs';
import { acessoAtual } from '../src/navegacao.js';

describe('questionário preparado no aparelho', () => {
  it('mantém as novas rotas localizadas na comunidade e em Mais no celular', () => {
    for(const rota of ['contribuir','feedback']){expect(acessoAtual(rota,false)).toBe('comunidade');expect(acessoAtual(rota,true)).toBe('mais');}
  });
  it('exige dificuldade, confere limites e não inclui campos estranhos', () => {
    expect(()=>prepararFeedback(novoFeedback())).toThrow('principal dificuldade');
    for(const c of CAMPOS_FEEDBACK.filter(c=>c.limite)){
      const r={...novoFeedback(),dificuldade:'Sem dificuldade',[c.id]:'x'.repeat(c.limite)};
      expect(()=>prepararFeedback(r)).not.toThrow();r[c.id]+='x';expect(()=>prepararFeedback(r)).toThrow(c.titulo);
    }
    expect(()=>prepararFeedback({...novoFeedback(),dificuldade:' ',apoio:'inválido'})).toThrow();
    const entrada={...novoFeedback(),dificuldade:'Uma dúvida fictícia',tag:'SEGREDO-NAO-ENVIAR',equipamentos:[{id:'ficticio'}]};
    const copia=structuredClone(entrada);const r=prepararFeedback(entrada);
    expect(r.texto).not.toContain('SEGREDO');expect(r.url).not.toContain('equipamentos');expect(entrada).toEqual(copia);
  });
  it('preserva acentos e caracteres especiais nos campos do formulário específico', () => {
    const r=prepararFeedback({...novoFeedback(),dificuldade:'Ação & revisão? #1 + 2',apoio:'Ambos',comentario:'<texto fictício>'});
    const url=new URL(r.url);expect(r.preenchido).toBe(true);
    expect(url.searchParams.get('template')).toBe('6-feedback-de-uso.yml');
    expect(url.searchParams.get('dificuldade')).toBe('Ação & revisão? #1 + 2');
    for(const c of CAMPOS_FEEDBACK)expect(readFileSync('.github/ISSUE_TEMPLATE/6-feedback-de-uso.yml','utf8')).toContain(`id: ${c.id}`);
    for(const apoio of OPCOES_APOIO)expect(()=>prepararFeedback({...novoFeedback(),dificuldade:'Nenhuma',apoio})).not.toThrow();
    expect(()=>prepararFeedback({...novoFeedback(),dificuldade:'Nenhuma',apoio:'outro'})).toThrow();
  });
  it('não trunca respostas quando o link excede 2.000 caracteres', () => {
    const comentario='á'.repeat(500);const r=prepararFeedback({...novoFeedback(),dificuldade:'ç'.repeat(500),faltou:'b'.repeat(500),comentario});
    expect(r.preenchido).toBe(false);expect(r.texto).toContain(comentario);
    expect(new URL(r.url).searchParams.size).toBe(1);expect(r.url.length).toBeLessThanOrEqual(2000);
  });
});
