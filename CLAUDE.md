# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Chrome browser extension for SEO keyword processing that converts from a web version to a decentralized extension. It processes XLSX files containing keyword data, performs translation using DeepSeek API, calculates Kdroi (ROI), and generates platform-specific links.

## Architecture

### Core Components
- **window.js** (707 lines): Main business logic using `KeywordProcessor` class
- **window.html**: Extension standalone window interface (700x900px panel)
- **background.js**: Service worker for extension lifecycle and API config checking
- **manifest.json**: Chrome Extension Manifest V3 configuration
- **xlsx.full.min.js**: SheetJS library for Excel file processing
- **sidepanel.html/sidepanel.js**: Side panel interface (alternative UI)

### Key Features
- **File Processing**: Drag & drop XLSX upload with SheetJS parsing, multi-file support
- **Batch Translation**: DeepSeek API calls with concurrent processing (80 keywords per batch, 5 concurrent requests)
- **Kdroi Calculation**: ROI formula (Volume × CPC ÷ Keyword Difficulty)
- **Link Generation**: Google Search, Google Trends, Ahrefs query links
- **Local Storage**: Chrome Storage API for API credentials
- **Export**: Merged XLSX with overview sheet and proper number formatting
- **UI Options**: Standalone window panel (700x900px) and side panel interfaces

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
- Supports multi-file batch processing
- Drag & drop or click to upload XLSX files
- Configure DeepSeek API credentials in the interface

### Testing
- No automated tests currently
- Manual testing with sample XLSX files
- Chrome DevTools debugging via extension popup "Inspect" option
- Console logging throughout for debugging

### File Processing Test
1. Create test XLSX with columns: Keyword, Intent, Volume, Keyword Difficulty, CPC (USD)
2. Test drag & drop upload
3. Verify API integration and translation
4. Check file export with Kdroi calculations

## Code Structure

### KeywordProcessor Class (window.js:1-707)
- `init()`: Initialization and event listener setup
- `loadApiConfig()`: Chrome Storage API for credentials
- `processFile()`: XLSX parsing and batch processing
- `batchTranslateKeywords()`: Concurrent DeepSeek API integration
- `translateBatchWithIndex()`: Batch translation with retry logic
- `processXLSXData()`: Data processing and Kdroi calculation
- `downloadMergedFile()`: Multi-sheet XLSX export with overview
- `generateLinks()`: Platform-specific URL generation

### Concurrency & Performance
- **BATCH_SIZE**: 80 keywords per batch
- **CONCURRENCY_LIMIT**: 25 concurrent API requests
- **REQUEST_TIMEOUT**: 30 seconds per request
- **MAX_RETRIES**: 2 retry attempts per failed request
- **Multi-file support**: Process multiple XLSX files sequentially

### API Integration
- **Endpoint**: Configurable DeepSeek Chat Completions API
- **Batching**: 80 keywords per batch with 5 concurrent requests
- **Error Handling**: Retry logic with exponential backoff
- **Rate Limiting**: Built-in delays between retries
- **Timeout Handling**: 30-second timeout with abort controller

### Data Flow
1. Multi-file XLSX upload → SheetJS parsing → JSON conversion
2. Concurrent batch keyword translation via DeepSeek API
3. Kdroi calculation and link generation for each row
4. Multi-sheet XLSX export with overview sheet and usage instructions

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
- **Performance**: Optimized with concurrent processing (25 requests, 80 keywords per batch)
- **Number Format**: Kdroi column uses proper Excel number format (2 decimal places)
- **Localization**: UI in Chinese, translation to Chinese
- **Multi-file**: Batch processing with sequential file handling
- **Error Recovery**: Retry mechanism with exponential backoff
- **Memory Management**: Large files processed in chunks to avoid memory issues