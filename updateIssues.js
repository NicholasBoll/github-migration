const request = require('request-promise')
const fs = require('fs-extra')
const glob = require('glob')

const { sleep } = require('./utils')
const config = require('./config')

const api = `${config.target.baseUrl}/${config.target.org}/${config.target.repo}`
const apiCallsPerHour = 3000 // for API rate limiting

const headers = {
  'Accept': 'application/vnd.github.v3+json',
  'User-Agent': 'node.js'
}
if (config.target.token) {
  headers['Authorization'] = `token ${config.target.token}`
}

const bumpIssueCount = (issue) => {
  const state = JSON.parse(fs.readFileSync(`./${config.source.repo}/state.json`))

  state.updateIssue = issue.number
  fs.writeFileSync(`./${config.source.repo}/state.json`, JSON.stringify(state, null, '  '))
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

const post = async (url, body) => {
  return request({
    method: 'POST',
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
    labels: (issue.labels || []).concat(['Github Import'])
  }
  await patch(url, body)
    .then(response => {
      console.log(`Set issue #${issue.number} state to ${issue.state}`)
      return response
    })
    .catch()
  await bumpIssueCount(issue)
}

const main = async () => {
  const issues = glob.sync(`${config.source.repo}/issues/issue-+([0-9]).json`)
    .map(file => JSON.parse(fs.readFileSync(file)))
    .sort((a, b) => a.number - b.number)
  
  // console.log(issues)
  const state = JSON.parse(await fs.readFile(`./${config.source.repo}/state.json`))
  for (let issue of issues) {
    if (issue.number <= (state.updateIssue || 0)) {
      console.log(`Skipping ${issue.number}. Already processed`)
    } else {
      await updateBranch(issue)
      await sleep(60 * 60 * 1000 / config.apiCallsPerHour)
    }
  }
}

main()
