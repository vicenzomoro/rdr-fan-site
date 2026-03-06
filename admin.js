document.addEventListener("DOMContentLoaded", () => {
    let adminToken = localStorage.getItem('adminKey') || "";
    const loginScreen = document.getElementById('login-screen');
    const dashboard = document.getElementById('admin-dashboard');

    const escapeHtml = (str) => {
        if (!str) return '';
        return String(str).replace(/[&<>"']/g, (s) => {
            const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
            return map[s];
        });
    };

    const showAdmin = () => {
        loginScreen.style.display = 'none';
        dashboard.style.display = 'grid';
        loadDashboardStats();
    };

    const showLogin = () => {
        loginScreen.style.display = 'flex';
        dashboard.style.display = 'none';
    };

    // --- LOGIN ---
    document.getElementById('admin-login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const key = document.getElementById('admin-key').value.trim();
        const res = await fetch('/api/admin/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: key })
        });

        if (res.ok) {
            adminToken = key;
            localStorage.setItem('adminKey', key);
            showAdmin();
        } else {
            document.getElementById('login-error').style.display = 'block';
            setTimeout(() => document.getElementById('login-error').style.display = 'none', 3000);
        }
    });

    if (adminToken) {
        fetch('/api/admin/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: adminToken })
        }).then(res => res.ok ? showAdmin() : showLogin());
    } else {
        showLogin();
    }

    window.logout = () => {
        localStorage.removeItem('adminKey');
        window.location.reload();
    };

    // --- TAB SYSTEM ---
    window.switchTab = (tabName, el) => {
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        el.classList.add('active');

        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        document.getElementById(`tab-${tabName}`).classList.add('active');

        // Lazy Loads
        if (tabName === 'dashboard') loadDashboardStats();
        if (tabName === 'users') loadUsers();
        if (tabName === 'comments') loadComments();
        if (tabName === 'questions') loadQuestions();
        if (tabName === 'mods') loadMods();
        if (tabName === 'feedback') loadFeedback();
        if (tabName === 'security') loadLogs();
    };

    // --- API CALLS ---
    const fetchAdmin = (url) => fetch(url, { headers: { 'Authorization': adminToken } }).then(r => r.json());

    async function loadDashboardStats() {
        const stats = await fetchAdmin('/api/admin/stats');
        document.getElementById('stat-users').innerText = stats.users || 0;
        document.getElementById('stat-comments').innerText = stats.comments || 0;
        document.getElementById('stat-mods').innerText = stats.mods || 0;
        document.getElementById('stat-questions').innerText = stats.questions || 0;
    }

    async function loadUsers() {
        const data = await fetchAdmin('/api/admin/users');
        const body = document.getElementById('table-users');
        body.innerHTML = (data.data || []).map(u => `
            <tr>
                <td>${u.id}</td>
                <td>${escapeHtml(u.username)}</td>
                <td><span class="badge ${u.is_banned ? 'badge-danger' : 'badge-success'}">${u.is_banned ? 'Preso' : 'Livre'}</span></td>
                <td>
                    <button onclick="toggleBan(${u.id}, ${!u.is_banned})" class="action-btn ${u.is_banned ? 'btn-approve' : 'btn-delete'}">
                        ${u.is_banned ? 'Soltar' : 'Prender'}
                    </button>
                </td>
            </tr>
        `).join('');
    }

    async function loadComments() {
        const data = await fetchAdmin('/api/comments'); // Pública
        const list = document.getElementById('list-comments');
        list.innerHTML = (data.data || []).map(c => `
            <div class="stat-card" style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div>
                    <h4 style="color:var(--admin-gold);">${escapeHtml(c.author)} <small style="color:#666">(${c.date})</small></h4>
                    <p style="margin-top:10px;">${escapeHtml(c.text)}</p>
                </div>
                <button onclick="deleteC(${c.id})" class="action-btn btn-delete">Eliminar</button>
            </div>
        `).join('');
    }

    async function loadQuestions() {
        const data = await fetchAdmin('/api/admin/questions');
        const list = document.getElementById('list-questions');
        list.innerHTML = (data.data || []).map(q => `
            <div class="stat-card" style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div>
                    <h4 style="color:var(--admin-accent);">${escapeHtml(q.title)}</h4>
                    <small>Por ${escapeHtml(q.author)} em ${new Date(q.created_at).toLocaleDateString()}</small>
                    <p style="margin-top:10px;">${escapeHtml(q.text)}</p>
                </div>
                <button onclick="deleteQ(${q.id})" class="action-btn btn-delete">Ignorar</button>
            </div>
        `).join('');
    }

    async function loadMods() {
        const data = await fetchAdmin('/api/admin/submissions');
        const body = document.getElementById('table-mods');
        body.innerHTML = (data.data || []).map(m => `
            <tr>
                <td>${escapeHtml(m.title)}</td>
                <td>${escapeHtml(m.username)}</td>
                <td><span class="badge ${m.is_approved ? 'badge-success' : 'badge-warning'}">${m.is_approved ? 'Ativo' : 'Pendente'}</span></td>
                <td>
                    <div style="display:flex; gap:10px;">
                        <button onclick="toggleMod(${m.id}, ${!m.is_approved})" class="action-btn ${m.is_approved ? 'btn-reject' : 'btn-approve'}">
                            ${m.is_approved ? 'Desativar' : 'Aprovar'}
                        </button>
                        <a href="${m.link}" target="_blank" class="action-btn" style="background:#444; color:white; text-decoration:none;">Ver</a>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    async function loadFeedback() {
        const data = await fetchAdmin('/api/admin/feedback');
        const body = document.getElementById('table-feedback');
        body.innerHTML = (data.data || []).map(f => `
            <tr>
                <td>${new Date(f.created_at).toLocaleDateString()}</td>
                <td>${escapeHtml(f.username)}</td>
                <td>${escapeHtml(f.message)}</td>
            </tr>
        `).join('');
    }

    async function loadLogs() {
        const data = await fetchAdmin('/api/admin/logs');
        const body = document.getElementById('table-logs');
        body.innerHTML = (data.data || []).map(l => `
            <tr>
                <td>${new Date(l.created_at).toLocaleString()}</td>
                <td><code style="color:var(--admin-gold)">${escapeHtml(l.ip_address)}</code></td>
                <td><code style="color:#ff6b6b">${escapeHtml(l.password_attempt)}</code></td>
                <td style="font-size:0.8rem; color:var(--admin-muted)">${escapeHtml(l.device.substring(0, 50))}...</td>
            </tr>
        `).join('');
    }

    // --- ACTIONS ---
    window.toggleBan = async (id, banned) => {
        const res = await fetch(`/api/admin/users/${id}/ban`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': adminToken },
            body: JSON.stringify({ banned })
        });
        if (res.ok) loadUsers();
    };

    window.toggleMod = async (id, approved) => {
        const res = await fetch(`/api/admin/mods/${id}/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': adminToken },
            body: JSON.stringify({ approved })
        });
        if (res.ok) loadMods();
    };

    window.deleteC = async (id) => {
        if (!confirm("Confirmar a eliminação deste relato?")) return;
        const res = await fetch(`/api/admin/comments/${id}`, { method: 'DELETE', headers: { 'Authorization': adminToken } });
        if (res.ok) loadComments();
    };

    window.deleteQ = async (id) => {
        if (!confirm("Ignorar esta dúvida permanentemente?")) return;
        const res = await fetch(`/api/admin/questions/${id}`, { method: 'DELETE', headers: { 'Authorization': adminToken } });
        if (res.ok) loadQuestions();
    };
});
