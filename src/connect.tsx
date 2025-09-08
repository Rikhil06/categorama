import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc, onSnapshot, arrayUnion } from "firebase/firestore";
import { db } from "../firebase";
import { customAlphabet } from "nanoid";

type Player = {
  id: string;
  name: string;
  answers: string[];
};

type Session = {
  pin: string;
  status: "lobby" | "playing" | "finished"; // include all possible states
  letter: string;
  players: Player[];
};

const generateUniqueId = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 20);

export default function Connect() {
  const [pin, setPin] = useState("");
  const [name, setName] = useState("");
  const [joined, setJoined] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [answers, setAnswers] = useState<string[]>(Array(12).fill(""));

  const isFinished = session?.status === "finished";

  // Join a session
  const handleJoin = async () => {
    const sessionRef = doc(db, "sessions", pin);
    const snap = await getDoc(sessionRef);
    if (!snap.exists()) return alert("Session not found!");
    
    await updateDoc(sessionRef, {
      players: arrayUnion({ id: generateUniqueId(), name, answers: Array(12).fill("") })
    });
    setJoined(true);
  };

  // Listen for session updates
  useEffect(() => {
    if (!pin || !joined) return;
    const sessionRef = doc(db, "sessions", pin);

    const unsubscribe = onSnapshot(sessionRef, (docSnap) => {
      const data = docSnap.data() as Session;
      setSession(data);

      // Disable inputs if game finished
      if (data.status === "finished") setAnswers(prev => [...prev]);
    });

    return () => unsubscribe();
  }, [pin, joined]);

  // Handle typing in answer fields
    const handleChange = async (index: number, value: string) => {
    if (!session || session.status !== "playing") return;

    // Update local state
    setAnswers(prev => {
        const newAnswers = [...prev];
        newAnswers[index] = value;
        return newAnswers;
    });

    // Update Firestore
    const sessionRef = doc(db, "sessions", pin);

    // Find the player's ID in session
    const playerId = session.players.find(p => p.name === name)?.id;
    if (!playerId) return;

    const updatedPlayers = session.players.map(p => 
        p.id === playerId ? { ...p, answers: index < answers.length ? [...answers.slice(0, index), value, ...answers.slice(index + 1)] : [...answers] } : p
    );

    await updateDoc(sessionRef, { players: updatedPlayers });
    };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-black text-white">
      {!joined ? (
        <div className="flex flex-col gap-4 w-full max-w-sm">
          <h2 className="text-2xl font-semibold text-center">Join a Categorama Game</h2>
          <input
            className="p-3 rounded text-black"
            placeholder="Enter Game PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
          />
          <input
            className="p-3 rounded text-black"
            placeholder="Enter Your Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button
            className="bg-white text-black py-3 rounded font-semibold"
            onClick={handleJoin}
          >
            Join Game
          </button>
        </div>
      ) : (
        <div className="w-full max-w-lg flex flex-col items-center gap-4">
          <h2 className="text-xl font-semibold">Waiting for host to start...</h2>
          {session && session.status === "playing" && (
            <>
              <h3 className="text-4xl font-bold my-4">Letter: {session.letter}</h3>
              <div className="grid grid-cols-1 gap-3 w-full">
                {answers.map((answer, i) => (
                  <input
                    key={i}
                    type="text"
                    placeholder={`Answer ${i + 1}`}
                    value={answer}
                    onChange={(e) => handleChange(i, e.target.value)}
                    disabled={session.status === "finished"}
                    className="p-3 rounded text-black w-full"
                  />
                ))}
              </div>
               {isFinished && (
                    <p className="mt-4 text-red-400 font-semibold">
                        Time's up! Answers are locked.
                    </p>
                )}
            </>
          )}
        </div>
      )}
    </div>
  );
}