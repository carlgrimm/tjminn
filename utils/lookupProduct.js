const axios = require('axios')

async function lookupProduct (cache, barcode) {
  // first we check the cache to see if we have seen this before
  const cacheHit = cache.findOne({ barcode })

  // if no result in cache we call the API
  if (cacheHit === null) {
    try {
      const response = await axios.get(`https://api.barcodelookup.com/v3/products?barcode=${barcode}&formatted=y&key=vioktrfap55cf3ef0z7bleyzi12eaa`)

      // store the product results in the cache
      cache.insertOne({
        barcode,
        products: response.data.products
      })

      // return product results
      return response.data.products
    } catch (err) {
      console.error(err.response)
    }
  } else {
    // return found prducts from cache
    return cacheHit.products
  }
}

module.exports = lookupProduct
