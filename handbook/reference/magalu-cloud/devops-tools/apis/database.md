# Database API Documentation

## Overview

The Database API (DBaaS API Product v2.33.3) provides comprehensive management capabilities for database instances, clusters, replicas, and snapshots through RESTful endpoints.

## Core Resources

### Engines
- List available database engines with filtering by status
- Retrieve specific engine details
- Access engine-specific parameters with dynamic/modifiable flags

### Instance Types
- Query available hardware templates defining RAM and vCPU allocation
- Filter by compatibility (single instance, cluster, replica)
- Match types to specific engines

### Instances
- Create, list, update, and delete database instances
- Manage instance lifecycle: start, stop, resize
- Configure backup retention (default 7 days) and backup timing
- Apply deletion protection
- Expand queries to include associated replicas

### Replicas
- Create read replicas asynchronously from source instances
- Manage replica lifecycle independently
- Support resize, start, and stop operations
- List replicas filtered by source instance

### Clusters
- Provision high-availability cluster deployments
- Execute cluster-level operations: resize, start, stop
- Update parameter groups and backup configurations
- Delete entire cluster infrastructure

### Snapshots
- Create on-demand and capture automated snapshots
- Restore instances from snapshots asynchronously
- Update snapshot metadata (name, description)
- Manage snapshot lifecycle across instances and clusters

## API Endpoints

Base URLs support regional deployment:
- `https://api.magalu.cloud/br-ne-1/database/v2/`
- `https://api.magalu.cloud/br-se1/database/v2/`

## Authentication

All endpoints require OAuth2 authorization via the `x-tenant-id` header for multi-tenant isolation.

## Response Standards

Paginated responses include metadata with offset, limit, count, total, and max_limit. Status codes indicate operation results: 202 for asynchronous operations, 200 for synchronous responses, with appropriate error codes (400, 401, 403, 404, 422, 500).
