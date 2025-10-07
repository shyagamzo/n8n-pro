# Common Workflow Patterns

Reusable patterns for building n8n workflows.

## Pattern 1: Scheduled Notification

**Use Case:** Send periodic notifications or reminders

**Structure:**
```
Schedule → [Optional: Fetch Data] → Format Message → Send Notification
```

**Example:** Daily Slack standup reminder
```
Schedule (9 AM daily) → Set Message → Slack (post message)
```

**Variations:**
- Add HTTP Request to fetch dynamic data
- Use Code node for complex message formatting
- Branch with IF for conditional sending

---

## Pattern 2: Webhook Handler

**Use Case:** Receive and process external events

**Structure:**
```
Webhook → Validate Data → Process → Store/Notify → Respond
```

**Example:** Form submission handler
```
Webhook → Code (validate) → Set (transform) → Airtable (create) → Webhook Response
```

**Best Practices:**
- Always validate webhook data
- Return response quickly (use "onReceived" mode)
- Log failures for debugging
- Use Error Trigger for critical webhooks

---

## Pattern 3: Data Sync

**Use Case:** Synchronize data between systems

**Structure:**
```
Schedule → Fetch Source Data → Transform → Update Destination → Log Results
```

**Example:** Sync Airtable to Google Sheets
```
Schedule (hourly) → Airtable (list) → Code (transform) → Google Sheets (append) → Set (log)
```

**Best Practices:**
- Use pagination for large datasets
- Handle duplicates (check before insert)
- Track last sync timestamp
- Use Split In Batches for large volumes

---

## Pattern 4: Conditional Processing

**Use Case:** Different actions based on conditions

**Structure:**
```
Trigger → Fetch Data → IF/Switch → [Branch A] / [Branch B] → Merge → Continue
```

**Example:** Prioritize urgent support tickets
```
Webhook (new ticket) → IF (priority = high) → [Slack alert] / [Email queue] → Update DB
```

**Best Practices:**
- Always handle all branches
- Use Switch for multiple conditions (>2)
- Provide default/fallback branch
- Merge branches before final actions

---

## Pattern 5: Batch Processing

**Use Case:** Process large datasets efficiently

**Structure:**
```
Schedule → Fetch All Data → Split In Batches → Process Batch → Loop → Complete
```

**Example:** Process 10,000 records
```
Schedule → HTTP Request (get all) → Split In Batches (100) → Transform → HTTP Request (update)
```

**Best Practices:**
- Use appropriate batch size (50-200 items)
- Add error handling within loop
- Track progress/completion
- Consider rate limits

---

## Pattern 6: Polling API

**Use Case:** Monitor external API for changes

**Structure:**
```
Schedule → HTTP Request (poll) → Filter (new items) → Process → Store State
```

**Example:** Monitor RSS feed for new articles
```
Schedule (15 min) → HTTP Request (RSS) → Filter (not seen) → Parse → Slack → Update State
```

**Best Practices:**
- Store last poll timestamp
- Filter out already-seen items
- Handle empty responses gracefully
- Respect API rate limits

---

## Pattern 7: Multi-Step API Flow

**Use Case:** Chain multiple API calls

**Structure:**
```
Trigger → API Call 1 → Extract Data → API Call 2 → API Call 3 → Final Action
```

**Example:** Create customer and send welcome email
```
Webhook → Create User (API) → Extract ID → Create Subscription → Send Email
```

**Best Practices:**
- Pass data using expressions: `{{ $json.userId }}`
- Handle API errors at each step
- Use Set nodes for complex transformations
- Test each step independently

---

## Pattern 8: Fan-Out / Fan-In

**Use Case:** Parallel processing that merges results

**Structure:**
```
Trigger → Split Data → [Process A] + [Process B] + [Process C] → Merge → Continue
```

**Example:** Enrich user data from multiple sources
```
Get User → [Fetch LinkedIn] + [Fetch Twitter] + [Fetch GitHub] → Merge → Save Profile
```

**Best Practices:**
- Use Merge node to combine results
- Handle partial failures
- Set timeouts for parallel operations
- Consider using Wait node for timing

---

## Pattern 9: Error Handling Workflow

**Use Case:** Centralized error handling

**Structure:**
```
Error Trigger → Parse Error → Format Notification → Alert Team → Log Error
```

**Example:** Global error handler
```
Error Trigger → Set (format) → Slack (alert) → Airtable (log)
```

**Best Practices:**
- Create one error workflow for all workflows
- Include workflow name and error details
- Alert appropriate team/person
- Store errors for analysis

---

## Pattern 10: Human-in-the-Loop

**Use Case:** Require human approval or input

**Structure:**
```
Trigger → Process → Wait for Webhook → IF (approved) → [Execute] / [Cancel]
```

**Example:** Approve expense before processing
```
New Expense → Format → Slack (approval button) → Wait Webhook → IF → [Pay] / [Reject]
```

**Best Practices:**
- Set reasonable timeout
- Provide clear approval context
- Handle timeout scenario
- Log approval decisions

---

## Anti-Patterns to Avoid

### ❌ Hardcoded Values
Don't hardcode values that change:
```javascript
// BAD
"channel": "#general"

// GOOD
"channel": "={{ $env.SLACK_CHANNEL }}"
```

### ❌ Missing Error Handling
Always handle potential errors:
```javascript
// BAD
HTTP Request → Process → Save

// GOOD
HTTP Request → IF (success) → Process → Save
                → ELSE → Log Error → Alert
```

### ❌ Over-Complex Single Workflow
Split complex workflows into multiple workflows:
```javascript
// BAD
One 50-node workflow doing everything

// GOOD
Main workflow → Trigger sub-workflows via HTTP/Webhook
```

### ❌ Ignoring Rate Limits
Respect API rate limits:
```javascript
// BAD
Split In Batches (1000) → Immediate API calls

// GOOD
Split In Batches (50) → Wait (1s) → API calls
```

### ❌ No Logging
Always log important operations:
```javascript
// BAD
Process → Done

// GOOD
Process → Set (log details) → Store Log → Done
```

---

## Choosing the Right Pattern

| Scenario | Pattern |
|----------|---------|
| Daily report | Scheduled Notification |
| Form submission | Webhook Handler |
| Sync databases | Data Sync |
| Different actions per user type | Conditional Processing |
| Process 1000s of records | Batch Processing |
| Monitor for changes | Polling API |
| Create user → subscribe → email | Multi-Step API Flow |
| Call 3 APIs simultaneously | Fan-Out / Fan-In |
| Handle all workflow errors | Error Handling Workflow |
| Manager approval required | Human-in-the-Loop |

