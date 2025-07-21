import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

const initProjectSchema = {
  projectPath: z.string().describe("Path where the new project should be created"),
  projectName: z.string().describe("Name of the project"),
  publisher: z.string().describe("Publisher name"),
  version: z.string().optional().describe("Initial version (default: 1.0.0.0)"),
  idRange: z.object({
    from: z.number(),
    to: z.number()
  }).optional().describe("Object ID range"),
  bcVersion: z.string().optional().describe("Business Central version (e.g., 21.0)"),
  dependencies: z.array(z.object({
    id: z.string(),
    name: z.string(),
    publisher: z.string(),
    version: z.string()
  })).optional().describe("Project dependencies"),
  features: z.array(z.enum(["tableExtensions", "pageExtensions", "permissionSets", "tests"])).optional().describe("Features to include"),
  gitInit: z.boolean().optional().describe("Initialize git repository")
};

export function registerInitProjectTool(server: McpServer): void {
  server.registerTool(
    "init-project",
    {
      title: "Initialize BC Project",
      description: "Create a new Business Central project with proper structure",
      inputSchema: initProjectSchema
    },
    async ({ 
      projectPath,
      projectName,
      publisher,
      version = "1.0.0.0",
      idRange = { from: 50100, to: 50149 },
      bcVersion = "21.0",
      dependencies = [],
      features = [],
      gitInit = true
    }) => {
      try {
        // Create project directory
        await mkdir(projectPath, { recursive: true });
        
        // Create app.json
        const appJson = {
          id: generateGuid(),
          name: projectName,
          publisher: publisher,
          version: version,
          brief: "",
          description: "",
          privacyStatement: "",
          EULA: "",
          help: "",
          url: "",
          logo: "",
          dependencies: dependencies.length > 0 ? dependencies : [
            {
              id: "63ca2fa4-4f03-4f2b-a480-172fef340d3f",
              publisher: "Microsoft",
              name: "System Application",
              version: bcVersion
            },
            {
              id: "437dbf0e-84ff-417a-965d-ed2bb9650972",
              publisher: "Microsoft",
              name: "Base Application",
              version: bcVersion
            }
          ],
          idRanges: [idRange],
          contextSensitiveHelpUrl: "https://docs.microsoft.com/",
          platform: bcVersion,
          application: bcVersion,
          target: "Cloud",
          runtime: getMajorVersion(bcVersion)
        };
        
        await writeFile(
          join(projectPath, "app.json"),
          JSON.stringify(appJson, null, 2),
          'utf8'
        );
        
        // Create .vscode directory and launch.json
        const vscodeDir = join(projectPath, ".vscode");
        await mkdir(vscodeDir, { recursive: true });
        
        const launchJson = {
          version: "0.2.0",
          configurations: [
            {
              name: "Your own server",
              type: "al",
              request: "launch",
              startupObjectId: 22,
              startupObjectType: "Page",
              breakOnError: "All",
              breakOnRecordWrite: "None",
              launchBrowser: true,
              enableSqlInformationDebugger: true,
              enableLongRunningSqlStatements: true,
              longRunningSqlStatementsThreshold: 500,
              numberOfSqlStatements: 10,
              schemaUpdateMode: "ForceSync"
            }
          ]
        };
        
        await writeFile(
          join(vscodeDir, "launch.json"),
          JSON.stringify(launchJson, null, 2),
          'utf8'
        );
        
        // Create settings.json
        const settingsJson = {
          "al.enableCodeAnalysis": true,
          "al.codeAnalyzers": [
            "${CodeCop}",
            "${UICop}",
            "${PerTenantExtensionCop}"
          ],
          "al.ruleSetPath": "./.ruleset.json"
        };
        
        await writeFile(
          join(vscodeDir, "settings.json"),
          JSON.stringify(settingsJson, null, 2),
          'utf8'
        );
        
        // Create .gitignore
        const gitignoreContent = `# AL files
*.app
*.g.xlf
.alpackages/
.alcache/
.altemplates/
.snapshots/
*.dep.json

# VS Code
.vscode/*
!.vscode/settings.json
!.vscode/launch.json
!.vscode/tasks.json

# Windows
Thumbs.db
ehthumbs.db
Desktop.ini

# macOS
.DS_Store
.AppleDouble
.LSOverride`;
        
        await writeFile(
          join(projectPath, ".gitignore"),
          gitignoreContent,
          'utf8'
        );
        
        // Create .editorconfig
        const editorConfigContent = `root = true

[*]
charset = utf-8
end_of_line = crlf
insert_final_newline = true
indent_style = space
indent_size = 4
trim_trailing_whitespace = true

[*.{json,xml}]
indent_size = 2`;
        
        await writeFile(
          join(projectPath, ".editorconfig"),
          editorConfigContent,
          'utf8'
        );
        
        // Create src directory
        const srcDir = join(projectPath, "src");
        await mkdir(srcDir, { recursive: true });
        
        // Create .alpackages directory
        await mkdir(join(projectPath, ".alpackages"), { recursive: true });
        
        // Create test directory if tests feature is enabled
        if (features.includes("tests")) {
          const testDir = join(projectPath, "test");
          await mkdir(testDir, { recursive: true });
          
          // Create a sample test codeunit
          const testCodeunit = `codeunit ${idRange.from} "Test Sample"
{
    Subtype = Test;
    
    [Test]
    procedure TestSample()
    begin
        // Arrange
        
        // Act
        
        // Assert
        Assert.IsTrue(true, 'Sample test should pass');
    end;
    
    var
        Assert: Codeunit Assert;
}`;
          
          await writeFile(
            join(testDir, "TestSample.Codeunit.al"),
            testCodeunit,
            'utf8'
          );
        }
        
        // Create README.md
        const readmeContent = `# ${projectName}

Business Central extension project.

## Getting Started

1. Download symbols:
   \`\`\`
   Use the download-symbols tool
   \`\`\`

2. Build the project:
   \`\`\`
   Use the compile-app tool
   \`\`\`

3. Deploy to Business Central:
   \`\`\`
   Use the publish-app tool
   \`\`\`

## Features

- [ ] Feature 1
- [ ] Feature 2

## Requirements

- Business Central ${bcVersion} or later
- AL Language extension for VS Code

## Publisher

${publisher}`;
        
        await writeFile(
          join(projectPath, "README.md"),
          readmeContent,
          'utf8'
        );
        
        // Initialize git if requested
        let gitMessage = "";
        if (gitInit) {
          try {
            const { exec } = await import('child_process');
            const { promisify } = await import('util');
            const execAsync = promisify(exec);
            
            await execAsync('git init', { cwd: projectPath });
            await execAsync('git add .', { cwd: projectPath });
            await execAsync('git commit -m "Initial commit"', { cwd: projectPath });
            gitMessage = "\n✓ Git repository initialized";
          } catch (error) {
            gitMessage = "\n⚠ Git initialization failed (git might not be installed)";
          }
        }
        
        return {
          content: [{
            type: "text",
            text: `Successfully created Business Central project: ${projectName}

Project structure:
${projectPath}/
├── app.json
├── .vscode/
│   ├── launch.json
│   └── settings.json
├── src/
├── .alpackages/
${features.includes("tests") ? "├── test/\n│   └── TestSample.Codeunit.al\n" : ""}├── .gitignore
├── .editorconfig
└── README.md

Next steps:
1. Open the project in VS Code
2. Download symbols using 'AL: Download Symbols' or the download-symbols tool
3. Start developing your extension${gitMessage}`
          }]
        };
      } catch (error: any) {
        return {
          content: [{
            type: "text",
            text: `Failed to create project: ${error.message}`
          }],
          isError: true
        };
      }
    }
  );
}

function generateGuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function getMajorVersion(version: string): string {
  const major = parseInt(version.split('.')[0]);
  return `${major}.0`;
}