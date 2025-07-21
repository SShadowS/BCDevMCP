# BCDevMCP

This is the repo for the Development MCP for Business Central written in Typescript.

It provides a set of tools and libraries to facilitate the development of Business Central extensions and applications.

Technologies used in this repository include:

- TypeScript
- Node.js
- .NET SDK
- Business Central Development Tools
- Typescript MCP SDK <https://github.com/modelcontextprotocol/typescript-sdk>

## Prerequisites

Before you can use the tools provided in this repository, you need to install the .NET SDK and the Business Central Development Tools. The following instructions will guide you through the installation process.

To install dotnet tools, run the following command:

```bash
# Install the .NET SDK version 9.0 or later.
winget install Microsoft.DotNet.SDK.9

# Optional: Install the .NET Desktop Runtime and ASP.NET Core Runtime if your project requires them.
# These are not strictly necessary for all projects, but they are commonly used.
winget install Microsoft.DotNet.DesktopRuntime.9
winget install Microsoft.DotNet.AspNetCore.9

# Add the NuGet source for the .NET SDK
# This is necessary to ensure that the SDK can access the required packages.
dotnet nuget add source https://api.nuget.org/v3/index.json --name nuget.org


# Install the Business Central Development Tools
# This command installs the latest pre-release version of the Business Central Development Tools globally.
dotnet tool install Microsoft.Dynamics.BusinessCentral.Development.Tools --interactive --prerelease --global
```
