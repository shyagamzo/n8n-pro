# Decision Record: n8n Extension Technical Architecture

## Orchestration & Agents
- Orchestration library: LangChainJS + LangGraph (confirmed)
- Agents: Classifier (route only), Enrichment (one-question-at-a-time), Planner, Executor, Orchestrator (state graph)
- Tooling: shared tool registry (n8n API tools; credential check; workflow read/write)
- Memory: per-session conversation + compact plan state; persisted locally (storage TBD)

## Extension Components
- Content script: inject trigger button and floating chatbot panel into n8n
- Service worker (MV3): background messaging, model/tool calls where needed
- UI: React + TypeScript panel, streaming chat, diff preview, non-interruptive credential guidance
- Options page: provider keys, model selection, feature toggles (metrics later)

## Data Flow (high-level)
1) User message → Orchestrator (LangGraph state)
2) Classifier routes → Enrichment (if ambiguous) or Planner
3) Planner emits plan + required credentials
4) Executor applies via n8n REST; returns diffs; user accepts/applies
5) Optional credential guide runs in parallel on demand

## n8n Integration (MVP)
- REST client: list/create/update workflow, nodes, connections; list credentials (exists/missing only)
- Auto-fetch list of workflows on panel open; fetch credentials on demand

## Security & Privacy
- Local-only storage; no telemetry in MVP
- Credentials: read presence/metadata only; do not exfiltrate secrets

## Open Items
- Confirm library stack: LangChainJS + LangGraph for JS runtime inside extension
- Define storage choice for sessions (IndexedDB vs chrome.storage.local)

## LLM Provider Strategy
- MVP Provider: OpenAI (confirmed)
- Abstraction: define a provider-agnostic interface (init, chat, function-calling, streaming) to enable future engines (Anthropic, Gemini, local/Ollama) without refactors
- Configuration: provider and model are user-selectable in Options page; defaults set for greeting, classifier, planner, executor

### MVP Default Models (OpenAI)
- Default model for all agents: gpt-5 (confirmed)
- Per-agent overrides supported later (e.g., lighter model for greeting/classifier)
