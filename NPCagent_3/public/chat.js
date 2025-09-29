import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, clock, mixer, model, controls;
const animations = {};
let activeAction;
let socket;
let voices = [];
let isTtsEnabled = true;

const viewerContainer = document.getElementById('viewer-container');
const loadingScreen = document.getElementById('loading-screen');
const loadingStatus = document.getElementById('loading-status');
const chatBox = document.getElementById('chat-box');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const terminateBtn = document.getElementById('terminate-btn');
const typingIndicator = document.getElementById('typing-indicator');
const ttsToggleBtn = document.getElementById('tts-toggle-btn');
const speakerOnIcon = document.getElementById('speaker-on-icon');
const speakerOffIcon = document.getElementById('speaker-off-icon');

const params = new URLSearchParams(window.location.search);
const sessionId = params.get('session_id');
const characterName = params.get('name') || 'AI Companion';
const titleEl = document.getElementById('character-title');
titleEl.textContent = characterName;

if (!sessionId) {
    const msg = document.createElement('div');
    msg.className = 'p-4 text-center text-red-300';
    msg.textContent = 'Missing session_id. Please create a character first.';
    document.body.prepend(msg);
}

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

function initSpeechSynthesis() {
    voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) {
        window.speechSynthesis.onvoiceschanged = () => { voices = window.speechSynthesis.getVoices(); };
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
        const activeAnimationName = activeAction ? Object.keys(animations).find(key => animations[key] === activeAction) : null;
        if (activeAnimationName === 'talk_passionately' || nonLoopingAnimations.includes(activeAnimationName)) {
            if (activeAction) { activeAction.fadeOut(0.3); }
            activeAction = null;
        }
    };
    window.speechSynthesis.speak(utterance);
}

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
        cameraZ = Math.max(cameraZ, 3);
        camera.position.set(center.x, center.y + 1, center.z + cameraZ);
        controls.target.copy(center);
        controls.update();
        mixer = new THREE.AnimationMixer(model);
        const animationPromises = Object.entries(animationFiles).map(([name, file]) => loadAnimation(fbxLoader, file, name));
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
    if (!newAction) { console.warn(`Animation "${name}" not found.`); return; }
    if (activeAction === newAction && newAction.isRunning()) { return; }
    if (activeAction) { activeAction.fadeOut(0.3); }
    newAction.reset();
    if (nonLoopingAnimations.includes(name)) {
        newAction.setLoop(THREE.LoopOnce, 1);
        newAction.clampWhenFinished = true;
    } else { newAction.setLoop(THREE.LoopRepeat); }
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
    stopBtn.onclick = () => { if (mixer && activeAction) { activeAction.fadeOut(0.5); activeAction = null; } };
    container.appendChild(stopBtn);
}

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    if (mixer) mixer.update(delta);
    if (controls) controls.update();
    renderer.render(scene, camera);
}

function connectWebSocket() {
    if (!sessionId) return;
    const socketUrl = `ws://${window.location.host}/ws/${sessionId}`;
    socket = new WebSocket(socketUrl);
    socket.onopen = () => { addMessageToChat('system', 'Connected to the AI.'); };
    socket.onmessage = (event) => {
        typingIndicator.style.display = 'none';
        try { const data = JSON.parse(event.data); handleIncomingMessage(data); }
        catch (e) { console.error('Failed to parse incoming message as JSON:', event.data); addMessageToChat('bot', event.data); }
    };
    socket.onclose = () => { addMessageToChat('system', 'Connection closed.'); terminateBtn.disabled = true; };
    socket.onerror = () => { typingIndicator.style.display = 'none'; addMessageToChat('system', 'Could not connect.'); };
}

function initChatUI() {
    chatInput.disabled = false;
    sendBtn.disabled = false;
    terminateBtn.disabled = false;
    terminateBtn.addEventListener('click', () => {
        if (socket?.readyState === WebSocket.OPEN) { socket.send('_TERMINATE_'); }
        window.speechSynthesis.cancel();
        chatInput.disabled = true;
        sendBtn.disabled = true;
        terminateBtn.disabled = true;
        addMessageToChat('system', 'Session terminated. Return to the form to start a new one.');
    });
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
                speak(data.message);
                if (data.animation && data.animation !== 'talk_passionately') { playAnimation(data.animation); }
            }
            break;
        case 'error':
            addMessageToChat('system', data.message);
            break;
        default:
            console.warn('Unknown message type:', data);
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
        messageBubble.className = 'bubble-user';
    } else if (sender === 'bot') {
        messageWrapper.className = 'flex justify-start';
        messageBubble.className = 'bubble-bot';
    } else {
        messageWrapper.className = 'flex justify-center';
        messageBubble.className = 'bubble-system text-xs';
    }
    messageBubble.appendChild(messageText);
    messageWrapper.appendChild(messageBubble);
    chatBox.appendChild(messageWrapper);
}

initThree();
initSpeechSynthesis();
initChatUI();
connectWebSocket();

window.addEventListener('resize', () => {
    camera.aspect = viewerContainer.clientWidth / viewerContainer.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(viewerContainer.clientWidth, viewerContainer.clientHeight);
});


