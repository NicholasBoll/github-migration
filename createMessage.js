const moment = require('moment')

const users = require('./users')
const config = require('./config')

const shortFormat = 'MMM D, YYYY'
const longFormat = 'dddd, MMMM Do YYYY, h:mm:ss a Z'
const formatDate = function formatDate(date) {
	const display = moment(date).format(shortFormat);
	const title = moment(date).format(longFormat);
	const html = '<time datetime="' + date + '" title="' + title + '">' + display + '</time>';
	return html;
}

const getAvatarUrl = user => {
  if (config.target.avatarUrl && users[user.login]) {
    return config.target.avatarUrl.replace('{id}', users[user.login].id)
  } else {
    return 'https://avatars1.githubusercontent.com/u/38261864?s=88&v=4' // `${user.avatar_url}&amp;r=x&amp;s=40`
  }
}

const getUserUrl = user => {
  const mappedUser = users[user.login]
  if (mappedUser) {
    return `/${mappedUser.target}`
  } else {
    return user.html_url
  }
}

const getUsername = user => {
  const mappedUser = users[user.login]
  if (mappedUser) {
    return `${mappedUser.target}`
  } else {
    return user.login
  }
}

const template = `
> [<img alt="Frank-Hassanabad" height="40" width="40" align="left" src="https://avatars0.githubusercontent.com/u/1151048?s=48&v=4">](/FrankHassanabad) **Authored by [Frank-Hassanabad](/FrankHassanabad)**
_<time datetime="2016-01-21T13:53:36Z" title="Thursday, January 21st 2016, 6:53:36 am -07:00">Jan 21, 2016</time>_
---
`

const createMessage = (issue) => {
	const creation = formatDate(issue.created_at);
	
	const createdAvatar = issue.user.avatar_url ? `[<img alt="${issue.user.login}" height="40" width="40" align="left" src="${getAvatarUrl(issue.user)}">](${getUserUrl(issue.user)})` : ''

	let closedAvatar = '';
	if (issue.closed_by){
		if (issue.closed_by.login == issue.user.login) {
			closedAvatar = ''
		} else {
			closedAvatar = `<img alt="${issue.closed_by.login}" height="20" width="20" src="${issue.closed_by.avatar_url}&amp;r=x&amp;s=20">`
		}
	}
	const closing = issue.closed_at ? formatDate(issue.closed_at) : ''

	let result = `> ${createdAvatar} **Authored by [${getUsername(issue.user)}](${getUserUrl(issue.user)})**\n_${creation}_`

	if (closing !== '') {
		result = result + "; closed";
		if (issue.closed_by) {
			result = result + ' by ' + issue.closed_by.login
		}
		result = result + '\n' + closing;
	}
	return `${result}\n---`;
}

module.exports = createMessage
