# Network API

## API Endpoints Overview

The Network API provides comprehensive resource management for VPC infrastructure. Main resource categories include:

### Ports
- Retrieve detailed port listings
- Delete individual ports
- Fetch specific port details
- Attach and detach security groups

### Public IPs
- List tenant's public IP addresses
- Delete public IPs
- Retrieve specific IP details
- Attach and detach IPs to/from ports

### Rules
- Delete security group rules
- Access rule details

### Security Groups
- List security groups by tenant
- Create new security groups
- Delete security groups
- Retrieve security group details
- Manage associated rules

### Subnet Pools
- List available subnet pools by tenant
- Create new subnet pools
- Delete pools by ID
- Retrieve specific pool details
- Book and unbook CIDR ranges

### Subnets
- Delete subnets
- Get subnet details
- Update subnet configurations

### VPCs
- List virtual private clouds
- Delete VPCs
- Get VPC details
- Manage associated ports, public IPs, and subnets
- Create new VPCs

### NAT Gateways
- List NAT gateways within a VPC
- Create new NAT gateway resources
- Delete NAT gateways
- Retrieve NAT gateway details

## VPC API Product (1.156.0)

**URL:** https://github.com/luizalabs

---

## Detailed Endpoint Documentation

### Ports

#### Details of a Port List
Returns detailed port information for provided tenant ID.

**Method:** GET `/v0/ports`

**Authorization:** OAuth2

**Query Parameters:**
- `port_id_list` (array): Port IDs to retrieve

**Headers:**
- `x-tenant-id` (required): Tenant identifier

**Response:** 200 - Successful, 422 - Validation Error

#### Delete Port

**Method:** DELETE `/v0/ports/{port_id}`

**Headers:**
- `x-tenant-id` (required)

**Response:** 204 - Successful

#### Port Details

**Method:** GET `/v0/ports/{port_id}`

**Response Example:**

```json
{
  "created_at": "2022-01-01 00:00:00",
  "description": "port description",
  "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "ip_address": [
    {
      "ip_address": "172.20.0.2",
      "subnet_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
    }
  ],
  "is_admin_state_up": true,
  "is_port_security_enabled": true,
  "name": "port_name",
  "public_ip": [
    {
      "public_ip": "100.94.5.31",
      "public_ip_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
    }
  ],
  "security_groups": [
    "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
  ],
  "updated": "2022-01-01 00:00:00",
  "vpc_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

#### Attach/Detach Security Group

- POST `/v0/ports/{port_id}/attach/{security_group_id}`
- POST `/v0/ports/{port_id}/detach/{security_group_id}`

### Public IPs

#### Tenant's Public IP List

**Method:** GET `/v0/public_ips`

**Response Example:**

```json
{
  "public_ips": [
    {
      "created_at": "2022-01-01 00:00:00",
      "description": "port description",
      "error": "error",
      "external_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
      "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
      "port_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
      "public_ip": "100.94.5.31",
      "status": "created",
      "updated": "2022-01-01 00:00:00",
      "vpc_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
    }
  ]
}
```

- DELETE `/v0/public_ips/{public_ip_id}`
- GET `/v0/public_ips/{public_ip_id}`
- POST `/v0/public_ips/{public_ip_id}/attach/{port_id}`
- POST `/v0/public_ips/{public_ip_id}/detach/{port_id}`

### Rules

- DELETE `/v0/rules/{rule_id}`
- GET `/v0/rules/{rule_id}`

**Response Example:**

```json
{
  "created_at": "2022-01-01 00:00:00",
  "description": "Some rule description",
  "direction": "egress",
  "ethertype": "IPv4",
  "external_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "port_range_max": 8028,
  "port_range_min": 8028,
  "protocol": "tcp",
  "remote_ip_prefix": "100.94.0.0/24",
  "security_group_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "status": "created"
}
```

### Security Groups

- GET `/v0/security_groups` — List by tenant
- POST `/v0/security_groups` — Create new

**Request Body Example:**

```json
{
  "name": "security_group_name",
  "description": "security group description"
}
```

- DELETE `/v0/security_groups/{security_group_id}`
- GET `/v0/security_groups/{security_group_id}`
- GET `/v0/security_groups/{security_group_id}/rules`
- POST `/v0/security_groups/{security_group_id}/rules`

**Create Rule Request Body Example:**

```json
{
  "direction": "egress",
  "ethertype": "IPv4",
  "port_range_min": 8028,
  "port_range_max": 8028,
  "protocol": "tcp",
  "remote_ip_prefix": "100.94.0.0/24",
  "description": "Some rule description"
}
```

### Subnet Pools

- GET `/v0/subnetpools` — List by tenant
- POST `/v0/subnetpools` — Create

**Request Body Example:**

```json
{
  "name": "some_subnet_pool",
  "description": "some description",
  "cidr": "172.26.0.0/16",
  "type": "default"
}
```

- DELETE `/v0/subnetpools/{subnetpool_id}`
- GET `/v0/subnetpools/{subnetpool_id}`
- POST `/v0/subnetpools/{subnetpool_id}/book_cidr`
- POST `/v0/subnetpools/{subnetpool_id}/unbook_cidr`

### Subnets

- DELETE `/v0/subnets/{subnet_id}`
- GET `/v0/subnets/{subnet_id}`
- PATCH `/v0/subnets/{subnet_id}` — Update DNS nameservers

```json
{ "dns_nameservers": ["8.8.8.8"] }
```

### VPCs

- GET `/v0/vpcs` — List VPCs
- DELETE `/v0/vpcs/{vpc_id}`
- GET `/v0/vpcs/{vpc_id}`
- GET `/v0/vpcs/{vpc_id}/ports`
- POST `/v0/vpcs/{vpc_id}/ports`

```json
{
  "name": "port_name",
  "has_pip": true,
  "has_sg": true,
  "subnets": ["xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"],
  "security_groups_id": ["xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"]
}
```

- GET `/v0/vpcs/{vpc_id}/public_ips`
- POST `/v0/vpcs/{vpc_id}/public_ips`

```json
{ "description": "public_ip_description" }
```

- GET `/v0/vpcs/{vpc_id}/subnets`
- POST `/v0/vpcs/{vpc_id}/subnets`

```json
{
  "name": "subnet_name",
  "description": "some_description",
  "cidr_block": "24",
  "ip_version": 4,
  "dns_nameservers": ["8.8.8.8"],
  "subnetpool_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

- POST `/v1/vpcs` — Create new VPC

```json
{ "name": "VPC Name", "description": "Description" }
```

### NAT Gateways

- GET `/v1/nat_gateways?vpc_id={...}` — List
- POST `/v1/nat_gateways` — Create

```json
{
  "name": "NatGateway Name",
  "description": "Description",
  "zone": "a",
  "vpc_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

- DELETE `/v1/nat_gateways/{nat_gateway_id}`
- GET `/v1/nat_gateways/{nat_gateway_id}`
