const path = require("path");
const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const moment = require("moment");
const formatMessage = require("./utils/messages");
const {userJoin, getCurrentUser, userLeave, getRoomUsers} = require("./utils/users")

const app = express();
const server = http.createServer(app);
const io = socketio(server);



const serverName = "Server";

// Set static folder 
app.use(express.static(path.join(__dirname, "public")))

// Run when client connects 
io.on("connection", socket => {

    socket.on("joinRoom", ({username, room}) => {

        const user = userJoin(socket.id, username, room);
        socket.join(user.room)

        // Welcome current user
        socket.emit("message", formatMessage(serverName, "Welcome to ChatShit"));

        // Broadcast when user connects
        socket.broadcast.to(user.room).emit("message", formatMessage(serverName, `${user.username} has joined the chat`));


        // Send users and room info
        io.to(user.room).emit("roomUsers", {
            room: user.room,
            users: getRoomUsers(user.room)
        });
    });

    
    
    // Listen for chatMessage
    socket.on("chatMessage", msg => {
        let user = getCurrentUser(socket.id);

        try {

            io.to(user.room).emit("message", formatMessage(user.username, msg));
        } catch (TypeError) {
            socket.emit("reconnect");
            socket.on("reconnect", ()=> {
                const user = getCurrentUser(socket.id);
                io.to(user.room).emit("message", formatMessage(user.username, msg));
            })
        } 
    });
    // Runs when client disconnects
    socket.on("disconnect", () => {
        let user = userLeave(socket.id);

        if (user) {
            io.to(user.room).emit("message", formatMessage(serverName, `${user.username} has left the chat`));
        

            // Send users and room info
            io.to(user.room).emit("roomUsers", {
            room: user.room,
            users: getRoomUsers(user.room)
            });
        }

    });
});


const PORT = 3000 || process.env.PORT;

server.listen(PORT, () => console.log(`[RUNNING] Server listening on port ${PORT}`));