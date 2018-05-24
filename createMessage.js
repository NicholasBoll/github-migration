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

const createMessage = (issue) => {
	const creation = formatDate(issue.created_at);
	
	const createdAvatar = issue.user.avatar_url ? `[<img alt="${issue.user.login}" height="40" width="40" align="left" src="${getAvatarUrl(issue.user)}">](${getUserUrl(issue.user)})` : ''

  const merged_at = issue.merged_at ? `Merged ${formatDate(issue.merged_at)}` : ''
  const closed_at = issue.closed_at ? `Closed ${formatDate(issue.closed_at)}` : ''
  const line3 = `_${merged_at || closed_at}_`.replace('__', '') // prevent possible `__` in comments

  return `
    > ${createdAvatar} **Authored by [${getUsername(issue.user)}](${getUserUrl(issue.user)})**
    _${creation}_
    ${line3}
    ---
  `.trim().split('\n').map(line => line.trim()).join('\n')
}

module.exports = createMessage
