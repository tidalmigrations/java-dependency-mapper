import * as fs from 'fs';
import * as readline from 'readline';
import * as path from 'path';

// Interface for dependency data in JSONL
interface DependencyRecord {
    appSetName: string;
    applicationName: string;
    artifactFileName: string;
    artifactId: string;
    artifactGroup: string;
    artifactVersion: string;
    sourceClass: string;
    sourceMethod: string;
    targetClass: string;
    targetMethod: string;
}

interface PackageInfo {
    name: string;
    classes: Set<string>;
    isExternal: boolean;
}

class PackageDependencyExtractor {
    private packageMap: Map<string, PackageInfo> = new Map();
    private dependencyMap: Map<string, Set<string>> = new Map();
    private artifactMap: Map<string, Set<string>> = new Map();
    private basePackageDependencyMap: Map<string, Set<string>> = new Map();

    async parseJsonlFile(filePath: string): Promise<void> {
        const fileStream = fs.createReadStream(filePath);
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });

        for await (const line of rl) {
            if (line.trim()) {
                try {
                    const record: DependencyRecord = JSON.parse(line);
                    this.processRecord(record);
                } catch (error) {
                    console.error(`Error parsing line: ${line}`, error);
                }
            }
        }

        // After processing all records, build base package dependency map
        this.buildBasePackageDependencies();
    }

    private processRecord(record: DependencyRecord): void {
        // Extract packages from source and target classes
        const sourceClass = record.sourceClass;
        const targetClass = record.targetClass;
        
        // Process source class package
        const sourcePackage = this.getPackageName(sourceClass);
        const sourceClassName = this.getClassName(sourceClass);
        this.addPackage(sourcePackage, sourceClassName, false);
        
        // Process target class package
        const targetPackage = this.getPackageName(targetClass);
        const targetClassName = this.getClassName(targetClass);
        // Mark as external if it's not from the project's group
        const isExternal = !targetClass.startsWith(record.artifactGroup);
        this.addPackage(targetPackage, targetClassName, isExternal);
        
        // Track dependencies between packages
        if (sourcePackage !== targetPackage) {
            if (!this.dependencyMap.has(sourcePackage)) {
                this.dependencyMap.set(sourcePackage, new Set());
            }
            this.dependencyMap.get(sourcePackage)!.add(targetPackage);
        }
        
        // Track artifact packages
        if (!this.artifactMap.has(record.artifactId)) {
            this.artifactMap.set(record.artifactId, new Set());
        }
        this.artifactMap.get(record.artifactId)!.add(sourcePackage);
        this.artifactMap.get(record.artifactId)!.add(targetPackage);
    }

    private getPackageName(className: string): string {
        // Handle Java array type signature with [L prefix and ; suffix
        let processedName = className;
        if (className.startsWith("[L") && className.endsWith(";")) {
            processedName = className.substring(2, className.length - 1);
        }
        
        const lastDotIndex = processedName.lastIndexOf('.');
        return lastDotIndex > 0 ? processedName.substring(0, lastDotIndex) : '';
    }
    
    private getClassName(className: string): string {
        // Handle Java array type signature with [L prefix and ; suffix
        let processedName = className;
        if (className.startsWith("[L") && className.endsWith(";")) {
            processedName = className.substring(2, className.length - 1);
        }
        
        const lastDotIndex = processedName.lastIndexOf('.');
        return lastDotIndex > 0 ? processedName.substring(lastDotIndex + 1) : processedName;
    }

    private addPackage(packageName: string, className: string, isExternal: boolean): void {
        if (!this.packageMap.has(packageName)) {
            this.packageMap.set(packageName, {
                name: packageName,
                classes: new Set(),
                isExternal
            });
        }
        this.packageMap.get(packageName)!.classes.add(className);
    }

    // Get base packages (first two or three segments of package name)
    private getBasePackages(): Map<string, Set<string>> {
        const basePackages = new Map<string, Set<string>>();
        
        this.packageMap.forEach((info, packageName) => {
            // Split package name by dots
            const segments = packageName.split('.');
            
            // For known external dependencies like java.*, use the first two segments
            // For project dependencies, extract base package (first two or three segments)
            let basePackage = '';
            if (segments.length >= 2) {
                if (["java", "javax", "org", "com", "net"].includes(segments[0])) {
                    basePackage = segments.slice(0, 2).join('.');
                } else {
                    // Use up to three segments for non-standard packages
                    basePackage = segments.slice(0, Math.min(3, segments.length)).join('.');
                }
                
                if (!basePackages.has(basePackage)) {
                    basePackages.set(basePackage, new Set());
                }
                basePackages.get(basePackage)!.add(packageName);
            }
        });
        
        return basePackages;
    }

    // Build dependencies between base packages
    private buildBasePackageDependencies(): void {
        const basePackages = this.getBasePackages();
        const packageToBaseMap = new Map<string, string>();
        
        // Build a map from full package to base package
        basePackages.forEach((subPackages, basePackage) => {
            subPackages.forEach(subPackage => {
                packageToBaseMap.set(subPackage, basePackage);
            });
        });
        
        // Now build dependencies between base packages
        this.dependencyMap.forEach((targetPackages, sourcePackage) => {
            const sourceBasePackage = packageToBaseMap.get(sourcePackage);
            
            if (sourceBasePackage) {
                if (!this.basePackageDependencyMap.has(sourceBasePackage)) {
                    this.basePackageDependencyMap.set(sourceBasePackage, new Set());
                }
                
                targetPackages.forEach(targetPackage => {
                    const targetBasePackage = packageToBaseMap.get(targetPackage);
                    
                    if (targetBasePackage && sourceBasePackage !== targetBasePackage) {
                        this.basePackageDependencyMap.get(sourceBasePackage)!.add(targetBasePackage);
                    }
                });
            }
        });
    }

    generateMarkdownOutput(outputFile: string): void {
        const basePackages = this.getBasePackages();
        const sortedBasePackages = Array.from(basePackages.keys()).sort();
        
        let markdownContent = '# Project Package Dependencies\n\n';
        markdownContent += 'This document lists all base packages that the project depends on.\n\n';
        
        // List all base packages
        markdownContent += '## Base Packages\n\n';
        
        // Group packages by their type (external vs internal)
        const externalPackages: string[] = [];
        const internalPackages: string[] = [];
        
        sortedBasePackages.forEach(basePackage => {
            const isExternal = Array.from(basePackages.get(basePackage)!).some(
                pkg => this.packageMap.get(pkg)?.isExternal
            );
            
            if (isExternal) {
                externalPackages.push(basePackage);
            } else {
                internalPackages.push(basePackage);
            }
        });
        
        // External dependencies section
        if (externalPackages.length > 0) {
            markdownContent += '### External Dependencies\n\n';
            externalPackages.forEach(pkg => {
                markdownContent += `- \`${pkg}\`\n`;
            });
            markdownContent += '\n';
        }
        
        // Internal dependencies section
        if (internalPackages.length > 0) {
            markdownContent += '### Internal Packages\n\n';
            internalPackages.forEach(pkg => {
                markdownContent += `- \`${pkg}\`\n`;
            });
            markdownContent += '\n';
        }

        // Add dependency relationships section
        markdownContent += '## Dependency Relationships\n\n';
        
        const sortedBasePackageDependencies = Array.from(this.basePackageDependencyMap.entries())
            .sort((a, b) => a[0].localeCompare(b[0]));
            
        if (sortedBasePackageDependencies.length === 0) {
            markdownContent += '*No dependencies between base packages found.*\n\n';
        } else {
            sortedBasePackageDependencies.forEach(([source, targets]) => {
                markdownContent += `- \`${source}\` depends on:\n`;
                const sortedTargets = Array.from(targets).sort();
                sortedTargets.forEach(target => {
                    markdownContent += `  - \`${target}\`\n`;
                });
                markdownContent += '\n';
            });
        }
        
        // Add package details
        markdownContent += '## Package Details\n\n';
        sortedBasePackages.forEach(basePackage => {
            // Count total classes in this base package
            let totalClasses = 0;
            basePackages.get(basePackage)!.forEach(pkg => {
                totalClasses += this.packageMap.get(pkg)!.classes.size;
            });
            
            markdownContent += `### \`${basePackage}\`\n\n`;
            markdownContent += `- **Type**: ${externalPackages.includes(basePackage) ? 'External Dependency' : 'Internal Package'}\n`;
            markdownContent += `- **Sub-packages**: ${basePackages.get(basePackage)!.size}\n`;
            markdownContent += `- **Classes**: ${totalClasses}\n`;
            
            // Add dependencies for this base package
            if (this.basePackageDependencyMap.has(basePackage)) {
                const dependencies = this.basePackageDependencyMap.get(basePackage)!;
                markdownContent += `- **Dependencies**: ${dependencies.size > 0 ? Array.from(dependencies).map(dep => `\`${dep}\``).join(', ') : 'None'}\n`;
            } else {
                markdownContent += `- **Dependencies**: None\n`;
            }
            markdownContent += '\n';
            
            // List sub-packages
            if (basePackages.get(basePackage)!.size > 0) {
                markdownContent += 'Includes these sub-packages:\n\n';
                const sortedSubPackages = Array.from(basePackages.get(basePackage)!).sort();
                sortedSubPackages.forEach(subPackage => {
                    markdownContent += `- \`${subPackage}\`\n`;
                });
                markdownContent += '\n';
            }
        });
        
        fs.writeFileSync(outputFile, markdownContent);
        console.log(`Markdown output written to ${outputFile}`);
    }
}

async function main() {
    // Define usage information
    const usage = `Usage: ts-node package-dependencies.ts <jsonl-file-path> [options]

Options:
  --output, -o <file>  Specify output file path (default: package-dependencies.md)
  --help, -h           Display this help information
`;
    
    // Parse command line arguments
    const args = process.argv.slice(2);
    
    // Check for help flag first
    if (args.includes('--help') || args.includes('-h')) {
        console.log(usage);
        process.exit(0);
    }
    
    // Check command line arguments
    if (args.length < 1) {
        console.error('Error: Missing input file path');
        console.error(usage);
        process.exit(1);
    }

    // Parse command line arguments
    let jsonlFilePath = '';
    let outputFilePath = 'package-dependencies.md'; // Default output path
    
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--output' || args[i] === '-o') {
            if (i + 1 < args.length) {
                outputFilePath = args[i + 1];
                i++; // Skip the next argument as we've already processed it
            } else {
                console.error('Error: Missing value for --output parameter');
                console.error(usage);
                process.exit(1);
            }
        } else if (!jsonlFilePath) {
            // The first non-flag argument is the input file
            jsonlFilePath = args[i];
        }
    }
    
    // Validate input file path
    if (!jsonlFilePath) {
        console.error('Error: Missing input file path');
        console.error(usage);
        process.exit(1);
    }
    
    try {
        if (!fs.existsSync(jsonlFilePath)) {
            console.error(`Error: Input file '${jsonlFilePath}' does not exist`);
            process.exit(1);
        }
    } catch (error) {
        console.error(`Error checking input file: ${error}`);
        process.exit(1);
    }
    
    // Create output directory if it doesn't exist
    const outputDir = path.dirname(outputFilePath);
    if (outputDir !== '.' && outputDir !== '') {
        try {
            fs.mkdirSync(outputDir, { recursive: true });
        } catch (error) {
            console.error(`Error creating output directory '${outputDir}': ${error}`);
            process.exit(1);
        }
    }
    
    const extractor = new PackageDependencyExtractor();
    
    console.log(`Parsing dependencies from ${jsonlFilePath}...`);
    await extractor.parseJsonlFile(jsonlFilePath);
    
    console.log(`Generating Markdown output to ${outputFilePath}...`);
    extractor.generateMarkdownOutput(outputFilePath);
}

main().catch(error => console.error('Error:', error)); 