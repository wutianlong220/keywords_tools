# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chrome Extension (Manifest V3) for SEO keyword processing. Uploads XLSX files, translates keywords via DeepSeek API, calculates Kdroi (Volume × CPC ÷ Keyword Difficulty), generates platform links, and exports multi-sheet XLSX. UI and comments are in Chinese.

## Development

- **No build step**: Pure Chrome extension, no npm/package.json/webpack
- **Installation**: `chrome://extensions/` → Enable Developer Mode → Load unpacked → select project folder
- **Live reload**: Reload extension in `chrome://extensions/` after code changes
- **Testing**: Manual only — load test XLSX files through the extension UI
- **Debugging**: Right-click extension icon → "Inspect" for background console; open standalone window → right-click → "Inspect" for main UI console

## Architecture

Single-class architecture — `KeywordProcessor` in **window.js** (~1570 lines) handles all business logic.

### Entry Points
- **window.js**: `KeywordProcessor` class, instantiated on `DOMContentLoaded`
- **window.html**: Standalone panel UI (700×900px)
- **background.js**: Service worker — opens panel window on icon click, checks API config
- **manifest.json**: Manifest V3 config

### Keyword Ocean Data Flow (v5.0)

The core optimization breaks file boundaries for maximum API concurrency:

```
1. preprocessFilesForOcean()  — Scan all files → build continuous keywordStream[]
2. createBatchesForOcean()    — Slice stream into fixed-size batches (default 40 keywords each)
3. processBatchesForOcean()   — Concurrent API calls (default 25 parallel) with retry
4. distributeResultsForOcean() — Map translations back using dual indexing (fileIndex + wordIndex)
5. reconstructFileData()      — Rebuild each file's original structure with processed data
```

**Dual indexing**: Each keyword in the stream carries `fileIndex` (which file) and `wordIndex` (position in file), enabling 100% accurate result distribution after breaking file boundaries.

### Key Configuration (runtime, via UI)
- `processingConfig.batchSize`: Keywords per API request (15–85, default 40)
- `processingConfig.concurrencyLimit`: Parallel API requests (2–25, default 25)
- `REQUEST_TIMEOUT`: 30s per request
- `MAX_RETRIES`: 9 retries with linear backoff (attempt × 1000ms delay)

### API Integration
- Endpoint: user-configured DeepSeek Chat Completions API
- Model: `deepseek-chat`, temperature 0.1
- `translateBatchForOcean()`: Single batch translation with numbered keyword list
- Failed batches fall back to original keywords (not empty strings)
- Credentials stored in `chrome.storage.local` as `deepseek_api_endpoint` / `deepseek_api_key`

### Export
`downloadMergedFile()` generates a multi-sheet XLSX:
- Sheet 1: Overview with file stats and usage instructions
- Sheet 2+: Each input file's processed data (Keyword, Translation, Intent, Volume, KD, CPC, Kdroi, SERP, Trends, Ahrefs links)
- Kdroi column uses Excel number format with 2 decimal places
- `extractWordRoot()` generates sheet names from filenames (extracts text before "broad match" or similar suffixes)

### Dependencies (vendored)
- `xlsx.full.min.js` — SheetJS for Excel read/write
- `jszip.min.js` — ZIP compression for XLSX generation

## Input/Output Format

**Required input columns**: Keyword, Intent, Volume, Keyword Difficulty, CPC (USD)

**Output columns**: Keyword, Translation, Intent, Volume, Keyword Difficulty, CPC (USD), Kdroi, SERP, Google Trends, Ahrefs Keyword Difficulty Checker
