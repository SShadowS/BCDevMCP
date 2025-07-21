import { jest } from '@jest/globals';
import { ALCompilerAdapter, type CompileOptions } from '../../adapters/ALCompilerAdapter.js';
import { exec } from 'child_process';

// Mock the child_process module
jest.mock('child_process');
jest.mock('util', () => ({
  promisify: jest.fn((fn: any) => fn)
}));

describe('ALCompilerAdapter', () => {
  let adapter: ALCompilerAdapter;
  const mockExec = exec as jest.MockedFunction<typeof exec>;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton instance
    (ALCompilerAdapter as any).instance = null;
    adapter = ALCompilerAdapter.getInstance();
  });

  describe('getInstance', () => {
    it('should return the same instance', () => {
      const instance1 = ALCompilerAdapter.getInstance();
      const instance2 = ALCompilerAdapter.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('initialize', () => {
    it('should detect new al command successfully', async () => {
      mockExec.mockImplementation(((cmd: any, _options: any, callback?: any) => {
        const cb = callback || ((_err: any, _stdout: any, _stderr: any) => {});
        if (cmd === 'al --help') {
          cb(null, '', 'altool 16.0.24.41895+8ca5e024903f96b95762a8be66610c4bcb25a4d7');
        } else if (cmd === 'al --version') {
          cb(null, '16.0.24.41895', '');
        }
        return {} as any;
      }) as any);

      await adapter.initialize();
      const info = adapter.getCompilerInfo();
      
      expect(info).toEqual({
        command: 'al',
        version: '16.0.24.41895',
        available: true
      });
    });

    it('should fall back to alc command when al is not available', async () => {
      mockExec.mockImplementation(((cmd: any, _options: any, callback?: any) => {
        const cb = callback || ((_err: any, _stdout: any, _stderr: any) => {});
        if (cmd === 'al --help') {
          cb(new Error('Command not found'), '', '');
        } else if (cmd === 'alc /?') {
          cb(null, 'AL Compiler version 15.0.0.0', '');
        }
        return {} as any;
      }) as any);

      await adapter.initialize();
      const info = adapter.getCompilerInfo();
      
      expect(info).toEqual({
        command: 'alc',
        version: '15.0.0.0',
        available: true
      });
    });

    it('should handle no compiler available', async () => {
      mockExec.mockImplementation(((_cmd: any, _options: any, callback?: any) => {
        const cb = callback || ((_err: any, _stdout: any, _stderr: any) => {});
        cb(new Error('Command not found'), '', '');
        return {} as any;
      }) as any);

      await adapter.initialize();
      const info = adapter.getCompilerInfo();
      
      expect(info).toEqual({
        command: 'al',
        available: false
      });
    });
  });

  describe('compile', () => {
    beforeEach(async () => {
      // Initialize with a working compiler
      mockExec.mockImplementation(((cmd: any, _options: any, callback?: any) => {
        const cb = callback || ((_err: any, _stdout: any, _stderr: any) => {});
        if (cmd === 'al --help') {
          cb(null, '', 'altool 16.0.24.41895');
        } else if (cmd === 'al --version') {
          cb(null, '16.0.24.41895', '');
        }
        return {} as any;
      }) as any);
      await adapter.initialize();
    });

    it('should compile successfully', async () => {
      const options: CompileOptions = {
        projectPath: 'C:\\TestProject',
        packageCachePath: 'C:\\TestProject\\.alpackages',
        outputPath: 'C:\\TestProject\\output.app',
        assemblyProbingPaths: ['C:\\Assemblies']
      };

      mockExec.mockImplementation(((cmd: any, _options: any, callback?: any) => {
        const cb = callback || ((_err: any, _stdout: any, _stderr: any) => {});
        if (cmd.includes('compile')) {
          cb(null, 'Compilation successful', '');
        } else {
          cb(null, '', 'altool 16.0.24.41895');
        }
        return {} as any;
      }) as any);

      const result = await adapter.compile(options);
      
      expect(result.success).toBe(true);
      expect(result.output).toContain('Compilation successful');
      expect(result.errors).toBeUndefined();
    });

    it('should handle compilation errors', async () => {
      const options: CompileOptions = {
        projectPath: 'C:\\TestProject'
      };

      mockExec.mockImplementation(((cmd: any, _options: any, callback?: any) => {
        const cb = callback || ((_err: any, _stdout: any, _stderr: any) => {});
        if (cmd.includes('compile')) {
          const error = new Error('Compilation failed');
          (error as any).stderr = 'Error: Syntax error in line 10';
          cb(error, '', 'Error: Syntax error in line 10');
        } else {
          cb(null, '', 'altool 16.0.24.41895');
        }
        return {} as any;
      }) as any);

      const result = await adapter.compile(options);
      
      expect(result.success).toBe(false);
      expect(result.output).toContain('Error: Syntax error in line 10');
      expect(result.errors).toContain('Error: Syntax error in line 10');
    });

    it('should handle missing compiler', async () => {
      // Reset and initialize without compiler
      (ALCompilerAdapter as any).instance = null;
      adapter = ALCompilerAdapter.getInstance();
      
      mockExec.mockImplementation(((_cmd: any, _options: any, callback?: any) => {
        const cb = callback || ((_err: any, _stdout: any, _stderr: any) => {});
        cb(new Error('Command not found'), '', '');
        return {} as any;
      }) as any);
      
      await adapter.initialize();

      const options: CompileOptions = {
        projectPath: 'C:\\TestProject'
      };

      const result = await adapter.compile(options);
      
      expect(result.success).toBe(false);
      expect(result.output).toContain('AL compiler is not available');
      expect(result.errors).toContain('AL compiler not found');
    });

    it('should build correct command arguments', async () => {
      const options: CompileOptions = {
        projectPath: 'C:\\Test Project', // with space
        packageCachePath: 'C:\\Test\\.alpackages',
        outputPath: 'C:\\Output\\test.app',
        assemblyProbingPaths: ['C:\\Path1', 'C:\\Path2']
      };

      let capturedCommand = '';
      mockExec.mockImplementation(((cmd: any, _options: any, callback?: any) => {
        const cb = callback || ((_err: any, _stdout: any, _stderr: any) => {});
        if (cmd.includes('compile')) {
          capturedCommand = cmd;
          cb(null, 'Success', '');
        } else {
          cb(null, '', 'altool 16.0.24.41895');
        }
        return {} as any;
      }) as any);

      await adapter.compile(options);
      
      expect(capturedCommand).toContain('/project:"C:\\Test Project"');
      expect(capturedCommand).toContain('/packagecachepath:"C:\\Test\\.alpackages"');
      expect(capturedCommand).toContain('/out:"C:\\Output\\test.app"');
      expect(capturedCommand).toContain('/assemblyprobingpaths:"C:\\Path1;C:\\Path2"');
    });
  });
});