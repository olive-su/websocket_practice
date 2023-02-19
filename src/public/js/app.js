const socket = io();

const myFace = document.getElementById("myFace");
const muteBtn = document.getElementById("mute");
const cameraBtn = document.getElementById("camera");
const camerasSelect = document.getElementById("cameras"); // 카메라 목록

const call = document.getElementById("call");

call.hidden = true; // div call은 맨처음 들어왔을 떄는 숨김 -> 이후 방에 들어갔을때 보여주기

let myStream;
let muted = false;
let cameraOff = false;
let roomName;
let myPeerConnection;

async function getCameras() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter((devices) => devices.kind === "videoinput");
    const currentCamera = myStream.getVideoTracks()[0];
    // console.log(devices);
    // console.log(cameras);
    // console.log(myStream.getVideoTracks()); // 현재 선택된 비디오를 알 수 있음(id는 알 수 없고 label값으로 유추가능)
    cameras.forEach((camera) => {
      const option = document.createElement("option");
      option.value = camera.deviceId; // camera id 가져옴
      option.innerText = camera.label; // camera 이름 가져옴
      if (currentCamera.label == camera.label) {
        // 가져온 camera label 과 현재 사용중인 카메라가 동일할 떄 선택된 카메라라고 알려줌
        option.selected = true;
      }
      camerasSelect.appendChild(option);
    });
  } catch (error) {
    console.log(error);
  }
}

async function getMedia(deviceId) {
  const initialConstraints = {
    // 초기 deviceId 를 넘겨주지 않을 경우
    audio: true,
    video: { facingMode: "user" },
  };
  const cameraConstraints = {
    audio: true,
    video: { deviceId: { exact: deviceId } }, // 굳이 exact 옵션을 안써도 되긴 하는데, deviceId를 받았으므로 exact 옵션을 함께 써준다.
  };
  try {
    myStream = await navigator.mediaDevices.getUserMedia(
      deviceId ? cameraConstraints : initialConstraints // deviceId 를 받은 경우 실행하는 func, 안받은 경우 실행하는 func를 다르게 둠
    );
    myFace.srcObject = myStream; // pug 연결을 위함
    if (!deviceId) {
      await getCameras(); // select에 카메라 리스트 띄움 -> 맨처음에 카메라 정보가 없을 때 최초 한번만 실헹
    }
  } catch (e) {
    console.log(e);
  }
}

// getMedia(); // room에 들어가기전에는 getMedia 함수를 호출하지 않음

function handleMuteClick() {
  // console.log(myStream.getAudioTracks());
  myStream
    .getAudioTracks()
    .forEach((track) => (track.enabled = !track.enabled)); // track.enabled 에 새로운 값 설정
  if (!muted) {
    muteBtn.innerText = "Unmute";
    muted = true;
  } else {
    muteBtn.innerText = "Mute";
    muted = false;
  }
}
function handleCameraClick() {
  // console.log(myStream.getVideoTracks());
  myStream
    .getVideoTracks()
    .forEach((track) => (track.enabled = !track.enabled));
  if (cameraOff) {
    cameraBtn.innerText = "Turn Camera Off";
    cameraOff = false;
  } else {
    cameraBtn.innerText = "Turn Camera On";
    cameraOff = true;
  }
}

// 카메라 선택변경시, 카메라 스트림도 바꿔주는 함수
async function handleCameraChange() {
  await getMedia(camerasSelect.value);
  // console.log(camerasSelect.value); // 선택된 카메라 consol 찍음
  if (myPeerConnection) {
    const videoTrack = myStream.getVideoTracks()[0];
    // 위에 라인에서 myStream을 새로운 stream으로 업데이트 했으므로 바뀐 stream을 얻을 수 있다.
    const videoSender = myPeerConnection
      .getSenders()
      .find((sender) => sender.track.kind == "video");
    videoSender.replaceTrack(videoTrack);
  }
}

muteBtn.addEventListener("click", handleMuteClick);
cameraBtn.addEventListener("click", handleCameraClick);
camerasSelect.addEventListener("input", handleCameraChange);

// Welcome Form (join a room)

const welcome = document.getElementById("welcome");
const welcomeForm = welcome.querySelector("form");

async function initCall() {
  welcome.hidden = true;
  call.hidden = false;
  await getMedia();
  makeConnection();
}

async function handleWelcomeSubmit(event) {
  // 방 이름 다룸
  event.preventDefault();
  const input = welcomeForm.querySelector("input");
  // console.log(input.value); // 사용자가 적은 방 번호
  await initCall();
  socket.emit("join_room", input.value);
  roomName = input.value; // 방 이름 다시 다루기 위함
  input.value = "";
}

welcomeForm.addEventListener("submit", handleWelcomeSubmit);

// Socket Code
// PeerA : createOffer(), setLocalDescription()
socket.on("welcome", async () => {
  // PeerA 브라우저에서만 발생
  // 누군가가 방에 들어왔을 때 실행
  const offer = await myPeerConnection.createOffer();
  myPeerConnection.setLocalDescription(offer);
  // console.log(offer);
  // console.log("someone joined!");
  console.log("sent the offer");
  socket.emit("offer", offer, roomName); // 접속한 socket.io 방으로 PeerA의 session정보를 보냄
});

// PeerB : PeerA -> server 로 부터 offer 정보를 받음
socket.on("offer", async (offer) => {
  // console.log(offer);
  console.log("received the offer");
  myPeerConnection.setRemoteDescription(offer);
  const answer = await myPeerConnection.createAnswer();
  // console.log(answer); // PeerB의 answer 정보 전송
  myPeerConnection.setLocalDescription(answer);
  socket.emit("answer", answer, roomName);
  console.log("sent the answer");
});

// PeerA : answer로 부터 PeerB의 정보가 넘어오면 setRemoteDescription을 해줌
socket.on("answer", (answer) => {
  console.log("received the answer");
  myPeerConnection.setRemoteDescription(answer);
});

// iceCandidate 받은 걸 저장함
socket.on("ice", (ice) => {
  console.log("received candidate");
  myPeerConnection.addIceCandidate(ice);
});

// RTC Code
function makeConnection() {
  // peerConnection을 각 브라우저에 만들어준다.
  myPeerConnection = new RTCPeerConnection({
    iceServers: [
      { urls: ["stun:ntk-turn-1.xirsys.com"] },
      {
        username:
          "LWvrShK7ZsHj9S1yGqvstsNVMtqt6doYku7Qe3RsMGHKSARd3Wga5gKbNWpnWI7UAAAAAGLEDUdzdWd5ZW9uZw==",
        credential: "3799e2bc-fc4a-11ec-933b-0242ac120004",
        urls: [
          "turn:ntk-turn-1.xirsys.com:80?transport=udp",
          "turn:ntk-turn-1.xirsys.com:3478?transport=udp",
          "turn:ntk-turn-1.xirsys.com:80?transport=tcp",
          "turn:ntk-turn-1.xirsys.com:3478?transport=tcp",
          "turns:ntk-turn-1.xirsys.com:443?transport=tcp",
          "turns:ntk-turn-1.xirsys.com:5349?transport=tcp",
        ],
      },
    ],
  });

  // console.log(myStream.getTracks()); // 내 브라우저에 연결된 audio, video track 정보
  myPeerConnection.addEventListener("icecandidate", handleIce);
  myPeerConnection.addEventListener("addstream", handleAddStream);
  myStream // 양쪽 브라우저의 카메라, 마이크 데이터 stream 을 받아와서 그걸 연결 안에 집어넣어줌
    .getTracks()
    .forEach((track) => myPeerConnection.addTrack(track, myStream));
}

function handleIce(data) {
  socket.emit("ice", data.candidate, roomName);
  console.log("sent candidate");
  // console.log(data);
}

function handleAddStream(data) {
  const peersStream = document.getElementById("peersStream");
  // console.log("got an stream from my peer");
  console.log("Peer's Stream", data.stream);
  console.log("My Stream", myStream);
  peersStream.srcObject = data.stream;
}
