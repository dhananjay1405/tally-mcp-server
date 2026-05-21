# Release History

### Version: v7.2 [13-May-2026]

Added:
* Bundled version of Tally MCP Server for Claude Desktop i.e. Extension, for one-click installation

### Version: v7.1 [13-May-2026]

Fixed:
* Internal TDL syntax in XML request were breaking when double quote was specified in input for tools, which is now escaped properly
* Faulty handling for 0 and blank string is fixed
* In v7 tool chart-of-accounts was modified to extract only group, due to which response cycle was getting longer consuming more tokens. This behavious is reverted back to orginal
* In tool **ledger-account** field displaying alternate ledger is introduced, since party name field is found empty for journal type vouchers

### Version: v7 [12-May-2026]

Added:
* Tools **set-period** and **set-company** which can act as extra safeguard if user wants to set it as default for subsequent tool calls
* Tool **query-collection** to quickly query various fields of collection dynamically for ad-hoc information gathering [#11](https://github.com/dhananjay1405/tally-mcp-server/issues/11)
* Tools **metadata-collection** and **metadata-fields** to be used as helper functionality to gather listing of available collections and their fields for *query-collection* tool
* Tool **query-option-values** to gather listing of drop-down values from Tally for various data-entry screens [#12](https://github.com/dhananjay1405/tally-mcp-server/issues/12)
* Tool **ledger-create-update** to create or update ledger(s) on-the-fly in Tally [#7](https://github.com/dhananjay1405/tally-mcp-server/issues/7)

Fixed:
* Database of in-memory query was changed from **DuckDB** to **PgLite** for better cross-platform experience. Justification behind this change was increasing adoption of this MCP server in Mac OS [[#10](https://github.com/dhananjay1405/tally-mcp-server/issues/10)]
* Migrated many reports to use tool query-collection internally to reduce static XML templates. As a result many of XML template files are now removed in favour of internal tool call. Reports are left only for few tools which have complex TDL expression which is difficult to accommodate in query collection functionality.
* Tool usage for reports were found to be reading template file from disk for every tool call. Caching of these templates was implemented by storing minified XML of these template in key-value variables [#13](https://github.com/dhananjay1405/tally-mcp-server/issues/13)
* TSV (Tab Separated Value) format was facing issue for few AI agents, which are designed to work only with JSON output. TSV has been removed in favour of introduction of 4 output format CSV, Markdown, JSON Array of Objects, JSON Schema and Rows

### Version: v6 [11-Nov-2025]

Added:
* Introducing of DuckDB based in-memory database caching of tabular output into temporary table (which persists for 15 min), for quick and accurate aggregation, filtering, sorting, calculation (which LLM is not capable of). This feature helps to do away with context size limitation of LLM for MCP output, which often produced error or hallucination. LLM now smartly handles by using SQL query to get this done.

Fixed:
* Renaming of column names for better readability and SQL querying by MCP
* Fixed few prompt description
* Amount was coming as 0 for *ledger-account* tool for few scenario, is now fixed by relevant XML TDL expression changes
* Quantity fetched by *stock-item-balance* tool was in absolute number ignoring negative balance scenario, is fixed by applying changes to XML
* Debit / Credit total in *trial-balance* tool was suppose to be positive for net Debit or net Credit respetively, is now fixed by applying changes on XML

### Version: v5 [06-Nov-2025]

Added:
* Stock Item Account tool

Fixed:
* ledger-account tool was ignoring Debit / Credit sign for opening balance. XML was fixed to prefix Dr / Cr sign


### Version: v4 [30-Oct-2025]

Added:
* Ease of configuration of setting via **.env** file instead of environment variables
* Balance Sheet and Profit Loss tools

Fixed:
* Ability to fetch from specific targetCompany was not working, which is now fixed
* ledger-account tool was skipping vouchers for some scenario. XML was fixed to query it and optimize it further as per Tally Solution TDL blog for best practise
* Unnecessary XML files used during initial development phase were removed


### Version: v3 [09-Oct-2025]

Added:
* Tool **chart-of-accounts** to grab group hierarchy structure
* Tool **stock-summary** to pull summary of all stock items with opening / inward / outward / closing values of quantity and amount

Fixed:
* Revamped MCP code to enhance connectivity with ChatGPT
* Minor fixes in Tally XML handling
* Tool **ledger-account** was skipping opening balance, which is not added into it
* Converted output of all the possible tools to tab separated format for optimization and light-weight response


### Version: v2 [04-Oct-2025]

Added:
* Tool **ledger-account** to grab ledger account
* Support for **ChatGPT** platform remote MCP

Fixed:
* oAuth implementation was revamped to adhere better to specification 2.1. These fixes allowed ChatGPT connectivity.
* Tabular response format was changed from JSON (which is heavy) to tab-separated for optimization. This allowed fitting of more data in response context.
* CLIENT_SECRET term was mistakenly used in entire code base, which was renamed as PASSWORD which is precise description of it.


### Version: v1 [02-Sep-2025]

Added:
* Entire implementation of Local &amp; Remote MCP