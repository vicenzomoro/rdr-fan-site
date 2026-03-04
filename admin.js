document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("login-form");
    const loginSection = document.getElementById("login-section");
    const panelSection = document.getElementById("panel-section");
    const commentsList = document.getElementById("admin-comments-list");
    const loginError = document.getElementById("login-error");

    let adminToken = "";

    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const passInput = document.getElementById("admin-pass").value.trim();

        try {
            const res = await fetch('/api/admin/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: passInput })
            });

            if (res.ok) {
                adminToken = passInput;
                loginSection.style.display = 'none';
                panelSection.style.display = 'block';
                loadAdminComments();
            } else {
                loginError.style.display = 'block';
            }
        } catch (err) {
            loginError.innerText = "Erro ao conectar com o servidor.";
            loginError.style.display = 'block';
        }
    });

    const loadAdminComments = async () => {
        try {
            const response = await fetch('/api/comments');
            const data = await response.json();

            commentsList.innerHTML = '';

            if (data.data && data.data.length > 0) {
                data.data.forEach(comment => {
                    const el = document.createElement("div");
                    el.classList.add("comment-item");
                    // Adiciona o estilo inline para alinhar o botão
                    el.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: start;">
                            <div>
                                <div class="comment-author">${comment.author}</div>
                                <div class="comment-text">${comment.text}</div>
                                <div class="comment-date">${comment.date}</div>
                            </div>
                            <button onclick="deleteComment(${comment.id})" style="background: var(--primary-red); color: white; border: 1px solid var(--dark-red); padding: 8px 15px; cursor: pointer; border-radius: 4px; font-family: 'Rye', cursive; box-shadow: 0 4px 10px rgba(0,0,0,0.5); transition: background 0.2s;">Banir</button>
                        </div>
                    `;
                    commentsList.appendChild(el);
                });
            } else {
                commentsList.innerHTML = '<p style="color: var(--text-muted); text-align: center;">Nenhum relato encontrado na cidade.</p>';
            }
        } catch (error) {
            console.error("Error fetching comments:", error);
            commentsList.innerHTML = '<p style="color: #ff4c4c; text-align: center;">Erro ao carregar os comentários.</p>';
        }
    };

    window.deleteComment = async (id) => {
        if (!confirm("Tem certeza que deseja apagar este relato da face da terra?")) return;

        try {
            const res = await fetch(`/api/comments/${id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': adminToken
                }
            });

            if (res.ok) {
                loadAdminComments();
            } else {
                alert("Falha ao deletar o comentário. Apenas o Xerife tem esse poder!");
            }
        } catch (err) {
            alert("Erro ao conectar com o servidor.");
        }
    };
});
