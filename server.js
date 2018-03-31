const net = require('net')

const server = net.createServer(socket => {
  process.exit(1)
})

server.listen(2000, () => {
  console.log('listening :2000')
})
