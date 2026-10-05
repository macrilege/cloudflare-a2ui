# A2UI Studio

[Live tutorial](https://a2ui-lab.macrilege.workers.dev/) · [Ford official SDK spike](https://a2ui-lab.macrilege.workers.dev/sdk-spike/) · [Previous automotive demo](https://a2ui-lab.macrilege.workers.dev/automotive/)

## Open the demos

- [Mustang and Explorer chat](https://a2ui-lab.macrilege.workers.dev/automotive/) — paint swatches, wheel cards, and captured Ford configuration links.
- [Official A2UI SDK spike](https://a2ui-lab.macrilege.workers.dev/sdk-spike/)
- [Interactive restaurant tutorial](https://a2ui-lab.macrilege.workers.dev/)

## Run entirely local with Ollama or LM Studio

On this Mac, double-click **Start Local Demo.command** and open [the local vehicle chat](http://localhost:8794/automotive/). It uses the already installed **Ollama gemma4:12b** model. Keep the Terminal window open; closing the server stops the demo. The launcher starts Ollama on loopback when needed and does not download models. Node.js 24+ and an installed model are required; on a fresh checkout the launcher installs the locked npm dependencies.

The same Mustang/Explorer chat, colors, wheels, invalid-option explanations, inventory snapshot and captured Ford links run locally. Every submitted chat message goes to the local model. The existing server validates its preference patch and builds the same A2UI messages; direct controls update the shared draft without inference. Model wording/accuracy can differ from the hosted model. There are no cloud AI calls, API keys, D1 database or daily AI allowance in this mode. One request runs at a time to avoid filling the local model queue.

For **LM Studio**, load a local instruction model and start its local server on port 1234 in the Developer screen. Double-click **Start LM Studio Demo.command**, enter the model identifier displayed by LM Studio, and use [port 8795](http://localhost:8795/automotive/). Leaving the identifier blank works only when its API lists exactly one model. The adapter uses LM Studio's [OpenAI-compatible structured output API](https://lmstudio.ai/docs/developer/openai-compat/structured-output). Its request/response contract is tested; actual inference on this Mac was verified with Ollama, not LM Studio.

For developers, `npm run local` and `npm run local:lmstudio` run the corresponding server. Configuration is supplied through `LOCAL_AI_PROVIDER` (`ollama` or `lmstudio`), `LOCAL_AI_MODEL` (exact installed identifier), `LOCAL_AI_BASE_URL` (loopback HTTP origin only), and `LOCAL_PORT` (8794 by default). The LM Studio double-click launcher defaults to 8795 so both examples can coexist. The server does not read `.env` files. `/api/local-status` reports provider/model availability.

The Node adapter imports the existing Worker handler and substitutes local inference, static assets and an in-memory attempt counter. It leaves hosted deployment settings untouched. It binds only to 127.0.0.1 and rejects other Host/Origin values; model API requests remain server-side. Only files inside `public/` with approved asset extensions are served. No prompt history is written by this adapter. Ford/dealer handoffs still open external websites, and existing Google Fonts references may require internet; local inference does not mean all shopping links work offline.

Real Ollama checks on the M5 Pro: white Explorer with unsupported black wheels → clarification; “gray wheels” → Carbonized Gray wheels + required 4WD, preserving white paint; blue EcoBoost convertible automatic → captured Ford link; manual EcoBoost → conflict with no build link; inventory → captured listing. The cold first response took about 8 seconds; four subsequent API checks took 0.8–1.8 seconds each. These are a few observed requests, not a benchmark or an accuracy guarantee. The browser also verified orange V8/bronze wheels → select blue → ask for manual, preserving the other choices.

## Local development

Use a current Node.js release that supports running TypeScript tests directly, and install dependencies with `npm ci`. Run `npm run build:sdk` to rebuild the official renderer bundle. `npm test` and `npm run check` verify the code without calling live AI.

For the full local Worker, authenticate Wrangler with an account that can access the configured resources, initialize the local usage database with `npx wrangler d1 execute a2ui-demo-usage --local --file=schema.sql`, then run `npm run dev`. The AI binding is remote: chat requests use real inference and consume usage even during local development.

`wrangler.jsonc` identifies the existing demo deployment. To deploy your own copy, use your own Worker name, account ID, and D1 database ID. No API credentials are included; authentication stays outside the repository. Never commit `.env` or `.dev.vars` files.

Ford configuration tokens are public shopping-link identifiers, not credentials. Vehicle assets and configuration snapshots came from public Ford pages; this prototype is not an official Ford product or a live inventory service.

## Research question

What advantages would A2UI bring to Ford AI Chat, and can a bounded integration work with the existing AI backend?

Recommendation: evaluate one interactive vehicle journey using the renderer for Ford's actual frontend. Keep the current AI/backend and compare against direct tool-to-component routing. Do not adopt A2UI solely because an interactive card is possible; the relevant benefit is a reusable, versioned interface contract across journeys and potentially clients.

## Advantages and tradeoffs

| Potential advantage | Ford application | What remains to prove |
| --- | --- | --- |
| Actionable responses | Vehicle comparisons, configuration choices, inventory cards and handoffs in chat | Task completion and user understanding versus current chat |
| Approved UI vocabulary | Map catalog entries to existing Ford components | Actual component adapters, theming and accessibility |
| Shared state | Clicks and follow-up messages operate on the same vehicle draft | Race handling, cancellation, conversation persistence and navigation |
| Common interface contract | Reuse message handling across multiple interactive journeys | Less engineering effort than bespoke card schemas and maintenance over protocol upgrades |
| Backend independence | Keep existing model, tools, hosting and data services | Compatibility with Ford's real transport and agent runtime |

A2UI does not supply accurate vehicle facts, valid configuration tokens, live inventory, server authorization, or a Ford design system. It does not make untrusted output safe by itself. Keep schema/catalog validation, component allowlists, trusted URLs, explicit business rules, and backend authorization. A small fixed set of existing cards may be simpler without another protocol layer.

## Implemented spike

- Official `@a2ui/lit` and `@a2ui/web_core`, both pinned to **0.12.0**, using their **v0.9** entry points. Package version and wire protocol version are different.
- Lit was selected because this repository uses native HTML/JS. This does not imply Ford should change frontend frameworks. Official React and Angular renderers are alternatives.
- The SDK page processes A2UI messages with the official `MessageProcessor`, renders an `a2ui-surface`, subscribes to data bindings and handles SDK action callbacks.
- Vehicle requests use the existing real AI endpoint. AI returns a bounded intent/preference patch; the server validates it and constructs the component document. This is template-based A2UI, not model-generated arbitrary layout.
- The app adds a review button to the validated server document. Its callback updates the same surface and resolves only an exact captured configuration link. It performs no purchase or dealer contact.
- Unknown-element rejection is configured explicitly. Our test found the default processor did not throw on an unknown component type; relying on default behavior would not establish that boundary. Orphan components are allowed because incremental replacements may leave old, unreferenced nodes. The application's server validator still requires each emitted document to be a valid tree.
- No proprietary Ford frontend or design-system package was available. The spike uses the official basic catalog with prototype colors; it is not proof of production integration.

## New tutorial

The root page teaches a restaurant reservation in five steps: words → interface → shared data → adaptive follow-up → action. The opening request and “Actually, make it six” call the real AI service. Controls, time selection, review and confirmation update locally without inference. The restaurants, business rules and availability are fictional. No table is actually reserved.

The main tutorial retains the small custom renderer so its state and protocol exchange are easy to inspect. The separate Ford page tests the official SDK. These are deliberately labeled different implementations. The inspector exposes actual messages and distinguishes local binding notifications from A2UI button actions. No prepared AI response is substituted on a service error.

## Verification

- 77 Node tests (including local adapters and HTTP boundaries): existing vehicle catalogs, allowed transitions, endpoint limits, restaurant lifecycle, same-surface updates, data-only messages and explicit SDK unknown-element rejection.
- Browser checks: all five tutorial steps; state preservation across chat/control changes; explicit confirmation; AI error recovery; SDK binding/action callbacks; 390px mobile overflow; deployed CSP compatibility. Local browser API responses are mocked for repeatable tests, separate from real deployed AI smoke tests.
- Build: TypeScript check, bundled SDK asset, Wrangler deployment dry run.
- Deployed real-AI verification: restaurant first request and party-size follow-up passed; the SDK Explorer follow-up changed white to blue while preserving a locally selected 4WD, and the review callback produced the matching captured URL. Initial SDK inference failures were surfaced without replacing state; removing unrelated hidden Mustang defaults from the new Explorer baseline preceded the successful rerun. One SDK sample reported 568ms server generation and about 0.8s request/render, not a latency benchmark.
- The complete SDK spike bundle is 637,340 bytes raw / 118,360 bytes gzip.
- Performance has not been benchmarked across devices or production traffic. The bundle includes the SDK, application code and captured Ford catalogs; its size is not the SDK's isolated overhead.

## A Ford production spike should finish with

1. Confirm Ford's frontend framework, transport, component library and ownership boundaries.
2. Adapt two real Ford components (vehicle card and option selector) and one approved action.
3. Test a full request → card selection → follow-up → action cycle against authorized Ford services.
4. Compare latency, transferred bytes, accessibility, failure recovery and implementation effort against the current approach.
5. Document version compatibility, observability, user-state retention, fallback behavior and action authorization; recommend adopt, defer, or reject using the measured results.

No conversion lift, development-time saving, WCAG conformance, full protocol conformance or production readiness is claimed by this prototype.

## Runtime and cost controls

Worker `a2ui-lab`. Existing AI binding and D1 daily usage counter are unchanged. During owner testing, `DAILY_AI_LIMIT` is set to `0`, disabling the application’s daily ceiling. Restore it to `30` after testing. Usage counting continues, and all live modes retain six requests per minute per IP per serving location. Failures consume an attempt. No prompts are stored; only date and count. No new cloud bindings, cron jobs or secrets.

Public teaching copy remains cloud-neutral. Deployment implementation is provider-specific. No Gemini key, Google Cloud account, Google ADK or AG-UI dependency is required for this spike.

`npm test` runs unit/boundary checks. `npm run build` bundles the SDK, checks TypeScript, and dry-runs deployment. `npm run deploy` publishes the current assets. `scripts/check-tutorial.mjs` runs the repeatable local browser checks against a static server on 127.0.0.1:8793. `scripts/check-live-tutorial.mjs` deliberately spends three shared AI requests against production and should not be run routinely.

## Sources checked October 4, 2026

- [Google's A2UI v0.9 announcement](https://developers.googleblog.com/en/a2ui-v0-9-generative-ui/): existing component catalogs, shared web core, backend/transport flexibility.
- [Official client setup](https://a2ui.org/guides/client-setup/): renderer packages, component catalogs and data/action integration.
- [Integration paths](https://a2ui.org/introduction/how-to-use/): renderer choice and optional agent frameworks.
- [Message reference](https://a2ui.org/reference/messages/): message types and surface lifecycle.
- Installed npm packages and their versioned exports/tests were inspected rather than assuming documentation examples matched the installed API.

The official documentation now also lists v0.9.1 and a v1.0 candidate. This project intentionally preserves its v0.9 wire contract; a version upgrade requires separate compatibility validation.
