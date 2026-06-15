## Midscene.js evaluation: findings and recommendation

An end-to-end suite with Playwright + Midscene was built against the RTLS Kickstarter app (rtls.tago.run), driven by ChatGPT (OpenAI GPT-5). Assessment below.

### What was built

Coverage, all passing, run serially:
- Dashboard read-only checks (organization list, sidebar, toolbar, account menu)
- Organization creation
- Site creation
- User creation
- Sensor creation
- A visual-consistency verification on the Add Sensor modal (layout and colors)

The same scenarios run against both interfaces as separate Playwright projects: the current admin (`legacy-admin`, rtls.tago.run) and the new beta (`beta-admin`, rtls.us-e1.beta.tago.run). The beta is a redesigned frontend on the same backend; the deterministic specs ported to it with only selector swaps (the modal becomes a `role="dialog"`, panels become `grid-widget-*`, the search button is labeled "Show search"), all found by re-probing. The AI-driven attempt was run on both.

#### Authorization

The app requires a logged-in session, and the login has a captcha, so it cannot be fully automated. We handle it with a one-time manual login:

1. The first time you run the tests, a browser window opens on the login page.
2. You log in by hand: enter your credentials, solve the captcha, and sign in.
3. As soon as you reach the dashboard, the tests save your session to `e2e/.auth/session.json`.
4. Every later test reuses that saved session, so it starts already signed in.

This step runs automatically before the tests and skips itself whenever `e2e/.auth/session.json` already exists, so you log in only once. To log in again (for example after the session expires), delete that file and run the tests.

### How Midscene ended up being used

The pattern that held up: Playwright does the driving (navigation, filling fields, dropdowns, submitting), and Midscene verifies results where a selector cannot express intent (semantic and visual assertions). Letting the model drive the UI directly was the part that did not work well.

By the end most of the suite is plain Playwright. The site spec uses no Midscene at all, and only a handful of assertions (field presence and the Add Sensor modal's visual consistency) rely on it.

### How the e2e specs were created

Each spec was written with Claude in VS Code, using a probe-first loop so the selectors come from the real UI instead of guesses:

1. Ask Claude to create a spec for a flow (for example, "add a site creation spec").
2. Claude writes a throwaway probe script (Playwright plus the saved session) that opens the app, walks to the relevant screen, and dumps what is actually there: button text, input placeholders, `data-testid`s, dropdown options, modal fields, and screenshots.
3. Claude reads those dumps and screenshots to learn the real labels and the exact flow, including quirks like the geocoder address field and the icon-only "Create New" buttons.
4. Claude writes the spec grounded in what it observed, then deletes the probe.

The result is specs that use concrete selectors (`enter the sensor name`, `selector-options-item`, the Name-column search) rather than invented ones. The selectors were right from the start; the iterations that followed were about timing and flow (waits, pagination, stale lists), not wrong locators.

> This probe step exists only because the Midscene cannot locate elements reliably on its own. If `aiAct` worked, most of the code in spec files wouldn't be necessary: you instead would describe the flow in plain language and Midscene would find the elements itself at test execution, so there would be little need to probe and pin selectors up front. The probing is a necessity due to that gap, not an inherent requirement.

### Concerns

- GPT-5 visual grounding is unreliable. Asked to pick a specific dropdown option, it clicked the first highlighted one instead. We moved every precise interaction to Playwright.
- The AI-only path was tried on both the legacy and beta interfaces, including the best approach the Midscene docs describe. High-level `aiAct` stalls to the timeout and never completes. The detailed instant-action approach (`aiTap`/`aiInput` with `deepLocate`, one intent per call, every step spelled out) gets through the easy clicks and inputs but still misses the precise interactions (selecting the geocoder suggestion, hitting the exact submit), so the create never finishes.
- LLM assertions are nondeterministic on fine detail. The same modal was read as a "red dot" on one run and a "red asterisk" on another, failing the assertion until we softened the wording.
- Tests create real data on a shared live environment (orgs, sites, sensors, user invites) with no cleanup, so test data accumulates.
- Auth needs a human (captcha), so the suite is not fully hands-off from a cold start.

### Complexities

- App flows the model could not handle reliably: the geocoder address field (Create submits only after a suggestion is selected), custom searchable selects, icon-only buttons with hidden labels, and list pagination where new rows land on a later page.
- Dashboard list widgets sometimes take a long time to refresh in place after a create, so verification needs a name search or a page reload.
- Console output needed fixes to stay readable: `MIDSCENE_REPORT_QUIET=true`, and a filter for a warning Midscene prints through `console.warn` with no off switch.

### Reliability

| Capability | Result |
|---|---|
| Playwright actions (fill, click, navigate, submit) | ✅ reliable |
| Midscene element location / `aiTap` on precise targets | ⚠️ often wrong element |
| `aiAct` high-level multi-step action | ❌ failed every retry |
| Instant actions + `deepLocate`, fully detailed | ❌ gets partway, fails at the geocoder/submit |
| `aiAssert` / `aiQuery` semantic checks | ⚠️ mostly works, flaky on fine detail |

### Cost and speed

- Each GPT-5 vision call takes about 15 to 20 seconds, and one step issues several calls.
- A measured full run took 18 minutes (9 passed, 1 failed). About 3 of those minutes are the working specs (dashboard, device, organization, site, user); the other 15 are the single `aiAct` spec.
- `aiAct` is the cost sink: each attempt runs to the 300s timeout and fails, so with `retries: 2` it spends about 15 minutes on one test that never passes.
- Per-spec timings from that run: dashboard 4 tests ~82s, device 2 tests ~36s, organization ~18s, site ~14s, user ~22s, `aiAct` 3 attempts at 5.0m each.
- Token cost per run is real (each call sends a screenshot plus reasoning), and parallelism does not reduce it. Plain Playwright steps are sub-second and free.

### Recommendation

> Do not adopt Midscene as the primary UI driver for our applications with GPT-5. Keep Playwright as the QA standard.

- Playwright on its own does the job well. A suite with no Midscene is a fine default; the only thing you give up is the holistic visual-consistency check.
- Build specs with Playwright: probe selectors, write deterministic steps. That is what every working flow uses.
- Use Midscene sparingly, only for verification a selector cannot express (visual consistency, semantic state), and budget for some flakiness and added time.
- Do not drive the UI with AI here, on either interface. `aiAct` fails outright, and even the fully detailed instant-action approach misses the precise interactions. Writing prompts in that much detail takes longer than probing the page and writing the Playwright step, and the Playwright step also runs faster. If you have to describe the UI that precisely, just probe.
- Revisit Midscene if we adopt a vision-language model better at grounding than GPT-5 (Qwen-VL, Gemini), test an app with a hostile DOM (no test ids, canvas, third-party widgets), or want true visual-regression checks. TagoIO RUN is well instrumented with test ids and stable placeholders, which is why Playwright won on nearly every step.
- Create test data in a dedicated test organization, or add a teardown step. The tests leave real orgs, sites, sensors, and user invites on a shared environment with no cleanup, so it accumulates over runs.

> This evaluation only covers GPT-5, and weak visual grounding was the single limiter on every AI-driving step. The most valuable follow-up would be re-running the same suite against other models to see whether that limit is the model or Midscene itself. Midscene is built around vision-language models (its docs recommend them for locating), so the strongest candidates are Qwen-VL, Gemini, or a Claude computer-use model rather than another text-first model. The harness is model-agnostic (the provider is selected purely through env vars: `MIDSCENE_MODEL_NAME` / `MIDSCENE_MODEL_FAMILY`), so swapping models is a config change, not a code change, and the AI specs are already in place to measure the difference.

### Rollout

One open question is the best way to add this to new repositories. A candidate: pre-install the harness (fixture, Playwright config, auth setup, conventions) in the [template-analysis](https://github.com/tago-io/template-analysis) repo, so new analysis projects inherit the e2e setup from the start.

Writing new specs also gets faster as a project grows. TagoIO RUN reuses the same building blocks across pages (searchable selects, modals, list widgets, the "Create New" pattern), so selectors and helpers grounded for one flow carry over to the next.

Evaluation spike, no production changes. Risk (CIA): 🟢 Low | 🟢 Low | 🟢 Low.
