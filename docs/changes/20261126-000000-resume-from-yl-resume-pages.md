# Resume served by yl-resume's GitHub Pages

The resume button now opens `https://aardeyamz.github.io/yl-resume/resume.pdf` (`RESUME_URL` in `resume.service.ts`).
Removed: the committed PDF in `src/assets/resume/`, `resume-manifest.json`, `scripts/generate-resume-manifest.js` and
its pre-hooks, and the `resume` path in `vercel.json`'s immutable cache rule. A resume update needs no v3 build.

Merge only once the URL serves the PDF. The e2e test checks the URL the click opens, not that it resolves.
Closes #268.
