# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Chrome browser extension for SEO keyword processing that converts from a web version to a decentralized extension. It processes XLSX files containing keyword data, performs translation using DeepSeek API, calculates Kdroi (ROI), and generates platform-specific links.

## Architecture

### Core Components
- **popup.js** (741 lines): Main business logic using `KeywordProcessor` class
- **popup.html**: Extension popup interface (700x700px)
- **background.js**: Service worker for extension lifecycle and API config checking
- **manifest.json**: Chrome Extension Manifest V3 configuration
- **xlsx.full.min.js**: SheetJS library for Excel file processing

### Key Features
- **File Processing**: Drag & drop XLSX upload with SheetJS parsing
- **Batch Translation**: DeepSeek API calls (20 keywords per batch)
- **Kdroi Calculation**: ROI formula (Volume × CPC ÷ Keyword Difficulty)
- **Link Generation**: Google Search, Google Trends, Ahrefs query links
- **Local Storage**: Chrome Storage API for API credentials
- **Export**: Processed XLSX with proper number formatting

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

### KeywordProcessor Class (popup.js:1-741)
- `init()`: Initialization and event listener setup
- `loadApiConfig()`: Chrome Storage API for credentials
- `processFile()`: XLSX parsing and batch processing
- `translateKeywords()`: DeepSeek API integration
- `calculateKdroi()`: ROI calculation with number formatting
- `generateLinks()`: Platform-specific URL generation
- `exportToExcel()`: SheetJS export with proper formatting

### API Integration
- **Endpoint**: Configurable DeepSeek Chat Completions API
- **Batching**: 20 keywords per request to optimize API usage
- **Error Handling**: Retry logic and user feedback
- **Rate Limiting**: Built-in delays between batches

### Data Flow
1. XLSX upload → SheetJS parsing → JSON conversion
2. Batch keyword translation via DeepSeek API
3. Kdroi calculation and link generation
4. XLSX export with proper number formatting

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

## Chrome Extension APIs Used

- **storage**: Local credential storage
- **runtime**: Extension lifecycle and messaging
- **permissions**: Limited to storage and DeepSeek API domain
- **action**: Popup interface configuration

## Configuration

API configuration stored in Chrome local storage:
- `deepseek_api_endpoint`: DeepSeek API URL
- `deepseek_api_key`: User's API key

## Important Considerations

- **Browser Support**: Chrome/Edge only (Manifest V3)
- **File Format**: XLSX only (via SheetJS)
- **Network**: Required for DeepSeek API calls
- **Performance**: Large files may take significant time
- **Number Format**: Kdroi column uses proper Excel number format
- **Localization**: UI in Chinese, translation to Chinese