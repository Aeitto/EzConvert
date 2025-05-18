# Project Blueprint: EzConvert

## Vision

To provide a user-friendly web application that simplifies the process of converting data between different formats, with a particular focus on handling complex XML structures and standardizing data through mapping and profiles.

## Tech Stack

*   **Frontend:** Next.js, React, TypeScript, Tailwind CSS
*   **Backend/API:** Next.js API Routes, TypeScript

## Core Features

*   **File Upload:** Support for uploading CSV and XML files.
*   **Manufacturer Profiles:** Ability to create and manage profiles with specific XML parsing configurations. Includes auto-detection of XML structure.
*   **Data Mapping:** Mapping of source data fields to standardized output columns, adaptable to different file structures.
*   **Data Preview:** Interactive tabular display of converted data.
*   **Builder:** separate set of tools where user can perform extensive data transforms. 
*   **Download Converted Data:** Export standardized data in CSV format.

## Architecture Overview

The project follows a typical Next.js architecture:

*   **`src/app/`:** Contains Next.js pages and API routes.
*   **`src/components/`:** Reusable React components (UI elements, feature-specific components like file upload, data preview, etc.).
*   **`src/lib/`:** Utility functions and helper modules (data processing, file handling, conversion logic).
*   **`src/hooks/`:** Custom React hooks.
*   **`src/contexts/`:** React context for state management.
*   **`src/types/`:** TypeScript type definitions.

## Styling Guidelines

*   **Primary Color:** Light grey (#F5F5F5)
*   **Secondary Color:** Dark blue (#3F51B5)
*   **Accent Color:** Teal (#009688)
*   **Font:** Clean, sans-serif.
*   **Icons:** Simple, geometric icons.
*   **Layout:** Clear separation of main sections (upload, profile, preview, download).
*   **Animations:** Subtle transitions

## Tools & Libraries

*   Next.js (Framework)
*   React (UI Library)
*   TypeScript (Language)
*   Tailwind CSS (Styling)
*   Other libraries for file parsing (e.g., XML, CSV) and data manipulation as needed.