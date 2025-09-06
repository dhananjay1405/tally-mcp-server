import path from 'node:path';
import express from 'express';
import crypto from 'node:crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { registerMcpServer } from './mcp.mjs';
const mcpPort = parseInt(process.env.PORT || '3000');
const mcpDomain = process.env.MCP_DOMAIN || 'http://localhost:3000';
const __dirname = import.meta.dirname;
let lstAuthenticatedClientID = [];
let lstAccessToken = [];
const authPassword = process.env.CLIENT_SECRET || 'password';
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const transports = {};
// Handle POST requests for client-to-server communication
app.post('/mcp', async (req, res) => {
    const handleUnauthorized = () => {
        res.status(401).json({
            jsonrpc: '2.0',
            error: {
                code: -32000,
                message: 'Unauthorized: No valid authentication token provided',
            },
            id: null,
        });
    };
    // Check for authentication header Bearer
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        handleUnauthorized();
        return;
    }
    else {
        // extract token
        const token = authHeader.split(' ')[1];
        if (!lstAccessToken.includes(token)) {
            handleUnauthorized();
            return;
        }
    }
    // Check for existing session ID
    const sessionId = req.headers['mcp-session-id'];
    let transport;
    if (sessionId && transports[sessionId]) {
        // Reuse existing transport
        transport = transports[sessionId];
    }
    else if (!sessionId && isInitializeRequest(req.body)) {
        // New initialization request
        transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => crypto.randomUUID(),
            onsessioninitialized: (sessionId) => {
                // Store the transport by session ID
                transports[sessionId] = transport;
            },
            // DNS rebinding protection is disabled by default for backwards compatibility. If you are running this server
            // locally, make sure to set:
            // enableDnsRebindingProtection: true,
            allowedHosts: [mcpDomain],
        });
        // Clean up transport when closed
        transport.onclose = () => {
            if (transport.sessionId) {
                delete transports[transport.sessionId];
            }
        };
        const mcpServer = await registerMcpServer(); // Register the MCP server
        await mcpServer.connect(transport); // Connect the MCP server to the transport
    }
    else {
        // Invalid request
        res.status(400).json({
            jsonrpc: '2.0',
            error: {
                code: -32000,
                message: 'Bad Request: No valid session ID provided',
            },
            id: null,
        });
        return;
    }
    // Handle the request
    await transport.handleRequest(req, res, req.body);
});
// Reusable handler for GET and DELETE requests
const handleSessionRequest = async (req, res) => {
    const sessionId = req.headers['mcp-session-id'];
    if (!sessionId || !transports[sessionId]) {
        res.status(400).send('Invalid or missing session ID');
        return;
    }
    const transport = transports[sessionId];
    await transport.handleRequest(req, res);
};
// Handle GET requests for server-to-client notifications via SSE
app.get('/mcp', handleSessionRequest);
// Handle DELETE requests for session termination
app.delete('/mcp', handleSessionRequest);
app.get('/.well-known/oauth-protected-resource/mcp', (req, res) => {
    res.status(200).json({
        resource: `${mcpDomain}/mcp`,
        authorization_servers: [`${mcpDomain}`],
        bearer_methods_supported: ['header'],
        scopes_supported: ['email']
    });
});
// Handle OAuth Authorization Server
app.get('/.well-known/oauth-authorization-server', (req, res) => {
    res.status(200).json({
        issuer: mcpDomain,
        authorization_endpoint: `${mcpDomain}/authorize`,
        token_endpoint: `${mcpDomain}/token`,
        registration_endpoint: `${mcpDomain}/register`,
        response_types_supported: ['code'],
        response_mode_supported: ['query'],
        grant_types_supported: ['authorization_code'],
        token_endpoint_auth_methods_supported: ['client-secret-basic'],
        code_challenge_methods_supported: ['S256']
    });
});
app.post('/register', (req, res) => {
    let clientId = crypto.randomBytes(8).toString('hex');
    res.status(200).json({
        client_id: clientId,
        clientName: req.body['client_name'] || '',
        redirect_uris: req.body['redirect_uris'] || ''
    });
});
app.post('/authenticate', (req, res) => {
    const clientId = req.body['client_id'];
    const clientSecret = req.body['client_secret'];
    if (!clientId || !clientSecret) {
        return res.status(400).json({ error: 'Missing client_id or client_secret' });
    }
    // Validate client credentials
    let isValidated = (clientSecret == authPassword);
    if (isValidated) {
        // add token to authenticated array
        lstAuthenticatedClientID.push(clientId);
        setTimeout(() => {
            lstAuthenticatedClientID = lstAuthenticatedClientID.filter(id => id !== clientId);
        }, 300000);
    }
    res.status(200).json({ status: isValidated });
});
app.get('/authorize', async (req, res) => {
    res.status(200).header('Content-Type', 'text/html').sendFile(path.join(__dirname, '../authorize.html'));
});
app.post('/token', (req, res) => {
    // BODY PARSER required with url-encoded form data parsing
    let clientId = req.body['code'];
    if (!clientId || !lstAuthenticatedClientID.includes(clientId)) {
        res.status(400).json({ error: 'Invalid access code' });
        return;
    }
    else {
        let accessToken = crypto.randomBytes(8).toString('hex');
        lstAccessToken.push(accessToken);
        // remove access token after 60 min
        setTimeout(() => {
            lstAccessToken = lstAccessToken.filter(token => token !== accessToken);
        }, 3600000);
        res.json({
            access_token: accessToken,
            expires_in: 3600,
            token_type: 'Bearer',
            refresh_token: accessToken
        });
    }
});
// Start MCP Server listener
app.listen(mcpPort, () => console.log(`MCP Server started on port ${mcpPort}`));
//# sourceMappingURL=server.mjs.map