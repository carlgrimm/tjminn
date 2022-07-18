const axios = require('axios')
const stream = require('stream')
const appEmitter = require('./globalEvents')

// function retreives the file from slack in buffer form

async function getFileBuffer (user, id, ts, url, channel) {
  let memStore

  // we operate axios in stream mode and need a writable stream to handle the incoming data and process into a buffer
  const writer = new stream.Writable({
    // define the write function
    write: function (chunk, enc, next) {
      // check if incoming is buffer
      const buffer = (Buffer.isBuffer(chunk))
        ? chunk
        : Buffer.alloc(chunk, enc)

      if (Buffer.isBuffer(memStore)) {
        memStore = Buffer.concat([memStore, buffer])
      } else {
        memStore = buffer
      }
      next()
    }
  })

  writer.on('finish', function () {
    appEmitter.emit('extractUPC', { user, id, ts, buffer: memStore, channel })
  })

  const res = await axios({
    method: 'get',
    url,
    headers: {
      Authorization: `Bearer ${process.env.BOT_TOKEN}`
    },
    responseType: 'stream'
  })

  res.data.pipe(writer)
  return memStore
}

module.exports = getFileBuffer
