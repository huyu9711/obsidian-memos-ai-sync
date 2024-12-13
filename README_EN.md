# Obsidian Memos Sync Plugin

English | [简体中文](README.md)

A plugin that syncs Memos content to Obsidian, providing seamless integration.

# Interface Preview
## Settings Interface
![Settings Interface](/examples/example01.png)
## AI Enhancement
Summarize memos and auto-tag for better management

### Original Memos Content
![Original Memos Content](/examples/example03.png)

### AI Enhanced Content
![AI Enhanced](/examples/example02.png)

## AI Weekly Summary
Organize synced content into weekly summaries for easy review.

### AI Weekly Summary Content
![AI Weekly Summary](/examples/example04.png)

## Features

### Core Features
- One-click sync from Memos to Obsidian
- Manual and automatic sync modes
- Smart file organization (year/month structure)
- Customizable sync interval
- Intelligent sync control
  - Auto-skip synced content
  - Duplicate detection based on Memo ID
  - Protection for synced files

### Content Processing
- Smart file naming
  - Auto-extract content preview as filename
  - Smart special character handling
  - Auto-remove special characters from filename start
  - Timestamp for identification: `(YYYY-MM-DD HH-mm)`
- Markdown content optimization
- Tag conversion (from Memos format #tag# to Obsidian format #tag)
- Support for images and file attachments

### AI Enhancement

```
Currently supports OpenAI, Gemini, and Ollama integration. Claude support is under testing.
```

#### AI Settings Guide
1. **Choose AI Provider**
   - OpenAI
   - Google Gemini
   - Ollama (Local Deployment)
   - Claude (In Development)

2. **Configuration Details**
   - OpenAI Settings
     - API Key: Enter your OpenAI API key
     - Model Selection: Supports gpt-3.5-turbo, gpt-4, etc.
   - Gemini Settings
     - API Key: Enter your Google API key
     - Model: gemini-pro
   - Ollama Settings
     - Server Address: e.g., http://localhost:11434
     - Models: Supports llama2, mistral, etc.

3. **Feature Controls**
   - Auto Summary: Generate summary for each memo
   - Smart Tags: Auto-recommend relevant tags
   - Weekly Report: Auto-generate weekly summaries
   - Prompt Configuration: Customize AI prompts

- Auto-generate content summaries
- Smart tag recommendations
- Weekly content summary
  - Generate independent summary files by week
  - Auto-skip existing weekly summaries
  - Save summaries in `{year}/weekly/` directory
  - Include weekly highlights, statistics, and outlook
- Configurable AI features

### Resource Management
- Auto-download images and attachments
- Local resource storage (organized directory structure)
- Correct relative path generation
- Support for multiple file types

### Document Structure
- Content-first format design
- Inline image display
- Dedicated "Attachments" section
- Metadata stored in collapsible callouts
- Weekly summary file organization
  - Directory structure: `sync_directory/YYYY/weekly/Week-WW-Summary.md`
  - One summary file per week
  - Includes week number, date range, and statistics

### File Organization
- Files organized by year/month: `sync_directory/YYYY/MM/`
- Resource files in dedicated directories
- Filenames include content preview and timestamp
- Example: `Meeting notes for project (2024-01-10 15-30).md`
- Weekly summary file structure:
```
sync_directory/
├── 2024/
│   ├── 01/
│   │   ├── memo1.md
│   │   └── resources/
│   │       └── attachments...
│   ├── 02/
│   │   └── memo2.md
│   └── weekly/
│       ├── Week-01-Summary.md
│       ├── Week-02-Summary.md
│       └── Week-03-Summary.md
└── 2023/
    └── ...
```

## Installation

1. Open Obsidian Settings
2. Go to Community Plugins and disable Safe Mode
3. Click Browse and search for "Memos Sync"
4. Install the plugin
5. Enable the plugin

## Configuration

### Required Settings
- **Memos API URL**: Your Memos server API endpoint
- **Access Token**: Your Memos API access token
- **Sync Directory**: Location for Memos content in Obsidian

### Optional Settings
- **Sync Mode**: Choose manual or automatic sync
- **Sync Interval**: Set automatic sync frequency (if enabled)
- **Sync Limit**: Maximum entries to sync at once

## Usage

### Manual Sync
1. Click the sync icon in the toolbar
2. Wait for the sync process to complete
3. Your memos will be saved according to the organization structure

### Automatic Sync
1. Enable automatic sync in settings
2. Set your preferred sync interval
3. Plugin will sync automatically according to configuration

## Project Structure

```
obsidian-memos-sync/
├── src/
│   ├── models/          # Type definitions and interfaces
│   │   ├── settings.ts  # Settings and type definitions
│   │   └── plugin.ts    # Plugin interface definitions
│   ├── services/        # Core service implementations
│   │   ├── memos-service.ts    # Memos API service
│   │   └── file-service.ts     # File handling service
│   └── ui/             # User interface components
│       └── settings-tab.ts     # Settings page
├── main.ts            # Main plugin file
├── manifest.json      # Plugin manifest
└── package.json       # Project configuration
```

### Code Structure Description

- **models**: Contains all type definitions and interfaces
  - `settings.ts`: Defines plugin settings and data models
  - `plugin.ts`: Defines plugin interfaces

- **services**: Core service implementations
  - `memos-service.ts`: Handles all Memos API interactions
  - `file-service.ts`: Handles file system operations and content formatting

- **ui**: User interface components
  - `settings-tab.ts`: Implements plugin settings interface

## Compatibility
- Supports Memos version: up to 0.22.5
- Recommended to use Memos v0.22.5 for best compatibility

## Troubleshooting

### Common Issues
1. **Sync Fails**
   - Check Memos API URL and access token
   - Ensure Obsidian has write permissions for sync directory

2. **Resource Files Not Loading**
   - Verify Memos server accessibility
   - Check network connection
   - Ensure authentication is correct

3. **File Organization Issues**
   - Check sync directory permissions
   - Verify path configuration

## Support

If you encounter issues or have suggestions:
1. Visit the [GitHub Repository](https://github.com/leoleelxh/obsidian-memos-sync-plugin)
2. Create an issue with detailed description
3. Include relevant error messages and configuration

## License

MIT 