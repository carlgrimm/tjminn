const axios = require('axios')

async function fetchItemInfo(barcode) {
    return new Promise(function(resolve, reject) {
        try {
            const response = axios.get(`https://api.barcodelookup.com/v3/products?barcode=${barcode}&formatted=y&key=gmfrs1ogqtg3p7y5ywycr02djhxljz`)
            resolve(response.data)
    
        } catch (err) {
            reject(err);
        }    
    })
}

module.exports = fetchItemInfo