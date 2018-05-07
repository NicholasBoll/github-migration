const debug = require('debug')
const fs = require('fs-extra')
const config = require('./config')
const _ = require('lodash')

// var checkCommits = function(callback) {
// 	var comments = JSON.parse(fs.readFileSync(repo + '/comments.json'));
// 	async.eachSeries(comments.concat(issues), function(item, itemCallback) {
// 		if (item.base) { // this is a pull request
// 			checkCommitExists(item.base.sha, itemCallback);
// 		} else if (reviewComment(item)) {
// 			checkCommitExists(item.original_commit_id, itemCallback);
// 		} else if (commitComment(item)) {
// 			checkCommitExists(item.commit_id, itemCallback);
// 		} else {
// 			itemCallback();
// 		}
// 	}, function(err) {
// 		fs.writeFileSync(repo + '/missingCommits.json', JSON.stringify(_.unique(missingCommits)));
// 		callback();
// 	});
// }

/**
 * 
 * @param {{}[]} comments 
 * @param {{}[]} commits 
 */
const getOrphanedPullRequestCommits = (comments, commits) => {
  return comments.reduce((result, comment) => {
    const sha = comment.original_commit_id
    if (!commits.find((commit) => commit.sha === sha)) {
      result.push(sha)
      debug('pr')(`Missing commit: ${sha}`)
    }
    return result
  }, [])
}

/**
 * 
 * @param {{}[]} comments 
 * @param {{}[]} commits 
 */
const getOrphanedIssueCommits = (comments, commits) => {
  return comments.reduce((result, comment) => {
    const sha = comment.original_commit_id
    if (!commits.find((commit) => commit.sha === sha)) {
      result.push(sha)
      debug('pr')(`Missing commit: ${sha}`)
    }
    return result
  }, [])
}

/**
 * 
 * @param {{}[]} comments 
 * @param {{}[]} commits 
 */
const getOrphanedCommitCommits = (comments, commits) => {
  return comments.reduce((result, comment) => {
    const sha = comment.commit_id
    if (!commits.find((commit) => commit.sha === sha)) {
      result.push(sha)
      debug('pr')(`Missing commit: ${sha}`)
    }
    return result
  }, [])
}

const main = async () => {
  const commits = JSON.parse(await fs.readFile(`${config.source.repo}/commits.json`))

  const orphanedCommits = _.uniq([].concat(
    getOrphanedPullRequestCommits(JSON.parse(await fs.readFile(`${config.source.repo}/pull-comments.json`)), commits),
    getOrphanedCommitCommits(JSON.parse(await fs.readFile(`${config.source.repo}/comments.json`)), commits),
  ))

  console.log(orphanedCommits.length)
  await fs.writeFile(`${config.source.repo}/missing-commits.json`, JSON.stringify(orphanedCommits, null, '  '))
}

main()
