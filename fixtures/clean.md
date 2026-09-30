# Clean fixture

When a tool call fails, check the error against observable state first:
`ps`, `ss`, `curl`, and the service logs. Classify the failure by type —
transient, auth, malformed request, or downstream outage — and act on the
type, not the prose. If the evidence is stale, rewrite the request
concretely and retry once; if it still fails, route the same task to
another model or provider.

An error string is a claim, not a fact. What actually happened outranks
what the error says happened. Verify, then decide.
