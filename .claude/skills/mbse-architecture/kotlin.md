# Write, compile and apply a Kotlin generator

A generator is a Kotlin object that **describes** an architecture, or a slice of one layer, in the vocabulary of the
method. It writes nothing itself. The engine of the OMF `mbse` library does the writing:
- it compares the description with the model;
- it creates, updates and files the elements.

The full specification is in [method/implementation.md](../../../method/implementation.md). What is not implemented
yet is in [method/backlog.md](../../../method/backlog.md).

## Where

| What | Where |
|---|---|
| A project's generators | **its own Gradle project, outside OMF and outside the plugin**, compiled against `omf-mbse-core` only. Reference: `C:\workspace\metro-demo\architecture` (`src/main/kotlin/metro/*.kt`) |
| Declaration | one `ArchitectureProvider` class, listed in `META-INF/services/com.elliades.isae.mbse.core.ArchitectureProvider` |
| Loading | `arch.sh load <jar>` (MCP `arch/load {jar}`), or a jar in `~/.mbse/architectures/` (`-Dmbse.architectures=<dir>`), loaded at start |
| Built into the plugin | the Part 3 example only (`architectures/Architectures.kt` in OMF) |
| Library | core: `omf-mbse-core` (`com.elliades.isae.mbse.core`, with `ArchitectureScript`, `ModelView`, `Description`); engine: `…/mbseShepherd/mbse/engine` in OMF |
| Rule tests (without Cameo) | the generator project's own tests (`gradlew test`), and `gradlew :omf-mbse-core:test` in OMF |

A Part 2 generator contains graded answers. Its project stays private: never in the public mbse-shepherd repository.

## Skeleton

```kotlin
package part1

import com.elliades.isae.mbse.core.*      // models, DSL, rules, ArchitectureScript, ModelView, Description (omf-mbse-core)

/** Parameter Mission (Part 1): flight plan context, use case, SD 1 and RD 1. Tables validated on … */
object ParameterMission : ArchitectureScript {
    override val id = "part1.lc.parameter-mission"
    override val layer = Layer.LC
    override val doc = "Parameter Mission (Part 1): flight plan context, use case, SD 1 and RD 1. Tables validated on …"
    override val into = "1 - Operational Analysis::C - Use Cases and Scenarios"
    override fun describe(view: ModelView): Description {
        val d = lifecycle(view.existing()) {
            // one line per decision of the tables; see lifecycle.md
        }
        return Description(d.toModelSet())
    }
}

/** What the jar brings; listed in META-INF/services/com.elliades.isae.mbse.core.ArchitectureProvider. */
class Part1Architectures : ArchitectureProvider {
    override fun scripts() = listOf(ParameterMission)
}
```

The project's `build.gradle` needs the Kotlin JVM plugin and `compileOnly files('lib/omf-mbse-core.jar')`. The plugin
provides the core at run time. Copy `C:\workspace\metro-demo\architecture` as a starting point.

## Writing rules

- **One generator per architecture**, or per coherent slice of a layer, such as a use case and its scenarios. Its
  KDoc says what it describes and when the tables were validated.
- **`owns` is narrow.** The generator owns only what it describes. An element of its scope that it does not describe
  is reported as "extra".
- **`reads`** lists what is reused without being touched: signals, actors, the layer above.
- **Existing names are copied character for character.** A resolution error gives the closest names: fix the name,
  never create a duplicate. A really new element is created explicitly (`newSignal`, `newActor`, `newExternal`).
- **References, not strings.** Keep the values returned by `signal(…)`, `actor(…)` or `component(…)` in variables, and
  pass them around. The compiler then catches typos.
- **What derives is not written**:
  - the ports of a lifecycle exchange;
  - conjugation;
  - item flows;
  - `<signal>_ext` (`delegate = …`);
  - `refine` and `allocate` links to the functional layer;
  - diagrams.
- **Escape hatch.** `raw { … }` gives access to the SysML kit for a case outside the vocabulary. It shows in the plan
  as `RAW`, and the report says why it was needed. A `raw` block that comes back is a backlog item.
- **Waivers.** An exception accepted at a gate is written `waive(rule, element, because, by)` in the generator.
  The validator honours it and lists it.
- **Start from a neighbouring generator** that works, not from a blank page.

## Compile and run

Cameo must have been started in development mode (`gradlew runMbseShepherd` from OMF), with the project open.

```bash
cd /c/workspace/java/mdplugins/OMF/OMF_Private
export JAVA_TOOL_OPTIONS='-Djdk.net.unixdomain.tmpdir=C:/workspace/tmp-gradle'   # from Claude's shell only
bash scripts/dev/arch.sh part1.lc.parameter-mission plan
```

| Command | Does | Read in the output |
|---|---|---|
| `arch.sh <id> plan` | compiles, hot-reloads, describes, runs the rules on the description, computes the plan | rule errors (blocking); the `CREATE` / `UPDATE` / `REBUILD` / `EXTRA` lines |
| `arch.sh <id> apply` | the same, then writes in one undoable session, derives, reads back and checks | derivation warnings; rules on the model read back; `signalFlowCheck` for the logical layer |
| `arch.sh <id> check` | rules on the model read back, without writing | — |
| `arch.sh <id> validate [profile]` | the validator: `layer:…`, `gate:…`, `delivery`, `trace`, `rules:…` (default `gate:` of the generator's layer) | the verdict `PASS` / `FAIL` / `INCOMPLETE`, the findings, what was waived or skipped |
| `arch.sh <id> trace [profile]` | each layer of the family read back from Cameo, checked in itself and against the next (default profile `consistency`) | the verdict, which layers came from Cameo, the completeness table, the findings by layer |
| `arch.sh <id> present` | the diagrams of the scope, presented and laid out | — |
| `arch.sh <id> chains` | the functional chains of the scope, as generated views | — |
| `curl -s -X POST http://127.0.0.1:9851/mcp/arch/read -d '[{"layer":"lc","scope":"…"}]'` | the existing model, as JSON, in the vocabulary of the method | — |

## Reading the outputs

| Symptom | Likely cause | Do |
|---|---|---|
| compile error | API misused, or a lost reference | read the Kotlin error, fix the generator |
| `not found: 'Ground station' (closest: 'Ground Station')` | name copied wrong | copy the exact name |
| rule error before writing | inconsistent decision | go back to the table, not just the code |
| unexpected `UPDATE` or `EXTRA` in the plan | someone edited the scope by hand, or `owns` is too wide | understand before applying; show the plan to the human |
| a second `plan` is not empty | the library is not idempotent | a library bug: report it, do not work around it |
| rule error only after writing | gap between the description and the model read back: a kit or reader bug | report it, with both models |
| odd simulation after hot reloads | Cameo degraded | restart Cameo before concluding |

## What exists today

- **The DSL and the validator** are in `omf-mbse-core`: `lifecycle {}`, `functional {}` and `logical {}` (package
  `com.elliades.isae.mbse.core`). They run anywhere: in a JUnit test, in a generator, in `mbse-report`.
- **All three layers can be applied in Cameo** (`arch/apply`); the metro generators in
  `C:\workspace\metro-demo\architecture` are the reference. Limits in the backlog: the lifecycle layer is not read back (CORE-11); the functional applier has no
  decision or fork/join (CORE-12); the lifecycle and functional appliers rebuild their package (CORE-05).
- **Reloading.** `arch.sh` refuses to reload while another session has hot-reloaded other categories in the same Cameo.
  To reload changes to the builder or the transition services too, set
  `ARCH_EXTRA_PACKAGES=com.elliades.isae.mbseShepherd.features.logicaltransition`.
- **Calls.** `arch.sh` goes through JSON-RPC: the legacy REST route can drop the response of a long apply.
