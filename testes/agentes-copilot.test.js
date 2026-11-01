import { it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { TIPOS_TAREFA } from '../scripts/validar-proposta-maquinas.mjs';

const ler = (c) => readFileSync(c, 'utf8').replace(/\r\n/g, '\n'); // checkout no Windows
const AGENTES = ['.github/agents/banco-maquinas.agent.md', '.github/agents/redes-sociais.agent.md'];
const PROMPTS = ['.github/prompts/coordenar.prompt.md', '.github/prompts/alimentar-banco-maquinas.prompt.md', '.github/prompts/redes-sociais.prompt.md'];
const SKILLS = ['.github/skills/alimentar-banco-maquinas/SKILL.md', '.github/skills/redes-sociais/SKILL.md'];

it('agentes, prompts e skills existem, têm descrição e apontam para arquivos que existem', () => {
  for (const arquivo of [...AGENTES, ...PROMPTS, ...SKILLS]) {
    expect(existsSync(arquivo), arquivo).toBe(true);
    const texto = ler(arquivo);
    expect(texto, arquivo).toMatch(/^---\n[\s\S]*?\bdescription: .+\n[\s\S]*?---\n/);
    // Todo caminho citado entre crases (arquivo ou pasta do projeto) precisa existir.
    for (const [, caminho] of texto.matchAll(/`((?:\.github|src|scripts|docs|propostas-maquinas|divulgacao|public|supabase)\/[^`*<>\s]*?)`/g)) {
      const limpo = caminho.replace(/\/$/, '');
      expect(existsSync(limpo), `${arquivo} cita ${caminho}`).toBe(true);
    }
  }
  for (const s of SKILLS) expect(ler(s)).toContain('.github/agents/');
  expect(ler('.github/prompts/alimentar-banco-maquinas.prompt.md')).toContain('banco-maquinas.agent.md');
  expect(ler('.github/prompts/redes-sociais.prompt.md')).toContain('redes-sociais.agent.md');
});

it('o agente do banco de máquinas usa os mesmos campos e tipos que o validador aceita', () => {
  const agente = ler('.github/agents/banco-maquinas.agent.md');
  for (const campo of ['componente', 'tipo_tarefa', 'exige_parada', 'modos_falha', 'itens_checklist', 'pecas_criticas', 'fabricante', 'modelo', 'fonte']) {
    expect(agente, campo).toContain(`\`${campo}\``);
  }
  for (const tipo of TIPOS_TAREFA) expect(agente, tipo).toContain(tipo);
  expect(ler('scripts/validar-proposta-maquinas.mjs')).toMatch(/pecas_criticas[\s\S]*itens_checklist|itens_checklist[\s\S]*pecas_criticas/);
});

it('os agentes nunca publicam e escrevem só na própria pasta; AGENTS.md e o guia apontam para eles', () => {
  const banco = ler('.github/agents/banco-maquinas.agent.md'); const redes = ler('.github/agents/redes-sociais.agent.md');
  expect(banco).toMatch(/só cria arquivos em `propostas-maquinas\/`/i);
  expect(redes).toMatch(/só cria ou altera arquivos em `divulgacao\/`/i);
  for (const t of [banco, redes]) expect(t).toMatch(/Não faça push, merge nem PR/);
  expect(redes).toMatch(/nunca publica/i);
  const agents = ler('AGENTS.md'); const guia = ler('docs/CONTRIBUIR-COM-IA.md');
  for (const arquivo of [...AGENTES, '.github/prompts/coordenar.prompt.md']) { expect(agents, arquivo).toContain(arquivo); expect(guia, arquivo).toContain(arquivo); }
  expect(ler('.github/prompts/coordenar.prompt.md')).toMatch(/um item por vez/);
});
