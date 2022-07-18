// create a function that takes a list of orders and creates the order objects for the App Home View using

// using string literals to build a dynamic card for each of the orders based on values from the DB

function createHomeView (orders) {
  const view = {
    // Home tabs must be enabled in your app configuration page under "App Home"
    type: 'home',
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: 'Current Stop Flow Orders:',
          emoji: true
        }
      },
      {
        type: 'divider'
      }
    ]
  }

  for (let i = 0; i < orders.length; i++) {
    const template = `[{
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": "${orders[i].title}",
                    "emoji": true
                }
            },
            ${orders[i].status === 'processing'
        ? `{
                "type": "section",
                "text": {
                  "type": "mrkdwn",
                  "text": "The team is processing your order and updates will appear here."
                }
              },`
        : `
            {
                "type": "image",
                "image_url": "${orders[i].image}",
                "alt_text": "${orders[i].title}"
            },
            {
                "type": "actions",
                "block_id": "${orders[i].order}",
                "elements": [
                    {
                        "type": "static_select",
                        "placeholder": {
                            "type": "plain_text",
                            "text": "Order Type?"
                        },
                        "initial_option": ${orders[i].type === 'Permanent'
          ? `{
                                "text": {
                                    "type": "plain_text",
                                    "text": "Permanent"
                                },
                                "value": "Permanent"
                            }`
          : `{
                                "text": {
                                    "type": "plain_text",
                                    "text": "Temporary"
                                },
                                "value": "Temporary"
                            }`}
                            ,
                        "action_id": "order_typeSelect",
                        "options": [
                            {
                                "text": {
                                    "type": "plain_text",
                                    "text": "Permanent"
                                },
                                "value": "Permanent"
                            },
                            {
                                "text": {
                                    "type": "plain_text",
                                    "text": "Temporary"
                                },
                                "value": "Temporary"
                            }
                        ]
                    },
                    ${orders[i].type === 'Temporary' // if order type is temporary we need to insert a date picker here
          ? `{
                        "type": "datepicker",
                        ${orders[i].date ? `"initial_date": "${orders[i].date}",` : ''}
                        "action_id": "order_dateSelect"
                    },`
          : ''}
                    {
                        "type": "button",
                        "action_id": "order_delete",
                        "style": "danger",
                        "value": "${orders[i].order}",
                        "text": {
                            "type": "plain_text",
                            "text": "Delete",
                            "emoji": true
                            
                        }
                    },
                    {
                        "type": "button",
                        "action_id": "order_submit",
                        "style": "primary",
                        "value": "${orders[i].order}",
                        "text": {
                            "type": "plain_text",
                            "text": "Submit",
                            "emoji": true
                        }
                    }
                ]
            },`} 
            {
                "type": "divider"
            }]`
    // JSON parse try catch
    try {
      const converted = JSON.parse(template)
      // add the lists together to build the view
      view.blocks = view.blocks.concat(converted)
    } catch (err) {
      console.error(err)
    }
  }

  return view
}

module.exports = createHomeView
