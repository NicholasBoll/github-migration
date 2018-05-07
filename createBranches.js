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

const createBranch = async (issue) => {
  const ref = `refs/heads/pr${issue.number}base`
  await request({
    method: 'POST',
    headers,
    url: `${api}/git/refs`,
    body: {
      ref,
      sha: issue.base.sha,
    },
    json: true,
  }).catch(err => {
    console.log(`Unable to create ref: ${ref}`)
    console.log(err.message)
  })
}

const main = async () => {
  const issues = glob.sync(`${config.source.repo}/issues/issue-+([0-9]).json`)
    .map(file => JSON.parse(fs.readFileSync(file)))
    .sort((a, b) => a.number - b.number)
  
  // console.log(issues)
  for (let issue of issues) {
    if (issue.base) {
      console.log(`Creating branch for PR-${issue.number}`)
      await createBranch(issue)
    }
  }
}

main()
