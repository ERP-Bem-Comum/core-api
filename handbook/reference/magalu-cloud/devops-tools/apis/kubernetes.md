# Kubernetes API Documentation

## Overview

The Kubernetes API provides endpoints for managing clusters, node pools, and configurations within Magalu Cloud. The API supports two regional servers: SE1 and NE1.

## Core Endpoints

### Cluster Management

**Create a Cluster**
- POST `/v0/clusters`
- Creates a Kubernetes cluster with customizable networking, node pools, and CIDR configurations
- Required parameters: cluster name, version, node pools
- Optional: description, allowed CIDR blocks, CNI selection

**List Clusters**
- GET `/v0/clusters`
- Retrieves all clusters for the authenticated user

**Get Cluster Details**
- GET `/v0/clusters/{cluster_id}`
- Returns comprehensive cluster information including control plane details and node pools

**Update Cluster**
- PATCH `/v0/clusters/{cluster_id}`
- Modifies allowed CIDR blocks and description

**Delete Cluster**
- DELETE `/v0/clusters/{cluster_id}`

**Retrieve Kubeconfig**
- GET `/v0/clusters/{cluster_id}/kubeconfig`
- Downloads cluster configuration file for kubectl access

### Node Pool Operations

**Create Node Pool**
- POST `/v0/clusters/{cluster_id}/node_pools`
- Adds nodes with specified flavor, replica count, and auto-scaling settings

**List Node Pools**
- GET `/v0/clusters/{cluster_id}/node_pools`
- Views all node pools within a cluster

**Get Node Pool Details**
- GET `/v0/clusters/{cluster_id}/node_pools/{node_pool_id}`

**Update Node Pool**
- PATCH `/v0/clusters/{cluster_id}/node_pools/{node_pool_id}`
- Adjusts replica count and auto-scaling parameters

**Delete Node Pool**
- DELETE `/v0/clusters/{cluster_id}/node_pools/{node_pool_id}`

**List Nodes**
- GET `/v0/clusters/{cluster_id}/node_pools/{node_pool_id}/nodes` (deprecated)
- Shows individual nodes within a pool

### Reference Data

**Available Flavors**
- GET `/v1/flavors`
- Lists machine types for nodes and control plane

**Available Versions**
- GET `/v1/versions`
- Shows supported Kubernetes versions with minimum requirements

## Authentication

All endpoints require:
- Bearer token authentication or OAuth2
- `x-tenant-id` header containing the user's UUID

## Configuration Options

**Cluster CIDR Settings:**
- Pod CIDR: Default "192.168.0.0/16"
- Services CIDR: Default "10.96.0.0/12"

**Node Pool Features:**
- Auto-scaling with configurable min/max replicas
- Multi-zone availability
- Custom taints and labels
- Pod density control (8-110 pods per node)
