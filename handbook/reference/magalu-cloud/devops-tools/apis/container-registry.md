# Container Registry

## Overview

The Container Registry API enables management of container registries, repositories, images, and proxy caches within Magalu Cloud.

## API Endpoints

### Credentials

**Get credentials for container registry**
- Endpoint: `GET /v0/credentials`
- Returns authentication credentials including username and password for Docker login

**Reset password**
- Endpoint: `POST /v0/credentials/password`
- Resets container registry user password

### Registries

**Create a container registry**
- Endpoint: `POST /v0/registries`
- Required: Registry name (lowercase, alphanumeric, max 63 characters)
- Optional: Proxy cache ID

**List all container registries**
- Endpoint: `GET /v0/registries`
- Supports filtering by name and sorting options

**Get registry information**
- Endpoint: `GET /v0/registries/{registry_id}`
- Returns storage usage and metadata

**Delete a container registry**
- Endpoint: `DELETE /v0/registries/{registry_id}`

### Repositories

**List repositories**
- Endpoint: `GET /v1/registries/{registry_id}/repositories`
- Filters available by repository name

**Get repository details**
- Endpoint: `GET /v1/registries/{registry_id}/repositories/{repository_id}`

**Delete repository**
- Endpoint: `DELETE /v1/registries/{registry_id}/repositories/{repository_id}`

### Images

**List images in repository**
- Endpoint: `GET /v1/registries/{registry_id}/repositories/{repository_id}/images`
- Expandable attributes: tags_details, extra_attr, manifest_media_type, media_type

**Get image details**
- Endpoint: `GET /v1/registries/{registry_id}/repositories/{repository_id}/images/{digest_or_tag}`

**Delete image**
- Endpoint: `DELETE /v1/registries/{registry_id}/repositories/{repository_id}/images/{digest_or_tag}`

### Proxy Caches

**Create proxy cache**
- Endpoint: `POST /v0/proxy-caches`
- Required: name, provider, URL
- Optional: access credentials, description

**List proxy caches**
- Endpoint: `GET /v0/proxy-caches`

**Get proxy cache details**
- Endpoint: `GET /v0/proxy-caches/{proxy_cache_id}`

**Update proxy cache**
- Endpoint: `PATCH /v0/proxy-caches/{proxy_cache_id}`

**Delete proxy cache**
- Endpoint: `DELETE /v0/proxy-caches/{proxy_cache_id}`

**Test connectivity**
- Endpoint: `POST /v0/proxy-caches/status`
- Validates credentials without persisting data

**Get proxy cache connection status**
- Endpoint: `GET /v0/proxy-caches/{proxy_cache_id}/status`

## API Servers

- SE1 region: `https://api.magalu.cloud/br-se1/container-registry/`
- NE1 region: `https://api.magalu.cloud/br-ne1/container-registry/`
