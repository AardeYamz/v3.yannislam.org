# Joins the staged previews (stdin, raw lines "<pr number> <sha>") with `gh pr list` output (--slurpfile open) into the rows of
# prs.json. A staged preview whose PR is no longer open is dropped. Tested by scripts/pr-previews-prs.test.js.
[inputs | split(" ") | {n: (.[0] | tonumber), sha: .[1]}] as $live
| [$live[] | . as $l | $open[0][] | select(.number == $l.n)
   | {number, title, author: .author.login, branch: .headRefName, draft: .isDraft, sha: $l.sha, updated: .updatedAt, url}]
