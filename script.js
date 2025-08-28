// *******************************************************************
// SUA CONFIGURAÇÃO DO FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyD27OhkX974CwCsZINmv4fXoY1-rjBvwvo",
    authDomain: "pedidosmania-8e64d.firebaseapp.com",
    projectId: "pedidosmania-8e64d",
    storageBucket: "pedidosmania-8e64d.appspot.com",
    messagingSenderId: "690030977902",
    appId: "1:690030977902:web:aea37bdd2a8b25bfaad77f",
    measurementId: "G-6J70HR8F9K"
};
// *******************************************************************

// Inicialização
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
const serverTimestamp = firebase.firestore.FieldValue.serverTimestamp;

document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    if (path.includes('cardapio.html')) {
        initAdminPage();
    } else {
        initAppPage();
    }
});

// ===================================================================
// PÁGINA ADMIN (cardapio.html)
// ===================================================================
function initAdminPage() {
    auth.onAuthStateChanged(user => {
        if (user) {
            loadPageContent();
        } else {
            alert("Você precisa estar logado para acessar esta página.");
            window.location.href = 'index.html';
        }
    });

    function loadPageContent() {
        const menuGroupsContainer = document.getElementById('menu-groups-container');
        const addGroupBtn = document.getElementById('add-group-btn');
        const saveMenuBtn = document.getElementById('save-menu-btn');
        const printMenuBtn = document.getElementById('print-menu-btn');

        function createGroupUI(group = { name: '', dishes: '', sides: '' }) {
            const card = document.createElement('div');
            card.className = 'menu-group-admin-card';
            card.innerHTML = `
                <button class="btn-danger btn-small delete-group-btn" title="Excluir este grupo"><i class="fas fa-trash"></i></button>
                <input type="text" class="group-name" placeholder="Nome do Grupo (Ex: Pratos do Dia)" value="${group.name}">
                <div>
                    <textarea class="group-dishes" placeholder="Pratos (um por linha)">${group.dishes}</textarea>
                    <textarea class="group-sides" placeholder="Acompanhamentos (um por linha)">${group.sides}</textarea>
                </div>
            `;
            menuGroupsContainer.appendChild(card);
        }

        menuGroupsContainer.addEventListener('click', e => {
            if (e.target.closest('.delete-group-btn')) {
                if (confirm('Tem certeza que deseja excluir este grupo de pratos?')) {
                    e.target.closest('.menu-group-admin-card').remove();
                }
            }
        });

        async function loadMenuFromFirebase() {
            const docRef = db.collection('configuracao').doc('cardapio-do-dia');
            const docSnap = await docRef.get();
            if (docSnap.exists) {
                menuGroupsContainer.innerHTML = '';
                docSnap.data().menu.forEach(group => createGroupUI({
                    name: group.groupName,
                    dishes: group.dishes.join('\n'),
                    sides: group.sides.join('\n')
                }));
            } else {
                createGroupUI();
            }
        }

        function saveMenuToFirebase() {
            const groups = [];
            document.querySelectorAll('.menu-group-admin-card').forEach(card => {
                const name = card.querySelector('.group-name').value.trim();
                const dishes = card.querySelector('.group-dishes').value.split('\n').map(d => d.trim()).filter(Boolean);
                const sides = card.querySelector('.group-sides').value.split('\n').map(s => s.trim()).filter(Boolean);
                if (name && dishes.length > 0) {
                    groups.push({ groupName: name, dishes, sides });
                }
            });
            if (groups.length > 0) {
                db.collection('configuracao').doc('cardapio-do-dia').set({ menu: groups })
                    .then(() => alert('Cardápio salvo com sucesso!'))
                    .catch(err => alert('Erro: ' + err.message));
            } else {
                db.collection('configuracao').doc('cardapio-do-dia').delete()
                    .then(() => alert('Nenhum grupo válido. Cardápio em branco salvo.'))
                    .catch(err => alert('Erro: ' + err.message));
            }
        }

        function printMenu() {
            const printableContainer = document.getElementById('printable-menu');
            let menuHTML = `<h1>Cardápio do Dia - Mania Mix</h1>`;
            menuHTML += `<p>Data: ${new Date().toLocaleDateString('pt-BR')}</p><hr class="print-hr">`;

            const groupCards = document.querySelectorAll('.menu-group-admin-card');
            if (groupCards.length === 0 || !groupCards[0].querySelector('.group-name').value.trim()) {
                alert('O cardápio está vazio. Adicione grupos e pratos antes de imprimir.');
                return;
            }

            groupCards.forEach(card => {
                const name = card.querySelector('.group-name').value.trim();
                const dishes = card.querySelector('.group-dishes').value.split('\n').map(d => d.trim()).filter(Boolean);
                const sides = card.querySelector('.group-sides').value.split('\n').map(s => s.trim()).filter(Boolean);

                if (name && dishes.length > 0) {
                    menuHTML += `<div class="print-group"><h2>${name}</h2>`;
                    menuHTML += '<ul>';
                    dishes.forEach(dish => { menuHTML += `<li>${dish}</li>`; });
                    menuHTML += '</ul>';

                    if (sides.length > 0) {
                        menuHTML += '<h3>Acompanhamentos Sugeridos:</h3><ul>';
                        sides.forEach(side => { menuHTML += `<li>- ${side}</li>`; });
                        menuHTML += '</ul>';
                    }
                    menuHTML += '</div>';
                }
            });

            printableContainer.innerHTML = menuHTML;
            window.print();
            printableContainer.innerHTML = '';
        }

        addGroupBtn.addEventListener('click', () => createGroupUI());
        saveMenuBtn.addEventListener('click', saveMenuToFirebase);
        printMenuBtn.addEventListener('click', printMenu);
        loadMenuFromFirebase();
    }
}

// ===================================================================
// PÁGINA DE PEDIDOS (index.html)
// ===================================================================
function initAppPage() {
    // SELETORES
    const loginContainer = document.getElementById('login-container');
    const appContainer = document.getElementById('app-container');
    const logoutBtn = document.getElementById('logout-btn');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const authToggleLink = document.getElementById('auth-toggle-link');
    const menuContent = document.querySelector('.menu-groups-wrapper');
    const ordersList = document.getElementById('orders-list');
    const orderSummaryItems = document.getElementById('order-summary-items');
    const clienteNameInput = document.getElementById('cliente-name');
    const extraItemsInput = document.getElementById('extra-items');
    const editingOrderIdInput = document.getElementById('editing-order-id');
    const savePrintBtn = document.getElementById('save-print-btn');
    const newOrderBtn = document.getElementById('new-order-btn');
    const addItemBtn = document.getElementById('add-item-btn');
    const generateDailyReportBtn = document.getElementById('generateDailyReportBtn');
    const generateWeeklyReportBtn = document.getElementById('generateWeeklyReportBtn');
    const employeePrintBtn = document.getElementById('employee-print-btn');
    const orderFilters = document.querySelector('.order-filters');
    const typeFilters = document.querySelector('.type-filters');
    const priorityToggleBtn = document.getElementById('priority-toggle-btn');
    const searchInput = document.getElementById('searchInput');
    const mobileFab = document.getElementById('mobile-fab');
    const mobileBackBtn = document.getElementById('mobile-back-btn');
    const viewOrderModal = document.getElementById('view-order-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const modalOrderDetails = document.getElementById('modal-order-details');
    const prioridadeCheck = document.getElementById('prioridade-check');
    const loja2Check = document.getElementById('loja2-check');
    const addressSection = document.getElementById('address-section');
    const enderecoEntregaInput = document.getElementById('endereco-entrega');

    // ESTADO
    let menuData = [];
    let currentOrderItems = [];
    let allOrdersFromListener = [];
    let currentStatusFilter = 'pendente';
    let currentTypeFilter = 'todos';
    let priorityFilterActive = false;
    let unsubscribeOrders;
    let isAddingItem = false;

    // LÓGICA DE INICIALIZAÇÃO
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            loginContainer.classList.add('hidden');
            appContainer.classList.remove('hidden');
            await loadMenu();
            setupAppEventListeners();
            listenToOrders();
        } else {
            loginContainer.classList.remove('hidden');
            appContainer.classList.add('hidden');
            if (unsubscribeOrders) unsubscribeOrders();
        }
    });
    
    function setupAuthEventListeners() {
        authToggleLink.addEventListener('click', e => {
            e.preventDefault();
            loginForm.classList.toggle('hidden');
            registerForm.classList.toggle('hidden');
            const authTitle = document.getElementById('auth-title');
            const authSubtitle = document.getElementById('auth-subtitle');
            const isLogin = !loginForm.classList.contains('hidden');
            authTitle.innerText = isLogin ? 'Pedidos Mania Mix' : 'Crie sua Conta';
            authSubtitle.innerText = isLogin ? 'Acesse sua conta para iniciar' : 'É rápido e fácil.';
            authToggleLink.innerText = isLogin ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Faça Login';
        });
        loginForm.addEventListener('submit', e => {
            e.preventDefault();
            const email = loginForm['login-email'].value;
            const password = loginForm['login-password'].value;
            auth.signInWithEmailAndPassword(email, password).catch(err => alert(err.message));
        });
        registerForm.addEventListener('submit', e => {
            e.preventDefault();
            const email = registerForm['register-email'].value;
            const password = registerForm['register-password'].value;
            auth.createUserWithEmailAndPassword(email, password).catch(err => {
                if (err.code == 'auth/weak-password') {
                    alert('Senha muito fraca. A senha deve ter no mínimo 6 caracteres.');
                } else if (err.code == 'auth/email-already-in-use') {
                    alert('Este e-mail já está cadastrado.');
                } else {
                    alert('Erro ao cadastrar: ' + err.message);
                }
            });
        });
    }
    setupAuthEventListeners();

    function resetEntireOrder() {
        currentOrderItems = [];
        clienteNameInput.value = '';
        extraItemsInput.value = '';
        editingOrderIdInput.value = '';
        enderecoEntregaInput.value = '';
        prioridadeCheck.checked = false;
        loja2Check.checked = false;
        document.querySelector('#retirada').checked = true;
        addressSection.classList.add('hidden');
        document.querySelectorAll('.order-item-card.editing').forEach(c => c.classList.remove('editing'));
        savePrintBtn.innerHTML = '<i class="fas fa-save"></i> Salvar e Imprimir';
        newOrderBtn.classList.add('hidden');
        clearMenuSelection();
        updateOrderSummary();
    }

    function clearMenuSelection() {
        const selectedDish = document.querySelector('input[name="main-dish"]:checked');
        if (selectedDish) selectedDish.checked = false;
        document.querySelectorAll('.sides-container').forEach(c => {
            c.innerHTML = '';
            c.classList.add('hidden');
        });
    }

    function updateOrderSummary() {
        if (currentOrderItems.length === 0) {
            orderSummaryItems.innerHTML = '<p class="placeholder">Adicione itens ao pedido...</p>';
            return;
        }
        orderSummaryItems.innerHTML = currentOrderItems.map((item, index) => `
            <div class="summary-item">
                <h5>${item.dish}</h5>
                ${item.sides.length > 0 ? `<ul>${item.sides.map(s => `<li>${s}</li>`).join('')}</ul>` : ''}
                <div class="summary-item-actions">
                    <button class="btn-secondary btn-small edit-item-btn" data-index="${index}" title="Editar Item"><i class="fas fa-edit"></i></button>
                    <button class="btn-secondary btn-small dupe-item-btn" data-index="${index}" title="Duplicar Item"><i class="fas fa-copy"></i></button>
                    <button class="btn-danger btn-small delete-item-btn" data-index="${index}" title="Remover Item"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `).join('');
    }

    async function loadMenu() {
        try {
            const docRef = db.collection('configuracao').doc('cardapio-do-dia');
            const docSnap = await docRef.get();
            if (docSnap.exists && docSnap.data().menu.length > 0) {
                menuData = docSnap.data().menu;
                renderMenu(menuData);
            } else {
                menuContent.innerHTML = '<h3>👋 Cardápio do dia não cadastrado.</h3>';
            }
        } catch (error) {
            console.error("Erro ao carregar o cardápio:", error);
            menuContent.innerHTML = '<h3>❌ Erro ao carregar o cardápio.</h3>';
        }
    }

    function renderMenu(menu) {
        menuContent.innerHTML = '';
        menu.forEach((group, groupIndex) => {
            const card = document.createElement('div');
            card.className = 'menu-group-card';
            card.innerHTML = `<h3>${group.groupName}</h3>
                <div class="dishes-container">
                    ${group.dishes.map(d => `<label class="dish-label"><input type="radio" name="main-dish" value="${d}" data-group-index="${groupIndex}">${d}</label>`).join('')}
                </div>
                <div class="sides-container hidden" id="sides-group-${groupIndex}"></div>`;
            menuContent.appendChild(card);
        });
    }

    function getOrderDataFromForm() {
        const cliente = clienteNameInput.value.trim();
        if (currentOrderItems.length === 0) {
            alert('O pedido está vazio!');
            return null;
        }
        if (!cliente) {
            alert('Digite o nome do cliente!');
            return null;
        }
        
        return {
            cliente,
            loja: loja2Check.checked ? 2 : 1,
            items: currentOrderItems,
            extras: extraItemsInput.value.trim(),
            tipo: document.querySelector('input[name="tipo_pedido"]:checked').value,
            endereco: enderecoEntregaInput.value.trim(),
            status: 'pendente',
            prioridade: prioridadeCheck.checked,
            cancelReason: '',
            timestamp: serverTimestamp()
        };
    }

    function saveAndPrintOrder() {
        const orderData = getOrderDataFromForm();
        if (!orderData) return;

        const orderId = editingOrderIdInput.value;
        const operation = orderId 
            ? db.collection('pedidos').doc(orderId).update(orderData)
            : db.collection('pedidos').add(orderData);

        operation.then((docRef) => {
            const finalOrderData = { id: orderId || docRef.id, ...orderData };
            printReceipt(finalOrderData, false);
            resetEntireOrder();
        }).catch(err => alert('Erro ao salvar pedido: ' + err.message));
    }
    
    function printEmployeeOrder() {
        const orderData = getOrderDataFromForm();
        if (!orderData) return;
        orderData.id = Date.now().toString();
        printReceipt(orderData, true);
        resetEntireOrder();
    }

    function printReceipt(order, isEmployeeOrder) {
        const now = (order.timestamp && order.timestamp.toDate) ? order.timestamp.toDate() : new Date();
        const hora = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const orderNumber = (order.id || Date.now().toString()).slice(-6);
        const clientName = order.loja === 2 ? `${order.cliente} - Loja 2` : order.cliente;

        let itemsHTML = order.items.map((item, index) => {
            const itemContent = `
                <div class="recibo-item">
                    <p>${item.dish.toUpperCase()}</p>
                    ${item.sides.length > 0 ? `<ul>${item.sides.map(s => `<li>${s}</li>`).join('')}</ul>` : ''}
                </div>`;
            return itemContent + (index < order.items.length - 1 ? '<hr>' : '');
        }).join('');
        
        const reciboHTML = `
            <div class="recibo-header">
                <h1>${order.tipo.toUpperCase()}${order.prioridade ? ' - URGENTE' : ''}</h1>
                ${isEmployeeOrder ? '<h2>PEDIDO FUNCIONÁRIO</h2>' : ''}
            </div>
            <hr>
            <div class="recibo-info">
                <span>Pedido: ${orderNumber}</span> 
                <span>Hora: ${hora}</span>
            </div>
            <div class="recibo-section">
                <h2>Cliente: ${clientName}</h2>
            </div>
            <hr>
            ${itemsHTML}
            ${order.extras ? `<hr><div class="recibo-item"><p>EXTRAS:</p><ul><li>${order.extras}</li></ul></div>` : ''}
            ${order.endereco ? `<hr><div class="recibo-item"><p>ENDEREÇO:</p><ul><li>${order.endereco}</li></ul></div>` : ''}
        `;
        document.getElementById('recibo-container').innerHTML = reciboHTML;
        window.print();
    }

    function renderOrders() {
        ordersList.innerHTML = '';
        const searchTerm = searchInput.value.toLowerCase();

        const filteredOrders = allOrdersFromListener
            .filter(order => order.status === currentStatusFilter)
            .filter(order => currentTypeFilter === 'todos' || order.tipo === currentTypeFilter)
            .filter(order => !priorityFilterActive || order.prioridade)
            .filter(order => {
                if (searchTerm === '') return true;
                const orderId = (order.id || '').toString().slice(-6);
                const clientName = (order.cliente || '').toLowerCase();
                return clientName.includes(searchTerm) || orderId.includes(searchTerm);
            });

        if (filteredOrders.length === 0) {
            ordersList.innerHTML = '<p class="placeholder">Nenhum pedido encontrado.</p>';
        } else {
            filteredOrders.forEach(order => {
                const card = document.createElement('div');
                card.className = `order-item-card status-${order.status}`;
                card.dataset.id = order.id;
                const displayId = order.id.toString().slice(-6);
                const clientName = order.loja === 2 ? `${order.cliente} - Loja 2` : order.cliente;
                
                let actionButtonsHTML = '';
                if (order.status === 'pendente') {
                    actionButtonsHTML = `<button class="btn-success btn-small" data-action="start" title="Iniciar Preparo"><i class="fas fa-play"></i></button>`;
                } else if (order.status === 'em preparo') {
                    actionButtonsHTML = `<button class="btn-success btn-small" data-action="complete" title="Marcar como Pronto"><i class="fas fa-check"></i></button>`;
                } else if (order.status === 'pronto') {
                    actionButtonsHTML = `<button class="btn-secondary btn-small" data-action="reopen" title="Marcar como Em Preparo"><i class="fas fa-undo"></i></button>`;
                }

                card.innerHTML = `
                    ${order.prioridade ? '<i class="fas fa-star priority-icon" title="Pedido Urgente"></i>' : ''}
                    <h4>${clientName}</h4>
                    <p>Pedido #${displayId} - ${order.items.length} item(s)</p>
                    <div class="order-card-actions">
                        <button class="btn-secondary btn-small" data-action="view" title="Visualizar Pedido"><i class="fas fa-eye"></i></button>
                        <button class="btn-secondary btn-small" data-action="edit" title="Editar Pedido"><i class="fas fa-edit"></i></button>
                        ${order.status !== 'cancelado' ? `<button class="btn-danger btn-small" data-action="cancel" title="Cancelar Pedido"><i class="fas fa-times"></i></button>` : ''}
                        ${actionButtonsHTML}
                    </div>
                `;
                ordersList.appendChild(card);
            });
        }
    }

    function editOrder(orderId) {
        const orderToEdit = allOrdersFromListener.find(order => order.id === orderId);
        if (!orderToEdit) return;

        resetEntireOrder();
        document.querySelector(`.order-item-card[data-id="${orderId}"]`)?.classList.add('editing');
        editingOrderIdInput.value = orderToEdit.id;
        clienteNameInput.value = orderToEdit.cliente;
        extraItemsInput.value = orderToEdit.extras;
        enderecoEntregaInput.value = orderToEdit.endereco || '';
        document.querySelector(`input[name="tipo_pedido"][value="${orderToEdit.tipo}"]`).checked = true;
        
        if (orderToEdit.tipo === 'Entrega') {
            addressSection.classList.remove('hidden');
        } else {
            addressSection.classList.add('hidden');
        }

        prioridadeCheck.checked = orderToEdit.prioridade || false;
        loja2Check.checked = orderToEdit.loja === 2;
        currentOrderItems = JSON.parse(JSON.stringify(orderToEdit.items));
        updateOrderSummary();
        savePrintBtn.innerHTML = '<i class="fas fa-edit"></i> Atualizar Pedido';
        newOrderBtn.classList.remove('hidden');
    }

    function updateOrderCounts() {
        const total = allOrdersFromListener.length;
        document.getElementById('total-orders-count').textContent = total;
        document.getElementById('count-todos').textContent = total;
        const statusCounts = { pendente: 0, 'em preparo': 0, pronto: 0, cancelado: 0 };
        const typeCounts = { 'Na Loja': 0, 'Retirada': 0, 'Entrega': 0 };
        allOrdersFromListener.forEach(order => {
            if (statusCounts.hasOwnProperty(order.status)) { statusCounts[order.status]++; }
            if (typeCounts.hasOwnProperty(order.tipo)) { typeCounts[order.tipo]++; }
        });
        document.getElementById('count-pendente').textContent = statusCounts.pendente;
        document.getElementById('count-em-preparo').textContent = statusCounts['em preparo'];
        document.getElementById('count-pronto').textContent = statusCounts.pronto;
        document.getElementById('count-cancelado').textContent = statusCounts.cancelado;
        document.getElementById('count-na-loja').textContent = typeCounts['Na Loja'];
        document.getElementById('count-retirada').textContent = typeCounts['Retirada'];
        document.getElementById('count-entrega').textContent = typeCounts['Entrega'];
    }
    
    function listenToOrders() {
        if (unsubscribeOrders) unsubscribeOrders();
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const q = db.collection('pedidos').where('timestamp', '>=', startOfDay).orderBy('timestamp', 'desc');
        unsubscribeOrders = q.onSnapshot(snapshot => {
            allOrdersFromListener = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            updateOrderCounts();
            renderOrders();
        }, err => {
            console.error("Erro ao ouvir pedidos:", err);
            if (err.code === 'failed-precondition' && err.message.includes("index")) {
                 alert("ERRO DE BANCO DE DADOS: É necessário criar um índice no Firebase. Verifique o link no console de logs (F12) e crie o índice composto solicitado.");
            }
        });
    }

    function showOrderModal(order) {
        if (!order) return;
        let itemsHTML = order.items.map(item => `
            <div class="modal-item">
                <strong>- ${item.dish}</strong>
                ${item.sides.length > 0 ? `<ul>${item.sides.map(s => `<li>${s}</li>`).join('')}</ul>` : ''}
            </div>
        `).join('');
        const clientName = order.loja === 2 ? `${order.cliente} - Loja 2` : order.cliente;
        modalOrderDetails.innerHTML = `
            <p><strong>Cliente:</strong> ${clientName}</p>
            <p><strong>Tipo:</strong> ${order.tipo}</p>
            <p><strong>Status:</strong> ${order.status}</p>
            <p><strong>Prioridade:</strong> ${order.prioridade ? 'Sim' : 'Não'}</p>
            ${order.endereco ? `<p><strong>Endereço:</strong> ${order.endereco}</p>` : ''}
            ${order.extras ? `<p><strong>Extras:</strong> ${order.extras}</p>` : ''}
            ${order.status === 'cancelado' && order.cancelReason ? `<p><strong>Motivo do Cancelamento:</strong> ${order.cancelReason}</p>` : ''}
            <div class="modal-items-list">${itemsHTML}</div>
        `;
        viewOrderModal.classList.remove('hidden');
    }

    // =======================================================================================
    // FUNÇÃO DE GERAR PDF TOTALMENTE REFEITA PARA MAIOR CLAREZA E PROFISSIONALISMO
    // =======================================================================================
    function generateReportPdf(title, orders) {
        const { jsPDF } = window.jspdf;
        if (orders.length === 0) {
            alert("Não há pedidos para gerar este relatório.");
            return;
        }
    
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        // Helper para formatar os itens de um pedido em uma única string com quebras de linha
        const formatItems = (items) => {
            if (!items || items.length === 0) return 'N/A';
            return items.map(item => {
                let itemStr = item.dish; // O prato principal
                if (item.sides && item.sides.length > 0) {
                    // Adiciona cada acompanhamento em uma nova linha, indentado
                    const sidesStr = item.sides.map(side => `  - ${side}`).join('\n');
                    itemStr += `\n${sidesStr}`;
                }
                return itemStr;
            }).join('\n\n'); // Separa múltiplos itens no mesmo pedido com duas quebras de linha
        };
    
        // --- Cabeçalho ---
        doc.setFontSize(22);
        doc.setFont(undefined, 'bold');
        doc.text("Relatório de Performance - Mania Mix", pageWidth / 2, 20, { align: 'center' });
        doc.setFontSize(12);
        doc.setFont(undefined, 'normal');
        doc.text(title, pageWidth / 2, 28, { align: 'center' });
        doc.setFontSize(10);
        doc.setTextColor(150);
        doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, pageWidth / 2, 34, { align: 'center' });
    
        // --- Processamento de Dados ---
        const finishedOrders = orders.filter(o => o.status === 'pronto' || o.status === 'cancelado');
        const dishCount = {};
        orders.filter(o => o.status === 'pronto').forEach(order => {
            order.items.forEach(item => {
                dishCount[item.dish] = (dishCount[item.dish] || 0) + 1;
            });
        });
        const storeCount = { 'Loja 1': 0, 'Loja 2': 0 };
        finishedOrders.forEach(order => {
            if (order.loja === 2) storeCount['Loja 2']++;
            else storeCount['Loja 1']++;
        });
    
        // --- Tabelas com AutoTable ---
        const headStyles = { fillColor: [44, 14, 86], textColor: 255, fontStyle: 'bold' };
        const summaryHeadStyles = { fillColor: [88, 28, 172], fontStyle: 'bold', fontSize: 14 };
        
        // Tabela de Resumo de Pratos
        const dishData = Object.entries(dishCount)
            .sort((a, b) => b[1] - a[1])
            .map(([dish, count]) => [dish, count]);
        
        doc.autoTable({
            startY: 45,
            head: [['Resumo de Pratos Vendidos (Prontos)']],
            headStyles: summaryHeadStyles,
            body: [],
            theme: 'plain'
        });
        doc.autoTable({
            startY: doc.autoTable.previous.finalY,
            head: [['Prato', 'Quantidade']],
            body: dishData.length > 0 ? dishData : [['Nenhum prato finalizado.', '']],
            headStyles: headStyles,
            theme: 'striped'
        });
    
        // Tabela de Resumo por Loja
        const storeData = Object.entries(storeCount).map(([store, count]) => [store, count]);
        doc.autoTable({
            startY: doc.autoTable.previous.finalY + 10,
            head: [['Resumo por Loja (Prontos e Cancelados)']],
            headStyles: summaryHeadStyles,
            body: [],
            theme: 'plain'
        });
        doc.autoTable({
            startY: doc.autoTable.previous.finalY,
            head: [['Loja', 'Total de Pedidos']],
            body: storeData,
            headStyles: headStyles,
            theme: 'striped'
        });

        // Tabela de Pedidos Prontos
        const readyOrders = orders
            .filter(o => o.status === 'pronto')
            .map(o => [
                `#${o.id.slice(-6)}`, 
                o.cliente, 
                o.loja === 2 ? 'Loja 2' : 'Loja 1',
                formatItems(o.items)
            ]);
        
        doc.autoTable({
            startY: doc.autoTable.previous.finalY + 10,
            head: [['Pedidos Finalizados como "Prontos"']],
            headStyles: { fillColor: [22, 160, 133], fontStyle: 'bold', fontSize: 14 },
            body: [],
            theme: 'plain'
        });
        doc.autoTable({
            startY: doc.autoTable.previous.finalY,
            head: [['Nº Pedido', 'Cliente', 'Loja', 'Itens Pedidos']],
            body: readyOrders.length > 0 ? readyOrders : [['Nenhum pedido finalizado.', '', '', '']],
            headStyles: { fillColor: [26, 188, 156] },
            theme: 'grid',
            columnStyles: { 3: { cellWidth: 'auto' } }
        });

        // Tabela de Pedidos Cancelados
        const cancelledOrders = orders
            .filter(o => o.status === 'cancelado')
            .map(o => [
                `#${o.id.slice(-6)}`, 
                o.cliente, 
                formatItems(o.items),
                o.cancelReason || 'N/A'
            ]);

        doc.autoTable({
            startY: doc.autoTable.previous.finalY + 10,
            head: [['Pedidos "Cancelados"']],
            headStyles: { fillColor: [192, 57, 43], fontStyle: 'bold', fontSize: 14 },
            body: [],
            theme: 'plain'
        });
        doc.autoTable({
            startY: doc.autoTable.previous.finalY,
            head: [['Nº Pedido', 'Cliente', 'Itens do Pedido', 'Motivo']],
            body: cancelledOrders.length > 0 ? cancelledOrders : [['Nenhum pedido cancelado.', '', '', '']],
            headStyles: { fillColor: [231, 76, 60] },
            theme: 'grid',
            columnStyles: { 2: { cellWidth: 'auto' } }
        });

        // --- Rodapé ---
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text('Página ' + String(i) + ' de ' + String(pageCount), doc.internal.pageSize.width - 20, 287);
        }
    
        // Salva o arquivo
        const fileName = `${title.toLowerCase().replace(/[\s/]/g, '_').replace(/[^\w-]/g, '')}.pdf`;
        doc.save(fileName);
    }
    
    function generateDailyReport() {
        const title = `Relatório do Dia - ${new Date().toLocaleDateString('pt-BR')}`;
        generateReportPdf(title, allOrdersFromListener);
    }
    
    async function generateWeeklyReport() {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const monday = new Date(today.setDate(diff));
        monday.setHours(0, 0, 0, 0);
    
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);
    
        const title = `Relatório Semanal (${monday.toLocaleDateString('pt-BR')} - ${sunday.toLocaleDateString('pt-BR')})`;
    
        try {
            const snapshot = await db.collection('pedidos')
                .where('timestamp', '>=', monday)
                .where('timestamp', '<=', sunday)
                .get();
    
            const weeklyOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            generateReportPdf(title, weeklyOrders);
            
            if (new Date().getDay() === 0) {
                 if (confirm('RELATÓRIO SEMANAL GERADO!\n\nHoje é domingo. Deseja APAGAR TODOS os pedidos da semana para iniciar uma nova? ESTA AÇÃO NÃO PODE SER DESFEITA.')) {
                    const batch = db.batch();
                    snapshot.docs.forEach(doc => {
                        batch.delete(doc.ref);
                    });
                    await batch.commit();
                    alert(`${snapshot.size} pedidos da semana foram apagados com sucesso!`);
                }
            }
    
        } catch (error) {
            console.error("Erro ao gerar relatório semanal:", error);
            alert("Erro ao buscar dados para o relatório semanal. Verifique o console.");
        }
    }
    
    function setupAppEventListeners() {
        logoutBtn.addEventListener('click', () => auth.signOut());
        savePrintBtn.addEventListener('click', saveAndPrintOrder);
        employeePrintBtn.addEventListener('click', printEmployeeOrder);
        newOrderBtn.addEventListener('click', resetEntireOrder);
        generateDailyReportBtn.addEventListener('click', generateDailyReport);
        generateWeeklyReportBtn.addEventListener('click', generateWeeklyReport);
        searchInput.addEventListener('input', renderOrders);
        document.querySelectorAll('input[name="tipo_pedido"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.value === 'Entrega') {
                    addressSection.classList.remove('hidden');
                } else {
                    addressSection.classList.add('hidden');
                }
            });
        });
        orderFilters.addEventListener('click', e => {
            const target = e.target.closest('.filter-btn');
            if(!target) return;
            orderFilters.querySelector('.active').classList.remove('active');
            target.classList.add('active');
            currentStatusFilter = target.dataset.status;
            renderOrders();
        });
        typeFilters.addEventListener('click', e => {
            const target = e.target.closest('.filter-btn');
            if(!target) return;
            typeFilters.querySelector('.active').classList.remove('active');
            target.classList.add('active');
            currentTypeFilter = target.dataset.type;
            renderOrders();
        });
        priorityToggleBtn.addEventListener('click', () => {
            priorityFilterActive = !priorityFilterActive;
            priorityToggleBtn.classList.toggle('active', priorityFilterActive);
            renderOrders();
        });
        ordersList.addEventListener('click', e => {
            const button = e.target.closest('button');
            const card = e.target.closest('.order-item-card');
            if (!card) return;
            const orderId = card.dataset.id;
            const orderData = allOrdersFromListener.find(o => o.id === orderId);
            if (!orderData) return;
            if (button) {
                const action = button.dataset.action;
                if (action === 'start') { db.collection('pedidos').doc(orderId).update({ status: 'em preparo' }); }
                else if (action === 'complete') { db.collection('pedidos').doc(orderId).update({ status: 'pronto' }); }
                else if (action === 'reopen') { db.collection('pedidos').doc(orderId).update({ status: 'em preparo' }); }
                else if (action === 'cancel') {
                    const reason = prompt(`Por favor, digite o motivo do cancelamento para o pedido de ${orderData?.cliente}:`);
                    if (reason) {
                        db.collection('pedidos').doc(orderId).update({ status: 'cancelado', cancelReason: reason });
                    }
                }
                else if (action === 'view') { showOrderModal(orderData); }
                else if (action === 'edit') {
                    editOrder(orderId);
                    if (window.innerWidth <= 1024) { appContainer.classList.add('view-main'); }
                }
            } else {
                showOrderModal(orderData);
            }
        });
        menuContent.addEventListener('change', e => {
             if (e.target.name === 'main-dish') {
                document.querySelectorAll('.sides-container').forEach(c => { c.innerHTML = ''; c.classList.add('hidden'); });
                const groupIndex = e.target.dataset.groupIndex;
                const sidesContainer = document.getElementById(`sides-group-${groupIndex}`);
                if (menuData[groupIndex] && menuData[groupIndex].sides) {
                    sidesContainer.innerHTML = menuData[groupIndex].sides.map(s => `<label class="side-checkbox"><input type="checkbox" name="side" value="${s}">${s}</label>`).join('');
                    if (menuData[groupIndex].sides.length > 0) {
                        sidesContainer.classList.remove('hidden');
                    }
                }
            }
        });
        addItemBtn.addEventListener('click', () => {
            if (isAddingItem) return;
            const selectedDishRadio = document.querySelector('input[name="main-dish"]:checked');
            if (!selectedDishRadio) {
                alert('Selecione um prato para adicionar.');
                return;
            }
            isAddingItem = true;
            const groupIndex = selectedDishRadio.dataset.groupIndex;
            currentOrderItems.push({
                dish: selectedDishRadio.value,
                sides: Array.from(document.querySelectorAll(`#sides-group-${groupIndex} input[name="side"]:checked`)).map(cb => cb.value)
            });
            clearMenuSelection();
            updateOrderSummary();
            setTimeout(() => { isAddingItem = false; }, 300);
        });
        orderSummaryItems.addEventListener('click', e => {
            const target = e.target.closest('button');
            if (!target) return;
            const index = parseInt(target.dataset.index);
            if (target.classList.contains('delete-item-btn')) { currentOrderItems.splice(index, 1); }
            if (target.classList.contains('dupe-item-btn')) {
                const itemCopy = JSON.parse(JSON.stringify(currentOrderItems[index]));
                currentOrderItems.splice(index + 1, 0, itemCopy);
            }
            if (target.classList.contains('edit-item-btn')) {
                const itemToEdit = currentOrderItems.splice(index, 1)[0];
                const dishRadio = document.querySelector(`input[name="main-dish"][value="${itemToEdit.dish}"]`);
                if (dishRadio) {
                    dishRadio.checked = true;
                    dishRadio.dispatchEvent(new Event('change', { bubbles: true }));
                    setTimeout(() => {
                        itemToEdit.sides.forEach(side => {
                            const cb = document.querySelector(`input[name="side"][value="${side}"]`);
                            if (cb) cb.checked = true;
                        });
                    }, 50);
                }
            }
            updateOrderSummary();
        });
        mobileFab.addEventListener('click', () => { appContainer.classList.add('view-main'); });
        mobileBackBtn.addEventListener('click', () => { appContainer.classList.remove('view-main'); });
        closeModalBtn.addEventListener('click', () => { viewOrderModal.classList.add('hidden'); });
        viewOrderModal.addEventListener('click', e => {
            if (e.target === viewOrderModal) { viewOrderModal.classList.add('hidden'); }
        });
    }
}
