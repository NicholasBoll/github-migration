const fs = require('fs-extra')
const glob = require('glob')

const config = require('./config')

const replaceAll = (str, obj) => {
  let newStr = str
  for (let key in obj) {
    newStr = newStr.replace(key, obj[key])
  }
  return newStr
}

const getHashMap = async (repo) => {
  // get the mapping of all commits
  const hashFilename = glob.sync(`./${config.source.repo}*/**/object-id-map.old-new.txt`).pop()
  let hashMap = {}
  console.log(hashFilename)
  if (hashFilename) {
    const contents = (await fs.readFile(hashFilename)).toString().split('\n')
    hashMap = contents.reduce((result, line) => {
      const [oldHash, newHash] = line.split(' ')
      result[oldHash] = newHash
      return result
    }, {})
  }

  return hashMap
}

const rewrite = async (hashMap, name) => {
  if (!await fs.pathExists(`${config.source.repo}/${name}.bak.json`)) {
    console.log(`Rewriting ${name}.json`)
    const commentsStr = await fs.readFile(`${config.source.repo}/${name}.json`)
    await fs.writeFile(`${config.source.repo}/${name}.bak.json`, commentsStr)

    const newCommentsStr = replaceAll(commentsStr.toString(), hashMap)
    await fs.writeFile(`${config.source.repo}/${name}.json`, newCommentsStr)
  } else {
    console.log(`${name}.json already processed`)
  }
}

const main = async () => {
  const hashMap = await getHashMap(config.source.repo)
  const issues = glob.sync(`${config.source.repo}/issues/issue-*.json`)

  await rewrite(hashMap, 'comments')
  await rewrite(hashMap, 'issue-comments')
  await rewrite(hashMap, 'pull-comments')

  for (let issue of issues) {
    await rewrite(hashMap, `issues/${issue.match(/(issue-[0-9]+)\.json/)[1]}`)
  }
}

main()
