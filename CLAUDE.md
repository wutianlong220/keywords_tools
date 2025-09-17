# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Chrome browser extension for SEO keyword processing that converts from a web version to a decentralized extension. It processes XLSX files containing keyword data, performs translation using DeepSeek API, calculates Kdroi (ROI), and generates platform-specific links. The extension features an innovative **Keyword Ocean Architecture** that breaks file boundaries for optimized concurrent processing, achieving up to 77% performance improvement.

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
- **Batch Translation**: DeepSeek API calls with concurrent processing (80 keywords per batch, 25 concurrent requests)
- **Kdroi Calculation**: ROI formula (Volume × CPC ÷ Keyword Difficulty)
- **Link Generation**: Google Search, Google Trends, Ahrefs query links
- **Local Storage**: Chrome Storage API for API credentials
- **Export**: Merged XLSX with overview sheet and proper number formatting
- **UI Options**: Standalone window panel (700x900px) and side panel interfaces

### Keyword Ocean Architecture (v5.0)
- **Keyword-level concurrency**: Breaks file boundaries to process keywords as a continuous stream
- **Dual indexing system**: File index + keyword index mapping ensures 100% accuracy
- **Optimal batching**: 100% batch utilization with fixed 80-keyword batches
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
- **BATCH_SIZE**: 80 keywords per batch
- **CONCURRENCY_LIMIT**: 25 concurrent API requests
- **REQUEST_TIMEOUT**: 30 seconds per request
- **MAX_RETRIES**: 2 retry attempts per failed request
- **Performance gain**: 77% improvement with Keyword Ocean optimization

### API Integration
- **Endpoint**: Configurable DeepSeek Chat Completions API
- **Batching**: 80 keywords per batch with 25 concurrent requests
- **Error Handling**: Retry logic with exponential backoff
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
- **Concurrency Control**: 25 concurrent requests with 80-keyword batches
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

## Technical Documentation

### Detailed Architecture
- `docs/单词海洋并发优化.md`: Technical documentation for Keyword Ocean optimization
- `docs/单词海洋优化实施总结.md`: Implementation summary and test results

### Testing and Validation
- `测试说明.md`: Chinese testing instructions and guidelines