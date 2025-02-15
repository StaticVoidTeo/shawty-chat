import {initializeApp} from 'firebase/app';
import {getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged} from 'firebase/auth';
import {getFirestore, collection, getDocs, addDoc, setDoc, onSnapshot, Timestamp, orderBy, query} from 'firebase/firestore';
import {getMessaging, getToken, onMessage} from 'firebase/messaging';
import {useEffect, useState} from 'react'; 
import "./output.css";
import "./App.css";

const firebaseConfig = {
  apiKey: "AIzaSyCZd1vtBcY2aqwbQYpWLvx_iWgcVctX-Ic",
  authDomain: "shawty-chat.firebaseapp.com",
  projectId: "shawty-chat",
  storageBucket: "shawty-chat.firebasestorage.app",
  messagingSenderId: "848260172132",
  appId: "1:848260172132:web:99b0166e299cf6ef599271"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
let user;

const db = getFirestore(app);
const provider = new GoogleAuthProvider();

let messages;
let allowedUsers = [];

async function fetchAllowedUsers(){
  let queryAllowed = collection(db, "allowed-users");
  let snapShotAllowed = await getDocs(queryAllowed);
  snapShotAllowed.forEach(doc => {
    allowedUsers.push(doc.email);
  });
};
fetchAllowedUsers();


function Chat(){
  const[messageDivs, setMessageDivs] = useState(messages.map(el => {
    const sideOfMsg = (el.userEmail == user.email) ? "mine-right-message flex-row-reverse " : "";
    const disName = (el.userEmail == user.email) ? "hidden " : "";
    const marginImg = (el.userEmail == user.email) ? "mt-0 " : "mt-5 ";
    const msgColor = (el.userEmail == user.email) ? "bg-red-700 " : "bg-zinc-500 ";
    return <div className={sideOfMsg + "flex items-start gap-2"}>
      <img src={el.userPhoto} className={marginImg+"object-cover w-8 h-8 rounded-full"}/>
      <div className="flex flex-col items-start gap-1">
        <div className={disName+"text-xs text-zinc-400 pl-2"}>{el.user.split(" ")[0] + ":"}</div>
        <div className={msgColor+"px-3 py-1 rounded-2xl"}>{el.text}</div>
      </div>
    </div>
  }));
  useEffect(() => {
    const collectionVar = query(collection(db, "messages"), orderBy("date", "asc"));
    onSnapshot(collectionVar, (snapshot) => {
      messages = snapshot.docs.map(doc => {
        return {
          id:doc.id,
          ...doc.data()
        }
      })
      setMessageDivs(messages.map(el => {
        const sideOfMsg = (el.userEmail == user.email) ? "mine-right-message flex-row-reverse pl-10 " : "pr-10 ";
        const disName = (el.userEmail == user.email) ? "hidden " : "";
        const marginImg = (el.userEmail == user.email) ? "mt-0 " : "mt-5 ";
        const msgColor = (el.userEmail == user.email) ? "bg-red-700 " : "bg-zinc-500 ";
        return <div className={sideOfMsg + "flex items-start gap-2"}>
          <img src={el.userPhoto} className={marginImg+"object-cover w-8 h-8 rounded-full"}/>
          <div className="flex flex-col items-start gap-1">
            <div className={disName+"text-xs text-zinc-400 pl-2"}>{el.user.split(" ")[0] + ":"}</div>
            <div className={msgColor+"px-3 py-1 rounded-2xl"}>{el.text}</div>
          </div>
        </div>
      }));
      setTimeout(() => {
        document.querySelector(".mine-messages").scrollTo({left: 0, top: document.querySelector(".mine-messages").scrollHeight, behavior:"smooth"});
      }, 0);
    });
  }, [])
  async function addPost(){
    try{
      const message = document.querySelector("input").value;
      if(!(/\S/.test(message)))
        return;
      const collectionVar = collection(db, "messages");
      document.querySelector("input").value = "";
      const msgContent = {
        user:user.displayName,
        text:message,
        userEmail:user.email,
        userPhoto:user.photoURL,
        date:Timestamp.fromDate(new Date())
      };
      const docRef = await addDoc(collectionVar, msgContent);
    }
    catch(err){
      alert(err);
    }
  }
  return <div className="relative flex flex-col h-full w-full max-w-96">
    <div className="w-full flex justify-between items-center p-2 bg-zinc-900">
      <div>A&T Chat</div>
      <button onClick={() => signOut(auth)}className="bg-red-600 active:bg-red-500 px-2 py-1 rounded-sm">Sign Out</button>
    </div>
    <div className="mine-messages flex flex-col gap-4 h-full overflow-y-scroll items-start py-4 px-2">
      {messageDivs}
    </div>
    <div className="flex w-full">
      <input className="bg-zinc-900 w-full py-2 px-4 mine-outline-none" type="text" placeholder="Type..."/>
      <button className="px-4 py-2 bg-red-600 active:bg-red-500" onClick={() => addPost()}>Send</button>
    </div>
  </div>
}

function AuthUser({signIn}){
  const[signInStatus, setSignInStatus] = useState("");
  useEffect(() => {
    onAuthStateChanged(auth, usr => {
      if(!usr)
        setSignInStatus("hidden");
      else
        setSignInStatus("");
    });
  }, []);
  return <div className="flex flex-col items-center gap-4">
    <div className="text-xl font-bold">Shawty Chat</div>
    <button onClick={signIn} className="bg-white px-4 py-2 rounded-full border-none text-cyan-700 hover:text-cyan-500">Sign in with Google!</button>
    <div className={signInStatus}>Trying to sign in...</div>
  </div>
}

function App() {
  const[currentWindow, setCurrentWindow] = useState(<AuthUser signIn={signIn}/>);
  useEffect(() => {
    async function fetchData(){
      try{
        const collectionVar = collection(db, "messages");
        const snapShot = await getDocs(collectionVar);
        messages = snapShot.docs.map(doc => {
          return {
            id:doc.id,
            ...doc.data()
          }
        });
        let queryAllowed = collection(db, "allowed-users");
        let snapShotAllowed = await getDocs(queryAllowed);
        allowedUsers = snapShotAllowed.docs.map(doc => {
          return doc.data().email;
        });
        if(user && allowedUsers.includes(user.email))
          setCurrentWindow(<Chat/>);
      }
      catch(err){
        alert(err);
      }
    }
    fetchData();
    onAuthStateChanged(auth, usr => {
      if(usr){
        user = usr;
      }
      else{
        user = null;
        setCurrentWindow(<AuthUser signIn={signIn}/>);
      }
    })
  }, []);
  async function signIn(){
    try{
      await signInWithPopup(auth, provider);
      if(allowedUsers.includes(user.email))
      setCurrentWindow(<Chat/>)
    }
    catch(err){
      alert(err);
    }
  }
  return <>
    {currentWindow}
  </>
}

export default App;
