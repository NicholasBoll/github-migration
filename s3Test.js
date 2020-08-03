const AWS = require('aws-sdk')

const config = require('./config')

AWS.config.loadFromPath('./s3Config.json')

const s3 = new AWS.S3()
const bucketName = config.s3Bucket

/** 
 * Verify S3 bucket exists
 */
; (async () => {
  try {
    const data = await s3.headBucket({ Bucket: bucketName }).promise()
    console.log(`Bucket "${bucketName}" exists`)
  }
  catch(err){
    if(err.statusCode >= 400 && err.statusCode < 500) {
      console.log(`Bucket "${bucketName}" not found`)
    }
    throw err
  }
})()
