document.addEventListener("DOMContentLoaded", () => {
    // === Scroll Effects ===
    const reveals = document.querySelectorAll(".reveal");
    const navbar = document.querySelector(".navbar");

    const handleScroll = () => {
        // Navbar transparency
        if (window.scrollY > 50) {
            navbar.classList.add("scrolled");
        } else {
            navbar.classList.remove("scrolled");
        }

        // Section reveals
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
            loginBtn.innerHTML = `<span>Sair (${currentUser})</span>`;
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
            commentInput.placeholder = "Faça login para comentar...";
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
                    card.innerHTML = `
                        <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                            <strong style="color:var(--gold); font-size:1.1rem;">${escapeHtml(c.author)}</strong>
                            <small style="color:var(--text-muted);">${escapeHtml(c.date)}</small>
                        </div>
                        <p style="color:var(--text-main); line-height:1.6;">${escapeHtml(c.text)}</p>
                    `;
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
            if (!currentUser) return alert("Você precisa estar logado.");

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
                    body: JSON.stringify({ author: currentUser, text, date: new Date().toLocaleDateString() })
                });

                if (res.ok) {
                    commentInput.value = "";
                    loadComments();
                }
            } catch (err) {
                console.error(err);
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
                    card.innerHTML = `
                        <h3 style="color:var(--primary-red); margin-bottom:10px; font-family:'Rye';">${escapeHtml(q.title)}</h3>
                        <p style="margin-bottom:15px; color:var(--text-main);">${escapeHtml(q.text)}</p>
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <small style="color:var(--text-muted);">Por ${escapeHtml(q.author)} | ${escapeHtml(q.date)}</small>
                            ${currentUser ? `<button class="btn btn-outline" style="padding:5px 15px; font-size:0.8rem;" onclick="showReplyForm(${q.id}, this)">Responder</button>` : ''}
                        </div>
                        <div class="replies" style="margin-top:15px; border-left: 2px solid var(--primary-red); padding-left:15px;"></div>
                    `;

                    const repliesDiv = card.querySelector('.replies');
                    if (q.replies && q.replies.length > 0) {
                        q.replies.forEach(r => {
                            repliesDiv.innerHTML += `
                                <div style="margin-bottom:10px;">
                                    <strong>${escapeHtml(r.author)}:</strong> ${escapeHtml(r.text)}
                                    <br><small style="color:var(--text-muted); font-size:0.75rem;">${escapeHtml(r.date)}</small>
                                </div>
                            `;
                        });
                    }
                    questionsList.appendChild(card);
                });
            } else {
                questionsList.innerHTML = '<p style="text-align:center; color:var(--text-muted);">Procure o Xerife ou poste sua dúvida.</p>';
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
                    body: JSON.stringify({ author: currentUser, title, text, date: new Date().toLocaleDateString() })
                });
                if (res.ok) {
                    questionForm.reset();
                    loadQuestions();
                }
            } catch (err) { console.error(err); }
        });
    }

    if (questionsList) loadQuestions();

    // === Mod Gallery ===
    const modsGallery = document.getElementById("mods-gallery");
    const modSearchInput = document.getElementById("mod-search");

    const fetchMods = async (search = '') => {
        if (!modsGallery) return;
        try {
            const res = await fetch(`/api/mods?search=${encodeURIComponent(search)}`);
            const data = await res.json();
            modsGallery.innerHTML = '';
            const mods = data.data || [];

            if (mods.length > 0) {
                mods.forEach(mod => {
                    const card = document.createElement("div");
                    card.className = "glass-card reveal active";
                    card.innerHTML = `
                        <div class="mod-badge">MOD</div>
                        <h3 style="color:var(--gold); margin-bottom:10px;">${escapeHtml(mod.title)}</h3>
                        <p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:20px;">${escapeHtml(mod.description || 'Sem descrição.')}</p>
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="font-size:0.8rem; color:var(--text-main);">👤 ${escapeHtml(mod.username)}</span>
                            <a href="${escapeHtml(mod.link)}" target="_blank" class="btn btn-primary" style="padding:6px 15px; font-size:0.8rem;">BAIXAR</a>
                        </div>
                    `;
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

    if (modsGallery) fetchMods();

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
                    body: JSON.stringify({ username: currentUser || "Anônimo", message })
                });
                if (res.ok) {
                    feedbackForm.reset();
                    status.innerText = "Feedback enviado com sucesso!";
                    status.style.color = "#28a745";
                    status.style.display = "block";
                    setTimeout(() => status.style.display = "none", 3000);
                }
            } catch (err) { console.error(err); }
        });
    }

    // === AI Chat ===
    const chatToggle = document.getElementById("ai-chat-toggle");
    const chatWindow = document.getElementById("ai-chat-window");
    const chatMessages = document.getElementById("chat-messages");
    const chatInput = document.getElementById("chat-input");
    const sendBtn = document.getElementById("send-chat");

    if (chatToggle) {
        chatToggle.addEventListener("click", () => {
            chatWindow.classList.add("active");
            chatToggle.style.display = "none";
        });
    }

    window.closeChat = () => {
        chatWindow.classList.remove("active");
        chatToggle.style.display = "flex";
    };

    const addMessage = (text, type) => {
        const msg = document.createElement("div");
        msg.className = `message ${type}`;
        msg.innerHTML = `<div class="content">${text}</div>`;
        chatMessages.appendChild(msg);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    };

    const handleChat = async () => {
        const text = chatInput.value.trim();
        if (!text) return;

        addMessage(text, 'user');
        chatInput.value = "";

        // Thinking...
        const typing = document.createElement("div");
        typing.className = "message ai typing";
        typing.innerHTML = '<div class="content">Dutch está pensando...</div>';
        chatMessages.appendChild(typing);

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text })
            });
            const data = await res.json();
            chatMessages.removeChild(typing);
            addMessage(data.response, 'ai');
        } catch (err) {
            chatMessages.removeChild(typing);
            addMessage("O telégrafo falhou, tente novamente!", 'ai');
        }
    };

    if (sendBtn) {
        sendBtn.addEventListener("click", handleChat);
        chatInput.addEventListener("keypress", (e) => { if (e.key === 'Enter') handleChat(); });
    }
});
