const setupForm = document.getElementById('setup-form');
const startBtn = document.getElementById('start-btn');
const setupStatus = document.getElementById('setup-status');

document.getElementById('story-file').addEventListener('change', (e) => {
    document.getElementById('story-file-name').textContent = e.target.files[0]?.name || 'No file selected';
});
document.getElementById('csharp-file').addEventListener('change', (e) => {
    document.getElementById('csharp-file-name').textContent = e.target.files[0]?.name || 'No file selected';
});
document.getElementById('image-file').addEventListener('change', (e) => {
    document.getElementById('image-file-name').textContent = e.target.files[0]?.name || 'No file selected';
});

setupForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    startBtn.disabled = true;
    startBtn.textContent = 'Initializing...';
    setupStatus.textContent = '';

    const name = document.getElementById('npc-name').value;
    const background = document.getElementById('npc-background').value;
    const behavior = document.getElementById('npc-behavior').value;
    const storyFile = document.getElementById('story-file').files[0];
    const csharpFile = document.getElementById('csharp-file').files[0];
    const imageFile = document.getElementById('image-file').files[0];

    try {
        const uploadFile = async (file) => {
            if (!file) return null;
            const formData = new FormData();
            formData.append('file', file);
            const response = await fetch('/upload', { method: 'POST', body: formData });
            if (!response.ok) {
                let detail = 'Upload failed';
                try { const e = await response.json(); detail = e.detail || detail; } catch {}
                throw new Error(`Failed to upload ${file.name}: ${detail}`);
            }
            const result = await response.json();
            return result.file_path;
        };

        let storyFilePath = null, csharpFilePath = null, imageFilePath = null;
        if (storyFile || csharpFile || imageFile) {
            setupStatus.textContent = 'Uploading files...';
            storyFilePath = await uploadFile(storyFile);
            csharpFilePath = await uploadFile(csharpFile);
            imageFilePath = await uploadFile(imageFile);
        }

        setupStatus.textContent = 'Initializing character...';
        const initResponse = await fetch('/initialize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                background,
                behavior,
                story_file_path: storyFilePath,
                csharp_file_path: csharpFilePath,
                image_file_path: imageFilePath
            })
        });
        if (!initResponse.ok) {
            let detail = 'Failed to initialize.';
            try { const e = await initResponse.json(); detail = e.detail || detail; } catch {}
            throw new Error(detail);
        }
        const initResult = await initResponse.json();
        const sessionId = initResult.session_id;
        const params = new URLSearchParams({ session_id: sessionId, name });
        window.location.href = `/public/chat.html?${params.toString()}`;
    } catch (error) {
        console.error('Initialization failed:', error);
        setupStatus.textContent = `Error: ${error.message}`;
        startBtn.disabled = false;
        startBtn.textContent = 'Create Character & Start Session';
    }
});


