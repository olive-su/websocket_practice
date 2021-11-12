const socket = io();

const welcome = document.getElementById("welcome");
const form = welcome.querySelector("form");

function backendDone(msg) {
  console.log(`The backend says: `, msg);
}

function handleRoomSubmit(event) {
  event.preventDefault();
  const input = form.querySelector("input");
  socket.emit("enter_room", input.value, backendDone);
  // "room"이란 이름으로 object를 백엔드로 전송함
  // emit를 이용하여 특정 이벤트에 대한 처리를 지정할수 있음
  // object를 인자로 보낼 수 있음
  // 세번째 인자로 callback fuction(서버에서 직접 실행되는 함수) 지정
  // 서버로 부터 함수를 호출할 수 있는 데 해당 부분이 프론트엔드에 있다!
  input.value = "";
}

form.addEventListener("submit", handleRoomSubmit);
