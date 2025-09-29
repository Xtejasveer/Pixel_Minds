async function loadAvatars() {
    const grid = document.getElementById('avatar-grid');
    const loadingIndicator = document.getElementById('avatar-loading');
    const errorMsg = document.getElementById('error-msg');
    grid.innerHTML = '';
    errorMsg.textContent = '';
    loadingIndicator.classList.remove('hidden');

    try {
        const response = await fetch('/avatars');
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Server returned ${response.status}: ${text}`);
        }
        const avatars = await response.json();
        loadingIndicator.classList.add('hidden');

        if (!Array.isArray(avatars) || avatars.length === 0) {
            grid.innerHTML = '<p class="text-gray-400 col-span-full text-center">No saved characters found. Create one from the "Create Character" page.</p>';
            return;
        }

        const seen = new Set();
        const search = document.getElementById('search');
        let list = avatars.slice();

        const render = (items) => {
            grid.innerHTML = '';
            items.forEach(avatar => {
                if (!avatar || !avatar.name) return;
                const key = avatar.name.trim().toLowerCase();
                if (seen.has(key)) return; // dedupe display
                seen.add(key);
                const card = document.createElement('div');
                card.className = 'avatar-card bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-teal-500 cursor-pointer';
                card.innerHTML = `
                <h3 class="font-bold text-lg text-teal-400">${escapeHtml(avatar.name)}</h3>
                <p class="text-sm text-gray-300 mt-2">${escapeHtml(avatar.background || '')}</p>
                <div class="mt-3 text-right">
                    <button class="btn btn-primary text-sm">Load & Chat</button>
                </div>
                `;
                card.addEventListener('click', () => handleAvatarLoad(avatar));
                grid.appendChild(card);
            });
        };

        render(list);

        if (search) {
            search.addEventListener('input', () => {
                const q = search.value.trim().toLowerCase();
                seen.clear();
                const filtered = list.filter(a => (a.name || '').toLowerCase().includes(q));
                render(filtered);
            });
        }
    } catch (error) {
        loadingIndicator.classList.add('hidden');
        errorMsg.textContent = `Could not load saved characters: ${error.message}`;
        console.error('Error loading avatars:', error);
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
}

async function handleAvatarLoad(avatar) {
    try {
        // Re-initialize using the saved fields (no files)
        const initResponse = await fetch('/initialize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: avatar.name,
                background: avatar.background,
                behavior: avatar.behavior
            })
        });
        if (!initResponse.ok) {
            const err = await initResponse.json().catch(() => ({}));
            throw new Error(err.detail || 'Failed to initialize.');
        }
        const { session_id } = await initResponse.json();
        const params = new URLSearchParams({ session_id, name: avatar.name });
        window.location.href = `/public/chat.html?${params.toString()}`;
    } catch (e) {
        alert(`Could not load character: ${e.message}`);
    }
}

loadAvatars();


