/* Massa de dados 100% FICTÍCIA (LGPD): nomes, telefones, endereços e e-mails inventados.
   Colunas espelham as lidas/gravadas em versao-nova/js/data.js
   (_parsePessoaFromDB, addMembro, updateMembro). */

const FOTO_FICTICIA =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'%3E%3Crect width='10' height='10' fill='%23888'/%3E%3C/svg%3E";

function celula(id, finalidade, diaSemana, horario, faixaEtaria = ['Adulto']) {
  return {
    id, finalidade, faixaEtaria: finalidade === 'Liderança' ? [] : faixaEtaria,
    diaSemana, horario, tipoEndereco: 'residencial',
    rua: '', numero: '', bairro: '', cidade: 'Mandaguari', complemento: ''
  };
}

function pessoa(dados) {
  return {
    id: dados.id,
    nome: dados.nome,
    foto_url: dados.foto_url ?? null,
    whatsapp: dados.whatsapp,
    data_nascimento: dados.data_nascimento || '1992-04-20',
    data_ingresso: dados.data_ingresso || '2022-02-13',
    tipo_ingresso: dados.tipo_ingresso || 'Recepção',
    sexo: dados.sexo,
    rua: dados.rua || 'Rua Fictícia das Palmeiras',
    numero: dados.numero || '100',
    complemento: dados.complemento ?? null,
    bairro: dados.bairro || 'Centro',
    cidade: dados.cidade || 'Mandaguari',
    status: dados.status || 'ATIVO',
    lider: dados.lider || '—',
    discipulador_id: dados.discipulador_id ?? null,
    e_lider: dados.e_lider ?? false,
    celulas_json: JSON.stringify(dados.celulas || []),
    referencia_externa: dados.referencia_externa ?? false,
    consentimento_aceito: dados.consentimento_aceito ?? false,
    consentimento_aceito_em: dados.consentimento_aceito_em ?? null,
    criado_em: '2024-01-10T12:00:00.000Z'
  };
}

const IDS = {
  silvano: 'pes-silvano', paulo: 'pes-paulo', carlos: 'pes-carlos', sergio: 'pes-sergio',
  ana: 'pes-ana', juliana: 'pes-juliana', jose: 'pes-jose', marcos: 'pes-marcos',
  conceicao: 'pes-conceicao', fernanda: 'pes-fernanda', roberto: 'pes-roberto'
};

const NOMES = {
  silvano: 'Silvano Teixeira Bastos',
  paulo: 'Paulo Henrique Duarte',
  carlos: 'Carlos Eduardo Mendes',
  sergio: 'Sérgio Lopes Vieira',
  ana: 'Ana Beatriz Rocha',
  juliana: 'Juliana Martins Costa',
  jose: 'José Antônio Ferreira',
  marcos: 'Marcos Vinícius Prado',
  conceicao: 'Maria da Conceição Lima',
  fernanda: 'Fernanda Souza Reis',
  roberto: 'Roberto Nunes Siqueira'
};

// Fillers: todos com "Santos" no nome (14) para testar paginação via busca.
const FILLERS = [
  ['pes-f01', 'Lucas Santos Moreira', 'MASCULINO', 'carlos'],
  ['pes-f02', 'Gabriel Santos Freitas', 'MASCULINO', 'carlos'],
  ['pes-f03', 'Mateus Santos Cardoso', 'MASCULINO', 'carlos'],
  ['pes-f04', 'Bruno Santos Ribeiro', 'MASCULINO', 'sergio'],
  ['pes-f05', 'Diego Santos Almeida', 'MASCULINO', 'sergio'],
  ['pes-f06', 'Felipe Santos Barros', 'MASCULINO', 'paulo'],
  ['pes-f07', 'Igor Santos Campos', 'MASCULINO', 'paulo'],
  ['pes-f08', 'Larissa Santos Melo', 'FEMININO', 'ana'],
  ['pes-f09', 'Camila Santos Teles', 'FEMININO', 'ana'],
  ['pes-f10', 'Patrícia Santos Pires', 'FEMININO', 'ana'],
  ['pes-f11', 'Renata Santos Farias', 'FEMININO', 'juliana'],
  ['pes-f12', 'Tatiane Santos Gusmão', 'FEMININO', 'juliana'],
  ['pes-f13', 'Vanessa Santos Queiroz', 'FEMININO', 'juliana'],
  ['pes-f14', 'Bianca Santos Lacerda', 'FEMININO', 'juliana']
];

const USUARIO_ADMIN = {
  id: 'usr-admin-01',
  nome: 'Admin Teste Fictício',
  email: 'admin@wave.test',
  senha_hash: 'SenhaFicticia@123',
  role: 'ADMIN',
  ativo: true,
  pessoa_id: null,
  whatsapp: '44900000001',
  telefone: '44900000001',
  foto_url: null
};

function buildSeed() {
  const pessoas = [
    // Referência externa (não pode aparecer em lista, busca, contagem ou dropdown)
    pessoa({ id: IDS.silvano, nome: NOMES.silvano, sexo: 'MASCULINO', whatsapp: '(44) 97777-0001', e_lider: true,
      referencia_externa: true, celulas: [celula('cel-silvano-1', 'Liderança', 'Segunda', '19:00')] }),
    // Líderes masculinos
    pessoa({ id: IDS.paulo, nome: NOMES.paulo, sexo: 'MASCULINO', whatsapp: '(44) 97777-0002', e_lider: true,
      lider: NOMES.silvano, discipulador_id: IDS.silvano,
      celulas: [celula('cel-paulo-1', 'Evangelística', 'Quarta', '20:00'), celula('cel-paulo-2', 'Liderança', 'Segunda', '19:30')] }),
    pessoa({ id: IDS.carlos, nome: NOMES.carlos, sexo: 'MASCULINO', whatsapp: '(44) 97777-0003', e_lider: true,
      lider: NOMES.paulo, discipulador_id: IDS.paulo,
      celulas: [celula('cel-carlos-1', 'Evangelística', 'Quinta', '20:00'), celula('cel-carlos-2', 'Liderança', 'Terça', '19:30')] }),
    pessoa({ id: IDS.sergio, nome: NOMES.sergio, sexo: 'MASCULINO', whatsapp: '(44) 97777-0004', e_lider: true,
      lider: NOMES.paulo, discipulador_id: IDS.paulo,
      celulas: [celula('cel-sergio-1', 'Evangelística', 'Sexta', '20:00')] }),
    // Líderes femininas
    pessoa({ id: IDS.ana, nome: NOMES.ana, sexo: 'FEMININO', whatsapp: '(44) 97777-0005', e_lider: true,
      celulas: [celula('cel-ana-1', 'Evangelística', 'Terça', '20:00'), celula('cel-ana-2', 'Liderança', 'Quarta', '19:30')] }),
    pessoa({ id: IDS.juliana, nome: NOMES.juliana, sexo: 'FEMININO', whatsapp: '(44) 97777-0006', e_lider: true,
      lider: NOMES.ana, discipulador_id: IDS.ana,
      celulas: [celula('cel-juliana-1', 'Evangelística', 'Sábado', '16:00')] }),
    // Discípulos com acento, consentimento LGPD e foto
    pessoa({ id: IDS.jose, nome: NOMES.jose, sexo: 'MASCULINO', whatsapp: '(44) 99876-5432',
      lider: NOMES.carlos, discipulador_id: IDS.carlos, tipo_ingresso: 'Batismo',
      data_nascimento: '1990-07-15', data_ingresso: '2021-05-02',
      rua: 'Rua das Acácias Fictícias', numero: '145', complemento: 'Casa 2', bairro: 'Jardim Esperança',
      foto_url: FOTO_FICTICIA, consentimento_aceito: true, consentimento_aceito_em: '2026-03-10T14:22:05.000Z' }),
    pessoa({ id: IDS.marcos, nome: NOMES.marcos, sexo: 'MASCULINO', whatsapp: '(44) 98111-2233',
      lider: NOMES.carlos, discipulador_id: IDS.carlos }),
    pessoa({ id: IDS.conceicao, nome: NOMES.conceicao, sexo: 'FEMININO', whatsapp: '(44) 98222-3344',
      lider: NOMES.ana, discipulador_id: IDS.ana,
      consentimento_aceito: true, consentimento_aceito_em: '2026-04-01T09:00:00.000Z' }),
    pessoa({ id: IDS.fernanda, nome: NOMES.fernanda, sexo: 'FEMININO', whatsapp: '(44) 98333-4455',
      lider: NOMES.ana, discipulador_id: IDS.ana }),
    // Inativo (reativação)
    pessoa({ id: IDS.roberto, nome: NOMES.roberto, sexo: 'MASCULINO', whatsapp: '(44) 98444-5566', status: 'INATIVO' })
  ];

  FILLERS.forEach(([id, nome, sexo, chaveLider], i) => {
    pessoas.push(pessoa({
      id, nome, sexo,
      whatsapp: `(44) 91000-00${String(i + 1).padStart(2, '0')}`,
      lider: NOMES[chaveLider], discipulador_id: IDS[chaveLider]
    }));
  });

  return {
    pessoas,
    usuarios: [{ ...USUARIO_ADMIN }]
  };
}

/** Sessão no formato salvo por WaveAuth._saveSession (sessionStorage 'wave_auth_session'). */
function sessaoAdmin() {
  return {
    user: {
      id: USUARIO_ADMIN.id,
      nome: USUARIO_ADMIN.nome,
      email: USUARIO_ADMIN.email,
      role: USUARIO_ADMIN.role,
      pessoaId: USUARIO_ADMIN.pessoa_id,
      whatsapp: USUARIO_ADMIN.whatsapp,
      telefone: USUARIO_ADMIN.telefone,
      foto: null
    }
  };
}

module.exports = { buildSeed, sessaoAdmin, IDS, NOMES, FILLERS, USUARIO_ADMIN, FOTO_FICTICIA };
