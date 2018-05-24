const { execSync } = require('child_process')

const config = require('./config')

console.log(execSync(`du -sh ${config.source.repo}.git`).toString())
