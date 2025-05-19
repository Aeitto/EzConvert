# ShadCN Components Used in EzConvert

This file tracks the ShadCN components used throughout the EzConvert application.

## Core UI Components

- **Button**: Used for action buttons like "Open Builder", "Save Changes", "Back to Preview", etc.
- **Card**: Used for section containers including:
  - CardHeader
  - CardTitle
  - CardDescription
  - CardContent
- **Dialog**: Used for the Builder screen and tools modals, including:
  - DialogContent
  - DialogHeader
  - DialogTitle
  - DialogFooter
  - DialogClose
- **Select**: Used for column selection in the Swapper tool:
  - SelectContent
  - SelectItem
  - SelectTrigger
  - SelectValue
- **Popover**: Used for tool options:
  - PopoverContent
  - PopoverTrigger
- **Textarea**: Used for multi-line input in the Swapper tool
- **Switch**: Used for toggling options in the Builder tools
- **Tooltip**: Used for providing additional information:
  - TooltipContent
  - TooltipProvider
  - TooltipTrigger
- **Table**: Used for data display in both the data preview and builder sections:
  - TableHeader
  - TableBody
  - TableRow
  - TableHead
  - TableCell
- **ScrollArea**: Used for scrollable content with:
  - ScrollBar
- **Toast**: Used for notifications and feedback messages

## Form Components

- **Input**: Used for editing cell values and value mappings
- **Textarea**: Used for multi-line value mappings
- **Label**: Used for form labels
- **Switch**: Used for Boolean toggle controls

## Implemented Tools

- **Value Swapper**: Tool for mapping multiple values to standardized terms
  - Added support for multi-value mode with line breaks
  - Handles comma-separated values and converts them to multiple lines
- **Value Prefixer**: Tool for adding prefixes to column values
  - Provides suggested prefixes from predefined categories
  - Supports custom prefix entry
  - Includes a preview of changes before applying
- **Unit Converter**: Tool for converting values to standardized units
  - Supports length units (mm, cm, m) and weight units (g, kg)
  - Handles inconsistent input formats like "1234", "500mm", "10m", "14cm"
  - Automatically splits comma-separated values into multiple values
  - Formats all outputs to a consistent decimal format (00.00)
- **Attribute Detection**: Tool for extracting multiple attributes from complex text values
  - Detects patterns like "5 x max 10W led" and extracts quantity and wattage
  - Creates new columns for each detected attribute
  - Allows customization of new column names
  - Supports multiple pattern types including dimensions and value ranges
- **Header Swapper**: Tool for renaming column headers
  - Features real-time search for suggested standard headers
  - Easy selection from categorized header suggestions

## Planned Future Usage

For the complete Builder implementation, we plan to use additional components:
- **Tabs**: To organize different Builder tools
- **Separator**: For visual division between sections