const { argv } = require('yargs')
const request = require('request-promise')

const testTarget = argv._[0] === 'source' ? 'source' : 'target'
const config = require('./config')[testTarget]

console.log(`Testing ${testTarget} repository`)

const url = `${config.baseUrl}/${config.org}/${config.repo}`
const headers = {
  'Accept': 'application/vnd.github.v3+json',
  'User-Agent': 'node.js'
}
if (config.token) {
  headers['Authorization'] = `token ${config.token}`
}
console.log('Testing a request')
console.log('url: ', url)
request({
  url,
  headers
})
  .then(resp => {
    console.log('Success!')
    process.exit(0)
  })
  .catch(e => {
    console.log('Failed!')
    console.log('Status Code:', e.statusCode)
    console.log('message:', e.message)
    process.exit(1)
  })
