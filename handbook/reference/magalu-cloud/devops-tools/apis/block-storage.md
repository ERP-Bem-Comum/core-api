# Block Storage

## Overview

Block Storage API Product (1.171.0) provides comprehensive operations for managing volumes, snapshots, backups, and related storage infrastructure in Magalu Cloud.

## Main Resources

### Volumes
Operations include:
- List all volumes with filtering and expansion options
- Create new volumes with configurable size and type
- Delete volumes (must be detached and without snapshots)
- Retrieve specific volume details
- Attach/detach volumes to/from instances
- Extend volume size
- Rename volumes
- Change volume type

**Key Rules:**
- Volume names must be unique
- Volumes cannot be deleted while attached or containing snapshots
- Both volume and instance must have "completed" status for attachment operations

### Volume Types
- List all volume types available in current region
- Filter by availability zone
- Retrieve disk type, IOPS, and status information

### Snapshots
Operations include:
- List, create, delete, and retrieve snapshots
- Rename snapshots
- Expand to show source volume details

**Constraints:** Cannot delete snapshots with restored volumes; cannot delete volumes with snapshots.

### Backups
Operations include:
- List, create, delete, and retrieve backups
- Copy backups across regions
- Rename backups
- Support for full and incremental backup types

### Attachments
- Attach volumes to instances
- Delete attachments (detach volumes)

### Usage
- Track quota consumption for disk and volumes

## API Endpoints

**Regions:**
- br-ne-1: `https://api.magalu.cloud/br-ne-1/block-storage/`
- br-se-1: `https://api.magalu.cloud/br-se-1/block-storage/`

## Authentication
All requests require `x-tenant-id` header.
