import http from "http";
import WebSocket from "ws";
import express from "express";

const app = express();

app.set("view engine", "pug");
app.set("views", __dirname + "/views");
app.use("/public", express.static(__dirname + "/public"));
app.get("/", (_, res) => res.render("home"));
app.get("/*", (_, res) => res.redirect("/"));

const handleListen = () => console.log(`Listening on http://localhost:3000`);

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

function onSocketClose() {
  console.log("Disconnected from the Browser ❌");
}

const sockets = []; // fake database
// 어느 브라우저에서 연결했는지를 알기 위함

wss.on("connection", (socket) => {
  sockets.push(socket); // 다른 브라우저 연결시, socketsArray에 추가해줌
  socket["nickname"] = "anonymous";
  console.log("Connected to Browser ✅");
  socket.on("close", onSocketClose);
  socket.on("message", (msg) => {
    const parsed = JSON.parse(msg);
    switch (parsed.type) {
      case "new_message":
        sockets.forEach((aSocket) =>
          aSocket.send(
            `${socket.nickname} : ${parsed.payload.toString("utf-8")}`
          )
        );
      case "nickname":
        socket["nickname"] = parsed.payload; // socket의 닉네임 항목에 사용자 지정 닉네임 설정
    }
  });
});

server.listen(3000, handleListen);
