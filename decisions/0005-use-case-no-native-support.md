# Decision Record: Use Case — Solving Gaps with No Built-in n8n Support

## Intent
Handle requests for services or behaviors without native n8n nodes by proposing viable implementation strategies, then executing the chosen approach.

## Solution Strategies (bot proposes, does not prefer)
- Generic HTTP Request + auth handling (Core HTTP node; handle auth, pagination, rate limits as needed)
- Code Node (JavaScript) for custom logic where HTTP alone is insufficient
- Community/Custom Node discovery (if available), otherwise fallback to HTTP/Code
- Sub-workflow as a tool: design a node or chain as a separate workflow and use it via Call
