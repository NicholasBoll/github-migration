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

const getLowestIssueDownloaded = () => {
  const issueFilenameRegex = /issue-([0-9]+)\.json/;
  const issues = glob.sync(`${repo}/issues/issue-+([0-9]).json`)
    .map(filename => {
      // extract issue number from filename
      const matches = issueFilenameRegex.exec(filename);
      return parseInt(matches[1], 10);
    })
    .sort((a, b) => a - b); // ascending sort to get lowest issue number
  if (issues.length <= 1) {
    return undefined;
  }
  return issues[0] + 1; // add 1 just in case that issue was only partially downloaded.
}

const fetchIssues = async (lastIssueDownloaded) => {
  const issues = await fetchList('issues')
  const pulls = await fetchList('pulls')

  for (let issue of issues) {
    if (lastIssueDownloaded !== undefined && issue.number > lastIssueDownloaded) {
      // skip already downloaded issues -- this is our Resume functionality.
      continue;
    }
    if (issue.pull_request) {
      const pr = pulls.find(pull => pull.number === issue.number)
      const prReviews = await fetchList(`pulls/${issue.number}/reviews`)
      let comments = []
      for (let review of prReviews) {
        const reviewComments = await fetchList(`pulls/${issue.number}/reviews/${review.id}/comments`)
        review.comments = reviewComments
        comments = comments.concat(reviewComments)
      }
      const reviewFileName = `${repo}/issues/issue-${issue.number}-reviews.json`
      await fs.writeFile(reviewFileName, JSON.stringify(prReviews, null, '  '))
      const commentFileName = `${repo}/issues/issue-${issue.number}-review-comments.json`
      await fs.writeFile(commentFileName, JSON.stringify(comments, null, '  '))
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

const consolidateList = (name) => {
  const items = glob.sync(`${repo}/issues/issue-+([0-9])-${name}.json`)
    .map(file => JSON.parse(fs.readFileSync(file)))
    .reduce((acc, curr) => {
      acc = acc.concat(curr);
      return acc;
    }, []);
  const fileName = `${repo}/${name}.json`
  return fs.writeFile(fileName, JSON.stringify(items, null, '  '))
}

const writeList = (name) => (items) => {
  const fileName = `${repo}/${name}.json`
  return fs.writeFile(fileName, JSON.stringify(items, null, '  '))
}

const main = async () => {
  await fs.ensureDir(repo)
  await fs.ensureDir(`${repo}/issues`)

  // get all the issues
  const lastIssueDownloaded = getLowestIssueDownloaded();
  await fetchIssues(lastIssueDownloaded)
  await consolidateList('reviews')
  await consolidateList('review-comments')

  await Promise.all([
    { listId: 'pulls/comments', fileName: 'pull-comments' },
    { listId: 'comments', fileName: 'comments' },
    { listId: 'issues/comments', fileName: 'issue-comments' },
    { listId: 'commits', fileName: 'commits' },
    { listId: 'releases', fileName: 'releases' },
  ].map(({ listId, fileName}) => {
    return fetchList(listId)
      .then(writeList(fileName))
  }))
}

main().catch(console.error)
