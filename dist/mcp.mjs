import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { handlePull, jsonToTSV } from './tally.mjs';
export async function registerMcpServer() {
    const mcpServer = new McpServer({
        name: 'Tally Prime MCP Server',
        title: 'Tally Prime',
        version: '1.0.0'
    });
    mcpServer.registerTool('list-master', {
        title: 'List Masters',
        description: 'list masters from Tally Prime collection e.g. group, ledger, vouchertype, unit, godown, stockgroup, stockitem, costcategory, costcentre, attendancetype, company, currency, gstin, gstclassification',
        inputSchema: {
            targetCompany: z.optional(z.string()),
            collection: z.string(z.enum(['group', 'ledger', 'vouchertype', 'unit', 'godown', 'stockgroup', 'stockitem', 'costcategory', 'costcentre', 'attendancetype', 'company', 'currency', 'gstin', 'gstclassification']))
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
                content: [{ type: 'text', text: JSON.stringify(resp.data) }]
            };
        }
    });
    mcpServer.registerTool('trial-balance', {
        title: 'Trial Balance',
        description: 'ledger opening closing balance, negative is debit and positive is credit for opening_balance and closing_balance, bspl value BS is Balance Sheet PL is Profit Loss, DrCr value Dr is Debit Cr is Credit in tab returns output in tab separated format',
        inputSchema: {
            targetCompany: z.optional(z.string()),
            fromDate: z.string({ description: 'date in YYYY-MM-DD format' }),
            toDate: z.string({ description: 'date in YYYY-MM-DD format' })
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
    mcpServer.registerTool('ledger-balance', {
        title: 'Ledger Balance',
        description: 'ledger closing balance as on date, negative is debit and positive is credit',
        inputSchema: {
            targetCompany: z.optional(z.string()),
            ledgerName: z.string({ description: 'exact ledger name, validate it using list-master tool with collection as ledger' }),
            toDate: z.string({ description: 'date in YYYY-MM-DD format' })
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
        description: 'stock item remaining quantity balance as on date',
        inputSchema: {
            targetCompany: z.optional(z.string()),
            itemName: z.string({ description: 'exact stock item name, validate it using list-master tool with collection as stockitem' }),
            toDate: z.string({ description: 'date in YYYY-MM-DD format' })
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
        description: 'pending overdue outstanding bills receivable or payable as on date returns output in tab separated format',
        inputSchema: {
            targetCompany: z.optional(z.string()),
            nature: z.enum(['receivable', 'payable']),
            toDate: z.string({ description: 'date in YYYY-MM-DD format' })
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
        description: 'GL ledger account statement with voucher level details containing date, voucher type, voucher number, amount (debit is negative and credit is positive), narration (or notes / remarks) returns output in tab separated format, kindly ignore sales order, purchase order, delivery note, receipt note from any financial calculations',
        inputSchema: {
            targetCompany: z.optional(z.string()),
            ledgerName: z.string({ description: 'exact ledger name, validate it using list-master tool with collection as ledger' }),
            fromDate: z.string({ description: 'date in YYYY-MM-DD format' }),
            toDate: z.string({ description: 'date in YYYY-MM-DD format' })
        }
    }, async (args) => {
        let inputParams = new Map([['fromDate', args.fromDate], ['toDate', args.toDate], ['ledgerName', args.ledgerName]]);
        if (args.targetCompany) {
            inputParams.set('targetCompany', args.targetCompany);
        }
        const resp = await handlePull('ledger-account', inputParams);
        return {
            content: [{ type: 'text', text: jsonToTSV(resp.data) }]
        };
    });
    return mcpServer;
}
//# sourceMappingURL=mcp.mjs.map