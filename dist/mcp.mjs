import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import dotenv from 'dotenv';
import { handlePull, jsonToTSV } from './tally.mjs';
dotenv.config({ override: true, quiet: true });
export async function registerMcpServer() {
    const mcpServer = new McpServer({
        name: 'Tally Prime MCP Server',
        title: 'Tally Prime',
        version: '1.0.0'
    });
    mcpServer.registerTool('list-master', {
        title: 'List Masters',
        description: `fetches read-only list of masters from Tally Prime collection e.g. group, ledger, vouchertype, unit, godown, stockgroup, stockitem, costcategory, costcentre, attendancetype, company, currency, gstin, gstclassification returns output in tab separated format`,
        inputSchema: {
            targetCompany: z.string().optional().describe('optional company name. leave it blank or skip this to choose for default company. validate it using list-master tool with collection as company if specified'),
            collection: z.string(z.enum(['group', 'ledger', 'vouchertype', 'unit', 'godown', 'stockgroup', 'stockitem', 'costcategory', 'costcentre', 'attendancetype', 'company', 'currency', 'gstin', 'gstclassification']))
        },
        annotations: {
            readOnlyHint: true,
            openWorldHint: false
        }
    }, async (args) => {
        let inputParams = new Map([['collection', args.collection]]);
        if (args.targetCompany) {
            inputParams.set('targetCompany', args.targetCompany);
        }
        const resp = await handlePull('list-master', inputParams);
        if (resp.error) {
            return {
                isError: true,
                content: [{ type: 'text', text: resp.error }]
            };
        }
        else {
            return {
                content: [{ type: 'text', text: jsonToTSV(resp.data) }]
            };
        }
    });
    mcpServer.registerTool('chart-of-accounts', {
        title: 'Chart of Accounts',
        description: `fetches read-only chart of accounts or group structure / GL hierarchywith columns like group, parent, bs_pl, dr_cr, affects_gross_profit. the column bs_pl will have values BS = Balance Sheet / PL = Profit Loss. Column dr_cr as value D = Debit / C = Credit. columns group and parent are tree structure represented in flat format. The column affects_gross_profit has values Y = Yes / N = No, it is used to determine if ledger under this group will affect gross profit or not. returns output in tab separated format`,
        inputSchema: {
            targetCompany: z.string().optional().describe('optional company name. leave it blank or skip this to choose for default company. validate it using list-master tool with collection as company if specified'),
        },
        annotations: {
            readOnlyHint: true,
            openWorldHint: false
        }
    }, async (args) => {
        let inputParams = new Map();
        if (args.targetCompany) {
            inputParams.set('targetCompany', args.targetCompany);
        }
        const resp = await handlePull('chart-of-accounts', inputParams);
        if (resp.error) {
            return {
                isError: true,
                content: [{ type: 'text', text: resp.error }]
            };
        }
        else {
            return {
                content: [{ type: 'text', text: jsonToTSV(resp.data) }]
            };
        }
    });
    mcpServer.registerTool('trial-balance', {
        title: 'Trial Balance',
        description: `fetches read-only trial balance with fields like ledger, group, opening balance, net debit, net credit, closing balance. kindly fetch data from chart-of-accounts tool to pull group hierarchy before calling this tool. returns output in tab separated format`,
        inputSchema: {
            targetCompany: z.string().optional().describe('optional company name. leave it blank or skip this to choose for default company. validate it using list-master tool with collection as company if specified'),
            fromDate: z.string().describe('date in YYYY-MM-DD format'),
            toDate: z.string().describe('date in YYYY-MM-DD format')
        },
        annotations: {
            readOnlyHint: true,
            openWorldHint: false
        }
    }, async (args) => {
        let inputParams = new Map([['fromDate', args.fromDate], ['toDate', args.toDate]]);
        if (args.targetCompany) {
            inputParams.set('targetCompany', args.targetCompany);
        }
        const resp = await handlePull('trial-balance', inputParams);
        if (resp.error) {
            return {
                isError: true,
                content: [{ type: 'text', text: resp.error }]
            };
        }
        else {
            return {
                content: [{ type: 'text', text: jsonToTSV(resp.data) }]
            };
        }
    });
    mcpServer.registerTool('profit-loss', {
        title: 'Profit and Loss',
        description: `fetches read-only profit and loss statement with fields like ledger, group, amount. amount negative is debit or expense and positive is credit or income. kindly fetch data from chart-of-accounts tool to pull group hierarchy before calling this tool. returns output in tab separated format`,
        inputSchema: {
            targetCompany: z.string().optional().describe('optional company name. leave it blank or skip this to choose for default company. validate it using list-master tool with collection as company if specified'),
            fromDate: z.string().describe('date in YYYY-MM-DD format'),
            toDate: z.string().describe('date in YYYY-MM-DD format')
        },
        annotations: {
            readOnlyHint: true,
            openWorldHint: false
        }
    }, async (args) => {
        let inputParams = new Map([['fromDate', args.fromDate], ['toDate', args.toDate]]);
        if (args.targetCompany) {
            inputParams.set('targetCompany', args.targetCompany);
        }
        const resp = await handlePull('profit-loss', inputParams);
        if (resp.error) {
            return {
                isError: true,
                content: [{ type: 'text', text: resp.error }]
            };
        }
        else {
            return {
                content: [{ type: 'text', text: jsonToTSV(resp.data) }]
            };
        }
    });
    mcpServer.registerTool('balance-sheet', {
        title: 'Balance Sheet',
        description: `fetches read-only balance sheet with fields like ledger, group, closing balance. closing balance negative is debit or asset and positive is credit or liability. kindly fetch data from chart-of-accounts tool to pull group hierarchy before calling this tool. returns output in tab separated format`,
        inputSchema: {
            targetCompany: z.string().optional().describe('optional company name. leave it blank or skip this to choose for default company. validate it using list-master tool with collection as company if specified'),
            toDate: z.string().describe('date in YYYY-MM-DD format')
        },
        annotations: {
            readOnlyHint: true,
            openWorldHint: false
        }
    }, async (args) => {
        let inputParams = new Map([['toDate', args.toDate]]);
        if (args.targetCompany) {
            inputParams.set('targetCompany', args.targetCompany);
        }
        const resp = await handlePull('balance-sheet', inputParams);
        if (resp.error) {
            return {
                isError: true,
                content: [{ type: 'text', text: resp.error }]
            };
        }
        else {
            return {
                content: [{ type: 'text', text: jsonToTSV(resp.data) }]
            };
        }
    });
    mcpServer.registerTool('stock-summary', {
        title: 'Stock Summary',
        description: `fetches read-only stock summary with fields  item name, item parent, opening quantity, opening value, inward quantity, inward value, outward quantity, outward value, closing quantity, closing value, returns output in tab separated format`,
        inputSchema: {
            targetCompany: z.string().optional().describe('optional company name. leave it blank or skip this to choose for default company. validate it using list-master tool with collection as company if specified'),
            fromDate: z.string().describe('date in YYYY-MM-DD format'),
            toDate: z.string().describe('date in YYYY-MM-DD format')
        },
        annotations: {
            readOnlyHint: true,
            openWorldHint: false
        }
    }, async (args) => {
        let inputParams = new Map([['fromDate', args.fromDate], ['toDate', args.toDate]]);
        if (args.targetCompany) {
            inputParams.set('targetCompany', args.targetCompany);
        }
        const resp = await handlePull('stock-summary', inputParams);
        if (resp.error) {
            return {
                isError: true,
                content: [{ type: 'text', text: resp.error }]
            };
        }
        else {
            return {
                content: [{ type: 'text', text: jsonToTSV(resp.data) }]
            };
        }
    });
    mcpServer.registerTool('ledger-balance', {
        title: 'Ledger Balance',
        description: `fetches read-only ledger closing balance as on date, negative is debit and positive is credit`,
        inputSchema: {
            targetCompany: z.string().optional().describe('optional company name. leave it blank or skip this to choose for default company. validate it using list-master tool with collection as company if specified'),
            ledgerName: z.string().describe('exact ledger name, validate it using list-master tool with collection as ledger'),
            toDate: z.string().describe('date in YYYY-MM-DD format')
        },
        annotations: {
            readOnlyHint: true,
            openWorldHint: false
        }
    }, async (args) => {
        let inputParams = new Map([['ledgerName', args.ledgerName], ['toDate', args.toDate]]);
        if (args.targetCompany) {
            inputParams.set('targetCompany', args.targetCompany);
        }
        const resp = await handlePull('ledger-balance', inputParams);
        if (resp.error) {
            return {
                isError: true,
                content: [{ type: 'text', text: resp.error }]
            };
        }
        else {
            return {
                content: [{ type: 'text', text: JSON.stringify(resp.data) }]
            };
        }
    });
    mcpServer.registerTool('stock-item-balance', {
        title: 'Stock Item Balance',
        description: `fetches read-only stock item remaining quantity balance as on date`,
        inputSchema: {
            targetCompany: z.string().optional().describe('optional company name. leave it blank or skip this to choose for default company. validate it using list-master tool with collection as company if specified'),
            itemName: z.string().describe('exact stock item name, validate it using list-master tool with collection as stockitem'),
            toDate: z.string().describe('date in YYYY-MM-DD format')
        },
        annotations: {
            readOnlyHint: true,
            openWorldHint: false
        }
    }, async (args) => {
        let inputParams = new Map([['itemName', args.itemName], ['toDate', args.toDate]]);
        if (args.targetCompany) {
            inputParams.set('targetCompany', args.targetCompany);
        }
        const resp = await handlePull('stock-item-balance', inputParams);
        if (resp.error) {
            return {
                isError: true,
                content: [{ type: 'text', text: resp.error }]
            };
        }
        else {
            return {
                content: [{ type: 'text', text: JSON.stringify(resp.data) }]
            };
        }
    });
    mcpServer.registerTool('bills-outstanding', {
        title: 'Bills Outstanding',
        description: `fetches read-only pending overdue outstanding bills receivable or payable as on date returns output in tab separated format`,
        inputSchema: {
            targetCompany: z.string().optional().describe('optional company name. leave it blank or skip this to choose for default company. validate it using list-master tool with collection as company if specified'),
            nature: z.enum(['receivable', 'payable']),
            toDate: z.string().describe('date in YYYY-MM-DD format')
        },
        annotations: {
            readOnlyHint: true,
            openWorldHint: false
        }
    }, async (args) => {
        let inputParams = new Map([['nature', args.nature], ['toDate', args.toDate]]);
        if (args.targetCompany) {
            inputParams.set('targetCompany', args.targetCompany);
        }
        const resp = await handlePull('bills-outstanding', inputParams);
        if (resp.error) {
            return {
                isError: true,
                content: [{ type: 'text', text: resp.error }]
            };
        }
        else {
            return {
                content: [{ type: 'text', text: jsonToTSV(resp.data) }]
            };
        }
    });
    mcpServer.registerTool('ledger-account', {
        title: 'Ledger Account',
        description: `fetches read-only GL ledger account statement with voucher level details containing date, voucher type, voucher number, party name, amount (debit is negative and credit is positive), narration (or notes / remarks) returns output in tab separated format`,
        inputSchema: {
            targetCompany: z.string().optional().describe('optional company name. leave it blank or skip this to choose for default company. validate it using list-master tool with collection as company if specified'),
            ledgerName: z.string().describe('exact ledger name, validate it using list-master tool with collection as ledger'),
            fromDate: z.string().describe('date in YYYY-MM-DD format'),
            toDate: z.string().describe('date in YYYY-MM-DD format')
        },
        annotations: {
            readOnlyHint: true,
            openWorldHint: false
        }
    }, async (args) => {
        let inputParams = new Map([['fromDate', args.fromDate], ['toDate', args.toDate], ['ledgerName', args.ledgerName]]);
        if (args.targetCompany) {
            inputParams.set('targetCompany', args.targetCompany);
        }
        const resp = await handlePull('ledger-account', inputParams);
        if (resp.error) {
            return {
                isError: true,
                content: [{ type: 'text', text: resp.error }]
            };
        }
        else {
            //swap opening balance row to the top since it came at the end from Tally XML response
            if (Array.isArray(resp.data) && resp.data.length > 0) {
                const lastItem = resp.data.pop();
                resp.data.unshift(lastItem);
            }
            return {
                content: [{ type: 'text', text: jsonToTSV(resp.data) }]
            };
        }
        /* //code for Database Mode (for future use)
        //check if database connection string is available
        if(!process.env.CONNECTION_STRING || process.env.CONNECTION_STRING.trim() === '') {
          return {
            isError: true,
            content: [{ type: 'text', text: 'Database connection string is not configured in environment variables.' }]
          }
        }
  
        const dbResult = await getQueryResult(`SELECT v.date, v.voucher_type as "voucher type", v.voucher_number as "voucher number", v.party_name as "party ledger", a.amount, v.narration FROM trn_voucher as v JOIN trn_accounting as a on v.guid = a.guid WHERE v.is_order_voucher = 0 AND v.is_inventory_voucher = 0 AND a.ledger = $1 AND v.date BETWEEN $2 AND $3 ORDER BY date ASC, voucher_number ASC`, [inputParams.get('ledgerName'), inputParams.get('fromDate'), inputParams.get('toDate')]);
        if (dbResult.error) {
          return {
            isError: true,
            content: [{ type: 'text', text: 'Error' }]
          }
        }
        else {
          return {
            content: [{ type: 'text', text: jsonToTSV(dbResult.data) }]
          }
        }
        */
    });
    return mcpServer;
}
//# sourceMappingURL=mcp.mjs.map