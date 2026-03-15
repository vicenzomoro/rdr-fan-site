// ========== NOVAS FUNCIONALIDADES - RDR FAN SITE v2.0 ==========

// === GALERIA DE SCREENSHOTS ===
let currentScreenshotCategory = 'all';

async function loadScreenshots(category = 'all') {
    const gallery = document.getElementById('screenshots-gallery');
    if (!gallery) return;
    
    try {
        let url = '/api/screenshots?sort=votes';
        if (category !== 'all') url += `&category=${category}`;
        
        const res = await fetch(url);
        const data = await res.json();
        const screenshots = data.data || [];
        
        gallery.innerHTML = '';
        
        if (screenshots.length > 0) {
            screenshots.forEach(s => {
                const card = document.createElement('div');
                card.className = 'glass-card screenshot-card';
                card.innerHTML = `
                    <img src="${s.image_url}" alt="${escapeHtml(s.title)}" 
                         style="width:100%; height:200px; object-fit:cover; border-radius:8px; margin-bottom:15px;"
                         loading="lazy">
                    <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                        <strong style="color:var(--gold);">${escapeHtml(s.title)}</strong>
                        <span style="color:var(--text-muted); font-size:0.85rem;">👁 ${s.views || 0}</span>
                    </div>
                    <p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:15px;">
                        ${escapeHtml(s.description || 'Sem descrição')}
                    </p>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size:0.85rem; color:var(--text-muted);">Por ${escapeHtml(s.username)}</span>
                        <div style="display:flex; gap:10px;">
                            <button class="btn-vote" onclick="voteScreenshot(${s.id}, 'up')" 
                                    style="background:none; border:none; cursor:pointer; font-size:1.2rem;">👍</button>
                            <span style="color:var(--gold);">${s.votes_up || 0}</span>
                            <button class="btn-vote" onclick="voteScreenshot(${s.id}, 'down')"
                                    style="background:none; border:none; cursor:pointer; font-size:1.2rem;">👎</button>
                        </div>
                    </div>
                `;
                gallery.appendChild(card);
            });
        } else {
            gallery.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:40px;">Nenhuma screenshot encontrada.</p>';
        }
    } catch (err) {
        console.error('Erro ao carregar screenshots:', err);
        gallery.innerHTML = '<p style="color:var(--primary-red); text-align:center;">Erro ao carregar.</p>';
    }
}

window.filterScreenshots = (category) => {
    document.querySelectorAll('#screenshots .mod-nav-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    loadScreenshots(category);
};

window.voteScreenshot = async (id, type) => {
    const currentUser = localStorage.getItem('currentUser');
    if (!currentUser) {
        showToast('Faça login para votar.', 'info');
        return;
    }
    
    try {
        const res = await fetch(`/api/screenshots/${id}/vote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: currentUser, vote_type: type })
        });
        
        if (res.ok) {
            const result = await res.json();
            showToast('Voto registrado!', 'success');
            loadScreenshots(currentScreenshotCategory);
        }
    } catch (err) {
        showToast('Erro ao votar.', 'error');
    }
};

// Upload de screenshot
const screenshotForm = document.getElementById('screenshot-form');
if (screenshotForm) {
    screenshotForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const currentUser = localStorage.getItem('currentUser');
        if (!currentUser) {
            showToast('Faça login para enviar screenshots.', 'info');
            return;
        }
        
        const title = document.getElementById('screenshot-title').value.trim();
        const description = document.getElementById('screenshot-desc').value.trim();
        const category = document.getElementById('screenshot-category').value;
        const fileInput = document.getElementById('screenshot-file');
        
        if (!title || !fileInput.files[0]) return;
        
        const btn = e.target.querySelector('button');
        const originalText = btn.innerHTML;
        btn.innerHTML = 'Enviando...';
        btn.disabled = true;
        
        const formData = new FormData();
        formData.append('username', currentUser);
        formData.append('title', title);
        formData.append('description', description);
        formData.append('category', category);
        formData.append('image', fileInput.files[0]);
        
        try {
            const res = await fetch('/api/screenshots', {
                method: 'POST',
                body: formData
            });
            
            if (res.ok) {
                showToast('Screenshot enviada!', 'success');
                screenshotForm.reset();
                loadScreenshots();
            } else {
                const result = await res.json();
                showToast('Erro: ' + (result.error || 'Tente novamente.'), 'error');
            }
        } catch (err) {
            showToast('Erro de conexão.', 'error');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });
}

// === FÓRUM ===
async function loadForumTopics(category = 'all') {
    const container = document.getElementById('forum-topics');
    if (!container) return;
    
    try {
        let url = '/api/forum/topics?';
        if (category !== 'all') url += `category=${category}&`;
        
        const res = await fetch(url);
        const data = await res.json();
        const topics = data.data || [];
        
        container.innerHTML = '';
        
        if (topics.length > 0) {
            topics.forEach(t => {
                const card = document.createElement('div');
                card.className = 'glass-card forum-topic-card';
                card.style.cursor = 'pointer';
                card.onclick = () => openTopic(t.id);
                card.innerHTML = `
                    <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                        <h3 style="color:var(--gold); margin:0; font-size:1.1rem;">${escapeHtml(t.title)}</h3>
                        ${t.is_pinned ? '<span style="color:#ffc107;">📌</span>' : ''}
                    </div>
                    <p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:15px; 
                              display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">
                        ${escapeHtml(t.content.substring(0, 200))}...
                    </p>
                    <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.85rem;">
                        <span style="color:var(--text-muted);">Por ${escapeHtml(t.username)}</span>
                        <div style="display:flex; gap:15px; color:var(--text-muted);">
                            <span>💬 ${t.replies_count || 0}</span>
                            <span>👁 ${t.views || 0}</span>
                        </div>
                    </div>
                `;
                container.appendChild(card);
            });
        } else {
            container.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:40px;">Nenhum tópico encontrado.</p>';
        }
    } catch (err) {
        console.error('Erro ao carregar tópicos:', err);
        container.innerHTML = '<p style="color:var(--primary-red); text-align:center;">Erro ao carregar.</p>';
    }
}

window.filterForum = (category) => {
    document.querySelectorAll('#forum .mod-nav-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    loadForumTopics(category);
};

window.openTopic = (id) => {
    window.location.href = `topic.html?id=${id}`;
};

// Criar tópico
const forumForm = document.getElementById('forum-form');
if (forumForm) {
    forumForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const currentUser = localStorage.getItem('currentUser');
        if (!currentUser) {
            showToast('Faça login para criar tópicos.', 'info');
            return;
        }
        
        const title = document.getElementById('forum-title').value.trim();
        const category = document.getElementById('forum-category').value;
        const content = document.getElementById('forum-content').value.trim();
        
        if (!title || !content) return;
        
        const btn = e.target.querySelector('button');
        const originalText = btn.innerHTML;
        btn.innerHTML = 'Criando...';
        btn.disabled = true;
        
        try {
            const res = await fetch('/api/forum/topics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: currentUser,
                    title,
                    category,
                    content
                })
            });
            
            if (res.ok) {
                showToast('Tópico criado!', 'success');
                forumForm.reset();
                loadForumTopics();
            } else {
                const result = await res.json();
                showToast('Erro: ' + (result.error || 'Tente novamente.'), 'error');
            }
        } catch (err) {
            showToast('Erro de conexão.', 'error');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });
}

// === NOTÍCIAS ===
async function loadNews() {
    const container = document.getElementById('news-list');
    if (!container) return;
    
    try {
        const res = await fetch('/api/news');
        const data = await res.json();
        const news = data.data || [];
        
        container.innerHTML = '';
        
        if (news.length > 0) {
            news.forEach(n => {
                const card = document.createElement('div');
                card.className = 'glass-card news-card';
                card.innerHTML = `
                    ${n.cover_image ? `<img src="${n.cover_image}" alt="${escapeHtml(n.title)}" 
                          style="width:100%; height:180px; object-fit:cover; border-radius:8px; margin-bottom:15px;">` : ''}
                    <div style="color:var(--primary-red); font-size:0.8rem; margin-bottom:8px;">
                        ${escapeHtml(n.category)} • ${new Date(n.published_at || n.created_at).toLocaleDateString('pt-BR')}
                    </div>
                    <h3 style="color:var(--gold); margin-bottom:10px; font-size:1.2rem;">${escapeHtml(n.title)}</h3>
                    <p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:15px;
                              display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden;">
                        ${escapeHtml(n.excerpt || n.content.substring(0, 200))}...
                    </p>
                    <a href="news.html?slug=${n.slug}" class="btn btn-primary" style="padding:8px 20px; font-size:0.9rem;">
                        Ler mais
                    </a>
                `;
                container.appendChild(card);
            });
        } else {
            container.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:40px;">Nenhuma notícia encontrada.</p>';
        }
    } catch (err) {
        console.error('Erro ao carregar notícias:', err);
        container.innerHTML = '<p style="color:var(--primary-red); text-align:center;">Erro ao carregar.</p>';
    }
}

// === WIKI ===
async function loadWiki(type = 'all', search = '') {
    const container = document.getElementById('wiki-list');
    if (!container) return;
    
    try {
        let url = '/api/wiki?';
        if (type !== 'all') url += `type=${type}&`;
        if (search) url += `search=${encodeURIComponent(search)}&`;
        
        const res = await fetch(url);
        const data = await res.json();
        const entries = data.data || [];
        
        container.innerHTML = '';
        
        if (entries.length > 0) {
            entries.forEach(e => {
                const card = document.createElement('div');
                card.className = 'glass-card wiki-card';
                card.style.cursor = 'pointer';
                card.onclick = () => window.location.href = `wiki.html?slug=${e.slug}`;
                card.innerHTML = `
                    <div style="display:flex; align-items:center; gap:15px; margin-bottom:15px;">
                        ${e.cover_image ? `<img src="${e.cover_image}" alt="${escapeHtml(e.title)}" 
                              style="width:60px; height:60px; object-fit:cover; border-radius:8px;">` : 
                              '<div style="width:60px; height:60px; background:var(--primary-red); border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:1.5rem;">📖</div>'}
                        <div>
                            <h3 style="color:var(--gold); margin:0; font-size:1.1rem;">${escapeHtml(e.title)}</h3>
                            <span style="font-size:0.8rem; color:var(--text-muted);">${escapeHtml(e.entry_type)}</span>
                        </div>
                    </div>
                    <p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:15px;">
                        ${escapeHtml(e.summary || e.content.substring(0, 150))}...
                    </p>
                    <span style="font-size:0.85rem; color:var(--text-muted);">👁 ${e.views || 0} visualizações</span>
                `;
                container.appendChild(card);
            });
        } else {
            container.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:40px;">Nenhum artigo encontrado.</p>';
        }
    } catch (err) {
        console.error('Erro ao carregar wiki:', err);
        container.innerHTML = '<p style="color:var(--primary-red); text-align:center;">Erro ao carregar.</p>';
    }
}

window.filterWiki = (type) => {
    document.querySelectorAll('#wiki .mod-nav-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    loadWiki(type);
};

window.searchWiki = () => {
    const search = document.getElementById('wiki-search').value;
    loadWiki('all', search);
};

// === EVENTOS ===
async function loadEvents() {
    const container = document.getElementById('events-list');
    if (!container) return;
    
    try {
        const res = await fetch('/api/events');
        const data = await res.json();
        const events = data.data || [];
        
        container.innerHTML = '';
        
        if (events.length > 0) {
            events.forEach(e => {
                const startDate = new Date(e.start_date).toLocaleDateString('pt-BR');
                const card = document.createElement('div');
                card.className = 'glass-card event-card';
                card.innerHTML = `
                    <div style="display:flex; justify-content:space-between; margin-bottom:15px;">
                        <span style="background:var(--primary-red); color:white; padding:4px 12px; border-radius:20px; font-size:0.8rem;">
                            ${escapeHtml(e.event_type)}
                        </span>
                        <span style="color:${e.status === 'ativo' ? '#28a745' : 'var(--text-muted)'}; font-size:0.8rem;">
                            ${escapeHtml(e.status)}
                        </span>
                    </div>
                    <h3 style="color:var(--gold); margin-bottom:10px;">${escapeHtml(e.title)}</h3>
                    <p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:15px;">
                        ${escapeHtml(e.description.substring(0, 150))}...
                    </p>
                    <div style="font-size:0.85rem; color:var(--text-muted); margin-bottom:15px;">
                        📅 ${startDate}
                        ${e.prize ? `<br>🏆 Prêmio: ${escapeHtml(e.prize)}` : ''}
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size:0.85rem;">👥 ${e.current_participants || 0}/${e.max_participants || '∞'}</span>
                        <a href="event.html?id=${e.id}" class="btn btn-primary" style="padding:8px 20px; font-size:0.9rem;">
                            Ver detalhes
                        </a>
                    </div>
                `;
                container.appendChild(card);
            });
        } else {
            container.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:40px;">Nenhum evento encontrado.</p>';
        }
    } catch (err) {
        console.error('Erro ao carregar eventos:', err);
        container.innerHTML = '<p style="color:var(--primary-red); text-align:center;">Erro ao carregar.</p>';
    }
}

// === NEWSLETTER ===
const newsletterForm = document.getElementById('newsletter-form');
if (newsletterForm) {
    newsletterForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('newsletter-email').value.trim();
        const statusEl = document.getElementById('newsletter-status');
        const currentUser = localStorage.getItem('currentUser');
        
        if (!email) return;
        
        const btn = e.target.querySelector('button');
        const originalText = btn.innerHTML;
        btn.innerHTML = 'Inscrevendo...';
        btn.disabled = true;
        
        try {
            const res = await fetch('/api/newsletter/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, username: currentUser || null })
            });
            
            if (res.ok) {
                statusEl.innerText = 'Inscrito com sucesso! Verifique seu e-mail.';
                statusEl.style.color = '#28a745';
                statusEl.style.display = 'block';
                newsletterForm.reset();
                showToast('Inscrito na newsletter!', 'success');
            } else {
                const result = await res.json();
                statusEl.innerText = 'Erro: ' + (result.error || 'E-mail já cadastrado.');
                statusEl.style.color = 'var(--primary-red)';
                statusEl.style.display = 'block';
            }
        } catch (err) {
            statusEl.innerText = 'Erro de conexão.';
            statusEl.style.color = 'var(--primary-red)';
            statusEl.style.display = 'block';
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
            setTimeout(() => { statusEl.style.display = 'none'; }, 5000);
        }
    });
}

// === SISTEMA DE DENÚNCIAS ===
window.reportContent = async (contentType, contentId, reason) => {
    const currentUser = localStorage.getItem('currentUser');
    if (!currentUser) {
        showToast('Faça login para reportar.', 'info');
        return;
    }
    
    const description = prompt('Descreva o motivo da denúncia (opcional):');
    
    try {
        const res = await fetch('/api/reports', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                reporter_username: currentUser,
                content_type: contentType,
                content_id: contentId,
                reason,
                description: description || null
            })
        });
        
        if (res.ok) {
            showToast('Denúncia enviada. Obrigado por ajudar a manter a comunidade segura!', 'success');
        } else {
            showToast('Erro ao enviar denúncia.', 'error');
        }
    } catch (err) {
        showToast('Erro de conexão.', 'error');
    }
};

// === INICIALIZAÇÃO ===
document.addEventListener('DOMContentLoaded', () => {
    loadScreenshots();
    loadForumTopics();
    loadNews();
    loadWiki();
    loadEvents();
    initTheme();
});

// === DISCORD WIDGET ===
window.toggleDiscord = function() {
    const frame = document.getElementById('discord-frame');
    if (frame.style.display === 'none') {
        frame.style.display = 'block';
        // Carregar widget do Discord
        const iframe = frame.querySelector('iframe');
        const serverId = 'SEU_SERVER_ID'; // Substitua pelo ID do seu servidor
        iframe.src = `https://discord.com/widget?id=${serverId}&theme=dark`;
    } else {
        frame.style.display = 'none';
    }
};

// === THEME TOGGLE ===
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        document.getElementById('theme-icon').textContent = '☀️';
    }
}

window.toggleTheme = function() {
    const body = document.body;
    const icon = document.getElementById('theme-icon');
    
    body.classList.toggle('light-theme');
    
    if (body.classList.contains('light-theme')) {
        localStorage.setItem('theme', 'light');
        icon.textContent = '☀️';
        showToast('Tema claro ativado', 'info');
    } else {
        localStorage.setItem('theme', 'dark');
        icon.textContent = '🌙';
        showToast('Tema escuro ativado', 'info');
    }
};
