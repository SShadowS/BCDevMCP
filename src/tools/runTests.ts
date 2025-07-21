import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { exec } from "child_process";
import { promisify } from "util";
import { platform } from "os";

const execAsync = promisify(exec);
const isWindows = platform() === 'win32';

const runTestsSchema = {
  testSuite: z.enum(["All", "Codeunit", "Specific"]).optional().describe("Test suite to run (default: All)"),
  codeunitId: z.number().optional().describe("Specific codeunit ID to test (when testSuite is Specific)"),
  codeunitName: z.string().optional().describe("Specific codeunit name to test"),
  containerName: z.string().optional().describe("Docker container name (for containerized BC)"),
  serverInstance: z.string().optional().describe("Server instance name (for on-premises)"),
  tenant: z.string().optional().describe("Tenant ID (default: default)"),
  companyName: z.string().optional().describe("Company name for test execution"),
  testRunnerCodeunit: z.number().optional().describe("Test runner codeunit ID (default: 130400)"),
  outputFormat: z.enum(["Console", "JUnit", "TRX"]).optional().describe("Output format for test results")
};

export function registerRunTestsTool(server: McpServer): void {
  server.registerTool(
    "run-tests",
    {
      title: "Run AL Tests",
      description: "Execute AL tests in a Business Central environment",
      inputSchema: runTestsSchema
    },
    async ({ 
      testSuite = "All",
      codeunitId,
      codeunitName,
      containerName,
      serverInstance = "BC",
      tenant = "default",
      companyName,
      testRunnerCodeunit = 130400,
      outputFormat = "Console"
    }) => {
      try {
        const execOptions = isWindows ? { shell: 'powershell.exe' } : {};
        
        // Build PowerShell command for running tests
        let psCommand = `
$ErrorActionPreference = "Stop"
try {
    # Check if we're using containers or on-premises
    if ("${containerName}") {
        # Container-based test execution
        $bcContainerHelper = Get-Module -ListAvailable -Name 'BcContainerHelper' | Select-Object -First 1
        if (-not $bcContainerHelper) {
            throw "BC Container Helper not found. Install it with: Install-Module BcContainerHelper -Force"
        }
        
        Import-Module BcContainerHelper
        
        # Build test parameters
        $testParams = @{
            containerName = "${containerName}"
            tenant = "${tenant}"
        }
        
        if ("${companyName}") {
            $testParams.companyName = "${companyName}"
        }
        
        if ("${testSuite}" -eq "Specific" -and ${codeunitId}) {
            # Run specific codeunit
            $results = Run-TestsInBcContainer @testParams -testCodeunit ${codeunitId}
        } elseif ("${testSuite}" -eq "Codeunit") {
            # Run all test codeunits
            $results = Run-TestsInBcContainer @testParams -testSuite "DEFAULT"
        } else {
            # Run all tests
            $results = Run-TestsInBcContainer @testParams
        }
        
        # Format output
        Write-Host "Test Results:"
        Write-Host "============="
        foreach ($result in $results) {
            $status = if ($result.Result -eq "Passed") { "✓" } else { "✗" }
            Write-Host "$status $($result.CodeunitName)::$($result.MethodName) - $($result.Result)"
            if ($result.ErrorMessage) {
                Write-Host "  Error: $($result.ErrorMessage)"
            }
        }
        
        # Summary
        $passed = ($results | Where-Object { $_.Result -eq "Passed" }).Count
        $failed = ($results | Where-Object { $_.Result -eq "Failed" }).Count
        $skipped = ($results | Where-Object { $_.Result -eq "Skipped" }).Count
        
        Write-Host ""
        Write-Host "Summary: $passed passed, $failed failed, $skipped skipped"
        
    } else {
        # On-premises test execution using PowerShell cmdlets
        $module = Get-Module -ListAvailable -Name 'Microsoft.Dynamics.Nav.Management' | Select-Object -First 1
        if (-not $module) {
            throw "BC Management module not found. This is required for on-premises test execution."
        }
        
        Import-Module $module.Path
        
        # Build test parameters
        $testParams = @{
            ServerInstance = "${serverInstance}"
            Tenant = "${tenant}"
        }
        
        if ("${companyName}") {
            $testParams.CompanyName = "${companyName}"
        }
        
        # Determine which tests to run
        if ("${testSuite}" -eq "Specific") {
            if (${codeunitId}) {
                $testParams.CodeunitId = ${codeunitId}
            } elseif ("${codeunitName}") {
                # Find codeunit by name
                $codeunits = Get-NAVAppTestCodeunit @testParams
                $targetCodeunit = $codeunits | Where-Object { $_.Name -like "*${codeunitName}*" } | Select-Object -First 1
                if ($targetCodeunit) {
                    $testParams.CodeunitId = $targetCodeunit.Id
                } else {
                    throw "Codeunit with name '${codeunitName}' not found"
                }
            }
        } elseif ("${testSuite}" -eq "Codeunit") {
            $testParams.TestSuite = "DEFAULT"
        }
        
        # Run tests
        $results = Invoke-NAVAppTest @testParams -TestRunnerCodeunitId ${testRunnerCodeunit}
        
        # Format output
        Write-Host "Test Results:"
        Write-Host "============="
        foreach ($result in $results) {
            $status = if ($result.Result -eq 0) { "✓" } else { "✗" }
            $resultText = if ($result.Result -eq 0) { "Passed" } else { "Failed" }
            Write-Host "$status $($result.CodeunitName)::$($result.TestName) - $resultText"
            if ($result.ErrorMessage) {
                Write-Host "  Error: $($result.ErrorMessage)"
            }
        }
        
        # Summary
        $passed = ($results | Where-Object { $_.Result -eq 0 }).Count
        $failed = ($results | Where-Object { $_.Result -ne 0 }).Count
        
        Write-Host ""
        Write-Host "Summary: $passed passed, $failed failed"
    }
    
    # Export results if requested
    if ("${outputFormat}" -eq "JUnit") {
        # Convert to JUnit XML format
        $xml = @"
<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
    <testsuite name="AL Tests" tests="$($results.Count)" failures="$failed">
"@
        foreach ($result in $results) {
            $testcase = if ($result.Result -eq 0 -or $result.Result -eq "Passed") {
                "        <testcase classname='$($result.CodeunitName)' name='$($result.TestName -replace "'","")' />"
            } else {
                "        <testcase classname='$($result.CodeunitName)' name='$($result.TestName -replace "'","")'>
            <failure message='$($result.ErrorMessage -replace "'","")' />
        </testcase>"
            }
            $xml += "\`n$testcase"
        }
        $xml += "\`n    </testsuite>\`n</testsuites>"
        $xml | Out-File "test-results.xml"
        Write-Host ""
        Write-Host "JUnit results exported to: test-results.xml"
    }
    
} catch {
    Write-Error $_.Exception.Message
    exit 1
}
        `.trim();

        console.log("Running AL tests...");
        const { stdout, stderr } = await execAsync(psCommand, execOptions);
        
        const output = stdout || stderr || "Test execution completed";
        
        return {
          content: [{
            type: "text",
            text: `Test execution result:\n\n${output}`
          }]
        };
      } catch (error: any) {
        const errorMessage = error.stderr || error.stdout || error.message;
        
        return {
          content: [{
            type: "text",
            text: `Test execution failed:\n\n${errorMessage}\n\nNote: Test execution requires either:\n1. BC Container Helper (for Docker environments)\n2. BC Management PowerShell module (for on-premises)\n\nMake sure your BC environment is running and accessible.`
          }],
          isError: true
        };
      }
    }
  );
}