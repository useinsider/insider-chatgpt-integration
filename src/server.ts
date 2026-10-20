import express from 'express';
import type { Request, Response } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the directory path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Helper function to read widget HTML files
function getWidgetHTML(widgetName: string): string {
    const widgetPath = join(__dirname, '..', 'widgets', `${widgetName}.html`);

    return readFileSync(widgetPath, 'utf-8');
}

// Common resource metadata
const resourceMeta = {
    'openai/widgetAccessible': true,
    'openai/resultCanProduceWidget': true,
    // Add the widget domain to the domain list in the panel as 'your-domain-com-net.web-sandbox.oaiusercontent.com'
    'openai/widgetDomain': 'your-domain.com.net', // Replace with your domain
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
    },
};

function createServer(): McpServer {
    const server = new McpServer({ name: 'Your MCP Server', version: '1.0.0' });

    // Deals & Discounts (deals.html)
    server.registerResource('all-deals', 'ui://widget/deals.html', {}, async () => ({
        contents: [{
            uri: 'ui://widget/deals.html',
            mimeType: 'text/html+skybridge',
            text: getWidgetHTML('deals'),
            _meta: {
                ...resourceMeta,
                'openai/widgetDescription': 'Shows current deals, discounts, and coupons'
            },
        }],
    }));

    server.registerTool(
        'get-deals-and-discounts',
        {
            title: 'Get Deals and Discounts',
            description: 'Shows current deals, discounts, and available coupons. ' +
                'Use this when users ask about discounts, coupons, or special offers.',
            _meta: {
                'openai/outputTemplate': 'ui://widget/deals.html',
                'openai/toolInvocation/invoking': 'Loading current deals and discounts...',
                'openai/toolInvocation/invoked': 'Here are the best deals available right now!',
            },
        },
        async () => ({
            content: [{
                type: 'text',
                text: 'Here are the current deals and discounts available!'
            }],
            structuredContent: {},
        })
    );

    // Product Recommendations (trend-products.html)
    server.registerResource('product-recommendations', 'ui://widget/trend-products.html', {}, async () => ({
        contents: [{
            uri: 'ui://widget/trend-products.html',
            mimeType: 'text/html+skybridge',
            text: getWidgetHTML('trend-products'),
            _meta: {
                ...resourceMeta,
                'openai/widgetDescription': 'Shows personalized product recommendations'
            },
        }],
    }));

    server.registerTool(
        'get-product-recommendations',
        {
            title: 'Get Product Recommendations',
            description: 'Shows personalized product recommendations based on user preferences. ' +
                'Use this when users ask for recommendations, help finding products, or are unsure what to buy.',
            _meta: {
                'openai/outputTemplate': 'ui://widget/trend-products.html',
                'openai/toolInvocation/invoking': 'Finding the best products for you...',
                'openai/toolInvocation/invoked': 'Here are personalized recommendations just for you!',
            },
        },
        async () => ({
            content: [{
                type: 'text',
                text: 'Here are personalized product recommendations based on your preferences!'
            }],
            structuredContent: {},
        })
    );

    // Notifications & Updates (notifications.html)
    server.registerResource('product-notifications', 'ui://widget/notifications.html', {}, async () => ({
        contents: [{
            uri: 'ui://widget/notifications.html',
            mimeType: 'text/html+skybridge',
            text: getWidgetHTML('notifications'),
            _meta: {
                ...resourceMeta,
                'openai/widgetDescription': 'Shows notification preferences for new products and updates'
            },
        }],
    }));

    server.registerTool(
        'setup-product-notifications',
        {
            title: 'Setup Product Notifications',
            description: 'Shows a form to get lead data to inform user about updates, and special offers. ' +
                'Use this when users want to be notified about new products or discounts.',
            _meta: {
                'openai/outputTemplate': 'ui://widget/notifications.html',
                'openai/toolInvocation/invoking': 'Setting up your notifications...',
                'openai/toolInvocation/invoked': 'Here is a form to get your lead data!',
            },
        },
        async () => ({
            content: [{
                type: 'text',
                text: 'We\'ll notify you about new products and special offers.'
            }],
            structuredContent: {},
        })
    );

    return server;
}

// Express server setup
const app = express();
app.use(express.json());

app.post('/mcp', async (req: Request, res: Response) => {
    // Create a new server and transport for each request: a server connects to one transport only
    const server = createServer();
    const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true
    });

    res.on('close', () => {
        transport.close();
        server.close();
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
});

app.get('/health', (_: Request, res: Response) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        server: 'Your MCP Server',
        version: '1.0.0'
    });
});

const port = parseInt(process.env.PORT || '8000');

app.listen(port, () => {
    console.log(`🚀 Your MCP Server running on http://localhost:${port}/mcp`);
    console.log(`📊 Health check available at http://localhost:${port}/health`);
    console.log(`\n✨ Example prompts to try:`);
    console.log(`\n💰 Widget 1 - Deals & Discounts (deals.html):`);
    console.log(`   - "Do you have any discounts right now?"`);
    console.log(`   - "Is there any coupon I can use?"`);
    console.log(`   - "Can I get a discount"`);
    console.log(`\n📦 Widget 2 - Product Recommendations (trend-products.html):`);
    console.log(`   - "What would you recommend for me?"`);
    console.log(`   - "Can you help me find a good product for me?"`);
    console.log(`   - "I'm not sure what to buy. I'm looking for something nice and affordable."`);
    console.log(`\n🔔 Widget 3 - Notifications & Updates (notifications.html):`);
    console.log(`   - "I want updates about new products."`);
    console.log(`   - "Notify me when something new comes out."`);
    console.log(`   - "Let me know when there are discounts"`);
    console.log(`\n📄 Widget to Insider Page Type Mappings:`);
    console.log(`   - Deals & Discounts → Insider.InsiderObject.page.type = 'Home'`);
    console.log(`   - Product Recommendations → Insider.InsiderObject.page.type = 'Category'`);
    console.log(`   - Notifications & Updates → Insider.InsiderObject.page.type = 'Cart'`);
}).on('error', (error: Error) => {
    console.error('❌ Server error:', error);
    process.exit(1);
});
