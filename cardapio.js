// Estado da aplicação
let produtos = [];
let categorias = [];
let adicionais = [];
let carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];
let carrinhoAberto = false;
let categoriasRenderizadas = false;
let produtoSelecionado = null;
let adicionaisSelecionados = [];
let observacoesAtuais = '';

// Elementos do DOM
const produtosGrid = document.getElementById('produtosGrid');
const categoriasList = document.getElementById('categoriasList');
const searchProdutos = document.getElementById('searchProdutos');
const carrinhoInfo = document.getElementById('carrinhoInfo');
const carrinhoCount = document.getElementById('carrinhoCount');
const carrinhoTotal = document.getElementById('carrinhoTotal');
const verCarrinhoBtn = document.getElementById('verCarrinhoBtn');
const carrinhoModal = document.getElementById('carrinhoModal');
const closeCarrinhoBtn = document.getElementById('closeCarrinhoBtn');
const carrinhoEmpty = document.getElementById('carrinhoEmpty');
const carrinhoItems = document.getElementById('carrinhoItems');
const limparCarrinhoBtn = document.getElementById('limparCarrinhoBtn');
const finalizarPedidoBtn = document.getElementById('finalizarPedidoBtn');
const subtotal = document.getElementById('subtotal');
const totalCarrinho = document.getElementById('totalCarrinho');
const produtoModal = document.getElementById('produtoModal');
const produtoModalBody = document.getElementById('produtoModalBody');
const closeProdutoBtn = document.getElementById('closeProdutoBtn');
const adicionaisModal = document.getElementById('adicionaisModal');
const produtoSelecionadoInfo = document.getElementById('produtoSelecionadoInfo');
const adicionaisList = document.getElementById('adicionaisList');
const observacoesProduto = document.getElementById('observacoesProduto');
const resumoProdutoPreco = document.getElementById('resumoProdutoPreco');
const resumoAdicionaisPreco = document.getElementById('resumoAdicionaisPreco');
const resumoTotal = document.getElementById('resumoTotal');
const closeAdicionaisBtn = document.getElementById('closeAdicionaisBtn');
const cancelarAdicionaisBtn = document.getElementById('cancelarAdicionaisBtn');
const confirmarAdicionaisBtn = document.getElementById('confirmarAdicionaisBtn');

// Inicializar aplicação
document.addEventListener('DOMContentLoaded', function() {
    console.log("Iniciando cardápio (Supabase)...");
    
    // Configurar eventos
    setupEventListeners();
    
    // Carregar produtos
    carregarProdutos();
    
    // Carregar adicionais
    carregarAdicionais();
    
    // Atualizar carrinho
    atualizarCarrinho();
});

// Mostrar erro
function mostrarErro(mensagem) {
    const produtosGrid = document.getElementById('produtosGrid');
    if (produtosGrid) {
        produtosGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 40px 20px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #ef4444; margin-bottom: 16px;"></i>
                <h3 style="color: #1e293b; margin-bottom: 8px;">${mensagem}</h3>
                <p style="color: #64748b; margin-bottom: 16px;">Tente recarregar a página</p>
                <button onclick="window.location.reload()" style="padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
                    <i class="fas fa-redo"></i> Recarregar
                </button>
            </div>
        `;
    }
}

// Configurar eventos
function setupEventListeners() {
    // Busca de produtos
    if (searchProdutos) searchProdutos.addEventListener('input', filtrarProdutos);
    
    // Carrinho
    if (carrinhoInfo) carrinhoInfo.addEventListener('click', abrirCarrinho);
    if (verCarrinhoBtn) verCarrinhoBtn.addEventListener('click', abrirCarrinho);
    if (closeCarrinhoBtn) closeCarrinhoBtn.addEventListener('click', fecharCarrinho);
    if (limparCarrinhoBtn) limparCarrinhoBtn.addEventListener('click', limparCarrinho);
    if (finalizarPedidoBtn) finalizarPedidoBtn.addEventListener('click', finalizarPedido);
    
    // Modal do produto
    if (closeProdutoBtn) closeProdutoBtn.addEventListener('click', fecharModalProduto);
    
    // Modal de adicionais
    if (closeAdicionaisBtn) closeAdicionaisBtn.addEventListener('click', fecharModalAdicionais);
    if (cancelarAdicionaisBtn) cancelarAdicionaisBtn.addEventListener('click', fecharModalAdicionais);
    if (confirmarAdicionaisBtn) confirmarAdicionaisBtn.addEventListener('click', confirmarAdicionais);
    if (observacoesProduto) observacoesProduto.addEventListener('input', function() {
        observacoesAtuais = this.value;
    });
    
    // Fechar modais ao clicar fora
    if (carrinhoModal) {
        carrinhoModal.addEventListener('click', function(e) {
            if (e.target === carrinhoModal) fecharCarrinho();
        });
    }
    
    if (produtoModal) {
        produtoModal.addEventListener('click', function(e) {
            if (e.target === produtoModal) fecharModalProduto();
        });
    }
    
    if (adicionaisModal) {
        adicionaisModal.addEventListener('click', function(e) {
            if (e.target === adicionaisModal) fecharModalAdicionais();
        });
    }
    
    // Configurar evento do botão "Todos" manualmente
    const todosBtn = document.querySelector('[data-categoria="todos"]');
    if (todosBtn) {
        todosBtn.addEventListener('click', function() {
            filtrarPorCategoria('todos');
        });
    }
}

// Carregar produtos do Supabase
async function carregarProdutos() {
    console.log("Conectando ao Supabase...");
    
    const supabase = getSupabaseClient();
    if (!supabase) {
        mostrarErro("Erro ao conectar com o servidor");
        return;
    }
    
    const loadingElement = produtosGrid ? produtosGrid.querySelector('.loading-produtos') : null;
    const emptyState = document.getElementById('emptyState');
    
    // Mostrar loading
    if (loadingElement) loadingElement.style.display = 'flex';
    if (emptyState) emptyState.style.display = 'none';
    
    try {
        // Buscar produtos ativos (status = 'on' ou true)
        const { data, error } = await supabase
            .from('produtos')
            .select('*')
            .or('status.eq.on,status.eq.ativo,status.eq.true')
            .order('data_cadastro', { ascending: false });
        
        if (error) throw error;
        
        console.log(`✅ Recebidos ${data.length} produtos do Supabase`);
        
        produtos = [];
        categorias = new Set(['todos']);
        
        data.forEach((produto) => {
            const quantidadeProduto = produto.quantidade || produto.quantidade_estoque || 0;
            
            // Verificar se é produto normal (não adicional)
            if (produto.tipo !== 'adicional') {
                produtos.push({
                    id: produto.id,
                    nome: produto.nome || "Produto sem nome",
                    descricao: produto.descricao || "",
                    preco: produto.preco || 0,
                    quantidade: quantidadeProduto,
                    categoria: produto.categoria || "outro",
                    imagemURL: produto.imagem_url || "",
                    status: produto.status || "off",
                    tipo: produto.tipo || "normal"
                });
                
                if (produto.categoria) {
                    categorias.add(produto.categoria);
                }
            }
        });
        
        console.log(`📊 ${produtos.length} produtos normais processados`);
        console.log(`📁 Categorias encontradas: ${Array.from(categorias).join(', ')}`);
        
        // Renderizar produtos
        renderizarProdutos(produtos);
        
        // Renderizar categorias apenas se ainda não foram renderizadas
        if (!categoriasRenderizadas) {
            renderizarCategorias();
            categoriasRenderizadas = true;
        } else {
            // Se já foram renderizadas, apenas atualizar se necessário
            atualizarCategoriasSeNecessario();
        }
        
        // Esconder loading
        if (loadingElement) loadingElement.style.display = 'none';
        
        // Mostrar empty state se não houver produtos
        if (produtos.length === 0) {
            produtosGrid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 40px 20px;">
                    <i class="fas fa-box-open" style="font-size: 3rem; color: #94a3b8; margin-bottom: 16px;"></i>
                    <h3 style="color: #1e293b; margin-bottom: 8px;">Nenhum produto cadastrado</h3>
                    <p style="color: #64748b; margin-bottom: 16px;">Adicione produtos no painel de administração</p>
                </div>
            `;
        }
        
        // Configurar realtime para atualizações
        configurarRealtime(supabase);
        
    } catch (error) {
        console.error("❌ Erro ao carregar produtos:", error);
        
        if (loadingElement) {
            loadingElement.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Erro ao carregar produtos</h3>
                    <p>${error.message || 'Verifique sua conexão'}</p>
                    <button onclick="window.location.reload()" style="margin-top: 15px; padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        <i class="fas fa-redo"></i> Tentar novamente
                    </button>
                </div>
            `;
        }
        
        mostrarNotificacao('Erro ao carregar produtos', 'error');
    }
}

// Carregar adicionais do Supabase
async function carregarAdicionais() {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    
    try {
        // Buscar adicionais ativos
        const { data, error } = await supabase
            .from('produtos')
            .select('*')
            .eq('tipo', 'adicional')
            .or('status.eq.on,status.eq.ativo,status.eq.true')
            .order('nome', { ascending: true });
        
        if (error) throw error;
        
        adicionais = data.map(adicional => ({
            id: adicional.id,
            nome: adicional.nome || "Adicional sem nome",
            descricao: adicional.descricao || "",
            preco: adicional.preco || 0,
            quantidade: adicional.quantidade || 0,
            imagemURL: adicional.imagem_url || "",
            status: adicional.status || "off",
            tipo: adicional.tipo || "adicional"
        }));
        
        console.log(`✅ Recebidos ${adicionais.length} adicionais do Supabase`);
        
    } catch (error) {
        console.error("❌ Erro ao carregar adicionais:", error);
    }
}

// Configurar realtime para atualizações
function configurarRealtime(supabase) {
    try {
        const channel = supabase
            .channel('produtos-cardapio')
            .on('postgres_changes', 
                { 
                    event: '*', 
                    schema: 'public', 
                    table: 'produtos' 
                }, 
                (payload) => {
                    console.log('Atualização realtime detectada:', payload);
                    // Recarrega os produtos quando houver mudanças
                    carregarProdutos();
                }
            )
            .subscribe((status) => {
                console.log('Status da subscription cardapio:', status);
            });
            
        return channel;
    } catch (error) {
        console.warn('Não foi possível configurar realtime:', error);
        return null;
    }
}

// Renderizar produtos
function renderizarProdutos(listaProdutos) {
    if (!produtosGrid) return;
    
    produtosGrid.innerHTML = '';
    
    if (listaProdutos.length === 0) {
        produtosGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h3>Nenhum produto encontrado</h3>
                <p>Tente outra busca ou categoria</p>
            </div>
        `;
        return;
    }
    
    listaProdutos.forEach(produto => {
        const produtoElement = criarElementoProduto(produto);
        produtosGrid.appendChild(produtoElement);
    });
}

// Criar elemento de produto
function criarElementoProduto(produto) {
    const div = document.createElement('div');
    div.className = 'produto-card';
    
    const temEstoque = produto.quantidade > 0;
    const statusTexto = temEstoque ? 'Disponível' : 'Esgotado';
    const statusClasse = temEstoque ? '' : 'out';
    
    const precoFormatado = produto.preco.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
    
    const categoriaFormatada = produto.categoria ? 
        produto.categoria.charAt(0).toUpperCase() + produto.categoria.slice(1) : 
        'Outro';
    
    // DIV para a imagem
    const imageContainer = document.createElement('div');
    imageContainer.className = 'produto-image';
    
    if (produto.imagemURL && produto.imagemURL.trim() !== '') {
        const img = document.createElement('img');
        img.src = produto.imagemURL;
        img.alt = produto.nome;
        
        // Adicionar tratamento de erro para imagens que não carregam
        img.onerror = function() {
            this.parentElement.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: linear-gradient(135deg, #f1f5f9, #e2e8f0); color: #64748b;">
                    <i class="fas fa-image"></i>
                </div>
            `;
        };
        
        imageContainer.appendChild(img);
    } else {
        imageContainer.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: linear-gradient(135deg, #f1f5f9, #e2e8f0); color: #64748b;">
                <i class="fas fa-image"></i>
            </div>
        `;
    }
    
    div.innerHTML = `
        <div class="produto-status ${statusClasse}">
            ${statusTexto}
        </div>
        <div class="produto-info">
            <div class="produto-header">
                <h3 class="produto-name">${produto.nome}</h3>
                <span class="produto-category">${categoriaFormatada}</span>
            </div>
            <p class="produto-description">${produto.descricao || 'Sem descrição'}</p>
            <div class="produto-details">
                <span class="produto-price">${precoFormatado}</span>
                <span class="produto-stock">
                    ${produto.quantidade > 5 ? 
                        `<i class="fas fa-check-circle"></i> Em estoque` : 
                        produto.quantidade > 0 ? 
                            `<i class="fas fa-exclamation-triangle"></i> Últimas ${produto.quantidade}` : 
                            `<i class="fas fa-times-circle"></i> Esgotado`
                    }
                </span>
            </div>
            <div class="produto-actions">
                <button class="btn-add-cart" onclick="selecionarProdutoParaAdicionais('${produto.id}')" ${!temEstoque ? 'disabled' : ''}>
                    <i class="fas fa-cart-plus"></i>
                    ${temEstoque ? 'Adicionar' : 'Esgotado'}
                </button>
                <button class="btn-details" onclick="verDetalhesProduto('${produto.id}')">
                    <i class="fas fa-eye"></i>
                </button>
            </div>
        </div>
    `;
    
    // Inserir o container da imagem no início do card
    div.insertBefore(imageContainer, div.firstChild.nextSibling);
    
    return div;
}

// Selecionar produto para adicionais
function selecionarProdutoParaAdicionais(produtoId) {
    produtoSelecionado = produtos.find(p => p.id === produtoId);
    if (!produtoSelecionado) return;
    
    const temEstoque = produtoSelecionado.quantidade > 0;
    if (!temEstoque) {
        mostrarNotificacao('Produto esgotado', 'error');
        return;
    }
    
    // Resetar seleção
    adicionaisSelecionados = [];
    observacoesAtuais = '';
    if (observacoesProduto) observacoesProduto.value = '';
    
    // Atualizar informações do produto
    atualizarInfoProdutoSelecionado();
    
    // Atualizar lista de adicionais
    atualizarListaAdicionais();
    
    // Atualizar resumo
    atualizarResumoAdicionais();
    
    // Abrir modal
    adicionaisModal.classList.add('active');
}

// Atualizar informações do produto selecionado
function atualizarInfoProdutoSelecionado() {
    if (!produtoSelecionadoInfo || !produtoSelecionado) return;
    
    const precoFormatado = produtoSelecionado.preco.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
    
    produtoSelecionadoInfo.innerHTML = `
        <div class="produto-info-header">
            <div class="produto-info-image">
                ${produtoSelecionado.imagemURL ? 
                    `<img src="${produtoSelecionado.imagemURL}" alt="${produtoSelecionado.nome}">` : 
                    `<div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #e3f2fd; color: #4a6fa5;">
                        <i class="fas fa-image"></i>
                    </div>`
                }
            </div>
            <div class="produto-info-details">
                <h4>${produtoSelecionado.nome}</h4>
                <div class="produto-price">${precoFormatado}</div>
            </div>
        </div>
        ${produtoSelecionado.descricao ? `<p style="color: var(--text-secondary); font-size: 0.9rem; margin: 0;">${produtoSelecionado.descricao}</p>` : ''}
    `;
}

// Atualizar lista de adicionais
function atualizarListaAdicionais() {
    if (!adicionaisList) return;
    
    // Esconder loading
    const loadingElement = adicionaisList.querySelector('.loading-adicionais');
    if (loadingElement) loadingElement.style.display = 'none';
    
    if (adicionais.length === 0) {
        adicionaisList.innerHTML = `
            <div style="text-align: center; padding: 20px; color: var(--text-muted);">
                <i class="fas fa-info-circle" style="font-size: 1.5rem; margin-bottom: 8px;"></i>
                <p>Nenhum adicional disponível</p>
            </div>
        `;
        return;
    }
    
    adicionaisList.innerHTML = '';
    
    adicionais.forEach(adicional => {
        const temEstoque = adicional.quantidade > 0;
        if (!temEstoque) return; // Não mostrar adicionais sem estoque
        
        const precoFormatado = adicional.preco.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
        
        const isSelected = adicionaisSelecionados.some(a => a.id === adicional.id);
        
        const adicionalElement = document.createElement('div');
        adicionalElement.className = `adicional-item ${isSelected ? 'selected' : ''}`;
        adicionalElement.dataset.id = adicional.id;
        
        adicionalElement.innerHTML = `
            <div class="adicional-info">
                <div class="adicional-nome">${adicional.nome}</div>
                <div class="adicional-preco">+ ${precoFormatado}</div>
                ${adicional.descricao ? `<div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">${adicional.descricao}</div>` : ''}
            </div>
            <div class="adicional-checkbox">
                ${isSelected ? '<i class="fas fa-check"></i>' : ''}
            </div>
        `;
        
        adicionalElement.addEventListener('click', () => toggleAdicional(adicional));
        adicionaisList.appendChild(adicionalElement);
    });
}

// Alternar adicional selecionado
function toggleAdicional(adicional) {
    const index = adicionaisSelecionados.findIndex(a => a.id === adicional.id);
    
    if (index === -1) {
        // Adicionar
        adicionaisSelecionados.push({
            id: adicional.id,
            nome: adicional.nome,
            preco: adicional.preco
        });
    } else {
        // Remover
        adicionaisSelecionados.splice(index, 1);
    }
    
    // Atualizar UI
    const adicionalElement = document.querySelector(`.adicional-item[data-id="${adicional.id}"]`);
    if (adicionalElement) {
        adicionalElement.classList.toggle('selected');
        const checkbox = adicionalElement.querySelector('.adicional-checkbox');
        if (checkbox) {
            if (index === -1) {
                checkbox.innerHTML = '<i class="fas fa-check"></i>';
            } else {
                checkbox.innerHTML = '';
            }
        }
    }
    
    // Atualizar resumo
    atualizarResumoAdicionais();
}

// Atualizar resumo de adicionais
function atualizarResumoAdicionais() {
    if (!produtoSelecionado) return;
    
    const precoProduto = produtoSelecionado.preco;
    const precoAdicionais = adicionaisSelecionados.reduce((total, adicional) => total + adicional.preco, 0);
    const total = precoProduto + precoAdicionais;
    
    if (resumoProdutoPreco) {
        resumoProdutoPreco.textContent = precoProduto.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
    }
    
    if (resumoAdicionaisPreco) {
        resumoAdicionaisPreco.textContent = precoAdicionais.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
    }
    
    if (resumoTotal) {
        resumoTotal.textContent = total.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
    }
}

// Confirmar adicionais e adicionar ao carrinho
function confirmarAdicionais() {
    if (!produtoSelecionado) {
        mostrarNotificacao('Produto não selecionado', 'error');
        return;
    }
    
    // Verificar estoque do produto principal
    const estoqueDisponivel = produtoSelecionado.quantidade || 0;
    if (estoqueDisponivel <= 0) {
        mostrarNotificacao('Produto esgotado', 'error');
        fecharModalAdicionais();
        return;
    }
    
    // Verificar estoque dos adicionais selecionados
    for (const adicional of adicionaisSelecionados) {
        const adicionalInfo = adicionais.find(a => a.id === adicional.id);
        if (!adicionalInfo || adicionalInfo.quantidade <= 0) {
            mostrarNotificacao(`${adicional.nome} está esgotado`, 'error');
            return;
        }
    }
    
    // Adicionar ao carrinho
    const itemCarrinho = {
        id: produtoSelecionado.id,
        nome: produtoSelecionado.nome,
        preco: produtoSelecionado.preco,
        quantidade: 1,
        imagemURL: produtoSelecionado.imagemURL,
        maxQuantidade: estoqueDisponivel,
        adicionais: [...adicionaisSelecionados],
        observacoes: observacoesAtuais,
        total: produtoSelecionado.preco + adicionaisSelecionados.reduce((total, adicional) => total + adicional.preco, 0)
    };
    
    // Verificar se já existe um item idêntico no carrinho
    const itemExistenteIndex = carrinho.findIndex(item => 
        item.id === itemCarrinho.id && 
        JSON.stringify(item.adicionais) === JSON.stringify(itemCarrinho.adicionais) &&
        item.observacoes === itemCarrinho.observacoes
    );
    
    if (itemExistenteIndex !== -1) {
        // Se já existe, aumenta a quantidade
        if (carrinho[itemExistenteIndex].quantidade + 1 > estoqueDisponivel) {
            mostrarNotificacao('Estoque insuficiente', 'error');
            return;
        }
        carrinho[itemExistenteIndex].quantidade++;
    } else {
        // Se não existe, adiciona novo item
        carrinho.push(itemCarrinho);
    }
    
    salvarCarrinho();
    atualizarCarrinho();
    mostrarNotificacao(`${produtoSelecionado.nome} adicionado ao carrinho`, 'success');
    
    fecharModalAdicionais();
    
    if (!carrinhoAberto) {
        abrirCarrinho();
    }
}

// Fechar modal de adicionais
function fecharModalAdicionais() {
    adicionaisModal.classList.remove('active');
    produtoSelecionado = null;
    adicionaisSelecionados = [];
    observacoesAtuais = '';
}

// Renderizar categorias
function renderizarCategorias() {
    const loadingCategorias = categoriasList ? categoriasList.querySelector('.loading-categorias') : null;
    if (loadingCategorias) loadingCategorias.style.display = 'none';
    
    // Encontrar o botão "Todos" original
    const todosBtnOriginal = categoriasList ? categoriasList.querySelector('[data-categoria="todos"]') : null;
    
    // Se não encontrar o botão "Todos", criar um novo
    if (!todosBtnOriginal) {
        console.warn("Botão 'Todos' não encontrado, criando novo...");
        criarBotaoTodos();
    } else {
        // Garantir que o botão "Todos" tenha o event listener
        if (!todosBtnOriginal.hasAttribute('data-listener-adicionado')) {
            todosBtnOriginal.addEventListener('click', () => filtrarPorCategoria('todos'));
            todosBtnOriginal.setAttribute('data-listener-adicionado', 'true');
        }
    }
    
    // Remover todos os outros botões de categoria (exceto "Todos" e loading)
    const outrosBotoes = categoriasList ? categoriasList.querySelectorAll('.categoria-btn:not([data-categoria="todos"])') : [];
    outrosBotoes.forEach(botao => botao.remove());
    
    // Adicionar botões para cada categoria (exceto 'todos')
    Array.from(categorias)
        .filter(cat => cat !== 'todos')
        .forEach(categoria => {
            const btn = document.createElement('button');
            btn.className = 'categoria-btn';
            btn.dataset.categoria = categoria;
            
            let icon = 'fa-utensils';
            if (categoria === 'bebida') icon = 'fa-glass-martini-alt';
            if (categoria === 'sobremesa') icon = 'fa-ice-cream';
            if (categoria === 'lanche') icon = 'fa-hamburger';
            
            btn.innerHTML = `<i class="fas ${icon}"></i> ${formatarNomeCategoria(categoria)}`;
            btn.addEventListener('click', () => filtrarPorCategoria(categoria));
            if (categoriasList) categoriasList.appendChild(btn);
        });
}

// Criar botão "Todos" se não existir
function criarBotaoTodos() {
    if (!categoriasList) return;
    
    const todosBtn = document.createElement('button');
    todosBtn.className = 'categoria-btn active';
    todosBtn.dataset.categoria = 'todos';
    todosBtn.dataset.listenerAdicionado = 'true';
    todosBtn.innerHTML = '<i class="fas fa-star"></i> Todos';
    todosBtn.addEventListener('click', () => filtrarPorCategoria('todos'));
    
    // Remover loading se existir
    const loadingCategorias = categoriasList.querySelector('.loading-categorias');
    if (loadingCategorias) {
        loadingCategorias.remove();
    }
    
    // Adicionar como primeiro elemento
    categoriasList.insertBefore(todosBtn, categoriasList.firstChild);
}

// Atualizar categorias se necessário
function atualizarCategoriasSeNecessario() {
    if (!categoriasList) return;
    
    // Verificar quais categorias já estão renderizadas
    const categoriasRenderizadasAtual = new Set();
    const botoesCategorias = categoriasList.querySelectorAll('.categoria-btn');
    
    botoesCategorias.forEach(botao => {
        if (botao.dataset.categoria && botao.dataset.categoria !== 'todos') {
            categoriasRenderizadasAtual.add(botao.dataset.categoria);
        }
    });
    
    // Verificar se há novas categorias
    const todasCategorias = Array.from(categorias);
    const novasCategorias = todasCategorias.filter(cat => 
        cat !== 'todos' && !categoriasRenderizadasAtual.has(cat)
    );
    
    // Se houver novas categorias, adicionar apenas elas
    if (novasCategorias.length > 0) {
        console.log('Novas categorias detectadas, atualizando...', novasCategorias);
        novasCategorias.forEach(categoria => {
            const btn = document.createElement('button');
            btn.className = 'categoria-btn';
            btn.dataset.categoria = categoria;
            
            let icon = 'fa-utensils';
            if (categoria === 'bebida') icon = 'fa-glass-martini-alt';
            if (categoria === 'sobremesa') icon = 'fa-ice-cream';
            if (categoria === 'lanche') icon = 'fa-hamburger';
            
            btn.innerHTML = `<i class="fas ${icon}"></i> ${formatarNomeCategoria(categoria)}`;
            btn.addEventListener('click', () => filtrarPorCategoria(categoria));
            categoriasList.appendChild(btn);
        });
    }
}

// Formatar nome da categoria para exibição
function formatarNomeCategoria(categoria) {
    const nomes = {
        'todos': 'Todos',
        'bebida': 'Bebidas',
        'comida': 'Comidas',
        'sobremesa': 'Sobremesas',
        'outro': 'Outros'
    };
    
    return nomes[categoria] || categoria.charAt(0).toUpperCase() + categoria.slice(1);
}

// Filtrar por categoria
function filtrarPorCategoria(categoria) {
    console.log(`Filtrando por categoria: ${categoria}`);
    
    // Ativar o botão correto
    document.querySelectorAll('.categoria-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.categoria === categoria) {
            btn.classList.add('active');
            console.log(`Botão ${categoria} ativado`);
        }
    });
    
    const filtrados = categoria === 'todos' ? produtos : produtos.filter(p => p.categoria === categoria);
    console.log(`Mostrando ${filtrados.length} produtos para categoria ${categoria}`);
    renderizarProdutos(filtrados);
}

// Filtrar produtos
function filtrarProdutos() {
    if (!searchProdutos) return;
    
    const termo = searchProdutos.value.toLowerCase().trim();
    
    if (!termo) {
        const categoriaAtiva = document.querySelector('.categoria-btn.active')?.dataset.categoria || 'todos';
        filtrarPorCategoria(categoriaAtiva);
        return;
    }
    
    const filtrados = produtos.filter(produto => 
        produto.nome.toLowerCase().includes(termo) || 
        (produto.descricao && produto.descricao.toLowerCase().includes(termo))
    );
    
    renderizarProdutos(filtrados);
}

// Atualizar carrinho
function atualizarCarrinho() {
    const totalItens = carrinho.reduce((total, item) => total + item.quantidade, 0);
    const totalValor = carrinho.reduce((total, item) => total + (item.total * item.quantidade), 0);
    
    if (carrinhoCount) carrinhoCount.textContent = totalItens;
    if (carrinhoTotal) {
        carrinhoTotal.textContent = totalValor.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
    }
    
    atualizarModalCarrinho();
}

// Atualizar modal do carrinho
function atualizarModalCarrinho() {
    if (!carrinhoEmpty || !carrinhoItems) return;
    
    if (carrinho.length === 0) {
        carrinhoEmpty.style.display = 'block';
        carrinhoItems.style.display = 'none';
    } else {
        carrinhoEmpty.style.display = 'none';
        carrinhoItems.style.display = 'flex';
        
        carrinhoItems.innerHTML = '';
        let subtotalValor = 0;
        
        carrinho.forEach((item, index) => {
            const itemTotal = item.total * item.quantidade;
            subtotalValor += itemTotal;
            
            const adicionaisText = item.adicionais && item.adicionais.length > 0 
                ? item.adicionais.map(a => a.nome).join(', ') 
                : '';
            
            const observacoesText = item.observacoes ? `Obs: ${item.observacoes}` : '';
            
            const itemElement = document.createElement('div');
            itemElement.className = 'carrinho-item';
            itemElement.innerHTML = `
                <div class="carrinho-item-image">
                    ${item.imagemURL ? 
                        `<img src="${item.imagemURL}" alt="${item.nome}">` : 
                        `<div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #f0f0f0; color: #666;">
                            <i class="fas fa-image"></i>
                        </div>`
                    }
                </div>
                <div class="carrinho-item-info">
                    <div class="carrinho-item-name">${item.nome}</div>
                    ${adicionaisText ? `<div class="carrinho-item-adicionais">+ ${adicionaisText}</div>` : ''}
                    ${observacoesText ? `<div class="carrinho-item-adicionais" style="color: var(--warning-color);">${observacoesText}</div>` : ''}
                    <div class="carrinho-item-price">
                        ${item.total.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                    </div>
                    <div class="carrinho-item-controls">
                        <button class="quantity-btn" onclick="alterarQuantidade(${index}, -1)">
                            <i class="fas fa-minus"></i>
                        </button>
                        <span class="quantity-value">${item.quantidade}</span>
                        <button class="quantity-btn" onclick="alterarQuantidade(${index}, 1)">
                            <i class="fas fa-plus"></i>
                        </button>
                        <button class="remove-item" onclick="removerDoCarrinho(${index})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
            
            carrinhoItems.appendChild(itemElement);
        });
        
        const taxaEntrega = 5.00;
        const total = subtotalValor + taxaEntrega;
        
        if (subtotal) subtotal.textContent = subtotalValor.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
        if (totalCarrinho) totalCarrinho.textContent = total.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
    }
}

// Alterar quantidade
function alterarQuantidade(index, delta) {
    const item = carrinho[index];
    if (!item) return;
    
    const novaQuantidade = item.quantidade + delta;
    
    if (novaQuantidade < 1) {
        removerDoCarrinho(index);
        return;
    }
    
    const produtoAtual = produtos.find(p => p.id === item.id);
    const estoqueAtual = produtoAtual ? (produtoAtual.quantidade || 0) : 0;
    
    if (novaQuantidade > estoqueAtual) {
        mostrarNotificacao('Quantidade máxima disponível', 'error');
        return;
    }
    
    item.quantidade = novaQuantidade;
    salvarCarrinho();
    atualizarCarrinho();
}

// Remover do carrinho
function removerDoCarrinho(index) {
    carrinho.splice(index, 1);
    salvarCarrinho();
    atualizarCarrinho();
    mostrarNotificacao('Item removido', 'info');
}

// Limpar carrinho
function limparCarrinho() {
    if (carrinho.length === 0) return;
    
    if (confirm('Limpar carrinho?')) {
        carrinho = [];
        salvarCarrinho();
        atualizarCarrinho();
        mostrarNotificacao('Carrinho limpo', 'info');
    }
}

// Gerar ID único para o pedido
function gerarIdPedido() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `PED${timestamp.toString().slice(-6)}${random.toString().padStart(3, '0')}`;
}

// Função para finalizar pedido
async function finalizarPedido() {
    if (carrinho.length === 0) {
        mostrarNotificacao('Carrinho vazio', 'error');
        return;
    }
    
    // Verificar se todos os itens ainda têm estoque
    for (const item of carrinho) {
        const produto = produtos.find(p => p.id === item.id);
        if (!produto || produto.quantidade < item.quantidade) {
            mostrarNotificacao(`${item.nome} sem estoque suficiente!`, 'error');
            return;
        }
        
        // Verificar estoque dos adicionais
        if (item.adicionais && item.adicionais.length > 0) {
            for (const adicional of item.adicionais) {
                const adicionalInfo = adicionais.find(a => a.id === adicional.id);
                if (!adicionalInfo || adicionalInfo.quantidade < item.quantidade) {
                    mostrarNotificacao(`${adicional.nome} sem estoque suficiente!`, 'error');
                    return;
                }
            }
        }
    }
    
    // Gerar ID do pedido
    const idPedido = gerarIdPedido();
    
    // Usar data/hora corretas para o fuso horário do Brasil
    const agora = new Date();
    const offsetBrasilia = -3 * 60; // UTC-3 em minutos
    const agoraBrasilia = new Date(agora.getTime() + offsetBrasilia * 60000);
    
    // Formatar data (YYYY-MM-DD)
    const dataAtual = agoraBrasilia.toISOString().split('T')[0];
    
    // Formatar hora (HH:MM)
    const horaAtual = agoraBrasilia.toISOString().split('T')[1].substring(0, 5);
    
    console.log('📅 Data do pedido:', dataAtual);
    console.log('⏰ Hora do pedido:', horaAtual);
    
    // Calcular total
    const subtotalValor = carrinho.reduce((total, item) => total + (item.total * item.quantidade), 0);
    const taxaEntrega = 5.00;
    const total = subtotalValor + taxaEntrega;
    
    try {
        const supabase = getSupabaseClient();
        if (!supabase) {
            throw new Error('Cliente Supabase não disponível');
        }
        
        // Criar objeto do pedido - STATUS COMO "pendente"
        const pedido = {
            id_pedido: idPedido,
            itens: carrinho.map(item => ({
                produto_id: item.id,
                nome: item.nome,
                preco: item.total,
                quantidade: item.quantidade,
                total_item: item.total * item.quantidade,
                adicionais: item.adicionais || [],
                observacoes: item.observacoes || ''
            })),
            subtotal: subtotalValor,
            taxa_entrega: taxaEntrega,
            total: total,
            data: dataAtual,
            hora: horaAtual,
            status: 'pendente',
            criado_em: new Date().toISOString(),
            atualizado_em: new Date().toISOString()
        };
        
        console.log('📦 Pedido a ser salvo:', pedido);
        
        // Salvar no Supabase na tabela 'pedidos'
        const { error: pedidoError } = await supabase
            .from('pedidos')
            .insert([pedido]);
        
        if (pedidoError) throw pedidoError;
        
        console.log(`✅ Pedido ${idPedido} salvo como pendente no Supabase`);
        
        // Limpar carrinho após sucesso
        carrinho = [];
        salvarCarrinho();
        atualizarCarrinho();
        
        // Mostrar mensagem de sucesso
        mostrarNotificacao(`Pedido #${idPedido} realizado com sucesso!`, 'success');
        
        // Fechar modal do carrinho
        fecharCarrinho();
        
    } catch (error) {
        console.error('Erro ao finalizar pedido:', error);
        mostrarNotificacao('Erro ao finalizar pedido: ' + error.message, 'error');
        alert('❌ Ocorreu um erro ao finalizar o pedido. Tente novamente.');
    }
}

// Ver detalhes do produto
function verDetalhesProduto(produtoId) {
    const produto = produtos.find(p => p.id === produtoId);
    if (!produto) return;
    
    const temEstoque = produto.quantidade > 0;
    const precoFormatado = produto.preco.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
    
    produtoModalBody.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
            <div style="height: 180px; width: 100%; border-radius: 8px; overflow: hidden; margin-bottom: 16px; background: linear-gradient(135deg, #f1f5f9, #e2e8f0);">
                ${produto.imagemURL ? 
                    `<img src="${produto.imagemURL}" alt="${produto.nome}" style="width: 100%; height: 100%; object-fit: cover;">` : 
                    `<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #64748b;">
                        <i class="fas fa-image" style="font-size: 2.5rem;"></i>
                    </div>`
                }
            </div>
            <span style="display: inline-block; background: ${temEstoque ? '#10b981' : '#ef4444'}; color: white; padding: 4px 12px; border-radius: 4px; font-size: 0.85rem; font-weight: 600;">
                ${temEstoque ? 'Disponível' : 'Esgotado'}
            </span>
        </div>
        
        <h2 style="font-size: 1.4rem; margin-bottom: 8px; color: #1e293b;">${produto.nome}</h2>
        
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <span style="color: #2563eb; font-size: 1.5rem; font-weight: 700;">${precoFormatado}</span>
        </div>
        
        <div style="margin-bottom: 20px;">
            <h3 style="font-size: 1rem; margin-bottom: 8px; color: #1e293b;">Descrição</h3>
            <p style="color: #64748b; line-height: 1.5;">${produto.descricao || 'Sem descrição'}</p>
        </div>
        
        <button class="btn-add-cart" onclick="selecionarProdutoParaAdicionais('${produto.id}'); fecharModalProduto();" style="width: 100%; padding: 12px; font-size: 1rem;" ${!temEstoque ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
            <i class="fas fa-cart-plus"></i>
            ${temEstoque ? 'Adicionar ao Carrinho' : 'Esgotado'}
        </button>
    `;
    
    produtoModal.classList.add('active');
}

// Abrir carrinho
function abrirCarrinho() {
    if (carrinhoModal) carrinhoModal.classList.add('active');
    carrinhoAberto = true;
}

// Fechar carrinho
function fecharCarrinho() {
    if (carrinhoModal) carrinhoModal.classList.remove('active');
    carrinhoAberto = false;
}

// Fechar modal do produto
function fecharModalProduto() {
    if (produtoModal) produtoModal.classList.remove('active');
}

// Salvar carrinho
function salvarCarrinho() {
    localStorage.setItem('carrinho', JSON.stringify(carrinho));
}

// Mostrar notificação
function mostrarNotificacao(mensagem, tipo, duracao = 3000) {
    const existente = document.querySelector('.notification');
    if (existente) existente.remove();
    
    const notificacao = document.createElement('div');
    notificacao.className = `notification ${tipo}`;
    notificacao.innerHTML = `
        <i class="fas ${tipo === 'success' ? 'fa-check-circle' : tipo === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${mensagem}</span>
    `;
    
    document.body.appendChild(notificacao);
    
    setTimeout(() => {
        if (notificacao.parentElement) notificacao.remove();
    }, duracao);
}

// Exportar funções para o escopo global
window.selecionarProdutoParaAdicionais = selecionarProdutoParaAdicionais;
window.verDetalhesProduto = verDetalhesProduto;
window.alterarQuantidade = alterarQuantidade;
window.removerDoCarrinho = removerDoCarrinho;
window.filtrarPorCategoria = filtrarPorCategoria;
window.toggleAdicional = toggleAdicional;