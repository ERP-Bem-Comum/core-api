# Turia IAM API Documentation

## Overview

Turia is an Identity and Access Management (IAM) API product (version 1.1.0) that enables organizations to manage members, roles, permissions, service accounts, and access control settings.

## Core Functionality

### Members Management
The API allows you to manage organization members through operations including:
- Listing members with optional email filtering
- Adding members or sending invitations
- Removing members by UUID
- Retrieving and modifying member grants (roles and permissions)
- Batch updating permissions across multiple members

### Roles & Permissions
You can create custom roles, manage role permissions, and retrieve available permissions:
- Create roles based on existing roles or from scratch
- Delete custom roles
- Add or remove permissions from roles
- View members assigned to specific roles
- Query all products and their associated permissions

### Service Accounts
Service accounts enable programmatic access:
- Create, list, update, and delete service accounts
- Generate and manage API keys for service accounts
- Set scopes for API key access
- Revoke compromised keys
- Update key metadata

### Access Control
Configure organization-wide security settings:
- Enable or disable access control
- Enforce multi-factor authentication (MFA)
- Retrieve current settings

### Groups Management
Organize members into groups with role-based profiles:
- Create and delete groups
- Add/remove members with specific profiles
- Update group descriptions
- List group members with pagination

### Additional Features
- Invitation management (send, resend, cancel)
- Scopes listing for API products
- Healthcheck endpoint for API status verification

## Authentication
All endpoints require OAuth2 authorization.

## Base URL
`https://api.magalu.cloud/iam/api/v1/`
