const socket = io();
let localStream;
let currentRoom = "";
const peers = {}; 
const rtcConfig = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

function checkAuth() {
    const id = document.getElementById('login-id').value;
    const pw = document.getElementById('login-pw').value;
    if(id === "tuuwa" && pw === "room") {
        document.getElementById('step-login').classList.add('hidden');
        document.getElementById('step-room').classList.remove('hidden');
    } else {
        alert("IDかパスワードが違います");
    }
}

async function goToSetup() {
    const rid = document.getElementById('room-id').value;
    if(rid.length < 6) return alert("6文字以上で入力してください");
    currentRoom = rid;
    
    document.getElementById('step-room').classList.add('hidden');
    document.getElementById('step-setup').classList.remove('hidden');
    
    localStream = await navigator.mediaDevices.getUserMedia({video:true, audio:true});
    document.getElementById('localVideo').srcObject = localStream;
}

function sendRequest() {
    const name = document.getElementById('user-name').value || "名無し";
    document.getElementById('btn-req').classList.add('hidden');
    document.getElementById('wait-msg').classList.remove('hidden');
    socket.emit('request-join', { room: currentRoom, name: name });
}

socket.on('approve-entry', (data) => {
    document.getElementById('step-setup').classList.add('hidden');
    document.getElementById('step-call').classList.remove('hidden');
    document.getElementById('room-display').innerText = "Room: " + currentRoom;
    if(data.isHost) document.getElementById('admin-panel').classList.remove('hidden');
    socket.emit('join-room-official', currentRoom);
});

socket.on('join-request', (data) => {
    const div = document.createElement('div');
    div.innerHTML = `${data.userName} <button onclick="socket.emit('approve-user', {targetId:'${data.senderId}'}); this.parentElement.remove()">承認</button>`;
    document.getElementById('req-list').appendChild(div);
});

socket.on('user-connected', (id) => connectToNewUser(id));

socket.on('signal', async (p) => {
    if(!peers[p.from]) createPeer(p.from);
    const pc = peers[p.from];
    if(p.data.sdp) {
        await pc.setRemoteDescription(new RTCSessionDescription(p.data.sdp));
        if(p.data.sdp.type === 'offer') {
            const ans = await pc.createAnswer();
            await pc.setLocalDescription(ans);
            socket.emit('signal', {to: p.from, data: {sdp: pc.localDescription}});
        }
    } else if(p.data.ice) {
        await pc.addIceCandidate(new RTCIceCandidate(p.data.ice));
    }
});

function createPeer(id) {
    const pc = new RTCPeerConnection(rtcConfig);
    peers[id] = pc;
    localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
    pc.ontrack = e => {
        if(!document.getElementById(id)) {
            const v = document.createElement('video');
            v.id = id; v.autoplay = true; v.playsInline = true;
            v.srcObject = e.streams[0];
            document.getElementById('video-grid').appendChild(v);
        }
    };
    pc.onicecandidate = e => {
        if(e.candidate) socket.emit('signal', {to: id, data: {ice: e.candidate}});
    };
    return pc;
}

function connectToNewUser(id) {
    const pc = createPeer(id);
    pc.createOffer().then(o => {
        pc.setLocalDescription(o);
        socket.emit('signal', {to: id, data: {sdp: o}});
    });
}

socket.on('user-disconnected', id => {
    if(peers[id]) peers[id].close();
    delete peers[id];
    document.getElementById(id)?.remove();
});
