Plan: `docs/plans/2026-11-15-coffee-shop-dashboard-redesign.md`

Task 1: theme controller and header toggle committed; six focused controller tests passed in a local Node test run. The full repository test suite has not been run.

Task 2: dashboard theme tokens, shell styling, grouped mobile navigation, account/guest-auth overlays, feature summary panels, and warm boot splash are committed. Repository-backed static checks and CSS brace-balance checks passed. Visual browser review remains pending.

Task 3: Server View theme-token mapping and responsive styling are committed. Static checks confirm both themes and existing channel/message/member/reply/composer markup remain present. Authenticated browser interaction review remains pending.

Task 4: legacy theme-picker cleanup remains active and now also removes cached legacy Server View theme stylesheets. The new coffee theme preference is not removed by the compatibility cleanup. Final full-suite verification, browser review, and deployment are pending.

Deployment status: commits to `main` automatically triggered Vercel production deployments. The latest main deployment reached READY and includes the redesign work completed so far. This was not intended; all further implementation commits are isolated on `feature/coffee-shop-dashboard-redesign`, and no further production deployment will be initiated without the user's approval.
