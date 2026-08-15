# ChatGPT Remote Tunnel

## Background
ChatGPT runs on web-browser. Unfortunately their server cannot directly access local Tally Prime MCP Server, running on our own PC. Remote Tunnel feature enables access to locally running MCP.

## Installation Steps

### Tunnel Client
OpenAI offers open-source tunnel client utility, which can be downloaded from their official GitHub Repository
[https://github.com/openai/tunnel-client/releases](https://github.com/openai/tunnel-client/releases)

On the above page scroll down, and find zip file for tunnel client for windows amd64. Unzip it to find tunnel-client.exe file (require no installation).
Place this executable file in your Tally MCP Server folder

### OpenAI API Key
Generate API Key from the official OpenAI developer API setup page
[https://platform.openai.com/settings/organization/api-keys](https://platform.openai.com/settings/organization/api-keys)

Create new secret key, which will open popup to generate API key. Copy the secret API key and store it securely. Create environment variable in Windows for storing this key, which will enable access of API key by tunnel client safely. Below is the process for Windows

1. In the Windows search bar, type *environment* and open settings page **Edit the system environment variables**
1. Go to Advance &gt; Environment Variables &gt;
1. System Variables &gt; New
1. Set values Variable Name = **CONTROL_PLANE_API_KEY** and Variable Value = **sk-xxxx** (copy paste API key)
1. Press OK and close the Window

### Tunnel Registration
Create tunnel by visiting official OpenAI developer page tunnel configuration page
[https://platform.openai.com/settings/organization/tunnels](https://platform.openai.com/settings/organization/tunnels)

Click Create Tunnel button. Specify values in all the fields in the popup. This would create a tunnel with tunnel id **tunnel_xxxx**

### Tunnel Profile
Create a basic profile for connecting to Tally Prime via local MCP. In the folder where tunnel-client.exe was downloaded, open PowerShell (Shift + right click) and run below command to create barebones of the profile (ensure to use key combination Ctrl + Shift + V to paste command in Powershell)

```powershell
.\tunnel-client init --sample sample_mcp_stdio_local --profile local-stdio --tunnel-id tunnel_xxxx --mcp-command node
```

Now we need to edit the profile file. Press **Windows + R** to invoke Windows run. Write %appdata% and press Enter which will open AppData folder. Navigate to folder **tunnel-client** and edit file **local-stdio.yaml** via Notepad

```yaml
config_version: 1
control_plane:
  base_url: "https://api.openai.com"

  tunnel_id: "tunnel_xxxx"
  api_key: "env:CONTROL_PLANE_API_KEY"
health:
  # Keep a fixed port when you want a stable local admin URL.
  # For concurrent or clean-room runs, switch listen_addr to "127.0.0.1:0" and
  # set url_file so another process can discover the resolved /healthz, /readyz,
  # /metrics, and /ui base URL.
  listen_addr: "127.0.0.1:8080"
  # url_file: "/tmp/tunnel-client-health.url"
admin_ui:
  open_browser: false
log:
  level: info
  format: json
mcp:
  commands:
    - channel: main
      command: node "D:/Software/Tally MCP Server/dist/index.mjs"
```

Substitute **tunnel_xxxx** with your actual Tunnel ID. In the last line of command, change the folder path to actual path where you have downloaded the Tally MCP Server.

Kindly save the file after above changes.

## Running Tunnel
To run tunnel, open Powershell from the folder where tunnel-client was downloaded. Copy-paste below command into Powershell window

```powershell
.\tunnel-client run --profile local-stdio
```

For ease of usage, simply copy paste this command into Notepad, and save the file by name **"ChatGPT Tunnel.ps1"** . Do not forget to enclose file name inside double quotes, which will enforce extension ps1. Next time you can run this file.