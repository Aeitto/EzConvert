# **App Name**: EzConvert

## Core Features:

- File Upload: Accept CSV and XML file uploads.
- Manufacturer Profiles: Allow users to create and manage profiles for different product manufacturers, each with specific XML parsing configurations. Auto detect file structure by simple AI prompt with a description about what we're trying to find as data (product details). Use the LLM as tool to find patterns to automatically create config file.
- Intelligent Data Mapping: AI-powered tool that identifies and maps data fields to standardized column headers, dynamically adjusting to variations in CSV and XML structures based on profiles.
- Data Preview: Display converted data in a tabular format within the app, allowing users to preview the data. Users are also able to edit/map to new/existing value for column via modal window. Column value suggestions can be implemented here also via generative AI tool.
- Download Converted Data: Enable users to download the converted data in a standardized CSV format.

## Style Guidelines:

- Primary color: Light grey (#F5F5F5) for clean, neutral backdrop.
- Secondary color: Dark blue (#3F51B5) for headers and primary actions.
- Accent: Teal (#009688) for highlights, active states and buttons.
- Clean, sans-serif font for readability and a modern feel.
- Simple, geometric icons for actions (upload, download, convert) and file types.
- Clear separation of sections for file upload, profile selection, data preview, and download.
- Subtle transition animations when switching between sections or loading data.