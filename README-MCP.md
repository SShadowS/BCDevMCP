# Business Central Development MCP Server

This MCP (Model Context Protocol) server provides tools for Business Central development, enabling AI assistants to help with BC extension compilation, publishing, dependency management, and code generation tasks.

## Features

### Tools

1. **compile-app** - Compile Business Central app projects using the AL compiler
   
   **Parameters:**
   - `projectPath` (string, **required**) - Path to the app project folder containing app.json
   - `packageCachePath` (string, optional) - Path to the .alpackages folder with dependencies
   - `outputPath` (string, optional) - Path for the output .app file
   - `assemblyProbingPaths` (array of strings, optional) - Additional paths to search for .NET assemblies
   
   **Features:**
   - Automatic AL compiler availability checking
   - Supports both new 'al' command and legacy 'alc' command
   - Provides helpful error messages if AL compiler is not found

2. **publish-app** - Publish Business Central apps to server instances
   
   **Parameters:**
   - `appPath` (string, **required**) - Path to the .app file to publish
   - `serverUrl` (string, **required**) - Business Central server URL (e.g., http://localhost:7048/BC)
   - `serverInstance` (string, optional) - Server instance name (default: BC)
   - `tenant` (string, optional) - Tenant ID (default: default)
   - `authType` (enum, optional) - Authentication type: Windows, UserPassword, AAD
   - `username` (string, optional) - Username for UserPassword auth
   - `password` (string, optional) - Password for UserPassword auth
   - `syncMode` (enum, optional) - Sync mode: Add, Clean, Development, ForceSync (default: Add)
   - `skipVerification` (boolean, optional) - Skip app verification
   
   **Features:**
   - Supports both on-premises and Docker container deployments
   - Works with BC Management PowerShell module or BC Container Helper
   - Automatic app installation after publishing

3. **download-symbols** - Download AL symbols from Business Central servers
   
   **Parameters:**
   - `serverUrl` (string, **required**) - Business Central server URL for downloading symbols
   - `targetPath` (string, **required**) - Target directory for downloaded symbols (usually .alpackages)
   - `tenant` (string, optional) - Tenant ID (default: default)
   - `authType` (enum, optional) - Authentication type: Windows, UserPassword, AAD
   - `username` (string, optional) - Username for UserPassword auth
   - `password` (string, optional) - Password for UserPassword auth
   - `publisher` (string, optional) - Filter by publisher (e.g., Microsoft)
   - `appName` (string, optional) - Filter by app name
   - `version` (string, optional) - Filter by version
   
   **Features:**
   - Multiple download methods (BC modules, direct HTTP, AL compiler)
   - Filtering by publisher, app name, and version
   - Fallback instructions for manual download

4. **generate-al** - Generate AL code from templates
   
   **Parameters:**
   - `objectType` (enum, **required**) - Type of AL object: table, page, codeunit, report, query, xmlport, enum
   - `objectId` (number, **required**) - Object ID
   - `objectName` (string, **required**) - Object name (without spaces)
   - `targetPath` (string, **required**) - Target file path for the generated AL file
   - `fields` (array, optional) - Fields for table objects (id, name, dataType, length)
   - `template` (enum, optional) - Template type for pages: basic, card, list, document, journal
   
   **Features:**
   - Generates well-formatted AL code following BC conventions
   - Supports all major AL object types
   - Customizable templates for different page types
   - Field definitions for tables

## Installation

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the project:
   ```bash
   npm run build
   ```

## Usage

### With Claude Desktop

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "bcdev": {
      "command": "node",
      "args": ["U:\\Git\\BCDevMCP\\dist\\index.js"]
    }
  }
}
```

### Development Mode

Run in development mode with hot reload:
```bash
npm run dev
```

### Production Mode

Build and run:
```bash
npm run build
npm start
```

## Prerequisites

- Node.js v18 or higher
- AL Compiler (alc.exe) - Available through:
  - AL Language extension in VS Code (recommended)
  - Or Business Central Development Tools:
    ```bash
    dotnet tool install Microsoft.Dynamics.BusinessCentral.Development.Tools --interactive --prerelease --global
    ```

For publishing and advanced features, you'll also need:
- BC Management PowerShell module (for on-premises deployments)
- Or BC Container Helper (for Docker deployments):
  ```powershell
  Install-Module BcContainerHelper -Force
  ```

The server will check for AL compiler availability on startup and warn if it's not found.

## Example Usage

### Compile an app
```
Use the compile-app tool to compile the BC app in C:\BCProjects\CustomerExt
```

### Compile with dependencies
```
Use the compile-app tool to compile the BC app in C:\BCProjects\CustomerExt 
with package cache at C:\BCPackages\.alpackages
```

### Publish an app
```
Use the publish-app tool to publish C:\BCProjects\CustomerExt\CustomerExt.app 
to server http://localhost:7048/BC with tenant default
```

### Download symbols
```
Use the download-symbols tool to download symbols from http://localhost:7048/BC 
to C:\BCProjects\CustomerExt\.alpackages
```

### Generate a table
```
Use the generate-al tool to create a table with objectType table, 
objectId 50100, objectName Customer_Extension, 
targetPath C:\BCProjects\CustomerExt\src\CustomerExtension.Table.al
```

### Generate a page
```
Use the generate-al tool to create a page with objectType page, 
objectId 50100, objectName Customer_Extension, 
template list, targetPath C:\BCProjects\CustomerExt\src\CustomerList.Page.al
```

## Architecture

The server follows a modular architecture:
- `src/index.ts` - Main server entry point
- `src/adapters/ALCompilerAdapter.ts` - Encapsulates AL compiler interactions
- `src/tools/` - Individual tool implementations
  - `compileApp.ts` - App compilation tool
  - `publishApp.ts` - App publishing tool
  - `downloadSymbols.ts` - Symbol download tool
  - `generateAL.ts` - AL code generation tool

## Development

- `npm run build` - Build the TypeScript project
- `npm run dev` - Run in development mode
- `npm run typecheck` - Run type checking
- `npm run clean` - Clean build artifacts
- `npm test` - Run tests (when implemented)

## Version History

- **0.2.0** - Added modular architecture, publish-app, download-symbols, and generate-al tools
- **0.1.0** - Initial release with compile-app tool

## License

MIT