import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ALCompilerAdapter } from "./adapters/ALCompilerAdapter.js";
import { 
  registerCompileAppTool,
  registerPublishAppTool,
  registerDownloadSymbolsTool,
  registerGenerateALTool,
  registerRunTestsTool,
  registerInitProjectTool
} from "./tools/index.js";

// Create the MCP server
const server = new McpServer({
  name: "bcdev-mcp",
  version: "0.3.0"
});

// Register all tools
registerCompileAppTool(server);
registerPublishAppTool(server);
registerDownloadSymbolsTool(server);
registerGenerateALTool(server);
registerRunTestsTool(server);
registerInitProjectTool(server);

// Start the server
async function main() {
  console.log("Starting Business Central Development MCP Server...");
  
  // Initialize the AL Compiler Adapter
  console.log("Checking for AL compiler...");
  const compiler = ALCompilerAdapter.getInstance();
  await compiler.initialize();
  
  const compilerInfo = compiler.getCompilerInfo();
  if (compilerInfo && compilerInfo.available) {
    console.log("✓ AL compiler found");
    if (compilerInfo.version) {
      console.log(`  Version: ${compilerInfo.version}`);
    } else {
      console.log("  Version: (version info not available)");
    }
  } else {
    console.warn("✗ AL compiler not found in PATH");
    console.warn("  The compile-app tool will not work without it.");
    console.warn("  Install it via:");
    console.warn("  - AL Language extension in VS Code");
    console.warn("  - Or Business Central Development Tools");
  }
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log("Server is running and ready to accept connections.");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});