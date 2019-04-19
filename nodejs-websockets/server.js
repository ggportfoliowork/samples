const options = {}

// WS protocol
const fs = require('fs')
const http = require('http')
const path = require('path')
const socketApp = require('http').createServer({}, handler)

// Bind socket.io to the socket app
const io = require('socket.io')(socketApp)


// Socket App listens on 3000
socketApp
    .listen(3000, () => {
    console.log("Socket server booted")
})

// Set up the single route to serve the index.html page
http
    .createServer(function(req, res) {
        res
            .writeHead(200, {"Content-Type": "text/html"});
        fs
            .createReadStream(path.resolve(__dirname, 'index.html'))
            .pipe(res)
    })
    .listen(8080)

// Io Connection Logic
io
    .on('connection', (socket) => {

        // Socket connected
        socket.on('connect', () => {
            console.log("Socket connected")
        })


        // Send data from the server to the client
        socket
            .on('send', (payload) => {
                console.log(payload)
                io
                    .sockets
                    .emit('*', payload)
        })

        // Socket disconnected
        socket
            .on('disconnect', function() {
                console.log("Client disconnected")
        })

    })


// Default socket connection handler
function handler(req, res) {
    res.writeHead(200);
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.end('')
}