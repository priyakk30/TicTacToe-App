
import { useState, useEffect } from "react";
import { io } from "socket.io-client";
import "./App.css";

const socket = io("http://localhost:5000", {
  autoConnect: false
});

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

function App() {
  const [squares, setSquares] = useState(Array(9).fill(null));
  const [nextPlayer, setNextPlayer] = useState("X");
  const [mode, setMode] = useState("computer");

  const [roomCode, setRoomCode] = useState("");
  const [inputCode, setInputCode] = useState("");
  const [myPlayer, setMyPlayer] = useState(null);
  const [onlineReady, setOnlineReady] = useState(false);
  const [message, setMessage] = useState("");

  const winner = calculateWinner(squares);
  const isDraw = !winner && squares.every(Boolean);

  useEffect(() => {
    function handleGameUpdate(game) {
      setSquares(game.squares);
      setNextPlayer(game.nextPlayer);
      setRoomCode(game.roomCode);
      setOnlineReady(game.players.X && game.players.O);
    }

    function handlePlayerLeft(data) {
      setOnlineReady(false);
      setMessage(data.message);
    }

    socket.on("game-update", handleGameUpdate);
    socket.on("player-left", handlePlayerLeft);

    return () => {
      socket.off("game-update", handleGameUpdate);
      socket.off("player-left", handlePlayerLeft);
    };
  }, []);

  function connectOnline() {
    if (!socket.connected) {
      socket.connect();
    }
  }

  function createRoom() {
    setMessage("Creating room...");
    connectOnline();

    socket.emit("create-room", (response) => {
      if (!response.success) {
        setMessage(response.message);
        return;
      }

      setMode("online");
      setMyPlayer(response.player);
      setRoomCode(response.roomCode);
      setSquares(Array(9).fill(null));
      setNextPlayer("X");
      setMessage("Share this room code with your friend!");
    });
  }

  function joinRoom() {
    if (!inputCode.trim()) {
      setMessage("Please enter a room code");
      return;
    }

    setMessage("Joining room...");
    connectOnline();

    socket.emit(
      "join-room",
      inputCode.trim(),
      (response) => {
        if (!response.success) {
          setMessage(response.message);
          return;
        }

        setMode("online");
        setMyPlayer(response.player);
        setRoomCode(response.roomCode);
        setMessage("Successfully joined the room!");
      }
    );
  }

  function computerMove(board) {
    const empty = board
      .map((value, index) => value === null ? index : null)
      .filter(value => value !== null);

    if (empty.length === 0) return board;

    const move = empty[Math.floor(Math.random() * empty.length)];
    const updated = [...board];
    updated[move] = "O";

    return updated;
  }

  function handleClick(index) {
    if (squares[index] || winner || isDraw) return;

    if (mode === "online") {
      if (!onlineReady || nextPlayer !== myPlayer) return;

      socket.emit("make-move", index, (response) => {
        if (!response.success) {
          setMessage(response.message);
        }
      });

      return;
    }

    if (mode === "computer" && nextPlayer !== "X") return;

    const updated = [...squares];
    updated[index] = nextPlayer;

    setSquares(updated);

    if (calculateWinner(updated) || updated.every(Boolean)) return;

    if (mode === "local") {
      setNextPlayer(nextPlayer === "X" ? "O" : "X");
      return;
    }

    setNextPlayer("O");

    setTimeout(() => {
      setSquares((current) => {
        if (calculateWinner(current) || current.every(Boolean)) {
          return current;
        }

        const next = computerMove(current);
        return next;
      });

      setNextPlayer("X");
    }, 500);
  }

  function resetGame() {
    if (mode === "online") {
      socket.emit("reset-game", (response) => {
        if (!response.success) {
          setMessage(response.message);
        }
      });
      return;
    }

    setSquares(Array(9).fill(null));
    setNextPlayer("X");
  }

  function changeMode(newMode) {
    if (mode === "online") {
      socket.disconnect();
      setRoomCode("");
      setMyPlayer(null);
      setOnlineReady(false);
    }

    setMode(newMode);
    setSquares(Array(9).fill(null));
    setNextPlayer("X");
    setMessage("");
  }

  return (
    <div className="game">
      <h1>Tic Tac Toe</h1>

      <div className="modes">
        <button onClick={() => changeMode("computer")}>
          Computer
        </button>

        <button onClick={() => changeMode("local")}>
          Two Players
        </button>

        <button onClick={() => changeMode("online")}>
          Online
        </button>
      </div>

      {mode === "online" && !myPlayer && (
        <div className="online-panel">
          <h2>Online Multiplayer</h2>

          <button onClick={createRoom}>
            Create Room
          </button>

          <p>OR</p>

          <input
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value)}
            placeholder="Enter Room Code"
          />

          <button onClick={joinRoom}>
            Join Room
          </button>
        </div>
      )}

      {mode === "online" && myPlayer && (
        <div className="room-info">
          <h3>Room Code: {roomCode}</h3>
          <button
            onClick={() => navigator.clipboard.writeText(roomCode)}
          >
            Copy Code
          </button>

          <p>You are Player {myPlayer}</p>

          {!onlineReady && (
            <p>Waiting for the other player...</p>
          )}
        </div>
      )}

      <h2>
        {winner
          ? `Winner: ${winner}`
          : isDraw
          ? "It's a Draw!"
          : mode === "online"
          ? !onlineReady
            ? "Waiting for players..."
            : nextPlayer === myPlayer
            ? `Your Turn (${myPlayer})`
            : `Player ${nextPlayer}'s Turn`
          : mode === "computer"
          ? nextPlayer === "X"
            ? "Your Turn (X)"
            : "Computer's Turn (O)"
          : `Player ${nextPlayer}'s Turn`}
      </h2>

      {message && <p>{message}</p>}

      <div className="board">
        {squares.map((square, index) => (
          <button
            key={index}
            className="square"
            onClick={() => handleClick(index)}
            disabled={
              !!square ||
              !!winner ||
              isDraw ||
              (mode === "online" &&
                (!onlineReady || nextPlayer !== myPlayer))
            }
          >
            {square}
          </button>
        ))}
      </div>

      <button className="reset" onClick={resetGame}>
        Reset Game
      </button>
    </div>
  );
}

export default App;
