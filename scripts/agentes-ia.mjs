import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 2_000_000 });

export function conferirAlteracoes(raw, numstat) {
  const partes = raw.split('\0').filter(Boolean);
  let arquivos = 0;
  for (let i = 0; i < partes.length; i += 2) {
    const registro = partes[i].match(/^:(\d{6}) (\d{6}) [a-f0-9]+ [a-f0-9]+ ([A-Z])$/);
    const caminho = partes[i + 1];
    if (!registro || !caminho) throw new Error('Formato de alteração não permitido.');
    const [, antes, depois, estado] = registro;
    const permitido = /^(src\/(?!dados\/)[a-zA-Z0-9_/-]+\.(js|css)|testes\/[a-zA-Z0-9_/-]+\.js|docs\/FILA\.md)$/.test(caminho);
    if (!permitido || caminho.split('/').some(p => p === '.' || p === '..') ||
        !['A', 'M'].includes(estado) || depois !== '100644' ||
        (estado === 'A' ? antes !== '000000' : antes !== '100644')) {
      throw new Error(`Alteração fora do escopo: ${caminho}`);
    }
    arquivos++;
  }
  if (arquivos > 12) throw new Error('Limite de 12 arquivos excedido.');
  let linhas = 0;
  const estatisticas = numstat.trim().split('\n').filter(Boolean);
  for (const estatistica of estatisticas) {
    const valores = estatistica.split('\t');
    if (!/^\d+$/.test(valores[0]) || !/^\d+$/.test(valores[1])) {
      throw new Error('Arquivo binário não permitido.');
    }
    linhas += Number(valores[0]) + Number(valores[1]);
  }
  if (estatisticas.length !== arquivos || linhas > 500) throw new Error('Limite ou estatística de linhas inválido.');
  return arquivos > 0;
}

export function conferirRevisao(texto) {
  const revisao = JSON.parse(texto);
  if (revisao.aprovado !== true || !Array.isArray(revisao.achados) || revisao.achados.length !== 0) {
    throw new Error('A revisão independente não aprovou o candidato.');
  }
}

function conferirBase() {
  if (!/^[a-f0-9]{40}$/.test(process.env.PCM_BASE_SHA || '') ||
      git('rev-parse', 'HEAD').trim() !== process.env.PCM_BASE_SHA) {
    throw new Error('A base foi alterada; candidato recusado.');
  }
}

function conferirIndice() {
  return conferirAlteracoes(git('diff', '--cached', '--raw', '--no-renames', '-z'),
    git('diff', '--cached', '--numstat', '--no-renames'));
}

export function executar(comando, arquivo) {
  if (!arquivo) throw new Error('Informe o arquivo de entrada ou saída.');
  if (comando === 'conferir-revisao') {
    conferirRevisao(readFileSync(arquivo, 'utf8'));
    return;
  }
  conferirBase();
  if (comando === 'empacotar') {
    git('add', '--all');
    const alterado = conferirIndice();
    const patch = git('diff', '--cached', '--binary', '--no-renames', '--full-index');
    if (Buffer.byteLength(patch) > 100_000) throw new Error('Patch excede 100 KB.');
    writeFileSync(arquivo, patch);
    process.stdout.write(String(alterado));
  } else if (comando === 'aplicar') {
    const patch = readFileSync(arquivo);
    if (!patch.length || patch.length > 100_000) throw new Error('Tamanho de patch inválido.');
    if (git('status', '--porcelain').trim()) throw new Error('Checkout de validação precisa estar limpo.');
    git('apply', '--check', '--index', '--', arquivo);
    git('apply', '--index', '--', arquivo);
    if (!conferirIndice()) throw new Error('Candidato sem alterações.');
  } else {
    throw new Error('Comando desconhecido.');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    executar(process.argv[2], process.argv[3]);
  } catch (erro) {
    console.error(erro.message);
    process.exitCode = 1;
  }
}
