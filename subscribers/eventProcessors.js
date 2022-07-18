'use strict'
const bx = require('barcode-js')
const appEmitter = require('../utils/globalEvents')
const lookupProduct = require('../utils/lookupProduct')
const promptUser = require('../utils/promptUser')
const postOrderReady = require('../utils/postOrderReady')
const updateHomeView = require('../utils/updateHomeView')
const getFileBuffer = require('../utils/getFileBuffer')

// function for loading event handlers and database collection dependancy injection
function bindEvents(orders, cache, view) {
  // handle emitter errors from appEmitter
  appEmitter.on('error', function (err) {
    console.error(err)
  })

  // Event handler to create new order in DB
  // incoming data in the form of {user, ts, file, channel, appID}
  appEmitter.on('createOrder', function (data) {
    const { user, ts, file, team, channel, appID } = data
    try {
      // create new order with defualt type of permanent using the file ID as our record locator
      orders.insert({
        order: file.id,
        user,
        team,
        channel,
        appID,
        url: file.url_private_download,
        upc: '',
        type: 'Permanent',
        status: 'requiresAnalysis'
      })
      // emit order created so we can kick off file analysis
      appEmitter.emit('orderCreated', { user, id: file.id, ts, url: file.url_private_download, channel })
    } catch (err) {
      console.error(err)
    }
  })

  // Event handler that will download a file from Slack as a buffer given a download URL
  // Incoming data in the form of { user, ts, id, url, channel }

  appEmitter.on('orderCreated', (data) => {
    const { user, ts, id, url, channel } = data

    // fetch the file from Slack and process the buffer
    // fuction above fires appEmitter.emit('extractUPC', { user, id, ts, buffer: memStore })
    getFileBuffer(user, id, ts, url, channel)
  })

  // Event handler to extract the image barcode from a buffer
  // incoming data in the form of data = {user, id, ts, barcode}
  appEmitter.on('extractUPC', async function (data) {
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

  // Event handler to update the order with the barcode found in the image
  // incoming data in the form of {user, id, ts, barcode, channel}
  appEmitter.on('updateOrderUPC', function (data) {
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

  // Event handler to lookup the product in the database (mocked here with a general lookup API)
  // incomding data in form of data = {user, id, ts, barcode, channel}
  appEmitter.on('upcReady', async function (data) {
    const { user, id, ts, barcode, channel } = data
    const products = await lookupProduct(cache, barcode)

    if (products.length > 1) {
      // we have multiple products (this always occurs due to demo licese of barcode reader)
      appEmitter.emit('promptUser', { user, id, ts, products, channel })
    } else if (products.length === 1) {
      // we have a single product and we can update the record
      try {
        const order = orders.findOne({ order: id })
        order.title = products[0].title
        order.image = products[0].images[0]
        order.update()
        appEmitter.emit('orderReady', { user, id, ts, products, channel })
      } catch (err) {
        console.error(err)
      }
    } else {
      // we have no products and something likely went wrong
      console.error('error no products returned')
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

  // Event handler to update the order with a selected product when multiple matches are found
  // incoming data in the form of data = {id, payload, thread, value, channel}

  appEmitter.on('updateOrderProduct', function (data) {
    const { user, payload, value, channel } = data

    // locate order and product info from db
    try {
      const order = orders.findOne({ order: payload })
      const record = cache.findOne({ barcode: order.upc })
      // set order status to ready
      order.status = 'ready'

      // iterate through the cached products until we find our match selected by the user

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
        // notify user order is ready
        appEmitter.emit('orderReady', { user, ts: order.disambiguateTS, barcode: value, channel, team: order.team, appID: order.appID })

        // refresh the home view
        appEmitter.emit('updateHomeView', { user })
      } catch (err) {
        // we have a DB write error
        console.error(err)
      }
    } catch (err) {
      // we have a DB read error
      console.error(err)
    }
  })

  // Event handlers to post the order is ready to the user

  appEmitter.on('orderReady', async function (data) {
    const { ts, channel, team, appID } = data
    try {
      postOrderReady(channel, ts, team, appID)
    } catch (err) {
      console.error(err)
    }
  })

  // Event handler to update home view for a given user

  appEmitter.on('updateHomeView', function (data) {
    const { user } = data
    try {
      // pull the user orders from the DB
      view.applyFind({ user })
      const userOrders = view.data()
      updateHomeView(user, userOrders)
    } catch (err) {
      console.error(err)
    }
  })

  // Event handler to remove order when they use the delete button
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

  // Event handler to submit order using the submit button

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
}

module.exports = bindEvents
