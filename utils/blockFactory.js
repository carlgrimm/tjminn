function formatMultipleProductBlocks (id, products) {
  // console.log('INCOMING PRODUCTS FOR BLOCK')
  const messageBlock = [
    {
      type: 'section',
      block_id: `disambiguate_${id}`,
      text: {
        type: 'mrkdwn',
        text: 'We had trouble reading the full barcode. Please select the item:'
      },
      accessory: {
        action_id: 'disambiguateProduct',
        type: 'static_select',
        placeholder: {
          type: 'plain_text',
          text: 'Select an item'
        },
        options: []
      }
    }
  ]

  for (let i = 0; i < products.length; i++) {
    // console.log('ITERATION', i)
    const safeTitle = products[i].title.replace(/("|“|”)/g, '\\"')
    // console.log('SAFE TITLE:', safeTitle)
    const option = `{
              "text": {
                "type": "plain_text",
                "text": "${safeTitle.substring(0, 75)}"
              },
              "value": "${products[i].barcode_number}"
            }`
    // Dconsole.log('about to parse')

    try {
      const parsed = JSON.parse(option)
      messageBlock[0].accessory.options.push(parsed)
    } catch (err) {
      console.error(err)
    }
  }

  return messageBlock
}

function createHomeView (orders) {
  const view = {
    // Home tabs must be enabled in your app configuration page under 'App Home'
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
  // console.log('Creating Order View List', orders)
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
          ? `
          {
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
    try {
      const converted = JSON.parse(template)
      view.blocks = view.blocks.concat(converted) // add the lists together to build the view
    } catch (err) {

    }
  }

  return view
}

module.exports = {
  formatMultipleProductBlocks,
  createHomeView
}
