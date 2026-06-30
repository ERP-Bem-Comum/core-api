# Virtual Machines API Documentation

## Overview

The Virtual Machines API enables management of compute instances within Magalu Cloud, supporting operations like creation, deletion, startup, shutdown, and configuration modifications across multiple availability zones.

## Core Resources

### Instances
The primary compute resource offering the following capabilities:

- **List instances**: Retrieve all VMs in current tenant with optional expansion for detailed object information (image, machine-type, network)
- **Create instance**: Provision new VMs with specified image, machine type, SSH key, and network configuration
- **Retrieve details**: Access specific instance metadata and state information
- **Lifecycle management**: Start, stop, reboot, or suspend instances
- **Configuration**: Rename instances or change machine types
- **Network operations**: Attach/detach network interfaces

### Images
"Retrieve a list of images allowed for the current region" with platform specifications (Linux, etc.), version details, and lifecycle dates indicating end-of-life and support windows.

### Machine Types
Available hardware configurations displaying vCPU count, RAM allocation, disk capacity, GPU specifications, and SKU identifiers for sizing decisions.

### Snapshots
Point-in-time instance captures enabling:
- Creation from running instances
- Restoration to new VMs with different configurations
- Rename and delete operations

### Backups
Automated or manual instance backups supporting:
- Asynchronous creation with type classification (daily, etc.)
- Cross-region copying for disaster recovery
- Restoration with modified machine specifications
- Quota management (maximum 100 per VM)

## API Endpoints

Base URLs vary by region:
- **SE1**: `https://api.magalu.cloud/br-se1/compute/v1`
- **NE1**: `https://api.magalu.cloud/br-ne-1/compute/v1`

All endpoints support standard HTTP methods (GET, POST, PATCH, DELETE) with JSON request/response bodies.

## Query Parameters

Common filtering and pagination options include:
- `_limit`: Result count (default 50)
- `_offset`: Pagination position
- `_sort`: Field-based ordering (ascending/descending)
- `expand`: Detailed nested object retrieval
