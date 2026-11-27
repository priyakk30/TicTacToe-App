
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
const httpServer = createServer(app);

app.use(cors());

const io = new Server(httpServer, {
  cors: {
    origin: [
        "http://localhost:5173",
        process.env.CLIENT_URL
    ].filter(Boolean),
    methods: ["GET", "POST"]
  }
});

const rooms = new Map();

function calculateWinner(squares) {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
  ];

  for (const [a, b, c] of lines) {
    if (
      squares[a] &&
      squares[a] === squares[b] &&
      squares[a] === squares[c]
    ) {
      return squares[a];
    }
  }

  return null;
}

function getGameState(room) {
  return {
    roomCode: room.code,
    squares: room.squares,
    nextPlayer: room.nextPlayer,
    winner: calculateWinner(room.squares),
    isDraw:
      !calculateWinner(room.squares) &&
      room.squares.every(Boolean),
    players: {
      X: !!room.players.X,
      O: !!room.players.O
    }
  };
}

function broadcastRoom(room) {
  io.to(room.code).emit("game-update", getGameState(room));
}

io.on("connection", (socket) => {
  console.log("Player connected:", socket.id);

  // Create a new room
  socket.on("create-room", (callback) => {
    let code;

    do {
      code = Math.random().toString(36).substring(2, 8).toUpperCase();
    } while (rooms.has(code));

    const room = {
      code,
      squares: Array(9).fill(null),
      nextPlayer: "X",
      players: {
        X: socket.id,
        O: null
      }
    };

    rooms.set(code, room);
    socket.join(code);
    socket.data.roomCode = code;
    socket.data.player = "X";

    callback?.({
      success: true,
      player: "X",
      roomCode: code
    });

    broadcastRoom(room);
  });

  // Join an existing room
  socket.on("join-room", (code, callback) => {
    const roomCode = String(code).trim().toUpperCase();
    const room = rooms.get(roomCode);

    if (!room) {
      return callback?.({
        success: false,
        message: "Room not found"
      });
    }

    if (room.players.O) {
      return callback?.({
        success: false,
        message: "Room is full"
      });
    }

    room.players.O = socket.id;

    socket.join(roomCode);
    socket.data.roomCode = roomCode;
    socket.data.player = "O";

    callback?.({
      success: true,
      player: "O",
      roomCode
    });

    broadcastRoom(room);
  });

  // Make a move
  socket.on("make-move", (index, callback) => {
    const room = rooms.get(socket.data.roomCode);
    const player = socket.data.player;

    if (!room) {
      return callback?.({ success: false, message: "Room not found" });
    }

    if (!Number.isInteger(index) || index < 0 || index > 8) {
      return callback?.({ success: false, message: "Invalid position" });
    }

    if (!player || room.players[player] !== socket.id) {
      return callback?.({ success: false, message: "Not a player" });
    }

    if (room.nextPlayer !== player) {
      return callback?.({ success: false, message: "Not your turn" });
    }

    if (room.squares[index] || calculateWinner(room.squares) ||
        room.squares.every(Boolean)) {
      return callback?.({ success: false, message: "Invalid move" });
    }

    room.squares[index] = player;

    room.nextPlayer = player === "X" ? "O" : "X";

    callback?.({ success: true });
    broadcastRoom(room);
  });

  // Reset game
  socket.on("reset-game", (callback) => {
    const room = rooms.get(socket.data.roomCode);
    const player = socket.data.player;

    if (!room || !player || room.players[player] !== socket.id) {
      return callback?.({ success: false, message: "Not authorized" });
    }

    if (!room.players.X || !room.players.O) {
      return callback?.({
        success: false,
        message: "Both players must be connected"
      });
    }

    room.squares = Array(9).fill(null);
    room.nextPlayer = "X";

    callback?.({ success: true });
    broadcastRoom(room);
  });

  // Disconnect handling
  socket.on("disconnect", () => {
    const roomCode = socket.data.roomCode;
    const player = socket.data.player;

    if (!roomCode || !player) return;

    const room = rooms.get(roomCode);
    if (!room || room.players[player] !== socket.id) return;

    room.players[player] = null;

    io.to(roomCode).emit("player-left", {
      player,
      message: `Player ${player} disconnected`
    });

    if (!room.players.X && !room.players.O) {
      rooms.delete(roomCode);
    }
  });
});

app.get("/", (req, res) => {
  res.send("Tic Tac Toe server is running!");
});

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
