const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

io.on('connection', (socket) => {
    // ユーザーが接続したとき
    socket.on('join-room', (roomId, peerId) => {
        socket.join(roomId);
        socket.to(roomId).emit('user-connected', peerId);

        // 切断したとき
        socket.on('disconnect', () => {
            socket.to(roomId).emit('user-disconnected', peerId);
        });
    });

    // ★ 追加機能: コメントの送受信
    socket.on('send-message', (data) => {
        // 同じ部屋にいる全員（自分含む）にメッセージを送る
        io.to(data.roomId).emit('receive-message', data.text);
    });
});

server.listen(process.env.PORT || 3000);
