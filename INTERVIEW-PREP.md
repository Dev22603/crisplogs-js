# crisplogs — Interview Questions, Ranked by Likelihood

Every question here is ranked into tiers by how likely an interviewer is to actually ask it, starting with the questions that come up in nearly every technical interview about a personal project, down to curveballs that only a very thorough interviewer digs for.

**How to use this file:** each answer is layered, the same way you'd actually want to speak in the room:

- **Say this first** — a 10–20 second answer. This is what you lead with. Often this is enough on its own.
- **If they want more** — the fuller technical answer, for when they nod and say "go on" or ask "how, exactly?"
- **If they push further** — the follow-up they'll ask next, and the trade-off or honest limitation you should volunteer rather than wait to get caught on.

Practice saying the "say this first" lines out loud until they're automatic. The rest is there so you're never stuck if they dig deeper.

---

## Table of Contents

- [Tier 1 — Almost guaranteed to be asked](#tier-1--almost-guaranteed-to-be-asked)
- [Tier 2 — Core architecture and mechanics](#tier-2--core-architecture-and-mechanics)
- [Tier 3 — npm and packaging](#tier-3--npm-and-packaging)
- [Tier 4 — Design, testing, and trade-offs](#tier-4--design-testing-and-trade-offs)
- [Tier 5 — Deep-dive and curveball questions](#tier-5--deep-dive-and-curveball-questions)
- [Tier 6 — Behavioral: talking about AI-assisted development](#tier-6--behavioral-talking-about-ai-assisted-development)
- [Rapid-fire round](#rapid-fire-round)
- [General strategy for the room](#general-strategy-for-the-room)

---

## Tier 1 — Almost guaranteed to be asked

These open almost every "tell me about a project" conversation. Have all five of these completely automatic.

### 1. "Walk me through this project."

**Say this first:** "crisplogs is a small, dependency-free Node.js library I built and published to npm. It turns plain `console.log` output into organized, colored, structured logs — one function call gives you severity levels, timestamps, the exact file and line a message came from, and optional file output. It's at version 0.3.0, with six published releases."

**If they want more:** "The design borrows from Python's `logging` module — a Logger decides *whether* to log something, a Formatter decides *how it's displayed*, and a Handler decides *where it goes*, and those three jobs are kept completely separate. That's what lets one log call show up fully on your screen while only the important parts get saved to a file, from the same line of code. It's about 1,150 lines of strict TypeScript, has 91 automated tests, and ships in both the old and new JavaScript import formats."

**If they push further:** They'll likely ask *why* next — go straight to question 3.

---

### 2. "What does it actually do, in your own words? Not the README — explain it to me like I've never seen it."

**Say this first:** "Normally when a Node app prints something to the console, every line looks the same — no color, no timestamp, no way to tell how serious it is at a glance. crisplogs fixes that with one setup call: after that, every `logger.info(...)` or `logger.error(...)` you write automatically gets color-coded by severity, timestamped, tagged with the file and line it came from, and optionally saved to a file with the color codes stripped out so the file stays readable."

**If they want more:** Walk through the actual example — `setupLogging()` then `logger.info("Server started", { port: 8000 })` — and describe what shows up on screen versus what a plain `console.log` would have shown.

---

### 3. "Why did you build this instead of using an existing logging library like pino or winston?"

**Say this first:** "Two honest reasons. First, a real gap for my own use case: pino is built for raw speed and machine-readable output, and needs a separate tool just to look nice in a terminal during development — I wanted something that looked good out of the box, with zero dependencies, for CLIs and local dev. Second — and just as important — the packaging lifecycle itself was the actual learning goal. You only really understand how npm packages work end to end by publishing one yourself."

**If they want more:** "I can be specific about the trade-off: pino does almost no work per log call, which is why it's fast — no color parsing, no box drawing, no stack-trace capture by default. crisplogs spends real effort per line to make the output pleasant for a human to read directly. That's a deliberate choice, not something I didn't know about — for a high-throughput production service I'd recommend pino, and I say that explicitly in my own docs."

**If they push further ("so when would you actually use this?"):** "CLIs, local development, small scripts, side projects — anywhere a human is directly watching the terminal and zero dependencies matters more than raw throughput."

---

### 4. "Did you use AI to build this?"

This is increasingly a standard question, not a gotcha. Answer it straight — see Tier 6 for the full treatment. Short version:

**Say this first:** "Yes, extensively — I used AI coding assistants throughout. I made the design decisions and reviewed every change, and I can explain and defend any part of this codebase. I actually found a couple of real bugs myself by testing it after the fact — not by assuming the AI got everything right."

**If they want more:** Go to Tier 6, question 32.

---

### 5. "What was the hardest or most interesting part of building this?"

**Say this first:** "Getting the layout correct when color is involved. A colored piece of text technically has more characters in it than what you actually see, because of invisible formatting codes wrapped around the visible text. Every width calculation — box borders, padding, line wrapping — has to specifically ignore those invisible characters and only count what's visible, or the layout drifts out of alignment."

**If they want more:** "I actually had a real bug from this — colored box borders would drift crooked because an early version of the word-wrap logic was counting the invisible characters by mistake. The fix was making every width calculation strip the invisible codes out first before measuring." (This is a real, verifiable commit — see `18c27b4` in the git history if asked to point at it.)

---

## Tier 2 — Core architecture and mechanics

The interviewer read the README or skimmed the code before this call. These questions test whether you actually understand what's running, not just what it's called.

### 6. "Explain the architecture."

**Say this first:** "It's a Logger, Record, Handler, Formatter pipeline. You call a level method like `logger.info(...)`. The Logger checks if that's important enough to bother with, and if so, builds a structured record — message, timestamp, severity, caller location, extra data. That record gets handed to every attached Handler — say, one for the console and one for a file — and each Handler independently decides, using its own threshold, whether to actually write it. Right before writing, a Formatter turns the record into the actual text or box you see."

**If they want more:** "The reason this separation matters: I can add a completely new destination — say, sending logs to an HTTP endpoint — without touching how logs are formatted, and I can change how things look without touching where they go. It's the same model Python's built-in `logging` module uses, which is a proven design I deliberately borrowed rather than inventing from scratch."

---

### 7. "How does `moduleLogger()` know the configuration from `setupLogging()` when there's no import connecting those two files?"

This is the exact question from this conversation. It's a strong one because it tests real understanding, not memorized facts.

**Say this first:** "It's a module-level singleton. `crisplogs` keeps one internal lookup table — a `Map` of logger names to logger instances — declared at the top of its own source file. Because Node only loads a given package once per process and caches the result, every file that imports from `'crisplogs'` gets a reference to that exact same cached module, including that same shared `Map`. So `setupLogging()` in one file and `moduleLogger()` in another are reading and writing the same shared object, without either file needing to import anything from the other."

**If they want more:** "Concretely: `setupLogging()` writes a logger into that map under the key `''` for root. `moduleLogger()` calls `getLogger(name)`, which checks the map — if the name isn't there yet, it creates a new logger as a child of root and copies over root's handlers, so it inherits the same console and file destinations, same level threshold, same everything. Neither file passes a value to the other directly; they're both just reaching into the same shared, already-populated state."

**If they push further — "what's the catch?":** "It's order-dependent. If `moduleLogger()` runs before `setupLogging()` has executed anywhere in the process, there's no root entry yet, so it falls back to a bare logger with zero destinations attached — it silently produces no output at all. I actually demonstrated this directly: reversing the import order between two files went from full boxed output to complete silence. There's also a 'dual-package hazard' — if a project somehow loads two separate copies of the library (mixing old-style and new-style imports in a way that causes that), each copy gets its own separate map, and configuring one doesn't affect the other."

**If they ask "is this good design?":** "It's a reasonable trade-off for a small library where you want one shared app-wide configuration reachable from anywhere with zero setup per file. The cost is implicit, order-dependent global state, which makes testing a little awkward — tests need to explicitly reset the registry between runs so one test's configuration doesn't leak into the next. If I were designing something where that mattered more, I'd lean toward explicitly passing the logger in rather than implicitly reaching through a shared module cache."

---

### 8. "How does the library know which file and line number logged a message?"

**Say this first:** "It uses a feature of Node's underlying engine (V8) that lets you generate a stack trace — a list of function calls — attached to any object, even without actually throwing a real error. There's a second argument that lets you say 'cut off everything at or above this specific function,' so the very first entry left in that trace is the user's own code, not any of the library's internal machinery."

**If they want more:** "Each log-level method passes itself as that second argument — `this.info` from inside the `info` method — so the cut happens right at the boundary between the library and the caller. Then the resulting stack trace, which is just a block of text, gets parsed with a couple of regular expressions to pull out the file path and line number, because Node's stack traces come in two slightly different text formats."

**If they push further — "isn't that expensive?":** "Yes — it's the single most expensive operation in the whole library, since it builds a stack trace on every log call. There's a setting, `captureCallerInfo: false`, that skips it entirely for performance-sensitive code; logs then just show a placeholder instead of the real file and line. That's exactly the trade-off pino avoids by not offering this feature at all — it's part of why pino is faster and crisplogs is more convenient for debugging."

---

### 9. "Walk me through exactly what happens when I call `logger.info(\"message\", { extra: 1 })`."

**Say this first:** "First, the logger checks the message's severity against its own configured threshold — if it's too low, it's dropped immediately and nothing else happens. If it passes, the logger captures the caller's file and line, and builds a single structured object containing the message, severity, timestamp, logger name, location, and the extra data. That object gets handed to every attached handler."

**If they want more:** "Each handler — say, one for the console, one for a file — independently checks the severity again against its *own* threshold, which can be different from the logger's. If it passes, the handler asks the shared formatter to turn that structured object into actual text, and then writes it to its destination. The file handler additionally strips out any invisible color-formatting codes before writing, since a plain text file doesn't need them."

---

### 10. "Why do the console and the file have separate severity thresholds instead of one shared setting?"

**Say this first:** "Because in practice you want different amounts of detail in each place. While developing, you want to see everything on screen, but you don't necessarily want every debug-level message accumulating forever in a log file. Having two independent thresholds — one per destination — means a single `logger.debug(...)` call can show up on screen but get automatically excluded from the file, without writing two separate logging calls."

**If they want more:** "Mechanically this works because level-checking happens twice: once at the logger level as an early exit, and then again independently inside each handler. Two handlers attached to the same logger can have completely different thresholds."

---

### 11. "What happens if one of the delivery destinations — say, writing to a file — throws an error?"

**Say this first:** "It's caught, not allowed to propagate. Every handler's write is wrapped in a try/catch, and if it fails, the failure gets reported to standard error instead of crashing the app. The core principle is that a logging library crashing the very application it's supposed to be observing is a much worse outcome than one log line silently failing to save."

**If they want more:** "That same defensive posture shows up in a few more places — closing handlers swallows errors so cleanup never throws, and even the fallback error-reporting write itself is wrapped, in case standard error is somehow broken too. And separately, if someone logs an object that accidentally references itself, which would normally crash JavaScript's built-in JSON conversion, that specific failure is caught and replaced with a placeholder instead of crashing."

---

### 12. "How do you support both `require()` and `import` for the same package?"

**Say this first:** "The library is written once in TypeScript, and a build tool automatically produces two separate compiled outputs from that single source — one for each import style. The package's configuration file then tells Node exactly which file to hand someone depending on which style they used."

**If they want more:** "Specifically, there's an `exports` field in `package.json` that maps `'require'` to the CommonJS build and `'import'` to the ESM build, plus a `'types'` entry so TypeScript users get autocomplete either way. There are also older fallback fields — `main` and `module` — kept for tooling that predates the `exports` field."

**If they push further — "any downside to shipping both?":** "Yes — it's called the dual-package hazard. If a project somehow ends up loading both compiled versions in the same process — which can happen when dependencies are mixed between old and new import styles — you get two separate copies of the module, each with its own internal state. For crisplogs specifically, that would mean two separate logger registries that don't know about each other. It's a known, documented trade-off of shipping dual formats, not something unique to this project."

---

## Tier 3 — npm and packaging

You explicitly said you've never shipped a package without AI help, so expect this to get real attention. These are the questions that separate "I ran `npm publish` once" from "I understand what actually happens."

### 13. "What actually happens when you run `npm publish`?"

**Say this first:** "npm first runs any pre-publish checks I've configured — for this project, that's linting the code and rebuilding it fresh — and blocks the whole publish if either fails. Then it zips up exactly the files I've explicitly allowed, uploads that to npm's servers under the package name and version number, and from that point on, anyone in the world can install it."

**If they want more:** "That pre-publish check is a script called `prepublishOnly`, and mine runs `lint && build`. It's a safety net that makes it structurally impossible to publish code that doesn't pass linting or doesn't compile — the publish command itself won't proceed. The registry never builds anything on its end; you're publishing finished output, not source."

---

### 14. "How do you decide the version number for a new release?"

**Say this first:** "Semantic versioning: patch for bug fixes that don't change behavior, minor for new features that don't break anything existing, major for anything that could break existing usage. This package is still in the 0.x range, where the convention loosens a bit — even a minor bump is allowed to include small breaking changes, since the whole API is considered not fully settled yet."

**If they want more:** "A real example from this project's changelog: version 0.3.0 added a new feature — `moduleLogger()` — which would normally justify a minor bump on its own. But the same release also changed invalid color strings from silently doing nothing to throwing a clear error, which is technically a breaking change for anyone depending on the old silent behavior. Under a post-1.0 versioning scheme that would have forced a major bump instead; under the 0.x convention it's acceptable as a minor release, as long as it's documented — which it is, in the changelog."

**If they push — "what does `^0.3.0` mean for consumers?":** "It only allows patch updates — `>=0.3.0 <0.4.0` — because the caret symbol is specifically special-cased for 0.x versions, treating the second number as if it were the major version. That's different from `^1.3.0`, which would allow anything up to but not including 2.0.0."

---

### 15. "What controls exactly what ends up inside the published package?"

**Say this first:** "There are two competing approaches — an allow-list or a block-list — and I use the allow-list, a `files` field in `package.json` that says 'only include this folder, nothing else.' I ship only the compiled build output, not the source, tests, or examples."

**If they want more:** "The allow-list approach is safer than the alternative, a `.npmignore` block-list — with an allow-list, forgetting to add a new file just means it's missing, which is a minor annoyance. With a block-list, forgetting to exclude a new file means it silently ships, which is exactly the kind of mistake that's led to real accidental leaks of private files and credentials on npm in other projects. I also always run `npm pack --dry-run` before publishing to see the exact file list before it's too late to change anything."

---

### 16. "How would you actually verify a package works correctly before publishing it for real?"

**Say this first:** "Build the real, final zip file exactly as it would be published, and install that exact file into a separate throwaway test project — that's the highest-fidelity check, because it's genuinely the same file a real user would get."

**If they want more:** "There's a faster alternative — creating a symlink shortcut into a test project instead of a real install — but that resolves dependencies slightly differently and can hide the two most common 'works on my machine, broken for users' bugs: a missing entry in the files allow-list, or a misconfigured entry map that points the wrong format at the wrong file. Installing the actual built tarball catches both, because it's not a shortcut — it's the real artifact."

---

### 17. "What's the difference between `dependencies`, `devDependencies`, and `peerDependencies`?"

**Say this first:** "`dependencies` get installed for everyone who installs your package, because your code needs them to actually run. `devDependencies` are only needed while you're developing or building the package — things like the test runner or the linter — and never get downloaded by someone who installs your finished package. `peerDependencies` are a special case: 'you, the person using my package, need to already have this installed, and we should share one copy of it' — common for plugins that extend something like a UI framework."

**If they want more:** "crisplogs has zero of the first kind — that's a deliberate choice — and only development-time tools in the second category: TypeScript, the build tool, the test runner, and the linter. It has no peer dependencies because it's fully standalone."

---

### 18. "Why does this package have zero runtime dependencies? Isn't that more work?"

**Say this first:** "It is more work — I had to implement date formatting, color-code parsing, and text-wrapping myself instead of pulling in existing tools for those. But for a library this specific, the trade-off is worth it: every dependency is code you're implicitly trusting, it adds install size and resolution time for everyone downstream, and it's one more thing that could conflict with a different version of the same dependency somewhere else in someone's project."

**If they want more:** "It ended up being roughly 300 extra lines of code to avoid all of that, which felt like a clearly good trade for something as focused as a logging library. It also means `npm audit` — the tool that scans your dependency tree for known security issues — has essentially nothing to scan for this package specifically, since there's no third-party code pulled in at runtime."

---

### 19. "What's the difference between `npm install` and `npm ci`, and when would you use each?"

**Say this first:** "`npm install` resolves version ranges and can update the lockfile if newer compatible versions are available. `npm ci` installs exactly what the lockfile already says, with zero guessing, and fails loudly if anything doesn't match. You use `ci` in automated systems, because reproducibility — the exact same result every time, on every machine — is the entire point of automated testing."

**If they want more:** "The lockfile itself is a receipt recording the exact version and integrity fingerprint of every installed package, including nested dependencies. Libraries should commit their lockfile for their own development reproducibility, but it's worth knowing it isn't published and doesn't constrain anyone installing your package — only your declared dependency ranges affect them."

---

### 20. "Suppose you published a version with a serious bug. Walk me through what you'd actually do."

**Say this first:** "Publish a fixed version immediately under a new, higher version number — you can never overwrite or reuse the broken one, that number is permanently gone once published. Then mark the broken version as deprecated so anyone trying to install it sees a clear warning pointing them to the fix."

**If they want more:** "Fully deleting a published version is only realistically possible within the first 72 hours, and only if almost nobody has downloaded it yet — npm tightened that policy after a famous 2016 incident where a developer unpublished a tiny, widely-used package and broke a huge number of unrelated projects that quietly depended on it. Deprecation is the correct tool for 'stop using this' without breaking anyone still relying on it."

---

## Tier 4 — Design, testing, and trade-offs

### 21. "How do you test something whose output is full of invisible terminal formatting codes?"

**Say this first:** "In layers. The formatting logic itself is tested as a pure function — feed it a fixed sample record, check the exact text that comes back, no actual screen or file involved. For the parts that write somewhere, I intercept the write function during the test so nothing actually prints, and assert on what would have been written. Most behavioral tests run with colors turned off entirely, since asserting against literal invisible codes makes tests hard to read; a few tests specifically check that the color codes are present when they should be."

---

### 22. "How does this compare to pino or winston? When would you specifically not use this?"

**Say this first:** "Different goals entirely. pino is optimized for raw throughput on a busy production server — minimal work per log call, machine-readable output, asynchronous writing. crisplogs spends real effort per line — capturing the caller location, formatting colors, drawing boxes — to be pleasant for a human to read directly in a terminal. I'd use pino for a high-traffic production service, and crisplogs for CLIs, local development, and smaller projects where readability matters more than nanoseconds per call."

**If they want more:** Mention specific gaps honestly — no log rotation, no automatic redaction of sensitive data, no JSON-lines output for log aggregators, synchronous writes that can block under very heavy load. Naming these unprompted is stronger than waiting to be asked.

---

### 23. "What would you change if you rebuilt this from scratch?"

**Say this first:** "Three things. Add the ability for a logger to remember shared context automatically — like a request ID attached to every message from that point on — instead of retyping extra data on every call, which is the single most useful feature real logging tools have that this one is missing. Fix a real bug where a 'would this level even be shown?' check doesn't actually reflect the real configured threshold. And set up automated testing across multiple operating systems from day one, instead of discovering a platform-specific test failure later."

---

### 24. "Are there any known bugs in the current code? Be specific."

**Say this first:** "Yes, and I can point at them exactly. There's a logic bug where a function meant to let you check 'would this severity level actually get logged right now, before doing expensive work to build the message' gives the wrong answer — it doesn't account for the real threshold that ends up on the delivery handler, only an internal default. I verified this directly by testing it."

**If they want more:** "There's also one automated test that only passes depending on which operating system runs it — it checks Windows-style file paths, but the path-shortening tool behaves differently on Windows versus Mac and Linux. And two of the project's own documentation files disagree about the minimum required Node.js version, which is a small but real inconsistency."

---

### 25. "Is there a test that currently fails? Walk me through why."

**Say this first:** "Yes, one out of ninety-one. It checks that a Windows-style file path — using backslashes — gets shortened to just the filename correctly, but the built-in path tool used to do that shortening only treats backslashes as separators on Windows itself. So the test passes if run on Windows, but fails on Mac or Linux."

**If they want more:** "It's actually a good illustration of a bigger gap: there's no automated testing pipeline that runs on every code change, across multiple operating systems. Right now everything depends on the person publishing remembering to run the tests themselves, on whatever machine they happen to be using — which is exactly how an OS-specific failure like this goes unnoticed."

---

## Tier 5 — Deep-dive and curveball questions

These only come up with a thorough interviewer, or as a follow-up once you've already impressed them. Nailing one of these tends to leave a strong final impression.

### 26. "What happens if someone logs an object that references itself?"

**Say this first:** "JavaScript's built-in tool for converting objects to text — `JSON.stringify` — actually crashes on objects that contain a reference back to themselves. Since a logging library should never be the reason an application crashes, that conversion is wrapped in a safety net: if it fails, instead of crashing, it just writes a placeholder text and moves on."

---

### 27. "Why does colored text mess with box-drawing alignment, and how was it fixed?"

**Say this first:** "A colored piece of text technically contains more characters than what's visually displayed, because of invisible formatting codes wrapped around the visible text. Any calculation measuring 'how wide is this line' — for padding, box borders, or deciding where to wrap a long line — has to specifically skip those invisible characters and count only the visible ones, or the layout drifts out of alignment."

**If they want more:** "This was a real, fixed bug — an earlier version of the line-wrapping logic was counting the invisible characters by mistake, so colored box borders would end up crooked. The fix made every width calculation strip the invisible formatting codes before measuring."

---

### 28. "What's the 'dual-package hazard,' and does this project have it?"

**Say this first:** "It's what happens when a package ships in two module formats and a project somehow ends up loading both copies in the same running process — each copy gets treated as a completely separate module instance with its own internal state. For this project specifically, that would mean two separate logger registries that don't know about each other — configuring one wouldn't affect the other."

**If they want more:** "It's a known, documented trade-off of shipping dual formats rather than a bug unique to this project. The mitigation is either documenting it clearly, which I did, or in more extreme cases shipping only one format, or moving genuinely shared state outside the module entirely."

---

### 29. "Is there a downside to using a shared global registry the way this project does?"

**Say this first:** "Yes — it creates implicit, order-dependent state. If code that reads from the registry runs before the code that configures it, it silently gets no configuration at all rather than an error telling you what went wrong. I demonstrated this directly by reversing an import order between two files and getting total silence instead of the expected output."

**If they want more:** "It also affects testability — because the registry is shared process-wide, tests need to explicitly reset it between runs, or one test's configuration can leak into the next and cause confusing, order-dependent test failures. The alternative design would be explicitly passing a logger instance around instead of implicitly reaching through shared module state — more boilerplate, but no hidden order dependency."

---

### 30. "How would you make this measurably faster if performance became a priority?"

**Say this first:** "I'd measure first — there are no real benchmarks right now, so any answer without measuring is a hypothesis. But my best guess is that capturing the caller's file and line number is the single biggest cost, since it builds a stack trace on every call — that's already optional and I'd push harder on defaulting it off in performance-sensitive code."

**If they want more:** "After that, I'd look at whether color codes get recalculated on every single formatted line instead of once at setup time — they're fixed once configuration happens, so re-parsing the same color strings repeatedly is pure waste at high volume. I'd also look at whether writes could be batched instead of one write per log line, though that trades off some immediacy."

---

### 31. "How would you add something like a request ID that automatically shows up on every log line during a single web request?"

**Say this first:** "I'd use `AsyncLocalStorage`, a Node.js feature built specifically for this — it lets you store a context value at the start of handling a request, and that value stays correctly attached even across `await` points, without needing to manually pass it through every function call."

**If they want more:** "The logger's core logging function would read from that storage and automatically merge whatever's there into the extra data on every call. That's the same mechanism used by more advanced tools like OpenTelemetry for exactly this kind of request-scoped context propagation. A simpler, more explicit alternative would be a `logger.child({ requestId })` method that returns a new logger with that context permanently attached — less automatic, but easier to reason about since it's explicit rather than relying on hidden storage."

---

## Tier 6 — Behavioral: talking about AI-assisted development

Increasingly common, not a trap — but a weak answer here undermines everything else you said well. The goal is to sound like someone who directed the work and can defend it, not someone who typed a prompt and hoped.

### 32. "How do you make sure you actually understand code you didn't personally type character by character?"

**Say this first:** "By reading it carefully, testing it deliberately, and trying to break it on purpose. For this project specifically, that meant running every example myself, writing checks that verify actual output rather than trusting that it works, and forcing myself to explain the non-obvious parts — like exactly why colored text breaks width calculations, or exactly why the logger registry needs to clean up before reconfiguring."

**If they want more:** "It's also how I found real issues in the code afterward — I was tracing through what the logger's actual configured level was set to, and noticed a mismatch between what one function reported and what the delivery handler actually used. That's not something I'd have caught by assuming the code was correct; I only found it by actively verifying behavior."

---

### 33. "What did you personally decide, versus what came from AI suggestions?"

**Say this first:** "The design decisions were mine — I made the calls, reviewed every change, and can defend any part of the codebase. A concrete example: collapsing four separate formatter classes into one configurable class, and later changing invalid color inputs from silently doing nothing to throwing a clear error, were both decisions I made based on real problems I ran into using the library myself."

---

### 34. "If I asked you to add a small feature to this right now, live, could you?"

Don't just say yes — show it. This is asking you to prove the understanding claim in real time.

**Say this first:** "Yes — for example, adding a `logger.child({ requestId })` method would mean adding a method to the `Logger` class that returns a new `Logger` sharing the same handlers but with a stored context object, then merging that context into the extra data inside the private logging method every log call goes through."

**If asked to actually do it:** Point to the exact file (`src/logger.ts`) and describe the specific change: a new private field for bound context, a new public method that constructs a lightweight wrapper or new `Logger` instance sharing `_handlers`, and a change in `_log` to merge that stored context object with the per-call `extra` object before building the record.

---

### 35. "What's a limitation you personally found, that you'd want to fix next?"

**Say this first:** "The 'would this level even show?' check doesn't actually reflect the real configured threshold — it always checks against an internal default instead of what the console handler was actually set up with. I found this by deliberately tracing through what value the logger's level was set to after calling the main setup function, and it didn't match what I expected."

---

## Rapid-fire round

Short, likely-to-be-fired-in-sequence questions near the end of a technical portion. One or two sentences each is the right length — don't over-explain these.

| Question | Answer |
|---|---|
| What license is it under? | MIT — very permissive, anyone can use it for almost anything. |
| How many published versions? | Six, from 0.1.0 to the current 0.3.0. |
| How many runtime dependencies? | Zero. |
| How many automated tests? | 91, with 90 currently passing (one fails only on non-Windows machines). |
| What Node.js version does it require? | 16 or newer. |
| What are the five severity levels? | DEBUG, INFO, WARNING, ERROR, CRITICAL — numerically 10, 20, 30, 40, 50, matching Python's `logging` module. |
| What does `^0.3.0` mean as a version range? | Only patch updates — anything from 0.3.0 up to, but not including, 0.4.0. |
| What's a lockfile for? | A receipt of the exact versions and fingerprints installed, so repeated installs are identical. |
| What's the `exports` field in `package.json` for? | Tells Node exactly which built file to hand a consumer depending on whether they used `require` or `import`. |
| What's ANSI, in one sentence? | Invisible byte sequences that tell a terminal to change color or formatting — they don't display as visible characters. |
| What build tool compiles the TypeScript? | tsup, which wraps a faster underlying tool called esbuild. |
| What test runner is used? | Vitest. |
| What's the linter? | Biome — handles both linting and formatting in one tool. |
| What's the difference between a patch and a minor version bump? | Patch = bug fix, no behavior change. Minor = new feature, still backward compatible. |
| Can you reuse a version number after unpublishing it? | No — once published, that exact number is permanently unavailable, forever. |

---

## General strategy for the room

A few reminders on delivery, not content:

- **Lead with the short answer, always.** Let the interviewer pull more out of you with a follow-up rather than front-loading every answer with the full technical depth. It's a conversation, not a recitation.
- **Point at something concrete when you can.** "That's in `src/logger.ts`, in the private `_log` method" sounds far more credible than a purely abstract description, even if you can't recite the exact line number.
- **Volunteer the honest limitation before they find it.** Every strong answer above ends with a real trade-off or a real known gap. Interviewers trust people who name the weak spots themselves far more than people who only admit them under pressure.
- **It's fine to say "I'd want to verify that" or "I'd measure before assuming."** Several answers above lean on this explicitly (performance claims, for instance) — that's a sign of engineering maturity, not a weakness to hide.
- **If a question uses a term you don't recognize, ask them to clarify rather than guessing.** Every term used in this file's answers is either self-explanatory in context or was defined the first time it appeared in the companion file, `PROJECT-GUIDE.md` — if a follow-up goes somewhere unfamiliar, it's better to ask than to bluff.
