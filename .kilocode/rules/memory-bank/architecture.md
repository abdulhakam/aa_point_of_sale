# Architecture

## System Overview
The application follows a client-server architecture where the frontend is a Next.js application and the backend is provided by PocketBase.

## Components

### Frontend
- **Framework**: Next.js 14 (App Router).
- **Language**: TypeScript.
- **UI Library**: Mantine v7.
- **State Management**: React Query (TanStack Query) for server state.
- **Location**: `frontend/` directory.

### Backend
- **Service**: PocketBase (Go-based backend as a service).
- **Database**: SQLite (embedded in PocketBase).
- **Authentication**: PocketBase Auth.
- **Location**: `backend/` directory.

## Directory Structure
- `frontend/`: Contains the Next.js source code.
    - `src/app`: App directory (Routes).
    - `src/components`: UI Components.
- `backend/`: Contains the PocketBase executable and data.
    - `pb_data`: Database files.
    - `pb_migrations`: Database migrations.

## Data Flow
1. User interacts with Next.js frontend.
2. Frontend makes requests to PocketBase via the JS SDK.
3. PocketBase handles authentication, database operations, and file storage.
