Plan: `docs/plans/2026-11-15-coffee-shop-dashboard-redesign.md`

Task 1: theme controller and header toggle committed; six focused controller tests passed in a local Node test run. The full repository suite ran after `npm ci`: 20 tests total, 19 passed and 1 existing dashboard-tabs assertion failed (`tests/dashboard-tabs.test.js:12`; expected only `moderation: false`, actual also includes the default `emojis: true`). The new theme tests all passed.

Task 2: dashboard theme tokens, shell styling, grouped mobile navigation, account/guest-auth overlays, feature summary panels, and warm boot splash are committed. Repository-backed static checks and CSS brace-balance checks passed. Visual browser review remains pending; preview deployment is READY at `https://bot-website-pasx8t1kc-elyaginnings-2459s-projects.vercel.app`.

Task 3: Server View theme-token mapping and responsive styling are committed. Static checks confirm both themes and existing channel/message/member/reply/composer markup remain present. Authenticated browser interaction review remains pending; the preview and all three new static assets returned HTTP 200.

Task 4: legacy theme-picker cleanup remains active and now also removes cached legacy Server View theme stylesheets. The new coffee theme preference is not removed by the compatibility cleanup. The full suite has one unrelated existing failure as noted above. Preview browser review is pending; production deployment is not being initiated from the feature branch.

Deployment status: commits to `main` automatically triggered Vercel production deployments. The latest main deployment reached READY and includes the redesign work completed so far. This was not intended; all further implementation commits are isolated on `feature/coffee-shop-dashboard-redesign`. The branch has a READY preview deployment; no further production deployment will be initiated without the user's approval.
