Date: 2026-10-19 18:16:37

# CI Runner And Node Bump

- All workflows now run on `ubuntu-26.04` instead of `ubuntu-latest`.
- Node matrix in `build-test.yml` moved from 22.x/24.x to 24.x/26.x; single-version jobs use 24.x. The Codecov upload condition follows the primary version (24.x).
- Every action is already at its latest release (checked against upstream tags): checkout 7.0.1, setup-node 7.1.0, upload-artifact 7.0.2, download-artifact 8.0.2, cache 6.1.0, dependency-review 5.0.0, codecov 7.1.1, fetch-metadata 3.1.0, zizmor 0.7.1, Aikido 1.0.13. Nothing to change there.
