import http from "http";
import SocketIO from "socket.io";
import express from "express";
import { Socket } from "dgram";

const app = express();

app.set("view engine", "pug");
app.set("views", __dirname + "/views");
app.use("/public", express.static(__dirname + "/public"));
app.get("/", (_, res) => res.render("home"));
app.get("/*", (_, res) => res.redirect("/"));

const handleListen = () => console.log(`Listening on http://localhost:3000`);

const httpServer = http.createServer(app);
const wsServer = SocketIO(httpServer);

wsServer.on("connection", (socket) => {
  socket.onAny((event) => {
    console.log(`Event name : ${event}`);
  });
  // 서버에서 프론트와의 연결을 할 준비가 됨
  socket.on("enter_room", (roomName, done) => {
    console.log(socket.id); // 현재 socket의 id를 보여줌(socket에는 id가 있어서 socket마다 구별 가능)
    console.log(socket.rooms); // 현재 socket이 있는 room 이름을 보여줌
    socket.join(roomName);
    console.log(socket.rooms);
    setTimeout(() => {
      done("hello from the backend");
    }, 10000);
  });
  // 직접 만든 이벤트도 어떤 이벤트던 간에 socket.on으로 연결시켜 줄 수 있음
});

// websocket 부분 (socket.io와의 비교를 위해 주석 처리함)

// function onSocketClose() {
//   console.log("Disconnected from the Browser ❌");
// }

// const sockets = []; // fake database
// 어느 브라우저에서 연결했는지를 알기 위함

// wss.on("connection", (socket) => {
//   sockets.push(socket); // 다른 브라우저 연결시, socketsArray에 추가해줌
//   socket["nickname"] = "anonymous";
//   console.log("Connected to Browser ✅");
//   socket.on("close", onSocketClose);
//   socket.on("message", (msg) => {
//     const parsed = JSON.parse(msg);
//     switch (parsed.type) {
//       case "new_message":
//         sockets.forEach((aSocket) =>
//           aSocket.send(
//             `${socket.nickname} : ${parsed.payload.toString("utf-8")}`
//           )
//         );
//       case "nickname":
//         socket["nickname"] = parsed.payload; // socket의 닉네임 항목에 사용자 지정 닉네임 설정
//     }
//   });
// });

httpServer.listen(3000, handleListen);
