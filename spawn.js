const { spawn } = require('child_process')

module.exports = (cmd, args = []) => {
  console.log(`Running "${cmd} ${args.join(' ')}"`)
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args)

    child.stdout.pipe(process.stdout)
    child.stderr.pipe(process.stderr)

    child.on('exit', (code, signal) => {
      if (code) {
        reject(code)
      } else {
        resolve(signal)
      }
    })
  })
}
