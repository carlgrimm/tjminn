const axios = require('axios')

async function postOrderReady (channel, ts, team, appHome) {
  await axios.post('https://slack.com/api/chat.update',
    {
      channel,
      ts,
      blocks: [
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `:white_check_mark: Your Order is Ready! <slack://app?team=${team}&id=${appHome}&tab=home|*Click Here*>`
            }
          ]
        }

      ]
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.BOT_TOKEN}`,
        'Content-Type': 'application/json; charset=utf-8' // if you don't set the charset it will reject your message
      }
    }
  )
}

module.exports = postOrderReady
