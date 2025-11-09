# Exa Web Search Implementation

## Overview
Integrated Exa MCP web search, code context, and URL crawling tools to enable the AI assistant to fetch latest documentation, search the web, retrieve code examples from libraries and frameworks, and scrape specific URLs.

## Tools Added

### 1. `web_search`
- **Purpose**: Search the web for up-to-date information, documentation, or solutions
- **Use cases**: 
  - User asks to search for something online
  - User needs latest documentation
  - General web searches
- **Parameters**:
  - `query` (required): Search query
  - `numResults` (optional): Number of results (default: 5, max: 10)

### 2. `get_code_context`
- **Purpose**: Get relevant code snippets, examples, and documentation from open source libraries, GitHub repos, and frameworks
- **Use cases**:
  - Finding code examples
  - Getting library documentation
  - API usage patterns
  - Best practices from real codebases
- **Parameters**:
  - `query` (required): Code-related search query
  - `tokensNum` (optional): Tokens of context to return (1000-50000, default: 5000)

### 3. `crawl_url`
- **Purpose**: Extract and crawl content from a specific URL
- **Use cases**:
  - User provides a URL to scrape
  - Extracting portfolio website content
  - Reading documentation pages
  - Analyzing web page content
- **Parameters**:
  - `url` (required): Full URL to crawl (must start with http:// or https://)

## Implementation Details

### Files Modified
1. **`.env.example`**: Added `EXA_API_KEY` configuration
2. **`src/lib/ai/toolDefinitions.ts`**: Added tool definitions for 3 tools
3. **`src/lib/ai/toolExecutor.ts`**: Implemented executors that call Exa MCP API
4. **`src/lib/ai/prompts.ts`**: Updated system prompt to include new tools in workflow

### API Integration

**MCP Endpoint** (for web_search and get_code_context):
- **Endpoint**: `https://mcp.exa.ai/mcp`
- **Method**: JSON-RPC 2.0
- **Authentication**: Bearer token with `EXA_API_KEY`
- **Tools**:
  - `web_search_exa`: Web search functionality
  - `get_code_context_exa`: Code context retrieval

**REST API** (for crawling):
- **Endpoint**: `https://api.exa.ai/contents`
- **Method**: POST
- **Authentication**: `x-api-key` header with `EXA_API_KEY`
- **Features**: Live crawling with `livecrawl: "preferred"`

### Error Handling
- API key validation (returns helpful error if missing)
- HTTP error handling with status codes
- JSON-RPC error responses
- Empty result handling
- URL validation for crawling tool

## Setup Instructions

1. Get an Exa API key from [Exa.ai](https://exa.ai)
2. Add to your `.env.local`:
   ```env
   EXA_API_KEY=your_exa_api_key
   ```
3. Restart the development server

## Usage Examples

### Web Search
```
User: "Search for the latest Next.js 15 features"
AI: Uses web_search tool to fetch current documentation
```

### Code Context
```
User: "Show me examples of React Server Components"
AI: Uses get_code_context to retrieve code examples from docs and GitHub
```

### URL Crawling
```
User: "Can you check this URL: https://portfolio.dev"
AI: Uses crawl_url to extract and analyze the complete content from the URL

User: "Scrape https://docs.example.com/api"
AI: Uses crawl_url to fetch the full page content
```

## Benefits
- AI can now fetch real-time information
- Access to latest library documentation
- Code examples from actual implementations
- Direct URL content extraction and scraping
- Portfolio and website analysis capabilities
- No more hallucinated or outdated information
- Better context for solving coding problems
