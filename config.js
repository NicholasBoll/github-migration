module.exports = {
  source: {
    baseUrl: 'https://github.schq.secious.com/api/v3/repos' ,// API endpoint for source
    org: 'WebUI',
    repo: 'WebConsoleAPI',
    token: '',
  },
  target: {
    baseUrl: 'https://api.github.com/repos',
    org: 'logrhythm',
    repo: 'web-console-api',
    // token: 'ac245567781e18052651f405d6775b1f0e227e55', // read-only token
    // token: '4410f305da27eec1d7614c7af06331e6212158c0', // write token
    token: '33dee682074e85699bbb609f98b498627186cd3b', // my token
    avatarUrl: 'https://avatars0.githubusercontent.com/u/{id}?s=40&v=4',
  },
  apiCallsPerHour: 3000,
  bfg: '--delete-folders Indexer,Database,vendor,Sql,Documents,public,service_mgmt,config,client --strip-blobs-bigger-than 2M'
}
