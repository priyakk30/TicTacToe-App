import { useState } from "react";
import "./App.css";

 function App() {
    const [squares, setSquares] = useState(Array(9).fill(null));
    const [nextPlayer, setNextPlayer] = useState("X");
    const winner = calculateWinner(squares);
    const isDraw = !winner && squares.every(Boolean);
    function handleClick(index){
        if(squares[index] || winner || isDraw){
            return;
        }

        const nextSquares = [...squares];
        nextSquares[index] = nextPlayer;
        setSquares(nextSquares);
        setNextPlayer(nextPlayer === "X" ? "O" : "X")
    }
    function resetGame(){
        setSquares(Array(9).fill(null));
        setNextPlayer("X")
    }
  return(
    <div>
        <h1 style={{display: "flex", justifyContent: "center",}}>Tic Tac Toe</h1>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 100px)",gridTemplateRows: "repeat(3, 100px)",}}>
            {squares.map((square, index) => (
                <button key={index} className="square" onClick={() => handleClick(index)}>{square}</button>
            ))}
        </div>
        {winner && <p>Winner: {winner}</p>}
        {isDraw && <p>Draw</p>}
        <button id="reset" onClick={resetGame} style={{display: "flex", justifyContent: "center", padding: "10px", margin: "10px", alignItems: "center",}}>Reset Game</button>
    </div>
  )
  function calculateWinner(squares){
    const lines = [
        [0,1,2],
        [3,4,5],
        [6,7,8],
        [0,3,6],
        [1,4,7],
        [2,5,8],
        [0,4,8],
        [2,4,6],
    ]
    for(const [a,b,c] of lines){
        if(squares[a] && squares[a] === squares[b] && squares[a] === squares[c]){
            return squares[a];
        }
    }
        return null;

  }
}
export default App;