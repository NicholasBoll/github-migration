const request = require('request')
const fs = require('fs-extra')

const spawn = require('./spawn')
const config = require('./config')

const version = '1.13.0'
const bfgUrl = `http://repo1.maven.org/maven2/com/madgag/bfg/${version}/bfg-${version}.jar`
const bfgPath = `./bfg-${version}.jar`

const download = () => {
  return new Promise((resolve, reject) => {
    if (fs.pathExistsSync(bfgPath)) {
      resolve()
    } else {
      const r = request(bfgUrl).pipe(fs.createWriteStream(bfgPath))
      r.on('finish', (err) => {
        if (err) {
          return reject(err)
        } else {
          resolve()
        }
      })
    }
  })
}

download()
