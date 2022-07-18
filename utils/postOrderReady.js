const axios = require('axios')

async function postOrderReady (channel, ts, image64URL) {
  await axios.post('https://slack.com/api/chat.update',
    {
      channel: 'D03NEEH7N0G',
      ts,
      blocks: [
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: ':white_check_mark: Your Order is Ready! <slack://app?team=T03MJJULH8S&id=A03MJJP38V9&tab=home|*Click Here*>'
            }
          ]
        }

      ]
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.BOT_TOKEN}`,
        'Content-Type': 'application/json; charset=utf-8' // if you don't set the charset and use metadata it will reject your message
      }
    }
  )
}

module.exports = postOrderReady
