import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- Global State ---
let scene, camera, renderer, clock, mixer, model, controls;
const animations = {};
let activeAction;
let socket;
let voices = [];
let isTtsEnabled = true;
let recognition;
let isListening = false;

// --- Game World State & Objects ---
let worldObjects = {};
let targetPosition = null;
let movementSpeed = 1.5;

// Aligns with the backend's C# file parser and system prompts,
// allowing MOVE and INTERACT commands to function correctly.
const worldData = {
    locations: {
        'entrance': new THREE.Vector3(0, 0, 8),
        'produce section': new THREE.Vector3(-5, 0, 2),
        'dairy section': new THREE.Vector3(-5, 0, -5),
        'checkout counter': new THREE.Vector3(3, 0, 6),
        'aisle 1': new THREE.Vector3(0, 0, 0),
        'aisle 2': new THREE.Vector3(0, 0, -5),
        'aisle 3': new THREE.Vector3(5, 0, -5),
    },
    interactables: {
        'front door': 'doorObject',
        'cash register': 'registerObject'
    }
};

// --- DOM Elements ---
const viewerContainer = document.getElementById('viewer-container');
const loadingScreen = document.getElementById('loading-screen');
const loadingStatus = document.getElementById('loading-status');
const chatBox = document.getElementById('chat-box');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const terminateBtn = document.getElementById('terminate-btn');
const typingIndicator = document.getElementById('typing-indicator');
const setupModal = document.getElementById('setup-modal');
const setupForm = document.getElementById('setup-form');
const startBtn = document.getElementById('start-btn');
const setupStatus = document.getElementById('setup-status');
const ttsToggleBtn = document.getElementById('tts-toggle-btn');
const speakerOnIcon = document.getElementById('speaker-on-icon');
const speakerOffIcon = document.getElementById('speaker-off-icon');
const sttBtn = document.getElementById('stt-btn');

const animationFiles = {
    'walking': '/public/Animation_Walking_withSkin.fbx',
    'running': '/public/Animation_Running_withSkin.fbx',
    'talk_passionately': '/public/Animation_Talk_Passionately_withSkin.fbx',
    'sleep': '/public/Animation_sleep_withSkin.fbx',
    'casual_walk': '/public/Animation_Casual_Walk_withSkin.fbx',
    'motivational_cheer': '/public/Animation_Motivational_Cheer_withSkin.fbx',
    'wave_one_hand': '/public/Animation_Wave_One_Hand_withSkin.fbx'
};

const nonLoopingAnimations = ['wave_one_hand', 'motivational_cheer'];

// --- SPEECH SYNTHESIS & RECOGNITION ---
function initSpeechSynthesis() {
    voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) {
        window.speechSynthesis.onvoiceschanged = () => { voices = window.speechSynthesis.getVoices(); };
    }
}

function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'en-US';
        recognition.interimResults = false;

        recognition.onstart = () => {
            isListening = true;
            sttBtn.classList.add('animate-pulse', 'text-red-400');
        };

        recognition.onend = () => {
            isListening = false;
            sttBtn.classList.remove('animate-pulse', 'text-red-400');
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            chatInput.value = transcript;
            sendMessage();
        };

        recognition.onerror = (event) => {
            console.error("Speech recognition error:", event.error);
        };
    } else {
        console.warn("Speech Recognition API not supported in this browser.");
        sttBtn.style.display = 'none';
    }
}

function speak(text) {
    if (!isTtsEnabled) return; 
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const preferredVoice = voices.find(voice => voice.name.includes('Google') && voice.lang.includes('en-US'));
    utterance.voice = preferredVoice || voices[0];

    utterance.onstart = () => {
        const movementAnimations = ['walking', 'running', 'casual_walk'];
        const activeAnimationName = activeAction ? Object.keys(animations).find(key => animations[key] === activeAction) : null;
        const isNonLoopingActive = activeAction && nonLoopingAnimations.includes(activeAnimationName);

        if (!isNonLoopingActive && !movementAnimations.includes(activeAnimationName)) {
            playAnimation('talk_passionately');
        }
    };
    
    utterance.onend = () => {
        // This is now the single source of truth for cleaning up speech-related animations.
        const activeAnimationName = activeAction ? Object.keys(animations).find(key => animations[key] === activeAction) : null;
        
        // If the active animation is the default talk OR any non-looping one, stop it when speech ends.
        if (activeAnimationName === 'talk_passionately' || nonLoopingAnimations.includes(activeAnimationName)) {
            if (activeAction) {
                activeAction.fadeOut(0.3);
            }
            activeAction = null;
        }
    };

    window.speechSynthesis.speak(utterance);
}

// --- THREE.JS INITIALIZATION ---
function initThree() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111827);
    clock = new THREE.Clock();
    camera = new THREE.PerspectiveCamera(50, viewerContainer.clientWidth / viewerContainer.clientHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(viewerContainer.clientWidth, viewerContainer.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    viewerContainer.appendChild(renderer.domElement);
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    const ambientLight = new THREE.HemisphereLight(0xffffff, 0x444444, 2);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 3);
    dirLight.position.set(3, 10, 5);
    dirLight.castShadow = true;
    scene.add(dirLight);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshStandardMaterial({ color: 0x1f2937 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const mainLight = new THREE.PointLight(0xffffff, 0, 50); // Start with light off
    mainLight.position.set(0, 5, 0);
    mainLight.castShadow = true;
    worldObjects.mainLight = mainLight;
    scene.add(mainLight);

    loadModels();
    animate();
}

async function loadModels() {
    const fbxLoader = new FBXLoader();
    try {
        loadingStatus.textContent = 'Loading character model...';
        model = await fbxLoader.loadAsync('/public/Character_output.fbx');
        model.traverse(obj => { if (obj.isMesh) obj.castShadow = true; });
        scene.add(model);
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.y = -box.min.y;
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / 1.5 / Math.tan(fov / 2));
        cameraZ = Math.max(cameraZ, 3); // Ensure camera is not too close
        camera.position.set(center.x, center.y + 1, center.z + cameraZ);
        controls.target.copy(center);
        controls.update();
        mixer = new THREE.AnimationMixer(model);

        const animationPromises = Object.entries(animationFiles).map(([name, file]) =>
            loadAnimation(fbxLoader, file, name)
        );
        await Promise.all(animationPromises);
        loadingScreen.style.display = 'none';
        createAnimationButtons();
    } catch (error) {
        console.error('Error loading assets:', error);
        loadingStatus.textContent = 'Failed to load 3D assets. Check console.';
    }
}

async function loadAnimation(loader, file, name) {
    try {
        loadingStatus.textContent = `Loading animation: ${name}...`;
        const animFbx = await loader.loadAsync(file);
        if (animFbx.animations && animFbx.animations.length > 0) {
            const clip = animFbx.animations[0];
            animations[name] = mixer.clipAction(clip);
        } else { console.error(`ERROR: No animations found in file ${file}.`); }
    } catch (error) { console.error(`Failed to load animation file ${file}:`, error); }
}

function playAnimation(name) {
    const newAction = animations[name];
    if (!newAction) {
        console.warn(`Animation "${name}" not found.`);
        return;
    }
    if (activeAction === newAction && newAction.isRunning()) { return; }
    if (activeAction) { activeAction.fadeOut(0.3); }
    newAction.reset();
    if (nonLoopingAnimations.includes(name)) {
        newAction.setLoop(THREE.LoopOnce, 1);
        newAction.clampWhenFinished = true;
    } else {
        newAction.setLoop(THREE.LoopRepeat);
    }
    newAction.setEffectiveWeight(1).fadeIn(0.3).play();
    activeAction = newAction;
}

function createAnimationButtons() {
    const container = document.getElementById('animation-buttons');
    Object.keys(animations).forEach(name => {
        const button = document.createElement('button');
        button.textContent = name.replace(/_/g, ' ');
        button.className = 'animation-btn capitalize';
        button.onclick = () => playAnimation(name);
        container.appendChild(button);
    });
    const stopBtn = document.createElement('button');
    stopBtn.textContent = 'Stop / Idle';
    stopBtn.className = 'animation-btn';
    stopBtn.onclick = () => {
        if (mixer && activeAction) {
            activeAction.fadeOut(0.5);
            activeAction = null;
        }
    };
    container.appendChild(stopBtn);
}

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    if (mixer) mixer.update(delta);
    if (controls) controls.update();

    if (targetPosition && model) {
        const distance = model.position.distanceTo(targetPosition);
        if (distance > 0.1) {
            const direction = targetPosition.clone().sub(model.position).normalize();
            model.position.add(direction.multiplyScalar(movementSpeed * delta));
            model.lookAt(model.position.clone().add(direction));
        } else {
            targetPosition = null;
            if(activeAction === animations['walking'] || activeAction === animations['running'] || activeAction === animations['casual_walk']) {
                activeAction.fadeOut(0.3);
                activeAction = null;
            }
        }
    }

    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = viewerContainer.clientWidth / viewerContainer.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(viewerContainer.clientWidth, viewerContainer.clientHeight);
});

// --- SETUP & CHAT LOGIC ---

function initSetupTabs() {
    const mainTabs = document.querySelectorAll('#main-tab-create, #main-tab-load');
    const mainPanels = document.querySelectorAll('#panel-create, #panel-load');

    mainTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            mainTabs.forEach(t => t.classList.remove('active'));
            mainPanels.forEach(p => p.classList.remove('active'));
            tab.classList.add('active');

            const panelId = `panel-${tab.id.split('-')[2]}`;
            document.getElementById(panelId).classList.add('active');

            if (panelId === 'panel-load') {
                loadAvatars();
            }
        });
    });

    const descTabs = document.querySelectorAll('#desc-tab-background, #desc-tab-behavior');
    const descPanels = document.querySelectorAll('#panel-background, #panel-behavior');

    descTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            descTabs.forEach(t => t.classList.remove('active'));
            descPanels.forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            const panelId = `panel-${tab.id.split('-')[2]}`;
            document.getElementById(panelId).classList.add('active');
        });
    });
}

async function loadAvatars() {
    const grid = document.getElementById('avatar-grid');
    const loadingIndicator = document.getElementById('avatar-loading');
    grid.innerHTML = '';
    loadingIndicator.classList.remove('hidden');

    try {
        const response = await fetch('/avatars');
        if (!response.ok) {
            // read text for debugging
            const text = await response.text();
            console.error('GET /avatars failed', response.status, text);
            throw new Error(`Server returned ${response.status}: ${text}`);
        }

        const avatars = await response.json();
        loadingIndicator.classList.add('hidden');

        if (!Array.isArray(avatars) || avatars.length === 0) {
            grid.innerHTML = '<p class="text-gray-400 col-span-full text-center">No saved characters found. Create one from the "Create New" tab!</p>';
            return;
        }

        // dedupe client-side too (safety net)
        const seen = new Set();
        avatars.forEach(avatar => {
            if (!avatar || !avatar.name) return;
            const key = avatar.name.trim().toLowerCase();
            if (seen.has(key)) return;
            seen.add(key);
            const card = document.createElement('div');
            card.className = 'avatar-card';
            card.innerHTML = `
                <h3 class="font-bold text-lg text-teal-400">${escapeHtml(avatar.name)}</h3>
                <p class="text-sm text-gray-300 mt-2">${escapeHtml(avatar.background || '')}</p>
            `;
            card.addEventListener('click', () => handleAvatarLoad(avatar));
            grid.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading avatars:', error);
        loadingIndicator.classList.add('hidden');
        grid.innerHTML = `<p class="text-red-400 col-span-full text-center">Could not load saved characters. See console for details.</p>`;
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
}



function handleAvatarLoad(avatar) {
    document.getElementById('npc-name').value = avatar.name;
    document.getElementById('npc-background').value = avatar.background;
    document.getElementById('npc-behavior').value = avatar.behavior;

    document.getElementById('story-file').value = '';
    document.getElementById('csharp-file').value = '';
    document.getElementById('image-file').value = '';
    document.getElementById('story-file-name').textContent = 'No file selected';
    document.getElementById('csharp-file-name').textContent = 'No file selected';
    document.getElementById('image-file-name').textContent = 'No file selected';

    setupForm.requestSubmit();
}

function initSetupForm() {
    setupForm.addEventListener('submit', handleInitialization);
    document.getElementById('story-file').addEventListener('change', (e) => {
        document.getElementById('story-file-name').textContent = e.target.files[0]?.name || 'No file selected';
    });
    document.getElementById('csharp-file').addEventListener('change', (e) => {
        document.getElementById('csharp-file-name').textContent = e.target.files[0]?.name || 'No file selected';
    });
    document.getElementById('image-file').addEventListener('change', (e) => {
        document.getElementById('image-file-name').textContent = e.target.files[0]?.name || 'No file selected';
    });
    initSetupTabs();
}

async function handleInitialization(event) {
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
                const errorData = await response.json();
                throw new Error(`Failed to upload ${file.name}: ${errorData.detail}`);
            }
            const result = await response.json();
            return result.file_path;
        };

        let storyFilePath = null, csharpFilePath = null, imageFilePath = null;
        if(storyFile || csharpFile || imageFile) {
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
            const errorData = await initResponse.json();
            throw new Error(errorData.detail || 'Failed to initialize.');
        }

        const initResult = await initResponse.json();
        const sessionId = initResult.session_id;

        document.getElementById('character-title').textContent = name;
        setupModal.style.display = 'none';
        initChat(sessionId);

    } catch (error) {
        console.error("Initialization failed:", error);
        setupStatus.textContent = `Error: ${error.message}`;
        startBtn.disabled = false;
        startBtn.textContent = 'Create Character & Start Session';
    }
}

function initChat(sessionId) {
    chatInput.disabled = false;
    sendBtn.disabled = false;
    terminateBtn.disabled = false;
    sttBtn.disabled = false;
    terminateBtn.addEventListener('click', terminateSession);
    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendMessage(); });

    ttsToggleBtn.addEventListener('click', () => {
        isTtsEnabled = !isTtsEnabled;
        if (isTtsEnabled) {
            speakerOnIcon.classList.remove('hidden');
            speakerOffIcon.classList.add('hidden');
            ttsToggleBtn.classList.replace('text-gray-500', 'text-teal-400');
        } else {
            speakerOnIcon.classList.add('hidden');
            speakerOffIcon.classList.remove('hidden');
            ttsToggleBtn.classList.replace('text-teal-400', 'text-gray-500');
            window.speechSynthesis.cancel();
        }
    });

    sttBtn.addEventListener('click', () => {
        if (!isListening && recognition) {
            recognition.start();
        }
    });

    connectWebSocket(sessionId);
}

function terminateSession() {
    if (socket?.readyState === WebSocket.OPEN) { socket.send('_TERMINATE_'); }
    window.speechSynthesis.cancel();
    if (recognition && isListening) { recognition.stop(); }
    chatInput.disabled = true;
    sendBtn.disabled = true;
    terminateBtn.disabled = true;
    sttBtn.disabled = true;
    addMessageToChat('system', 'Session terminated. Reload the page to start a new one.');
}

function connectWebSocket(sessionId) {
    const socketUrl = `ws://${window.location.host}/ws/${sessionId}`;
    socket = new WebSocket(socketUrl);
    socket.onopen = () => { addMessageToChat('system', 'Connected to the AI.'); };
    socket.onmessage = (event) => {
        typingIndicator.style.display = 'none';
        try {
            const data = JSON.parse(event.data);
            handleIncomingMessage(data);
        } catch (e) {
            console.error("Failed to parse incoming message as JSON:", event.data);
            addMessageToChat('bot', event.data);
        }
    };
    socket.onclose = () => { addMessageToChat('system', 'Connection closed.'); terminateBtn.disabled = true; };
    socket.onerror = (error) => { typingIndicator.style.display = 'none'; addMessageToChat('system', 'Could not connect.'); };
}

function sendMessage() {
    const message = chatInput.value.trim();
    if (message && socket?.readyState === WebSocket.OPEN) {
        addMessageToChat('user', message);
        socket.send(message);
        chatInput.value = '';
        typingIndicator.style.display = 'block';
    }
}

function handleIncomingMessage(data) {
    switch(data.type) {
        case 'dialogue':
            if (data.message) {
                addMessageToChat('bot', data.message);
                
                // Always call speak, it will handle the TTS toggle internally.
                speak(data.message); 

                // Play the specific animation from the dialogue message, if one exists and it's not the default.
                if (data.animation && data.animation !== 'talk_passionately') {
                    playAnimation(data.animation);
                }
            }
            break;
        case 'action':
            handleAction(data.command, data.target, data.animation);
            break;
        case 'error':
            addMessageToChat('system', data.message);
            break;
        default:
            console.warn("Received unknown message type:", data);
    }
}

function handleAction(command, target, animation) {
    console.log(`Executing action: ${command} -> ${target} with animation ${animation}`);

    if (command === 'MOVE') {
        const targetCoords = worldData.locations[target];
        if (targetCoords) {
            targetPosition = targetCoords;
            playAnimation(animation || 'walking');
        } else {
            console.warn(`Location not found in worldData: ${target}`);
            addMessageToChat('system', `(System: Tried to move to unknown location '${target}')`);
        }
    } else if (command === 'INTERACT') {
        const objectKey = worldData.interactables[target];
        const object3D = worldObjects[objectKey];
        if (object3D) {
            playAnimation(animation || 'wave_one_hand');
            if (object3D.isLight) {
                object3D.intensity = object3D.intensity > 0 ? 0 : 5;
                const status = object3D.intensity > 0 ? 'on' : 'off';
                addMessageToChat('system', `Toggled the ${target} ${status}.`);
            }
        } else {
            console.warn(`Interactable object not found in worldObjects: ${target}`);
            addMessageToChat('system', `(System: Tried to interact with unknown object '${target}')`);
        }
    }
}

function addMessageToChat(sender, message) {
    const messageWrapper = document.createElement('div');
    const messageBubble = document.createElement('div');
    const messageText = document.createElement('p');
    messageText.className = 'text-sm';
    messageText.textContent = message;

    if (sender === 'user') {
        messageWrapper.className = 'flex justify-end';
        messageBubble.className = 'bg-gray-700 rounded-lg p-3 max-w-xs lg:max-w-md';
    } else if (sender === 'bot') {
        messageWrapper.className = 'flex justify-start';
        messageBubble.className = 'bg-teal-600 rounded-lg p-3 max-w-xs lg:max-w-md';
    } else {
        messageWrapper.className = 'flex justify-center';
        messageBubble.className = 'bg-gray-600 text-xs rounded-full py-1 px-3 text-gray-300';
    }

    // build DOM properly: bubble contains text, wrapper contains bubble
    messageBubble.appendChild(messageText);    // The text goes inside the bubble
    messageWrapper.appendChild(messageBubble);   // The bubble goes inside the wrapper
    chatBox.appendChild(messageWrapper);
}

// --- Start Application ---
initThree();
initSetupForm();
initSpeechSynthesis();
initSpeechRecognition();
