const request = require('request-promise')
const moment = require('moment')
const fs = require('fs-extra')
const glob = require('glob')

const { sleep } = require('./utils')
const config = require('./config')
const users = require('./users')
const createMessage = require('./createMessage')
const processImages = require('./processImages')

const api = `${config.target.baseUrl}/${config.target.org}/${config.target.repo}`

const headers = {
  'Accept': 'application/vnd.github.v3+json',
  'User-Agent': 'node.js'
}
if (config.target.token) {
  headers['Authorization'] = `token ${config.target.commentToken || config.target.token}`
}

const post = async (url, body) => {
  return request({
    method: 'POST',
    headers,
    url,
    body,
    json: true
  })
}

let commits = []
/**
 * Figure out if a commit exists
 * @param {string} sha
 */
const commitExists = async (sha) => {
  if (!commits.length) {
    commits = JSON.parse(await fs.readFile(`${config.source.repo}/commits.json`))
  }

  return !!commits.find(commit => commit.sha === sha)
}

const setCommentProcessed = async (id, newId = true) => {
  console.log(`Setting ${id} as processed`)
  const state = JSON.parse(await fs.readFile(`./${config.source.repo}/state.json`))

  state.comments = state.comments || {}
  state.comments[id] = newId
  await fs.writeFile(`./${config.source.repo}/state.json`, JSON.stringify(state, null, '  '))
}

const setReviewProcessed = async (id, newId = true) => {
  console.log(`Setting ${id} as processed`)
  const state = JSON.parse(await fs.readFile(`./${config.source.repo}/state.json`))

  state.reviews = state.reviews || {}
  state.reviews[id] = newId
  await fs.writeFile(`./${config.source.repo}/state.json`, JSON.stringify(state, null, '  '))
}

const isCommentProcessed = async (id) => {
  const state = JSON.parse(await fs.readFile(`./${config.source.repo}/state.json`))

  return !!(state.comments || {})[id]
}

const isReviewProcessed = async (id) => {
  const state = JSON.parse(await fs.readFile(`./${config.source.repo}/state.json`))

  return !!(state.reviews || {})[id]
}

const isReviewComment = comment => !!comment.state
const isPullRequestComment = comment => !!comment.pull_request_url
const isCommitComment = comment => !!comment.commit_id && !comment.pull_request_url

const logError = (comment, err) => {
  console.log(`Could not create comment: ${comment.id}`)
  console.log(`Message: ${err}`)
  // process.exit(1)
}

const createComment = async (comment, comments) => {
  const { id } = comment
  if (isReviewComment(comment)) {
    await createReview(comment)
  } else if (isPullRequestComment(comment)) {
    await createPullRequestComment(comment, comments)
  } else if (isCommitComment(comment)) {
    await createCommitComment(comment, comments)
  } else {
    await createIssueComment(comment)
  }
}

const getEvent = (state) => {
  switch(state) {
    case 'APPROVED':
      return 'APPROVE'
    case 'CHANGES_REQUESTED':
      return 'REQUEST_CHANGES'
    default:
      return ''
  }
}

const createReview = async (comment) => {
  const { id } = comment

  if (await isReviewProcessed(id)) {
    console.log(`Review ${id} already processed`)
  } else if (comment.state === 'COMMENTED') {
    console.log(`Review ${id} is a comment - skipping`)
  } else if (comment.state === 'DISMISSED') {
    console.log(`Review ${id} was dismissed - skipping`)
  } else {
    const number = comment.pull_request_url.split('/').pop()
    const url = `${api}/pulls/${number}/reviews`
    const event = getEvent(comment.state)
    if (event) {
      const body = {
        commit_id: comment.commit_id,
        body: comment.body,
        event,
        comments: []
      }
      await post(url, body)
        .then(async response => {
          await setReviewProcessed(id, response.id)
          return response
        })
        .catch(err => {
          console.log(`Could not create review ${id}`)
          logError(comment, err)
        })
    } else {
      console.log(`Review ${id} has no event type ${comment} - skipping`)
    }
  }
}

const createPullRequestComment = async (comment, comments = []) => {
  const { id } = comment
  const issueNumber = comment.pull_request_url.split('/').pop()
  const url = `${api}/pulls/${issueNumber}/comments`
  if (await isCommentProcessed(id)) {
    console.log(`Comment ${id} already processed`)
  } else {
    const commentBody = await processImages(comment.body)
    console.log(`Adding comment ${id} to ${url}`)
    let body
    const reply = comments.find(c => c.original_commit_id === comment.original_commit_id && c.original_position === comment.original_position && c.diff_hunk === comment.diff_hunk)
    if (reply) {
      const state = JSON.parse(await fs.readFile(`./${config.source.repo}/state.json`))
      body = {
        body: `${createMessage(comment)}\n\n\n${commentBody}`,
        in_reply_to: (state.comments || {})[reply.id],
      }
    } else {
      body = {
        body: `${createMessage(comment)}\n\n\n${commentBody}`,
        commit_id: comment.original_commit_id,
        path: comment.path,
        position: comment.original_position,
      }
    }
    await post(url, body)
      .then(async response => {
        await setCommentProcessed(id, response.id)
      })
      .catch(err => {
        console.log(`Commit ${comment.original_commit_id} no longer exists`)
        const body = {
          body: `${createMessage(comment)}\n> **Outdated (history rewrite)** - original diff\n---\n\`\`\`diff\n${comment.diff_hunk}\n\`\`\`\n\n\n${commentBody}`,
          commit_id: comment.commit_id,
          path: comment.path,
          position: comment.position == null ? comment.original_position : comment.position,
        }
        return post(url, body)
          .then(async response => {
            await setCommentProcessed(id, response.id)
          })
          .catch(async err => {
            if (err.error && err.error && err.error.errors && err.error.errors[0].field) {
              console.log(`Commit ${comment.commit_id} no longer exists (someone did a force push)`)
              console.log('Skipping')
            } else {
              logError(comment, err)
            }
            await setCommentProcessed(id, true)
          })
      })
      await sleep(60 * 60 * 1000 / config.apiCallsPerHour)
  }
}

const createCommitComment = async (comment) => {
  const { id } = comment
	const sha = comment.commit_id;
  const url = `${api}/commits/${sha}/comments`
  const commentBody = await processImages(comment.body)

  if (await isCommentProcessed(id)) {
    console.log(`Comment ${id} already processed`)
  } else if (!await commitExists(sha)) {
    console.log(`Commit ${sha} no longer exists`)
  } else {
    console.log(`Adding comment ${id} to ${url}`)
    const body = {
      body: `${createMessage(comment)}\n\n\n${commentBody}`,
      sha,
			path: comment.path,
			position: comment.position
    }

    await post(url, body)
      .then(async response => {
        await setCommentProcessed(id, response.id)

        return response
      })
      .catch(err => {
        logError(comment, err)
      })

    await sleep(60 * 60 * 1000 / config.apiCallsPerHour)
  }
}

const createIssueComment = async (comment) => {
  const { id } = comment
  const issueNumber = comment.issue_url.split('/').pop()
  const url = `${api}/issues/${issueNumber}/comments`
  const commentBody = await processImages(comment.body)

  if (await isCommentProcessed(id)) {
    console.log(`Comment ${id} already processed`)
  } else {
    console.log(`Adding comment ${id} to ${url}`)
    const body = {
      body: `${createMessage(comment)}\n\n\n${commentBody}`
    }
    await post(url, body)
      .then(async response => {
        await setCommentProcessed(id, response.id)

        return response
      })
      .catch(err => {
        logError(comment, err)
      })

    await sleep(60 * 60 * 1000 / config.apiCallsPerHour)
  }
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
  const issueComments = JSON.parse(await fs.readFile(`${config.source.repo}/issue-comments.json`))
  const commitComments = JSON.parse(await fs.readFile(`${config.source.repo}/comments.json`))
  const pullComments = JSON.parse(await fs.readFile(`${config.source.repo}/pull-comments.json`))
  const reviewComments = JSON.parse(await fs.readFile(`${config.source.repo}/review-comments.json`))
  const reviews = JSON.parse(await fs.readFile(`${config.source.repo}/reviews.json`))
  const comments = []
    .concat(issueComments, commitComments, pullComments, reviewComments, reviews)
    .sort((a, b) => (a.created_at || a.submitted_at) > (b.created_at || b.submitted_at) ? 1 : -1)

  console.log(`Comments to process: ${comments.length}`)

  let processed = 0
  for (let comment of comments) {
    console.log(`ETA: ${formatDuration((comments.length - processed) / config.apiCallsPerHour * 60 * 60 * 1000)}`)
    await createComment(comment, comments)
    processed++
  }

  // await fs.writeFile(`${config.source.repo}/all-comments.json`, JSON.stringify(comments, null, '  '))
}

main().catch(console.error)
