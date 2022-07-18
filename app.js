'use strict'
const app = require('./boltApp')
const Loki = require('lokijs')
const LokiFsStructuredAdapter = require('./node_modules/lokijs/src/loki-fs-structured-adapter')
const bindEvents = require('./subscribers/eventProcessors')

// will use this persistance adapter to autosave / autoload db from disk
const adapter = new LokiFsStructuredAdapter()

// setup the db with our adapter and db load funtion
const db = new Loki('stopFlowOrders.db', {
  adapter,
  autoload: true,
  autoloadCallback: databaseInitialize,
  autosave: true,
  autosaveInterval: 2000
})

// this funciton checks for dbs and restores from disk or creates them and is called before program load
async function databaseInitialize () {
  // init the orders collection to store active orders
  let orders = db.getCollection('orders')
  // check if orders exists, if not create
  if (orders === null) {
    orders = db.addCollection('orders')
  }

  // init the barcode API cache (saves the limited barcode lookup calls and is used for resolving multiple hits later)
  let cache = db.getCollection('cache')
  // check if cache exists, if not create
  if (cache === null) {
    cache = db.addCollection('cache')
  }

  // DB is ready and we can start the main program

  (async () => {
    // create view of pending orders for app home view
    // this allows for efficient retreival for the home view

    const view = orders.addDynamicView('orders')
    // add filter for order status
    view.applyWhere(function (obj) {
      return obj.status === 'ready' || obj.status === 'processing'
    })

    // bind our event listeners and pass db objects to listeners
    bindEvents(orders, cache, view)

    // Start the app
    await app.start(process.env.PORT || 3000)
  })()
}
