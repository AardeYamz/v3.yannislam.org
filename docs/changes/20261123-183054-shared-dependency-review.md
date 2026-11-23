Date: 2026-11-23 18:30:54

# Dependency Review Uses The Shared Workflow

The last inline copy from the CI centralization plan (`AardeYamz/workflows` phase 3): the `dependency-review` job in
`build-test.yml` now calls the shared `dependency-review.yml` (v1.0.4) with `fail-on-severity: high`, as before. The
check is now named `dependency-review / Review dependencies`; it is not a required check.
