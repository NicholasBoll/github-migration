const request = require('request-promise')
const fs = require('fs-extra')
const glob = require('glob')

const { sleep } = require('./utils')
const config = require('./config')
const createMessage = require('./createMessage')

const api = `${config.target.baseUrl}/${config.target.org}/${config.target.repo}`

const headers = {
  'Accept': 'application/vnd.github.v3+json',
  'User-Agent': 'node.js'
}
if (config.target.token) {
  headers['Authorization'] = `token ${config.target.token}`
}

const bumpIssueCount = (issue) => {
  const state = JSON.parse(fs.readFileSync(`./${config.source.repo}/state.json`))

  state.deletedIssue = issue.number
  fs.writeFileSync(`./${config.source.repo}/state.json`, JSON.stringify(state, null, '  '))
}

const deleteBranch = async (issue) => {
  const baseUrl = `${api}/git/refs/heads`
  if (issue.closed_at) {
    // delete pr base
    await request.delete({
      headers,
      url: `${baseUrl}/pr${issue.number}base`,
    })
    .then(response => {
      console.log(`Deleted 'pr${issue.number}base'`)
      return response
    })
    .catch(err => {
      console.log(`Failed to delete 'pr${issue.number}base'`, err.message)
    })

    // delete pr head
    await request.delete({
      headers,
      url: `${baseUrl}/pr${issue.number}head`,
    })
    .then(response => {
      console.log(`Deleted 'pr${issue.number}head'`)
      return response
    })
    .catch(err => {
      console.log(`Failed to delete 'pr${issue.number}head'`, err.message)
    })
  }
  await bumpIssueCount(issue)
  await sleep(60 * 60 * 1000 * 2 / config.apiCallsPerHour)
}

/**
 * Takes milliseconds of elapsed time and creates a string like '05m 10s'
 * @param duration milliseconds
 */
const formatDuration = (duration) => {
  const seconds = duration / 1000
  return new Date((seconds % 86400) * 1000)
    .toUTCString()
    .replace(/.*(\d{2}):(\d{2}):(\d{2}).*/, '$1h $2m $3s')
    .replace('00h ', '')
    .replace('00m ', '')
    .replace('00s', '')
    .trim()
}

const main = async () => {
  const issues = glob.sync(`${config.source.repo}/issues/issue-+([0-9]).json`)
    .map(file => JSON.parse(fs.readFileSync(file)))
    .sort((a, b) => a.number - b.number)
  
  // console.log(issues)
  const state = JSON.parse(await fs.readFile(`./${config.source.repo}/state.json`))
  let processed = 0  
  for (let issue of issues) {
    if (issue.number <= (state.deletedIssue || 0)) {
      console.log(`Skipping ${issue.number}. Already processed`)
    } else {
      console.log(`ETA: ${formatDuration((issues.length - processed) / config.apiCallsPerHour * 60 * 60 * 1000)}`)      
      await deleteBranch(issue)
    }
    processed++
  }
}

main()
