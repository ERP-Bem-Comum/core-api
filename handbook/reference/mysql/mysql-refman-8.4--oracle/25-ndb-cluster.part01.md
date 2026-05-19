\section*{Chapter 25 MySQL NDB Cluster 8.4}
Table of Contents
25.1 General Information ..... 3822
25.2 NDB Cluster Overview ..... 3824
25.2.1 NDB Cluster Core Concepts ..... 3826
25.2.2 NDB Cluster Nodes, Node Groups, Fragment Replicas, and Partitions ..... 3829
25.2.3 NDB Cluster Hardware, Software, and Networking Requirements ..... 3832
25.2.4 What is New in MySQL NDB Cluster 8.4 ..... 3833
25.2.5 Options, Variables, and Parameters Added, Deprecated or Removed in NDB 8.4 ..... 3837
25.2.6 MySQL Server Using InnoDB Compared with NDB Cluster ..... 3838
25.2.7 Known Limitations of NDB Cluster ..... 3840
25.3 NDB Cluster Installation ..... 3852
25.3.1 Installation of NDB Cluster on Linux ..... 3854
25.3.2 Installing NDB Cluster on Windows ..... 3862
25.3.3 Initial Configuration of NDB Cluster ..... 3871
25.3.4 Initial Startup of NDB Cluster ..... 3872
25.3.5 NDB Cluster Example with Tables and Data ..... 3873
25.3.6 Safe Shutdown and Restart of NDB Cluster ..... 3876
25.3.7 Upgrading and Downgrading NDB Cluster ..... 3877
25.4 Configuration of NDB Cluster ..... 3878
25.4.1 Quick Test Setup of NDB Cluster ..... 3878
25.4.2 Overview of NDB Cluster Configuration Parameters, Options, and Variables ..... 3880
25.4.3 NDB Cluster Configuration Files ..... 3902
25.4.4 Using High-Speed Interconnects with NDB Cluster ..... 4104
25.5 NDB Cluster Programs ..... 4105
25.5.1 ndbd - The NDB Cluster Data Node Daemon ..... 4105
25.5.2 ndbinfo_select_all — Select From ndbinfo Tables ..... 4114
25.5.3 ndbmtd — The NDB Cluster Data Node Daemon (Multi-Threaded) ..... 4119
25.5.4 ndb_mgmd — The NDB Cluster Management Server Daemon ..... 4120
25.5.5 ndb_mgm - The NDB Cluster Management Client ..... 4130
25.5.6 ndb_blob_tool — Check and Repair BLOB and TEXT columns of NDB Cluster Tables ..... 4135
25.5.7 ndb_config - Extract NDB Cluster Configuration Information ..... 4140
25.5.8 ndb_delete_all — Delete All Rows from an NDB Table ..... 4151
25.5.9 ndb_desc — Describe NDB Tables ..... 4154
25.5.10 ndb_drop_index - Drop Index from an NDB Table ..... 4163
25.5.11 ndb_drop_table - Drop an NDB Table ..... 4167
25.5.12 ndb_error_reporter — NDB Error-Reporting Utility ..... 4171
25.5.13 ndb_import - Import CSV Data Into NDB ..... 4172
25.5.14 ndb_index_stat — NDB Index Statistics Utility ..... 4185
25.5.15 ndb_move_data — NDB Data Copy Utility ..... 4191
25.5.16 ndb_perror — Obtain NDB Error Message Information ..... 4196
25.5.17 ndb_print_backup_file — Print NDB Backup File Contents ..... 4198
25.5.18 ndb_print_file — Print NDB Disk Data File Contents ..... 4202
25.5.19 ndb_print_frag_file - Print NDB Fragment List File Contents ..... 4203
25.5.20 ndb_print_schema_file - Print NDB Schema File Contents ..... 4204
25.5.21 ndb_print_sys_file - Print NDB System File Contents ..... 4204
25.5.22 ndb_redo_log_reader - Check and Print Content of Cluster Redo Log ..... 4204
25.5.23 ndb_restore - Restore an NDB Cluster Backup ..... 4206
25.5.24 ndb_secretsfile_reader_Obtain Key Information from an Encrypted NDB Data File ..... 4228
25.5.25 ndb_select_all — Print Rows from an NDB Table ..... 4230
25.5.26 ndb_select_count — Print Row Counts for NDB Tables ..... 4235
25.5.27 ndb_show_tables - Display List of NDB Tables ..... 4239
25.5.28 ndb_sign_keys — Create, Sign, and Manage TLS Keys and Certificates for NDB Cluster ..... 4243
25.5.29 ndb_size.pl — NDBCLUSTER Size Requirement Estimator ..... 4251
25.5.30 ndb_top - View CPU usage information for NDB threads ..... 4253
25.5.31 ndb_waiter - Wait for NDB Cluster to Reach a Given Status ..... 4258
25.5.32 ndbxfrm - Compress, Decompress, Encrypt, and Decrypt Files Created by NDB Cluster ..... 4264
25.6 Management of NDB Cluster ..... 4269
25.6.1 Commands in the NDB Cluster Management Client ..... 4270
25.6.2 NDB Cluster Log Messages ..... 4276
25.6.3 Event Reports Generated in NDB Cluster ..... 4294
25.6.4 Summary of NDB Cluster Start Phases ..... 4306
25.6.5 Performing a Rolling Restart of an NDB Cluster ..... 4308
25.6.6 NDB Cluster Single User Mode ..... 4310
25.6.7 Adding NDB Cluster Data Nodes Online ..... 4311
25.6.8 Online Backup of NDB Cluster ..... 4321
25.6.9 Importing Data Into MySQL Cluster ..... 4327
25.6.10 MySQL Server Usage for NDB Cluster ..... 4328
25.6.11 NDB Cluster Disk Data Tables ..... 4330
25.6.12 Online Operations with ALTER TABLE in NDB Cluster ..... 4336
25.6.13 Privilege Synchronization and NDB_STORED_USER ..... 4339
25.6.14 NDB API Statistics Counters and Variables ..... 4340
25.6.15 ndbinfo: The NDB Cluster Information Database ..... 4352
25.6.16 INFORMATION_SCHEMA Tables for NDB Cluster ..... 4440
25.6.17 NDB Cluster and the Performance Schema ..... 4441
25.6.18 Quick Reference: NDB Cluster SQL Statements ..... 4442
25.6.19 NDB Cluster Security ..... 4449
25.7 NDB Cluster Replication ..... 4462
25.7.1 NDB Cluster Replication: Abbreviations and Symbols ..... 4464
25.7.2 General Requirements for NDB Cluster Replication ..... 4464
25.7.3 Known Issues in NDB Cluster Replication ..... 4465
25.7.4 NDB Cluster Replication Schema and Tables ..... 4471
25.7.5 Preparing the NDB Cluster for Replication ..... 4478
25.7.6 Starting NDB Cluster Replication (Single Replication Channel) ..... 4480
25.7.7 Using Two Replication Channels for NDB Cluster Replication ..... 4482
25.7.8 Implementing Failover with NDB Cluster Replication ..... 4483
25.7.9 NDB Cluster Backups With NDB Cluster Replication ..... 4484
25.7.10 NDB Cluster Replication: Bidirectional and Circular Replication ..... 4490
25.7.11 NDB Cluster Replication Using the Multithreaded Applier ..... 4494
25.7.12 NDB Cluster Replication Conflict Resolution ..... 4497
25.8 NDB Cluster Release Notes ..... 4514

This chapter provides information about MySQL NDB Cluster, a high-availability, high-redundancy version of MySQL adapted for the distributed computing environment, as well as information specific to NDB Cluster 8.4 (NDB 8.4.7), based on version 8.4 of the NDB storage engine. See Section 25.2.4, "What is New in MySQL NDB Cluster 8.4", for information about differences in NDB 8.4 as compared to earlier releases. See MySQL NDB Cluster 8.0 for information about NDB Cluster 8.0. Both NDB 8.0 and NDB 8.4 are intended for use in production environments. NDB Cluster 7.6 and 7.5 are previous GA releases still supported in production, although new deployments can and should use either of MySQL NDB Cluster 8.0 or 8.4.

NDB Cluster 7.4 and older release series are no longer supported or maintained.

\subsection*{25.1 General Information}

MySQL NDB Cluster uses the MySQL server with the NDB storage engine. Support for the NDB storage engine is not included in standard MySQL Server 8.4 binaries built by Oracle. Instead, users of NDB

Cluster binaries from Oracle should upgrade to the most recent binary release of NDB Cluster for supported platforms-these include RPMs that should work with most Linux distributions. NDB Cluster 8.4 users who build from source should use the sources provided for MySQL 8.4 and build with the options required to provide NDB support. (Locations where the sources can be obtained are listed later in this section.)
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3853.jpg?height=106&width=104&top_left_y=502&top_left_x=365)

\section*{Important}

MySQL NDB Cluster does not support InnoDB Cluster, which must be deployed using MySQL Server InnoDB storage engine as well as additional applications that are not included in the NDB Cluster distribution. MySQL Server 8.4 binaries cannot be used with MySQL NDB Cluster. For more information about deploying and using InnoDB Cluster, see MySQL AdminAPI. Section 25.2.6, "MySQL Server Using InnoDB Compared with NDB Cluster", discusses differences between the NDB and InnoDB storage engines.

Supported Platforms. NDB Cluster is currently available and supported on a number of platforms. For exact levels of support available for on specific combinations of operating system versions, operating system distributions, and hardware platforms, please refer to https://www.mysql.com/support/ supportedplatforms/cluster.html.

Availability. NDB Cluster binary and source packages are available for supported platforms from https://dev.mysql.com/downloads/cluster/.

Version strings used in NDB Cluster software. The version string displayed by the mysql client supplied with the MySQL NDB Cluster distribution uses this format:
mysql-mysql_server_version-cluster
mysql_server_version represents the version of the MySQL Server on which the NDB Cluster release is based. Building from source using -DWITH_NDB or the equivalent adds the -cluster suffix to the version string. (See Section 25.3.1.4, "Building NDB Cluster from Source on Linux", and Section 25.3.2.2, "Compiling and Installing NDB Cluster from Source on Windows".) You can see this format used in the mysql client, as shown here:
```
$> mysql
Welcome to the MySQL monitor. Commands end with ; or \g.
Your MySQL connection id is 2
Server version: 8.4.7-cluster Source distribution
Type 'help;' or '\h' for help. Type '\c' to clear the buffer.
mysql> SELECT VERSION()\G
************************** 1. row ******************************
VERSION(): 8.4.7-cluster
1 row in set (0.00 sec)
```


The version string displayed by other NDB Cluster programs not normally included with the MySQL 8.4 distribution uses this format:
```
mysql-mysql_server_version ndb-ndb_engine_version
```

mysql_server_version represents the version of the MySQL Server on which the NDB Cluster release is based. For NDB Cluster 8.4, this is $8.4 . n$, where $n$ is the release number. ndb_engine_version is the version of the NDB storage engine used by this release of the NDB Cluster software. For NDB 8.4, this number is the same as the MySQL Server version. You can see this format used in the output of the SHOW command in the ndb_mgm client, like this:
```
ndb_mgm> SHOW
Connected to Management Server at: localhost:1186 (using cleartext)
Cluster Configuration
----------------------
[ndbd(NDB)] 2 node(s)
```

```
id=1 @10.0.10.6 (mysql-8.4.7 ndb-8.4.7, Nodegroup: 0, *)
id=2 @10.0.10.8 (mysql-8.4.7 ndb-8.4.7, Nodegroup: 0)
[ndb_mgmd(MGM)] 1 node(s)
id=3 @10.0.10.2 (mysql-8.4.7 ndb-8.4.7)
[mysqld(API)] 2 node(s)
id=4 @10.0.10.10 (mysql-8.4.7 ndb-8.4.7)
id=5 (not connected, accepting connect from any host)
```


Compatibility with standard MySQL 8.4 releases. While many standard MySQL schemas and applications can work using NDB Cluster, it is also true that unmodified applications and database schemas may be slightly incompatible or have suboptimal performance when run using NDB Cluster (see Section 25.2.7, "Known Limitations of NDB Cluster"). Most of these issues can be overcome, but this also means that you are very unlikely to be able to switch an existing application datastorethat currently uses, for example, MyISAM or InnoDB-to use the NDB storage engine without allowing for the possibility of changes in schemas, queries, and applications. A mysqld compiled without NDB support (that is, built without - DWITH_NDB or - DWITH_NDBCLUSTER_STORAGE_ENGINE) cannot function as a drop-in replacement for a mysqld that is built with it.

NDB Cluster development source trees. NDB Cluster development trees can also be accessed from https://github.com/mysql/mysql-server.

The NDB Cluster development sources maintained at https://github.com/mysql/mysql-server are licensed under the GPL. For information about obtaining MySQL sources using Git and building them yourself, see Section 2.8.5, "Installing MySQL Using a Development Source Tree".

\begin{figure}
\includegraphics[alt={},max width=\textwidth]{https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3854.jpg?height=118&width=99&top_left_y=1283&top_left_x=306}
\captionsetup{labelformat=empty}
\caption{Note}
\end{figure}

As with MySQL Server 8.4, NDB Cluster 8.4 releases are built using CMake.

NDB Cluster 8.4 is available as an LTS release, and is recommended for new deployments. NDB Cluster 8.0 is the previous GA release series (see MySQL NDB Cluster 8.0), still supported in production. NDB Cluster 7.6 and 7.5 are earlier GA releases still supported in production, although we recommend NDB Cluster 8.4 for new deployments intended for use in production.

NDB Cluster 7.4 and 7.3 were previous GA releases which have been discontinued; they are no longer maintained or supported.

Additional information regarding NDB Cluster can be found on the MySQL website at https:// www.mysql.com/products/cluster/.

Additional Resources. More information about NDB Cluster can be found in the following places:
- For answers to some commonly asked questions about NDB Cluster, see Section A.10, "MySQL 8.4 FAQ: NDB Cluster".
- The NDB Cluster Forum: https://forums.mysql.com/list.php?25.
- Many NDB Cluster users and developers blog about their experiences with NDB Cluster, and make feeds of these available through PlanetMySQL.

\subsection*{25.2 NDB Cluster Overview}

NDB Cluster is a technology that enables clustering of in-memory databases in a shared-nothing system. The shared-nothing architecture enables the system to work with very inexpensive hardware, and with a minimum of specific requirements for hardware or software.

NDB Cluster is designed not to have any single point of failure. In a shared-nothing system, each component is expected to have its own memory and disk, and the use of shared storage mechanisms such as network shares, network file systems, and SANs is not recommended or supported.

NDB Cluster integrates the standard MySQL server with an in-memory clustered storage engine called NDB (which stands for "Network DataBase"). In our documentation, the term NDB refers to the part of the setup that is specific to the storage engine, whereas "MySQL NDB Cluster" refers to the combination of one or more MySQL servers with the NDB storage engine.

An NDB Cluster consists of a set of computers, known as hosts, each running one or more processes. These processes, known as nodes, may include MySQL servers (for access to NDB data), data nodes (for storage of the data), one or more management servers, and possibly other specialized data access programs. The relationship of these components in an NDB Cluster is shown here:

\begin{figure}
\captionsetup{labelformat=empty}
\caption{Figure 25.1 NDB Cluster Components}
\includegraphics[alt={},max width=\textwidth]{https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3855.jpg?height=1176&width=1504&top_left_y=721&top_left_x=349}
\end{figure}

All these programs work together to form an NDB Cluster (see Section 25.5, "NDB Cluster Programs". When data is stored by the NDB storage engine, the tables (and table data) are stored in the data nodes. Such tables are directly accessible from all other MySQL servers (SQL nodes) in the cluster. Thus, in a payroll application storing data in a cluster, if one application updates the salary of an employee, all other MySQL servers that query this data can see this change immediately.

An NDB Cluster 8.4 SQL node uses the mysqld server daemon, which is the same as the mysqld supplied with MySQL Server 8.4 distributions. You should keep in mind that an instance of mysqld, regardless of version, that is not connected to an NDB Cluster cannot use the NDB storage engine and cannot access any NDB Cluster data.

The data stored in the data nodes for NDB Cluster can be mirrored; the cluster can handle failures of individual data nodes with no other impact than that a small number of transactions are aborted due to losing the transaction state. Because transactional applications are expected to handle transaction failure, this should not be a source of problems.

Individual nodes can be stopped and restarted, and can then rejoin the system (cluster). Rolling restarts (in which all nodes are restarted in turn) are used in making configuration changes and
software upgrades (see Section 25.6.5, "Performing a Rolling Restart of an NDB Cluster"). Rolling restarts are also used as part of the process of adding new data nodes online (see Section 25.6.7, "Adding NDB Cluster Data Nodes Online"). For more information about data nodes, how they are organized in an NDB Cluster, and how they handle and store NDB Cluster data, see Section 25.2.2, "NDB Cluster Nodes, Node Groups, Fragment Replicas, and Partitions".

Backing up and restoring NDB Cluster databases can be done using the NDB-native functionality found in the NDB Cluster management client and the ndb_restore program included in the NDB Cluster distribution. For more information, see Section 25.6.8, "Online Backup of NDB Cluster", and Section 25.5.23, "ndb_restore - Restore an NDB Cluster Backup". You can also use the standard MySQL functionality provided for this purpose in mysqldump and the MySQL server. See Section 6.5.4, "mysqldump - A Database Backup Program", for more information.

NDB Cluster nodes can employ different transport mechanisms for inter-node communications; TCP/IP over standard 100 Mbps or faster Ethernet hardware is used in most real-world deployments.

\subsection*{25.2.1 NDB Cluster Core Concepts}

NDBCLUSTER (also known as NDB) is an in-memory storage engine offering high-availability and datapersistence features.

The NDBCLUSTER storage engine can be configured with a range of failover and load-balancing options, but it is easiest to start with the storage engine at the cluster level. NDB Cluster's NDB storage engine contains a complete set of data, dependent only on other data within the cluster itself.

The "Cluster" portion of NDB Cluster is configured independently of the MySQL servers. In an NDB Cluster, each part of the cluster is considered to be a node.

\section*{Note}

In many contexts, the term "node" is used to indicate a computer, but when discussing NDB Cluster it means a process. It is possible to run multiple nodes on a single computer; for a computer on which one or more cluster nodes are being run we use the term cluster host.

There are three types of cluster nodes, and in a minimal NDB Cluster configuration, there are at least three nodes, one of each of these types:
- Management node: The role of this type of node is to manage the other nodes within the NDB Cluster, performing such functions as providing configuration data, starting and stopping nodes, and running backups. Because this node type manages the configuration of the other nodes, a node of this type should be started first, before any other node. A management node is started with the command ndb_mgmd.
- Data node: This type of node stores cluster data. There are as many data nodes as there are fragment replicas, times the number of fragments (see Section 25.2.2, "NDB Cluster Nodes, Node Groups, Fragment Replicas, and Partitions"). For example, with two fragment replicas, each having two fragments, you need four data nodes. One fragment replica is sufficient for data storage, but provides no redundancy; therefore, it is recommended to have two (or more) fragment replicas to provide redundancy, and thus high availability. A data node is started with the command ndbd (see Section 25.5.1, "ndbd - The NDB Cluster Data Node Daemon") or ndbmtd (see Section 25.5.3, "ndbmtd - The NDB Cluster Data Node Daemon (Multi-Threaded)").

NDB Cluster tables are normally stored completely in memory rather than on disk (this is why we refer to NDB Cluster as an in-memory database). However, some NDB Cluster data can be stored on disk; see Section 25.6.11, "NDB Cluster Disk Data Tables", for more information.
- SQL node: This is a node that accesses the cluster data. In the case of NDB Cluster, an SQL node is a traditional MySQL server that uses the NDBCLUSTER storage engine. An SQL node is a mysqld
process started with the --ndbcluster and --ndb-connectstring options, which are explained elsewhere in this chapter, possibly with additional MySQL server options as well.

An SQL node is actually just a specialized type of API node, which designates any application which accesses NDB Cluster data. Another example of an API node is the ndb_restore utility that is used to restore a cluster backup. It is possible to write such applications using the NDB API. For basic information about the NDB API, see Getting Started with the NDB API.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3857.jpg?height=255&width=284&top_left_y=566&top_left_x=349)

> Important
> It is not realistic to expect to employ a three-node setup in a production environment. Such a configuration provides no redundancy; to benefit from NDB Cluster's high-availability features, you must use multiple data and SQL nodes. The use of multiple management nodes is also highly recommended.

For a brief introduction to the relationships between nodes, node groups, fragment replicas, and partitions in NDB Cluster, see Section 25.2.2, "NDB Cluster Nodes, Node Groups, Fragment Replicas, and Partitions".

Configuration of a cluster involves configuring each individual node in the cluster and setting up individual communication links between nodes. NDB Cluster is currently designed with the intention that data nodes are homogeneous in terms of processor power, memory space, and bandwidth. In addition, to provide a single point of configuration, all configuration data for the cluster as a whole is located in one configuration file.

The management server manages the cluster configuration file and the cluster log. Each node in the cluster retrieves the configuration data from the management server, and so requires a way to determine where the management server resides. When interesting events occur in the data nodes, the nodes transfer information about these events to the management server, which then writes the information to the cluster log.

In addition, there can be any number of cluster client processes or applications. These include standard MySQL clients, NDB-specific API programs, and management clients. These are described in the next few paragraphs.

Standard MySQL clients. NDB Cluster can be used with existing MySQL applications written in PHP, Perl, C, C++, Java, Python, and so on. Such client applications send SQL statements to and receive responses from MySQL servers acting as NDB Cluster SQL nodes in much the same way that they interact with standalone MySQL servers.

MySQL clients using an NDB Cluster as a data source can be modified to take advantage of the ability to connect with multiple MySQL servers to achieve load balancing and failover. For example, Java clients using Connector/J 5.0.6 and later can use jdbc:mysql: loadbalance:// URLs (improved in Connector/J 5.1.7) to achieve load balancing transparently; for more information about using Connector/J with NDB Cluster, see Using Connector/J with NDB Cluster.

NDB client programs. Client programs can be written that access NDB Cluster data directly from the NDBCLUSTER storage engine, bypassing any MySQL Servers that may be connected to the cluster, using the NDB API, a high-level C++ API. Such applications may be useful for specialized purposes where an SQL interface to the data is not needed. For more information, see The NDB API.

NDB-specific Java applications can also be written for NDB Cluster using the NDB Cluster Connector for Java. This NDB Cluster Connector includes ClusterJ, a high-level database API similar to objectrelational mapping persistence frameworks such as Hibernate and JPA that connect directly to NDBCLUSTER, and so does not require access to a MySQL Server. See Java and NDB Cluster, and The ClusterJ API and Data Object Model, for more information.

NDB Cluster also supports applications written in JavaScript using Node.js. The MySQL Connector for JavaScript includes adapters for direct access to the NDB storage engine and as well as for the MySQL Server. Applications using this Connector are typically event-driven and use a domain object
model similar in many ways to that employed by ClusterJ. For more information, see MySQL NoSQL Connector for JavaScript.

Management clients. These clients connect to the management server and provide commands for starting and stopping nodes gracefully, starting and stopping message tracing (debug versions only), showing node versions and status, starting and stopping backups, and so on. An example of this type of program is the ndb_mgm management client supplied with NDB Cluster (see Section 25.5.5, "ndb_mgm - The NDB Cluster Management Client"). Such applications can be written using the MGM API, a C-language API that communicates directly with one or more NDB Cluster management servers. For more information, see The MGM API.

Oracle also makes available MySQL Cluster Manager, which provides an advanced command-line interface simplifying many complex NDB Cluster management tasks, such restarting an NDB Cluster with a large number of nodes. The MySQL Cluster Manager client also supports commands for getting and setting the values of most node configuration parameters as well as mysqld server options and variables relating to NDB Cluster. See MySQL Cluster Manager 8.4.9 User Manual, for more information.

Event logs. NDB Cluster logs events by category (startup, shutdown, errors, checkpoints, and so on), priority, and severity. A complete listing of all reportable events may be found in Section 25.6.3, "Event Reports Generated in NDB Cluster". Event logs are of the two types listed here:
- Cluster log: Keeps a record of all desired reportable events for the cluster as a whole.
- Node log: A separate log which is also kept for each individual node.

\section*{Note}

Under normal circumstances, it is necessary and sufficient to keep and examine only the cluster log. The node logs need be consulted only for application development and debugging purposes.

Checkpoint. Generally speaking, when data is saved to disk, it is said that a checkpoint has been reached. More specific to NDB Cluster, a checkpoint is a point in time where all committed transactions are stored on disk. With regard to the NDB storage engine, there are two types of checkpoints which work together to ensure that a consistent view of the cluster's data is maintained. These are shown in the following list:
- Local Checkpoint (LCP): This is a checkpoint that is specific to a single node; however, LCPs take place for all nodes in the cluster more or less concurrently. An LCP usually occurs every few minutes; the precise interval varies, and depends upon the amount of data stored by the node, the level of cluster activity, and other factors.

NDB 8.4 supports partial LCPs, which can significantly improve performance under some conditions. See the descriptions of the EnablePartialLcp and RecoveryWork configuration parameters which enable partial LCPs and control the amount of storage they use.
- Global Checkpoint (GCP): A GCP occurs every few seconds, when transactions for all nodes are synchronized and the redo-log is flushed to disk.

For more information about the files and directories created by local checkpoints and global checkpoints, see NDB Cluster Data Node File System Directory.

Transporter. We use the term transporter for the data transport mechanism employed between data nodes. MySQL NDB Cluster 8.4 supports three of these, which are listed here:
- TCP/IP over Ethernet. See Section 25.4.3.10, "NDB Cluster TCP/IP Connections".
- Direct TCP/IP. Uses machine-to-machine connections. See Section 25.4.3.11, "NDB Cluster TCP/IP Connections Using Direct Connections".

Although this transporter uses the same TCP/IP protocol as mentioned in the previous item, it requires setting up the hardware differently and is configured differently as well. For this reason, it is considered a separate transport mechanism for NDB Cluster.
- Shared memory (SHM). See Section 25.4.3.12, "NDB Cluster Shared-Memory Connections".

Because it is ubiquitous, most users employ TCP/IP over Ethernet for NDB Cluster.
Regardless of the transporter used, NDB attempts to make sure that communication between data node processes is performed using chunks that are as large as possible since this benefits all types of data transmission.

\subsection*{25.2.2 NDB Cluster Nodes, Node Groups, Fragment Replicas, and Partitions}

This section discusses the manner in which NDB Cluster divides and duplicates data for storage.
A number of concepts central to an understanding of this topic are discussed in the next few paragraphs.

Data node. An ndbd or ndbmtd process, which stores one or more fragment replicas-that is, copies of the partitions (discussed later in this section) assigned to the node group of which the node is a member.

Each data node should be located on a separate computer. While it is also possible to host multiple data node processes on a single computer, such a configuration is not usually recommended.

It is common for the terms "node" and "data node" to be used interchangeably when referring to an ndbd or ndbmtd process; where mentioned, management nodes (ndb_mgmd processes) and SQL nodes (mysqld processes) are specified as such in this discussion.

Node group. A node group consists of one or more nodes, and stores partitions, or sets of fragment replicas (see next item).

The number of node groups in an NDB Cluster is not directly configurable; it is a function of the number of data nodes and of the number of fragment replicas (NoOfReplicas configuration parameter), as shown here:
[\# of node groups] = [\# of data nodes] / NoOfReplicas
Thus, an NDB Cluster with 4 data nodes has 4 node groups if NoOfReplicas is set to 1 in the config.ini file, 2 node groups if NoOfReplicas is set to 2 , and 1 node group if NoOfReplicas is set to 4. Fragment replicas are discussed later in this section; for more information about No0fReplicas, see Section 25.4.3.6, "Defining NDB Cluster Data Nodes".

Note
All node groups in an NDB Cluster must have the same number of data nodes.

You can add new node groups (and thus new data nodes) online, to a running NDB Cluster; see Section 25.6.7, "Adding NDB Cluster Data Nodes Online", for more information.

Partition. This is a portion of the data stored by the cluster. Each node is responsible for keeping at least one copy of any partitions assigned to it (that is, at least one fragment replica) available to the cluster.

The number of partitions used by default by NDB Cluster depends on the number of data nodes and the number of LDM threads in use by the data nodes, as shown here:
[\# of partitions] = [\# of data nodes] * [\# of LDM threads]
When using data nodes running ndbmtd, the number of LDM threads is controlled by the setting for MaxNoOfExecutionThreads. When using ndbd there is a single LDM thread, which means that there are as many cluster partitions as nodes participating in the cluster. This is also the case when using ndbmtd with MaxNoOfExecutionThreads set to 3 or less. (You should be aware that the number of LDM threads increases with the value of this parameter, but not in a strictly linear fashion, and that there are additional constraints on setting it; see the description of MaxNoOfExecutionThreads for more information.)

NDB and user-defined partitioning. NDB Cluster normally partitions NDBCLUSTER tables automatically. However, it is also possible to employ user-defined partitioning with NDBCLUSTER tables. This is subject to the following limitations:
1. Only the KEY and LINEAR KEY partitioning schemes are supported in production with NDB tables.
2. The maximum number of partitions that may be defined explicitly for any NDB table is 8 * [number of LDM threads] * [number of node groups], the number of node groups in an NDB Cluster being determined as discussed previously in this section. When running ndbd for data node processes, setting the number of LDM threads has no effect (since ThreadConfig applies only to ndbmtd); in such cases, this value can be treated as though it were equal to 1 for purposes of performing this calculation.

See Section 25.5.3, "ndbmtd - The NDB Cluster Data Node Daemon (Multi-Threaded)", for more information.

For more information relating to NDB Cluster and user-defined partitioning, see Section 25.2.7, "Known Limitations of NDB Cluster", and Section 26.6.2, "Partitioning Limitations Relating to Storage Engines".

Fragment replica. This is a copy of a cluster partition. Each node in a node group stores a fragment replica. Also sometimes known as a partition replica. The number of fragment replicas is equal to the number of nodes per node group.

A fragment replica belongs entirely to a single node; a node can (and usually does) store several fragment replicas.

The following diagram illustrates an NDB Cluster with four data nodes running ndbd, arranged in two node groups of two nodes each; nodes 1 and 2 belong to node group 0, and nodes 3 and 4 belong to node group 1.

\section*{Note}

Only data nodes are shown here; although a working NDB Cluster requires an ndb_mgmd process for cluster management and at least one SQL node to access the data stored by the cluster, these have been omitted from the figure for clarity.

\begin{figure}
\captionsetup{labelformat=empty}
\caption{Figure 25.2 NDB Cluster with Two Node Groups}
\includegraphics[alt={},max width=\textwidth]{https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3861.jpg?height=1114&width=1013&top_left_y=317&top_left_x=349}
\end{figure}

The data stored by the cluster is divided into four partitions, numbered $0,1,2$, and 3 . Each partition is stored-in multiple copies-on the same node group. Partitions are stored on alternate node groups as follows:
- Partition 0 is stored on node group 0 ; a primary fragment replica (primary copy) is stored on node 1 , and a backup fragment replica (backup copy of the partition) is stored on node 2.
- Partition 1 is stored on the other node group (node group 1 ); this partition's primary fragment replica is on node 3 , and its backup fragment replica is on node 4 .
- Partition 2 is stored on node group 0 . However, the placing of its two fragment replicas is reversed from that of Partition 0; for Partition 2, the primary fragment replica is stored on node 2, and the backup on node 1.
- Partition 3 is stored on node group 1, and the placement of its two fragment replicas are reversed from those of partition 1. That is, its primary fragment replica is located on node 4, with the backup on node 3.

What this means regarding the continued operation of an NDB Cluster is this: so long as each node group participating in the cluster has at least one node operating, the cluster has a complete copy of all data and remains viable. This is illustrated in the next diagram.

\begin{figure}
\captionsetup{labelformat=empty}
\caption{Figure 25.3 Nodes Required for a 2x2 NDB Cluster}
\includegraphics[alt={},max width=\textwidth]{https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3862.jpg?height=684&width=695&top_left_y=312&top_left_x=285}
\end{figure}

In this example, the cluster consists of two node groups each consisting of two data nodes. Each data node is running an instance of ndbd. Any combination of at least one node from node group 0 and at least one node from node group 1 is sufficient to keep the cluster "alive". However, if both nodes from a single node group fail, the combination consisting of the remaining two nodes in the other node group is not sufficient. In this situation, the cluster has lost an entire partition and so can no longer provide access to a complete set of all NDB Cluster data.

The maximum number of node groups supported for a single NDB Cluster instance is 48 .

\subsection*{25.2.3 NDB Cluster Hardware, Software, and Networking Requirements}

One of the strengths of NDB Cluster is that it can be run on commodity hardware and has no unusual requirements in this regard, other than for large amounts of RAM, due to the fact that all live data storage is done in memory. (It is possible to reduce this requirement using Disk Data tables-see Section 25.6.11, "NDB Cluster Disk Data Tables", for more information about these.) You can obtain information about memory usage by data nodes by viewing the ndbinfo. memoryusage table, or the output of the REPORT MemoryUsage command in the ndb_mgm client. For information about memory used by NDB tables, you can query the ndbinfo.memory_per_fragment table.

Increasing the number of CPUs, using faster CPUs, or both, on the computers hosting data nodes can generally be expected to enhance the performance of NDB Cluster. Memory requirements for cluster processes other than the data nodes are relatively small.

The software requirements for NDB Cluster are also modest. Host operating systems do not require any unusual modules, services, applications, or configuration to support NDB Cluster. For supported operating systems, a standard installation should be sufficient. The MySQL software requirements are simple: all that is needed is a production release of NDB Cluster. It is not strictly necessary to compile MySQL yourself merely to be able to use NDB Cluster. We assume that you are using the binaries appropriate to your platform, available from the NDB Cluster software downloads page at https:// dev.mysql.com/downloads/cluster/.

For communication between nodes, NDB Cluster supports TCP/IP networking in any standard topology, and the minimum expected for each host is a standard 100 Mbps Ethernet card, plus a switch, hub, or router to provide network connectivity for the cluster as a whole.

We strongly recommend that an NDB Cluster be run on its own subnet which is not shared with machines not forming part of the cluster; using a private or protected network allows the cluster to make exclusive use of bandwidth between cluster hosts. Using a separate switch for your NDB Cluster installation not only helps protect against unauthorized access to data stored in the cluster, but also ensures that cluster nodes are shielded from interference caused by transmissions between
other computers on the network. For enhanced reliability, you can use dual switches and dual cards to remove the network as a single point of failure; many device drivers support failover for such communication links.

NDB supports encrypted live and backup files and file systems, as discussed in Section 25.6.19.4, "File System Encryption for NDB Cluster". Section 25.6.19.5, "TLS Link Encryption for NDB Cluster", provides information about enabling support for encrypted connections between nodes. Encrypted backups can be read by many NDB command-line programs including ndb_restore, ndbxfrm, ndb_print_backup_file, and ndb_mgm. See Section 25.6.8.2, "Using The NDB Cluster Management Client to Create a Backup", for more information about creating encypted backups.

NDB Cluster also supports encrypted network connections between nodes; see Section 25.6.19.4, "File System Encryption for NDB Cluster", for details.

Network communication and latency. NDB Cluster requires communication between data nodes and API nodes (including SQL nodes), as well as between data nodes and other data nodes, to execute queries and updates. Communication latency between these processes can directly affect the observed performance and latency of user queries. In addition, to maintain consistency and service despite the silent failure of nodes, NDB Cluster uses heartbeating and timeout mechanisms which treat an extended loss of communication from a node as node failure. This can lead to reduced redundancy. Recall that, to maintain data consistency, an NDB Cluster shuts down when the last node in a node group fails. Thus, to avoid increasing the risk of a forced shutdown, breaks in communication between nodes should be avoided wherever possible.

The failure of a data or API node results in the abort of all uncommitted transactions involving the failed node. Data node recovery requires synchronization of the failed node's data from a surviving data node, and re-establishment of disk-based redo and checkpoint logs, before the data node returns to service. This recovery can take some time, during which the Cluster operates with reduced redundancy.

Heartbeating relies on timely generation of heartbeat signals by all nodes. This may not be possible if the node is overloaded, has insufficient machine CPU due to sharing with other programs, or is experiencing delays due to swapping. If heartbeat generation is sufficiently delayed, other nodes treat the node that is slow to respond as failed.

This treatment of a slow node as a failed one may or may not be desirable in some circumstances, depending on the impact of the node's slowed operation on the rest of the cluster. When setting timeout values such as HeartbeatIntervalDbDb and HeartbeatIntervalDbApi for NDB Cluster, care must be taken care to achieve quick detection, failover, and return to service, while avoiding potentially expensive false positives.

Where communication latencies between data nodes are expected to be higher than would be expected in a LAN environment (on the order of $100 \mu \mathrm{~s}$ ), timeout parameters must be increased to ensure that any allowed periods of latency periods are well within configured timeouts. Increasing timeouts in this way has a corresponding effect on the worst-case time to detect failure and therefore time to service recovery.

LAN environments can typically be configured with stable low latency, and such that they can provide redundancy with fast failover. Individual link failures can be recovered from with minimal and controlled latency visible at the TCP level (where NDB Cluster normally operates). WAN environments may offer a range of latencies, as well as redundancy with slower failover times. Individual link failures may require route changes to propagate before end-to-end connectivity is restored. At the TCP level this can appear as large latencies on individual channels. The worst-case observed TCP latency in these scenarios is related to the worst-case time for the IP layer to reroute around the failures.

\subsection*{25.2.4 What is New in MySQL NDB Cluster 8.4}
- What is New in NDB Cluster 8.4
- Changes in NDB 8.x Innovation Releases

The following sections describe changes in the implementation of MySQL NDB Cluster in NDB Cluster 8.0 through 8.0.44, as compared to earlier release series.

NDB Cluster 8.4 is also available for production; while NDB 8.0 is still supported, we suggest that you use NDB 8.4 for new deployments; for more information, see Chapter 25, MySQL NDB Cluster 8.4. NDB Cluster 9.4 is available as an Innovation release for new features currently under development; see What is New in NDB Cluster 9.4.

NDB Cluster 7.6 (see What is New in NDB Cluster 7.6) is a previous GA release which is still supported in production, although we recommend that new deployments for production use MySQL NDB Cluster 8.4. NDB Cluster 7.5, 7.4, and 7.3 were previous GA releases which have reached their end of life, and are no longer supported or maintained. We recommend that new deployments for production use MySQL NDB Cluster 8.4.

\section*{What is New in NDB Cluster 8.4}

Major changes and new features in NDB Cluster 8.4 which are likely to be of interest are listed here:
- ndbinfo transporter_details table. The transporter_details table provides information about individual transporters used in an NDB cluster. It is otherwise similar to the ndbinfo transporters table, which provides such information in aggregate form.

NDB 8.4.0 provides additional columns as compared to the version introduced in NDB 8.0. These new columns, along with brief dscriptions of each, are listed here:
- sendbuffer_used_bytes: Number of bytes of signal data currently stored pending send using this transporter.
- sendbuffer_max_used_bytes: Historical maximum number of bytes of signal data stored pending send using this transporter. Reset when the transporter connects.
- sendbuffer_alloc_bytes: Number of bytes of send buffer currently allocated to store pending send bytes for this transporter. Send buffer memory is allocated in large blocks which may be sparsely used.
- sendbuffer_max_alloc_bytes: Historical maximum number of bytes of send buffer allocated to store pending send bytes for this transporter.

NDB 8.4.1 adds a type column, which displays the transport's connection type (TCP or SHM).
See Section 25.6.15.65, "The ndbinfo transporter_details Table", for more information.
- NDB Replication: Filtering of unused updates. Previously, when SQL nodes performing binary logging used log_replica_updates=0FF, any replicated updates which were applied on a replica NDB cluster were sent on to the SQL nodes performing binary logging. These updates were not actually applied or used for any other purpose; this entailed unnecessary network traffic and consumption of resources.

In NDB 8.4.0 and later, updates applied on the replica SQL node are filtered out on this node, and are no longer sent onward to any other SQL nodes. Updates that do not trigger any logging are also no longer sent by the replica.
- Per-session binary log transaction cache sizing. NDB 8.4.3 adds the ndb_log_cache_size server system variable, which makes it possible to set the size of the transaction cache used for writing the binary log. This enables use of a large cache for logging NDB transactions, and (using binlog_cache_size) a smaller cache for logging other transactions, thus making more efficient use of resources.
- Ndb.cfg file deprecation. Use of an Ndb.cfg file for setting the connection string for an NDB process was not well documented or supported. As of NDB 8.4.3, use of this file is now formally deprecated; you should expect support for it to be removed in a future release of MySQL Cluster.
- Microsecond node log timestamps. Node log timestamps in NDB 8.4.6 and later can be printed with microsecond resolution. Data nodes can enable this feature using the data node - - ndb - logtimestamps=UTC option; management nodes can do this using the ndb_mgmd option --ndb-log-timestamps=UTC. For backwards compatible behavior, the default is LEGACY, which uses the system time zone and resolution in seconds, as in previous releases.

SQL nodes can use the roughly equivalent option--log-timestamps; you should be aware that this mysqld option does not accept LEGACY as a value.

For more information about NDB Cluster node logs, see Section 25.6.2, "NDB Cluster Log Messages".

MySQL Cluster Manager has an advanced command-line interface that can simplify many complex NDB Cluster management tasks. See MySQL Cluster Manager 8.4.9 User Manual, for more information.

\section*{Changes in NDB 8.x Innovation Releases}

New features and major changes in NDB Cluster Innovation releases (8.1, 8.2, 8.3) compared with NDB 8.0 which are likely to be of interest are listed here:
- TLS for cluster node communications. NDB Cluster 8.3 and later provides support for network communications secured by Transport Layer Security (TLS) and Internet Public Key Infrastructure (PKI) to authenticate and encrypt connections between NDB nodes, and between the NDB management server and its clients; TLS is applied to the NDB Transporter Protocol, and to the NDB Management Protocol.

This feature uses TLS mutual authentication, in which a node's own certificate file contains the chain of trust which the node uses to validate the certificates of its peers. When TLS is enabled on the cluster, data and management nodes use TLS to perform the following tasks:
- Mutually authenticate NDB clients and servers at the network level, preventing unprivileged access as a client or server
- Encrypt data transfer, avoiding data eavesdropping, modification, and man-in-the-middle attacks

Connections that use the MySQL client protocol employ MySQL user authentication, and may use TLS (including optional mutual TLS) as described elsewhere in this Manual; see Section 8.3, "Using Encrypted Connections", for more information.

NDB implements a new tool ndb_sign_keys which can be used to create and manage CA, certificate files, and keys. You can generate a set of keys and certificates for all nodes in a cluster with a given configuration file using ndb_sign_keys --create-key.

Using ndb_sign_keys, a node certificate can be bound to a particular hostname, made to expire on a given date, and be associated with a given node type, so that clients are distinct from servers, and management servers from data nodes. (Every NDB TLS certificate can be used for MGM client connections.) Private keys are created in place, so that copying of files containing private keys is minimized. Both private keys and certificates are labeled as either active or pending; ndb_sign_keys also provides help with rotating keys to allow for pending keys to replace active keys before the active keys expire.

Testing of node TLS connections can be done from the system shell using ndb_mgm client with --test-tls, or within the ndb_mgm client using the TLS INFO command. You can obtain information about certificates used by cluster nodes by checking the ndbinfo certificates table.

To enforce a requirement for TLS, set the client option ndb-mgm-tls=strict in my.cnf on each cluster host, then set RequireTls=true in the [mgm default] section of the cluster config.ini file, and set RequireTls=true in the [ndbd default] section of the configuration
file as well. Then perform a rolling restart of the cluster, restarting the management server with -reload --config-file.

Use of TLS connections is also supported in NDB Cluster API applications in NDB 8.3 and later. For information about MGM API support, see TLS Functions. The NDB API Ndb_cluster_connection class adds configure_tls() get_tls_certificate_path() methods for setting up TLS connections by clients.

For more information, see Section 25.6.19.5, "TLS Link Encryption for NDB Cluster", as well as Section 25.5.28, "ndb_sign_keys - Create, Sign, and Manage TLS Keys and Certificates for NDB Cluster".
- Binary log injector memory allocation. In previous versions of NDB Cluster, when the NDB binary log injector was engaged in handling schema changes and tracking the state of the binary log, the choice of arena for allocation of memory for these purposes was forced by changing thread local pointers, thus attempting to try and catch all allocations performed during epoch processing. At the end of the epoch, those pointers were reset, arena memory was released, and the arena structures discarded; this released the memory, but also required setting it up again for the next epoch. The thread local pointer changes also introduced the risk of memory being allocated wrongly when activating functionality in different subsystems. MySQL NDB Cluster 8.3 makes the following improvements to this functionality:
- Changes to thread local pointers are removed, and replaced by explicit arguments to provide the arena used for allocation during the epoch.
- Re-use of the arena for next epoch, thus avoiding the need to set it up repeatedly.

These changes are internal only but should provide a noticeable improvememnt by saving on memory release and re-allocation over successive epochs.
- NDB API primary key updates. Previously, when using any other mechanism than NdbRecord in an attempt to update a primary key value, the NDB API returned error 4202 Set value on tuple key attribute is not allowed, even setting a value identical to the existing one. In NDB 8.1 and later, checking when performing updates by other means is handed off to the data nodes, as it was already when using NdbRecord to perform the update.

This means that you can now perform primary key updates using NdbOperation: : setValue( ), NdbInterpretedCode: :write_attr(), and other methods of NdbOperation and NdbInterpretedCode which set column values (including the NdbOperation methods incValue(), subValue(), the NdbInterpretedCode methods add_val(), sub_val(), and so on). This also applies to the NdbOperation interface's OperationOptions : : 00_SETVALUE extension.
- Improved warnings. Made the following improvements in warning output:
- The maximum time allowed without any progress is now also printed in addition to local checkpoint (LCP) elapsed time.
- When an LCP reaches WAIT_END_LCP state, table IDs and fragment IDs are undefined and so no longer relevant; for this reason, we no longer attempt to print them at that point.
- Removed duplicated information printed when the maximum limit was reached (the same information was shown as both warning and crash information).

In addition, we no longer print the message Validating excluded objects to the SQL node's error log every ndb_metadata_check_interval (default 60) seconds when log_error_verbosity is greater than or equal to 3 (INFO level), due ot the fact that such messages tended to flood the error log, making it difficult to examine, and using excess disk space, while not providing any additional benefit to the user.
- Pushdown joins between queries featuring very large and possibly overlapping IN ( ) and NOT IN ( ) lists are now handled in a correct and safe manner.
- ndbcluster plugin log messages now use SYSTEM as the log level and NDB as the subsystem for logging. This means that informational messages from the ndbcluster plugin are always printed; their verbosity can be controlled by using --ndb_extra_logging.

\subsection*{25.2.5 Options, Variables, and Parameters Added, Deprecated or Removed in NDB 8.4}
- Parameters Introduced in NDB 8.4
- Parameters Deprecated in NDB 8.4
- Parameters Removed in NDB 8.4
- Options and Variables Introduced in NDB 8.4
- Options and Variables Deprecated in NDB 8.4
- Options and Variables Removed in NDB 8.4

The next few sections contain information about NDB node configuration parameters and NDB-specific mysqld options and variables that have been added to, deprecated in, or removed from NDB 8.4 since NDB 8.0.

\section*{Parameters Introduced in NDB 8.4}

The following node configuration parameters have been added in NDB 8.4.
- ApiFailureHandlingTimeout: Maximum time for API node failure handling before escalating. 0 means no time limit; minimum usable value is 10. Added in NDB 8.4.5.
- RequireCertificate: Node is required to find key and certificate in TLS search path. Added in NDB 8.3.0.
- RequireLinkTls: Read-only; is set to true if either endpoint of this connection requires TLS. Added in NDB 8.3.0.
- RequireTls: Client connection must authenticate with TLS before being used otherwise. Added in NDB 8.3.0.
- RequireTls: Require TLS-authenticated secure connections. Added in NDB 8.3.0.

\section*{Parameters Deprecated in NDB 8.4}

No node configuration parameters have been deprecated in NDB 8.4.

\section*{Parameters Removed in NDB 8.4}

No node configuration parameters have been removed in NDB 8.4.

\section*{Options and Variables Introduced in NDB 8.4}

The following system variables, status variables, and server options have been added in NDB 8.4.
- Ndb_schema_participant_count: Number of MySQL servers participating in NDB schema change distribution. Added in NDB 8.4.5.
- ndb-mgm-tls: Whether TLS connection requirements are strict or relaxed. Added in NDB 8.3.0-ndb-8.3.0.
- ndb-tls-search-path: Directories to search for NDB TLS CAs and private keys. Added in NDB 8.3.0-ndb-8.3.0.
- ndb_log_cache_size: Set size of transaction cache used for recording NDB binary log. Added in NDB 8.4.3-ndb-8.4.3.

\section*{Options and Variables Deprecated in NDB 8.4}

No system variables, status variables, or server options have been deprecated in NDB 8.4.

\section*{Options and Variables Removed in NDB 8.4}

No system variables, status variables, or options have been removed in NDB 8.4.

\subsection*{25.2.6 MySQL Server Using InnoDB Compared with NDB Cluster}

MySQL Server offers a number of choices in storage engines. Since both NDB and InnoDB can serve as transactional MySQL storage engines, users of MySQL Server sometimes become interested in NDB Cluster. They see NDB as a possible alternative or upgrade to the default InnoDB storage engine in MySQL. While NDB and InnoDB share common characteristics, there are differences in architecture and implementation, so that some existing MySQL Server applications and usage scenarios can be a good fit for NDB Cluster, but not all of them.

In this section, we discuss and compare some characteristics of the NDB storage engine used by NDB 8.4 with InnoDB used in MySQL 8.4. The next few sections provide a technical comparison. In many instances, decisions about when and where to use NDB Cluster must be made on a case-by-case basis, taking all factors into consideration. While it is beyond the scope of this documentation to provide specifics for every conceivable usage scenario, we also attempt to offer some very general guidance on the relative suitability of some common types of applications for NDB as opposed to InnoDB back ends.

NDB Cluster 8.4 uses a mysqld based on MySQL 8.4, including support for InnoDB 1.1. While it is possible to use InnoDB tables with NDB Cluster, such tables are not clustered. It is also not possible to use programs or libraries from an NDB Cluster 8.4 distribution with MySQL Server 8.4, or the reverse.

While it is also true that some types of common business applications can be run either on NDB Cluster or on MySQL Server (most likely using the InnoDB storage engine), there are some important architectural and implementation differences. Section 25.2.6.1, "Differences Between the NDB and InnoDB Storage Engines", provides a summary of the these differences. Due to the differences, some usage scenarios are clearly more suitable for one engine or the other; see Section 25.2.6.2, "NDB and InnoDB Workloads". This in turn has an impact on the types of applications that better suited for use with NDB or InnoDB. See Section 25.2.6.3, "NDB and InnoDB Feature Usage Summary", for a comparison of the relative suitability of each for use in common types of database applications.

For information about the relative characteristics of the NDB and MEMORY storage engines, see When to Use MEMORY or NDB Cluster.

See Chapter 18, Alternative Storage Engines, for additional information about MySQL storage engines.

\subsection*{25.2.6.1 Differences Between the NDB and InnoDB Storage Engines}

The NDB storage engine is implemented using a distributed, shared-nothing architecture, which causes it to behave differently from InnoDB in a number of ways. For those unaccustomed to working with NDB, unexpected behaviors can arise due to its distributed nature with regard to transactions, foreign keys, table limits, and other characteristics. These are shown in the following table:

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 25.1 Differences between InnoDB and NDB storage engines}
\begin{tabular}{|l|l|l|}
\hline Feature & InnoDB (MySQL 8.4) & NDB 8.4 \\
\hline MySQL Server Version & 8.4 & 8.4 \\
\hline InnoDB Version & InnoDB 8.4.9 & InnoDB 8.4.9 \\
\hline NDB Cluster Version & N/A & NDB 8.4.7/8.4.7 \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|l|}
\hline Feature & InnoDB (MySQL 8.4) & NDB 8.4 \\
\hline Storage Limits & 64TB & 128TB \\
\hline Foreign Keys & Yes & Yes \\
\hline Transactions & All standard types & READ COMMITTED \\
\hline MVCC & Yes & No \\
\hline Data Compression & Yes & No (NDB checkpoint and backup files can be compressed) \\
\hline Large Row Support (> 14K) & Supported for VARBINARY, VARCHAR, BLOB, and TEXT columns & Supported for BLOB and TEXT columns only (Using these types to store very large amounts of data can lower NDB performance) \\
\hline Replication Support & Asynchronous and semisynchronous replication using MySQL Replication; MySQL Group Replication & Automatic synchronous replication within an NDB Cluster; asynchronous replication between NDB Clusters, using MySQL Replication (Semisynchronous replication is not supported) \\
\hline Scaleout for Read Operations & Yes (MySQL Replication) & Yes (Automatic partitioning in NDB Cluster; NDB Cluster Replication) \\
\hline Scaleout for Write Operations & Requires application-level partitioning (sharding) & Yes (Automatic partitioning in NDB Cluster is transparent to applications) \\
\hline High Availability (HA) & Built-in, from InnoDB cluster & Yes (Designed for 99.999\% uptime) \\
\hline Node Failure Recovery and Failover & From MySQL Group Replication & Automatic (Key element in NDB architecture) \\
\hline Time for Node Failure Recovery & 30 seconds or longer & Typically < 1 second \\
\hline Real-Time Performance & No & Yes \\
\hline In-Memory Tables & No & Yes (Some data can optionally be stored on disk; both inmemory and disk data storage are durable) \\
\hline NoSQL Access to Storage Engine & Yes & Yes (Multiple APIs, including Memcached, Node.js/JavaScript, Java, JPA, C++, and HTTP/ REST) \\
\hline Concurrent and Parallel Writes & Yes & Up to 48 writers, optimized for concurrent writes \\
\hline Conflict Detection and Resolution (Multiple Sources) & Yes (MySQL Group Replication) & Yes \\
\hline Hash Indexes & No & Yes \\
\hline Online Addition of Nodes & Read/write replicas using MySQL Group Replication & Yes (all node types) \\
\hline Online Upgrades & Yes (using replication) & Yes \\
\hline Online Schema Modifications & Yes, as part of MySQL 8.4 & Yes \\
\hline
\end{tabular}

\subsection*{25.2.6.2 NDB and InnoDB Workloads}

NDB Cluster has a range of unique attributes that make it ideal to serve applications requiring high availability, fast failover, high throughput, and low latency. Due to its distributed architecture and multinode implementation, NDB Cluster also has specific constraints that may keep some workloads from performing well. A number of major differences in behavior between the NDB and InnoDB storage engines with regard to some common types of database-driven application workloads are shown in the following table::

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 25.2 Differences between InnoDB and NDB storage engines, common types of data-driven application workloads.}
\begin{tabular}{|l|l|l|}
\hline Workload & InnoDB & NDB Cluster (NDB) \\
\hline High-Volume OLTP Applications & Yes & Yes \\
\hline DSS Applications (data marts, analytics) & Yes & Limited (Join operations across OLTP datasets not exceeding 3TB in size) \\
\hline Custom Applications & Yes & Yes \\
\hline Packaged Applications & Yes & Limited (should be mostly primary key access); NDB Cluster 8.4 supports foreign keys \\
\hline In-Network Telecoms Applications (HLR, HSS, SDP) & No & Yes \\
\hline Session Management and Caching & Yes & Yes \\
\hline E-Commerce Applications & Yes & Yes \\
\hline User Profile Management, AAA Protocol & Yes & Yes \\
\hline
\end{tabular}
\end{table}

\subsection*{25.2.6.3 NDB and InnoDB Feature Usage Summary}

When comparing application feature requirements to the capabilities of InnoDB with NDB, some are clearly more compatible with one storage engine than the other.

The following table lists supported application features according to the storage engine to which each feature is typically better suited.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 25.3 Supported application features according to the storage engine to which each feature is typically better suited}
\begin{tabular}{|l|l|}
\hline Preferred application requirements for InnoDB & Preferred application requirements for NDB \\
\hline \begin{tabular}{l}
- Foreign keys![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3870.jpg?height=175\&width=261\&top_left_y=1982\&top_left_x=349) \\
Note \\
NDB Cluster 8.4 supports foreign keys \\
- Full table scans \\
- Very large databases, rows, or transactions \\
- Transactions other than READ COMMITTED
\end{tabular} & \begin{tabular}{l}
- Write scaling \\
- 99.999\% uptime \\
- Online addition of nodes and online schema operations \\
- Multiple SQL and NoSQL APIs (see NDB Cluster APIs: Overview and Concepts) \\
- Real-time performance \\
- Limited use of BLOB columns \\
- Foreign keys are supported, although their use may have an impact on performance at high throughput
\end{tabular} \\
\hline
\end{tabular}
\end{table}

\subsection*{25.2.7 Known Limitations of NDB Cluster}

In the sections that follow, we discuss known limitations in current releases of NDB Cluster as compared with the features available when using the MyISAM and InnoDB storage engines. If you check the "Cluster" category in the MySQL bugs database at http://bugs.mysql.com, you can find known bugs in the following categories under "MySQL Server:" in the MySQL bugs database at http:// bugs.mysql.com, which we intend to correct in upcoming releases of NDB Cluster:
- NDB Cluster
- Cluster Direct API (NDBAPI)
- Cluster Disk Data
- Cluster Replication
- ClusterJ

This information is intended to be complete with respect to the conditions just set forth. You can report any discrepancies that you encounter to the MySQL bugs database using the instructions given in Section 1.6, "How to Report Bugs or Problems". Any problem which we do not plan to fix in NDB Cluster 8.4, is added to the list.

\section*{Note}

Limitations and other issues specific to NDB Cluster Replication are described in Section 25.7.3, "Known Issues in NDB Cluster Replication".

\subsection*{25.2.7.1 Noncompliance with SQL Syntax in NDB Cluster}

Some SQL statements relating to certain MySQL features produce errors when used with NDB tables, as described in the following list:
- Temporary tables. Temporary tables are not supported. Trying either to create a temporary table that uses the NDB storage engine or to alter an existing temporary table to use NDB fails with the error Table storage engine 'ndbcluster' does not support the create option 'TEMPORARY'.
- Indexes and keys in NDB tables. Keys and indexes on NDB Cluster tables are subject to the following limitations:
- Column width. Attempting to create an index on an NDB table column whose width is greater than 3072 bytes is rejected with ER_TOO_LONG_KEY: Specified key was too long; max key length is 3072 bytes.

Attempting to create an index on an NDB table column whose width is greater than 3056 bytes succeeds with a warning. In such cases, statistical information is not generated, which means a nonoptimal execution plan may be selected. For this reason, you should consider making the index length shorter than 3056 bytes if possible.
- TEXT and BLOB columns. You cannot create indexes on NDB table columns that use any of the TEXT or BLOB data types.
- FULLTEXT indexes. The NDB storage engine does not support FULLTEXT indexes, which are possible for MyISAM and InnoDB tables only.

However, you can create indexes on VARCHAR columns of NDB tables.
- USING HASH keys and NULL. Using nullable columns in unique keys and primary keys means that queries using these columns are handled as full table scans. To work around this issue, make the column NOT NULL, or re-create the index without the USING HASH option.
- Prefixes. There are no prefix indexes; only entire columns can be indexed. (The size of an NDB column index is always the same as the width of the column in bytes, up to and including 3072
bytes, as described earlier in this section. Also see Section 25.2.7.6, "Unsupported or Missing Features in NDB Cluster", for additional information.)
- BIT columns. A BIT column cannot be a primary key, unique key, or index, nor can it be part of a composite primary key, unique key, or index.
- AUTO_INCREMENT columns. Like other MySQL storage engines, the NDB storage engine can handle a maximum of one AUTO_INCREMENT column per table, and this column must be indexed. However, in the case of an NDB table with no explicit primary key, an AUTO_INCREMENT column is automatically defined and used as a "hidden" primary key. For this reason, you cannot create an NDB table having an AUTO_INCREMENT column and no explicit primary key.

The following CREATE TABLE statements do not work, as shown here:
```
# No index on AUTO_INCREMENT column; table has no primary key
# Raises ER_WRONG_AUTO_KEY
mysql> CREATE TABLE n (
    -> a INT,
    -> b INT AUTO_INCREMENT
    -> )
    -> ENGINE=NDB;
ERROR 1075 (42000): Incorrect table definition; there can be only one auto
column and it must be defined as a key
# Index on AUTO_INCREMENT column; table has no primary key
# Raises NDB error 4335
mysql> CREATE TABLE n (
    -> a INT,
    -> b INT AUTO_INCREMENT,
    -> KEY k (b)
    -> )
    -> ENGINE=NDB;
ERROR 1296 (HY000): Got error 4335 'Only one autoincrement column allowed per
table. Having a table without primary key uses an autoincr' from NDBCLUSTER
```


The following statement creates a table with a primary key, an AUTO_INCREMENT column, and an index on this column, and succeeds:
```
# Index on AUTO_INCREMENT column; table has a primary key
mysql> CREATE TABLE n (
    -> a INT PRIMARY KEY,
    -> b INT AUTO_INCREMENT,
    -> KEY k (b)
    -> )
    -> ENGINE=NDB;
Query OK, 0 rows affected (0.38 sec)
```

- Restrictions on foreign keys. Support for foreign key constraints in NDB 8.4 is comparable to that provided by InnoDB, subject to the following restrictions:
- Every column referenced as a foreign key requires an explicit unique key, if it is not the table's primary key.
- ON UPDATE CASCADE is not supported when the reference is to the parent table's primary key.

This is because an update of a primary key is implemented as a delete of the old row (containing the old primary key) plus an insert of the new row (with a new primary key). This is not visible to
the NDB kernel, which views these two rows as being the same, and thus has no way of knowing that this update should be cascaded.
- ON DELETE CASCADE is also not supported where the child table contains one or more columns of any of the TEXT or BLOB types. (Bug \#89511, Bug \#27484882)
- SET DEFAULT is not supported. (Also not supported by InnoDB.)
- The NO ACTION keyword is accepted but treated as RESTRICT. NO ACTION, which is a standard SQL keyword, is the default in MySQL 8.4. (Also the same as with InnoDB.)
- In earlier versions of NDB Cluster, when creating a table with foreign key referencing an index in another table, it sometimes appeared possible to create the foreign key even if the order of the columns in the indexes did not match, due to the fact that an appropriate error was not always returned internally. A partial fix for this issue improved the error used internally to work in most cases; however, it remains possible for this situation to occur in the event that the parent index is a unique index. (Bug \#18094360)

For more information, see Section 15.1.20.5, "FOREIGN KEY Constraints", and Section 1.7.3.2, "FOREIGN KEY Constraints".
- NDB Cluster and geometry data types.

Geometry data types (WKT and WKB) are supported for NDB tables. However, spatial indexes are not supported.
- Character sets and binary log files. Currently, the ndb_apply_status and ndb_binlog_index tables are created using the latin1 (ASCII) character set. Because names of binary logs are recorded in this table, binary log files named using non-Latin characters are not referenced correctly in these tables. This is a known issue, which we are working to fix. (Bug \#50226)

To work around this problem, use only Latin-1 characters when naming binary log files or setting any the --basedir, --log-bin, or --log-bin-index options.
- Creating NDB tables with user-defined partitioning. Support for user-defined partitioning in NDB Cluster is restricted to [LINEAR] KEY partitioning. Using any other partitioning type with ENGINE=NDB or ENGINE=NDBCLUSTER in a CREATE TABLE statement results in an error.

It is possible to override this restriction, but doing so is not supported for use in production settings. For details, see User-defined partitioning and the NDB storage engine (NDB Cluster).

Default partitioning scheme. All NDB Cluster tables are by default partitioned by KEY using the table's primary key as the partitioning key. If no primary key is explicitly set for the table, the "hidden" primary key automatically created by the NDB storage engine is used instead. For additional discussion of these and related issues, see Section 26.2.5, "KEY Partitioning".

CREATE TABLE and ALTER TABLE statements that would cause a user-partitioned NDBCLUSTER table not to meet either or both of the following two requirements are not permitted, and fail with an error:
1. The table must have an explicit primary key.
2. All columns listed in the table's partitioning expression must be part of the primary key.

Exception. If a user-partitioned NDBCLUSTER table is created using an empty column-list (that is, using PARTITION BY [LINEAR] KEY( )), then no explicit primary key is required.

Maximum number of partitions for NDBCLUSTER tables. The maximum number of partitions that can defined for a NDBCLUSTER table when employing user-defined partitioning is 8 per node group. (See Section 25.2.2, "NDB Cluster Nodes, Node Groups, Fragment Replicas, and Partitions", for more information about NDB Cluster node groups.

DROP PARTITION not supported. It is not possible to drop partitions from NDB tables using ALTER TABLE ... DROP PARTITION. The other partitioning extensions to ALTER TABLE—ADD PARTITION, REORGANIZE PARTITION, and COALESCE PARTITION-are supported for NDB tables, but use copying and so are not optimized. See Section 26.3.1, "Management of RANGE and LIST Partitions" and Section 15.1.9, "ALTER TABLE Statement".

Partition selection. Partition selection is not supported for NDB tables. See Section 26.5, "Partition Selection", for more information.
- JSON data type. The MySQL JSON data type is supported for NDB tables in the mysqld supplied with NDB 8.4.

An NDB table can have a maximum of 3 JSON columns.
The NDB API has no special provision for working with JSON data, which it views simply as BLOB data. Handling data as JSON must be performed by the application.
- DEFAULT value expressions. Explicit default value expressions (as implemented in MySQL 8.0.34 and later) for NDB table column definitions are not supported. This means that, for example, the following CREATE TABLE statement is rejected with an error:
```
mysql> CREATE TABLE t (
    -> id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    -> cf FLOAT DEFAULT (RAND() * 10)
    -> ) ENGINE=NDBCLUSTER;
ERROR 3774 (HY000): 'Specified storage engine' is not supported for default value expressions.
```


NDB Cluster does support literal default column values, as shown here:
```
mysql> CREATE TABLE t3 (
    -> id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    -> ci INT DEFAULT 0,
    -> cv VARCHAR(20) DEFAULT ''
    -> ) ENGINE=NDBCLUSTER;
Query OK, 0 rows affected (0.17 sec)
```


For more information, see Section 13.6, "Data Type Default Values".

\subsection*{25.2.7.2 Limits and Differences of NDB Cluster from Standard MySQL Limits}

In this section, we list limits found in NDB Cluster that either differ from limits found in, or that are not found in, standard MySQL.

Memory usage and recovery. Memory consumed when data is inserted into an NDB table is not automatically recovered when deleted, as it is with other storage engines. Instead, the following rules hold true:
- A DELETE statement on an NDB table makes the memory formerly used by the deleted rows available for re-use by inserts on the same table only. However, this memory can be made available for general re-use by performing OPTIMIZE TABLE.

A rolling restart of the cluster also frees any memory used by deleted rows. See Section 25.6.5, "Performing a Rolling Restart of an NDB Cluster".
- A DROP TABLE or TRUNCATE TABLE operation on an NDB table frees the memory that was used by this table for re-use by any NDB table, either by the same table or by another NDB table.

Note
Recall that TRUNCATE TABLE drops and re-creates the table. See Section 15.1.37, "TRUNCATE TABLE Statement".
- Limits imposed by the cluster's configuration.

A number of hard limits exist which are configurable, but available main memory in the cluster sets limits. See the complete list of configuration parameters in Section 25.4.3, "NDB Cluster Configuration Files". Most configuration parameters can be upgraded online. These hard limits include:
- Database memory size and index memory size (DataMemory and IndexMemory, respectively).

DataMemory is allocated as 32 KB pages. As each DataMemory page is used, it is assigned to a specific table; once allocated, this memory cannot be freed except by dropping the table.

See Section 25.4.3.6, "Defining NDB Cluster Data Nodes", for more information.
- The maximum number of operations that can be performed per transaction is set using the configuration parameters MaxNoOfConcurrentOperations and MaxNoOfLocalOperations.

\section*{Note}

Bulk loading, TRUNCATE TABLE, and ALTER TABLE are handled as special cases by running multiple transactions, and so are not subject to this limitation.
- Different limits related to tables and indexes. For example, the maximum number of ordered indexes in the cluster is determined by MaxNoOfOrderedIndexes, and the maximum number of ordered indexes per table is 16.
- Node and data object maximums. The following limits apply to numbers of cluster nodes and metadata objects:
- The maximum number of data nodes is 144 . (In NDB 7.6 and earlier, this was 48 .)

A data node must have a node ID in the range of 1 to 144 , inclusive.
Management and API nodes may use node IDs in the range 1 to 255 , inclusive.
- The total maximum number of nodes in an NDB Cluster is 255 . This number includes all SQL nodes (MySQL Servers), API nodes (applications accessing the cluster other than MySQL servers), data nodes, and management servers.
- The maximum number of metadata objects in current versions of NDB Cluster is 20320 . This limit is hard-coded.

\subsection*{25.2.7.3 Limits Relating to Transaction Handling in NDB Cluster}

A number of limitations exist in NDB Cluster with regard to the handling of transactions. These include the following:
- Transaction isolation level. The NDBCLUSTER storage engine supports only the READ COMMITTED transaction isolation level. (InnoDB, for example, supports READ COMMITTED, READ UNCOMMITTED, REPEATABLE READ, and SERIALIZABLE.) You should keep in mind that NDB implements READ COMMITTED on a per-row basis; when a read request arrives at the data node storing the row, what is returned is the last committed version of the row at that time.

Uncommitted data is never returned, but when a transaction modifying a number of rows commits concurrently with a transaction reading the same rows, the transaction performing the read can observe "before" values, "after" values, or both, for different rows among these, due to the fact that a given row read request can be processed either before or after the commit of the other transaction.

To ensure that a given transaction reads only before or after values, you can impose row locks using SELECT ... LOCK IN SHARE MODE. In such cases, the lock is held until the owning transaction is committed. Using row locks can also cause the following issues:
- Increased frequency of lock wait timeout errors, and reduced concurrency
- Increased transaction processing overhead due to reads requiring a commit phase
- Possibility of exhausting the available number of concurrent locks, which is limited by MaxNoOfConcurrentOperations

NDB uses READ COMMITTED for all reads unless a modifier such as LOCK IN SHARE MODE or FOR UPDATE is used. LOCK IN SHARE MODE causes shared row locks to be used; FOR UPDATE causes exclusive row locks to be used. Unique key reads have their locks upgraded automatically by NDB to ensure a self-consistent read; BLOB reads also employ extra locking for consistency.

See Section 25.6.8.4, "NDB Cluster Backup Troubleshooting", for information on how NDB Cluster's implementation of transaction isolation level can affect backup and restoration of NDB databases.
- Transactions and BLOB or TEXT columns. NDBCLUSTER stores only part of a column value that uses any of MySQL's BLOB or TEXT data types in the table visible to MySQL; the remainder of the BLOB or TEXT is stored in a separate internal table that is not accessible to MySQL. This gives rise to two related issues of which you should be aware whenever executing SELECT statements on tables that contain columns of these types:
1. For any SELECT from an NDB Cluster table: If the SELECT includes a BLOB or TEXT column, the READ COMMITTED transaction isolation level is converted to a read with read lock. This is done to guarantee consistency.
2. For any SELECT which uses a unique key lookup to retrieve any columns that use any of the BLOB or TEXT data types and that is executed within a transaction, a shared read lock is held on the table for the duration of the transaction-that is, until the transaction is either committed or aborted.

This issue does not occur for queries that use index or table scans, even against NDB tables having BLOB or TEXT columns.

For example, consider the table $t$ defined by the following CREATE TABLE statement:
```
CREATE TABLE t (
    a INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    b INT NOT NULL,
    c INT NOT NULL,
    d TEXT,
    INDEX i(b),
    UNIQUE KEY u(c)
) ENGINE = NDB,
```


The following query on t causes a shared read lock, because it uses a unique key lookup:
```
SELECT * FROM t WHERE c = 1;
```


However, none of the four queries shown here causes a shared read lock:
```
SELECT * FROM t WHERE b = 1;
SELECT * FROM t WHERE d = '1';
SELECT * FROM t;
```


SELECT b,c WHERE a = 1;
This is because, of these four queries, the first uses an index scan, the second and third use table scans, and the fourth, while using a primary key lookup, does not retrieve the value of any BLOB or TEXT columns.

You can help minimize issues with shared read locks by avoiding queries that use unique key lookups that retrieve BLOB or TEXT columns, or, in cases where such queries are not avoidable, by committing transactions as soon as possible afterward.
- Unique key lookups and transaction isolation. Unique indexes are implemented in NDB using a hidden index table which is maintained internally. When a user-created NDB table is accessed using a unique index, the hidden index table is first read to find the primary key that is then used to read the user-created table. To avoid modification of the index during this double-read operation, the row found in the hidden index table is locked. When a row referenced by a unique index in the usercreated NDB table is updated, the hidden index table is subject to an exclusive lock by the transaction in which the update is performed. This means that any read operation on the same (user-created) NDB table must wait for the update to complete. This is true even when the transaction level of the read operation is READ COMMITTED.

One workaround which can be used to bypass potentially blocking reads is to force the SQL node to ignore the unique index when performing the read. This can be done by using the IGNORE INDEX index hint as part of the SELECT statement reading the table (see Section 10.9.4, "Index Hints"). Because the MySQL server creates a shadowing ordered index for every unique index created in NDB, this lets the ordered index be read instead, and avoids unique index access locking. The resulting read is as consistent as a committed read by primary key, returning the last committed value at the time the row is read.

Reading via an ordered index makes less efficient use of resources in the cluster, and may have higher latency.

It is also possible to avoid using the unique index for access by querying for ranges rather than for unique values.
- Rollbacks. There are no partial transactions, and no partial rollbacks of transactions. A duplicate key or similar error causes the entire transaction to be rolled back.

This behavior differs from that of other transactional storage engines such as InnoDB that may roll back individual statements.
- Transactions and memory usage.

As noted elsewhere in this chapter, NDB Cluster does not handle large transactions well; it is better to perform a number of small transactions with a few operations each than to attempt a single large transaction containing a great many operations. Among other considerations, large transactions require very large amounts of memory. Because of this, the transactional behavior of a number of MySQL statements is affected as described in the following list:
- TRUNCATE TABLE is not transactional when used on NDB tables. If a TRUNCATE TABLE fails to empty the table, then it must be re-run until it is successful.
- DELETE FROM (even with no WHERE clause) is transactional. For tables containing a great many rows, you may find that performance is improved by using several DELETE FROM . . . LIMIT ... statements to "chunk" the delete operation. If your objective is to empty the table, then you may wish to use TRUNCATE TABLE instead.
- LOAD DATA statements. LOAD DATA is not transactional when used on NDB tables.

\section*{Important}

When executing a LOAD DATA statement, the NDB engine performs commits at irregular intervals that enable better utilization of the

Icommunication network. It is not possible to know ahead of time when such commits take place.
- ALTER TABLE and transactions. When copying an NDB table as part of an ALTER TABLE, the creation of the copy is nontransactional. (In any case, this operation is rolled back when the copy is deleted.)
- Transactions and the COUNT() function. When using NDB Cluster Replication, it is not possible to guarantee the transactional consistency of the COUNT ( ) function on the replica. In other words, when performing on the source a series of statements (INSERT, DELETE, or both) that changes the number of rows in a table within a single transaction, executing SELECT COUNT (*) FROM table queries on the replica may yield intermediate results. This is due to the fact that SELECT COUNT ( . . . ) may perform dirty reads, and is not a bug in the NDB storage engine. (See Bug \#31321 for more information.)

\subsection*{25.2.7.4 NDB Cluster Error Handling}

Starting, stopping, or restarting a node may give rise to temporary errors causing some transactions to fail. These include the following cases:
- Temporary errors. When first starting a node, it is possible that you may see Error 1204 Temporary failure, distribution changed and similar temporary errors.
- Errors due to node failure. The stopping or failure of any data node can result in a number of different node failure errors. (However, there should be no aborted transactions when performing a planned shutdown of the cluster.)

In either of these cases, any errors that are generated must be handled within the application. This should be done by retrying the transaction.

See also Section 25.2.7.2, "Limits and Differences of NDB Cluster from Standard MySQL Limits".

\subsection*{25.2.7.5 Limits Associated with Database Objects in NDB Cluster}

Some database objects such as tables and indexes have different limitations when using the NDBCLUSTER storage engine:
- Number of database objects. The maximum number of all NDB database objects in a single NDB Cluster—including databases, tables, and indexes—is limited to 20320.
- Attributes per table. The maximum number of attributes (that is, columns and indexes) that can belong to a given table is 512 .
- Attributes per key. The maximum number of attributes per key is 32 .
- Row size. The maximum permitted size of any one row is 30000 bytes.

Each BLOB or TEXT column contributes $256+8=264$ bytes to this total; this includes JSON columns. See String Type Storage Requirements, as well as JSON Storage Requirements, for more information relating to these types.

In addition, the maximum offset for a fixed-width column of an NDB table is 8188 bytes; attempting to create a table that violates this limitation fails with NDB error 851 Maximum offset for fixed-size columns exceeded. For memory-based columns, you can work around this limitation by using a variable-width column type such as VARCHAR or defining the column as COLUMN_FORMAT=DYNAMIC; this does not work with columns stored on disk. For disk-based columns, you may be able to do so by reordering one or more of the table's disk-based columns such that the combined width of all but the disk-based column defined last in the CREATE TABLE statement used to create the table does not exceed 8188 bytes, less any possible rounding performed for some data types such as CHAR or VARCHAR; otherwise it is necessary to use memorybased storage for one or more of the offending column or columns instead.
- BIT column storage per table. The maximum combined width for all BIT columns used in a given NDB table is 4096.
- FIXED column storage. NDB Cluster supports a maximum of 128 TB per fragment of data in FIXED columns.

\subsection*{25.2.7.6 Unsupported or Missing Features in NDB Cluster}

A number of features supported by other storage engines are not supported for NDB tables. Trying to use any of these features in NDB Cluster does not cause errors in or of itself; however, errors may occur in applications that expects the features to be supported or enforced. Statements referencing such features, even if effectively ignored by NDB, must be syntactically and otherwise valid.
- Index prefixes. Prefixes on indexes are not supported for NDB tables. If a prefix is used as part of an index specification in a statement such as CREATE TABLE, ALTER TABLE, or CREATE INDEX, the prefix is not created by NDB.

A statement containing an index prefix, and creating or modifying an NDB table, must still be syntactically valid. For example, the following statement always fails with Error 1089 Incorrect prefix key; the used key part is not a string, the used length is longer than the key part, or the storage engine doesn't support unique prefix keys, regardless of storage engine:
```
CREATE TABLE t1 (
    c1 INT NOT NULL,
    c2 VARCHAR(100),
    INDEX i1 (c2(500))
);
```


This happens on account of the SQL syntax rule that no index may have a prefix larger than itself.
- Savepoints and rollbacks. Savepoints and rollbacks to savepoints are ignored as in MyISAM.
- Durability of commits. There are no durable commits on disk. Commits are replicated, but there is no guarantee that logs are flushed to disk on commit.
- Replication. Statement-based replication is not supported. Use --binlog-format=ROW (or --binlog-format=MIXED) when setting up cluster replication. See Section 25.7, "NDB Cluster Replication", for more information.

Replication using global transaction identifiers (GTIDs) is not compatible with NDB Cluster, and is not supported in NDB Cluster 8.4. Do not enable GTIDs when using the NDB storage engine, as this is very likely to cause problems up to and including failure of NDB Cluster Replication.

Semisynchronous replication is not supported in NDB Cluster.
- Generated columns. The NDB storage engine does not support indexes on virtual generated columns.

As with other storage engines, you can create an index on a stored generated column, but you should bear in mind that NDB uses DataMemory for storage of the generated column as well as IndexMemory for the index. See JSON columns and indirect indexing in NDB Cluster, for an example.

NDB Cluster writes changes in stored generated columns to the binary log, but does log not those made to virtual columns. This should not effect NDB Cluster Replication or replication between NDB and other MySQL storage engines.

\section*{Note}

See Section 25.2.7.3, "Limits Relating to Transaction Handling in NDB Cluster", for more information relating to limitations on transaction handling in NDB.

\subsection*{25.2.7.7 Limitations Relating to Performance in NDB Cluster}

The following performance issues are specific to or especially pronounced in NDB Cluster:
- Range scans. There are query performance issues due to sequential access to the NDB storage engine; it is also relatively more expensive to do many range scans than it is with either MyISAM or InnodB.
- Reliability of Records in range. The Records in range statistic is available but is not completely tested or officially supported. This may result in nonoptimal query plans in some cases. If necessary, you can employ USE INDEX or FORCE INDEX to alter the execution plan. See Section 10.9.4, "Index Hints", for more information on how to do this.
- Unique hash indexes. Unique hash indexes created with USING HASH cannot be used for accessing a table if NULL is given as part of the key.

\subsection*{25.2.7.8 Issues Exclusive to NDB Cluster}

The following are limitations specific to the NDB storage engine:
- Machine architecture. All machines used in the cluster must have the same architecture. That is, all machines hosting nodes must be either big-endian or little-endian, and you cannot use a mixture of both. For example, you cannot have a management node running on a PowerPC which directs a data node that is running on an x86 machine. This restriction does not apply to machines simply running mysql or other clients that may be accessing the cluster's SQL nodes.
- Binary logging.

NDB Cluster has the following limitations or restrictions with regard to binary logging:
- NDB Cluster cannot produce a binary log for tables having BLOB columns but no primary key.
- Only the following schema operations are logged in a cluster binary log which is not on the mysqld executing the statement:
- CREATE TABLE
- ALTER TABLE
- DROP TABLE
- CREATE DATABASE / CREATE SCHEMA
- DROP DATABASE / DROP SCHEMA
- CREATE TABLESPACE
- ALTER TABLESPACE
- DROP TABLESPACE
- CREATE LOGFILE GROUP
- ALTER LOGFILE GROUP
- DROP LOGFILE GROUP
- Schema operations. Schema operations (DDL statements) are rejected while any data node restarts. Schema operations are also not supported while performing an online upgrade or downgrade.
- Number of fragment replicas. The number of fragment replicas, as determined by the NoOfReplicas data node configuration parameter, is the number of copies of all data stored
by NDB Cluster. Setting this parameter to 1 means there is only a single copy; in this case, no redundancy is provided, and the loss of a data node entails loss of data. To guarantee redundancy, and thus preservation of data even if a data node fails, set this parameter to 2 , which is the default and recommended value in production.

Setting NoOfReplicas to a value greater than 2 is supported (to a maximum of 4) but unnecessary to guard against loss of data.

See also Section 25.2.7.10, "Limitations Relating to Multiple NDB Cluster Nodes".

\subsection*{25.2.7.9 Limitations Relating to NDB Cluster Disk Data Storage}

Disk Data object maximums and minimums. Disk data objects are subject to the following maximums and minimums:
- Maximum number of tablespaces: $2^{32}(4294967296)$
- Maximum number of data files per tablespace: $2^{16}$ (65536)
- The minimum and maximum possible sizes of extents for tablespace data files are 32 K and 2 G , respectively. See Section 15.1.21, "CREATE TABLESPACE Statement", for more information.

In addition, when working with NDB Disk Data tables, you should be aware of the following issues regarding data files and extents:
- Data files use DataMemory. Usage is the same as for in-memory data.
- Data files use file descriptors. It is important to keep in mind that data files are always open, which means the file descriptors are always in use and cannot be re-used for other system tasks.
- Extents require sufficient DiskPageBufferMemory; you must reserve enough for this parameter to account for all memory used by all extents (number of extents times size of extents).

Disk Data tables and diskless mode. Use of Disk Data tables is not supported when running the cluster in diskless mode.

\subsection*{25.2.7.10 Limitations Relating to Multiple NDB Cluster Nodes}

\section*{Multiple SQL nodes.}

The following are issues relating to the use of multiple MySQL servers as NDB Cluster SQL nodes, and are specific to the NDBCLUSTER storage engine:
- Stored programs not distributed. Stored procedures, stored functions, triggers, and scheduled events are all supported by tables using the NDB storage engine, but these do not propagate automatically between MySQL Servers acting as Cluster SQL nodes, and must be re-created separately on each SQL node. See Stored routines and triggers in NDB Cluster.
- No distributed table locks. A LOCK TABLES statement or GET_LOCK( ) call works only for the SQL node on which the lock is issued; no other SQL node in the cluster "sees" this lock. This is true for a lock issued by any statement that locks tables as part of its operations. (See next item for an example.)

Implementing table locks in NDBCLUSTER can be done in an API application, and ensuring that all applications start by setting LockMode to LM_Read or LM_Exclusive. For more information about how to do this, see the description of NdbOperation: : getLockHandle( ) in the NDB Cluster API Guide
- ALTER TABLE operations. ALTER TABLE is not fully locking when running multiple MySQL servers (SQL nodes). (As discussed in the previous item, NDB Cluster does not support distributed table locks.)

\section*{Multiple management nodes.}

When using multiple management servers:
- If any of the management servers are running on the same host, you must give nodes explicit IDs in connection strings because automatic allocation of node IDs does not work across multiple management servers on the same host. This is not required if every management server resides on a different host.
- When a management server starts, it first checks for any other management server in the same NDB Cluster, and upon successful connection to the other management server uses its configuration data. This means that the management server --reload and --initial startup options are ignored unless the management server is the only one running. It also means that, when performing a rolling restart of an NDB Cluster with multiple management nodes, the management server reads its own configuration file if (and only if) it is the only management server running in this NDB Cluster. See Section 25.6.5, "Performing a Rolling Restart of an NDB Cluster", for more information.

Multiple network addresses. Multiple network addresses per data node are not supported. Use of these is liable to cause problems: In the event of a data node failure, an SQL node waits for confirmation that the data node went down but never receives it because another route to that data node remains open. This can effectively make the cluster inoperable.

\section*{Note}

It is possible to use multiple network hardware interfaces (such as Ethernet cards) for a single data node, but these must be bound to the same address. This also means that it not possible to use more than one [tcp] section per connection in the config. ini file. See Section 25.4.3.10, "NDB Cluster TCP/ IP Connections", for more information.

\subsection*{25.3 NDB Cluster Installation}

This section describes the basics for planning, installing, configuring, and running an NDB Cluster. Whereas the examples in Section 25.4, "Configuration of NDB Cluster" provide more in-depth information on a variety of clustering options and configuration, the result of following the guidelines and procedures outlined here should be a usable NDB Cluster which meets the minimum requirements for availability and safeguarding of data.

For information about upgrading or downgrading an NDB Cluster between release versions, see Section 25.3.7, "Upgrading and Downgrading NDB Cluster".

This section covers hardware and software requirements; networking issues; installation of NDB Cluster; basic configuration issues; starting, stopping, and restarting the cluster; loading of a sample database; and performing queries.

Assumptions. The following sections make a number of assumptions regarding the cluster's physical and network configuration. These assumptions are discussed in the next few paragraphs.

Cluster nodes and host computers. The cluster consists of four nodes, each on a separate host computer, and each with a fixed network address on a typical Ethernet network as shown here:

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 25.4 Network addresses of nodes in example cluster}
\begin{tabular}{|l|l|}
\hline Node & IP Address \\
\hline Management node (mgmd) & 198.51.100.10 \\
\hline SQL node (mysqld) & 198.51.100.20 \\
\hline Data node "A" (ndbd) & 198.51.100.30 \\
\hline Data node "B" (ndbd) & 198.51.100.40 \\
\hline
\end{tabular}
\end{table}

This setup is also shown in the following diagram:

\begin{figure}
\captionsetup{labelformat=empty}
\caption{Figure 25.4 NDB Cluster Multi-Computer Setup}
\includegraphics[alt={},max width=\textwidth]{https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3883.jpg?height=962&width=1106&top_left_y=306&top_left_x=347}
\end{figure}

Network addressing. In the interest of simplicity (and reliability), this How-To uses only numeric IP addresses. However, if DNS resolution is available on your network, it is possible to use host names in lieu of IP addresses in configuring Cluster. Alternatively, you can use the hosts file (typically /etc/ hosts for Linux and other Unix-like operating systems, C : \WINDOWS\system32\drivers\etc \hosts on Windows, or your operating system's equivalent) for providing a means to do host lookup if such is available.

NDB 8.4 supports IPv6 for connections between all NDB Cluster nodes.
Potential hosts file issues. A common problem when trying to use host names for Cluster nodes arises because of the way in which some operating systems (including some Linux distributions) set up the system's own host name in the /etc/hosts during installation. Consider two machines with the host names ndb1 and ndb2, both in the cluster network domain. Red Hat Linux (including some derivatives such as CentOS and Fedora) places the following entries in these machines' /etc/hosts files:
```
# ndb1 /etc/hosts:
127.0.0.1 ndb1.cluster ndb1 localhost.localdomain localhost
# ndb2 /etc/hosts:
127.0.0.1 ndb2.cluster ndb2 localhost.localdomain localhost
```


SUSE Linux (including OpenSUSE) places these entries in the machines' /etc/hosts files:
```
# ndb1 /etc/hosts:
127.0.0.1 localhost
127.0.0.2 ndb1.cluster ndb1
# ndb2 /etc/hosts:
127.0.0.1 localhost
127.0.0.2 ndb2.cluster ndb2
```


In both instances, ndb1 routes ndb1. cluster to a loopback IP address, but gets a public IP address from DNS for ndb2.cluster, while ndb2 routes ndb2.cluster to a loopback address and obtains a public address for ndb1.cluster. The result is that each data node connects to the management server, but cannot tell when any other data nodes have connected, and so the data nodes appear to hang while starting.

\section*{Caution}

You cannot mix localhost and other host names or IP addresses in config.ini. For these reasons, the solution in such cases (other than to use IP addresses for all config. ini HostName entries) is to remove the fully qualified host names from /etc/hosts and use these in config.ini for all cluster hosts.

Host computer type. Each host computer in our installation scenario is an Intel-based desktop PC running a supported operating system installed to disk in a standard configuration, and running no unnecessary services. The core operating system with standard TCP/IP networking capabilities should be sufficient. Also for the sake of simplicity, we also assume that the file systems on all hosts are set up identically. In the event that they are not, you should adapt these instructions accordingly.

Network hardware. Standard 100 Mbps or 1 gigabit Ethernet cards are installed on each machine, along with the proper drivers for the cards, and that all four hosts are connected through a standardissue Ethernet networking appliance such as a switch. (All machines should use network cards with the same throughput. That is, all four machines in the cluster should have 100 Mbps cards or all four machines should have 1 Gbps cards.) NDB Cluster works in a 100 Mbps network; however, gigabit Ethernet provides better performance.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3884.jpg?height=95&width=104&top_left_y=1114&top_left_x=301)

\section*{Important}

NDB Cluster is not intended for use in a network for which throughput is less than 100 Mbps or which experiences a high degree of latency. For this reason (among others), attempting to run an NDB Cluster over a wide area network such as the Internet is not likely to be successful, and is not supported in production.

Sample data. We use the world database which is available for download from the MySQL website (see https://dev.mysql.com/doc/index-other.html). We assume that each machine has sufficient memory for running the operating system, required NDB Cluster processes, and (on the data nodes) storing the database.

For general information about installing MySQL, see Chapter 2, Installing MySQL. For information about installation of NDB Cluster on Linux and other Unix-like operating systems, see Section 25.3.1, "Installation of NDB Cluster on Linux". For information about installation of NDB Cluster on Windows operating systems, see Section 25.3.2, "Installing NDB Cluster on Windows".

For general information about NDB Cluster hardware, software, and networking requirements, see Section 25.2.3, "NDB Cluster Hardware, Software, and Networking Requirements".

\subsection*{25.3.1 Installation of NDB Cluster on Linux}

This section covers installation methods for NDB Cluster on Linux and other Unix-like operating systems. While the next few sections refer to a Linux operating system, the instructions and procedures given there should be easily adaptable to other supported Unix-like platforms. For manual installation and setup instructions specific to Windows systems, see Section 25.3.2, "Installing NDB Cluster on Windows".

Each NDB Cluster host computer must have the correct executable programs installed. A host running an SQL node must have installed on it a MySQL Server binary (mysqld). Management nodes require the management server daemon (ndb_mgmd); data nodes require the data node daemon (ndbd or ndbmtd). It is not necessary to install the MySQL Server binary on management node hosts and data node hosts. It is recommended that you also install the management client (ndb_mgm) on the management server host.

Installation of NDB Cluster on Linux can be done using precompiled binaries from Oracle (downloaded as a .tar.gz archive), with RPM packages (also available from Oracle), or from source code. All three of these installation methods are described in the section that follow.

Regardless of the method used, it is still necessary following installation of the NDB Cluster binaries to create configuration files for all cluster nodes, before you can start the cluster. See Section 25.3.3, "Initial Configuration of NDB Cluster".

\subsection*{25.3.1.1 Installing an NDB Cluster Binary Release on Linux}

This section covers the steps necessary to install the correct executables for each type of Cluster node from precompiled binaries supplied by Oracle.

For setting up a cluster using precompiled binaries, the first step in the installation process for each cluster host is to download the binary archive from the NDB Cluster downloads page. (For the most recent 64-bit NDB 8.4 release, this is mysql-cluster-gpl-8.4.6-linux-glibc2.12x86_64.tar.gz.) We assume that you have placed this file in each machine's /var/tmp directory.

If you require a custom binary, see Section 2.8.5, "Installing MySQL Using a Development Source Tree".

\section*{Note}

After completing the installation, do not yet start any of the binaries. We show you how to do so following the configuration of the nodes (see Section 25.3.3, "Initial Configuration of NDB Cluster").

SQL nodes. On each of the machines designated to host SQL nodes, perform the following steps as the system root user:
1. Check your /etc/passwd and /etc/group files (or use whatever tools are provided by your operating system for managing users and groups) to see whether there is already a mysql group and mysql user on the system. Some OS distributions create these as part of the operating system installation process. If they are not already present, create a new mysql user group, and then add a mysql user to this group:
```
$> groupadd mysql
$> useradd -g mysql -s /bin/false mysql
```


The syntax for useradd and groupadd may differ slightly on different versions of Unix, or they may have different names such as adduser and addgroup.
2. Change location to the directory containing the downloaded file, unpack the archive, and create a symbolic link named mysql to the mysql directory.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3885.jpg?height=168&width=266&top_left_y=1822&top_left_x=422)

\section*{Note}

The actual file and directory names vary according to the NDB Cluster version number.
```
$> cd /var/tmp
$> tar -C /usr/local -xzvf mysql-cluster-gpl-8.4.6-linux-glibc2.12-x86_64.tar.gz
$> ln -s /usr/local/mysql-cluster-gpl-8.4.6-linux-glibc2.12-x86_64 /usr/local/mysql
```

3. Change location to the mysql directory and set up the system databases using mysqld -initialize as shown here:
```
$> cd mysql
$> mysqld --initialize
```


This generates a random password for the MySQL root account. If you do not want the random password to be generated, you can substitute the --initialize-insecure option for - - initialize. In either case, you should review Section 2.9.1, "Initializing the Data Directory", for additional information before performing this step. See also Section 6.4.2, "mysql_secure_installation - Improve MySQL Installation Security".
4. Set the necessary permissions for the MySQL server and data directories:
```
$> chown -R root .
$> chown -R mysql data
$> chgrp -R mysql.
```

5. Copy the MySQL startup script to the appropriate directory, make it executable, and set it to start when the operating system is booted up:
```
$> cp support-files/mysql.server /etc/rc.d/init.d/
$> chmod +x /etc/rc.d/init.d/mysql.server
$> chkconfig --add mysql.server
```

(The startup scripts directory may vary depending on your operating system and version-for example, in some Linux distributions, it is /etc/init.d.)

Here we use Red Hat's chkconfig for creating links to the startup scripts; use whatever means is appropriate for this purpose on your platform, such as update-rc.d on Debian.

Remember that the preceding steps must be repeated on each machine where an SQL node is to reside.

Data nodes. Installation of the data nodes does not require the mysqld binary. Only the NDB Cluster data node executable ndbd (single-threaded) or ndbmtd (multithreaded) is required. These binaries can also be found in the .tar.gz archive. Again, we assume that you have placed this archive in /var/tmp.

As system root (that is, after using sudo, su root, or your system's equivalent for temporarily assuming the system administrator account's privileges), perform the following steps to install the data node binaries on the data node hosts:
1. Change location to the /var/tmp directory, and extract the ndbd and ndbmtd binaries from the archive into a suitable directory such as /usr/local/bin:
```
$> cd /var/tmp
$> tar -zxvf mysql-cluster-gpl-8.4.6-linux-glibc2.12-x86_64.tar.gz
$> cd mysql-cluster-gpl-8.4.6-linux-glibc2.12-x86_64
$> cp bin/ndbd /usr/local/bin/ndbd
$> cp bin/ndbmtd /usr/local/bin/ndbmtd
```

(You can safely delete the directory created by unpacking the downloaded archive, and the files it contains, from /var/tmp once ndb_mgm and ndb_mgmd have been copied to the executables directory.)
2. Change location to the directory into which you copied the files, and then make both of them executable:
```
$> cd /usr/local/bin
$> chmod +x ndb*
```


The preceding steps should be repeated on each data node host.
Although only one of the data node executables is required to run an NDB Cluster data node, we have shown you how to install both ndbd and ndbmtd in the preceding instructions. We recommend that you do this when installing or upgrading NDB Cluster, even if you plan to use only one of them, since this saves time and trouble in the event that you later decide to change from one to the other.

\section*{Note}

The data directory on each machine hosting a data node is /usr/local/ mysql/data. This piece of information is essential when configuring the management node. (See Section 25.3.3, "Initial Configuration of NDB Cluster".)

Management nodes. Installation of the management node does not require the mysqld binary. Only the NDB Cluster management server (ndb_mgmd) is required; you most likely want to install the
management client (ndb_mgm) as well. Both of these binaries also be found in the .tar.gz archive. Again, we assume that you have placed this archive in /var/tmp.

As system root, perform the following steps to install ndb_mgmd and ndb_mgm on the management node host:
1. Change location to the /var/tmp directory, and extract the ndb_mgm and ndb_mgmd from the archive into a suitable directory such as /usr/local/bin:
```
$> cd /var/tmp
$> tar -zxvf mysql-cluster-gpl-8.4.6-linux-glibc2.12-x86_64.tar.gz
$> cd mysql-cluster-gpl-8.4.6-linux-glibc2.12-x86_64
$> cp bin/ndb_mgm* /usr/local/bin
```

(You can safely delete the directory created by unpacking the downloaded archive, and the files it contains, from /var/tmp once ndb_mgm and ndb_mgmd have been copied to the executables directory.)
2. Change location to the directory into which you copied the files, and then make both of them executable:
```
$> cd /usr/local/bin
$> chmod +x ndb_mgm*
```


In Section 25.3.3, "Initial Configuration of NDB Cluster", we create configuration files for all of the nodes in our example NDB Cluster.

\subsection*{25.3.1.2 Installing NDB Cluster from RPM}

This section covers the steps necessary to install the correct executables for each type of NDB Cluster node using RPM packages supplied by Oracle.

As an alternative to the method described in this section, Oracle provides MySQL Repositories for NDB Cluster that are compatible with many common Linux distributions. Two repositories, listed here, are available for RPM-based distributions:
- For distributions using yum or dnf, you can use the MySQL Yum Repository for NDB Cluster. See Installing MySQL NDB Cluster Using the Yum Repository, for instructions and additional information.
- For SLES, you can use the MySQL SLES Repository for NDB Cluster. See Installing MySQL NDB Cluster Using the SLES Repository, for instructions and additional information.

RPMs are available for both 32-bit and 64-bit Linux platforms. The filenames for these RPMs use the following pattern:
```
mysql-cluster-community-data-node-8.4.6-1.el7.x86_64.rpm
mysql-cluster-license-component-ver-rev.distro.arch.rpm
    license:= {commercial | community}
    component: {management-server | data-node | server | client | other-see text}
    ver: major.minor.release
    rev: major[.minor]
    distro: {el6 | el7 | sles12}
    arch: {i686 | x86_64}
```

license indicates whether the RPM is part of a Commercial or Community release of NDB Cluster. In the remainder of this section, we assume for the examples that you are installing a Community release.

Possible values for component, with descriptions, can be found in the following table:

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 25.5 Components of the NDB Cluster RPM distribution}
\begin{tabular}{|l|l|}
\hline Component & Description \\
\hline auto-installer (DEPRECATED) & NDB Cluster Auto Installer program; see The NDB Cluster Auto-Installer (NO LONGER SUPPORTED), for usage \\
\hline client & MySQL and NDB client programs; includes mysql client, ndb_mgm client, and other client tools \\
\hline common & Character set and error message information needed by the MySQL server \\
\hline data-node & ndbd and ndbmtd data node binaries \\
\hline devel & Headers and library files needed for MySQL client development \\
\hline embedded & Embedded MySQL server \\
\hline embedded-compat & Backwards-compatible embedded MySQL server \\
\hline embedded-devel & Header and library files for developing applications for embedded MySQL \\
\hline java & JAR files needed for support of ClusterJ applications \\
\hline libs & MySQL client libraries \\
\hline libs-compat & Backwards-compatible MySQL client libraries \\
\hline management-server & The NDB Cluster management server (ndb_mgmd) \\
\hline memcached & Files needed to support ndbmemcache \\
\hline minimal-debuginfo & Debug information for package server-minimal; useful when developing applications that use this package or when debugging this package \\
\hline ndbclient & NDB client library for running NDB API and MGM API applications (libndbclient) \\
\hline ndbclient-devel & Header and other files needed for developing NDB API and MGM API applications \\
\hline nodejs & Files needed to set up Node.JS support for NDB Cluster \\
\hline server & The MySQL server (mysqld) with NDB storage engine support included, and associated MySQL server programs \\
\hline server-minimal & Minimal installation of the MySQL server for NDB and related tools \\
\hline test & mysqltest, other MySQL test programs, and support files \\
\hline
\end{tabular}
\end{table}

A single bundle (.tar file) of all NDB Cluster RPMs for a given platform and architecture is also available. The name of this file follows the pattern shown here:
mysql-cluster-license-ver-rev.distro.arch.rpm-bundle.tar
You can extract the individual RPM files from this file using tar or your preferred tool for extracting archives.

The components required to install the three major types of NDB Cluster nodes are given in the following list:
- Management node: management-server
- Data node: data-node
- SQL node: server and common

In addition, the client RPM should be installed to provide the ndb_mgm management client on at least one management node. You may also wish to install it on SQL nodes, to have mysql and other MySQL client programs available on these. We discuss installation of nodes by type later in this section.
ver represents the three-part NDB storage engine version number in $8.4 . x$ format, shown as 8.4 .6 in the examples. rev provides the RPM revision number in major.minor format. In the examples shown in this section, we use 1.1 for this value.

The distro (Linux distribution) is one of rhel5 (Oracle Linux 5, Red Hat Enterprise Linux 4 and 5), el6 (Oracle Linux 6, Red Hat Enterprise Linux 6), el7 (Oracle Linux 7, Red Hat Enterprise Linux 7), or sles12 (SUSE Enterprise Linux 12). For the examples in this section, we assume that the host runs Oracle Linux 7, Red Hat Enterprise Linux 7, or the equivalent (el7).
arch is i686 for 32-bit RPMs and x86_64 for 64-bit versions. In the examples shown here, we assume a 64-bit platform.

The NDB Cluster version number in the RPM file names (shown here as 8.4 .6 ) can vary according to the version which you are actually using. It is very important that all of the Cluster RPMs to be installed have the same version number. The architecture should also be appropriate to the machine on which the RPM is to be installed; in particular, you should keep in mind that 64-bit RPMs (x86_64) cannot be used with 32-bit operating systems (use i686 for the latter).

Data nodes. On a computer that is to host an NDB Cluster data node it is necessary to install only the data-node RPM. To do so, copy this RPM to the data node host, and run the following command as the system root user, replacing the name shown for the RPM as necessary to match that of the RPM downloaded from the MySQL website:
\$> rpm -Uhv mysql-cluster-community-data-node-8.4.6-1.el7.x86_64.rpm
This installs the ndbd and ndbmtd data node binaries in /usr/sbin. Either of these can be used to run a data node process on this host.

SQL nodes. Copy the server and common RPMs to each machine to be used for hosting an NDB Cluster SQL node (server requires common). Install the server RPM by executing the following command as the system root user, replacing the name shown for the RPM as necessary to match the name of the RPM downloaded from the MySQL website:
\$> rpm -Uhv mysql-cluster-community-server-8.4.6-1.el7.x86_64.rpm
This installs the MySQL server binary (mysqld), with NDB storage engine support, in the /usr/sbin directory. It also installs all needed MySQL Server support files and useful MySQL server programs, including the mysql. server and mysqld_safe startup scripts (in /usr/share/mysql and / usr/bin, respectively). The RPM installer should take care of general configuration issues (such as creating the mysql user and group, if needed) automatically.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3889.jpg?height=115&width=106&top_left_y=2323&top_left_x=365)

\section*{Important}

You must use the versions of these RPMs released for NDB Cluster; those released for the standard MySQL server do not provide support for the NDB storage engine.

To administer the SQL node (MySQL server), you should also install the client RPM, as shown here:
```
$> rpm -Uhv mysql-cluster-community-client-8.4.6-1.el7.x86_64.rpm
```


This installs the mysql client and other MySQL client programs, such as mysqladmin and mysqldump, to /usr/bin.

Management nodes. To install the NDB Cluster management server, it is necessary only to use the management-server RPM. Copy this RPM to the computer intended to host the management node, and then install it by running the following command as the system root user (replace the name shown for the RPM as necessary to match that of the management-server RPM downloaded from the MySQL website):
\$> rpm -Uhv mysql-cluster-community-management-server-8.4.6-1.el7.x86_64.rpm
This RPM installs the management server binary ndb_mgmd in the /usr/sbin directory. While this is the only program actually required for running a management node, it is also a good idea to have the ndb_mgm NDB Cluster management client available as well. You can obtain this program, as well as other NDB client programs such as ndb_desc and ndb_config, by installing the client RPM as described previously.

See Section 2.5.4, "Installing MySQL on Linux Using RPM Packages from Oracle", for general information about installing MySQL using RPMs supplied by Oracle.

After installing from RPM, you still need to configure the cluster; see Section 25.3.3, "Initial Configuration of NDB Cluster", for the relevant information.

It is very important that all of the Cluster RPMs to be installed have the same version number. The architecture designation should also be appropriate to the machine on which the RPM is to be installed; in particular, you should keep in mind that 64-bit RPMs cannot be used with 32-bit operating systems.

Data nodes. On a computer that is to host a cluster data node it is necessary to install only the server RPM. To do so, copy this RPM to the data node host, and run the following command as the system root user, replacing the name shown for the RPM as necessary to match that of the RPM downloaded from the MySQL website:
\$> rpm -Uhv MySQL-Cluster-server-gpl-8.4.6-1.sles11.i386.rpm
Although this installs all NDB Cluster binaries, only the program ndbd or ndbmtd (both in /usr/sbin) is actually needed to run an NDB Cluster data node.

SQL nodes. On each machine to be used for hosting a cluster SQL node, install the server RPM by executing the following command as the system root user, replacing the name shown for the RPM as necessary to match the name of the RPM downloaded from the MySQL website:
\$> rpm -Uhv MySQL-Cluster-server-gpl-8.4.6-1.sles11.i386.rpm
This installs the MySQL server binary (mysqld) with NDB storage engine support in the /usr/sbin directory, as well as all needed MySQL Server support files. It also installs the mysql. server and mysqld_safe startup scripts (in /usr/share/mysql and /usr/bin, respectively). The RPM installer should take care of general configuration issues (such as creating the mysql user and group, if needed) automatically.

To administer the SQL node (MySQL server), you should also install the client RPM, as shown here:
\$> rpm -Uhv MySQL-Cluster-client-gpl-8.4.6-1.sles11.i386.rpm
This installs the mysql client program.
Management nodes. To install the NDB Cluster management server, it is necessary only to use the server RPM. Copy this RPM to the computer intended to host the management node, and then install it by running the following command as the system root user (replace the name shown for the RPM as necessary to match that of the server RPM downloaded from the MySQL website):
```
$> rpm -Uhv MySQL-Cluster-server-gpl-8.4.6-1.sles11.i386.rpm
```


Although this RPM installs many other files, only the management server binary ndb_mgmd (in the /usr/sbin directory) is actually required for running a management node. The server RPM also installs ndb_mgm, the NDB management client.

See Section 2.5.4, "Installing MySQL on Linux Using RPM Packages from Oracle", for general information about installing MySQL using RPMs supplied by Oracle. See Section 25.3.3, "Initial Configuration of NDB Cluster", for information about required post-installation configuration.

\subsection*{25.3.1.3 Installing NDB Cluster Using .deb Files}

The section provides information about installing NDB Cluster on Debian and related Linux distributions such Ubuntu using the .deb files supplied by Oracle for this purpose.

Oracle also provides an NDB Cluster APT repository for Debian and other distributions. See Installing MySQL NDB Cluster Using the APT Repository, for instructions and additional information.

Oracle provides . deb installer files for NDB Cluster for 32 -bit and 64 -bit platforms. For a Debianbased system, only a single installer file is necessary. This file is named using the pattern shown here, according to the applicable NDB Cluster version, Debian version, and architecture:
mysql-cluster-gpl-ndbver-debiandebianver-arch.deb
Here, ndbver is the 3-part NDB engine version number, debianver is the major version of Debian ( 8 or 9), and arch is one of i686 or x86_64. In the examples that follow, we assume you wish to install NDB 8.4.6 on a 64-bit Debian 9 system; in this case, the installer file is named mysql-cluster-gpl-8.4.6-debian9-x86_64.deb-bundle.tar.

Once you have downloaded the appropriate . deb file, you can untar it, and then install it from the command line using dpkg, like this:
\$> dpkg -i mysql-cluster-gpl-8.4.6-debian9-i686.deb
You can also remove it using dpkg as shown here:
\$> dpkg -r mysql
The installer file should also be compatible with most graphical package managers that work with. deb files, such as GDebi for the Gnome desktop.

The .deb file installs NDB Cluster under /opt/mysql/server-version/, where version is the 2-part release series version for the included MySQL server. For NDB 8.4, this is always 8.4. The directory layout is the same as that for the generic Linux binary distribution (see Table 2.3, "MySQL Installation Layout for Generic Unix/Linux Binary Package"), with the exception that startup scripts and configuration files are found in support-files instead of share. All NDB Cluster executables, such as ndb_mgm, ndbd, and ndb_mgmd, are placed in the bin directory.

\subsection*{25.3.1.4 Building NDB Cluster from Source on Linux}

This section provides information about compiling NDB Cluster on Linux and other Unix-like platforms. Building NDB Cluster from source is similar to building the standard MySQL Server, although it differs in a few key respects discussed here. For general information about building MySQL from source, see Section 2.8, "Installing MySQL from Source". For information about compiling NDB Cluster on Windows platforms, see Section 25.3.2.2, "Compiling and Installing NDB Cluster from Source on Windows".

MySQL NDB Cluster 8.4 is built from the MySQL Server 8.4 sources, available from the MySQL downloads page at https://dev.mysql.com/downloads/. The archived source file should have a name similar to mysql-8.4.6.tar.gz. You can also obtain the sources from GitHub at https://github.com/ mysql/mysql-server.

The WITH_NDB option for CMake causes the binaries for the management nodes, data nodes, and other NDB Cluster programs to be built; it also causes mysqld to be compiled with NDB storage engine support. This option is required when building NDB Cluster.

\section*{Important}

The WITH_NDB_JAVA option is enabled by default. This means that, by default, if CMake cannot find the location of Java on your system, the configuration process fails; if you do not wish to enable Java and ClusterJ support, you must indicate this explicitly by configuring the build using - DWITH_NDB_JAVA=OFF. Use WITH_CLASSPATH to provide the Java classpath if needed.

For more information about CMake options specific to building NDB Cluster, see CMake Options for Compiling NDB Cluster.

After you have run make \&\& make install (or your system's equivalent), the result is similar to what is obtained by unpacking a precompiled binary to the same location.

Management nodes. When building from source and running the default make install, the management server and management client binaries (ndb_mgmd and ndb_mgm) can be found in / usr/local/mysql/bin. Only ndb_mgmd is required to be present on a management node host; however, it is also a good idea to have ndb_mgm present on the same host machine. Neither of these executables requires a specific location on the host machine's file system.

Data nodes. The only executable required on a data node host is the data node binary ndbd or ndbmtd. (mysqld, for example, does not have to be present on the host machine.) By default, when building from source, this file is placed in the directory /usr/local/mysql/bin. For installing on multiple data node hosts, only ndbd or ndbmtd need be copied to the other host machine or machines. (This assumes that all data node hosts use the same architecture and operating system; otherwise you may need to compile separately for each different platform.) The data node binary need not be in any particular location on the host's file system, as long as the location is known.

When compiling NDB Cluster from source, no special options are required for building multithreaded data node binaries. Configuring the build with NDB storage engine support causes ndbmtd to be built automatically; make install places the ndbmtd binary in the installation bin directory along with mysqld, ndbd, and ndb_mgm.

SQL nodes. If you compile MySQL with clustering support, and perform the default installation (using make install as the system root user), mysqld is placed in /usr/local/mysql/bin. Follow the steps given in Section 2.8, "Installing MySQL from Source" to make mysqld ready for use. If you want to run multiple SQL nodes, you can use a copy of the same mysqld executable and its associated support files on several machines. The easiest way to do this is to copy the entire /usr/ local/mysql directory and all directories and files contained within it to the other SQL node host or hosts, then repeat the steps from Section 2.8, "Installing MySQL from Source" on each machine. If you configure the build with a nondefault PREFIX option, you must adjust the directory accordingly.

In Section 25.3.3, "Initial Configuration of NDB Cluster", we create configuration files for all of the nodes in our example NDB Cluster.

\subsection*{25.3.2 Installing NDB Cluster on Windows}

This section describes installation procedures for NDB Cluster on Windows hosts. NDB Cluster 8.4 binaries for Windows can be obtained from https://dev.mysql.com/downloads/cluster/. For information about installing NDB Cluster on Windows from a binary release provided by Oracle, see Section 25.3.2.1, "Installing NDB Cluster on Windows from a Binary Release".

It is also possible to compile and install NDB Cluster from source on Windows using Microsoft Visual Studio. For more information, see Section 25.3.2.2, "Compiling and Installing NDB Cluster from Source on Windows".

\subsection*{25.3.2.1 Installing NDB Cluster on Windows from a Binary Release}

This section describes a basic installation of NDB Cluster on Windows using a binary "no-install" NDB Cluster release provided by Oracle, using the same 4-node setup outlined in the beginning of this section (see Section 25.3, "NDB Cluster Installation"), as shown in the following table:

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 25.6 Network addresses of nodes in example cluster}
\begin{tabular}{|l|l|}
\hline Node & IP Address \\
\hline Management node (mgmd) & 198.51.100.10 \\
\hline SQL node (mysqld) & 198.51.100.20 \\
\hline Data node "A" (ndbd) & 198.51.100.30 \\
\hline Data node "B" (ndbd) & 198.51.100.40 \\
\hline
\end{tabular}
\end{table}

As on other platforms, the NDB Cluster host computer running an SQL node must have installed on it a MySQL Server binary (mysqld. exe). You should also have the MySQL client (mysql.exe) on this host. For management nodes and data nodes, it is not necessary to install the MySQL Server binary; however, each management node requires the management server daemon (ndb_mgmd.exe); each data node requires the data node daemon (ndbd.exe or ndbmtd.exe). For this example, we refer to ndbd.exe as the data node executable, but you can install ndbmtd.exe, the multithreaded version of this program, instead, in exactly the same way. You should also install the management client (ndb_mgm. exe) on the management server host. This section covers the steps necessary to install the correct Windows binaries for each type of NDB Cluster node.

\section*{Note}

As with other Windows programs, NDB Cluster executables are named with the .exe file extension. However, it is not necessary to include the .exe extension when invoking these programs from the command line. Therefore, we often simply refer to these programs in this documentation as mysqld, mysql, ndb_mgmd, and so on. You should understand that, whether we refer (for example) to mysqld or mysqld.exe, either name means the same thing (the MySQL Server program).

For setting up an NDB Cluster using Oracles's no-install binaries, the first step in the installation process is to download the latest NDB Cluster Windows ZIP binary archive from https://dev.mysql.com/ downloads/cluster/. This archive has a filename of the mysql-cluster-gpl-ver-winarch.zip, where ver is the NDB storage engine version (such as 8.4.6), and arch is the architecture ( 32 for 32bit binaries, and 64 for 64-bit binaries). For example, the NDB Cluster 8.4.6 archive for 64-bit Windows systems is named mysql-cluster-gpl-8.4.6-win64.zip.

You can run 32-bit NDB Cluster binaries on both 32-bit and 64-bit versions of Windows; however, 64bit NDB Cluster binaries can be used only on 64-bit versions of Windows. If you are using a 32-bit version of Windows on a computer that has a 64-bit CPU, then you must use the 32-bit NDB Cluster binaries.

To minimize the number of files that need to be downloaded from the Internet or copied between machines, we start with the computer where you intend to run the SQL node.

SQL node. We assume that you have placed a copy of the archive in the directory $\mathrm{C}: \backslash$ Documents and Settings\username\My Documents\Downloads on the computer having the IP address 198.51.100.20, where username is the name of the current user. (You can obtain this name using ECHO \%USERNAME\% on the command line.) To install and run NDB Cluster executables as Windows services, this user should be a member of the Administrators group.

Extract all the files from the archive. The Extraction Wizard integrated with Windows Explorer is adequate for this task. (If you use a different archive program, be sure that it extracts all files and directories from the archive, and that it preserves the archive's directory structure.) When you are asked for a destination directory, enter C: \\, which causes the Extraction Wizard to extract the archive to the directory C: \mysql-cluster-gpl-ver-winarch. Rename this directory to C: \mysql.

It is possible to install the NDB Cluster binaries to directories other than C : \mysql\bin; however, if you do so, you must modify the paths shown in this procedure accordingly. In particular, if the MySQL Server (SQL node) binary is installed to a location other than C : \mysqlor C: \Program Files $\backslash$ MySQL\MySQL Server 8.4, or if the SQL node's data directory is in a location other than C:
\mysql\data or C:\Program Files\MySQL\MySQL Server 8.4\data, extra configuration options must be used on the command line or added to the my.ini or my.cnf file when starting the SQL node. For more information about configuring a MySQL Server to run in a nonstandard location, see Section 2.3.3, "Configuration: Manually".

For a MySQL Server with NDB Cluster support to run as part of an NDB Cluster, it must be started with the options --ndbcluster and --ndb-connectstring. While you can specify these options on the command line, it is usually more convenient to place them in an option file. To do this, create a new text file in Notepad or another text editor. Enter the following configuration information into this file:
```
[mysqld]
# Options for mysqld process:
ndbcluster # run NDB storage engine
ndb-connectstring=198.51.100.10 # location of management server
```


You can add other options used by this MySQL Server if desired (see Section 2.3.3.2, "Creating an Option File"), but the file must contain the options shown, at a minimum. Save this file as C: \mysql \my.ini. This completes the installation and setup for the SQL node.

Data nodes. An NDB Cluster data node on a Windows host requires only a single executable, one of either ndbd.exe or ndbmtd.exe. For this example, we assume that you are using ndbd.exe, but the same instructions apply when using ndbmtd. exe. On each computer where you wish to run a data node (the computers having the IP addresses 198.51.100.30 and 198.51.100.40), create the directories C: \mysql, C: \mysql\bin, and C: \mysql\cluster-data; then, on the computer where you downloaded and extracted the no-install archive, locate ndbd.exe in the C: \mysql \bin directory. Copy this file to the C: \mysql\bin directory on each of the two data node hosts.

To function as part of an NDB Cluster, each data node must be given the address or hostname of the management server. You can supply this information on the command line using the --ndbconnectstring or - c option when starting each data node process. However, it is usually preferable to put this information in an option file. To do this, create a new text file in Notepad or another text editor and enter the following text:
```
[mysql_cluster]
# Options for data node process:
ndb-connectstring=198.51.100.10 # location of management server
```


Save this file as C : \mysql\my.ini on the data node host. Create another text file containing the same information and save it on as C:mysql\my.ini on the other data node host, or copy the my.ini file from the first data node host to the second one, making sure to place the copy in the second data node's C: \mysql directory. Both data node hosts are now ready to be used in the NDB Cluster, which leaves only the management node to be installed and configured.

Management node. The only executable program required on a computer used for hosting an NDB Cluster management node is the management server program ndb_mgmd.exe. However, in order to administer the NDB Cluster once it has been started, you should also install the NDB Cluster management client program ndb_mgm. exe on the same machine as the management server. Locate these two programs on the machine where you downloaded and extracted the no-install archive; this should be the directory C: \mysql\bin on the SQL node host. Create the directory C: \mysql \bin on the computer having the IP address 198.51.100.10, then copy both programs to this directory.

You should now create two configuration files for use by ndb_mgmd . exe:
1. A local configuration file to supply configuration data specific to the management node itself. Typically, this file needs only to supply the location of the NDB Cluster global configuration file (see item 2).

To create this file, start a new text file in Notepad or another text editor, and enter the following information:
```
[mysql_cluster]
# Options for management node process
```

config-file=C:/mysql/bin/config.ini
Save this file as the text file C: \mysql\bin\my.ini.
2. A global configuration file from which the management node can obtain configuration information governing the NDB Cluster as a whole. At a minimum, this file must contain a section for each node in the NDB Cluster, and the IP addresses or hostnames for the management node and all data nodes (HostName configuration parameter). It is also advisable to include the following additional information:
- The IP address or hostname of any SQL nodes
- The data memory and index memory allocated to each data node (DataMemory and IndexMemory configuration parameters)
- The number of fragment replicas, using the NoOfReplicas configuration parameter (see Section 25.2.2, "NDB Cluster Nodes, Node Groups, Fragment Replicas, and Partitions")
- The directory where each data node stores it data and log file, and the directory where the management node keeps its log files (in both cases, the DataDir configuration parameter)

Create a new text file using a text editor such as Notepad, and input the following information:
```
[ndbd default]
# Options affecting ndbd processes on all data nodes:
NoOfReplicas=2 # Number of fragment replicas
DataDir=C:/mysql/cluster-data # Directory for each data node's data files
        # Forward slashes used in directory path,
        # rather than backslashes. This is correct;
        # see Important note in text
DataMemory=80M # Memory allocated to data storage
IndexMemory=18M # Memory allocated to index storage
    # For DataMemory and IndexMemory, we have used the
    # default values. Since the "world" database takes up
    # only about 500KB, this should be more than enough for
    # this example Cluster setup.
[ndb_mgmd]
# Management process options:
HostName=198.51.100.10 # Hostname or IP address of management node
DataDir=C:/mysql/bin/cluster-logs # Directory for management node log files
[ndbd]
# Options for data node "A":
    # (one [ndbd] section per data node)
HostName=198.51.100.30 # Hostname or IP address
[ndbd]
# Options for data node "B":
HostName=198.51.100.40 # Hostname or IP address
[mysqld]
# SQL node options:
HostName=198.51.100.20 # Hostname or IP address
```


Save this file as the text file C: \mysql\bin\config.ini.
Important
A single backslash character ( \\) cannot be used when specifying directory paths in program options or configuration files used by NDB Cluster on Windows. Instead, you must either escape each backslash character with a second backslash (\\), or replace the backslash with a forward slash character (/). For example, the following line from the [ndb_mgmd] section of an NDB Cluster config.ini file does not work:
```
DataDir=C:\mysql\bin\cluster-logs
```


\section*{Instead, you may use either of the following:}

DataDir=C:\\mysql\\bin\\cluster-logs \# Escaped backslashes
DataDir=C:/mysql/bin/cluster-logs \# Forward slashes
For reasons of brevity and legibility, we recommend that you use forward slashes in directory paths used in NDB Cluster program options and configuration files on Windows.

\subsection*{25.3.2.2 Compiling and Installing NDB Cluster from Source on Windows}

Oracle provides precompiled NDB Cluster binaries for Windows which should be adequate for most users. However, if you wish, it is also possible to compile NDB Cluster for Windows from source code. The procedure for doing this is almost identical to the procedure used to compile the standard MySQL Server binaries for Windows, and uses the same tools. However, there are two major differences:
- MySQL NDB Cluster 8.4 is built from the MySQL Server 8.4 sources, available from the MySQL downloads page at https://dev.mysql.com/downloads/. The archived source file should have a name similar to mysql-8.4.6.tar.gz. You can also obtain the sources from GitHub at https:// github.com/mysql/mysql-server.
- You must configure the build using the WITH_NDB option in addition to any other build options you wish to use with CMake. WITH_NDBCLUSTER is also supported for backwards compatibility, but is deprecated and subject to future removal.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3896.jpg?height=99&width=104&top_left_y=1242&top_left_x=301)

\section*{Important}

The WITH_NDB_JAVA option is enabled by default. This means that, by default, if CMake cannot find the location of Java on your system, the configuration process fails; if you do not wish to enable Java and ClusterJ support, you must indicate this explicitly by configuring the build using - DWITH_NDB_JAVA=OFF. (Bug \#12379735) Use WITH_CLASSPATH to provide the Java classpath if needed.

For more information about CMake options specific to building NDB Cluster, see CMake Options for Compiling NDB Cluster.

Once the build process is complete, you can create a Zip archive containing the compiled binaries; Section 2.8.4, "Installing MySQL Using a Standard Source Distribution" provides the commands needed to perform this task on Windows systems. The NDB Cluster binaries can be found in the bin directory of the resulting archive, which is equivalent to the no-install archive, and which can be installed and configured in the same manner. For more information, see Section 25.3.2.1, "Installing NDB Cluster on Windows from a Binary Release".

\subsection*{25.3.2.3 Initial Startup of NDB Cluster on Windows}

Once the NDB Cluster executables and needed configuration files are in place, performing an initial start of the cluster is simply a matter of starting the NDB Cluster executables for all nodes in the cluster. Each cluster node process must be started separately, and on the host computer where it resides. The management node should be started first, followed by the data nodes, and then finally by any SQL nodes.
1. On the management node host, issue the following command from the command line to start the management node process. The output should appear similar to what is shown here:
```
C:\mysql\bin> ndb_mgmd
2010-06-23 07:53:34 [MgmtSrvr] INFO -- NDB Cluster Management Server. mysql-8.4.7-ndb-8.4.7
2010-06-23 07:53:34 [MgmtSrvr] INFO -- Reading cluster configuration from 'config.ini'
```


The management node process continues to print logging output to the console. This is normal, because the management node is not running as a Windows service. (If you have used NDB

Cluster on a Unix-like platform such as Linux, you may notice that the management node's default behavior in this regard on Windows is effectively the opposite of its behavior on Unix systems, where it runs by default as a Unix daemon process. This behavior is also true of NDB Cluster data node processes running on Windows.) For this reason, do not close the window in which ndb_mgmd. exe is running; doing so kills the management node process. (See Section 25.3.2.4, "Installing NDB Cluster Processes as Windows Services", where we show how to install and run NDB Cluster processes as Windows services.)

The required - $f$ option tells the management node where to find the global configuration file (config.ini). The long form of this option is --config-file.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3897.jpg?height=118&width=108&top_left_y=689&top_left_x=420)

\section*{Important}

An NDB Cluster management node caches the configuration data that it reads from config.ini; once it has created a configuration cache, it ignores the config. ini file on subsequent starts unless forced to do otherwise. This means that, if the management node fails to start due to an error in this file, you must make the management node re-read config. ini after you have corrected any errors in it. You can do this by starting ndb_mgmd.exe with the --reload or --initial option on the command line. Either of these options works to refresh the configuration cache.

It is not necessary or advisable to use either of these options in the management node's my . ini file.
2. On each of the data node hosts, run the command shown here to start the data node processes:
```
C:\mysql\bin> ndbd
2010-06-23 07:53:46 [ndbd] INFO -- Configuration fetched from 'localhost:1186', generation: 1
```


In each case, the first line of output from the data node process should resemble what is shown in the preceding example, and is followed by additional lines of logging output. As with the management node process, this is normal, because the data node is not running as a Windows service. For this reason, do not close the console window in which the data node process is running; doing so kills ndbd. exe. (For more information, see Section 25.3.2.4, "Installing NDB Cluster Processes as Windows Services".)
3. Do not start the SQL node yet; it cannot connect to the cluster until the data nodes have finished starting, which may take some time. Instead, in a new console window on the management node host, start the NDB Cluster management client ndb_mgm.exe, which should be in C: \mysql\bin on the management node host. (Do not try to re-use the console window where ndb_mgmd . exe is running by typing $\mathbf{C T R L}+\mathbf{C}$, as this kills the management node.) The resulting output should look like this:
```
C:\mysql\bin> ndb_mgm
-- NDB Cluster -- Management Client --
ndb_mgm>
```


When the prompt ndb_mgm> appears, this indicates that the management client is ready to receive NDB Cluster management commands. You can observe the status of the data nodes as they start by entering ALL STATUS at the management client prompt. This command causes a running report of the data nodes's startup sequence, which should look something like this:
```
ndb_mgm> ALL STATUS
Connected to Management Server at: localhost:1186 (using cleartext)
Node 2: starting (Last completed phase 3) (mysql-8.4.7-ndb-8.4.7)
Node 3: starting (Last completed phase 3) (mysql-8.4.7-ndb-8.4.7)
Node 2: starting (Last completed phase 4) (mysql-8.4.7-ndb-8.4.7)
Node 3: starting (Last completed phase 4) (mysql-8.4.7-ndb-8.4.7)
Node 2: Started (version 8.4.7)
```

```
Node 3: Started (version 8.4.7)
ndb_mgm>
```


\section*{Note}

Commands issued in the management client are not case-sensitive; we use uppercase as the canonical form of these commands, but you are not required to observe this convention when inputting them into the ndb_mgm client. For more information, see Section 25.6.1, "Commands in the NDB Cluster Management Client".

The output produced by ALL STATUS is likely to vary from what is shown here, according to the speed at which the data nodes are able to start, the release version number of the NDB Cluster software you are using, and other factors. What is significant is that, when you see that both data nodes have started, you are ready to start the SQL node.

You can leave ndb_mgm. exe running; it has no negative impact on the performance of the NDB Cluster, and we use it in the next step to verify that the SQL node is connected to the cluster after you have started it.
4. On the computer designated as the SQL node host, open a console window and navigate to the directory where you unpacked the NDB Cluster binaries (if you are following our example, this is C : \mysql\bin).

Start the SQL node by invoking mysqld.exe from the command line, as shown here:
C:\mysql\bin> mysqld --console
The --console option causes logging information to be written to the console, which can be helpful in the event of problems. (Once you are satisfied that the SQL node is running in a satisfactory manner, you can stop it and restart it out without the --console option, so that logging is performed normally.)

In the console window where the management client (ndb_mgm.exe) is running on the management node host, enter the SHOW command, which should produce output similar to what is shown here:
```
ndb_mgm> SHOW
Connected to Management Server at: localhost:1186 (using cleartext)
Cluster Configuration
----------------------
[ndbd(NDB)] 2 node(s)
id=2 @198.51.100.30 (Version: 8.4.7-ndb-8.4.7, Nodegroup: 0, *)
id=3 @198.51.100.40 (Version: 8.4.7-ndb-8.4.7, Nodegroup: 0)
[ndb_mgmd(MGM)] 1 node(s)
id=1 @198.51.100.10 (Version: 8.4.7-ndb-8.4.7)
[mysqld(API)] 1 node(s)
id=4 @198.51.100.20 (Version: 8.4.7-ndb-8.4.7)
```


You can also verify that the SQL node is connected to the NDB Cluster in the mysql client (mysql.exe) using the SHOW ENGINE NDB STATUS statement.

You should now be ready to work with database objects and data using NDB Cluster 's NDBCLUSTER storage engine. See Section 25.3.5, "NDB Cluster Example with Tables and Data", for more information and examples.

You can also install ndb_mgmd.exe, ndbd.exe, and ndbmtd.exe as Windows services. For information on how to do this, see Section 25.3.2.4, "Installing NDB Cluster Processes as Windows Services").

\subsection*{25.3.2.4 Installing NDB Cluster Processes as Windows Services}

Once you are satisfied that NDB Cluster is running as desired, you can install the management nodes and data nodes as Windows services, so that these processes are started and stopped automatically whenever Windows is started or stopped. This also makes it possible to control these processes from the command line with the appropriate SC START and SC STOP commands, or using the Windows graphical Services utility. NET START and NET STOP commands can also be used.

Installing programs as Windows services usually must be done using an account that has Administrator rights on the system.

To install the management node as a service on Windows, invoke ndb_mgmd . exe from the command line on the machine hosting the management node, using the --install option, as shown here:
```
C:\> C:\mysql\bin\ndb_mgmd.exe --install
Installing service 'NDB Cluster Management Server'
    as '"C:\mysql\bin\ndbd.exe" "--service=ndb_mgmd"'
Service successfully installed.
```

![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3899.jpg?height=213&width=275&top_left_y=991&top_left_x=358)

\section*{Important}

When installing an NDB Cluster program as a Windows service, you should always specify the complete path; otherwise the service installation may fail with the error The system cannot find the file specified.

The --install option must be used first, ahead of any other options that might be specified for ndb_mgmd.exe. However, it is preferable to specify such options in an options file instead. If your options file is not in one of the default locations as shown in the output of ndb_mgmd.exe --help, you can specify the location using the --config-file option.

Now you should be able to start and stop the management server like this:
```
C:\> SC START ndb_mgmd
C:\> SC STOP ndb_mgmd
```


\section*{Note}

If using NET commands, you can also start or stop the management server as a Windows service using the descriptive name, as shown here:
```
C:\> NET START 'NDB Cluster Management Server'
The NDB Cluster Management Server service is starting.
The NDB Cluster Management Server service was started successfully.
C:\> NET STOP 'NDB Cluster Management Server'
The NDB Cluster Management Server service is stopping..
The NDB Cluster Management Server service was stopped successfully.
```


It is usually simpler to specify a short service name or to permit the default service name to be used when installing the service, and then reference that name when starting or stopping the service. To specify a service name other than ndb_mgmd, append it to the --install option, as shown in this example:
```
C:\> C:\mysql\bin\ndb_mgmd.exe --install=mgmd1
Installing service 'NDB Cluster Management Server'
    as '"C:\mysql\bin\ndb_mgmd.exe" "--service=mgmd1"'
Service successfully installed.
```


Now you should be able to start or stop the service using the name you have specified, like this:
```
C:\> SC START mgmd1
C:\> SC STOP mgmd1
```


To remove the management node service, use SC DELETE service_name:
```
C:\> SC DELETE mgmd1
```


Alternatively, invoke ndb_mgmd . exe with the - - remove option, as shown here:
```
C:\> C:\mysql\bin\ndb_mgmd.exe --remove
Removing service 'NDB Cluster Management Server'
Service successfully removed.
```


If you installed the service using a service name other than the default, pass the service name as the value of the ndb_mgmd . exe - - remove option, like this:
```
C:\> C:\mysql\bin\ndb_mgmd.exe --remove=mgmd1
Removing service 'mgmd1'
Service successfully removed.
```


Installation of an NDB Cluster data node process as a Windows service can be done in a similar fashion, using the --install option for ndbd.exe (or ndbmtd.exe), as shown here:
```
C:\> C:\mysql\bin\ndbd.exe --install
Installing service 'NDB Cluster Data Node Daemon' as '"C:\mysql\bin\ndbd.exe" "--service=ndbd"'
Service successfully installed.
```


Now you can start or stop the data node as shown in the following example:
```
C:\> SC START ndbd
C:\> SC STOP ndbd
```


To remove the data node service, use SC DELETE service_name:
```
C:\> SC DELETE ndbd
```


Alternatively, invoke ndbd.exe with the --remove option, as shown here:
```
C:\> C:\mysql\bin\ndbd.exe --remove
Removing service 'NDB Cluster Data Node Daemon'
Service successfully removed.
```


As with ndb_mgmd.exe (and mysqld.exe), when installing ndbd.exe as a Windows service, you can also specify a name for the service as the value of --install, and then use it when starting or stopping the service, like this:
```
C:\> C:\mysql\bin\ndbd.exe --install=dnode1
Installing service 'dnode1' as '"C:\mysql\bin\ndbd.exe" "--service=dnode1"'
Service successfully installed.
C:\> SC START dnode1
C:\> SC STOP dnode1
```


If you specified a service name when installing the data node service, you can use this name when removing it as well, as shown here:
```
C:\> SC DELETE dnode1
```


Alternatively, you can pass the service name as the value of the ndbd.exe--remove option, as shown here:
```
C:\> C:\mysql\bin\ndbd.exe --remove=dnode1
Removing service 'dnode1'
Service successfully removed.
```


Installation of the SQL node as a Windows service, starting the service, stopping the service, and removing the service are done in a similar fashion, using mysqld --install, SC START, SC STOP,
and SC DELETE (or mysqld --remove). NET commands can also be used to start or stop a service. For additional information, see Section 2.3.3.8, "Starting MySQL as a Windows Service".

\subsection*{25.3.3 Initial Configuration of NDB Cluster}

In this section, we discuss manual configuration of an installed NDB Cluster by creating and editing configuration files.

For our four-node, four-host NDB Cluster (see Cluster nodes and host computers), it is necessary to write four configuration files, one per node host.
- Each data node or SQL node requires a my. cnf file that provides two pieces of information: a connection string that tells the node where to find the management node, and a line telling the MySQL server on this host (the machine hosting the data node) to enable the NDBCLUSTER storage engine.

For more information on connection strings, see Section 25.4.3.3, "NDB Cluster Connection Strings".
- The management node needs a config.ini file telling it how many fragment replicas to maintain, how much memory to allocate for data and indexes on each data node, where to find the data nodes, where to save data to disk on each data node, and where to find any SQL nodes.

Configuring the data nodes and SQL nodes. The my.cnf file needed for the data nodes is fairly simple. The configuration file should be located in the / etc directory and can be edited using any text editor. (Create the file if it does not exist.) For example:
\$> vi /etc/my.cnf
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3901.jpg?height=122&width=99&top_left_y=1356&top_left_x=370)

Note
We show vi being used here to create the file, but any text editor should work just as well.

For each data node and SQL node in our example setup, my. cnf should look like this:
```
[mysqld]
# Options for mysqld process:
ndbcluster # run NDB storage engine
[mysql_cluster]
# Options for NDB Cluster processes:
ndb-connectstring=198.51.100.10 # location of management server
```


After entering the preceding information, save this file and exit the text editor. Do this for the machines hosting data node "A", data node "B", and the SQL node.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3901.jpg?height=118&width=104&top_left_y=2014&top_left_x=365)

\section*{Important}

Once you have started a mysqld process with the ndbcluster and ndbconnectstring parameters in the [mysqld] and [mysql_cluster] sections of the my. cnf file as shown previously, you cannot execute any CREATE TABLE or ALTER TABLE statements without having actually started the cluster. Otherwise, these statements fail with an error. This is by design.

Configuring the management node. The first step in configuring the management node is to create the directory in which the configuration file can be found and then to create the file itself. For example (running as root):
```
$> mkdir /var/lib/mysql-cluster
$> cd /var/lib/mysql-cluster
$> vi config.ini
```


For our representative setup, the config.ini file should read as follows:
```
[ndbd default]
# Options affecting ndbd processes on all data nodes:
NoOfReplicas=2 # Number of fragment replicas
DataMemory=98M # How much memory to allocate for data storage
[ndb_mgmd]
# Management process options:
HostName=198.51.100.10 # Hostname or IP address of management node
DataDir=/var/lib/mysql-cluster # Directory for management node log files
[ndbd]
# Options for data node "A":
    # (one [ndbd] section per data node)
HostName=198.51.100.30 # Hostname or IP address
NodeId=2 # Node ID for this data node
DataDir=/usr/local/mysql/data # Directory for this data node's data files
[ndbd]
# Options for data node "B":
HostName=198.51.100.40 # Hostname or IP address
NodeId=3 # Node ID for this data node
DataDir=/usr/local/mysql/data # Directory for this data node's data files
[mysqld]
# SQL node options:
HostName=198.51.100.20 # Hostname or IP address
    # (additional mysqld connections can be
    # specified for this node for various
    # purposes such as running ndb_restore)
```


\section*{Note}

The world database can be downloaded from https://dev.mysql.com/doc/indexother.html.

After all the configuration files have been created and these minimal options have been specified, you are ready to proceed with starting the cluster and verifying that all processes are running. We discuss how this is done in Section 25.3.4, "Initial Startup of NDB Cluster".

For more detailed information about the available NDB Cluster configuration parameters and their uses, see Section 25.4.3, "NDB Cluster Configuration Files", and Section 25.4, "Configuration of NDB Cluster". For configuration of NDB Cluster as relates to making backups, see Section 25.6.8.3, "Configuration for NDB Cluster Backups".

The default port for Cluster management nodes is 1186. For data nodes, the cluster can automatically allocate ports from those that are already free.

\subsection*{25.3.4 Initial Startup of NDB Cluster}

Starting the cluster is not very difficult after it has been configured. Each cluster node process must be started separately, and on the host where it resides. The management node should be started first, followed by the data nodes, and then finally by any SQL nodes:
1. On the management host, issue the following command from the system shell to start the management node process:
```
$> ndb_mgmd --initial -f /var/lib/mysql-cluster/config.ini
```


The first time that it is started, ndb_mgmd must be told where to find its configuration file, using the -f or --config-file option. This option requires that --initial or--reload also be specified; see Section 25.5.4, "ndb_mgmd — The NDB Cluster Management Server Daemon", for details.
2. On each of the data node hosts, run this command to start the ndbd process:
```
$> ndbd
```

3. If you used RPM files to install MySQL on the cluster host where the SQL node is to reside, you can (and should) use the supplied startup script to start the MySQL server process on the SQL node.

If all has gone well, and the cluster has been set up correctly, the cluster should now be operational. You can test this by invoking the ndb_mgm management node client. The output should look like that shown here, although you might see some slight differences in the output depending upon the exact version of MySQL that you are using:
```
$> ndb_mgm
-- NDB Cluster -- Management Client --
ndb_mgm> SHOW
Connected to Management Server at: localhost:1186 (using cleartext)
Cluster Configuration
[ndbd(NDB)] 2 node(s)
id=2 @198.51.100.30 (Version: 8.4.7-ndb-8.4.7, Nodegroup: 0, *)
id=3 @198.51.100.40 (Version: 8.4.7-ndb-8.4.7, Nodegroup: 0)
[ndb_mgmd(MGM)] 1 node(s)
id=1 @198.51.100.10 (Version: 8.4.7-ndb-8.4.7)
[mysqld(API)] 1 node(s)
id=4 @198.51.100.20 (Version: 8.4.7-ndb-8.4.7)
```


The SQL node is referenced here as [mysqld (API)], which reflects the fact that the mysqld process is acting as an NDB Cluster API node.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3903.jpg?height=122&width=99&top_left_y=1256&top_left_x=370)

\section*{Note}

The IP address shown for a given NDB Cluster SQL or other API node in the output of SHOW is the address used by the SQL or API node to connect to the cluster data nodes, and not to any management node.

You should now be ready to work with databases, tables, and data in NDB Cluster. See Section 25.3.5, "NDB Cluster Example with Tables and Data", for a brief discussion.

\subsection*{25.3.5 NDB Cluster Example with Tables and Data}

\section*{Note}

The information in this section applies to NDB Cluster running on both Unix and Windows platforms.

Working with database tables and data in NDB Cluster is not much different from doing so in standard MySQL. There are two key points to keep in mind:
- For a table to be replicated in the cluster, it must use the NDBCLUSTER storage engine. To specify this, use the ENGINE=NDBCLUSTER or ENGINE=NDB option when creating the table:
```
CREATE TABLE tbl_name (col_name column_definitions) ENGINE=NDBCLUSTER;
```


Alternatively, for an existing table that uses a different storage engine, use ALTER TABLE to change the table to use NDBCLUSTER:
```
ALTER TABLE tbl_name ENGINE=NDBCLUSTER;
```

- Every NDBCLUSTER table has a primary key. If no primary key is defined by the user when a table is created, the NDBCLUSTER storage engine automatically generates a hidden one. Such a key takes up space just as does any other table index. (It is not uncommon to encounter problems due to insufficient memory for accommodating these automatically created indexes.)

If you are importing tables from an existing database using the output of mysqldump, you can open the SQL script in a text editor and add the ENGINE option to any table creation statements, or replace
any existing ENGINE options. Suppose that you have the world sample database on another MySQL server that does not support NDB Cluster, and you want to export the City table:
```
$> mysqldump --add-drop-table world City > city_table.sql
```


The resulting city_table.sql file contains this table creation statement (and the INSERT statements necessary to import the table data):
```
DROP TABLE IF EXISTS ˋCityˋ;
CREATE TABLE ˋCityˋ (
    ˋIDˋ int(11) NOT NULL auto_increment,
    ˋNameˋ char(35) NOT NULL default '',
    ˋCountryCodeˋ char(3) NOT NULL default '',
    ˋDistrictˋ char(20) NOT NULL default '',
    ˋPopulationˋ int(11) NOT NULL default '0',
    PRIMARY KEY (ˋIDˋ)
) ENGINE=MyISAM;
INSERT INTO ˋCityˋ VALUES (1,'Kabul','AFG','Kabol',1780000);
INSERT INTO ˋCityˋ VALUES (2,'Qandahar','AFG','Qandahar',237500);
INSERT INTO ˋCityˋ VALUES (3,'Herat','AFG','Herat',186800);
(remaining INSERT statements omitted)
```


You need to make sure that MySQL uses the NDBCLUSTER storage engine for this table. There are two ways that this can be accomplished. One of these is to modify the table definition before importing it into the Cluster database. Using the City table as an example, modify the ENGINE option of the definition as follows:
```
DROP TABLE IF EXISTS ˋCityˋ;
CREATE TABLE ˋCityˋ (
    ˋIDˋ int(11) NOT NULL auto_increment,
    ˋNameˋ char(35) NOT NULL default '',
    ˋCountryCodeˋ char(3) NOT NULL default '',
    ˋDistrictˋ char(20) NOT NULL default '',
    ˋPopulationˋ int(11) NOT NULL default '0',
    PRIMARY KEY (ˋIDˋ)
) ENGINE=NDBCLUSTER;
INSERT INTO ˋCityˋ VALUES (1,'Kabul','AFG','Kabol',1780000);
INSERT INTO ˋCityˋ VALUES (2,'Qandahar','AFG','Qandahar',237500);
INSERT INTO ˋCityˋ VALUES (3,'Herat','AFG','Herat',186800);
(remaining INSERT statements omitted)
```


This must be done for the definition of each table that is to be part of the clustered database. The easiest way to accomplish this is to do a search-and-replace on the file that contains the definitions and replace all instances of ENGINE=engine_name with ENGINE=NDBCLUSTER. If you do not want to modify the file, you can use the unmodified file to create the tables, and then use ALTER TABLE to change their storage engine. The particulars are given later in this section.

Assuming that you have already created a database named world on the SQL node of the cluster, you can then use the mysql command-line client to read city_table.sql, and create and populate the corresponding table in the usual manner:
```
$> mysql world < city_table.sql
```


It is very important to keep in mind that the preceding command must be executed on the host where the SQL node is running (in this case, on the machine with the IP address 198.51.100.20).

To create a copy of the entire world database on the SQL node, use mysqldump on the noncluster server to export the database to a file named world. sql (for example, in the / tmp directory). Then modify the table definitions as just described and import the file into the SQL node of the cluster like this:
```
$> mysql world < /tmp/world.sql
```


If you save the file to a different location, adjust the preceding instructions accordingly.

Running SELECT queries on the SQL node is no different from running them on any other instance of a MySQL server. To run queries from the command line, you first need to log in to the MySQL Monitor in the usual way (specify the root password at the Enter password: prompt):
```
$> mysql -u root -p
Enter password:
Welcome to the MySQL monitor. Commands end with ; or \g.
Your MySQL connection id is 1 to server version: 8.4.7-ndb-8.4.7
Type 'help;' or '\h' for help. Type '\c' to clear the buffer.
mysql>
```


We simply use the MySQL server's root account and assume that you have followed the standard security precautions for installing a MySQL server, including setting a strong root password. For more information, see Section 2.9.4, "Securing the Initial MySQL Account".

It is worth taking into account that NDB Cluster nodes do not make use of the MySQL privilege system when accessing one another. Setting or changing MySQL user accounts (including the root account) effects only applications that access the SQL node, not interaction between nodes. See Section 25.6.19.2, "NDB Cluster and MySQL Privileges", for more information.

If you did not modify the ENGINE clauses in the table definitions prior to importing the SQL script, you should run the following statements at this point:
```
mysql> USE world;
mysql> ALTER TABLE City ENGINE=NDBCLUSTER;
mysql> ALTER TABLE Country ENGINE=NDBCLUSTER;
mysql> ALTER TABLE CountryLanguage ENGINE=NDBCLUSTER;
```


Selecting a database and running a SELECT query against a table in that database is also accomplished in the usual manner, as is exiting the MySQL Monitor:
```
mysql> USE world;
mysql> SELECT Name, Population FROM City ORDER BY Population DESC LIMIT 5;
+------------+------------+
| Name | Population |
+------------+------------+
| Bombay | 10500000 |
| Seoul | 9981619 |
| São Paulo | 9968485 |
| Shanghai | 9696300 |
| Jakarta | 9604900 |
+------------+------------+
 rows in set (0.34 sec)
mysql> \q
Bye
$>
```


Applications that use MySQL can employ standard APIs to access NDB tables. It is important to remember that your application must access the SQL node, and not the management or data nodes. This brief example shows how we might execute the SELECT statement just shown by using the PHP 5.X mysqli extension running on a Web server elsewhere on the network:
```
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN"
    "http://www.w3.org/TR/html4/loose.dtd">
<html>
<head>
    <meta http-equiv="Content-Type"
        content="text/html; charset=iso-8859-1">
    <title>SIMPLE mysqli SELECT</title>
</head>
<body>
<?php
    # connect to SQL node:
```

```
    $link = new mysqli('198.51.100.20', 'root', 'root_password', 'world');
    # parameters for mysqli constructor are:
    # host, user, password, database
    if( mysqli_connect_errno() )
        die("Connect failed: " . mysqli_connect_error());
    $query = "SELECT Name, Population
                FROM City
                ORDER BY Population DESC
                LIMIT 5";
    # if no errors...
    if( $result = $link->query($query) )
    {
?>
<table border="1" width="40%" cellpadding="4" cellspacing ="1">
    <tbody>
    <tr>
        <th width="10%">City</th>
        <th>Population</th>
    </tr>
<?
        # then display the results...
        while($row = $result->fetch_object())
            printf("<tr>\n <td align=\"center\">%s</td><td>%d</td>\n</tr>\n",
                    $row->Name, $row->Population);
?>
    </tbody
</table>
<?
    # ...and verify the number of rows that were retrieved
        printf("<p>Affected rows: %d</p>\n", $link->affected_rows);
    }
    else
        # otherwise, tell us what went wrong
        echo mysqli_error();
    # free the result set and the mysqli connection object
    $result->close();
    $link->close();
?>
</body>
</html>
```


We assume that the process running on the Web server can reach the IP address of the SQL node.
In a similar fashion, you can use the MySQL C API, Perl-DBI, Python-mysql, or MySQL Connectors to perform the tasks of data definition and manipulation just as you would normally with MySQL.

\subsection*{25.3.6 Safe Shutdown and Restart of NDB Cluster}

To shut down the cluster, enter the following command in a shell on the machine hosting the management node:
```
$> ndb_mgm -e shutdown
```


The - e option here is used to pass a command to the ndb_mgm client from the shell. The command causes the ndb_mgm, ndb_mgmd, and any ndbd or ndbmtd processes to terminate gracefully. Any SQL nodes can be terminated using mysqladmin shutdown and other means. On Windows platforms, assuming that you have installed the SQL node as a Windows service, you can use SC STOP service_name or NET STOP service_name.

To restart the cluster on Unix platforms, run these commands:
- On the management host (198.51.100.10 in our example setup):
```
ndb_mgmd -f /var/lib/mysql-cluster/config.ini
```

- On each of the data node hosts (198.51.100.30 and 198.51.100.40):
```
ndbd
```

- Use the ndb_mgm client to verify that both data nodes have started successfully.
- On the SQL host (198.51.100.20):
```
mysqld_safe &
```


On Windows platforms, assuming that you have installed all NDB Cluster processes as Windows services using the default service names (see Section 25.3.2.4, "Installing NDB Cluster Processes as Windows Services"), you can restart the cluster as follows:
- On the management host (198.51.100.10 in our example setup), execute the following command:
```
C:\> SC START ndb_mgmd
```

- On each of the data node hosts (198.51.100.30 and 198.51.100.40), execute the following command:
```
C:\> SC START ndbd
```

- On the management node host, use the ndb_mgm client to verify that the management node and both data nodes have started successfully (see Section 25.3.2.3, "Initial Startup of NDB Cluster on Windows").
- On the SQL node host (198.51.100.20), execute the following command:
```
C:\> SC START mysql
```


In a production setting, it is usually not desirable to shut down the cluster completely. In many cases, even when making configuration changes, or performing upgrades to the cluster hardware or software (or both), which require shutting down individual host machines, it is possible to do so without shutting down the cluster as a whole by performing a rolling restart of the cluster. For more information about doing this, see Section 25.6.5, "Performing a Rolling Restart of an NDB Cluster".

\subsection*{25.3.7 Upgrading and Downgrading NDB Cluster}
- Versions Supported for Upgrade to NDB 8.4
- Known Issues When Upgrading or Downgrading NDB Cluster

This section provides information about NDB Cluster software and compatibility between different NDB Cluster releases with regard to performing upgrades and downgrades. You should already be familiar with installing and configuring NDB Cluster prior to attempting an upgrade or downgrade. See Section 25.4, "Configuration of NDB Cluster".

For information about upgrades to NDB 8.4 from previous versions, see Versions Supported for Upgrade to NDB 8.4.

For information about known issues and problems encountered when upgrading or downgrading NDB 8.4, see Known Issues When Upgrading or Downgrading NDB Cluster.

\section*{Versions Supported for Upgrade to NDB 8.4}

The following versions of NDB Cluster are supported for upgrades to NDB Cluster 8.4:
- NDB Cluster 8.0: NDB 8.0.19 and later
- NDB Cluster 8.1 (8.1.0)
- NDB Cluster 8.2 (8.2.0)
- NDB Cluster 8.3 (8.3.0)

\section*{Known Issues When Upgrading or Downgrading NDB Cluster}

In this section, provide information about issues known to occur when upgrading or downgrading to or from NDB 8.4.

We recommend that you not attempt any schema changes during any NDB Cluster software upgrade or downgrade. Some of the reasons for this are listed here:
- DDL statements on NDB tables are not possible during some phases of data node startup.
- DDL statements on NDB tables may be rejected if any data nodes are stopped during execution; stopping each data node binary (so it can be replaced with a binary from the target version) is required as part of the upgrade or downgrade process.
- DDL statements on NDB tables are not allowed while there are data nodes in the same cluster running different release versions of the NDB Cluster software.

For additional information regarding the rolling restart procedure used to perform an online upgrade or downgrade of the data nodes, see Section 25.6.5, "Performing a Rolling Restart of an NDB Cluster".

\subsection*{25.4 Configuration of NDB Cluster}

A MySQL server that is part of an NDB Cluster differs in one chief respect from a normal (nonclustered) MySQL server, in that it employs the NDB storage engine. This engine is also referred to sometimes as NDBCLUSTER, although NDB is preferred.

To avoid unnecessary allocation of resources, the server is configured by default with the NDB storage engine disabled. To enable NDB, you must modify the server's my. cnf configuration file, or start the server with the --ndbcluster option.

This MySQL server is a part of the cluster, so it also must know how to access a management node to obtain the cluster configuration data. The default behavior is to look for the management node on localhost. However, should you need to specify that its location is elsewhere, this can be done in my.cnf, or with the mysql client. Before the NDB storage engine can be used, at least one management node must be operational, as well as any desired data nodes.

For more information about - - ndbcluster and other mysqld options specific to NDB Cluster, see MySQL Server Options for NDB Cluster.

For general information about installing NDB Cluster, see Section 25.3, "NDB Cluster Installation".

\subsection*{25.4.1 Quick Test Setup of NDB Cluster}

To familiarize you with the basics, we describe the simplest possible configuration for a functional NDB Cluster. After this, you should be able to design your desired setup from the information provided in the other relevant sections of this chapter.

First, you need to create a configuration directory such as /var/lib/mysql-cluster, by executing the following command as the system root user:
```
$> mkdir /var/lib/mysql-cluster
```


In this directory, create a file named config. ini that contains the following information. Substitute appropriate values for HostName and DataDir as necessary for your system.
```
# file "config.ini" - showing minimal setup consisting of 1 data node,
```

```
# 1 management server, and 3 MySQL servers.
# The empty default sections are not required, and are shown only for
# the sake of completeness.
# Data nodes must provide a hostname but MySQL Servers are not required
# to do so.
# If you do not know the hostname for your machine, use localhost.
# The DataDir parameter also has a default value, but it is recommended to
# set it explicitly.
# [api] and [mgm] are aliases for [mysqld] and [ndb_mgmd], respectively.
[ndbd default]
NoOfReplicas= 1
[mysqld default]
[ndb_mgmd default]
[tcp default]
[ndb_mgmd]
HostName= myhost.example.com
[ndbd]
HostName= myhost.example.com
DataDir= /var/lib/mysql-cluster
[mysqld]
[mysqld]
[mysqld]
```


You can now start the ndb_mgmd management server. By default, it attempts to read the config. ini file in its current working directory, so change location into the directory where the file is located and then invoke ndb_mgmd:
```
$> cd /var/lib/mysql-cluster
$> ndb_mgmd
```


Then start a single data node by running ndbd:
```
$> ndbd
```


By default, ndbd looks for the management server at localhost on port 1186.

Finally, change location to the MySQL data directory (usually /var/lib/mysql or /usr/local/ mysql/data), and make sure that the my.cnf file contains the option necessary to enable the NDB storage engine:
```
[mysqld]
ndbcluster
```


You can now start the MySQL server as usual:
```
$> mysqld_safe --user=mysql &
```


Wait a moment to make sure the MySQL server is running properly. If you see the notice mysql ended, check the server's .err file to find out what went wrong.

If all has gone well so far, you now can start using the cluster. Connect to the server and verify that the NDBCLUSTER storage engine is enabled:
```
$> mysql
Welcome to the MySQL monitor. Commands end with ; or \g.
Your MySQL connection id is 1 to server version: 8.4.9
```

```
Type 'help;' or '\h' for help. Type '\c' to clear the buffer.
mysql> SHOW ENGINES\G
...
*************************** 12. row ***************************************
Engine: NDBCLUSTER
Support: YES
Comment: Clustered, fault-tolerant, memory-based tables
*************************** 13. row ***************************************
Engine: NDB
Support: YES
Comment: Alias for NDBCLUSTER
...
```


The row numbers shown in the preceding example output may be different from those shown on your system, depending upon how your server is configured.

Try to create an NDBCLUSTER table:
```
$> mysql
mysql> USE test;
Database changed
mysql> CREATE TABLE ctest (i INT) ENGINE=NDBCLUSTER;
Query OK, 0 rows affected (0.09 sec)
mysql> SHOW CREATE TABLE ctest \G
************************** 1. row ******************************
    Table: ctest
Create Table: CREATE TABLE ˋctestˋ (
    ˋiˋ int(11) default NULL
) ENGINE=ndbcluster DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
1 row in set (0.00 sec)
```


To check that your nodes were set up properly, start the management client:
```
$> ndb_mgm
```


Use the SHOW command from within the management client to obtain a report on the cluster's status:
```
ndb_mgm> SHOW
Cluster Configuration
-----------------------
[ndbd(NDB)] 1 node(s)
id=2 @127.0.0.1 (Version: 8.4.7-ndb-8.4.7, Nodegroup: 0, *)
[ndb_mgmd(MGM)] 1 node(s)
id=1 @127.0.0.1 (Version: 8.4.7-ndb-8.4.7)
[mysqld(API)] 3 node(s)
id=3 @127.0.0.1 (Version: 8.4.7-ndb-8.4.7)
id=4 (not connected, accepting connect from any host)
id=5 (not connected, accepting connect from any host)
```


At this point, you have successfully set up a working NDB Cluster. You can now store data in the cluster by using any table created with ENGINE=NDBCLUSTER or its alias ENGINE=NDB.

\subsection*{25.4.2 Overview of NDB Cluster Configuration Parameters, Options, and Variables}

The next several sections provide summary tables of NDB Cluster node configuration parameters used in the config.ini file to govern various aspects of node behavior, as well as of options and variables read by mysqld from a my. cnf file or from the command line when run as an NDB Cluster process. Each of the node parameter tables lists the parameters for a given type (ndbd, ndb_mgmd, mysqld, computer, tcp, or shm). All tables include the data type for the parameter, option, or variable, as well as its default, minimum, and maximum values as applicable.

Considerations when restarting nodes. For node parameters, these tables also indicate what type of restart is required (node restart or system restart)-and whether the restart must be done with --initial-to change the value of a given configuration parameter. When performing a node restart or an initial node restart, all of the cluster's data nodes must be restarted in turn (also referred to as a rolling restart). It is possible to update cluster configuration parameters marked as node online-that is, without shutting down the cluster-in this fashion. An initial node restart requires restarting each ndbd process with the --initial option.

A system restart requires a complete shutdown and restart of the entire cluster. An initial system restart requires taking a backup of the cluster, wiping the cluster file system after shutdown, and then restoring from the backup following the restart.

In any cluster restart, all of the cluster's management servers must be restarted for them to read the updated configuration parameter values.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3911.jpg?height=117&width=104&top_left_y=845&top_left_x=365)

> Important
> Values for numeric cluster parameters can generally be increased without any problems, although it is advisable to do so progressively, making such adjustments in relatively small increments. Many of these can be increased online, using a rolling restart.

> However, decreasing the values of such parameters-whether this is done using a node restart, node initial restart, or even a complete system restart of the cluster-is not to be undertaken lightly; it is recommended that you do so only after careful planning and testing. This is especially true with regard to those parameters that relate to memory usage and disk space, such as MaxNoOfTables, MaxNoOforderedIndexes, and MaxNoOfUniqueHashIndexes. In addition, it is the generally the case that configuration parameters relating to memory and disk usage can be raised using a simple node restart, but they require an initial node restart to be lowered.

Because some of these parameters can be used for configuring more than one type of cluster node, they may appear in more than one of the tables.

\section*{Note}

4294967039 often appears as a maximum value in these tables. This value is defined in the NDBCLUSTER sources as MAX_INT_RNIL and is equal to 0xFFFFFEFF, or $2^{32}-2^{8}-1$.

\subsection*{25.4.2.1 NDB Cluster Data Node Configuration Parameters}

The listings in this section provide information about parameters used in the [ndbd] or [ndbd default] sections of a config.ini file for configuring NDB Cluster data nodes. For detailed descriptions and other additional information about each of these parameters, see Section 25.4.3.6, "Defining NDB Cluster Data Nodes".

These parameters also apply to ndbmtd, the multithreaded version of ndbd. A separate listing of parameters specific to ndbmtd follows.
- ApiFailureHandlingTimeout: Maximum time for API node failure handling before escalating. 0 means no time limit; minimum usable value is 10 .
- Arbitration: How arbitration should be performed to avoid split-brain issues in event of node failure.
- ArbitrationTimeout: Maximum time (milliseconds) database partition waits for arbitration signal.
- BackupDataBufferSize: Default size of databuffer for backup (in bytes).
- BackupDataDir: Path to where to store backups. Note that string '/BACKUP' is always appended to this setting, so that *effective* default is FileSystemPath/BACKUP.
- BackupDiskWriteSpeedPct: Sets percentage of data node's allocated maximum write speed (MaxDiskWriteSpeed) to reserve for LCPs when starting backup.
- BackupLogBufferSize: Default size of log buffer for backup (in bytes).
- BackupMaxWriteSize: Maximum size of file system writes made by backup (in bytes).
- BackupMemory: Total memory allocated for backups per node (in bytes).
- BackupReportFrequency: Frequency of backup status reports during backup in seconds.
- BackupWriteSize: Default size of file system writes made by backup (in bytes).
- BatchSizePerLocalScan: Used to calculate number of lock records for scan with hold lock.
- BuildIndexThreads: Number of threads to use for building ordered indexes during system or node restart. Also applies when running ndb_restore --rebuild-indexes. Setting this parameter to 0 disables multithreaded building of ordered indexes.
- CompressedBackup: Use zlib to compress backups as they are written.
- CompressedLCP: Write compressed LCPs using zlib.
- ConnectCheckIntervalDelay: Time between data node connectivity check stages. Data node is considered suspect after 1 interval and dead after 2 intervals with no response.
- CrashOnCorruptedTuple: When enabled, forces node to shut down whenever it detects corrupted tuple.
- DataDir: Data directory for this node.
- DataMemory: Number of bytes on each data node allocated for storing data; subject to available system RAM and size of IndexMemory.
- DefaultHashMapSize: Set size (in buckets) to use for table hash maps. Three values are supported: 0, 240, and 3840.
- DictTrace: Enable DBDICT debugging; for NDB development.
- DiskDataUsingSameDisk: Set to false if Disk Data tablespaces are located on separate physical disks.
- DiskIOThreadPool: Number of unbound threads for file access, applies to disk data only.
- Diskless: Run without using disk.
- DiskPageBufferEntries: Memory to allocate in DiskPageBufferMemory; very large disk transactions may require increasing this value.
- DiskPageBufferMemory: Number of bytes on each data node allocated for disk page buffer cache.
- DiskSyncSize: Amount of data written to file before synch is forced.
- EnablePartialLcp: Enable partial LCP (true); if this is disabled (false), all LCPs write full checkpoints.
- EnableRedoControl: Enable adaptive checkpointing speed for controlling redo log usage.
- EncryptedFileSystem: Encrypt local checkpoint and tablespace files..
- EventLogBufferSize: Size of circular buffer for NDB log events within data nodes.
- ExecuteOnComputer: String referencing earlier defined COMPUTER.
- ExtraSendBufferMemory: Memory to use for send buffers in addition to any allocated by TotalSendBufferMemory or SendBufferMemory. Default (0) allows up to 16 MB .
- FileSystemPath: Path to directory where data node stores its data (directory must exist).
- FileSystemPathDataFiles: Path to directory where data node stores its Disk Data files. Default value is FilesystemPathDD, if set; otherwise, FilesystemPath is used if it is set; otherwise, value of DataDir is used.
- FileSystemPathDD: Path to directory where data node stores its Disk Data and undo files. Default value is FileSystemPath, if set; otherwise, value of DataDir is used.
- FileSystemPathUndoFiles: Path to directory where data node stores its undo files for Disk Data. Default value is FilesystemPathDD, if set; otherwise, FilesystemPath is used if it is set; otherwise, value of DataDir is used.
- FragmentLogFileSize: Size of each redo log file.
- HeartbeatIntervalDbApi: Time between API node-data node heartbeats. (API connection closed after 3 missed heartbeats).
- HeartbeatIntervalDbDb: Time between data node-to-data node heartbeats; data node considered dead after 3 missed heartbeats.
- HeartbeatOrder: Sets order in which data nodes check each others' heartbeats for determining whether given node is still active and connected to cluster. Must be zero for all data nodes or distinct nonzero values for all data nodes; see documentation for further guidance.
- HostName: Host name or IP address for this data node.
- IndexMemory: Number of bytes on each data node allocated for storing indexes; subject to available system RAM and size of DataMemory.
- IndexStatAutoCreate: Enable/disable automatic statistics collection when indexes are created.
- IndexStatAutoUpdate: Monitor indexes for changes and trigger automatic statistics updates.
- IndexStatSaveScale: Scaling factor used in determining size of stored index statistics.
- IndexStatSaveSize: Maximum size in bytes for saved statistics per index.
- IndexStatTriggerPct: Threshold percent change in DML operations for index statistics updates. Value is scaled down by IndexStatTriggerScale.
- IndexStatTriggerScale: Scale down IndexStatTriggerPct by this amount, multiplied by base 2 logarithm of index size, for large index. Set to 0 to disable scaling.
- IndexStatUpdateDelay: Minimum delay between automatic index statistics updates for given index. 0 means no delay.
- InitFragmentLogFiles: Initialize fragment log files, using sparse or full format.
- InitialLogFileGroup: Describes log file group that is created during initial start. See documentation for format.
- InitialNoOfOpenFiles: Initial number of files open per data node. (One thread is created per file).
- InitialTablespace: Describes tablespace that is created during initial start. See documentation for format.
- InsertRecoveryWork: Percentage of RecoveryWork used for inserted rows; has no effect unless partial local checkpoints are in use.
- KeepAliveSendInterval: Time between keep-alive signals on links between data nodes, in milliseconds. Set to 0 to disable.
- LateAlloc: Allocate memory after connection to management server has been established.
- LcpScanProgressTimeout: Maximum time that local checkpoint fragment scan can be stalled before node is shut down to ensure systemwide LCP progress. Use 0 to disable.
- LocationDomainId: Assign this data node to specific availability domain or zone. 0 (default) leaves this unset.
- LockExecuteThreadToCPU: Comma-delimited list of CPU IDs.
- LockMaintThreadsToCPU: CPU ID indicating which CPU runs maintenance threads.
- LockPagesInMainMemory: 0=disable locking, 1=lock after memory allocation, 2=lock before memory allocation.
- LogLevelCheckpoint: Log level of local and global checkpoint information printed to stdout.
- LogLevelCongestion: Level of congestion information printed to stdout.
- LogLevelConnection: Level of node connect/disconnect information printed to stdout.
- LogLevelError: Transporter, heartbeat errors printed to stdout.
- LogLevelInfo: Heartbeat and log information printed to stdout.
- LogLevelNodeRestart: Level of node restart and node failure information printed to stdout.
- LogLevelShutdown: Level of node shutdown information printed to stdout.
- LogLevelStartup: Level of node startup information printed to stdout.
- LogLevelStatistic: Level of transaction, operation, and transporter information printed to stdout.
- LongMessageBuffer: Number of bytes allocated on each data node for internal long messages.
- MaxAllocate: No longer used; has no effect.
- MaxBufferedEpochs: Allowed numbered of epochs that subscribing node can lag behind (unprocessed epochs). Exceeding causes lagging subscribers to be disconnected.
- MaxBufferedEpochBytes: Total number of bytes allocated for buffering epochs.
- MaxDiskDataLatency: Maximum allowed mean latency of disk access (ms) before starting to abort transactions.
- MaxDiskWriteSpeed: Maximum number of bytes per second that can be written by LCP and backup when no restarts are ongoing.
- MaxDiskWriteSpeedOtherNodeRestart: Maximum number of bytes per second that can be written by LCP and backup when another node is restarting.
- MaxDiskWriteSpeedOwnRestart: Maximum number of bytes per second that can be written by LCP and backup when this node is restarting.
- MaxFKBuildBatchSize: Maximum scan batch size to use for building foreign keys. Increasing this value may speed up builds of foreign keys but impacts ongoing traffic as well.
- MaxDMLOperationsPerTransaction: Limit size of transaction; aborts transaction if it requires more than this many DML operations.
- MaxLCPStartDelay: Time in seconds that LCP polls for checkpoint mutex (to allow other data nodes to complete metadata synchronization), before putting itself in lock queue for parallel recovery of table data.
- MaxNoOfAttributes: Suggests total number of attributes stored in database (sum over all tables).
- MaxNoOfConcurrentIndexOperations: Total number of index operations that can execute simultaneously on one data node.
- MaxNoOfConcurrentOperations: Maximum number of operation records in transaction coordinator.
- MaxNoOfConcurrentScans: Maximum number of scans executing concurrently on data node.
- MaxNoOfConcurrentSubOperations: Maximum number of concurrent subscriber operations.
- MaxNoOfConcurrentTransactions: Maximum number of transactions executing concurrently on this data node, total number of transactions that can be executed concurrently is this value times number of data nodes in cluster.
- MaxNoOfFiredTriggers: Total number of triggers that can fire simultaneously on one data node.
- MaxNoOfLocalOperations: Maximum number of operation records defined on this data node.
- MaxNoOfLocalScans: Maximum number of fragment scans in parallel on this data node.
- MaxNoOfOpenFiles: Maximum number of files open per data node.(One thread is created per file).
- MaxNoOfOrderedIndexes: Total number of ordered indexes that can be defined in system.
- MaxNoOfSavedMessages: Maximum number of error messages to write in error log and maximum number of trace files to retain.
- MaxNoOfSubscribers: Maximum number of subscribers.
- MaxNoOfSubscriptions: Maximum number of subscriptions (default $0=$ MaxNoOfTables).
- MaxNoOfTables: Suggests total number of NDB tables stored in database.
- MaxNoOfTriggers: Total number of triggers that can be defined in system.
- MaxNoOfUniqueHashIndexes: Total number of unique hash indexes that can be defined in system.
- MaxParallelCopyInstances: Number of parallel copies during node restarts. Default is 0 , which uses number of LDMs on both nodes, to maximum of 16 .
- MaxParallelScansPerFragment: Maximum number of parallel scans per fragment. Once this limit is reached, scans are serialized.
- MaxReorgBuildBatchSize: Maximum scan batch size to use for reorganization of table partitions. Increasing this value may speed up table partition reorganization but impacts ongoing traffic as well.
- MaxStartFailRetries: Maximum retries when data node fails on startup, requires StopOnError = 0 . Setting to 0 causes start attempts to continue indefinitely.
- MaxUIBuildBatchSize: Maximum scan batch size to use for building unique keys. Increasing this value may speed up builds of unique keys but impacts ongoing traffic as well.
- MemReportFrequency: Frequency of memory reports in seconds; $0=$ report only when exceeding percentage limits.
- MinDiskWriteSpeed: Minimum number of bytes per second that can be written by LCP and backup.
- MinFreePct: Percentage of memory resources to keep in reserve for restarts.
- NodeGroup: Node group to which data node belongs; used only during initial start of cluster.
- NodeGroupTransporters: Number of transporters to use between nodes in same node group.
- NodeId: Number uniquely identifying data node among all nodes in cluster.
- NoOfFragmentLogFiles: Number of 16 MB redo log files in each of 4 file sets belonging to data node.
- NoOfReplicas: Number of copies of all data in database.
- Numa: (Linux only; requires libnuma) Controls NUMA support. Setting to 0 permits system to determine use of interleaving by data node process; 1 means that it is determined by data node.
- ODirect: Use O_DIRECT file reads and writes when possible.
- ODirectSyncFlag: O_DIRECT writes are treated as synchronized writes; ignored when ODirect is not enabled, InitFragmentLogFiles is set to SPARSE, or both.
- RealtimeScheduler: When true, data node threads are scheduled as real-time threads. Default is false.
- RecoveryWork: Percentage of storage overhead for LCP files: greater value means less work in normal operations, more work during recovery.
- RedoBuffer: Number of bytes on each data node allocated for writing redo logs.
- RedoOverCommitCounter: When RedoOverCommitLimit has been exceeded this many times, transactions are aborted, and operations are handled as specified by DefaultOperationRedoProblemAction.
- RedoOverCommitLimit: Each time that flushing current redo buffer takes longer than this many seconds, number of times that this has happened is compared to RedoOverCommitCounter.
- RequireEncryptedBackup: Whether backups must be encrypted ( $1=$ encryption required, otherwise 0 ).
- RequireCertificate: Node is required to find key and certificate in TLS search path.
- RequireTls: Require TLS-authenticated secure connections.
- ReservedConcurrentIndexOperations: Number of simultaneous index operations having dedicated resources on one data node.
- ReservedConcurrentOperations: Number of simultaneous operations having dedicated resources in transaction coordinators on one data node.
- ReservedConcurrentScans: Number of simultaneous scans having dedicated resources on one data node.
- ReservedConcurrentTransactions: Number of simultaneous transactions having dedicated resources on one data node.
- ReservedFiredTriggers: Number of triggers having dedicated resources on one data node.
- ReservedLocalScans: Number of simultaneous fragment scans having dedicated resources on one data node.
- ReservedTransactionBufferMemory: Dynamic buffer space (in bytes) for key and attribute data allocated to each data node.
- RestartOnErrorInsert: Control type of restart caused by inserting error (when StopOnError is enabled).
- RestartSubscriberConnectTimeout: Amount of time for data node to wait for subscribing API nodes to connect. Set to 0 to disable timeout, which is always resolved to nearest full second.
- SchedulerExecutionTimer: Number of microseconds to execute in scheduler before sending.
- SchedulerResponsiveness: Set NDB scheduler response optimization 0-10; higher values provide better response time but lower throughput.
- SchedulerSpinTimer: Number of microseconds to execute in scheduler before sleeping.
- ServerPort: Port used to set up transporter for incoming connections from API nodes.
- SharedGlobalMemory: Total number of bytes on each data node allocated for any use.
- SpinMethod: Determines spin method used by data node; see documentation for details.
- StartFailRetryDelay: Delay in seconds after start failure prior to retry; requires StopOnError = 0 .
- StartFailureTimeout: Milliseconds to wait before terminating. (0=Wait forever).
- StartNoNodeGroupTimeout: Time to wait for nodes without nodegroup before trying to start (0=forever).
- StartPartialTimeout: Milliseconds to wait before trying to start without all nodes. (0=Wait forever).
- StartPartitionedTimeout: Milliseconds to wait before trying to start partitioned. (0=Wait forever).
- StartupStatusReportFrequency: Frequency of status reports during startup.
- StopOnError: When set to 0 , data node automatically restarts and recovers following node failures.
- StringMemory: Default size of string memory (0 to $100=\%$ of maximum, 101+= actual bytes).
- TcpBind_INADDR_ANY: Bind IP_ADDR_ANY so that connections can be made from anywhere (for autogenerated connections).
- TimeBetweenEpochs: Time between epochs (synchronization used for replication).
- TimeBetweenEpochsTimeout: Timeout for time between epochs. Exceeding causes node shutdown.
- TimeBetweenGlobalCheckpoints: Time between group commits of transactions to disk.
- TimeBetweenGlobalCheckpointsTimeout: Minimum timeout for group commit of transactions to disk.
- TimeBetweenInactiveTransactionAbortCheck: Time between checks for inactive transactions.
- TimeBetweenLocalCheckpoints: Time between taking snapshots of database (expressed in base-2 logarithm of bytes).
- TimeBetweenWatchDogCheck: Time between execution checks inside data node.
- TimeBetweenWatchDogCheckInitial: Time between execution checks inside data node (early start phases when memory is allocated).
- TotalSendBufferMemory: Total memory to use for all transporter send buffers..
- TransactionBufferMemory: Dynamic buffer space (in bytes) for key and attribute data allocated for each data node.
- TransactionDeadlockDetectionTimeout: Time transaction can spend executing within data node. This is time that transaction coordinator waits for each data node participating in transaction to execute request. If data node takes more than this amount of time, transaction is aborted.
- TransactionInactiveTimeout: Milliseconds that application waits before executing another part of transaction. This is time transaction coordinator waits for application to execute or send another part (query, statement) of transaction. If application takes too much time, then transaction is aborted. Timeout $=0$ means that application never times out.
- TransactionMemory: Memory allocated for transactions on each data node.
- TwoPassInitialNodeRestartCopy: Copy data in 2 passes during initial node restart, which enables multithreaded building of ordered indexes for such restarts.
- UndoDataBuffer: Unused; has no effect.
- UndoIndexBuffer: Unused; has no effect.
- UseShm: Use shared memory connections between this data node and API node also running on this host.
- WatchDogImmediateKill: When true, threads are immediately killed whenever watchdog issues occur; used for testing and debugging.

The following parameters are specific to ndbmtd:
- AutomaticThreadConfig: Use automatic thread configuration; overrides any settings for ThreadConfig and MaxNoOfExecutionThreads, and disables ClassicFragmentation.
- ClassicFragmentation: When true, use traditional table fragmentation; set false to enable flexible distribution of fragments among LDMs. Disabled by AutomaticThreadConfig.
- EnableMultithreadedBackup: Enable multi-threaded backup.
- MaxNoOfExecutionThreads: For ndbmtd only, specify maximum number of execution threads.
- MaxSendDelay: Maximum number of microseconds to delay sending by ndbmtd.
- NoOfFragmentLogParts: Number of redo log file groups belonging to this data node.
- NumCPUs: Specify number of CPUs to use with AutomaticThreadConfig.
- PartitionsPerNode: Determines the number of table partitions created on each data node; not used if ClassicFragmentation is enabled.
- ThreadConfig: Used for configuration of multithreaded data nodes (ndbmtd). Default is empty string; see documentation for syntax and other information.

\subsection*{25.4.2.2 NDB Cluster Management Node Configuration Parameters}

The listing in this section provides information about parameters used in the [ndb_mgmd] or [mgm] section of a config. ini file for configuring NDB Cluster management nodes. For detailed descriptions and other additional information about each of these parameters, see Section 25.4.3.5, "Defining an NDB Cluster Management Server".
- ArbitrationDelay: When asked to arbitrate, arbitrator waits this long before voting (milliseconds).
- ArbitrationRank: If 0 , then management node is not arbitrator. Kernel selects arbitrators in order 1, 2.
- DataDir: Data directory for this node.
- ExecuteOnComputer: String referencing earlier defined COMPUTER.
- ExtraSendBufferMemory: Memory to use for send buffers in addition to any allocated by TotalSendBufferMemory or SendBufferMemory. Default ( 0 ) allows up to 16 MB .
- HeartbeatIntervalMgmdMgmd: Time between management-node-to-management-node heartbeats; connection between management nodes is considered lost after 3 missed heartbeats.
- HeartbeatThreadPriority: Set heartbeat thread policy and priority for management nodes; see manual for allowed values.
- HostName: Host name or IP address for this management node.
- Id: Number identifying management node. Now deprecated; use Nodeld instead.
- LocationDomainId: Assign this management node to specific availability domain or zone. 0 (default) leaves this unset.
- LogDestination: Where to send log messages: console, system log, or specified log file.
- NodeId: Number uniquely identifying management node among all nodes in cluster.
- PortNumber: Port number to send commands to and fetch configuration from management server.
- PortNumberStats: Port number used to get statistical information from management server.
- RequireTls: Client connection must authenticate with TLS before being used otherwise.
- TotalSendBufferMemory: Total memory to use for all transporter send buffers.
- wan: Use WAN TCP setting as default.

\section*{Note}

After making changes in a management node's configuration, it is necessary to perform a rolling restart of the cluster for the new configuration to take effect. See Section 25.4.3.5, "Defining an NDB Cluster Management Server", for more information.

To add new management servers to a running NDB Cluster, it is also necessary perform a rolling restart of all cluster nodes after modifying any existing config. ini files. For more information about issues arising when using multiple management nodes, see Section 25.2.7.10, "Limitations Relating to Multiple NDB Cluster Nodes".

\subsection*{25.4.2.3 NDB Cluster SQL Node and API Node Configuration Parameters}

The listing in this section provides information about parameters used in the [mysqld] and [api] sections of a config. ini file for configuring NDB Cluster SQL nodes and API nodes. For detailed descriptions and other additional information about each of these parameters, see Section 25.4.3.7, "Defining SQL and Other API Nodes in an NDB Cluster".
- ApiVerbose: Enable NDB API debugging; for NDB development.
- ArbitrationDelay: When asked to arbitrate, arbitrator waits this many milliseconds before voting.
- ArbitrationRank: If 0 , then API node is not arbitrator. Kernel selects arbitrators in order 1,2 .
- AutoReconnect: Specifies whether an API node should reconnect fully when disconnected from cluster.
- BatchByteSize: Default batch size in bytes.
- BatchSize: Default batch size in number of records.
- ConnectBackoffMaxTime: Specifies longest time in milliseconds $(\sim 100 \mathrm{~ms}$ resolution) to allow between connection attempts to any given data node by this API node. Excludes time elapsed while connection attempts are ongoing, which in worst case can take several seconds. Disable by setting to 0 . If no data nodes are currently connected to this API node, StartConnectBackoffMaxTime is used instead.
- ConnectionMap: Specifies which data nodes to connect.
- DefaultHashMapSize: Set size (in buckets) to use for table hash maps. Three values are supported: 0,240, and 3840.
- DefaultOperationRedoProblemAction: How operations are handled in event that RedoOverCommitCounter is exceeded.
- ExecuteOnComputer: String referencing earlier defined COMPUTER.
- ExtraSendBufferMemory: Memory to use for send buffers in addition to any allocated by TotalSendBufferMemory or SendBufferMemory. Default ( 0 ) allows up to 16 MB .
- HeartbeatThreadPriority: Set heartbeat thread policy and priority for API nodes; see manual for allowed values.
- HostName: Host name or IP address for this SQL or API node.
- Id: Number identifying MySQL server or API node (Id). Now deprecated; use Nodeld instead.
- LocationDomainId: Assign this API node to specific availability domain or zone. 0 (default) leaves this unset.
- MaxScanBatchSize: Maximum collective batch size for one scan.
- NodeId: Number uniquely identifying SQL node or API node among all nodes in cluster.
- StartConnectBackoffMaxTime: Same as ConnectBackoffMaxTime except that this parameter is used in its place if no data nodes are connected to this API node.
- TotalSendBufferMemory: Total memory to use for all transporter send buffers.
- wan: Use WAN TCP setting as default.

For a discussion of MySQL server options for NDB Cluster, see MySQL Server Options for NDB Cluster. For information about MySQL server system variables relating to NDB Cluster, see NDB Cluster System Variables.

\section*{Note}

To add new SQL or API nodes to the configuration of a running NDB Cluster, it is necessary to perform a rolling restart of all cluster nodes after adding new [mysqld] or [api] sections to the config. ini file (or files, if you are using more than one management server). This must be done before the new SQL or API nodes can connect to the cluster.

It is not necessary to perform any restart of the cluster if new SQL or API nodes can employ previously unused API slots in the cluster configuration to connect to the cluster.

\subsection*{25.4.2.4 Other NDB Cluster Configuration Parameters}

The listings in this section provide information about parameters used in the [computer], [tcp], and [shm] sections of a config.ini file for configuring NDB Cluster. For detailed descriptions
and additional information about individual parameters, see Section 25.4.3.10, "NDB Cluster TCP/IP Connections", or Section 25.4.3.12, "NDB Cluster Shared-Memory Connections", as appropriate.

The following parameters apply to the config.ini file's [computer] section:
- HostName: Host name or IP address of this computer.
- Id: Unique identifier for this computer.

The following parameters apply to the config.ini file's [tcp] section:
- AllowUnresolvedHostNames: When false (default), failure by management node to resolve host name results in fatal error; when true, unresolved host names are reported as warnings only.
- Checksum: If checksum is enabled, all signals between nodes are checked for errors.
- Group: Used for group proximity; smaller value is interpreted as being closer.
- HostName1: Name or IP address of first of two computers joined by TCP connection.
- HostName2: Name or IP address of second of two computers joined by TCP connection.
- NodeId1: ID of node (data node, API node, or management node) on one side of connection.
- NodeId2: ID of node (data node, API node, or management node) on one side of connection.
- NodeIdServer: Set server side of TCP connection.
- OverloadLimit: When more than this many unsent bytes are in send buffer, connection is considered overloaded.
- PreferIPVersion: Indicate DNS resolver preference for IP version 4 or 6 .
- PreSendChecksum: If this parameter and Checksum are both enabled, perform pre-send checksum checks, and check all TCP signals between nodes for errors.
- Proxy: ....
- ReceiveBufferMemory: Bytes of buffer for signals received by this node.
- RequireLinkTls: Read-only; is set to true if either endpoint of this connection requires TLS.
- SendBufferMemory: Bytes of TCP buffer for signals sent from this node.
- SendSignalId: Sends ID in each signal. Used in trace files. Defaults to true in debug builds.
- TcpSpinTime: Time to spin before going to sleep when receiving.
- TCP_MAXSEG_SIZE: Value used for TCP_MAXSEG.
- TCP_RCV_BUF_SIZE: Value used for SO_RCVBUF.
- TCP_SND_BUF_SIZE: Value used for SO_SNDBUF.
- TcpBind_INADDR_ANY: Bind InAddrAny instead of host name for server part of connection.

The following parameters apply to the config.ini file's [shm] section:
- Checksum: If checksum is enabled, all signals between nodes are checked for errors.
- Group: Used for group proximity; smaller value is interpreted as being closer.
- HostName1: Name or IP address of first of two computers joined by SHM connection.
- HostName2: Name or IP address of second of two computers joined by SHM connection.
- NodeId1: ID of node (data node, API node, or management node) on one side of connection.
- NodeId2: ID of node (data node, API node, or management node) on one side of connection.
- NodeIdServer: Set server side of SHM connection.
- OverloadLimit: When more than this many unsent bytes are in send buffer, connection is considered overloaded.
- PreSendChecksum: If this parameter and Checksum are both enabled, perform pre-send checksum checks, and check all SHM signals between nodes for errors.
- SendBufferMemory: Bytes in shared memory buffer for signals sent from this node.
- SendSignalId: Sends ID in each signal. Used in trace files.
- ShmKey: Shared memory key; when set to 1 , this is calculated by NDB.
- ShmSpinTime: When receiving, number of microseconds to spin before sleeping.
- ShmSize: Size of shared memory segment.
- Signum: Signal number to be used for signalling.

\subsection*{25.4.2.5 NDB Cluster mysqld Option and Variable Reference}

The following list includes command-line options, system variables, and status variables applicable within mysqld when it is running as an SQL node in an NDB Cluster. For a reference to all commandline options, system variables, and status variables used with or relating to mysqld, see Section 7.1.4, "Server Option, System Variable, and Status Variable Reference".
- Com_show_ndb_status: Count of SHOW NDB STATUS statements.
- Handler_discover: Number of times that tables have been discovered.
- ndb-applier-allow-skip-epoch: Lets replication applier skip epochs.
- ndb-batch-size: Size (in bytes) to use for NDB transaction batches.
- ndb-blob-read-batch-bytes: Specifies size in bytes that large BLOB reads should be batched into. $0=$ no limit.
- ndb-blob-write-batch-bytes: Specifies size in bytes that large BLOB writes should be batched into. $0=$ no limit.
- ndb-cluster-connection-pool: Number of connections to cluster used by MySQL.
- ndb-cluster-connection-pool-nodeids: Comma-separated list of node IDs for connections to cluster used by MySQL; number of nodes in list must match value set for --ndb-cluster-connectionpool.
- ndb-connectstring: Address of NDB management server distributing configuration information for this cluster.
- ndb-default-column-format: Use this value (FIXED or DYNAMIC) by default for COLUMN_FORMAT and ROW_FORMAT options when creating or adding table columns.
- ndb-deferred-constraints: Specifies that constraint checks on unique indexes (where these are supported) should be deferred until commit time. Not normally needed or used; for testing purposes only.
- ndb-distribution: Default distribution for new tables in NDBCLUSTER (KEYHASH or LINHASH, default is KEYHASH).
- ndb-log-apply-status: Cause MySQL server acting as replica to log mysql.ndb_apply_status updates received from its immediate source in its own binary log, using its own server ID. Effective only if server is started with --ndbcluster option.
- ndb-log-empty-epochs: When enabled, causes epochs in which there were no changes to be written to ndb_apply_status and ndb_binlog_index tables, even when --log-slave-updates is enabled.
- ndb-log-empty-update: When enabled, causes updates that produced no changes to be written to ndb_apply_status and ndb_binlog_index tables, even when --log-slave-updates is enabled.
- ndb-log-exclusive-reads: Log primary key reads with exclusive locks; allow conflict resolution based on read conflicts.
- ndb-log-fail-terminate: Terminate mysqld process if complete logging of all found row events is not possible.
- ndb-log-orig: Log originating server id and epoch in mysql.ndb_binlog_index table.
- ndb-log-transaction-dependency: Make binary log thread calculate transaction dependencies for every transaction it writes to binary log.
- ndb-log-transaction-id: Write NDB transaction IDs in binary log. Requires --log-bin-v1events=OFF.
- ndb-log-update-minimal: Log updates in minimal format.
- ndb-log-updated-only: Log updates only (ON) or complete rows (OFF).
- ndb-log-update-as-write: Toggles logging of updates on source between updates (OFF) and writes (ON).
- ndb-mgm-tls: Whether TLS connection requirements are strict or relaxed.
- ndb-mgmd-host: Set host (and port, if desired) for connecting to management server.
- ndb-nodeid: NDB Cluster node ID for this MySQL server.
- ndb-optimized-node-selection: Enable optimizations for selection of nodes for transactions. Enabled by default; use --skip-ndb-optimized-node-selection to disable.
- ndb-tls-search-path: Directories to search for NDB TLS CAs and private keys.
- ndb-transid-mysql-connection-map: Enable or disable ndb_transid_mysql_connection_map plugin; that is, enable or disable INFORMATION_SCHEMA table having that name.
- ndb-wait-connected: Time (in seconds) for MySQL server to wait for connection to cluster management and data nodes before accepting MySQL client connections.
- ndb-wait-setup: Time (in seconds) for MySQL server to wait for NDB engine setup to complete.
- ndb-allow-copying-alter-table: Set to OFF to keep ALTER TABLE from using copying operations on NDB tables.
- Ndb_api_adaptive_send_deferred_count: Number of adaptive send calls not actually sent by this MySQL Server (SQL node).
- Ndb_api_adaptive_send_deferred_count_session: Number of adaptive send calls not actually sent in this client session.
- Ndb_api_adaptive_send_deferred_count_replica: Number of adaptive send calls not actually sent by this replica.
- Ndb_api_adaptive_send_deferred_count_slave: Number of adaptive send calls not actually sent by this replica.
- Ndb_api_adaptive_send_forced_count: Number of adaptive sends with forced-send set sent by this MySQL Server (SQL node).
- Ndb_api_adaptive_send_forced_count_session: Number of adaptive sends with forcedsend set in this client session.
- Ndb_api_adaptive_send_forced_count_replica: Number of adaptive sends with forcedsend set sent by this replica.
- Ndb_api_adaptive_send_forced_count_slave: Number of adaptive sends with forced-send set sent by this replica.
- Ndb_api_adaptive_send_unforced_count: Number of adaptive sends without forced-send sent by this MySQL Server (SQL node).
- Ndb_api_adaptive_send_unforced_count_session: Number of adaptive sends without forced-send in this client session.
- Ndb_api_adaptive_send_unforced_count_replica: Number of adaptive sends without forced-send sent by this replica.
- Ndb_api_adaptive_send_unforced_count_slave: Number of adaptive sends without forcedsend sent by this replica.
- Ndb_api_bytes_received_count: Quantity of data (in bytes) received from data nodes by this MySQL Server (SQL node).
- Ndb_api_bytes_received_count_session: Quantity of data (in bytes) received from data nodes in this client session.
- Ndb_api_bytes_received_count_replica: Quantity of data (in bytes) received from data nodes by this replica.
- Ndb_api_bytes_received_count_slave: Quantity of data (in bytes) received from data nodes by this replica.
- Ndb_api_bytes_sent_count: Quantity of data (in bytes) sent to data nodes by this MySQL Server (SQL node).
- Ndb_api_bytes_sent_count_session: Quantity of data (in bytes) sent to data nodes in this client session.
- Ndb_api_bytes_sent_count_replica: Qunatity of data (in bytes) sent to data nodes by this replica.
- Ndb_api_bytes_sent_count_slave: Qunatity of data (in bytes) sent to data nodes by this replica.
- Ndb_api_event_bytes_count: Number of bytes of events received by this MySQL Server (SQL node).
- Ndb_api_event_bytes_count_injector: Number of bytes of event data received by NDB binary log injector thread.
- Ndb_api_event_data_count: Number of row change events received by this MySQL Server (SQL node).
- Ndb_api_event_data_count_injector: Number of row change events received by NDB binary log injector thread.
- Ndb_api_event_nondata_count: Number of events received, other than row change events, by this MySQL Server (SQL node).
- Ndb_api_event_nondata_count_injector: Number of events received, other than row change events, by NDB binary log injector thread.
- Ndb_api_pk_op_count: Number of operations based on or using primary keys by this MySQL Server (SQL node).
- Ndb_api_pk_op_count_session: Number of operations based on or using primary keys in this client session.
- Ndb_api_pk_op_count_replica: Number of operations based on or using primary keys by this replica.
- Ndb_api_pk_op_count_slave: Number of operations based on or using primary keys by this replica.
- Ndb_api_pruned_scan_count: Number of scans that have been pruned to one partition by this MySQL Server (SQL node).
- Ndb_api_pruned_scan_count_session: Number of scans that have been pruned to one partition in this client session.
- Ndb_api_pruned_scan_count_replica: Number of scans that have been pruned to one partition by this replica.
- Ndb_api_pruned_scan_count_slave: Number of scans that have been pruned to one partition by this replica.
- Ndb_api_range_scan_count: Number of range scans that have been started by this MySQL Server (SQL node).
- Ndb_api_range_scan_count_session: Number of range scans that have been started in this client session.
- Ndb_api_range_scan_count_replica: Number of range scans that have been started by this replica.
- Ndb_api_range_scan_count_slave: Number of range scans that have been started by this replica.
- Ndb_api_read_row_count: Total number of rows that have been read by this MySQL Server (SQL node).
- Ndb_api_read_row_count_session: Total number of rows that have been read in this client session.
- Ndb_api_read_row_count_replica: Total number of rows that have been read by this replica.
- Ndb_api_read_row_count_slave: Total number of rows that have been read by this replica.
- Ndb_api_scan_batch_count: Number of batches of rows received by this MySQL Server (SQL node).
- Ndb_api_scan_batch_count_session: Number of batches of rows received in this client session.
- Ndb_api_scan_batch_count_replica: Number of batches of rows received by this replica.
- Ndb_api_scan_batch_count_slave: Number of batches of rows received by this replica.
- Ndb_api_table_scan_count: Number of table scans that have been started, including scans of internal tables, by this MySQL Server (SQL node).
- Ndb_api_table_scan_count_session: Number of table scans that have been started, including scans of internal tables, in this client session.
- Ndb_api_table_scan_count_replica: Number of table scans that have been started, including scans of internal tables, by this replica.
- Ndb_api_table_scan_count_slave: Number of table scans that have been started, including scans of internal tables, by this replica.
- Ndb_api_trans_abort_count: Number of transactions aborted by this MySQL Server (SQL node).
- Ndb_api_trans_abort_count_session: Number of transactions aborted in this client session.
- Ndb_api_trans_abort_count_replica: Number of transactions aborted by this replica.
- Ndb_api_trans_abort_count_slave: Number of transactions aborted by this replica.
- Ndb_api_trans_close_count: Number of transactions closed by this MySQL Server (SQL node); may be greater than sum of TransCommitCount and TransAbortCount.
- Ndb_api_trans_close_count_session: Number of transactions aborted (may be greater than sum of TransCommitCount and TransAbortCount) in this client session.
- Ndb_api_trans_close_count_replica: Number of transactions aborted (may be greater than sum of TransCommitCount and TransAbortCount) by this replica.
- Ndb_api_trans_close_count_slave: Number of transactions aborted (may be greater than sum of TransCommitCount and TransAbortCount) by this replica.
- Ndb_api_trans_commit_count: Number of transactions committed by this MySQL Server (SQL node).
- Ndb_api_trans_commit_count_session: Number of transactions committed in this client session.
- Ndb_api_trans_commit_count_replica: Number of transactions committed by this replica.
- Ndb_api_trans_commit_count_slave: Number of transactions committed by this replica.
- Ndb_api_trans_local_read_row_count: Total number of rows that have been read by this MySQL Server (SQL node).
- Ndb_api_trans_local_read_row_count_session: Total number of rows that have been read in this client session.
- Ndb_api_trans_local_read_row_count_replica: Total number of rows that have been read by this replica.
- Ndb_api_trans_local_read_row_count_slave: Total number of rows that have been read by this replica.
- Ndb_api_trans_start_count: Number of transactions started by this MySQL Server (SQL node).
- Ndb_api_trans_start_count_session: Number of transactions started in this client session.
- Ndb_api_trans_start_count_replica: Number of transactions started by this replica.
- Ndb_api_trans_start_count_slave: Number of transactions started by this replica.
- Ndb_api_uk_op_count: Number of operations based on or using unique keys by this MySQL Server (SQL node).
- Ndb_api_uk_op_count_session: Number of operations based on or using unique keys in this client session.
- Ndb_api_uk_op_count_replica: Number of operations based on or using unique keys by this replica.
- Ndb_api_uk_op_count_slave: Number of operations based on or using unique keys by this replica.
- Ndb_api_wait_exec_complete_count: Number of times thread has been blocked while waiting for operation execution to complete by this MySQL Server (SQL node).
- Ndb_api_wait_exec_complete_count_session: Number of times thread has been blocked while waiting for operation execution to complete in this client session.
- Ndb_api_wait_exec_complete_count_replica: Number of times thread has been blocked while waiting for operation execution to complete by this replica.
- Ndb_api_wait_exec_complete_count_slave: Number of times thread has been blocked while waiting for operation execution to complete by this replica.
- Ndb_api_wait_meta_request_count: Number of times thread has been blocked waiting for metadata-based signal by this MySQL Server (SQL node).
- Ndb_api_wait_meta_request_count_session: Number of times thread has been blocked waiting for metadata-based signal in this client session.
- Ndb_api_wait_meta_request_count_replica: Number of times thread has been blocked waiting for metadata-based signal by this replica.
- Ndb_api_wait_meta_request_count_slave: Number of times thread has been blocked waiting for metadata-based signal by this replica.
- Ndb_api_wait_nanos_count: Total time (in nanoseconds) spent waiting for some type of signal from data nodes by this MySQL Server (SQL node).
- Ndb_api_wait_nanos_count_session: Total time (in nanoseconds) spent waiting for some type of signal from data nodes in this client session.
- Ndb_api_wait_nanos_count_replica: Total time (in nanoseconds) spent waiting for some type of signal from data nodes by this replica.
- Ndb_api_wait_nanos_count_slave: Total time (in nanoseconds) spent waiting for some type of signal from data nodes by this replica.
- Ndb_api_wait_scan_result_count: Number of times thread has been blocked while waiting for scan-based signal by this MySQL Server (SQL node).
- Ndb_api_wait_scan_result_count_session: Number of times thread has been blocked while waiting for scan-based signal in this client session.
- Ndb_api_wait_scan_result_count_replica: Number of times thread has been blocked while waiting for scan-based signal by this replica.
- Ndb_api_wait_scan_result_count_slave: Number of times thread has been blocked while waiting for scan-based signal by this replica.
- ndb_autoincrement_prefetch_sz: NDB auto-increment prefetch size.
- ndb_clear_apply_status: Causes RESET SLAVE/RESET REPLICA to clear all rows from ndb_apply_status table; ON by default.
- Ndb_cluster_node_id: Node ID of this server when acting as NDB Cluster SQL node.
- Ndb_config_from_host: NDB Cluster management server host name or IP address.
- Ndb_config_from_port: Port for connecting to NDB Cluster management server.
- Ndb_config_generation: Generation number of the current configuration of the cluster.
- Ndb_conflict_fn_epoch: Number of rows that have been found in conflict by NDB\$EPOCH() NDB replication conflict detection function.
- Ndb_conflict_fn_epoch2: Number of rows that have been found in conflict by NDB replication NDB\$EPOCH2() conflict detection function.
- Ndb_conflict_fn_epoch2_trans: Number of rows that have been found in conflict by NDB replication NDB\$EPOCH2_TRANS() conflict detection function.
- Ndb_conflict_fn_epoch_trans: Number of rows that have been found in conflict by NDB $\$ E P O C H \_\mathrm{TRANS}()$ conflict detection function.
- Ndb_conflict_fn_max: Number of times that NDB replication conflict resolution based on "greater timestamp wins" has been applied to update and delete operations.
- Ndb_conflict_fn_max_del_win: Number of times that NDB replication conflict resolution based on outcome of NDB\$MAX_DELETE_WIN() has been applied to update and delete operations.
- Ndb_conflict_fn_max_ins: Number of times that NDB replication conflict resolution based on "greater timestamp wins" has been applied to insert operations.
- Ndb_conflict_fn_max_del_win_ins: Number of times that NDB replication conflict resolution based on outcome of NDB\$MAX_DEL_WIN_INS() has been applied to insert operations.
- Ndb_conflict_fn_old: Number of times that NDB replication "same timestamp wins" conflict resolution has been applied.
- Ndb_conflict_last_conflict_epoch: Most recent NDB epoch on this replica in which some conflict was detected.
- Ndb_conflict_last_stable_epoch: Most recent epoch containing no conflicts.
- Ndb_conflict_reflected_op_discard_count: Number of reflected operations that were not applied due error during execution.
- Ndb_conflict_reflected_op_prepare_count: Number of reflected operations received that have been prepared for execution.
- Ndb_conflict_refresh_op_count: Number of refresh operations that have been prepared.
- ndb_conflict_role: Role for replica to play in conflict detection and resolution. Value is one of PRIMARY, SECONDARY, PASS, or NONE (default). Can be changed only when replication SQL thread is stopped. See documentation for further information.
- Ndb_conflict_trans_conflict_commit_count: Number of epoch transactions committed after requiring transactional conflict handling.
- Ndb_conflict_trans_detect_iter_count: Number of internal iterations required to commit epoch transaction. Should be (slightly) greater than or equal to Ndb_conflict_trans_conflict_commit_count.
- Ndb_conflict_trans_reject_count: Number of transactions rejected after being found in conflict by transactional conflict function.
- Ndb_conflict_trans_row_conflict_count: Number of rows found in conflict by transactional conflict function. Includes any rows included in or dependent on conflicting transactions.
- Ndb_conflict_trans_row_reject_count: Total number of rows realigned after being found in conflict by transactional conflict function. Includes Ndb_conflict_trans_row_conflict_count and any rows included in or dependent on conflicting transactions.
- ndb_data_node_neighbour: Specifies cluster data node "closest" to this MySQL Server, for transaction hinting and fully replicated tables.
- ndb_default_column_format: Sets default row format and column format (FIXED or DYNAMIC) used for new NDB tables.
- ndb_deferred_constraints: Specifies that constraint checks should be deferred (where these are supported). Not normally needed or used; for testing purposes only.
- ndb_dbg_check_shares: Check for any lingering shares (debug builds only).
- ndb-schema-dist-timeout: How long to wait before detecting timeout during schema distribution.
- ndb_distribution: Default distribution for new tables in NDBCLUSTER (KEYHASH or LINHASH, default is KEYHASH).
- Ndb_epoch_delete_delete_count: Number of delete-delete conflicts detected (delete operation is applied, but row does not exist).
- ndb_eventbuffer_free_percent: Percentage of free memory that should be available in event buffer before resumption of buffering, after reaching limit set by ndb_eventbuffer_max_alloc.
- ndb_eventbuffer_max_alloc: Maximum memory that can be allocated for buffering events by NDB API. Defaults to 0 (no limit).
- Ndb_execute_count: Number of round trips to NDB kernel made by operations.
- ndb_extra_logging: Controls logging of NDB Cluster schema, connection, and data distribution events in MySQL error log.
- Ndb_fetch_table_stats: Number of times table statistics were fetched from tables rather than cache.
- ndb_force_send: Forces sending of buffers to NDB immediately, without waiting for other threads.
- ndb_fully_replicated: Whether new NDB tables are fully replicated.
- ndb_index_stat_enable: Use NDB index statistics in query optimization.
- ndb_index_stat_option: Comma-separated list of tunable options for NDB index statistics; list should contain no spaces.
- ndb_join_pushdown: Enables pushing down of joins to data nodes.
- Ndb_last_commit_epoch_server: Epoch most recently committed by NDB.
- Ndb_last_commit_epoch_session: Epoch most recently committed by this NDB client.
- ndb_log_apply_status: Whether or not MySQL server acting as replica logs mysql.ndb_apply_status updates received from its immediate source in its own binary log, using its own server ID.
- ndb_log_bin: Write updates to NDB tables in binary log. Effective only if binary logging is enabled with --log-bin.
- ndb_log_binlog_index: Insert mapping between epochs and binary log positions into ndb_binlog_index table. Defaults to ON. Effective only if binary logging is enabled.
- ndb_log_cache_size: Set size of transaction cache used for recording NDB binary log.
- ndb_log_empty_epochs: When enabled, epochs in which there were no changes are written to ndb_apply_status and ndb_binlog_index tables, even when log_replica_updates or log_slave_updates is enabled.
- ndb_log_empty_update: When enabled, updates which produce no changes are written to ndb_apply_status and ndb_binlog_index tables, even when log_replica_updates or log_slave_updates is enabled.
- ndb_log_exclusive_reads: Log primary key reads with exclusive locks; allow conflict resolution based on read conflicts.
- ndb_log_orig: Whether id and epoch of originating server are recorded in mysql.ndb_binlog_index table. Set using --ndb-log-orig option when starting mysqld.
- ndb_log_transaction_id: Whether NDB transaction IDs are written into binary log (Read-only).
- ndb_log_transaction_compression: Whether to compress NDB binary log; can also be enabled on startup by enabling --binlog-transaction-compression option.
- ndb_log_transaction_compression_level_zstd: The ZSTD compression level to use when writing compressed transactions to the NDB binary log.
- ndb_metadata_check: Enable auto-detection of NDB metadata changes with respect to MySQL data dictionary; enabled by default.
- ndb_metadata_check_interval: Interval in seconds to perform check for NDB metadata changes with respect to MySQL data dictionary.
- Ndb_metadata_detected_count: Number of times NDB metadata change monitor thread has detected changes.
- Ndb_metadata_excluded_count: Number of NDB metadata objects that NDB binlog thread has failed to synchronize.
- ndb_metadata_sync: Triggers immediate synchronization of all changes between NDB dictionary and MySQL data dictionary; causes ndb_metadata_check and ndb_metadata_check_interval values to be ignored. Resets to false when synchronization is complete.
- Ndb_metadata_synced_count: Number of NDB metadata objects which have been synchronized.
- Ndb_number_of_data_nodes: Number of data nodes in this NDB cluster; set only if server participates in cluster.
- ndb-optimization-delay: Number of milliseconds to wait between processing sets of rows by OPTIMIZE TABLE on NDB tables.
- ndb_optimized_node_selection: Determines how SQL node chooses cluster data node to use as transaction coordinator.
- Ndb_pruned_scan_count: Number of scans executed by NDB since cluster was last started where partition pruning could be used.
- Ndb_pushed_queries_defined: Number of joins that API nodes have attempted to push down to data nodes.
- Ndb_pushed_queries_dropped: Number of joins that API nodes have tried to push down, but failed.
- Ndb_pushed_queries_executed: Number of joins successfully pushed down and executed on data nodes.
- Ndb_pushed_reads: Number of reads executed on data nodes by pushed-down joins.
- ndb_read_backup: Enable read from any replica for all NDB tables; use NDB_TABLE=READ_BACKUP=\{0|1\} with CREATE TABLE or ALTER TABLE to enable or disable for individual NDB tables.
- ndb_recv_thread_activation_threshold: Activation threshold when receive thread takes over polling of cluster connection (measured in concurrently active threads).
- ndb_recv_thread_cpu_mask: CPU mask for locking receiver threads to specific CPUs; specified as hexadecimal. See documentation for details.
- Ndb_replica_max_replicated_epoch: Most recently committed NDB epoch on this replica. When this value is greater than or equal to Ndb_conflict_last_conflict_epoch, no conflicts have yet been detected.
- ndb_replica_batch_size: Batch size in bytes for replica applier.
- ndb_report_thresh_binlog_epoch_slip: NDB 7.5 and later: Threshold for number of epochs completely buffered, but not yet consumed by binlog injector thread which when exceeded generates BUFFERED_EPOCHS_OVER_THRESHOLD event buffer status message; prior to NDB 7.5: Threshold for number of epochs to lag behind before reporting binary log status.
- ndb_report_thresh_binlog_mem_usage: Threshold for percentage of free memory remaining before reporting binary log status.
- ndb_row_checksum: When enabled, set row checksums; enabled by default.
- Ndb_scan_count: Total number of scans executed by NDB since cluster was last started.
- ndb_schema_dist_lock_wait_timeout: Time during schema distribution to wait for lock before returning error.
- ndb_schema_dist_timeout: Time to wait before detecting timeout during schema distribution.
- ndb_schema_dist_upgrade_allowed: Allow schema distribution table upgrade when connecting to NDB.
- Ndb_schema_participant_count: Number of MySQL servers participating in NDB schema change distribution.
- ndb_show_foreign_key_mock_tables: Show mock tables used to support foreign_key_checks=0.
- ndb_slave_conflict_role: Role for replica to play in conflict detection and resolution. Value is one of PRIMARY, SECONDARY, PASS, or NONE (default). Can be changed only when replication SQL thread is stopped. See documentation for further information.
- Ndb_slave_max_replicated_epoch: Most recently committed NDB epoch on this replica. When this value is greater than or equal to Ndb_conflict_last_conflict_epoch, no conflicts have yet been detected.
- Ndb_system_name: Configured cluster system name; empty if server not connected to NDB.
- ndb_table_no_logging: NDB tables created when this setting is enabled are not checkpointed to disk (although table schema files are created). Setting in effect when table is created with or altered to use NDBCLUSTER persists for table's lifetime.
- ndb_table_temporary: NDB tables are not persistent on disk: no schema files are created and tables are not logged.
- Ndb_trans_hint_count_session: Number of transactions using hints that have been started in this session.
- ndb_use_copying_alter_table: Use copying ALTER TABLE operations in NDB Cluster.
- ndb_use_exact_count: Forces NDB to use a count of records during SELECT COUNT(*) query planning to speed up this type of query.
- ndb_use_transactions: Set to OFF, to disable transaction support by NDB. Not recommended except in certain special cases; see documentation for details.
- ndb_version: Shows build and NDB engine version as an integer.
- ndb_version_string: Shows build information including NDB engine version in ndb-x.y.z format.
- ndbcluster: Enable NDB Cluster (if this version of MySQL supports it). Disabled by --skipndbcluster.
- ndbinfo: Enable ndbinfo plugin, if supported.
- ndbinfo_database: Name used for NDB information database; read only.
- ndbinfo_max_bytes: Used for debugging only.
- ndbinfo_max_rows: Used for debugging only.
- ndbinfo_offline: Put ndbinfo database into offline mode, in which no rows are returned from tables or views.
- ndbinfo_show_hidden: Whether to show ndbinfo internal base tables in mysql client; default is OFF.
- ndbinfo_table_prefix: Prefix to use for naming ndbinfo internal base tables; read only.
- ndbinfo_version: ndbinfo engine version; read only.
- replica_allow_batching: Turns update batching on and off for replica.
- server_id_bits: Number of least significant bits in server_id actually used for identifying server, permitting NDB API applications to store application data in most significant bits. server_id must be less than 2 to power of this value.
- skip-ndbcluster: Disable NDB Cluster storage engine.
- slave_allow_batching: Turns update batching on and off for replica.
- transaction_allow_batching: Allows batching of statements within one transaction. Disable AUTOCOMMIT to use.

\subsection*{25.4.3 NDB Cluster Configuration Files}

Configuring NDB Cluster requires working with two files:
- my.cnf: Specifies options for all NDB Cluster executables. This file, with which you should be familiar with from previous work with MySQL, must be accessible by each executable running in the cluster.
- config.ini: This file, sometimes known as the global configuration file, is read only by the NDB Cluster management server, which then distributes the information contained therein to all processes participating in the cluster. config. ini contains a description of each node involved in the cluster. This includes configuration parameters for data nodes and configuration parameters for connections between all nodes in the cluster. For a quick reference to the sections that can appear in this file, and what sorts of configuration parameters may be placed in each section, see Sections of the config.ini File.

Caching of configuration data. NDB uses stateful configuration. Rather than reading the global configuration file every time the management server is restarted, the management server caches the
configuration the first time it is started, and thereafter, the global configuration file is read only when one of the following conditions is true:
- The management server is started using the --initial option. When --initial is used, the global configuration file is re-read, any existing cache files are deleted, and the management server creates a new configuration cache.
- The management server is started using the --reload option. The - - reload option causes the management server to compare its cache with the global configuration file. If they differ, the management server creates a new configuration cache; any existing configuration cache is preserved, but not used. If the management server's cache and the global configuration file contain the same configuration data, then the existing cache is used, and no new cache is created.
- The management server is started using --config-cache=FALSE. This disables -config-cache (enabled by default), and can be used to force the management server to bypass configuration caching altogether. In this case, the management server ignores any configuration files that may be present, always reading its configuration data from the config. ini file instead.
- No configuration cache is found. In this case, the management server reads the global configuration file and creates a cache containing the same configuration data as found in the file.

Configuration cache files. The management server by default creates configuration cache files in a directory named mysql-cluster in the MySQL installation directory. (If you build NDB Cluster from source on a Unix system, the default location is /usr/local/mysql-cluster.) This can be overridden at runtime by starting the management server with the --configdir option. Configuration cache files are binary files named according to the pattern ndb_node_id_config.bin.seq_id, where node_id is the management server's node ID in the cluster, and seq_id is a cache identifier. Cache files are numbered sequentially using seq_id, in the order in which they are created. The management server uses the latest cache file as determined by the seq_id.

\section*{Note \\ It is possible to roll back to a previous configuration by deleting later configuration cache files, or by renaming an earlier cache file so that it has a higher seq_id. However, since configuration cache files are written in a binary format, you should not attempt to edit their contents by hand.}

For more information about the --configdir, --config-cache, --initial, and --reload options for the NDB Cluster management server, see Section 25.5.4, "ndb_mgmd — The NDB Cluster Management Server Daemon".

We are continuously making improvements in NDB Cluster configuration and attempting to simplify this process. Although we strive to maintain backward compatibility, there may be times when introduce an incompatible change. In such cases we try to let NDB Cluster users know in advance if a change is not backward compatible. If you find such a change and we have not documented it, please report it in the MySQL bugs database using the instructions given in Section 1.6, "How to Report Bugs or Problems".

\subsection*{25.4.3.1 NDB Cluster Configuration: Basic Example}

To support NDB Cluster, you should update my. cnf as shown in the following example. You may also specify these parameters on the command line when invoking the executables.

\section*{Note}

The options shown here should not be confused with those that are used in config.ini global configuration files. Global configuration options are discussed later in this section.
```
# my.cnf
# example additions to my.cnf for NDB Cluster
# (valid in MySQL 8.4)
```

```
# enable ndbcluster storage engine, and provide connection string for
# management server host (default port is 1186)
[mysqld]
ndbcluster
ndb-connectstring=ndb_mgmd.mysql.com
# provide connection string for management server host (default port: 1186)
[ndbd]
connect-string=ndb_mgmd.mysql.com
# provide connection string for management server host (default port: 1186)
[ndb_mgm]
connect-string=ndb_mgmd.mysql.com
# provide location of cluster configuration file
# IMPORTANT: When starting the management server with this option in the
# configuration file, the use of --initial or --reload on the command line when
# invoking ndb_mgmd is also required.
[ndb_mgmd]
config-file=/etc/config.ini
```

(For more information on connection strings, see Section 25.4.3.3, "NDB Cluster Connection Strings".)
```
# my.cnf
# example additions to my.cnf for NDB Cluster
# (works on all versions)
# enable ndbcluster storage engine, and provide connection string for management
# server host to the default port 1186
[mysqld]
ndbcluster
ndb-connectstring=ndb_mgmd.mysql.com:1186
```


\section*{Important}

Once you have started a mysqld process with the NDBCLUSTER and ndbconnectstring parameters in the [mysqld] in the my.cnf file as shown previously, you cannot execute any CREATE TABLE or ALTER TABLE statements without having actually started the cluster. Otherwise, these statements fail with an error. This is by design.

You may also use a separate [mysql_cluster] section in the cluster my.cnf file for settings to be read and used by all executables:
```
# cluster-specific settings
[mysql_cluster]
ndb-connectstring=ndb_mgmd.mysql.com:1186
```


For additional NDB variables that can be set in the my.cnf file, see NDB Cluster System Variables.
The NDB Cluster global configuration file is by convention named config.ini (but this is not required). If needed, it is read by ndb_mgmd at startup and can be placed in any location that can be read by it. The location and name of the configuration are specified using --configfile=path_name with ndb_mgmd on the command line. This option has no default value, and is ignored if ndb_mgmd uses the configuration cache.

The global configuration file for NDB Cluster uses INI format, which consists of sections preceded by section headings (surrounded by square brackets), followed by the appropriate parameter names and values. One deviation from the standard INI format is that the parameter name and value can be separated by a colon (:) as well as the equal sign (=); however, the equal sign is preferred. Another deviation is that sections are not uniquely identified by section name. Instead, unique sections (such as two different nodes of the same type) are identified by a unique ID specified as a parameter within the section.

Default values are defined for most parameters, and can also be specified in config.ini. To create a default value section, simply add the word default to the section name. For example, an [ndbd]
section contains parameters that apply to a particular data node, whereas an [ndbd default] section contains parameters that apply to all data nodes. Suppose that all data nodes should use the same data memory size. To configure them all, create an [ndbd default] section that contains a DataMemory line to specify the data memory size.

If used, the [ndbd default] section must precede any [ndbd] sections in the configuration file. This is also true for default sections of any other type.

\section*{Note}

In some older releases of NDB Cluster, there was no default value for NoOfReplicas, which always had to be specified explicitly in the [ndbd default] section. Although this parameter now has a default value of 2 , which is the recommended setting in most common usage scenarios, it is still recommended practice to set this parameter explicitly.

The global configuration file must define the computers and nodes involved in the cluster and on which computers these nodes are located. An example of a simple configuration file for a cluster consisting of one management server, two data nodes and two MySQL servers is shown here:
```
# file "config.ini" - 2 data nodes and 2 SQL nodes
# This file is placed in the startup directory of ndb_mgmd (the
# management server)
# The first MySQL Server can be started from any host. The second
# can be started only on the host mysqld_5.mysql.com
[ndbd default]
NoOfReplicas= 2
DataDir= /var/lib/mysql-cluster
[ndb_mgmd]
Hostname= ndb_mgmd.mysql.com
DataDir= /var/lib/mysql-cluster
[ndbd]
HostName= ndbd_2.mysql.com
[ndbd]
HostName= ndbd_3.mysql.com
[mysqld]
[mysqld]
HostName= mysqld_5.mysql.com
```


\section*{Note}

The preceding example is intended as a minimal starting configuration for purposes of familiarization with NDB Cluster, and is almost certain not to be sufficient for production settings. See Section 25.4.3.2, "Recommended Starting Configuration for NDB Cluster", which provides a more complete example starting configuration.

Each node has its own section in the config.ini file. For example, this cluster has two data nodes, so the preceding configuration file contains two [ndbd] sections defining these nodes.

\section*{Note}

Do not place comments on the same line as a section heading in the config. ini file; this causes the management server not to start because it cannot parse the configuration file in such cases.

\section*{Sections of the config.ini File}

There are six different sections that you can use in the config.ini configuration file, as described in the following list:
- [computer]: Defines cluster hosts. This is not required to configure a viable NDB Cluster, but be may used as a convenience when setting up a large cluster. See Section 25.4.3.4, "Defining Computers in an NDB Cluster", for more information.
- [ndbd]: Defines a cluster data node (ndbd process). See Section 25.4.3.6, "Defining NDB Cluster Data Nodes", for details.
- [mysqld]: Defines the cluster's MySQL server nodes (also called SQL or API nodes). For a discussion of SQL node configuration, see Section 25.4.3.7, "Defining SQL and Other API Nodes in an NDB Cluster".
- [mgm] or [ndb_mgmd]: Defines a cluster management server (MGM) node. For information concerning the configuration of management nodes, see Section 25.4.3.5, "Defining an NDB Cluster Management Server".
- [tcp]: Defines a TCP/IP connection between cluster nodes, with TCP/IP being the default transport protocol. Normally, [tcp] or [tcp default] sections are not required to set up an NDB Cluster, as the cluster handles this automatically; however, it may be necessary in some situations to override the defaults provided by the cluster. See Section 25.4.3.10, "NDB Cluster TCP/IP Connections", for information about available TCP/IP configuration parameters and how to use them. (You may also find Section 25.4.3.11, "NDB Cluster TCP/IP Connections Using Direct Connections" to be of interest in some cases.)
- [shm]: Defines shared-memory connections between nodes. In MySQL 8.4, it is enabled by default, but should still be considered experimental. For a discussion of SHM interconnects, see Section 25.4.3.12, "NDB Cluster Shared-Memory Connections".
- [sci]: Defines Scalable Coherent Interface connections between cluster data nodes. Not supported in NDB 8.4.

You can define default values for each section. If used, a default section should come before any other sections of that type. For example, an [ndbd default] section should appear in the configuration file before any [ndbd] sections.

NDB Cluster parameter names are case-insensitive, unless specified in MySQL Server my.cnf or my.ini files.

\subsection*{25.4.3.2 Recommended Starting Configuration for NDB Cluster}

Achieving the best performance from an NDB Cluster depends on a number of factors including the following:
- NDB Cluster software version
- Numbers of data nodes and SQL nodes
- Hardware
- Operating system
- Amount of data to be stored
- Size and type of load under which the cluster is to operate

Therefore, obtaining an optimum configuration is likely to be an iterative process, the outcome of which can vary widely with the specifics of each NDB Cluster deployment. Changes in configuration are also likely to be indicated when changes are made in the platform on which the cluster is run, or in applications that use the NDB Cluster 's data. For these reasons, it is not possible to offer a single configuration that is ideal for all usage scenarios. However, in this section, we provide a recommended base configuration.

Starting config.ini file. The following config.ini file is a recommended starting point for configuring a cluster running NDB Cluster 8.4:
```
# TCP PARAMETERS
[tcp default]
SendBufferMemory=2M
ReceiveBufferMemory=2M
# Increasing the sizes of these 2 buffers beyond the default values
# helps prevent bottlenecks due to slow disk I/O.
# MANAGEMENT NODE PARAMETERS
[ndb_mgmd default]
DataDir=path/to/management/server/data/directory
# It is possible to use a different data directory for each management
# server, but for ease of administration it is preferable to be
# consistent.
[ndb_mgmd]
HostName=management-server-A-hostname
# NodeId=management-server-A-nodeid
[ndb_mgmd]
HostName=management-server-B-hostname
# NodeId=management-server-B-nodeid
# Using 2 management servers helps guarantee that there is always an
# arbitrator in the event of network partitioning, and so is
# recommended for high availability. Each management server must be
# identified by a HostName. You may for the sake of convenience specify
# a NodeId for any management server, although one is allocated
# for it automatically; if you do so, it must be in the range 1-255
# inclusive and must be unique among all IDs specified for cluster
# nodes.
# DATA NODE PARAMETERS
[ndbd default]
NoOfReplicas=2
# Using two fragment replicas is recommended to guarantee availability of data;
# using only one fragment replica does not provide any redundancy, which means
# that the failure of a single data node causes the entire cluster to shut down.
# It is also possible (but not required) to use more than two fragment replicas,
# although two fragment replicas are sufficient to provide high availability.
LockPagesInMainMemory=1
# On Linux and Solaris systems, setting this parameter locks data node
# processes into memory. Doing so prevents them from swapping to disk,
# which can severely degrade cluster performance.
DataMemory=3456M
# The value provided for DataMemory assumes 4 GB RAM
# per data node. However, for best results, you should first calculate
# the memory that would be used based on the data you actually plan to
# store (you may find the ndb_size.pl utility helpful in estimating
# this), then allow an extra 20% over the calculated values. Naturally,
# you should ensure that each data node host has at least as much
# physical memory as the sum of these two values.
# ODirect=1
# Enabling this parameter causes NDBCLUSTER to try using 0_DIRECT
# writes for local checkpoints and redo logs; this can reduce load on
# CPUs. We recommend doing so when using NDB Cluster on systems running
# Linux kernel 2.6 or later.
```

```
NoOfFragmentLogFiles=300
DataDir=path/to/data/node/data/directory
MaxNoOfConcurrentOperations=100000
SchedulerSpinTimer=400
SchedulerExecutionTimer=100
RealTimeScheduler=1
# Setting these parameters allows you to take advantage of real-time scheduling
# of NDB threads to achieve increased throughput when using ndbd. They
# are not needed when using ndbmtd; in particular, you should not set
# RealTimeScheduler for ndbmtd data nodes.
TimeBetweenGlobalCheckpoints=1000
TimeBetweenEpochs=200
RedoBuffer = 32M
# CompressedLCP=1
# CompressedBackup=1
# Enabling CompressedLCP and CompressedBackup causes, respectively, local
checkpoint files and backup files to be compressed, which can result in a space
savings of up to 50% over noncompressed LCPs and backups.
# MaxNoOfLocalScans=64
MaxNoOfTables=1024
MaxNoOfOrderedIndexes=256
[ndbd]
HostName=data-node-A-hostname
# NodeId=data-node-A-nodeid
LockExecuteThreadToCPU=1
LockMaintThreadsToCPU=0
# On systems with multiple CPUs, these parameters can be used to lock NDBCLUSTER
# threads to specific CPUs
[ndbd]
HostName=data-node-B-hostname
# NodeId=data-node-B-nodeid
LockExecuteThreadToCPU=1
LockMaintThreadsToCPU=0
# You must have an [ndbd] section for every data node in the cluster;
# each of these sections must include a HostName. Each section may
# optionally include a NodeId for convenience, but in most cases, it is
# sufficient to allow the cluster to allocate node IDs dynamically. If
# you do specify the node ID for a data node, it must be in the range 1
# to 144 inclusive and must be unique among all IDs specified for
# cluster nodes.
# SQL NODE / API NODE PARAMETERS
[mysqld]
# HostName=sql-node-A-hostname
# NodeId=sql-node-A-nodeid
[mysqld]
[mysqld]
# Each API or SQL node that connects to the cluster requires a [mysqld]
# or [api] section of its own. Each such section defines a connection
# "slot"; you should have at least as many of these sections in the
# config.ini file as the total number of API nodes and SQL nodes that
# you wish to have connected to the cluster at any given time. There is
# no performance or other penalty for having extra slots available in
# case you find later that you want or need more API or SQL nodes to
# connect to the cluster at the same time.
# If no HostName is specified for a given [mysqld] or [api] section,
# then any API or SQL node may use that slot to connect to the
# cluster. You may wish to use an explicit HostName for one connection slot
# to guarantee that an API or SQL node from that host can always
```

```
# connect to the cluster. If you wish to prevent API or SQL nodes from
# connecting from other than a desired host or hosts, then use a
# HostName for every [mysqld] or [api] section in the config.ini file.
# You can if you wish define a node ID (NodeId parameter) for any API or
# SQL node, but this is not necessary; if you do so, it must be in the
# range 1 to 255 inclusive and must be unique among all IDs specified
# for cluster nodes.
```


Required my.cnf options for SQL nodes. MySQL servers acting as NDB Cluster SQL nodes must always be started with the --ndbcluster and --ndb-connectstring options, either on the command line or in my.cnf.

\subsection*{25.4.3.3 NDB Cluster Connection Strings}

With the exception of the NDB Cluster management server (ndb_mgmd), each node that is part of an NDB Cluster requires a connection string that points to the management server's location. This connection string is used in establishing a connection to the management server as well as in performing other tasks depending on the node's role in the cluster. The syntax for a connection string is as follows:
```
[nodeid=node_id, ]host-definition[, host-definition[, ...]]
host-definition:
    host_name[:port_number]
```

node_id is an integer greater than or equal to 1 which identifies a node in config.ini. host_name is a string representing a valid Internet host name or IP address. port_number is an integer referring to a TCP/IP port number.
```
example 1 (long): "nodeid=2,myhost1:1100,myhost2:1100,198.51.100.3:1200"
example 2 (short): "myhost1"
```

localhost : 1186 is used as the default connection string value if none is provided. If port_num is omitted from the connection string, the default port is 1186. This port should always be available on the network because it has been assigned by IANA for this purpose (see http://www.iana.org/assignments/ port-numbers for details).

By listing multiple host definitions, it is possible to designate several redundant management servers. An NDB Cluster data or API node attempts to contact successive management servers on each host in the order specified, until a successful connection has been established.

It is also possible to specify in a connection string one or more bind addresses to be used by nodes having multiple network interfaces for connecting to management servers. A bind address consists of a hostname or network address and an optional port number. This enhanced syntax for connection strings is shown here:
```
[nodeid=node_id, ]
    [bind-address=host-definition, ]
    host-definition[; bind-address=host-definition]
    host-definition[; bind-address=host-definition]
    [, ...]]
host-definition:
    host_name[:port_number]
```


If a single bind address is used in the connection string prior to specifying any management hosts, then this address is used as the default for connecting to any of them (unless overridden for a given management server; see later in this section for an example). For example, the following connection string causes the node to use 198.51 .100 .242 regardless of the management server to which it connects:
```
bind-address=198.51.100.242, poseidon:1186, perch:1186
```


If a bind address is specified following a management host definition, then it is used only for connecting to that management node. Consider the following connection string:
poseidon:1186;bind-address=localhost, perch:1186;bind-address=198.51.100.242
In this case, the node uses localhost to connect to the management server running on the host named poseidon and 198.51.100. 242 to connect to the management server running on the host named perch.

You can specify a default bind address and then override this default for one or more specific management hosts. In the following example, localhost is used for connecting to the management server running on host poseidon; since 198.51.100.242 is specified first (before any management server definitions), it is the default bind address and so is used for connecting to the management servers on hosts perch and orca:
bind-address=198.51.100.242, poseidon:1186;bind-address=localhost,perch:1186,orca:2200
There are a number of different ways to specify the connection string:
- Each executable has its own command-line option which enables specifying the management server at startup. (See the documentation for the respective executable.)
- It is also possible to set the connection string for all nodes in the cluster at once by placing it in a [mysql_cluster] section in the management server's my. cnf file.
- For backward compatibility, two other options are available, using the same syntax:
1. Set the NDB_CONNECTSTRING environment variable to contain the connection string.

This should be considered deprecated, and not used in new installations.
2. Write the connection string for each executable into a text file named Ndb.cfg and place this file in the executable's startup directory.

Use of this file is deprecated in NDB 8.4.3; you should expect it to be removed in a future release of MySQL Cluster.

The recommended method for specifying the connection string is to set it on the command line or in the my.cnf file for each executable.

\subsection*{25.4.3.4 Defining Computers in an NDB Cluster}

The [computer] section has no real significance other than serving as a way to avoid the need of defining host names for each node in the system. All parameters mentioned here are required.
- Id

\begin{tabular}{|l|l|}
\hline Version (or later) & NDB 8.4.0 \\
\hline Type or units & string \\
\hline Default & [...] \\
\hline Range & ⋯ \\
\hline Restart Type & \begin{tabular}{l}
Initial System Restart: \\
Requires a complete shutdown of the cluster, wiping and restoring the cluster file system from a backup, and then restarting
\end{tabular} \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
& \begin{tabular}{l} 
the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

This is a unique identifier, used to refer to the host computer elsewhere in the configuration file.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3941.jpg?height=120&width=103&top_left_y=440&top_left_x=402)

\section*{Important}

The computer ID is not the same as the node ID used for a management, API, or data node. Unlike the case with node IDs, you cannot use NodeId in place of Id in the [computer] section of the config.ini file.
- HostName

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & \begin{tabular}{l} 
name or IP \\
address
\end{tabular} \\
\hline Default & {$[\ldots]$} \\
\hline Range & $\ldots$ \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

This is the computer's hostname or IP address.
Restart types. Information about the restart types used by the parameter descriptions in this section is shown in the following table:

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 25.7 NDB Cluster restart types}
\begin{tabular}{|l|l|l|}
\hline Symbol & Restart Type & Description \\
\hline N & Node & The parameter can be updated using a rolling restart (see Section 25.6.5, "Performing a Rolling Restart of an NDB Cluster") \\
\hline S & System & All cluster nodes must be shut down completely, then restarted, to effect a change in this parameter \\
\hline I & Initial & Data nodes must be restarted using the --initial option \\
\hline
\end{tabular}
\end{table}

\subsection*{25.4.3.5 Defining an NDB Cluster Management Server}

The [ndb_mgmd] section is used to configure the behavior of the management server. If multiple management servers are employed, you can specify parameters common to all of them in an [ndb_mgmd default] section. [mgm] and [mgm default] are older aliases for these, supported for backward compatibility.

All parameters in the following list are optional and assume their default values if omitted.

\section*{Note}

If neither the ExecuteOnComputer nor the HostName parameter is present, the default value localhost is assumed for both.
- Id

\begin{tabular}{|l|l|}
\hline Version (or later) & NDB 8.4.0 \\
\hline Type or units & unsigned \\
\hline Default & [...] \\
\hline Range & 1-255 \\
\hline Restart Type & \begin{tabular}{l}
Initial System Restart: \\
Requires a complete shutdown of the cluster, wiping and restoring the cluster file system from a backup, and then restarting the cluster. (NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

Each node in the cluster has a unique identity. For a management node, this is represented by an integer value in the range 1 to 255 , inclusive. This ID is used by all internal cluster messages for addressing the node, and so must be unique for each NDB Cluster node, regardless of the type of node.

\section*{Note}

Data node IDs must be less than 145. If you plan to deploy a large number of data nodes, it is a good idea to limit the node IDs for management nodes (and API nodes) to values greater than 144.

The use of the Id parameter for identifying management nodes is deprecated in favor of NodeId. Although Id continues to be supported for backward compatibility, it now generates a warning and is subject to removal in a future version of NDB Cluster.
- NodeId

\begin{tabular}{|l|l|}
\hline Version (or later) & NDB 8.4.0 \\
\hline Type or units & unsigned \\
\hline Default & [...] \\
\hline Range & 1-255 \\
\hline Restart Type & \begin{tabular}{l}
Initial System Restart: \\
Requires a complete shutdown of the cluster, wiping and restoring the cluster file system from a backup, and then restarting
\end{tabular} \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
& \begin{tabular}{l} 
the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

Each node in the cluster has a unique identity. For a management node, this is represented by an integer value in the range 1 to 255 inclusive. This ID is used by all internal cluster messages for addressing the node, and so must be unique for each NDB Cluster node, regardless of the type of node.

\section*{Note}

Data node IDs must be less than 145. If you plan to deploy a large number of data nodes, it is a good idea to limit the node IDs for management nodes (and API nodes) to values greater than 144 .

NodeId is the preferred parameter name to use when identifying management nodes. Although the older Id continues to be supported for backward compatibility, it is now deprecated and generates a warning when used; it is also subject to removal in a future NDB Cluster release.
- ExecuteOnComputer

\begin{tabular}{|l|l|}
\hline Version (or later) & NDB 8.4.0 \\
\hline Type or units & name \\
\hline Default & [...] \\
\hline Range & ⋯ \\
\hline Deprecated & Yes (in NDB 7.5) \\
\hline Restart Type & \begin{tabular}{l}
System Restart: \\
Requires a complete shutdown and restart of the cluster. (NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

This refers to the Id set for one of the computers defined in a [computer] section of the config.ini file.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3943.jpg?height=173&width=275&top_left_y=1886&top_left_x=395)

\section*{Important}

This parameter is deprecated, and is subject to removal in a future release. Use the HostName parameter instead.
- PortNumber

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & unsigned \\
\hline Default & 1186 \\
\hline Range & $0-64 \mathrm{~K}$ \\
\hline Restart Type & \begin{tabular}{l} 
System \\
Restart: \\
Requires a \\
complete \\
shutdown and
\end{tabular}
\end{tabular}

\begin{tabular}{|l|l|} 
& \begin{tabular}{l} 
restart of the \\
cluster. (NDB \\
$8.4 .0)$
\end{tabular} \\
\hline
\end{tabular}

This is the port number on which the management server listens for configuration requests and management commands.

The node ID for this node can be given out only to connections that explicitly request it. A management server that requests "any" node ID cannot use this one. This parameter can be used when running multiple management servers on the same host, and HostName is not sufficient for distinguishing among processes.
- HostName

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & \begin{tabular}{l} 
name or IP \\
address
\end{tabular} \\
\hline Default & {$[\ldots]$} \\
\hline Range & $\ldots$ \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

Specifying this parameter defines the hostname of the computer on which the management node is to reside. Use HostName to specify a host name other than localhost.
- LocationDomainId

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & integer \\
\hline Default & 0 \\
\hline Range & $0-16$ \\
\hline Restart Type & System \\
& Restart: \\
& Requires a \\
& complete \\
& shutdown and \\
& restart of the \\
& cluster. (NDB \\
& 8.4.0) \\
\hline
\end{tabular}

Assigns a management node to a specific availability domain (also known as an availability zone) within a cloud. By informing NDB which nodes are in which availability domains, performance can be improved in a cloud environment in the following ways:
- If requested data is not found on the same node, reads can be directed to another node in the same availability domain.
- Communication between nodes in different availability domains are guaranteed to use NDB transporters' WAN support without any further manual intervention.
- The transporter's group number can be based on which availability domain is used, such that also SQL and other API nodes communicate with local data nodes in the same availability domain whenever possible.
- The arbitrator can be selected from an availability domain in which no data nodes are present, or, if no such availability domain can be found, from a third availability domain.

LocationDomainId takes an integer value between 0 and 16 inclusive, with 0 being the default; using 0 is the same as leaving the parameter unset.
- LogDestination

\begin{tabular}{|l|l|}
\hline Version (or later) & NDB 8.4.0 \\
\hline Type or units & \{CONSOLE| SYSLOG|FILE\} \\
\hline Default & \begin{tabular}{l}
FILE: \\
filename=ndb_nodeid_cluster.log, maxsize=1000000, \\
maxfiles=6
\end{tabular} \\
\hline Range & ⋯ \\
\hline Restart Type & \begin{tabular}{l}
Node Restart: \\
Requires a rolling restart of the cluster. (NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

This parameter specifies where to send cluster logging information. There are three options in this regard-CONSOLE, SYSLOG, and FILE-with FILE being the default:
- CONSOLE outputs the log to stdout:

CONSOLE
- SYSLOG sends the log to a syslog facility, possible values being one of auth, authpriv, cron, daemon, ftp, kern, lpr, mail, news, syslog, user, uucp, local0, local1, local2, local3, local4, local5, local6, or local7.

\section*{Note}

Not every facility is necessarily supported by every operating system.

SYSLOG:facility=syslog
- FILE pipes the cluster log output to a regular file on the same machine. The following values can be specified:
- filename: The name of the log file.

The default log file name used in such cases is ndb_nodeid_cluster.log.
- maxsize: The maximum size (in bytes) to which the file can grow before logging rolls over to a new file. When this occurs, the old log file is renamed by appending . $N$ to the file name, where $N$ is the next number not yet used with this name.
- maxfiles: The maximum number of log files.

FILE:filename=cluster.log,maxsize=1000000,maxfiles=6
The default value for the FILE parameter is
FILE:filename=ndb_node_id_cluster.log,maxsize=1000000,maxfiles=6, where node_id is the ID of the node.

It is possible to specify multiple log destinations separated by semicolons as shown here:
CONSOLE;SYSLOG:facility=local0;FILE:filename=/var/log/mgmd
- ArbitrationRank

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & $0-2$ \\
\hline Default & 1 \\
\hline Range & $0-2$ \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

This parameter is used to define which nodes can act as arbitrators. Only management nodes and SQL nodes can be arbitrators. ArbitrationRank can take one of the following values:
- 0 : The node is never used as an arbitrator.
- 1: The node has high priority; that is, it is preferred as an arbitrator over low-priority nodes.
- 2: Indicates a low-priority node which is used as an arbitrator only if a node with a higher priority is not available for that purpose.

Normally, the management server should be configured as an arbitrator by setting its ArbitrationRank to 1 (the default for management nodes) and those for all SQL nodes to 0 (the default for SQL nodes).

You can disable arbitration completely either by setting ArbitrationRank to 0 on all management and SQL nodes, or by setting the Arbitration parameter in the [ndbd default] section of the config.ini global configuration file. Setting Arbitration causes any settings for ArbitrationRank to be disregarded.
- ArbitrationDelay

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & milliseconds \\
\hline Default & 0 \\
\hline Range & \begin{tabular}{l}
$0-4294967039$ \\
(0xFFFFFEFF)
\end{tabular} \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

An integer value which causes the management server's responses to arbitration requests to be delayed by that number of milliseconds. By default, this value is 0 ; it is normally not necessary to change it.
- DataDir

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & path \\
\hline Default &. \\
\hline Range &... \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

This specifies the directory where output files from the management server are placed. These files include cluster log files, process output files, and the daemon's process ID (PID) file. (For log files, this location can be overridden by setting the FILE parameter for LogDestination, as discussed previously in this section.)

The default value for this parameter is the directory in which ndb_mgmd is located.
- PortNumberStats

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & unsigned \\
\hline Default & {$[\ldots]$} \\
\hline Range & $0-64 \mathrm{~K}$ \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

This parameter specifies the port number used to obtain statistical information from an NDB Cluster management server. It has no default value.
- Wan

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & boolean \\
\hline Default & false \\
\hline Range & true, false \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

Use WAN TCP setting as default.
- HeartbeatThreadPriority

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & string \\
\hline Default & {$[\ldots]$} \\
\hline Range & $\ldots$ \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

Set the scheduling policy and priority of heartbeat threads for management and API nodes.
The syntax for setting this parameter is shown here:
```
HeartbeatThreadPriority = policy[, priority]
policy:
    {FIFO | RR}
```


When setting this parameter, you must specify a policy. This is one of FIFO (first in, first out) or RR (round robin). The policy value is followed optionally by the priority (an integer).

ExtraSendBufferMemory

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & bytes \\
\hline Default & 0 \\
\hline Range & $0-32 \mathrm{G}$ \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}
- RequireTls

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & boolean \\
\hline Default & false \\
\hline Range & $\ldots$ \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

If this parameter is set to true, a client, once connected to this management node, must be authenticated using TLS before the connection can be used for anything else.
- TotalSendBufferMemory

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & bytes \\
\hline Default & 0 \\
\hline Range & \begin{tabular}{l}
256 K - \\
4294967039 \\
(0xFFFFFEFF)
\end{tabular} \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

This parameter is used to determine the total amount of memory to allocate on this node for shared send buffer memory among all configured transporters.

If this parameter is set, its minimum permitted value is $256 \mathrm{~KB} ; 0$ indicates that the parameter has not been set. For more detailed information, see Section 25.4.3.14, "Configuring NDB Cluster Send Buffer Parameters".
- HeartbeatIntervalMgmdMgmd

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & milliseconds \\
\hline Default & 1500 \\
\hline Range & \begin{tabular}{l}
$100-$ \\
4294967039 \\
(0xFFFFFEFF)
\end{tabular} \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart
\end{tabular}
\end{tabular}

\begin{tabular}{|l|l|} 
& \begin{tabular}{l} 
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

Specify the interval between heartbeat messages used to determine whether another management node is on contact with this one. The management node waits after 3 of these intervals to declare the connection dead; thus, the default setting of 1500 milliseconds causes the management node to wait for approximately 1600 ms before timing out.

\section*{Note}

After making changes in a management node's configuration, it is necessary to perform a rolling restart of the cluster for the new configuration to take effect.

To add new management servers to a running NDB Cluster, it is also necessary to perform a rolling restart of all cluster nodes after modifying any existing config. ini files. For more information about issues arising when using multiple management nodes, see Section 25.2.7.10, "Limitations Relating to Multiple NDB Cluster Nodes".

Restart types. Information about the restart types used by the parameter descriptions in this section is shown in the following table:

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 25.8 NDB Cluster restart types}
\begin{tabular}{|l|l|l|}
\hline Symbol & Restart Type & Description \\
\hline N & Node & The parameter can be updated using a rolling restart (see Section 25.6.5, "Performing a Rolling Restart of an NDB Cluster") \\
\hline S & System & All cluster nodes must be shut down completely, then restarted, to effect a change in this parameter \\
\hline I & Initial & Data nodes must be restarted using the --initial option \\
\hline
\end{tabular}
\end{table}

\subsection*{25.4.3.6 Defining NDB Cluster Data Nodes}

The [ndbd] and [ndbd default] sections are used to configure the behavior of the cluster's data nodes.
[ndbd] and [ndbd default] are always used as the section names whether you are using ndbd or ndbmtd binaries for the data node processes.

There are many parameters which control buffer sizes, pool sizes, timeouts, and so forth. The only mandatory parameter is ExecuteOnComputer; this must be defined in the local [ndbd] section.

The parameter NoOfReplicas should be defined in the [ndbd default] section, as it is common to all Cluster data nodes. It is not strictly necessary to set NoOfReplicas, but it is good practice to set it explicitly.

Most data node parameters are set in the [ndbd default] section. Only those parameters explicitly stated as being able to set local values are permitted to be changed in the [ndbd] section. Where present, HostName and NodeId must be defined in the local [ndbd] section, and not in any other section of config.ini. In other words, settings for these parameters are specific to one data node.

For those parameters affecting memory usage or buffer sizes, it is possible to use $\mathrm{K}, \mathrm{M}$, or G as a suffix to indicate units of $1024,1024 \times 1024$, or $1024 \times 1024 \times 1024$. (For example, 100 K means $100 \times 1024=$ 102400.)

Parameter names and values are case-insensitive, unless used in a MySQL Server my. cnf or my. ini file, in which case they are case-sensitive.

Information about configuration parameters specific to NDB Cluster Disk Data tables can be found later in this section (see Disk Data Configuration Parameters).

All of these parameters also apply to ndbmtd (the multithreaded version of ndbd). Three additional data node configuration parameters-MaxNoOfExecutionThreads, ThreadConfig, and NoOfFragmentLogParts—apply to ndbmtd only; these have no effect when used with ndbd. For more information, see Multi-Threading Configuration Parameters (ndbmtd). See also Section 25.5.3, "ndbmtd - The NDB Cluster Data Node Daemon (Multi-Threaded)".

Identifying data nodes. The NodeId or Id value (that is, the data node identifier) can be allocated on the command line when the node is started or in the configuration file.
- NodeId

\begin{tabular}{|l|l|}
\hline Version (or later) & NDB 8.4.0 \\
\hline Type or units & unsigned \\
\hline Default & [...] \\
\hline Range & 1-144 \\
\hline Restart Type & \begin{tabular}{l}
Initial System Restart: \\
Requires a complete shutdown of the cluster, wiping and restoring the cluster file system from a backup, and then restarting the cluster. (NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

A unique node ID is used as the node's address for all cluster internal messages. For data nodes, this is an integer in the range 1 to 144 inclusive. Each node in the cluster must have a unique identifier.

NodeId is the only supported parameter name to use when identifying data nodes.
- ExecuteOnComputer

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & name \\
\hline Default & {$[\ldots]$} \\
\hline Range & $\ldots$ \\
\hline Deprecated & \begin{tabular}{l} 
Yes (in NDB \\
7.5 )
\end{tabular} \\
\hline Restart Type & \begin{tabular}{l} 
System \\
Restart: \\
Requires a \\
complete \\
shutdown and
\end{tabular}
\end{tabular}

\begin{tabular}{|l|l|} 
& \begin{tabular}{l} 
restart of the \\
cluster. (NDB \\
$8.4 .0)$
\end{tabular} \\
\hline
\end{tabular}

This refers to the Id set for one of the computers defined in a [computer] section.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3952.jpg?height=101&width=103&top_left_y=523&top_left_x=338)

\section*{Important}

This parameter is deprecated, and is subject to removal in a future release. Use the HostName parameter instead.

The node ID for this node can be given out only to connections that explicitly request it. A management server that requests "any" node ID cannot use this one. This parameter can be used when running multiple management servers on the same host, and HostName is not sufficient for distinguishing among processes.
- HostName

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & \begin{tabular}{l} 
name or IP \\
address
\end{tabular} \\
\hline Default & localhost \\
\hline Range & $\ldots$ \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

Specifying this parameter defines the hostname of the computer on which the data node is to reside. Use HostName to specify a host name other than localhost.
- ServerPort

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & unsigned \\
\hline Default & {$[\ldots]$} \\
\hline Range & $1-64 \mathrm{~K}$ \\
\hline Restart Type & \begin{tabular}{l} 
System \\
Restart: \\
Requires a \\
complete \\
shutdown and \\
restart of the
\end{tabular}
\end{tabular}

\begin{tabular}{|l|l|} 
& \begin{tabular}{l} 
cluster. (NDB \\
8.4 .0 )
\end{tabular} \\
\hline
\end{tabular}

Each node in the cluster uses a port to connect to other nodes. By default, this port is allocated dynamically in such a way as to ensure that no two nodes on the same host computer receive the same port number, so it should normally not be necessary to specify a value for this parameter.

However, if you need to be able to open specific ports in a firewall to permit communication between data nodes and API nodes (including SQL nodes), you can set this parameter to the number of the desired port in an [ndbd] section or (if you need to do this for multiple data nodes) the [ndbd default] section of the config.ini file, and then open the port having that number for incoming connections from SQL nodes, API nodes, or both.

\section*{Note}

Connections from data nodes to management nodes is done using the ndb_mgmd management port (the management server's PortNumber) so outgoing connections to that port from any data nodes should always be permitted.
- TcpBind_INADDR_ANY

Setting this parameter to TRUE or 1 binds IP_ADDR_ANY so that connections can be made from anywhere (for autogenerated connections). The default is FALSE (0).
- NodeGroup

\begin{tabular}{|l|l|}
\hline Version (or later) & NDB 8.4.0 \\
\hline Type or units & unsigned \\
\hline Default & [...] \\
\hline Range & 0-65536 \\
\hline Restart Type & \begin{tabular}{l}
Initial System Restart: \\
Requires a complete shutdown of the cluster, wiping and restoring the cluster file system from a backup, and then restarting the cluster. (NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

This parameter can be used to assign a data node to a specific node group. It is read only when the cluster is started for the first time, and cannot be used to reassign a data node to a different node group online. It is generally not desirable to use this parameter in the [ndbd default] section of the config.ini file, and care must be taken not to assign nodes to node groups in such a way that an invalid numbers of nodes are assigned to any node groups.

The NodeGroup parameter is chiefly intended for use in adding a new node group to a running NDB Cluster without having to perform a rolling restart. For this purpose, you should set it to 65536 (the maximum value). You are not required to set a NodeGroup value for all cluster data nodes, only for those nodes which are to be started and added to the cluster as a new node group at a later time. For more information, see Section 25.6.7.3, "Adding NDB Cluster Data Nodes Online: Detailed Example".
- LocationDomainId

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & integer \\
\hline Default & 0 \\
\hline Range & $0-16$ \\
\hline Restart Type & System \\
& Restart: \\
& Requires a \\
& complete \\
& shutdown and \\
& restart of the \\
& cluster. (NDB \\
& 8.4.0) \\
\hline
\end{tabular}

Assigns a data node to a specific availability domain (also known as an availability zone) within a cloud. By informing NDB which nodes are in which availability domains, performance can be improved in a cloud environment in the following ways:
- If requested data is not found on the same node, reads can be directed to another node in the same availability domain.
- Communication between nodes in different availability domains are guaranteed to use NDB transporters' WAN support without any further manual intervention.
- The transporter's group number can be based on which availability domain is used, such that also SQL and other API nodes communicate with local data nodes in the same availability domain whenever possible.
- The arbitrator can be selected from an availability domain in which no data nodes are present, or, if no such availability domain can be found, from a third availability domain.

LocationDomainId takes an integer value between 0 and 16 inclusive, with 0 being the default; using 0 is the same as leaving the parameter unset.
- NoOfReplicas

\begin{tabular}{|l|l|}
\hline Version (or later) & NDB 8.4.0 \\
\hline Type or units & integer \\
\hline Default & 2 \\
\hline Range & 1-4 \\
\hline Restart Type & \begin{tabular}{l}
Initial System Restart: \\
Requires a complete shutdown of the cluster, wiping and restoring the cluster file system from a backup, and then restarting the cluster. (NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

This global parameter can be set only in the [ndbd default] section, and defines the number of fragment replicas for each table stored in the cluster. This parameter also specifies the size of node groups. A node group is a set of nodes all storing the same information.

Node groups are formed implicitly. The first node group is formed by the set of data nodes with the lowest node IDs, the next node group by the set of the next lowest node identities, and so on. By way of example, assume that we have 4 data nodes and that NoOfReplicas is set to 2 . The four data nodes have node IDs $2,3,4$ and 5 . Then the first node group is formed from nodes 2 and 3 , and the second node group by nodes 4 and 5 . It is important to configure the cluster in such a manner that nodes in the same node groups are not placed on the same computer because a single hardware failure would cause the entire cluster to fail.

If no node IDs are provided, the order of the data nodes is the determining factor for the node group. Whether or not explicit assignments are made, they can be viewed in the output of the management client's SHOW command.

The default value for NoOfReplicas is 2 . This is the recommended value for most production environments. Setting this parameter's value to 3 or 4 is also supported.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3955.jpg?height=119&width=106&top_left_y=989&top_left_x=402)

\section*{Warning}

Setting NoOfReplicas to 1 means that there is only a single copy of all Cluster data; in this case, the loss of a single data node causes the cluster to fail because there are no additional copies of the data stored by that node.

The number of data nodes in the cluster must be evenly divisible by the value of this parameter. For example, if there are two data nodes, then NoOfReplicas must be equal to either 1 or 2 , since $2 / 3$ and 2/4 both yield fractional values; if there are four data nodes, then NoOfReplicas must be equal to 1,2 , or 4 .
- DataDir

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & path \\
\hline Default &. \\
\hline Range &... \\
\hline Restart Type & \begin{tabular}{l} 
Initial Node \\
Restart: \\
Requires a \\
rolling restart \\
of the cluster; \\
each data \\
node must be \\
restarted with \\
-- initial. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

This parameter specifies the directory where trace files, log files, pid files and error logs are placed.
The default is the data node process working directory.
- FileSystemPath

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & path \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Default & DataDir \\
\hline Range & $\ldots$ \\
\hline Restart Type & Initial Node \\
& Restart: \\
& Requires a \\
& rolling restart \\
& of the cluster; \\
& each data \\
& node must be \\
& restarted with \\
& -- initial. \\
& (NDB 8.4.0) \\
\hline
\end{tabular}

This parameter specifies the directory where all files created for metadata, REDO logs, UNDO logs (for Disk Data tables), and data files are placed. The default is the directory specified by DataDir.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3956.jpg?height=147&width=1232&top_left_y=952&top_left_x=333)

The recommended directory hierarchy for NDB Cluster includes /var/lib/mysql-cluster, under which a directory for the node's file system is created. The name of this subdirectory contains the node ID. For example, if the node ID is 2 , this subdirectory is named ndb_2_fs.
- BackupDataDir

\begin{tabular}{|l|l|}
\hline Version (or later) & NDB 8.4.0 \\
\hline Type or units & path \\
\hline Default & FileSystemPath \\
\hline Range & ⋯ \\
\hline Restart Type & \begin{tabular}{l}
Initial Node Restart: \\
Requires a rolling restart of the cluster; each data node must be restarted with --initial. (NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

This parameter specifies the directory in which backups are placed.

\section*{Important}

The string '/BACKUP' is always appended to this value. For example, if you set the value of BackupDataDir to /var/lib/cluster-data, then all backups are stored under /var/lib/cluster-data/BACKUP. This also means that the effective default backup location is the directory named BACKUP under the location specified by the FileSystemPath parameter.

\section*{Data Memory, Index Memory, and String Memory}

DataMemory and IndexMemory are [ndbd] parameters specifying the size of memory segments used to store the actual records and their indexes. In setting values for these, it is important to
understand how DataMemory is used, as it usually needs to be updated to reflect actual usage by the cluster.

\section*{Note}

IndexMemory is deprecated, and subject to removal in a future version of NDB Cluster. See the descriptions that follow for further information.
- DataMemory

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & bytes \\
\hline Default & 98 M \\
\hline Range & $1 \mathrm{M}-16 \mathrm{~T}$ \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

This parameter defines the amount of space (in bytes) available for storing database records. The entire amount specified by this value is allocated in memory, so it is extremely important that the machine has sufficient physical memory to accommodate it.

The memory allocated by DataMemory is used to store both the actual records and indexes. There is a 16-byte overhead on each record; an additional amount for each record is incurred because it is stored in a 32 KB page with 128 byte page overhead (see below). There is also a small amount wasted per page due to the fact that each record is stored in only one page.

For variable-size table attributes, the data is stored on separate data pages, allocated from DataMemory. Variable-length records use a fixed-size part with an extra overhead of 4 bytes to reference the variable-size part. The variable-size part has 2 bytes overhead plus 2 bytes per attribute.

The maximum record size is 30000 bytes.
Resources assigned to DataMemory are used for storing all data and indexes. (Any memory configured as IndexMemory is automatically added to that used by DataMemory to form a common resource pool.)

The memory space allocated by DataMemory consists of 32 KB pages, which are allocated to table fragments. Each table is normally partitioned into the same number of fragments as there are data nodes in the cluster. Thus, for each node, there are the same number of fragments as are set in NoOfReplicas.

Once a page has been allocated, it is currently not possible to return it to the pool of free pages, except by deleting the table. (This also means that DataMemory pages, once allocated to a given table, cannot be used by other tables.) Performing a data node recovery also compresses the partition because all records are inserted into empty partitions from other live nodes.

The DataMemory memory space also contains UNDO information: For each update, a copy of the unaltered record is allocated in the DataMemory. There is also a reference to each copy in the ordered table indexes. Unique hash indexes are updated only when the unique index columns are updated, in which case a new entry in the index table is inserted and the old entry is deleted upon commit. For this reason, it is also necessary to allocate enough memory to handle the largest transactions performed by applications using the cluster. In any case, performing a few large transactions holds no advantage over using many smaller ones, for the following reasons:
- Large transactions are not any faster than smaller ones
- Large transactions increase the number of operations that are lost and must be repeated in event of transaction failure
- Large transactions use more memory

The default value for DataMemory is 98 MB . The minimum value is 1 MB . There is no maximum size, but in reality the maximum size has to be adapted so that the process does not start swapping when the limit is reached. This limit is determined by the amount of physical RAM available on the machine and by the amount of memory that the operating system may commit to any one process. 32-bit operating systems are generally limited to $2-4 \mathrm{~GB}$ per process; 64-bit operating systems can use more. For large databases, it may be preferable to use a 64-bit operating system for this reason.
- IndexMemory

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & bytes \\
\hline Default & 0 \\
\hline Range & $1 \mathrm{M}-1 \mathrm{~T}$ \\
\hline Deprecated & \begin{tabular}{l} 
Yes (in NDB \\
7.6 )
\end{tabular} \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

The IndexMemory parameter is deprecated (and subject to future removal); any memory assigned to IndexMemory is allocated instead to the same pool as DataMemory, which is solely responsible for all resources needed for storing data and indexes in memory. In NDB 8.4, the use of IndexMemory in the cluster configuration file triggers a warning from the management server.

You can estimate the size of a hash index using this formula:
```
size = ( (fragments * 32K) + (rows * 18) )
    * fragment_replicas
```

fragments is the number of fragments, fragment_replicas is the number of fragment replicas (normally 2), and rows is the number of rows. If a table has one million rows, eight fragments, and two fragment replicas, the expected index memory usage is calculated as shown here:
```
((8 * 32K) + (1000000 * 18)) * 2 = ((8 * 32768) + (1000000 * 18)) * 2
= (262144 + 18000000) * 2
= 18262144 * 2 = 36524288 bytes = ~35MB
```


Index statistics for ordered indexes (when these are enabled) are stored in the mysql.ndb_index_stat_sample table. Since this table has a hash index, this adds to index memory usage. An upper bound to the number of rows for a given ordered index can be calculated as follows:
```
sample_size= key_size + ((key_attributes + 1) * 4)
sample_rows = IndexStatSaveSize
    * ((0.01 * IndexStatSaveScale * log2(rows * sample_size)) + 1)
```

/ sample_size

In the preceding formula, key_size is the size of the ordered index key in bytes, key_attributes is the number of attributes in the ordered index key, and rows is the number of rows in the base table.

Assume that table t1 has 1 million rows and an ordered index named ix1 on two four-byte integers. Assume in addition that IndexStatSaveSize and IndexStatSaveScale are set to their default values ( 32 K and 100, respectively). Using the previous 2 formulas, we can calculate as follows:
```
sample_size = 8 + ((1 + 2) * 4) = 20 bytes
sample_rows = 32K
    * ((0.01 * 100 * = log }2(1000000*20)) + 1
    / 20
    = 32768 * ( (1 * ~16.811) +1) / 20
    = 32768 * ~17.811 / 20
    = ~29182 rows
```


The expected index memory usage is thus $2 * 18 * 29182=\sim 1050550$ bytes.
The minimum and default value for this parameter is 0 (zero).
- StringMemory

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & $\%$ or bytes \\
\hline Default & 25 \\
\hline Range & \begin{tabular}{l}
$0-4294967039$ \\
(0xFFFFFEFF)
\end{tabular} \\
\hline Restart Type & \begin{tabular}{l} 
System \\
Restart: \\
Requires a \\
complete \\
shutdown and \\
restart of the \\
cluster. (NDB \\
8.4 .0 )
\end{tabular} \\
\hline
\end{tabular}

This parameter determines how much memory is allocated for strings such as table names, and is specified in an [ndbd] or [ndbd default] section of the config.ini file. A value between 0 and 100 inclusive is interpreted as a percent of the maximum default value, which is calculated based on a number of factors including the number of tables, maximum table name size, maximum size of . FRM files, MaxNoOfTriggers, maximum column name size, and maximum default column value.

A value greater than 100 is interpreted as a number of bytes.
The default value is 25-that is, 25 percent of the default maximum.
Under most circumstances, the default value should be sufficient, but when you have a great many NDB tables (1000 or more), it is possible to get Error 773 Out of string memory, please modify StringMemory config parameter: Permanent error: Schema error, in which case you should increase this value. 25 ( 25 percent) is not excessive, and should prevent this error from recurring in all but the most extreme conditions.

The following example illustrates how memory is used for a table. Consider this table definition:
```
CREATE TABLE example (
    a INT NOT NULL,
```

```
    b INT NOT NULL,
    c INT NOT NULL,
    PRIMARY KEY(a),
    UNIQUE(b)
) ENGINE=NDBCLUSTER;
```


For each record, there are 12 bytes of data plus 12 bytes overhead. Having no nullable columns saves 4 bytes of overhead. In addition, we have two ordered indexes on columns a and b consuming roughly 10 bytes each per record. There is a primary key hash index on the base table using roughly 29 bytes per record. The unique constraint is implemented by a separate table with $b$ as primary key and a as a column. This other table consumes an additional 29 bytes of index memory per record in the example table as well 8 bytes of record data plus 12 bytes of overhead.

Thus, for one million records, we need 58 MB for index memory to handle the hash indexes for the primary key and the unique constraint. We also need 64 MB for the records of the base table and the unique index table, plus the two ordered index tables.

You can see that hash indexes takes up a fair amount of memory space; however, they provide very fast access to the data in return. They are also used in NDB Cluster to handle uniqueness constraints.

Currently, the only partitioning algorithm is hashing and ordered indexes are local to each node. Thus, ordered indexes cannot be used to handle uniqueness constraints in the general case.

An important point for both IndexMemory and DataMemory is that the total database size is the sum of all data memory and all index memory for each node group. Each node group is used to store replicated information, so if there are four nodes with two fragment replicas, there are two node groups. Thus, the total data memory available is $2 \times$ DataMemory for each data node.

It is highly recommended that DataMemory and IndexMemory be set to the same values for all nodes. Data distribution is even over all nodes in the cluster, so the maximum amount of space available for any node can be no greater than that of the smallest node in the cluster.

DataMemory can be changed, but decreasing it can be risky; doing so can easily lead to a node or even an entire NDB Cluster that is unable to restart due to there being insufficient memory space. Increasing these values should be acceptable, but it is recommended that such upgrades are performed in the same manner as a software upgrade, beginning with an update of the configuration file, and then restarting the management server followed by restarting each data node in turn.

MinFreePct. A proportion ( $5 \%$ by default) of data node resources including DataMemory is kept in reserve to insure that the data node does not exhaust its memory when performing a restart. This can be adjusted using the MinFreePct data node configuration parameter (default 5).

\begin{tabular}{|l|l|}
\hline Version (or later) & NDB 8.4.0 \\
\hline Type or units & unsigned \\
\hline Default & 5 \\
\hline Range & $0-100$ \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

Updates do not increase the amount of index memory used. Inserts take effect immediately; however, rows are not actually deleted until the transaction is committed.

Transaction parameters. The next few [ndbd] parameters that we discuss are important because they affect the number of parallel transactions and the sizes of transactions that can be handled by the
system. MaxNoOfConcurrentTransactions sets the number of parallel transactions possible in a node. MaxNoOfConcurrentOperations sets the number of records that can be in update phase or locked simultaneously.

Both of these parameters (especially MaxNoOfConcurrentOperations) are likely targets for users setting specific values and not using the default value. The default value is set for systems using small transactions, to ensure that these do not use excessive memory.

MaxDMLOperationsPerTransaction sets the maximum number of DML operations that can be performed in a given transaction.
- MaxNoOfConcurrentTransactions

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & integer \\
\hline Default & 4096 \\
\hline Range & 32 - \\
& 4294967039 \\
& (0xFFFFFEFF) \\
\hline Deprecated & \begin{tabular}{l} 
Yes (in NDB \\
8.0 )
\end{tabular} \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

Each cluster data node requires a transaction record for each active transaction in the cluster. The task of coordinating transactions is distributed among all of the data nodes. The total number of transaction records in the cluster is the number of transactions in any given node times the number of nodes in the cluster.

Transaction records are allocated to individual MySQL servers. Each connection to a MySQL server requires at least one transaction record, plus an additional transaction object per table accessed by that connection. This means that a reasonable minimum for the total number of transactions in the cluster can be expressed as
```
TotalNoOfConcurrentTransactions =
    (maximum number of tables accessed in any single transaction + 1)
    * number of SQL nodes
```


Suppose that there are 10 SQL nodes using the cluster. A single join involving 10 tables requires 11 transaction records; if there are 10 such joins in a transaction, then 10 * $11=110$ transaction records are required for this transaction, per MySQL server, or 110 * $10=1100$ transaction records total. Each data node can be expected to handle TotalNoOfConcurrentTransactions / number of data nodes. For an NDB Cluster having 4 data nodes, this would mean setting MaxNoOfConcurrentTransactions on each data node to $1100 / 4=275$. In addition, you should provide for failure recovery by ensuring that a single node group can accommodate all concurrent transactions; in other words, that each data node's MaxNoOfConcurrentTransactions is sufficient to cover a number of transactions equal to TotalNoOfConcurrentTransactions / number of node groups. If this cluster has a single node group, then MaxNoOfConcurrentTransactions should be set to 1100 (the same as the total number of concurrent transactions for the entire cluster).

In addition, each transaction involves at least one operation; for this reason, the value set for MaxNoOfConcurrentTransactions should always be no more than the value of MaxNoOfConcurrentOperations.

This parameter must be set to the same value for all cluster data nodes. This is due to the fact that, when a data node fails, the oldest surviving node re-creates the transaction state of all transactions that were ongoing in the failed node.

It is possible to change this value using a rolling restart, but the amount of traffic on the cluster must be such that no more transactions occur than the lower of the old and new levels while this is taking place.

The default value is 4096.
- MaxNoOfConcurrentOperations

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & integer \\
\hline Default & 32 K \\
\hline Range & \begin{tabular}{l}
$32-$ \\
4294967039 \\
(OxFFFFFEFF)
\end{tabular} \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

It is a good idea to adjust the value of this parameter according to the size and number of transactions. When performing transactions which involve only a few operations and records, the default value for this parameter is usually sufficient. Performing large transactions involving many records usually requires that you increase its value.

Records are kept for each transaction updating cluster data, both in the transaction coordinator and in the nodes where the actual updates are performed. These records contain state information needed to find UNDO records for rollback, lock queues, and other purposes.

This parameter should be set at a minimum to the number of records to be updated simultaneously in transactions, divided by the number of cluster data nodes. For example, in a cluster which has four data nodes and which is expected to handle one million concurrent updates using transactions, you should set this value to $1000000 / 4=250000$. To help provide resiliency against failures, it is suggested that you set this parameter to a value that is high enough to permit an individual data node to handle the load for its node group. In other words, you should set the value equal to total number of concurrent operations / number of node groups. (In the case where there
is a single node group, this is the same as the total number of concurrent operations for the entire cluster.)

Because each transaction always involves at least one operation, the value of MaxNoOfConcurrentOperations should always be greater than or equal to the value of MaxNoOfConcurrentTransactions.

Read queries which set locks also cause operation records to be created. Some extra space is allocated within individual nodes to accommodate cases where the distribution is not perfect over the nodes.

When queries make use of the unique hash index, there are actually two operation records used per record in the transaction. The first record represents the read in the index table and the second handles the operation on the base table.

The default value is 32768 .
This parameter actually handles two values that can be configured separately. The first of these specifies how many operation records are to be placed with the transaction coordinator. The second part specifies how many operation records are to be local to the database.

A very large transaction performed on an eight-node cluster requires as many operation records in the transaction coordinator as there are reads, updates, and deletes involved in the transaction. However, the operation records of the are spread over all eight nodes. Thus, if it is necessary to configure the system for one very large transaction, it is a good idea to configure the two parts separately. MaxNoOfConcurrentOperations is always used to calculate the number of operation records in the transaction coordinator portion of the node.

It is also important to have an idea of the memory requirements for operation records. These consume about 1 KB per record.
- MaxNoOfLocalOperations

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & integer \\
\hline Default & UNDEFINED \\
\hline Range & 32 - \\
& 4294967039 \\
& (0xFFFFFEFF) \\
\hline Deprecated & \begin{tabular}{l} 
Yes (in NDB \\
8.0 )
\end{tabular} \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

By default, this parameter is calculated as $1.1 \times$ MaxNoOfConcurrentOperations. This fits systems with many simultaneous transactions, none of them being very large. If there is a need to handle one very large transaction at a time and there are many nodes, it is a good idea to override the default value by explicitly specifying this parameter.

This parameter is deprecated and subject to removal in a future NDB Cluster release. In addition, this parameter is incompatible with the TransactionMemory parameter; if you try to set values for both parameters in the cluster configuration file (config.ini), the management server refuses to start.
- MaxDMLOperationsPerTransaction

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & \begin{tabular}{l} 
operations \\
(DML)
\end{tabular} \\
\hline Default & 4294967295 \\
\hline Range & \begin{tabular}{l}
$32-$ \\
4294967295
\end{tabular} \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

This parameter limits the size of a transaction. The transaction is aborted if it requires more than this many DML operations.

The value of this parameter cannot exceed that set for MaxNoOfConcurrentOperations.
Transaction temporary storage. The next set of [ndbd] parameters is used to determine temporary storage when executing a statement that is part of a Cluster transaction. All records are released when the statement is completed and the cluster is waiting for the commit or rollback.

The default values for these parameters are adequate for most situations. However, users with a need to support transactions involving large numbers of rows or operations may need to increase these values to enable better parallelism in the system, whereas users whose applications require relatively small transactions can decrease the values to save memory.
- MaxNoOfConcurrentIndexOperations

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & integer \\
\hline Default & 8 K \\
\hline Range & $0-4294967039$ \\
& (0xFFFFFEFF) \\
\hline Deprecated & \begin{tabular}{l} 
Yes (in NDB \\
8.0)
\end{tabular} \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

For queries using a unique hash index, another temporary set of operation records is used during a query's execution phase. This parameter sets the size of that pool of records. Thus, this record is allocated only while executing a part of a query. As soon as this part has been executed, the record is released. The state needed to handle aborts and commits is handled by the normal operation records, where the pool size is set by the parameter MaxNoOfConcurrentOperations.

The default value of this parameter is 8192 . Only in rare cases of extremely high parallelism using unique hash indexes should it be necessary to increase this value. Using a smaller value is possible and can save memory if the DBA is certain that a high degree of parallelism is not required for the cluster.

This parameter is deprecated and subject to removal in a future NDB Cluster release. In addition, this parameter is incompatible with the TransactionMemory parameter; if you try to set values for both parameters in the cluster configuration file (config.ini), the management server refuses to start.
- MaxNoOfFiredTriggers

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & integer \\
\hline Default & 4000 \\
\hline Range & $0-4294967039$ \\
& (0xFFFFFEFF) \\
\hline Deprecated & \begin{tabular}{l} 
Yes (in NDB \\
8.0)
\end{tabular} \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

The default value of MaxNoOfFiredTriggers is 4000 , which is sufficient for most situations. In some cases it can even be decreased if the DBA feels certain the need for parallelism in the cluster is not high.

A record is created when an operation is performed that affects a unique hash index. Inserting or deleting a record in a table with unique hash indexes or updating a column that is part of a unique hash index fires an insert or a delete in the index table. The resulting record is used to represent this index table operation while waiting for the original operation that fired it to complete. This operation is short-lived but can still require a large number of records in its pool for situations with many parallel write operations on a base table containing a set of unique hash indexes.

This parameter is deprecated and subject to removal in a future NDB Cluster release. In addition, this parameter is incompatible with the TransactionMemory parameter; if you try to set values for both parameters in the cluster configuration file (config.ini), the management server refuses to start.
- TransactionBufferMemory

\begin{tabular}{|l|l|}
\hline Version (or later) & NDB 8.4.0 \\
\hline Type or units & bytes \\
\hline Default & 1M \\
\hline Range & 1 K 4294967039 (0xFFFFFEFF) \\
\hline Restart Type & Node Restart: Requires a rolling restart of the cluster. (NDB 8.4.0) \\
\hline
\end{tabular}

The memory affected by this parameter is used for tracking operations fired when updating index tables and reading unique indexes. This memory is used to store the key and column information for
these operations. It is only very rarely that the value for this parameter needs to be altered from the default.

The default value for TransactionBufferMemory is 1 MB .
Normal read and write operations use a similar buffer, whose usage is even more short-lived. The compile-time parameter ZATTRBUF_FILESIZE (found in ndb/src/kernel/blocks/ Dbtc/Dbtc.hpp) set to $4000 \times 128$ bytes $(500 \mathrm{~KB})$. A similar buffer for key information, ZDATABUF_FILESIZE (also in Dbtc. hpp) contains $4000 \times 16=62.5 \mathrm{~KB}$ of buffer space. Dbtc is the module that handles transaction coordination.

Transaction resource allocation parameters. The parameters in the following list are used to allocate transaction resources in the transaction coordinator (DBTC). Leaving any one of these set to the default ( 0 ) dedicates transaction memory for $25 \%$ of estimated total data node usage for the corresponding resource. The actual maximum possible values for these parameters are typically limited by the amount of memory available to the data node; setting them has no impact on the total amount of memory allocated to the data node. In addition, you should keep in mind that they control numbers of reserved internal records for the data node independent of any settings for MaxDMLOperationsPerTransaction, MaxNoOfConcurrentIndexOperations, MaxNoOfConcurrentOperations, MaxNoOfConcurrentScans, MaxNoOfConcurrentTransactions, MaxNoOfFiredTriggers, MaxNoOfLocalScans, or TransactionBufferMemory (see Transaction parameters and Transaction temporary storage).
- ReservedConcurrentIndexOperations

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & numeric \\
\hline Default & 0 \\
\hline Range & \begin{tabular}{l}
$0-4294967039$ \\
(0xFFFFFEFF)
\end{tabular} \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

Number of simultaneous index operations having dedicated resources on one data node.
- ReservedConcurrentOperations

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & numeric \\
\hline Default & 0 \\
\hline Range & \begin{tabular}{l}
$0-4294967039$ \\
(0xFFFFFEFF)
\end{tabular} \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

Number of simultaneous operations having dedicated resources in transaction coordinators on one data node.
- ReservedConcurrentScans

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & numeric \\
\hline Default & 0 \\
\hline Range & \begin{tabular}{l}
$0-4294967039$ \\
(0xFFFFFEFF)
\end{tabular} \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

Number of simultaneous scans having dedicated resources on one data node.
- ReservedConcurrentTransactions

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & numeric \\
\hline Default & 0 \\
\hline Range & \begin{tabular}{l}
$0-4294967039$ \\
(0xFFFFFEFF)
\end{tabular} \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

Number of simultaneous transactions having dedicated resources on one data node.
- ReservedFiredTriggers

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & numeric \\
\hline Default & 0 \\
\hline Range & \begin{tabular}{l}
$0-4294967039$ \\
(0xFFFFFEFF)
\end{tabular} \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

Number of triggers that have dedicated resources on one $\operatorname{ndbd}(\mathrm{DB})$ node.
- ReservedLocalScans

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & numeric \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Default & 0 \\
\hline Range & \begin{tabular}{l}
$0-4294967039$ \\
(0xFFFFFEFF)
\end{tabular} \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

Number of simultaneous fragment scans having dedicated resources on one data node.
- ReservedTransactionBufferMemory

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & numeric \\
\hline Default & 0 \\
\hline Range & $0-4294967039$ \\
& (0xFFFFFEFF) \\
\hline Deprecated & \begin{tabular}{l} 
Yes (in NDB \\
8.0)
\end{tabular} \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

Dynamic buffer space (in bytes) for key and attribute data allocated to each data node.
- TransactionMemory

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & bytes \\
\hline Default & 0 \\
\hline Range & $0-16384 \mathrm{G}$ \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

Important
A number of configuration parameters are incompatible with TransactionMemory; it is not possible to set any of these parameters concurrently with TransactionMemory, and if you attempt to do so, the management server is unable to start (see Parameters incompatible with TransactionMemory).

This parameter determines the memory (in bytes) allocated for transactions on each data node. Setting of transaction memory is handled as follows:
- If TransactionMemory is set, this value is used for determining transaction memory.
- Otherwise, transaction memory is calculated as it was previous to NDB 8.0.

Parameters incompatible with TransactionMemory. The following parameters cannot be used concurrently with TransactionMemory and are therefore deprecated:
- MaxNoOfConcurrentIndexOperations
- MaxNoOfFiredTriggers
- MaxNoOfLocalOperations
- MaxNoOfLocalScans

Explicitly setting any of the parameters just listed when TransactionMemory has also been set in the cluster configuration file (config.ini) keeps the management node from starting.

For more information regarding resource allocation in NDB Cluster data nodes, see Section 25.4.3.13, "Data Node Memory Management".

Scans and buffering. There are additional [ndbd] parameters in the Dblqh module (in ndb/src/kernel/blocks/Dblqh/Dblqh.hpp) that affect reads and updates. These include ZATTRINBUF_FILESIZE, set by default to $10000 \times 128$ bytes ( 1250 KB ) and ZDATABUF_FILE_SIZE, set by default to $10000^{*} 16$ bytes (roughly 156 KB ) of buffer space. To date, there have been neither any reports from users nor any results from our own extensive tests suggesting that either of these compiletime limits should be increased.
- BatchSizePerLocalScan

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & integer \\
\hline Default & 256 \\
\hline Range & $1-992$ \\
\hline Deprecated & \begin{tabular}{l} 
Yes (in NDB \\
8.0 )
\end{tabular} \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

This parameter is used to calculate the number of lock records used to handle concurrent scan operations.

Deprecated.
BatchSizePerLocalScan has a strong connection to the BatchSize defined in the SQL nodes.
- LongMessageBuffer

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & bytes \\
\hline Default & 64 M \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Range & 512K - \\
& 4294967039 \\
& (0xFFFFFEFF) \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

This is an internal buffer used for passing messages within individual nodes and between nodes. The default is 64 MB .

This parameter seldom needs to be changed from the default.
- MaxFKBuildBatchSize

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & integer \\
\hline Default & 64 \\
\hline Range & $16-512$ \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

Maximum scan batch size used for building foreign keys. Increasing the value set for this parameter may speed up building of foreign key builds at the expense of greater impact to ongoing traffic.
- MaxNoOfConcurrentScans

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & integer \\
\hline Default & 256 \\
\hline Range & $2-500$ \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

This parameter is used to control the number of parallel scans that can be performed in the cluster. Each transaction coordinator can handle the number of parallel scans defined for this parameter. Each scan query is performed by scanning all partitions in parallel. Each partition scan uses a scan record in the node where the partition is located, the number of records being the value of this parameter times the number of nodes. The cluster should be able to sustain MaxNoOfConcurrentScans scans concurrently from all nodes in the cluster.

Scans are actually performed in two cases. The first of these cases occurs when no hash or ordered indexes exists to handle the query, in which case the query is executed by performing a full table scan. The second case is encountered when there is no hash index to support the query but there is
an ordered index. Using the ordered index means executing a parallel range scan. The order is kept on the local partitions only, so it is necessary to perform the index scan on all partitions.

The default value of MaxNoOfConcurrentScans is 256 . The maximum value is 500.
- MaxNoOfLocalScans

\begin{tabular}{|l|l|l|}
\hline Version (or later) & NDB 8.4.0 & \\
\hline Type or units & integer & \\
\hline Default & 4 * MaxNoOfConcurrentScans * [\# of data nodes] + 2 & \\
\hline Range & 32 4294967039 (0xFFFFFEFF) & \\
\hline Deprecated & Yes (in NDB 8.0) & \\
\hline Restart Type & Node Restart: Requires a rolling restart of the cluster. (NDB 8.4.0) & \\
\hline
\end{tabular}

Specifies the number of local scan records if many scans are not fully parallelized. When the number of local scan records is not provided, it is calculated as shown here:

4 * MaxNoOfConcurrentScans * [\# data nodes] + 2
This parameter is deprecated and subject to removal in a future NDB Cluster release. In addition, this parameter is incompatible with the TransactionMemory parameter; if you try to set values for both parameters in the cluster configuration file (config.ini), the management server refuses to start.
- MaxParallelCopyInstances

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & integer \\
\hline Default & 0 \\
\hline Range & $0-64$ \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

This parameter sets the parallelization used in the copy phase of a node restart or system restart, when a node that is currently just starting is synchronised with a node that already has current data by copying over any changed records from the node that is up to date. Because full parallelism in such cases can lead to overload situations, MaxParallelCopyInstances provides a means to decrease it. This parameter's default value 0 . This value means that the effective parallelism is equal to the number of LDM instances in the node just starting as well as the node updating it.
- MaxParallelScansPerFragment

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & bytes \\
\hline Default & 256 \\
\hline Range & \begin{tabular}{l}
$1-4294967039$ \\
(0xFFFFFEFF)
\end{tabular} \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

It is possible to configure the maximum number of parallel scans (TUP scans and TUX scans) allowed before they begin queuing for serial handling. You can increase this to take advantage of any unused CPU when performing large number of scans in parallel and improve their performance.
- MaxReorgBuildBatchSize

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & integer \\
\hline Default & 64 \\
\hline Range & $16-512$ \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

Maximum scan batch size used for reorganization of table partitions. Increasing the value set for this parameter may speed up reorganization at the expense of greater impact to ongoing traffic.
- MaxUIBuildBatchSize

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & integer \\
\hline Default & 64 \\
\hline Range & $16-512$ \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

Maximum scan batch size used for building unique keys. Increasing the value set for this parameter may speed up such builds at the expense of greater impact to ongoing traffic.

