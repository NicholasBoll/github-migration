const fs = require('fs-extra');
const os = require('os');
const path = require('path');

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

const packedRefsPath = `${config.source.repo}.git/packed-refs`;
const packedRefsText = fs.readFileSync(packedRefsPath, { encoding: 'utf-8' });
const refs = packedRefsText.split(os.EOL);
const refNum = /refs\/heads\/pr([0-9]+)head/
const updated = refs.map(ref => {
  const match = ref.match(refNum);
  if (match && match.length === 2) {
    const prNum = parseInt(match[1]);
    return ref.replace(`refs/heads/pr${prNum}head`, `refs/heads/pr${prNum + config.increment}head`);
  }
  return ref;
});
fs.writeFileSync(packedRefsPath, updated.join(os.EOL));

const issuesDir = `${config.source.repo}/issues`;
const issues = fs.readdirSync(issuesDir)
  .map(name => path.join(issuesDir, name))
  .forEach(d => {
    const issue = JSON.parse(fs.readFileSync(d));
    const oldNumber = issue.number;
    const newNumber = config.increment + oldNumber;
    issue.number = newNumber;
    fs.writeFileSync(d, JSON.stringify(issue, null, 2));
    fs.move(d, path.join(issuesDir, `issue-${newNumber}.json`));
  });
