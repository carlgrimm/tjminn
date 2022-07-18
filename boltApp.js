const { App, LogLevel } = require('@slack/bolt')
const appEmitter = require('./utils/globalEvents')

// Slack bolt app and settings

const app = new App({
  token: process.env.BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  logLevel: LogLevel.WARN
})

// --- Application Event Processors ---

// Process opening the application home screen
app.event('app_home_opened', async ({ event, client, logger }) => {
  // here we fire the event vs return the view directly from this function
  appEmitter.emit('updateHomeView', { user: event.user })
})

// Process the user selecting which is the intended product
app.action('disambiguateProduct', async ({ body, payload, action, ack, context, client, logger }) => {
  await ack()
  appEmitter.emit('updateOrderProduct', { user: body.user.id, payload: body.message.metadata.event_payload.id, thread: body.container.thread_ts, message: body.container.message_ts, value: payload.selected_option.value, channel: body.container.channel_id })
})

// Process the select of the order type
app.action('order_typeSelect', async ({ body, payload, action, ack, context, client, logger }) => {
  await ack()
  appEmitter.emit('updateOrderType', { id: action.block_id, value: action.selected_option.value, user: body.user.id })
})

// Process the selection of a date for a temporary stop flow order
app.action('order_dateSelect', async ({ body, payload, action, ack, context, client, logger }) => {
  await ack()
  appEmitter.emit('updateOrderDate', { id: action.block_id, value: action.selected_date, user: body.user.id })
})

// Process the delete order button action
app.action('order_delete', async ({ body, payload, action, ack, context, client, logger }) => {
  await ack()
  appEmitter.emit('deleteOrder', { id: action.value, user: body.user.id })
})

// Process the order submit action button
app.action('order_submit', async ({ body, payload, action, ack, context, client, logger }) => {
  await ack()
  appEmitter.emit('submitOrder', { id: action.value, user: body.user.id })
})

// examine each incoming message to the app and see if a file is attached
app.event('message', async ({ event, say, respond, body, client, logger }) => {
  // check if a file is attached to the message
  if (event.subtype === 'file_share') {
    // create an order for every image submitted

    for (let i = 0; i < event.files.length; i++) {
      appEmitter.emit('createOrder', { user: event.user, ts: event.ts, file: event.files[i], team: body.team_id, channel: event.channel, appID: body.api_app_id })

      // respond to the thread and let the user know we have started processing things
      await say({ text: 'We are working on this!', thread_ts: event.ts })
    }
  } else {
    // we have a message without a file share
    if (event.subtype === 'message_changed') {
      // do nothing
    } else {
      await say({ text: 'No barcode image attached!', thread_ts: event.ts })
    }
  }
})

module.exports = app
