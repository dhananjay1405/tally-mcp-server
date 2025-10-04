Version: **v1**
Release Date: **02-Sep-2025**

Added:
* Entire implementation of Local &amp; Remote MCP


Version: **v2**
Release Date: **04-Oct-2025**

Added:
* Tool **ledger-account** to grab ledger account
* Support for **ChatGPT** platform remote MCP

Fixed:
* oAuth implementation was revamped to adhere better to specification 2.1. These fixes allowed ChatGPT connectivity.
* Tabular response format was changed from JSON (which is heavy) to tab-separated for optimization. This allowed fitting of more data in response context.
* CLIENT_SECRET term was mistakenly used in entire code base, which was renamed as PASSWORD which is precise description of it.