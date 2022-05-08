const AWS = require('aws-sdk')
const uuid = require('uuid/v4')

let s3 = undefined;

/**
 * Upload an image to s3
 * @param {string} bucket
 * @returns {(contents: AWS.S3.Body) => Promise<string>}
 */
const uploadImage = (bucket, contentType) => async (contents) => {
  if (!s3) {
    AWS.config.loadFromPath('./s3Config.json')
    s3 = new AWS.S3()
  }
  return new Promise((resolve, reject) => {
    const filename = uuid()
    s3.putObject({
      Bucket: bucket,
      Key: filename,
      Body: contents,
      ContentType: contentType,
      ACL: 'public-read'
    }, (err, data) => {
      if (err) {
        reject(err)
      } else {
        resolve(`https://${bucket}.s3.amazonaws.com/${filename}`)
      }
    })
  })
}

module.exports = {
  uploadImage,
}
