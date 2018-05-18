## Github migration guide
This guide covers migrating a github repository from one github location to another (most likely Github Enterprise <-> Github.com). Migrating just the git repository is the easy part. The hard part is migrating pull requests, issues and comments. And it is even more difficult if you're moving from Github Enterprise to Github.com and your repository size is over the 1GB limit and requires history re-writing to get the size down.

Before we start, I'd like to credit [Michael Welch](https://github.com/michaelgwelch) for creating a guide at https://github.com/michaelgwelch/migrate-issues. I rewrote all new code following his guide and source code. I modernized the source, cleaned up and made new messes, added support to resume most longer steps, added support for history re-writing and got a bit more aggressive with preserving comments on force-pushed pull request branches. I learned a lot more about github than I ever thought I would.

It is best to do this process when nobody is currently working. All in-progress work should be pushed to the source remote repository before starting. Any work pushed during this process or not pushed prior to starting will be lost and patches will have to be created to apply to the new repository. For smaller repos, this could be done at night. Larger you may need to do it over the weekend (copying comments can take a while with rate limits).

1. Clone this repository
1. `npm install`
1. `npm run initialize` - this will create a `config.js` file. Modify this file. The token here will dictate the user that creates comments and pull requests. You might want this to be a non-user account (maybe automation account) to make it obvious you personally didn't create all issues, pull requests and comments. The scripts will have an author section to credit the real author
1. Optional: Configure `users.js`
    - Maps from usernames of the source github to the destination github. If tokens are also provided, the user will be listed as the author of pull requests, issues and comments. Without the token, the token in the config will be used. If ids are provided, avatars will link to the real avatar - especially useful moving from GHE -> github.com where avatar URLs might be behind a corporate proxy
1. `npm run test:source`. This will test your source configuration. Adjust the source config until this works
1. `npm run test:target`. This will test your target configuration. Adjust the source config until this works
1. `git clone <source-repo-url> --mirror`. This will clone your source repo. The `mirror` option will download all branches, tags and refs (required for converting pull requests)
1. `npm run fetch`. This will download all github artifacts. **Note** will count toward your API limit, but fetching is in batches of 100. This won't be much for small repos, but a repo with 13K commits would be 100s of requests
1. `npm run check`. This will check for orphaned commits. This will create a `missing-commits.json`. This is all commits that are not part of any current branch. There will probably be many of them.
1. `npm run anchor`. This will create a branch from a commit still referenced in git and create that commit on your source branch (first side-effect task). It will output how many anchored commits were saved. If this number is 0, move on. If it is greater than 0 and you care for these comments, start this guide over.
1. `sed -i.bak '/\/head/s/pull\//\/heads\/pr/g; /pr/s/\/head/head/g' <repo>.git/packed-refs`. **Note** change `<repo>` to the target repository name. This is important for copying pull requests. Github uses hidden refs for pull request branches (that even persist after you PR branch is deleted), but github will reject pushing hidden refs. Rewriting them means they will show as actual branches in your new repository, but we'll clean them up later.
1. Optional: Rewrite history
    - `du -sh <repo>.git`. See how big your repo is
    - `npm run bfg`. This will download the BFG jar
    - You may have to experiment a bit first to get what you want
    - Example: `java -jar bfg-1.13.0.jar --strip-blobs-bigger-than 2M <repo>.git`
    - `(cd <repo>.git; git reflog expire --expire=now --all && git gc --prune=now --aggressive)`. **NOTE** change `<repo>` to the target repository name.
    - `du -sh <repo>.git`. This is how big the target repo will be
    - `npm run rewrite`. This will use the commit map created by BFG and write the new commit hashes to all downloaded pull requests, comments and commits. This can take a while depending on how many pull requests and comments you have. Each step has progress logging to help.
1. `(cd <repo>.git; git push <dest-repo> --mirror)`. This will push all branches, tags and refs to the target destination
1. `npm run createBranches`. This will create a branch for each PR (from the `sed` command run earlier) on the target repository. This is the first step that pushes github artifacts to the destination repo
1. `npm run createIssues`. This will create issues and pull requests using base and head branches. State tracking is used in case of any errors. This step is the most finicky because the issues must be added in order, so the script will bail on any error informing you how to proceed. You may need to create a dummy issue to move on.
1. `npm run createComments`. This will create all comments downloaded from the source repository. This step will probably take the longest. This step uses throttling to try to stay under your API rate limit set by github. This will also log a lot. State tracking is used here as well, so you can quit and pick up later.
1. `npm run updateIssues`. This will close all issues that are closed in the source repository. This will also add all the previous labels and add the "Github Import" label. We can't tell Github the PRs are merged, only closed.
1. `npm run deleteBranches`. This will clean up all the base and head branches created by the migration process
1. If everything went well, you can celebrate! :tada:
