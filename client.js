const net = require('net')

const socket = net.createConnection({
  port: 8080,
  host: '192.168.1.62',
})

socket.on('data', data => {
  console.log(data.toString('utf8'))
})

socket.end(JSON.stringify({
  type: 'MESSAGE',
  message: 'hello world',
}) + '\0')
