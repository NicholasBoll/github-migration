const request = require('request-promise')
const fs = require('fs-extra')
const glob = require('glob')

const config = require('./config')

const repo = config.source.repo
const source = `${config.source.baseUrl}/${config.source.org}/${config.source.repo}`
const target = `${config.target.baseUrl}/${config.target.org}/${config.target.repo}`

const pageSize = 100

const headers = {
  'Accept': 'application/vnd.github.v3+json',
  'User-Agent': 'node.js'
}
if (config.source.token) {
  headers['Authorization'] = `token ${config.source.token}`
}

const getPage = (listId) => async (page) => {
  return JSON.parse(await request({
    headers,
    url: `${source}/${listId}?state=all&per_page=${pageSize}&page=${page}`
  }))
}

const fetchList = async (listId) => {
  let pageNumber = 1
  let results = []
  let resultSize = 0
  const getListPage = getPage(listId)
  
  do {
    console.log(`Fetching page ${pageNumber} of ${listId}`)
    const response = await getListPage(pageNumber)
    results = results.concat(response)
    resultSize = response.length
    // console.log(`Results length: ${results.length}`)
    pageNumber++
  } while(resultSize === pageSize)

  return results
}

/**
 * 
 * @param {{}[]} issues 
 * @param {{}[]} pulls 
 */
const writeIssues = async (issues, pulls) => {
  await fs.ensureDir(`${repo}/issues`)
  for (let issue of issues) {
    if (issue.pull_request) {
      const pr = pulls.find(pull => pull.number === issue.number)
      if (pr) {
        issue.base = pr.base
        issue.head = pr.head
        issue.merged_at = pr.merged_at
      }
    }
    const fileName = `${repo}/issues/issue-${issue.number}.json`
    await fs.writeFile(fileName, JSON.stringify(issue, null, '  '))
  }
}

const writeList = async (name, items) => {
  const fileName = `${repo}/${name}.json`
  await fs.writeFile(fileName, JSON.stringify(items, null, '  '))
}

const migrate = async () => {

  await fs.ensureDir(repo)
  // get all the pull requests
  const issues = await fetchList('issues')
  const pulls = await fetchList('pulls')
  await writeIssues(issues, pulls)
  // await Promise.all([
  //   { listId: 'pulls/comments', fileName: 'pull-comments' },
  //   { listId: 'comments', fileName: 'comments' },
  //   { listId: 'issues/comments', fileName: 'issue-comments' },
  //   { listId: 'commits', fileName: 'commits' },
  // ].map(async ({ listId, fileName}) => {
  //   const issueComments = await fetchList(listId)
  //   await writeList(fileName, issueComments)
  // }))
}

migrate()
