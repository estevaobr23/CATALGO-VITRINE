import type { SectionDef } from "@/core/catalog/layout";

/**
 * Seções que a cesteira pode montar na vitrine (tela Aparência).
 * A ordem aqui é a sugestão de quem chega primeiro no "+ Adicionar seção".
 * `feature` = recurso travado no banco (o editor mostra cadeado e o upgrade).
 */
export const sections: SectionDef[] = [
  {
    id: "header",
    name: "Capa e marca",
    description: "Logo, nome da loja e sua frase de apresentação.",
    icon: "store",
    locked: true,
  },
  {
    id: "banner",
    name: "Aviso em destaque",
    description: "Uma tarja no topo para avisar o que é urgente: data limite de encomenda, promoção ou férias.",
    icon: "megaphone",
    fields: [
      {
        key: "texto",
        label: "Aviso",
        type: "text",
        maxLength: 120,
        placeholder: "Encomendas para o Dia das Mães até 05/05",
        hint: "Curto e direto. Aparece bem no topo da vitrine.",
      },
    ],
  },
  {
    id: "categorias",
    name: "Categorias",
    description: "Os botões que filtram as cestas (Café da Manhã, Românticas...).",
    icon: "tags",
    locked: true,
  },
  {
    id: "cestas",
    name: "Minhas cestas",
    description: "A grade com as cestas, fotos e preços. O coração da vitrine.",
    icon: "basket",
    locked: true,
  },
  {
    id: "galeria",
    name: "Galeria de fotos",
    description: "Fotos de cestas que você já entregou. Serve de portfólio, sem preço nem botão de pedido.",
    icon: "photos",
    managedAt: { href: "/app/galeria", label: "Gerenciar fotos da galeria" },
  },
  {
    id: "depoimentos",
    name: "O que dizem os clientes",
    description: "Recados de quem já comprou com você. É o que mais ajuda quem está em dúvida.",
    icon: "quote",
    feature: "testimonials",
    managedAt: { href: "/app/depoimentos", label: "Gerenciar depoimentos" },
  },
  {
    id: "video",
    name: "Vídeo",
    description: "Um vídeo do YouTube mostrando suas cestas sendo montadas ou entregues.",
    icon: "play",
    feature: "video",
    fields: [
      {
        key: "url",
        label: "Link do vídeo no YouTube",
        type: "url",
        maxLength: 300,
        placeholder: "https://www.youtube.com/watch?v=...",
        hint: "Cole o endereço do vídeo. Ele aparece dentro da vitrine.",
      },
      { key: "titulo", label: "Título (opcional)", type: "text", maxLength: 80, placeholder: "Veja como montamos suas cestas" },
    ],
  },
  {
    id: "sobre",
    name: "Sobre a loja",
    description: "Sua história em poucas linhas: quem faz, desde quando, o que torna suas cestas diferentes.",
    icon: "heart",
    fields: [
      { key: "titulo", label: "Título", type: "text", maxLength: 60, placeholder: "Sobre a nossa loja" },
      {
        key: "texto",
        label: "Texto",
        type: "textarea",
        maxLength: 1200,
        placeholder: "Montamos cestas artesanais desde 2019, com produtos escolhidos um a um...",
      },
    ],
  },
  {
    id: "duvidas",
    name: "Perguntas frequentes",
    description: "Responde de uma vez o que sempre perguntam: prazo, entrega, pagamento e personalização.",
    icon: "help",
    fields: [
      { key: "p1", label: "Pergunta 1", type: "text", maxLength: 120, placeholder: "Com quanto tempo preciso encomendar?" },
      { key: "r1", label: "Resposta 1", type: "textarea", maxLength: 400, placeholder: "Peço no mínimo 1 dia de antecedência..." },
      { key: "p2", label: "Pergunta 2", type: "text", maxLength: 120, placeholder: "Vocês entregam em qual região?" },
      { key: "r2", label: "Resposta 2", type: "textarea", maxLength: 400 },
      { key: "p3", label: "Pergunta 3", type: "text", maxLength: 120, placeholder: "Quais as formas de pagamento?" },
      { key: "r3", label: "Resposta 3", type: "textarea", maxLength: 400 },
      { key: "p4", label: "Pergunta 4", type: "text", maxLength: 120 },
      { key: "r4", label: "Resposta 4", type: "textarea", maxLength: 400 },
    ],
  },
  {
    id: "contato",
    name: "Contato e entrega",
    description: "WhatsApp, Instagram, cidade e como funciona a entrega, tudo junto no fim da página.",
    icon: "pin",
    fields: [
      {
        key: "horario",
        label: "Horário de atendimento (opcional)",
        type: "text",
        maxLength: 120,
        placeholder: "Seg a Sáb, das 8h às 18h",
      },
    ],
  },
];

export const sectionIds = sections.map((s) => s.id);
