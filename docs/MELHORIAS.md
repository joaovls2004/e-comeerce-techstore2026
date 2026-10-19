# O que foi corrigido e o que ainda pode melhorar

## 1. Problemas encontrados no projeto original

### Estrutura
| Problema | Correção |
|---|---|
| 9 páginas estavam **vazias (0 bytes)**: `carrinho`, `contato`, `sobre` e os 6 `filtro*.html` | Todas foram criadas. Os 6 filtros viraram uma única página, `catalogo.html?cat=...` |
| 50 páginas de produto quase idênticas (mesmo cabeçalho, rodapé e estrutura copiados 50 vezes) | Uma única `produto.html` lê os dados de `assets/js/data.js`. Para mudar o layout, edita-se 1 arquivo, não 50 |
| Dois menus principais (`menuprincipal.html` e `menuprincipalrevisado.html`). O "revisado" apontava para imagens que não existem (`banner-1.png`, `produto-1.png`…) | Virou `index.html`, com as imagens certas |
| Link do menu `filtroperiférico2.html` (com acento) não existia; o arquivo se chamava `filtroperif#U00e9rico2.html` | Link correto: `catalogo.html?cat=perifericos` |
| Links com barra inicial (`/filtrovideo4.html`) não funcionam abrindo o arquivo direto; e havia erro de digitação `href="..."a>` | Todos os links são relativos e conferidos |
| As páginas de **áudio** apontavam para a categoria **vídeo** | Cada produto aponta para a sua categoria |
| 6 páginas de produto apontavam para foto inexistente (`audio05`, `audio07`, `monitores03/04/06/08`) | Fotos associadas pelo id do produto |
| `monitores01` usava a foto de `audio10` e `video09` repetia a foto de `video08` | Cada produto tem a sua foto |
| **Periféricos: 10 fotos, nenhuma página** | Criados 10 produtos (`perifericos01` a `10`), escritos a partir do que aparece nas fotos. Revise-os |

### HTML
- `lang="en"` em 34 páginas de produto (o site é em português): agora `pt-BR`.
- Vários `<h1>` por página (logo, frase e "PRODUTO"): agora há um `<h1>` por página.
- Títulos de teste na tela, como `Áudio > Categoria` e o rótulo `PRODUTO`: trocados por breadcrumb real (Início / Áudio / produto).
- Imagens sem `alt`, `<img ...png"width="500px">` sem espaço entre atributos, `<ul>` sem fechar em `monitores09` (que também não tinha rodapé).
- Sem `<meta description>` e sem favicon: adicionados.

### Conteúdo
- `monitores02` (Cabo HDMI 8K) tinha título de cabo, mas **descrição e `<h2>` do suporte de monitor**; `monitores05` tinha a frase de efeito no lugar do nome. Corrigidos.
- `video08`, `video09` e `video10` não tinham frase de destaque. Foram escritas.
- As especificações misturavam **anotações suas para si mesmo** (`(confirmar)`, "Observação: não prometa esse benefício…", listas de atributos sem valor). Tudo isso saiu do site e foi para `docs/PENDENCIAS.md`.
- `monitores04` prometia "luz azul" sem confirmação. O texto ficou neutro.
- Rodapé com rótulos de rascunho visíveis ("Coluna: Departamentos", "Barra inferior", "Título:", "Botão:") e departamentos que a loja não vende (Notebooks, Smartphones, Games). Foi reescrito com as categorias reais.

### Imagens e desempenho
- As imagens somavam cerca de **18 MB**. Fotos em PNG de até 570 KB cada, o logo em 2720×720 com margens enormes, e as mesmas fotos copiadas 3 vezes (`banner_carrossel`, `menu-9principais` e a pasta da categoria).
- Agora: fotos em WebP de no máximo 800 px (**cerca de 1,2 MB no total**), logo recortado e uma só cópia de cada foto.
- Nomes como `Captura de tela 2026-09-24 113025.png` viraram `audio01.webp`. Foram removidos os `desktop.ini` e as cópias "- Copia" dos wireframes.

### CSS
- O `style.css` só era usado em uma página; as 50 páginas de produto não tinham estilo nenhum. Agora todas as páginas usam o mesmo CSS, organizado em seções e com variáveis de cor e fonte.

## 2. Estilo (design)
- **Cores:** o azul vem do próprio logo (`#2563eb`). O menta é herança do seu cabeçalho aquamarine e aparece só em detalhes.
- **Mantive suas ideias:** a borda que brilha ao passar o mouse (`--glow`) e a frase em Sekuya.
- **Layout do seu wireframe:** logo, frase, menu (☰ com Início, Produtos, Sobre, Contato, Carrinho), barra de categorias, carrossel e produtos.
- O brilho ciano ganhou um papel: destacar a foto do produto no carrossel.
- Fotos com fundo branco em cartões com `object-fit: contain`, para que nenhuma seja cortada, mesmo com proporções diferentes.

## 3. Funcionalidades novas
- **Carrossel** com setas, bolinhas, pausa, deslizar no celular e sem rotação automática para quem pede menos movimento.
- **Catálogo** com busca (ignora acentos) e ordenação por preço ou nome.
- **Página de produto** com preço, valor no Pix, parcelas, quantidade, "Adicionar ao carrinho", "Comprar agora", descrição, especificações e produtos relacionados.
- **Carrinho** que guarda os itens no navegador (`localStorage`), com quantidade, remoção, resumo e contador no cabeçalho. O botão "Finalizar compra" mostra um aviso de demonstração, porque não há pagamento.
- **Contato** com validação campo a campo e mensagens de erro claras. Ao enviar, abre o seu app de e-mail com a mensagem pronta.
- **Newsletter** com validação (só mostra a confirmação; não grava o e-mail).
- **Acessibilidade:** link "Pular para o conteúdo", foco visível, rótulos ARIA, navegação por teclado, `Esc` fecha o menu, textos alternativos.
- **Responsivo:** testado em 1280 px e 390 px de largura.

## 4. Pontos de melhoria (próximos passos)
1. **Preços e estoque reais.** Os preços atuais são fictícios. Com muitos produtos, considere uma planilha ou CMS em vez de editar `data.js`.
2. **Pagamento e frete de verdade.** Hoje o carrinho é só visual. Para vender, é preciso um backend ou uma plataforma (Mercado Pago, Stripe, Shopify, Nuvemshop…) que valide preço e estoque no servidor; o navegador nunca deve ser a fonte do valor cobrado. Inclua também o cálculo de frete por CEP.
3. **Fotos.** As imagens parecem capturas de tela de outros sites. Para publicar, use fotos fornecidas pelo fabricante/fornecedor ou fotos próprias, para evitar problemas de direitos autorais.
4. **Páginas legais.** Termos de uso, Política de privacidade e Cookies (LGPD) ainda não existem. São obrigatórias para vender.
5. **Categorias.** Alguns produtos estão em categorias estranhas (espuma de limpeza e suporte de celular em Áudio; webcam, hub e soundbar em Monitores; fone Bluetooth em Acessórios). Vale reorganizar e adicionar filtros por marca e faixa de preço.
6. **SEO.** Como o conteúdo é montado por JavaScript, buscadores enxergam menos. Para publicar, vale gerar páginas estáticas (por exemplo com Eleventy ou Astro) ou usar uma plataforma de e-commerce.
7. **Fontes locais.** Baixar as fontes e servir do próprio site elimina a dependência do Google Fonts (também ajuda com a LGPD).
8. **Hospedagem.** Dá para publicar de graça no GitHub Pages, Netlify ou Cloudflare Pages.
9. **Dados reais da empresa.** CNPJ, endereço e WhatsApp ainda são os de exemplo.
10. **Testes e medição.** Rodar o Lighthouse (desempenho, acessibilidade, SEO) depois de publicar.
