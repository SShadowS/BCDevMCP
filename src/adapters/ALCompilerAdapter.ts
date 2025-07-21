import { exec } from "child_process";
import { promisify } from "util";
import { platform } from "os";

const execAsync = promisify(exec);
const isWindows = platform() === 'win32';

export interface CompilerInfo {
  command: 'al' | 'alc';
  version?: string;
  available: boolean;
}

export interface CompileOptions {
  projectPath: string;
  packageCachePath?: string;
  outputPath?: string;
  assemblyProbingPaths?: string[];
}

export interface CompileResult {
  success: boolean;
  output: string;
  errors?: string[];
}

export class ALCompilerAdapter {
  private static instance: ALCompilerAdapter;
  private compilerInfo: CompilerInfo | null = null;
  private execOptions = isWindows ? { shell: 'cmd.exe' } : {};

  private constructor() {}

  static getInstance(): ALCompilerAdapter {
    if (!ALCompilerAdapter.instance) {
      ALCompilerAdapter.instance = new ALCompilerAdapter();
    }
    return ALCompilerAdapter.instance;
  }

  async initialize(): Promise<void> {
    this.compilerInfo = await this.detectCompiler();
  }

  getCompilerInfo(): CompilerInfo | null {
    return this.compilerInfo;
  }

  private async detectCompiler(): Promise<CompilerInfo> {
    // Try new 'al' command first
    try {
      await execAsync("al --help", this.execOptions);
      const version = await this.getCompilerVersion('al');
      return { command: 'al', version, available: true };
    } catch (error: any) {
      // AL --help returns exit code 1 but still outputs help text
      if (error.stderr && error.stderr.includes('altool')) {
        const version = await this.getCompilerVersion('al');
        return { command: 'al', version, available: true };
      }
    }

    // Fall back to old 'alc' command
    try {
      await execAsync("alc /?", this.execOptions);
      const version = await this.getCompilerVersion('alc');
      return { command: 'alc', version, available: true };
    } catch (error: any) {
      return { command: 'al', available: false };
    }
  }

  private async getCompilerVersion(command: 'al' | 'alc'): Promise<string | undefined> {
    try {
      const versionCmd = command === 'al' ? 'al --version' : 'alc /?';
      const { stdout, stderr } = await execAsync(versionCmd, this.execOptions);
      const output = stdout || stderr;
      
      // Extract version from output
      const versionMatch = output.match(/(\d+\.\d+\.\d+\.\d+)/);
      return versionMatch ? versionMatch[1] : undefined;
    } catch {
      return undefined;
    }
  }

  async compile(options: CompileOptions): Promise<CompileResult> {
    if (!this.compilerInfo || !this.compilerInfo.available) {
      return {
        success: false,
        output: "AL compiler is not available. Please install it via AL Language extension or Business Central Development Tools.",
        errors: ["AL compiler not found"]
      };
    }

    const args = this.buildCompilerArgs(options);
    const command = `${this.compilerInfo.command} compile ${args.join(" ")}`;

    try {
      console.log(`Executing: ${command}`);
      const { stdout, stderr } = await execAsync(command, this.execOptions);
      
      // AL compiler often outputs to stderr even for successful compilations
      const output = stdout || stderr || "Compilation completed (no output)";
      
      return {
        success: true,
        output
      };
    } catch (error: any) {
      // Check if it's a compilation error vs a system error
      if (error.code === 'ENOENT') {
        return {
          success: false,
          output: "AL compiler not found in PATH.",
          errors: ["Compiler executable not found"]
        };
      }
      
      // AL compiler returns non-zero exit code for compilation errors
      const errorOutput = error.stderr || error.stdout || error.message;
      
      return {
        success: false,
        output: errorOutput,
        errors: this.parseCompilationErrors(errorOutput)
      };
    }
  }

  private buildCompilerArgs(options: CompileOptions): string[] {
    const args: string[] = [`/project:"${options.projectPath}"`];
    
    if (options.packageCachePath) {
      args.push(`/packagecachepath:"${options.packageCachePath}"`);
    }
    
    if (options.outputPath) {
      args.push(`/out:"${options.outputPath}"`);
    }
    
    if (options.assemblyProbingPaths && options.assemblyProbingPaths.length > 0) {
      args.push(`/assemblyprobingpaths:"${options.assemblyProbingPaths.join(";")}"`);
    }

    return args;
  }

  private parseCompilationErrors(output: string): string[] {
    // Simple error parsing - can be enhanced based on AL compiler output format
    const errors: string[] = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      if (line.includes('error') || line.includes('Error')) {
        errors.push(line.trim());
      }
    }
    
    return errors.length > 0 ? errors : [output];
  }
}