import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { handlePull, jsonToTSV } from './tally.mjs';
import { utility } from './utility.mjs';

export async function registerMcpServer(): Promise<McpServer> {
  const mcpServer = new McpServer({
    name: 'Tally Prime MCP Server',
    title: 'Tally Prime',
    version: '1.0.0'
  });

  mcpServer.registerTool(
    'list-master',
    {
      title: 'List Masters',
      description: 'fetches read-only list of masters from Tally Prime collection e.g. group, ledger, vouchertype, unit, godown, stockgroup, stockitem, costcategory, costcentre, attendancetype, company, currency, gstin, gstclassification returns output in tab separated format',
      inputSchema: {
        targetCompany: z.string().optional().describe('optional company name, validate it using list-master tool with collection as company'),
        collection: z.string(z.enum(['group', 'ledger', 'vouchertype', 'unit', 'godown', 'stockgroup', 'stockitem', 'costcategory', 'costcentre', 'attendancetype', 'company', 'currency', 'gstin', 'gstclassification']))
      },
      annotations: {
        readOnlyHint: true,
        openWorldHint: false
      }
    },
    async (args) => {
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
    }
  );

  mcpServer.registerTool(
    'chart-of-accounts',
    {
      title: 'Chart of Accounts',
      description: 'fetches read-only chart of accounts or group structure / GL hierarchywith columns like group, parent, bs_pl, dr_cr, affects_gross_profit . The column bs_pl will have values BS = Balance Sheet / PL = Profit Loss. Column dr_cr as value D = Debit / C = Credit. The column affects_gross_profit has values Y = Yes / N = No, it is used to determine if ledger under this group will affect gross profit or not. returns output in tab separated format',
      inputSchema: {
        targetCompany: z.string().optional().describe('optional company name, validate it using list-master tool with collection as company')
      },
      annotations: {
        readOnlyHint: true,
        openWorldHint: false
      }
    },
    async (args) => {
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
    }
  );

  mcpServer.registerTool(
    'trial-balance',
    {
      title: 'Trial Balance',
      description: 'fetches read-only trial balance with fields like ledger, group, opening balance, net debit, net credit, closing balance. Use this tool in conjunction with chart-of-accounts tool to properly build hierarchy. returns output in tab separated format',
      inputSchema: {
        targetCompany: z.string().optional().describe('optional company name, validate it using list-master tool with collection as company'),
        fromDate: z.string().describe('date in YYYY-MM-DD format'),
        toDate: z.string().describe('date in YYYY-MM-DD format')
      },
      annotations: {
        readOnlyHint: true,
        openWorldHint: false
      }
    },
    async (args) => {
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
    }
  );

  mcpServer.registerTool(
    'stock-summary',
    {
      title: 'Stock Summary',
      description: 'fetches read-only stock summary with fields  item name, item parent, opening quantity, opening value, inward quantity, inward value, outward quantity, outward value, closing quantity, closing value, returns output in tab separated format',
      inputSchema: {
        targetCompany: z.string().optional().describe('optional company name, validate it using list-master tool with collection as company'),
        fromDate: z.string().describe('date in YYYY-MM-DD format'),
        toDate: z.string().describe('date in YYYY-MM-DD format')
      },
      annotations: {
        readOnlyHint: true,
        openWorldHint: false
      }
    },
    async (args) => {
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
    }
  );

  mcpServer.registerTool(
    'ledger-balance',
    {
      title: 'Ledger Balance',
      description: 'fetches read-only ledger closing balance as on date, negative is debit and positive is credit',
      inputSchema: {
        targetCompany: z.string().optional().describe('optional company name, validate it using list-master tool with collection as company'),
        ledgerName: z.string().describe('exact ledger name, validate it using list-master tool with collection as ledger'),
        toDate: z.string().describe('date in YYYY-MM-DD format')
      },
      annotations: {
        readOnlyHint: true,
        openWorldHint: false
      }
    },
    async (args) => {
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
    }
  );

  mcpServer.registerTool(
    'stock-item-balance',
    {
      title: 'Stock Item Balance',
      description: 'fetches read-only stock item remaining quantity balance as on date',
      inputSchema: {
        targetCompany: z.string().optional().describe('optional company name, validate it using list-master tool with collection as company'),
        itemName: z.string().describe('exact stock item name, validate it using list-master tool with collection as stockitem'),
        toDate: z.string().describe('date in YYYY-MM-DD format')
      },
      annotations: {
        readOnlyHint: true,
        openWorldHint: false
      }
    },
    async (args) => {
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
    }
  );

  mcpServer.registerTool(
    'bills-outstanding',
    {
      title: 'Bills Outstanding',
      description: 'fetches read-only pending overdue outstanding bills receivable or payable as on date returns output in tab separated format',
      inputSchema: {
        targetCompany: z.string().optional().describe('optional company name, validate it using list-master tool with collection as company'),
        nature: z.enum(['receivable', 'payable']),
        toDate: z.string().describe('date in YYYY-MM-DD format')
      },
      annotations: {
        readOnlyHint: true,
        openWorldHint: false
      }
    },
    async (args) => {
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
    }
  );

  mcpServer.registerTool(
    'ledger-account',
    {
      title: 'Ledger Account',
      description: 'fetches read-only GL ledger account statement with voucher level details containing date, voucher type, voucher number, amount (debit is negative and credit is positive), narration (or notes / remarks) returns output in tab separated format, kindly ignore sales order, purchase order, delivery note, receipt note from any financial calculations',
      inputSchema: {
        targetCompany: z.string().optional().describe('optional company name, validate it using list-master tool with collection as company'),
        ledgerName: z.string().describe('exact ledger name, validate it using list-master tool with collection as ledger'),
        fromDate: z.string().describe('date in YYYY-MM-DD format'),
        toDate: z.string().describe('date in YYYY-MM-DD format')
      },
      annotations: {
        readOnlyHint: true,
        openWorldHint: false
      }
    },
    async (args) => {
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

        // insert opening balance row at start of data
        let openingBalance = 0;
        let fromDate = utility.Date.parse(args.toDate, 'yyyy-MM-dd') || new Date();
        let _fromDate = new Date(fromDate);
        _fromDate.setDate(fromDate.getDate() - 1); // previous date from Opening Balance
        let respOpBal = await handlePull('ledger-balance', new Map([['ledgerName', args.ledgerName], ['toDate', utility.Date.format(_fromDate, 'yyyy-MM-dd')]]));
        openingBalance = respOpBal.data || 0;

        if (Array.isArray(resp.data)) {
          resp.data.unshift({
            date: utility.Date.format(fromDate, 'd-MMM-yy'),
            voucher_type: 'Opening Balance',
            voucher_number: '',
            party_ledger: '',
            amount: openingBalance,
            narration: ''
          });
        }

        return {
          content: [{ type: 'text', text: jsonToTSV(resp.data) }]
        };
      }
    }
  );

  return mcpServer;
}