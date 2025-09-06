import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerMcpServer } from './mcp.mjs'

const mcpServer = await registerMcpServer();
const transport = new StdioServerTransport(); // Start receiving messages on stdin and sending messages on stdout
await mcpServer.connect(transport); // Connect to the MCP server