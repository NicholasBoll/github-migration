const request = require('request-promise')
const fs = require('fs-extra')
const debug = require('debug')
const glob = require('glob')

const config = require('./config')

const repo = config.sourceRepo
const source = `${config.source.baseUrl}/${config.source.org}/${config.source.repo}`
const target = `${config.target.baseUrl}/${config.target.org}/${config.target.repo}`

const pageSize = 100

const getPage = (listId) => async (page) => {
  return JSON.parse(await request(`${source}/${listId}?state=all&per_page=${pageSize}&page=${page}`))
}

const fetchList = async (listId) => {
  let pageNumber = 1
  let results = []
  let resultSize = 0
  const getListPage = getPage(listId)
  
  do {
    debug('fetch')(`Fetching page ${pageNumber} of ${listId}`)
    const response = await getListPage(pageNumber)
    results = results.concat(response)
    resultSize = response.length
    // debug('fetch')(`Results length: ${results.length}`)
    pageNumber++
  } while(resultSize === pageSize)

  return results
}

const writeIssues = async (issues) => {
  await fs.ensureDir(`${repo}/issues`)
  await issues.forEach(async issue => {
    const fileName = `${repo}/issues/pr-${issue.number}.json`
    await fs.writeFile(fileName, JSON.stringify(issue, null, '  '))
  })
}

const replaceAll = (str, obj) => {
  let newStr = str
  for (let key in obj) {
    newStr = newStr.replace(key, obj[key])
  }
  return newStr
}

const writeList = async (name, items, hashMap) => {
  const fileName = `${repo}/${name}.json`
  await fs.writeFile(fileName, replaceAll(JSON.stringify(items, null, '  '), hashMap))
}

const getHashMap = async (repo) => {
  // get the mapping of all commits
  const hashFilename = glob.sync(`./${config.source.repo}*/**/object-id-map.old-new.txt`).pop()
  let hashMap = {}
  console.log(hashFilename)
  if (hashFilename) {
    const contents = (await fs.readFile(hashFilename)).toString().split('\n')
    hashMap = contents.reduce((result, line) => {
      const [oldHash, newHash] = line.split(' ')
      result[oldHash] = newHash
      return result
    }, {})
  }

  return hashMap
}

const migrate = async () => {

  // await fs.ensureDir(repo)
  // // get all the pull requests
  // const issues = await fetchList('issues')
  // await writeIssues(issues)
  // await [
  //   { listId: 'pulls/comments', fileName: 'pull-comments' },
  //   { listId: 'comments', fileName: 'comments' },
  //   { listId: 'issues/comments', fileName: 'issue-comments' }
  // ].forEach(async ({ listId, fileName}) => {
  //   const issueComments = await fetchList(listId)
  //   await writeList(fileName, issueComments, hashMap)
  // })
}

migrate()
