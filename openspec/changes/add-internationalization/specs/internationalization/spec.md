## ADDED Requirements
### Requirement: Localized UI text
The system SHALL provide localized UI strings for English and Romanian.

#### Scenario: English UI
- **WHEN** the user selects English
- **THEN** the UI renders all supported labels and messages in English

#### Scenario: Romanian UI
- **WHEN** the user selects Romanian
- **THEN** the UI renders all supported labels and messages in Romanian

### Requirement: Language selection persistence
The system SHALL persist the user's selected language across sessions.

#### Scenario: Persist preference
- **WHEN** the user changes the language
- **THEN** the system stores the preference and restores it on the next visit

### Requirement: Fallback language
The system SHALL fall back to English when a translation key is missing.

#### Scenario: Missing translation key
- **WHEN** a requested translation key is unavailable for the active language
- **THEN** the UI uses the English string for that key
