document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("login-form");
    const loginSection = document.getElementById("login-section");
    const panelSection = document.getElementById("panel-section");
    const loginError = document.getElementById("login-error");

    // helper to escape text for HTML
    const escapeHtml = (str) => {
        if (!str) return '';
        return String(str).replace(/[&<>"']/g, (s) => {
            switch (s) {
                case '&': return '&amp;';
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '"': return '&quot;';
                case "'": return '&#39;';
                default: return s;
            }
        });
    };

    let adminToken = "";

    // Tabs elements
    const commentsList = document.getElementById("admin-comments-list");
    const usersTableBody = document.getElementById("users-table-body");
    const logsTableBody = document.getElementById("logs-table-body");
    const feedbackTableBody = document.getElementById("feedback-table-body");
    const questionsList = document.getElementById("admin-questions-list");
    const submissionsList = document.getElementById("submissions-list");

    // utility functions
    const loadStats = async () => {
        if (!adminToken) return;
        try {
            const res = await fetch('/api/admin/stats', {
                headers: { 'Authorization': adminToken }
            });
            const data = await res.json();
            document.getElementById('stat-users').innerText = data.users || 0;
            document.getElementById('stat-comments').innerText = data.comments || 0;
            document.getElementById('stat-mods').innerText = data.mods || 0;
            document.getElementById('stat-feedback').innerText = data.feedback || 0;
        } catch (err) {
            console.error('Erro ao carregar estatísticas:', err);
        }
    };

    window.logoutAdmin = () => {
        adminToken = '';
        window.location.reload();
    };

    window.switchTab = (tabName, event) => {
        if (event) event.preventDefault();

        // Update Nav
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        if (event) {
            event.target.classList.add('active');
        } else {
            document.querySelector(`.nav-item[onclick*="${tabName}"]`).classList.add('active');
        }

        // Update Content
        document.querySelectorAll('.admin-tab').forEach(tab => tab.style.display = 'none');
        const targetTab = document.getElementById(`tab-${tabName}`);
        if (targetTab) targetTab.style.display = 'block';

        // Load Data
        if (tabName === 'dashboard') loadStats();
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
                panelSection.style.display = 'grid';
                switchTab('dashboard');
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
            let comments = data.data || [];

            if (comments.length > 0) {
                comments.forEach(comment => {
                    const el = document.createElement("div");
                    el.className = "card";
                    el.style.marginBottom = "20px";
                    el.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: start;">
                            <div>
                                <h4 style="color: var(--gold); margin-bottom:10px;">${escapeHtml(comment.author)}</h4>
                                <p style="color: var(--text-main);">${escapeHtml(comment.text)}</p>
                                <small style="color: var(--text-muted); display:block; margin-top:10px;">${escapeHtml(comment.date || '-')}</small>
                            </div>
                            <button onclick="deleteComment(${comment.id})" class="btn btn-outline" style="border-color: #ff4c4c; color: #ff4c4c; padding: 5px 12px; font-size: 0.8rem;">Apagar</button>
                        </div>
                    `;
                    commentsList.appendChild(el);
                });
            } else {
                commentsList.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 40px;">Nenhum relato no acampamento.</p>';
            }
        } catch (error) { console.error(error); }
    };

    window.deleteComment = async (id) => {
        if (!confirm("Confirmar a exclusão deste relato?")) return;
        try {
            await fetch(`/api/comments/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': adminToken }
            });
            loadAdminComments(); loadStats();
        } catch (err) { alert("Erro de conexão."); }
    };

    // === USERS TAB ===
    const loadAdminUsers = async () => {
        try {
            const res = await fetch('/api/admin/users', { headers: { 'Authorization': adminToken } });
            const data = await res.json();
            usersTableBody.innerHTML = '';
            let users = data.data || [];

            users.forEach(user => {
                const isBanned = user.is_banned === true;
                usersTableBody.innerHTML += `
                    <tr>
                        <td>${user.id}</td>
                        <td style="font-weight: 600;">${escapeHtml(user.username)}</td>
                        <td><span style="color: ${isBanned ? '#ff4c4c' : '#28a745'}; background: ${isBanned ? 'rgba(255,76,76,0.1)' : 'rgba(40,167,69,0.1)'}; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem;">${isBanned ? 'Preso' : 'Ativo'}</span></td>
                        <td>
                            <button class="btn btn-outline" style="padding: 4px 10px; font-size: 0.75rem; border-color: ${isBanned ? '#28a745' : '#ff4c4c'}; color: ${isBanned ? '#28a745' : '#ff4c4c'};" onclick="toggleBan(${user.id}, ${!isBanned})">
                                ${isBanned ? 'Soltar' : 'Banir'}
                            </button>
                        </td>
                    </tr>
                `;
            });
        } catch (err) { console.error(err); }
    };

    window.toggleBan = async (userId, banStatus) => {
        try {
            await fetch(`/api/admin/users/${userId}/ban`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': adminToken },
                body: JSON.stringify({ is_banned: banStatus })
            });
            loadAdminUsers(); loadStats();
        } catch (err) { console.error(err); }
    };

    // === SECURITY LOGS ===
    const loadAdminLogs = async () => {
        try {
            const res = await fetch('/api/admin/logs', { headers: { 'Authorization': adminToken } });
            const data = await res.json();
            logsTableBody.innerHTML = '';
            let logs = data.data || [];

            logs.forEach(log => {
                logsTableBody.innerHTML += `
                    <tr>
                        <td>${new Date(log.created_at).toLocaleString()}</td>
                        <td style="color: #ff4c4c; font-family: monospace;">${escapeHtml(log.ip_address)}</td>
                        <td style="font-size: 0.75rem; color: var(--text-muted); max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(log.user_agent)}</td>
                        <td><code style="background: #000; padding: 2px 6px; border-radius: 4px;">${escapeHtml(log.attempt_password || '-')}</code></td>
                    </tr>
                `;
            });
        } catch (err) { console.error(err); }
    };

    // === FEEDBACK TAB ===
    const loadAdminFeedback = async () => {
        try {
            const res = await fetch('/api/admin/feedback', { headers: { 'Authorization': adminToken } });
            const data = await res.json();
            feedbackTableBody.innerHTML = '';
            let feedbacks = data.data || [];

            feedbacks.forEach(fb => {
                feedbackTableBody.innerHTML += `
                    <tr>
                        <td>${new Date(fb.created_at).toLocaleDateString()}</td>
                        <td>${escapeHtml(fb.username)}</td>
                        <td style="font-size: 0.9rem;">${escapeHtml(fb.message)}</td>
                    </tr>
                `;
            });
        } catch (err) { console.error(err); }
    };

    // === QUESTIONS TAB ===
    const loadAdminQuestions = async () => {
        try {
            const res = await fetch('/api/admin/questions', { headers: { 'Authorization': adminToken } });
            const data = await res.json();
            questionsList.innerHTML = '';
            let qs = data.data || [];

            qs.forEach(q => {
                const qDiv = document.createElement('div');
                qDiv.className = 'card';
                qDiv.style.marginBottom = "20px";
                qDiv.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:start;">
                        <div>
                            <h4 style="color: var(--gold); margin-bottom:5px;">${escapeHtml(q.title)}</h4>
                            <p style="color: var(--text-main); font-size: 1.1rem; margin-bottom: 10px;">${escapeHtml(q.text)}</p>
                            <small style="color: var(--text-muted);">Por ${escapeHtml(q.author)} em ${new Date(q.created_at).toLocaleDateString()}</small>
                        </div>
                        <button onclick="deleteQuestion(${q.id})" class="btn btn-outline" style="border-color: #ff4c4c; color: #ff4c4c; padding: 4px 10px; font-size: 0.8rem;">Excluir</button>
                    </div>
                `;
                questionsList.appendChild(qDiv);
            });
        } catch (err) { console.error(err); }
    };

    window.deleteQuestion = async (id) => {
        if (!confirm("Excluir esta dúvida permanentemente?")) return;
        try {
            await fetch(`/api/admin/questions/${id}`, { method: 'DELETE', headers: { 'Authorization': adminToken } });
            loadAdminQuestions(); loadStats();
        } catch (err) { console.error(err); }
    };

    // === SUBMISSIONS TAB ===
    const loadAdminSubmissions = async () => {
        try {
            const res = await fetch('/api/admin/submissions', { headers: { 'Authorization': adminToken } });
            const data = await res.json();
            const container = document.getElementById("submissions-list");
            container.innerHTML = '';
            let subs = data.data || [];

            subs.forEach(sub => {
                const isApproved = sub.is_approved === true;
                const card = document.createElement('div');
                card.className = 'glass-card';
                card.style.marginBottom = "20px";
                card.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <h4 style="color: var(--primary-red); margin-bottom:5px;">${escapeHtml(sub.title)}</h4>
                            <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom:10px;">Enviado por: <strong>${escapeHtml(sub.username)}</strong></p>
                            <a href="${escapeHtml(sub.link)}" target="_blank" class="btn btn-outline" style="padding: 4px 12px; font-size: 0.8rem;">📥 Baixar Arquivo</a>
                        </div>
                        <div style="text-align: right;">
                            <div style="margin-bottom: 10px;"><span style="color: #28a745; font-size: 0.8rem;">🛡️ Verificado</span></div>
                            <button class="btn ${isApproved ? 'btn-outline' : 'btn-primary'}" 
                                    style="padding: 6px 15px; font-size: 0.85rem;" 
                                    onclick="toggleModApproval(${sub.id}, ${!isApproved})">
                                ${isApproved ? 'Remover Galeria' : 'Aprovar na Galeria'}
                            </button>
                        </div>
                    </div>
                `;
                container.appendChild(card);
            });
        } catch (err) { console.error(err); }
    };

    window.toggleModApproval = async (id, status) => {
        try {
            await fetch(`/api/admin/submissions/${id}/approve`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': adminToken },
                body: JSON.stringify({ is_approved: status })
            });
            loadAdminSubmissions(); loadStats();
        } catch (err) { console.error(err); }
    };
});
