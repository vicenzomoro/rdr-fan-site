document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("login-form");
    const loginSection = document.getElementById("login-section");
    const panelSection = document.getElementById("panel-section");
    const loginError = document.getElementById("login-error");

    const escapeHtml = (str) => {
        if (!str) return '';
        return String(str).replace(/[&<>"']/g, (s) => {
            const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
            return map[s];
        });
    };

    let adminToken = localStorage.getItem('adminKey') || "";

    const showPanel = () => {
        loginSection.style.display = 'none';
        panelSection.style.display = 'grid';
        switchTab('dashboard');
    };

    if (adminToken) {
        // Verifica se o token ainda é válido
        fetch('/api/admin/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: adminToken })
        }).then(res => {
            if (res.ok) showPanel();
            else localStorage.removeItem('adminKey');
        });
    }

    window.logoutAdmin = () => {
        localStorage.removeItem('adminKey');
        window.location.reload();
    };

    window.switchTab = (tabName, event) => {
        if (event) event.preventDefault();
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        const navItem = Array.from(document.querySelectorAll('.nav-item')).find(el => el.textContent.toLowerCase().includes(tabName));
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
    });

    const loadStats = async () => {
        try {
            const res = await fetch('/api/admin/stats', { headers: { 'Authorization': adminToken } });
            const data = await res.json();
            document.getElementById('stat-users').innerText = data.users || 0;
            document.getElementById('stat-comments').innerText = data.comments || 0;
            document.getElementById('stat-mods').innerText = data.mods || 0;
            document.getElementById('stat-feedback').innerText = data.feedback || 0;
        } catch (e) { }
    };

    const loadAdminUsers = async () => {
        const body = document.getElementById("users-table-body");
        const res = await fetch('/api/admin/users', { headers: { 'Authorization': adminToken } });
        const data = await res.json();
        body.innerHTML = (data.data || []).map(u => `
            <tr>
                <td>${u.id}</td>
                <td>${escapeHtml(u.username)}</td>
                <td><span style="color:${u.is_banned ? 'red' : 'green'}">${u.is_banned ? 'Preso' : 'Livre'}</span></td>
                <td>-</td>
            </tr>
        `).join('');
    };

    const loadAdminFeedback = async () => {
        const body = document.getElementById("feedback-table-body");
        const res = await fetch('/api/admin/feedback', { headers: { 'Authorization': adminToken } });
        const data = await res.json();
        body.innerHTML = (data.data || []).map(f => `
            <tr>
                <td>${new Date(f.created_at).toLocaleDateString()}</td>
                <td>${escapeHtml(f.username)}</td>
                <td>${escapeHtml(f.message)}</td>
            </tr>
        `).join('');
    };

    const loadAdminQuestions = async () => {
        const list = document.getElementById("admin-questions-list");
        const res = await fetch('/api/admin/questions', { headers: { 'Authorization': adminToken } });
        const data = await res.json();
        list.innerHTML = (data.data || []).map(q => `
            <div class="card" style="margin-bottom:20px; width: 100%;">
                <h4 style="color:var(--gold);">${escapeHtml(q.title)}</h4>
                <p>${escapeHtml(q.text)}</p>
                <small>Por ${escapeHtml(q.author)} em ${new Date(q.created_at).toLocaleDateString()}</small>
            </div>
        `).join('');
    };

    const loadAdminComments = async () => {
        const list = document.getElementById("admin-comments-list");
        const res = await fetch('/api/comments');
        const data = await res.json();
        list.innerHTML = (data.data || []).map(c => `
            <div class="card" style="margin-bottom:15px; width: 100%;">
                <h4 style="color:var(--gold);">${escapeHtml(c.author)}</h4>
                <p>${escapeHtml(c.text)}</p>
                <button onclick="deleteC(${c.id})" style="color:red; background:none; border:none; cursor:pointer;">Eliminar</button>
            </div>
        `).join('');
    };

    const loadAdminSubmissions = async () => {
        const list = document.getElementById("submissions-list");
        const res = await fetch('/api/admin/submissions', { headers: { 'Authorization': adminToken } });
        const data = await res.json();
        list.innerHTML = (data.data || []).map(s => `
            <div class="card" style="margin-bottom:15px; width: 100%;">
                <h4>${escapeHtml(s.title)}</h4>
                <p>Enviado por: ${escapeHtml(s.username)}</p>
                <a href="${s.link}" target="_blank" class="btn btn-outline" style="padding:5px 10px; font-size:0.8rem">📦 Ver Mod</a>
            </div>
        `).join('');
    };
});
