const request = require('request-promise')

const config = require('./config')
const { uploadImage } = require('./s3')

const replaceAll = (str, obj) => {
  let newStr = str
  for (let key in obj) {
    newStr = newStr.replace(new RegExp(key, 'g'), obj[key])
  }
  return newStr
}

/**
 * 
 * @param {string} content
 */
const processImages = async (content) => {
  const imgRegExp = /!\[([^\]]+)\]\(([^\)]+)\)/
  const imgMatchAll = new RegExp(imgRegExp, 'g')

  if (config.s3Bucket) {
    return Promise.all(
      (content.match(imgMatchAll) || [])
        .map(img => {
          const [_, title, oldUrl] = img.match(imgRegExp)
          return request({
            method: 'GET',
            encoding: null, // force a buffer
            url: oldUrl,
            transform: (body, response) => ({
              headers: response.headers,
              body,
            })
          })
            // .then(console.log)
            // .then(() => { process.exit(1) })
            .then(response => uploadImage(config.s3Bucket, response.headers['content-type'])(response.body))
            .then(newUrl => {
              console.log('Uploaded image: ', newUrl)
              return { oldUrl, newUrl }
            })
        })
    ).then(replacements => {
      return replacements.reduce(
        (result, { oldUrl, newUrl }) => {
          return result.replace(oldUrl, newUrl)
        },
        content
      )
    })
  } else {
    // no s3 bucket, just return content
    return Promise.resolve(content)
  }
}

module.exports = processImages
