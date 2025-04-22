# Project Package Dependencies

This document lists all base packages that the project depends on.

## Specific Library Counts

These counts represent the number of dependencies where the `targetClass` field in the JSONL data contains each specific library name. This helps quantify how many times your application code depends on classes from these libraries, which is useful for identifying vulnerability exposure.

| Library | Count |
|---------|-------|
| Spring | 1 |
| Hibernate | 1 |
| Jetty | 0 |

## Base Packages

### External Dependencies

- `cryptix.provider`
- `org.apache`
- `org.hibernate`
- `org.springframework`

### Internal Packages

- `com.example`

## Dependency Relationships

- `com.example` depends on:
  - `cryptix.provider`
  - `org.apache`
  - `org.hibernate`
  - `org.springframework`

## Package Details

### `com.example`

- **Type**: Internal Package
- **Sub-packages**: 1
- **Classes**: 1
- **Dependencies**: `org.apache`, `cryptix.provider`, `org.springframework`, `org.hibernate`

Includes these sub-packages:

- `com.example.sample.component.servicelocator.ejb`

### `cryptix.provider`

- **Type**: External Dependency
- **Sub-packages**: 1
- **Classes**: 1
- **Dependencies**: None

Includes these sub-packages:

- `cryptix.provider`

### `org.apache`

- **Type**: External Dependency
- **Sub-packages**: 3
- **Classes**: 3
- **Dependencies**: None

Includes these sub-packages:

- `org.apache.commons.lang`
- `org.apache.log4j`
- `org.apache.struts.actions`

### `org.hibernate`

- **Type**: External Dependency
- **Sub-packages**: 1
- **Classes**: 1
- **Dependencies**: None

Includes these sub-packages:

- `org.hibernate`

### `org.springframework`

- **Type**: External Dependency
- **Sub-packages**: 1
- **Classes**: 1
- **Dependencies**: None

Includes these sub-packages:

- `org.springframework.context`

