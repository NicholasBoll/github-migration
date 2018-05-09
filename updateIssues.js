const request = require('request-promise')
const fs = require('fs-extra')
const glob = require('glob')

const config = require('./config')
const api = `${config.target.baseUrl}/${config.target.org}/${config.target.repo}`

const headers = {
  'Accept': 'application/vnd.github.v3+json',
  'User-Agent': 'node.js'
}
if (config.target.token) {
  headers['Authorization'] = `token ${config.target.token}`
}

const patch = async (url, body) => {
  return request({
    method: 'PATCH',
    headers,
    url,
    body,
    json: true
  })
}

const updateBranch = async (issue) => {
  const url = `${api}/issues/${issue.number}`
  const body = {
    state: issue.state,
    labels: ['Github Import']
  }
  await patch(url, body)
    .then(response => {
      console.log(`Set issue #${issue.number} state to ${issue.state}`)
      return response
    })
    .catch()
}

const main = async () => {
  const issues = glob.sync(`${config.source.repo}/issues/issue-+([0-9]).json`)
    .map(file => JSON.parse(fs.readFileSync(file)))
    .sort((a, b) => a.number - b.number)
  
  // console.log(issues)
  for (let issue of issues) {
    await updateBranch(issue)
  }
}

main()
