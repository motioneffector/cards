# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-01-12

### Added
- Initial foundation release
- Complete type system for Character Card V1/V2/V3
- Decorator parsing and serialization for V3 lorebook entries (26 decorator types)
- Card and lorebook validation (permissive and strict modes)
- Format detection (PNG, ZIP, JSON signatures)
- PNG CRC-32 computation with lookup table
- Base64 encoding/decoding (multi-platform support)
- UTF-8 encoding/decoding with fallbacks
- PNG chunk reading and writing infrastructure
- Comprehensive test suite (221 test cases)
- Interactive demo with 25 automated tests
- Full TypeScript support with strict type checking
- Zero runtime dependencies
- Tree-shakeable ESM build

### In Progress
- PNG card reading and writing (stubs implemented)
- JSON card parsing with V1/V2→V3 normalization (stubs implemented)
- CHARX (ZIP) container support (stubs implemented)
- Card repair and recovery functions (stubs implemented)
- Full integration test implementation

### Notes
This is a foundation release demonstrating production-ready components:
- Decorator system is fully functional
- CRC-32, base64, and UTF-8 utilities are complete
- Validation logic is operational
- Architecture and APIs are finalized

Full PNG/JSON/CHARX I/O implementation will be completed in subsequent releases.
