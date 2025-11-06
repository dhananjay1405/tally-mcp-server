Version: **v5**<br>
Release Date: **06-Nov-2025**

Added:
* Stock Item Account tool

Fixed:
* ledger-account tool was ignoring Debit / Credit sign for opening balance. XML was fixed to prefix Dr / Cr sign


Version: **v4**<br>
Release Date: **30-Oct-2025**

Added:
* Ease of configuration of setting via **.env** file instead of environment variables
* Balance Sheet and Profit Loss tools

Fixed:
* Ability to fetch from specific targetCompany was not working, which is now fixed
* ledger-account tool was skipping vouchers for some scenario. XML was fixed to query it and optimize it further as per Tally Solution TDL blog for best practise
* Unnecessary XML files used during initial development phase were removed


Version: **v3**<br>
Release Date: **09-Oct-2025**

Added:
* Tool **chart-of-accounts** to grab group hierarchy structure
* Tool **stock-summary** to pull summary of all stock items with opening / inward / outward / closing values of quantity and amount

Fixed:
* Revamped MCP code to enhance connectivity with ChatGPT
* Minor fixes in Tally XML handling
* Tool **ledger-account** was skipping opening balance, which is not added into it
* Converted output of all the possible tools to tab separated format for optimization and light-weight response


Version: **v2**<br>
Release Date: **04-Oct-2025**

Added:
* Tool **ledger-account** to grab ledger account
* Support for **ChatGPT** platform remote MCP

Fixed:
* oAuth implementation was revamped to adhere better to specification 2.1. These fixes allowed ChatGPT connectivity.
* Tabular response format was changed from JSON (which is heavy) to tab-separated for optimization. This allowed fitting of more data in response context.
* CLIENT_SECRET term was mistakenly used in entire code base, which was renamed as PASSWORD which is precise description of it.


Version: **v1**<br>
Release Date: **02-Sep-2025**

Added:
* Entire implementation of Local &amp; Remote MCP