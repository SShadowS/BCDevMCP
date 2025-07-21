import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ALCompilerAdapter } from "../adapters/ALCompilerAdapter.js";

const compileAppSchema = {
  projectPath: z.string().describe("Path to the app project folder containing app.json"),
  packageCachePath: z.string().optional().describe("Path to the .alpackages folder with dependencies"),
  outputPath: z.string().optional().describe("Path for the output .app file"),
  assemblyProbingPaths: z.array(z.string()).optional().describe("Additional paths to search for .NET assemblies")
};

export function registerCompileAppTool(server: McpServer): void {
  server.registerTool(
    "compile-app",
    {
      title: "Compile Business Central App",
      description: "Compile a Business Central app project using the AL compiler",
      inputSchema: compileAppSchema
    },
    async ({ projectPath, packageCachePath, outputPath, assemblyProbingPaths }) => {
      const compiler = ALCompilerAdapter.getInstance();
      const compilerInfo = compiler.getCompilerInfo();

      if (!compilerInfo || !compilerInfo.available) {
        return {
          content: [{
            type: "text",
            text: "Error: AL compiler is not available in PATH.\n\nTo install it:\n1. Install the AL Language extension in VS Code\n2. Or install Business Central Development Tools:\n   dotnet tool install Microsoft.Dynamics.BusinessCentral.Development.Tools --interactive --prerelease --global\n3. Make sure 'al' command is in your system PATH"
          }],
          isError: true
        };
      }

      const result = await compiler.compile({
        projectPath,
        packageCachePath,
        outputPath,
        assemblyProbingPaths
      });

      return {
        content: [{
          type: "text",
          text: result.success 
            ? `Compilation result:\n\n${result.output}`
            : `Compilation failed:\n\n${result.output}`
        }],
        isError: !result.success
      };
    }
  );
}