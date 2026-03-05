document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("login-form");
    const loginSection = document.getElementById("login-section");
    const panelSection = document.getElementById("panel-section");
    const loginError = document.getElementById("login-error");

    // Tabs elements
    const commentsList = document.getElementById("admin-comments-list");
    const usersTableBody = document.getElementById("users-table-body");
    const logsTableBody = document.getElementById("logs-table-body");

    let adminToken = "";

    window.switchTab = (tabName) => {
        document.querySelectorAll('.admin-section').forEach(sec => sec.classList.remove('active'));
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

        document.getElementById(`tab-${tabName}`).classList.add('active');
        document.querySelector(`.tab-btn[onclick="switchTab('${tabName}')"]`).classList.add('active');

        if (tabName === 'comments') loadAdminComments();
        if (tabName === 'users') loadAdminUsers();
        if (tabName === 'logs') loadAdminLogs();
        if (tabName === 'feedback') loadAdminFeedback();
        if (tabName === 'questions') loadAdminQuestions();
        if (tabName === 'submissions') loadAdminSubmissions();
    };

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
                loadAdminComments(); // Load default tab
            } else {
                loginError.style.display = 'block';
            }
        } catch (err) {
            loginError.innerText = "Erro ao conectar com o servidor.";
            loginError.style.display = 'block';
        }
    });

    // === COMMENTS TAB ===
    const loadAdminComments = async () => {
        try {
            const response = await fetch('/api/comments');
            const data = await response.json();

            commentsList.innerHTML = '';

            if (data.data && data.data.length > 0) {
                data.data.forEach(comment => {
                    const el = document.createElement("div");
                    el.classList.add("comment-item");
                    el.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: start;">
                            <div>
                                <div class="comment-author">${comment.author}</div>
                                <div class="comment-text">${comment.text}</div>
                                <div class="comment-date">${comment.date || '-'}</div>
                            </div>
                            <button onclick="deleteComment(${comment.id})" class="ban-btn" style="font-family: 'Rye', cursive;">Apagar</button>
                        </div>
                    `;
                    commentsList.appendChild(el);
                });
            } else {
                commentsList.innerHTML = '<p style="color: var(--text-muted); text-align: center;">Nenhum relato encontrado na cidade.</p>';
            }
        } catch (error) {
            commentsList.innerHTML = '<p style="color: #ff4c4c; text-align: center;">Erro ao carregar os comentários.</p>';
        }
    };

    window.deleteComment = async (id) => {
        if (!confirm("Tem certeza que deseja apagar este relato da face da terra?")) return;
        try {
            const res = await fetch(`/api/comments/${id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json', 'Authorization': adminToken }
            });
            if (res.ok) loadAdminComments();
            else alert("Falha ao deletar.");
        } catch (err) { alert("Erro de conexão."); }
    };

    // === USERS TAB ===
    const loadAdminUsers = async () => {
        try {
            const response = await fetch('/api/admin/users', {
                headers: { 'Authorization': adminToken }
            });
            const data = await response.json();

            usersTableBody.innerHTML = '';
            if (data.data) {
                data.data.forEach(user => {
                    const isBanned = user.is_banned === true;
                    usersTableBody.innerHTML += `
                        <tr>
                            <td>${user.id}</td>
                            <td>${user.username}</td>
                            <td style="color: ${isBanned ? '#ff4c4c' : '#28a745'}; font-weight: bold;">
                                ${isBanned ? 'Preso / Banido' : 'Livre'}
                            </td>
                            <td>
                                <button class="${isBanned ? 'unban-btn' : 'ban-btn'}" onclick="toggleBan(${user.id}, ${!isBanned})">
                                    ${isBanned ? 'Soltar (Desbanir)' : 'Prender (Banir)'}
                                </button>
                            </td>
                        </tr>
                    `;
                });
            }
        } catch (error) { console.error(error); }
    };

    window.toggleBan = async (userId, banStatus) => {
        const action = banStatus ? "banir/prender" : "desbanir/soltar";
        if (!confirm(`Deseja realmente ${action} este usuário?`)) return;

        try {
            const res = await fetch(`/api/admin/users/${userId}/ban`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': adminToken
                },
                body: JSON.stringify({ is_banned: banStatus })
            });
            if (res.ok) loadAdminUsers();
            else alert("Falha na operação.");
        } catch (err) { alert("Erro de conexão."); }
    };

    // === SECURITY LOGS TAB ===
    const loadAdminLogs = async () => {
        try {
            const response = await fetch('/api/admin/logs', {
                headers: { 'Authorization': adminToken }
            });
            const data = await response.json();

            logsTableBody.innerHTML = '';

            if (data.data && data.data.length > 0) {
                data.data.forEach(log => {
                    const dateStr = new Date(log.created_at).toLocaleString('pt-BR');
                    logsTableBody.innerHTML += `
                        <tr>
                            <td>${dateStr}</td>
                            <td style="color: #ff4c4c; font-weight: bold;">${log.ip_address}</td>
                            <td style="font-size: 0.8rem; color: #ccc;">${log.user_agent}</td>
                            <td><code style="background: rgba(0,0,0,0.8); padding: 5px; border-radius:3px;">${log.attempt_password || 'Desconhecida'}</code></td>
                        </tr>
                    `;
                });
            } else {
                logsTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Nenhuma invasão registrada recentemente.</td></tr>';
            }
        } catch (error) { console.error(error); }
    };

    // === FEEDBACK TAB ===
    const loadAdminFeedback = async () => {
        try {
            const response = await fetch('/api/admin/feedback', {
                headers: { 'Authorization': adminToken }
            });
            const data = await response.json();
            const tableBody = document.getElementById("feedback-table-body");
            tableBody.innerHTML = '';
            if (data.data) {
                data.data.forEach(fb => {
                    const date = new Date(fb.created_at).toLocaleString('pt-BR');
                    tableBody.innerHTML += `
                        <tr>
                            <td>${date}</td>
                            <td>${fb.username}</td>
                            <td>${fb.message}</td>
                        </tr>
                    `;
                });
            }
        } catch (error) { console.error(error); }
    };

    // === QUESTIONS TAB ===
    const loadAdminQuestions = async () => {
        try {
            const response = await fetch('/api/admin/questions', {
                headers: { 'Authorization': adminToken }
            });
            const data = await response.json();
            const list = document.getElementById('admin-questions-list');
            list.innerHTML = '';
            if (data.data) {
                data.data.forEach(q => {
                    const qDiv = document.createElement('div');
                    qDiv.className = 'comment-item';
                    qDiv.innerHTML = `
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <div>
                                <div class="question-title" style="font-weight:bold;">${q.title}</div>
                                <div class="comment-author">${q.author}</div>
                                <div class="comment-date">${new Date(q.created_at).toLocaleDateString()}</div>
                                <div class="comment-text" style="margin-top:5px;">${q.text}</div>
                            </div>
                            <button onclick="deleteQuestion(${q.id})" class="ban-btn" style="font-family: 'Rye', cursive;">Apagar</button>
                        </div>
                        <div style="margin-left:20px; margin-top:10px;">
                    `;
                    if (q.replies && q.replies.length) {
                        q.replies.forEach(r => {
                            qDiv.innerHTML += `
                                <div style="display:flex; justify-content:space-between; align-items:start; margin-top:5px;">
                                    <div>
                                        <div class="comment-author">${r.author}</div>
                                        <div class="comment-text">${r.text}</div>
                                        <div class="comment-date">${new Date(r.created_at).toLocaleDateString()}</div>
                                    </div>
                                    <button onclick="deleteReply(${q.id}, ${r.id})" class="ban-btn" style="font-family: 'Rye', cursive; font-size:0.8rem;">Excluir</button>
                                </div>
                            `;
                        });
                    }
                    qDiv.innerHTML += '</div>';
                    list.appendChild(qDiv);
                });
            } else {
                list.innerHTML = '<p style="color: var(--text-muted);">Nenhuma dúvida registrada.</p>';
            }
        } catch (error) { console.error(error); }
    };

    window.deleteQuestion = async (id) => {
        if (!confirm("Tem certeza que deseja apagar esta dúvida e todas as respostas?")) return;
        try {
            const res = await fetch(`/api/admin/questions/${id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json', 'Authorization': adminToken }
            });
            if (res.ok) loadAdminQuestions();
            else alert("Falha ao deletar.");
        } catch (err) { alert("Erro de conexão."); }
    };

    window.deleteReply = async (qid, rid) => {
        if (!confirm("Deseja realmente apagar esta resposta?")) return;
        try {
            const res = await fetch(`/api/admin/questions/${qid}/replies/${rid}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json', 'Authorization': adminToken }
            });
            if (res.ok) loadAdminQuestions();
            else alert("Falha ao deletar.");
        } catch (err) { alert("Erro de conexão."); }
    };


    // === SUBMISSIONS TAB ===
    const loadAdminSubmissions = async () => {
        try {
            const response = await fetch('/api/admin/submissions', {
                headers: { 'Authorization': adminToken }
            });
            const data = await response.json();
            const tableBody = document.getElementById("submissions-table-body");
            tableBody.innerHTML = '';
            if (data.data) {
                data.data.forEach(sub => {
                    const date = new Date(sub.created_at).toLocaleString('pt-BR');
                    const isApproved = sub.is_approved === true;
                    tableBody.innerHTML += `
                        <tr>
                            <td>${date}</td>
                            <td>${sub.username}</td>
                            <td>${sub.title}</td>
                            <td><span style="color: #28a745;">🛡️ ${sub.security_status || 'Pendente'}</span></td>
                            <td>
                                <a href="${sub.link}" target="_blank" style="color: var(--primary-red); font-weight: bold; margin-right: 10px;">📥 Baixar</a>
                                <button class="${isApproved ? 'unban-btn' : 'submit-button'}" 
                                        style="font-size: 0.8rem; padding: 5px 10px;"
                                        onclick="toggleModApproval(${sub.id}, ${!isApproved})">
                                    ${isApproved ? 'Remover' : 'Aprovar'}
                                </button>
                            </td>
                        </tr>
                    `;
                });
            }
        } catch (error) { console.error(error); }
    };

    window.toggleModApproval = async (id, status) => {
        const action = status ? "aprovar" : "remover";
        if (!confirm(`Deseja realmente ${action} este mod para a galeria pública?`)) return;

        try {
            const res = await fetch(`/api/admin/submissions/${id}/approve`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': adminToken
                },
                body: JSON.stringify({ is_approved: status })
            });
            if (res.ok) loadAdminSubmissions();
            else alert("Falha na operação.");
        } catch (err) { alert("Erro de conexão."); }
    };
});
