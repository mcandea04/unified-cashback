# Change: Add PR preview deployments for GitHub Pages

## Why
Reviewers need a way to validate changes in pull requests on a live environment before merging.

## What Changes
- Add an automated workflow that publishes PR preview deployments for the static site.
- Provide a predictable preview URL for each pull request.

## Impact
- Affected specs: pr-preview-deploy
- Affected code: GitHub Actions workflow under .github/workflows
