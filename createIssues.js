const request = require('request-promise')
const fs = require('fs-extra')
const glob = require('glob')

const { sleep } = require('./utils')
const config = require('./config')
const users = require('./users')
const createMessage = require('./createMessage')
const processImages = require('./processImages')

const api = `${config.target.baseUrl}/${config.target.org}/${config.target.repo}`

if (!fs.pathExistsSync(`./${config.source.repo}/state.json`)) {
  console.log('Creating state file')

  fs.writeFileSync(`./${config.source.repo}/state.json`, '{}')
}

const headers = {
  'Accept': 'application/vnd.github.v3+json',
  'User-Agent': 'node.js'
}
if (config.target.token) {
  headers['Authorization'] = `token ${config.target.token}`
}

const bumpIssueCount = (issue) => {
  const state = JSON.parse(fs.readFileSync(`./${config.source.repo}/state.json`))

  state.issue = issue.number
  fs.writeFileSync(`./${config.source.repo}/state.json`, JSON.stringify(state, null, '  '))
}

const logError = (issue, err) => {
  console.log(`Could not create issue: ${issue.number}`)
  console.log(`Message: ${err}`)
  console.log(`To continue, manually create an issue on your target repo and increment the 'issue' in ./${config.source.repo}/state.json`)
  process.exit(1)
}

const createIssue = async (issue) => {
  console.log(`Creating issue: ${issue.number}`)
  await request({
    method: 'POST',
    headers,
    url: `${api}/issues`,
    body: {
      title: issue.title,
      body: `${createMessage(issue)}\n\n${await processImages(issue.body)}`,
    },
    json: true,
  })
  .then(response => {
    bumpIssueCount(issue)
    return response
  })
  .catch(err => {
    logError(issue, err)
  })
}

const createPull = async (pull) => {
  console.log(`Creating pull: ${pull.number}`)
  const body = {
    title: pull.title,
    body: `${createMessage(pull)}\n\n${await processImages(pull.body)}`,
    head: pull.base.sha === pull.head.sha ? 'refs/heads/master' : `pr${pull.number}head`,
    base: `pr${pull.number}base`,
    maintainer_can_modify: true,
  }
  await request({
    method: 'POST',
    headers,
    url: `${api}/pulls`,
    body,
    json: true,
  })
  .then(response => {
    bumpIssueCount(pull)
    return response
  })
  .catch(err => {
    logError(pull, err)
  })
}

const main = async () => {
  const issues = glob.sync(`${config.source.repo}/issues/issue-+([0-9]).json`)
    .map(file => JSON.parse(fs.readFileSync(file)))
    .sort((a, b) => a.number - b.number)

  const state = JSON.parse(await fs.readFile(`./${config.source.repo}/state.json`))
  for (let issue of issues) {
    if (issue.number <= (state.issue || 0)) {
      // we already processed this issue
      console.log(`Skipping ${issue.number}. Already processed`)
    } else if (issue.base) {
      await createPull(issue)
      await sleep(60 * 60 * 1000 / config.apiCallsPerHour)
    } else {
      await createIssue(issue)
      await sleep(60 * 60 * 1000 / config.apiCallsPerHour)
    }
  }
}

main().catch(console.error)
