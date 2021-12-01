//import logo from './logo.svg';


import './App.css';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';



const firebaseConfig = {
  apiKey: "AIzaSyAx-OcIl_63jSiz-nQ-j2b5jmyXznmxbSw",
  authDomain: "webrtc-5de73.firebaseapp.com",
  projectId: "webrtc-5de73",
  storageBucket: "webrtc-5de73.appspot.com",
  messagingSenderId: "683903215180",
  appId: "1:683903215180:web:30349afc7e2e193e8136e9",
  measurementId: "G-LHC8SYVXX7"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const firestore = firebase.firestore();
const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302','stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
};

let pc = new RTCPeerConnection(servers);
let localStream = null
let remoteStream = null

const webcamBtn = document.getElementById("webcamBtn");
const webcamvideo = document.getElementById("webcamVideo");
const callButton = document.getElementById("callButton");
const callInput = document.getElementById("callInput");
const answerBtn = document.getElementById("answerBtn");
const remoteVideo = document.getElementById("remoteVideo");
//const hangupBtn = document.getElementById("hangupBtn");

webcamBtn.onclick = async () => {
  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  remoteStream = new MediaStream();

  localStream.getTracks().forEach((track) => {
    pc.addTrack(track, localStream);
  }
  );

  pc.ontrack = event => {
    event.streams[0].getTracks().forEach(track => {
      remoteStream.addTrack(track);
    });
  }
  webcamvideo.srcObject = localStream;
  remoteVideo.srcObject = remoteStream;
  callButton.disabled = false;
  answerBtn.disabled = false;
  webcamBtn.disabled = true;
}

callButton.onclick = async () => {
  const callDoc = firestore.collection('calls').doc();
  const offerCandidates = firestore.collection('offerCandidates').doc();
  const answerCandidates = firestore.collection('answerCandidates').doc();
  callInput.value = callDoc.id;
  
  pc.onicecandidate = (event) => {
    event.candidate && offerCandidates.add(event.candidate.toJSON());
  }

  const offerDescription = await pc.createOffer();
  await pc.setLocalDescription(offerDescription);

  const offer = {
    sdp: offerDescription.sdp,
    type:  offerDescription.type,
  }
  await callDoc.set({offer})

  callDoc.onSnapshot((snapshot) => {
    const data = snapshot.data();
    if (!pc.currentLocalDescription && data?.answer) {
      const answerDescription = new RTCSessionDescription(data.answer);
      pc.setRemoteDescription(answerDescription);
    }
  });

  answerCandidates.onSnapshot(snapshot => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const candidate = new RTCIceCandidate(change.doc.data())
        pc.addIceCandidate(candidate)
      }
    })
  })
}
answerBtn.onclick = async () => {
  const callId = callInput.value;
  const callDoc = firestore.collection('calls').doc(callId)
  const answerCandidates = firestore.Collection('answerCandidates').doc();
  const offerCandidates = callDoc.collection('offerCandidates');
  pc.onicecandidate = event => {
    event.candidate && answerCandidates.add(event.candidate.toJSON());
  }

  const callData = (await callDoc.get()).data();

  const offerDescription = callData.offer;
  await pc.setRemoteDescription(new RTCSessionDescription(offerDescription));

  const answerDescription = await pc.createAnswer();
  await pc.setLocalDescription(answerDescription);

  const answer = {
    type: answerDescription.type,
    sdp: answerDescription.sdp,
  };

  await callDoc.update({ answer });

  offerCandidates.onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
      console.log(change);
      if (change.type === 'added') {
        let data = change.doc.data();
        pc.addIceCandidate(new RTCIceCandidate(data));
      }
    });
  });

}

function App() {
  return (
    <div></div>
  );
}

export default App;


/* <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a> */


