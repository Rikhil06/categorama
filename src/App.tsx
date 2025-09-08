import { useEffect, useState } from 'react'
import './App.css';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { AnimatePresence } from "motion/react"
import * as motion from "motion/react-client"
import { customAlphabet } from 'nanoid';
import { Helmet } from 'react-helmet-async';

type Category = {
  id: string;
  Category: string;
};

type Player = {
  id: string;
  name: string;
  answers: string[];
};

type Session = {
  pin: string;
  status: 'lobby' | 'playing' | 'finished';
  letter: string;
  players: Player[];
  time: number;
};

function createRandomString(length: number) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const querySnapshot = doc(db, 'Categories', '2Zvpb8RnzE3KG0QlF8XT');
const querySnapshotSnap = await getDoc(querySnapshot);
const querySnapshotCategories = querySnapshotSnap.exists() ? querySnapshotSnap.data().categories :  console.log('No such document!');

const generateUniqueId = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 20);
const generateUniqueLinkId =  customAlphabet('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 7);


function App() {

  const [character, setCharacter] = useState(createRandomString(1))
  const [changeTime, setChangeTime] = useState(false);
  const [time, setTime] = useState(120);
  const [timeInterval, setTimeInterval] = useState<NodeJS.Timeout | null>(null);
  const [gameState, setGameState] = useState('paused');
  const [restart, setRestart] = useState(false);
  const [categories, setCategories] = useState(querySnapshotCategories);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [showAddNewCategory, setShowAddNewCategory] = useState(false);
  const [categoryStatusChanged, setCategoryStatusChanged] = useState(false);
  const [numberOfCategories, setNumberOfCategories] = useState(12);
  const [hideLandingAnimation, setHideLandingAnimation] = useState(false);
  const [sessionPin, setSessionPin] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [finishedClass, setFinishedClass] = useState('');

  const isInLobby = session?.status === "lobby";

  const shuffle = (arr: number[]): number[] => [...arr].sort(() => Math.random() - 0.5);

    // Assume you're extracting the unique ID from the URL
  useEffect(() => {
    const uniqueIdFromUrl = window.location.hash.slice(1); // Extract the ID from the URL (e.g., #someUniqueId)
  
    const fetchCategories = async () => {
      if (uniqueIdFromUrl) {
        try {
          const docRef = doc(db, 'UpdatedCategories', uniqueIdFromUrl);
          const docSnap = await getDoc(docRef);
  
          if (docSnap.exists()) {
            const savedCategories = docSnap.data().categories;
            setCategories(shuffle(savedCategories)); // Shuffle the fetched categories
          } else {
            console.log('No such document!');
          }
        } catch (error) {
          console.error('Error fetching the categories:', error);
        }
      } else {
        setCategories(shuffle(categories)); // Shuffle the default categories on load
      }
    };
  
    fetchCategories();
  
    setTimeout(() => {
      setHideLandingAnimation(true);
    }, 3500);
  }, [window.location.hash]); // Re-run whenever the hash changes
  
      // --- Multiplayer: Create a session ---
  const createSession = async () => {
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    setSessionPin(pin);
    const sessionRef = doc(db, "sessions", pin);
    await setDoc(sessionRef, {
      pin,
      status: 'lobby',
      letter: character,
      players: [],
      time: time,
    });
  };

    useEffect(() => {
    if (!sessionPin) return;
    const sessionRef = doc(db, "sessions", sessionPin);
    const unsubscribe = onSnapshot(sessionRef, (docSnap) => {
      const sessionData = docSnap.data() as Session;
      setSession(sessionData);
      if (!sessionData) return;
      setPlayers(sessionData.players);
      setCharacter(sessionData.letter);
      setGameState(sessionData.status === 'playing' ? 'playing' : 'paused');
      setTime(sessionData.time);
      if (sessionData.status === 'finished') {
        pauseTimer();
      }
    });
    return () => unsubscribe();
  }, [sessionPin]);

  const updateTime = (e: React.FormEvent) => {
    e.preventDefault();
    const target = e.target as HTMLFormElement;
    const inputElement = target[0] as HTMLInputElement;
    const timeValue = Number(inputElement.value);
    
    if (!isNaN(timeValue)) {
      setTime(timeValue);
    } else {
      console.error("Invalid input: Please enter a valid number.");
    }
    setChangeTime(false);
  };
  
   
  const startTimer = async () => {
    if (!sessionPin) {
      alert('Create a session first!');
      return;
    }
    if (gameState === 'paused') {
      await updateDoc(doc(db, "sessions", sessionPin), { status: 'playing', letter: character, time: time });
      const interval = setInterval(() => {
        setTime((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setGameState('paused');
            setTime(0);
            updateDoc(doc(db, "sessions", sessionPin), { status: 'finished' });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      setTimeInterval(interval);
      setGameState('playing');
    } else {
      pauseTimer();
    }
  };

  const pauseTimer = () => {
    if (timeInterval) clearInterval(timeInterval);
    setGameState('paused');
  };

  

  const resetTimer = () => {
    if (timeInterval) clearInterval(timeInterval);
    setGameState('paused');
    setRestart(true);
    setTimeout(() => { setTime(120); setCharacter(createRandomString(1)); setRestart(false); setCategories(shuffle(categories))} ,1000);
  }

  const handleRemove = (id: string) =>{
    const removeCategories = categories.filter((category: Category) => category.id !== id);
    setCategories(removeCategories);
    setCategoryStatusChanged(true);
  }

  const addNewCategory = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const newCategoryValue = (e.currentTarget[0] as HTMLInputElement).value.trim(); // Get and trim input value
    console.log(newCategoryValue);
    if (newCategoryValue) {
      setCategories([
        { id: generateUniqueId(), Category: newCategoryValue  }, // New category at the front
        ...categories, // Existing categories
      ]);
      (e.currentTarget[0] as HTMLInputElement).value = ''; // Clear the input field
      setCategoryStatusChanged(true);
    }
  };

  const saveUpdatedList = async () => {
    // 1. Generate a unquie 7 digit id 
    const uniqueId = generateUniqueLinkId();

     // Step 2: Prepare the categories data to save
    const categoriesToSave = categories.map((category: Category) => ({
      id: category.id, Category: category.Category
    }));


    // Step 2: Save the updated list to Firebase
    try {
      const newDocRef = doc(db, 'UpdatedCategories', uniqueId); // Create a new collection in Firestore

      // Step 3: Add the updated list to the Firestore collection
      await setDoc(newDocRef, {
        categories: categoriesToSave,
      });

      // Step 4: Update the URL with the unique ID
      const urlWithUniqueID = `/#${uniqueId}`;
      window.history.pushState({}, "", urlWithUniqueID);
      setCategoryStatusChanged(true);

      // Optionally, you can store the uniqueId in the state for later use
      console.log(`New list saved with ID: ${uniqueId}`);
    } catch (error) {
      console.error('Error saving the list:', error);
      setCategoryStatusChanged(false);
    }
  };

  const startGameForPlayers = async () => {
  if (!sessionPin) return;

  if(!players || players.length === 0){
    alert("You need at least 1 player to start the game!");
    return;
  }

  const sessionRef = doc(db, "sessions", sessionPin);

  // Reset timer
  setTime(time);
  setCharacter(createRandomString(1));

  await updateDoc(sessionRef, {
    status: "playing",
    letter: character,
    time: time
  });

    // Start local timer on host
  const interval = setInterval(() => {
    setTime(prev => {
      if (prev <= 1) {
        clearInterval(interval);
        setGameState("paused");
        setTime(0);
        updateDoc(sessionRef, { status: "finished", time: 0 });
        return 0;
      }
      updateDoc(sessionRef, { time: prev - 1 });
      return prev - 1;
    });
  }, 1000);
  setTimeInterval(interval);
  setGameState("playing");
};

useEffect(() => {
  let timeout: NodeJS.Timeout;
  if (session?.status === 'finished') {
    timeout = setTimeout(() => {
      setFinishedClass('game-finished');
    }, 2000); // 2 seconds
  } else {
    setFinishedClass('');
  }

  return () => clearTimeout(timeout); // cleanup if status changes before 2s
}, [session?.status]);

  return (
    <>
    
      <Helmet>
        <link rel="canonical" href={window.location.origin + '/'} />
      </Helmet>
      <AnimatePresence initial={false}>
        {hideLandingAnimation === false ?
          <motion.div 
            className="bg-black fixed inset-0 z-50"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            key="box"
          >
            <div className="loader absolute top-2/4 left-2/4 -translate-x-1/2 -translate-y-1/2"></div>
          </motion.div>
        : null}
      </AnimatePresence>

      {(sessionPin && isInLobby) && (
      <div className="fixed inset-0 w-2/4 h-2/4 left-2/4 top-2/4 -translate-x-2/4 -translate-y-2/4 z-50 flex flex-col justify-center items-center text-white p-4 mb-4 rounded-xl bg-[#101010]">
        <h2 className='text-2xl font-bold'>{`Session created! Share PIN: ${sessionPin}`}</h2>
        <h3 className="text-lg font-semibold">Players Joined ({players.length})</h3>
        <ul className="list-disc pl-5">
          {players.map((player) => (
            <li key={player.id}>{player.name}</li>
          ))}
        </ul>
        <button
          className="mt-3 bg-green-500 text-white px-4 py-2 rounded font-semibold"
          onClick={startGameForPlayers}
          // disabled={players.length === 0}
        >
          Start Game
        </button>
      </div>
      )}

      {/* {sessionPin && players.length > 0 && (
        <div className="bg-gray-800 text-white p-4 mt-4 rounded overflow-auto max-h-64">
          <h3 className="font-semibold text-lg">Players’ Answers</h3>
          {players.map(player => (
            <div key={player.id} className="border-b border-gray-700 py-2">
              <strong>{player.name}:</strong>
              <div className="flex flex-wrap gap-2 mt-1">
                {player.answers.map((a, i) => (
                  <span key={i} className="px-2 py-1 bg-gray-600 rounded text-sm">
                    {a || "-"}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )} */}

      <header className='flex items-center justify-between md:mx-12 mx-4 my-6'>
        <h1 className="text-2xl font-normal">
          Categorama
        </h1>
        <div className='flex items-center gap-3'>
        {<button onClick={createSession} className="border px-3 py-2">Create Multiplayer Game</button>}
        {<a href='/join' className="border px-3 py-2">Join Multiplayer Game</a>}
        </div>
      </header>
      <main className={`border-4 border-solid border-white md:inset-12 md:top-20 top-20 inset-4 fixed rounded-xl overflow-hidden ${gameState === 'playing' ? 'game-playing' : 'game-paused'}  ${restart === false ? '' : 'restarting'} ${finishedClass}`}>
        <div className="game flex h-full">
          <div className="reset-anim absolute bg-black w-0 h-full z-10"></div>
          <div className="left-col h-full w-4/12">
            <div className="letter-col h-2/4 border-r-4 border-b-4 relative">
              <div className="flex items-center justify-between p-5 md:text-xl text-md absolute w-full">
                <span>Letter</span>
                {gameState === 'paused' ? <button onClick={() => setCharacter(createRandomString(1))}>Re-roll</button> : null}
              </div>
              <h2 className="flex items-center justify-center h-full md:text-9xl text-7xl">{character}</h2>
            </div>
            <div className="game-info-col flex h-2/4 w-full md:flex-row flex-col">
              <div className="time-col border-r-4 md:w-2/5 w-full  grow relative md:border-b-0 border-b-4">
                <div className="flex items-center justify-between p-5 md:text-xl text-sm absolute w-full">
                  <span>Time</span>
                  {gameState === 'paused' ?  <button onClick={() => {setChangeTime(true);}}>Change</button> : null}
                </div>
                <div className="time h-full">
                  {changeTime ? 
                    <form className="h-full flex flex-col justify-center items-center" onSubmit={updateTime}>
                      <input className="md:text-7xl text-5xl w-full text-center bg-[#242424] focus-within:outline-none" defaultValue={time} id="number" type="number"/>
                      <button className='border-white border-solid border-4 w-3/4 p-2'>Update</button>
                    </form>  
                  : 
                    <h2 className="flex justify-center items-center h-full md:text-7xl text-5xl">{time}</h2> 
                  }
                </div>
          
              </div>
              <div className="play-col border-r-4 grow relative md:w-2/5 w-full cursor-pointer" onClick={startTimer}>
              <button className="flex absolute w-full md:text-xl text-sm p-5">{gameState === 'playing' ? 'Pause' : 'Play'}</button>
              <div className='flex h-full justify-center items-center'>
                <svg id="play-pause-btn" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" className='w-2/5'>
                  <path id="play-pause-btn-path" fill="#fff" d={gameState === 'playing' ? "M96 0h64c17.7 0 32 14.3 32 32v448c0 17.7-14.3 32-32 32H96c-17.7 0-32-14.3-32-32V32c0-17.7 14.3-32 32-32zm192 0h64c17.7 0 32 14.3 32 32v448c0 17.7-14.3 32-32 32H288c-17.7 0-32-14.3-32-32V32c0-17.7 14.3-32 32-32z" : "M73 39c-14.8-9.1-33.4-9.4-48.5-.9S0 62.6 0 80L0 432c0 17.4 9.4 33.4 24.5 41.9s33.7 8.1 48.5-.9L361 297c14.3-8.7 23-24.2 23-41s-8.7-32.2-23-41L73 39z"}/>
                </svg>
              </div>
              </div>
            </div>
          </div>
          <div className="right-col h-full md:w-6/12 md:border-r-4 w-8/12 border-white border-solid">
              <div className="relative questions h-dvh">
                <div className="flex items-center justify-between w-full border-b-4">
                  <div className="flex items-center justify-center md:p-5 p-2 md:text-xl text-sm md:gap-4 gap-2">
                    <button className={showAllCategories ? 'underline font-medium' : ''} onClick={() => showAllCategories === false ? setShowAllCategories(true) : setShowAllCategories(false) }>Categories</button>
                    <button className="opacity-70" onClick={() => showAddNewCategory === false ? setShowAddNewCategory(true) : setShowAddNewCategory(false) }>Add A Category</button>
                  </div>
                  <div className="flex items-center justify-center mr-5 md:text-xl text-sm relative md:w-[15%] w-[30%]">
                    <button className="minus-icon p-2 text-4xl absolute top-[43%] -translate-y-2/4 left-0" onClick={() => setNumberOfCategories(numberOfCategories-1)}>-</button>
                    <div className="">{numberOfCategories}</div>
                    <button className="plus-icon p-2 text-4xl absolute top-1/2 -translate-y-2/4 right-0" onClick={() => setNumberOfCategories(numberOfCategories+1)}>+</button>
                  </div>
                </div>
                <div className="question-list py-5 overflow-hidden">
                  <AnimatePresence initial={false}>
                  {showAddNewCategory ? 
                          <motion.div 
                            className='-mt-5 mb-5 bg-white md:p-5 p-3 text-left'
                            initial={{ opacity: 0, y: '-100%'}}
                            animate={{ opacity: 1, y: '0'}}
                            exit={{ opacity: 0, y: '-100%'}}
                            transition={{ duration: 0.25 }}
                          >
                            <form className='relative' onSubmit={addNewCategory}>
                              <input 
                                className="bg-white w-[90%] focus-within:outline-none text-black md:text-xl text-sm" 
                                type="text" 
                                id="add-new-category"
                                autoComplete="off"
                                autoCorrect="off" 
                                spellCheck="false" 
                                placeholder="Enter a new category..." 
                                required
                              />
                              <button type="submit" className='md:text-[60px] text-[40px] text-black absolute right-0 top-2/4 -translate-y-2/4'>+</button>
                            </form>
                          </motion.div>
                      : null }
                    </AnimatePresence>
                    <AnimatePresence initial={false}>
                      {showAllCategories || showAddNewCategory  ?
                      <motion.div 
                        className={`bg-white absolute ${showAddNewCategory ? 'md:top-[140px] top-[88px]' : 'md:top-[68px] top-[40px]'} w-full left-0 z-20 overflow-scroll h-[calc(100vh-88px)] md:h-[calc(100vh-175px)] pb-5`}
                        initial={{ opacity: 0, y: '-100%'}}
                        animate={{ opacity: 1, y: '0'}}
                        exit={{ opacity: 0, y: '-100%'}}
                        transition={{ duration: 0.25 }}
                      >
                        <p className='bg-black py-4 text-left pl-5 mb-5 font-medium md:text-lg text-sm'>Each turn, 12 categories are chosen randomly from the list below:</p>
                        {categories.map((item: Category, id: number) => {
                          return(
                            <div className="category-item relative flex justify-between items-center md:text-xl text-sm pb-3 gap-3 border-b-2 border-solid border-black mb-3 border-opacity-10 px-5 text-black" key={id}>
                              <h3>{item.Category}</h3>
                              <button className="opacity-45 text-sm" onClick={() => {handleRemove(item.id)}}>Remove</button>
                            </div>
                          )
                        })}
                      </motion.div>
                      : null } 
                    </AnimatePresence>
                  {categories.slice(0, numberOfCategories).map((item: Category, id: number) => {
                    return(
                      <div className="category-item relative flex items-center md:text-xl text-sm pb-3 gap-3 border-b-2 border-solid border-[#fcfcfc] px-5 mb-3 border-opacity-10" key={id}>
                          <span>{id+1}.</span>
                          <div className="category-text" style={{ transitionDelay: `${id * 30}ms` }}>
                            <h3>{item.Category}</h3>
                          </div>
                      </div>
                    )
                  })}
                  {categoryStatusChanged ? 
                  <div className="save-list bg-black absolute bottom-[100px] z-50 w-full py-6 border-t-4 border-solid border-white text-xl font-medium" onClick={saveUpdatedList}>
                    <h3>Save List</h3>
                  </div>
                  : null}
                </div>
              </div>
          </div>
          <div className="last-col h-full w-2/12 flex-col items-center justify-center gap-10 cursor-pointer md:flex hidden" onClick={resetTimer}>
            <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="100" height="100" viewBox="0 0 50 50">
              <path fill="#fff" d="M 25 2 A 2.0002 2.0002 0 1 0 25 6 C 35.517124 6 44 14.482876 44 25 C 44 35.517124 35.517124 44 25 44 C 14.482876 44 6 35.517124 6 25 C 6 19.524201 8.3080175 14.608106 12 11.144531 L 12 15 A 2.0002 2.0002 0 1 0 16 15 L 16 4 L 5 4 A 2.0002 2.0002 0 1 0 5 8 L 9.5253906 8 C 4.9067015 12.20948 2 18.272325 2 25 C 2 37.678876 12.321124 48 25 48 C 37.678876 48 48 37.678876 48 25 C 48 12.321124 37.678876 2 25 2 z"></path>
            </svg>
            <h3 className="text-xl">Restart</h3>
          </div>
        </div>
      </main>
    </>
  )
}

export default App
