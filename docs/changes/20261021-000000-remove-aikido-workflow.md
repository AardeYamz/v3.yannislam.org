Date: 2026-10-21 00:00:00

# Remove The Aikido CI Workflow Job

The `credentials` and `aikido` jobs in `.github/workflows/security.yml` used
`AikidoSec/github-actions-workflow`, which needed an `AIKIDO_SECRET_KEY` in both
the Actions and Dependabot secret stores. The key was never added, so the scan
only ever skipped itself with a notice.

Aikido's README for that action no longer recommends it and points to PR gating
from the Aikido dashboard instead, which needs no CI secret and uses no CI
minutes. The jobs are removed; `zizmor` stays in `security.yml`.

## To finish the setup (outside the repo)

Install the Aikido GitHub App on this repository, connect it in the Aikido
dashboard, and enable PR gating there.
