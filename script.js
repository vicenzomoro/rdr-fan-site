document.addEventListener("DOMContentLoaded", () => {
    // === Scroll Effects ===
    const reveals = document.querySelectorAll(".reveal");
    const navbar = document.querySelector(".navbar");

    const handleScroll = () => {
        if (window.scrollY > 50) {
            navbar.classList.add("scrolled");
        } else {
            navbar.classList.remove("scrolled");
        }

        reveals.forEach((reveal) => {
            const windowHeight = window.innerHeight;
            const revealTop = reveal.getBoundingClientRect().top;
            const revealPoint = 150;

            if (revealTop < windowHeight - revealPoint) {
                reveal.classList.add("active");
            }
        });
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();

    // === Authentication State ===
    const currentUser = localStorage.getItem('currentUser');
    const loginBtn = document.getElementById('nav-login-btn');
    const authorInput = document.getElementById('author');
    const commentInput = document.getElementById('text');
    const commentSubmit = document.querySelector('#comment-form button');

    if (currentUser) {
        if (loginBtn) {
            loginBtn.innerHTML = '<span>Sair (' + currentUser + ')</span>';
            loginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('currentUser');
                window.location.reload();
            });
        }
        if (authorInput) {
            authorInput.value = currentUser;
            authorInput.disabled = true;
        }
    } else {
        if (commentInput) {
            commentInput.placeholder = "Faca login para comentar...";
            commentInput.disabled = true;
        }
        if (authorInput) authorInput.disabled = true;
        if (commentSubmit) commentSubmit.disabled = true;
    }

    const escapeHtml = (str) => {
        if (!str) return '';
        return String(str).replace(/[&<>"']/g, (s) => {
            const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
            return map[s];
        });
    };

    // === TOAST NOTIFICATION SYSTEM ===
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }

    window.showToast = (message, type) => {
        type = type || 'info';
        const toast = document.createElement('div');
        toast.className = 'toast toast-' + type;
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 4000);
    };

    // === Comments System ===
    const commentsList = document.getElementById("comments-list");
    const commentForm = document.getElementById("comment-form");

    const loadComments = async () => {
        if (!commentsList) return;
        try {
            commentsList.innerHTML = '<div class="loader">Carregando relatos...</div>';
            const response = await fetch('/api/comments');
            const data = await response.json();
            commentsList.innerHTML = '';

            const comments = data.data || [];
            if (comments.length > 0) {
                comments.forEach(c => {
                    const card = document.createElement("div");
                    card.className = "glass-card comment-card reveal active";
                    card.innerHTML = '<div style="display:flex; justify-content:space-between; margin-bottom:10px;">' +
                        '<strong style="color:var(--gold); font-size:1.1rem;">' + escapeHtml(c.author) + '</strong>' +
                        '<small style="color:var(--text-muted);">' + escapeHtml(c.date) + '</small>' +
                        '</div>' +
                        '<p style="color:var(--text-main); line-height:1.6;">' + escapeHtml(c.text) + '</p>';
                    commentsList.appendChild(card);
                });
            } else {
                commentsList.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:40px;">Seja o primeiro a relatar suas aventuras!</p>';
            }
        } catch (err) {
            commentsList.innerHTML = '<p style="color:var(--primary-red); text-align:center;">Erro ao carregar relatos.</p>';
        }
    };

    if (commentForm) {
        commentForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (!currentUser) return alert("Voce precisa estar logado.");

            const text = commentInput.value.trim();
            if (!text) return;

            const btn = e.target.querySelector('button');
            const originalText = btn.innerHTML;
            btn.innerHTML = 'Enviando...';
            btn.disabled = true;

            try {
                const res = await fetch('/api/comments', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ author: currentUser, text: text, date: new Date().toLocaleDateString() })
                });

                if (res.ok) {
                    commentInput.value = "";
                    loadComments();
                    showToast("Relato publicado com sucesso!", "success");
                }
            } catch (err) {
                console.error(err);
                showToast("Erro ao publicar relato.", "error");
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
    }

    if (commentsList) loadComments();

    // === Q&A Section ===
    const questionsList = document.getElementById("questions-list");
    const questionForm = document.getElementById("question-form");

    const loadQuestions = async () => {
        if (!questionsList) return;
        try {
            const res = await fetch('/api/questions');
            const data = await res.json();
            questionsList.innerHTML = '';
            const qs = data.data || [];

            if (qs.length > 0) {
                qs.forEach(q => {
                    const card = document.createElement("div");
                    card.className = "glass-card reveal active";
                    card.style.marginBottom = "20px";
                    card.innerHTML = '<h3 style="color:var(--primary-red); margin-bottom:10px; font-family:\'Rye\';">' + escapeHtml(q.title) + '</h3>' +
                        '<p style="margin-bottom:15px; color:var(--text-main);">' + escapeHtml(q.text) + '</p>' +
                        '<div style="display:flex; justify-content:space-between; align-items:center;">' +
                        '<small style="color:var(--text-muted);">Por ' + escapeHtml(q.author) + ' | ' + escapeHtml(q.date) + '</small>' +
                        '</div>';
                    questionsList.appendChild(card);
                });
            } else {
                questionsList.innerHTML = '<p style="text-align:center; color:var(--text-muted);">Procure o Xerife ou poste sua duvida.</p>';
            }
        } catch (err) { console.error(err); }
    };

    if (questionForm) {
        questionForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const title = document.getElementById('question-title').value.trim();
            const text = document.getElementById('question-text').value.trim();
            if (!title || !text) return;

            try {
                const res = await fetch('/api/questions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ author: currentUser || 'Anonimo', title: title, text: text, date: new Date().toLocaleDateString() })
                });
                if (res.ok) {
                    questionForm.reset();
                    loadQuestions();
                    showToast("Duvida publicada com sucesso!", "success");
                }
            } catch (err) { console.error(err); }
        });
    }

    if (questionsList) loadQuestions();

    // === Mod Gallery ===
    const modsGallery = document.getElementById("mods-gallery");
    const modSearchInput = document.getElementById("mod-search");

    const fetchMods = async (search) => {
        search = search || '';
        if (!modsGallery) return;
        try {
            const res = await fetch('/api/mods?search=' + encodeURIComponent(search));
            const data = await res.json();
            modsGallery.innerHTML = '';
            const mods = data.data || [];

            if (mods.length > 0) {
                mods.forEach(mod => {
                    const card = document.createElement("div");
                    card.className = "glass-card reveal active";
                    card.innerHTML = '<div class="mod-badge">MOD</div>' +
                        '<h3 style="color:var(--gold); margin-bottom:10px;">' + escapeHtml(mod.title) + '</h3>' +
                        '<p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:20px;">' + escapeHtml(mod.description || 'Sem descricao.') + '</p>' +
                        '<div style="display:flex; justify-content:space-between; align-items:center;">' +
                        '<span style="font-size:0.8rem; color:var(--text-main);">👤 ' + escapeHtml(mod.username) + '</span>' +
                        '<a href="' + escapeHtml(mod.link) + '" target="_blank" class="btn btn-primary" style="padding:6px 15px; font-size:0.8rem;">BAIXAR</a>' +
                        '</div>';
                    modsGallery.appendChild(card);
                });
            } else {
                modsGallery.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:40px;">Nenhum mod encontrado.</p>';
            }
        } catch (err) { console.error(err); }
    };

    window.handleSearch = () => {
        if (modSearchInput) fetchMods(modSearchInput.value);
    };

    window.filterMods = (filter) => {
        const btns = document.querySelectorAll('.mod-nav-btn');
        btns.forEach(b => b.classList.remove('active'));
        const activeBtn = document.querySelector('.mod-nav-btn[onclick*="filterMods(\'' + filter + '\')"]');
        if (activeBtn) activeBtn.classList.add('active');
        if (modsGallery) fetchMods(modSearchInput ? modSearchInput.value : '');
    };

    if (modsGallery) fetchMods();

    // === Mod Submission ===
    const modForm = document.getElementById("mod-form");
    if (modForm) {
        modForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const title = document.getElementById('mod-title').value.trim();
            const description = document.getElementById('mod-description').value.trim();
            const fileInput = document.getElementById('mod-file');
            const status = document.getElementById('mod-status');

            if (!title || !fileInput.files[0]) return;

            const btn = e.target.querySelector('button');
            const originalText = btn.innerHTML;
            btn.innerHTML = 'Enviando... Aguarde o Xerife...';
            btn.disabled = true;

            var formData = new FormData();
            formData.append('title', title);
            formData.append('description', description);
            formData.append('username', currentUser || "Anonimo");
            formData.append('file', fileInput.files[0]);

            try {
                const res = await fetch('/api/mods', {
                    method: 'POST',
                    body: formData
                });

                const result = await res.json();

                if (res.ok) {
                    modForm.reset();
                    showToast("Mod enviado para o escritorio do Xerife! Aguarde aprovacao.", "success");
                    status.innerText = "Mod enviado com sucesso!";
                    status.style.color = "#28a745";
                    status.style.display = "block";
                } else {
                    showToast("Erro: " + (result.error || "Tente novamente."), "error");
                    status.innerText = "Erro: " + (result.error || "Tente novamente.");
                    status.style.color = "var(--primary-red)";
                    status.style.display = "block";
                }
            } catch (err) {
                console.error(err);
                showToast("O telegrafo falhou. Verifique sua conexao.", "error");
                status.innerText = "Erro de conexao.";
                status.style.color = "var(--primary-red)";
                status.style.display = "block";
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
                setTimeout(function () { status.style.display = "none"; }, 5000);
            }
        });
    }

    // === Feedback System ===
    const feedbackForm = document.getElementById("feedback-form");
    if (feedbackForm) {
        feedbackForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const message = document.getElementById('feedback-text').value.trim();
            const status = document.getElementById('feedback-status');
            if (!message) return;

            try {
                const res = await fetch('/api/feedback', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: currentUser || "Anonimo", message: message })
                });
                if (res.ok) {
                    feedbackForm.reset();
                    showToast("Feedback enviado com sucesso!", "success");
                    status.innerText = "Feedback enviado com sucesso!";
                    status.style.color = "#28a745";
                    status.style.display = "block";
                    setTimeout(function () { status.style.display = "none"; }, 3000);
                }
            } catch (err) { console.error(err); }
        });
    }

    // === DONATION SYSTEM ===
    
    // Selecionar valor da doação
    window.selectDonationAmount = function(amount) {
        var btns = document.querySelectorAll('.donation-amount-btn');
        btns.forEach(function(btn) { btn.classList.remove('active'); });
        event.target.classList.add('active');
        document.getElementById('custom-amount').value = '';
        document.getElementById('donation-amount').value = amount;
    };
    
    // Limpar seleção de botões ao digitar valor personalizado
    window.clearDonationButtons = function() {
        var btns = document.querySelectorAll('.donation-amount-btn');
        btns.forEach(function(btn) { btn.classList.remove('active'); });
        var customValue = document.getElementById('custom-amount').value;
        if (customValue) {
            document.getElementById('donation-amount').value = customValue;
        }
    };
    
    // Selecionar método de pagamento (apenas PIX)
    window.selectDonationMethod = function(method) {
        var cards = document.querySelectorAll('.donation-method-card');
        cards.forEach(function(card) { card.classList.remove('selected'); });
        document.getElementById('method-' + method).classList.add('selected');
        document.getElementById('donation-method').value = method;
    };
    
    // Copiar chave PIX
    window.copyPixKey = function() {
        var pixKey = document.getElementById('pix-key').textContent;
        navigator.clipboard.writeText(pixKey).then(function() {
            showToast('Chave PIX copiada!', 'success');
        }).catch(function() {
            showToast('Erro ao copiar chave.', 'error');
        });
    };
    
    // Carregar doadores
    var loadDonors = async function() {
        var donorsList = document.getElementById('donors-list');
        if (!donorsList) return;
        
        try {
            var res = await fetch('/api/donations?limit=20');
            var data = await res.json();
            var donations = data.data || [];
            
            donorsList.innerHTML = '';
            
            if (donations.length === 0) {
                donorsList.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 30px; grid-column: 1/-1;">Seja o primeiro a apoiar o acampamento!</p>';
                return;
            }
            
            donations.forEach(function(d) {
                var card = document.createElement('div');
                card.className = 'donor-card';
                
                // Determinar badge baseado no valor
                var badgeClass = 'supporter';
                var badgeText = 'Apoiador';
                var amount = parseFloat(d.amount);
                
                if (amount >= 100) {
                    badgeClass = 'legendary';
                    badgeText = 'Lendário';
                } else if (amount >= 50) {
                    badgeClass = 'hero';
                    badgeText = 'Herói';
                } else if (amount >= 20) {
                    badgeClass = 'hero';
                    badgeText = 'Parceiro';
                }
                
                var dateObj = new Date(d.created_at);
                var dateStr = dateObj.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
                
                card.innerHTML = 
                    '<div class="donor-name">' + escapeHtml(d.donor_name) + '</div>' +
                    '<div class="donor-amount">R$ ' + amount.toFixed(2) + '</div>' +
                    '<div class="donor-date">' + dateStr + '</div>' +
                    '<span class="donor-badge ' + badgeClass + '">' + badgeText + '</span>';
                
                donorsList.appendChild(card);
            });
        } catch (err) {
            console.error('Erro ao carregar doadores:', err);
            donorsList.innerHTML = '<p style="color: var(--primary-red); text-align: center;">Erro ao carregar apoiadores.</p>';
        }
    };
    
    // Formulário de doação
    var donationForm = document.getElementById('donation-form');
    if (donationForm) {
        // =====================================================
        // ⚠️ CONFIGURAÇÃO PIX ⚠️
        // Chave PIX aleatória: 353f7783-5765-4979-8495-195eed6eb8a1
        // =====================================================
        
        var PIX_KEY = '353f7783-5765-4979-8495-195eed6eb8a1';
        
        // Inserir chave PIX na tela
        var pixKeyEl = document.getElementById('pix-key');
        if (pixKeyEl) pixKeyEl.textContent = PIX_KEY;
        
        donationForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            var name = document.getElementById('donor-name').value.trim();
            var email = document.getElementById('donor-email').value.trim();
            var amount = document.getElementById('donation-amount').value;
            var method = 'pix'; // Sempre PIX
            
            if (!name || !amount) {
                showToast('Preencha nome e valor.', 'error');
                return;
            }
            
            var btn = donationForm.querySelector('button');
            var originalText = btn.innerHTML;
            btn.innerHTML = 'Processando...';
            btn.disabled = true;
            
            try {
                var res = await fetch('/api/donations', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        donor_name: name,
                        donor_email: email || null,
                        amount: parseFloat(amount),
                        payment_method: method,
                        is_public: true
                    })
                });
                
                var result = await res.json();
                
                if (res.ok) {
                    showToast('Doação registrada! Obrigado pelo apoio, parceiro!', 'success');
                    document.getElementById('donation-status').innerText = 'Obrigado! Sua doação ajuda a manter o acampamento!';
                    document.getElementById('donation-status').style.color = '#28a745';
                    document.getElementById('donation-status').style.display = 'block';
                    donationForm.reset();
                    loadDonors();
                } else {
                    showToast('Erro: ' + (result.error || 'Tente novamente.'), 'error');
                }
            } catch (err) {
                console.error(err);
                showToast('Erro de conexão. Tente novamente.', 'error');
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
                setTimeout(function() { 
                    document.getElementById('donation-status').style.display = 'none'; 
                }, 5000);
            }
        });
        
        // Carregar doadores ao iniciar
        loadDonors();
    }

    // === AI Chat ===
    const chatToggle = document.getElementById("ai-chat-toggle");
    const chatWindow = document.getElementById("ai-chat-window");
    const chatMessages = document.getElementById("chat-messages");
    const chatInput = document.getElementById("chat-input");
    const sendBtn = document.getElementById("send-chat");

    if (chatToggle && chatWindow) {
        chatToggle.addEventListener("click", () => {
            chatWindow.style.display = "flex";
            chatWindow.classList.add("active");
            chatToggle.style.display = "none";
        });
    }

    window.closeChat = () => {
        if (chatWindow) {
            chatWindow.style.display = "none";
            chatWindow.classList.remove("active");
        }
        if (chatToggle) chatToggle.style.display = "flex";
    };

    const addMessage = (text, type) => {
        const msg = document.createElement("div");
        if (type === 'user') {
            msg.className = 'user-msg';
            msg.innerHTML = '<div class="content">' + escapeHtml(text) + '</div>';
        } else {
            msg.className = 'ai-msg';
            msg.innerHTML = '<div class="ai-msg-avatar">🤠</div><div class="content">' + escapeHtml(text) + '</div>';
        }
        chatMessages.appendChild(msg);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    };

    const handleChat = async () => {
        const text = chatInput.value.trim();
        if (!text) return;

        addMessage(text, 'user');
        chatInput.value = "";

        const typing = document.createElement("div");
        typing.className = "ai-msg typing";
        typing.innerHTML = '<div class="ai-msg-avatar">🤠</div><div class="content">Dutch está pensando...</div>';
        chatMessages.appendChild(typing);

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text })
            });
            const data = await res.json();
            chatMessages.removeChild(typing);
            const reply = res.ok ? (data.response || data.error || 'Sem resposta.') : (data.error || 'O telegrafo falhou.');
            addMessage(reply, 'ai');
        } catch (err) {
            chatMessages.removeChild(typing);
            addMessage("O telegrafo falhou, tente novamente!", 'ai');
        }
    };

    if (sendBtn) {
        sendBtn.addEventListener("click", handleChat);
        chatInput.addEventListener("keypress", (e) => { if (e.key === 'Enter') handleChat(); });
    }

    // === NOTIFICATION BELL SYSTEM ===
    if (currentUser) {
        const navElement = document.querySelector('.navbar nav');
        if (navElement) {
            const wrapper = document.createElement('div');
            wrapper.className = 'notif-wrapper';
            wrapper.style.display = 'inline-flex';
            wrapper.style.alignItems = 'center';
            wrapper.innerHTML = '<button class="notif-bell" id="notif-bell">' +
                '🔔' +
                '<span class="notif-badge" id="notif-badge" style="display:none;">0</span>' +
                '</button>' +
                '<div class="notif-dropdown" id="notif-dropdown">' +
                '<div class="notif-header">' +
                '<h4>Notificações</h4>' +
                '<button class="notif-mark-read" id="mark-all-read">Marcar como lidas</button>' +
                '</div>' +
                '<div id="notif-list">' +
                '<p class="notif-empty">Nenhuma notificação, parceiro.</p>' +
                '</div>' +
                '</div>';
            navElement.parentNode.insertBefore(wrapper, navElement.nextSibling);

            var bell = document.getElementById('notif-bell');
            var dropdown = document.getElementById('notif-dropdown');
            var badge = document.getElementById('notif-badge');
            var notifList = document.getElementById('notif-list');

            // Toggle dropdown
            bell.addEventListener('click', function (e) {
                e.stopPropagation();
                dropdown.classList.toggle('active');
                if (dropdown.classList.contains('active')) {
                    loadNotifications();
                }
            });

            // Close on outside click
            document.addEventListener('click', function (e) {
                if (!wrapper.contains(e.target)) {
                    dropdown.classList.remove('active');
                }
            });

            // Mark all as read
            document.getElementById('mark-all-read').addEventListener('click', async function () {
                await fetch('/api/notifications/read-all', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: currentUser })
                });
                loadNotifications();
                showToast('Todas as notificações marcadas como lidas!', 'success');
            });

            var timeAgo = function (dateStr) {
                var diff = Date.now() - new Date(dateStr).getTime();
                var mins = Math.floor(diff / 60000);
                if (mins < 1) return 'agora';
                if (mins < 60) return mins + 'min';
                var hours = Math.floor(mins / 60);
                if (hours < 24) return hours + 'h';
                var days = Math.floor(hours / 24);
                return days + 'd';
            };

            var loadNotifications = async function () {
                try {
                    var res = await fetch('/api/notifications/' + encodeURIComponent(currentUser));
                    var data = await res.json();
                    var notifications = data.data || [];
                    var unread = notifications.filter(function (n) { return !n.is_read; }).length;

                    // Update badge
                    if (unread > 0) {
                        badge.style.display = 'flex';
                        badge.textContent = unread > 9 ? '9+' : unread;
                    } else {
                        badge.style.display = 'none';
                    }

                    // Render list
                    if (notifications.length === 0) {
                        notifList.innerHTML = '<p class="notif-empty">Nenhuma notificação, parceiro.</p>';
                    } else {
                        notifList.innerHTML = notifications.map(function (n) {
                            return '<div class="notif-item ' + (n.is_read ? '' : 'unread') + ' type-' + (n.type || 'info') + '" data-id="' + n.id + '" onclick="markNotifRead(' + n.id + ', this)">' +
                                '<div class="notif-msg">' + escapeHtml(n.message) + '</div>' +
                                '<div class="notif-time">' + timeAgo(n.created_at) + '</div>' +
                                '</div>';
                        }).join('');
                    }
                } catch (err) {
                    console.error('Erro ao carregar notificações:', err);
                }
            };

            window.markNotifRead = async function (id, el) {
                if (el && el.classList.contains('unread')) {
                    await fetch('/api/notifications/' + id + '/read', { method: 'POST' });
                    el.classList.remove('unread');
                    var currentCount = parseInt(badge.textContent) || 0;
                    if (currentCount <= 1) {
                        badge.style.display = 'none';
                    } else {
                        badge.textContent = currentCount - 1;
                    }
                }
            };

            // Initial load + polling every 30 seconds
            loadNotifications();
            setInterval(loadNotifications, 30000);
        }
    }
});
