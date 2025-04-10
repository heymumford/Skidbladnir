#!/usr/bin/env node
"use strict";
/**
 * CLI tool for validating XML files against schemas
 *
 * This tool can be used to validate XML files in a project against their
 * corresponding schemas. It automatically detects schema locations based
 * on XML namespaces.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var fs = __importStar(require("fs"));
var path = __importStar(require("path"));
var XmlSchemaValidator_1 = require("../XmlSchemaValidator");
// Command-line argument parsing
var args = process.argv.slice(2);
var options = {};
// Parse command-line arguments
for (var i = 0; i < args.length; i++) {
    var arg = args[i];
    if (arg === '--help' || arg === '-h') {
        options.help = true;
    }
    else if (arg === '--verbose' || arg === '-v') {
        options.verbose = true;
    }
    else if (arg === '--xml-dir' || arg === '-x') {
        options.xmlDir = args[++i];
    }
    else if (arg === '--schema-dir' || arg === '-s') {
        options.schemaDir = args[++i];
    }
    else if (arg === '--pattern' || arg === '-p') {
        options.pattern = args[++i];
    }
}
// Display help
if (options.help) {
    console.log("XML Schema Validation Tool\n\nUsage:\n  npx ts-node validate-xml.ts [options]\n\nOptions:\n  --xml-dir, -x     Directory containing XML files to validate (default: project root)\n  --schema-dir, -s  Directory containing XML schemas (default: schemas/)\n  --pattern, -p     Glob pattern to filter XML files (default: **/*.xml)\n  --verbose, -v     Show more detailed output\n  --help, -h        Show this help message\n\nExamples:\n  npx ts-node validate-xml.ts -x ./src -s ./schemas\n  npx ts-node validate-xml.ts -p \"**/*pom.xml\" -v\n");
    process.exit(0);
}
// Set default options
var projectRoot = path.resolve(process.cwd());
var xmlDir = options.xmlDir ? path.resolve(options.xmlDir) : projectRoot;
var schemaDir = options.schemaDir
    ? path.resolve(options.schemaDir)
    : path.join(projectRoot, 'schemas');
var pattern = options.pattern || '**/*.xml';
// Ensure schema directory exists
if (!fs.existsSync(schemaDir)) {
    console.error("Schema directory not found: ".concat(schemaDir));
    console.error('Create the directory or specify a different one with --schema-dir');
    process.exit(1);
}
// Validate files
console.log("Validating XML files in ".concat(xmlDir, " against schemas in ").concat(schemaDir));
console.log("Using pattern: ".concat(pattern));
var results = XmlSchemaValidator_1.XmlSchemaValidator.validateDirectory(xmlDir, schemaDir, pattern);
// Display results
console.log("\nValidated ".concat(results.length, " XML files"));
var validFiles = results.filter(function (r) { return r.valid; });
var invalidFiles = results.filter(function (r) { return !r.valid; });
console.log("Valid: ".concat(validFiles.length));
console.log("Invalid: ".concat(invalidFiles.length));
if (invalidFiles.length > 0) {
    console.log('\nInvalid files:');
    for (var _i = 0, invalidFiles_1 = invalidFiles; _i < invalidFiles_1.length; _i++) {
        var result = invalidFiles_1[_i];
        var relativePath = path.relative(projectRoot, result.filePath);
        console.log("- ".concat(relativePath));
        if (options.verbose) {
            console.log("  Schema: ".concat(result.usedSchema ? path.relative(projectRoot, result.usedSchema) : 'None'));
            console.log('  Errors:');
            for (var _a = 0, _b = result.errors; _a < _b.length; _a++) {
                var error = _b[_a];
                console.log("  - ".concat(error));
            }
            console.log('');
        }
    }
}
// Exit with appropriate status code
process.exit(invalidFiles.length > 0 ? 1 : 0);
