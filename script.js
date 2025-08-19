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

        const createGroupUI = (group = { name: '', dishes: '', sides: '' }) => {
            const card = document.createElement('div');
            card.className = 'menu-group-admin-card';
            card.innerHTML = `
                <button class="btn-danger btn-small delete-group-btn" title="Excluir este grupo"><i class="fas fa-trash"></i></button>
                <input type="text" class="group-name" placeholder="Nome do Grupo (Ex: Pratos do Dia)" value="${group.name}">
                <div style="display: flex; gap: 1rem;">
                    <textarea class="group-dishes" placeholder="Pratos (um por linha)">${group.dishes}</textarea>
                    <textarea class="group-sides" placeholder="Acompanhamentos (um por linha)">${group.sides}</textarea>
                </div>
            `;
            menuGroupsContainer.appendChild(card);
        };

        menuGroupsContainer.addEventListener('click', e => {
            if (e.target.closest('.delete-group-btn')) {
                if (confirm('Tem certeza que deseja excluir este grupo de pratos?')) {
                    e.target.closest('.menu-group-admin-card').remove();
                }
            }
        });

        const loadMenuFromFirebase = async () => {
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
        };

        const saveMenuToFirebase = () => {
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
        };

        addGroupBtn.addEventListener('click', () => createGroupUI());
        saveMenuBtn.addEventListener('click', saveMenuToFirebase);
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
    const authTitle = document.getElementById('auth-title');
    const authSubtitle = document.getElementById('auth-subtitle');
    const menuContent = document.querySelector('.menu-groups-wrapper');
    const ordersList = document.getElementById('orders-list');
    const orderSummaryItems = document.getElementById('order-summary-items');
    const clienteNameInput = document.getElementById('cliente-name');
    const extraItemsInput = document.getElementById('extra-items');
    const editingOrderIdInput = document.getElementById('editing-order-id');
    const savePrintBtn = document.getElementById('save-print-btn');
    const newOrderBtn = document.getElementById('new-order-btn');
    const addItemBtn = document.getElementById('add-item-btn');
    const deleteAllOrdersBtn = document.getElementById('deleteAllOrdersBtn');
    const orderFilters = document.querySelector('.order-filters');
    const searchInput = document.getElementById('searchInput');

    // ESTADO
    let menuData = [];
    let currentOrderItems = [];
    let displayedOrders = [];
    let currentFilter = 'em preparo';
    let unsubscribeOrders;

    // LÓGICA DE INICIALIZAÇÃO E AUTENTICAÇÃO
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
    
    authToggleLink.addEventListener('click', e => {
        e.preventDefault();
        loginForm.classList.toggle('hidden');
        registerForm.classList.toggle('hidden');
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

    // FUNÇÕES DE LÓGICA
    const resetEntireOrder = () => {
        currentOrderItems = [];
        clienteNameInput.value = '';
        extraItemsInput.value = '';
        editingOrderIdInput.value = '';
        document.querySelector('#retirada').checked = true;
        document.querySelectorAll('.order-item-card.editing').forEach(c => c.classList.remove('editing'));
        savePrintBtn.innerHTML = '<i class="fas fa-print"></i> Finalizar e Imprimir';
        newOrderBtn.classList.add('hidden');
        clearMenuSelection();
        updateOrderSummary();
    };

    const clearMenuSelection = () => {
        const selectedDish = document.querySelector('input[name="main-dish"]:checked');
        if (selectedDish) selectedDish.checked = false;
        document.querySelectorAll('.sides-container').forEach(c => {
            c.innerHTML = '';
            c.classList.add('hidden');
        });
    };

    const updateOrderSummary = () => {
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
    };

    const loadMenu = async () => {
        const docRef = db.collection('configuracao').doc('cardapio-do-dia');
        const docSnap = await docRef.get();
        if (docSnap.exists && docSnap.data().menu.length > 0) {
            menuData = docSnap.data().menu;
            renderMenu(menuData);
        } else {
            menuContent.innerHTML = '<h3>👋 Cardápio do dia não cadastrado.</h3>';
        }
    };

    const renderMenu = (menu) => {
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
    };

    const saveAndPrintOrder = () => {
        const cliente = clienteNameInput.value.trim();
        if (currentOrderItems.length === 0) return alert('O pedido está vazio!');
        if (!cliente) return alert('Digite o nome do cliente!');
        
        const orderId = editingOrderIdInput.value;
        const orderData = {
            cliente,
            items: currentOrderItems,
            extras: extraItemsInput.value.trim(),
            tipo: document.querySelector('input[name="tipo_pedido"]:checked').value,
            status: 'em preparo',
            timestamp: serverTimestamp()
        };

        const operation = orderId 
            ? db.collection('pedidos').doc(orderId).update(orderData)
            : db.collection('pedidos').add(orderData);

        operation.then((docRef) => {
            const finalOrderData = { id: orderId || docRef.id, ...orderData };
            printReceipt(finalOrderData);
            resetEntireOrder();
        }).catch(err => alert('Erro: ' + err.message));
    };

    const printReceipt = (order) => {
        const now = (order.timestamp && order.timestamp.toDate) ? order.timestamp.toDate() : new Date();
        const hora = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const orderNumber = (order.id || Date.now().toString()).slice(-6);

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
                <h1>${order.tipo.toUpperCase()}</h1>
            </div>
            <hr>
            <div class="recibo-info">
                <span>Pedido: ${orderNumber}</span> 
                <span>Hora: ${hora}</span>
            </div>
            <div class="recibo-section">
                <h2>Cliente: ${order.cliente}</h2>
            </div>
            <hr>
            ${itemsHTML}
            ${order.extras ? `<hr><div class="recibo-item"><p>EXTRAS:</p><ul><li>${order.extras}</li></ul></div>` : ''}
        `;
        document.getElementById('recibo-container').innerHTML = reciboHTML;
        window.print();
    };

    const renderOrders = () => {
        ordersList.innerHTML = '';
        const searchTerm = searchInput.value.toLowerCase();

        const filteredOrders = displayedOrders
            .filter(order => order.status === currentFilter)
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
                card.innerHTML = `
                    <h4>${order.cliente}</h4>
                    <p>Pedido #${displayId} - ${order.items.length} item(s)</p>
                    <div class="order-card-actions">
                        <button class="btn-secondary btn-small" data-action="edit" title="Editar Pedido"><i class="fas fa-edit"></i></button>
                        <button class="btn-secondary btn-small" data-action="reprint" title="Reimprimir Pedido"><i class="fas fa-print"></i></button>
                        <button class="btn-danger btn-small" data-action="delete" title="Apagar Pedido"><i class="fas fa-trash"></i></button>
                        ${order.status === 'em preparo' ? 
                            `<button class="btn-success btn-small" data-action="complete" title="Marcar como Pronto"><i class="fas fa-check"></i></button>` : 
                            `<button class="btn-secondary btn-small" data-action="reopen" title="Marcar como Em Preparo"><i class="fas fa-undo"></i></button>`
                        }
                    </div>
                `;
                ordersList.appendChild(card);
            });
        }
    };

    const editOrder = (orderId) => {
        const orderToEdit = displayedOrders.find(order => order.id === orderId);
        if(!orderToEdit) return;

        resetEntireOrder();
        document.querySelector(`.order-item-card[data-id="${orderId}"]`)?.classList.add('editing');
        editingOrderIdInput.value = orderToEdit.id;
        clienteNameInput.value = orderToEdit.cliente;
        extraItemsInput.value = orderToEdit.extras;
        document.querySelector(`input[name="tipo_pedido"][value="${orderToEdit.tipo}"]`).checked = true;
        currentOrderItems = JSON.parse(JSON.stringify(orderToEdit.items));
        updateOrderSummary();
        savePrintBtn.innerHTML = '<i class="fas fa-edit"></i> Atualizar Pedido';
        newOrderBtn.classList.remove('hidden');
    };

    const deleteAllOrders = () => {
        if (!confirm('ATENÇÃO MÁXIMA:\nEsta ação vai APAGAR PERMANENTEMENTE TODOS OS PEDIDOS (prontos e em preparo) do banco de dados.\n\nEsta ação é irreversível e visa economizar espaço no Firebase. Deseja continuar?')) return;
        
        let deletedCount = 0; // Variável para a contagem

        db.collection('pedidos').get().then(snapshot => {
            if (snapshot.empty) {
                alert("Não há nenhum pedido no banco de dados para excluir.");
                return;
            }
            deletedCount = snapshot.size; // Guarda o número antes de deletar
            const batch = db.batch();
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            return batch.commit();
        }).then(() => {
            if (deletedCount > 0) {
                alert(`Todos os ${deletedCount} pedidos foram excluídos com sucesso do Firebase.`);
            }
        }).catch(err => {
            console.error("Erro ao excluir todos os pedidos:", err);
            alert("ERRO: Não foi possível excluir os pedidos. Verifique o console para mais detalhes.");
        });
    };
    
    function listenToOrders() {
        if (unsubscribeOrders) unsubscribeOrders();

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const q = db.collection('pedidos')
            .where('timestamp', '>=', startOfDay)
            .orderBy('timestamp', 'desc');

        unsubscribeOrders = q.onSnapshot(snapshot => {
            displayedOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderOrders();
        }, err => {
            console.error("Erro ao ouvir pedidos:", err);
            if (err.message.includes("requires an index")) {
                alert("ERRO: Não foi possível carregar os pedidos. É necessário criar um índice no Firebase. Verifique o console para um link ou crie manualmente: coleção 'pedidos', campo 'timestamp' em ordem 'Decrescente'.");
            }
        });
    }
    
    function setupAppEventListeners() {
        logoutBtn.addEventListener('click', () => auth.signOut());
        savePrintBtn.addEventListener('click', saveAndPrintOrder);
        newOrderBtn.addEventListener('click', resetEntireOrder);
        deleteAllOrdersBtn.addEventListener('click', deleteAllOrders);
        searchInput.addEventListener('input', renderOrders);
        
        orderFilters.addEventListener('click', e => {
            const target = e.target.closest('.filter-btn');
            if(!target) return;
            orderFilters.querySelector('.active').classList.remove('active');
            target.classList.add('active');
            currentFilter = target.dataset.status;
            renderOrders();
        });

        ordersList.addEventListener('click', e => {
            const target = e.target.closest('button');
            if(!target) return;
            
            const action = target.dataset.action;
            const card = target.closest('.order-item-card');
            if (!card) return;
            const orderId = card.dataset.id;
            
            if (!orderId) {
                console.error("Não foi possível encontrar o ID do pedido no card.");
                return;
            }
            
            const orderData = displayedOrders.find(o => o.id === orderId);

            if (action === 'complete') {
                db.collection('pedidos').doc(orderId).update({ status: 'pronto' }).catch(err => console.error("Erro ao completar:", err));
            } else if (action === 'reopen') {
                db.collection('pedidos').doc(orderId).update({ status: 'em preparo' }).catch(err => console.error("Erro ao reabrir:", err));
            } else if (action === 'reprint') {
                if(orderData) printReceipt(orderData);
            } else if (action === 'delete') {
                if (confirm(`ATENÇÃO:\nEsta ação vai APAGAR PERMANENTEMENTE o pedido de ${orderData?.cliente || 'desconhecido'}.\n\nDeseja continuar?`)) {
                    db.collection('pedidos').doc(orderId).delete().catch(err => console.error("Erro ao deletar:", err));
                }
            } else if (action === 'edit') {
                editOrder(orderId);
            }
        });
        
        menuContent.addEventListener('change', e => {
            if (e.target.name === 'main-dish') {
                document.querySelectorAll('.sides-container').forEach(c => {
                    c.innerHTML = '';
                    c.classList.add('hidden');
                });
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
            const selectedDishRadio = document.querySelector('input[name="main-dish"]:checked');
            if (!selectedDishRadio) return alert('Selecione um prato para adicionar.');
            const groupIndex = selectedDishRadio.dataset.groupIndex;

            currentOrderItems.push({
                dish: selectedDishRadio.value,
                sides: Array.from(document.querySelectorAll(`#sides-group-${groupIndex} input[name="side"]:checked`)).map(cb => cb.value)
            });
            clearMenuSelection();
            updateOrderSummary();
        });

        orderSummaryItems.addEventListener('click', e => {
            const target = e.target.closest('button');
            if (!target) return;
            const index = parseInt(target.dataset.index);

            if (target.classList.contains('delete-item-btn')) {
                currentOrderItems.splice(index, 1);
            }
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
    }
}
