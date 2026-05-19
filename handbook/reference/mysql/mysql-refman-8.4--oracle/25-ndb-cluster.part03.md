\section*{MySQL Server Options for NDB Cluster}

This section provides descriptions of mysqld server options relating to NDB Cluster. For information about mysqld options not specific to NDB Cluster, and for general information about the use of options with mysqld, see Section 7.1.7, "Server Command Options".

For information about command-line options used with other NDB Cluster processes, see Section 25.5, "NDB Cluster Programs".
- --ndbcluster

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndbcluster[=value] \\
\hline Disabled by & skip-ndbcluster \\
\hline Type & Enumeration \\
\hline Default Value & ON \\
\hline Valid Values & \begin{tabular}{l}
OFF \\
FORCE
\end{tabular} \\
\hline
\end{tabular}

The NDBCLUSTER storage engine is necessary for using NDB Cluster. If a mysqld binary includes support for the NDBCLUSTER storage engine, the engine is disabled by default. Use the ndbcluster option to enable it. Use --skip-ndbcluster to explicitly disable the engine.

The --ndbcluster option is ignored (and the NDB storage engine is not enabled) if - initialize is also used. (It is neither necessary nor desirable to use this option together with - initialize.)
- --ndb-allow-copying-alter-table=[ON|OFF]

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-allow-copying-altertable[=\{OFF|ON\}] \\
\hline System Variable & ndb_allow_copying_alter_table \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Default Value & ON \\
\hline
\end{tabular}

Let ALTER TABLE and other DDL statements use copying operations on NDB tables. Set to OFF to keep this from happening; doing so may improve performance of critical applications.
- --ndb-applier-allow-skip-epoch

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-applier-allow-skip-epoch \\
\hline System Variable & ndb_applier_allow_skip_epoch \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline
\end{tabular}

Use together with - -replica-skip-errors to cause NDB to ignore skipped epoch transactions. Has no effect when used alone.
- --ndb-batch-size=\#

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-batch-size \\
\hline System Variable & ndb_batch_size \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 32768 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 2147483648 \\
\hline Unit & bytes \\
\hline
\end{tabular}

This sets the size in bytes that is used for NDB transaction batches.
- --ndb-cluster-connection-pool=\#

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-cluster-connection-pool \\
\hline System Variable & ndb_cluster_connection_pool \\
\hline System Variable & ndb_cluster_connection_pool \\
\hline Scope & Global \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 1 \\
\hline Minimum Value & 1 \\
\hline Maximum Value & 63 \\
\hline
\end{tabular}

By setting this option to a value greater than 1 (the default), a mysqld process can use multiple connections to the cluster, effectively mimicking several SQL nodes. Each connection requires its
own [api] or [mysqld] section in the cluster configuration (config.ini) file, and counts against the maximum number of API connections supported by the cluster.

Suppose that you have 2 cluster host computers, each running an SQL node whose mysqld process was started with --ndb-cluster-connection-pool=4; this means that the cluster must have 8 API slots available for these connections (instead of 2). All of these connections are set up when the SQL node connects to the cluster, and are allocated to threads in a round-robin fashion.

This option is useful only when running mysqld on host machines having multiple CPUs, multiple cores, or both. For best results, the value should be smaller than the total number of cores available on the host machine. Setting it to a value greater than this is likely to degrade performance severely.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4062.jpg?height=117&width=103&top_left_y=749&top_left_x=338)

\section*{Important}

Because each SQL node using connection pooling occupies multiple API node slots-each slot having its own node ID in the cluster-you must not use a node ID as part of the cluster connection string when starting any mysqld process that employs connection pooling.

Setting a node ID in the connection string when using the --ndb-cluster-connection-pool option causes node ID allocation errors when the SQL node attempts to connect to the cluster.
- --ndb-cluster-connection-pool-nodeids=list

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-cluster-connection-poolnodeids \\
\hline System Variable & ndb_cluster_connection_pool_nodeids \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Set \\
\hline Default Value & \\
\hline
\end{tabular}

Specifies a comma-separated list of node IDs for connections to the cluster used by an SQL node. The number of nodes in this list must be the same as the value set for the --ndb-cluster-connection-pool option.
- --ndb-blob-read-batch-bytes=bytes

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-blob-read-batch-bytes \\
\hline System Variable & ndb_blob_read_batch_bytes \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 65536 \\
\hline Minimum Value & 0 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l} 
Maximum Value & 4294967295
\end{tabular}

This option can be used to set the size (in bytes) for batching of BLOB data reads in NDB Cluster applications. When this batch size is exceeded by the amount of BLOB data to be read within the current transaction, any pending BLOB read operations are immediately executed.

The maximum value for this option is 4294967295 ; the default is 65536 . Setting it to 0 has the effect of disabling BLOB read batching.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4063.jpg?height=120&width=97&top_left_y=641&top_left_x=404)

Note
In NDB API applications, you can control BLOB write batching with the setMaxPendingBlobReadBytes() and getMaxPendingBlobReadBytes() methods.
- --ndb-blob-write-batch-bytes=bytes

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-blob-write-batch-bytes \\
\hline System Variable & ndb_blob_write_batch_bytes \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 65536 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 4294967295 \\
\hline Unit & bytes \\
\hline
\end{tabular}

This option can be used to set the size (in bytes) for batching of BLOB data writes in NDB Cluster applications. When this batch size is exceeded by the amount of BLOB data to be written within the current transaction, any pending BLOB write operations are immediately executed.

The maximum value for this option is 4294967295 ; the default is 65536 . Setting it to 0 has the effect of disabling BLOB write batching.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4063.jpg?height=120&width=97&top_left_y=1900&top_left_x=404)

Note
In NDB API applications, you can control BLOB write batching with the setMaxPendingBlobWriteBytes() and getMaxPendingBlobWriteBytes() methods.
- --ndb-connectstring=connection_string

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - ndb-connectstring \\
\hline Type & String \\
\hline
\end{tabular}

When using the NDBCLUSTER storage engine, this option specifies the management server that distributes cluster configuration data. See Section 25.4.3.3, "NDB Cluster Connection Strings", for syntax.
- --ndb-default-column-format=[FIXED|DYNAMIC]

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-default-column-format=\{FIXED| \\
\hline & 4033 \\
\hline System Variable & ndb_default_column_format \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Enumeration \\
\hline Default Value & FIXED \\
\hline Valid Values & \begin{tabular}{l}
FIXED \\
DYNAMIC
\end{tabular} \\
\hline
\end{tabular}

Sets the default COLUMN_FORMAT and ROW_FORMAT for new tables (see Section 15.1.20, "CREATE TABLE Statement"). The default is FIXED.
- --ndb-deferred-constraints=[0|1]

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-deferred-constraints \\
\hline System Variable & ndb_deferred_constraints \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 1 \\
\hline
\end{tabular}

Controls whether or not constraint checks on unique indexes are deferred until commit time, where such checks are supported. 0 is the default.

This option is not normally needed for operation of NDB Cluster or NDB Cluster Replication, and is intended primarily for use in testing.
- --ndb-schema-dist-timeout=\#

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-schema-dist-timeout=\# \\
\hline System Variable & ndb_schema_dist_timeout \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 120 \\
\hline Minimum Value & 5 \\
\hline Maximum Value & 1200 \\
\hline Unit & seconds \\
\hline
\end{tabular}

Specifies the maximum time in seconds that this mysqld waits for a schema operation to complete before marking it as having timed out.
- --ndb-distribution=[KEYHASH|LINHASH]

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- ndb-distribution=\{KEYHASH|LINHASH\} \\
\hline System Variable & ndb_distribution \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Enumeration \\
\hline Default Value & KEYHASH \\
\hline Valid Values & \begin{tabular}{l}
LINHASH \\
KEYHASH
\end{tabular} \\
\hline
\end{tabular}

Controls the default distribution method for NDB tables. Can be set to either of KEYHASH (key hashing) or LINHASH (linear hashing). KEYHASH is the default.
- --ndb-log-apply-status

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-log-apply-status[=\{OFF|ON\}] \\
\hline System Variable & ndb_log_apply_status \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

Causes a replica mysqld to log any updates received from its immediate source to the mysql.ndb_apply_status table in its own binary log using its own server ID rather than the server ID of the source. In a circular or chain replication setting, this allows such updates to propagate to the mysql.ndb_apply_status tables of any MySQL servers configured as replicas of the current mysqld.

In a chain replication setup, using this option allows downstream (replica) clusters to be aware of their positions relative to all of their upstream contributors (sourcess).

In a circular replication setup, this option causes changes to ndb_apply_status tables to complete the entire circuit, eventually propagating back to the originating NDB Cluster. This also allows a cluster acting as a replication source to see when its changes (epochs) have been applied to the other clusters in the circle.

This option has no effect unless the MySQL server is started with the --ndbcluster option.
- --ndb-log-empty-epochs=[ON | OFF]

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-log-empty-epochs [=\{OFF | ON\}] \\
\hline System Variable & ndb_log_empty_epochs \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Default Value & OFF
\end{tabular}

Causes epochs during which there were no changes to be written to the ndb_apply_status and ndb_binlog_index tables, even when log_replica_updates is enabled.

By default this option is disabled. Disabling --ndb-log-empty-epochs causes epoch transactions with no changes not to be written to the binary log, although a row is still written even for an empty epoch in ndb_binlog_index.

Because --ndb-log-empty-epochs=1 causes the size of the ndb_binlog_index table to increase independently of the size of the binary log, users should be prepared to manage the growth of this table, even if they expect the cluster to be idle a large part of the time.
- --ndb-log-empty-update=[ON|OFF]

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-log-empty-update[=\{OFF|ON\}] \\
\hline System Variable & ndb_log_empty_update \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

Causes updates that produced no changes to be written to the ndb_apply_status and ndb_binlog_index tables, even when log_replica_updates is enabled.

By default this option is disabled (0FF). Disabling --ndb-log-empty-update causes updates with no changes not to be written to the binary log.
- --ndb-log-exclusive-reads=[0|1]

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-log-exclusive-reads[=\{OFF|ON\}] \\
\hline System Variable & ndb_log_exclusive_reads \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & 0 \\
\hline
\end{tabular}

Starting the server with this option causes primary key reads to be logged with exclusive locks, which allows for NDB Cluster Replication conflict detection and resolution based on read conflicts. You can also enable and disable these locks at runtime by setting the value of the ndb_log_exclusive_reads system variable to 1 or 0 , respectively. 0 (disable locking) is the default.

For more information, see Read conflict detection and resolution.
- --ndb-log-fail-terminate

\begin{tabular}{|l|l|l|}
\hline \multirow{3}{*}{} & Command-Line Format & --ndb-log-fail-terminate \\
\hline & System Variable & ndb_log_fail_terminate \\
\hline & Scope & Global \\
\hline 4036 & Dynamic & No \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & FALSE \\
\hline
\end{tabular}

When this option is specified, and complete logging of all found row events is not possible, the mysqld process is terminated.
- --ndb-log-orig

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-log-orig[=\{OFF|ON\}] \\
\hline System Variable & ndb_log_orig \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & 0FF \\
\hline
\end{tabular}

Log the originating server ID and epoch in the ndb_binlog_index table.

\section*{Note}

This makes it possible for a given epoch to have multiple rows in ndb_binlog_index, one for each originating epoch.

For more information, see Section 25.7.4, "NDB Cluster Replication Schema and Tables".
- --ndb-log-transaction-dependency

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-log-transactiondependency=\{true|false\} \\
\hline System Variable & ndb_log_transaction_dependency \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & false \\
\hline
\end{tabular}

Causes the NDB binary logging thread to calculate transaction dependencies for each transaction which it writes to the binary log. The default value is FALSE.

This option cannot be set at runtime; the corresponding ndb_log_transaction_dependency system variable is read-only.
- --ndb-log-transaction-id

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-log-transaction-id[=\{OFF|ON\}] \\
\hline System Variable & ndb_log_transaction_id \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Default Value & OFF
\end{tabular}

Causes a replica mysqld to write the NDB transaction ID in each row of the binary log. The default value is FALSE.
--ndb-log-transaction-id is required to enable NDB Cluster Replication conflict detection and resolution using the NDB\$EPOCH_TRANS( ) function (see NDB\$EPOCH_TRANS()). For more information, see Section 25.7.12, "NDB Cluster Replication Conflict Resolution".
- --ndb-log-update-as-write

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-log-update-as-write[=\{OFF|ON\}] \\
\hline System Variable & ndb_log_update_as_write \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & ON \\
\hline
\end{tabular}

Whether updates on the source are written to the binary log as updates (OFF) or writes (ON). When this option is enabled, and both --ndb-log-updated-only and--ndb-log-update-minimal are disabled, operations of different types are loǵged as described in the following list:
- INSERT: Logged as a WRITE_ROW event with no before image; the after image is logged with all columns.

UPDATE: Logged as a WRITE_ROW event with no before image; the after image is logged with all columns.

DELETE: Logged as a DELETE_ROW event with all columns logged in the before image; the after image is not logged.

This option can be used for NDB Replication conflict resolution in combination with the other two NDB logging options mentioned previously; see ndb_replication Table, for more information.
- --ndb-log-updated-only

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-log-updated-only[=\{OFF | ON\}] \\
\hline System Variable & ndb_log_updated_only \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & ON \\
\hline
\end{tabular}

Whether mysqld writes updates only (ON) or complete rows (OFF) to the binary log. When this option is enabled, and both--ndb-log-update-as-write and--ndb-log-update-minimal are disabled, operations of different types are loǵged as described in the following list:
- INSERT: Logged as a WRITE_ROW event with no before image; the after image is logged with all columns.
- UPDATE: Logged as an UPDATE_ROW event with primary key columns and updated columns present in both the before and after images.
- DELETE: Logged as a DELETE_ROW event with primary key columns incuded in the before image; the after image is not logged.

This option can be used for NDB Replication conflict resolution in combination with the other two NDB logging options mentioned previously; see ndb_replication Table, for more information about how these options interact with one another.
- --ndb-log-update-minimal

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-log-update-minimal[=\{OFF|ON\}] \\
\hline System Variable & ndb_log_update_minimal \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & 0FF \\
\hline
\end{tabular}

Log updates in a minimal fashion, by writing only the primary key values in the before image, and only the changed columns in the after image. This may cause compatibility problems if replicating to storage engines other than NDB. When this option is enabled, and both--ndb-log-updatedonly and --ndb-log-update-as-write are disabled, operations of different types are loǵged as described in the following list:
- INSERT: Logged as a WRITE_ROW event with no before image; the after image is logged with all columns.
- UPDATE: Logged as an UPDATE_ROW event with primary key columns in the before image; all columns except primary key columns are logged in the after image.
- DELETE: Logged as a DELETE_ROW event with all columns in the before image; the after image is not logged.

This option can be used for NDB Replication conflict resolution in combination with the other two NDB logging options mentioned previously; see ndb_replication Table, for more information.
- --ndb-mgm-tls=[relaxed|strict]

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-mgm-tls=[strict|relaxed] \\
\hline System Variable & ndb_mgm_tls \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Enumeration \\
\hline Default Value & relaxed \\
\hline Valid Values & \begin{tabular}{l}
relaxed \\
strict
\end{tabular} \\
\hline
\end{tabular}

Sets the level of TLS support required for TLS connections to NDB Cluster; the value is one of relaxed or strict. relaxed means that a TLS connection is attempted, but success is not required; strict means that TLS is required to connect. The default is relaxed.
- --ndb-mgmd-host=host [ :port]

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - ndb -mgmd - host=host_name [ : port_num] \\
\hline Type & String \\
\hline Default Value & localhost $: 1186$ \\
\hline
\end{tabular}

Can be used to set the host and port number of a single management server for the program to connect to. If the program requires node IDs or references to multiple management servers (or both) in its connection information, use the --ndb-connectstring option instead.
- --ndb-nodeid=\#

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -ndb - nodeid=\# \\
\hline Status Variable & Ndb_cluster_node_id \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline Type & Integer \\
\hline Default Value & N/A \\
\hline Minimum Value & 1 \\
\hline Maximum Value & 255 \\
\hline Maximum Value & 63 \\
\hline
\end{tabular}

Set this MySQL server's node ID in an NDB Cluster.
The --ndb-nodeid option overrides any node ID set with --ndb-connectstring, regardless of the order in which the two options are used.

In addition, if - - ndb-nodeid is used, then either a matching node ID must be found in a [mysqld] or [api] section of config.ini, or there must be an "open" [mysqld] or [api] section in the file (that is, a section without a NodeId or Id parameter specified). This is also true if the node ID is specified as part of the connection string.

Regardless of how the node ID is determined, it is shown as the value of the global status variable Ndb_cluster_node_id in the output of SHOW STATUS, and as cluster_node_id in the connection row of the output of SHOW ENGINE NDBCLUSTER STATUS.

For more information about node IDs for NDB Cluster SQL nodes, see Section 25.4.3.7, "Defining SQL and Other API Nodes in an NDB Cluster".
- - - ndbinfo=\{ON | OFF | FORCE\}

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndbinfo[=value] \\
\hline Type & Enumeration \\
\hline Default Value & ON \\
\hline Valid Values & \begin{tabular}{l}
ON \\
OFF \\
FORCE
\end{tabular} \\
\hline
\end{tabular}

Enables the plugin for the ndbinfo information database. By default this is ON whenever NDBCLUSTER is enabled.
- --ndb-optimization-delay=milliseconds

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-optimization-delay=\# \\
\hline System Variable & ndb_optimization_delay \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 10 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 100000 \\
\hline Unit & milliseconds \\
\hline
\end{tabular}

Set the number of milliseconds to wait between sets of rows by OPTIMIZE TABLE statements on NDB tables. The default is 10.
- --ndb-optimized-node-selection

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-optimized-node-selection \\
\hline System Variable & ndb_optimized_node_selection \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 3 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 3 \\
\hline
\end{tabular}

Enable optimizations for selection of nodes for transactions. Enabled by default; use--skip-ndb-optimized-node-selection to disable.
- ndb-tls-search-path=path

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-tls-search-path=path \\
\hline System Variable & ndb_tls_search_path \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Path name \\
\hline Default Value (Unix) & \$HOME/tls \\
\hline Default Value (Windows) & \$HOMEDIR/tls \\
\hline
\end{tabular}

List of directories to search for CAs and private keys for NDB TLS connections. The list is commadelimited on Unix platforms and semicolon-delimited on Windows.
- --ndb-transid-mysql-connection-map=state

\begin{tabular}{|l|l|}
\hline Type & Enumeration \\
\hline Default Value & ON \\
\hline Valid Values & \begin{tabular}{l}
ON \\
OFF \\
FORCE
\end{tabular} \\
\hline
\end{tabular}

Enables or disables the plugin that handles the ndb_transid_mysql_connection_map table in the INFORMATION_SCHEMA database. Takes one of the values ON, OFF, or FORCE. ON (the default) enables the plugin. OFF disables the plugin, which makes ndb_transid_mysql_connection_map inaccessible. FORCE keeps the MySQL Server from starting if the plugin fails to load and start.

You can see whether the ndb_transid_mysql_connection_map table plugin is running by checking the output of SHOW PLUGINS.
- --ndb-wait-connected=seconds

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-wait-connected=\# \\
\hline System Variable & ndb_wait_connected \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 120 \\
\hline Default Value & 30 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 31536000 \\
\hline Unit & seconds \\
\hline
\end{tabular}

This option sets the period of time that the MySQL server waits for connections to NDB Cluster management and data nodes to be established before accepting MySQL client connections. The time is specified in seconds. The default value is 30 .
- --ndb-wait-setup=seconds

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-wait-setup=\# \\
\hline System Variable & ndb_wait_setup \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 120 \\
\hline Default Value & 30 \\
\hline Default Value & 15 \\
\hline Default Value & 15 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 31536000 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Unit & seconds \\
\hline
\end{tabular}

This variable shows the period of time that the MySQL server waits for the NDB storage engine to complete setup before timing out and treating NDB as unavailable. The time is specified in seconds. The default value is 30 .
- --skip-ndbcluster

\begin{tabular}{|l|l|}
\hline Command-Line Format & --skip-ndbcluster \\
\hline
\end{tabular}

Disable the NDBCLUSTER storage engine. This is the default for binaries that were built with NDBCLUSTER storage engine support; the server allocates memory and other resources for this storage engine only if the - - ndbcluster option is given explicitly. See Section 25.4.1, "Quick Test Setup of NDB Cluster", for an example.

\section*{NDB Cluster System Variables}

This section provides detailed information about MySQL server system variables that are specific to NDB Cluster and the NDB storage engine. For system variables not specific to NDB Cluster, see Section 7.1.8, "Server System Variables". For general information on using system variables, see Section 7.1.9, "Using System Variables".
- ndb_autoincrement_prefetch_sz

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-autoincrement-prefetch-sz=\# \\
\hline System Variable & ndb_autoincrement_prefetch_sz \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 512 \\
\hline Minimum Value & 1 \\
\hline Maximum Value & 65536 \\
\hline
\end{tabular}

Determines the probability of gaps in an autoincremented column. Set it to 1 to minimize this. Setting it to a high value for optimization makes inserts faster, but decreases the likelihood of consecutive autoincrement numbers being used in a batch of inserts.

This variable affects only the number of AUTO_INCREMENT IDs that are fetched between statements; within a given statement, at least 32 IDs are obtained at a time.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4073.jpg?height=135&width=103&top_left_y=2170&top_left_x=402)

\section*{Important}

This variable does not affect inserts performed using INSERT . . . SELECT.
- ndb_clear_apply_status

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-clear-apply-status[=\{OFF|ON\}] \\
\hline System Variable & ndb_clear_apply_status \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean 4043 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Default Value & ON \\
\hline
\end{tabular}

By the default, executing RESET REPLICA causes an NDB Cluster replica to purge all rows from its ndb_apply_status table. You can disable this by setting ndb_clear_apply_status=0FF.
- ndb_conflict_role

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-conflict-role=value \\
\hline System Variable & ndb_conflict_role \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Enumeration \\
\hline Default Value & NONE \\
\hline Valid Values & \begin{tabular}{l}
NONE \\
PRIMARY \\
SECONDARY \\
PASS
\end{tabular} \\
\hline
\end{tabular}

Determines the role of this SQL node (and NDB Cluster) in a circular ("active-active") replication setup. ndb_conflict_role can take any one of the values PRIMARY, SECONDARY, PASS, or NULL (the default). The replica SQL thread must be stopped before you can change ndb_conflict_role. In addition, it is not possible to change directly between PASS and either of PRIMARY or SECONDARY directly; in such cases, you must ensure that the SQL thread is stopped, then execute SET @@GLOBAL.ndb_conflict_role = 'NONE' first.

This variable replaces the deprecated ndb_slave_conflict_role.
For more information, see Section 25.7.12, "NDB Cluster Replication Conflict Resolution".
- ndb_data_node_neighbour

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-data-node-neighbour=\# \\
\hline System Variable & ndb_data_node_neighbour \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 255 \\
\hline
\end{tabular}

Sets the ID of a "nearest" data node-that is, a preferred nonlocal data node is chosen to execute the transaction, rather than one running on the same host as the SQL or API node. This used to ensure that when a fully replicated table is accessed, we access it on this data node, to ensure that
the local copy of the table is always used whenever possible. This can also be used for providing hints for transactions.

This can improve data access times in the case of a node that is physically closer than and thus has higher network throughput than others on the same host.

See Section 15.1.20.12, "Setting NDB Comment Options", for further information.

\section*{Note}

An equivalent method set_data_node_neighbour ( ) is provided for use in NDB API applications.
- ndb_dbg_check_shares

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-dbg-check-shares=\# \\
\hline System Variable & ndb_dbg_check_shares \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 1 \\
\hline
\end{tabular}

When set to 1 , check that no shares are lingering. Available in debug builds only.
- ndb_default_column_format

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-default-column-format=\{FIXED| DYNAMIC\} \\
\hline System Variable & ndb_default_column_format \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Enumeration \\
\hline Default Value & FIXED \\
\hline Valid Values & \begin{tabular}{l}
FIXED \\
DYNAMIC
\end{tabular} \\
\hline
\end{tabular}

Sets the default COLUMN_FORMAT and ROW_FORMAT for new tables (see Section 15.1.20, "CREATE TABLE Statement"). The default is FIXED.
- ndb_deferred_constraints

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-deferred-constraints=\# \\
\hline System Variable & ndb_deferred_constraints \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 1 \\
\hline
\end{tabular}

Controls whether or not constraint checks are deferred, where these are supported. 0 is the default.
This variable is not normally needed for operation of NDB Cluster or NDB Cluster Replication, and is intended primarily for use in testing.
- ndb_distribution

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-distribution=\{KEYHASH|LINHASH\} \\
\hline System Variable & ndb_distribution \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Enumeration \\
\hline Default Value & KEYHASH \\
\hline Valid Values & \begin{tabular}{l}
LINHASH \\
KEYHASH
\end{tabular} \\
\hline
\end{tabular}

Controls the default distribution method for NDB tables. Can be set to either of KEYHASH (key hashing) or LINHASH (linear hashing). KEYHASH is the default.
- ndb_eventbuffer_free_percent

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-eventbuffer-free-percent=\# \\
\hline System Variable & ndb_eventbuffer_free_percent \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 20 \\
\hline Minimum Value & 1 \\
\hline Maximum Value & 99 \\
\hline
\end{tabular}

Sets the percentage of the maximum memory allocated to the event buffer (ndb_eventbuffer_max_alloc) that should be available in event buffer after reaching the maximum, before starting to buffer again.
- ndb_eventbuffer_max_alloc

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-eventbuffer-max-alloc=\# \\
\hline System Variable & ndb_eventbuffer_max_alloc \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Minimum Value & 0 \\
\hline Maximum Value & 9223372036854775807 \\
\hline
\end{tabular}

Sets the maximum amount memory (in bytes) that can be allocated for buffering events by the NDB API. 0 means that no limit is imposed, and is the default.
- ndb_extra_logging

\begin{tabular}{|l|l|}
\hline Command-Line Format & ndb_extra_logging=\# \\
\hline System Variable & ndb_extra_logging \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 1 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 1 \\
\hline
\end{tabular}

This variable enables recording in the MySQL error log of information specific to the NDB storage engine.

When this variable is set to 0 , the only information specific to NDB that is written to the MySQL error log relates to transaction handling. If it set to a value greater than 0 but less than 10 , NDB table schema and connection events are also logged, as well as whether or not conflict resolution is in use, and other NDB errors and information. If the value is set to 10 or more, information about NDB internals, such as the progress of data distribution among cluster nodes, is also written to the MySQL error log. The default is 1 .
- ndb_force_send

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-force-send [=\{OFF|ON\}] \\
\hline System Variable & ndb_force_send \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & ON \\
\hline
\end{tabular}

Forces sending of buffers to NDB immediately, without waiting for other threads. Defaults to ON.
- ndb_fully_replicated

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-fully-replicated[=\{OFF | ON\}] \\
\hline System Variable & ndb_fully_replicated \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Default Value & OFF
\end{tabular}

Determines whether new NDB tables are fully replicated. This setting can be overridden for an individual table using COMMENT="NDB_TABLE=FULLY_REPLICATED=..." in a CREATE TABLE or ALTER TABLE statement; see Section 15.1.20.12, "Setting NDB Comment Options", for syntax and other information.
- ndb_index_stat_enable

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-index-stat-enable[=\{OFF|ON\}] \\
\hline System Variable & ndb_index_stat_enable \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & ON \\
\hline
\end{tabular}

Use NDB index statistics in query optimization. The default is ON.
The index statistics tables are always created when the server starts, regardless of this option's value.
- ndb_index_stat_option

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-index-stat-option=value \\
\hline System Variable & ndb_index_stat_option \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Default Value & loop_checkon=1000ms,loop_idle=1000ms,loop_busy update_batch=1,read_batch=4,idle_batch=32, chec check_delay=1m,delete_batch=8,clean_delay=0,er \\
\hline
\end{tabular}
```
error_delay=1m,evict_batch=8,evict_delay=1m
cache_lowpct=90
```


This variable is used for providing tuning options for NDB index statistics generation. The list consist of comma-separated name-value pairs of option names and values, and this list must not contain any space characters.

Options not used when setting ndb_index_stat_option are not changed from their default values. For example, you can set ndb_index_stat_option = 'loop_idle=1000ms,cache_limit=32M'.

Time values can be optionally suffixed with h (hours), m (minutes), or s (seconds). Millisecond values can optionally be specified using ms; millisecond values cannot be specified using h, m, or s.) Integer values can be suffixed with K, M, or G.

The names of the options that can be set using this variable are shown in the table that follows. The table also provides brief descriptions of the options, their default values, and (where applicable) their minimum and maximum values.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 25.19 ndb_index_stat_option options and values}
\begin{tabular}{|l|l|l|l|}
\hline Name & Description & Default/Units & Minimum/Maximum \\
\hline loop_enable & & 1000 ms & 0/4G \\
\hline loop_idle & Time to sleep when idle & 1000 ms & 0/4G \\
\hline loop_busy & Time to sleep when more work is waiting & 100 ms & 0/4G \\
\hline update_batch & & 1 & 0/4G \\
\hline read_batch & & 4 & $1 / 4 \mathrm{G}$ \\
\hline idle_batch & & 32 & $1 / 4 \mathrm{G}$ \\
\hline check_batch & & 8 & $1 / 4 \mathrm{G}$ \\
\hline check_delay & How often to check for new statistics & 10 m & $1 / 4 \mathrm{G}$ \\
\hline delete_batch & & 8 & 0/4G \\
\hline clean_delay & & 1 m & 0/4G \\
\hline error_batch & & 4 & $1 / 4 \mathrm{G}$ \\
\hline error_delay & & 1 m & $1 / 4 \mathrm{G}$ \\
\hline evict_batch & & 8 & $1 / 4 \mathrm{G}$ \\
\hline evict_delay & Clean LRU cache, from read time & 1 m & 0/4G \\
\hline cache_limit & Maximum amount of memory in bytes used for cached index statistics by this mysqld; clean up the cache when this is exceeded. & 32 M & 0/4G \\
\hline cache_lowpct & & 90 & 0/100 \\
\hline zero_total & Setting this to 1 resets all accumulating counters in ndb_index_stat_sta to 0 . This option value & 0 & 0/1 \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|l|l|}
\hline Name & Description & Default/Units & Minimum/Maximum \\
\hline & \begin{tabular}{l} 
is also reset to 0 when \\
this is done.
\end{tabular} & & \\
\hline
\end{tabular}
- ndb_join_pushdown

\begin{tabular}{|l|l|}
\hline System Variable & ndb_join_pushdown \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & ON \\
\hline
\end{tabular}

This variable controls whether joins on NDB tables are pushed down to the NDB kernel (data nodes). Previously, a join was handled using multiple accesses of NDB by the SQL node; however, when ndb_join_pushdown is enabled, a pushable join is sent in its entirety to the data nodes, where it can be distributed among the data nodes and executed in parallel on multiple copies of the data, with a single, merged result being returned to mysqld. This can reduce greatly the number of round trips between an SQL node and the data nodes required to handle such a join.

By default, ndb_join_pushdown is enabled.
Conditions for NDB pushdown joins. In order for a join to be pushable, it must meet the following conditions:
1. Only columns can be compared, and all columns to be joined must use exactly the same data type. This means that (for example) a join on an INT column and a BIGINT column also cannot be pushed down.

Expressions comparing columns from the same table can also be pushed down. The columns (or the result of any operations on those columns) must be of exactly the same type, including the same signedness, length, character set and collation, precision, and scale, where these are applicable.
2. Queries referencing BLOB or TEXT columns are not supported.
3. Explicit locking is not supported; however, the NDB storage engine's characteristic implicit rowbased locking is enforced.

This means that a join using FOR UPDATE cannot be pushed down.
4. In order for a join to be pushed down, child tables in the join must be accessed using one of the ref, eq_ref, or const access methods, or some combination of these methods.

Outer joined child tables can only be pushed using eq_ref.
If the root of the pushed join is an eq_ref or const, only child tables joined by eq_ref can be appended. (A table joined by ref is likely to become the root of another pushed join.)

If the query optimizer decides on Using join cache for a candidate child table, that table cannot be pushed as a child. However, it may be the root of another set of pushed tables.
5. Joins referencing tables explicitly partitioned by [LINEAR] HASH, LIST, or RANGE currently cannot be pushed down.

You can see whether a given join can be pushed down by checking it with EXPLAIN; when the join can be pushed down, you can see references to the pushed join in the Extra column of the output, as shown in this example:
```
mysql> EXPLAIN
        -> SELECT e.first_name, e.last_name, t.title, d.dept_name
        -> FROM employees e
        -> JOIN dept_emp de ON e.emp_no=de.emp_no
        -> JOIN departments d ON d.dept_no=de.dept_no
        -> JOIN titles t ON e.emp_no=t.emp_no\G
************************** 1. row *****************************************
                    id: 1
    select_type: SIMPLE
                table: d
                    type: ALL
possible_keys: PRIMARY
                        key: NULL
            key_len: NULL
                        ref: NULL
                    rows: 9
                Extra: Parent of 4 pushed join@1
************************** 2. row *****************************************
                        id: 1
    select_type: SIMPLE
                table: de
                    type: ref
possible_keys: PRIMARY,emp_no,dept_no
                        key: dept_no
            key_len: 4
                        ref: employees.d.dept_no
                    rows: 5305
                Extra: Child of 'd' in pushed join@1
************************** 3. row *****************************************
                        id: 1
    select_type: SIMPLE
                table: e
                    type: eq_ref
possible_keys: PRIMARY
                        key: PRIMARY
            key_len: 4
                        ref: employees.de.emp_no
                    rows: 1
                Extra: Child of 'de' in pushed join@1
************************** 4. rOW *****************************************
                        id: 1
    select_type: SIMPLE
                table: t
                    type: ref
possible_keys: PRIMARY,emp_no
                        key: emp_no
            key_len: 4
                        ref: employees.de.emp_no
                    rows: 19
                Extra: Child of 'e' in pushed join@1
4 rows in set (0.00 sec)
```


\section*{Note}

If inner joined child tables are joined by ref, and the result is ordered or grouped by a sorted index, this index cannot provide sorted rows, which forces writing to a sorted tempfile.

Two additional sources of information about pushed join performance are available:
1. The status variables Ndb_pushed_queries_defined, Ndb_pushed_queries_dropped, Ndb_pushed_queries_executed, and Ndb_pushed_reads.
2. The counters in the ndbinfo.counters table that belong to the DBSPJ kernel block.
- ndb_log_apply_status

Command-Line Format
--ndb-log-apply-status[=\{OFF|ON\}]

\begin{tabular}{|l|l|}
\hline System Variable & ndb_log_apply_status \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

A read-only variable which shows whether the server was started with the --ndb-log-applystatus option.
- ndb_log_bin

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-log-bin[=\{OFF|ON\}] \\
\hline System Variable & ndb_log_bin \\
\hline Scope & Global, Session \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

Causes updates to NDB tables to be written to the binary log. The setting for this variable has no effect if binary logging is not already enabled on the server using log_bin. ndb_log_bin defaults to 0 (FALSE).
- ndb_log_binlog_index

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-log-binlog-index[=\{OFF|ON\}] \\
\hline System Variable & ndb_log_binlog_index \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & ON \\
\hline
\end{tabular}

Causes a mapping of epochs to positions in the binary log to be inserted into the ndb_binlog_index table. Setting this variable has no effect if binary logging is not already enabled for the server using log_bin. (In addition, ndb_log_bin must not be disabled.) ndb_log_binlog_index defaults to $1(0 \mathrm{~N})$; normally, there is never any need to change this value in a production environment.
- ndb_log_cache_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-log-cache-size=\# \\
\hline System Variable & ndb_log_cache_size \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 64 M \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Minimum Value & 4096 \\
\hline Maximum Value & 18446744073709551615 \\
\hline
\end{tabular}

Set the size of the transaction cache used for writing the NDB binary log.
- ndb_log_empty_epochs

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-log-empty-epochs[=\{OFF | ON\}] \\
\hline System Variable & ndb_log_empty_epochs \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

When this variable is set to 0 , epoch transactions with no changes are not written to the binary log, although a row is still written even for an empty epoch in ndb_binlog_index.
- ndb_log_empty_update

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-log-empty-update[=\{OFF | ON\}] \\
\hline System Variable & ndb_log_empty_update \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

When this variable is set to $\mathrm{ON}(1)$, update transactions with no changes are written to the binary log, even when log_replica_updates is enabled.
- ndb_log_exclusive_reads

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-log-exclusive-reads[=\{OFF|ON\}] \\
\hline System Variable & ndb_log_exclusive_reads \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & 0 \\
\hline
\end{tabular}

This variable determines whether primary key reads are logged with exclusive locks, which allows for NDB Cluster Replication conflict detection and resolution based on read conflicts. To enable these locks, set the value of ndb_log_exclusive_reads to 1.0 , which disables such locking, is the default.

For more information, see Read conflict detection and resolution.
- ndb_log_orig

\begin{tabular}{|l|l|}
\hline System Variable & ndb_log_orig \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & 0FF \\
\hline
\end{tabular}

Shows whether the originating server ID and epoch are logged in the ndb_binlog_index table. Set using the --ndb-log-orig server option.
- ndb_log_transaction_id

\begin{tabular}{|l|l|}
\hline System Variable & ndb_log_transaction_id \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

This read-only, Boolean system variable shows whether a replica mysqld writes NDB transaction IDs in the binary log (required to use "active-active" NDB Cluster Replication with NDB $\$ E P O C H \_T R A N S()$ conflict detection). To change the setting, use the --ndb-log-transactionid option.
ndb_log_transaction_id is not supported in mainline MySQL Server 8.4.
For more information, see Section 25.7.12, "NDB Cluster Replication Conflict Resolution".
- ndb_log_transaction_compression

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-log-transaction-compression \\
\hline System Variable & ndb_log_transaction_compression \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

Whether a replica mysqld writes compressed transactions in the binary log; present only if mysqld was compiled with support for NDB.

You should note that starting the MySQL server with --binlog-transaction-compression forces this variable to be enabled (ON), and that this overrides any setting for --ndb-log-transaction-compression made on the command line or in a my.cnf file, as shown here:
```
$> mysqld_safe --ndbcluster --ndb-connectstring=127.0.0.1 \
    --binlog-transaction-compression=ON --ndb-log-transaction-compression=OFF &
[1] 27667
$> 2022-07-07T12:29:20.459937Z mysqld_safe Logging to '/usr/local/mysql/data/myhost.err'.
2022-07-07T12:29:20.509873Z mysqld_safe Starting mysqld daemon with databases from /usr/local/mysql/data
$> mysql -e 'SHOW VARIABLES LIKE "%transaction_compression%"'
+------------------------------------------------------
| Variable_name | Value |
```

```
binlog_transaction_compression | ON
binlog_transaction_compression_level_zstd | 3
ndb_log_transaction_compression | ON
ndb_log_transaction_compression_level_zstd | 3
```


To disable binary log transaction compression for NDB tables only, set the ndb_log_transaction_compression system variable to OFF in a mysql or other client session after starting mysqld.

Setting the binlog_transaction_compression variable after startup has no effect on the value of ndb_log_transaction_compression.

For more information on binary log transaction compression, such as which events are or are not compressed and as well as behavior changes to be aware of when this feature is used, see Section 7.4.4.5, "Binary Log Transaction Compression".
- ndb_log_transaction_compression_level_zstd

\begin{tabular}{|l|l|l|}
\hline Command-Line Format & --ndb-log-transaction-compression-level-zstd=\# & \\
\hline System Variable & ndb_log_transaction_compression_level_zstd & \\
\hline Scope & Global & \\
\hline Dynamic & Yes & \\
\hline SET_VAR Hint Applies & No & \\
\hline Type & Integer & \\
\hline Default Value & 3 & \\
\hline Minimum Value & 1 & \\
\hline Maximum Value & 22 & \\
\hline
\end{tabular}

The ZSTD compression level used for writing compressed transactions to the replica's binary log if enabled by ndb_log_transaction_compression. Not supported if mysqld was not compiled with support for the NDB storage engine.

See Section 7.4.4.5, "Binary Log Transaction Compression", for more information.
- ndb_metadata_check

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-metadata-check[=\{OFF|ON\}] \\
\hline System Variable & ndb_metadata_check \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & ON \\
\hline
\end{tabular}

NDB uses a background thread to check for metadata changes each ndb_metadata_check_interval seconds as compared with the MySQL data dictionary. This metadata change detection thread can be disabled by setting ndb_metadata_check to 0FF. The thread is enabled by default.
- ndb_metadata_check_interval

\begin{tabular}{|l|l|}
\hline System Variable & ndb_metadata_check_interval \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 60 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 31536000 \\
\hline Unit & seconds \\
\hline
\end{tabular}

NDB runs a metadata change detection thread in the background to determine when the NDB dictionary has changed with respect to the MySQL data dictionary. By default,the interval between such checks is 60 seconds; this can be adjusted by setting the value of ndb_metadata_check_interval. To enable or disable the thread, use ndb_metadata_check.
- ndb_metadata_sync

\begin{tabular}{|l|l|}
\hline System Variable & ndb_metadata_sync \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & false \\
\hline
\end{tabular}

Setting this variable causes the change monitor thread to override any values set for ndb_metadata_check or ndb_metadata_check_interval, and to enter a period of continuous change detection. When the thread ascertains that there are no more changes to be detected, it stalls until the binary logging thread has finished synchronization of all detected objects. ndb_metadata_sync is then set to false, and the change monitor thread reverts to the behavior determined by the settings for ndb_metadata_check and ndb_metadata_check_interval.

Setting this variable to true causes the list of excluded objects to be cleared; setting it to false clears the list of objects to be retried.
- ndb_optimized_node_selection

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-optimized-node-selection=\# \\
\hline System Variable & ndb_optimized_node_selection \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 3 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 3 \\
\hline
\end{tabular}

There are two forms of optimized node selection, described here:
1. The SQL node uses promixity to determine the transaction coordinator; that is, the "closest" data node to the SQL node is chosen as the transaction coordinator. For this purpose, a data node
having a shared memory connection with the SQL node is considered to be "closest" to the SQL node; the next closest (in order of decreasing proximity) are: TCP connection to localhost, followed by TCP connection from a host other than localhost.
2. The SQL thread uses distribution awareness to select the data node. That is, the data node housing the cluster partition accessed by the first statement of a given transaction is used as the transaction coordinator for the entire transaction. (This is effective only if the first statement of the transaction accesses no more than one cluster partition.)

This option takes one of the integer values $0,1,2$, or 3.3 is the default. These values affect node selection as follows:
- 0 : Node selection is not optimized. Each data node is employed as the transaction coordinator 8 times before the SQL thread proceeds to the next data node.
- 1: Proximity to the SQL node is used to determine the transaction coordinator.
- 2: Distribution awareness is used to select the transaction coordinator. However, if the first statement of the transaction accesses more than one cluster partition, the SQL node reverts to the round-robin behavior seen when this option is set to 0 .
- 3: If distribution awareness can be employed to determine the transaction coordinator, then it is used; otherwise proximity is used to select the transaction coordinator. (This is the default behavior.)

Proximity is determined as follows:
1. Start with the value set for the Group parameter (default 55).
2. For an API node sharing the same host with other API nodes, decrement the value by 1 . Assuming the default value for Group, the effective value for data nodes on same host as the API node is 54, and for remote data nodes 55.
3. Setting ndb_data_node_neighbour further decreases the effective Group value by 50 , causing this node to be regarded as the nearest node. This is needed only when all data nodes are on hosts other than that hosts the API node and it is desirable to dedicate one of them to the API node. In normal cases, the default adjustment described previously is sufficient.

Frequent changes in ndb_data_node_neighbour are not advisable, since this changes the state of the cluster connection and thus may disrupt the selection algorithm for new transactions from each thread until it stablilizes.
- ndb_read_backup

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-read-backup[=\{OFF|ON\}] \\
\hline System Variable & ndb_read_backup \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & ON \\
\hline
\end{tabular}

Enable read from any fragment replica for any NDB table subsequently created; doing so greatly improves the table read performance at a relatively small cost to writes.

If the SQL node and the data node use the same host name or IP address, this fact is detected automatically, so that the preference is to send reads to the same host. If these nodes are on the
same host but use different IP addresses, you can tell the SQL node to use the correct data node by setting the value of ndb_data_node_neighbour on the SQL node to the node ID of the data node.

To enable or disable read from any fragment replica for an individual table, you can set the NDB_TABLE option READ_BACKUP for the table accordingly, in a CREATE TABLE or ALTER TABLE statement; see Section 15.1.20.12, "Setting NDB Comment Options", for more information.
- ndb_recv_thread_activation_threshold

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-recv-thread-activationthreshold=\# \\
\hline System Variable & ndb_recv_thread_activation_threshold \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 8 \\
\hline Minimum Value & 0 (MIN_ACTIVATION_THRESHOLD) \\
\hline Maximum Value & 16 (MAX_ACTIVATION_THRESHOLD) \\
\hline
\end{tabular}

When this number of concurrently active threads is reached, the receive thread takes over polling of the cluster connection.

This variable is global in scope. It can also be set at startup.
- ndb_recv_thread_cpu_mask

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-recv-thread-cpu-mask=mask \\
\hline System Variable & ndb_recv_thread_cpu_mask \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Bitmap \\
\hline Default Value & [empty] \\
\hline
\end{tabular}

CPU mask for locking receiver threads to specific CPUs. This is specified as a hexadecimal bitmask. For example, $0 \times 33$ means that one CPU is used per receiver thread. An empty string is the default; setting ndb_recv_thread_cpu_mask to this value removes any receiver thread locks previously set.

This variable is global in scope. It can also be set at startup.
- ndb_report_thresh_binlog_epoch_slip

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-report-thresh-binlog-epochslip=\# \\
\hline System Variable & ndb_report_thresh_binlog_epoch_slip \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Default Value & 10 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 256 \\
\hline
\end{tabular}

This represents the threshold for the number of epochs completely buffered in the event buffer, but not yet consumed by the binlog injector thread. When this degree of slippage (lag) is exceeded, an event buffer status message is reported, with BUFFERED_EPOCHS_OVER_THRESHOLD supplied as the reason (see Section 25.6.2.3, "Event Buffer Reporting in the Cluster Log"). Slip is increased when an epoch is received from data nodes and buffered completely in the event buffer; it is decreased when an epoch is consumed by the binlog injector thread, it is reduced. Empty epochs are buffered and queued, and so included in this calculation only when this is enabled using the Ndb::setEventBufferQueueEmptyEpoch() method from the NDB API.
- ndb_report_thresh_binlog_mem_usage

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-report-thresh-binlog-memusage=\# \\
\hline System Variable & ndb_report_thresh_binlog_mem_usage \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 10 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 10 \\
\hline
\end{tabular}

This is a threshold on the percentage of free memory remaining before reporting binary log status. For example, a value of 10 (the default) means that if the amount of available memory for receiving binary log data from the data nodes falls below 10\%, a status message is sent to the cluster log.
- ndb_row_checksum

\begin{tabular}{|l|l|}
\hline System Variable & ndb_row_checksum \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 1 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 1 \\
\hline
\end{tabular}

Traditionally, NDB has created tables with row checksums, which checks for hardware issues at the expense of performance. Setting ndb_row_checksum to 0 means that row checksums are not used for new or altered tables, which has a significant impact on performance for all types of queries. This variable is set to 1 by default, to provide backward-compatible behavior.
- ndb_schema_dist_lock_wait_timeout

\begin{tabular}{|l|l|}
\hline Command-Line Format & \begin{tabular}{l} 
- - ndb-schema-dist-lock-wait- \\
timeout=value
\end{tabular} \\
\hline System Variable & ndb_schema_dist_lock_wait_timeout 4059 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 30 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 1200 \\
\hline Unit & seconds \\
\hline
\end{tabular}

Number of seconds to wait during schema distribution for the metadata lock taken on each SQL node in order to change its local data dictionary to reflect the DDL statement change. After this time has elapsed, a warning is returned to the effect that a given SQL node's data dictionary was not updated with the change. This avoids having the binary logging thread wait an excessive length of time while handling schema operations.
- ndb_schema_dist_timeout

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-schema-dist-timeout=value \\
\hline System Variable & ndb_schema_dist_timeout \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 120 \\
\hline Minimum Value & 5 \\
\hline Maximum Value & 1200 \\
\hline Unit & seconds \\
\hline
\end{tabular}

Number of seconds to wait before detecting a timeout during schema distribution. This can indicate that other SQL nodes are experiencing excessive activity, or that they are somehow being prevented from acquiring necessary resources at this time.
- ndb_schema_dist_upgrade_allowed

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-schema-dist-upgradeallowed=value \\
\hline System Variable & ndb_schema_dist_upgrade_allowed \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Default Value & true \\
\hline
\end{tabular}

Allow upgrading of the schema distribution table when connecting to NDB. When true (the default), this change is deferred until all SQL nodes have been upgraded to the same version of the NDB Cluster software.

\section*{Note}

The performance of the schema distribution may be somewhat degraded until the upgrade has been performed.
- ndb_show_foreign_key_mock_tables

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-show-foreign-key-mocktables[=\{OFF|ON\}] \\
\hline System Variable & ndb_show_foreign_key_mock_tables \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & 0FF \\
\hline
\end{tabular}

Show the mock tables used by NDB to support foreign_key_checks=0. When this is enabled, extra warnings are shown when creating and dropping the tables. The real (internal) name of the table can be seen in the output of SHOW CREATE TABLE.
- ndb_slave_conflict_role

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-slave-conflict-role=value \\
\hline Deprecated & Yes \\
\hline System Variable & ndb_slave_conflict_role \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Enumeration \\
\hline Default Value & NONE \\
\hline Valid Values & \begin{tabular}{l}
NONE \\
PRIMARY \\
SECONDARY \\
PASS
\end{tabular} \\
\hline
\end{tabular}

Deprecated synonym for ndb_conflict_role.
- ndb_table_no_logging

\begin{tabular}{|l|l|}
\hline System Variable & ndb_table_no_logging \\
\hline Scope & Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

When this variable is set to ON or 1 , it causes all tables created or altered using ENGINE NDB to be nonlogging; that is, no data changes for this table are written to the redo log or checkpointed to disk, just as if the table had been created or altered using the NOLOGGING option for CREATE TABLE or ALTER TABLE.

For more information about nonlogging NDB tables, see NDB_TABLE Options.
ndb_table_no_logging has no effect on the creation of NDB table schema files; to suppress these, use ndb_table_temporary instead.
- ndb_table_temporary

\begin{tabular}{|l|l|}
\hline System Variable & ndb_table_temporary \\
\hline Scope & Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & 0FF \\
\hline
\end{tabular}

When set to ON or 1, this variable causes NDB tables not to be written to disk: This means that no table schema files are created, and that the tables are not logged.

\section*{Note}

Setting this variable currently has no effect. This is a known issue; see Bug \#34036.
- ndb_use_copying_alter_table

\begin{tabular}{|l|l|}
\hline System Variable & ndb_use_copying_alter_table \\
\hline Scope & Global, Session \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline
\end{tabular}

Forces NDB to use copying of tables in the event of problems with online ALTER TABLE operations. The default value is OFF.
- ndb_use_exact_count

\begin{tabular}{|l|l|}
\hline System Variable & ndb_use_exact_count \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

Forces NDB to use a count of records during SELECT COUNT (*) query planning to speed up this type of query. The default value is 0FF, which allows for faster queries overall.
- ndb_use_transactions

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-use-transactions[=\{OFF | ON\}] \\
\hline System Variable & ndb_use_transactions \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & ON \\
\hline
\end{tabular}

You can disable NDB transaction support by setting this variable's value to OFF. This is generally not recommended, although it may be useful to disable transaction support within a given client session when that session is used to import one or more dump files with large transactions; this allows a multi-row insert to be executed in parts, rather than as a single transaction. In such cases, once the import has been completed, you should either reset the variable value for this session to 0 N , or simply terminate the session.
- ndb_version

\begin{tabular}{|l|l|}
\hline System Variable & ndb_version \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Default Value & \\
\hline
\end{tabular}

NDB engine version, as a composite integer.
- ndb_version_string

\begin{tabular}{|l|l|}
\hline System Variable & ndb_version_string \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Default Value & \\
\hline
\end{tabular}

NDB engine version in ndb $-x, y, z$ format.
- replica_allow_batching

\begin{tabular}{|l|l|}
\hline Command-Line Format & --replica-allow-batching[=\{OFF|ON\}] \\
\hline System Variable & replica_allow_batching \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|} 
Default Value & ON
\end{tabular}

Whether or not batched updates are enabled on NDB Cluster replicas.
Allowing batched updates on the replica greatly improves performance, particularly when replicating TEXT, BLOB, and JSON columns. For this reason, replica_allow_batching is enabled by default.

Setting this variable has an effect only when using replication with the NDB storage engine; in MySQL Server 8.4, it is present but does nothing. For more information, see Section 25.7.6, "Starting NDB Cluster Replication (Single Replication Channel)".
- ndb_replica_batch_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-replica-batch-size=\# \\
\hline System Variable & ndb_replica_batch_size \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 2097152 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 2147483648 \\
\hline Unit & bytes \\
\hline
\end{tabular}

Determines the batch size in bytes used by the replication applier thread. Set this variable rather than the --ndb-batch-size option to apply this setting to the replica, exclusive of any other sessions.

If this variable is unset (default 2 MB ), its effective value is the greater of the value of - - ndb -batch-size and 2 MB .
- ndb_replica_blob_write_batch_bytes

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-replica-blob-write-batchbytes=\# \\
\hline System Variable & ndb_replica_blob_write_batch_bytes \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 2097152 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 2147483648 \\
\hline Unit & bytes \\
\hline
\end{tabular}

Control the batch write size used for blob data by the replication applier thread.
Use this variable rather than the --ndb-blob-write-batch-bytes option to control the blob batch write size on the replica, exclusive of any other sessions. The reason for this is that, when ndb_replica_blob_write_batch_bytesis not set,the effective blob batch size (that is, the maximum number of pending bytes to write for blob columns) is determined
by the greater of the value of --ndb-blob-write-batch-bytes and 2 MB (the default for ndb_replica_blob_write_batch_bytes).

Setting ndb_replica_blob_write_batch_bytes to 0 means that NDB imposes no limit on the size of blob batch writes on the replica.
- server_id_bits

\begin{tabular}{|l|l|}
\hline Command-Line Format & --server-id-bits=\# \\
\hline System Variable & server_id_bits \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 32 \\
\hline Minimum Value & 7 \\
\hline Maximum Value & 32 \\
\hline
\end{tabular}

This variable indicates the number of least significant bits within the 32-bit server_id which actually identify the server. Indicating that the server is actually identified by fewer than 32 bits makes it possible for some of the remaining bits to be used for other purposes, such as storing user data generated by applications using the NDB API's Event API within the AnyValue of an OperationOptions structure (NDB Cluster uses the AnyValue to store the server ID).

When extracting the effective server ID from server_id for purposes such as detection of replication loops, the server ignores the remaining bits. The server_id_bits variable is used to mask out any irrelevant bits of server_id in the I/O and SQL threads when deciding whether an event should be ignored based on the server ID.

This data can be read from the binary log by mysqlbinlog, provided that it is run with its own server_id_bits variable set to 32 (the default).

If the value of server_id greater than or equal to 2 to the power of server_id_bits; otherwise, mysqld refuses to start.

This system variable is supported only by NDB Cluster. It is not supported in the standard MySQL 8.4 Server.
- slave_allow_batching

\begin{tabular}{|l|l|}
\hline Command-Line Format & --slave-allow-batching[=\{OFF|ON\}] \\
\hline Deprecated & Yes \\
\hline System Variable & slave_allow_batching \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & ON \\
\hline
\end{tabular}

Deprecated synonym for replica_allow_batching.
- transaction_allow_batching

\begin{tabular}{|l|l|}
\hline System Variable & transaction_allow_batching \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Scope & Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

When set to 1 or 0 N , this variable enables batching of statements within the same transaction. To use this variable, autocommit must first be disabled by setting it to 0 or 0FF; otherwise, setting transaction_allow_batching has no effect.

It is safe to use this variable with transactions that performs writes only, as having it enabled can lead to reads from the "before" image. You should ensure that any pending transactions are committed (using an explicit COMMIT if desired) before issuing a SELECT.

\section*{Important}
transaction_allow_batching should not be used whenever there is the possibility that the effects of a given statement depend on the outcome of a previous statement within the same transaction.

This variable is currently supported for NDB Cluster only.
The system variables in the following list all relate to the ndbinfo information database.
- ndbinfo_database

\begin{tabular}{|l|l|}
\hline System Variable & ndbinfo_database \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Default Value & ndbinfo \\
\hline
\end{tabular}

Shows the name used for the NDB information database; the default is ndbinfo. This is a read-only variable whose value is determined at compile time.
- ndbinfo_max_bytes

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndbinfo-max-bytes=\# \\
\hline System Variable & ndbinfo_max_bytes \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 65535 \\
\hline
\end{tabular}

Used in testing and debugging only.
- ndbinfo_max_rows

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - ndbinfo-max-rows=\# \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline System Variable & ndbinfo_max_rows \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 10 \\
\hline Minimum Value & 1 \\
\hline Maximum Value & 256 \\
\hline
\end{tabular}

Used in testing and debugging only.
- ndbinfo_offline

\begin{tabular}{|l|l|}
\hline System Variable & ndbinfo_offline \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & 0FF \\
\hline
\end{tabular}

Place the ndbinfo database into offline mode, in which tables and views can be opened even when they do not actually exist, or when they exist but have different definitions in NDB. No rows are returned from such tables (or views).
- ndbinfo_show_hidden

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndbinfo-show-hidden[=\{OFF|ON\}] \\
\hline System Variable & ndbinfo_show_hidden \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline Valid Values & \begin{tabular}{l}
ON \\
OFF
\end{tabular} \\
\hline
\end{tabular}

Whether or not the ndbinfo database's underlying internal tables are shown in the mysql client. The default is OFF.

\section*{Note}

When ndbinfo_show_hidden is enabled, the internal tables are shown in the ndbinfo database only; they are not visible in TABLES or other INFORMATION_SCHEMA tables, regardless of the variable's setting.
- ndbinfo_table_prefix

\begin{tabular}{|l|l|}
\hline System Variable & ndbinfo_table_prefix \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Default Value & $\mathrm{ndb} \$$ \\
\hline
\end{tabular}

The prefix used in naming the ndbinfo database's base tables (normally hidden, unless exposed by setting ndbinfo_show_hidden). This is a read-only variable whose default value is ndb\$; the prefix itself is determined at compile time.
- ndbinfo_version

\begin{tabular}{|l|l|}
\hline System Variable & ndbinfo_version \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Default Value & \\
\hline
\end{tabular}

Shows the version of the ndbinfo engine in use; read-only.

\section*{NDB Cluster Status Variables}

This section provides detailed information about MySQL server status variables that relate to NDB Cluster and the NDB storage engine. For status variables not specific to NDB Cluster, and for general information on using status variables, see Section 7.1.10, "Server Status Variables".
- Handler_discover

The MySQL server can ask the NDBCLUSTER storage engine if it knows about a table with a given name. This is called discovery. Handler_discover indicates the number of times that tables have been discovered using this mechanism.
- Ndb_api_adaptive_send_deferred_count

Number of adaptive send calls that were not actually sent.
For more information, see Section 25.6.14, "NDB API Statistics Counters and Variables".
- Ndb_api_adaptive_send_deferred_count_session

Number of adaptive send calls that were not actually sent.
For more information, see Section 25.6.14, "NDB API Statistics Counters and Variables".
- Ndb_api_adaptive_send_deferred_count_replica

Number of adaptive send calls that were not actually sent by this replica.
For more information, see Section 25.6.14, "NDB API Statistics Counters and Variables".
- Ndb_api_adaptive_send_deferred_count_slave

Deprecated synonym for Ndb_api_adaptive_send_deferred_count_replica.
- Ndb_api_adaptive_send_forced_count

Number of adaptive send calls using forced-send sent by this MySQL Server (SQL node).
For more information, see Section 25.6.14, "NDB API Statistics Counters and Variables".
- Ndb_api_adaptive_send_forced_count_session

Number of adaptive send calls using forced-send sent in this client session.
For more information, see Section 25.6.14, "NDB API Statistics Counters and Variables".
- Ndb_api_adaptive_send_forced_count_replica

Number of adaptive send calls using forced-send sent by this replica.
For more information, see Section 25.6.14, "NDB API Statistics Counters and Variables".
- Ndb_api_adaptive_send_forced_count_slave

Deprecated synonym for Ndb_api_adaptive_send_forced_count_replica.
- Ndb_api_adaptive_send_unforced_count

Number of adaptive send calls without forced-send sent by this MySQL server (SQL node).
For more information, see Section 25.6.14, "NDB API Statistics Counters and Variables".
- Ndb_api_adaptive_send_unforced_count_session

Number of adaptive send calls without forced-send sent in this client session.
For more information, see Section 25.6.14, "NDB API Statistics Counters and Variables".
- Ndb_api_adaptive_send_unforced_count_replica

Number of adaptive send calls without forced-send sent by this replica.
For more information, see Section 25.6.14, "NDB API Statistics Counters and Variables".
- Ndb_api_adaptive_send_unforced_count_slave

Deprecated synonym for Ndb_api_adaptive_send_unforced_count_replica.
- Ndb_api_bytes_sent_count_session

Amount of data (in bytes) sent to the data nodes in this client session.
Although this variable can be read using either SHOW GLOBAL STATUS or SHOW SESSION STATUS, it relates to the current session only, and is not affected by any other clients of this mysqld.

For more information, see Section 25.6.14, "NDB API Statistics Counters and Variables".
- Ndb_api_bytes_sent_count_replica

Amount of data (in bytes) sent to the data nodes by this replica.
Although this variable can be read using either SHOW GLOBAL STATUS or SHOW SESSION STATUS, it is effectively global in scope. If this MySQL server does not act as a replica, or does not use NDB tables, this value is always 0 .

For more information, see Section 25.6.14, "NDB API Statistics Counters and Variables".
- Ndb_api_bytes_sent_count_slave

Deprecated synonym for Ndb_api_bytes_sent_count_replica.
- Ndb_api_bytes_sent_count

Amount of data (in bytes) sent to the data nodes by this MySQL Server (SQL node).
Although this variable can be read using either SHOW GLOBAL STATUS or SHOW SESSION STATUS, it is effectively global in scope.

For more information, see Section 25.6.14, "NDB API Statistics Counters and Variables".
- Ndb_api_bytes_received_count_session

Amount of data (in bytes) received from the data nodes in this client session.
Although this variable can be read using either SHOW GLOBAL STATUS or SHOW SESSION STATUS, it relates to the current session only, and is not affected by any other clients of this mysqld.

For more information, see Section 25.6.14, "NDB API Statistics Counters and Variables".
- Ndb_api_bytes_received_count_replica

Amount of data (in bytes) received from the data nodes by this replica.
Although this variable can be read using either SHOW GLOBAL STATUS or SHOW SESSION STATUS, it is effectively global in scope. If this MySQL server does not act as a replica, or does not use NDB tables, this value is always 0 .

For more information, see Section 25.6.14, "NDB API Statistics Counters and Variables".
- Ndb_api_bytes_received_count_slave

Deprecated synonym for Ndb_api_bytes_received_count_replica.
- Ndb_api_bytes_received_count

Amount of data (in bytes) received from the data nodes by this MySQL Server (SQL node).
Although this variable can be read using either SHOW GLOBAL STATUS or SHOW SESSION STATUS, it is effectively global in scope.

For more information, see Section 25.6.14, "NDB API Statistics Counters and Variables".
- Ndb_api_event_data_count_injector

The number of row change events received by the NDB binlog injector thread.
Although this variable can be read using either SHOW GLOBAL STATUS or SHOW SESSION STATUS, it is effectively global in scope.

For more information, see Section 25.6.14, "NDB API Statistics Counters and Variables".
- Ndb_api_event_data_count

The number of row change events received by this MySQL Server (SQL node).
Although this variable can be read using either SHOW GLOBAL STATUS or SHOW SESSION STATUS, it is effectively global in scope.

For more information, see Section 25.6.14, "NDB API Statistics Counters and Variables".
- Ndb_api_event_nondata_count_injector

The number of events received, other than row change events, by the NDB binary log injector thread.
Although this variable can be read using either SHOW GLOBAL STATUS or SHOW SESSION STATUS, it is effectively global in scope.

For more information, see Section 25.6.14, "NDB API Statistics Counters and Variables".
- Ndb_api_event_nondata_count

The number of events received, other than row change events, by this MySQL Server (SQL node).
Although this variable can be read using either SHOW GLOBAL STATUS or SHOW SESSION STATUS, it is effectively global in scope.

For more information, see Section 25.6.14, "NDB API Statistics Counters and Variables".
- Ndb_api_event_bytes_count_injector

The number of bytes of events received by the NDB binlog injector thread.
Although this variable can be read using either SHOW GLOBAL STATUS or SHOW SESSION STATUS, it is effectively global in scope.

For more information, see Section 25.6.14, "NDB API Statistics Counters and Variables".
- Ndb_api_event_bytes_count

The number of bytes of events received by this MySQL Server (SQL node).
Although this variable can be read using either SHOW GLOBAL STATUS or SHOW SESSION STATUS, it is effectively global in scope.

For more information, see Section 25.6.14, "NDB API Statistics Counters and Variables".
- Ndb_api_pk_op_count_session

The number of operations in this client session based on or using primary keys. This includes operations on blob tables, implicit unlock operations, and auto-increment operations, as well as uservisible primary key operations.

Although this variable can be read using either SHOW GLOBAL STATUS or SHOW SESSION STATUS, it relates to the current session only, and is not affected by any other clients of this mysqld.

For more information, see Section 25.6.14, "NDB API Statistics Counters and Variables".
- Ndb_api_pk_op_count_replica

The number of operations by this replica based on or using primary keys. This includes operations on blob tables, implicit unlock operations, and auto-increment operations, as well as user-visible primary key operations.

Although this variable can be read using either SHOW GLOBAL STATUS or SHOW SESSION STATUS, it is effectively global in scope. If this MySQL server does not act as a replica, or does not use NDB tables, this value is always 0 .

For more information, see Section 25.6.14, "NDB API Statistics Counters and Variables".
- Ndb_api_pk_op_count_slave
- Ndb_api_pk_op_count

The number of operations by this MySQL Server (SQL node) based on or using primary keys. This includes operations on blob tables, implicit unlock operations, and auto-increment operations, as well as user-visible primary key operations.

Although this variable can be read using either SHOW GLOBAL STATUS or SHOW SESSION STATUS, it is effectively global in scope.

For more information, see Section 25.6.14, "NDB API Statistics Counters and Variables".
- Ndb_api_pruned_scan_count_session

The number of scans in this client session that have been pruned to a single partition.
Although this variable can be read using either SHOW GLOBAL STATUS or SHOW SESSION STATUS, it relates to the current session only, and is not affected by any other clients of this mysqld.

For more information, see Section 25.6.14, "NDB API Statistics Counters and Variables".
- Ndb_api_pruned_scan_count_replica

The number of scans by this replica that have been pruned to a single partition.
Although this variable can be read using either SHOW GLOBAL STATUS or SHOW SESSION STATUS, it is effectively global in scope. If this MySQL server does not act as a replica, or does not use NDB tables, this value is always 0 .

For more information, see Section 25.6.14, "NDB API Statistics Counters and Variables".
- Ndb_api_pruned_scan_count_slave

Deprecated synonym for Ndb_api_pruned_scan_count_replica.
- Ndb_api_pruned_scan_count

The number of scans by this MySQL Server (SQL node) that have been pruned to a single partition.
Although this variable can be read using either SHOW GLOBAL STATUS or SHOW SESSION STATUS, it is effectively global in scope.

For more information, see Section 25.6.14, "NDB API Statistics Counters and Variables".
- Ndb_api_range_scan_count_session

The number of range scans that have been started in this client session.
Although this variable can be read using either SHOW GLOBAL STATUS or SHOW SESSION STATUS, it relates to the current session only, and is not affected by any other clients of this mysqld.

For more information, see Section 25.6.14, "NDB API Statistics Counters and Variables".
- Ndb_api_range_scan_count_replica

The number of range scans that have been started by this replica.
Although this variable can be read using either SHOW GLOBAL STATUS or SHOW SESSION STATUS, it is effectively global in scope. If this MySQL server does not act as a replica, or does not use NDB tables, this value is always 0 .

For more information, see Section 25.6.14, "NDB API Statistics Counters and Variables".
- Ndb_api_range_scan_count_slave

Deprecated synonym for Ndb_api_range_scan_count_replica.
- Ndb_api_range_scan_count

The number of range scans that have been started by this MySQL Server (SQL node).
Although this variable can be read using either SHOW GLOBAL STATUS or SHOW SESSION STATUS, it is effectively global in scope.

For more information, see Section 25.6.14, "NDB API Statistics Counters and Variables".
- Ndb_api_read_row_count_session

The total number of rows that have been read in this client session. This includes all rows read by any primary key, unique key, or scan operation made in this client session.

Although this variable can be read using either SHOW GLOBAL STATUS or SHOW SESSION STATUS, it relates to the current session only, and is not affected by any other clients of this mysqld.

For more information, see Section 25.6.14, "NDB API Statistics Counters and Variables".
- Ndb_api_read_row_count_replica

The total number of rows that have been read by this replica. This includes all rows read by any primary key, unique key, or scan operation made by this replica.

Although this variable can be read using either SHOW GLOBAL STATUS or SHOW SESSION STATUS, it is effectively global in scope. If this MySQL server does not act as a replica, or does not use NDB tables, this value is always 0 .

For more information, see Section 25.6.14, "NDB API Statistics Counters and Variables".
- Ndb_api_read_row_count_slave

Deprecated synonym for Ndb_api_read_row_count_replica.
- Ndb_api_read_row_count

The total number of rows that have been read by this MySQL Server (SQL node). This includes all rows read by any primary key, unique key, or scan operation made by this MySQL Server (SQL node).

You should be aware that this value may not be completely accurate with regard to rows read by SELECT COUNT ( * ) queries, due to the fact that, in this case, the MySQL server actually reads pseudo-rows in the form [table fragment ID]:[number of rows in fragment] and sums the rows per fragment for all fragments in the table to derive an estimated count for all rows. Ndb_api_read_row_count uses this estimate and not the actual number of rows in the table.

Although this variable can be read using either SHOW GLOBAL STATUS or SHOW SESSION STATUS, it is effectively global in scope.

For more information, see Section 25.6.14, "NDB API Statistics Counters and Variables".
- Ndb_api_scan_batch_count_session

The number of batches of rows received in this client session. 1 batch is defined as 1 set of scan results from a single fragment.

Although this variable can be read using either SHOW GLOBAL STATUS or SHOW SESSION STATUS, it relates to the current session only, and is not affected by any other clients of this mysqld.

For more information, see Section 25.6.14, "NDB API Statistics Counters and Variables".
- Ndb_api_scan_batch_count_replica

The number of batches of rows received by this replica. 1 batch is defined as 1 set of scan results from a single fragment.

Although this variable can be read using either SHOW GLOBAL STATUS or SHOW SESSION STATUS, it is effectively global in scope. If this MySQL server does not act as a replica, or does not use NDB tables, this value is always 0 .

For more information, see Section 25.6.14, "NDB API Statistics Counters and Variables".
- Ndb_api_scan_batch_count_slave

Deprecated synonym for Ndb_api_scan_batch_count_replica.
- Ndb_api_scan_batch_count

The number of batches of rows received by this MySQL Server (SQL node). 1 batch is defined as 1 set of scan results from a single fragment.

Although this variable can be read using either SHOW GLOBAL STATUS or SHOW SESSION STATUS, it is effectively global in scope.

For more information, see Section 25.6.14, "NDB API Statistics Counters and Variables".
- Ndb_api_table_scan_count_session

The number of table scans that have been started in this client session, including scans of internal tables,.

Although this variable can be read using either SHOW GLOBAL STATUS or SHOW SESSION STATUS, it relates to the current session only, and is not affected by any other clients of this mysqld.

For more information, see Section 25.6.14, "NDB API Statistics Counters and Variables".
- Ndb_api_table_scan_count_replica

The number of table scans that have been started by this replica, including scans of internal tables.
Although this variable can be read using either SHOW GLOBAL STATUS or SHOW SESSION STATUS, it is effectively global in scope. If this MySQL server does not act as a replica, or does not use NDB tables, this value is always 0 .

For more information, see Section 25.6.14, "NDB API Statistics Counters and Variables".
- Ndb_api_table_scan_count_slave

Deprecated synonym for Ndb_api_table_scan_count_replica.
- Ndb_api_table_scan_count

The number of table scans that have been started by this MySQL Server (SQL node), including scans of internal tables,.

Although this variable can be read using either SHOW GLOBAL STATUS or SHOW SESSION STATUS, it is effectively global in scope.

For more information, see Section 25.6.14, "NDB API Statistics Counters and Variables".
- Ndb_api_trans_abort_count_session

The number of transactions aborted in this client session.
Although this variable can be read using either SHOW GLOBAL STATUS or SHOW SESSION STATUS, it relates to the current session only, and is not affected by any other clients of this mysqld.

For more information, see Section 25.6.14, "NDB API Statistics Counters and Variables".
- Ndb_api_trans_abort_count_replica

The number of transactions aborted by this replica.
Although this variable can be read using either SHOW GLOBAL STATUS or SHOW SESSION STATUS, it is effectively global in scope. If this MySQL server does not act as a replica, or does not use NDB tables, this value is always 0.

For more information, see Section 25.6.14, "NDB API Statistics Counters and Variables".
- Ndb_api_trans_abort_count_slave

Deprecated synonym for Ndb_api_trans_abort_count_replica.
- Ndb_api_trans_abort_count

The number of transactions aborted by this MySQL Server (SQL node).
Although this variable can be read using either SHOW GLOBAL STATUS or SHOW SESSION STATUS, it is effectively global in scope.

For more information, see Section 25.6.14, "NDB API Statistics Counters and Variables".
- Ndb_api_trans_close_count_session

The number of transactions closed in this client session. This value may be greater than the sum of Ndb_api_trans_commit_count_session and Ndb_api_trans_abort_count_session, since some transactions may have been rolled back.

Although this variable can be read using either SHOW GLOBAL STATUS or SHOW SESSION STATUS, it relates to the current session only, and is not affected by any other clients of this mysqld.

For more information, see Section 25.6.14, "NDB API Statistics Counters and Variables".
- Ndb_api_trans_close_count_replica

The number of transactions closed by this replica. This value may be greater than the sum of Ndb_api_trans_commit_count_replica and Ndb_api_trans_abort_count_replica, since some transactions may have been rolled back.

Although this variable can be read using either SHOW GLOBAL STATUS or SHOW SESSION STATUS, it is effectively global in scope. If this MySQL server does not act as a replica, or does not use NDB tables, this value is always 0 .

For more information, see Section 25.6.14, "NDB API Statistics Counters and Variables".
- Ndb_api_trans_close_count_slave

Deprecated synonym for Ndb_api_trans_close_count_replica.
- Ndb_api_trans_close_count

The number of transactions closed by this MySQL Server (SQL node). This value may be greater than the sum of Ndb_api_trans_commit_count and Ndb_api_trans_abort_count, since some transactions may have been rolled back.

Although this variable can be read using either SHOW GLOBAL STATUS or SHOW SESSION STATUS, it is effectively global in scope.

For more information, see Section 25.6.14, "NDB API Statistics Counters and Variables".
- Ndb_api_trans_commit_count_session

The number of transactions committed in this client session.
Although this variable can be read using either SHOW GLOBAL STATUS or SHOW SESSION STATUS, it relates to the current session only, and is not affected by any other clients of this mysqld.

For more information, see Section 25.6.14, "NDB API Statistics Counters and Variables".
- Ndb_api_trans_commit_count_replica

The number of transactions committed by this replica.
Although this variable can be read using either SHOW GLOBAL STATUS or SHOW SESSION STATUS, it is effectively global in scope. If this MySQL server does not act as a replica, or does not use NDB tables, this value is always 0.

For more information, see Section 25.6.14, "NDB API Statistics Counters and Variables".
- Ndb_api_trans_commit_count_slave

Deprecated synonym for Ndb_api_trans_commit_count_replica.
- Ndb_api_trans_commit_count

The number of transactions committed by this MySQL Server (SQL node).
Although this variable can be read using either SHOW GLOBAL STATUS or SHOW SESSION STATUS, it is effectively global in scope.

For more information, see Section 25.6.14, "NDB API Statistics Counters and Variables".
- Ndb_api_trans_local_read_row_count_session

The total number of rows that have been read in this client session. This includes all rows read by any primary key, unique key, or scan operation made in this client session.

Although this variable can be read using either SHOW GLOBAL STATUS or SHOW SESSION STATUS, it relates to the current session only, and is not affected by any other clients of this mysqld.

For more information, see Section 25.6.14, "NDB API Statistics Counters and Variables".
- Ndb_api_trans_local_read_row_count_replica

The total number of rows that have been read by this replica. This includes all rows read by any primary key, unique key, or scan operation made by this replica.

Although this variable can be read using either SHOW GLOBAL STATUS or SHOW SESSION STATUS, it is effectively global in scope. If this MySQL server does not act as a replica, or does not use NDB tables, this value is always 0 .

For more information, see Section 25.6.14, "NDB API Statistics Counters and Variables".
- Ndb_api_trans_local_read_row_count_slave

Deprecated synonym for Ndb_api_trans_local_read_row_count_replica.
- Ndb_api_trans_local_read_row_count

The total number of rows that have been read by this MySQL Server (SQL node). This includes all rows read by any primary key, unique key, or scan operation made by this MySQL Server (SQL node).

Although this variable can be read using either SHOW GLOBAL STATUS or SHOW SESSION STATUS, it is effectively global in scope.

For more information, see Section 25.6.14, "NDB API Statistics Counters and Variables".
- Ndb_api_trans_start_count_session

The number of transactions started in this client session.
Although this variable can be read using either SHOW GLOBAL STATUS or SHOW SESSION STATUS, it relates to the current session only, and is not affected by any other clients of this mysqld.

For more information, see Section 25.6.14, "NDB API Statistics Counters and Variables".
- Ndb_api_trans_start_count_replica

The number of transactions started by this replica.
Although this variable can be read using either SHOW GLOBAL STATUS or SHOW SESSION STATUS, it is effectively global in scope. If this MySQL server does not act as a replica, or does not use NDB tables, this value is always 0 .

For more information, see Section 25.6.14, "NDB API Statistics Counters and Variables".
- Ndb_api_trans_start_count_slave

Deprecated synonym for Ndb_api_trans_start_count_replica.
- Ndb_api_trans_start_count

The number of transactions started by this MySQL Server (SQL node).
Although this variable can be read using either SHOW GLOBAL STATUS or SHOW SESSION STATUS, it is effectively global in scope.

For more information, see Section 25.6.14, "NDB API Statistics Counters and Variables".
- Ndb_api_uk_op_count_session

The number of operations in this client session based on or using unique keys.
Although this variable can be read using either SHOW GLOBAL STATUS or SHOW SESSION STATUS, it relates to the current session only, and is not affected by any other clients of this mysqld.

For more information, see Section 25.6.14, "NDB API Statistics Counters and Variables".
- Ndb_api_uk_op_count_replica

The number of operations by this replica based on or using unique keys.
Although this variable can be read using either SHOW GLOBAL STATUS or SHOW SESSION STATUS, it is effectively global in scope. If this MySQL server does not act as a replica, or does not use NDB tables, this value is always 0.

For more information, see Section 25.6.14, "NDB API Statistics Counters and Variables".
- Ndb_api_uk_op_count_slave

Deprecated synonym for Ndb_api_uk_op_count_replica.
- Ndb_api_uk_op_count

The number of operations by this MySQL Server (SQL node) based on or using unique keys.
Although this variable can be read using either SHOW GLOBAL STATUS or SHOW SESSION STATUS, it is effectively global in scope.

For more information, see Section 25.6.14, "NDB API Statistics Counters and Variables".
- Ndb_api_wait_exec_complete_count_session

The number of times a thread has been blocked in this client session while waiting for execution of an operation to complete. This includes all execute() calls as well as implicit executes for blob and auto-increment operations not visible to clients.

Although this variable can be read using either SHOW GLOBAL STATUS or SHOW SESSION STATUS, it relates to the current session only, and is not affected by any other clients of this mysqld.

For more information, see Section 25.6.14, "NDB API Statistics Counters and Variables".
- Ndb_api_wait_exec_complete_count_replica

The number of times a thread has been blocked by this replica while waiting for execution of an operation to complete. This includes all execute() calls as well as implicit executes for blob and auto-increment operations not visible to clients.

Although this variable can be read using either SHOW GLOBAL STATUS or SHOW SESSION STATUS, it is effectively global in scope. If this MySQL server does not act as a replica, or does not use NDB tables, this value is always 0 .

For more information, see Section 25.6.14, "NDB API Statistics Counters and Variables".
- Ndb_api_wait_exec_complete_count_slave

Deprecated synonym for Ndb_api_wait_exec_complete_count_replica.
- Ndb_api_wait_exec_complete_count

The number of times a thread has been blocked by this MySQL Server (SQL node) while waiting for execution of an operation to complete. This includes all execute() calls as well as implicit executes for blob and auto-increment operations not visible to clients.

Although this variable can be read using either SHOW GLOBAL STATUS or SHOW SESSION STATUS, it is effectively global in scope.

For more information, see Section 25.6.14, "NDB API Statistics Counters and Variables".
- Ndb_api_wait_meta_request_count_session

The number of times a thread has been blocked in this client session waiting for a metadata-based signal, such as is expected for DDL requests, new epochs, and seizure of transaction records.

Although this variable can be read using either SHOW GLOBAL STATUS or SHOW SESSION STATUS, it relates to the current session only, and is not affected by any other clients of this mysqld.

For more information, see Section 25.6.14, "NDB API Statistics Counters and Variables".
- Ndb_api_wait_meta_request_count_replica

The number of times a thread has been blocked by this replica waiting for a metadata-based signal, such as is expected for DDL requests, new epochs, and seizure of transaction records.

Although this variable can be read using either SHOW GLOBAL STATUS or SHOW SESSION STATUS, it is effectively global in scope. If this MySQL server does not act as a replica, or does not use NDB tables, this value is always 0.

For more information, see Section 25.6.14, "NDB API Statistics Counters and Variables".
- Ndb_api_wait_meta_request_count_slave

Deprecated synonym for Ndb_api_wait_meta_request_count_replica.
- Ndb_api_wait_meta_request_count

The number of times a thread has been blocked by this MySQL Server (SQL node) waiting for a metadata-based signal, such as is expected for DDL requests, new epochs, and seizure of transaction records.

Although this variable can be read using either SHOW GLOBAL STATUS or SHOW SESSION STATUS, it is effectively global in scope.

For more information, see Section 25.6.14, "NDB API Statistics Counters and Variables".
- Ndb_api_wait_nanos_count_session

Total time (in nanoseconds) spent in this client session waiting for any type of signal from the data nodes.

Although this variable can be read using either SHOW GLOBAL STATUS or SHOW SESSION STATUS, it relates to the current session only, and is not affected by any other clients of this mysqld.

For more information, see Section 25.6.14, "NDB API Statistics Counters and Variables".
- Ndb_api_wait_nanos_count_replica

Total time (in nanoseconds) spent by this replica waiting for any type of signal from the data nodes.
Although this variable can be read using either SHOW GLOBAL STATUS or SHOW SESSION STATUS, it is effectively global in scope. If this MySQL server does not act as a replica, or does not use NDB tables, this value is always 0.

For more information, see Section 25.6.14, "NDB API Statistics Counters and Variables".
- Ndb_api_wait_nanos_count_slave

Deprecated synonym for Ndb_api_wait_nanos_count_replica.
- Ndb_api_wait_nanos_count

Total time (in nanoseconds) spent by this MySQL Server (SQL node) waiting for any type of signal from the data nodes.

Although this variable can be read using either SHOW GLOBAL STATUS or SHOW SESSION STATUS, it is effectively global in scope.

For more information, see Section 25.6.14, "NDB API Statistics Counters and Variables".
- Ndb_api_wait_scan_result_count_session

The number of times a thread has been blocked in this client session while waiting for a scan-based signal, such as when waiting for more results from a scan, or when waiting for a scan to close.

Although this variable can be read using either SHOW GLOBAL STATUS or SHOW SESSION STATUS, it relates to the current session only, and is not affected by any other clients of this mysqld.

For more information, see Section 25.6.14, "NDB API Statistics Counters and Variables".
- Ndb_api_wait_scan_result_count_replica

The number of times a thread has been blocked by this replica while waiting for a scan-based signal, such as when waiting for more results from a scan, or when waiting for a scan to close.

Although this variable can be read using either SHOW GLOBAL STATUS or SHOW SESSION STATUS, it is effectively global in scope. If this MySQL server does not act as a replica, or does not use NDB tables, this value is always 0 .

For more information, see Section 25.6.14, "NDB API Statistics Counters and Variables".
- Ndb_api_wait_scan_result_count_slave

Deprecated synonym for Ndb_api_wait_scan_result_count_replica.
- Ndb_api_wait_scan_result_count

The number of times a thread has been blocked by this MySQL Server (SQL node) while waiting for a scan-based signal, such as when waiting for more results from a scan, or when waiting for a scan to close.

Although this variable can be read using either SHOW GLOBAL STATUS or SHOW SESSION STATUS, it is effectively global in scope.

For more information, see Section 25.6.14, "NDB API Statistics Counters and Variables".
- Ndb_cluster_node_id

If the server is acting as an NDB Cluster node, then the value of this variable its node ID in the cluster.

If the server is not part of an NDB Cluster, then the value of this variable is 0 .
- Ndb_config_from_host

If the server is part of an NDB Cluster, the value of this variable is the host name or IP address of the Cluster management server from which it gets its configuration data.

If the server is not part of an NDB Cluster, then the value of this variable is an empty string.
- Ndb_config_from_port

If the server is part of an NDB Cluster, the value of this variable is the number of the port through which it is connected to the Cluster management server from which it gets its configuration data.

If the server is not part of an NDB Cluster, then the value of this variable is 0 .
- Ndb_config_generation

Shows the generation number of the cluster's current configuration. This can be used as an indicator to determine whether the configuration of the cluster has changed since this SQL node last
- Ndb_conflict_fn_epoch

Used in NDB Cluster Replication conflict resolution, this variable shows the number of rows found to be in conflict using NDB\$EPOCH ( ) conflict resolution on a given mysqld since the last time it was restarted.

For more information, see Section 25.7.12, "NDB Cluster Replication Conflict Resolution".
- Ndb_conflict_fn_epoch_trans

Used in NDB Cluster Replication conflict resolution, this variable shows the number of rows found to be in conflict using NDB\$EPOCH_TRANS ( ) conflict resolution on a given mysqld since the last time it was restarted.

For more information, see Section 25.7.12, "NDB Cluster Replication Conflict Resolution".
- Ndb_conflict_fn_epoch2

Shows the number of rows found to be in conflict in NDB Cluster Replication conflict resolution, when using NDB\$EPOCH2( ), on the source designated as the primary since the last time it was restarted.

For more information, see NDB\$EPOCH2().
- Ndb_conflict_fn_epoch2_trans

Used in NDB Cluster Replication conflict resolution, this variable shows the number of rows found to be in conflict using NDB\$EPOCH_TRANS2 ( ) conflict resolution on a given mysqld since the last time it was restarted.

For more information, see NDB\$EPOCH2_TRANS().
- Ndb_conflict_fn_max

Used in NDB Cluster Replication conflict resolution, this variable shows the number of times that a row was not applied on the current SQL node due to "greatest timestamp wins" conflict resolution since the last time that this mysqld was started.

For more information, see Section 25.7.12, "NDB Cluster Replication Conflict Resolution".
- Ndb_conflict_fn_max_del_win

Shows the number of times that a row was rejected on the current SQL node due to NDB Cluster Replication conflict resolution using NDB\$MAX_DELETE_WIN ( ), since the last time that this mysqld was started.

For more information, see Section 25.7.12, "NDB Cluster Replication Conflict Resolution".
- Ndb_conflict_fn_max_del_win_ins

Shows the number of times that insertion of a row was rejected on the current SQL node due to NDB Cluster Replication conflict resolution using NDB\$MAX_DEL_WIN_INS( ), since the last time that this mysqld was started.

For more information, see Section 25.7.12, "NDB Cluster Replication Conflict Resolution".
- Ndb_conflict_fn_max_ins

Used in NDB Cluster Replication conflict resolution, this variable shows the number of times that a row was not inserted on the current SQL node due to "greatest timestamp wins" conflict resolution since the last time that this mysqld was started.

For more information, see Section 25.7.12, "NDB Cluster Replication Conflict Resolution".
- Ndb_conflict_fn_old

Used in NDB Cluster Replication conflict resolution, this variable shows the number of times that a row was not applied as the result of "same timestamp wins" conflict resolution on a given mysqld since the last time it was restarted.

For more information, see Section 25.7.12, "NDB Cluster Replication Conflict Resolution".
- Ndb_conflict_last_conflict_epoch

The most recent epoch in which a conflict was detected on this replica. You can compare this value with Ndb_replica_max_replicated_epoch; if Ndb_replica_max_replicated_epoch is greater than Ndb_conflict_last_conflict_epoch, no conflicts have yet been detected.

See Section 25.7.12, "NDB Cluster Replication Conflict Resolution", for more information.
- Ndb_conflict_reflected_op_discard_count

When using NDB Cluster Replication conflict resolution, this is the number of reflected operations that were not applied on the secondary, due to encountering an error during execution.

See Section 25.7.12, "NDB Cluster Replication Conflict Resolution", for more information.
- Ndb_conflict_reflected_op_prepare_count

When using conflict resolution with NDB Cluster Replication, this status variable contains the number of reflected operations that have been defined (that is, prepared for execution on the secondary).

See Section 25.7.12, "NDB Cluster Replication Conflict Resolution".
- Ndb_conflict_refresh_op_count

When using conflict resolution with NDB Cluster Replication, this gives the number of refresh operations that have been prepared for execution on the secondary.

See Section 25.7.12, "NDB Cluster Replication Conflict Resolution", for more information.
- Ndb_conflict_last_stable_epoch

Number of rows found to be in conflict by a transactional conflict function
See Section 25.7.12, "NDB Cluster Replication Conflict Resolution", for more information.
- Ndb_conflict_trans_row_conflict_count

Used in NDB Cluster Replication conflict resolution, this status variable shows the number of rows found to be directly in-conflict by a transactional conflict function on a given mysqld since the last time it was restarted.

Currently, the only transactional conflict detection function supported by NDB Cluster is NDB\$EPOCH_TRANS(), so this status variable is effectively the same as Ndb_conflict_fn_epoch_trans.

For more information, see Section 25.7.12, "NDB Cluster Replication Conflict Resolution".
- Ndb_conflict_trans_row_reject_count

Used in NDB Cluster Replication conflict resolution, this status variable shows the total number of rows realigned due to being determined as conflicting by a transactional conflict detection function. This includes not only Ndb_conflict_trans_row_conflict_count, but any rows in or dependent on conflicting transactions.

For more information, see Section 25.7.12, "NDB Cluster Replication Conflict Resolution".
- Ndb_conflict_trans_reject_count

Used in NDB Cluster Replication conflict resolution, this status variable shows the number of transactions found to be in conflict by a transactional conflict detection function.

For more information, see Section 25.7.12, "NDB Cluster Replication Conflict Resolution".
- Ndb_conflict_trans_detect_iter_count

Used in NDB Cluster Replication conflict resolution, this shows the number of internal iterations required to commit an epoch transaction. Should be (slightly) greater than or equal to Ndb_conflict_trans_conflict_commit_count.

For more information, see Section 25.7.12, "NDB Cluster Replication Conflict Resolution".
- Ndb_conflict_trans_conflict_commit_count

Used in NDB Cluster Replication conflict resolution, this shows the number of epoch transactions committed after they required transactional conflict handling.

For more information, see Section 25.7.12, "NDB Cluster Replication Conflict Resolution".
- Ndb_epoch_delete_delete_count

When using delete-delete conflict detection, this is the number of delete-delete conflicts detected, where a delete operation is applied, but the indicated row does not exist.
- Ndb_execute_count

Provides the number of round trips to the NDB kernel made by operations.
- Ndb_fetch_table_stats

This count is incremented whenever a MySQL Server acting as an NDB CLuster API node fetches table statistics for a given table, rather than using cached statistics.
- Ndb_last_commit_epoch_server

The epoch most recently committed by NDB.
- Ndb_last_commit_epoch_session

The epoch most recently committed by this NDB client.
- Ndb_metadata_detected_count

The number of times since this server was last started that the NDB metadata change detection thread has discovered changes with respect to the MySQL data dictionary.
- Ndb_metadata_excluded_count

The number of metadata objects that the NDB binlog thread has been unable to synchronize on this SQL node since it was last restarted.

Should an object be excluded, it is not again considered for automatic synchronization until the user corrects the mismatch manually. This can be done by attempting to use the table with a statement such as SHOW CREATE TABLE table, SELECT * FROM table, or any other statement that would trigger table discovery.
- Ndb_metadata_synced_count

The number of NDB metadata objects which have been synchronized on this SQL node since it was last restarted.
- Ndb_number_of_data_nodes

If the server is part of an NDB Cluster, the value of this variable is the number of data nodes in the cluster.

If the server is not part of an NDB Cluster, then the value of this variable is 0 .
- Ndb_pushed_queries_defined

The total number of joins pushed down to the NDB kernel for distributed handling on the data nodes.

\section*{Note}

Joins tested using EXPLAIN that can be pushed down contribute to this number.
- Ndb_pushed_queries_dropped

The number of joins that were pushed down to the NDB kernel but that could not be handled there.
- Ndb_pushed_queries_executed

The number of joins successfully pushed down to NDB and executed there.
- Ndb_pushed_reads

The number of rows returned to mysqld from the NDB kernel by joins that were pushed down.

\section*{Note}

Executing EXPLAIN on joins that can be pushed down to NDB does not add to this number.
- Ndb_pruned_scan_count

This variable holds a count of the number of scans executed by NDBCLUSTER since the NDB Cluster was last started where NDBCLUSTER was able to use partition pruning.

Using this variable together with Ndb_scan_count can be helpful in schema design to maximize the ability of the server to prune scans to a single table partition, thereby involving replica only a single data node.
- Ndb_replica_max_replicated_epoch

The most recently committed epoch on this replica. You can compare this value with Ndb_conflict_last_conflict_epoch; if Ndb_replica_max_replicated_epoch is the greater of the two, no conflicts have yet been detected.

For more information, see Section 25.7.12, "NDB Cluster Replication Conflict Resolution".
- Ndb_scan_count

This variable holds a count of the total number of scans executed by NDBCLUSTER since the NDB Cluster was last started.
- Ndb_schema_participant_count

Indicates the number of MySQL servers that are participating in NDB schema change distribution.
Added in NDB 8.4.5.
- Ndb_slave_max_replicated_epoch

Deprecated synonym for Ndb_replica_max_replicated_epoch.
- Ndb_system_name

If this MySQL Server is connected to an NDB cluster, this read-only variable shows the cluster system name. Otherwise, the value is an empty string.
- Ndb_trans_hint_count_session

The number of transactions using hints that have been started in the current session. Compare with Ndb_api_trans_start_count_session to obtain the proportion of all NDB transactions able to use hints.

\subsection*{25.4.3.10 NDB Cluster TCP/IP Connections}

TCP/IP is the default transport mechanism for all connections between nodes in an NDB Cluster. Normally it is not necessary to define TCP/IP connections; NDB Cluster automatically sets up such connections for all data nodes, management nodes, and SQL or API nodes.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4115.jpg?height=168&width=263&top_left_y=886&top_left_x=370)

\section*{Note}

For an exception to this rule, see Section 25.4.3.11, "NDB Cluster TCP/IP Connections Using Direct Connections".

To override the default connection parameters, it is necessary to define a connection using one or more [tcp] sections in the config.ini file. Each [tcp] section explicitly defines a TCP/IP connection between two NDB Cluster nodes, and must contain at a minimum the parameters NodeId1 and NodeId2, as well as any connection parameters to override.

It is also possible to change the default values for these parameters by setting them in the [tcp default] section.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4115.jpg?height=106&width=104&top_left_y=1398&top_left_x=365)

\section*{Important}

Any [tcp] sections in the config.ini file should be listed last, following all other sections in the file. However, this is not required for a [tcp default] section. This requirement is a known issue with the way in which the config. ini file is read by the NDB Cluster management server.

Connection parameters which can be set in [tcp] and [tcp default] sections of the config.ini file are listed here:
- AllowUnresolvedHostNames

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

By default, when a management node fails to resolve a host name while trying to connect, this results in a fatal error. This behavior can be overridden by setting AllowUnresolvedHostNames to true in the [tcp default] section of the global configuration file (usually named config.ini), in which case failure to resolve a host name is treated as a warning and ndb_mgmd startup continues uninterrupted.
- Checksum

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

This parameter is disabled by default. When it is enabled (set to Y or 1), checksums for all messages are calculated before they placed in the send buffer. This feature ensures that messages are not corrupted while waiting in the send buffer, or by the transport mechanism.
- Group

When ndb_optimized_node_selection is enabled, node proximity is used in some cases to select which node to connect to. This parameter can be used to influence proximity by setting it to a lower value, which is interpreted as "closer". See the description of the system variable for more information.
- HostName1

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

The HostName1 and HostName2 parameters can be used to specify specific network interfaces to be used for a given TCP connection between two nodes. The values used for these parameters can be host names or IP addresses.
- HostName2

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

The HostName1 and HostName2 parameters can be used to specify specific network interfaces to be used for a given TCP connection between two nodes. The values used for these parameters can be host names or IP addresses.
- NodeId1

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & numeric \\
\hline Default & [none] \\
\hline Range & $1-255$ \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

To identify a connection between two nodes it is necessary to provide their node IDs in the [tcp] section of the configuration file as the values of NodeId1 and NodeId2. These are the same unique Id values for each of these nodes as described in Section 25.4.3.7, "Defining SQL and Other API Nodes in an NDB Cluster".
- NodeId2

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & numeric \\
\hline Default & [none] \\
\hline Range & $1-255$ \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

To identify a connection between two nodes it is necessary to provide their node IDs in the [tcp] section of the configuration file as the values of NodeId1 and NodeId2. These are the same unique Id values for each of these nodes as described in Section 25.4.3.7, "Defining SQL and Other API Nodes in an NDB Cluster".
- NodeIdServer

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & numeric \\
\hline Default & [none] \\
\hline Range & $1-63$ \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart
\end{tabular} \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
& \begin{tabular}{l} 
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

Set the server side of a TCP connection.
- OverloadLimit

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & bytes \\
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

When more than this many unsent bytes are in the send buffer, the connection is considered overloaded.

This parameter can be used to determine the amount of unsent data that must be present in the send buffer before the connection is considered overloaded. See Section 25.4.3.14, "Configuring NDB Cluster Send Buffer Parameters", for more information.
- PreferIPVersion

\begin{tabular}{|l|l|}
\hline Version (or later) & NDB 8.4.0 \\
\hline Type or units & enumeration \\
\hline Default & 4 \\
\hline Range & 4, 6 \\
\hline Restart Type & \begin{tabular}{l}
Initial System Restart: \\
Requires a complete shutdown of the cluster, wiping and restoring the cluster file system from a backup, and then restarting the cluster. (NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

Determines the preference of DNS resolution for IP version 4 or version 6. Because the configuration retrieval mechanism employed by NDB Cluster requires that all connections use the same preference, this parameter should be set in the [tcp default] of the config.ini global configuration file.
- PreSendChecksum

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Type or units & boolean \\
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

If this parameter and Checksum are both enabled, perform pre-send checksum checks, and check all TCP signals between nodes for errors. Has no effect if Checksum is not also enabled.
- Proxy

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

Set a proxy for the TCP connection.
- ReceiveBufferMemory

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & bytes \\
\hline Default & 2 M \\
\hline Range & \begin{tabular}{l}
16 K - \\
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

Specifies the size of the buffer used when receiving data from the TCP/IP socket.
The default value of this parameter is 2 MB . The minimum possible value is 16 KB ; the theoretical maximum is 4 GB .
- RequireLinkTls

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & boolean \\
\hline Default & false \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Range & $\ldots$ \\
\hline Restart Type & Node Restart: \\
& Requires a \\
& rolling restart \\
& of the cluster. \\
& (NDB 8.4.0) \\
\hline
\end{tabular}

If the node at either endpoint of this TCP connection requires TLS authentication, the value of this parameter is true, otherwise false. The value is set by NDB, and cannot be changed by the user.
- SendBufferMemory

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & unsigned \\
\hline Default & 2 M \\
\hline Range & \begin{tabular}{l}
256 K - \\
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

TCP transporters use a buffer to store all messages before performing the send call to the operating system. When this buffer reaches 64 KB its contents are sent; these are also sent when a round of messages have been executed. To handle temporary overload situations it is also possible to define a bigger send buffer.

If this parameter is set explicitly, then the memory is not dedicated to each transporter; instead, the value used denotes the hard limit for how much memory (out of the total available memory -that is, TotalSendBufferMemory) that may be used by a single transporter. For more information about configuring dynamic transporter send buffer memory allocation in NDB Cluster, see Section 25.4.3.14, "Configuring NDB Cluster Send Buffer Parameters".

The default size of the send buffer is 2 MB , which is the size recommended in most situations. The minimum size is 64 KB ; the theoretical maximum is 4 GB .
- SendSignalId

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & boolean \\
\hline Default & \begin{tabular}{l} 
false (debug \\
builds: true)
\end{tabular} \\
\hline Range & true, false \\
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

To be able to retrace a distributed message datagram, it is necessary to identify each message. When this parameter is set to Y , message IDs are transported over the network. This feature is disabled by default in production builds, and enabled in-debug builds.
- TcpBind_INADDR_ANY

Setting this parameter to TRUE or 1 binds IP_ADDR_ANY so that connections can be made from anywhere (for autogenerated connections). The default is FALSE (0).
- TcpSpinTime

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & $\mu \mathrm{sec}$ \\
\hline Default & 0 \\
\hline Range & $0-2000$ \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

Controls spin for a TCP transporter; no enable, set to a nonzero value. This works for both the data node and management or SQL node side of the connection.
- TCP_MAXSEG_SIZE

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & unsigned \\
\hline Default & 0 \\
\hline Range & $0-2 \mathrm{G}$ \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

Determines the size of the memory set during TCP transporter initialization. The default is recommended for most common usage cases.
- TCP_RCV_BUF_SIZE

\begin{tabular}{|l|l|l|}
\cline { 2 - 3 } & \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\cline { 2 - 3 } & Type or units & unsigned \\
\cline { 2 - 3 } & Default & 0 \\
\cline { 2 - 3 } & Range & $0-2 \mathrm{G}$ \\
\cline { 2 - 3 } & Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a
\end{tabular} \\
\hline & & rolling restart
\end{tabular}
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4122.jpg?height=108&width=565&top_left_y=242&top_left_x=315)

Determines the size of the receive buffer set during TCP transporter initialization. The default and minimum value is 0 , which allows the operating system or platform to set this value. The default is recommended for most common usage cases.
- TCP_SND_BUF_SIZE

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & unsigned \\
\hline Default & 0 \\
\hline Range & $0-2 \mathrm{G}$ \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

Determines the size of the send buffer set during TCP transporter initialization. The default and minimum value is 0 , which allows the operating system or platform to set this value. The default is recommended for most common usage cases.

Restart types. Information about the restart types used by the parameter descriptions in this section is shown in the following table:

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 25.20 NDB Cluster restart types}
\begin{tabular}{|l|l|l|}
\hline Symbol & Restart Type & Description \\
\hline N & Node & The parameter can be updated using a rolling restart (see Section 25.6.5, "Performing a Rolling Restart of an NDB Cluster") \\
\hline S & System & All cluster nodes must be shut down completely, then restarted, to effect a change in this parameter \\
\hline I & Initial & Data nodes must be restarted using the --initial option \\
\hline
\end{tabular}
\end{table}

\subsection*{25.4.3.11 NDB Cluster TCP/IP Connections Using Direct Connections}

Setting up a cluster using direct connections between data nodes requires specifying explicitly the crossover IP addresses of the data nodes so connected in the [tcp] section of the cluster config.ini file.

In the following example, we envision a cluster with at least four hosts, one each for a management server, an SQL node, and two data nodes. The cluster as a whole resides on the 172.23.72.* subnet of a LAN. In addition to the usual network connections, the two data nodes are connected directly using a standard crossover cable, and communicate with one another directly using IP addresses in the 1.1.0.* address range as shown:
```
# Management Server
[ndb_mgmd]
Id=1
HostName=172.23.72.20
```

```
# SQL Node
[mysqld]
Id=2
HostName=172.23.72.21
# Data Nodes
[ndbd]
Id=3
HostName=172.23.72.22
[ndbd]
Id=4
HostName=172.23.72.23
# TCP/IP Connections
[tcp]
NodeId1=3
NodeId2=4
HostName1=1.1.0.1
HostName2=1.1.0.2
```


The HostName1 and HostName2 parameters are used only when specifying direct connections.
The use of direct TCP connections between data nodes can improve the cluster's overall efficiency by enabling the data nodes to bypass an Ethernet device such as a switch, hub, or router, thus cutting down on the cluster's latency.

\section*{Note}

To take the best advantage of direct connections in this fashion with more than two data nodes, you must have a direct connection between each data node and every other data node in the same node group.

\subsection*{25.4.3.12 NDB Cluster Shared-Memory Connections}

Communications between NDB cluster nodes are normally handled using TCP/IP. The shared memory (SHM) transporter is distinguished by the fact that signals are transmitted by writing in memory rather than on a socket. The shared-memory transporter (SHM) can improve performance by negating up to 20\% of the overhead required by a TCP connection when running an API node (usually an SQL node) and a data node together on the same host. You can enable a shared memory connection in either of the two ways listed here:
- By setting the UseShm data node configuration parameter to 1 , and setting HostName for the data node and HostName for the API node to the same value.
- By using [shm] sections in the cluster configuration file, each containing settings for NodeId1 and NodeId2. This method is described in more detail later in this section.

Suppose a cluster is running a data node which has node ID 1 and an SQL node having node ID 51 on the same host computer at 10.0.0.1. To enable an SHM connection between these two nodes, all that is necessary is to insure that the following entries are included in the cluster configuration file:
```
[ndbd]
NodeId=1
HostName=10.0.0.1
UseShm=1
[mysqld]
NodeId=51
HostName=10.0.0.1
```

![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4123.jpg?height=118&width=109&top_left_y=2462&top_left_x=360)

\section*{Important}

The two entries just shown are in addition to any other entries and parameter settings needed by the cluster. A more complete example is shown later in this section.

Before starting data nodes that use SHM connections, it is also necessary to make sure that the operating system on each computer hosting such a data node has sufficient memory allocated to shared memory segments. See the documentation for your operating platform for information regarding this. In setups where multiple hosts are each running a data node and an API node, it is possible to enable shared memory on all such hosts by setting UseShm in the [ndbd default] section of the configuration file. This is shown in the example later in this section.

While not strictly required, tuning for all SHM connections in the cluster can be done by setting one or more of the following parameters in the [shm default] section of the cluster configuration (config.ini) file:
- ShmSize: Shared memory size
- ShmSpinTime: Time in $\mu \mathrm{s}$ to spin before sleeping
- SendBufferMemory: Size of buffer for signals sent from this node, in bytes.
- SendSignalId: Indicates that a signal ID is included in each signal sent through the transporter.
- Checksum: Indicates that a checksum is included in each signal sent through the transporter.
- PreSendChecksum: Checks of the checksum are made prior to sending the signal; Checksum must also be enabled for this to work

This example shows a simple setup with SHM connections defined on multiple hosts, in an NDB Cluster using 3 computers listed here by host name, hosting the node types shown:
1. 10.0.0.0: The management server
2. 10.0.0.1: A data node and an SQL node
3. 10.0.0.2: A data node and an SQL node

In this scenario, each data node communicates with both the management server and the other data node using TCP transporters; each SQL node uses a shared memory transporter to communicate with the data nodes that is local to it, and a TCP transporter to communicate with the remote data node. A basic configuration reflecting this setup is enabled by the config.ini file whose contents are shown here:
```
[ndbd default]
DataDir=/path/to/datadir
UseShm=1
[shm default]
ShmSize=8M
ShmSpintime=200
SendBufferMemory=4M
[tcp default]
SendBufferMemory=8M
[ndb_mgmd]
NodeId=49
Hostname=10.0.0.0
DataDir=/path/to/datadir
[ndbd]
NodeId=1
Hostname=10.0.0.1
DataDir=/path/to/datadir
[ndbd]
NodeId=2
Hostname=10.0.0.2
DataDir=/path/to/datadir
[mysqld]
NodeId=51
```

```
Hostname=10.0.0.1
[mysqld]
NodeId=52
Hostname=10.0.0.2
[api]
[api]
```


Parameters affecting all shared memory transporters are set in the [shm default] section; these can be overridden on a per-connection basis in one or more [shm] sections. Each such section must be associated with a given SHM connection using NodeId1 and NodeId2; the values required for these parameters are the node IDs of the two nodes connected by the transporter. You can also identify the nodes by host name using HostName1 and HostName2, but these parameters are not required.

The API nodes for which no host names are set use the TCP transporter to communicate with data nodes independent of the hosts on which they are started; the parameters and values set in the [tcp default] section of the configuration file apply to all TCP transporters in the cluster.

For optimum performance, you can define a spin time for the SHM transporter (ShmSpinTime parameter); this affects both the data node receiver thread and the poll owner (receive thread or user thread) in NDB.
- Checksum

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & boolean \\
\hline Default & true \\
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

This parameter is a boolean ( $\mathrm{Y} / \mathrm{N}$ ) parameter which is disabled by default. When it is enabled, checksums for all messages are calculated before being placed in the send buffer.

This feature prevents messages from being corrupted while waiting in the send buffer. It also serves as a check against data being corrupted during transport.
- Group

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & unsigned \\
\hline Default & 35 \\
\hline Range & $0-200$ \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

Determines the group proximity; a smaller value is interpreted as being closer. The default value is sufficient for most conditions.
- HostName1

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

The HostName1 and HostName2 parameters can be used to specify specific network interfaces to be used for a given SHM connection between two nodes. The values used for these parameters can be host names or IP addresses.
- HostName2

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

The HostName1 and HostName2 parameters can be used to specify specific network interfaces to be used for a given SHM connection between two nodes. The values used for these parameters can be host names or IP addresses.
- NodeId1

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & numeric \\
\hline Default & [none] \\
\hline Range & $1-255$ \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

To identify a connection between two nodes it is necessary to provide node identifiers for each of them, as NodeId1 and NodeId2.
- NodeId2

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & numeric \\
\hline Default & [none] \\
\hline Range & $1-255$ \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

To identify a connection between two nodes it is necessary to provide node identifiers for each of them, as NodeId1 and NodeId2.
- NodeIdServer

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & numeric \\
\hline Default & {$[$ none $]$} \\
\hline Range & $1-63$ \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

Identify the server end of a shared memory connection. By default, this is the node ID of the data node.
- OverloadLimit

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & bytes \\
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

When more than this many unsent bytes are in the send buffer, the connection is considered overloaded. See Section 25.4.3.14, "Configuring NDB Cluster Send Buffer Parameters", and Section 25.6.15.66, "The ndbinfo transporters Table", for more information.
- PreSendChecksum

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Type or units & boolean \\
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

If this parameter and Checksum are both enabled, perform pre-send checksum checks, and check all SHM signals between nodes for errors. Has no effect if Checksum is not also enabled.
- SendBufferMemory

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & integer \\
\hline Default & 2 M \\
\hline Range & \begin{tabular}{l}
256 K - \\
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

Size (in bytes) of the shared memory buffer for signals sent from this node using a shared memory connection.
- SendSignalId

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

To retrace the path of a distributed message, it is necessary to provide each message with a unique identifier. Setting this parameter to Y causes these message IDs to be transported over the network as well. This feature is disabled by default in production builds, and enabled in-debug builds.
- ShmKey

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & unsigned \\
\hline Default & 0 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Range & \begin{tabular}{l}
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

When setting up shared memory segments, a node ID, expressed as an integer, is used to identify uniquely the shared memory segment to use for the communication. There is no default value. If UseShm is enabled, the shared memory key is calculated automatically by NDB.
- ShmSize

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & bytes \\
\hline Default & 4 M \\
\hline Range & \begin{tabular}{l}
64 K - \\
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

Each SHM connection has a shared memory segment where messages between nodes are placed by the sender and read by the reader. The size of this segment is defined by ShmSize. The default value is 4 MB .
- ShmSpinTime

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & integer \\
\hline Default & 0 \\
\hline Range & $0-2000$ \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

When receiving, the time to wait before sleeping, in microseconds.
- SigNum

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & unsigned \\
\hline Default & {$[\ldots]$} \\
\hline Range & \begin{tabular}{l}
$0-4294967039$ \\
$(0$ xFFFFFEFF $)$
\end{tabular} \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Deprecated & Yes (in NDB \\
& 7.6 ) \\
\hline Restart Type & Node Restart: \\
& Requires a \\
& rolling restart \\
& of the cluster. \\
& (NDB 8.4.0) \\
\hline
\end{tabular}

This parameter was formerly used to override operating system signal numbers; in NDB 8.4, it is no longer used, and any setting for it is ignored.

Restart types. Information about the restart types used by the parameter descriptions in this section is shown in the following table:

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 25.21 NDB Cluster restart types}
\begin{tabular}{|l|l|l|}
\hline Symbol & Restart Type & Description \\
\hline N & Node & The parameter can be updated using a rolling restart (see Section 25.6.5, "Performing a Rolling Restart of an NDB Cluster") \\
\hline S & System & All cluster nodes must be shut down completely, then restarted, to effect a change in this parameter \\
\hline 1 & Initial & Data nodes must be restarted using the --initial option \\
\hline
\end{tabular}
\end{table}

\subsection*{25.4.3.13 Data Node Memory Management}

All memory allocation for a data node is performed when the node is started. This ensures that the data node can run in a stable manner without using swap memory, so that NDB can be used for latencysensitive (realtime) applications. The following types of memory are allocated on data node startup:
- Data memory
- Shared global memory
- Redo log buffers
- Job buffers
- Send buffers
- Page cache for disk data records
- Schema transaction memory
- Transaction memory
- Undo log buffer
- Query memory
- Block objects
- Schema memory
- Block data structures
- Long signal memory
- Shared memory communication buffers

The NDB memory manager, which regulates most data node memory, handles the following memory resources:
- Data Memory (DataMemory)
- Redo log buffers (RedoBuffer)
- Job buffers
- Send buffers (SendBufferMemory, TotalSendBufferMemory, ExtraSendBufferMemory),
- Disk Data record page cache (DiskPageBufferMemory, DiskPageBufferEntries)
- Transaction memory (TransactionMemory)
- Query memory
- Disk access records
- File buffers

Each of these resources is set up with a reserved memory area and a maximum memory area. The reserved memory area can be used only by the resource for which it is reserved and cannot be shared with other resources; a given resource can never allocate more than the maximum memory allowed for the resource. A resource that has no maximum memory can expand to use all the shared memory in the memory manager.

The size of the global shared memory for these resources is controlled by the SharedGlobalMemory configuration parameter (default: 128 MB ).

Data memory is always reserved and never acquires any memory from shared memory. It is controlled using the DataMemory configuration parameter, whose maximum is 16384 GB . DataMemory is where records are stored, including hash indexes (approximately 15 bytes per row), ordered indexes (10-12 bytes per row per index), and row headers (16-32 bytes per row).

Redo log buffers also use reserved memory only; this is controlled by the RedoBuffer configuration parameter, which sets the size of the redo log buffer per LDM thread. This means that the actual amount of memory used is the value of this parameter multiplied by the number of LDM threads in the data node.

Job buffers use reserved memory only; the size of this memory is calculated by NDB, based on the numbers of threads of various types.

Send buffers have a reserved part but can also allocate an additional $25 \%$ of shared global memory. The send buffer reserved size is calculated in two steps:
1. Use the value of the TotalSendBufferMemory configuration parameter (no default value) or the sum of the individual send buffers used by all individual connections to the data node. A data node is connected to all other data nodes, to all API nodes, and to all management nodes. This means that, in a cluster with 2 data nodes, 2 management nodes, and 10 API nodes each data node has 13 node connections. Since the default value for SendBufferMemory for a data node connection is 2 MByte, this works out to 26 MB total.
2. To obtain the total reserved size for the send buffer, the value of the ExtraSendBufferMemory configuration parameter, if any (default value 0 ). is added to the value obtained in the previous step.

In other words, if TotalSendBufferMemory has been set, the send buffer size is TotalSendBufferMemory + ExtraSendBufferMemory; otherwise, the size of the send buffer is equal to ([number of node connections] * SendBufferMemory) + ExtraSendBufferMemory.

The page cache for disk data records uses a reserved resource only; the size of this resource is controlled by the DiskPageBufferMemory configuration parameter (default 64 MB ). Memory for 32 KB disk page entries is also allocated; the number of these is determined by the DiskPageBufferEntries configuration parameter (default 10).

Transaction memory has a reserved part that either is calculated by NDB, or is set explicitly using the TransactionMemory configuration parameter; transaction memory can also use an unlimited amount of shared global memory. Transaction memory is used for all operational resources handling transactions, scans, locks, scan buffers, and trigger operations. It also holds table rows as they are updated, before the next commit writes them to data memory.

Resources are allocated from a common transaction memory resource and can also use resources from global shared memory. the size of this resource can be controlled using a single TransactionMemory configuration parameter.

Reserved memory for undo log buffers can be set using the InitialLogFileGroup configuration parameter. If an undo log buffer is created as part of a CREATE LOGFILE GROUP SQL statement, the memory is taken from the transaction memory.

A number of resources relating to metadata for Disk Data resources also have no reserved part, and use shared global memory only. Shared global shared memory is thus shared between send buffers, transaction memory, and Disk Data metadata.

If TransactionMemory is not set, it is calculated based on the following parameters:
- MaxNoOfConcurrentOperations
- MaxNoOfConcurrentTransactions
- MaxNoOfFiredTriggers
- MaxNoOfLocalOperations
- MaxNoOfConcurrentIndexOperations
- MaxNoOfConcurrentScans
- MaxNoOfLocalScans
- BatchSizePerLocalScan
- TransactionBufferMemory

When TransactionMemory is set explicitly, none of the configuration parameters just listed are used to calculate memory size. In addition, the parameters MaxNoOfConcurrentIndexOperations, MaxNoOfFiredTriggers, MaxNoOfLocalOperations, and MaxNoOfLocalScans are incompatible with TransactionMemory and cannot be set concurrently with it; if TransactionMemory is set and any of these four parameters are also set in the config.ini configuration file, the management server cannot start.

The MaxNoOfConcurrentIndexOperations, MaxNoOfFiredTriggers, MaxNoOfLocalOperations, and MaxNoOfLocalScans parameters are all deprecated; you should expect them to be removed from a future release of MySQL NDB Cluster.

The transaction memory resource contains a large number of memory pools. Each memory pool represents an object type and contains a set of objects; each pool includes a reserved part allocated to the pool at startup; this reserved memory is never returned to shared global memory. Reserved records are found using a data structure having only a single level for fast retrieval, which means that a number of records in each pool should be reserved. The number of reserved records in each pool has some impact on performance and reserved memory allocation, but is generally necessary only in certain very advanced use cases to set the reserved sizes explicitly.

The size of the reserved part of the pool can be controlled by setting the following configuration parameters:
- ReservedConcurrentIndexOperations
- ReservedFiredTriggers
- ReservedConcurrentOperations
- ReservedLocalScans
- ReservedConcurrentTransactions
- ReservedConcurrentScans
- ReservedTransactionBufferMemory

For any of the parameters just listed that is not set explicitly in config.ini, the reserved setting is calculated as $25 \%$ of the corresponding maximum setting. For example, if unset, ReservedConcurrentIndexOperations is calculated as $25 \%$ of MaxNoOfConcurrentIndexOperations, and ReservedLocalScans is calculated as 25\% of MaxNoOfLocalScans.

1

\section*{Note}

If ReservedTransactionBufferMemory is not set, it is calculated as 25\% of TransactionBufferMemory.

The number of reserved records is per data node; these records are split among the threads handling them (LDM and TC threads) on each node. In most cases, it is sufficient to set TransactionMemory alone, and to allow the number of records in pools to be governed by its value.

MaxNoOfConcurrentScans limits the number of concurrent scans that can be active in each TC thread. This is important in guarding against cluster overload.

MaxNoOfConcurrentOperations limits the number of operations that can be active at any one time in updating transactions. (Simple reads are not affected by this parameter.) This number needs to be limited because it is necessary to preallocate memory for node failure handling, and a resource must be available for handling the maximum number of active operations in one TC thread when contending with node failures. It is imperative that MaxNoOfConcurrentOperations be set to the same number on all nodes (this can be done most easily by setting a value for it once, in the [ndbd default] section of the config.ini global configuration file). While its value can be increased using a rolling restart (see Section 25.6.5, "Performing a Rolling Restart of an NDB Cluster"), decreasing it in this way is not considered safe due to the possibility of a node failure occurring during the rolling restart.

It is possible to limit the size of a single transaction in NDB Cluster through the MaxDMLOperationsPerTransaction parameter. If this is not set, the size of one transaction is limited by MaxNoOfConcurrentOperations since this parameter limits the total number of concurrent operations per TC thread.

Schema memory size is controlled by the following set of configuration parameters:
- MaxNoOfSubscriptions
- MaxNoOfSubscribers
- MaxNoOfConcurrentSubOperations
- MaxNoOfAttributes
- MaxNoOfTables
- MaxNoOfOrderedIndexes
- MaxNoOfUniqueHashIndexes
- MaxNoOfTriggers

The number of nodes and the number of LDM threads also have a major impact on the size of schema memory since the number of partitions in each table and each partition (and its fragment replicas) have to be represented in schema memory.

In addition, a number of other records are allocated during startup. These are relatively small. Each block in each thread contains block objects that use memory. This memory size is also normally quite small compared to the other data node memory structures.

\subsection*{25.4.3.14 Configuring NDB Cluster Send Buffer Parameters}

The NDB kernel employs a unified send buffer whose memory is allocated dynamically from a pool shared by all transporters. This means that the size of the send buffer can be adjusted as necessary. Configuration of the unified send buffer can accomplished by setting the following parameters:
- TotalSendBufferMemory. This parameter can be set for all types of NDB Cluster nodes-that is, it can be set in the [ndbd], [mgm], and [api] (or [mysql]) sections of the config.ini file. It represents the total amount of memory (in bytes) to be allocated by each node for which it is set for use among all configured transporters. If set, its minimum is 256 KB ; the maximum is 4294967039 .

To be backward-compatible with existing configurations, this parameter takes as its default value the sum of the maximum send buffer sizes of all configured transporters, plus an additional 32 KB (one page) per transporter. The maximum depends on the type of transporter, as shown in the following table:

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 25.22 Transporter types with maximum send buffer sizes}
\begin{tabular}{|l|l|}
\hline Transporter & Maximum Send Buffer Size (bytes) \\
\hline TCP & SendBufferMemory (default $=2 \mathrm{M}$ ) \\
\hline SHM & 20 K \\
\hline
\end{tabular}
\end{table}

This enables existing configurations to function in close to the same way as they did with NDB Cluster 6.3 and earlier, with the same amount of memory and send buffer space available to each transporter. However, memory that is unused by one transporter is not available to other transporters.
- OverloadLimit. This parameter is used in the config.ini file [tcp] section, and denotes the amount of unsent data (in bytes) that must be present in the send buffer before the connection is considered overloaded. When such an overload condition occurs, transactions that affect the overloaded connection fail with NDB API Error 1218 (Send Buffers overloaded in NDB kernel) until the overload status passes. The default value is 0 , in which case the effective overload limit is calculated as SendBufferMemory * 0.8 for a given connection. The maximum value for this parameter is 4 G .
- SendBufferMemory. This value denotes a hard limit for the amount of memory that may be used by a single transporter out of the entire pool specified by TotalSendBufferMemory. However, the sum of SendBufferMemory for all configured transporters may be greater than the TotalSendBufferMemory that is set for a given node. This is a way to save memory when many nodes are in use, as long as the maximum amount of memory is never required by all transporters at the same time.

You can use the ndbinfo.transporters table to monitor send buffer memory usage, and to detect slowdown and overload conditions that can adversely affect performance.

\subsection*{25.4.4 Using High-Speed Interconnects with NDB Cluster}

Even before design of NDBCLUSTER began in 1996, it was evident that one of the major problems to be encountered in building parallel databases would be communication between the nodes in the network. For this reason, NDBCLUSTER was designed from the very beginning to permit the use of a number of different data transport mechanisms, or transporters.

NDB Cluster supports three of these (see Section 25.2.1, "NDB Cluster Core Concepts"). A fourth transporter, Scalable Coherent Interface (SCI), was also supported in very old versions of NDB. This required specialized hardware, software, and MySQL binaries that are no longer available.

\subsection*{25.5 NDB Cluster Programs}

Using and managing an NDB Cluster requires several specialized programs, which we describe in this chapter. We discuss the purposes of these programs in an NDB Cluster, how to use the programs, and what startup options are available for each of them.

These programs include the NDB Cluster data, management, and SQL node processes (ndbd, ndbmtd, ndb_mgmd, and mysqld) and the management client (ndb_mgm).

For information about using mysqld as an NDB Cluster process, see Section 25.6.10, "MySQL Server Usage for NDB Cluster".

Other NDB utility, diagnostic, and example programs are included with the NDB Cluster distribution. These include ndb_restore, ndb_show_tables, and ndb_config. These programs are also covered in this section.

\subsection*{25.5.1 ndbd - The NDB Cluster Data Node Daemon}

The ndbd binary provides the single-threaded version of the process that is used to handle all the data in tables employing the NDBCLUSTER storage engine. This data node process enables a data node to accomplish distributed transaction handling, node recovery, checkpointing to disk, online backup, and related tasks. In NDB 8.4.1 and later, when started, ndbd logs a warning similar to that shown here:

2024-05-28 13:32:16 [ndbd] WARNING -- Running ndbd with a single thread of signal execution. For multi-threaded signal execution run the ndbmtd binary.
ndbmtd is the multi-threaded version of this binary.
In an NDB Cluster, a set of ndbd processes cooperate in handling data. These processes can execute on the same computer (host) or on different computers. The correspondences between data nodes and Cluster hosts is completely configurable.

Options that can be used with ndbd are shown in the following table. Additional descriptions follow the table.

\section*{Note}

All of these options also apply to the multithreaded version of this program (ndbmtd) and you may substitute "ndbmtd" for "ndbd" wherever the latter occurs in this section.
- --bind-address

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - bind - address=name \\
\hline Type & String \\
\hline Default Value & \\
\hline
\end{tabular}

Causes ndbd to bind to a specific network interface (host name or IP address). This option has no default value.
- --character-sets-dir

\begin{tabular}{|l|l|}
\hline Command-Line Format & --character-sets-dir=path \\
\hline
\end{tabular}

Directory containing character sets.
- --connect-delay=\#

\begin{tabular}{|l|l|}
\hline Command-Line Format & --connect-delay=\# \\
\hline Deprecated & Yes \\
\hline Type & Numeric \\
\hline Default Value & 5 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 3600 \\
\hline
\end{tabular}

Determines the time to wait between attempts to contact a management server when starting (the number of attempts is controlled by the--connect-retries option). The default is 5 seconds.

This option is deprecated, and is subject to removal in a future release of NDB Cluster. Use - -connect-retry-delay instead.
- --connect-retries=\#

\begin{tabular}{|l|l|}
\hline Command-Line Format & --connect-retries=\# \\
\hline Type & Numeric \\
\hline Default Value & 12 \\
\hline Minimum Value & -1 \\
\hline Maximum Value & 65535 \\
\hline
\end{tabular}

Set the number of times to retry a connection before giving up; 0 means 1 attempt only (and no retries). The default is 12 attempts. The time to wait between attempts is controlled by the -connect-retry-delay option.

It is also possible to set this option to -1 , in which case, the data node process continues indefinitely to try to connect.
- --connect-retry-delay=\#

\begin{tabular}{|l|l|}
\hline Command-Line Format & --connect-retry-delay=\# \\
\hline Type & Numeric \\
\hline Default Value & 5 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 4294967295 \\
\hline
\end{tabular}

Determines the time to wait between attempts to contact a management server when starting (the time between attempts is controlled by the-connect-retries option). The default is 5 seconds.

This option takes the place of the--connect-delay option, which is now deprecated and subject to removal in a future release of NDB Cluster.

The short form $-r$ for this option is also deprecated, and thus subject to removal. Use the long form instead.
- --connect-string

\begin{tabular}{|l|l|}
\hline Command-Line Format & --connect-string=connection_string \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Same as --ndb-connectstring.
- --core-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & --core-file \\
\hline
\end{tabular}

Write core file on error; used in debugging.
- --daemon, -d

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - daemon \\
\hline
\end{tabular}

Instructs ndbd or ndbmtd to execute as a daemon process. This is the default behavior. nodaemon can be used to prevent the process from running as a daemon.

This option has no effect when running ndbd or ndbmtd on Windows platforms.
- --defaults-extra-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-extra-file=path \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Read given file after global files are read.
- --defaults-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-file=path \\
\hline Type & String \\
\hline Default Value & [none] \\
\hline
\end{tabular}

Read default options from given file only.
- --defaults-group-suffix

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-group-suffix=string \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Also read groups with concat(group, suffix).
- --filesystem-password

\begin{tabular}{|l|l|}
\hline Command-Line Format & --filesystem-password=password \\
\hline
\end{tabular}

Pass the filesystem encryption and decryption password to the data node process using stdin, tty, or the my.cnf file.

Requires EncryptedFileSystem = 1 .
For more information, see Section 25.6.19.4, "File System Encryption for NDB Cluster".
- --filesystem-password-from-stdin

\begin{tabular}{|l|l|}
\hline Command-Line Format & \begin{tabular}{l}
-- filesystem-password - from - \\
stdin=\{TRUE|FALSE\}
\end{tabular} \\
\hline
\end{tabular}

Pass the filesystem encryption and decryption password to the data node process from stdin (only).

Requires EncryptedFileSystem = 1.
For more information, see Section 25.6.19.4, "File System Encryption for NDB Cluster".
- --foreground

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - foreground \\
\hline
\end{tabular}

Causes ndbd or ndbmtd to execute as a foreground process, primarily for debugging purposes. This option implies the --nodaemon option.

This option has no effect when running ndbd or ndbmtd on Windows platforms.
- --help

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - help \\
\hline
\end{tabular}

Display help text and exit.
- --initial

\begin{tabular}{|l|l|}
\hline Command-Line Format & --initial \\
\hline
\end{tabular}

Instructs ndbd to perform an initial start. An initial start erases any files created for recovery purposes by earlier instances of ndbd. It also re-creates recovery log files. On some operating systems, this process can take a substantial amount of time.

The option also causes the removal of all data files associated with Disk Data tablespaces and undo log files associated with log file groups that existed previously on this data node (see Section 25.6.11, "NDB Cluster Disk Data Tables").

An --initial start is to be used only when starting the ndbd process under very special circumstances; this is because this option causes all files to be removed from the NDB Cluster file system and all redo log files to be re-created. These circumstances are listed here:
- When performing a software upgrade which has changed the contents of any files.
- When restarting the node with a new version of ndbd.
- As a measure of last resort when for some reason the node restart or system restart repeatedly fails. In this case, be aware that this node can no longer be used to restore data due to the destruction of the data files.

\section*{Warning}

To avoid the possibility of eventual data loss, it is recommended that you not use the --initial option together with StopOnError = 0. Instead, set StopOnError to 0 in config.ini only after the cluster has been started, then restart the data nodes normally-that is, without the --initial option.

\section*{See the description of the StopOnError parameter for a detailed explanation of this issue. (Bug \#24945638)}

Use of this option prevents the StartPartialTimeout and StartPartitionedTimeout configuration parameters from having any effect.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4139.jpg?height=124&width=108&top_left_y=468&top_left_x=397)

\section*{Important}

This option does not affect backup files that have already been created by the affected node.

This option also has no effect on recovery of data by a data node that is just starting (or restarting) from data nodes that are already running (unless they also were started with --initial, as part of an initial restart). This recovery of data occurs automatically, and requires no user intervention in an NDB Cluster that is running normally.

It is permissible to use this option when starting the cluster for the very first time (that is, before any data node files have been created); however, it is not necessary to do so.
- --initial-start

\begin{tabular}{|l|l|}
\hline Command-Line Format & --initial-start \\
\hline
\end{tabular}

This option is used when performing a partial initial start of the cluster. Each node should be started with this option, as well as --nowait-nodes.

Suppose that you have a 4 -node cluster whose data nodes have the IDs $2,3,4$, and 5 , and you wish to perform a partial initial start using only nodes 2,4 , and 5 -that is, omitting node 3 :
```
$> ndbd --ndb-nodeid=2 --nowait-nodes=3 --initial-start
$> ndbd --ndb-nodeid=4 --nowait-nodes=3 --initial-start
$> ndbd --ndb-nodeid=5 --nowait-nodes=3 --initial-start
```


When using this option, you must also specify the node ID for the data node being started with the - - ndb - nodeid option.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4139.jpg?height=204&width=278&top_left_y=1617&top_left_x=392)

\section*{Important}

Do not confuse this option with the --nowait-nodes option for ndb_mgmd, which can be used to enable a cluster configured with multiple management servers to be started without all management servers being online.
- --install[=name]

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - install[=name] \\
\hline Platform Specific & Windows \\
\hline Type & String \\
\hline Default Value & ndbd \\
\hline
\end{tabular}

Causes ndbd to be installed as a Windows service. Optionally, you can specify a name for the service; if not set, the service name defaults to ndbd. Although it is preferable to specify other ndbd program options in a my.ini or my.cnf configuration file, it is possible to use together with -install. However, in such cases, the --install option must be specified first, before any other options are given, for the Windows service installation to succeed.

It is generally not advisable to use this option together with the --initial option, since this causes the data node file system to be wiped and rebuilt every time the service is stopped and started. Extreme care should also be taken if you intend to use any of the other ndbd options that affect the starting of data nodes-including --initial-start, --nostart, and --nowait-nodes-
together with --install, and you should make absolutely certain you fully understand and allow for any possible consequences of doing so.

The --install option has no effect on non-Windows platforms.
- --logbuffer-size=\#

\begin{tabular}{|l|l|}
\hline Command-Line Format & --logbuffer-size=\# \\
\hline Type & Integer \\
\hline Default Value & 32768 \\
\hline Minimum Value & 2048 \\
\hline Maximum Value & 4294967295 \\
\hline
\end{tabular}

Sets the size of the data node log buffer. When debugging with high amounts of extra logging, it is possible for the log buffer to run out of space if there are too many log messages, in which case some log messages can be lost. This should not occur during normal operations.
- --login-path

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- login- path=path \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Read given path from login file.
- --no-login-paths

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - no - login-paths \\
\hline
\end{tabular}

Skips reading options from the login path file.
- --ndb-connectstring

\begin{tabular}{|l|l|}
\hline Command-Line Format & \begin{tabular}{l}
- - ndb - \\
connectstring=connection_string
\end{tabular} \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Set connection string for connecting to ndb_mgmd. Syntax: [nodeid=id;]
[host=]hostname[:port]. Overrides entries in NDB_CONNECTSTRING and my.cnf.
- --ndb-log-timestamps

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-log-timestamps \\
\hline Type & Enumeration \\
\hline Default Value & LEGACY \\
\hline Valid Values & \begin{tabular}{l}
LEGACY \\
UTC \\
SYSTEM
\end{tabular} \\
\hline
\end{tabular}

Sets the format used for timestamps in node logs. This is one of the following values:
- LEGACY: The system timezone, with resolution in seconds.
- UTC: RFC 3339 format, with microsecond resolution.
- SYSTEM: RFC 3339 format.

LEGACY is the default in MySQL 8.4, for backwards compatibility with previous versions.
- --ndb-mgmd-host

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- ndb-mgmd-host=connection_string \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Same as --ndb-connectstring.
- --ndb-mgm-tls

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-mgm-tls=level \\
\hline Type & Enumeration \\
\hline Default Value & relaxed \\
\hline Valid Values & \begin{tabular}{l}
relaxed \\
strict
\end{tabular} \\
\hline
\end{tabular}

Sets the level of TLS support required to connect to the management server; one of relaxed or strict. relaxed (the default) means that a TLS connection is attempted, but success is not required; strict means that TLS is required to connect.
- --ndb-nodeid

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- ndb - nodeid $=\#$ \\
\hline Type & Integer \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Set node ID for this node, overriding any ID set by --ndb-connectstring.
- --ndb-optimized-node-selection

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-optimized-node-selection \\
\hline
\end{tabular}

Enable optimizations for selection of nodes for transactions. Enabled by default; use--skip-ndb-optimized-node-selection to disable.
- --ndb-tls-search-path

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - ndb-tls-search-path=list \\
\hline Type & Path name \\
\hline Default Value (Unix) & \$HOME/ndb-tls \\
\hline Default Value (Windows) & \$HOMEDIR/ndb-tls \\
\hline
\end{tabular}

Specify a list of directories to search for a CA file. On Unix platforms, the directory names are separated by colons (:); on Windows systems, the semicolon character (;) is used as the separator.

A directory reference may be relative or absolute; it may contain one or more environment variables, each denoted by a prefixed dollar sign (\$), and expanded prior to use.

Searching begins with the leftmost named directory and proceeds from left to right until a file is found. An empty string denotes an empty search path, which causes all searches to fail. A string consisting of a single dot (.) indicates that the search path limited to the current working directory.

If no search path is supplied, the compiled-in default value is used. This value depends on the platform used: On Windows, this is \ndb-tls; on other platforms (including Linux), it is $\$$ HOME/ndb-tls. This can be overridden by compiling NDB Cluster using DWITH_NDB_TLS_SEARCH_PATH.
- --nodaemon

\begin{tabular}{|l|l|}
\hline Command-Line Format & --nodaemon \\
\hline
\end{tabular}

Prevents ndbd or ndbmtd from executing as a daemon process. This option overrides the -daemon option. This is useful for redirecting output to the screen when debugging the binary.

The default behavior for ndbd and ndbmtd on Windows is to run in the foreground, making this option unnecessary on Windows platforms, where it has no effect.
- --no-defaults

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - no - defaults \\
\hline
\end{tabular}

Do not read default options from any option file other than login file.
- --nostart, -n

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - nostart \\
\hline
\end{tabular}

Instructs ndbd not to start automatically. When this option is used, ndbd connects to the management server, obtains configuration data from it, and initializes communication objects. However, it does not actually start the execution engine until specifically requested to do so by the management server. This can be accomplished by issuing the proper START command in the management client (see Section 25.6.1, "Commands in the NDB Cluster Management Client").
- --nowait-nodes=node_id_1[, node_id_2[, ...]]

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - nowait- nodes=list \\
\hline Type & String \\
\hline Default Value & \\
\hline
\end{tabular}

This option takes a list of data nodes for which the cluster does not wait, prior to starting.
This can be used to start the cluster in a partitioned state. For example, to start the cluster with only half of the data nodes (nodes $2,3,4$, and 5 ) running in a 4-node cluster, you can start each ndbd process with --nowait-nodes=3, 5 . In this case, the cluster starts as soon as nodes 2 and 4 connect, and does not wait StartPartitionedTimeout milliseconds for nodes 3 and 5 to connect as it would otherwise.

If you wanted to start up the same cluster as in the previous example without one ndbd (say, for example, that the host machine for node 3 has suffered a hardware failure) then start nodes 2,4 , and 5 with - nowait-nodes $=3$. Then the cluster starts as soon as nodes 2,4 , and 5 connect, and does not wait for node 3 to start.
- --print-defaults

\begin{tabular}{|l|l|}
\hline Command-Line Format & --print-defaults \\
\hline
\end{tabular}

Print program argument list and exit.
- --remove[=name]

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- remove $[=$ name $]$ \\
\hline Platform Specific & Windows \\
\hline Type & String \\
\hline Default Value & ndbd \\
\hline
\end{tabular}

Causes an ndbd process that was previously installed as a Windows service to be removed. Optionally, you can specify a name for the service to be uninstalled; if not set, the service name defaults to ndbd.

The --remove option has no effect on non-Windows platforms.
- --usage

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - usage \\
\hline
\end{tabular}

Display help text and exit; same as --help.
- --verbose, -v

Causes extra debug output to be written to the node log.
You can also use NODELOG DEBUG ON and NODELOG DEBUG OFF to enable and disable this extra logging while the data node is running.
- --version

\begin{tabular}{|l|l|}
\hline Command-Line Format & --version \\
\hline
\end{tabular}

Display version information and exit.
ndbd generates a set of log files which are placed in the directory specified by DataDir in the config.ini configuration file.

These log files are listed below. node_id is and represents the node's unique identifier. For example, ndb_2_error.log is the error log generated by the data node whose node ID is 2 .
- ndb_node_id_error.log is a file containing records of all crashes which the referenced ndbd process has encountered. Each record in this file contains a brief error string and a reference to a trace file for this crash. A typical entry in this file might appear as shown here:
```
Date/Time: Saturday 30 July 2004 - 00:20:01
Type of error: error
Message: Internal program error (failed ndbrequire)
Fault ID: 2341
Problem data: DbtupFixAlloc.cpp
Object of reference: DBTUP (Line: 173)
ProgramName: NDB Kernel
ProcessID: 14909
TraceFile: ndb_2_trace.log.2
***EOM***
```


Listings of possible ndbd exit codes and messages generated when a data node process shuts down prematurely can be found in Data Node Error Messages.

\section*{Important}

The last entry in the error log file is not necessarily the newest one (nor is it likely to be). Entries in the error log are not listed in chronological order; rather, they correspond to the order of the trace files as determined in the ndb_node_id_trace.log.next file (see below). Error log entries are thus overwritten in a cyclical and not sequential fashion.
- ndb_node_id_trace.log.trace_id is a trace file describing exactly what happened just before the error occurred. This information is useful for analysis by the NDB Cluster development team.

It is possible to configure the number of these trace files that are created before old files are overwritten. trace_id is a number which is incremented for each successive trace file.
- ndb_node_id_trace.log.next is the file that keeps track of the next trace file number to be assigned.
- ndb_node_id_out.log is a file containing any data output by the ndbd process. This file is created only if ndbd is started as a daemon, which is the default behavior.
- ndb_node_id.pid is a file containing the process ID of the ndbd process when started as a daemon. It also functions as a lock file to avoid the starting of nodes with the same identifier.
- ndb_node_id_signal.log is a file used only in debug versions of ndbd, where it is possible to trace all incoming, outgoing, and internal messages with their data in the ndbd process.

It is recommended not to use a directory mounted through NFS because in some environments this can cause problems whereby the lock on the .pid file remains in effect even after the process has terminated.

To start ndbd, it may also be necessary to specify the host name of the management server and the port on which it is listening. Optionally, one may also specify the node ID that the process is to use.
\$> ndbd --connect-string="nodeid=2;host=ndb_mgmd.mysql.com:1186"
See Section 25.4.3.3, "NDB Cluster Connection Strings", for additional information about this issue. For more information about data node configuration parameters, see Section 25.4.3.6, "Defining NDB Cluster Data Nodes".

When ndbd starts, it actually initiates two processes. The first of these is called the "angel process"; its only job is to discover when the execution process has been completed, and then to restart the ndbd process if it is configured to do so. Thus, if you attempt to kill ndbd using the Unix kill command, it is necessary to kill both processes, beginning with the angel process. The preferred method of terminating an ndbd process is to use the management client and stop the process from there.

The execution process uses one thread for reading, writing, and scanning data, as well as all other activities. This thread is implemented asynchronously so that it can easily handle thousands of concurrent actions. In addition, a watch-dog thread supervises the execution thread to make sure that it does not hang in an endless loop. A pool of threads handles file I/O, with each thread able to handle one open file. Threads can also be used for transporter connections by the transporters in the ndbd process. In a multi-processor system performing a large number of operations (including updates), the ndbd process can consume up to 2 CPUs if permitted to do so.

For a machine with many CPUs it is possible to use several ndbd processes which belong to different node groups; however, such a configuration is still considered experimental and is not supported for MySQL 8.4 in a production setting. See Section 25.2.7, "Known Limitations of NDB Cluster".

\subsection*{25.5.2 ndbinfo_select_all — Select From ndbinfo Tables}
ndbinfo_select_all is a client program that selects all rows and columns from one or more tables in the ndbinfo database

Not all ndbinfo tables available in the mysql client can be read by this program (see later in this section). In addition, ndbinfo_select_all can show information about some tables internal to ndbinfo which cannot be accessed using SQL, including the tables and columns metadata tables.

To select from one or more ndbinfo tables using ndbinfo_select_all, it is necessary to supply the names of the tables when invoking the program as shown here:
```
$> ndbinfo_select_all table_name1 [table_name2] [...]
```


For example:
```
$> ndbinfo_select_all logbuffers logspaces
== logbuffers ==

\begin{tabular}{llllllll} 
node_id & log_type & log_id & log_part & total & used & high \\
5 & 0 & 0 & 0 & 33554432 & 262144 & 0 & \\
6 & 0 & 0 & 0 & 33554432 & 262144 & 0 & \\
7 & 0 & 0 & 0 & 33554432 & 262144 & 0 & \\
8 & 0 & 0 & 0 & 33554432 & 262144 & 0 &
\end{tabular}
== logspaces ==

\begin{tabular}{|l|l|l|l|l|l|l|l|}
\hline node_id & log_type & & log_id & log_part & total & used & high \\
\hline 5 & 0 & 0 & 0 & 268435456 & 0 & 0 & \\
\hline 5 & 0 & 0 & 1 & 268435456 & 0 & 0 & \\
\hline 5 & 0 & 0 & 2 & 268435456 & 0 & 0 & \\
\hline 5 & 0 & 0 & 3 & 268435456 & 0 & 0 & \\
\hline 6 & 0 & 0 & 0 & 268435456 & 0 & 0 & \\
\hline 6 & 0 & 0 & 1 & 268435456 & 0 & 0 & \\
\hline 6 & 0 & 0 & 2 & 268435456 & 0 & 0 & \\
\hline 6 & 0 & 0 & 3 & 268435456 & 0 & 0 & \\
\hline 7 & 0 & 0 & 0 & 268435456 & 0 & 0 & \\
\hline 7 & 0 & 0 & 1 & 268435456 & 0 & 0 & \\
\hline 7 & 0 & 0 & 2 & 268435456 & 0 & 0 & \\
\hline 7 & 0 & 0 & 3 & 268435456 & 0 & 0 & \\
\hline 8 & 0 & 0 & 0 & 268435456 & 0 & 0 & \\
\hline 8 & 0 & 0 & 1 & 268435456 & 0 & 0 & \\
\hline 8 & 0 & 0 & 2 & 268435456 & 0 & 0 & \\
\hline 8 & 0 & 0 & 3 & 268435456 & 0 & 0 & \\
\hline
\end{tabular}
```


Options that can be used with ndbinfo_select_all are shown in the following table. Additional descriptions follow the table.
- --character-sets-dir

\begin{tabular}{|l|l|}
\hline Command-Line Format & --character-sets-dir=path \\
\hline
\end{tabular}

Directory containing character sets.
- --core-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & --core-file \\
\hline
\end{tabular}

Write core file on error; used in debugging.
- --connect-retries

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -connect - retries $=\#$ \\
\hline Type & Integer \\
\hline Default Value & 12 \\
\hline Minimum Value & 0 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Maximum Value & 12 \\
\hline
\end{tabular}

Number of times to retry connection before giving up.
- --connect-retry-delay

\begin{tabular}{|l|l|}
\hline Command-Line Format & --connect-retry-delay=\# \\
\hline Type & Integer \\
\hline Default Value & 5 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 5 \\
\hline
\end{tabular}

Number of seconds to wait between attempts to contact management server.
- --connect-string

\begin{tabular}{|l|l|}
\hline Command-Line Format & --connect-string=connection-string \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Same as --ndb-connectstring.
- --defaults-extra-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-extra-file=path \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Read given file after global files are read.
- --defaults-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- defaults-file=path \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Read default options from given file only.
- --defaults-group-suffix

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-group-suffix=string \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Also read groups with concat(group, suffix).
- --delay=seconds

\begin{tabular}{|l|l|}
\hline Command-Line Format & --delay=\# \\
\hline Type & Numeric \\
\hline Default Value & 5 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & MAX_INT \\
\hline
\end{tabular}

This option sets the number of seconds to wait between executing loops. Has no effect if --loops is set to 0 or 1.
- --help

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - help \\
\hline
\end{tabular}

Display help text and exit.
- --login-path

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- -login-path=path \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Read given path from login file.
- --no-login-paths

\begin{tabular}{|l|l|}
\hline Command-Line Format & --no-login-paths \\
\hline
\end{tabular}

Skips reading options from the login path file.
- --loops=number, -1 number

\begin{tabular}{|l|l|}
\hline Command-Line Format & --loops=\# \\
\hline Type & Numeric \\
\hline Default Value & 1 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & MAX_INT \\
\hline
\end{tabular}

This option sets the number of times to execute the select. Use --delay to set the time between loops.
- --ndb-connectstring

\begin{tabular}{|l|l|}
\hline Command-Line Format & \begin{tabular}{l}
--ndb-connectstring=connection- \\
string
\end{tabular} \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Set connection string for connecting to ndb_mgmd. Syntax: [nodeid=id;] [host=]hostname[:port]. Overrides entries in NDB_CONNECTSTRING and my.cnf.
- --ndb-mgmd-host

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-mgmd-host=connection-string \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Same as --ndb-connectstring.
- --ndb-nodeid

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- ndb - nodeid $=\#$ \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Type & Integer \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Set node ID for this node, overriding any ID set by --ndb-connectstring.
- --ndb-optimized-node-selection

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-optimized-node-selection \\
\hline
\end{tabular}

Enable optimizations for selection of nodes for transactions. Enabled by default; use--skip-ndb-optimized-node-selection to disable.
- --no-defaults

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - no - defaults \\
\hline
\end{tabular}

Do not read default options from any option file other than login file.
- --print-defaults

\begin{tabular}{|l|l|}
\hline Command-Line Format & --print-defaults \\
\hline
\end{tabular}

Print program argument list and exit.
- --usage

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - usage \\
\hline
\end{tabular}

Display help text and exit; same as --help.
- --version

\begin{tabular}{|l|l|}
\hline Command-Line Format & --version \\
\hline
\end{tabular}

Display version information and exit.
ndbinfo_select_all is unable to read the following tables:
- arbitrator_validity_detail
- arbitrator_validity_summary
- cluster_locks
- cluster_operations
- cluster_transactions
- disk_write_speed_aggregate_node
- locks_per_fragment
- memory_per_fragment
- memoryusage
- operations_per_fragment
- server_locks
- server_operations
- server_transactions
- table_info

\subsection*{25.5.3 ndbmtd — The NDB Cluster Data Node Daemon (Multi-Threaded)}
ndbmtd is a multithreaded version of ndbd, the process that is used to handle all the data in tables using the NDBCLUSTER storage engine. ndbmtd is intended for use on host computers having multiple CPU cores. Except where otherwise noted, ndbmtd functions in the same way as ndbd; therefore, in this section, we concentrate on the ways in which ndbmtd differs from ndbd, and you should consult Section 25.5.1, "ndbd - The NDB Cluster Data Node Daemon", for additional information about running NDB Cluster data nodes that apply to both the single-threaded and multithreaded versions of the data node process.

Command-line options and configuration parameters used with ndbd also apply to ndbmtd. For more information about these options and parameters, see Section 25.5.1, "ndbd - The NDB Cluster Data Node Daemon", and Section 25.4.3.6, "Defining NDB Cluster Data Nodes", respectively.
ndbmtd is also file system-compatible with ndbd. In other words, a data node running ndbd can be stopped, the binary replaced with ndbmtd, and then restarted without any loss of data. (However, when doing this, you must make sure that MaxNoOfExecutionThreads is set to an appropriate value before restarting the node if you wish for ndbmtd to run in multithreaded fashion.) Similarly, an ndbmtd binary can be replaced with ndbd simply by stopping the node and then starting ndbd in place of the multithreaded binary. It is not necessary when switching between the two to start the data node binary using --initial.

Using ndbmtd differs from using ndbd in two key respects:
1. Because ndbmtd runs by default in single-threaded mode (that is, it behaves like ndbd), you must configure it to use multiple threads. This can be done by setting an appropriate value in the config.ini file for the MaxNoOfExecutionThreads configuration parameter or the ThreadConfig configuration parameter. Using MaxNoOfExecutionThreads is simpler, but ThreadConfig offers more flexibility. For more information about these configuration parameters and their use, see Multi-Threading Configuration Parameters (ndbmtd).
2. Trace files are generated by critical errors in ndbmtd processes in a somewhat different fashion from how these are generated by ndbd failures. These differences are discussed in more detail in the next few paragraphs.

Like ndbd, ndbmtd generates a set of log files which are placed in the directory specified by DataDir in the config.ini configuration file. Except for trace files, these are generated in the same way and have the same names as those generated by ndbd.

In the event of a critical error, ndbmtd generates trace files describing what happened just prior to the error' occurrence. These files, which can be found in the data node's DataDir, are useful for analysis of problems by the NDB Cluster Development and Support teams. One trace file is generated for each ndbmtd thread. The names of these files have the following pattern:
ndb_node_id_trace.log.trace_id_tthread_id,
In this pattern, node_id stands for the data node's unique node ID in the cluster, trace_id is a trace sequence number, and thread_id is the thread ID. For example, in the event of the failure of an ndbmtd process running as an NDB Cluster data node having the node ID 3 and with MaxNoOfExecutionThreads equal to 4, four trace files are generated in the data node's data directory. If the is the first time this node has failed, then these files are named ndb_3_trace.log.1_t1, ndb_3_trace.log.1_t2, ndb_3_trace.log.1_t3, and ndb_3_trace.log.1_t4. Internally, these trace files follow the same format as ndbd trace files.

The ndbd exit codes and messages that are generated when a data node process shuts down prematurely are also used by ndbmtd. See Data Node Error Messages, for a listing of these.

\section*{Note}

It is possible to use ndbd and ndbmtd concurrently on different data nodes in the same NDB Cluster. However, such configurations have not been tested extensively; thus, we cannot recommend doing so in a production setting at this time.

\subsection*{25.5.4 ndb_mgmd - The NDB Cluster Management Server Daemon}

The management server is the process that reads the cluster configuration file and distributes this information to all nodes in the cluster that request it. It also maintains a log of cluster activities. Management clients can connect to the management server and check the cluster's status.

All options that can be used with ndb_mgmd are shown in the following table. Additional descriptions follow the table.
- --bind-address=host

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- bind - address=host \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Causes the management server to bind to a specific network interface (host name or IP address). This option has no default value.
- --character-sets-dir

\begin{tabular}{|l|l|}
\hline Command-Line Format & --character-sets-dir=path \\
\hline
\end{tabular}

Directory containing character sets.
- cluster-config-suffix

\begin{tabular}{|l|l|}
\hline Command-Line Format & --cluster-config-suffix=name \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Override defaults group suffix when reading cluster configuration sections in my.cnf; used in testing.
- --config-cache

\begin{tabular}{|l|l|}
\hline Command-Line Format & --config-cache[=TRUE|FALSE] \\
\hline Type & Boolean \\
\hline Default Value & TRUE \\
\hline
\end{tabular}

This option, whose default value is 1 (or TRUE, or ON), can be used to disable the management server's configuration cache, so that it reads its configuration from config. ini every time it starts (see Section 25.4.3, "NDB Cluster Configuration Files"). You can do this by starting the ndb_mgmd process with any one of the following options:
- --config-cache=0
- --config-cache=FALSE
- --config-cache=0FF
- --skip-config-cache

Using one of the options just listed is effective only if the management server has no stored configuration at the time it is started. If the management server finds any configuration cache files, then the--config-cache option or the --skip-config-cache option is ignored. Therefore, to disable configuration caching, the option should be used the first time that the management server is started. Otherwise-that is, if you wish to disable configuration caching for a management server that has already created a configuration cache-you must stop the management server, delete any existing configuration cache files manually, then restart the management server with --skip-config-cache (or with --config-cache set equal to 0, 0FF, or FALSE).

Configuration cache files are normally created in a directory named mysql-cluster under the installation directory (unless this location has been overridden using the --configdir option). Each time the management server updates its configuration data, it writes a new cache file. The files are named sequentially in order of creation using the following format:
ndb_node-id_config.bin.seq-number
node-id is the management server's node ID; seq-number is a sequence number, beginning with 1. For example, if the management server's node ID is 5 , then the first three configuration cache files would, when they are created, be named ndb_5_config.bin.1, ndb_5_config.bin.2, and ndb_5_config.bin.3.

If your intent is to purge or reload the configuration cache without actually disabling caching, you should start ndb_mgmd with one of the options --reload or --initial instead of --skip-config-cache.

To re-enable the configuration cache, simply restart the management server, but without the --config-cache or --skip-config-cache option that was used previously to disable the configuration cache.
ndb_mgmd does not check for the configuration directory (--configdir) or attempts to create one when --skip-config-cache is used. (Bug \#13428853)
- --config-file=filename, -f filename

\begin{tabular}{|l|l|}
\hline Command-Line Format & --config-file=file \\
\hline Disabled by & skip-config-file \\
\hline Type & File name \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Instructs the management server as to which file it should use for its configuration file. By default, the management server looks for a file named config.ini in the same directory as the ndb_mgmd executable; otherwise the file name and location must be specified explicitly.

This option has no default value, and is ignored unless the management server is forced to read the configuration file, either because ndb_mgmd was started with the --reload or --initial option, or because the management server could not find any configuration cache. If --config-file is specified without either of --initial or --reload, ndb_mgmd refuses to start.

The --config-file option is also read if ndb_mgmd was started with - - config-cache=0FF. See Section 25.4.3, "NDB Cluster Configuration Files", for more information.
- --configdir=dir_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & \begin{tabular}{l}
--configdir=directory \\
--config-dir=directory
\end{tabular} \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Type & File name \\
\hline Default Value & \$INSTALLDIR/mysql-cluster \\
\hline
\end{tabular}

Specifies the cluster management server's configuration cache directory. This must be an absolute path. Otherwise, the management server refuses to start.
--config-dir is an alias for this option.
- --connect-retries

\begin{tabular}{|l|l|}
\hline Command-Line Format & --connect-retries=\# \\
\hline Type & Integer \\
\hline Default Value & 12 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 12 \\
\hline
\end{tabular}

Number of times to retry connection before giving up.
- --connect-retry-delay

\begin{tabular}{|l|l|}
\hline Command-Line Format & --connect-retry-delay=\# \\
\hline Type & Integer \\
\hline Default Value & 5 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 5 \\
\hline
\end{tabular}

Number of seconds to wait between attempts to contact management server.
- --connect-string

\begin{tabular}{|l|l|}
\hline Command-Line Format & --connect-string=connection_string \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Same as --ndb-connectstring.
- --core-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & --core-file \\
\hline
\end{tabular}

Write core file on error; used in debugging.
- --daemon, -d

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - daemon \\
\hline
\end{tabular}

Instructs ndb_mgmd to start as a daemon process. This is the default behavior.
This option has no effect when running ndb_mgmd on Windows platforms.
- --defaults-extra-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-extra-file=path \\
\hline Type & String \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Default Value & [none] \\
\hline
\end{tabular}

Read given file after global files are read.
- --defaults-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- defaults-file=path \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Read default options from given file only.
- --defaults-group-suffix

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-group-suffix=string \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Also read groups with concat(group, suffix).
- --help

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- help \\
\hline
\end{tabular}

Display help text and exit.
- --initial

\begin{tabular}{|l|l|}
\hline Command-Line Format & --initial \\
\hline
\end{tabular}

Configuration data is cached internally, rather than being read from the cluster global configuration file each time the management server is started (see Section 25.4.3, "NDB Cluster Configuration Files"). Using the --initial option overrides this behavior, by forcing the management server to delete any existing cache files, and then to re-read the configuration data from the cluster configuration file and to build a new cache.

This differs in two ways from the --reload option. First, - - reload forces the server to check the configuration file against the cache and reload its data only if the contents of the file are different from the cache. Second, - - reload does not delete any existing cache files.

If ndb_mgmd is invoked with --initial but cannot find a global configuration file, the management server cannot start.

When a management server starts, it checks for another management server in the same NDB Cluster and tries to use the other management server's configuration data. This behavior has implications when performing a rolling restart of an NDB Cluster with multiple management nodes. See Section 25.6.5, "Performing a Rolling Restart of an NDB Cluster", for more information.

When used together with the --config-file option, the cache is cleared only if the configuration file is actually found.
- --install[=name]

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - install[=name] \\
\hline Platform Specific & Windows \\
\hline Type & String \\
\hline Default Value & ndb_mgmd \\
\hline
\end{tabular}

Causes ndb_mgmd to be installed as a Windows service. Optionally, you can specify a name for the service; if not set, the service name defaults to ndb_mgmd. Although it is preferable to specify other ndb_mgmd program options in a my.ini or my.cnf configuration file, it is possible to use them together with --install. However, in such cases, the --install option must be specified first, before any other options are given, for the Windows service installation to succeed.

It is generally not advisable to use this option together with the --initial option, since this causes the configuration cache to be wiped and rebuilt every time the service is stopped and started. Care should also be taken if you intend to use any other ndb_mgmd options that affect the starting of the management server, and you should make absolutely certain you fully understand and allow for any possible consequences of doing so.

The --install option has no effect on non-Windows platforms.
- --interactive

\begin{tabular}{|l|l|}
\hline Command-Line Format & --interactive \\
\hline
\end{tabular}

Starts ndb_mgmd in interactive mode; that is, an ndb_mgm client session is started as soon as the management server is running. This option does not start any other NDB Cluster nodes.
- --log-name=name

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- log - name $=$ name \\
\hline Type & String \\
\hline Default Value & MgmtSrvr \\
\hline
\end{tabular}

Provides a name to be used for this node in the cluster log.
- --login-path

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- login - path=path \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Read given path from login file.
- --no-login-paths

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - no-login-paths \\
\hline
\end{tabular}

Skips reading options from the login path file.
- --mycnf

\begin{tabular}{|l|l|}
\hline Command-Line Format & --mycnf \\
\hline
\end{tabular}

Read configuration data from the my.cnf file.
- --ndb-connectstring

\begin{tabular}{l|l|l|}
\cline { 2 - 3 } & Command-Line Format & \begin{tabular}{l} 
- - ndb - \\
connectstring=connection_string
\end{tabular} \\
\hline 4124 & Type & String \\
\cline { 2 - 3 } &
\end{tabular}

\begin{tabular}{|l|l|} 
Default Value & [none] \\
\hline
\end{tabular}

Set connection string. Syntax: [nodeid=id;][host=]hostname[:port]. Overrides entries in NDB_CONNECTSTRING and my.cnf. Ignored if --config-file is specified; a warning is issued if both options are used concurrently.
- --ndb-log-timestamps

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-log-timestamps \\
\hline Type & Enumeration \\
\hline Default Value & LEGACY \\
\hline Valid Values & \begin{tabular}{l}
LEGACY \\
UTC \\
SYSTEM
\end{tabular} \\
\hline
\end{tabular}

Sets the format used for timestamps in node logs. This is one of the following values:
- LEGACY: The system timezone, with resolution in seconds.
- UTC: RFC 3339 format, with microsecond resolution.
- SYSTEM: RFC 3339 format.

LEGACY is the default in MySQL 8.4, for backwards compatibility with previous versions.
- --ndb-mgm-tls

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-mgm-tls=level \\
\hline Type & Enumeration \\
\hline Default Value & relaxed \\
\hline Valid Values & \begin{tabular}{l}
relaxed \\
strict
\end{tabular} \\
\hline
\end{tabular}

Sets the level of TLS support required to connect to the management server; one of relaxed or strict. relaxed (the default) means that a TLS connection is attempted, but success is not required; strict means that TLS is required to connect.
- --ndb-mgmd-host

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- ndb-mgmd-host=connection_string \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Same as --ndb-connectstring.
- --ndb-nodeid

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - ndb - nodeid $=\#$ \\
\hline Type & Integer \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}
- --ndb-optimized-node-selection

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-optimized-node-selection \\
\hline
\end{tabular}

Enable optimizations for selection of nodes for transactions. Enabled by default; use--skip-ndb-optimized-node-selection to disable.
- --ndb-tls-search-path

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - ndb - tls - search - path=list \\
\hline Type & Path name \\
\hline Default Value (Unix) & \$HOME/ndb - tls \\
\hline Default Value (Windows) & \$HOMEDIR/ndb - tls \\
\hline
\end{tabular}

Specify a list of directories to search for a CA file. On Unix platforms, the directory names are separated by colons (:); on Windows systems, the semicolon character (;) is used as the separator. A directory reference may be relative or absolute; it may contain one or more environment variables, each denoted by a prefixed dollar sign (\$), and expanded prior to use.

Searching begins with the leftmost named directory and proceeds from left to right until a file is found. An empty string denotes an empty search path, which causes all searches to fail. A string consisting of a single dot (.) indicates that the search path limited to the current working directory.

If no search path is supplied, the compiled-in default value is used. This value depends on the platform used: On Windows, this is \ndb-tls; on other platforms (including Linux), it is $\$$ HOME/ndb-tls. This can be overridden by compiling NDB Cluster using DWITH_NDB_TLS_SEARCH_PATH.
- --no-nodeid-checks

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - no - nodeid - checks \\
\hline
\end{tabular}

Do not perform any checks of node IDs.
- --nodaemon

\begin{tabular}{|l|l|}
\hline Command-Line Format & --nodaemon \\
\hline
\end{tabular}

Instructs ndb_mgmd not to start as a daemon process.
The default behavior for ndb_mgmd on Windows is to run in the foreground, making this option unnecessary on Windows platforms.
- --no-defaults

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - no - defaults \\
\hline
\end{tabular}

Do not read default options from any option file other than login file.
- --nowait-nodes

\begin{tabular}{|l|l|l|}
\hline \multirow{2}{*}{} & Command-Line Format & - -nowait-nodes=list \\
\hline & Type & Numeric \\
\hline \multirow[t]{2}{*}{4126} & Default Value & [none] \\
\hline & Minimum Value & 1 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Maximum Value & 255 \\
\hline
\end{tabular}

When starting an NDB Cluster is configured with two management nodes, each management server normally checks to see whether the other ndb_mgmd is also operational and whether the other management server's configuration is identical to its own. However, it is sometimes desirable to start the cluster with only one management node (and perhaps to allow the other ndb_mgmd to be started later). This option causes the management node to bypass any checks for any other management nodes whose node IDs are passed to this option, permitting the cluster to start as though configured to use only the management node that was started.

For purposes of illustration, consider the following portion of a config. ini file (where we have omitted most of the configuration parameters that are not relevant to this example):
```
[ndbd]
NodeId = 1
HostName = 198.51.100.101
[ndbd]
NodeId = 2
HostName = 198.51.100.102
[ndbd]
NodeId = 3
HostName = 198.51.100.103
[ndbd]
NodeId = 4
HostName = 198.51.100.104
[ndb_mgmd]
NodeId = 10
HostName = 198.51.100.150
[ndb_mgmd]
NodeId = 11
HostName = 198.51.100.151
[api]
NodeId = 20
HostName = 198.51.100.200
[api]
NodeId = 21
HostName = 198.51.100.201
```


Assume that you wish to start this cluster using only the management server having node ID 10 and running on the host having the IP address 198.51.100.150. (Suppose, for example, that the host computer on which you intend to the other management server is temporarily unavailable due to a hardware failure, and you are waiting for it to be repaired.) To start the cluster in this way, use a command line on the machine at 198.51.100.150 to enter the following command:
```
$> ndb_mgmd --ndb-nodeid=10 --nowait-nodes=11
```


As shown in the preceding example, when using - - nowait - nodes, you must also use the - - ndb nodeid option to specify the node ID of this ndb_mgmd process.

You can then start each of the cluster's data nodes in the usual way. If you wish to start and use the second management server in addition to the first management server at a later time without
restarting the data nodes, you must start each data node with a connection string that references both management servers, like this:
```
$> ndbd -c 198.51.100.150,198.51.100.151
```


The same is true with regard to the connection string used with any mysqld processes that you wish to start as NDB Cluster SQL nodes connected to this cluster. See Section 25.4.3.3, "NDB Cluster Connection Strings", for more information.

When used with ndb_mgmd, this option affects the behavior of the management node with regard to other management nodes only. Do not confuse it with the --nowait-nodes option used with ndbd or ndbmtd to permit a cluster to start with fewer than its full complement of data nodes; when used with data nodes, this option affects their behavior only with regard to other data nodes.

Multiple management node IDs may be passed to this option as a comma-separated list. Each node ID must be no less than 1 and no greater than 255. In practice, it is quite rare to use more than two management servers for the same NDB Cluster (or to have any need for doing so); in most cases you need to pass to this option only the single node ID for the one management server that you do not wish to use when starting the cluster.

> Note
> When you later start the "missing" management server, its configuration must match that of the management server that is already in use by the cluster. Otherwise, it fails the configuration check performed by the existing management server, and does not start.
- --print-defaults

\begin{tabular}{|l|l|}
\hline Command-Line Format & --print-defaults \\
\hline
\end{tabular}

Print program argument list and exit.
- --print-full-config, -P

\begin{tabular}{|l|l|}
\hline Command-Line Format & --print-full-config \\
\hline
\end{tabular}

Shows extended information regarding the configuration of the cluster. With this option on the command line the ndb_mgmd process prints information about the cluster setup including an extensive list of the cluster configuration sections as well as parameters and their values. Normally used together with the --config-file (-f) option.
- --reload

\begin{tabular}{|l|l|}
\hline Command-Line Format & --reload \\
\hline
\end{tabular}

NDB Cluster configuration data is stored internally rather than being read from the cluster global configuration file each time the management server is started (see Section 25.4.3, "NDB Cluster Configuration Files"). Using this option forces the management server to check its internal data store
against the cluster configuration file and to reload the configuration if it finds that the configuration file does not match the cache. Existing configuration cache files are preserved, but not used.

This differs in two ways from the --initial option. First, --initial causes all cache files to be deleted. Second, --initial forces the management server to re-read the global configuration file and construct a new cache.

If the management server cannot find a global configuration file, then the --reload option is ignored.

When--reload is used, the management server must be able to communicate with data nodes and any other management servers in the cluster before it attempts to read the global configuration file; otherwise, the management server fails to start. This can happen due to changes in the networking environment, such as new IP addresses for nodes or an altered firewall configuration.
In such cases, you must use --initial instead to force the existing cached configuration to be discarded and reloaded from the file. See Section 25.6.5, "Performing a Rolling Restart of an NDB Cluster", for additional information.
- --remove[=name]

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- remove $[=$ name $]$ \\
\hline Platform Specific & Windows \\
\hline Type & String \\
\hline Default Value & ndb_mgmd \\
\hline
\end{tabular}

Remove a management server process that has been installed as a Windows service, optionally specifying the name of the service to be removed. Applies only to Windows platforms.
- --skip-config-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & --skip-config-file \\
\hline
\end{tabular}

Do not read cluster configuration file; ignore --initial and --reload options if specified.
- --usage

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - usage \\
\hline
\end{tabular}

Display help text and exit; same as --help.
- --verbose, -v

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- verbose \\
\hline
\end{tabular}

Remove a management server process that has been installed as a Windows service, optionally specifying the name of the service to be removed. Applies only to Windows platforms.
- --version

\begin{tabular}{|l|l|}
\hline Command-Line Format & --version \\
\hline
\end{tabular}

Display version information and exit.
It is not strictly necessary to specify a connection string when starting the management server.

See Section 25.4.3.3, "NDB Cluster Connection Strings", for information about using connection strings. Section 25.5.4, "ndb_mgmd - The NDB Cluster Management Server Daemon", describes other options for ndb_mgmd.

The following files are created or used by ndb_mgmd in its starting directory, and are placed in the DataDir as specified in the config. ini configuration file. In the list that follows, node_id is the unique node identifier.
- config.ini is the configuration file for the cluster as a whole. This file is created by the user and read by the management server. Section 25.4, "Configuration of NDB Cluster", discusses how to set up this file.
- ndb_node_id_cluster.log is the cluster events log file. Examples of such events include checkpoint startup and completion, node startup events, node failures, and levels of memory usage. A complete listing of cluster events with descriptions may be found in Section 25.6, "Management of NDB Cluster".

By default, when the size of the cluster log reaches one million bytes, the file is renamed to ndb_node_id_cluster.log.seq_id, where seq_id is the sequence number of the cluster log file. (For example: If files with the sequence numbers 1,2 , and 3 already exist, the next log file is named using the number 4.) You can change the size and number of files, and other characteristics of the cluster log, using the LogDestination configuration parameter.
- ndb_node_id_out.log is the file used for stdout and stderr when running the management server as a daemon.
- ndb_node_id.pid is the process ID file used when running the management server as a daemon.

\subsection*{25.5.5 ndb_mgm - The NDB Cluster Management Client}

The ndb_mgm management client process is actually not needed to run the cluster. Its value lies in providing a set of commands for checking the cluster's status, starting backups, and performing other administrative functions. The management client accesses the management server using a C API. Advanced users can also employ this API for programming dedicated management processes to perform tasks similar to those performed by ndb_mgm.

To start the management client, it is necessary to supply the host name and port number of the management server:
\$> ndb_mgm [host_name [port_num]]
For example:
\$> ndb_mgm ndb_mgmd.mysql.com 1186
The default host name and port number are localhost and 1186, respectively.
All options that can be used with ndb_mgm are shown in the following table. Additional descriptions follow the table.
- --backup-password-from-stdin[=TRUE|FALSE]

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - backup-password-from-stdin \\
\hline
\end{tabular}

This option enables input of the backup password from the system shell (stdin) when using -execute "START BACKUP" or similar to create a backup. Use of this option requires use of -execute as well.
- --character-sets-dir

\begin{tabular}{|l|l|}
\hline Command-Line Format & --character-sets-dir=path \\
\hline
\end{tabular}

Directory containing character sets.
- --connect-retries=\#

\begin{tabular}{|l|l|}
\hline Command-Line Format & --connect-retries=\# \\
\hline Type & Numeric \\
\hline Default Value & 3 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 4294967295 \\
\hline
\end{tabular}

This option specifies the number of times following the first attempt to retry a connection before giving up (the client always tries the connection at least once). The length of time to wait per attempt is set using--connect-retry-delay.

This option is synonymous with the--try-reconnect option, which is now deprecated.
- --connect-retry-delay

\begin{tabular}{|l|l|}
\hline Command-Line Format & --connect-retry-delay=\# \\
\hline Type & Integer \\
\hline Default Value & 5 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 5 \\
\hline
\end{tabular}

Number of seconds to wait between attempts to contact management server.
- --connect-string

\begin{tabular}{|l|l|}
\hline Command-Line Format & --connect-string=connection_string \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Same as --ndb-connectstring.
- --core-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & --core-file \\
\hline
\end{tabular}

Write core file on error; used in debugging.
- --defaults-extra-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-extra-file=path \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Read given file after global files are read.
- --defaults-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-file=path \\
\hline Type & String \\
\hline Default Value & [none] \\
\hline
\end{tabular}

Read default options from given file only.
- --defaults-group-suffix

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-group-suffix=string \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Also read groups with concat(group, suffix).
- --encrypt-backup

\begin{tabular}{|l|l|}
\hline Command-Line Format & --encrypt-backup \\
\hline
\end{tabular}

When used, this option causes all backups to be encrypted. To make this happen whenever ndb_mgm is run, put the option in the [ndb_mgm] section of the my.cnf file.
- --execute=command, -e command

\begin{tabular}{|l|l|}
\hline Command-Line Format & --execute=command \\
\hline
\end{tabular}

This option can be used to send a command to the NDB Cluster management client from the system shell. For example, either of the following is equivalent to executing SHOW in the management client:
```
$> ndb_mgm -e "SHOW"
$> ndb_mgm --execute="SHOW"
```


This is analogous to how the --execute or -e option works with the mysql command-line client. See Section 6.2.2.1, "Using Options on the Command Line".

\section*{Note}

If the management client command to be passed using this option contains any space characters, then the command must be enclosed in quotation marks. Either single or double quotation marks may be used. If the management client command contains no space characters, the quotation marks are optional.
- --help

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - help \\
\hline
\end{tabular}

Display help text and exit.
- --login-path

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- login - path=path \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Read given path from login file.
- --no-login-paths

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - no - login-paths \\
\hline
\end{tabular}

Skips reading options from the login path file.
- --ndb-connectstring

\begin{tabular}{|l|l|}
\hline Command-Line Format & \begin{tabular}{l} 
- - ndb - \\
connectstring=connection_string
\end{tabular} \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Set connect string for connecting to ndb_mgmd. Syntax: [nodeid=id;][host=]hostname[:port]. Overrides entries in NDB_CONNECTSTRING and my.cnf.
- --ndb-nodeid

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- ndb - nodeid $=\#$ \\
\hline Type & Integer \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Set node ID for this node, overriding any ID set by --ndb-connectstring.
- --ndb-mgm-tls

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-mgm-tls=level \\
\hline Type & Enumeration \\
\hline Default Value & relaxed \\
\hline Valid Values & \begin{tabular}{l}
relaxed \\
strict
\end{tabular} \\
\hline
\end{tabular}

Sets the level of TLS support required to connect to the management server; one of relaxed or strict. relaxed (the default) means that a TLS connection is attempted, but success is not required; strict means that TLS is required to connect.
- --ndb-mgmd-host

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-mgmd-host=connection_string \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Same as --ndb-connectstring.
- --ndb-optimized-node-selection

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - ndb-optimized-node-selection \\
\hline
\end{tabular}

Enable optimizations for selection of nodes for transactions. Enabled by default; use--skip-ndb-optimized-node-selection to disable.
- --ndb-tls-search-path

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - ndb - tls - search - path=list \\
\hline Type & Path name \\
\hline Default Value (Unix) & \$HOME/ndb - tls \\
\hline Default Value (Windows) & \$HOMEDIR/ndb-tls \\
\hline
\end{tabular}

Specify a list of directories to search for a CA file. On Unix platforms, the directory names are separated by colons (:); on Windows systems, the semicolon character (;) is used as the separator.

A directory reference may be relative or absolute; it may contain one or more environment variables, each denoted by a prefixed dollar sign (\$), and expanded prior to use.

Searching begins with the leftmost named directory and proceeds from left to right until a file is found. An empty string denotes an empty search path, which causes all searches to fail. A string consisting of a single dot (.) indicates that the search path limited to the current working directory.

If no search path is supplied, the compiled-in default value is used. This value depends on the platform used: On Windows, this is \ndb-tls; on other platforms (including Linux), it is $\$$ HOME/ndb-tls. This can be overridden by compiling NDB Cluster using DWITH_NDB_TLS_SEARCH_PATH.
- --no-defaults

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - no - defaults \\
\hline
\end{tabular}

Do not read default options from any option file other than login file.
- --print-defaults

\begin{tabular}{|l|l|}
\hline Command-Line Format & --print-defaults \\
\hline
\end{tabular}

Print program argument list and exit.
- --test-tls

\begin{tabular}{|l|l|}
\hline Command-Line Format & --test-tls \\
\hline
\end{tabular}

Connect using TLS, then exit. Output if successful is similar to what is shown here:
```
>$ ndb_mgm --test-tls
Connected to Management Server at: sakila:1186
>$
```


See Section 25.6.19.5, "TLS Link Encryption for NDB Cluster", for more information.
- --try-reconnect=number

\begin{tabular}{|l|l|}
\hline Command-Line Format & --try-reconnect=\# \\
\hline Deprecated & Yes \\
\hline Type & Numeric \\
\hline Type & Integer \\
\hline Default Value & 12 \\
\hline Default Value & 3 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 4294967295 \\
\hline
\end{tabular}

If the connection to the management server is broken, the node tries to reconnect to it every 5 seconds until it succeeds. By using this option, it is possible to limit the number of attempts to number before giving up and reporting an error instead.

This option is deprecated and subject to removal in a future release. Use --connect-retries, instead.
- --usage

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - usage \\
\hline
\end{tabular}

Display help text and exit; same as - -help.
- --version

\begin{tabular}{|l|l|}
\hline Command-Line Format & --version \\
\hline
\end{tabular}

Display version information and exit.
Additional information about using ndb_mgm can be found in Section 25.6.1, "Commands in the NDB Cluster Management Client".

\subsection*{25.5.6 ndb_blob_tool - Check and Repair BLOB and TEXT columns of NDB Cluster Tables}

This tool can be used to check for and remove orphaned BLOB column parts from NDB tables, as well as to generate a file listing any orphaned parts. It is sometimes useful in diagnosing and repairing corrupted or damaged NDB tables containing BLOB or TEXT columns.

The basic syntax for ndb_blob_tool is shown here:
ndb_blob_tool [options] table [column, ...]
Unless you use the --help option, you must specify an action to be performed by including one or more of the options --check-orphans, --delete-orphans, or --dump-file. These options cause ndb_blob_tool to check for orphaned BLOB parts, remove any orphaned BLOB parts, and generate a dump file listing orphaned BLOB parts, respectively, and are described in more detail later in this section.

You must also specify the name of a table when invoking ndb_blob_tool. In addition, you can optionally follow the table name with the (comma-separated) names of one or more BLOB or TEXT columns from that table. If no columns are listed, the tool works on all of the table's BLOB and TEXT columns. If you need to specify a database, use the --database (-d) option.

The --verbose option provides additional information in the output about the tool's progress.
All options that can be used with ndb_mgmd are shown in the following table. Additional descriptions follow the table.
- --add-missing

\begin{tabular}{|l|l|}
\hline Command-Line Format & --add-missing \\
\hline
\end{tabular}

For each inline part in NDB Cluster tables which has no corresponding BLOB part, write a dummy BLOB part of the required length, consisting of spaces.
- --character-sets-dir

\begin{tabular}{|l|l|}
\hline Command-Line Format & --character-sets-dir=path \\
\hline
\end{tabular}

Directory containing character sets.
- --check-missing

\begin{tabular}{|l|l|}
\hline Command-Line Format & --check-missing \\
\hline
\end{tabular}

Check for inline parts in NDB Cluster tables which have no corresponding BLOB parts.
- --check-orphans

\begin{tabular}{|l|l|}
\hline Command-Line Format & --check-orphans \\
\hline
\end{tabular}

Check for BLOB parts in NDB Cluster tables which have no corresponding inline parts.
- --connect-retries

\begin{tabular}{|l|l|}
\hline Command-Line Format & --connect-retries=\# \\
\hline Type & Integer \\
\hline Default Value & 12 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 12 \\
\hline
\end{tabular}

Number of times to retry connection before giving up.
- --connect-retry-delay

\begin{tabular}{|l|l|}
\hline Command-Line Format & --connect-retry-delay=\# \\
\hline Type & Integer \\
\hline Default Value & 5 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 5 \\
\hline
\end{tabular}

Number of seconds to wait between attempts to contact management server.
- --connect-string

\begin{tabular}{|l|l|}
\hline Command-Line Format & --connect-string=connection_string \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Same as --ndb-connectstring.
- --core-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & --core-file \\
\hline
\end{tabular}

Write core file on error; used in debugging.
- --database=db_name, -d

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - database $=$ name \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Specify the database to find the table in.
- --defaults-extra-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-extra-file=path \\
\hline Type & String \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Default Value & [none] \\
\hline
\end{tabular}

Read given file after global files are read.
- --defaults-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - defaults - file=path \\
\hline Type & String \\
\hline Default Value & [none] \\
\hline
\end{tabular}

Read default options from given file only.
- --defaults-group-suffix

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-group-suffix=string \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Also read groups with concat(group, suffix).
- --delete-orphans

\begin{tabular}{|l|l|}
\hline Command-Line Format & --delete-orphans \\
\hline
\end{tabular}

Remove BLOB parts from NDB Cluster tables which have no corresponding inline parts.
- --dump-file=file

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - dump - file=file \\
\hline Type & File name \\
\hline Default Value & [none] \\
\hline
\end{tabular}

Writes a list of orphaned BLOB column parts to file. The information written to the file includes the table key and BLOB part number for each orphaned BLOB part.
- --help

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- help \\
\hline
\end{tabular}

Display help text and exit.
- --login-path

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- -login-path=path \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Read given path from login file.
- --no-login-paths

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - no-login-paths \\
\hline
\end{tabular}

Skips reading options from the login path file.
- --ndb-connectstring

\begin{tabular}{|l|l|}
\hline Command-Line Format & \begin{tabular}{l}
- -ndb- \\
connectstring=connection_string
\end{tabular} \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Set connection string for connecting to ndb_mgmd. Syntax: [nodeid=id;] [host=]hostname[:port]. Overrides entries in NDB_CONNECTSTRING and my.cnf.
- --ndb-mgm-tls

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-mgm-tls=level \\
\hline Type & Enumeration \\
\hline Default Value & relaxed \\
\hline Valid Values & \begin{tabular}{l}
relaxed \\
strict
\end{tabular} \\
\hline
\end{tabular}

Sets the level of TLS support required to connect to the management server; one of relaxed or strict. relaxed (the default) means that a TLS connection is attempted, but success is not required; strict means that TLS is required to connect.
- --ndb-mgmd-host

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- ndb -mgmd - host=connection_string \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Same as --ndb-connectstring.
- --ndb-nodeid

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- ndb - nodeid $=\#$ \\
\hline Type & Integer \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Set node ID for this node, overriding any ID set by --ndb-connectstring.
- --ndb-optimized-node-selection

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-optimized-node-selection \\
\hline
\end{tabular}

Enable optimizations for selection of nodes for transactions. Enabled by default; use--skip-ndb-optimized-node-selection to disable.
- --ndb-tls-search-path

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - ndb-tls-search-path=list \\
\hline Type & Path name \\
\hline Default Value (Unix) & \$HOME/ndb-tls \\
\hline Default Value (Windows) & \$HOMEDIR/ndb-tls \\
\hline
\end{tabular}

Specify a list of directories to search for a CA file. On Unix platforms, the directory names are separated by colons (:); on Windows systems, the semicolon character (;) is used as the separator.

A directory reference may be relative or absolute; it may contain one or more environment variables, each denoted by a prefixed dollar sign (\$), and expanded prior to use.

Searching begins with the leftmost named directory and proceeds from left to right until a file is found. An empty string denotes an empty search path, which causes all searches to fail. A string consisting of a single dot (.) indicates that the search path limited to the current working directory.

If no search path is supplied, the compiled-in default value is used. This value depends on the platform used: On Windows, this is \ndb-tls; on other platforms (including Linux), it is $\$ \mathrm{HOME} / \mathrm{ndb}$ - tls. This can be overridden by compiling NDB Cluster using DWITH_NDB_TLS_SEARCH_PATH.
- --no-defaults

\begin{tabular}{|l|l|}
\hline Command-Line Format & --no-defaults \\
\hline
\end{tabular}

Do not read default options from any option file other than login file.
- --print-defaults

\begin{tabular}{|l|l|}
\hline Command-Line Format & --print-defaults \\
\hline
\end{tabular}

Print program argument list and exit.
- --usage

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - usage \\
\hline
\end{tabular}

Display help text and exit; same as --help.
- --verbose

\begin{tabular}{|l|l|}
\hline Command-Line Format & --verbose \\
\hline
\end{tabular}

Provide extra information in the tool's output regarding its progress.
- --version

\begin{tabular}{|l|l|}
\hline Command-Line Format & --version \\
\hline
\end{tabular}

Display version information and exit.

