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
    token: '33dee682074e85699bbb609f98b498627186cd3b',
    avatarUrl: 'https://avatars0.githubusercontent.com/u/{id}?s=140&v=4',
  },
  bfg: '--delete-folders Indexer,Database,vendor,Sql,Documents,public,service_mgmt,config,client --strip-blobs-bigger-than 2M'
}
