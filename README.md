## Github migration guide
This guide covers migrating a github repository from one github location to another (most likely Github Enterprise <-> Github.com). Migrating just the git repository is the easy part. The hard part is migrating pull requests, issues and comments. And it is even more difficult if you're moving from Github Enterprise to Github.com and your repository size is over the 1GB limit and requires history re-writing to get the size down.

It is best to do this process when nobody is currently working. All in-progress work should be pushed to the source remote repository before starting. Any work pushed during this process or not pushed prior to starting will be lost and patches will have to be created to apply to the new repository.

1. Clone this repository
1. run `npm install`
1. Run `npm run initialize` - this will create a `config.js` file. Modify this file
1. Optional: Configure `users.js`
    - Maps from usernames of the source github to the destination github. If tokens are also provided, the user will be listed as the author of pull requests, issues and comments. Without the token, the token in the config will be used.
1. Test your config: `npm run test:source` and `npm run test:target` to make sure those work correctly. Adjust your config file as necessary until these commands are good
1. Clone your repo: `git clone <source-repo-url> --mirror`
    - Mirror mode will download all branches, tags and refs (required for converting pull requests)
1. Move PR read-only refs: `sed -i.bak s/pull/pr/g <repo>.git/packed-refs`
1. Optional: Rewrite history
    - To see how big your repo is you can run `du -sh <repo>.git`
    - Download bfg - `npm run bfg` (this will download the jar)
    - You may have to experiment a bit first to get what you want
    - Example: `java -jar bfg-1.13.0.jar --strip-blobs-bigger-than 2M <repo>.git`
    - Run `(cd <repo>.git; git reflog expire --expire=now --all && git gc --prune=now --aggressive)`
    - To see how big your repo is you can run `du -sh <repo>.git`
1. Push to target location: `(cd <repo>; git push <dest-repo> --mirror)`
1. Download all issues and comments: `npm run fetch`. This will download all github artifacts. To see output, run `DEBUG=* npm run fetch`. This will count toward you API, but fetching is in batches of 100. This should mean only dozens of API hits
