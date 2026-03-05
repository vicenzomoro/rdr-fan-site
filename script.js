document.addEventListener("DOMContentLoaded", () => {
    // === Scroll Reveal Animation ===
    const reveals = document.querySelectorAll(".reveal");

    const revealOnScroll = () => {
        const windowHeight = window.innerHeight;
        const revealPoint = 100;

        reveals.forEach((reveal) => {
            const revealTop = reveal.getBoundingClientRect().top;
            if (revealTop < windowHeight - revealPoint) {
                reveal.classList.add("active");
            }
        });
    };

    window.addEventListener("scroll", revealOnScroll);
    revealOnScroll(); // Trigger on load

    // === Navbar Background on Scroll ===
    const navbar = document.querySelector(".navbar");
    window.addEventListener("scroll", () => {
        if (window.scrollY > 50) {
            navbar.style.background = "rgba(10, 10, 10, 0.95)";
            navbar.style.boxShadow = "0 2px 10px rgba(0,0,0,0.5)";
        } else {
            navbar.style.background = "rgba(18, 18, 18, 0.85)";
            navbar.style.boxShadow = "none";
        }
    });

    // === Comments System (API Integration) ===
    const commentForm = document.getElementById("comment-form");
    const commentsList = document.getElementById("comments-list");
    const API_URL = '/api/comments';

    // Check Login State
    const currentUser = localStorage.getItem('currentUser');
    const loginBtn = document.getElementById('nav-login-btn');
    if (currentUser) {
        if (loginBtn) {
            loginBtn.innerText = 'Sair (' + currentUser + ')';
            loginBtn.href = "#"; // Prevent navigation
            loginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('currentUser');
                window.location.reload();
            });
        }
        document.getElementById('author').value = currentUser;
        document.getElementById('author').disabled = true;
    } else {
        const textInput = document.getElementById("text");
        textInput.placeholder = "Você precisa estar logado para comentar.";
        textInput.disabled = true;
        document.getElementById("author").disabled = true;
        document.getElementById("author").placeholder = "Visitante";
    }

    const renderComment = (comment) => {
        const commentEl = document.createElement("div");
        commentEl.classList.add("comment-item");
        // simple parsing to escape html could be done, but for now we trust the input
        commentEl.innerHTML = `
            <div class="comment-author">${comment.author}</div>
            <div class="comment-text">${comment.text}</div>
            <div class="comment-date">${comment.date}</div>
        `;
        // Since API returns ordered by ID DESC, we append to maintain order
        commentsList.appendChild(commentEl);
    };

    // Load initial comments from the API
    const loadComments = async () => {
        try {
            commentsList.innerHTML = '<p style="color: var(--text-muted);">Carregando relatos do oeste...</p>';
            const response = await fetch(API_URL);
            const data = await response.json();

            commentsList.innerHTML = ''; // clear loading

            if (data.data && data.data.length > 0) {
                data.data.forEach(renderComment);
            } else {
                commentsList.innerHTML = '<p style="color: var(--text-muted);">Seja o primeiro a relatar suas aventuras!</p>';
            }
        } catch (error) {
            console.error("Error fetching comments:", error);
            commentsList.innerHTML = '<p style="color: #ff4c4c;">Erro ao carregar os comentários. Talvez os banditos tenham cortado o telégrafo.</p>';
        }
    };

    loadComments();

    // Handle form submission
    commentForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        if (!currentUser) {
            alert("Apenas membros do bando podem comentar. Registre-se ou faça login primeiro!");
            window.location.href = 'login.html';
            return;
        }

        const authorInput = document.getElementById("author");
        const textInput = document.getElementById("text");

        const newComment = {
            author: authorInput.value.trim(),
            text: textInput.value.trim(),
            date: new Date().toLocaleDateString()
        };

        if (newComment.author && newComment.text) {
            // Visual feedback - start loading
            const btn = commentForm.querySelector(".submit-button");
            const originalText = btn.innerText;
            btn.innerText = "Enviando telégrafo...";
            btn.disabled = true;

            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newComment)
                });

                if (response.ok) {
                    // Prepend locally so it shows immediately at the top
                    const commentEl = document.createElement("div");
                    commentEl.classList.add("comment-item");
                    commentEl.innerHTML = `
                        <div class="comment-author">${newComment.author}</div>
                        <div class="comment-text">${newComment.text}</div>
                        <div class="comment-date">${newComment.date}</div>
                    `;
                    // Remove "Be the first" message if it exists
                    if (commentsList.children.length === 1 && commentsList.children[0].tagName === 'P') {
                        commentsList.innerHTML = '';
                    }
                    commentsList.prepend(commentEl);

                    // Clear inputs
                    textInput.value = "";

                    // Success feedback
                    btn.innerText = "Relato Enviado!";
                    btn.style.background = "#28a745";
                } else {
                    throw new Error("Server response wasn't OK");
                }
            } catch (error) {
                console.error("Error saving comment:", error);
                btn.innerText = "Falha ao enviar.";
                btn.style.background = "#ff4c4c";
            } finally {
                setTimeout(() => {
                    btn.innerText = originalText;
                    btn.style.background = "var(--primary-red)";
                    btn.disabled = false;
                }, 2000);
            }
        }
    });

    // === MOD SUBMISSION ===
    const modForm = document.getElementById("mod-form");
    const modStatus = document.getElementById("mod-status");

    modForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!currentUser) {
            alert("Faça login para enviar seu mod!");
            return;
        }

        const title = document.getElementById("mod-title").value;
        const description = document.getElementById("mod-description").value;
        const modFile = document.getElementById("mod-file").files[0];

        if (!modFile) {
            alert("Por favor, selecione um arquivo.");
            return;
        }

        const formData = new FormData();
        formData.append("username", currentUser);
        formData.append("title", title);
        formData.append("description", description);
        formData.append("modFile", modFile);

        modStatus.innerText = "🔍 Escaneando arquivo por segurança...";
        modStatus.style.color = "#a8763e";
        modStatus.style.display = "block";

        try {
            const res = await fetch('/api/submissions/upload', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();

            if (res.ok) {
                modStatus.innerText = "✅ Mod verificado e enviado com sucesso! O Xerife irá analisar.";
                modStatus.style.color = "#28a745";
                modForm.reset();
            } else {
                modStatus.innerText = "❌ " + (data.error || "Falha ao enviar mod.");
                modStatus.style.color = "#ff4c4c";
            }
        } catch (err) {
            modStatus.innerText = "❌ Falha ao conectar ao servidor.";
            modStatus.style.color = "#ff4c4c";
        }
    });

    // === FEEDBACK SUBMISSION ===
    const feedbackForm = document.getElementById("feedback-form");
    const feedbackStatus = document.getElementById("feedback-status");

    feedbackForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const username = currentUser || "Anônimo";
        const message = document.getElementById("feedback-text").value;

        try {
            const res = await fetch('/api/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, message })
            });
            if (res.ok) {
                feedbackStatus.innerText = "Obrigado pelo seu feedback, forasteiro!";
                feedbackStatus.style.color = "#28a745";
                feedbackStatus.style.display = "block";
                feedbackForm.reset();
            }
        } catch (err) {
            feedbackStatus.innerText = "Falha ao enviar feedback.";
            feedbackStatus.style.color = "#ff4c4c";
            feedbackStatus.style.display = "block";
        }
    });

    // === MOD GALLERY & SEARCH ===
    const modsGallery = document.getElementById("mods-gallery");
    const modsLoader = document.getElementById("mods-loader");
    const modSearchInput = document.getElementById("mod-search");
    let allMods = [];

    const fetchMods = async (searchTerm = '') => {
        try {
            if (modsLoader) modsLoader.style.display = "block";
            const response = await fetch(`/api/mods?search=${encodeURIComponent(searchTerm)}`);
            const data = await response.json();
            allMods = data.data || [];
            renderMods(allMods);
        } catch (error) {
            console.error("Error fetching mods:", error);
            if (modsGallery) modsGallery.innerHTML = '<p style="color: #ff4c4c;">Erro ao carregar a galeria de mods.</p>';
        } finally {
            if (modsLoader) modsLoader.style.display = "none";
        }
    };

    const renderMods = (mods) => {
        if (!modsGallery) return;
        modsGallery.innerHTML = '';
        if (mods.length === 0) {
            modsGallery.innerHTML = '<p style="color: var(--text-muted);">Nenhum mod encontrado para essa busca.</p>';
            return;
        }

        mods.forEach(mod => {
            const modCard = document.createElement("div");
            modCard.className = "mod-card-gallery reveal active";
            modCard.innerHTML = `
                <div class="mod-card-banner">MOD</div>
                <div class="mod-content">
                    <h3>${mod.title}</h3>
                    <p>${mod.description || 'Sem descrição.'}</p>
                    <div class="mod-card-footer">
                        <span class="mod-author-tag">👤 ${mod.username}</span>
                        <a href="${mod.link}" target="_blank" class="download-link-btn">Baixar</a>
                    </div>
                </div>
            `;
            modsGallery.appendChild(modCard);
        });
    };

    window.handleSearch = () => {
        const term = modSearchInput.value;
        fetchMods(term);
    };

    window.filterMods = (type) => {
        const navBtns = document.querySelectorAll(".mod-nav-btn");
        navBtns.forEach(btn => btn.classList.remove("active"));

        // Find the button that was clicked
        const clickedBtn = Array.from(navBtns).find(btn => btn.innerText.toLowerCase().includes(type.toLowerCase()) || (type === 'all' && btn.innerText === 'Todos'));
        if (clickedBtn) clickedBtn.classList.add("active");

        if (type === 'all' || type === 'recent') {
            fetchMods();
        } else if (type === 'popular') {
            renderMods([...allMods].reverse());
        }
    };

    if (modsGallery) fetchMods();

    // === AI CHAT ASSISTANT ===
    const chatToggle = document.getElementById("ai-chat-toggle");
    const chatWindow = document.getElementById("ai-chat-window");
    const closeChat = document.getElementById("close-chat");
    const chatInput = document.getElementById("chat-input");
    const sendChat = document.getElementById("send-chat");
    const chatMessages = document.getElementById("chat-messages");

    if (chatToggle) {
        chatToggle.addEventListener("click", () => {
            chatWindow.style.display = "flex";
            chatToggle.style.display = "none";
        });
    }

    if (closeChat) {
        closeChat.addEventListener("click", () => {
            chatWindow.style.display = "none";
            chatToggle.style.display = "flex";
        });
    }

    const appendMessage = (text, type) => {
        const msgDiv = document.createElement("div");
        msgDiv.className = type === 'ai' ? 'ai-msg' : 'user-msg';
        msgDiv.innerText = text;
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    };

    const handleChat = async () => {
        const message = chatInput.value.trim();
        if (!message) return;

        appendMessage(message, 'user');
        chatInput.value = "";

        // Typing indicator
        const typingDiv = document.createElement("div");
        typingDiv.className = "ai-msg";
        typingDiv.innerText = "Dutch está pensando...";
        chatMessages.appendChild(typingDiv);

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message })
            });
            const data = await res.json();

            chatMessages.removeChild(typingDiv);
            appendMessage(data.response, 'ai');
        } catch (err) {
            chatMessages.removeChild(typingDiv);
            appendMessage("Desculpe, o telégrafo falhou. Tente novamente!", 'ai');
        }
    };

    if (sendChat) {
        sendChat.addEventListener("click", handleChat);
        chatInput.addEventListener("keypress", (e) => {
            if (e.key === 'Enter') handleChat();
        });
    }
});
