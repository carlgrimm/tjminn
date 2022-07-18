const axios = require('axios')
const { formatMultipleProductBlocks } = require('./blockFactory')

async function promptUser (id, ts, channel, products) {
  // create blocks for each product
  const blocks = formatMultipleProductBlocks(id, products)

  // post message to thread prompting user to select from the multiple product matches
  try {
    const response = await axios.post('https://slack.com/api/chat.postMessage',
      {
        channel,
        thread_ts: ts,
        blocks,
        metadata: {
          event_type: 'disambiguateProduct',
          event_payload: {
            id
          }
        }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.BOT_TOKEN}`,
          'Content-Type': 'application/json; charset=utf-8' // if you don't set the charset and use metadata it will reject your message
        }
      }
    )
    // we return the ts of this message as later after they have selected the option we update this message
    return response.data.ts
  } catch (err) {
    console.error(err)
  }
}

module.exports = promptUser
