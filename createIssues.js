const request = require('request-promise')
const moment = require('moment')
const fs = require('fs')
const glob = require('glob')

const config = require('./config')
const users = require('./users')

const api = `${config.target.baseUrl}/${config.target.org}/${config.target.repo}`

const headers = {
  'Accept': 'application/vnd.github.v3+json',
  'User-Agent': 'node.js'
}
if (config.target.token) {
  headers['Authorization'] = `token ${config.target.token}`
}

const shortFormat = 'MMM D, YYYY'
const longFormat = 'dddd, MMMM Do YYYY, h:mm:ss a Z'
const formatDate = function formatDate(date) {
	const display = moment(date).format(shortFormat);
	const title = moment(date).format(longFormat);
	const html = '<time datetime="' + date + '" title="' + title + '">' + display + '</time>';
	return html;
}

const getAvatarUrl = (issue) => {
  if (config.target.avatarUrl && users[issue.user.login]) {
    return config.target.avatarUrl.replace('{id}', users[issue.user.login].id)
  } else {
    return `${issue.user.avatar_url}&amp;r=x&amp;s=140`
  }
}

const createMessage = (issue) => {
	const creation = formatDate(issue.created_at);
	
	const createdAvatar = issue.user.avatar_url ? `<img alt="${issue.user.login}" class="avatar js-avatar" height="20" src="${getAvatarUrl(issue)}" width="20">` : ''

	let closedAvatar = '';
	if (issue.closed_by){
		if (issue.closed_by.login == issue.user.login) {
			closedAvatar = ''
		} else {
			closedAvatar = `<img alt="${issue.closed_by.login}" class="avatar js-avatar" height="20" src="${issue.closed_by.avatar_url}&amp;r=x&amp;s=140" width="20">`
		}
	}
	const closing = issue.closed_at ? formatDate(issue.closed_at) : ''

	let result = `> ${createdAvatar} ${closedAvatar} Authored by ${issue.user.login} on ${creation}`

	if (closing !== '') {
		result = result + "; closed";
		if (issue.closed_by) {
			result = result + ' by ' + issue.closed_by.login
		}
		result = result + ' on ' + closing;
	}
	return result;
}

const bumpIssueCount = (issue) => {
  const state = JSON.parse(fs.readFileSync('./state.json'))

  state.issue = issue.number
  fs.writeFileSync('./state.json', JSON.stringify(state, null, '  '))
}

const logError = (issue, err) => {
  console.log(`Could not create issue: ${issue.number}`)
  console.log(`Message: ${err}`)
  console.log(`To continue, manually create an issue on your target repo and increment the 'issue' in './state.json'`)
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
      body: `${issue.body}\r\n\r\n${createMessage(issue)}`,
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
    body: `${createMessage(pull)}\r\n\r\n${pull.body}`,
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

  const state = JSON.parse(fs.readFileSync('./state.json'))
  for (let issue of issues) {
    if (issue.number <= (state.issue || 0)) {
      // we already processed this issue
      console.log(`Skipping ${issue.number}. Already processed`)
    } else if (issue.base) {
      await createPull(issue)
    } else {
      await createIssue(issue)
    }
  }
}

main()
