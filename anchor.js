const fs = require('fs-extra')
const request = require('request-promise')

const config = require('./config')
const source = `${config.source.baseUrl}/${config.source.org}/${config.source.repo}`

const headers = {
  'Accept': 'application/vnd.github.v3+json',
  'User-Agent': 'node.js'
}
if (config.source.token) {
  headers['Authorization'] = `token ${config.source.token}`
}

const main = async () => {
  const orphanedCommits = JSON.parse(await fs.readFile(`${config.source.repo}/missing-commits.json`))
  let anchoredCommits = []
  console.log(`Orphaned commits: ${orphanedCommits.length}`)

  for (let commit of orphanedCommits) {
    await request({
      method: 'POST',
      headers,
      url: `${source}/git/refs`,
      data: {
        ref: `refs/anchor/${commit}`,
        sha: commit
      }
    })
    .then(response => {
      anchoredCommits.push(commit)
      return response
    })
    .catch(err => {
      console.log(`Could not create an anchor for ${commit}`)
    })
  }

  console.log(`Anchored commits: ${anchoredCommits.length}`)
}

main()
