const request = require('request-promise')
const fs = require('fs-extra')

const sourceBaseUrl = "https://github.schq.secious.com/api/v3/repos"
const sourceRepo = "WebUI/WebConsoleAPI"
const source = `${sourceBaseUrl}/${sourceRepo}`

const targetBaseUrl = "https://api.github.com"
const targetRepo = "logrhythm/web-console-api"
const target = `${targetBaseUrl}${targetRepo}`

const migrate = async () => {
  // get all the pull requests
  let page = 1
  await fs.ensureDir('pull-requests')
  while(true) {
    console.log('processing page', page)
    const fileName = `pull-requests/page-${page}.json`
    if (await fs.pathExists(fileName)) {
      page++
      continue
    }

    const response = JSON.parse(await request(`${source}/issues?state=all&page=${page}`))
    if (response.length === 0) {
      break
    }

    await fs.writeFile(fileName, JSON.stringify(response, null, '  '))
    page++
    if (page > 100) {
      break
    }
  }
}

migrate()
