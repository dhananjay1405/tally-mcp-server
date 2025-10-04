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
[https://excelkida.com/resource/tally-mcp-server-v2.zip](https://excelkida.com/resource/tally-mcp-server-v2.zip)

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
![My Computer view Tally MCP Server](https://excelkida.com/image/github/explorer-tally-mcp-server.png)

A sample setup for few popular tools is demonstrated.

### Claude Desktop
Desktop version of Claude AI supports loading of local MCP server. Ensure you have Pro / Team / Max / Enterprise subscription of Claude, which supports higher limit compared to Free. MCP makes multiple calls to Tally for validation and inference, which might exhaust free limits quickly. Download Claude Desktop from following link
[claude.ai/download](https://claude.ai/download)

Go to menu &gt; File &gt; Settings &gt; Developer
![Claude AI Desktop - Developer Settings](https://excelkida.com/image/github/claude-desktop-developer-setting.png)

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
![Claude Desktop - Tally MCP Server tool listing](https://excelkida.com/image/github/claude-desktop-tally-mcp-server-tool-display.png)

### Perplexity Desktop
Perplexity Desktop version for MacOS supports connecting to local MCP server. Configuration file (JSON format) is same as demonstrated for Claude Desktop. In absense of MacBook, documentation with screenshot could not be written. Kindly refer to below blog on perplexity website, which explains the steps.

[Perplexity Desktop MCP Connectivity](https://www.perplexity.ai/help-center/en/articles/11502712-local-and-remote-mcps-for-perplexity)

## Setup (Cloud)
This mode of setup is to be used, when using browser-based MCP client like ChatGPT, Claude AI, Copilot, OR mobile-based app for these LLM which cannot access Tally Prime running inside local PC. In this scenario, MCP Server needs to run as web-server, internally connected to Tally securely. Setup is quite complicated, and is covered in detail in **docs** folder of this project.
* [Linux-based Server](docs/server-setup-linux.md)
* Windows Server (exploration in-progress)

## Available Tools

### list-master
Extracts list of specific master for auto-completion and validation if master exists, during inference by LLM

**Input**
|Argument|Description|
|--|--|
|targetCompany (optional)|Company name of the target company in Tally. Skipping this defaults to Active company|
|collection|Valid collection of Tally|

**Output**
List (or array) of queries master

Collections that can be queried:
1. Group
1. Ledger
1. VoucherType
1. Unit
1. Godown
1. StockGroup
1. StockItem
1. CostCentre
1. CostCategory
1. AttendanceType
1. Company
1. Currency
1. GSTIN
1. GSTClassification

### trial-balance
Extracts Trial Balance for the specified period

**Input**
|Argument|Description|
|--|--|
|targetCompany (optional)|Company name of the target company in Tally. Skipping this defaults to Active company|
|fromDate|Period start date (useful for opening balance)|
|toDate|Period end date for closing balance|

**Output**
Tabular output with columns as below

|Column|Description|
|--|--|
|name|Ledger name|
|parent|Group under which ledger exists|
|primary_group|Primary Group (in case of multi-level grouping) of the ledger|
|bspl|BS (Balance Sheet) / PL (Profit &amp; Loss)|
|drcr|Dr (Debit) / Cr (Credit)|
|opening_balance|Opening Balance for the specified fromDate|
|net_debit|Net Debit during the specified period|
|net_credit|Net Credit during the specified period|
|closing_balance|Closing Balance for the specified fromDate|

### ledger-balance
Returns closing balance of ledger as on specified date

**Input**
|Argument|Description|
|--|--|
|targetCompany (optional)|Company name of the target company in Tally. Skipping this defaults to Active company|
|ledgerName|Ledger of which to query balance|
|toDate|specific date for closing balance|

**Output**
Closing Balance of ledger (if exists)

|Sign|Description|
|--|--|
|Negative (-)|Debit|
|Positive (+)|Credit|

Note: If specified ledger does not exists, LLM might invoke list-master tool to fetch list of ledgers. It will attempt to find closest possible ledger name for this list and re-run this action. This might produce un-predictable response.

### ledger-account
Extracts ledger account for the specified ledger for the given period

**Input**
|Argument|Description|
|--|--|
|targetCompany (optional)|Company name of the target company in Tally. Skipping this defaults to Active company|
|ledgerName|Ledger of which to query balance|
|fromDate|period start date|
|toDate|period end date|

**Output**
Tabular output with columns as below

|Column|Description|
|--|--|
|date|Date of voucher|
|voucher_type|Voucher Type|
|voucher_number|Voucher Number|
|amount|Amount (negative = Debit / positive = Credit)|
|narration|Narration or Remarks of voucher|

### stock-item-balance
Returns available quantity of stock item as on specified date

**Input**
|Argument|Description|
|--|--|
|targetCompany (optional)|Company name of the target company in Tally. Skipping this defaults to Active company|
|itemName|Stock Item of which to query available quantity|
|toDate|specific date as on which to check quantity|

**Output**
Available Quantity of stock item (if exists)


Note: If specified stock item does not exists, LLM might invoke list-master tool to fetch list of stock items. It will attempt to find closest possible stock item name for this list and re-run this action. This might produce un-predictable response.

### bills-outstanding
Extracts bill-wise outstanding Receivables / Payables report

**Input**
|Argument|Description|
|--|--|
|targetCompany (optional)|Company name of the target company in Tally. Skipping this defaults to Active company|
|nature|receivable / payable|
|toDate|Date on which outstanding position to fetch|

**Output**
Tabular output with columns as below

|Column|Description|
|--|--|
|date|Date of purchase / sales invoice|
|reference_number|Invoice number of purchase / sales invoice|
|outstanding_amount|Pending amount as on date|
|party_name|Ledger name of the party|
|overdue_days|Count of days by which invoice is overdue|

## Contact
Project developed & maintained by: **Dhananjay Gokhale**

Email: **info@excelkida.com** <br>
Whatsapp: **(+91) 90284-63366**