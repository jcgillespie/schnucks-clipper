<!--
SYNC IMPACT REPORT
==================
Version: 0.0.0 → 1.0.0 (MAJOR - initial constitution ratification)

Added Principles:
- I. Code Quality First
- II. Simplicity Over Cleverness
- III. Maintainability by Design

Added Sections:
- Quality Standards
- Development Workflow
- Governance

Removed Sections: (none - initial creation)

Templates Requiring Updates:
- ✅ plan-template.md: "Constitution Check" section can use these principles
- ✅ tasks-template.md: Existing structure aligns with simplicity principles
- ✅ spec-template.md: No conflicts with constitution principles

Follow-up TODOs: None
==================
-->

# Schnucks Coupon Clipper Constitution

## Core Principles

### I. Code Quality First

All code MUST be written with quality as the primary concern:

- **Readable**: Code MUST be self-documenting with clear naming conventions. Variable, function, and class names MUST convey intent without requiring comments to explain "what."
- **Testable**: Every function MUST be designed for testability. Side effects MUST be isolated and dependencies MUST be injectable.
- **Consistent**: Code style MUST follow established project conventions. Formatting MUST be automated via tooling (Prettier, ESLint) to eliminate style debates.
- **Explicit**: Implicit behavior is forbidden. Error cases MUST be handled explicitly. Configuration MUST be visible, not hidden in defaults.

**Rationale**: Code is read 10x more often than it is written. Investing in quality upfront reduces long-term cost of ownership and enables faster iteration.

### II. Simplicity Over Cleverness

Every implementation MUST choose the simplest solution that meets requirements:

- **YAGNI**: Do not implement features or abstractions "for later." Build only what is needed now.
- **Flat over nested**: Prefer flat structures over deep nesting. Maximum 2 levels of nesting in control flow; refactor into named functions beyond that.
- **Obvious over clever**: A straightforward 10-line solution is preferred over a clever 3-line solution. Cleverness hides bugs and creates maintenance burden.
- **Single responsibility**: Each file, function, and class MUST do one thing well. If you cannot describe its purpose in one sentence, split it.

**Rationale**: Complexity is the enemy of reliability. Simple code is easier to debug, review, and extend. It also reduces onboarding time for new maintainers.

### III. Maintainability by Design

All code MUST be written for the future maintainer (including your future self):

- **Dependencies**: Minimize external dependencies. Every dependency is a liability. When adding a dependency, it MUST solve a problem that would take >100 lines of custom code.
- **Documentation**: README MUST document how to set up, run, and test. API contracts MUST be documented where they exist.
- **Graceful degradation**: Code MUST handle failure cases without crashing. Error messages MUST be actionable and include context for debugging.
- **Versioning**: Breaking changes MUST be explicitly documented. Changelog MUST be maintained.

**Rationale**: 80% of a codebase's lifetime is spent in maintenance. Code that is easy to maintain reduces operational burden and enables sustainable development velocity.

## Quality Standards

The following standards apply to all code in this project:

| Standard           | Requirement                                            |
| ------------------ | ------------------------------------------------------ |
| **Linting**        | All code MUST pass linting with zero warnings          |
| **Formatting**     | All code MUST be auto-formatted before commit          |
| **Type Safety**    | TypeScript strict mode MUST be enabled                 |
| **Error Handling** | All async operations MUST have explicit error handling |
| **Logging**        | All significant operations MUST log their outcome      |

## Development Workflow

Development follows this workflow to enforce quality gates:

1. **Write tests first** (when applicable): Define expected behavior before implementation
2. **Implement**: Write code that passes tests
3. **Lint and format**: Ensure code passes all automated checks
4. **Self-review**: Read your own code as if you're seeing it for the first time
5. **Commit**: Small, focused commits with descriptive messages

**Commit Message Format**: `<type>: <description>` where type is one of: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

## Governance

This constitution supersedes all other development guidance for this project:

- **Compliance**: All code changes MUST align with the Core Principles
- **Violations**: Any principle violation MUST be documented with explicit justification (see "Complexity Tracking" in plan-template.md)
- **Amendments**: Changes to this constitution require:
  1. Clear rationale for change
  2. Impact assessment on existing code
  3. Version bump according to semantic versioning

**Version**: 1.0.0 | **Ratified**: 2026-01-16 | **Last Amended**: 2026-01-16
