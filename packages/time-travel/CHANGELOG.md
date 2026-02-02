# @billsdk/time-travel

## 1.0.0

### Patch Changes

- Updated dependencies [3a20ed7]
  - @billsdk/core@0.4.0

## 0.2.1

### Patch Changes

- 8e7c232: Fixed visual flash when dragging badge to a new corner position

## 0.2.0

### Minor Changes

- ac0d009: Redesigned TimeTravelOverlay with improved UX and developer experience
  - Complete visual redesign with minimal sage-clay dark theme
  - Added draggable badge with snap-to-corners functionality
  - Replaced clock icon with BillSDK logo
  - Wider panel (308px) for better readability
  - Sharp corners throughout (removed all border-radius)
  - Simplified and consistent hover effects
  - Streamlined UI: removed Dry Run button, reorganized Go/Reset layout
  - Full-width date input for easier interaction
  - Modularized codebase into separate files for maintainability

## 0.1.1

### Patch Changes

- Updated dependencies [66c98fc]
  - @billsdk/core@0.3.1

## 0.1.0

### Features

- Initial release
- Time travel plugin for testing subscription cycles
- React overlay component for controlling simulated time
- Persistent simulated time state in database
- API endpoints for get/set/advance/reset time
- "Process Renewals" button in overlay for easy testing
