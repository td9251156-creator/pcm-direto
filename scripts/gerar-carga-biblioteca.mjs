// Gera supabase/carga/biblioteca_v2.sql a partir do manifesto do app (src/dados/biblioteca-pcm-v2.json).
// A carga entra como versão em desenvolvimento; publicar é um passo separado do mantenedor.
// Uso: node scripts/gerar-carga-biblioteca.mjs   (não acessa a rede nem o banco)
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const texto = (v) => `'${String(v).replace(/'/g, "''")}'`;

/** @param m manifesto; @param modelosV2 MODELOS_V2 de src/dados/modelos-v2.js (título com acento e grupo). */
export function cargaSql(m, modelosV2) {
  const grupo = new Map(modelosV2.map((x) => [x.codigo, [x.titulo, x.grupo]]));
  const versao = m.versao.replace(/^biblioteca-pcm-v/, ''); // ex.: biblioteca-pcm-v2.0.1 → 2.0.1
  const linhas = m.modelos.map((x) => {
    const [titulo, g] = grupo.get(x.codigo) ?? [x.titulo, 'Documentação'];
    const revisao = /_(R\d{2})\.(xlsx|docx)$/.exec(x.arquivo)[1];
    return `  (${[texto(x.codigo), texto(titulo), texto(g), texto(x.formato), texto(revisao), texto(x.arquivo), texto(x.sha256), x.bytes,
      `${texto(JSON.stringify(x.abas ?? []))}::jsonb`].join(', ')})`;
  });
  return `-- Gerado por scripts/gerar-carga-biblioteca.mjs a partir de src/dados/biblioteca-pcm-v2.json. Não edite à mão.
-- Carga inicial da Biblioteca PCM v2 ${versao} como versão EM DESENVOLVIMENTO (modelos em R00).
-- Execute como administrador depois das migrações 20261101120000 e 20261101120100. Não publica nada.
begin;
insert into public.biblioteca_versoes (versao, notas)
values (${texto(versao)}, 'Carga inicial a partir do manifesto do app; modelos em desenvolvimento.')
on conflict (versao) do nothing;
insert into public.biblioteca_modelos (versao_id, codigo, titulo, grupo, formato, revisao, arquivo, sha256, bytes, estrutura)
select v.id, d.* from public.biblioteca_versoes v cross join (values
${linhas.join(',\n')}
) as d(codigo, titulo, grupo, formato, revisao, arquivo, sha256, bytes, estrutura)
where v.versao = ${texto(versao)} and v.situacao = 'desenvolvimento'
on conflict (versao_id, codigo) do nothing;
commit;
`;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  // modelos-v2.js importa JSON no formato do Vite: carregado pelo próprio Vite, sem servidor HTTP.
  const { createServer } = await import('vite');
  const vite = await createServer({ root: fileURLToPath(new URL('..', import.meta.url)), logLevel: 'silent', server: { middlewareMode: true } });
  const { MODELOS_V2 } = await vite.ssrLoadModule('/src/dados/modelos-v2.js'); await vite.close();
  const manifesto = JSON.parse(await readFile(new URL('../src/dados/biblioteca-pcm-v2.json', import.meta.url), 'utf8'));
  await mkdir(new URL('../supabase/carga/', import.meta.url), { recursive: true });
  await writeFile(new URL('../supabase/carga/biblioteca_v2.sql', import.meta.url), cargaSql(manifesto, MODELOS_V2));
  console.log(`Carga gerada: ${manifesto.modelos.length} modelos da versão ${manifesto.versao}.`);
}
