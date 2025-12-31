# Insider ChatGPT Integration

A ChatGPT MCP (Model Context Protocol) server with 3 widgets integrated with Insider One Web SDK. Built with TypeScript, Express, and the MCP SDK.

## Features

- **MCP Tools:**
  - `get-deals-and-discounts` - Shows current deals, discounts, and available coupons
  - `get-product-recommendations` - Shows personalized product recommendations
  - `setup-product-notifications` - Shows a form to collect lead data for notifications

- **Widgets:**
  - **Deals & Discounts Widget** (`deals.html`) - Displays current deals and coupons
  - **Product Recommendations Widget** (`trend-products.html`) - Shows personalized product recommendations
  - **Notifications Widget** (`notifications.html`) - Lead capture form for product updates

- **Example Prompts:**
  - **"Do you have any discounts right now?"**
  - **"What would you recommend for me?"**
  - **"I want updates about new products"**

- **Insider Integration:** All widgets include the Insider Tag with page-specific configurations
- **Express HTTP Server:** RESTful API with health check endpoint
- **Widget Resources:** Separate HTML files for easy customization

## Prerequisites

- Node.js 18+ installed
- npm or pnpm package manager
- ChatGPT account with MCP support
- ngrok (for testing with ChatGPT locally) [Install ngrok](https://ngrok.com/download/)

## Installation

To Install dependencies:

```bash
npm install
```

## Testing with ChatGPT

### Step 1: Configure Insider One Web SDK in widgets

Update the Insider Tag URL in each widget HTML file with your partner name and ID:

```html
<script async="true" src="https://partnerName.api.useinsider.com/ins.js?id=YOUR_ID"></script>
```

Each widget uses a different page type configuration:
- **deals.html**: `{ type: "home" }` - For home page tracking
- **trend-products.html**: `{ type: "category" }` - For category page tracking  
- **notifications.html**: `{ type: "cart" }` - For cart page tracking

### Step 2: Expose Your Server

Start the MCP server:

```bash
npm start
```

For local testing, use ngrok to expose your server:

```bash
ngrok http 8000
```

Copy the HTTPS URL provided by ngrok (e.g., `https://your-ngrok-url.ngrok.io`)

### Step 3: Add to ChatGPT

1. Open ChatGPT
2. Go to **Settings** > **Apps** > **Advanced Settings**
3. Enable **Developer Mode**
4. Go to **Settings** > **Apps**
4. Create App:
   - **Name**: Give any name you want
   - **MCP Server URL**: `https://your-ngrok-url.ngrok.io/mcp`
   - **Authentication**: No Auth (for testing)
   - For production: Deploy your server and use the public URL

### Step 4: Use in Conversations

Add the connector to your conversation using the "More" options, or add it via "@" then try these prompts:

**Deals & Discounts:**
- "Do you have any discounts right now?"
- "Is there any coupon I can use?"
- "Can I get a discount?"

**Product Recommendations:**
- "What would you recommend for me?"
- "Can you help me find a good product for me?"
- "I'm not sure what to buy. I'm looking for something nice and affordable."

**Notifications & Updates:**
- "I want updates about new products"
- "Notify me when something new comes out"
- "Let me know when there are discounts"

## API Endpoints

- **POST `/mcp`** - Main MCP endpoint for tool calls
- **GET `/health`** - Health check endpoint

## Project Structure

```
insider-chatgpt-integration/
├── src/
│   └── server.ts              # TypeScript Express MCP server
├── widgets/
│   ├── deals.html             # Deals & Discounts widget (Home page)
│   ├── trend-products.html    # Product Recommendations widget (Category page)
│   └── notifications.html     # Notifications widget (Cart page)
├── package.json               # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
└── README.md                  # This file
```

## How It Works

1. **TypeScript Server**: Type-safe Express server that handles MCP protocol requests
2. **MCP Server**: Implements the Model Context Protocol with 3 registered tools
3. **Widget Resources**: Each tool is linked to a widget resource that returns HTML
4. **Tool Invocation**: When ChatGPT calls a tool, the server returns the widget HTML
5. **Insider One Integration**: All widgets include the Insider Tag with page-specific configurations:
   - **Deals widget**: `{ type: "home" }` - Tracks as Home page
   - **Product Recommendations widget**: `{ type: "category" }` - Tracks as Category page
   - **Notifications widget**: `{ type: "cart" }` - Tracks as Cart page
6. **InsiderQueue**: Each widget initializes the Insider One Web SDK with user data and page type tracking
7. **tsx Runtime**: Uses tsx for running TypeScript directly without compilation

## Content Security Policy (CSP) Configuration

For the Insider One Web SDK to work properly within ChatGPT widgets, specific domains must be included in the Content Security Policy configuration. The server automatically configures these domains in the `resourceMeta` object in `src/server.ts`:

```typescript
'openai/widgetCSP': {
    connect_domains: [
        'https://*.useinsider.com',
        'https://fonts.gstatic.com',
    ],
    resource_domains: [
        'https://*.useinsider.com',
        'https://fonts.gstatic.com',
    ],
    script_domains: [
        'https://*.useinsider.com',
    ],
    frame_domains: [
        'https://*.useinsider.com',
    ],
}
```

### Required CSP Domains:

- **`https://*.useinsider.com`** - Required for:
  - Loading the Insider One Web SDK script (`ins.js`)
  - API connections to Insider services
  - Loading HTML, CSS, JS or image assets
  - Iframe content for Insider One Worker

- **`https://fonts.gstatic.com`** - Required for:
  - Loading Fonts used in Insider One

These domains are essential for the proper functioning of the widgets. Without these CSP entries, the Insider One Web SDK will fail to load and the widgets will not display Insider One content.

## Customization

### Adding New Tools

Edit `src/server.ts` and register a new tool with resource and tool:

#### 1. Register the widget resource

```typescript
server.registerResource(
  'your-widget-name',
  'ui://widget/your-widget.html',
  {},
  async () => ({
    contents: [{
      uri: 'ui://widget/your-widget.html',
      mimeType: 'text/html+skybridge',
      text: getWidgetHTML('your-widget'),
      _meta: {
        ...resourceMeta,
        'openai/widgetDescription': 'Description of your widget'
      },
    }],
  })
);
```

#### 2. Register the tool

```typescript
server.registerTool(
  'your-tool-name',
  {
    title: 'Your Tool Title',
    description: 'Description of what the tool does and when to use it.',
    _meta: {
      'openai/outputTemplate': 'ui://widget/your-widget.html',
      'openai/toolInvocation/invoking': 'Loading message...',
      'openai/toolInvocation/invoked': 'Success message!',
    },
  },
  async () => ({
    content: [{
      type: 'text',
      text: 'Your response text'
    }],
    structuredContent: {},
  })
);
```

#### 3. Create the widget HTML file

Create `widgets/your-widget.html` with the Insider SDK integration:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Your Widget</title>

    <script type="text/javascript">
      window.InsiderQueue = [];
      window.InsiderQueue.push({ type: "home" }); // or "category", "cart", etc.
      window.InsiderQueue.push({ type: "init" });
    </script>

    <script async="true" src="https://partnerName.api.useinsider.com/ins.js?id=YOUR_ID"></script>

    <style>
      body {
        margin: 0;
        padding: 0;
        overflow: hidden;
        font-family: Roboto, sans-serif;
        background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
        display: flex;
        align-items: center;
        justify-content: center;
      }

      #insider-root {
        width: 100%;
        max-width: 1200px;
        height: 600px;
        padding: 20px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      }
    </style>
  </head>

  <body>
    <div id="insider-root"></div>
  </body>
</html>
```

### Modifying Widgets

Edit the HTML files in the `widgets/` folder:
- `widgets/deals.html` - Deals & Discounts widget (Home page type)
- `widgets/trend-products.html` - Product Recommendations widget (Category page type)
- `widgets/notifications.html` - Notifications widget (Cart page type)

All widgets must include:
1. **InsiderQueue initialization** with page type:
```javascript
window.InsiderQueue = [];
window.InsiderQueue.push({ type: "home" }); // or "category", "cart"
window.InsiderQueue.push({ type: "init" });
```

2. **Insider Tag** with your partner name and ID:
```html
<script async="true" src="https://partnerName.api.useinsider.com/ins.js?id=YOUR_ID"></script>
```

## Widget to Insider Page Type Mappings

The project includes three widgets, each mapped to a specific Insider page type:

| Widget | File | Insider Page Type | Use Case |
|--------|------|-------------------|----------|
| Deals & Discounts | `deals.html` | `home` | Shows deals and coupons |
| Product Recommendations | `trend-products.html` | `category` | Shows personalized products |
| Notifications | `notifications.html` | `cart` | Lead capture form |

## Resources

- [OpenAI Apps SDK Examples](https://github.com/openai/openai-apps-sdk-examples)
- [OpenAI MCP Server Documentation](https://developers.openai.com/apps-sdk/build/mcp-server)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Insider One Web SDK Documentation](https://academy.useinsider.com/docs/insider-web-sdk-integration-guide)

