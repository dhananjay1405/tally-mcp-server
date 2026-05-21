# Tally Prime MCP Server
Tally Prime MCP (Model Context Protocol) Server implementation to feed Tally Prime ERP data to popular LLM like Claude, ChatGPT supporting MCP client. This MCP Server helps expose functionalities of Tally to LLM directly.


## Prerequisites
* Tally Prime (Silver / Gold)
* Node JS

Ensure below things are pre-installed and setup:
* Ensure to [download & install Node JS](https://nodejs.org/en) from official website
* XML Port of Tally Prime must be enabled (F1 &gt; Settings &gt; Connectivity &gt; Client/Server configuration) with below settings
```
TallyPrime acts as = Server
Port = 9000
```

*Note: Kindly avoid using Educational version of Tally Prime, which has limitations of date range. It will result in invalid / partial data being fed to LLM, leading to highly degraded &amp; incorrect responses.*

## Download
Avoid cloning repository directly. Utility is available for download (with required dependencies) on below link <br>
[https://excelkida.com/resource/tally-mcp-server-v7.2.zip](https://excelkida.com/resource/tally-mcp-server-v7.2.zip)

One-click installer **extension** for **Claude Desktop**<br>
[https://excelkida.com/resource/tally-mcp-server-v7.2.mcpb](https://excelkida.com/resource/tally-mcp-server-v7.2.mcpb)

Last updated: version **7.2** [21-May-2026]

Refer docs/CHANGELOG.md for details

## Supported Platform
Implementation was tested on below AI platform

|Platform|Local|Remote|
|--|--|--|
|Claude AI| :heavy_check_mark: | :heavy_check_mark: |
|ChatGPT|| :heavy_check_mark: |


## Setup (Local)
This mode of setup is to be used when MCP Client (like Claude Desktop, Perplexity etc.) and Tally Prime both exists in local PC. MCP Client software itself runs the MCP Server internally in such scenario.

Simply download &amp; extract zip file somewhere on the disk.  Assuming that we downloaded &amp; extracted zip file on below path (folder)
```
D:\Software\Tally MCP Server
```

<image src="https://excelkida.com/image/github/explorer-tally-mcp-server.png" height="265" width="766" />

A sample setup for few popular tools is demonstrated.

### Claude Desktop
Desktop version of Claude AI supports loading of local MCP server. Ensure you have Pro / Team / Max / Enterprise subscription of Claude, which supports higher limit compared to Free. MCP makes multiple calls to Tally for validation and inference, which might exhaust free limits quickly. Download Claude Desktop from following link
[claude.ai/download](https://claude.ai/download)

#### One-click installation (via Extension)

Go to menu &gt; File &gt; Settings

<image src="https://excelkida.com/image/github/claude-desktop-settings-menu.png" height="185" width="335">

Extensions &gt; Advance Settings

<image src="https://excelkida.com/image/github/claude-desktop-settings-extension.png" height="553" width="928">

Click on install extension button

<image src="https://excelkida.com/image/github/claude-desktop-extension-page.png" height="619" width="868">

Browse the extension file (with file extension mcpb) download at the start

<image src="https://excelkida.com/image/github/claude-desktop-extension-install.png" height="843" width="696">

A dialog window will appear asking *Do you want to install Tally Prime?* click **Install** button, which would install the Tally MCP Server

#### Installation via Config file (via Developer menu)

Go to menu &gt; File &gt; Settings &gt; Developer

<image src="https://excelkida.com/image/github/claude-desktop-developer-setting.png" height="751" width="1045" />

This will open My Computer window. Right click and edit **claude_desktop_config.json** file (via Notepad) with as below JSON
```json
{
  "mcpServers": {
	  "Tally Prime": {
		  "command": "node",
		  "args": ["D:\\Software\\Tally MCP Server\\dist\\index.mjs"]
	  }
  }
}
```
*Note: single slash in folder path needs to be substituted with double slash*

Save the file. Close Claude Desktop (menu &gt; File &gt; Exit) and again re-launch it.

Verify by clicking on Tools button and check if Tally Prime appears in the list (screenshot below)

<image src="https://excelkida.com/image/github/claude-desktop-tally-mcp-server-tool-display.png" height="595" width="722" />

### Perplexity Desktop
Perplexity Desktop version for MacOS supports connecting to local MCP server. Configuration file (JSON format) is same as demonstrated for Claude Desktop. In absense of MacBook, documentation with screenshot could not be written. Kindly refer to below blog on perplexity website, which explains the steps.

[Perplexity Desktop MCP Connectivity](https://www.perplexity.ai/help-center/en/articles/11502712-local-and-remote-mcps-for-perplexity)

## Setup (Cloud)
This mode of setup is to be used, when using browser-based MCP client like ChatGPT, Claude AI, Copilot, OR mobile-based app for these LLM which cannot access Tally Prime running inside local PC. In this scenario, MCP Server needs to run as web-server, internally connected to Tally securely. Setup is quite complicated, and is covered in detail in **docs** folder of this project.
* [Linux-based Server](docs/server-setup-linux.md)
* Windows Server (exploration in-progress)

## Available Tools

This server currently exposes 19 MCP tools.

### metadata-collection
Returns metadata for supported collections.

**Input**
No input.

**Output**
JSON array with objects containing:
1. `collection`
1. `description`

### query-option-values
Returns predefined option values used by input fields.

**Input**
|Argument|Description|
|--|--|
|optionName|Supported: `country-state`|

**Output**
JSON array of option values for the selected option name.

### metadata-fields
Returns field metadata for a selected collection.

**Input**
|Argument|Description|
|--|--|
|collection|Collection name. Use `metadata-collection` to discover valid values|

**Output**
JSON array of field metadata containing field name, description (if any), and normalized datatype (`string`, `number`, `date`, `boolean`).

### query-database
Runs SQL query on in-memory pglite tables previously created by reporting tools.

**Input**
|Argument|Description|
|--|--|
|sql|SELECT query only|
|outputFormat|One of `JSON Array of Objects`, `JSON with Schema and Rows`, `CSV`, `Markdown Table`. Default is JSON Array of Objects which is preferred format|

**Output**
Query result in tab-separated text format.

### query-collection
Queries a Tally collection for selected fields and caches output in an in-memory table.

**Input**
|Argument|Description|
|--|--|
|collection|Collection name|
|fields|Array of field names to fetch|
|targetCompany (optional)|Company name (defaults to active company)|
|fromDate (optional)|Date in YYYY-MM-DD|
|toDate (optional)|Date in YYYY-MM-DD|

**Output**
JSON: `{ "tableID": "..." }`

### list-master
Fetches list of masters for validation and auto-completion.

**Input**
|Argument|Description|
|--|--|
|targetCompany (optional)|Company name (defaults to active company)|
|collection|One of: `group`, `ledger`, `vouchertype`, `unit`, `godown`, `stockgroup`, `stockitem`, `costcategory`, `costcentre`, `attendancetype`, `company`, `currency`, `gstin`, `gstclassification`|
|containsFilter (optional)|filter to apply CONTAINS operation to restrict values|

**Output**
JSON: `{ "list": [ ... ] }`

### chart-of-accounts
Extracts Chart of Accounts (or Group hierarchy) useful for preparing Balance Sheet, Profit and Loss, Trial Balance

**Input**
|Argument|Description|
|--|--|
|targetCompany (optional)|Company name (defaults to active company)|

**Output**
JSON: `{ "tableID": "..." }` with columns:
1. `ledger_name`
1. `group_name`
1. `primary_group`
1. `bs_pl` (boolean) [**true** = Profit &amp; Loss  / **false** = Balance Sheet]
1. `dr_cr` (boolean) [**true** = Debit / **false** = Credit]
1. `affects_gross_profit` (boolean) [**true** = Affects Gross Profit / **false** = Does not affect Gross Profit]
1. `sort_position` (number)

### trial-balance
Fetches trial balance for period.

**Input**
|Argument|Description|
|--|--|
|targetCompany (optional)|Company name (defaults to active company)|
|fromDate|Date in YYYY-MM-DD|
|toDate|Date in YYYY-MM-DD|
|group_name (optional)|Filter by group name|

**Output**
JSON: `{ "tableID": "..." }` with columns:
1. `ledger_name`
1. `group_name`
1. `opening_balance` (number) [**negative** = Debit / **positive** = Credit]
1. `net_debit`
1. `net_credit`
1. `closing_balance` (number) [**negative** = Debit / **positive** = Credit]

### profit-loss
Fetches profit and loss data for period.

**Input**
|Argument|Description|
|--|--|
|targetCompany (optional)|Company name (defaults to active company)|
|fromDate|Date in YYYY-MM-DD|
|toDate|Date in YYYY-MM-DD|

**Output**
JSON: `{ "tableID": "..." }` with columns:
1. `ledger_name`
1. `group_name`
1. `closing_balance` (number) [**negative** = Debit / **positive** = Credit]

### balance-sheet
Fetches balance sheet data for period.

**Input**
|Argument|Description|
|--|--|
|targetCompany (optional)|Company name (defaults to active company)|
|fromDate|Date in YYYY-MM-DD|
|toDate|Date in YYYY-MM-DD|

**Output**
JSON: `{ "tableID": "..." }` with columns:
1. `ledger_name`
1. `group_name`
1. `closing_balance` (number) [**negative** = Debit / **positive** = Credit]

### stock-summary
Fetches stock item summary for period.

**Input**
|Argument|Description|
|--|--|
|targetCompany (optional)|Company name (defaults to active company)|
|fromDate|Date in YYYY-MM-DD|
|toDate|Date in YYYY-MM-DD|
|stockGroup (optional)|Filter by stock group name|

**Output**
JSON: `{ "tableID": "..." }` with columns:
1. `stock_item_name`
1. `stock_group_name`
1. `opening_quantity` (number)
1. `opening_value` (number) [**negative** = Debit / **positive** = Credit]
1. `inward_quantity` (number)
1. `inward_value` (number)
1. `outward_quantity` (number)
1. `outward_value` (number)
1. `closing_quantity` (number)
1. `closing_value` (number) [**negative** = Debit / **positive** = Credit]

### ledger-balance
Returns ledger closing balance as on date.

**Input**
|Argument|Description|
|--|--|
|targetCompany (optional)|Company name (defaults to active company)|
|ledgerName|Exact ledger name|
|toDate|Date in YYYY-MM-DD|

**Output**
JSON: `{ "amount": number }` where negative = Debit and positive = Credit.

### stock-item-balance
Returns stock item closing quantity as on date.

**Input**
|Argument|Description|
|--|--|
|targetCompany (optional)|Company name (defaults to active company)|
|itemName|Exact stock item name|
|toDate|Date in YYYY-MM-DD|

**Output**
JSON: `{ "quantity": number, "unit_of_measurement": string }` when found.

### bills-outstanding
Fetches receivable/payable bill-wise outstanding as on date.

**Input**
|Argument|Description|
|--|--|
|targetCompany (optional)|Company name (defaults to active company)|
|nature|`receivable` or `payable`|
|toDate|Date in YYYY-MM-DD|

**Output**
JSON: `{ "tableID": "..." }` with columns:
1. `bill_date`
1. `reference_number`
1. `outstanding_amount`
1. `party_name`
1. `overdue_days`

### ledger-account
Fetches ledger account statement for period.

**Input**
|Argument|Description|
|--|--|
|targetCompany (optional)|Company name (defaults to active company)|
|ledgerName|Ledger name|
|fromDate|Date in YYYY-MM-DD|
|toDate|Date in YYYY-MM-DD|

**Output**
JSON: `{ "tableID": "..." }` with columns:
1. `guid`
1. `date`
1. `voucher_type`
1. `voucher_number`
1. `alternate_ledger`
1. `party_name`
1. `amount` (number) [**negative** = Debit / **positive** = Credit]
1. `narration`

### stock-item-account
Fetches stock item account statement for period.

**Input**
|Argument|Description|
|--|--|
|targetCompany (optional)|Company name (defaults to active company)|
|itemName|Stock item name|
|fromDate|Date in YYYY-MM-DD|
|toDate|Date in YYYY-MM-DD|

**Output**
JSON: `{ "tableID": "..." }` with columns:
1. `date`
1. `voucher_type`
1. `voucher_number`
1. `party_ledger`
1. `quantity`
1. `amount` (number) [**negative** = Debit / **positive** = Credit]
1. `narration`
1. `tracking_number`
1. `voucher_category`

### ledger-create-update
Creates or updates one or more ledger.

**Note: This tool has ability to modify existing ledger. Always backup your Company before instructing this tool.**

**Input**
|Argument|Description|
|--|--|
|targetCompany (optional)|Company name (defaults to active company)|
|masters|Array of ledger master objects to create/update|

Master ledger object accepts following

|Property|Description|
|--|--|
|name|Ledger name or New Ledger name (during update)|
|_name|Existing ledger name|
|parent|Group under which ledger would exists|
|openingBalance|(optional) Opening Balance of the Ledger|
|isBillWise|(optional) flag to set Bill-by-Bill referencing|
|billCreditPeriod|(optional) Credit Period for bill in days|
|mailingDetails|(optional) Business Name for mailing purpose, country, state, pincode, address|
|gstRegistrationDetails|(optional) GST registration details like GST Number, Registration Type, Place of Supply (state)|

**Output**
JSON result returned by import operation (success/failure details).

### set-company
Sets active company context in Tally Prime.

**Input**
|Argument|Description|
|--|--|
|companyName|Company name to activate|

**Output**
JSON string: `"OK"` on success.

### set-period
Sets active reporting period context in Tally Prime.

**Input**
|Argument|Description|
|--|--|
|fromDate|Start date in YYYY-MM-DD|
|toDate|End date in YYYY-MM-DD|

**Output**
JSON string: `"OK"` on success.

## Contact
Project developed & maintained by: **Dhananjay Gokhale**

Email: **info@excelkida.com** <br>
Whatsapp: **(+91) 90284-63366**