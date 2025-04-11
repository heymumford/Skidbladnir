# Skidbladnir User Documentation

Welcome to the Skidbladnir user documentation! This comprehensive guide provides detailed information about using Skidbladnir for test asset migration between different test management systems.

## Quick Navigation

- [Migration Guide](migration-guide/index.md) - Complete guide for migrating from Zephyr Scale to qTest
- [UI Guide](ui-implementation-summary.md) - Overview of the Skidbladnir user interface
- [API Reference](../api/api-comparison.md) - API reference documentation

## About Skidbladnir

Skidbladnir is a powerful test asset migration tool designed for seamless transfer of test cases, test suites, and attachments between different test management systems. The current version focuses on migration from Zephyr Scale to qTest Manager.

### Key Features

- **Complete Migration**: Migrate test cases, test steps, attachments, and relationships
- **Field Mapping**: Flexible field mapping with advanced transformation capabilities
- **Preview & Validation**: Verify migration configuration before execution
- **Fault Tolerance**: Resilient migration with pause, resume, and error handling
- **Performance Optimized**: Efficient processing of large test case volumes
- **Progress Monitoring**: Real-time progress indicators and detailed logs
- **LCARS-Inspired Interface**: Intuitive, responsive user interface

## Getting Started

New users should start with the [Migration Guide](migration-guide/index.md), which provides a complete walkthrough of the migration process, including setup, configuration, and execution.

### Installation

For installation instructions, see:

- [Linux Installation](../scripts/install-linux.sh)
- [macOS Installation](../scripts/install-macos.sh)
- [Windows Installation](../scripts/install-windows.sh)

### System Requirements

- **Operating System**: Windows 10+, macOS 10.15+, or Linux (Ubuntu 20.04+, Fedora 34+)
- **Memory**: Minimum 4GB RAM, 8GB recommended for large migrations
- **Disk Space**: 10GB free space
- **Network**: Internet connection for API access
- **Browser**: Chrome 90+, Firefox 88+, or Edge 90+ (for web interface)

## Documentation Structure

- **[Migration Guide](migration-guide/index.md)**: Complete guide to migrating from Zephyr Scale to qTest
  - [Overview & Quick Start](migration-guide/README.md)
  - [API Token Generation](migration-guide/api-token-guide.md)
  - [Field Mapping Reference](migration-guide/field-mapping-reference.md)
  - [Advanced Transformations](migration-guide/transformation-examples.md)
  - [Troubleshooting](migration-guide/troubleshooting.md)

- **UI Documentation**:
  - [UI Implementation Summary](ui-implementation-summary.md)
  - [UI Requirements](ui-requirements.md)
  - [UI Test Plan](ui-test-plan.md)

## Support & Feedback

For support, please contact:

- Email: support@skidbladnir.example.com
- GitHub Issues: [Submit an Issue](https://github.com/example/skidbladnir/issues)
- Community Forum: [community.skidbladnir.example.com](https://community.skidbladnir.example.com)

## License

Skidbladnir is released under the MIT License. See the [LICENSE](../../LICENSE) file for details.