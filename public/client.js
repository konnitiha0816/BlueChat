const socket = io();
const peer = new Peer();
const roomId = "bluechat-v1-room"; // テスト用に部屋IDを固定
let myStream;

// ビデオを表示する場所
const grid = document.getElementById('video-grid');
const myVideo = document.createElement('video');
myVideo.muted = true; // 自分の声はハウリング防止でミュート

// 1. カメラとマイクを取得して開始
navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
    myStream = stream;
    addVideoStream(myVideo, stream);

    // 誰かが入ってきたら応答する
    peer.on('call', call => {
        call.answer(stream);
        const video = document.createElement('video');
        call.on('stream', userStream => addVideoStream(video, userStream));
    });

    // 自分がサーバーに接続したとき
    socket.on('user-connected', userId => {
        connectToNewUser(userId, stream);
    });
});

// PeerJSの準備ができたら入室
peer.on('open', id => {
    socket.emit('join-room', roomId, id);
});

// 新しい人が来た時の処理
function connectToNewUser(userId, stream) {
    const call = peer.call(userId, stream);
    const video = document.createElement('video');
    call.on('stream', userStream => addVideoStream(video, userStream));
}

function addVideoStream(video, stream) {
    video.srcObject = stream;
    video.addEventListener('loadedmetadata', () => video.play());
    grid.append(video);
}

// ==========================================
// ★ ここから追加機能のプログラム
// ==========================================

// ① マイク切り替え
function toggleMic() {
    // 音声トラック（マイク）の有効/無効を反転させる
    const audioTrack = myStream.getAudioTracks()[0];
    if (audioTrack.enabled) {
        audioTrack.enabled = false; // ミュートにする
        setBtnState('btn-mic', false, 'マイク OFF');
    } else {
        audioTrack.enabled = true;  // ミュート解除
        setBtnState('btn-mic', true, 'マイク ON');
    }
}

// ② カメラ切り替え
function toggleCam() {
    // 映像トラック（カメラ）の有効/無効を反転させる
    const videoTrack = myStream.getVideoTracks()[0];
    if (videoTrack.enabled) {
        videoTrack.enabled = false; // 真っ暗にする
        setBtnState('btn-cam', false, 'カメラ OFF');
    } else {
        videoTrack.enabled = true;  // 映す
        setBtnState('btn-cam', true, 'カメラ ON');
    }
}

// ボタンの色と文字を変える便利関数
function setBtnState(id, isOn, text) {
    const btn = document.getElementById(id);
    btn.innerText = text;
    if (isOn) {
        btn.className = 'btn-on'; // 灰色
    } else {
        btn.className = 'btn-off'; // 赤色
    }
}

// ③ チャット機能
function sendMessage() {
    const input = document.getElementById('msg-input');
    const msg = input.value;
    if (msg) {
        socket.emit('send-message', { roomId: roomId, text: msg });
        input.value = ""; // 入力欄を空にする
    }
}

// チャットを受け取って表示
socket.on('receive-message', (msg) => {
    const div = document.createElement('div');
    div.className = 'message';
    div.innerText = msg;
    document.getElementById('chat-window').appendChild(div);
    // 自動で一番下までスクロール
    const window = document.getElementById('chat-window');
    window.scrollTop = window.scrollHeight;
});
