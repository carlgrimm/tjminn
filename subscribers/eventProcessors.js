'use strict'
const bx = require('barcode-js')
const appEmitter = require('../utils/globalEvents')
const lookupProduct = require('../utils/lookupProduct')
const promptUser = require('../utils/promptUser')
const postOrderReady = require('../utils/postOrderReady')
const updateHomeView = require('../utils/updateHomeView')
const getFileBuffer = require('../utils/getFileBuffer')

// function for loading event handlers and database collection dependancy injection

function bindEvents (orders, cache, view) {
  // handle emitter errors from appEmitter

  appEmitter.on('error', function (err) {
    console.error(err)
  })

  // Creates order in database given a file

  appEmitter.on('createOrder', function (data) {
    // incoming data in the form of data = {user, id, ts, file, channel}

    const { user, ts, file, channel } = data

    try {
      // create new order with defualt type of permanent
      orders.insert({
        order: file.id,
        user,
        url: file.url_private_download,
        upc: '',
        type: 'Permanent',
        status: 'requiresAnalysis'
      })
      appEmitter.emit('orderCreated', { user, id: file.id, ts, url: file.url_private_download, channel }) // emit order created so we can kick off file analysis
    } catch (err) {
      console.error(err)
    }
  })

  appEmitter.on('updateOrderUPC', function (data) {
    // incoming data in the form of data = {user, id, ts, barcode, channel}
    const { user, id, ts, barcode, channel } = data

    // update the order with a barcode
    try {
      const order = orders.findOne({ order: id })
      order.upc = barcode
      orders.update(order)

      // emit that the UPC is yread
      appEmitter.emit('upcReady', { user, id, ts, barcode, channel })
    } catch (err) {
      console.error(err)
    }
  })

  // extractUPC will take the image buffer and extract the barcode

  appEmitter.on('extractUPC', async function (data) {
    // incoming data in the form of data = {user, id, ts, barcode}
    const { user, id, ts, buffer, channel } = data

    // analyze the buffer to extract the barcode from the image
    try {
      const results = await bx.analyze(buffer)

      // check to see if we have a barcode
      if (results.length === 0 || null) {
        // notify the user no barcode was detected
        appEmitter.emit('noOrderUPC', { user, id, ts })
      } else {
        // we have a barcode
        const barcode = results[0].value.split(' ')[0]
        // ready to update the order with the barcode
        appEmitter.emit('updateOrderUPC', { user, id, ts, barcode, channel })
      }
    } catch (err) {
      console.error(err)
    }
  })

  appEmitter.on('updateOrderProduct', function (data) {
    // incoming data in the form of data = {id, payload, thread, value, channel}
    const { id, payload, thread, message, value, channel} = data

    // locate order and product info from cache
    const order = orders.findOne({ order: payload })
    const record = cache.findOne({ barcode: order.upc })

    // set order status
    order.status = 'ready'

    // iterate through the cached products until we find our match

    for (let i = 0; i < record.products.length; i++) {
      if (record.products[i].barcode_number === value) {
        order.title = record.products[i].title
        order.image = record.products[i].images[0]
        order.upc = value
        break // exit on match
      }
    }

    // update the order with the product match
    try {
      orders.update(order)
    } catch (err) {
      console.error(err)
    }

    // notify user order is ready
    appEmitter.emit('orderReady', { user: id, ts: order.disambiguateTS, barcode: value, channel })
  })

  appEmitter.on('orderCreated', (data) => {
    const { user, ts, id, url, channel } = data

    // fetch the file from Slack and process the buffer
    getFileBuffer(user, id, ts, url, channel)

    // fuction above fires appEmitter.emit('extractUPC', { user, id, ts, buffer: memStore })
  })

  appEmitter.on('deleteOrder', function (data) {
    const { id, user } = data

    // take order ID and remove record and push new home view
    try {
      const order = orders.findOne({ order: id })
      orders.remove(order)
      appEmitter.emit('updateHomeView', { user })
    } catch (err) {
      console.error(err)
    }
  })

  appEmitter.on('submitOrder', function (data) {
    const { id, user } = data

    // update order to processing status and update home view
    try {
      const order = orders.findOne({ order: id })
      order.status = 'processing'
      orders.update(order)
      appEmitter.emit('updateHomeView', { user })
    } catch (err) {
      console.error(err)
    }
  })

  // if we have a partial barcode match we need to ask the user what product was intended

  appEmitter.on('promptUser', async function (data) {
    const { user, id, ts, products, channel } = data

    const messageTS = await promptUser(id, ts, channel, products)
    try {
      const order = orders.findOne({ order: id })
      order.disambiguateTS = messageTS
      orders.update(order)
      appEmitter.emit('updateHomeView', { user })
    } catch (err) {
      console.error(err)
    }
  })

  appEmitter.on('updateOrderType', function (data) {
    const { id, value, user } = data

    try {
      // pull the order by order ID so we can update the order type
      const order = orders.findOne({ order: id })
      order.type = value

      try {
        // save the order back to the DB
        orders.update(order)
        // update the home view
        appEmitter.emit('updateHomeView', { user })
      } catch (err) {
        // we have a DB write error
        console.error(err)
      }
    } catch (err) {
      // we have a db read error
      console.error(err)
    }
  })

  // processes date changes for order records

  appEmitter.on('updateOrderDate', function (data) {
    const { id, value, user } = data
    try {
      const order = orders.findOne({ order: id })
      order.date = value
      try {
        orders.update(order)
        appEmitter.emit('updateHomeView', { user })
      } catch (err) {
        // we have a DB write error
        console.error(err)
      }
    } catch (err) {
      // we have a DB read erro
      console.error(err)
    }
  })

  appEmitter.on('updateHomeView', async function (data) {
    const { user } = data

    try {
      // pull the user orders from the DB
      view.applyFind({ user })
      const userOrders = view.data()
      updateHomeView(user, userOrders)
    } catch (err) {
      // we had a problem reading the orders from the DB
      console.error(err)
    }
  })

  appEmitter.on('orderReady', async function (data) {
    const { user, id, ts, barcode, channel } = data

    try {
      await postOrderReady(channel, ts)
      appEmitter.emit('updateHomeView', { user })
    } catch (err) {
      console.error(err)
    }
  })

  appEmitter.on('upcReady', async function (data) {
    // when UPC is ready we can lookup the product in the database (mocked here with a general lookup API)
    // incomding data in form of data = {user, id, ts, barcode}

    const { user, id, ts, barcode, channel } = data // destructure incoming data

    const products = await lookupProduct(cache, barcode)

    if (products.length > 1) {
      // we have multiple products (this always occurs due to demo licese of barcode reader)
      appEmitter.emit('promptUser', { user, id, ts, products, channel })
    } else if (products.length === 1) {
      // we have a single product and we can update the record
      const order = orders.findOne({ order: id })
      order.title = products[0].title
      order.image = products[0].images[0]
      order.update()
    }
  })
}

module.exports = bindEvents
