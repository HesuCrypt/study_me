# Debug Session: chatbot-not-working
- **Status**: [OPEN]
- **Issue**: The exam generator works after deployment, but the chatbot is still not working in the deployed app.
- **Debug Server**: Pending startup
- **Log File**: `.dbg/trae-debug-log-chatbot-not-working.ndjson`

## Reproduction Steps
1. Open the deployed app.
2. Open the floating chatbot.
3. Send a message.
4. Observe that the chatbot does not respond as expected.

## Hypotheses & Verification
| ID | Hypothesis | Likelihood | Effort | Evidence |
|----|------------|------------|--------|----------|
| A | The chatbot frontend is calling the wrong route or wrong origin. | Medium | Low | Pending |
| B | `POST /api/chat-coach` is deployed but returns a non-JSON or error response. | High | Low | Pending |
| C | The chat route exists but fails server-side due to request body shape or missing runtime env. | High | Low | Pending |
| D | The chat UI breaks before or after fetch even though the API is healthy. | Medium | Medium | Pending |
| E | The deployed frontend is older than the backend route and is not using the latest code path. | Low | Medium | Pending |

## Log Evidence
- Direct probe against deployed route:
  - `curl -i -X POST https://study-me-xi.vercel.app/api/chat-coach ...`
  - Response: `HTTP/2 500`
  - Headers: `x-vercel-error: FUNCTION_INVOCATION_FAILED`, `content-type: text/plain; charset=utf-8`
  - Body: `A server error has occurred`
- Local isolated handler probe:
  - `npx tsx -e "import handler from './api/chat-coach.ts' ..."`
  - Response: local mock invocation returned `statusCode: 200` with JSON reply
- Applied fix:
  - Removed shared import dependency on `../src/lib/chatCoach`
  - Inlined minimal prompt and parsing helpers directly inside `api/chat-coach.ts`
  - `npm run lint` passed after the change

## Verification Conclusion
- `A` Inconclusive: frontend route resolution has not been disproven yet, but the deployed API route itself is reachable.
- `B` Confirmed: the deployed route fails before returning JSON.
- `C` Confirmed as most likely: the Vercel serverless runtime crashes on the current deployed chat handler path.
- `D` Rejected for now: backend failure is already sufficient to explain the broken chatbot.
- `E` Inconclusive until the new chat fix is deployed.
