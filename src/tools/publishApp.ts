import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { exec } from "child_process";
import { promisify } from "util";
import { platform } from "os";

const execAsync = promisify(exec);
const isWindows = platform() === 'win32';

const publishAppSchema = {
  appPath: z.string().describe("Path to the .app file to publish"),
  serverUrl: z.string().describe("Business Central server URL (e.g., http://localhost:7048/BC)"),
  serverInstance: z.string().optional().describe("Server instance name (default: BC)"),
  tenant: z.string().optional().describe("Tenant ID (default: default)"),
  authType: z.enum(["Windows", "UserPassword", "AAD"]).optional().describe("Authentication type"),
  username: z.string().optional().describe("Username (for UserPassword auth)"),
  password: z.string().optional().describe("Password (for UserPassword auth)"),
  syncMode: z.enum(["Add", "Clean", "Development", "ForceSync"]).optional().describe("Sync mode (default: Add)"),
  skipVerification: z.boolean().optional().describe("Skip app verification")
};

export function registerPublishAppTool(server: McpServer): void {
  server.registerTool(
    "publish-app",
    {
      title: "Publish Business Central App",
      description: "Publish a Business Central app to a server instance",
      inputSchema: publishAppSchema
    },
    async ({ 
      appPath, 
      serverUrl: _serverUrl, 
      serverInstance = "BC", 
      tenant = "default", 
      authType: _authType = "Windows",
      username: _username,
      password: _password,
      syncMode = "Add",
      skipVerification = false
    }) => {
      // Note: _serverUrl, _authType, _username, _password are reserved for future use
      // when implementing direct HTTP-based publishing
      try {
        // For publishing, we typically use PowerShell with the BC Management module
        // or the BC Container Helper for Docker deployments
        const execOptions = isWindows ? { shell: 'powershell.exe' } : {};
        
        // Build PowerShell command
        let psCommand = `
$ErrorActionPreference = "Stop"
try {
    # Check if BC Management module is available
    $module = Get-Module -ListAvailable -Name 'Microsoft.Dynamics.Nav.Management' | Select-Object -First 1
    if (-not $module) {
        # Try BC Container Helper as fallback
        $bcContainerHelper = Get-Module -ListAvailable -Name 'BcContainerHelper' | Select-Object -First 1
        if ($bcContainerHelper) {
            Import-Module BcContainerHelper
            
            # Extract container name from URL if using containers
            $containerName = "bcserver"  # Default, could be parsed from URL
            
            Publish-BcContainerApp \`
                -containerName $containerName \`
                -appFile "${appPath}" \`
                -sync \`
                -syncMode ${syncMode} \`
                ${skipVerification ? '-skipVerification' : ''}
                
            Write-Host "App published successfully to container: $containerName"
        } else {
            throw "Neither BC Management module nor BC Container Helper found. Please install one of them."
        }
    } else {
        Import-Module $module.Path
        
        # Traditional on-premises publishing
        $publishParams = @{
            ServerInstance = "${serverInstance}"
            Path = "${appPath}"
            Tenant = "${tenant}"
        }
        
        if ("${syncMode}" -ne "Add") {
            $publishParams.SyncMode = "${syncMode}"
        }
        
        if ($${skipVerification}) {
            $publishParams.SkipVerification = $true
        }
        
        Publish-NAVApp @publishParams
        
        # Install the app
        $appInfo = Get-NAVAppInfo -Path "${appPath}"
        Install-NAVApp \`
            -ServerInstance "${serverInstance}" \`
            -Name $appInfo.Name \`
            -Version $appInfo.Version \`
            -Tenant "${tenant}"
            
        Write-Host "App published and installed successfully"
        Write-Host "Name: $($appInfo.Name)"
        Write-Host "Version: $($appInfo.Version)"
        Write-Host "Publisher: $($appInfo.Publisher)"
    }
} catch {
    Write-Error $_.Exception.Message
    exit 1
}
        `.trim();

        console.log("Executing PowerShell publish command...");
        const { stdout, stderr } = await execAsync(psCommand, execOptions);
        
        const output = stdout || stderr || "Publishing completed";
        
        return {
          content: [{
            type: "text",
            text: `Publishing result:\n\n${output}`
          }]
        };
      } catch (error: any) {
        const errorMessage = error.stderr || error.stdout || error.message;
        
        return {
          content: [{
            type: "text",
            text: `Publishing failed:\n\n${errorMessage}\n\nNote: Publishing requires either:\n1. BC Management PowerShell module (for on-premises)\n2. BC Container Helper (for Docker deployments)\n\nInstall BC Container Helper with:\nInstall-Module BcContainerHelper -Force`
          }],
          isError: true
        };
      }
    }
  );
}