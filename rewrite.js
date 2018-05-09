const fs = require('fs-extra')
const glob = require('glob')

const config = require('./config')

const replaceAll = (str, obj) => {
  let newStr = str
  let i = 0
  const total = Object.keys(obj).length
  let lastPercent = 0
  for (let key in obj) {
    newStr = newStr.replace(new RegExp(key, 'g'), obj[key])
    const percent = Math.round(i / total * 100)
    if (lastPercent != percent) {
      console.log(`${percent}% Done`)
      lastPercent = percent
    }
    i++
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
  await rewrite(hashMap, 'commits')

  // for (let issue of issues) {
  //   await rewrite(hashMap, `issues/${issue.match(/(issue-[0-9]+)\.json/)[1]}`)
  // }
}

main()
