import path from 'node:path';
import express from 'express';
import crypto from 'node:crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { registerMcpServer } from './mcp.mjs';
const mcpPort = parseInt(process.env.PORT || '3000');
const mcpDomain = process.env.MCP_DOMAIN || 'http://localhost:3000';
const __dirname = import.meta.dirname;
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const authPassword = process.env.PASSWORD || 'password';
const registeredClients = {};
const authorizationCodes = {};
const accessTokens = {};
const transports = {};
// Helper function to generate secure tokens
const generateSecureToken = (bytes = 32) => {
    return crypto.randomBytes(bytes).toString('base64url');
};
// Helper function to verify PKCE
const verifyPKCE = (verifier, challenge, method) => {
    if (method !== 'S256')
        return false;
    const hash = crypto.createHash('sha256').update(verifier).digest('base64url');
    return hash === challenge;
};
// Cleanup expired items periodically
setInterval(() => {
    const now = Date.now();
    // Clean expired auth codes
    for (const [code, data] of Object.entries(authorizationCodes)) {
        if (data.expires_at < now) {
            delete authorizationCodes[code];
        }
    }
    // Clean expired access tokens
    for (const [token, data] of Object.entries(accessTokens)) {
        if (data.expires_at < now) {
            delete accessTokens[token];
        }
    }
}, 60000); // Run every minute
// Handle POST requests for client-to-server communication
const handleMcpRequest = async (req, res) => {
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
    // Extract and validate token
    const token = authHeader.split(' ')[1];
    const tokenData = accessTokens[token];
    if (!tokenData || tokenData.expires_at < Date.now()) {
        handleUnauthorized();
        return;
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
};
app.post('/mcp', handleMcpRequest);
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
        token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post'],
        code_challenge_methods_supported: ['S256']
    });
});
app.post('/register', (req, res) => {
    const clientId = generateSecureToken(16);
    const clientSecret = generateSecureToken(32);
    const clientName = req.body['client_name'] || 'Unnamed Client';
    const redirectUris = req.body['redirect_uris'] || [];
    if (!Array.isArray(redirectUris) || redirectUris.length === 0) {
        return res.status(400).json({ error: 'redirect_uris must be a non-empty array' });
    }
    registeredClients[clientId] = {
        client_id: clientId,
        client_name: clientName,
        client_secret: clientSecret,
        redirect_uris: redirectUris
    };
    res.status(200).json({
        client_id: clientId,
        client_name: clientName,
        client_secret: clientSecret,
        redirect_uris: redirectUris
    });
});
app.post('/authorize', (req, res) => {
    const clientId = req.body['client_id'];
    const redirectUri = req.body['redirect_uri'];
    const codeChallenge = req.body['code_challenge'];
    const codeChallengeMethod = req.body['code_challenge_method'];
    const password = req.body['password'];
    if (!clientId || !password) {
        return res.status(400).json({ error: 'Missing client_id or password' });
    }
    // Validate client credentials
    let isValidated = (password == authPassword);
    if (isValidated) {
        // Generate authorization code
        const code = generateSecureToken(32);
        authorizationCodes[code] = {
            code,
            client_id: clientId,
            redirect_uri: redirectUri,
            code_challenge: codeChallenge,
            code_challenge_method: codeChallengeMethod,
            expires_at: Date.now() + 600000 // 10 minutes
        };
        res.status(200).json({ status: isValidated, code });
    }
    else {
        res.status(200).json({ status: isValidated, code: undefined });
    }
});
app.get('/authorize', async (req, res) => {
    const clientId = req.query.client_id;
    const redirectUri = req.query.redirect_uri;
    const codeChallenge = req.query.code_challenge;
    const codeChallengeMethod = req.query.code_challenge_method;
    const responseType = req.query.response_type;
    // Validate required parameters
    if (!clientId || !redirectUri || !codeChallenge || !responseType) {
        return res.status(400).json({
            error: 'invalid_request',
            error_description: 'Missing required parameters'
        });
    }
    if (responseType !== 'code') {
        return res.status(400).json({
            error: 'unsupported_response_type',
            error_description: 'Only "code" response type is supported'
        });
    }
    if (codeChallengeMethod !== 'S256') {
        return res.status(400).json({
            error: 'invalid_request',
            error_description: 'Only S256 code challenge method is supported'
        });
    }
    // Validate client
    const client = registeredClients[clientId];
    if (!client) {
        return res.status(400).json({
            error: 'invalid_client',
            error_description: 'Unknown client_id'
        });
    }
    // Validate redirect URI
    if (!client.redirect_uris.includes(redirectUri)) {
        return res.status(400).json({
            error: 'invalid_request',
            error_description: 'Invalid redirect_uri'
        });
    }
    res.status(200).header('Content-Type', 'text/html').sendFile(path.join(__dirname, '../authorize.html'));
});
app.post('/token', (req, res) => {
    const grantType = req.body['grant_type'];
    const code = req.body['code'];
    const redirectUri = req.body['redirect_uri'];
    let clientId = req.body['client_id'];
    const codeVerifier = req.body['code_verifier'];
    if (!clientId) {
        //check for client authentication in Authorization header
        const authHeader = req.headers['authorization'];
        if (!authHeader || !authHeader.startsWith('Basic ')) {
            return res.status(401).json({
                error: 'invalid_client',
                error_description: 'No client authentication provided'
            });
        }
        const base64Credentials = authHeader.split(' ')[1];
        const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
        const [authClientId, authClientSecret] = credentials.split(':');
        clientId = authClientId;
    }
    // Validate grant type
    if (grantType !== 'authorization_code') {
        return res.status(400).json({
            error: 'unsupported_grant_type',
            error_description: 'Only authorization_code grant type is supported'
        });
    }
    // Validate required parameters
    if (!code || !redirectUri || !clientId || !codeVerifier) {
        return res.status(400).json({
            error: 'invalid_request',
            error_description: 'Missing required parameters'
        });
    }
    // Validate authorization code
    const authCode = authorizationCodes[code];
    if (!authCode) {
        return res.status(400).json({
            error: 'invalid_grant',
            error_description: 'Invalid or expired authorization code'
        });
    }
    // Check expiration
    if (authCode.expires_at < Date.now()) {
        delete authorizationCodes[code];
        return res.status(400).json({
            error: 'invalid_grant',
            error_description: 'Authorization code expired'
        });
    }
    // Validate client and redirect URI match
    if (authCode.client_id !== clientId || authCode.redirect_uri !== redirectUri) {
        return res.status(400).json({
            error: 'invalid_grant',
            error_description: 'Authorization code mismatch'
        });
    }
    // Verify PKCE
    if (!verifyPKCE(codeVerifier, authCode.code_challenge, authCode.code_challenge_method)) {
        return res.status(400).json({
            error: 'invalid_grant',
            error_description: 'Invalid code verifier'
        });
    }
    // Delete the used authorization code
    delete authorizationCodes[code];
    // Generate access token
    const accessToken = generateSecureToken(32);
    const expiresIn = 3600; // 1 hour
    accessTokens[accessToken] = {
        token: accessToken,
        client_id: clientId,
        expires_at: Date.now() + (expiresIn * 1000)
    };
    res.json({
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: expiresIn,
        refresh_token: accessToken
    });
});
// Start MCP Server listener
app.listen(mcpPort, () => console.log(`MCP Server started on port ${mcpPort}`));
//# sourceMappingURL=server.mjs.map