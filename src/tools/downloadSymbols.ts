import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { exec } from "child_process";
import { promisify } from "util";
import { mkdir } from "fs/promises";
import { platform } from "os";

const execAsync = promisify(exec);
const isWindows = platform() === 'win32';

const downloadSymbolsSchema = {
  serverUrl: z.string().describe("Business Central server URL for downloading symbols"),
  targetPath: z.string().describe("Target directory for downloaded symbols (usually .alpackages)"),
  tenant: z.string().optional().describe("Tenant ID (default: default)"),
  authType: z.enum(["Windows", "UserPassword", "AAD"]).optional().describe("Authentication type"),
  username: z.string().optional().describe("Username (for UserPassword auth)"),
  password: z.string().optional().describe("Password (for UserPassword auth)"),
  companyName: z.string().optional().describe("Company name for filtering"),
  publisher: z.string().optional().describe("Filter by publisher (e.g., Microsoft)"),
  appName: z.string().optional().describe("Filter by app name"),
  version: z.string().optional().describe("Filter by version")
};

export function registerDownloadSymbolsTool(server: McpServer): void {
  server.registerTool(
    "download-symbols",
    {
      title: "Download AL Symbols",
      description: "Download symbol packages from a Business Central server",
      inputSchema: downloadSymbolsSchema
    },
    async ({ 
      serverUrl, 
      targetPath,
      tenant = "default",
      authType = "Windows",
      username,
      password,
      publisher,
      appName,
      version
    }) => {
      try {
        // Ensure target directory exists
        await mkdir(targetPath, { recursive: true });
        
        // For downloading symbols, we can use either:
        // 1. AL compiler's download symbols feature
        // 2. PowerShell with BC modules
        // 3. Direct HTTP requests to the symbols endpoint
        
        const execOptions = isWindows ? { shell: 'powershell.exe' } : {};
        
        // Build PowerShell command for downloading symbols
        let psCommand = `
$ErrorActionPreference = "Stop"
try {
    # Method 1: Try using BC Management module
    $module = Get-Module -ListAvailable -Name 'Microsoft.Dynamics.Nav.Management' | Select-Object -First 1
    if ($module) {
        Import-Module $module.Path
        
        # Get app packages from server
        $apps = Get-NAVAppInfo -ServerInstance "${serverUrl.split('/').pop() || 'BC'}" -Tenant "${tenant}"
        
        # Filter apps if specified
        if ("${publisher}") {
            $apps = $apps | Where-Object { $_.Publisher -like "*${publisher}*" }
        }
        if ("${appName}") {
            $apps = $apps | Where-Object { $_.Name -like "*${appName}*" }
        }
        if ("${version}") {
            $apps = $apps | Where-Object { $_.Version -eq "${version}" }
        }
        
        Write-Host "Found $($apps.Count) apps to download"
        
        foreach ($app in $apps) {
            $fileName = "$($app.Publisher)_$($app.Name)_$($app.Version).app"
            $filePath = Join-Path "${targetPath}" $fileName
            
            Export-NAVApp \`
                -ServerInstance "${serverUrl.split('/').pop() || 'BC'}" \`
                -Path $filePath \`
                -AppName $app.Name \`
                -AppPublisher $app.Publisher \`
                -AppVersion $app.Version \`
                -Tenant "${tenant}"
                
            Write-Host "Downloaded: $fileName"
        }
    } else {
        # Method 2: Use direct download URL pattern
        $symbolsUrl = "${serverUrl}/dev/packages"
        if ("${tenant}" -ne "default") {
            $symbolsUrl += "?tenant=${tenant}"
        }
        
        # Download symbols metadata
        $headers = @{}
        if ("${authType}" -eq "UserPassword" -and "${username}" -and "${password}") {
            $encodedCreds = [System.Convert]::ToBase64String([System.Text.Encoding]::ASCII.GetBytes("${username}:${password}"))
            $headers["Authorization"] = "Basic $encodedCreds"
        }
        
        try {
            $response = Invoke-WebRequest -Uri $symbolsUrl -Headers $headers -UseDefaultCredentials
            $packages = $response.Content | ConvertFrom-Json
            
            Write-Host "Available packages:"
            foreach ($package in $packages.value) {
                Write-Host "- $($package.publisher)_$($package.name)_$($package.version)"
                
                # Download each package
                $downloadUrl = "$symbolsUrl/$($package.id)"
                $fileName = "$($package.publisher)_$($package.name)_$($package.version).app"
                $filePath = Join-Path "${targetPath}" $fileName
                
                Invoke-WebRequest -Uri $downloadUrl -Headers $headers -OutFile $filePath -UseDefaultCredentials
                Write-Host "  Downloaded to: $filePath"
            }
        } catch {
            # Fallback: Provide manual instructions
            Write-Host "Automated download failed. Manual download instructions:"
            Write-Host ""
            Write-Host "1. Open VS Code with AL Language extension"
            Write-Host "2. Create/update .vscode/launch.json with:"
            Write-Host '   "server": "${serverUrl}",'
            Write-Host '   "authentication": "${authType}",'
            Write-Host "3. Run 'AL: Download Symbols' command"
            Write-Host ""
            Write-Host "Or use direct URL in browser:"
            Write-Host "${serverUrl}/dev/packages"
        }
    }
    
    Write-Host ""
    Write-Host "Symbol download completed. Target directory: ${targetPath}"
    
} catch {
    Write-Error $_.Exception.Message
    exit 1
}
        `.trim();

        console.log("Downloading symbols...");
        const { stdout, stderr } = await execAsync(psCommand, execOptions);
        
        const output = stdout || stderr || "Symbol download completed";
        
        // Also provide alternative method using AL compiler
        const alternativeMethod = `\n\nAlternative method using AL compiler:\n1. Create a temporary app.json in ${targetPath}\n2. Run: al package /project:"${targetPath}" /downloadSymbols /serverUrl:"${serverUrl}"`;
        
        return {
          content: [{
            type: "text",
            text: `Symbol download result:\n\n${output}${alternativeMethod}`
          }]
        };
      } catch (error: any) {
        const errorMessage = error.stderr || error.stdout || error.message;
        
        return {
          content: [{
            type: "text",
            text: `Symbol download failed:\n\n${errorMessage}\n\nTroubleshooting:\n1. Ensure server URL is correct and accessible\n2. Check authentication settings\n3. Verify you have permissions to download symbols\n4. Try using VS Code's 'AL: Download Symbols' command as alternative`
          }],
          isError: true
        };
      }
    }
  );
}