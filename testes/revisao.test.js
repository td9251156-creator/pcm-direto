import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { carregar, estado } from '../src/estado.js';
import { telaRevisao } from '../src/telas/revisao.js';

class NodoFalso {
  constructor() {
    this.listeners = Object.create(null);
    this.textContent = '';
    this.classList = { contains: () => false };
  }

  addEventListener(tipo, fn) {
    this.listeners[tipo] = fn;
  }

  emitir(tipo, target) {
    this.listeners[tipo]?.({ target });
  }

  emit(tipo, target) {
    this.emitir(tipo, target);
  }

  focus() {
    document.activeElement = this;
  }
}

class EntradaFalsa extends NodoFalso {
  constructor(main, id, especialidade, valor) {
    super();
    this.main = main;
    this.id = id;
    this.value = valor;
    this.dataset = { especialidade };
    this.classList = { contains: (classe) => classe === 'capacidade' };
  }
}

class CargaFalsa extends NodoFalso {
  constructor(main) {
    super();
    this.main = main;
    this.html = '';
    this.campos = new Map();
  }

  set innerHTML(html) {
    this.html = html;
    for (const [chave, campo] of this.campos.entries()) {
      const novo = new EntradaFalsa(this.main, campo.id, campo.dataset.especialidade, campo.value);
      this.campos.set(chave, novo);
      this.main.elementos.set(chave, novo);
    }
  }

  get innerHTML() {
    return this.html;
  }

  registrarCampo(especialidade, valor = '') {
    const chave = `#cap-${especialidade}`;
    const campo = new EntradaFalsa(this.main, `cap-${especialidade}`, especialidade, valor);
    this.campos.set(chave, campo);
    this.main.elementos.set(chave, campo);
    return campo;
  }
}

class MainFalso {
  constructor() {
    this.html = '';
    this.elementos = new Map();
    this.elementos.set('#carga', new CargaFalsa(this));
    this.elementos.set('#tarefas', new NodoFalso());
    this.elementos.set('#inicio', new EntradaFalsa(this, 'inicio', '', ''));
    this.elementos.set('#desfazer', new NodoFalso());
    this.elementos.set('#ir-entrega', new NodoFalso());
    this.elementos.set('#abrir-todos', new NodoFalso());
  }

  set innerHTML(html) {
    this.html = html;
  }

  querySelector(seletor) {
    return this.elementos.get(seletor) ?? null;
  }
}

let quadros;
const concluirQuadros = () => quadros.splice(0).forEach((fn) => fn());

beforeEach(() => {
  quadros = [];
  vi.stubGlobal('requestAnimationFrame', (fn) => { quadros.push(fn); return quadros.length; });
  const dados = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (chave) => dados.get(chave) ?? null,
    setItem: (chave, valor) => dados.set(chave, String(valor)),
    removeItem: (chave) => dados.delete(chave),
  });
  vi.stubGlobal('document', {
    activeElement: null,
    getElementById: () => null,
  });
  carregar();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('tela de revisão', () => {
  it('preserva o foco do campo de capacidade quando a seta altera o mesmo controle', () => {
    const main = new MainFalso();
    telaRevisao(main, vi.fn());
    const campo = main.querySelector('#carga').registrarCampo('Operação');
    const seletor = '#cap-Operação';
    campo.focus();

    campo.value = '0.5';
    main.querySelector('#carga').emit('change', campo);
    concluirQuadros();

    const campoAtualizado = main.querySelector(seletor);
    expect(document.activeElement).toBe(campoAtualizado);
    expect(estado.capacidade[campo.dataset.especialidade]).toBe(0.5);

    campoAtualizado.value = '1';
    main.querySelector('#carga').emit('change', campoAtualizado);
    concluirQuadros();

    expect(document.activeElement).toBe(main.querySelector(seletor));
    expect(estado.capacidade[campo.dataset.especialidade]).toBe(1);
  });

  it('não puxa o foco de volta quando a alteração chega depois do blur', () => {
    const main = new MainFalso();
    telaRevisao(main, vi.fn());
    const campo = main.querySelector('#carga').registrarCampo('Operação');
    const outroCampo = { nome: 'outro' };
    document.activeElement = outroCampo;

    campo.value = '0.5';
    main.querySelector('#carga').emit('change', campo);
    concluirQuadros();

    expect(document.activeElement).toBe(outroCampo);
    expect(estado.capacidade[campo.dataset.especialidade]).toBe(0.5);
  });

  it('mantém o destino do Tab quando o change acontece antes da troca de foco', () => {
    const main = new MainFalso();
    telaRevisao(main, vi.fn());
    const carga = main.querySelector('#carga');
    const campo = carga.registrarCampo('Operação');
    const proximo = carga.registrarCampo('Mecânica');
    campo.focus();
    campo.value = '2';
    carga.emit('change', campo);
    proximo.focus();
    concluirQuadros();
    expect(document.activeElement).toBe(main.querySelector('#cap-Mecânica'));
    expect(estado.capacidade.Operação).toBe(2);
  });

  it('ignora um redesenho pendente se a tela já foi substituída', () => {
    const main = new MainFalso();
    telaRevisao(main, vi.fn());
    const carga = main.querySelector('#carga');
    const campo = carga.registrarCampo('Operação');
    campo.value = '2';
    carga.emit('change', campo);
    main.elementos.delete('#carga');
    expect(concluirQuadros).not.toThrow();
  });
});
