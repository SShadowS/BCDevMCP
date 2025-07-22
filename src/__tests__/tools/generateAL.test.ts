import { jest } from '@jest/globals';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// Mock fs/promises
const mockWriteFile = jest.fn();
const mockMkdir = jest.fn();

jest.unstable_mockModule('fs/promises', () => ({
  writeFile: mockWriteFile,
  mkdir: mockMkdir
}));

// Import after mocking
const { registerGenerateALTool } = await import('../../tools/generateAL.js');

describe('generateAL tool', () => {
  let server: McpServer;
  let registeredTool: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock server
    server = {
      registerTool: jest.fn((name, schema, handler) => {
        registeredTool = { name, schema, handler };
      })
    } as any;

    // Register the tool
    registerGenerateALTool(server);

    // Setup default mocks
    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
  });

  it('should register the generate-al tool', () => {
    expect(server.registerTool).toHaveBeenCalledWith(
      'generate-al',
      expect.objectContaining({
        title: 'Generate AL Code',
        description: expect.any(String),
        inputSchema: expect.any(Object)
      }),
      expect.any(Function)
    );
  });

  describe('table generation', () => {
    it('should generate a basic table', async () => {
      await registeredTool.handler({
        objectType: 'table',
        objectId: 50100,
        objectName: 'CustomerExtension',
        targetPath: 'C:\\Test\\CustomerExt.Table.al'
      });

      expect(mockMkdir).toHaveBeenCalledWith('C:\\Test', { recursive: true });
      
      const generatedCode = mockWriteFile.mock.calls[0][1] as string;
      expect(generatedCode).toContain('table 50100 "CustomerExtension"');
      expect(generatedCode).toContain('field(1; "Code"; Code[20])');
      expect(generatedCode).toContain('field(2; Description; Text[100])');
      expect(generatedCode).toContain('key(PK; "Code")');
      
    });

    it('should generate a table with custom fields', async () => {
      await registeredTool.handler({
        objectType: 'table',
        objectId: 50100,
        objectName: 'CustomerExtension',
        targetPath: 'C:\\Test\\CustomerExt.Table.al',
        fields: [
          { id: 10, name: 'Customer No.', dataType: 'Code', length: 20 },
          { id: 20, name: 'Credit Limit', dataType: 'Decimal' }
        ]
      });

      const generatedCode = mockWriteFile.mock.calls[0][1] as string;
      expect(generatedCode).toContain('field(10; "Customer No."; Code[20])');
      expect(generatedCode).toContain('field(20; "Credit Limit"; Decimal)');
    });
  });

  describe('page generation', () => {
    it('should generate a list page', async () => {
      await registeredTool.handler({
        objectType: 'page',
        objectId: 50100,
        objectName: 'CustomerExtension',
        targetPath: 'C:\\Test\\CustomerList.Page.al',
        template: 'list'
      });

      const generatedCode = mockWriteFile.mock.calls[0][1] as string;
      expect(generatedCode).toContain('page 50100 "CustomerExtension List"');
      expect(generatedCode).toContain('PageType = List');
      expect(generatedCode).toContain('repeater(Group)');
      expect(generatedCode).toContain('UsageCategory = Lists');
    });

    it('should generate a card page', async () => {
      await registeredTool.handler({
        objectType: 'page',
        objectId: 50100,
        objectName: 'CustomerExtension',
        targetPath: 'C:\\Test\\CustomerCard.Page.al',
        template: 'card'
      });

      const generatedCode = mockWriteFile.mock.calls[0][1] as string;
      expect(generatedCode).toContain('page 50100 "CustomerExtension Card"');
      expect(generatedCode).toContain('PageType = Card');
      expect(generatedCode).toContain('group(General)');
      expect(generatedCode).toContain('UsageCategory = Documents');
    });
  });

  describe('other object types', () => {
    it('should generate a codeunit', async () => {
      await registeredTool.handler({
        objectType: 'codeunit',
        objectId: 50100,
        objectName: 'CustomerMgmt',
        targetPath: 'C:\\Test\\CustomerMgmt.Codeunit.al'
      });

      const generatedCode = mockWriteFile.mock.calls[0][1] as string;
      expect(generatedCode).toContain('codeunit 50100 "CustomerMgmt"');
      expect(generatedCode).toContain('trigger OnRun()');
      expect(generatedCode).toContain('procedure MyProcedure()');
    });

    it('should generate an enum', async () => {
      await registeredTool.handler({
        objectType: 'enum',
        objectId: 50100,
        objectName: 'CustomerType',
        targetPath: 'C:\\Test\\CustomerType.Enum.al'
      });

      const generatedCode = mockWriteFile.mock.calls[0][1] as string;
      expect(generatedCode).toContain('enum 50100 "CustomerType"');
      expect(generatedCode).toContain('Extensible = true');
      expect(generatedCode).toContain('value(0; " ")');
    });

    it('should generate a report', async () => {
      await registeredTool.handler({
        objectType: 'report',
        objectId: 50100,
        objectName: 'CustomerList',
        targetPath: 'C:\\Test\\CustomerList.Report.al'
      });

      const generatedCode = mockWriteFile.mock.calls[0][1] as string;
      expect(generatedCode).toContain('report 50100 "CustomerList"');
      expect(generatedCode).toContain('UsageCategory = ReportsAndAnalysis');
      expect(generatedCode).toContain('dataset');
      expect(generatedCode).toContain('requestpage');
    });
  });

  describe('error handling', () => {
    it('should handle directory creation failure', async () => {
      mockMkdir.mockRejectedValue(new Error('Permission denied'));

      const result = await registeredTool.handler({
        objectType: 'table',
        objectId: 50100,
        objectName: 'Test',
        targetPath: 'C:\\Protected\\test.al'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Failed to generate AL code: Permission denied');
    });

    it('should handle file write failure', async () => {
      mockWriteFile.mockRejectedValue(new Error('Disk full'));

      const result = await registeredTool.handler({
        objectType: 'table',
        objectId: 50100,
        objectName: 'Test',
        targetPath: 'C:\\Test\\test.al'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Failed to generate AL code: Disk full');
    });
  });
});