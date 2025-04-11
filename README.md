# Java Dependency Mapper

A tool for analyzing Java dependencies from extracted EAR files.

## Overview

This tool parses JSONL files containing dependency information extracted from Java EAR/JAR/WAR files. It helps visualize and analyze dependencies between classes and artifacts.

The input JSONL files are typically generated from Jarviz-lib static analysis of Java applications. Jarviz-lib analyzes the bytecode of Java applications and extracts method-level dependencies between classes.

## Features

- Parse JSONL files with Java dependency information
- Build a dependency graph of classes and artifacts
- Find cycles in the dependency graph
- Generate statistics about dependencies
- View the most depended-upon classes
- Extract and analyze package dependencies

## Installation

1. Make sure you have Node.js installed (v14+ recommended)
2. Clone this repository
3. Install dependencies:

```bash
npm install
```

## Usage

### Dependency Mapper

Run the tool with a path to your JSONL file:

```bash
npm start -- path/to/your/dependencies.jsonl
```

### Package Dependencies Extractor

The package dependencies extractor tool generates a Markdown report of all base packages that a project depends on:

```bash
npx ts-node package-dependencies.ts <jsonl-file-path> [--output <output-file-path>]
```

Where:
- `<jsonl-file-path>` is the path to the JSONL file containing dependency data (required)
- `--output` or `-o` followed by path where the Markdown output will be written (optional, defaults to `package-dependencies.md`)

Example usage:
```bash
# Basic usage with default output file
npx ts-node package-dependencies.ts sample-dependencies.jsonl

# Specify custom output file
npx ts-node package-dependencies.ts sample-dependencies.jsonl --output reports/packages.md

# Using shorthand parameter
npx ts-node package-dependencies.ts sample-dependencies.jsonl -o custom-output.md
```

## Development

### Running Tests

The project includes unit tests for the package dependencies extractor. To run the tests:

```bash
npm test
```

This will execute all Jest tests in the `tests` directory.

To run tests with coverage reports:

```bash
npm run test:coverage
```

This will generate a detailed coverage report showing which parts of the code are covered by tests.

### Input Data

This tool is designed to work with JSONL output from Jarviz-lib analysis. Jarviz-lib is a static analysis tool that extracts method-level dependencies from Java bytecode. To generate the input data:

1. Extract your EAR/WAR/JAR files
2. Run Jarviz-lib analysis on the extracted files
3. Use the resulting JSONL file as input to this tool

### Expected JSONL Format

Each line in the JSONL file should be a JSON object with the following structure:

```json
{
  "appSetName": "AppName",
  "applicationName": "AppName",
  "artifactFileName": "example.jar",
  "artifactId": "exampleModule",
  "artifactGroup": "com.example",
  "artifactVersion": "1.0.0",
  "sourceClass": "com.example.SourceClass",
  "sourceMethod": "methodName",
  "targetClass": "com.example.TargetClass",
  "targetMethod": "targetMethod"
}
```

## Dependency Mapper Output

The dependency mapper will output:
- General statistics about dependencies
- Artifact dependency relationships
- Cycles in the dependency graph (if any)
- Top 10 most depended upon classes

### Example Output

```
Parsing dependencies from sample-dependencies.jsonl...

Dependency Statistics:
Total components: 4
Total artifacts: 1
Total dependencies: 3

Top 10 most depended upon classes:
1. com.example.sample.component.servicelocator.ServiceLocatorException: 1 dependents
2. java.lang.Object: 1 dependents
3. java.lang.Boolean: 1 dependents
4. com.example.sample.component.servicelocator.ejb.ServiceLocator: 0 dependents

Artifact Dependencies:
No inter-artifact dependencies found.

Cycles in Dependencies:
No cycles found.
```

## Package Dependencies Extractor Output

The package dependencies extractor generates a Markdown file with the following sections:

1. **Base Packages**: A list of all base packages used by the project, grouped by:
   - External Dependencies (e.g., `java.lang`, `javax.servlet`)
   - Internal Packages (e.g., `com.example`)

2. **Dependency Relationships**: Shows which base packages depend on other base packages

3. **Package Details**: Detailed information about each base package, including:
   - Type (Internal or External)
   - Number of sub-packages
   - Number of classes
   - Dependencies on other base packages
   - List of all sub-packages

### How It Works

1. The tool reads the JSONL file line by line
2. For each record, it extracts the source and target class names and their packages
3. It categorizes packages as internal or external based on their artifact group
4. Base packages are determined by:
   - For standard packages (java, javax, org, com, net), the first two segments are used (e.g., `java.lang`)
   - For other packages, the first three segments are used (or fewer if there aren't three)
5. Dependencies between packages are tracked and rolled up to the base package level

### Example

For a sample input like:

```json
{"sourceClass":"com.example.sample.component.servicelocator.ejb.ServiceLocator","targetClass":"java.lang.Object"}
```

The tool will extract:
- Base packages: `com.example` and `java.lang`
- Dependencies: `com.example` depends on `java.lang`

## Using as a Library

You can also use the various analyzer classes in your own code:

```typescript
import { DependencyAnalyzer } from './dependency-mapper';

async function analyze() {
  const analyzer = new DependencyAnalyzer();
  await analyzer.parseJsonlFile('path/to/dependencies.jsonl');
  
  // Get artifact dependency summary
  const artifactDeps = analyzer.getArtifactDependencySummary();
  
  // Find cycles
  const cycles = analyzer.findCycles();
  
  // Get more data as needed
}

analyze().catch(console.error);
```