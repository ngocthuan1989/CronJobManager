# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-10-24

### Added
- Initial release of CronJobManager
- Electron-based desktop application for managing cron jobs
- Modern React UI with TypeScript
- Job creation, editing, and deletion functionality
- Schedule builder with cron expression support
- Job execution monitoring and logging
- Cross-platform support (macOS, Windows, Linux)

### Features
- **Job Management**: Create, edit, delete cron jobs
- **Schedule Builder**: Visual cron expression builder
- **Job Monitoring**: Real-time job execution status
- **Logging**: Detailed execution logs and history
- **Modern UI**: Clean, responsive interface built with React
- **Cross-platform**: Works on macOS, Windows, and Linux

### Technical Details
- Built with Electron + React + TypeScript
- Uses Vite for fast development and building
- SQLite database for job storage
- IPC communication between main and renderer processes
- Modern CSS with responsive design
