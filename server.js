const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const roomHosts = {};
const userNames = {};

io.on('connection', (socket) => {
    // 1. 入室リクエスト
    socket.on('request-join', (payload) => {
        const { room, name } = payload;
        userNames[socket.id] = name;

        if (!roomHosts[room]) {
            roomHosts[room] = socket.id;
            socket.emit('approve-entry', { isHost: true });
        } else {
            const hostId = roomHosts[room];
            if (hostId) {
                io.to(hostId).emit('join-request', { 
                    senderId: socket.id, 
                    userName: name 
                });
            } else {
                socket.emit('approve-entry', { isHost: false });
            }
        }
    });

    // 2. 承認処理
    socket.on('approve-user', (data) => {
        io.to(data.targetId).emit('approve-entry', { isHost: false });
    });

    // 3. 正式入室
    socket.on('join-room-official', (room) => {
        socket.join(room);
        socket.to(room).emit('user-connected', socket.id);
    });

    // 4. 通信中継
    socket.on('signal', (payload) => {
        io.to(payload.to).emit('signal', { 
            from: socket.id, 
            data: payload.data 
        });
    });

    // 5. 管理機能
    socket.on('admin-action', (payload) => {
        if (roomHosts[payload.room] === socket.id) {
            socket.to(payload.room).emit('force-action', payload.action);
        }
    });

    // 6. 切断
    socket.on('disconnect', () => {
        for (const room in roomHosts) {
            if (roomHosts[room] === socket.id) {
                delete roomHosts[room];
            }
        }
        delete userNames[socket.id];
        socket.broadcast.emit('user-disconnected', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log('Server running');
});
