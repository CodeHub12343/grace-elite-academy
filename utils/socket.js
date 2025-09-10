let ioInstance = null;

function setIO(io) {
  ioInstance = io;
}

function emitToUser(userId, event, payload) {
  if (!ioInstance) return;
  ioInstance.to(String(userId)).emit(event, payload);
}

function registerConnection(io) {
  io.on('connection', (socket) => {
    const userId = socket.handshake.auth?.userId || socket.handshake.query?.userId;
    if (userId) socket.join(String(userId));
  });
}

module.exports = { setIO, emitToUser, registerConnection };



