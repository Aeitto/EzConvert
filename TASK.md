# Project Tasks: EzConvert

## Project Goal

Develop a web application to convert and standardize data, especially from complex XML files, using AI assistance for configuration and mapping.

## Active Work

*   Refine the data preview and editing functionality (`src/components/ez-convert/DataPreviewSection.tsx`, `src/components/ez-convert/EditDataModal.tsx`).
*   ✅ Integrate AI into the data mapping for XML configuration auto-detection, based on user provided XML sample.
    * ✅ Added XML AI Detection feature for automatically detecting XPath mappings
    * ✅ Implemented client-side XML structure analysis
    * ✅ Created user-friendly interface for reviewing and customizing detected mappings
*   Develop robust error handling for file uploads and data processing.
*   Develop robust Builder, that allows user to perform extensive operations with provided tools. (In Progress)
    * ✅ Added initial Builder UI with Undo, Redo, and Save buttons
    * ✅ Implemented Builder screen layout and data display
    * ✅ Implemented Value Swapper tool for standardizing column values
      * ✅ Added multi-value mapping mode with line breaks
      * ✅ Added support for automatically splitting comma-separated values
    * ✅ Implement additional data transformation tools
      * ✅ Added Unit Converter tool for standardizing measurements
        * ✅ Supports length units (mm, cm, m) and weight units (g, kg)
        * ✅ Handles inconsistent input formats (e.g., "1234", "500mm", "10m")
        * ✅ Automatically converts comma-separated values to multiple values
        * ✅ Standardizes output format to "00.00"
      * ✅ Added Attribute Detection tool for extracting multiple attributes from complex values
        * ✅ Detects patterns like "5 x max 10W led" and extracts quantity and wattage
        * ✅ Creates new columns for each detected attribute
        * ✅ Supports multiple pattern types (quantity & wattage, dimensions, value ranges)
        * ✅ Allows customization of new column names

## Backlog

*   Implement the full profile creation and management workflow, including saving and loading profiles (`src/components/ez-convert/ProfileManagementSection.tsx`).
*   Add support for more input file formats if needed.
*   Implement comprehensive testing (unit, integration, end-to-end).
*   Optimize performance for large files.
*   Improve UI/UX based on user feedback.
*   Set up deployment pipeline.
*   Overhaul of UI based on ShadCN

## Milestones

*   **Milestone 1: Core Conversion Flow (Completed/In Progress)** - Basic file upload, preview, and download functionality. (Largely implemented based on existing components).
*   **Milestone 2: Configuration & Mapping** - Partial integration of XML structures and data mappings.
*   **Milestone 3: Profile Management** - Ability to create, save, load, and manage manufacturer profiles.
*   **Milestone 4: Production Readiness** - Comprehensive testing, performance optimization, and deployment.

## Discovered Mid-Process

*   Handling the variety and complexity of real-world XML structures requires flexible parsing and mapping logic.
*   Implemenation of AI that provides relevant and accurate suggestions of XML mappings based on user provided sample.
*   Performance considerations for handling potentially large data files during processing and preview.