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

    // utility functions
    const loadStats = async () => {
        if (!adminToken) return;
        try {
            const res = await fetch('/api/admin/stats', {
                headers: { 'Authorization': adminToken }
            });
            const data = await res.json();
            document.getElementById('stat-users').querySelector('span').innerText = data.users || 0;
            document.getElementById('stat-comments').querySelector('span').innerText = data.comments || 0;
            document.getElementById('stat-questions').querySelector('span').innerText = data.questions || 0;
            document.getElementById('stat-mods').querySelector('span').innerText = data.mods || 0;
            document.getElementById('stat-pending-mods').querySelector('span').innerText = data.pendingMods || 0;
            document.getElementById('stat-feedback').querySelector('span').innerText = data.feedback || 0;
        } catch (err) {
            console.error('Erro ao carregar estatísticas:', err);
        }
    };

    const logoutAdmin = () => {
        adminToken = '';
        window.location.reload();
    };

    window.switchTab = (tabName) => {
        document.querySelectorAll('.admin-section').forEach(sec => sec.classList.remove('active'));
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

        document.getElementById(`tab-${tabName}`).classList.add('active');
        document.querySelector(`.tab-btn[onclick="switchTab('${tabName}')"]`).classList.add('active');

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
                panelSection.style.display = 'block';
                switchTab('dashboard'); // show dashboard on entry
            } else {
                loginError.style.display = 'block';
            }
        } catch (err) {
            loginError.innerText = "Erro ao conectar com o servidor.";
            loginError.style.display = 'block';
        }
    });

    // === COMMENTS TAB ===
    const loadAdminComments = async (searchTerm = '') => {
        try {
            const response = await fetch('/api/comments');
            const data = await response.json();

            commentsList.innerHTML = '';

            let comments = (data.data && Array.isArray(data.data)) ? data.data : [];
            if (searchTerm) {
                comments = comments.filter(c => c.author.toLowerCase().includes(searchTerm.toLowerCase()) || c.text.toLowerCase().includes(searchTerm.toLowerCase()));
            }

            if (comments.length > 0) {
                comments.forEach(comment => {
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

    // search handler for comments
    const commentsSearchInput = document.getElementById('search-comments');
    if (commentsSearchInput) {
        commentsSearchInput.addEventListener('input', () => {
            loadAdminComments(commentsSearchInput.value);
        });
    }


    window.deleteComment = async (id) => {
        if (!confirm("Tem certeza que deseja apagar este relato da face da terra?")) return;
        try {
            const res = await fetch(`/api/comments/${id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json', 'Authorization': adminToken }
            });
            if (res.ok) { loadAdminComments(); loadStats(); }
            else alert("Falha ao deletar.");
        } catch (err) { alert("Erro de conexão."); }
    };

    // === USERS TAB ===
    const loadAdminUsers = async (searchTerm = '') => {
        try {
            const response = await fetch('/api/admin/users', {
                headers: { 'Authorization': adminToken }
            });
            const data = await response.json();

            usersTableBody.innerHTML = '';
            let users = data.data || [];
            if (searchTerm) {
                users = users.filter(u => u.username.toLowerCase().includes(searchTerm.toLowerCase()));
            }
            if (users.length) {
                users.forEach(user => {
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
            } else {
                usersTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);">Nenhum usuário encontrado.</td></tr>';
            }
        } catch (error) { console.error(error); }
    };

    const usersSearchInput = document.getElementById('search-users');
    if (usersSearchInput) {
        usersSearchInput.addEventListener('input', () => {
            loadAdminUsers(usersSearchInput.value);
        });
    }

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
            if (res.ok) { loadAdminUsers(); loadStats(); }
            else alert("Falha na operação.");
        } catch (err) { alert("Erro de conexão."); }
    };

    // === SECURITY LOGS TAB ===
    const loadAdminLogs = async (searchTerm = '') => {
        try {
            const response = await fetch('/api/admin/logs', {
                headers: { 'Authorization': adminToken }
            });
            const data = await response.json();

            logsTableBody.innerHTML = '';
            let logs = data.data || [];
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                logs = logs.filter(l => l.ip_address.toLowerCase().includes(term) || (l.user_agent||'').toLowerCase().includes(term));
            }
            if (logs.length > 0) {
                logs.forEach(log => {
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

    const logsSearchInput = document.getElementById('search-logs');
    if (logsSearchInput) {
        logsSearchInput.addEventListener('input', () => {
            loadAdminLogs(logsSearchInput.value);
        });
    }

    // === FEEDBACK TAB ===
    const loadAdminFeedback = async (searchTerm = '') => {
        try {
            const response = await fetch('/api/admin/feedback', {
                headers: { 'Authorization': adminToken }
            });
            const data = await response.json();
            const tableBody = document.getElementById("feedback-table-body");
            tableBody.innerHTML = '';
            let feedbacks = data.data || [];
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                feedbacks = feedbacks.filter(fb => fb.username.toLowerCase().includes(term) || fb.message.toLowerCase().includes(term));
            }
            if (feedbacks.length) {
                feedbacks.forEach(fb => {
                    const date = new Date(fb.created_at).toLocaleDateString('pt-BR');
                    tableBody.innerHTML += `
                        <tr>
                            <td>${date}</td>
                            <td>${fb.username}</td>
                            <td>${fb.message}</td>
                        </tr>
                    `;
                });
            } else {
                tableBody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--text-muted);">Sem feedbacks.</td></tr>';
            }
        } catch (error) { console.error(error); }
    };

    const feedbackSearchInput = document.getElementById('search-feedback');
    if (feedbackSearchInput) {
        feedbackSearchInput.addEventListener('input', () => {
            loadAdminFeedback(feedbackSearchInput.value);
        });
    }


    // === QUESTIONS TAB ===
    const loadAdminQuestions = async (searchTerm = '') => {
        try {
            const response = await fetch('/api/admin/questions', {
                headers: { 'Authorization': adminToken }
            });
            const data = await response.json();
            const list = document.getElementById('admin-questions-list');
            list.innerHTML = '';
            let qs = data.data || [];
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                qs = qs.filter(q => q.title.toLowerCase().includes(term) || q.author.toLowerCase().includes(term) || q.text.toLowerCase().includes(term));
            }
            if (qs.length) {
                qs.forEach(q => {
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

    const questionsSearchInput = document.getElementById('search-questions');
    if (questionsSearchInput) {
        questionsSearchInput.addEventListener('input', () => {
            loadAdminQuestions(questionsSearchInput.value);
        });
    }

    window.deleteQuestion = async (id) => {
        if (!confirm("Tem certeza que deseja apagar esta dúvida e todas as respostas?")) return;
        try {
            const res = await fetch(`/api/admin/questions/${id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json', 'Authorization': adminToken }
            });
            if (res.ok) { loadAdminQuestions(); loadStats(); }
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
            if (res.ok) { loadAdminQuestions(); loadStats(); }
            else alert("Falha ao deletar.");
        } catch (err) { alert("Erro de conexão."); }
    };


    // === SUBMISSIONS TAB ===
    const loadAdminSubmissions = async (searchTerm = '') => {
        try {
            const response = await fetch('/api/admin/submissions', {
                headers: { 'Authorization': adminToken }
            });
            const data = await response.json();
            const tableBody = document.getElementById("submissions-table-body");
            tableBody.innerHTML = '';
            let subs = data.data || [];
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                subs = subs.filter(s => s.username.toLowerCase().includes(term) || s.title.toLowerCase().includes(term));
            }
            if (subs.length) {
                subs.forEach(sub => {
                    const date = new Date(sub.created_at).toLocaleDateString('pt-BR');
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
            } else {
                tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);">Nenhum mod encontrado.</td></tr>';
            }
        } catch (error) { console.error(error); }
    };

    const submissionsSearchInput = document.getElementById('search-submissions');
    if (submissionsSearchInput) {
        submissionsSearchInput.addEventListener('input', () => {
            loadAdminSubmissions(submissionsSearchInput.value);
        });
    }

    // === Export CSV Feature ===
    const downloadCSV = (csv, filename) => {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const toCSV = (rows) => {
        if (!rows.length) return '';
        const headers = Object.keys(rows[0]);
        const lines = [headers.join(',')];
        rows.forEach(r => {
            const values = headers.map(h => {
                let val = r[h] === null || r[h] === undefined ? '' : String(r[h]);
                if (val.includes(',') || val.includes('"')) {
                    val = '"' + val.replace(/"/g, '""') + '"';
                }
                return val;
            });
            lines.push(values.join(','));
        });
        return lines.join('\n');
    };

    const exportTable = async (type) => {
        let endpoint = '';
        switch(type) {
            case 'comments': endpoint = '/api/comments'; break;
            case 'users': endpoint = '/api/admin/users'; break;
            case 'logs': endpoint = '/api/admin/logs'; break;
            case 'feedback': endpoint = '/api/admin/feedback'; break;
            case 'submissions': endpoint = '/api/admin/submissions'; break;
            case 'questions': endpoint = '/api/admin/questions'; break;
        }
        if (!endpoint) return;
        try {
            const res = await fetch(endpoint, { headers: { 'Authorization': adminToken } });
            const data = await res.json();
            let rows = data.data || [];
            const csv = toCSV(rows);
            downloadCSV(csv, type + '.csv');
        } catch (err) {
            console.error('Erro exportando tabela', type, err);
            alert('Falha ao exportar ' + type);
        }
    };
    document.querySelectorAll('.export-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.getAttribute('data-table');
            exportTable(tab);
        });
    });

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
            if (res.ok) { loadAdminSubmissions(); loadStats(); }
            else alert("Falha na operação.");
        } catch (err) { alert("Erro de conexão."); }
    };
});
