const fs = require('fs-extra')

const configContents = `
module.exports = {
  source: {
    /**
     * URL for the API endpoint of your source github. Do not include a trailing /
     */
    baseUrl: 'https://api.github.com/repos',
    /**
     * Org or Username of your source github
     */
    org: '',
    /**
     * Repo field of your source github
     */
    repo: '',
    /**
     * Optional token to access your source github. If you have GHE, you may not need to fill this in
     */
    token: '',
    /**
     * URL for the API endpoint of your source github. Do not include a trailing /
     */
  },
  target: {
    baseUrl: 'https://api.github.com/repos',
    /**
     * Org or Username of your target github
     */
    org: '',
    /**
     * Repo field of your target github
     */
    repo: '',
    /**
     * Optional token to access your target github. If you have GHE, you may not need to fill this in
     */
    token: '',
    /**
     * Optional URL for user avatars when creating issues and comments. Requires 'id' config in 'users.json'
     * @example 
     */
    avatarUrl: 'https://avatars0.githubusercontent.com/u/{id}?s=40&v=4',
  },
  /**
   * This value will throttle scripts to prevent going over API limits
   */
  apiCallsPerHour: 3000,
  /**
   * Optional
   * BFG command to run: https://rtyley.github.io/bfg-repo-cleaner/
   * This value will include just arguments.
   * For example: '--strip-blobs-bigger-than 5M'
   */
  bfg: ''
}
`

if (!fs.pathExistsSync('./config.js')) {
  console.log('Creating a config')

  fs.writeFileSync('./config.js', configContents)
}

usersContent = `
module.exports = {
  /**
   * Username in source
   */
  'username': {
    /**
     * Username in target
     */
    target: 'new-user-name',
    id: '', // ID for avatars. If you go the the profile of the user in the target repo, it will be something like 'https://avatars0.githubusercontent.com/u/{id}?s=140&v=4'
    token: '', // optional - if present will set PRs and comments to this author rather than the default token
  },
}
`

if (!fs.pathExistsSync('./users.js')) {
  console.log('Creating a user map file')

  fs.writeFileSync('./users.js', usersContent)
}

if (!fs.pathExistsSync('./state.json')) {
  console.log('Creating state file')

  fs.writeFileSync('./state.json', '{}')
}
