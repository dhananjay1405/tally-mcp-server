# MCP Server Setup (Remote) - Linux

## Background
Tally Prime does not run natively on linux-based OS. Tally is available only for Windows Desktop &amp; Windows Server editions. But when it comes to web-server, Linux-based OS is the preferred choice over Windows Server OS. Linux-based Server OS is secure &amp; faster compared to Windows. This makes it better choice for running MCP server.

## Pre-requisites
Before proceeding with setup, below are few things an organization needs to have:
* Domain
* SSL Certificate
* Ubuntu Server 20 (or higher)
* Tally Prime (Silver / Gold)

Note: Kindly avoid using Educational version of Tally Prime, which has limitations of date range. It will result in invalid / partial data being fed to LLM, leading to highly degraded &amp; incorrect responses.

Also, person configuring server must have technical knowledge &amp; experience of below things:
* Hands-on experience of linux commands
* Configuration of web-server like Nginx / Apache, setting up websites
* Installation of Node JS via package manager
* Basic knowledge of running Tally Prime in Windows Server

## Architecture
![Tally MCP Server architecture](https://excelkida.com/image/github/tally-mcp-server-diagram-linux.png)

## SSH Tunnel
MCP Server needs to communicate with Tally Prime. Running tally in linux is not a viable solution. SSH (Secured Shell Host) supports forwarding Tally Prime XML server listening on port 9000 to the linux server, via remote port forwarding.

Ensure that XML port of Tally Prime is enabled and listening on port 9000 (already explained in home page documentation). Latest version of PowerShell / Windows Terminal, is already shipped with SSH. Alternatively one can use popular Graphical softwares like Putty, Terminus, etc which supports SSH. From the Windows PC / Server, enter below command to forward port to linux server

```bash
ssh -R 9000:localhost:9000 username@linux_server_host
```

This would initiate SSH session with the said port of Tally Prime made available to linux system for communication with Tally. Test if Tally Prime is responding by entering below command in linux terminal

```bash
curl http://localhost:9000
```

This should display below text in the terminal

```xml
<RESPONSE>TallyPrime Server is Running</RESPONSE>
```

Below care needs to be taken:
1. Internet connectivity needs to be stable, as SSH is not designed to re-connect automatically if connectivity drops. Kindly use professional softwares like [Bitvise SSH Client](https://bitvise.com/ssh-client) which support auto-reconnect.
1. Tally Prime must be running with single instance, without any manual intervention by any of the staff. Closing Tally, opening another instance of Tally, changing the company in Tally will hamper connectivity. Kindly prefer using Windows Server with a dedicated standard user account which usually office staff does not login.

## Ubuntu Setup
Tally MCP Server is powered by Node JS, and runs as a web-server. Unfortunately, Node JS powered web-server are not a good choice for front facing web-server. So, popular web-server for linux like Apache, Nginx are required to act as front facing web-server, which have hardened security. Node JS based MCP server will act as back facing web-server which is protected from outside world. Using reverse proxy feature, apache / nginx can forward requests to back facing MCP server.

### Nginx
Below is the sample configuration for Nginx which has been tested. Kindly substitute **example.com** with respective domain name. Also ensure to point SSL certificate &amp; private key with respective path (or location).

```
# /etc/nginx/conf.d/example_com.conf

# HTTP handler for redirection to HTTPS
server {
    listen 80;
    server_name example.com;
    rewrite ^/(.*) https://example.com/$1 permanent;
}

# HTTPS handler (reverse proxy)
server {
    listen 443 ssl;
    server_name example.com;

    ssl_certificate     /path_of_ssl_certificate/cert.pem;
    ssl_certificate_key /path_of_ssl_private_key/privkey.pem;
    ssl_protocols       TLSv1 TLSv1.1 TLSv1.2;
    ssl_ciphers         'EECDH+AESGCM:EDH+AESGCM:AES256+EECDH:AES256+EDH';

    location / {

    proxy_set_header 'Access-Control-Allow-Origin' 'https://example.com';
    proxy_set_header 'Access-Control-Allow-Credentials' 'true';
    proxy_set_header 'Access-Control-Allow-Headers' 'Authorization,Accept,Origin,X-CustomHeader,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Content-Range,Range,mcp-session-id';
    proxy_set_header 'Access-Control-Allow-Methods' 'GET,POST,OPTIONS,PUT,DELETE,PATCH';

    if ($request_method = 'OPTIONS') {
        add_header 'Access-Control-Allow-Origin' 'https://example.com';
        add_header 'Access-Control-Allow-Credentials' 'true';
        add_header 'Access-Control-Allow-Headers' 'Authorization,Accept,Origin,DNT,X-CustomHeader,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Content-Range,Range,mcp-session-id';
        add_header 'Access-Control-Allow-Methods' 'GET,POST,OPTIONS,PUT,DELETE,PATCH';
        add_header 'Access-Control-Max-Age' 1728000;
        add_header 'Content-Type' 'text/plain charset=UTF-8';
        add_header 'Content-Length' 0;
        return 204;
    }

    proxy_redirect off;

    proxy_pass http://localhost:3000;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### NodeJS Tally MCP Server
Tally MCP server can be accessed by anyone publicly over the web, it is protected by OAuth 2.0 authentication as specified in MCP server development documentation. Kindly generate alpha-numeric password of minimum 8 characters (use random string generator websites). Download &amp; extract zip archive from the download link (available on home page documentation).

Assuming password is **8LszTe5T** , domain is **example.com** and mcp server is extracted in location **/home/user/tally_mcp_server** , cd into the location and run it using below command.

```bash
PASSWORD=8LszTe5T MCP_DOMAIN=https://example.com node dist/server.mjs
```

This will start back facing Tally MCP Server, which receives request from front facing Nginx and communicate to Tally Prime via SSH tunnel. Manually running above command from linux terminal should be used only for testing purpose. On closing of linux terminal, MCP server launched by above command will be stopped. Kindly use process manager like [PM2 for Node JS](https://pm2.keymetrics.io/) to keep MCP server running.

## Connecting to Tally MCP Server
Connecting to MCP Server over web is supported by below popular AI platforms:
* Claude AI
* ChatGPT
* Microsoft Copilot (via Copilot Studio)

### Claude AI
Browse to Claude AI website and sign-in to your account. Go to Settings &gt; Connectors &gt; Add custom connector.
![Claude AI add custom connector](https://excelkida.com/image/github/claude-ai-add-custom-connector-setting.png)

Assuming your domain is **example.com** enter below values and then click Add button.
![Claude AI custom connector values](https://excelkida.com/image/github/claude-ai-custom-connector-values.png)

If web-server is configured properly, it should display line item for the MCP server as below (icon will be different for everyone).
![Claude AI MCP Server listing](https://excelkida.com/image/github/claude-ai-custom-connector-listed.png)

Click connect button, which will redirect to login screen. Enter password and then click Submit.
![Tally MCP Server Authorization](https://excelkida.com/image/github/tally-mcp-server-authorization.png)

If correct password is entered, then it should redirect back with MCP server listed something like this.
![Claude AI Tally MCP Server connected status](https://excelkida.com/image/github/claude-ai-tally-mcp-server-connected-status.png)

### ChatGPT
ChatGPT support for connecting to custom connectors (i.e. MCP Server) is available only for Plus, Pro, Business and Enterprise plans (paid plan). The steps will keep on changing as ChatGPT is currently experimenting remote MCP server feature.

Open ChatGPT website. Click on your profile and open Settings
<p style="text-align:left">
<image src="https://excelkida.com/image/github/chatgpt-settings-menu.png" height="690" width="536" />
</p>


Go to **Apps & Connectors**, scroll down and navigate to **Advanced settings**
![ChatGPT Advanced settings](https://excelkida.com/image/github/chatgpt-settings-advanced-settings.png)

Enable Developer mode switch
![ChatGPT Advanced settings](https://excelkida.com/image/github/chatgpt-enable-developer-mode.png)

Go back, scroll at the top and click *Create* button
![ChatGPT Connector Create button](https://excelkida.com/image/github/chatgpt-connectors-create-button.png)

Fill up the details (highlighted in yellow colour). Enter URL of your own MCP server domain
![ChatGPT Connector Create button](https://excelkida.com/image/github/chatgpt-custom-connector-create.png)

Click Create button, which will redirect to login screen. Enter Password and then click Submit.
![Tally MCP Server Authorization](https://excelkida.com/image/github/tally-mcp-server-authorization.png)

If correct password is entered, it should redirect back to ChatGPT with connecter added and available tools listed
![ChatGPT Tally Prime MCP connector tools](https://excelkida.com/image/github/chatgpt-connector-tally-mcp-tools.png)

### Microsoft Copilot
Exploration in progress !!!