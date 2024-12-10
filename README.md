# Obsidian Memos Sync Plugin

This plugin synchronizes your Memos content with Obsidian, providing a seamless integration between your Memos notes and your Obsidian vault.

## Features

### Core Functionality
- Sync Memos content to Obsidian with one click
- Support for both manual and automatic synchronization
- Intelligent file organization by year/month structure
- Customizable sync interval for automatic mode

### Compatibility
- Supports Memos version up to 0.16.3
- For Memos v0.17.0 and above, please wait for future updates due to API changes
- Recommended to use Memos v0.16.3 for best compatibility

### Content Handling
- Clean and readable file naming: `content_preview (YYYY-MM-DD HH-mm).md`
- Markdown content optimization
- Hashtag conversion from Memos format (#tag#) to Obsidian format (#tag)
- Support for both images and file attachments

### Resource Management
- Automatic download of images and attachments
- Local resource storage in organized directory structure
- Proper relative path generation for resources
- Support for various file types

### Document Structure
- Content-first approach with clean formatting
- Images displayed inline after content
- Dedicated "Attachments" section for non-image files
- Metadata stored in collapsible callout at the bottom

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
- **Sync Directory**: Where your memos will be stored in Obsidian

### Optional Settings
- **Sync Mode**: Choose between manual or automatic synchronization
- **Sync Interval**: Set the frequency for automatic sync (if enabled)
- **Sync Limit**: Maximum number of memos to sync at once

## Usage

### Manual Synchronization
1. Click the sync icon in the ribbon
2. Wait for the sync process to complete
3. Your memos will be organized in the specified directory

### Automatic Synchronization
1. Enable automatic sync in settings
2. Set your preferred sync interval
3. The plugin will automatically sync based on your configuration

### File Organization
- Files are organized by year and month: `sync_directory/YYYY/MM/`
- Resources are stored in a dedicated directory
- File names include content preview and timestamp
- Example: `Meeting notes for project (2024-01-10 15-30).md`

### Document Format
```markdown
Your memo content here...

![image1](resources/image1.png)

### Attachments
- [document.pdf](resources/document.pdf)

---
> [!note]- Memo Properties
> - Created: 2024-01-10 15:30:00
> - Updated: 2024-01-10 15:30:00
> - Type: memo
> - Tags: [project, meeting]
> - ID: memos/xxx
> - Visibility: private
```

## Troubleshooting

### Common Issues
1. **Sync Failed**
   - Check your Memos API URL and access token
   - Ensure your Obsidian has write permissions to the sync directory

2. **Resources Not Loading**
   - Verify your Memos server is accessible
   - Check network connectivity
   - Ensure proper authentication

3. **File Organization Issues**
   - Check sync directory permissions
   - Verify path configuration

## Support

If you encounter any issues or have suggestions:
1. Visit the [GitHub repository](https://github.com/leoleelxh/obsidian-memos-sync-plugin)
2. Create an issue with detailed description
3. Include relevant error messages and configuration

## License

MIT
