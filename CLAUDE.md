# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Chrome browser extension for SEO keyword processing that converts from a web version to a decentralized extension. It processes XLSX files containing keyword data, performs translation using DeepSeek API, calculates Kdroi (ROI), and generates platform-specific links. The extension features an innovative **Keyword Ocean Architecture** that breaks file boundaries for optimized concurrent processing, achieving up to 77% performance improvement.

## Quick Start

### Extension Installation
```bash
# Chrome Extension Management
chrome://extensions/
# Enable Developer Mode → Load unpacked → Select project folder
```

### Development Workflow
- **No build process**: Pure Chrome extension, no npm/package.json
- **Debugging**: Use Chrome DevTools "Inspect" on extension popup or window
- **Testing**: Manual testing with sample XLSX files
- **Live reload**: Reload extension in chrome://extensions/ after code changes

## Architecture

### Core Components
- **window.js** (1,200+ lines): Main business logic using `KeywordProcessor` class with Keyword Ocean optimization
- **window.html**: Extension standalone window interface (700x900px panel)
- **background.js**: Service worker for extension lifecycle and API config checking
- **manifest.json**: Chrome Extension Manifest V3 configuration
- **xlsx.full.min.js**: SheetJS library for Excel file processing
- **jszip.min.js**: ZIP compression library

### Key Features
- **File Processing**: Drag & drop XLSX upload with SheetJS parsing, multi-file support
- **Batch Translation**: DeepSeek API calls with concurrent processing (configurable 15-85 keywords per batch, 25 concurrent requests)
- **Kdroi Calculation**: ROI formula (Volume × CPC ÷ Keyword Difficulty)
- **Link Generation**: Google Search, Google Trends, Ahrefs query links
- **Local Storage**: Chrome Storage API for API credentials
- **Export**: Merged XLSX with overview sheet and proper number formatting
- **UI Options**: Standalone window panel (700x900px) only (popup/sidepanel removed)

### Keyword Ocean Architecture (v5.0)
- **Keyword-level concurrency**: Breaks file boundaries to process keywords as a continuous stream
- **Dual indexing system**: File index + keyword index mapping ensures 100% accuracy
- **Optimal batching**: 100% batch utilization with configurable batch sizes (default: 40 keywords)
- **Performance gains**: Up to 77% performance improvement vs file-level processing
- **Smart progress tracking**: Real-time keyword-level progress display

### Security Model
- All processing happens locally (no server uploads)
- API keys stored in Chrome local storage
- Each user uses their own API credentials
- No cross-origin restrictions (extension privilege)

## Development Commands

### Extension Installation
```bash
# Chrome Extension Management
chrome://extensions/
# Enable Developer Mode → Load unpacked → Select project folder
```

### Extension Usage
- Click extension icon to open standalone window (700x900px panel)
- Supports multi-file batch processing with Keyword Ocean optimization
- Drag & drop or click to upload XLSX files
- Configure DeepSeek API credentials in the interface
- Monitor keyword-level progress in real-time

### Testing
- Manual testing with sample XLSX files (no automated tests)
- Chrome DevTools debugging via extension popup "Inspect" option
- Console logging throughout for debugging

### Debugging
- **Extension Console**: Right-click extension icon → "Inspect" → Console tab
- **Window Console**: Open standalone window → Right-click → "Inspect" → Console tab
- **Performance Logs**: Built-in performance logging system with export functionality
- **API Issues**: Check network requests in DevTools Network tab

### File Processing Test
1. Create test XLSX with columns: Keyword, Intent, Volume, Keyword Difficulty, CPC (USD)
2. Test drag & drop upload with multiple files
3. Verify API integration and translation
4. Check file export with Kdroi calculations and proper Excel number formatting

## Code Structure

### KeywordProcessor Class (window.js:1-1200+)
- `init()`: Initialization and event listener setup
- `loadApiConfig()`: Chrome Storage API for credentials
- `processFile()`: XLSX parsing and batch processing
- `batchTranslateKeywords()`: Concurrent DeepSeek API integration
- `translateBatchWithIndex()`: Batch translation with retry logic
- `processXLSXData()`: Data processing and Kdroi calculation
- `downloadMergedFile()`: Multi-sheet XLSX export with overview
- `generateLinks()`: Platform-specific URL generation

### Keyword Ocean Architecture Methods
- `preprocessFilesForOcean()`: Build continuous keyword stream from all files
- `createBatchesForOcean()`: Create fixed-size batches from keyword ocean
- `processBatchesForOcean()`: Process batches with concurrent requests
- `distributeResultsForOcean()`: Distribute results back to original files
- `reconstructFileData()`: Reconstruct original file structure with processed data

### Concurrency & Performance
- **BATCH_SIZE**: Configurable 15-85 keywords per batch (default: 40, optimized for long-tail keywords)
- **CONCURRENCY_LIMIT**: Configurable 2-25 concurrent API requests (default: 25)
- **REQUEST_TIMEOUT**: 30 seconds per request
- **MAX_RETRIES**: 9 retry attempts per failed request (recently increased from 2 for API stability)
- **Performance gain**: 77% improvement with Keyword Ocean optimization

### API Integration
- **Endpoint**: Configurable DeepSeek Chat Completions API
- **Batching**: Configurable batch size with concurrent requests
- **Error Handling**: Enhanced retry logic with exponential backoff
- **Rate Limiting**: Built-in delays between retries
- **Timeout Handling**: 30-second timeout with abort controller

### Data Flow
1. Multi-file XLSX upload → SheetJS parsing → JSON conversion
2. Keyword Ocean preprocessing: Build continuous keyword stream with dual indexing
3. Concurrent batch processing: Fixed-size batches processed simultaneously
4. Result distribution: Map results back to original files using dual indexing
5. File reconstruction: Rebuild original file structure with processed data
6. Multi-sheet XLSX export with overview sheet and usage instructions

## Input/Output Format

### Required Input Columns
- Keyword (string)
- Intent (string)
- Volume (number)
- Keyword Difficulty (number)
- CPC (USD) (number)

### Output Columns
- Keyword (original)
- Translation (Chinese via DeepSeek)
- Intent (preserved)
- Volume (preserved)
- Keyword Difficulty (preserved)
- CPC (USD) (preserved)
- **Kdroi** (calculated, number format, 2 decimal places)
- SERP (Google search link)
- Google Trends (trends link)
- Ahrefs Keyword Difficulty Checker (query link)

### Export Format
- **Multi-sheet workbook**: Overview sheet + individual file sheets
- **Overview sheet**: File processing statistics and usage instructions
- **Individual sheets**: Each processed file in separate sheets
- **Timestamp**: Filename includes processing date
- **Chinese UI**: All interface text and instructions in Chinese

## Chrome Extension APIs Used

- **storage**: Local credential storage
- **runtime**: Extension lifecycle and messaging
- **permissions**: storage, activeTab, scripting, DeepSeek API domain
- **action**: Panel window interface configuration
- **windows**: Panel window management (700x900px)
- **tabs**: Active tab access for side panel functionality

## Configuration

API configuration stored in Chrome local storage:
- `deepseek_api_endpoint`: DeepSeek API URL
- `deepseek_api_key`: User's API key

## Important Considerations

- **Browser Support**: Chrome/Edge only (Manifest V3)
- **File Format**: XLSX/.xls files supported (via SheetJS)
- **Network**: Required for DeepSeek API calls
- **Performance**: Keyword Ocean optimization provides 77% performance improvement
- **Number Format**: Kdroi column uses proper Excel number format (2 decimal places)
- **Localization**: UI in Chinese, translation to Chinese
- **Multi-file**: Batch processing with keyword-level concurrent handling
- **Error Recovery**: Retry mechanism with exponential backoff
- **Memory Management**: Large files processed in chunks to avoid memory issues
- **Concurrency Control**: Configurable concurrent requests (2-25) with configurable batch sizes (15-85)
- **Performance Monitoring**: Built-in performance logging and metrics collection

## Performance Metrics

### Keyword Ocean vs Traditional Processing
- **Traditional**: 293.4 seconds (25 concurrent, file-level)
- **Keyword Ocean**: 199.9 seconds (25 concurrent, keyword-level)
- **Improvement**: 77.2% performance gain
- **Batch Utilization**: 100% vs variable in traditional approach

### Key Performance Indicators
- **Throughput**: Keywords processed per second
- **Concurrency Utilization**: Active concurrent requests / total limit
- **Batch Efficiency**: Actual batch size / target batch size
- **Memory Usage**: Peak memory during processing
- **API Success Rate**: Successful translations / total attempts

### Performance Logging System
- **Built-in Metrics**: Real-time performance logging with memory usage tracking
- **Session Tracking**: Each processing session has unique ID for analysis
- **Export Functionality**: Performance logs can be exported for analysis
- **Time Markers**: Detailed timing for each processing phase
- **Console Integration**: All performance data logged to console for debugging

## Technical Documentation

### Detailed Architecture
- `docs/单词海洋并发优化.md`: Technical documentation for Keyword Ocean optimization
- `docs/单词海洋优化实施总结.md`: Implementation summary and test results

### Testing and Validation
- `测试说明.md`: Chinese testing instructions and guidelines

## Current Development Status

### Recent Changes (v5.0)
- **Keyword Ocean Architecture**: Implemented file-boundary-breaking concurrent processing
- **Dynamic Configuration**: Batch size (15-85) and concurrency limit (2-25) now configurable via UI
- **Enhanced Retry Logic**: Increased retry attempts from 2 to 9 for improved API stability
- **Performance Logging**: Added comprehensive performance tracking and export functionality
- **Independent Window**: Removed popup/sidepanel interfaces in favor of 700x900px standalone window
- **CSP Compliance**: Fixed Content Security Policy issues by using local jszip.min.js

### Known Issues
- **File Size Limits**: Large files may cause memory issues (processed in chunks)
- **API Rate Limits**: DeepSeek API may have rate limits that affect processing speed
- **UI Configuration**: Dynamic batch size and concurrency limits configured via interface before processing

### Configuration Parameters
- **batchSize**: Number of keywords per translation batch (15-85, default: 40, configurable via UI)
- **concurrencyLimit**: Maximum concurrent API requests (2-25, default: 25, configurable via UI)
- **REQUEST_TIMEOUT**: 30 seconds per API request
- **MAX_RETRIES**: 9 retry attempts per failed request (increased from 2 for API stability)