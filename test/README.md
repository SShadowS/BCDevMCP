# Test AL Project

This directory contains a sample AL project designed to test the MCP compile-app tool.

## Structure

- `SampleALProject/` - Self-contained AL project with intentional warnings
  - `app.json` - Project manifest
  - `src/CustomerExt.al` - Table and page definitions with warnings
  - `src/WarningCodeunit.al` - Codeunit with various warning patterns
  - `src/TestCustomerList.al` - List page with unused variables

## Features

This is a completely self-contained AL project that:
- Does not depend on any external symbols (Base Application, System Application, etc.)
- Defines its own table, pages, and codeunit
- Can be compiled standalone without any symbol dependencies

## Expected Warnings

The sample project intentionally contains:
- Unused variables (global and local)
- Unused procedure parameters
- Unreachable code after exit statements
- Missing explicit return values
- Suboptimal DataClassification (ToBeClassified)
- Obsolete field declarations
- Empty procedures and triggers
- Variables with same name in different scopes
- Inefficient code patterns

## Running Tests

From the root directory:
```bash
npm run build
node test-compile.js
```

## Using Your Own AL Project

To test with your own AL project:

1. Copy your project to the `test` directory
2. Update `test-compile.js` to point to your project path
3. Run the test script

Or use the compile tool directly through the MCP protocol with your project path.