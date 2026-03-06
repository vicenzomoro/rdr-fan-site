document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("login-form");
    const loginSection = document.getElementById("login-section");
    const panelSection = document.getElementById("panel-section");
    const loginError = document.getElementById("login-error");

    // helper to escape text for HTML
    const escapeHtml = (str) => {
        if (!str) return '';
        return String(str).replace(/[&<>"']/g, (s) => {
            const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
            return map[s];
        });
    };

    // Tenta recuperar o token salvo para não ter que logar toda hora
    let adminToken = localStorage.getItem('adminKey') || "";

    const checkExistingSession = async () => {
        if (!adminToken) return;
        try {
            const res = await fetch('/api/admin/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: adminToken })
            });
            if (res.ok) {
                showPanel();
            } else {
                localStorage.removeItem('adminKey');
            }
        } catch (e) { console.error(e); }
    };

    const showPanel = () => {
        loginSection.style.display = 'none';
        panelSection.style.display = 'grid';
        switchTab('dashboard');
    };

    checkExistingSession();

    // Tabs elements
    const commentsList = document.getElementById("admin-comments-list");
    const usersTableBody = document.getElementById("users-table-body");
    const logsTableBody = document.getElementById("logs-table-body");
    const feedbackTableBody = document.getElementById("feedback-table-body");
    const questionsList = document.getElementById("admin-questions-list");
    const submissionsList = document.getElementById("submissions-list");

    const loadStats = async () => {
        if (!adminToken) return;
        try {
            const res = await fetch('/api/admin/stats', { headers: { 'Authorization': adminToken } });
            const data = await res.json();
            document.getElementById('stat-users').innerText = data.users || 0;
            document.getElementById('stat-comments').innerText = data.comments || 0;
            document.getElementById('stat-mods').innerText = data.mods || 0;
            document.getElementById('stat-feedback').innerText = data.feedback || 0;
        } catch (err) { console.error(err); }
    };

    window.logoutAdmin = () => {
        localStorage.removeItem('adminKey');
        window.location.reload();
    };

    window.switchTab = (tabName, event) => {
        if (event) event.preventDefault();
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        const navItem = document.querySelector(`.nav-item[onclick*="${tabName}"]`);
        if (navItem) navItem.classList.add('active');

        document.querySelectorAll('.admin-tab').forEach(tab => tab.style.display = 'none');
        const targetTab = document.getElementById(`tab-${tabName}`);
        if (targetTab) targetTab.style.display = 'block';

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
                localStorage.setItem('adminKey', adminToken);
                showPanel();
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
            let items = data.data || [];
            if (items.length > 0) {
                items.forEach(c => {
                    const el = document.createElement("div");
                    el.className = "card"; el.style.marginBottom = "20px";
                    el.innerHTML = `<div style="display:flex; justify-content:space-between;">
                        <div><h4 style="color:var(--gold);">${escapeHtml(c.author)}</h4><p>${escapeHtml(c.text)}</p></div>
                        <button onclick="deleteComment(${c.id})" class="btn" style="color:#ff4c4c;">Apagar</button>
                    </div>`;
                    commentsList.appendChild(el);
                });
            } else { commentsList.innerHTML = '<p style="text-align:center;">Nenhum relato.</p>'; }
        } catch (e) { console.error(e); }
    };

    window.deleteComment = async (id) => {
        if (!confirm("Apagar?")) return;
        await fetch(`/api/comments/${id}`, { method: 'DELETE', headers: { 'Authorization': adminToken } });
        loadAdminComments();
    };

    const loadAdminUsers = async () => {
        try {
            const res = await fetch('/api/admin/users', { headers: { 'Authorization': adminToken } });
            const data = await res.json();
            usersTableBody.innerHTML = '';
            (data.data || []).forEach(u => {
                usersTableBody.innerHTML += `<tr><td>${u.id}</td><td>${escapeHtml(u.username)}</td><td>${u.is_banned ? 'Banido' : 'Ativo'}</td></tr>`;
            });
        } catch (e) { console.error(e); }
    };

    const loadAdminFeedback = async () => {
        try {
            const res = await fetch('/api/admin/feedback', { headers: { 'Authorization': adminToken } });
            const data = await res.json();
            feedbackTableBody.innerHTML = '';
            (data.data || []).forEach(f => {
                feedbackTableBody.innerHTML += `<tr><td>${new Date(f.created_at).toLocaleDateString()}</td><td>${escapeHtml(f.username)}</td><td>${escapeHtml(f.message)}</td></tr>`;
            });
        } catch (e) { console.error(e); }
    };

    const loadAdminQuestions = async () => {
        try {
            const res = await fetch('/api/admin/questions', { headers: { 'Authorization': adminToken } });
            const data = await res.json();
            questionsList.innerHTML = '';
            (data.data || []).forEach(q => {
                questionsList.innerHTML += `<div class="card" style="margin-bottom:15px;">
                    <h4 style="color:var(--gold);">${escapeHtml(q.title)}</h4><p>${escapeHtml(q.text)}</p>
                    <small>Por ${escapeHtml(q.author)}</small>
                </div>`;
            });
        } catch (e) { console.error(e); }
    };

    const loadAdminLogs = async () => {
        try {
            const res = await fetch('/api/admin/logs', { headers: { 'Authorization': adminToken } });
            const data = await res.json();
            logsTableBody.innerHTML = '';
            (data.data || []).forEach(l => {
                logsTableBody.innerHTML += `<tr><td>${new Date(l.created_at).toLocaleString()}</td><td>${l.ip_address}</td><td>${l.attempt_password}</td></tr>`;
            });
        } catch (e) { console.error(e); }
    };

    const loadAdminSubmissions = async () => {
        try {
            const res = await fetch('/api/admin/submissions', { headers: { 'Authorization': adminToken } });
            const data = await res.json();
            submissionsList.innerHTML = '';
            (data.data || []).forEach(s => {
                submissionsList.innerHTML += `<div class="card" style="margin-bottom:15px;">
                    <h4>${escapeHtml(s.title)}</h4><p>Enviado por: ${escapeHtml(s.username)}</p>
                    <a href="${s.link}" target="_blank">Download</a>
                </div>`;
            });
        } catch (e) { console.error(e); }
    };
});
