const fs = require('fs');

const config = require('./config')

const issueCommentsJson = `${config.source.repo}/issue-comments.json`;
const prCommentsJson = `${config.source.repo}/pull-comments.json`;

const issueComments = JSON.parse(fs.readFileSync(issueCommentsJson));
const prComments = JSON.parse(fs.readFileSync(prCommentsJson));

issueComments.map(issue => {
  const issueNumber = parseInt(issue.issue_url.split('/').pop())
  issue.issue_url = issue.issue_url.replace(`/issues/${issueNumber}`, `/issues/${issueNumber + config.increment}`);
});
fs.writeFileSync(issueCommentsJson, JSON.stringify(issueComments, null, 2))


prComments.map(issue => {
  const issueNumber = parseInt(issue.pull_request_url.split('/').pop())
  issue.pull_request_url = issue.pull_request_url.replace(`/pulls/${issueNumber}`, `/pulls/${issueNumber + config.increment}`);
  issue._links.pull_request.href = issue._links.pull_request.href.replace(`/pulls/${issueNumber}`, `/pulls/${issueNumber + config.increment}`);
});
fs.writeFileSync(prCommentsJson, JSON.stringify(prComments, null, 2))
