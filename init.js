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
     * Optional comment token. Comments only need read-only. If this is defined, this token will be used for comments, otherwise it will fall back to the general token
     */
    commentToken: '',
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
  bfg: '',
  /**
   * Optional
   * If you are moving from Github Enterprise to github.com, you're images won't be viewable when migrated.
   * If you have an s3 account, this will upload images to an s3 bucket (you have to make the bucket public)
   **/
  s3Bucket: '',
}
`

if (!fs.pathExistsSync('./config.js')) {
  console.log('Creating a config')

  fs.writeFileSync('./config.js', configContents)
}

if (!fs.pathExistsSync('./s3Config.json')) {
  console.log('Creating an s3 config')
  const s3Config = {
    accessKeyId: '',
    secretAccessKey: '',
    region: 'us-east-1',
  }

  fs.writeFileSync('./s3Config.json', JSON.stringify(s3Config, null, '  '))
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
  },
}
`

if (!fs.pathExistsSync('./users.js')) {
  console.log('Creating a user map file')

  fs.writeFileSync('./users.js', usersContent)
}
