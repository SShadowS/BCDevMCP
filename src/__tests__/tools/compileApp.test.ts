import { jest } from '@jest/globals';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerCompileAppTool } from '../../tools/compileApp.js';

// Create mock ALCompilerAdapter
const mockGetInstance = jest.fn();
const mockGetCompilerInfo = jest.fn();
const mockCompile = jest.fn<any>();

// Mock the module before importing
jest.mock('../../adapters/ALCompilerAdapter.js', () => ({
  ALCompilerAdapter: {
    getInstance: mockGetInstance
  }
}));

describe('compileApp tool', () => {
  let server: McpServer;
  let registeredTool: any;
  let mockAdapter: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock adapter instance
    mockAdapter = {
      getCompilerInfo: mockGetCompilerInfo,
      compile: mockCompile,
      initialize: jest.fn()
    };

    // Set up getInstance to return mock adapter
    mockGetInstance.mockReturnValue(mockAdapter);

    // Create mock server
    server = {
      registerTool: jest.fn((name, schema, handler) => {
        registeredTool = { name, schema, handler };
      })
    } as any;

    // Register the tool
    registerCompileAppTool(server);
  });

  it('should register the compile-app tool', () => {
    expect(server.registerTool).toHaveBeenCalledWith(
      'compile-app',
      expect.objectContaining({
        title: 'Compile Business Central App',
        description: expect.any(String),
        inputSchema: expect.any(Object)
      }),
      expect.any(Function)
    );
  });

  it('should handle successful compilation', async () => {
    // Setup mock responses
    mockGetCompilerInfo.mockReturnValue({
      command: 'al',
      version: '16.0.0.0',
      available: true
    });

    mockCompile.mockResolvedValue({
      success: true,
      output: 'Compilation successful\nApp compiled: MyApp.app'
    });

    // Call the tool handler
    const result = await registeredTool.handler({
      projectPath: 'C:\\TestProject',
      packageCachePath: 'C:\\TestProject\\.alpackages'
    });

    expect(mockCompile).toHaveBeenCalledWith({
      projectPath: 'C:\\TestProject',
      packageCachePath: 'C:\\TestProject\\.alpackages'
    });

    expect(result).toEqual({
      content: [{
        type: 'text',
        text: 'Compilation result:\n\nCompilation successful\nApp compiled: MyApp.app'
      }],
      isError: false
    });
  });

  it('should handle compilation failure', async () => {
    // Setup mock responses
    mockGetCompilerInfo.mockReturnValue({
      command: 'al',
      version: '16.0.0.0',
      available: true
    });

    mockCompile.mockResolvedValue({
      success: false,
      output: 'Error AL0001: Syntax error in line 10',
      errors: ['Error AL0001: Syntax error in line 10']
    });

    // Call the tool handler
    const result = await registeredTool.handler({
      projectPath: 'C:\\TestProject'
    });

    expect(result).toEqual({
      content: [{
        type: 'text',
        text: 'Compilation failed:\n\nError AL0001: Syntax error in line 10'
      }],
      isError: true
    });
  });

  it('should handle missing compiler', async () => {
    // Setup mock responses
    mockGetCompilerInfo.mockReturnValue({
      command: 'al',
      available: false
    });

    // Call the tool handler
    const result = await registeredTool.handler({
      projectPath: 'C:\\TestProject'
    });

    expect(mockCompile).not.toHaveBeenCalled();

    expect(result).toEqual({
      content: [{
        type: 'text',
        text: expect.stringContaining('AL compiler is not available')
      }],
      isError: true
    });
  });

  it('should pass all optional parameters', async () => {
    // Setup mock responses
    mockGetCompilerInfo.mockReturnValue({
      command: 'al',
      version: '16.0.0.0',
      available: true
    });

    mockCompile.mockResolvedValue({
      success: true,
      output: 'Success'
    });

    // Call the tool handler with all parameters
    await registeredTool.handler({
      projectPath: 'C:\\TestProject',
      packageCachePath: 'C:\\Cache',
      outputPath: 'C:\\Output\\app.app',
      assemblyProbingPaths: ['C:\\Path1', 'C:\\Path2']
    });

    expect(mockCompile).toHaveBeenCalledWith({
      projectPath: 'C:\\TestProject',
      packageCachePath: 'C:\\Cache',
      outputPath: 'C:\\Output\\app.app',
      assemblyProbingPaths: ['C:\\Path1', 'C:\\Path2']
    });
  });
});