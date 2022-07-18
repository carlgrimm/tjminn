const axios = require('axios')
const { createHomeView } = require('./blockFactory')

async function updateHomeView (user, orders) {
  try {
    await axios.post('https://slack.com/api/views.publish',
      {
        user_id: user,
        view: createHomeView(orders)
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.BOT_TOKEN}`,
          'Content-Type': 'application/json; charset=utf-8'
        }
      }
    )
  } catch (err) {
    // should log error and retry
    console.error(err)
  }
}

module.exports = updateHomeView
