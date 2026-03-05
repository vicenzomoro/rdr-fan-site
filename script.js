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
});
