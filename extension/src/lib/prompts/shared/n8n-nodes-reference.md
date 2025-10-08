# n8n Nodes Reference

Quick reference for commonly used n8n nodes. For complete documentation, see [n8n docs](https://docs.n8n.io/integrations/).

## Trigger Nodes

### Manual Trigger
**Type:** `n8n-nodes-base.manualTrigger`
**Use:** Testing and manual workflow execution
**Parameters:** None required

### Schedule Trigger
**Type:** `n8n-nodes-base.scheduleTrigger`
**Use:** Run workflows on a schedule
**Parameters:**
- `rule`: Schedule rule configuration
  - `interval`: Array of interval settings
    - For daily: `[{ intervalSize: 1, intervalUnit: 'days' }]`
    - For hourly: `[{ intervalSize: 1, intervalUnit: 'hours' }]`
    - Can add time fields: `[{ intervalSize: 1, intervalUnit: 'days' }, { field: 'hour', value: 9 }]`
  - Or use simple `cronExpression`: "0 9 * * *" (9 AM daily)
**Note:** `n8n-nodes-base.schedule` is deprecated, always use `scheduleTrigger`

**Example (Daily at 9 AM):**
```yaml
parameters:
  rule:
    interval:
      - intervalSize: 1
        intervalUnit: days
      - field: hour
        value: 9
```

### Webhook
**Type:** `n8n-nodes-base.webhook`
**Use:** Trigger via HTTP request
**Parameters:**
- `path`: URL path (e.g., "my-webhook")
- `httpMethod`: GET, POST, PUT, DELETE
- `responseMode`: "onReceived" or "lastNode"

### HTTP Request (Polling)
**Type:** `n8n-nodes-base.httpRequest`
**Use:** Poll an endpoint on a schedule
**Parameters:**
- `url`: Endpoint URL
- `method`: HTTP method
- `authentication`: Auth type
- `options.polling.enabled`: true

## AI Nodes (LangChain)

**Note:** AI nodes are in the `@n8n/n8n-nodes-langchain` package, **not** `n8n-nodes-base`.

### AI Agent
**Type:** `@n8n/n8n-nodes-langchain.agent`
**Use:** Create AI agents with LangChain integration
**Parameters:**
- `agent`: Agent type (conversationalAgent, openAiFunctionsAgent, etc.)
- `promptType`: System prompt configuration
- `text`: System message or instructions
- `options`: Additional agent options
**Credentials:** Requires OpenAI API or other LLM provider credentials
**Note:** For simple AI text generation, consider using `@n8n/n8n-nodes-langchain.lmChatOpenAi` instead

### OpenAI Chat Model
**Type:** `@n8n/n8n-nodes-langchain.lmChatOpenAi`
**Use:** Direct OpenAI chat completions (simpler than Agent)
**Parameters:**
- `model`: Model name (gpt-4, gpt-3.5-turbo, etc.)
- `prompt`: Input prompt/message
- `options`: Temperature, max tokens, etc.
**Credentials:** Requires OpenAI API credentials
**Note:** Use this for simple text generation; use Agent for complex workflows

### Basic LLM Chain
**Type:** `@n8n/n8n-nodes-langchain.chainLlm`
**Use:** Simple LLM chain without agent complexity
**Parameters:**
- `model`: LLM model selection
- `prompt`: Prompt template
**Credentials:** Depends on selected model provider

## Core Nodes

### HTTP Request
**Type:** `n8n-nodes-base.httpRequest`
**Use:** Make HTTP API calls
**Parameters:**
- `url`: API endpoint
- `method`: GET, POST, PUT, PATCH, DELETE
- `authentication`: None, Basic, OAuth2, API Key
- `bodyParameters`: Request body
- `headerParameters`: Custom headers

### Code
**Type:** `n8n-nodes-base.code`
**Use:** Custom JavaScript/Python code
**Parameters:**
- `language`: "javascript" or "python"
- `jsCode` or `pythonCode`: Code to execute
- Available: `items`, `$input`, `$json`, `$node`

### Set
**Type:** `n8n-nodes-base.set`
**Use:** Transform and set data fields
**Parameters:**
- `mode`: "manual" or "expression"
- `fields`: Array of field mappings
  - `name`: Field name
  - `value`: Field value or expression

### Merge
**Type:** `n8n-nodes-base.merge`
**Use:** Combine data from multiple branches
**Parameters:**
- `mode`: "append", "combine", "merge"
- `options`: Merge options

### Split In Batches
**Type:** `n8n-nodes-base.splitInBatches`
**Use:** Process large datasets in batches
**Parameters:**
- `batchSize`: Number of items per batch

## Logic Nodes

### IF
**Type:** `n8n-nodes-base.if`
**Use:** Conditional branching
**Parameters:**
- `conditions.boolean`: Array of conditions
  - `value1`: First value
  - `operation`: equals, notEquals, contains, etc.
  - `value2`: Second value

### Switch
**Type:** `n8n-nodes-base.switch`
**Use:** Multiple conditional branches
**Parameters:**
- `mode`: "expression" or "rules"
- `output`: Route selection
- `rules`: Array of rule conditions

### Filter
**Type:** `n8n-nodes-base.filter`
**Use:** Filter items based on conditions
**Parameters:**
- `conditions`: Filter conditions

## Service Nodes

### Slack
**Type:** `n8n-nodes-base.slack`
**Use:** Slack integration
**Resources:**
- `message`: Send/update messages
- `channel`: Create/manage channels
- `user`: User operations

**Common Operations:**
- `message.post`: Send message
  - `channel`: Channel name or ID
  - `text`: Message text
- `message.update`: Update message
- `message.delete`: Delete message

### Gmail
**Type:** `n8n-nodes-base.gmail`
**Use:** Gmail integration
**Resources:**
- `message`: Send/read emails
- `draft`: Manage drafts
- `label`: Manage labels

**Common Operations:**
- `message.send`: Send email
  - `to`: Recipient email
  - `subject`: Email subject
  - `message`: Email body

### Google Sheets
**Type:** `n8n-nodes-base.googleSheets`
**Use:** Google Sheets integration
**Operations:**
- `append`: Add rows
- `update`: Update rows
- `read`: Read data
- `delete`: Delete rows

### Airtable
**Type:** `n8n-nodes-base.airtable`
**Use:** Airtable database operations
**Parameters:**
- `operation`: create, update, delete, get, list
- `base`: Base ID
- `table`: Table name

### Notion
**Type:** `n8n-nodes-base.notion`
**Use:** Notion workspace integration
**Resources:**
- `database`: Database operations
- `page`: Page operations
- `block`: Block operations

### Discord
**Type:** `n8n-nodes-base.discord`
**Use:** Discord bot integration
**Resources:**
- `message`: Send messages
- `channel`: Channel operations
- `member`: Member operations

## Error Handling

### Error Trigger
**Type:** `n8n-nodes-base.errorTrigger`
**Use:** Catch errors from other workflows
**Parameters:** Workflow selection

### Stop And Error
**Type:** `n8n-nodes-base.stopAndError`
**Use:** Stop workflow with custom error
**Parameters:**
- `errorMessage`: Custom error message

## Data Transformation

### Aggregate
**Type:** `n8n-nodes-base.aggregate`
**Use:** Aggregate data (sum, count, etc.)
**Parameters:**
- `operation`: aggregate, group, split
- `fieldsToAggregate`: Fields to aggregate

### Sort
**Type:** `n8n-nodes-base.sort`
**Use:** Sort items
**Parameters:**
- `sortFieldsUi`: Sort configuration
  - `fieldName`: Field to sort by
  - `order`: ascending or descending

### Limit
**Type:** `n8n-nodes-base.limit`
**Use:** Limit number of items
**Parameters:**
- `maxItems`: Maximum items to pass through

## Expressions

### Common Expressions
```javascript
// Access input data
{{ $json.fieldName }}

// Access all items
{{ $items }}

// Current node data
{{ $node.name }}
{{ $node.parameter }}

// Date/time
{{ $now }}
{{ $today }}

// Expressions
{{ $json.price * 1.1 }}
{{ $json.name.toUpperCase() }}
```

## Credentials Reference

### Common Credential Types
- `slackApi` - Slack API (OAuth2 or token)
- `googleApi` - Google API (OAuth2)
- `gmailOAuth2` - Gmail OAuth2
- `googleSheetsOAuth2` - Google Sheets OAuth2
- `airtableApi` - Airtable API key
- `notionApi` - Notion API key
- `discordBotToken` - Discord bot token
- `httpBasicAuth` - HTTP Basic Auth
- `httpHeaderAuth` - HTTP Header Auth
- `oAuth2Api` - Generic OAuth2

## Best Practices

### Node Naming
- Use descriptive names: "Get Customer Data" not "HTTP Request"
- Indicate purpose: "Filter Active Users" not "IF"
- Be consistent across workflows

### Error Handling
- Add Error Trigger workflows for production
- Use Stop And Error for validation
- Provide clear error messages

### Performance
- Use Split In Batches for large datasets
- Minimize API calls with batching
- Use Filter early to reduce data volume
- Cache data when possible

### Data Flow
- Keep workflows linear when possible
- Use Set node for complex transformations
- Use Merge for parallel operations
- Test with sample data first

