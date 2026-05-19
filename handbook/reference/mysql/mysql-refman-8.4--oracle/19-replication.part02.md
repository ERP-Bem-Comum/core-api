\section*{System Variables Used with Binary Logging}

The following list describes system variables for controlling binary logging. They can be set at server startup and some of them can be changed at runtime using SET. Server options used to control binary logging are listed earlier in this section.
- binlog_cache_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --binlog-cache-size=\# \\
\hline System Variable & binlog_cache_size \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 32768 \\
\hline Minimum Value & 4096 \\
\hline Maximum Value (64-bit platforms) & 18446744073709547520 \\
\hline Maximum Value (32-bit platforms) & 4294963200 \\
\hline Unit & bytes \\
\hline Block Size & 4096 \\
\hline
\end{tabular}

The size of the memory buffer to hold changes to the binary log during a transaction.
When binary logging is enabled on the server (with the log_bin system variable set to ON), a binary log cache is allocated for each client if the server supports any transactional storage
engines. If the data for the transaction exceeds the space in the memory buffer, the excess data is stored in a temporary file. When binary log encryption is active on the server, the memory buffer is not encrypted, but any temporary file used to hold the binary log cache is encrypted. After each transaction is committed, the binary log cache is reset by clearing the memory buffer and truncating the temporary file if used.

If you often use large transactions, you can increase this cache size to get better performance by reducing or eliminating the need to write to temporary files. The Binlog_cache_use and Binlog_cache_disk_use status variables can be useful for tuning the size of this variable. See Section 7.4.4, "The Binary Log".
binlog_cache_size sets the size for the transaction cache only; the size of the statement cache is governed by the binlog_stmt_cache_size system variable.
- binlog_checksum

\begin{tabular}{|l|l|}
\hline Command-Line Format & --binlog-checksum=type \\
\hline System Variable & binlog_checksum \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Default Value & CRC32 \\
\hline Valid Values & \begin{tabular}{l}
NONE \\
CRC32
\end{tabular} \\
\hline
\end{tabular}

When enabled, this variable causes the source to write a checksum for each event in the binary log. binlog_checksum supports the values NONE (which disables checksums) and CRC32. The default is CRC32. When binlog_checksum is disabled (value NONE), the server verifies that it is writing only complete events to the binary log by writing and checking the event length (rather than a checksum) for each event.

Setting this variable on the source to a value unrecognized by the replica causes the replica to set its own binlog_checksum value to NONE, and to stop replication with an error. If backward compatibility with older replicas is a concern, you may want to set the value explicitly to NONE.

Group Replication in MySQL 8.4 supports checksums, so group members may use the default setting.

Changing the value of binlog_checksum causes the binary log to be rotated, because checksums must be written for an entire binary log file, and never for only part of one. You cannot change the value of binlog_checksum within a transaction.

When binary log transaction compression is enabled using the binlog_transaction_compression system variable, checksums are not written for individual events in a compressed transaction payload. Instead a checksum is written for the GTID event, and a checksum for the compressed Transaction_payload_event.
- binlog_direct_non_transactional_updates

\begin{tabular}{|l|l|}
\hline Command-Line Format & \begin{tabular}{l} 
- - binlog-direct - non - transactional - \\
updates [=\{OFF|ON\}]
\end{tabular} \\
\hline System Variable & binlog_direct_non_transactional_updates \\
\hline Scope & Global, Session \\
\hline
\end{tabular}

\begin{table}
\captionsetup{labelformat=empty}
\caption{Replication and Binary Logging Options and Variables}
\begin{tabular}{|l|l|} 
Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}
\end{table}

Due to concurrency issues, a replica can become inconsistent when a transaction contains updates to both transactional and nontransactional tables. MySQL tries to preserve causality among these statements by writing nontransactional statements to the transaction cache, which is flushed upon commit. However, problems arise when modifications done to nontransactional tables on behalf of a transaction become immediately visible to other connections because these changes may not be written immediately into the binary log.

The binlog_direct_non_transactional_updates variable offers one possible workaround to this issue. By default, this variable is disabled. Enabling binlog_direct_non_transactional_updates causes updates to nontransactional tables to be written directly to the binary log, rather than to the transaction cache.

Setting the session value of this system variable is a restricted operation. The session user must have privileges sufficient to set restricted session variables. See Section 7.1.9.1, "System Variable Privileges".
binlog_direct_non_transactional_updates works only for statements that are replicated using the statement-based binary logging format; that is, it works only when the value of binlog_format is STATEMENT, or when binlog_format is MIXED and a given statement is being replicated using the statement-based format. This variable has no effect when the binary log format is ROW, or when binlog_format is set to MIXED and a given statement is replicated using the row-based format.

> Important
> Before enabling this variable, you must make certain that there are no dependencies between transactional and nontransactional tables; an example of such a dependency would be the statement INSERT INTO myisam_table SELECT * FROM innodb_table. Otherwise, such statements are likely to cause the replica to diverge from the source.

This variable has no effect when the binary log format is ROW or MIXED.
- binlog_encryption

\begin{tabular}{|l|l|}
\hline Command-Line Format & --binlog-encryption[=\{OFF|ON\}] \\
\hline System Variable & binlog_encryption \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

Enables encryption for binary log files and relay log files on this server. OFF is the default. ON sets encryption on for binary log files and relay log files. Binary logging does not need to be enabled on the server to enable encryption, so you can encrypt the relay log files on a replica that has no binary log. To use encryption, a keyring plugin must be installed and configured to supply MySQL Server's
keyring service. For instructions to do this, see Section 8.4.4, "The MySQL Keyring". Any supported keyring plugin can be used to store binary log encryption keys.

When you first start the server with binary log encryption enabled, a new binary log encryption key is generated before the binary log and relay logs are initialized. This key is used to encrypt a file password for each binary log file (if the server has binary logging enabled) and relay log file (if the server has replication channels), and further keys generated from the file passwords are used to encrypt the data in the files. Relay log files are encrypted for all channels, including Group Replication applier channels and new channels that are created after encryption is activated. The binary log index file and relay log index file are never encrypted.

If you activate encryption while the server is running, a new binary log encryption key is generated at that time. The exception is if encryption was active previously on the server and was then disabled, in which case the binary log encryption key that was in use before is used again. The binary log file and relay log files are rotated immediately, and file passwords for the new files and all subsequent binary log files and relay log files are encrypted using this binary log encryption key. Existing binary log files and relay log files still present on the server are not automatically encrypted, but you can purge them if they are no longer needed.

If you deactivate encryption by changing the binlog_encryption system variable to OFF, the binary log file and relay log files are rotated immediately and all subsequent logging is unencrypted. Previously encrypted files are not automatically decrypted, but the server is still able to read them. The BINLOG_ENCRYPTION_ADMIN privilege (or the deprecated SUPER privilege) is required to activate or deactivate encryption while the server is running. Group Replication applier channels are not included in the relay log rotation request, so unencrypted logging for these channels does not start until their logs are rotated in normal use.

For more information on binary log file and relay log file encryption, see Section 19.3.2, "Encrypting Binary Log Files and Relay Log Files".
- binlog_error_action

\begin{tabular}{|l|l|}
\hline Command-Line Format & --binlog-error-action[=value] \\
\hline System Variable & binlog_error_action \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Enumeration \\
\hline Default Value & ABORT_SERVER \\
\hline Valid Values & \begin{tabular}{l}
IGNORE_ERROR \\
ABORT_SERVER
\end{tabular} \\
\hline
\end{tabular}

Controls what happens when the server encounters an error such as not being able to write to, flush or synchronize the binary log, which can cause the source's binary log to become inconsistent and replicas to lose synchronization.

This variable defaults to ABORT_SERVER, which makes the server halt logging and shut down whenever it encounters such an error with the binary log. On restart, recovery proceeds as in the case of an unexpected server halt (see Section 19.4.2, "Handling an Unexpected Halt of a Replica").

When binlog_error_action is set to IGNORE_ERROR, if the server encounters such an error it continues the ongoing transaction, logs the error then halts logging, and continues performing updates. To resume binary logging log_bin must be enabled again, which requires a server restart. This setting provides backward compatibility with older versions of MySQL.
- binlog_expire_logs_seconds

\begin{table}
\captionsetup{labelformat=empty}
\caption{Replication and Binary Logging Options and Variables}
\begin{tabular}{|l|l|}
\hline Command-Line Format & --binlog-expire-logs-seconds=\# \\
\hline System Variable & binlog_expire_logs_seconds \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 2592000 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 4294967295 \\
\hline Unit & seconds \\
\hline
\end{tabular}
\end{table}

Sets the binary log expiration period in seconds. After their expiration period ends, binary log files can be automatically removed. Possible removals happen at startup and when the binary log is flushed. Log flushing occurs as indicated in Section 7.4, "MySQL Server Logs".

The default binary log expiration period is 2592000 seconds, which equals 30 days $(30 * 24 * 60 * 60$ seconds).

Automatic purging of the binary log can be disabled by setting the binlog_expire_logs_auto_purge system variable to OFF. This takes precedence over any setting for binlog_expire_logs_seconds.

To remove binary log files manually, use the PURGE BINARY LOGS statement. See Section 15.4.1.1, "PURGE BINARY LOGS Statement".
- binlog_expire_logs_auto_purge

\begin{tabular}{|l|l|}
\hline Command-Line Format & --binlog-expire-logs-auto-purge=\{ON| OFF\} \\
\hline System Variable & binlog_expire_logs_auto_purge \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & ON \\
\hline
\end{tabular}

Enables or disables automatic purging of binary log files. Setting this variable to ON (the default) enables automatic purging; setting it to OFF disables automatic purging. The interval to wait before purging is controlled by binlog_expire_logs_seconds.

\section*{Note}

Even if binlog_expire_logs_auto_purge is ON, setting binlog_expire_logs_seconds to 0 stops automatic purging from taking place.

This variable has no effect on PURGE BINARY LOGS.
- binlog_format

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -binlog-format=format \\
\hline Deprecated & Yes \\
\hline \hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline System Variable & binlog_format \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Enumeration \\
\hline Default Value & ROW \\
\hline Valid Values & \begin{tabular}{l}
MIXED \\
STATEMENT \\
ROW
\end{tabular} \\
\hline
\end{tabular}

This system variable sets the binary logging format, and can be any one of STATEMENT, ROW, or MIXED. (See Section 19.2.1, "Replication Formats".) The setting takes effect when binary logging is enabled on the server, which is the case when the log_bin system variable is set to ON. In MySQL 8.4, binary logging is enabled by default, and by default uses the row-based format.

Note
binlog_format is deprecated, and subject to removal in a future version of MySQL. This implies that support for logging formats other than row-based
is also subject to removal in a future release. Thus, only row-based logging should be employed for any new MySQL Replication setups.
binlog_format can be set at startup or at runtime, except that under some conditions, changing this variable at runtime is not possible or causes replication to fail, as described later.

The default is ROW. Exception: In NDB Cluster, the default is MIXED; statement-based replication is not supported for NDB Cluster.

Setting the session value of this system variable is a restricted operation. The session user must have privileges sufficient to set restricted session variables. See Section 7.1.9.1, "System Variable Privileges".

The rules governing when changes to this variable take effect and how long the effect lasts are the same as for other MySQL server system variables. For more information, see Section 15.7.6.1, "SET Syntax for Variable Assignment".

When MIXED is specified, statement-based replication is used, except for cases where only row-based replication is guaranteed to lead to proper results. For example, this happens when statements contain loadable functions or the UUID( ) function.

For details of how stored programs (stored procedures and functions, triggers, and events) are handled when each binary logging format is set, see Section 27.7, "Stored Program Binary Logging".

There are exceptions when you cannot switch the replication format at runtime:
- The replication format cannot be changed from within a stored function or a trigger.
- If a session has open temporary tables, the replication format cannot be changed for the session (SET @@SESSION.binlog_format).
- If any replication channel has open temporary tables, the replication format cannot be changed globally (SET @@GLOBAL.binlog_format or SET @@PERSIST.binlog_format).
- If any replication channel applier thread is currently running, the replication format cannot be changed globally (SET @@GLOBAL.binlog_format or SET @@PERSIST.binlog_format).

Trying to switch the replication format in any of these cases (or attempting to set the current replication format) results in an error. You can, however, use PERSIST_ONLY (SET @@PERSIST_ONLY.binlog_format) to change the replication format at any time, because this action does not modify the runtime global system variable value, and takes effect only after a server restart.

Switching the replication format at runtime is not recommended when any temporary tables exist, because temporary tables are logged only when using statement-based replication, whereas with row-based replication and mixed replication, they are not logged.

Changing the logging format on a replication source server does not cause a replica to change its logging format to match. Switching the replication format while replication is ongoing can cause issues if a replica has binary logging enabled, and the change results in the replica using STATEMENT format logging while the source is using ROW or MIXED format logging. A replica is not able to convert binary log entries received in ROW logging format to STATEMENT format for
use in its own binary log, so this situation can cause replication to fail. For more information, see Section 7.4.4.2, "Setting The Binary Log Format".

The binary log format affects the behavior of the following server options:
- --replicate-do-db
- --replicate-ignore-db
- --binlog-do-db
- --binlog-ignore-db

These effects are discussed in detail in the descriptions of the individual options.
- binlog_group_commit_sync_delay

\begin{tabular}{|l|l|}
\hline Command-Line Format & --binlog-group-commit-sync-delay=\# \\
\hline System Variable & binlog_group_commit_sync_delay \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 1000000 \\
\hline Unit & microseconds \\
\hline
\end{tabular}

Controls how many microseconds the binary log commit waits before synchronizing the binary log file to disk. By default binlog_group_commit_sync_delay is set to 0 , meaning that there is no delay. Setting binlog_group_commit_sync_delay to a microsecond delay enables more transactions to be synchronized together to disk at once, reducing the overall time to commit a group of transactions because the larger groups require fewer time units per group.

When sync_binlog=0 or sync_binlog=1 is set, the delay specified by binlog_group_commit_sync_delay is applied for every binary log commit group before synchronization (or in the case of sync_binlog=0, before proceeding). When sync_binlog is set to a value $n$ greater than 1 , the delay is applied after every $n$ binary log commit groups.

Setting binlog_group_commit_sync_delay can increase the number of parallel committing transactions on any server that has (or might have after a failover) a replica, and therefore can increase parallel execution on the replicas. To benefit from this effect, the replica servers must have replica_parallel_type=LOGICAL_CLOCK set. It is important to take into account both source and replica throughput when you are setting binlog_group_commit_sync_delay.

Setting binlog_group_commit_sync_delay can also reduce the number of fsync ( ) calls to the binary log on any server (source or replica) that has a binary log.

Note that setting binlog_group_commit_sync_delay increases the latency of transactions on the server, which might affect client applications. Also, on highly concurrent workloads, it is possible for the delay to increase contention and therefore reduce throughput. Typically, the benefits of setting a delay outweigh the drawbacks, but tuning should always be carried out to determine the optimal setting.
- binlog_group_commit_sync_no_delay_count

\begin{tabular}{|l|l|}
\hline Command-Line Format & --binlog-group-commit-sync-no-delaycount=\# \\
\hline System Variable & binlog_group_commit_sync_no_delay_count \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 100000 \\
\hline
\end{tabular}

The maximum number of transactions to wait for before aborting the current delay as specified by binlog_group_commit_sync_delay. If binlog_group_commit_sync_delay is set to 0 , then this option has no effect.
- binlog_max_flush_queue_time

\begin{tabular}{|l|l|}
\hline Command-Line Format & --binlog-max-flush-queue-time=\# \\
\hline Deprecated & Yes \\
\hline System Variable & binlog_max_flush_queue_time \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 100000 \\
\hline Unit & microseconds \\
\hline
\end{tabular}
binlog_max_flush_queue_time is deprecated, and is marked for eventual removal in a future MySQL release. Formerly, this system variable controlled the time in microseconds to continue reading transactions from the flush queue before proceeding with group commit. It no longer has any effect.
- binlog_order_commits

\begin{tabular}{|l|l|}
\hline Command-Line Format & --binlog-order-commits[=\{OFF|ON\}] \\
\hline System Variable & binlog_order_commits \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & ON \\
\hline
\end{tabular}

When this variable is enabled on a replication source server (which is the default), transaction commit instructions issued to storage engines are serialized on a single thread, so that transactions are always committed in the same order as they are written to the binary log. Disabling this variable
permits transaction commit instructions to be issued using multiple threads. Used in combination with binary log group commit, this prevents the commit rate of a single transaction being a bottleneck to throughput, and might therefore produce a performance improvement.

Transactions are written to the binary log at the point when all the storage engines involved have confirmed that the transaction is prepared to commit. The binary log group commit logic then commits a group of transactions after their binary log write has taken place. When binlog_order_commits is disabled, because multiple threads are used for this process, transactions in a commit group might be committed in a different order from their order in the binary log. (Transactions from a single client always commit in chronological order.) In many cases this does not matter, as operations carried out in separate transactions should produce consistent results, and if that is not the case, a single transaction ought to be used instead.

If you want to ensure that the transaction history on the source and on a multithreaded replica remains identical, set replica_preserve_commit_order=1 on the replica.
- binlog_rotate_encryption_master_key_at_startup

\begin{tabular}{|l|l|}
\hline Command-Line Format & --binlog-rotate-encryption-master-key-at-startup[=\{OFF|ON\}] \\
\hline System Variable & binlog_rotate_encryption_master_key_at_star \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & 0FF \\
\hline
\end{tabular}

Specifies whether or not the binary log master key is rotated at server startup. The binary log master key is the binary log encryption key that is used to encrypt file passwords for the binary log files and relay log files on the server. When a server is started for the first time with binary log encryption enabled (binlog_encryption=0N), a new binary log encryption key is generated and used as the binary log master key. If the binlog_rotate_encryption_master_key_at_startup system variable is also set to ON, whenever the server is restarted, a further binary log encryption key is generated and used as the binary log master key for all subsequent binary log files and relay log files. If the binlog_rotate_encryption_master_key_at_startup system variable is set to 0FF, which is the default, the existing binary log master key is used again after the server restarts. For more information on binary log encryption keys and the binary log master key, see Section 19.3.2, "Encrypting Binary Log Files and Relay Log Files".
- binlog_row_event_max_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --binlog-row-event-max-size=\# \\
\hline System Variable & binlog_row_event_max_size \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 8192 \\
\hline Minimum Value & 256 \\
\hline Maximum Value (64-bit platforms) & 18446744073709551615 \\
\hline Maximum Value (32-bit platforms) & 4294967295 \\
\hline
\end{tabular}

Unit |bytes

When row-based binary logging is used, this setting is a soft limit on the maximum size of a rowbased binary log event, in bytes. Where possible, rows stored in the binary log are grouped into events with a size not exceeding the value of this setting. If an event cannot be split, the maximum size can be exceeded. The default is 8192 bytes.

This global system variable is read-only and can be set only at server startup. Its value can therefore only be modified by using the PERSIST_ONLY keyword or the @@persist_only qualifier with the SET statement.
- binlog_row_image

\begin{tabular}{|l|l|}
\hline Command-Line Format & --binlog-row-image=image_type \\
\hline System Variable & binlog_row_image \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Enumeration \\
\hline Default Value & full \\
\hline Valid Values & \begin{tabular}{l}
full (Log all columns) \\
minimal (Log only changed columns, and columns needed to identify rows) \\
noblob (Log all columns, except for unneeded BLOB and TEXT columns)
\end{tabular} \\
\hline
\end{tabular}

For MySQL row-based replication, this variable determines how row images are written to the binary log.

Setting the session value of this system variable is a restricted operation. The session user must have privileges sufficient to set restricted session variables. See Section 7.1.9.1, "System Variable Privileges".

In MySQL row-based replication, each row change event contains two images, a "before" image whose columns are matched against when searching for the row to be updated, and an "after" image containing the changes. Normally, MySQL logs full rows (that is, all columns) for both the before and after images. However, it is not strictly necessary to include every column in both images, and we can often save disk, memory, and network usage by logging only those columns which are actually required.

> Note
> When deleting a row, only the before image is logged, since there are no changed values to propagate following the deletion. When inserting a row, only the after image is logged, since there is no existing row to be matched. Only when updating a row are both the before and after images required, and both written to the binary log.

For the before image, it is necessary only that the minimum set of columns required to uniquely identify rows is logged. If the table containing the row has a primary key, then only the primary key column or columns are written to the binary log. Otherwise, if the table has a unique key all of whose columns are NOT NULL, then only the columns in the unique key need be logged. (If the table has neither a primary key nor a unique key without any NULL columns, then all columns must be used in
the before image, and logged.) In the after image, it is necessary to log only the columns which have actually changed.

You can cause the server to log full or minimal rows using the binlog_row_image system variable. This variable actually takes one of three possible values, as shown in the following list:
- full: Log all columns in both the before image and the after image.
- minimal: Log only those columns in the before image that are required to identify the row to be changed; log only those columns in the after image where a value was specified by the SQL statement, or generated by auto-increment.
- noblob: Log all columns (same as full), except for BLOB and TEXT columns that are not required to identify rows, or that have not changed.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3485.jpg?height=106&width=99&top_left_y=833&top_left_x=404)

\section*{Note}

This variable is not supported by NDB Cluster; setting it has no effect on the logging of NDB tables.

The default value is full.

\section*{Note}

If binlog_row_image is set to full on the source and minimal on the replica, the replica's binary log event contains the full row after-image, even if only one column value changes.

When using minimal or noblob, deletes and updates are guaranteed to work correctly for a given table if and only if the following conditions are true for both the source and destination tables:
- All columns must be present and in the same order; each column must use the same data type as its counterpart in the other table.
- The tables must have identical primary key definitions.
(In other words, the tables must be identical with the possible exception of indexes that are not part of the tables' primary keys.)

If these conditions are not met, it is possible that the primary key column values in the destination table may prove insufficient to provide a unique match for a delete or update. In this event, no warning or error is issued; the source and replica silently diverge, thus breaking consistency.

Setting this variable has no effect when the binary logging format is STATEMENT. When binlog_format is MIXED, the setting for binlog_row_image is applied to changes that are logged using row-based format, but this setting has no effect on changes logged as statements.

Setting binlog_row_image on either the global or session level does not cause an implicit commit; this means that this variable can be changed while a transaction is in progress without affecting the transaction.
- binlog_row_metadata

\begin{tabular}{|l|l|}
\hline Command-Line Format & --binlog-row-metadata=metadata_type \\
\hline System Variable & binlog_row_metadata \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Enumeration \\
\hline
\end{tabular}

Replication and Binary Logging Options and Variables

\begin{tabular}{|l|l|}
\hline Default Value & MINIMAL \\
\hline Valid Values & FULL (All metadata is included) \\
& MINIMAL (Limit included metadata) \\
\hline
\end{tabular}

Configures the amount of table metadata added to the binary log when using row-based logging. When set to MINIMAL, the default, only metadata related to SIGNED flags, column character set and geometry types are logged. When set to FULL complete metadata for tables is logged, such as column name, ENUM or SET string values, PRIMARY KEY information, and so on.

The extended metadata serves the following purposes:
- Replicas use the metadata to transfer data when its table structure is different from the source's.
- External software can use the metadata to decode row events and store the data into external databases, such as a data warehouse.
- binlog_row_value_options

\begin{tabular}{|l|l|}
\hline Command-Line Format & --binlog-row-value-options=\# \\
\hline System Variable & binlog_row_value_options \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Set \\
\hline Default Value & \\
\hline Valid Values & PARTIAL_JSON \\
\hline
\end{tabular}

When set to PARTIAL_JSON, this enables use of a space-efficient binary log format for updates that modify only a small portion of a JSON document, which causes row-based replication to write only the modified parts of the JSON document to the after-image for the update in the binary log, rather than writing the full document (see Partial Updates of JSON Values). This works for an UPDATE statement which modifies a JSON column using any sequence of JSON_SET( ), JSON_REPLACE( ), and JSON_REMOVE( ). If the server is unable to generate a partial update, the full document is used instead.

The default value is an empty string, which disables use of the format. To unset binlog_row_value_options and revert to writing the full JSON document, set its value to the empty string.

Setting the session value of this system variable is a restricted operation. The session user must have privileges sufficient to set restricted session variables. See Section 7.1.9.1, "System Variable Privileges".
binlog_row_value_options=PARTIAL_JSON takes effect only when binary logging is enabled and binlog_format is set to ROW or MIXED. Statement-based replication always logs only the modified parts of the JSON document, regardless of any value set for binlog_row_value_options. To maximize the amount of space saved, use binlog_row_image=NOBLOB or binlog_row_image=MINIMAL together with this option.
binlog_row_image=FULL saves less space than either of these, since the full JSON document is stored in the before-image, and the partial update is stored only in the after-image.
mysqlbinlog output includes partial JSON updates in the form of events encoded as base-64 strings using BINLOG statements. If the --verbose option is specified, mysqlbinlog displays the partial JSON updates as readable JSON using pseudo-SQL statements.

MySQL Replication generates an error if a modification cannot be applied to the JSON document on the replica. This includes a failure to find the path. Be aware that, even with this and other safety checks, if a JSON document on a replica has diverged from that on the source and a partial update is applied, it remains theoretically possible to produce a valid but unexpected JSON document on the replica.
- binlog_rows_query_log_events

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - binlog - rows - query-logevents[=\{OFF|ON\}] \\
\hline System Variable & binlog_rows_query_log_events \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & 0FF \\
\hline
\end{tabular}

This system variable affects row-based logging only. When enabled, it causes the server to write informational log events such as row query log events into its binary log. This information can be used for debugging and related purposes, such as obtaining the original query issued on the source when it cannot be reconstructed from the row updates.

Setting the session value of this system variable is a restricted operation. The session user must have privileges sufficient to set restricted session variables. See Section 7.1.9.1, "System Variable Privileges".

These informational events are normally ignored by MySQL programs reading the binary log and so cause no issues when replicating or restoring from backup. To view them, increase the verbosity level by using mysqlbinlog's - -verbose option twice, either as -vv or - -verbose - -verbose.
- binlog_stmt_cache_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --binlog-stmt-cache-size=\# \\
\hline System Variable & binlog_stmt_cache_size \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 32768 \\
\hline Minimum Value & 4096 \\
\hline Maximum Value (64-bit platforms) & 18446744073709547520 \\
\hline Maximum Value (32-bit platforms) & 4294963200 \\
\hline Unit & bytes \\
\hline
\end{tabular}

The size of the memory buffer for the binary log to hold nontransactional statements issued during a transaction.

When binary logging is enabled on the server (with the log_bin system variable set to ON), separate binary log transaction and statement caches are allocated for each client if the server supports any transactional storage engines. If the data for the nontransactional statements used in the transaction exceeds the space in the memory buffer, the excess data is stored in a temporary file. When binary log encryption is active on the server, the memory buffer is not encrypted, but any temporary file used to hold the binary log cache is encrypted. After each transaction is committed, the binary log statement cache is reset by clearing the memory buffer and truncating the temporary file if used.

If you often use large nontransactional statements during transactions, you can increase this cache size to get better performance by reducing or eliminating the need to write to temporary files. The Binlog_stmt_cache_use and Binlog_stmt_cache_disk_use status variables can be useful for tuning the size of this variable. See Section 7.4.4, "The Binary Log".

The binlog_cache_size system variable sets the size for the transaction cache.
- binlog_transaction_compression

\begin{tabular}{|l|l|}
\hline Command-Line Format & --binlog-transactioncompression[=\{OFF|ON\}] \\
\hline System Variable & binlog_transaction_compression \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & 0FF \\
\hline
\end{tabular}

Enables compression for transactions that are written to binary log files on this server. OFF is the default. Use the binlog_transaction_compression_level_zstd system variable to set the level for the zstd algorithm that is used for compression.

Setting binlog_transaction_compression has no immediate effect but rather applies to all subsequent START REPLICA statements.

When binary log transaction compression is enabled, transaction payloads are compressed and then written to the binary log file as a single event (Transaction_payload_event). Compressed transaction payloads remain in a compressed state while they are sent in the replication stream to replicas, other Group Replication group members, or clients such as mysqlbinlog, and are written to the relay log still in their compressed state. Binary log transaction compression therefore saves storage space both on the originator of the transaction and on the recipient (and for their backups), and saves network bandwidth when the transactions are sent between server instances.

For binlog_transaction_compression=ON to have a direct effect, binary logging must be enabled on the server. When a MySQL 8.4 server instance has no binary log, it can receive, handle, and display compressed transaction payloads regardless of its value for binlog_transaction_compression. Compressed transaction payloads received by such server instances are written in their compressed state to the relay log, so they benefit indirectly from compression carried out by other servers in the replication topology.

This system variable cannot be changed within the context of a transaction. Setting the session value of this system variable is a restricted operation. The session user must have privileges sufficient to set restricted session variables. See Section 7.1.9.1, "System Variable Privileges".

For more information on binary log transaction compression, including details of what events are and are not compressed, and changes in behavior when transaction compression is in use, see Section 7.4.4.5, "Binary Log Transaction Compression".

You can use the ndb_log_transaction_compression system variable to enable this feature for NDB. In addition, setting--binlog-transaction-compression=ON on the command line or in a my.cnf file causes ndb_log_transaction_compression to be enabled on server startup. See the description of the variable for further information.
- binlog_transaction_compression_level_zstd

\begin{tabular}{|l|l|l|}
\hline Command-Line Format & --binlog-transaction-compression-level-zstd=\# & \\
\hline System Variable & binlog_transaction_compression_level_zstd & \\
\hline Scope & Global, Session & \\
\hline Dynamic & Yes & \\
\hline SET_VAR Hint Applies & No & \\
\hline Type & Integer & \\
\hline Default Value & 3 & \\
\hline Minimum Value & 1 & \\
\hline Maximum Value & 22 & \\
\hline
\end{tabular}

Sets the compression level for binary log transaction compression on this server, which is enabled by the binlog_transaction_compression system variable. The value is an integer that determines the compression effort, from 1 (the lowest effort) to 22 (the highest effort). If you do not specify this system variable, the compression level is set to 3 .

Setting binlog_transaction_compression_level_zstd has no immediate effect but rather applies to all subsequent START REPLICA statements.

As the compression level increases, the data compression ratio increases, which reduces the storage space and network bandwidth required for the transaction payload. However, the effort required for data compression also increases, taking time and CPU and memory resources on the originating server. Increases in the compression effort do not have a linear relationship to increases in the data compression ratio.

This system variable cannot be changed within the context of a transaction. Setting the session value of this system variable is a restricted operation. The session user must have privileges sufficient to set restricted session variables. See Section 7.1.9.1, "System Variable Privileges".

This variable has no effect on logging of transactions on NDB tables; use ndb_log_transaction_compression_level_zstd instead.
- binlog_transaction_dependency_history_size

\begin{tabular}{|l|l|l|}
\hline Command-Line Format & --binlog-transaction-dependency-history-size=\# & \\
\hline System Variable & binlog_transaction_dependency_history_size & \\
\hline Scope & Global & \\
\hline Dynamic & Yes & \\
\hline SET_VAR Hint Applies & No & \\
\hline Type & Integer & \\
\hline Default Value & 25000 & \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Minimum Value & 1 \\
\hline Maximum Value & 1000000 \\
\hline
\end{tabular}

Sets an upper limit on the number of row hashes which are kept in memory and used for looking up the transaction that last modified a given row. Once this number of hashes has been reached, the history is purged.
- log_bin

\begin{tabular}{|l|l|}
\hline System Variable & log_bin \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline
\end{tabular}

Shows the status of binary logging on the server, either enabled (ON) or disabled (OFF). With binary logging enabled, the server logs all statements that change data to the binary log, which is used for backup and replication. ON means that the binary log is available, OFF means that it is not in use. The --log-bin option can be used to specify a base name and location for the binary log.

In earlier MySQL versions, binary logging was disabled by default, and was enabled if you specified the --log-bin option. Binary logging is enabled by default, with the log_bin system variable set to 0 N , whether or not you specify the --log-bin option. The exception is if you use mysqld to initialize the data directory manually by invoking it with the --initialize or --initializeinsecure option, when binary logging is disabled by default. It is possible to enable binary logging in this case by specifying the --log-bin option.

If the--skip-log-bin or--disable-log-bin option is specified at startup, binary logging is disabled, with the log_bin system variable set to OFF. If either of these options is specified and -log-bin is also specified, the option specified later takes precedence.

For information on the format and management of the binary log, see Section 7.4.4, "The Binary Log".
- log_bin_basename

\begin{tabular}{|l|l|}
\hline System Variable & log_bin_basename \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & File name \\
\hline
\end{tabular}

Holds the base name and path for the binary log files, which can be set with the --log-bin server option. The maximum variable length is 256 . In MySQL 8.4, if the --log-bin option is not supplied, the default base name is binlog. For compatibility with MySQL 5.7, if the --log-bin option is supplied with no string or with an empty string, the default base name is host_name-bin, using the name of the host machine. The default location is the data directory.
- log_bin_index

\begin{tabular}{|l|l|l|}
\hline \multirow{3}{*}{} & Command-Line Format & --log-bin-index=file_name \\
\hline & System Variable & log_bin_index \\
\hline & Scope & Global \\
\hline 3460 & Dynamic & No \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
SET_VAR Hint Applies & No \\
\hline Type & File name \\
\hline
\end{tabular}

Holds the base name and path for the binary log index file, which can be set with the --log-binindex server option. The maximum variable length is 256 .
- log_bin_trust_function_creators

\begin{tabular}{|l|l|}
\hline Command-Line Format & --log-bin-trust-functioncreators[=\{OFF|ON\}] \\
\hline Deprecated & Yes \\
\hline System Variable & log_bin_trust_function_creators \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

This variable applies when binary logging is enabled. It controls whether stored function creators can be trusted not to create stored functions that may cause unsafe events to be written to the binary log. If set to 0 (the default), users are not permitted to create or alter stored functions unless they have the SUPER privilege in addition to the CREATE ROUTINE or ALTER ROUTINE privilege. A setting of 0 also enforces the restriction that a function must be declared with the DETERMINISTIC characteristic, or with the READS SQL DATA or NO SQL characteristic. If the variable is set to 1 , MySQL does not enforce these restrictions on stored function creation. This variable also applies to trigger creation. See Section 27.7, "Stored Program Binary Logging".
- log_replica_updates

\begin{tabular}{|l|l|}
\hline Command-Line Format & --log-replica-updates[=\{OFF|ON\}] \\
\hline System Variable & log_replica_updates \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & ON \\
\hline
\end{tabular}
log_replica_updates specifies whether updates received by a replica server from a replication source server should be logged to the replica's own binary log.

Enabling this variable causes the replica to write the updates that are received from a source and performed by the replication SQL thread to the replica's own binary log. Binary logging, which is controlled by the--log-bin option and is enabled by default, must also be enabled on the replica for updates to be logged. See Section 19.1.6, "Replication and Binary Logging Options and Variables". log_replica_updates is enabled by default, unless you specify - -skip-log-bin to disable binary logging, in which case MySQL also disables replica update logging by default. If you
need to disable replica update logging when binary logging is enabled, specify --log-replicaupdates $=0 \mathrm{FF}$ at replica server startup.

Enabling log_replica_updates enables replication servers to be chained. For example, you might want to set up replication servers using this arrangement:

A -> B -> C

Here, A serves as the source for the replica B, and B serves as the source for the replica C. For this to work, B must be both a source and a replica. With binary logging enabled and log_replica_updates enabled, which are the default settings, updates received from A are logged by B to its binary log, and can therefore be passed on to C .
- log_slave_updates

\begin{tabular}{|l|l|}
\hline Command-Line Format & --log-slave-updates[=\{OFF|ON\}] \\
\hline Deprecated & Yes \\
\hline System Variable & log_slave_updates \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & ON \\
\hline
\end{tabular}

Deprecated alias for log_replica_updates.
- log_statements_unsafe_for_binlog

\begin{tabular}{|l|l|}
\hline Command-Line Format & --log-statements-unsafe-forbinlog[=\{OFF|ON\}] \\
\hline Deprecated & Yes \\
\hline System Variable & log_statements_unsafe_for_binlog \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & ON \\
\hline
\end{tabular}

If error 1592 is encountered, controls whether the generated warnings are added to the error log or not.
- master_verify_checksum

\begin{tabular}{|l|l|}
\hline Command-Line Format & --master-verify-checksum[=\{OFF|ON\}] \\
\hline Deprecated & Yes \\
\hline System Variable & master_verify_checksum \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Default Value & OFF \\
\hline
\end{tabular}

Deprecated alias for source_verify_checksum.
- max_binlog_cache_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --max-binlog-cache-size=\# \\
\hline System Variable & max_binlog_cache_size \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value (64-bit platforms) & 18446744073709547520 \\
\hline Default Value (32-bit platforms) & 4294967295 \\
\hline Minimum Value & 4096 \\
\hline Maximum Value (64-bit platforms) & 18446744073709547520 \\
\hline Maximum Value (32-bit platforms) & 4294967295 \\
\hline Unit & bytes \\
\hline Block Size & 4096 \\
\hline
\end{tabular}

If a transaction requires more than this many bytes, the server generates a Multi-statement transaction required more than 'max_binlog_cache_size' bytes of storage error. When gtid_mode is not 0 N , the maximum recommended value is 4 GB , due to the fact that, in this case, MySQL cannot work with binary log positions greater than 4 GB ; when gtid_mode is ON, this limitation does not apply, and the server can work with binary log positions of arbitrary size.

If, because gtid_mode is not ON, or for some other reason, you need to guarantee that the binary log does not exceed a given size maxsize, you should set this variable according to the formula shown here:
```
max_binlog_cache_size <
    (((maxsize - max_binlog_size) / max_connections) - 1000) / 1.2
```


This calculation takes into account the following conditions:
- The server writes to the binary log as long as the size before it begins to write is less than max_binlog_size.
- The server does not write single transactions, but rather groups of transactions. The maximum possible number of transactions in a group is equal to max_connections.
- The server writes data that is not included in the cache. This includes a 4-byte checksum for each event; while this adds less than $20 \%$ to the transaction size, this amount is non-negible. In addition, the server writes a Gtid_log_event for each transaction; each of these events can add another 1 KB to what is written to the binary log.
max_binlog_cache_size sets the size for the transaction cache only; the upper limit for the statement cache is governed by the max_binlog_stmt_cache_size system variable.

The visibility to sessions of max_binlog_cache_size matches that of the binlog_cache_size system variable; in other words, changing its value affects only new sessions that are started after the value is changed.
- max_binlog_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --max-binlog-size=\# \\
\hline System Variable & max_binlog_size \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 1073741824 \\
\hline Minimum Value & 4096 \\
\hline Maximum Value & 1073741824 \\
\hline Unit & bytes \\
\hline Block Size & 4096 \\
\hline
\end{tabular}

If a write to the binary log causes the current log file size to exceed the value of this variable, the server rotates the binary logs (closes the current file and opens the next one). The minimum value is 4096 bytes. The maximum and default value is 1 GB . Encrypted binary log files have an additional 512-byte header, which is included in max_binlog_size.

A transaction is written in one chunk to the binary log, so it is never split between several binary logs. Therefore, if you have big transactions, you might see binary log files larger than max_binlog_size.

If max_relay_log_size is 0 , the value of max_binlog_size applies to relay logs as well.
With GTIDs in use on the server, when max_binlog_size is reached, if the system table mysql.gtid_executed cannot be accessed to write the GTIDs from the current binary log file, the binary log cannot be rotated. In this situation, the server responds according to its binlog_error_action setting. If IGNORE_ERROR is set, an error is logged on the server and binary logging is halted, or if ABORT_SERVER is set, the server shuts down.
- max_binlog_stmt_cache_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --max-binlog-stmt-cache-size=\# \\
\hline System Variable & max_binlog_stmt_cache_size \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 18446744073709547520 \\
\hline Minimum Value & 4096 \\
\hline Maximum Value & 18446744073709547520 \\
\hline Unit & bytes \\
\hline Block Size & 4096 \\
\hline
\end{tabular}

If nontransactional statements within a transaction require more than this many bytes of memory, the server generates an error. The minimum value is 4096 . The maximum and default values are 4 GB on 32-bit platforms and 16EB (exabytes) on 64-bit platforms.
max_binlog_stmt_cache_size sets the size for the statement cache only; the upper limit for the transaction cache is governed exclusively by the max_binlog_cache_size system variable.
- original_commit_timestamp

\begin{tabular}{|l|l|}
\hline System Variable & original_commit_timestamp \\
\hline Scope & Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Numeric \\
\hline
\end{tabular}

For internal use by replication. When re-executing a transaction on a replica, this is set to the time when the transaction was committed on the original source, measured in microseconds since the epoch. This allows the original commit timestamp to be propagated throughout a replication topology.

Setting the session value of this system variable is a restricted operation. The session user must have either the REPLICATION_APPLIER privilege (see Section 19.3.3, "Replication Privilege Checks"), or privileges sufficient to set restricted session variables (see Section 7.1.9.1, "System Variable Privileges"). However, note that the variable is not intended for users to set; it is set automatically by the replication infrastructure.
- source_verify_checksum

\begin{tabular}{|l|l|}
\hline Command-Line Format & --source-verify-checksum[=\{OFF|ON\}] \\
\hline System Variable & source_verify_checksum \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & 0FF \\
\hline
\end{tabular}

Enabling source_verify_checksum causes the source to verify events read from the binary log by examining checksums, and to stop with an error in the event of a mismatch. source_verify_checksum is disabled by default; in this case, the source uses the event length from the binary log to verify events, so that only complete events are read from the binary log.
- sql_log_bin

\begin{tabular}{|l|l|}
\hline System Variable & sql_log_bin \\
\hline Scope & Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline
\end{tabular}

Default Value
ON
This variable controls whether logging to the binary log is enabled for the current session (assuming that the binary log itself is enabled). The default value is ON. To disable or enable binary logging for the current session, set the session sql_log_bin variable to OFF or ON.

Set this variable to OFF for a session to temporarily disable binary logging while making changes to the source you do not want replicated to the replica.

Setting the session value of this system variable is a restricted operation. The session user must have privileges sufficient to set restricted session variables. See Section 7.1.9.1, "System Variable Privileges".

It is not possible to set the session value of sql_log_bin within a transaction or subquery.
Setting this variable to OFF prevents GTIDs from being assigned to transactions in the binary log. If you are using GTIDs for replication, this means that even when binary logging is later enabled again, the GTIDs written into the log from this point do not account for any transactions that occurred in the meantime, so in effect those transactions are lost.
- sync_binlog

\begin{tabular}{|l|l|}
\hline Command-Line Format & --sync-binlog=\# \\
\hline System Variable & sync_binlog \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 1 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 4294967295 \\
\hline
\end{tabular}

Controls how often the MySQL server synchronizes the binary log to disk.
- sync_binlog=0: Disables synchronization of the binary log to disk by the MySQL server. Instead, the MySQL server relies on the operating system to flush the binary log to disk from time to time as it does for any other file. This setting provides the best performance, but in the event of a power failure or operating system crash, it is possible that the server has committed transactions that have not been synchronized to the binary log.
- sync_binlog=1: Enables synchronization of the binary log to disk before transactions are committed. This is the safest setting but can have a negative impact on performance due to the increased number of disk writes. In the event of a power failure or operating system crash, transactions that are missing from the binary log are only in a prepared state. This permits the automatic recovery routine to roll back the transactions, which guarantees that no transaction is lost from the binary log.
- sync_binlog $=N$, where $N$ is a value other than 0 or 1 : The binary $\log$ is synchronized to disk after N binary log commit groups have been collected. In the event of a power failure or operating system crash, it is possible that the server has committed transactions that have not been flushed to the binary log. This setting can have a negative impact on performance due to the increased
number of disk writes. A higher value improves performance, but with an increased risk of data loss.

For the greatest possible durability and consistency in a replication setup that uses InnoDB with transactions, use these settings:
- sync_binlog=1.
- innodb_flush_log_at_trx_commit=1.

\section*{Caution}

Many operating systems and some disk hardware fool the flush-to-disk operation. They may tell mysqld that the flush has taken place, even though it has not. In this case, the durability of transactions is not guaranteed even with the recommended settings, and in the worst case, a power outage can corrupt InnoDB data. Using a battery-backed disk cache in the SCSI disk controller or in the disk itself speeds up file flushes, and makes the operation safer. You can also try to disable the caching of disk writes in hardware caches.

\subsection*{19.1.6.5 Global Transaction ID System Variables}

The MySQL Server system variables described in this section are used to monitor and control Global Transaction Identifiers (GTIDs). For additional information, see Section 19.1.3, "Replication with Global Transaction Identifiers".
- binlog_gtid_simple_recovery

\begin{tabular}{|l|l|}
\hline Command-Line Format & --binlog-gtid-simple-recovery[=\{OFF| ON\}] \\
\hline System Variable & binlog_gtid_simple_recovery \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & ON \\
\hline
\end{tabular}

This variable controls how binary log files are iterated during the search for GTIDs when MySQL starts or restarts.

When binlog_gtid_simple_recovery=TRUE (the default), the values of gtid_executed and gtid_purged are computed at startup based on the values of Previous_gtids_log_event in the most recent and oldest binary log files. For a description of the computation, see The gtid_purged System Variable. This setting accesses only two binary log files during server restart. If all binary logs on the server were generated using MySQL 5.7.8 or later, binlog_gtid_simple_recovery=TRUE can always safely be used.

If any binary logs from MySQL 5.7.7 or older are present on the server (for example, following an upgrade of an older server to MySQL 8.4), with binlog_gtid_simple_recovery=TRUE, gtid_executed and gtid_purged might be initialized incorrectly in the following two situations:
- The newest binary log was generated by MySQL 5.7 .5 or earlier, and gtid_mode was ON for some binary logs but 0FF for the newest binary log.
- A SET @@GLOBAL.gtid_purged statement was issued on MySQL 5.7.7 or earlier, and the binary log that was active at the time of the SET @@GLOBAL.gtid_purged statement has not yet been purged.

If an incorrect GTID set is computed in either situation, it remains incorrect even if the server is later restarted with binlog_gtid_simple_recovery=FALSE. If either of these situations apply or might apply on the server, set binlog_gtid_simple_recovery=FALSE before starting or restarting the server.

When binlog_gtid_simple_recovery=FALSE is set, the method of computing gtid_executed and gtid_purged as described in The gtid_purged System Variable is changed to iterate the binary log files as follows:
- Instead of using the value of Previous_gtids_log_event and GTID log events from the newest binary log file, the computation for gtid_executed iterates from the newest binary log file, and uses the value of Previous_gtids_log_event and any GTID log events from the first binary log file where it finds a Previous_gtids_log_event value. If the server's most recent binary log files do not have GTID log events, for example if gtid_mode=0N was used but the server was later changed to gtid_mode=0FF, this process can take a long time.
- Instead of using the value of Previous_gtids_log_event from the oldest binary log file, the computation for gtid_purged iterates from the oldest binary log file, and uses the value of Previous_gtids_log_event from the first binary log file where it finds either a nonempty Previous_gtids_log_event value, or at least one GTID log event (indicating that the use of GTIDs starts at that point). If the server's older binary log files do not have GTID log events, for example if gtid_mode=0N was only set recently on the server, this process can take a long time.
- enforce_gtid_consistency

\begin{tabular}{|l|l|}
\hline Command-Line Format & --enforce-gtid-consistency[=value] \\
\hline System Variable & enforce_gtid_consistency \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Enumeration \\
\hline Default Value & OFF \\
\hline Valid Values & \begin{tabular}{l}
OFF \\
ON \\
WARN
\end{tabular} \\
\hline
\end{tabular}

Depending on the value of this variable, the server enforces GTID consistency by allowing execution of only statements that can be safely logged using a GTID. You must set this variable to ON before enabling GTID based replication.

The values that enforce_gtid_consistency can be configured to are:
- OFF: all transactions are allowed to violate GTID consistency.
- ON: no transaction is allowed to violate GTID consistency.
- WARN: all transactions are allowed to violate GTID consistency, but a warning is generated in this case.
--enforce-gtid-consistency only takes effect if binary logging takes place for a statement. If binary logging is disabled on the server, or if statements are not written to the binary log because
they are removed by a filter, GTID consistency is not checked or enforced for the statements that are not logged.

Only statements that can be logged using GTID safe statements can be logged when enforce_gtid_consistency is set to ON, so the operations listed here cannot be used with this option:
- CREATE TEMPORARY TABLE or DROP TEMPORARY TABLE statements inside transactions.
- Transactions or statements that update both transactional and nontransactional tables. There is an exception that nontransactional DML is allowed in the same transaction or in the same statement as transactional DML, if all nontransactional tables are temporary.
- CREATE TABLE ... SELECT statements are supported for storage engines that support atomic DDL.

For more information, see Section 19.1.3.7, "Restrictions on Replication with GTIDs".
Prior to MySQL 5.7 and in early releases in that release series, the boolean enforce_gtid_consistency defaulted to OFF. To maintain compatibility with these earlier releases, the enumeration defaults to OFF, and setting--enforce-gtid-consistency without a value is interpreted as setting the value to 0 N . The variable also has multiple textual aliases for the values: $0=0 \mathrm{FF}=\mathrm{FALSE}, 1=0 \mathrm{~N}=\mathrm{TRUE}, 2=$ WARN. This differs from other enumeration types but maintains compatibility with the boolean type used in previous releases. These changes impact on what is returned by the variable. Using SELECT @@ENFORCE_GTID_CONSISTENCY, SHOW VARIABLES LIKE 'ENFORCE_GTID_CONSISTENCY', and SELECT * FROM INFORMATION_SCHEMA.VARIABLES WHERE 'VARIABLE_NAME' = 'ENFORCE_GTID_CONSISTENCY', all return the textual form, not the numeric form. This is an incompatible change, since @@ENFORCE_GTID_CONSISTENCY returns the numeric form for booleans but returns the textual form for SHOW and the Information Schema.
- gtid_executed

\begin{tabular}{|l|l|}
\hline System Variable & gtid_executed \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Unit & set of GTIDs \\
\hline
\end{tabular}

When used with global scope, this variable contains a representation of the set of all transactions executed on the server and GTIDs that have been set by a SET gtid_purged statement. This is the same as the value of the Executed_Gtid_Set column in the output of SHOW BINARY LOG STATUS and SHOW REPLICA STATUS. The value of this variable is a GTID set, see GTID Sets for more information.

When the server starts, @@GLOBAL.gtid_executed is initialized. See binlog_gtid_simple_recovery for more information on how binary logs are iterated to populate gtid_executed. GTIDs are then added to the set as transactions are executed, or if any SET gtid_purged statement is executed.

The set of transactions that can be found in the binary logs at any given time is equal to GTID_SUBTRACT(@@GLOBAL.gtid_executed, @@GLOBAL.gtid_purged); that is, to all transactions in the binary log that have not yet been purged.

Issuing RESET BINARY LOGS AND GTIDS causes this variable to be reset to an empty string. GTIDs are not otherwise removed from this set other than when the set is cleared due to RESET BINARY LOGS AND GTIDS.
- gtid_executed_compression_period

\begin{tabular}{|l|l|}
\hline Command-Line Format & --gtid-executed-compression-period=\# \\
\hline System Variable & gtid_executed_compression_period \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 4294967295 \\
\hline
\end{tabular}

Compress the mysql.gtid_executed table each time this many transactions have been processed. When binary logging is enabled on the server, this compression method is not used, and instead the mysql.gtid_executed table is compressed on each binary log rotation. When binary logging is disabled on the server, the compression thread sleeps until the specified number of transactions have been executed, then wakes up to perform compression of the mysql.gtid_executed table. Setting the value of this system variable to 0 means that the thread never wakes up, so this explicit compression method is not used. Instead, compression occurs implicitly as required.

InnoDB transactions are written to the mysql.gtid_executed table by a separate process to non-InnoDB transactions. If the server has a mix of InnoDB transactions and non-InnoDB transactions, the compression controlled by this system variable interferes with the work of this process and can slow it significantly. For this reason, from that release it is recommended that you set gtid_executed_compression_period to 0 .

All transactions (regardless of storage engine) are written to the mysql.gtid_executed table by the same process, and the gtid_executed_compression_period default value is 0 .

See mysql.gtid_executed Table Compression for more information.
- gtid_mode

\begin{tabular}{|l|l|}
\hline Command-Line Format & --gtid-mode=MODE \\
\hline System Variable & gtid_mode \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Enumeration \\
\hline Default Value & OFF \\
\hline Valid Values & \begin{tabular}{l}
OFF \\
OFF_PERMISSIVE \\
ON_PERMISSIVE \\
ON
\end{tabular} \\
\hline
\end{tabular}

Controls whether GTID based logging is enabled and what type of transactions the logs can contain. You must have privileges sufficient to set global system variables. See Section 7.1.9.1, "System Variable Privileges". enforce_gtid_consistency must be set to ON before you can
set gtid_mode=ON. Before modifying this variable, see Section 19.1.4, "Changing GTID Mode on Online Servers".

Logged transactions can be either anonymous or use GTIDs. Anonymous transactions rely on binary log file and position to identify specific transactions. GTID transactions have a unique identifier that is used to refer to transactions. The different modes are:
- OFF: Both new and replicated transactions must be anonymous.
- OFF_PERMISSIVE: New transactions are anonymous. Replicated transactions can be either anonymous or GTID transactions.
- ON_PERMISSIVE: New transactions are GTID transactions. Replicated transactions can be either anonymous or GTID transactions.
- ON: Both new and replicated transactions must be GTID transactions.

Changes from one value to another can only be one step at a time. For example, if gtid_mode is currently set to OFF_PERMISSIVE, it is possible to change to OFF or ON_PERMISSIVE but not to ON.

The values of gtid_purged and gtid_executed are persistent regardless of the value of gtid_mode. Therefore even after changing the value of gtid_mode, these variables contain the correct values.
- gtid_next

\begin{tabular}{|l|l|}
\hline System Variable & gtid_next \\
\hline Scope & Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Enumeration \\
\hline Default Value & AUTOMATIC \\
\hline Valid Values & \begin{tabular}{l}
AUTOMATIC \\
AUTOMATIC: <TAG> \\
ANONYMOUS \\
<UUID>:<NUMBER> \\
<UUID>:<TAG>:<NUMBER>
\end{tabular} \\
\hline
\end{tabular}

This variable is used to specify whether and how to otain the next GTID (see Section 19.1.3, "Replication with Global Transaction Identifiers").

Setting the session value of this system variable is a restricted operation. The session user must have either the REPLICATION_APPLIER privilege (see Section 19.3.3, "Replication Privilege Checks"), or privileges sufficient to set restricted session variables (see Section 7.1.9.1, "System Variable Privileges").
gtid_next can take any of the following values:
- AUTOMATIC: Use the next automatically-generated global transaction ID.
- AUTOMATIC : TAG: Use the next automatically-generated global transaction ID, with the addition of a user-specified tag, in UUID:TAG:NUMBER format.

The tag must match the regular expression [ : space : ] [a-zA-Z_] [a-zA-Z0-9_] \{0,31\} [: space:]; in other words, it must conform to the following rules:
- The tag must consist of $1-32$ characters (inclusive).
- The first character can be any letter a through z in uppercase or lowercase, or an underscore (_).
- Each of the remaining characters can be any of the letters a through z in uppercase or lowercase, the digits 0 through 9 , or an underscore (_).
- Leading and trailing blank spaces are accepted in the input value but omitted during tag creation.

Setting gtid_next on the replication source to AUTOMATIC : TAG or UUID: TAG : NUMBER requires the TRANSACTION_GTID_TAG privilege plus at least one of the privileges SYSTEM_VARIABLES_ADMIN, SESSION_VARIABLES_ADMIN, or REPLICATION_APPLIER. For the REPLICATION_CHECKS_APPLIER this privilege is also required to set gtid_next to either of these values, in addition to the REPLICATION_APPLIER privilege; these privileges are checked when starting the replication applier thread.
- ANONYMOUS: Transactions do not have global identifiers, and are identified by file and position only.
- A global transaction ID in either of the formats UUID:NUMBER or UUID:TAG:NUMBER.

Exactly which of the options just listed are valid depends on the setting of gtid_mode; see Section 19.1.4.1, "Replication Mode Concepts" for more information. Setting this variable has no effect if gtid_mode is OFF.

After this variable has been set to UUID: NUMBER or UUID: TAG: NUMBER, and a transaction has been committed or rolled back, an explicit SET gtid_next statement must again be issued before any other statement.

DROP TABLE or DROP TEMPORARY TABLE fails with an explicit error when used on a combination of nontemporary tables with temporary tables, or of temporary tables using transactional storage engines with temporary tables using nontransactional storage engines.

For more information, see The gtid_next System Variable, as well as Section 19.1.4, "Changing GTID Mode on Online Servers".
- gtid_owned

\begin{tabular}{|l|l|}
\hline System Variable & gtid_owned \\
\hline Scope & Global, Session \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Unit & set of GTIDs \\
\hline
\end{tabular}

This read-only variable is primarily for internal use. Its contents depend on its scope.
- When used with global scope, gtid_owned holds a list of all the GTIDs that are currently in use on the server, with the IDs of the threads that own them. This variable is mainly useful for a multi-
threaded replica to check whether a transaction is already being applied on another thread. An applier thread takes ownership of a transaction's GTID all the time it is processing the transaction, so @@global.gtid_owned shows the GTID and owner for the duration of processing. When a transaction has been committed (or rolled back), the applier thread releases ownership of the GTID.
- When used with session scope, gtid_owned holds a single GTID that is currently in use by and owned by this session. This variable is mainly useful for testing and debugging the use of GTIDs when the client has explicitly assigned a GTID for the transaction by setting gtid_next. In this case, @@session.gtid_owned displays the GTID all the time the client is processing the transaction, until the transaction has been committed (or rolled back). When the client has finished processing the transaction, the variable is cleared. If gtid_next=AUTOMATIC is used for the session, gtid_owned is populated only briefly during the execution of the commit statement for the transaction, so it cannot be observed from the session concerned, although it is listed if @@global.gtid_owned is read at the right point. If you have a requirement to track the GTIDs that are handled by a client in a session, you can enable the session state tracker controlled by the session_track_gtids system variable.
- gtid_purged

\begin{tabular}{|l|l|}
\hline System Variable & gtid_purged \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Unit & set of GTIDs \\
\hline
\end{tabular}

The global value of the gtid_purged system variable (@@GLOBAL.gtid_purged) is a GTID set consisting of the GTIDs of all the transactions that have been committed on the server, but do not exist in any binary log file on the server. gtid_purged is a subset of gtid_executed. The following categories of GTIDs are in gtid_purged:
- GTIDs of replicated transactions that were committed with binary logging disabled on the replica.
- GTIDs of transactions that were written to a binary log file that has now been purged.
- GTIDs that were added explicitly to the set by the statement SET @@GLOBAL.gtid_purged.

When the server starts, the global value of gtid_purged is initialized to a set of GTIDs. For information on how this GTID set is computed, see The gtid_purged System Variable. If binary logs from MySQL 5.7.7 or older are present on the server, you might need to set binlog_gtid_simple_recovery=FALSE in the server's configuration file to produce the correct computation. See the description for binlog_gtid_simple_recovery for details of the situations in which this setting is needed.

You must have the TRANSACTION_GTID_TAG to set gtid_purged.
Issuing RESET BINARY LOGS AND GTIDS causes the value of gtid_purged to be reset to an empty string.

You can set the value of gtid_purged in order to record on the server that the transactions in a certain GTID set have been applied, although they do not exist in any binary log on the server. An
example use case for this action is when you are restoring a backup of one or more databases on a server, but you do not have the relevant binary logs containing the transactions on the server.

\section*{Important}

The maximum number of GTIDs available on a given server instance is equal to the number of non-negative values for a signed 64 -bit integer $\left(2^{63}-1\right)$. If you set the value of gtid_purged to a number that approaches this limit, subsequent commits can cause the server to run out of GTIDs and so take the action specified by binlog_error_action. A warning message is issued when the server approaches this limit.

There are two ways to set the value of gtid_purged. You can either replace the value of gtid_purged with a specified GTID set, or you can append a specified GTID set to the GTID set that is already held by gtid_purged.

If the server has no existing GTIDs, as in the case of an empty server that you are provisioning with a backup of an existing database, both methods have the same result. If you are restoring a backup that overlaps the transactions that are already on the server, for example replacing a corrupted table with a partial dump from the source made using mysqldump (which includes the GTIDs of all the transactions on the server, even though the dump is partial), use the first method of replacing the value of gtid_purged. If you are restoring a backup that is disjoint from the transactions that are already on the server, for example provisioning a multi-source replica using dumps from two different servers, use the second method of adding to the value of gtid_purged.
- To replace the value of gtid_purged with a specified GTID set, use the following statement:
```
SET @@GLOBAL.gtid_purged = 'gtid_set';
```


Group Replication must be stopped before changing the value of gtid_purged.
gtid_set must be a superset of the current value of gtid_purged, and must not intersect with gtid_subtract(gtid_executed, gtid_purged). In other words, the new GTID set must include any GTIDs that were already in gtid_purged, and must not include any GTIDs in gtid_executed that have not yet been purged. gtid_set also cannot include any GTIDs that are in @@global.gtid_owned, that is, the GTIDs for transactions that are currently being processed on the server.

The result is that the global value of gtid_purged is set equal to gtid_set, and the value of gtid_executed becomes the union of gtid_set and the previous value of gtid_executed.
- To append a specified GTID set to gtid_purged, use the following statement with a plus sign (+) before the GTID set:
```
SET @@GLOBAL.gtid_purged = '+gtid_set';
```

gtid_set must not intersect with the current value of gtid_executed. In other words, the new GTID set must not include any GTIDs in gtid_executed, including transactions that are already also in gtid_purged. gtid_set also cannot include any GTIDs that are in @@global.gtid_owned, that is, the GTIDs for transactions that are currently being processed on the server.

The result is that gtid_set is added to both gtid_executed and gtid_purged.

\section*{Note}

If any binary logs from MySQL 5.7.7 or older are present on the server (for example, following an upgrade of an older server to MySQL 8.4), after issuing a SET @@GLOBAL.gtid_purged statement, you might need to set binlog_gtid_simple_recovery=FALSE in the server configuration file before restarting the server; otherwise, gtid_purged can be computed
incorrectly. See the description for binlog_gtid_simple_recovery for details of the situations in which this setting is needed.

\subsection*{19.1.7 Common Replication Administration Tasks}

Once replication has been started it executes without requiring much regular administration. This section describes how to check the status of replication, how to pause a replica, and how to skip a failed transaction on a replica.

> Tip
> To deploy multiple instances of MySQL, you can use InnoDB Cluster which enables you to easily administer a group of MySQL server instances in MySQL Shell. InnoDB Cluster wraps MySQL Group Replication in a programmatic environment that enables you easily deploy a cluster of MySQL instances to achieve high availability. In addition, InnoDB Cluster interfaces seamlessly with MySQL Router, which enables your applications to connect to the cluster without writing your own failover process. For similar use cases that do not require high availability, however, you can use InnoDB ReplicaSet. Installation instructions for MySQL Shell can be found here.

\subsection*{19.1.7.1 Checking Replication Status}

The most common task when managing a replication process is to ensure that replication is taking place and that there have been no errors between the replica and the source.

The SHOW REPLICA STATUS statement, which you must execute on each replica, provides information about the configuration and status of the connection between the replica server and the source server. The MySQL Performance Schema contains replication tables that provide this information in a more accessible form. See Section 29.12.11, "Performance Schema Replication Tables".

The replication heartbeat information shown in the Performance Schema replication tables lets you check that the replication connection is active even if the source has not sent events to the replica recently. The source sends a heartbeat signal to a replica if there are no updates to, and no unsent events in, the binary log for a longer period than the heartbeat interval. The SOURCE_HEARTBEAT_PERIOD setting on the source (set by CHANGE REPLICATION SOURCE TO) specifies the frequency of the heartbeat, which defaults to half of the connection timeout interval for the replica (specified by the system variable replica_net_timeout. The replication_connection_status Performance Schema table shows when the most recent heartbeat signal was received by a replica, and how many heartbeat signals it has received.

You can use SHOW REPLICA STATUS to check on the status of an individual replica; this statement provides the information shown here:
```
mysql> SHOW REPLICA STATUS\G
*************************** 1. row ***************************************
            Replica_IO_State: Waiting for source to send event
                        Source_Host: 127.0.0.1
                        Source_User: root
                        Source_Port: 13000
                    Connect_Retry: 1
                Source_Log_File: master-bin.000001
        Read_Source_Log_Pos: 927
                    Relay_Log_File: slave-relay-bin.000002
                    Relay_Log_Pos: 1145
        elay_Source_Log_File: master-bin.000001
            Replica_IO_Running: Yes
        Replica_SQL_Running: Yes
                Replicate_Do_DB:
        Replicate_Ignore_DB:
            Replicate_Do_Table:
    Replicate_Ignore_Table:
```

```
            Replicate_Wild_Do_Table:
    Replicate_Wild_Ignore_Table:
                                            Last_Errno: 0
                                            Last_Error:
                                        Skip_Counter: 0
                        Exec_Source_Log_Pos: 927
                                Relay_Log_Space: 1355
                                Until_Condition: None
                                    Until_Log_File:
                                        Until_Log_Pos: 0
                        Source_SSL_Allowed: No
                        Source_SSL_CA_File:
                        Source_SSL_CA_Path:
                            Source_SSL_Cert:
                        Source_SSL_Cipher:
                                Source_SSL_Key:
                Seconds_Behind_Source: 0
Source_SSL_Verify_Server_Cert: No
                                        Last_IO_Errno: 0
                                    Last_IO_Error:
                                    Last_SQL_Errno: 0
                                Last_SQL_Error:
Replicate_Ignore_Server_Ids:
                                Source_Server_Id: 1
                                            Source_UUID: 73f86016-978b-11ee-ade5-8d2a2a562feb
                            Source_Info_File: mysql.slave_master_info
                                                SQL_Delay: 0
                    SQL_Remaining_Delay: NULL
    Replica_SQL_Running_State: Replica has read all relay log; waiting for more updates
                        Source_Retry_Count: 10
                                        Source_Bind:
        Last_IO_Error_Timestamp:
        Last_SQL_Error_Timestamp:
                                Source_SSL_Crl:
                        Source_SSL_Crlpath:
                    Retrieved_Gtid_Set: 73f86016-978b-11ee-ade5-8d2a2a562feb:1-3
                        Executed_Gtid_Set: 73f86016-978b-11ee-ade5-8d2a2a562feb:1-3
                                Auto_Position: 1
                Replicate_Rewrite_DB:
                                    Channel_Name:
                    Source_TLS_Version:
            Source_public_key_path:
                Get_Source_public_key: 0
                        Network_Namespace:
```


The key fields from the status report to examine are:
- Replica_IO_State: The current status of the replica. See Section 10.14.5, "Replication I/ O (Receiver) Thread States", and Section 10.14.6, "Replication SQL Thread States", for more information.
- Replica_IO_Running: Whether the I/O (receiver) thread for reading the source's binary log is running. Normally, you want this to be Yes unless you have not yet started replication or have explicitly stopped it with STOP REPLICA.
- Replica_SQL_Running: Whether the SQL thread for executing events in the relay log is running. As with the I/O thread, this should normally be Yes.
- Last_IO_Error, Last_SQL_Error: The last errors registered by the I/O (receiver) and SQL (applier) threads when processing the relay log. Ideally these should be blank, indicating no errors.
- Seconds_Behind_Source: The number of seconds that the replication SQL (applier) thread is behind processing the source binary log. A high number (or an increasing one) can indicate that the replica is unable to handle events from the source in a timely fashion.

A value of 0 for Seconds_Behind_Source can usually be interpreted as meaning that the replica has caught up with the source, but there are some cases where this is not strictly true. For example, this can occur if the network connection between source and replica is broken but the replication I/

O (receiver) thread has not yet noticed this; that is, the time period set by replica_net_timeout has not yet elapsed.

It is also possible that transient values for Seconds_Behind_Source may not reflect the situation accurately. When the replication SQL (applier) thread has caught up on I/O, Seconds_Behind_Source displays 0; but when the replication I/O (receiver) thread is still queuing up a new event, Seconds_Behind_Source may show a large value until the replication applier thread finishes executing the new event. This is especially likely when the events have old timestamps; in such cases, if you execute SHOW REPLICA STATUS several times in a relatively short period, you may see this value change back and forth repeatedly between 0 and a relatively large value.

Several pairs of fields provide information about the progress of the replica in reading events from the source binary log and processing them in the relay log:
- (Master_Log_file, Read_Master_Log_Pos): Coordinates in the source binary log indicating how far the replication I/O (receiver) thread has read events from that log.
- (Relay_Master_Log_File, Exec_Master_Log_Pos): Coordinates in the source binary log indicating how far the replication SQL (applier) thread has executed events received from that log.
- (Relay_Log_File, Relay_Log_Pos): Coordinates in the replica relay log indicating how far the replication SQL (applier) thread has executed the relay log. These correspond to the preceding coordinates, but are expressed in replica relay log coordinates rather than source binary log coordinates.

On the source, you can check the status of connected replicas using SHOW PROCESSLIST to examine the list of running processes. Replica connections have Binlog Dump in the Command field:
```
mysql> SHOW PROCESSLIST \G;
************************* 4. row *******************************
            Id: 10
        User: root
        Host: replica1:58371
            db: NULL
Command: Binlog Dump
        Time: 777
    State: Has sent all binlog to slave; waiting for binlog to be updated
        Info: NULL
```


Because it is the replica that drives the replication process, very little information is available in this report.

For replicas that were started with the --report-host option and are connected to the source, the SHOW REPLICAS statement on the source shows basic information about the replicas. The output includes the ID of the replica server, the value of the --report-host option, the connecting port, and source ID:
```
mysql> SHOW REPLICAS;
+------------+----------+------+------------------+------------
| Server_id | Host | Port | Rpl_recovery_rank | Source_id |
+------------+----------+------+------------------+------------
| 10 | replica1 | 3306 | 0 | 1 |
+------------+----------+------+------------------+-----------+
1 row in set (0.00 sec)
```


\subsection*{19.1.7.2 Pausing Replication on the Replica}

You can stop and start replication on the replica using the STOP REPLICA and START REPLICA statements.

To stop processing of the binary log from the source, use STOP REPLICA:
```
mysql> STOP REPLICA;
```


When replication is stopped, the replication I/O (receiver) thread stops reading events from the source binary log and writing them to the relay log, and the SQL thread stops reading events from the relay log and executing them. You can pause the I/O (receiver) or SQL (applier) thread individually by specifying the thread type:
```
mysql> STOP REPLICA IO_THREAD;
mysql> STOP REPLICA SQL_THREAD;
```


To start execution again, use the START REPLICA statement:
```
mysql> START REPLICA;
```


To start a particular thread, specify the thread type:
```
mysql> START REPLICA IO_THREAD;
mysql> START REPLICA SQL_THREAD;
```


For a replica that performs updates only by processing events from the source, stopping only the SQL thread can be useful if you want to perform a backup or other task. The I/O (receiver) thread continues to read events from the source but they are not executed. This makes it easier for the replica to catch up when you restart the SQL (applier) thread.

Stopping only the receiver thread enables the events in the relay log to be executed by the applier thread up to the point where the relay log ends. This can be useful when you want to pause execution to catch up with events already received from the source, when you want to perform administration on the replica but also ensure that it has processed all updates to a specific point. This method can also be used to pause event receipt on the replica while you conduct administration on the source. Stopping the receiver thread but permitting the applier thread to run helps ensure that there is not a massive backlog of events to be executed when replication is started again.

\subsection*{19.1.7.3 Skipping Transactions}

If replication stops due to an issue with an event in a replicated transaction, you can resume replication by skipping the failed transaction on the replica. Before skipping a transaction, ensure that the replication I/O (receiver) thread is stopped as well as the SQL (applier) thread.

First you need to identify the replicated event that caused the error. Details of the error and the last successfully applied transaction are recorded in the Performance Schema table replication_applier_status_by_worker. You can use mysqlbinlog to retrieve and display the events that were logged around the time of the error. For instructions to do this, see Section 9.5, "Point-in-Time (Incremental) Recovery". Alternatively, you can issue SHOW RELAYLOG EVENTS on the replica or SHOW BINLOG EVENTS on the source.

Before skipping the transaction and restarting the replica, check these points:
- Is the transaction that stopped replication from an unknown or untrusted source? If so, investigate the cause in case there are any security considerations that indicate the replica should not be restarted.
- Does the transaction that stopped replication need to be applied on the replica? If so, either make the appropriate corrections and reapply the transaction, or manually reconcile the data on the replica.
- Did the transaction that stopped replication need to be applied on the source? If not, undo the transaction manually on the server where it originally took place.

To skip the transaction, choose one of the following methods as appropriate:
- When GTIDs are in use (gtid_mode is 0N), see Skipping Transactions With GTIDs .
- When GTIDs are not in use or are being phased in (gtid_mode is OFF, OFF_PERMISSIVE, or ON_PERMISSIVE), see Skipping Transactions Without GTIDs.
- If you have enabled GTID assignment on a replication channel using the ASSIGN_GTIDS_TO_ANONYMOUS_TRANSACTIONS option of the CHANGE REPLICATION SOURCE TO statement, see Skipping Transactions Without GTIDs. Using ASSIGN_GTIDS_TO_ANONYMOUS_TRANSACTIONS on a replication channel is not the same as introducing GTID-based replication for the channel, and you cannot use the transaction skipping method for GTID-based replication with those channels.

To restart replication after skipping the transaction, issue START REPLICA, with the FOR CHANNEL clause if the replica is a multi-source replica.

\section*{Skipping Transactions With GTIDs}

When GTIDs are in use (gtid_mode is ON), the GTID for a committed transaction is persisted on the replica even if the content of the transaction is filtered out. This feature prevents a replica from retrieving previously filtered transactions when it reconnects to the source using GTID auto-positioning. It can also be used to skip a transaction on the replica, by committing an empty transaction in place of the failing transaction.

This method of skipping transactions is not suitable when you have enabled GTID assignment on a replication channel using the ASSIGN_GTIDS_TO_ANONYMOUS_TRANSACTIONS option of the CHANGE REPLICATION SOURCE TO statement.

If the failing transaction generated an error in a worker thread, you can obtain its GTID directly from the APPLYING_TRANSACTION field in the Performance Schema table replication_applier_status_by_worker. To see what the transaction is, issue SHOW RELAYLOG EVENTS on the replica or SHOW BINLOG EVENTS on the source, and search the output for a transaction preceded by that GTID.

When you have assessed the failing transaction for any other appropriate actions as described previously (such as security considerations), to skip it, commit an empty transaction on the replica that has the same GTID as the failing transaction. For example:
```
SET GTID_NEXT='aaa-bbb-ccc-ddd:N';
BEGIN;
COMMIT;
SET GTID_NEXT='AUTOMATIC';
```


The presence of this empty transaction on the replica means that when you issue a START REPLICA statement to restart replication, the replica uses the auto-skip function to ignore the failing transaction, because it sees a transaction with that GTID has already been applied. If the replica is a multi-source replica, you do not need to specify the channel name when you commit the empty transaction, but you do need to specify the channel name when you issue START REPLICA.

Note that if binary logging is in use on this replica, the empty transaction enters the replication stream if the replica becomes a source or primary in the future. If you need to avoid this possibility, consider flushing and purging the replica's binary logs, as in this example:
```
FLUSH LOGS;
PURGE BINARY LOGS TO 'binlog.000146';
```


The GTID of the empty transaction is persisted, but the transaction itself is removed by purging the binary log files.

\section*{Skipping Transactions Without GTIDs}

To skip failing transactions when GTIDs are not in use or are being phased in (gtid_mode is OFF, OFF_PERMISSIVE, or ON_PERMISSIVE), you can skip a specified number of events by issuing SET GLOBAL sql_replica_skip_counter. Alternatively, you can skip past an event or events by issuing a CHANGE REPLICATION SOURCE TO statement to move the source binary log position forward.

These methods are also suitable when you have enabled GTID assignment on a replication channel using the ASSIGN_GTIDS_TO_ANONYMOUS_TRANSACTIONS option of the CHANGE REPLICATION SOURCE TO statement.

When you use these methods, it is important to understand that you are not necessarily skipping a complete transaction, as is always the case with the GTID-based method described previously. These non-GTID-based methods are not aware of transactions as such, but instead operate on events. The binary log is organized as a sequence of groups known as event groups, and each event group consists of a sequence of events.
- For transactional tables, an event group corresponds to a transaction.
- For nontransactional tables, an event group corresponds to a single SQL statement.

A single transaction can contain changes to both transactional and nontransactional tables.
When you use a SET GLOBAL sql_replica_skip_counter statement to skip events and the resulting position is in the middle of an event group, the replica continues to skip events until it reaches the end of the group. Execution then starts with the next event group. The CHANGE REPLICATION SOURCE TO statement does not have this function, so you must be careful to identify the correct location to restart replication at the beginning of an event group. However, using CHANGE REPLICATION SOURCE TO means you do not have to count the events that need to be skipped, as you do with SET GLOBAL sql_replica_skip_counter, and instead you can just specify the location to restart.

\section*{Skipping Transactions With SET GLOBAL sql_replica_skip_counter}

When you have assessed the failing transaction for any other appropriate actions as described previously (such as security considerations), count the number of events that you need to skip. One event normally corresponds to one SQL statement in the binary log, but note that statements that use AUTO_INCREMENT or LAST_INSERT_ID( ) count as two events in the binary log. When binary log transaction compression is in use, a compressed transaction payload (Transaction_payload_event) is counted as a single counter value, so all the events inside it are skipped as a unit.

If you want to skip the complete transaction, you can count the events to the end of the transaction, or you can just skip the relevant event group. Remember that with SET GLOBAL sql_replica_skip_counter, the replica continues to skip to the end of an event group. Make sure you do not skip too far forward and go into the next event group or transaction so that it is not also skipped.

Issue the SET statement as follows, where $N$ is the number of events from the source to skip:
SET GLOBAL sql_replica_skip_counter = N
This statement cannot be issued if gtid_mode=0N is set, or if the replication I/O (receiver) and SQL (applier) threads are running.

The SET GLOBAL sql_replica_skip_counter statement has no immediate effect. When you issue the START REPLICA statement for the next time following this SET statement, the new value for the system variable sql_replica_skip_counter is applied, and the events are skipped. That START REPLICA statement also automatically sets the value of the system variable back to 0 . If the replica is a multi-source replica, when you issue that START REPLICA statement, the FOR CHANNEL clause is required. Make sure that you name the correct channel, otherwise events are skipped on the wrong channel.

\section*{Skipping Transactions With CHANGE REPLICATION SOURCE TO}

When you have assessed the failing transaction for any other appropriate actions as described previously (such as security considerations), identify the coordinates (file and position) in the source's binary log that represent a suitable position to restart replication. This can be the start of the event group following the event that caused the issue, or the start of the next transaction. The replication I/O
(receiver) thread begins reading from the source at these coordinates the next time the thread starts, skipping the failing event. Make sure that you have identified the position accurately, because this statement does not take event groups into account.

Issue the CHANGE REPLICATION SOURCE TO statement as follows, where source_log_name is the binary log file that contains the restart position, and source_log_pos is the number representing the restart position as stated in the binary log file:

CHANGE REPLICATION SOURCE TO SOURCE_LOG_FILE='source_log_name', SOURCE_LOG_POS=source_log_pos;
If the replica is a multi-source replica, you must use the FOR CHANNEL clause to name the appropriate channel on the CHANGE REPLICATION SOURCE TO statement.

This statement cannot be issued if SOURCE_AUTO_POSITION is 1, or if the replication I/O (receiver) and SQL (applier) threads are running. If you need to use this method of skipping a transaction when SOURCE_AUTO_POSITION=1, you can change the setting to SOURCE_AUTO_POSITION=0 while issuing the statement, then change it back again afterwards. For example:

CHANGE REPLICATION SOURCE TO SOURCE_AUTO_POSITION=0, SOURCE_LOG_FILE='binlog.000145', SOURCE_LOG_POS=23
CHANGE REPLICATION SOURCE TO SOURCE_AUTO_POSITION=1;

\subsection*{19.2 Replication Implementation}

Replication is based on the source server keeping track of all changes to its databases (updates, deletes, and so on) in its binary log. The binary log serves as a written record of all events that modify database structure or content (data) from the moment the server was started. Typically, SELECT statements are not recorded because they modify neither database structure nor content.

Each replica that connects to the source requests a copy of the binary log. That is, it pulls the data from the source, rather than the source pushing the data to the replica. The replica also executes the events from the binary log that it receives. This has the effect of repeating the original changes just as they were made on the source. Tables are created or their structure modified, and data is inserted, deleted, and updated according to the changes that were originally made on the source.

Because each replica is independent, the replaying of the changes from the source's binary log occurs independently on each replica that is connected to the source. In addition, because each replica receives a copy of the binary log only by requesting it from the source, the replica is able to read and update the copy of the database at its own pace and can start and stop the replication process at will without affecting the ability to update to the latest database status on either the source or replica side.

For more information on the specifics of the replication implementation, see Section 19.2.3, "Replication Threads".

Source servers and replicas report their status in respect of the replication process regularly so that you can monitor them. See Section 10.14, "Examining Server Thread (Process) Information", for descriptions of all replicated-related states.

The source's binary log is written to a local relay log on the replica before it is processed. The replica also records information about the current position with the source's binary log and the local relay log. See Section 19.2.4, "Relay Log and Replication Metadata Repositories".

Database changes are filtered on the replica according to a set of rules that are applied according to the various configuration options and variables that control event evaluation. For details on how these rules are applied, see Section 19.2.5, "How Servers Evaluate Replication Filtering Rules".

\subsection*{19.2.1 Replication Formats}

Replication works because events written to the binary log are read from the source and then processed on the replica. The events are recorded within the binary log in different formats according to the type of event. The different replication formats used correspond to the binary logging format used when the events were recorded in the source's binary log. The correlation between binary logging formats and the terms used during replication are:
- When using statement-based binary logging, the source writes SQL statements to the binary log. Replication of the source to the replica works by executing the SQL statements on the replica. This is called statement-based replication (which can be abbreviated as SBR), which corresponds to the MySQL statement-based binary logging format.
- When using row-based logging, the source writes events to the binary log that indicate how individual table rows are changed. Replication of the source to the replica works by copying the events representing the changes to the table rows to the replica. This is called row-based replication (which can be abbreviated as $R B R$ ).

Row-based logging is the default method.
- You can also configure MySQL to use a mix of both statement-based and row-based logging, depending on which is most appropriate for the change to be logged. This is called mixed-format logging. When using mixed-format logging, a statement-based log is used by default. Depending on certain statements, and also the storage engine being used, the log is automatically switched to row-based in particular cases. Replication using the mixed format is referred to as mixed-based replication or mixed-format replication. For more information, see Section 7.4.4.3, "Mixed Binary Logging Format".

NDB Cluster. The default binary logging format in MySQL NDB Cluster 8.4 is ROW. NDB Cluster Replication uses row-based replication; that the NDB storage engine is incompatible with statementbased replication. See Section 25.7.2, "General Requirements for NDB Cluster Replication", for more information.

When using MIXED format, the binary logging format is determined in part by the storage engine being used and the statement being executed. For more information on mixed-format logging and the rules governing the support of different logging formats, see Section 7.4.4.3, "Mixed Binary Logging Format".

The logging format in a running MySQL server is controlled by setting the binlog_format server system variable. This variable can be set with session or global scope. The rules governing when and how the new setting takes effect are the same as for other MySQL server system variables. Setting the variable for the current session lasts only until the end of that session, and the change is not visible to other sessions. Setting the variable globally takes effect for clients that connect after the change, but not for any current client sessions, including the session where the variable setting was changed. To make the global system variable setting permanent so that it applies across server restarts, you must set it in an option file. For more information, see Section 15.7.6.1, "SET Syntax for Variable Assignment".

There are conditions under which you cannot change the binary logging format at runtime or doing so causes replication to fail. See Section 7.4.4.2, "Setting The Binary Log Format".

Changing the global binlog_format value requires privileges sufficient to set global system variables. Changing the session binlog_format value requires privileges sufficient to set restricted session system variables. See Section 7.1.9.1, "System Variable Privileges".

\section*{Note}

Changing the binary logging format (binlog_format system variable) was deprecated in MySQL 8.0; in a future version of MySQL, you can expect binlog_format to be removed altogether, and the row-based format to become the only logging format used by MySQL.

The statement-based and row-based replication formats have different issues and limitations. For a comparison of their relative advantages and disadvantages, see Section 19.2.1.1, "Advantages and Disadvantages of Statement-Based and Row-Based Replication".

With statement-based replication, you may encounter issues with replicating stored routines or triggers. You can avoid these issues by using row-based replication instead. For more information, see Section 27.7, "Stored Program Binary Logging".

\subsection*{19.2.1.1 Advantages and Disadvantages of Statement-Based and Row-Based Replication}

Each binary logging format has advantages and disadvantages. For most users, the mixed replication format should provide the best combination of data integrity and performance. If, however, you want to take advantage of the features specific to the statement-based or row-based replication format when performing certain tasks, you can use the information in this section, which provides a summary of their relative advantages and disadvantages, to determine which is best for your needs.
- Advantages of statement-based replication
- Disadvantages of statement-based replication
- Advantages of row-based replication
- Disadvantages of row-based replication

\section*{Advantages of statement-based replication}
- Proven technology.
- Less data written to log files. When updates or deletes affect many rows, this results in much less storage space required for log files. This also means that taking and restoring from backups can be accomplished more quickly.
- Log files contain all statements that made any changes, so they can be used to audit the database.

\section*{Disadvantages of statement-based replication}
- Statements that are unsafe for SBR.

Not all statements which modify data (such as INSERT DELETE, UPDATE, and REPLACE statements) can be replicated using statement-based replication. Any nondeterministic behavior is difficult to replicate when using statement-based replication. Examples of such Data Modification Language (DML) statements include the following:
- A statement that depends on a loadable function or stored program that is nondeterministic, since the value returned by such a function or stored program depends on factors other than the parameters supplied to it. (Row-based replication, however, simply replicates the value returned by the function or stored program, so its effect on table rows and data is the same on both the source and replica.) See Section 19.5.1.16, "Replication of Invoked Features", for more information.
- DELETE and UPDATE statements that use a LIMIT clause without an ORDER BY are nondeterministic. See Section 19.5.1.18, "Replication and LIMIT".
- Locking read statements (SELECT ... FOR UPDATE and SELECT ... FOR SHARE) that use NOWAIT or SKIP LOCKED options. See Locking Read Concurrency with NOWAIT and SKIP LOCKED.
- Deterministic loadable functions must be applied on the replicas.
- Statements using any of the following functions cannot be replicated properly using statementbased replication:
- LOAD_FILE()
- UUID(), UUID_SHORT()
- USER( )
- FOUND_ROWS()
- SYSDATE() (unless both the source and the replica are started with the --sysdate-is-now option)
- GET_LOCK( )
- IS_FREE_LOCK( )
- IS_USED_LOCK()
- RAND()
- RELEASE_LOCK( )
- SOURCE_POS_WAIT( )
- SLEEP()
- VERSION()

However, all other functions are replicated correctly using statement-based replication, including NOW ( ) and so forth.

For more information, see Section 19.5.1.14, "Replication and System Functions".
Statements that cannot be replicated correctly using statement-based replication are logged with a warning like the one shown here:
[Warning] Statement is not safe to log in statement format.
A similar warning is also issued to the client in such cases. The client can display it using SHOW WARNINGS.
- INSERT ... SELECT requires a greater number of row-level locks than with row-based replication.
- UPDATE statements that require a table scan (because no index is used in the WHERE clause) must lock a greater number of rows than with row-based replication.
- For InnoDB: An INSERT statement that uses AUTO_INCREMENT blocks other nonconflicting INSERT statements.
- For complex statements, the statement must be evaluated and executed on the replica before the rows are updated or inserted. With row-based replication, the replica only has to modify the affected rows, not execute the full statement.
- If there is an error in evaluation on the replica, particularly when executing complex statements, statement-based replication may slowly increase the margin of error across the affected rows over time. See Section 19.5.1.29, "Replica Errors During Replication".
- Stored functions execute with the same NOW() value as the calling statement. However, this is not true of stored procedures.
- Table definitions must be (nearly) identical on source and replica. See Section 19.5.1.9, "Replication with Differing Table Definitions on Source and Replica", for more information.
- DML operations that read data from MySQL grant tables (through a join list or subquery) but do not modify them are performed as non-locking reads on the MySQL grant tables and are therefore not safe for statement-based replication. For more information, see Grant Table Concurrency.

\section*{Advantages of row-based replication}
- All changes can be replicated. This is the safest form of replication.

\section*{Note}

Statements that update the information in the mysql system schema, such as GRANT, REVOKE and the manipulation of triggers, stored routines (including

|
stored procedures), and views, are all replicated to replicas using statementbased replication.

For statements such as CREATE TABLE ... SELECT, a CREATE statement is generated from the table definition and replicated using statement-based format, while the row insertions are replicated using row-based format.
- Fewer row locks are required on the source, which thus achieves higher concurrency, for the following types of statements:
- INSERT ... SELECT
- INSERT statements with AUTO_INCREMENT
- UPDATE or DELETE statements with WHERE clauses that do not use keys or do not change most of the examined rows.
- Fewer row locks are required on the replica for any INSERT, UPDATE, or DELETE statement.

\section*{Disadvantages of row-based replication}
- RBR can generate more data that must be logged. To replicate a DML statement (such as an UPDATE or DELETE statement), statement-based replication writes only the statement to the binary log. By contrast, row-based replication writes each changed row to the binary log. If the statement changes many rows, row-based replication may write significantly more data to the binary log; this is true even for statements that are rolled back. This also means that making and restoring a backup can require more time. In addition, the binary log is locked for a longer time to write the data, which may cause concurrency problems. Use binlog_row_image=minimal to reduce the disadvantage considerably.
- Deterministic loadable functions that generate large BLOB values take longer to replicate with rowbased replication than with statement-based replication. This is because the BLOB column value is logged, rather than the statement generating the data.
- You cannot see on the replica what statements were received from the source and executed. However, you can see what data was changed using mysqlbinlog with the options --base64-output=DECODE-ROWS and --verbose.

Alternatively, use the binlog_rows_query_log_events variable, which if enabled adds a Rows_query event with the statement to mysqlbinlog output when the -vv option is used.
- For tables using the MyISAM storage engine, a stronger lock is required on the replica for INSERT statements when applying them as row-based events to the binary log than when applying them as statements. This means that concurrent inserts on MyISAM tables are not supported when using rowbased replication.

\subsection*{19.2.1.2 Usage of Row-Based Logging and Replication}

MySQL uses statement-based logging (SBL), row-based logging (RBL) or mixed-format logging. The type of binary log used impacts the size and efficiency of logging. Therefore the choice between row-based replication (RBR) or statement-based replication (SBR) depends on your application and environment. This section describes known issues when using a row-based format log, and describes some best practices using it in replication.

For additional information, see Section 19.2.1, "Replication Formats", and Section 19.2.1.1, "Advantages and Disadvantages of Statement-Based and Row-Based Replication".

For information about issues specific to NDB Cluster Replication (which depends on row-based replication), see Section 25.7.3, "Known Issues in NDB Cluster Replication".
- Row-based logging of temporary tables. As noted in Section 19.5.1.31, "Replication and Temporary Tables", temporary tables are not replicated when using row-based or mixed format. For
more information, see Section 19.2.1.1, "Advantages and Disadvantages of Statement-Based and Row-Based Replication".

Temporary tables are not replicated when using row-based or mixed format because there is no need. In addition, because temporary tables can be read only from the thread which created them, there is seldom if ever any benefit obtained from replicating them, even when using statement-based format.

You can switch from statement-based to row-based binary logging format at runtime even when temporary tables have been created, but you cannot switch from row-based or mixed format for binary logging to statement-based format at runtime, due to any CREATE TEMPORARY TABLE statements having been omitted from the binary log in the previous mode.

The MySQL server tracks the logging mode that was in effect when each temporary table was created. When a given client session ends, the server logs a DROP TEMPORARY TABLE IF EXISTS statement for each temporary table that still exists and was created when statement-based binary logging was in use. If row-based or mixed format binary logging was in use when the table was created, the DROP TEMPORARY TABLE IF EXISTS statement is not logged.

Nontransactional DML statements involving temporary tables are allowed when using binlog_format=ROW, as long as any nontransactional tables affected by the statements are temporary tables.
- RBL and synchronization of nontransactional tables. When many rows are affected, the set of changes is split into several events; when the statement commits, all of these events are written to the binary log. When executing on the replica, a table lock is taken on all tables involved, and then the rows are applied in batch mode. Depending on the engine used for the replica's copy of the table, this may or may not be effective.
- Latency and binary log size. RBL writes changes for each row to the binary log and so its size can increase quite rapidly. This can significantly increase the time required to make changes on the replica that match those on the source. You should be aware of the potential for this delay in your applications.
- Reading the binary log. mysqlbinlog displays row-based events in the binary log using the BINLOG statement. This statement displays an event as a base 64-encoded string, the meaning of which is not evident. When invoked with the --base64-output=DECODE-ROWS and --verbose options, mysqlbinlog formats the contents of the binary log to be human readable. When binary log events were written in row-based format and you want to read or recover from a replication or database failure you can use this command to read contents of the binary log. For more information, see Section 6.6.9.2, "mysqlbinlog Row Event Display".
- Binary log execution errors and replica execution mode. Using
replica_exec_mode=IDEMPOTENT is generally only useful with MySQL NDB Cluster replication, for which IDEMPOTENT is the default value. (See Section 25.7.10, "NDB Cluster Replication: Bidirectional and Circular Replication"). When replica_exec_mode is IDEMPOTENT, a failure to apply changes from RBL because the original row cannot be found does not trigger an error or cause replication to fail. This means that it is possible that updates are not applied on the replica, so that the source and replica are no longer synchronized. Latency issues and use of nontransactional tables with RBR when replica_exec_mode is IDEMPOTENT can cause the source and replica to diverge even further. For more information about replica_exec_mode, see Section 7.1.8, "Server System Variables".

For other scenarios, setting replica_exec_mode to STRICT is normally sufficient; this is the default value for storage engines other than NDB.
- Filtering based on server ID not supported. You can filter based on server ID using the IGNORE_SERVER_IDS option for CHANGE REPLICATION SOURCE TO. This option works with both the statement-based and row-based logging formats, but cannot be used when gtid_mode=0N. Another method to filter out changes on some replicas is to use a WHERE clause that includes the
relation @@server_id <> id_value clause with UPDATE and DELETE statements. For example, WHERE @@server_id <> 1. However, this does not work correctly with row-based logging. To use the server_id system variable for statement filtering, use statement-based logging.
- RBL, nontransactional tables, and stopped replicas. When using row-based logging, if the replica server is stopped while a replica thread is updating a nontransactional table, the replica database can reach an inconsistent state. For this reason, it is recommended that you use a transactional storage engine such as InnoDB for all tables replicated using the row-based format. Use of STOP REPLICA or STOP REPLICA SQL_THREAD prior to shutting down the replica MySQL server helps prevent issues from occurring, and is always recommended regardless of the logging format or storage engine you use.

\subsection*{19.2.1.3 Determination of Safe and Unsafe Statements in Binary Logging}

The "safeness" of a statement in MySQL replication refers to whether the statement and its effects can be replicated correctly using statement-based format. If this is true of the statement, we refer to the statement as safe; otherwise, we refer to it as unsafe.

In general, a statement is safe if it deterministic, and unsafe if it is not. However, certain nondeterministic functions are not considered unsafe (see Nondeterministic functions not considered unsafe, later in this section). In addition, statements using results from floating-point math functionswhich are hardware-dependent—are always considered unsafe (see Section 19.5.1.12, "Replication and Floating-Point Values").

Handling of safe and unsafe statements. A statement is treated differently depending on whether the statement is considered safe, and with respect to the binary logging format (that is, the current value of binlog_format).
- When using row-based logging, no distinction is made in the treatment of safe and unsafe statements.
- When using mixed-format logging, statements flagged as unsafe are logged using the row-based format; statements regarded as safe are logged using the statement-based format.
- When using statement-based logging, statements flagged as being unsafe generate a warning to this effect. Safe statements are logged normally.

Each statement flagged as unsafe generates a warning. If a large number of such statements were executed on the source, this could lead to excessively large error log files. To prevent this, MySQL has a warning suppression mechanism. Whenever the 50 most recent ER_BINLOG_UNSAFE_STATEMENT warnings have been generated more than 50 times in any 50 -second period, warning suppression is enabled. When activated, this causes such warnings not to be written to the error log; instead, for each 50 warnings of this type, a note The last warning was repeated $N$ times in last $S$ seconds is written to the error log. This continues as long as the 50 most recent such warnings were issued in 50 seconds or less; once the rate has decreased below this threshold, the warnings are once again logged normally. Warning suppression has no effect on how the safety of statements for statement-based logging is determined, nor on how warnings are sent to the client. MySQL clients still receive one warning for each such statement.

For more information, see Section 19.2.1, "Replication Formats".

\section*{Statements considered unsafe.}

Statements with the following characteristics are considered unsafe:
- Statements containing system functions that may return a different value on the replica.

These functions include FOUND_ROWS( ), GET_LOCK( ), IS_FREE_LOCK( ), IS_USED_LOCK( ), LOAD_FILE(), RAND(), RELEASE_LOCK( ), ROW_COUNT(), SESSION_USER(), SLEEP( ), SOURCE_POS_WAIT(), SYSDATE(), SYSTEM_USER(), USER(), UUID(), and UUID_SHORT().

Nondeterministic functions not considered unsafe. Although these functions are not deterministic, they are treated as safe for purposes of logging and replication: CONNECTION_ID( ),

CURDATE(), CURRENT_DATE(), CURRENT_TIME(), CURRENT_TIMESTAMP( ), CURTIME( ), LAST_INSERT_ID( ), LOCALTIME( ), LOCALTIMESTAMP( ), NOW( ), UNIX_TIMESTAMP( ), UTC_DATE(), UTC_TIME(), and UTC_TIMESTAMP( ).

For more information, see Section 19.5.1.14, "Replication and System Functions".
- References to system variables. Most system variables are not replicated correctly using the statement-based format. See Section 19.5.1.39, "Replication and Variables". For exceptions, see Section 7.4.4.3, "Mixed Binary Logging Format".
- Loadable Functions. Since we have no control over what a loadable function does, we must assume that it is executing unsafe statements.
- Fulltext plugin. This plugin may behave differently on different MySQL servers; therefore, statements depending on it could have different results. For this reason, all statements relying on the fulltext plugin are treated as unsafe in MySQL.
- Trigger or stored program updates a table having an AUTO INCREMENT column. This is unsafe because the order in which the rows are updated may differ on the source and the replica.

In addition, an INSERT into a table that has a composite primary key containing an AUTO_INCREMENT column that is not the first column of this composite key is unsafe.

For more information, see Section 19.5.1.1, "Replication and AUTO_INCREMENT".
- INSERT ... ON DUPLICATE KEY UPDATE statements on tables with multiple primary or unique keys. When executed against a table that contains more than one primary or unique key, this statement is considered unsafe, being sensitive to the order in which the storage engine checks the keys, which is not deterministic, and on which the choice of rows updated by the MySQL Server depends.

An INSERT ... ON DUPLICATE KEY UPDATE statement against a table having more than one unique or primary key is marked as unsafe for statement-based replication. (Bug \#11765650, Bug \#58637)
- Updates using LIMIT. The order in which rows are retrieved is not specified, and is therefore considered unsafe. See Section 19.5.1.18, "Replication and LIMIT".
- Accesses or references log tables. The contents of the system log table may differ between source and replica.
- Nontransactional operations after transactional operations. Within a transaction, allowing any nontransactional reads or writes to execute after any transactional reads or writes is considered unsafe.

For more information, see Section 19.5.1.35, "Replication and Transactions".
- Accesses or references self-logging tables. All reads and writes to self-logging tables are considered unsafe. Within a transaction, any statement following a read or write to self-logging tables is also considered unsafe.
- LOAD DATA statements. LOAD DATA is treated as unsafe and when binlog_format=MIXED the statement is logged in row-based format. When binlog_format=STATEMENT LOAD DATA does not generate a warning, unlike other unsafe statements.
- XA transactions. If two XA transactions committed in parallel on the source are being prepared on the replica in the inverse order, locking dependencies can occur with statement-based replication that cannot be safely resolved, and it is possible for replication to fail with deadlock on the replica. When binlog_format=STATEMENT is set, DML statements inside XA transactions are flagged as being unsafe and generate a warning. When binlog_format=MIXED or binlog_format=ROW is set, DML statements inside XA transactions are logged using row-based replication, and the potential issue is not present.
- DEFAULT clause that refers to a nondeterministic function. If an expression default value refers to a nondeterministic function, any statement that causes the expression to be evaluated is unsafe for statement-based replication. This includes statements such as INSERT, UPDATE, and ALTER TABLE. Unlike most other unsafe statements, this category of statement cannot be replicated safely in row-based format. When binlog_format is set to STATEMENT, the statement is logged and executed but a warning message is written to the error log. When binlog_format is set to MIXED or ROW, the statement is not executed and an error message is written to the error log. For more information on the handling of explicit defaults, see Explicit Default Handling.

For additional information, see Section 19.5.1, "Replication Features and Issues".

\subsection*{19.2.2 Replication Channels}

In MySQL multi-source replication, a replica opens multiple replication channels, one for each source server. The replication channels represent the path of transactions flowing from a source to the replica. Each replication channel has its own receiver (I/O) thread, one or more applier (SQL) threads, and relay log. When transactions from a source are received by a channel's receiver thread, they are added to the channel's relay log file and passed through to the channel's applier threads. This enables each channel to function independently.

This section describes how channels can be used in a replication topology, and the impact they have on single-source replication. For instructions to configure sources and replicas for multi-source replication, to start, stop and reset multi-source replicas, and to monitor multi-source replication, see Section 19.1.5, "MySQL Multi-Source Replication".

The maximum number of channels that can be created on one replica server in a multi-source replication topology is 256 . Each replication channel must have a unique (nonempty) name, as explained in Section 19.2.2.4, "Replication Channel Naming Conventions". The error codes and messages that are issued when multi-source replication is enabled specify the channel that generated the error.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3519.jpg?height=109&width=97&top_left_y=1539&top_left_x=370)

> Note
> Each channel on a multi-source replica must replicate from a different source. You cannot set up multiple replication channels from a single replica to a single source. This is because the server IDs of replicas must be unique in a replication topology. The source distinguishes replicas only by their server IDs, not by the names of the replication channels, so it cannot recognize different replication channels from the same replica.

A multi-source replica can also be set up as a multi-threaded replica, by setting the system variable replica_parallel_workers to a value greater than 0 . When you do this on a multi-source replica, each channel on the replica has the specified number of applier threads, plus a coordinator thread to manage them. You cannot configure the number of applier threads for individual channels.

Multi-source replicas can be configured with replication filters on specific replication channels. Channel specific replication filters can be used when the same database or table is present on multiple sources, and you only need the replica to replicate it from one source. For GTID-based replication, if the same transaction might arrive from multiple sources (such as in a diamond topology), you must ensure the filtering setup is the same on all channels. For more information, see Section 19.2.5.4, "Replication Channel Based Filters".

To provide compatibility with previous versions, the MySQL server automatically creates on startup a default channel whose name is the empty string (" "). This channel is always present; it cannot be created or destroyed by the user. If no other channels (having nonempty names) have been created, replication statements act on the default channel only, so that all replication statements from older replicas function as expected (see Section 19.2.2.2, "Compatibility with Previous Replication Statements". Statements applying to replication channels as described in this section can be used only when there is at least one named channel.

\subsection*{19.2.2.1 Commands for Operations on a Single Channel}

To enable MySQL replication operations to act on individual replication channels, use the FOR CHANNEL channel clause with the following replication statements:
- CHANGE REPLICATION SOURCE TO
- START REPLICA
- STOP REPLICA
- SHOW RELAYLOG EVENTS
- FLUSH RELAY LOGS
- SHOW REPLICA STATUS
- RESET REPLICA

The SOURCE_POS_WAIT( ) function has a channel parameter.
START REPLICA and STOP REPLICA are disallowed for the group_replication_recovery and group_replication_applier channels. SHOW REPLICA STATUS is also not allowed with the group_replication_applier channel.

FLUSH RELAY LOGS is allowed for the group_replication_applier channel, but if the request is received while a transaction is being applied, the request is not performed until after the transaction ends. The requester must wait while the transaction is completed and the rotation takes place. This prevents transactions from being split, which is not allowed for Group Replication.

\subsection*{19.2.2.2 Compatibility with Previous Replication Statements}

When a replica has multiple channels and a FOR CHANNEL channel option is not specified, a valid statement generally acts on all available channels, with some specific exceptions.

For example, the following statements behave as expected for all except certain Group Replication channels:
- START REPLICA starts replication threads for all channels, except the group_replication_recovery and group_replication_applier channels.
- STOP REPLICA stops replication threads for all channels, except the group_replication_recovery and group_replication_applier channels.
- SHOW REPLICA STATUS reports the status for all channels, except the group_replication_applier channel.
- RESET REPLICA resets all channels.

\section*{Warning}

Use RESET REPLICA with caution as this statement deletes all existing channels, purges their relay log files, and recreates only the default channel.

Some replication statements cannot operate on all channels. In this case, error 1964 Multiple channels exist on the replica. Please provide channel name as an argument. is generated. The following statements and functions generate this error when used in a multi-source replication topology and a FOR CHANNEL channel option is not used to specify which channel to act on:
- SHOW RELAYLOG EVENTS
- CHANGE REPLICATION SOURCE TO
- SOURCE_POS_WAIT( )

Note that a default channel always exists in a single source replication topology, where statements and functions behave as in previous versions of MySQL.

\subsection*{19.2.2.3 Startup Options and Replication Channels}

This section describes startup options which are impacted by the addition of replication channels.
The following startup options now affect all channels in a replication topology.
- --log-replica-updates

All transactions received by the replica (even from multiple sources) are written in the binary log.
- --relay-log-purge

When set, each channel purges its own relay log automatically.
- --replica-transaction-retries

The specified number of transaction retries can take place on all applier threads of all channels.
- --skip-replica-start

No replication threads start on any channels.
- --replica-skip-errors

Execution continues and errors are skipped for all channels.
The values set for the following startup options apply on each channel; since these are mysqld startup options, they are applied on every channel.
- --max-relay-log-size=size

Maximum size of the individual relay log file for each channel; after reaching this limit, the file is rotated.
- --relay-log-space-limit=size

Upper limit for the total size of all relay logs combined, for each individual channel. For $N$ channels, the combined size of these logs is limited to relay_log_space_limit * $N$.
- --replica-parallel-workers=value

Number of replication applier threads per channel.
- replica_checkpoint_group

Waiting time by an receiver thread for each source.
- --relay-log-index=filename

Base name for each channel's relay log index file. See Section 19.2.2.4, "Replication Channel Naming Conventions".
- --relay-log=filename

Denotes the base name of each channel's relay log file. See Section 19.2.2.4, "Replication Channel Naming Conventions".
- --replica-net-timeout=N

This value is set per channel, so that each channel waits for $N$ seconds to check for a broken connection.
- --replica-skip-counter=N

This value is set per channel, so that each channel skips $N$ events from its source.

\subsection*{19.2.2.4 Replication Channel Naming Conventions}

This section describes how naming conventions are impacted by replication channels.
Each replication channel has a unique name which is a string with a maximum length of 64 characters and is case-insensitive. Because channel names are used in the replica's applier metadata repository table, the character set used for these is always UTF-8. Although you are generally free to use any name for channels, the following names are reserved:
- group_replication_applier
- group_replication_recovery

The name you choose for a replication channel also influences the file names used by a multi-source replica. The relay log files and index files for each channel are named relay_log_basename-channel.xxxxxx, where relay_log_basename is a base name specified using the relay_log system variable, and channel is the name of the channel logged to this file. If you do not specify the relay_log system variable, a default file name is used that also includes the name of the channel.

\subsection*{19.2.3 Replication Threads}

MySQL replication capabilities are implemented using the following types of threads:
- Binary log dump thread. The source creates a thread to send the binary log contents to a replica when the replica connects. This thread can be identified in the output of SHOW PROCESSLIST on the source as the Binlog Dump thread.
- Replication I/O receiver thread. When a START REPLICA statement is issued on a replica server, the replica creates an I/O (receiver) thread, which connects to the source and asks it to send the updates recorded in its binary logs.

The replication receiver thread reads the updates that the source's Binlog Dump thread sends (see previous item) and copies them to local files that comprise the replica's relay log.

The state of this thread is shown as Slave_IO_running in the output of SHOW REPLICA STATUS.
- Replication SQL applier thread. When replica_parallel_workers is equal to 0 , the replica creates an SQL (applier) thread to read the relay log that is written by the replication receiver thread and execute the transactions contained in it. When replica_parallel_workers is $N>=$ 1, there are $N$ applier threads and one coordinator thread, which reads transactions sequentially from the relay log, and schedules them to be applied by worker threads. Each worker applies the transactions that the coordinator has assigned to it.

You can enable further parallelization for tasks on a replica by setting the system variable replica_parallel_workers to a value greater than 0 . When this is done, the replica creates the specified number of worker threads to apply transactions, plus a coordinator thread which reads transactions from the relay log and assigns them to workers. A replica with replica_parallel_workers (slave_parallel_workers) set to a value greater than 0 is called a multithreaded replica. If you are using multiple replication channels, each channel has the number of threads specified using this variable.

Multithreaded replicas are also supported by NDB Cluster. See Section 25.7.11, "NDB Cluster Replication Using the Multithreaded Applier", for more information.

\subsection*{19.2.3.1 Monitoring Replication Main Threads}

The SHOW PROCESSLIST statement provides information that tells you what is happening on the source and on the replica regarding replication. For information on source states, see Section 10.14.4, "Replication Source Thread States". For replica states, see Section 10.14.5, "Replication I/O (Receiver) Thread States", and Section 10.14.6, "Replication SQL Thread States".

The following example illustrates how the three main replication threads, the binary log dump thread, replication I/O (receiver) thread, and replication SQL (applier) thread, show up in the output from SHOW PROCESSLIST.

On the source server, the output from SHOW PROCESSLIST looks like this:
```
mysql> SHOW PROCESSLIST\G
************************** 1. row ******************************
        Id: 2
    User: root
    Host: localhost:32931
        db: NULL
Command: Binlog Dump
    Time: 94
    State: Has sent all binlog to slave; waiting for binlog to
            be updated
    Info: NULL
```


Here, thread 2 is a Binlog Dump thread that services a connected replica. The State information indicates that all outstanding updates have been sent to the replica and that the source is waiting for more updates to occur. If you see no Binlog Dump threads on a source server, this means that replication is not running; that is, no replicas are currently connected.

On a replica server, the output from SHOW PROCESSLIST looks like this:
```
mysql> SHOW PROCESSLIST\G
*************************** 1. row ***************************************
            Id: 10
    User: system user
    Host:
        db: NULL
Command: Connect
    Time: 11
    State: Waiting for master to send event
        Info: NULL
************************** 2. row *****************************************
            Id: 11
        User: system user
        Host:
            db: NULL
Command: Connect
        Time: 11
    State: Has read all relay log; waiting for the slave I/O
                thread to update it
        Info: NULL
```


The State information indicates that thread 10 is the replication I/O (receiver) thread that is communicating with the source server, and thread 11 is the replication SQL (applier) thread that is processing the updates stored in the relay logs. At the time that SHOW PROCESSLIST was run, both threads were idle, waiting for further updates.

The value in the Time column can show how late the replica is compared to the source. See Section A.14, "MySQL 8.4 FAQ: Replication". If sufficient time elapses on the source side without activity on the Binlog Dump thread, the source determines that the replica is no longer connected. As for any other client connection, the timeouts for this depend on the values of net_write_timeout and net_retry_count; for more information about these, see Section 7.1.8, "Server System Variables".

The SHOW REPLICA STATUS statement provides additional information about replication processing on a replica server. See Section 19.1.7.1, "Checking Replication Status".

You can also retrieve information on the source's Binlog Dump threads with the following:
SELECT * FROM performance_schema.threads WHERE PROCESSLIST_COMMAND LIKE "Binlog Dump\%"

Binlog Dump\% is used to retrieve either Binlog Dump or Binlog Dump GTID, depending on which mode binlog dumping is in.

\subsection*{19.2.3.2 Monitoring Replication Applier Worker Threads}

On a multithreaded replica, the Performance Schema tables replication_applier_status_by_coordinator and replication_applier_status_by_worker show status information for the replica's coordinator thread and applier worker threads respectively. For a replica with multiple channels, the threads for each channel are identified.

A multithreaded replica's coordinator thread also prints statistics to the replica's error log on a regular basis if the verbosity setting is set to display informational messages. The statistics are printed depending on the volume of events that the coordinator thread has assigned to applier worker threads, with a maximum frequency of once every 120 seconds. The message lists the following statistics for the relevant replication channel, or the default replication channel (which is not named):

\begin{tabular}{|l|l|}
\hline Seconds elapsed & The difference in seconds between the current time and the last time this information was printed to the error log. \\
\hline Events assigned & The total number of events that the coordinator thread has queued to all applier worker threads since the coordinator thread was started. \\
\hline Worker queues filled over overrun level & The current number of events that are queued to any of the applier worker threads in excess of the overrun level, which is set at $90 \%$ of the maximum queue length of 16384 events. If this value is zero, no applier worker threads are operating at the upper limit of their capacity. \\
\hline Waited due to worker queue full & The number of times that the coordinator thread had to wait to schedule an event because an applier worker thread's queue was full. If this value is zero, no applier worker threads exhausted their capacity. \\
\hline Waited due to the total size & The number of times that the coordinator thread had to wait to schedule an event because the replica_pending_jobs_size_max limit had been reached. This system variable sets the maximum amount of memory (in bytes) available to applier worker thread queues holding events not yet applied. If an unusually large event exceeds this size, the transaction is held until all the applier worker threads have empty queues, and then processed. All subsequent transactions are held until the large transaction has been completed. \\
\hline Waited at clock conflicts & The number of nanoseconds that the coordinator thread had to wait to schedule an event because a transaction that the event depended on had not yet been committed. If replica_parallel_type is set to DATABASE (rather than LOGICAL_CLOCK), this value is always zero. \\
\hline Waited (count) when workers occupied & The number of times that the coordinator thread slept for a short period, which it might do in two situations. The first situation is where the coordinator thread assigns an event and finds the applier worker thread's queue is filled beyond the underrun level of $10 \%$ of the maximum queue length, in which case it sleeps for a maximum of 1 millisecond. The second situation is where \\
\hline
\end{tabular}
replica_parallel_type is set to LOGICAL_CLOCK and the coordinator thread needs to assign the first event of a transaction to an applier worker thread's queue, it only does this to a worker with an empty queue, so if no queues are empty, the coordinator thread sleeps until one becomes empty.

Waited when workers occupied
The number of nanoseconds that the coordinator thread slept while waiting for an empty applier worker thread queue (that is, in the second situation described above, where replica_parallel_type is set to LOGICAL_CLOCK and the first event of a transaction needs to be assigned).

\subsection*{19.2.4 Relay Log and Replication Metadata Repositories}

A replica server creates several repositories of information to use for the replication process:
- The replica's relay log, which is written by the replication I/O (receiver) thread, contains the transactions read from the replication source server's binary log. The transactions in the relay log are applied on the replica by the replication SQL (applier) thread. For information about the relay log, see Section 19.2.4.1, "The Relay Log".
- The replica's connection metadata repository contains information that the replication receiver thread needs to connect to the replication source server and retrieve transactions from the source's binary log. The connection metadata repository is written to the mysql.slave_master_info table.
- The replica's applier metadata repository contains information that the replication applier thread needs to read and apply transactions from the replica's relay log. The applier metadata repository is written to the mysql.slave_relay_log_info table.

The replica's connection metadata repository and applier metadata repository are collectively known as the replication metadata repositories. For information about these, see Section 19.2.4.2, "Replication Metadata Repositories".

Making replication resilient to unexpected halts. The mysql.slave_master_info and mysql.slave_relay_log_info tables are created using the transactional storage engine InnoDB. Updates to the replica's applier metadata repository table are committed together with the transactions, meaning that the replica's progress information recorded in that repository is always consistent with what has been applied to the database, even in the event of an unexpected server halt. For information on the combination of settings on the replica that is most resilient to unexpected halts, see Section 19.4.2, "Handling an Unexpected Halt of a Replica".

\subsection*{19.2.4.1 The Relay Log}

The relay log, like the binary log, consists of a set of numbered files containing events that describe database changes, and an index file that contains the names of all used relay log files. The default location for relay log files is the data directory.

The term "relay log file" generally denotes an individual numbered file containing database events. The term "relay log" collectively denotes the set of numbered relay log files plus the index file.

Relay log files have the same format as binary log files and can be read using mysqlbinlog (see Section 6.6.9, "mysqlbinlog — Utility for Processing Binary Log Files"). If binary log transaction compression is in use, transaction payloads written to the relay log are compressed in the same way as for the binary log. For more information on binary log transaction compression, see Section 7.4.4.5, "Binary Log Transaction Compression".

For the default replication channel, relay log file names have the default form host_name - relaybin. nnnnnn, where host_name is the name of the replica server host and nnnnnn is a sequence number. Successive relay log files are created using successive sequence numbers, beginning with 000001 . For non-default replication channels, the default base name is host_name-relay-bin-channel, where channel is the name of the replication channel recorded in the relay log.

The replica uses an index file to track the relay log files currently in use. The default relay log index file name is host_name-relay-bin. index for the default channel, and host_name-relay-bin-channel.index for non-default replication channels.

The default relay log file and relay log index file names and locations can be overridden with, respectively, the relay_log and relay_log_index system variables (see Section 19.1.6, "Replication and Binary Logging Options and Variables").

If a replica uses the default host-based relay log file names, changing a replica's host name after replication has been set up can cause replication to fail with the errors Failed to open the relay log and Could not find target log during relay log initialization. This is a known issue (see Bug \#2122). If you anticipate that a replica's host name might change in the future (for example, if networking is set up on the replica such that its host name can be modified using DHCP), you can avoid this issue entirely by using the relay_log and relay_log_index system variables to specify relay log file names explicitly when you initially set up the replica. This causes the names to be independent of server host name changes.

If you encounter the issue after replication has already begun, one way to work around it is to stop the replica server, prepend the contents of the old relay log index file to the new one, and then restart the replica. On a Unix system, this can be done as shown here:
\$> cat new_relay_log_name.index >> old_relay_log_name.index
\$> mv old_relay_log_name.index new_relay_log_name.index
A replica server creates a new relay log file under the following conditions:
- Each time the replication I/O (receiver) thread starts.
- When the logs are flushed (for example, with FLUSH LOGS or mysqladmin flush-logs).
- When the size of the current relay log file becomes too large, which is determined as follows:
- If the value of max_relay_log_size is greater than 0 , that is the maximum relay log file size.
- If the value of max_relay_log_size is 0 , max_binlog_size determines the maximum relay log file size.

The replication SQL (applier) thread automatically deletes each relay log file after it has executed all events in the file and no longer needs it. There is no explicit mechanism for deleting relay logs because the replication SQL thread takes care of doing so. However, FLUSH LOGS rotates relay logs, which influences when the replication SQL thread deletes them.

\subsection*{19.2.4.2 Replication Metadata Repositories}

A replica server creates two replication metadata repositories, the connection metadata repository and the applier metadata repository. The replication metadata repositories survive a replica server's shutdown. If binary log file position based replication is in use, when the replica restarts, it reads the two repositories to determine how far it previously proceeded in reading the binary log from the source and in processing its own relay log. If GTID-based replication is in use, the replica does not use the replication metadata repositories for that purpose, but does need them for the other metadata that they contain.
- The replica's connection metadata repository contains information that the replication I/O (receiver) thread needs to connect to the replication source server and retrieve transactions from the source's binary log. The metadata in this repository includes the connection configuration, the replication user account details, the SSL settings for the connection, and the file name and position where the replication receiver thread is currently reading from the source's binary log.
- The replica's applier metadata repository contains information that the replication SQL (applier) thread needs to read and apply transactions from the replica's relay log. The metadata in this repository includes the file name and position up to which the replication applier thread has executed
the transactions in the relay log, and the equivalent position in the source's binary log. It also includes metadata for the process of applying transactions, such as the number of worker threads and the PRIVILEGE_CHECKS_USER account for the channel.

The connection metadata repository is written to the slave_master_info table in the mysql system schema, and the applier metadata repository is written to the slave_relay_log_info table in the mysql system schema. A warning message is issued if mysqld is unable to initialize the tables for the replication metadata repositories, but the replica is allowed to continue starting. This situation is most likely to occur when upgrading from a version of MySQL that does not support the use of tables for the repositories to one in which they are supported.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3527.jpg?height=129&width=106&top_left_y=680&top_left_x=365)

\section*{Important}
1. Do not attempt to update or insert rows in the mysql.slave_master_info or mysql.slave_relay_log_info tables manually. Doing so can cause undefined behavior, and is not supported. Execution of any statement requiring a write lock on either or both of the slave_master_info and slave_relay_log_info tables is disallowed while replication is ongoing (although statements that perform only reads are permitted at any time).
2. Access privileges for the connection metadata repository table mysql.slave_master_info should be restricted to the database administrator, because it contains the replication user account name and password for connecting to the source. Use a restricted access mode to protect database backups that include this table. You can clear the replication user account credentials from the connection metadata repository, and instead always provide them using a START REPLICA statement to start the replication channel. This approach means that the replication channel always needs operator intervention to restart, but the account name and password are not recorded in the replication metadata repositories.

RESET REPLICA clears the data in the replication metadata repositories, with the exception of the replication connection parameters (depending on the MySQL Server release). For details, see the description for RESET REPLICA.

You can set the GTID_ONLY option of the CHANGE REPLICATION SOURCE TO statement to stop a replication channel from persisting file names and file positions in the replication metadata repositories. This avoids writes and reads to the tables in situations where GTID-based replication does not actually require them. With the GTID_ONLY setting, the connection metadata repository and the applier metadata repository are not updated when the replica queues and applies events in a transaction, or when the replication threads are stopped and started. File positions are tracked in memory, and can be viewed using SHOW REPLICA STATUS if they are needed. The replication metadata repositories are only synchronized in the following situations:
- When a CHANGE REPLICATION SOURCE TO statement is issued.
- When a RESET REPLICA statement is issued. RESET REPLICA ALL deletes rather than updates the repositories, so they are synchronized implicitly.
- When a replication channel is initialized.
- If the replication metadata repositories are moved from files to tables.

Creating the replication metadata repositories as tables is the default; the use of files is deprecated.
The mysql.slave_master_info and mysql.slave_relay_log_info tables are created using the InnoDB transactional storage engine. Updates to the applier metadata repository table are committed together with the transactions, meaning that the replica's progress information recorded in that repository is always consistent with what has been applied to the database, even in the event of an
unexpected server halt. For information on the combination of settings on a replica that is most resilient to unexpected halts, see Section 19.4.2, "Handling an Unexpected Halt of a Replica".

When you back up the replica's data or transfer a snapshot of its data to create a new replica, ensure that you include the mysql.slave_master_info and mysql.slave_relay_log_info tables containing the replication metadata repositories. For cloning operations, note that when the replication metadata repositories are created as tables, they are copied to the recipient during a cloning operation, but when they are created as files, they are not copied. When binary log file position based replication is in use, the replication metadata repositories are needed to resume replication after restarting the restored, copied, or cloned replica. If you do not have the relay log files, but still have the applier metadata repository, you can check it to determine how far the replication SQL thread has executed in the source's binary log. Then you can use a CHANGE REPLICATION SOURCE TO statement with the SOURCE_LOG_FILE and SOURCE_LOG_POS options to tell the replica to re-read the binary logs from the source from that point (provided that the required binary logs still exist on the source).

One additional repository, the applier worker metadata repository, is created primarily for internal use, and holds status information about worker threads on a multithreaded replica. The applier worker metadata repository includes the names and positions for the relay log file and the source's binary log file for each worker thread. If the applier metadata repository is created as a table, which is the default, the applier worker metadata repository is written to the mysql.slave_worker_info table. If the applier metadata repository is written to a file, the applier worker metadata repository is written to the worker-relay-log.info file. For external use, status information for worker threads is presented in the Performance Schema replication_applier_status_by_worker table.

The replication metadata repositories originally contained information similar to that shown in the output of the SHOW REPLICA STATUS statement, which is discussed in Section 15.4.2, "SQL Statements for Controlling Replica Servers". Further information has since been added to the replication metadata repositories which is not displayed by the SHOW REPLICA STATUS statement.

For the connection metadata repository, the following table shows the correspondence between the columns in the mysql.slave_master_info table, the columns displayed by SHOW REPLICA STATUS, and the lines in the deprecated master.info file.

\begin{tabular}{|l|l|l|l|}
\hline slave_master_info Table Column & SHOW REPLICA STATUS Column & master.info File Line & Description \\
\hline Number_of_lines & [None] & 1 & Number of columns in the table (or lines in the file) \\
\hline Master_log_name & Source_Log_File & 2 & The name of the binary log currently being read from the source \\
\hline Master_log_pos & Read_Source_Log_Pos & 3 & The current position within the binary log that has been read from the source \\
\hline Host & Source_Host & 4 & The host name of the replication source server \\
\hline User_name & Source_User & 5 & The replication user account name used to connect to the source \\
\hline User_password & Password (not shown by SHOW REPLICA STATUS) & 6 & The replication user account password used to connect to the source \\
\hline Port & Source_Port & 7 & The network port used to connect to the replication source server \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|}
\hline slave_master_info Table Column & SHOW REPLICA STATUS Column & master.info File Line & Description \\
\hline Connect_retry & Connect_Retry & 8 & The period (in seconds) that the replica waits before trying to reconnect to the source \\
\hline Enabled_ssl & Source_SSL_Allowed & 9 & Whether the replica supports SSL connections \\
\hline Ssl_ca & Source_SSL_CA_File & 10 & The file used for the Certificate Authority (CA) certificate \\
\hline Ssl_capath & Source_SSL_CA_Path & 11 & The path to the Certificate Authority (CA) certificate \\
\hline Ssl_cert & Source_SSL_Cert & 12 & The name of the SSL certificate file \\
\hline Ssl_cipher & Source_SSL_Cipher & 13 & The list of possible ciphers used in the handshake for the SSL connection \\
\hline Ssl_key & Source_SSL_Key & 14 & The name of the SSL key file \\
\hline Ssl_verify_server_c & source_SSL_Verify_S & க5ver_Cert & Whether to verify the server certificate \\
\hline Heartbeat & [None] & 16 & Interval between replication heartbeats, in seconds \\
\hline Bind & Source_Bind & 17 & Which of the replica's network interfaces should be used for connecting to the source \\
\hline Ignored_server_ids & Replicate_Ignore_Se & 18er_Ids & The list of server IDs to be ignored. Note that for Ignored_server_ids the list of server IDs is preceded by the total number of server IDs to ignore. \\
\hline Uuid & Source_UUID & 19 & The source's unique ID \\
\hline Retry_count & Source_Retry_Count & 20 & Maximum number of reconnection attempts permitted \\
\hline Ssl_crl & [None] & 21 & Path to an SSL certificate revocation-list file \\
\hline Ssl_crlpath & [None] & 22 & Path to a directory containing SSL certificate revocation-list files \\
\hline
\end{tabular}

\begin{table}
\captionsetup{labelformat=empty}
\caption{Relay Log and Replication Metadata Repositories}
\begin{tabular}{|l|l|l|l|}
\hline slave_master_info Table Column & SHOW REPLICA STATUS Column & master.info File Line & Description \\
\hline Enabled_auto_positi & Anto_position & 23 & Whether GTID autopositioning is in use or not \\
\hline Channel_name & Channel_name & 24 & The name of the replication channel \\
\hline Tls_version & Source_TLS_Version & 25 & TLS version on the source \\
\hline Public_key_path & Source_public_key_p & 26h & Name of the RSA public key file \\
\hline Get_public_key & Get_source_public_k & K2V & Whether to request RSA public key from source \\
\hline Network_namespace & Network_namespace & 28 & Network namespace \\
\hline Master_compression_ & [Nowe]ithm & 29 & Permitted compression algorithms for the connection to the source \\
\hline Master_zstd_compres & None]level & 30 & zstd compression level \\
\hline Tls_ciphersuites & [None] & 31 & Permitted ciphersuites for TLSv1.3 \\
\hline Source_connection_a & a[Nonefailover & 32 & Whether the asynchronous connection failover mechanism is activated \\
\hline Gtid_only & [None] & 33 & Whether the channel uses only GTIDs and does not persist positions \\
\hline
\end{tabular}
\end{table}

For the applier metadata repository, the following table shows the correspondence between the columns in the mysql.slave_relay_log_info table, the columns displayed by SHOW REPLICA STATUS, and the lines in the deprecated relay-log.info file.

\begin{tabular}{|l|l|l|l|}
\hline \multicolumn{2}{|c|}{
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3530.jpg?height=47\&width=659\&top_left_y=1845\&top_left_x=296)} & Line in relaylog.info File & Description \\
\hline Number_of_lines & [None] & 1 & Number of columns in the table or lines in the file \\
\hline Relay_log_name & Relay_Log_File & 2 & The name of the current relay log file \\
\hline Relay_log_pos & Relay_Log_Pos & 3 & The current position within the relay log file; events up to this position have been executed on the replica database \\
\hline Master_log_name & Relay_Source_Log_Fi & 4 e & The name of the source's binary log file from which the events in the relay log file were read \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|}
\hline slave_relay_log_inf Table Column & SHOW REPLICA STATUS Column & Line in relaylog.info File & Description \\
\hline Master_log_pos & Exec_Source_Log_Pos & 5 & The equivalent position within the source's binary log file of the events that have been executed on the replica \\
\hline Sql_delay & SQL_Delay & 6 & The number of seconds that the replica must lag the source \\
\hline Number_of_workers & [None] & 7 & The number of worker threads for applying replication transactions in parallel \\
\hline Id & [None] & 8 & ID used for internal purposes; currently this is always 1 \\
\hline Channel_name & Channel_name & 9 & The name of the replication channel \\
\hline Privilege_checks_us & [Noræ]e & 10 & The user name for the PRIVILEGE_CHECKS_USER account for the channel \\
\hline Privilege_checks_ho & SNoræue & 11 & The host name for the PRIVILEGE_CHECKS_USER account for the channel \\
\hline Require_row_format & [None] & 12 & Whether the channel accepts only row-based events \\
\hline Require_table_prima & [Nord]y_check & 13 & The channel's policy on whether tables must have primary keys for CREATE TABLE and ALTER TABLE operations \\
\hline Assign_gtids_to_ano & [Nome]s_transactions & 14 ype & If the channel assigns a GTID to replicated transactions that do not already have one, using the replica's local UUID, this value is LOCAL; if the channel does so using instead a UUID which has been set manually, the value is UUID. If the channel does not assign a GTID in such cases, the value is OFF. \\
\hline Assign_gtids_to_ano & [Nome]s_transactions & 15alue & The UUID used in the GTIDs assigned to anonymous transactions \\
\hline
\end{tabular}

\subsection*{19.2.5 How Servers Evaluate Replication Filtering Rules}

If a replication source server does not write a statement to its binary log, the statement is not replicated. If the server does log the statement, the statement is sent to all replicas and each replica determines whether to execute it or ignore it.

On the source, you can control which databases to log changes for by using the --binlog-dodb and --binlog-ignore-db options to control binary logging. For a description of the rules that servers use in evaluating these options, see Section 19.2.5.1, "Evaluation of Database-Level Replication and Binary Logging Options". You should not use these options to control which databases and tables are replicated. Instead, use filtering on the replica to control the events that are executed on the replica.

On the replica side, decisions about whether to execute or ignore statements received from the source are made according to the --replicate - * options that the replica was started with. (See Section 19.1.6, "Replication and Binary Logging Options and Variables".) The filters governed by these options can also be set dynamically using the CHANGE REPLICATION FILTER statement. The rules governing such filters are the same whether they are created on startup using - -replicate - * options or while the replica server is running by CHANGE REPLICATION FILTER. Note that replication filters cannot be used on Group Replication-specific channels on a MySQL server instance that is configured for Group Replication, because filtering transactions on some servers would make the group unable to reach agreement on a consistent state.

In the simplest case, when there are no - - replicate - * options, the replica executes all statements that it receives from the source. Otherwise, the result depends on the particular options given.

Database-level options (--replicate-do-db, --replicate-ignore-db) are checked first; see Section 19.2.5.1, "Evaluation of Database-Level Replication and Binary Logging Options", for a description of this process. If no database-level options are used, option checking proceeds to any table-level options that may be in use (see Section 19.2.5.2, "Evaluation of Table-Level Replication Options", for a discussion of these). If one or more database-level options are used but none are matched, the statement is not replicated.

For statements affecting databases only (that is, CREATE DATABASE, DROP DATABASE, and ALTER DATABASE), database-level options always take precedence over any --replicate-wild-dotable options. In other words, for such statements, --replicate-wild-do-table options are checked if and only if there are no database-level options that apply.

To make it easier to determine what effect a given set of options has, it is recommended that you avoid mixing do - * and ignore - * options, or options containing wildcards with options which do not.

If any --replicate-rewrite-db options were specified, they are applied before the replicate - * filtering rules are tested.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3532.jpg?height=127&width=101&top_left_y=2055&top_left_x=306)

Note
All replication filtering options follow the same rules for case sensitivity that apply to names of databases and tables elsewhere in the MySQL server, including the effects of the lower_case_table_names system variable.

Filtering rules are applied before performing any privilege checks; if a transaction is filtered out, no privilege check is performed for that transaction, and thus no error can be raised by it. See Section 19.5.1.29, "Replica Errors During Replication", for more information.

\subsection*{19.2.5.1 Evaluation of Database-Level Replication and Binary Logging Options}

When evaluating replication options, the replica begins by checking to see whether there are any - -replicate-do-db or--replicate-ignore-db options that apply. When using--binlog-do-db or--binlog-ignore-db, the process is similar, but the options are checked on the source.

The database that is checked for a match depends on the binary log format of the statement that is being handled. If the statement has been logged using the row format, the database where data is to be changed is the database that is checked. If the statement has been logged using the statement format, the default database (specified with a USE statement) is the database that is checked.

\section*{Note}

Only DML statements can be logged using the row format. DDL statements are always logged as statements, even when binlog_format=ROW. All DDL statements are therefore always filtered according to the rules for statementbased replication. This means that you must select the default database explicitly with a USE statement in order for a DDL statement to be applied.

For replication, the steps involved are listed here:
1. Which logging format is used?
- STATEMENT. Test the default database.
- ROW. Test the database affected by the changes.
2. Are there any --replicate-do-db options?
- Yes. Does the database match any of them?
- Yes. Continue to Step 4.
- No. Ignore the update and exit.
- No. Continue to step 3.
3. Are there any--replicate-ignore-db options?
- Yes. Does the database match any of them?
- Yes. Ignore the update and exit.
- No. Continue to step 4.
- No. Continue to step 4.
4. Proceed to checking the table-level replication options, if there are any. For a description of how these options are checked, see Section 19.2.5.2, "Evaluation of Table-Level Replication Options".
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3533.jpg?height=108&width=113&top_left_y=1987&top_left_x=415)

\section*{Important}

A statement that is still permitted at this stage is not yet actually executed. The statement is not executed until all table-level options (if any) have also been checked, and the outcome of that process permits execution of the statement.

For binary logging, the steps involved are listed here:
1. Are there any--binlog-do-db or--binlog-ignore-db options?
- Yes. Continue to step 2.
- No. Log the statement and exit.
2. Is there a default database (has any database been selected by USE)?
- Yes. Continue to step 3.
- No. Ignore the statement and exit.
3. There is a default database. Are there any --binlog-do-db options?
- Yes. Do any of them match the database?
- Yes. Log the statement and exit.
- No. Ignore the statement and exit.
- No. Continue to step 4.
4. Do any of the--binlog-ignore-db options match the database?
- Yes. Ignore the statement and exit.
- No. Log the statement and exit.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3534.jpg?height=120&width=110&top_left_y=934&top_left_x=299)

\section*{Important}

For statement-based logging, an exception is made in the rules just given for the CREATE DATABASE, ALTER DATABASE, and DROP DATABASE statements. In those cases, the database being created, altered, or dropped replaces the default database when determining whether to log or ignore updates.
--binlog-do-db can sometimes mean "ignore other databases". For example, when using statement-based logging, a server running with only --binlog-do-db=sales does not write to the binary log statements for which the default database differs from sales. When using row-based logging with the same option, the server logs only those updates that change data in sales.

\subsection*{19.2.5.2 Evaluation of Table-Level Replication Options}

The replica checks for and evaluates table options only if either of the following two conditions is true:
- No matching database options were found.
- One or more database options were found, and were evaluated to arrive at an "execute" condition according to the rules described in the previous section (see Section 19.2.5.1, "Evaluation of Database-Level Replication and Binary Logging Options").

First, as a preliminary condition, the replica checks whether statement-based replication is enabled. If so, and the statement occurs within a stored function, the replica executes the statement and exits. If row-based replication is enabled, the replica does not know whether a statement occurred within a stored function on the source, so this condition does not apply.

\section*{Note}

For statement-based replication, replication events represent statements (all changes making up a given event are associated with a single SQL statement); for row-based replication, each event represents a change in a single table row (thus a single statement such as UPDATE mytable SET mycol $=1$ may yield many row-based events). When viewed in terms of events, the process of checking table options is the same for both row-based and statement-based replication.

Having reached this point, if there are no table options, the replica simply executes all events. If there are any --replicate-do-table or --replicate-wild-do-table options, the event must match one of these if it is to be executed; otherwise, it is ignored. If there are any - - replicate-ignoretable or --replicate-wild-ignore-table options, all events are executed except those that match any of these options.

\section*{Important}

Table-level replication filters are only applied to tables that are explicitly mentioned and operated on in the query. They do not apply to tables that are implicitly updated by the query. For example, a GRANT statement, which updates the mysql. user system table but does not mention that table, is not affected by a filter that specifies mysql.\% as the wildcard pattern.

The following steps describe this evaluation in more detail. The starting point is the end of the evaluation of the database-level options, as described in Section 19.2.5.1, "Evaluation of DatabaseLevel Replication and Binary Logging Options".
1. Are there any table replication options?
- Yes. Continue to step 2.
- No. Execute the update and exit.
2. Which logging format is used?
- STATEMENT. Carry out the remaining steps for each statement that performs an update.
- ROW. Carry out the remaining steps for each update of a table row.
3. Are there any--replicate-do-table options?
- Yes. Does the table match any of them?
- Yes. Execute the update and exit.
- No. Continue to step 4.
- No. Continue to step 4.
4. Are there any--replicate-ignore-table options?
- Yes. Does the table match any of them?
- Yes. Ignore the update and exit.
- No. Continue to step 5.
- No. Continue to step 5.
5. Are there any--replicate-wild-do-table options?
- Yes. Does the table match any of them?
- Yes. Execute the update and exit.
- No. Continue to step 6.
- No. Continue to step 6.
6. Are there any--replicate-wild-ignore-table options?
- Yes. Does the table match any of them?
-Yes. Ignore the update and exit.
- No. Continue to step 7.
- No. Continue to step 7.
7. Is there another table to be tested?
- Yes. Go back to step 3.
- No. Continue to step 8.
8. Are there any --replicate-do-table or --replicate-wild-do-table options?
- Yes. Ignore the update and exit.
- No. Execute the update and exit.

> Note
> Statement-based replication stops if a single SQL statement operates on both a table that is included by a --replicate-do-table or --replicate-wild-do-table option, and another table that is ignored by a--replicate-ignore-table or --replicate-wild-ignore-table option. The replica must either execute or ignore the complete statement (which forms a replication event), and it cannot logically do this. This also applies to rowbased replication for DDL statements, because DDL statements are always logged as statements, without regard to the logging format in effect. The only type of statement that can update both an included and an ignored table and still be replicated successfully is a DML statement that has been logged with binlog_format=ROW.

\subsection*{19.2.5.3 Interactions Between Replication Filtering Options}

If you use a combination of database-level and table-level replication filtering options, the replica first accepts or ignores events using the database options, then it evaluates all events permitted by those options according to the table options. This can sometimes lead to results that seem counterintuitive. It is also important to note that the results vary depending on whether the operation is logged using statement-based or row-based binary logging format. If you want to be sure that your replication filters always operate in the same way independently of the binary logging format, which is particularly important if you are using mixed binary logging format, follow the guidance in this topic.

The effect of the replication filtering options differs between binary logging formats because of the way the database name is identified. With statement-based format, DML statements are handled based on the current database, as specified by the USE statement. With row-based format, DML statements are handled based on the database where the modified table exists. DDL statements are always filtered based on the current database, as specified by the USE statement, regardless of the binary logging format.

An operation that involves multiple tables can also be affected differently by replication filtering options depending on the binary logging format. Operations to watch out for include transactions involving multi-table UPDATE statements, triggers, cascading foreign keys, stored functions that update multiple tables, and DML statements that invoke stored functions that update one or more tables. If these operations update both filtered-in and filtered-out tables, the results can vary with the binary logging format.

If you need to guarantee that your replication filters operate consistently regardless of the binary logging format, particularly if you are using mixed binary logging format (binlog_format=MIXED), use only table-level replication filtering options, and do not use database-level replication filtering options. Also, do not use multi-table DML statements that update both filtered-in and filtered-out tables.

If you need to use a combination of database-level and table-level replication filters, and want these to operate as consistently as possible, choose one of the following strategies:
1. If you use row-based binary logging format (binlog_format=ROW), for DDL statements, rely on the USE statement to set the database and do not specify the database name. You can consider
changing to row-based binary logging format for improved consistency with replication filtering. See Section 7.4.4.2, "Setting The Binary Log Format" for the conditions that apply to changing the binary logging format.
2. If you use statement-based or mixed binary logging format (binlog_format=STATEMENT or MIXED), for both DML and DDL statements, rely on the USE statement and do not use the database name. Also, do not use multi-table DML statements that update both filtered-in and filtered-out tables.

Example 19.7 A --replicate-ignore-db option and a--replicate-do-table option
On the replication source server, the following statements are issued:
```
USE db1;
CREATE TABLE t2 LIKE t1;
INSERT INTO db2.t3 VALUES (1);
```


The replica has the following replication filtering options set:
```
replicate-ignore-db = db1
replicate-do-table = db2.t3
```


The DDL statement CREATE TABLE creates the table in db1, as specified by the preceding USE statement. The replica filters out this statement according to its--replicate-ignore-db = db1 option, because db1 is the current database. This result is the same whatever the binary logging format is on the replication source server. However, the result of the DML INSERT statement is different depending on the binary logging format:
- If row-based binary logging format is in use on the source (binlog_format=ROW), the replica evaluates the INSERT operation using the database where the table exists, which is named as db2. The database-level option --replicate-ignore-db = db1, which is evaluated first, therefore does not apply. The table-level option--replicate-do-table $=\mathrm{db} 2 . \mathrm{t} 3$ does apply, so the replica applies the change to table t 3.
- If statement-based binary logging format is in use on the source (binlog_format=STATEMENT), the replica evaluates the INSERT operation using the default database, which was set by the USE statement to db1 and has not been changed. According to its database-level - -replicate-ignore-db = db1 option, it therefore ignores the operation and does not apply the change to table t3. The table-level option--replicate-do-table $=\mathrm{db} 2 . \mathrm{t} 3$ is not checked, because the statement already matched a database-level option and was ignored.

If the--replicate-ignore-db = db1 option on the replica is necessary, and the use of statementbased (or mixed) binary logging format on the source is also necessary, the results can be made consistent by omitting the database name from the INSERT statement and relying on a USE statement instead, as follows:
```
USE db1;
CREATE TABLE t2 LIKE t1;
USE db2;
INSERT INTO t3 VALUES (1);
```


In this case, the replica always evaluates the INSERT statement based on the database db2. Whether the operation is logged in statement-based or row-based binary format, the results remain the same.

\subsection*{19.2.5.4 Replication Channel Based Filters}

This section explains how to work with replication filters when multiple replication channels exist, for example in a multi-source replication topology. Replication filters can be global or specific to a channel, enabling you to configure multi-source replicas with replication filters on specific replication channels. Channel specific replication filters are particularly useful in a multi-source replication topology when the same database or table is present on multiple sources, and the replica is only required to replicate it from one source.

For instructions to set up replication channels, see Section 19.1.5, "MySQL Multi-Source Replication", and for more information on how they work, see Section 19.2.2, "Replication Channels".

\section*{Important}

Each channel on a multi-source replica must replicate from a different source. You cannot set up multiple replication channels from a single replica to a single source, even if you use replication filters to select different data to replicate on each channel. This is because the server IDs of replicas must be unique in a replication topology. The source distinguishes replicas only by their server IDs, not by the names of the replication channels, so it cannot recognize different replication channels from the same replica.

\section*{Important}

On a MySQL server instance that is configured for Group Replication, channel specific replication filters can be used on replication channels that are not directly involved with Group Replication, such as where a group member also acts as a replica to a source that is outside the group. They cannot be used on the group_replication_applier or group_replication_recovery channels. Filtering on these channels would make the group unable to reach agreement on a consistent state.

\section*{Important}

For a multi-source replica in a diamond topology (where the replica replicates from two or more sources, which in turn replicate from a common source), when GTID-based replication is in use, ensure that any replication filters or other channel configuration are identical on all channels on the multi-source replica. With GTID-based replication, filters are applied only to the transaction data, and GTIDs are not filtered out. This happens so that a replica's GTID set stays consistent with the source's, meaning GTID auto-positioning can be used without re-acquiring filtered out transactions each time. In the case where the downstream replica is multi-source and receives the same transaction from multiple sources in a diamond topology, the downstream replica now has multiple versions of the transaction, and the result depends on which channel applies the transaction first. The second channel to attempt it skips the transaction using GTID auto-skip, because the transaction's GTID was added to the gtid_executed set by the first channel. With identical filtering on the channels, there is no problem because all versions of the transaction contain the same data, so the results are the same. However, with different filtering on the channels, the database can become inconsistent and replication can hang.

\section*{Overview of Replication Filters and Channels}

When multiple replication channels exist, for example in a multi-source replication topology, replication filters are applied as follows:
- Any global replication filter specified is added to the global replication filters of the filter type (do_db, do_ignore_table, and so on).
- Any channel specific replication filter adds the filter to the specified channel's replication filters for the specified filter type.
- Each replication channel copies global replication filters to its channel specific replication filters if no channel specific replication filter of this type is configured.
- Each channel uses its channel specific replication filters to filter the replication stream.

The syntax to create channel specific replication filters extends the existing SQL statements and command options. When a replication channel is not specified the global replication filter is
configured to ensure backwards compatibility. The CHANGE REPLICATION FILTER statement supports the FOR CHANNEL clause to configure channel specific filters online. The --replicate* command options to configure filters can specify a replication channel using the form - -replicate-filter_type=channel_name:filter_details. Suppose channels channel_1 and channel_2 exist before the server starts; in this case, starting the replica with the command line options --replicate-do-db=db1 --replicate-do-db=channel_1:db2 --replicate-do-db=db3--replicate-ignore-db=db4 --replicate-ignore-db=channel_2:db5 --replicate-wild-do-table=channel_1:db6.t1\% would result in:
- Global replication filters: do_db=db1, db3; ignore_db=db4
- Channel specific filters on channel_1: do_db=db2; ignore_db=db4; wild-do-table=db6.t1\%
- Channel specific filters on channel_2: do_db=db1, db3; ignore_db=db5

These same rules could be applied at startup when included in the replica's my. cnf file, like this:
```
replicate-do-db=db1
replicate-do-db=channel_1:db2
replicate-ignore-db=db4
replicate-ignore-db=channel_2:db5
replicate-wild-do-table=channel_1:db6.t1%
```


To monitor the replication filters in such a setup use the replication_applier_global_filters and replication_applier_filters tables.

\section*{Configuring Channel Specific Replication Filters at Startup}

The replication filter related command options can take an optional channel followed by a colon, followed by the filter specification. The first colon is interpreted as a separator, subsequent colons are interpreted as literal colons. The following command options support channel specific replication filters using this format:
- --replicate-do-db=channel:database_id
- --replicate-ignore-db=channel:database_id
- --replicate-do-table=channel:table_id
- --replicate-ignore-table=channel:table_id
- --replicate-rewrite-db=channe1:db1-db2
- --replicate-wild-do-table=channel:table pattern
- --replicate-wild-ignore-table=channel:table pattern

All of the options just listed can be used in the replica's my. cnf file, as with most other MySQL server startup options, by omitting the two leading dashes. See Overview of Replication Filters and Channels, for a brief example, as well as Section 6.2.2.2, "Using Option Files".

If you use a colon but do not specify a channel for the filter option, for example - -replicate-do$\mathrm{db}=$ : database_id, the option configures the replication filter for the default replication channel. The default replication channel is the replication channel which always exists once replication has been started, and differs from multi-source replication channels which you create manually. When neither the colon nor a channel is specified the option configures the global replication filters, for example -replicate-do-db=database_id configures the global - -replicate-do-db filter.

If you configure multiple rewrite-db=from_name->to_name options with the same from_name database, all filters are added together (put into the rewrite_do list) and the first one takes effect.

The pattern used for the --replicate-wild-*-table options can include any characters allowed in identifiers as well as the wildcards $\%$ and _. These work the same way as when used with
the LIKE operator; for example, tbl\% matches any table name beginning with tbl, and tbl_ matches any table name matching tbl plus one additional character.

\section*{Changing Channel Specific Replication Filters Online}

In addition to the --replicate - * options, replication filters can be configured using the CHANGE REPLICATION FILTER statement. This removes the need to restart the server, but the replication SQL thread must be stopped while making the change. To make this statement apply the filter to a specific channel, use the FOR CHANNEL channel clause. For example:

CHANGE REPLICATION FILTER REPLICATE_DO_DB=(db1) FOR CHANNEL channel_1;
When a FOR CHANNEL clause is provided, the statement acts on the specified channel's replication filters. If multiple types of filters (do_db, do_ignore_table, wild_do_table, and so on) are specified, only the specified filter types are replaced by the statement. In a replication topology with multiple channels, for example on a multi-source replica, when no FOR CHANNEL clause is provided, the statement acts on the global replication filters and all channels' replication filters, using a similar logic as the FOR CHANNEL case. For more information see Section 15.4.2.1, "CHANGE REPLICATION FILTER Statement".

\section*{Removing Channel Specific Replication Filters}

When channel specific replication filters have been configured, you can remove the filter by issuing an empty filter type statement. For example to remove all REPLICATE_REWRITE_DB filters from a replication channel named channel_1 issue:

CHANGE REPLICATION FILTER REPLICATE_REWRITE_DB=() FOR CHANNEL channel_1;
Any REPLICATE_REWRITE_DB filters previously configured, using either command options or CHANGE REPLICATION FILTER, are removed.

The RESET REPLICA ALL statement removes channel specific replication filters that were set on channels deleted by the statement. When the deleted channel or channels are recreated, any global replication filters specified for the replica are copied to them, and no channel specific replication filters are applied.

\subsection*{19.3 Replication Security}

To protect against unauthorized access to data that is stored on and transferred between replication source servers and replicas, set up all the servers involved using the security measures that you would choose for any MySQL instance in your installation, as described in Chapter 8, Security. In addition, for servers in a replication topology, consider implementing the following security measures:
- Set up sources and replicas to use encrypted connections to transfer the binary log, which protects this data in motion. Encryption for these connections must be activated using a CHANGE REPLICATION SOURCE TO statement, in addition to setting up the servers to support encrypted network connections. See Section 19.3.1, "Setting Up Replication to Use Encrypted Connections".
- Encrypt the binary log files and relay log files on sources and replicas, which protects this data at rest, and also any data in use in the binary log cache. Binary log encryption is activated using the binlog_encryption system variable. See Section 19.3.2, "Encrypting Binary Log Files and Relay Log Files".
- Apply privilege checks to replication appliers, which help to secure replication channels against the unauthorized or accidental use of privileged or unwanted operations. Privilege checks are implemented by setting up a PRIVILEGE_CHECKS_USER account, which MySQL uses to verify that you have authorized each specific transaction for that channel. See Section 19.3.3, "Replication Privilege Checks".

For Group Replication, binary log encryption and privilege checks can be used as a security measure on replication group members. You should also consider encrypting the connections between group
members, comprising group communication connections and distributed recovery connections, and applying IP address allowlisting to exclude untrusted hosts. For information on these security measures specific to Group Replication, see Section 20.6, "Group Replication Security".

\subsection*{19.3.1 Setting Up Replication to Use Encrypted Connections}

To use an encrypted connection for the transfer of the binary log required during replication, both the source and the replica servers must support encrypted network connections. If either server does not support encrypted connections (because it has not been compiled or configured for them), replication through an encrypted connection is not possible.

Setting up encrypted connections for replication is similar to doing so for client/server connections. You must obtain (or create) a suitable security certificate that you can use on the source, and a similar certificate (from the same certificate authority) on each replica. You must also obtain suitable key files.

For more information on setting up a server and client for encrypted connections, see Section 8.3.1, "Configuring MySQL to Use Encrypted Connections".

To enable encrypted connections on the source, you must create or obtain suitable certificate and key files, and then add the following configuration parameters to the [mysqld] section of the source my.cnf file, changing the file names as necessary:
```
[mysqld]
ssl_ca=cacert.pem
ssl_cert=server-cert.pem
ssl_key=server-key.pem
```


The paths to the files may be relative or absolute; we recommend that you always use complete paths for this purpose.

The configuration parameters are as follows:
- ssl_ca: The path name of the Certificate Authority (CA) certificate file. (ssl_capath is similar but specifies the path name of a directory of CA certificate files.)
- ssl_cert: The path name of the server public key certificate file. This certificate can be sent to the client and authenticated against the CA certificate that it has.
- ssl_key: The path name of the server private key file.

To enable encrypted connections on the replica, use the CHANGE REPLICATION SOURCE TO statement.
- To name the replica's certificate and SSL private key files using CHANGE REPLICATION SOURCE TO, add the appropriate SOURCE_SSL_ $x x x$ options, like this:
```
-> SOURCE_SSL_CA = 'ca_file_name',
-> SOURCE_SSL_CAPATH = 'ca_directory_name',
-> SOURCE_SSL_CERT = 'cert_file_name',
-> SOURCE_SSL_KEY = 'key_file_name',
```


These options correspond to the $--\mathrm{ssl}-x x x$ options with the same names, as described in Command Options for Encrypted Connections. For these options to take effect, SOURCE_SSL=1 must also be set. For a replication connection, specifying a value for either of SOURCE_SSL_CA or SOURCE_SSL_CAPATH corresponds to setting --ssl-mode=VERIFY_CA. The connection attempt succeeds only if a valid matching Certificate Authority (CA) certificate is found using the specified information.
- To activate host name identity verification, add the SOURCE_SSL_VERIFY_SERVER_CERT option, like this:
```
-> SOURCE_SSL_VERIFY_SERVER_CERT=1,
```


For a replication connection, specifying SOURCE_SSL_VERIFY_SERVER_CERT=1 corresponds to setting--ssl-mode=VERIFY_IDENTITY, as described in Command Options for Encrypted Connections. For this option to take effect, SOURCE_SSL=1 must also be set. Host name identity verification does not work with self-signed certificates.
- To activate certificate revocation list (CRL) checks, add the SOURCE_SSL_CRL or SOURCE_SSL_CRLPATH option, as shown here:
```
-> SOURCE_SSL_CRL = 'crl_file_name',
-> SOURCE_SSL_CRLPATH = 'crl_directory_name',
```


These options correspond to the --ssl-xxx options with the same names, as described in Command Options for Encrypted Connections. If they are not specified, no CRL checking takes place.
- To specify lists of ciphers, ciphersuites, and encryption protocols permitted by the replica for the replication connection, use the SOURCE_SSL_CIPHER, SOURCE_TLS_VERSION, and SOURCE_TLS_CIPHERSUITES options, like this:
```
-> SOURCE_SSL_CIPHER = 'cipher_list',
-> SOURCE_TLS_VERSION = 'protocol_list',
-> SOURCE_TLS_CIPHERSUITES = 'ciphersuite_list',
```

- The SOURCE_SSL_CIPHER option specifies a colon-separated list of one or more ciphers permitted by the replica for the replication connection.
- The SOURCE_TLS_VERSION option specifies a comma-separated list of the TLS encryption protocols permitted by the replica for the replication connection, in a format like that for the tls_version server system variable. The connection procedure negotiates the use of the highest TLS version that both the source and the replica permit. To be able to connect, the replica must have at least one TLS version in common with the source.
- The SOURCE_TLS_CIPHERSUITES option specifies a colon-separated list of one or more ciphersuites that are permitted by the replica for the replication connection if TLSv1.3 is used for the connection. If this option is set to NULL when TLSv1.3 is used (which is the default if you do not set the option), the ciphersuites that are enabled by default are allowed. If you set the option to an empty string, no cipher suites are allowed, and TLSv1.3 is therefore not used.

The protocols, ciphers, and ciphersuites that you can specify in these lists depend on the SSL library used to compile MySQL. For information about the formats, the permitted values, and the defaults if you do not specify the options, see Section 8.3.2, "Encrypted Connection TLS Protocols and Ciphers".

\begin{figure}
\includegraphics[alt={},max width=\textwidth]{https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3542.jpg?height=109&width=95&top_left_y=1909&top_left_x=342}
\captionsetup{labelformat=empty}
\caption{Note}
\end{figure}

You can use the SOURCE_TLS_CIPHERSUITES option to specify any selection of ciphersuites, including only non-default ciphersuites if you want.
- After the source information has been updated, start the replication process on the replica, like this:
```
mysql> START REPLICA;
```


You can use the SHOW REPLICA STATUS statement to confirm that an encrypted connection was established successfully.
- Requiring encrypted connections on the replica does not ensure that the source requires encrypted connections from replicas. If you want to ensure that the source only accepts replicas that connect using encrypted connections, create a replication user account on the source using the REQUIRE SSL option, then grant that user the REPLICATION SLAVE privilege. For example:
```
mysql> CREATE USER 'repl'@'%.example.com' IDENTIFIED BY 'password'
    -> REQUIRE SSL;
```

```
mysql> GRANT REPLICATION SLAVE ON *.*
    -> TO 'repl'@'%.example.com';
```


If you have an existing replication user account on the source, you can add REQUIRE SSL to it with this statement:
mysql> ALTER USER 'repl'@'\%.example.com' REQUIRE SSL;

\subsection*{19.3.2 Encrypting Binary Log Files and Relay Log Files}

MySQL binary log files and relay log files can be encrypted, helping to protect these files and the potentially sensitive data contained in them from being misused by outside attackers, and also from unauthorized viewing by users of the operating system where they are stored. The encryption algorithm used for the files, the AES (Advanced Encryption Standard) cipher algorithm, is built in to MySQL Server and cannot be configured.

You enable this encryption on a MySQL server by setting the binlog_encryption system variable to ON. OFF is the default. The system variable sets encryption on for binary log files and relay log files. Binary logging does not need to be enabled on the server to enable encryption, so you can encrypt the relay log files on a replica that has no binary log. To use encryption, a keyring component or plugin must be installed and configured to supply MySQL Server's keyring service. For instructions to do this, see Section 8.4.4, "The MySQL Keyring". Any supported keyring component or plugin can be used to store binary log encryption keys.

When you first start the server with encryption enabled, a new binary log encryption key is generated before the binary log and relay logs are initialized. This key is used to encrypt a file password for each binary log file (if the server has binary logging enabled) and relay log file (if the server has replication channels), and further keys generated from the file passwords are used to encrypt the data in the files. The binary log encryption key that is currently in use on the server is called the binary log master key. The two tier encryption key architecture means that the binary log master key can be rotated (replaced by a new master key) as required, and only the file password for each file needs to be re-encrypted with the new master key, not the whole file. Relay log files are encrypted for all channels, including new channels that are created after encryption is activated. The binary log index file and relay log index file are never encrypted.

If you activate encryption while the server is running, a new binary log encryption key is generated at that time. The exception is if encryption was active previously on the server and was then disabled, in which case the binary log encryption key that was in use before is used again. The binary log file and relay log files are rotated immediately, and file passwords for the new files and all subsequent binary log files and relay log files are encrypted using this binary log encryption key. Existing binary log files and relay log files still present on the server are not encrypted, but you can purge them if they are no longer needed.

If you deactivate encryption by changing the binlog_encryption system variable to 0FF, the binary log file and relay log files are rotated immediately and all subsequent logging is unencrypted. Previously encrypted files are not automatically decrypted, but the server is still able to read them. The BINLOG_ENCRYPTION_ADMIN privilege is required to activate or deactivate encryption while the server is running.

Encrypted and unencrypted binary log files can be distinguished using the magic number at the start of the file header for encrypted log files (0xFD62696E), which differs from that used for unencrypted log files (0xFE62696E). The SHOW BINARY LOGS statement shows whether each binary log file is encrypted or unencrypted.

When binary log files have been encrypted, mysqlbinlog cannot read them directly, but can read them from the server using the --read-from-remote-server option. If you back up encrypted binary log files using mysqlbinlog, note that the copies of the files that are generated using mysqlbinlog are stored in an unencrypted format.

Binary log encryption can be combined with binary log transaction compression. For more information on binary log transaction compression, see Section 7.4.4.5, "Binary Log Transaction Compression".

\subsection*{19.3.2.1 Scope of Binary Log Encryption}

When binary log encryption is active for a MySQL server instance, the encryption coverage is as follows:
- Data at rest that is written to the binary log files and relay log files is encrypted from the point in time where encryption is started, using the two tier encryption architecture described above. Existing binary log files and relay log files that were present on the server when you started encryption are not encrypted. You can purge these files when they are no longer needed.
- Data in motion in the replication event stream, which is sent to MySQL clients including mysqlbinlog, is decrypted for transmission, and should therefore be protected in transit by the use of connection encryption (see Section 8.3, "Using Encrypted Connections" and Section 19.3.1, "Setting Up Replication to Use Encrypted Connections").
- Data in use that is held in the binary log transaction and statement caches during a transaction is in unencrypted format in the memory buffer that stores the cache. The data is written to a temporary file on disk if it exceeds the space available in the memory buffer. When binary log encryption is active on the server, temporary files used to hold the binary log cache are encrypted using AESCTR (AES Counter mode) for stream encryption. Because the temporary files are volatile and tied to a single process, they are encrypted using single-tier encryption, using a randomly generated file password and initialization vector that exist only in memory and are never stored on disk or in the keyring. After each transaction is committed, the binary log cache is reset: the memory buffer is cleared, any temporary file used to hold the binary log cache is truncated, and a new file password and initialization vector are randomly generated for use with the next transaction. This reset also takes place when the server is restarted after a normal shutdown or an unexpected halt.

\section*{Note}

If you use LOAD DATA when binlog_format=STATEMENT is set, which is not recommended as the statement is considered unsafe for statement-based replication, a temporary file containing the data is created on the replica where the changes are applied. These temporary files are not encrypted when binary log encryption is active on the server. Use row-based or mixed binary logging format instead, which do not create the temporary files.

\subsection*{19.3.2.2 Binary Log Encryption Keys}

The binary log encryption keys used to encrypt the file passwords for the log files are 256-bit keys that are generated specifically for each MySQL server instance using MySQL Server's keyring service (see Section 8.4.4, "The MySQL Keyring"). The keyring service handles the creation, retrieval, and deletion of the binary log encryption keys. A server instance only creates and removes keys generated for itself, but it can read keys generated for other instances if they are stored in the keyring, as in the case of a server instance that has been cloned by file copying.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3544.jpg?height=118&width=108&top_left_y=2119&top_left_x=301)

\section*{Important}

The binary log encryption keys for a MySQL server instance must be included in your backup and recovery procedures, because if the keys required to decrypt the file passwords for current and retained binary log files or relay log files are lost, it might not be possible to start the server.

The format of binary log encryption keys in the keyring is as follows:
```
MySQLReplicationKey_{UUID}_{SEQ_NO}
```


For example:
```
MySQLReplicationKey_00508583-b5ce-11e8-a6a5-0010e0734796_1
```

\{UUID\} is the true UUID generated by the MySQL server (the value of the server_uuid system variable). \{SEQ_NO\} is the sequence number for the binary log encryption key, which is incremented by 1 for each new key that is generated on the server.

The binary log encryption key that is currently in use on the server is called the binary log master key. The sequence number for the current binary log master key is stored in the keyring. The binary log master key is used to encrypt each new log file's file password, which is a randomly generated 32-byte file password specific to the log file that is used to encrypt the file data. The file password is encrypted using AES-CBC (AES Cipher Block Chaining mode) with the 256-bit binary log encryption key and a random initialization vector (IV), and is stored in the log file's file header. The file data is encrypted using AES-CTR (AES Counter mode) with a 256-bit key generated from the file password and a nonce also generated from the file password. It is technically possible to decrypt an encrypted file offline, if the binary log encryption key used to encrypt the file password is known, by using tools available in the OpenSSL cryptography toolkit.

If you use file copying to clone a MySQL server instance that has encryption active so its binary log files and relay log files are encrypted, ensure that the keyring is also copied, so that the clone server can read the binary log encryption keys from the source server. When encryption is activated on the clone server (either at startup or subsequently), the clone server recognizes that the binary log encryption keys used with the copied files include the generated UUID of the source server. It automatically generates a new binary log encryption key using its own generated UUID, and uses this to encrypt the file passwords for subsequent binary log files and relay log files. The copied files continue to be read using the source server's keys.

\subsection*{19.3.2.3 Binary Log Master Key Rotation}

When binary log encryption is enabled, you can rotate the binary log master key at any time while the server is running by issuing ALTER INSTANCE ROTATE BINLOG MASTER KEY. When the binary log master key is rotated manually using this statement, the passwords for the new and subsequent files are encrypted using the new binary log master key, and also the file passwords for existing encrypted binary log files and relay log files are re-encrypted using the new binary log master key, so the encryption is renewed completely. You can rotate the binary log master key on a regular basis to comply with your organization's security policy, and also if you suspect that the current or any of the previous binary log master keys might have been compromised.

When you rotate the binary log master key manually, MySQL Server takes the following actions in sequence:
1. A new binary log encryption key is generated with the next available sequence number, stored on the keyring, and used as the new binary log master key.
2. The binary log and relay log files are rotated on all channels.
3. The new binary log master key is used to encrypt the file passwords for the new binary log and relay log files, and subsequent files until the key is changed again.
4. The file passwords for existing encrypted binary log files and relay log files on the server are reencrypted in turn using the new binary log master key, starting with the most recent files. Any unencrypted files are skipped.
5. Binary log encryption keys that are no longer in use for any files after the re-encryption process are removed from the keyring.

The BINLOG_ENCRYPTION_ADMIN privilege is required to issue ALTER INSTANCE ROTATE BINLOG MASTER KEY, and the statement cannot be used if the binlog_encryption system variable is set to OFF.

As the final step of the binary log master key rotation process, all binary log encryption keys that no longer apply to any retained binary log files or relay log files are cleaned up from the keyring. If a
retained binary log file or relay log file cannot be initialized for re-encryption, the relevant binary log encryption keys are not deleted in case the files can be recovered in the future. For example, this might be the case if a file listed in a binary log index file is currently unreadable, or if a channel fails to initialize. If the server UUID changes, for example because a backup created using MySQL Enterprise Backup is used to set up a new replica, issuing ALTER INSTANCE ROTATE BINLOG MASTER KEY on the new server does not delete any earlier binary log encryption keys that include the original server UUID.

If any of the first four steps of the binary log master key rotation process cannot be completed correctly, an error message is issued explaining the situation and the consequences for the encryption status of the binary log files and relay log files. Files that were previously encrypted are always left in an encrypted state, but their file passwords might still be encrypted using an old binary log master key. If you see these errors, first retry the process by issuing ALTER INSTANCE ROTATE BINLOG MASTER KEY again. Then investigate the status of individual files to see what is blocking the process, especially if you suspect that the current or any of the previous binary log master keys might have been compromised.

If the final step of the binary log master key rotation process cannot be completed correctly, a warning message is issued explaining the situation. The warning message identifies whether the process could not clean up the auxiliary keys in the keyring for rotating the binary log master key, or could not clean up unused binary log encryption keys. You can choose to ignore the message as the keys are auxiliary keys or no longer in use, or you can issue ALTER INSTANCE ROTATE BINLOG MASTER KEY again to retry the process.

If the server stops and is restarted with binary log encryption still set to ON during the binary log master key rotation process, new binary log files and relay log files after the restart are encrypted using the new binary log master key. However, the re-encryption of existing files is not continued, so files that did not get re-encrypted before the server stopped are left encrypted using the previous binary log master key. To complete re-encryption and clean up unused binary log encryption keys, issue ALTER INSTANCE ROTATE BINLOG MASTER KEY again after the restart.

ALTER INSTANCE ROTATE BINLOG MASTER KEY actions are not written to the binary log and are not executed on replicas. Binary log master key rotation can therefore be carried out in replication environments including a mix of MySQL versions. To schedule regular rotation of the binary log master key on all applicable source and replica servers, you can enable the MySQL Event Scheduler on each server and issue the ALTER INSTANCE ROTATE BINLOG MASTER KEY statement using a CREATE EVENT statement. If you rotate the binary log master key because you suspect that the current or any of the previous binary log master keys might have been compromised, issue the statement on every applicable source and replica server. Issuing the statement on individual servers ensures that you can verify immediate compliance, even in the case of replicas that are lagging, belong to multiple replication topologies, or are not currently active in the replication topology but have binary log and relay log files.

The binlog_rotate_encryption_master_key_at_startup system variable controls whether the binary log master key is automatically rotated when the server is restarted. If this system variable is set to ON, a new binary log encryption key is generated and used as the new binary log master key whenever the server is restarted. If it is set to 0FF, which is the default, the existing binary log master key is used again after the restart. When the binary log master key is rotated at startup, the file passwords for the new binary log and relay log files are encrypted using the new key. The file passwords for the existing encrypted binary log files and relay log files are not re-encrypted, so they remain encrypted using the old key, which remains available on the keyring.

\subsection*{19.3.3 Replication Privilege Checks}

By default, MySQL replication (including Group Replication) does not carry out privilege checks when transactions that were already accepted by another server are applied on a replica or group member. You can create a user account with the appropriate privileges to apply the transactions that are normally replicated on a channel, and specify this as the PRIVILEGE_CHECKS_USER account for the replication applier, using a CHANGE REPLICATION SOURCE TO statement. MySQL then checks each
transaction against the user account's privileges to verify that you have authorized the operation for that channel. The account can also be safely used by an administrator to apply or reapply transactions from mysqlbinlog output, for example to recover from a replication error on the channel.

The use of a PRIVILEGE_CHECKS_USER account helps secure a replication channel against the unauthorized or accidental use of privileged or unwanted operations. The PRIVILEGE_CHECKS_USER account provides an additional layer of security in situations such as these:
- You are replicating between a server instance on your organization's network, and a server instance on another network, such as an instance supplied by a cloud service provider.
- You want to have multiple on-premise or off-site deployments administered as separate units, without giving one administrator account privileges on all the deployments.
- You want to have an administrator account that enables an administrator to perform only operations that are directly relevant to the replication channel and the databases it replicates, rather than having wide privileges on the server instance.

You can increase the security of a replication channel where privilege checks are applied by adding one or both of these options to the CHANGE REPLICATION SOURCE TO statement when you specify the PRIVILEGE_CHECKS_USER account for the channel:
- The REQUIRE_ROW_FORMAT option makes the replication channel accept only row-based replication events. When REQUIRE_ROW_FORMAT is set, you must use row-based binary logging (binlog_format=ROW) on the source server. With statement-based binary logging, some administrator-level privileges might be required for the PRIVILEGE_CHECKS_USER account to execute transactions successfully.
- The REQUIRE_TABLE_PRIMARY_KEY_CHECK option makes the replication channel use its own policy for primary key checks. Setting ON means that primary keys are always required, and setting OFF means that primary keys are never required. The default setting, STREAM, sets the session value of the sql_require_primary_key system variable using the value that is replicated from the source for each transaction. When PRIVILEGE_CHECKS_USER is set, setting REQUIRE_TABLE_PRIMARY_KEY_CHECK to either ON or OFF means that the user account does not need session administration level privileges to set restricted session variables, which are required to change the value of sql_require_primary_key. It also normalizes the behavior across replication channels for different sources.

You grant the REPLICATION_APPLIER privilege to enable a user account to appear as the PRIVILEGE_CHECKS_USER for a replication applier thread, and to execute the internal-use BINLOG statements used by mysqlbinlog. The user name and host name for the PRIVILEGE_CHECKS_USER account must follow the syntax described in Section 8.2.4, "Specifying Account Names", and the user must not be an anonymous user (with a blank user name) or the CURRENT_USER. To create a new account, use CREATE USER. To grant this account the REPLICATION_APPLIER privilege, use the GRANT statement. For example, to create a user account priv_repl, which can be used manually by an administrator from any host in the example.com domain, and requires an encrypted connection, issue the following statements:
```
mysql> SET sql_log_bin = 0;
mysql> CREATE USER 'priv_repl'@'%.example.com' IDENTIFIED BY 'password' REQUIRE SSL;
mysql> GRANT REPLICATION_APPLIER ON *.* TO 'priv_repl'@'%.example.com';
mysql> SET sql_log_bin = 1;
```


The SET sql_log_bin statements are used so that the account management statements are not added to the binary log and sent to the replication channels (see Section 15.4.1.3, "SET sql_log_bin Statement").

/

\section*{Important}

The caching_sha2_password authentication plugin is the default for new users (for details, see Section 8.4.1.2, "Caching SHA-2 Pluggable

I
Authentication"). To connect to a server using a user account that authenticates with this plugin, you must either set up an encrypted connection as described in Section 19.3.1, "Setting Up Replication to Use Encrypted Connections", or enable the unencrypted connection to support password exchange using an RSA key pair.

After setting up the user account, use the GRANT statement to grant additional privileges to enable the user account to make the database changes that you expect the applier thread to carry out, such as updating specific tables held on the server. These same privileges enable an administrator to use the account if they need to execute any of those transactions manually on the replication channel. If an unexpected operation is attempted for which you did not grant the appropriate privileges, the operation is disallowed and the replication applier thread stops with an error. Section 19.3.3.1, "Privileges For The Replication PRIVILEGE_CHECKS_USER Account" explains what additional privileges the account needs. For example, to grant the priv_repl user account the INSERT privilege to add rows to the cust table in db1, issue the following statement:
mysql> GRANT INSERT ON db1.cust TO 'priv_repl'@'\%.example.com';
You assign the PRIVILEGE_CHECKS_USER account for a replication channel using a CHANGE REPLICATION SOURCE TO statement. If replication is running, issue STOP REPLICA before the CHANGE REPLICATION SOURCE TO statement, and START REPLICA after it. The use of row-based binary logging is strongly recommended when PRIVILEGE_CHECKS_USER is set; you can use the statement to set REQUIRE_ROW_FORMAT to enforce this.

When you restart the replication channel, checks on dynamic privileges are applied from that point on. However, static global privileges are not active in the applier's context until you reload the grant tables, because these privileges are not changed for a connected client. To activate static privileges, perform a flush-privileges operation. This can be done by issuing a FLUSH PRIVILEGES statement or by executing a mysqladmin flush-privileges or mysqladmin reload command.

For example, to start privilege checks on the channel channel_1 on a running replica, issue the following statements:
```
mysql> STOP REPLICA FOR CHANNEL 'channel_1';
mysql> CHANGE REPLICATION SOURCE TO
    > PRIVILEGE_CHECKS_USER = 'priv_repl'@'%.example.com',
    > REQUIRE_ROW_FORMAT = 1 FOR CHANNEL 'channel_1';
mysql> FLUSH PRIVILEGES;
mysql> START REPLICA FOR CHANNEL 'channel_1';
```


If you do not specify a channel and no other channels exist, the statement is applied to the default channel. The user name and host name for the PRIVILEGE_CHECKS_USER account for a channel are shown in the Performance Schema replication_applier_configuration table, where they are properly escaped so they can be copied directly into SQL statements to execute individual transactions.

If you are using the Rewriter plugin, you should grant the PRIVILEGE_CHECKS_USER user account the SKIP_QUERY_REWRITE privilege. This prevents statements issued by this user from being rewritten. See Section 7.6.4, "The Rewriter Query Rewrite Plugin", for more information.

When REQUIRE_ROW_FORMAT is set for a replication channel, the replication applier does not create or drop temporary tables, and so does not set the pseudo_thread_id session system variable. It does not execute LOAD DATA INFILE instructions, and so does not attempt file operations to access or delete the temporary files associated with data loads (logged as a Format_description_log_event). It does not execute INTVAR, RAND, and USER_VAR events, which are used to reproduce the client's connection state for statement-based replication. (An exception is USER_VAR events that are associated with DDL queries, which are executed.) It does not execute any statements that are logged within DML transactions. If the replication applier detects any of these types of event while attempting to queue or apply a transaction, the event is not applied, and replication stops with an error.

You can set REQUIRE_ROW_FORMAT for a replication channel whether or not you set a PRIVILEGE_CHECKS_USER account. The restrictions implemented when you set this option increase the security of the replication channel even without privilege checks. You can also specify the - -require-row-format option when you use mysqlbinlog, to enforce row-based replication events in mysqlbinlog output.

Security Context. By default, when a replication applier thread is started with a user account specified as the PRIVILEGE_CHECKS_USER, the security context is created using default roles, or with all roles if activate_all_roles_on_login is set to ON.

You can use roles to supply a general privilege set to accounts that are used as PRIVILEGE_CHECKS_USER accounts, as in the following example. Here, instead of granting the INSERT privilege for the db1.cust table directly to a user account as in the earlier example, this privilege is granted to the role priv_repl_role along with the REPLICATION_APPLIER privilege. The role is then used to grant the privilege set to two user accounts, both of which can now be used as PRIVILEGE_CHECKS_USER accounts:
```
mysql> SET sql_log_bin = 0;
mysql> CREATE USER 'priv_repa'@'%.example.com'
    IDENTIFIED BY 'password'
    REQUIRE SSL;
mysql> CREATE USER 'priv_repb'@'%.example.com'
    IDENTIFIED BY 'password'
    REQUIRE SSL;
mysql> CREATE ROLE 'priv_repl_role';
mysql> GRANT REPLICATION_APPLIER TO 'priv_repl_role';
mysql> GRANT INSERT ON db1.cust TO 'priv_repl_role';
mysql> GRANT 'priv_repl_role' TO
    'priv_repa'@'%.example.com',
    'priv_repb'@'%.example.com';
mysql> SET DEFAULT ROLE 'priv_repl_role' TO
    'priv_repa'@'%.example.com',
    'priv_repb'@'%.example.com';
mysql> SET sql_log_bin = 1;
```


Be aware that when the replication applier thread creates the security context, it checks the privileges for the PRIVILEGE_CHECKS_USER account, but does not carry out password validation, and does not carry out checks relating to account management, such as checking whether the account is locked. The security context that is created remains unchanged for the lifetime of the replication applier thread.

\subsection*{19.3.3.1 Privileges For The Replication PRIVILEGE_CHECKS_USER Account}

The user account that is specified using the CHANGE REPLICATION SOURCE TO statement as the PRIVILEGE_CHECKS_USER account for a replication channel must have the REPLICATION_APPLIER privilege, otherwise the replication applier thread does not start. As explained in Section 19.3.3, "Replication Privilege Checks", the account requires further privileges that are sufficient to apply all the expected transactions expected on the replication channel. These privileges are checked only when relevant transactions are executed.

The use of row-based binary logging (binlog_format=ROW) is strongly recommended for replication channels that are secured using a PRIVILEGE_CHECKS_USER account. With statement-based binary logging, some administrator-level privileges might be required for the PRIVILEGE_CHECKS_USER account to execute transactions successfully. The REQUIRE_ROW_FORMAT setting can be applied to secured channels, which restricts the channel from executing events that would require these privileges.

The REPLICATION_APPLIER privilege explicitly or implicitly allows the PRIVILEGE_CHECKS_USER account to carry out the following operations that a replication thread needs to perform:
- Setting the value of the system variables gtid_next, original_commit_timestamp, original_server_version, immediate_server_version, and pseudo_replica_mode, to apply appropriate metadata and behaviors when executing transactions.
- Executing internal-use BINLOG statements to apply mysqlbinlog output, provided that the account also has permission for the tables and operations in those statements.
- Updating the system tables mysql.gtid_executed, mysql.slave_relay_log_info, mysql.slave_worker_info, and mysql.slave_master_info, to update replication metadata. (If events access these tables explicitly for other purposes, you must grant the appropriate privileges on the tables.)
- Applying a binary log Table_map_log_event, which provides table metadata but does not make any database changes.

If the REQUIRE_TABLE_PRIMARY_KEY_CHECK option of the CHANGE REPLICATION SOURCE TO statement is set to the default value STREAM, the PRIVILEGE_CHECKS_USER account needs privileges sufficient to set restricted session variables, so that it can change the value of the sql_require_primary_key system variable for the duration of a session to match the setting replicated from the source. The SESSION_VARIABLES_ADMIN privilege gives the account this capability. This privilege also allows the account to apply mysqlbinlog output that was created using the --disable-log-bin option. If you set REQUIRE_TABLE_PRIMARY_KEY_CHECK to either ON or OFF, the replica always uses that value for the sql_require_primary_key system variable in replication operations, and so does not need these session administration level privileges.

If table encryption is in use, the table_encryption_privilege_check system variable is set to ON, and the encryption setting for the tablespace involved in any event differs from the applying server's default encryption setting (specified by the default_table_encryption system variable), the PRIVILEGE_CHECKS_USER account needs the TABLE_ENCRYPTION_ADMIN privilege in order to override the default encryption setting. It is strongly recommended that you do not grant this privilege. Instead, ensure that the default encryption setting on a replica matches the encryption status of the tablespaces that it replicates, and that replication group members have the same default encryption setting, so that the privilege is not needed.

In order to execute specific replicated transactions from the relay log, or transactions from mysqlbinlog output as required, the PRIVILEGE_CHECKS_USER account must have the following privileges:
- For a row insertion logged in row format (which are logged as a Write_rows_log_event), the INSERT privilege on the relevant table.
- For a row update logged in row format (which are logged as an Update_rows_log_event), the UPDATE privilege on the relevant table.
- For a row deletion logged in row format (which are logged as a Delete_rows_log_event), the DELETE privilege on the relevant table.

If statement-based binary logging is in use (which is not recommended with a PRIVILEGE_CHECKS_USER account), for a transaction control statement such as BEGIN or COMMIT or DML logged in statement format (which are logged as a Query_log_event), the PRIVILEGE_CHECKS_USER account needs privileges to execute the statement contained in the event.

If LOAD DATA operations need to be carried out on the replication channel, use row-based binary logging (binlog_format=ROW). With this logging format, the FILE privilege is not needed to execute the event, so do not give the PRIVILEGE_CHECKS_USER account this privilege. The use of rowbased binary logging is strongly recommended with replication channels that are secured using a PRIVILEGE_CHECKS_USER account. If REQUIRE_ROW_FORMAT is set for the channel, row-based binary logging is required. The Format_description_log_event, which deletes any temporary files created by LOAD DATA events, is processed without privilege checks. For more information, see Section 19.5.1.19, "Replication and LOAD DATA".

If the init_replica system variable is set to specify one or more SQL statements to be executed when the replication SQL thread starts, the PRIVILEGE_CHECKS_USER account must have the privileges needed to execute these statements.

It is recommended that you never give any ACL privileges to the PRIVILEGE_CHECKS_USER account, including CREATE USER, CREATE ROLE, DROP ROLE, and GRANT OPTION, and do not permit the account to update the mysql. user table. With these privileges, the account could be used to create or modify user accounts on the server. To avoid ACL statements issued on the source server being replicated to the secured channel for execution (where they fail in the absence of these privileges), you can issue SET sql_log_bin $=0$ before all ACL statements and SET sql_log_bin = 1 after them, to omit the statements from the source's binary log. Alternatively, you can set a dedicated current database before executing all ACL statements, and use a replication filter (--binlog-ignore-db) to filter out this database on the replica.

\subsection*{19.3.3.2 Privilege Checks For Group Replication Channels}

You can also use a PRIVILEGE_CHECKS_USER account to secure the two replication applier threads used by Group Replication. The group_replication_applier thread on each group member is used for applying group transactions, and the group_replication_recovery thread on each group member is used for state transfer from the binary log as part of distributed recovery when the member joins or rejoins the group.

To secure one of these threads, stop Group Replication, then issue the CHANGE REPLICATION SOURCE TO statement with the PRIVILEGE_CHECKS_USER option, specifying group_replication_applier or group_replication_recovery as the channel name. For example:
```
mysql> STOP GROUP_REPLICATION;
mysql> CHANGE REPLICATION SOURCE TO PRIVILEGE_CHECKS_USER = 'gr_repl'@'%.example.com'
    FOR CHANNEL 'group_replication_recovery';
mysql> FLUSH PRIVILEGES;
mysql> START GROUP_REPLICATION;
```


For Group Replication channels, the REQUIRE_ROW_FORMAT setting is automatically enabled when the channel is created, and cannot be disabled, so you do not need to specify this.

Group Replication requires every table that is to be replicated by the group to have a defined primary key, or primary key equivalent where the equivalent is a non-null unique key. Rather than using the checks carried out by the sql_require_primary_key system variable, Group Replication has its own built-in set of checks for primary keys or primary key equivalents. You may set the REQUIRE_TABLE_PRIMARY_KEY_CHECK option of the CHANGE REPLICATION SOURCE TO statement to ON for a Group Replication channel. However, be aware that you might find some transactions that are permitted under Group Replication's built-in checks are not permitted under the checks carried out when you set sql_require_primary_key = ON or REQUIRE_TABLE_PRIMARY_KEY_CHECK = ON. For this reason, new and upgraded Group Replication channels have REQUIRE_TABLE_PRIMARY_KEY_CHECK set to the default value STREAM, rather than ON.

If a remote cloning operation is used for distributed recovery in Group Replication (see Section 20.5.4.2, "Cloning for Distributed Recovery"), the PRIVILEGE_CHECKS_USER account and related settings from the donor are cloned to the joining member. If the joining member is set to start Group Replication on boot, it automatically uses the account for privilege checks on the appropriate replication channels.

\subsection*{19.3.3.3 Recovering From Failed Replication Privilege Checks}

If a privilege check against the PRIVILEGE_CHECKS_USER account fails, the transaction is not executed and replication stops for the channel. Details of the error and the last applied transaction are recorded in the Performance Schema replication_applier_status_by_worker table. Follow this procedure to recover from the error:
1. Identify the replicated event that caused the error and verify whether or not the event is expected and from a trusted source. You can use mysqlbinlog to retrieve and display the events that were logged around the time of the error. For instructions to do this, see Section 9.5, "Point-in-Time (Incremental) Recovery".
2. If the replicated event is not expected or is not from a known and trusted source, investigate the cause. If you can identify why the event took place and there are no security considerations, proceed to fix the error as described below.
3. If the PRIVILEGE_CHECKS_USER account should have been permitted to execute the transaction, but has been misconfigured, grant the missing privileges to the account, use a FLUSH PRIVILEGES statement or execute a mysqladmin flush-privileges or mysqladmin reload command to reload the grant tables, then restart replication for the channel.
4. If the transaction needs to be executed and you have verified that it is trusted, but the PRIVILEGE_CHECKS_USER account should not have this privilege normally, you can grant the required privilege to the PRIVILEGE_CHECKS_USER account temporarily. After the replicated event has been applied, remove the privilege from the account, and take any necessary steps to ensure the event does not recur if it is avoidable.
5. If the transaction is an administrative action that should only have taken place on the source and not on the replica, or should only have taken place on a single replication group member, skip the transaction on the server or servers where it stopped replication, then issue START REPLICA to restart replication on the channel. To avoid the situation in future, you could issue such administrative statements with SET sql_log_bin $=0$ before them and SET sql_log_bin = 1 after them, so that they are not logged on the source.
6. If the transaction is a DDL or DML statement that should not have taken place on either the source or the replica, skip the transaction on the server or servers where it stopped replication, undo the transaction manually on the server where it originally took place, then issue START REPLICA to restart replication.

To skip a transaction, if GTIDs are in use, commit an empty transaction that has the GTID of the failing transaction, for example:
```
SET GTID_NEXT='aaa-bbb-ccc-ddd:N';
BEGIN;
COMMIT;
SET GTID_NEXT='AUTOMATIC';
```


If GTIDs are not in use, issue a SET GLOBAL sql_replica_skip_counter statement to skip the event. For instructions to use this alternative method and more details about skipping transactions, see Section 19.1.7.3, "Skipping Transactions".

\subsection*{19.4 Replication Solutions}

Replication can be used in many different environments for a range of purposes. This section provides general notes and advice on using replication for specific solution types.

For information on using replication in a backup environment, including notes on the setup, backup procedure, and files to back up, see Section 19.4.1, "Using Replication for Backups".

For advice and tips on using different storage engines on the source and replica, see Section 19.4.4, "Using Replication with Different Source and Replica Storage Engines".

Using replication as a scale-out solution requires some changes in the logic and operation of applications that use the solution. See Section 19.4.5, "Using Replication for Scale-Out".

For performance or data distribution reasons, you may want to replicate different databases to different replicas. See Section 19.4.6, "Replicating Different Databases to Different Replicas"

As the number of replicas increases, the load on the source can increase and lead to reduced performance (because of the need to replicate the binary log to each replica). For tips on improving your replication performance, including using a single secondary server as the source, see Section 19.4.7, "Improving Replication Performance".

For guidance on switching sources, or converting replicas into sources as part of an emergency failover solution, see Section 19.4.8, "Switching Sources During Failover".

For information on security measures specific to servers in a replication topology, see Section 19.3, "Replication Security".

\subsection*{19.4.1 Using Replication for Backups}

To use replication as a backup solution, replicate data from the source to a replica, and then back up the replica. The replica can be paused and shut down without affecting the running operation of the source, so you can produce an effective snapshot of "live" data that would otherwise require the source to be shut down.

How you back up a database depends on its size and whether you are backing up only the data, or the data and the replica state so that you can rebuild the replica in the event of failure. There are therefore two choices:
- If you are using replication as a solution to enable you to back up the data on the source, and the size of your database is not too large, the mysqldump tool may be suitable. See Section 19.4.1.1, "Backing Up a Replica Using mysqldump".
- For larger databases, where mysqldump would be impractical or inefficient, you can back up the raw data files instead. Using the raw data files option also means that you can back up the binary and relay logs that make it possible to re-create the replica in the event of a replica failure. For more information, see Section 19.4.1.2, "Backing Up Raw Data from a Replica".

Another backup strategy, which can be used for either source or replica servers, is to put the server in a read-only state. The backup is performed against the read-only server, which then is changed back to its usual read/write operational status. See Section 19.4.1.3, "Backing Up a Source or Replica by Making It Read Only".

\subsection*{19.4.1.1 Backing Up a Replica Using mysqldump}

Using mysqldump to create a copy of a database enables you to capture all of the data in the database in a format that enables the information to be imported into another instance of MySQL Server (see Section 6.5.4, "mysqldump - A Database Backup Program"). Because the format of the information is SQL statements, the file can easily be distributed and applied to running servers in the event that you need access to the data in an emergency. However, if the size of your data set is very large, mysqldump may be impractical.

> Tip
> Consider using the MySQL Shell dump utilities, which provide parallel dumping with multiple threads, file compression, and progress information display, as well as cloud features such as Oracle Cloud Infrastructure Object Storage streaming, and MySQL HeatWave compatibility checks and modifications. Dumps can be easily imported into a MySQL Server instance or a MySQL HeatWave DB System using the MySQL Shell load dump utilities. Installation instructions for MySQL Shell can be found here.

When using mysqldump, you should stop replication on the replica before starting the dump process to ensure that the dump contains a consistent set of data:
1. Stop the replica from processing requests. You can stop replication completely on the replica using mysqladmin:
```
$> mysqladmin stop-replica
```


Alternatively, you can stop only the replication SQL thread to pause event execution:
\$> mysql -e 'STOP REPLICA SQL_THREAD;'
This enables the replica to continue to receive data change events from the source's binary log and store them in the relay logs using the replication receiver thread, but prevents the replica from executing these events and changing its data. Within busy replication environments, permitting the replication receiver thread to run during backup may speed up the catch-up process when you restart the replication applier thread.
2. Run mysqldump to dump your databases. You may either dump all databases or select databases to be dumped. For example, to dump all databases:
```
$> mysqldump --all-databases > fulldb.dump
```

3. Once the dump has completed, start replication again:
```
$> mysqladmin start-replica
```


In the preceding example, you may want to add login credentials (user name, password) to the commands, and bundle the process up into a script that you can run automatically each day.

If you use this approach, make sure you monitor the replication process to ensure that the time taken to run the backup does not affect the replica's ability to keep up with events from the source. See Section 19.1.7.1, "Checking Replication Status". If the replica is unable to keep up, you may want to add another replica and distribute the backup process. For an example of how to configure this scenario, see Section 19.4.6, "Replicating Different Databases to Different Replicas".

\subsection*{19.4.1.2 Backing Up Raw Data from a Replica}

To guarantee the integrity of the files that are copied, backing up the raw data files on your MySQL replica should take place while your replica server is shut down. If the MySQL server is still running, background tasks may still be updating the database files, particularly those involving storage engines with background processes such as InnoDB. With InnoDB, these problems should be resolved during crash recovery, but since the replica server can be shut down during the backup process without affecting the execution of the source it makes sense to take advantage of this capability.

To shut down the server and back up the files:
1. Shut down the replica MySQL server:
```
$> mysqladmin shutdown
```

2. Copy the data files. You can use any suitable copying or archive utility, including cp, tar or WinZip. For example, assuming that the data directory is located under the current directory, you can archive the entire directory as follows:
```
$> tar cf /tmp/dbbackup.tar ./data
```

3. Start the MySQL server again. Under Unix:
```
$> mysqld_safe &
```


Under Windows:
```
C:\> "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqld"
```


Normally you should back up the entire data directory for the replica MySQL server. If you want to be able to restore the data and operate as a replica (for example, in the event of failure of the replica), in addition to the data, you need to have the replica's connection metadata repository and applier metadata repository, and the relay log files. These items are needed to resume replication after you restore the replica's data. Assuming tables have been used for the replica's connection metadata repository and applier metadata repository (see Section 19.2.4, "Relay Log and Replication Metadata

Repositories"), which is the default in MySQL 8.4, these tables are backed up along with the data directory. If files have been used for the repositories, which is deprecated, you must back these up separately. The relay log files must be backed up separately if they have been placed in a different location to the data directory.

If you lose the relay logs but still have the relay-log.info file, you can check it to determine how far the replication SQL thread has executed in the source's binary logs. Then you can use CHANGE REPLICATION SOURCE TO with the SOURCE_LOG_FILE and SOURCE_LOG_POS options to tell the replica to re-read the binary logs from that point. This requires that the binary logs still exist on the source server.

If your replica is replicating LOAD DATA statements, you should also back up any SQL_LOAD - * files that exist in the directory that the replica uses for this purpose. The replica needs these files to resume replication of any interrupted LOAD DATA operations. The location of this directory is the value of the system variable replica_load_tmpdir. If the server was not started with that variable set, the directory location is the value of the tmpdir system variable.

\subsection*{19.4.1.3 Backing Up a Source or Replica by Making It Read Only}

It is possible to back up either source or replica servers in a replication setup by acquiring a global read lock and manipulating the read_only system variable to change the read-only state of the server to be backed up:
1. Make the server read-only, so that it processes only retrievals and blocks updates.
2. Perform the backup.
3. Change the server back to its normal read/write state.

\section*{Note}

The instructions in this section place the server to be backed up in a state that is safe for backup methods that get the data from the server, such as mysqldump (see Section 6.5.4, "mysqldump — A Database Backup Program"). You should not attempt to use these instructions to make a binary backup by copying files directly because the server may still have modified data cached in memory and not flushed to disk.

The following instructions describe how to do this for a source and for a replica. For both scenarios discussed here, suppose that you have the following replication setup:
- A source server S1
- A replica server R1 that has S1 as its source
- A client C1 connected to S1
- A client C2 connected to R1

In either scenario, the statements to acquire the global read lock and manipulate the read_only variable are performed on the server to be backed up and do not propagate to any replicas of that server.

\section*{Scenario 1: Backup with a Read-Only Source}

Put the source S1 in a read-only state by executing these statements on it:
```
mysql> FLUSH TABLES WITH READ LOCK;
mysql> SET GLOBAL read_only = ON;
```


While S1 is in a read-only state, the following properties are true:
- Requests for updates sent by C1 to S1 block because the server is in read-only mode.
- Requests for query results sent by C1 to S1 succeed.
- Making a backup on S1 is safe.
- Making a backup on R1 is not safe. This server is still running, and might be processing the binary log or update requests coming from client C2.

While S1 is read only, perform the backup. For example, you can use mysqldump.
After the backup operation on S1 completes, restore S1 to its normal operational state by executing these statements:
```
mysql> SET GLOBAL read_only = OFF;
mysql> UNLOCK TABLES;
```


Although performing the backup on S1 is safe (as far as the backup is concerned), it is not optimal for performance because clients of S1 are blocked from executing updates.

This strategy applies to backing up a source in a replication setup, but can also be used for a single server in a nonreplication setting.

\section*{Scenario 2: Backup with a Read-Only Replica}

Put the replica R1 in a read-only state by executing these statements on it:
```
mysql> FLUSH TABLES WITH READ LOCK;
mysql> SET GLOBAL read_only = ON;
```


While R1 is in a read-only state, the following properties are true:
- The source S 1 continues to operate, so making a backup on the source is not safe.
- The replica R1 is stopped, so making a backup on the replica R1 is safe.

These properties provide the basis for a popular backup scenario: Having one replica busy performing a backup for a while is not a problem because it does not affect the entire network, and the system is still running during the backup. In particular, clients can still perform updates on the source server, which remains unaffected by backup activity on the replica.

While R1 is read only, perform the backup. For example, you can use mysqldump.
After the backup operation on R1 completes, restore R1 to its normal operational state by executing these statements:
```
mysql> SET GLOBAL read_only = OFF;
mysql> UNLOCK TABLES;
```


After the replica is restored to normal operation, it again synchronizes to the source by catching up with any outstanding updates from the source's binary log.

\subsection*{19.4.2 Handling an Unexpected Halt of a Replica}

In order for replication to be resilient to unexpected halts of the server (sometimes described as crashsafe) it must be possible for the replica to recover its state before halting. This section describes the impact of an unexpected halt of a replica during replication, and how to configure a replica for the best chance of recovery to continue replication.

After an unexpected halt of a replica, upon restart the replication SQL thread must recover information about which transactions have been executed already. The information required for recovery is stored
in the replica's applier metadata repository. This repository is created by default as an InnoDB table named mysql.slave_relay_log_info. By using this transactional storage engine the information is always recoverable upon restart. Updates to the applier metadata repository are committed together with the transactions, meaning that the replica's progress information recorded in that repository is always consistent with what has been applied to the database, even in the event of an unexpected server halt. For more information on the applier metadata repository, see Section 19.2.4, "Relay Log and Replication Metadata Repositories".

DML transactions and also atomic DDL update the replication positions in the replica's applier metadata repository in the mysql.slave_relay_log_info table together with applying the changes to the database, as an atomic operation. In all other cases, including DDL statements that are not fully atomic, and exempted storage engines that do not support atomic DDL, the mysql.slave_relay_log_info table might be missing updates associated with replicated data if the server halts unexpectedly. Restoring updates in this case is a manual process. For details on atomic DDL support in MySQL 8.4, and the resulting behavior for the replication of certain statements, see Section 15.1.1, "Atomic Data Definition Statement Support".

The recovery process by which a replica recovers from an unexpected halt varies depending on the configuration of the replica. The details of the recovery process are influenced by the chosen method of replication, whether the replica is single-threaded or multithreaded, and the setting of relevant system variables. The overall aim of the recovery process is to identify what transactions had already been applied on the replica's database before the unexpected halt occurred, and retrieve and apply the transactions that the replica missed following the unexpected halt.
- For GTID-based replication, the recovery process needs the GTIDs of the transactions that were already received or committed by the replica. The missing transactions can be retrieved from the source using GTID auto-positioning, which automatically compares the source's transactions to the replica's transactions and identifies the missing transactions.
- For file position based replication, the recovery process needs an accurate replication SQL thread (applier) position showing the last transaction that was applied on the replica. Based on that position, the replication I/O thread (receiver) retrieves from the source's binary log all of the transactions that should be applied on the replica from that point on.

Using GTID-based replication makes it easiest to configure replication to be resilient to unexpected halts. GTID auto-positioning means the replica can reliably identify and retrieve missing transactions, even if there are gaps in the sequence of applied transactions.

The following information provides combinations of settings that are appropriate for different types of replica to guarantee recovery as far as this is under the control of replication.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3557.jpg?height=113&width=106&top_left_y=1909&top_left_x=365)

\section*{Important}

Some factors outside the control of replication can have an impact on the replication recovery process and the overall state of replication after the recovery process. In particular, the settings that influence the recovery process for individual storage engines might result in transactions being lost in the event of an unexpected halt of a replica, and therefore unavailable to the replication recovery process. The innodb_flush_log_at_trx_commit=1 setting mentioned in the list below is a key setting for a replication setup that uses InnoDB with transactions. However, other settings specific to InnoDB or to other storage engines, especially those relating to flushing or synchronization, can also have an impact. Always check for and apply recommendations made by your chosen storage engines about crash-safe settings.

The following combination of settings on a replica is the most resilient to unexpected halts:
- When GTID-based replication is in use (gtid_mode=0N), set SOURCE_AUTO_POSITION=1, which activates GTID auto-positioning for the connection to the source to automatically identify and retrieve missing transactions. This option is set using a CHANGE REPLICATION SOURCE TO statement. If
the replica has multiple replication channels, you need to set this option for each channel individually. For details of how GTID auto-positioning works, see Section 19.1.3.3, "GTID Auto-Positioning". When file position based replication is in use, SOURCE_AUTO_POSITION=1 is not used, and instead the binary log position or relay log position is used to control where replication starts.
- When GTID-based replication is in use (gtid_mode=0N), set GTID_ONLY=1, which makes the replica use only GTIDs in the recovery process, and stop persisting binary log and relay log file names and file positions in the replication metadata repositories. This option is set using a CHANGE REPLICATION SOURCE TO statement. If the replica has multiple replication channels, you need to set this option for each channel individually. With GTID_ONLY=1, during recovery, the file position information is ignored and GTID auto-skip is used to skip transactions that have already been supplied, rather than identifying the correct file position. This strategy is more efficient provided that you purge relay logs using the default setting for relay_log_purge, which means only one relay log file needs to be inspected.
- Set sync_relay_log=1, which instructs the replication receiver thread to synchronize the relay log to disk after each received transaction is written to it. This means the replica's record of the current position read from the source's binary log (in the applier metadata repository) is never ahead of the record of transactions saved in the relay log. Note that although this setting is the safest, it is also the slowest due to the number of disk writes involved. With sync_relay_log $>1$, or sync_relay_log=0 (where synchronization is handled by the operating system), in the event of an unexpected halt of a replica there might be committed transactions that have not been synchronized to disk. Such transactions can cause the recovery process to fail if the recovering replica, based on the information it has in the relay log as last synchronized to disk, tries to retrieve and apply the transactions again instead of skipping them. Setting sync_relay_log=1 is particularly important for a multi-threaded replica, where the recovery process fails if gaps in the sequence of transactions cannot be filled using the information in the relay log. For a single-threaded replica, the recovery process only needs to use the relay log if the relevant information is not available in the applier metadata repository.
- Set innodb_flush_log_at_trx_commit=1, which synchronizes the InnoDB logs to disk before each transaction is committed. This setting, which is the default, ensures that InnoDB tables and the InnoDB logs are saved on disk so that there is no longer a requirement for the information in the relay log regarding the transaction. Combined with the setting sync_relay_log=1, this setting further ensures that the content of the InnoDB tables and the InnoDB logs is consistent with the content of the relay log at all times, so that purging the relay log files cannot cause unfillable gaps in the replica's history of transactions in the event of an unexpected halt.
- Set relay_log_info_repository = TABLE, which stores the replication SQL thread position in the InnoDB table mysql.slave_relay_log_info, and updates it together with the transaction commit to ensure a record that is always accurate. This setting is the default; FILE is deprecated. The system variable itself is also deprecated, so omit it and allow it to assume the default. If FILE is used, the information is stored in a file in the data directory that is updated after the transaction has been applied. This creates a risk of losing synchrony with the source depending at which stage of processing a transaction the replica halts at, or even corruption of the file itself. With relay_log_info_repository = FILE, recovery is not guaranteed.
- Set relay_log_recovery = ON, which enables automatic relay log recovery immediately following server startup. This global variable defaults to 0FF and is read-only at runtime, but you can set it to ON with the --relay-log-recovery option at replica startup following an unexpected halt of a replica. Note that this setting ignores the existing relay log files, in case they are corrupted or inconsistent. The relay log recovery process starts a new relay log file and fetches transactions from the source beginning at the replication SQL thread position recorded in the applier metadata repository. The previous relay log files are removed over time by the replica's normal purge mechanism.

For a multithreaded replica, setting relay_log_recovery = ON automatically handles any inconsistencies and gaps in the sequence of transactions that have been executed from the relay log. These gaps can occur when file position based replication is in use. (For more details, see Section 19.5.1.34, "Replication and Transaction Inconsistencies".) The relay log recovery process
deals with gaps using the same method as the START REPLICA UNTIL SQL_AFTER_MTS_GAPS statement would. When the replica reaches a consistent gap-free state, the relay log recovery process goes on to fetch further transactions from the source beginning at the replication SQL thread position. When GTID-based replication is in use, a multithreaded replica checks first whether SOURCE_AUTO_POSITION is set to ON, and if it is, omits the step of calculating the transactions that should be skipped or not skipped, so that the old relay logs are not required for the recovery process.

\subsection*{19.4.3 Monitoring Row-based Replication}

The current progress of the replication applier (SQL) thread when using row-based replication is monitored through Performance Schema instrument stages, enabling you to track the processing of operations and check the amount of work completed and work estimated. When these Performance Schema instrument stages are enabled the events_stages_current table shows stages for applier threads and their progress. For background information, see Section 29.12.5, "Performance Schema Stage Event Tables".

To track progress of all three row-based replication event types (write, update, delete):
- Enable the three Performance Schema stages by issuing:
```
mysql> UPDATE performance_schema.setup_instruments SET ENABLED = 'YES'
    -> WHERE NAME LIKE 'stage/sql/Applying batch of row changes%';
```

- Wait for some events to be processed by the replication applier thread and then check progress by looking into the events_stages_current table. For example to get progress for update events issue:
```
mysql> SELECT WORK_COMPLETED, WORK_ESTIMATED FROM performance_schema.events_stages_current
    -> WHERE EVENT_NAME LIKE 'stage/sql/Applying batch of row changes (update)'
```

- If binlog_rows_query_log_events is enabled, information about queries is stored in the binary log and is exposed in the processlist_info field. To see the original query that triggered this event:
```
mysql> SELECT db, processlist_state, processlist_info FROM performance_schema.threads
    -> WHERE processlist_state LIKE 'stage/sql/Applying batch of row changes%' AND thread_id = N;
```


\subsection*{19.4.4 Using Replication with Different Source and Replica Storage Engines}

It does not matter for the replication process whether the original table on the source and the replicated table on the replica use different storage engine types. In fact, the default_storage_engine system variable is not replicated.

This provides a number of benefits in the replication process in that you can take advantage of different engine types for different replication scenarios. For example, in a typical scale-out scenario (see Section 19.4.5, "Using Replication for Scale-Out"), you want to use InnoDB tables on the source to take advantage of the transactional functionality, but use MyISAM on the replicas where transaction support is not required because the data is only read. When using replication in a data-logging environment you may want to use the Archive storage engine on the replica.

Configuring different engines on the source and replica depends on how you set up the initial replication process:
- If you used mysqldump to create the database snapshot on your source, you could edit the dump file text to change the engine type used on each table.

Another alternative for mysqldump is to disable engine types that you do not want to use on the replica before using the dump to build the data on the replica. For example, you can add the - -skip-federated option on your replica to disable the FEDERATED engine. If a specific engine does not exist for a table to be created, MySQL uses the default engine type, usually InnoDB. (This requires that the NO_ENGINE_SUBSTITUTION SQL mode is not enabled.) If you want to disable
additional engines in this way, you may want to consider building a special binary to be used on the replica that supports only the engines you want.
- If you use raw data files (a binary backup) to set up the replica, it is not possible to change the initial table format. Instead, use ALTER TABLE to change the table types after the replica has been started.
- For new source/replica replication setups where there are currently no tables on the source, avoid specifying the engine type when creating new tables.

If you are already running a replication solution and want to convert your existing tables to another engine type, follow these steps:
1. Stop the replica from running replication updates:
```
mysql> STOP REPLICA;
```


This makes it possible to change engine types without interruption.
2. Execute an ALTER TABLE ... ENGINE='engine_type' for each table to be changed.
3. Start the replication process again:
```
mysql> START REPLICA;
```


Although the default_storage_engine variable is not replicated, be aware that CREATE TABLE and ALTER TABLE statements that include the engine specification are replicated to the replica correctly. If, in the case of a CSV table, you execute this statement:
```
mysql> ALTER TABLE csvtable ENGINE='MyISAM';
```


This statement is replicated; the table's engine type on the replica is converted to InnoDB, even if you have previously changed the table type on the replica to an engine other than CSV. If you want to retain engine differences on the source and replica, you should be careful to use the default_storage_engine variable on the source when creating a new table. For example, instead of:
```
mysql> CREATE TABLE tablea (columna int) Engine=MyISAM;
```


Use this format:
```
mysql> SET default_storage_engine=MyISAM;
mysql> CREATE TABLE tablea (columna int);
```


When replicated, the default_storage_engine variable is ignored, and the CREATE TABLE statement executes on the replica using the replica's default engine.

\subsection*{19.4.5 Using Replication for Scale-Out}

You can use replication as a scale-out solution; that is, where you want to split up the load of database queries across multiple database servers, within some reasonable limitations.

Because replication works from the distribution of one source to one or more replicas, using replication for scale-out works best in an environment where you have a high number of reads and low number of writes/updates. Most websites fit into this category, where users are browsing the website, reading articles, posts, or viewing products. Updates only occur during session management, or when making a purchase or adding a comment/message to a forum.

Replication in this situation enables you to distribute the reads over the replicas, while still enabling your web servers to communicate with the source when a write is required. You can see a sample replication layout for this scenario in Figure 19.1, "Using Replication to Improve Performance During Scale-Out".

\begin{figure}
\captionsetup{labelformat=empty}
\caption{Figure 19.1 Using Replication to Improve Performance During Scale-Out}
\includegraphics[alt={},max width=\textwidth]{https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3561.jpg?height=1415&width=755&top_left_y=310&top_left_x=349}
\end{figure}

If the part of your code that is responsible for database access has been properly abstracted/ modularized, converting it to run with a replicated setup should be very smooth and easy. Change the implementation of your database access to send all writes to the source, and to send reads to either the source or a replica. If your code does not have this level of abstraction, setting up a replicated system gives you the opportunity and motivation to clean it up. Start by creating a wrapper library or module that implements the following functions:
- safe_writer_connect()
- safe_reader_connect()
- safe_reader_statement()
- safe_writer_statement()
safe_ in each function name means that the function takes care of handling all error conditions. You can use different names for the functions. The important thing is to have a unified interface for connecting for reads, connecting for writes, doing a read, and doing a write.

Then convert your client code to use the wrapper library. This may be a painful and scary process at first, but it pays off in the long run. All applications that use the approach just described are able to take advantage of a source/replica configuration, even one involving multiple replicas. The code is much easier to maintain, and adding troubleshooting options is trivial. You need modify only one or two
functions (for example, to log how long each statement took, or which statement among those issued gave you an error).

If you have written a lot of code, you may want to automate the conversion task by writing a conversion script. Ideally, your code uses consistent programming style conventions. If not, then you are probably better off rewriting it anyway, or at least going through and manually regularizing it to use a consistent style.

\subsection*{19.4.6 Replicating Different Databases to Different Replicas}

There may be situations where you have a single source server and want to replicate different databases to different replicas. For example, you may want to distribute different sales data to different departments to help spread the load during data analysis. A sample of this layout is shown in Figure 19.2, "Replicating Databases to Separate Replicas".

\begin{figure}
\captionsetup{labelformat=empty}
\caption{Figure 19.2 Replicating Databases to Separate Replicas}
\includegraphics[alt={},max width=\textwidth]{https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3562.jpg?height=444&width=766&top_left_y=893&top_left_x=283}
\end{figure}

You can achieve this separation by configuring the source and replicas as normal, and then limiting the binary log statements that each replica processes by using the --replicate-wild-do-table configuration option on each replica.

\section*{Important}

You should not use - - replicate-do-db for this purpose when using statement-based replication, since statement-based replication causes this option's effects to vary according to the database that is currently selected. This applies to mixed-format replication as well, since this enables some updates to be replicated using the statement-based format.

However, it should be safe to use - - replicate-do-db for this purpose if you are using row-based replication only, since in this case the currently selected database has no effect on the option's operation.

For example, to support the separation as shown in Figure 19.2, "Replicating Databases to Separate Replicas", you should configure each replica as follows, before executing START REPLICA:
- Replica 1 should use --replicate-wild-do-table=databaseA.\%.
- Replica 2 should use --replicate-wild-do-table=databaseB.\%.
- Replica 3 should use --replicate-wild-do-table=databaseC.\%.

Each replica in this configuration receives the entire binary log from the source, but executes only those events from the binary log that apply to the databases and tables included by the - -replicate-wild-do-table option in effect on that replica.

If you have data that must be synchronized to the replicas before replication starts, you have a number of choices:
- Synchronize all the data to each replica, and delete the databases, tables, or both that you do not want to keep.
- Use mysqldump to create a separate dump file for each database and load the appropriate dump file on each replica.
- Use a raw data file dump and include only the specific files and databases that you need for each replica.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3563.jpg?height=124&width=97&top_left_y=484&top_left_x=404)

\section*{Note}

This does not work with InnoDB databases unless you use innodb_file_per_table.

\subsection*{19.4.7 Improving Replication Performance}

As the number of replicas connecting to a source increases, the load, although minimal, also increases, as each replica uses a client connection to the source. Also, as each replica must receive a full copy of the source's binary log, the network load on the source may also increase and create a bottleneck.

If you are using a large number of replicas connected to one source, and that source is also busy processing requests (for example, as part of a scale-out solution), then you may want to improve the performance of the replication process.

One way to improve the performance of the replication process is to create a deeper replication structure that enables the source to replicate to only one replica, and for the remaining replicas to connect to this primary replica for their individual replication requirements. A sample of this structure is shown in Figure 19.3, "Using an Additional Replication Source to Improve Performance".

\begin{figure}
\captionsetup{labelformat=empty}
\caption{Figure 19.3 Using an Additional Replication Source to Improve Performance}
\includegraphics[alt={},max width=\textwidth]{https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3563.jpg?height=497&width=759&top_left_y=1379&top_left_x=349}
\end{figure}

For this to work, you must configure the MySQL instances as follows:
- Source 1 is the primary source where all changes and updates are written to the database. Binary logging is enabled on both source servers, which is the default.
- Source 2 is the replica to the server Source 1 that provides the replication functionality to the remainder of the replicas in the replication structure. Source 2 is the only machine permitted to connect to Source 1. Source 2 has the--log-replica-updates option enabled (the default). With this option, replication instructions from Source 1 are also written to Source 2's binary log so that they can then be replicated to the true replicas.
- Replica 1, Replica 2, and Replica 3 act as replicas to Source 2, and replicate the information from Source 2, which actually consists of the upgrades logged on Source 1.

The above solution reduces the client load and the network interface load on the primary source, which should improve the overall performance of the primary source when used as a direct database solution.

If your replicas are having trouble keeping up with the replication process on the source, there are a number of options available:
- If possible, put the relay logs and the data files on different physical drives. To do this, set the relay_log system variable to specify the location of the relay log.
- If heavy disk I/O activity for reads of the binary log file and relay log files is an issue, consider increasing the value of the rpl_read_size system variable. This system variable controls the minimum amount of data read from the log files, and increasing it might reduce file reads and I/O stalls when the file data is not currently cached by the operating system. Note that a buffer the size of this value is allocated for each thread that reads from the binary log and relay log files, including dump threads on sources and coordinator threads on replicas. Setting a large value might therefore have an impact on memory consumption for servers.
- If the replicas are significantly slower than the source, you may want to divide up the responsibility for replicating different databases to different replicas. See Section 19.4.6, "Replicating Different Databases to Different Replicas".
- If your source makes use of transactions and you are not concerned about transaction support on your replicas, use MyISAM or another nontransactional engine on the replicas. See Section 19.4.4, "Using Replication with Different Source and Replica Storage Engines".
- If your replicas are not acting as sources, and you have a potential solution in place to ensure that you can bring up a source in the event of failure, then you can disable log_replica_updates. This prevents "dumb" replicas from also logging events they have executed into their own binary log.

\subsection*{19.4.8 Switching Sources During Failover}

You can tell a replica to change to a new source using the CHANGE REPLICATION SOURCE TO statement. The replica does not check whether the databases on the source are compatible with those on the replica; it simply begins reading and executing events from the specified coordinates in the new source's binary log. In a failover situation, all the servers in the group are typically executing the same events from the same binary log file, so changing the source of the events should not affect the structure or integrity of the database, provided that you exercise care in making the change.

Replicas should be run with binary logging enabled (the --log-bin option), which is the default. If you are not using GTIDs for replication, then the replicas should also be run with --log-replicaupdates=OFF (logging replica updates is the default). In this way, the replica is ready to become a source without restarting the replica mysqld. Assume that you have the structure shown in Figure 19.4, "Redundancy Using Replication, Initial Structure".

\begin{figure}
\captionsetup{labelformat=empty}
\caption{Figure 19.4 Redundancy Using Replication, Initial Structure}
\includegraphics[alt={},max width=\textwidth]{https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3564.jpg?height=833&width=755&top_left_y=1838&top_left_x=285}
\end{figure}

In this diagram, the Source holds the source database, the Replica* hosts are replicas, and the Web Client machines are issuing database reads and writes. Web clients that issue only reads (and would normally be connected to the replicas) are not shown, as they do not need to switch to a new server in the event of failure. For a more detailed example of a read/write scale-out replication structure, see Section 19.4.5, "Using Replication for Scale-Out".

Each MySQL replica (Replica 1, Replica 2, and Replica 3) is a replica running with binary logging enabled, and with --log-replica-updates=0FF. Because updates received by a replica from the source are not written to the binary log when--log-replica-updates=0FF is specified, the binary log on each replica is initially empty. If for some reason Source becomes unavailable, you can pick one of the replicas to become the new source. For example, if you pick Replica 1, all Web Clients should be redirected to Replica 1, which writes the updates to its binary log. Replica 2 and Replica 3 should then replicate from Replica 1.

The reason for running the replica with --log-replica-updates=0FF is to prevent replicas from receiving updates twice in case you cause one of the replicas to become the new source. If Replica 1 has--log-replica-updates enabled, which is the default, it writes any updates that it receives from Source in its own binary log. This means that, when Replica 2 changes from Source to Replica 1 as its source, it may receive updates from Replica 1 that it has already received from Source.

Make sure that all replicas have processed any statements in their relay log. On each replica, issue STOP REPLICA IO_THREAD, then check the output of SHOW PROCESSLIST until you see Has read all relay log. When this is true for all replicas, they can be reconfigured to the new setup. On the replica Replica 1 being promoted to become the source, issue STOP REPLICA and RESET BINARY LOGS AND GTIDS.

On the other replicas Replica 2 and Replica 3, use STOP REPLICA and CHANGE REPLICATION SOURCE TO SOURCE_HOST='Replica1' (where 'Replica1' represents the real host name of Replica 1). To use CHANGE REPLICATION SOURCE TO, add all information about how to connect to Replica 1 from Replica 2 or Replica 3 (user, password, port). When issuing the statement in this scenario, there is no need to specify the name of the Replica 1 binary log file or log position to read from, since the first binary log file and position 4 are the defaults. Finally, execute START REPLICA on Replica 2 and Replica 3.

Once the new replication setup is in place, you need to tell each Web Client to direct its statements to Replica 1. From that point on, all updates sent by Web Client to Replica 1 are written to the binary log of Replica 1, which then contains every update sent to Replica 1 since Source became unavailable.

The resulting server structure is shown in Figure 19.5, "Redundancy Using Replication, After Source Failure".

\begin{figure}
\captionsetup{labelformat=empty}
\caption{Figure 19.5 Redundancy Using Replication, After Source Failure}
\includegraphics[alt={},max width=\textwidth]{https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3566.jpg?height=837&width=878&top_left_y=303&top_left_x=283}
\end{figure}

When Source becomes available again, you should make it a replica of Replica 1. To do this, issue on Source the same CHANGE REPLICATION SOURCE TO statement as that issued on Replica 2 and Replica 3 previously. Source then becomes a replica of Replica 1 and picks up the Web Client writes that it missed while it was offline.

To make Source a source again, use the preceding procedure as if Replica 1 were unavailable and Source were to be the new source. During this procedure, do not forget to run RESET BINARY LOGS AND GTIDS on Source before making Replica 1, Replica 2, and Replica 3 replicas of Source. If you fail to do this, the replicas may pick up stale writes from the Web Client applications dating from before the point at which Source became unavailable.

You should be aware that there is no synchronization between replicas, even when they share the same source, and thus some replicas might be considerably ahead of others. This means that in some cases the procedure outlined in the previous example might not work as expected. In practice, however, relay logs on all replicas should be relatively close together.

One way to keep applications informed about the location of the source is to have a dynamic DNS entry for the source host. With BIND, you can use nsupdate to update the DNS dynamically.

\subsection*{19.4.9 Switching Sources and Replicas with Asynchronous Connection Failover}

You can use the asynchronous connection failover mechanism to establish an asynchronous (source-to-replica) replication connection to a new source automatically, after the existing connection from a replica to its source fails. The asynchronous connection failover mechanism can be used to keep a replica synchronized with multiple MySQL servers or groups of servers that share data. The list of potential source servers is stored on the replica, and in the event of a connection failure, a new source is selected from the list based on a weighted priority that you set.

The asynchronous connection failover mechanism also supports Group Replication topologies, by automatically monitoring changes to group membership and distinguishing between primary and secondary servers. When you add a group member to the source list and define it as part of a managed group, the asynchronous connection failover mechanism updates the source list to keep it in line with membership changes, adding and removing group members automatically as they join or leave. Only online group members that are in the majority are used for connections and obtaining status. The last remaining member of a managed group is not removed automatically even if it leaves
the group, so that the configuration of the managed group is kept. However, you can delete a managed group manually if it is no longer needed.

The asynchronous connection failover mechanism also enables a replica that is part of a managed replication group to automatically reconnect to the sender if the current receiver (the primary of the group) fails. This feature works with Group Replication, on a group configured in single-primary mode, where the group's primary is a replica that has a replication channel using the mechanism. The feature is designed for a group of senders and a group of receivers to keep synchronized with each other even when some members are temporarily unavailable. It also synchronizes a group of receivers with one or more senders that are not part of a managed group. A replica that is not part of a replication group cannot use this feature.

The requirements for using the asynchronous connection failover mechanism are as follows:
- GTIDs must be in use on the source and the replica (gtid_mode=0N), and the SOURCE_AUTO_POSITION option of the CHANGE REPLICATION SOURCE TO statement must be enabled on the replica, so that GTID auto-positioning is used for the connection to the source.
- The same replication user account and password must exist on all the source servers in the source list for the channel. This account is used for the connection to each of the sources. You can set up different accounts for different channels.
- The replication user account must be given SELECT permissions on the Performance Schema tables, for example, by issuing GRANT SELECT ON performance_schema.* TO 'repl_user';
- The replication user account and password cannot be specified on the statement used to start replication, because they need to be available on the automatic restart for the connection to the alternative source. They must be set for the channel using the CHANGE REPLICATION SOURCE TO statement on the replica, and recorded in the replication metadata repositories.
- If the channel where the asynchronous connection failover mechanism is in use is on the primary of a Group Replication single-primary mode group, asynchronous connection failover between replicas is also active by default. In this situation, the replication channel and the replication user account and password for the channel must be set up on all the secondary servers in the replication group, and on any new joining members. If the new servers are provisioned using MySQL's clone functionality, this all happens automatically.

\section*{Important}

If you do not want asynchronous connection failover to take place between replicas in this situation, disable it by disabling the member action mysql_start_failover_channels_if_primary for the group, using the group_replication_disable_member_action function. When the feature is disabled, you do not need to configure the replication channel on the secondary group members, but if the primary goes offline or into an error state, replication stops for the channel.

MySQL InnoDB ClusterSet is available to provide disaster tolerance for InnoDB Cluster deployments by linking a primary InnoDB Cluster with one or more replicas of itself in alternate locations, such as different datacenters. Consider using this solution instead to simplify the setup of a new multi-group deployment for replication, failover, and disaster recovery. You can adopt an existing Group Replication deployment as an InnoDB Cluster.

InnoDB ClusterSet and InnoDB Cluster are designed to abstract and simplify the procedures for setting up, managing, monitoring, recovering, and repairing replication groups. InnoDB ClusterSet automatically manages replication from a primary cluster to replica clusters using a dedicated ClusterSet replication channel. You can use administrator commands to trigger a controlled switchover or emergency failover between groups if the primary cluster is not functioning normally. Servers and groups can easily be added to or removed from the InnoDB ClusterSet deployment after the initial setup when demand changes. For more information, see MySQL InnoDB ClusterSet.

\subsection*{19.4.9.1 Asynchronous Connection Failover for Sources}

To activate asynchronous connection failover for a replication channel set SOURCE_CONNECTION_AUTO_FAILOVER=1 in a CHANGE REPLICATION SOURCE TO statement for this channel. GTID auto-positioning must be in use for the channel (SOURCE_AUTO_POSITION = 1).

\section*{Important}

When the existing connection to a source fails, the replica first retries the same connection the number of times specified by the SOURCE_RETRY_COUNT option of the CHANGE REPLICATION SOURCE TO. The interval between attempts is set by the SOURCE_CONNECT_RETRY option. When these attempts are exhausted, the asynchronous connection failover mechanism takes over. Note that the defaults for these options, which were designed for a connection to a single source, make the replica retry the same connection for 60 days. To ensure that the asynchronous connection failover mechanism can be activated promptly, set SOURCE_RETRY_COUNT and SOURCE_CONNECT_RETRY to minimal numbers that just allow a few retry attempts with the same source, in case the connection failure is caused by a transient network outage. Suitable values are SOURCE_RETRY_COUNT=3 and SOURCE_CONNECT_RETRY=10, which make the replica retry the connection 3 times with 10-second intervals between.

You also need to set the source list for the replication channel, to specify the sources that are available for failover. You set and manage source lists using the asynchronous_connection_failover_add_source and asynchronous_connection_failover_delete_source functions to add and remove single replication source servers. To add and remove managed groups of servers, use the asynchronous_connection_failover_add_managed and asynchronous_connection_failover_delete_managed functions instead.

The functions name the relevant replication channel and specify the host name, port number, network namespace, and weighted priority (1-100, with 100 being the highest priority) of a MySQL instance to add to or delete from the channel's source list. For a managed group, you also specify the type of managed service (currently only Group Replication is available), and the identifier of the managed group (for Group Replication, this is the value of the group_replication_group_name system variable). When you add a managed group, you only need to add one group member, and the replica automatically adds the rest from the current group membership. When you delete a managed group, you delete the entire group together.

The asynchronous connection failover mechanism also fails over the connection if another available server on the source list has a higher priority (weight) setting. This feature ensures that the replica stays connected to the most suitable source server at all times, and it applies to both managed groups and single (non-managed) servers. For a managed group, a source's weight is assigned depending on whether it is a primary or a secondary server. So assuming that you set up the managed group to give a higher weight to a primary and a lower weight to a secondary, when the primary changes, the higher weight is assigned to the new primary, so the replica changes over the connection to it. The asynchronous connection failover mechanism additionally changes connection if the currently connected managed source server leaves the managed group, or is no longer in the majority in the managed group.

When failing over a connection, the source with the highest priority (weight) setting among the alternative sources listed in the source list for the channel is chosen for the first connection attempt. The replica checks first that it can connect to the source server, or in the case of a managed group, that the source server has ONLINE status in the group (not RECOVERING or unavailable). If the highest weighted source is not available, the replica tries with all the listed sources in descending order of weight, then starts again from the highest weighted source. If multiple sources have the same weight, the replica orders them randomly. If the replica needs to start working through the list again, it includes and retries the source to which the original connection failure occurred.

The source lists are stored in the mysql.replication_asynchronous_connection_failover and mysql.replication_asynchronous_connection_failover_managed tables, and can be viewed in the Performance Schema replication_asynchronous_connection_failover and replication_asynchronous_connection_failover_managed tables. The replica uses a monitor thread to track the membership of managed groups and update the source list (thread/ sql/replica_monitor). The setting for the SOURCE_CONNECTION_AUTO_FAILOVER option of the CHANGE REPLICATION SOURCE TO statement, and the source list, are transferred to a clone of the replica during a remote cloning operation.

\subsection*{19.4.9.2 Asynchronous Connection Failover for Replicas}

Asynchronous connection failover for replicas is activated automatically for a replication channel on a Group Replication primary when you set SOURCE_CONNECTION_AUTO_FAILOVER=1 in the CHANGE REPLICATION SOURCE TO statement for the channel. The feature is designed for a group of senders and a group of receivers to keep synchronized with each other even when some members are temporarily unavailable. When the feature is active and correctly configured, if the primary that is replicating goes offline or into an error state, the new primary starts replication on the same channel when it is elected. The new primary uses the source list for the channel to select the source with the highest priority (weight) setting, which might not be the same as the original source.

To configure this feature, the replication channel and the replication user account and password for the channel must be set up on all the member servers in the replication group, and on any new joining members. Ensure that SOURCE_RETRY_COUNT and SOURCE_CONNECT_RETRY are set to minimal numbers that just allow a few retry attempts, for example 3 and 10 . You can set up the replication channel using CHANGE REPLICATION SOURCE TO, or if the new servers are provisioned using MySQL's clone functionality, this all happens automatically. The SOURCE_CONNECTION_AUTO_FAILOVER setting for the channel is broadcast to group members from the primary when they join. If you later disable SOURCE_CONNECTION_AUTO_FAILOVER for the channel on the primary, this is also broadcast to the secondary servers, and they change the status of the channel to match.

Asynchronous connection failover for replicas is activated and deactivated using the Group Replication member action mysql_start_failover_channels_if_primary, which is enabled by default. You can disable it for the whole group by disabling that member action on the primary, using the group_replication_disable_member_action function, as in this example:
mysql> SELECT group_replication_disable_member_action("mysql_start_failover_channels_if_primary", "AFTE
The function can only be changed on a primary, and must be enabled or disabled for the whole group, so you cannot have some members providing failover and others not. When the mysql_start_failover_channels_if_primary member action is disabled, the channel does not need to be configured on secondary members, but if the primary goes offline or into an error state, replication stops for the channel. Note that if there is more than one channel with SOURCE_CONNECTION_AUTO_FAILOVER=1 , the member action covers all the channels, so they cannot be individually enabled and disabled by that method. Set SOURCE_CONNECTION_AUTO_FAILOVER=0 on the primary to disable an individual channel.

The source list for a channel with SOURCE_CONNECTION_AUTO_FAILOVER=1 is broadcast to all group members when they join, and also when it changes. This is the case whether the sources are a managed group for which the membership is updated automatically, or whether they are added or changed manually using asynchronous_connection_failover_add_source( ), asynchronous_connection_failover_delete_source(), asynchronous_connection_failover_add_managed(), or asynchronous_connection_failover_delete_managed().
All group members receive the current source list as recorded in the mysql.replication_asynchronous_connection_failover and mysql.replication_asynchronous_connection_failover_managed tables. Because the sources do not have to be in a managed group, you can set up the function to synchronize a group
of receivers with one or more alternative standalone senders, or even a single sender. A standalone replica that is not part of a replication group cannot use this feature.

\subsection*{19.4.10 Semisynchronous Replication}

In addition to the built-in asynchronous replication, MySQL 8.4 supports an interface to semisynchronous replication that is implemented by plugins. This section discusses what semisynchronous replication is and how it works. The following sections cover the administrative interface to semisynchronous replication and how to install, configure, and monitor it.

MySQL replication by default is asynchronous. The source writes events to its binary log and replicas request them when they are ready. The source does not know whether or when a replica has retrieved and processed the transactions, and there is no guarantee that any event ever reaches any replica. With asynchronous replication, if the source crashes, transactions that it has committed might not have been transmitted to any replica. Failover from source to replica in this case might result in failover to a server that is missing transactions relative to the source.

With fully synchronous replication, when a source commits a transaction, all replicas have also committed the transaction before the source returns to the session that performed the transaction. Fully synchronous replication means failover from the source to any replica is possible at any time. The drawback of fully synchronous replication is that there might be a lot of delay to complete a transaction.

Semisynchronous replication falls between asynchronous and fully synchronous replication. The source waits until at least one replica has received and logged the events (the required number of replicas is configurable), and then commits the transaction. The source does not wait for all replicas to acknowledge receipt, and it requires only an acknowledgement from the replicas, not that the events have been fully executed and committed on the replica side. Semisynchronous replication therefore guarantees that if the source crashes, all the transactions that it has committed have been transmitted to at least one replica.

Compared to asynchronous replication, semisynchronous replication provides improved data integrity, because when a commit returns successfully, it is known that the data exists in at least two places. Until a semisynchronous source receives acknowledgment from the required number of replicas, the transaction is on hold and not committed.

Compared to fully synchronous replication, semisynchronous replication is faster, because it can be configured to balance your requirements for data integrity (the number of replicas acknowledging receipt of the transaction) with the speed of commits, which are slower due to the need to wait for replicas.

Important
With semisynchronous replication, if the source crashes and a failover to a replica is carried out, the failed source should not be reused as the replication source, and should be discarded. It could have transactions that were not acknowledged by any replica, which were therefore not committed before the failover.

If your goal is to implement a fault-tolerant replication topology where all the servers receive the same transactions in the same order, and a server that crashes can rejoin the group and be brought up to date automatically, you can use Group Replication to achieve this. For information, see Chapter 20, Group Replication.

The performance impact of semisynchronous replication compared to asynchronous replication is the tradeoff for increased data integrity. The amount of slowdown is at least the TCP/IP roundtrip time to send the commit to the replica and wait for the acknowledgment of receipt by the replica. This means that semisynchronous replication works best for close servers communicating over fast networks, and worst for distant servers communicating over slow networks. Semisynchronous replication also places a rate limit on busy sessions by constraining the speed at which binary log events can be sent
from source to replica. When one user is too busy, this slows it down, which can be useful in some deployment situations.

Semisynchronous replication between a source and its replicas operates as follows:
- A replica indicates whether it is semisynchronous-capable when it connects to the source.
- If semisynchronous replication is enabled on the source side and there is at least one semisynchronous replica, a thread that performs a transaction commit on the source blocks and waits until at least one semisynchronous replica acknowledges that it has received all events for the transaction, or until a timeout occurs.
- The replica acknowledges receipt of a transaction's events only after the events have been written to its relay log and flushed to disk.
- If a timeout occurs without any replica having acknowledged the transaction, the source reverts to asynchronous replication. When at least one semisynchronous replica catches up, the source returns to semisynchronous replication.
- Semisynchronous replication must be enabled on both the source and replica sides. If semisynchronous replication is disabled on the source, or enabled on the source but on no replicas, the source uses asynchronous replication.

While the source is blocking (waiting for acknowledgment from a replica), it does not return to the session that performed the transaction. When the block ends, the source returns to the session, which then can proceed to execute other statements. At this point, the transaction has committed on the source side, and receipt of its events has been acknowledged by at least one replica. The number of replica acknowledgments the source must receive per transaction before returning to the session is configurable, and defaults to one acknowledgement (see Section 19.4.10.2, "Configuring Semisynchronous Replication").

Blocking also occurs after rollbacks that are written to the binary log, which occurs when a transaction that modifies nontransactional tables is rolled back. The rolled-back transaction is logged even though it has no effect for transactional tables because the modifications to the nontransactional tables cannot be rolled back and must be sent to replicas.

For statements that do not occur in transactional context (that is, when no transaction has been started with START TRANSACTION or SET autocommit $=0$ ), autocommit is enabled and each statement commits implicitly. With semisynchronous replication, the source blocks for each such statement, just as it does for explicit transaction commits.

By default, the source waits for replica acknowledgment of the transaction receipt after syncing the binary log to disk, but before committing the transaction to the storage engine. As an alternative, you can configure the source so that the source waits for replica acknowledgment after committing the transaction to the storage engine, using the rpl_semi_sync_source_wait_point system variable. This setting affects the replication characteristics and the data that clients can see on the source. For more information, see Section 19.4.10.2, "Configuring Semisynchronous Replication".

You can improve the performance of semisynchronous replication by enabling the system variables replication_sender_observe_commit_only, which limits callbacks, and replication_optimize_for_static_plugin_config, which adds shared locks and avoids unnecessary lock acquisitions. These settings help as the number of replicas increases, because contention for locks can slow down performance. Semisynchronous replication source servers can also get performance benefits from enabling these system variables, because they use the same locking mechanisms as the replicas.

\subsection*{19.4.10.1 Installing Semisynchronous Replication}

Semisynchronous replication is implemented using plugins, which must be installed on the source and on the replicas to make semisynchronous replication available on the instances. There are different plugins for a source and for a replica. After a plugin has been installed, you control it by means of the
system variables associated with it. These system variables are available only when the associated plugin has been installed.

This section describes how to install the semisynchronous replication plugins. For general information about installing plugins, see Section 7.6.1, "Installing and Uninstalling Plugins".

To use semisynchronous replication, the following requirements must be satisfied:
- The capability of installing plugins requires a MySQL server that supports dynamic loading. To verify this, check that the value of the have_dynamic_loading system variable is YES. Binary distributions should support dynamic loading.
- Replication must already be working, see Section 19.1, "Configuring Replication".
- There must not be multiple replication channels configured. Semisynchronous replication is only compatible with the default replication channel. See Section 19.2.2, "Replication Channels".

MySQL 8.4 supplies versions of the plugins that implement semisynchronous replication-one for the source server and one for the replica-which replace the terms "master" and "slave" with "source" and "replica" in system variables and status variables; you can (and should) install these versions instead of the old ones (which are now deprecated, and thus subject to removal in a future MySQL release). You cannot have both the new and the old versions of the relevant plugin installed on an instance. If you use the new versions of the plugins, the new system variables and status variables are available but the old ones are not; if you use the old versions of the plugins, the old system variables and status variables are available but the new ones are not.

The file name suffix for the plugin library files differs per platform (for example, . so for Unix and Unixlike systems, and .dll for Windows). The plugin and library file names are as follows:
- Source server: rpl_semi_sync_source plugin (semisync_source.so or semisync_source.dll library)
- Replica: rpl_semi_sync_replica plugin (semisync_replica.so or semisync_replica.dll library)

To be usable by a source or replica server, the appropriate plugin library file must be located in the MySQL plugin directory (the directory named by the plugin_dir system variable). If necessary, configure the plugin directory location by setting the value of plugin_dir at server startup. The source plugin library file must be present in the plugin directory of the source server. The replica plugin library file must be present in the plugin directory of each replica server.

To set up semisynchronous replication, use the following instructions. The INSTALL PLUGIN, SET GLOBAL, STOP REPLICA, and START REPLICA statements mentioned here require the REPLICATION_SLAVE_ADMIN privilege (or the deprecated SUPER privilege).

To load the plugins, use the INSTALL PLUGIN statement on the source and on each replica that is to be semisynchronous, adjusting the .so suffix for your platform as necessary.

On the source:
INSTALL PLUGIN rpl_semi_sync_source SONAME 'semisync_source.so';
On each replica:
INSTALL PLUGIN rpl_semi_sync_replica SONAME 'semisync_replica.so';
If an attempt to install a plugin results in an error on Linux similar to that shown here, you must install libimf:
mysql> INSTALL PLUGIN rpl_semi_sync_source SONAME 'semisync_source.so';
ERROR 1126 (HY000): Can't open shared library '/usr/local/mysql/lib/plugin/semisync_source.so'
(errno: 22 libimf.so: cannot open shared object file:
No such file or directory)

You can obtain libimf from https://dev.mysql.com/downloads/os-linux.html.
To verify plugin installation, examine the Information Schema PLUGINS table or use the SHOW PLUGINS statement (see Section 7.6.2, "Obtaining Server Plugin Information"). For example:
```
mysql> SELECT PLUGIN_NAME, PLUGIN_STATUS
    FROM INFORMATION_SCHEMA.PLUGINS
    WHERE PLUGIN_NAME LIKE '%semi%';
+------------------------+---------------+
| PLUGIN_NAME | PLUGIN_STATUS |
+------------------------+---------------+
| rpl_semi_sync_source | ACTIVE |
+------------------------+---------------+
```


If a plugin fails to initialize, check the server error log for diagnostic messages.
After a semisynchronous replication plugin has been installed, it is disabled by default. The plugins must be enabled both on the source side and the replica side to enable semisynchronous replication. If only one side is enabled, replication is asynchronous. To enable the plugins, set the appropriate system variable either at runtime using SET GLOBAL, or at server startup on the command line or in an option file. For example:
```
SET GLOBAL rpl_semi_sync_source_enabled = 1;
SET GLOBAL rpl_semi_sync_replica_enabled = 1;
```


If you enable semisynchronous replication on a replica at runtime, you must also start the replication I/ O (receiver) thread (stopping it first if it is already running) to cause the replica to connect to the source and register as a semisynchronous replica:
```
STOP REPLICA IO_THREAD;
START REPLICA IO_THREAD;
```


If the replication I/O (receiver) thread is already running and you do not restart it, the replica continues to use asynchronous replication.

A setting listed in an option file takes effect each time the server starts. For example, you can set the variables in my.cnf files on the source and replica servers as follows. On the source:
```
[mysqld]
rpl_semi_sync_source_enabled=1
```


On each replica:
```
[mysqld]
rpl_semi_sync_replica_enabled=1
```


You can configure the behavior of the semisynchronous replication plugins using the system variables that become available when you install the plugins. For information on key system variables, see Section 19.4.10.2, "Configuring Semisynchronous Replication".

\subsection*{19.4.10.2 Configuring Semisynchronous Replication}

When you install the source and replica plugins for semisynchronous replication (see Section 19.4.10.1, "Installing Semisynchronous Replication"), system variables become available to control plugin behavior.

To check the current values of the status variables for semisynchronous replication, use SHOW VARIABLES:
```
mysql> SHOW VARIABLES LIKE 'rpl_semi_sync%';
```


All the rpl_semi_sync_xxx system variables are described at Section 19.1.6.2, "Replication Source Options and Variables" and Section 19.1.6.3, "Replica Server Options and Variables". Some key system variables are:
```
rpl_semi_sync_source_enableolntrols whether semisynchronous replication is enabled on the
    source server. To enable or disable the plugin, set this variable to 1
    or 0, respectively. The default is 0 (off).
rpl_semi_sync_replica_enabCeratrols whether semisynchronous replication is enabled on the
    replica.
rpl_semi_sync_source_timedAvalue in milliseconds that controls how long the source waits on
    a commit for acknowledgment from a replica before timing out and
    reverting to asynchronous replication. The default value is 10000
    (10 seconds).
rpl_semi_sync_source_wait_Comtrols phei namben of replica acknowledgments the source
    must receive per transaction before returning to the session. The
    default is 1, meaning that the source only waits for one replica to
    acknowledge receipt of the transaction's events.
```


The rpl_semi_sync_source_wait_point system variable controls the point at which a semisynchronous source server waits for replica acknowledgment of transaction receipt before returning a status to the client that committed the transaction. These values are permitted:
- AFTER_SYNC (the default): The source writes each transaction to its binary log and the replica, and syncs the binary log to disk. The source waits for replica acknowledgment of transaction receipt after the sync. Upon receiving acknowledgment, the source commits the transaction to the storage engine and returns a result to the client, which then can proceed.
- AFTER_COMMIT: The source writes each transaction to its binary log and the replica, syncs the binary log, and commits the transaction to the storage engine. The source waits for replica acknowledgment of transaction receipt after the commit. Upon receiving acknowledgment, the source returns a result to the client, which then can proceed.

The replication characteristics of these settings differ as follows:
- With AFTER_SYNC, all clients see the committed transaction at the same time, which is after it has been acknowledged by the replica and committed to the storage engine on the source. Thus, all clients see the same data on the source.

In the event of source failure, all transactions committed on the source have been replicated to the replica (saved to its relay log). An unexpected exit of the source and failover to the replica is lossless because the replica is up to date. As noted above, the source should not be reused after the failover.
- With AFTER_COMMIT, the client issuing the transaction gets a return status only after the server commits to the storage engine and receives replica acknowledgment. After the commit and before replica acknowledgment, other clients can see the committed transaction before the committing client.

If something goes wrong such that the replica does not process the transaction, then in the event of an unexpected source exit and failover to the replica, it is possible for such clients to see a loss of data relative to what they saw on the source.

You can improve the performance of semisynchronous replication by enabling the system variables replication_sender_observe_commit_only, which limits callbacks, and replication_optimize_for_static_plugin_config, which adds shared locks and avoids unnecessary lock acquisitions. These settings help as the number of replicas increases, because contention for locks can slow down performance. Semisynchronous replication source servers can also get performance benefits from enabling these system variables, because they use the same locking mechanisms as the replicas.

\subsection*{19.4.10.3 Semisynchronous Replication Monitoring}

The plugins for semisynchronous replication expose a number of status variables that enable you to monitor their operation. To check the current values of the status variables, use SHOW STATUS:
```
mysql> SHOW STATUS LIKE 'Rpl_semi_sync%';
```


All Rpl_semi_sync_xxx status variables are described at Section 7.1.10, "Server Status Variables". Some examples are:
- Rpl_semi_sync_source_clients

The number of semisynchronous replicas that are connected to the source server.
- Rpl_semi_sync_source_status

Whether semisynchronous replication currently is operational on the source server. The value is 1 if the plugin has been enabled and a commit acknowledgment has not occurred. It is 0 if the plugin is not enabled or the source has fallen back to asynchronous replication due to commit acknowledgment timeout.
- Rpl_semi_sync_source_no_tx

The number of commits that were not acknowledged successfully by a replica.
- Rpl_semi_sync_source_yes_tx

The number of commits that were acknowledged successfully by a replica.
- Rpl_semi_sync_replica_status

Whether semisynchronous replication currently is operational on the replica. This is 1 if the plugin has been enabled and the replication I/O (receiver) thread is running, 0 otherwise.

When the source switches between asynchronous or semisynchronous replication due to commitblocking timeout or a replica catching up, it sets the value of the Rpl_semi_sync_source_status status variable appropriately. Automatic fallback from semisynchronous to asynchronous replication on the source means that it is possible for the rpl_semi_sync_source_enabled system variable to have a value of 1 on the source side even when semisynchronous replication is in fact not operational at the moment. You can monitor the Rpl_semi_sync_source_status status variable to determine whether the source currently is using asynchronous or semisynchronous replication.

\subsection*{19.4.11 Delayed Replication}

MySQL supports delayed replication such that a replica server deliberately executes transactions later than the source by at least a specified amount of time. This section describes how to configure a replication delay on a replica, and how to monitor replication delay.

In MySQL 8.4, the method of delaying replication depends on two timestamps, immediate_commit_timestamp and original_commit_timestamp (see Replication Delay Timestamps); delayed replication is measured using these timestamps. If either the immediate source or replica is not using these timestamps, the implementation of delayed replication from MySQL 5.7 is used (see Delayed Replication). This section describes delayed replication between servers which are all using these timestamps.

The default replication delay is 0 seconds. Use a CHANGE REPLICATION SOURCE TO SOURCE_DELAY $=N$ statement to set the delay to $N$ seconds. A transaction received from the source is not executed until at least $N$ seconds later than its commit on the immediate source. The delay happens per transaction (not event as in previous MySQL versions) and the actual delay is imposed only on gtid_log_event or anonymous_gtid_log_event. The other events in the transaction always follow these events without any waiting time imposed on them.

\section*{Note}

START REPLICA and STOP REPLICA take effect immediately and ignore any delay. RESET REPLICA resets the delay to 0 .

The replication_applier_configuration Performance Schema table contains the DESIRED_DELAY column which shows the delay configured using the SOURCE_DELAY option. The replication_applier_status Performance Schema table contains the REMAINING_DELAY column which shows the number of delay seconds remaining.

Delayed replication can be used for several purposes:
- To protect against user mistakes on the source. With a delay you can roll back a delayed replica to the time just before the mistake.
- To test how the system behaves when there is a lag. For example, in an application, a lag might be caused by a heavy load on the replica. However, it can be difficult to generate this load level. Delayed replication can simulate the lag without having to simulate the load. It can also be used to debug conditions related to a lagging replica.
- To inspect what the database looked like in the past, without having to reload a backup. For example, by configuring a replica with a delay of one week, if you then need to see what the database looked like before the last few days' worth of development, the delayed replica can be inspected.

\section*{Replication Delay Timestamps}

MySQL 8.4 provides a new method for measuring delay (also referred to as replication lag) in replication topologies that depends on the following timestamps associated with the GTID of each transaction (instead of each event) written to the binary log.
- original_commit_timestamp: the number of microseconds since epoch when the transaction was written (committed) to the binary log of the original source.
- immediate_commit_timestamp: the number of microseconds since epoch when the transaction was written (committed) to the binary log of the immediate source.

The output of mysqlbinlog displays these timestamps in two formats, microseconds from epoch and also TIMESTAMP format, which is based on the user defined time zone for better readability. For example:
```
#170404 10:48:05 server id 1 end_log_pos 233 CRC32 0x016ce647 GTID last_committed=0
\ sequence_number=1 original_committed_timestamp=1491299285661130 immediate_commit_timestamp=14912992
# original_commit_timestamp=1491299285661130 (2017-04-04 10:48:05.661130 WEST)
# immediate_commit_timestamp=1491299285843771 (2017-04-04 10:48:05.843771 WEST)
/*!80001 SET @@SESSION.original_commit_timestamp=1491299285661130*//*!*/;
    SET @@SESSION.GTID_NEXT= 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa:1'/*!*/;
# at 233
```


As a rule, the original_commit_timestamp is always the same on all replicas where the transaction is applied. In source-replica replication, the original_commit_timestamp of a transaction in the (original) source's binary log is always the same as its immediate_commit_timestamp. In the replica's relay log, the original_commit_timestamp and immediate_commit_timestamp of the transaction are the same as in the source's binary log; whereas in its own binary log, the transaction's immediate_commit_timestamp corresponds to when the replica committed the transaction.

In a Group Replication setup, when the original source is a member of a group, the original_commit_timestamp is generated when the transaction is ready to be committed. In other words, when it finished executing on the original source and its write set is ready to be sent to all members of the group for certification. When the original source is a server outside the group, the original_commit_timestamp is preserved. The same original_commit_timestamp for a particular transaction is replicated to all servers in the group, and to any replica outside the group that is replicating from a member. Each recipient of the transaction also stores the local commit time in its binary log using immediate_commit_timestamp.

View change events, which are exclusive to Group Replication, are a special case. Transactions containing these events are generated by each group member but share the same GTID (so, they
are not first executed in a source and then replicated to the group, but all members of the group execute and apply the same transaction). Group members set local timestamp values for transactions associated with view change events.

\section*{Monitoring Replication Delay}

One of the most common ways to monitor replication delay (lag) in previous MySQL versions was by relying on the Seconds_Behind_Master field in the output of SHOW REPLICA STATUS. However, this metric is not suitable when using replication topologies more complex than the traditional sourcereplica setup, such as Group Replication. The addition of immediate_commit_timestamp and original_commit_timestamp to MySQL 8 provides a much finer degree of information about replication delay. The recommended method to monitor replication delay in a topology that supports these timestamps is using the following Performance Schema tables.
- replication_connection_status: current status of the connection to the source, provides information on the last and current transaction the connection thread queued into the relay log.
- replication_applier_status_by_coordinator: current status of the coordinator thread that only displays information when using a multithreaded replica, provides information on the last transaction buffered by the coordinator thread to a worker's queue, as well as the transaction it is currently buffering.
- replication_applier_status_by_worker: current status of the thread(s) applying transactions received from the source, provides information about the transactions applied by the replication SQL thread, or by each worker thread when using a multithreaded replica.

Using these tables you can monitor information about the last transaction the corresponding thread processed and the transaction that thread is currently processing. This information comprises:
- a transaction's GTID
- a transaction's original_commit_timestamp and immediate_commit_timestamp, retrieved from the replica's relay log
- the time a thread started processing a transaction
- for the last processed transaction, the time the thread finished processing it

In addition to the Performance Schema tables, the output of SHOW REPLICA STATUS has three fields that show:
- SQL_Delay: A nonnegative integer indicating the replication delay configured using CHANGE REPLICATION SOURCE TO SOURCE_DELAY= $N$, where $N$ is measured in seconds.
- SQL_Remaining_Delay: When Replica_SQL_Running_State is Waiting until SOURCE_DELAY seconds after master executed event, this field contains an integer indicating the number of seconds left of the delay. At other times, this field is NULL.
- Replica_SQL_Running_State: A string indicating the state of the SQL thread (analogous to Replica_IO_State). The value is identical to the State value of the SQL thread as displayed by SHOW PROCESSLIST.

When the replication SQL thread is waiting for the delay to elapse before executing an event, SHOW PROCESSLIST displays its State value as Waiting until SOURCE_DELAY seconds after master executed event.

\subsection*{19.5 Replication Notes and Tips}

\subsection*{19.5.1 Replication Features and Issues}

The following sections provide information about what is supported and what is not in MySQL replication, and about specific issues and situations that may occur when replicating certain statements.

Statement-based replication depends on compatibility at the SQL level between the source and replica. In other words, successful statement-based replication requires that any SQL features used be supported by both the source and the replica servers. If you use a feature on the source server that is available only in the current version of MySQL, you cannot replicate to a replica that uses an earlier version of MySQL. Such incompatibilities can also occur within a release series as well as between versions.

If you are planning to use statement-based replication between MySQL 8.4 and a previous MySQL release series, it is a good idea to consult the edition of the MySQL Reference Manual corresponding to the earlier release series for information regarding the replication characteristics of that series.

With MySQL's statement-based replication, there may be issues with replicating stored routines or triggers. You can avoid these issues by using MySQL's row-based replication instead. For a detailed list of issues, see Section 27.7, "Stored Program Binary Logging". For more information about row-based logging and row-based replication, see Section 7.4.4.1, "Binary Logging Formats", and Section 19.2.1, "Replication Formats".

For additional information specific to replication and InnoDB, see Section 17.19, "InnoDB and MySQL Replication". For information relating to replication with NDB Cluster, see Section 25.7, "NDB Cluster Replication".

\subsection*{19.5.1.1 Replication and AUTO_INCREMENT}

Statement-based replication of AUTO_INCREMENT, LAST_INSERT_ID( ), and TIMESTAMP values is carried out subject to the following exceptions:
- A statement invoking a trigger or function that causes an update to an AUTO_INCREMENT column is not replicated correctly using statement-based replication. These statements are marked as unsafe. (Bug \#45677)
- An INSERT into a table that has a composite primary key that includes an AUTO_INCREMENT column that is not the first column of this composite key is not safe for statement-based logging or replication. These statements are marked as unsafe. (Bug \#11754117, Bug \#45670)

This issue does not affect tables using the InnoDB storage engine, since an InnoDB table with an AUTO_INCREMENT column requires at least one key where the auto-increment column is the only or leftmost column.
- Adding an AUTO_INCREMENT column to a table with ALTER TABLE might not produce the same ordering of the rows on the replica and the source. This occurs because the order in which the rows are numbered depends on the specific storage engine used for the table and the order in which the rows were inserted. If it is important to have the same order on the source and replica, the rows must be ordered before assigning an AUTO_INCREMENT number. Assuming that you want to add an AUTO_INCREMENT column to a table t1 that has columns col1 and col2, the following statements produce a new table t2 identical to t1 but with an AUTO_INCREMENT column:
```
CREATE TABLE t2 LIKE t1;
ALTER TABLE t2 ADD id INT AUTO_INCREMENT PRIMARY KEY;
INSERT INTO t2 SELECT * FROM t1 ORDER BY col1, col2;
```

![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3578.jpg?height=115&width=110&top_left_y=2403&top_left_x=331)

\section*{Important}

To guarantee the same ordering on both source and replica, the ORDER BY clause must name all columns of t1.

The instructions just given are subject to the limitations of CREATE TABLE . . . LIKE: Foreign key definitions are ignored, as are the DATA DIRECTORY and INDEX DIRECTORY table options. If a
table definition includes any of those characteristics, create t2 using a CREATE TABLE statement that is identical to the one used to create t1, but with the addition of the AUTO_INCREMENT column.

Regardless of the method used to create and populate the copy having the AUTO_INCREMENT column, the final step is to drop the original table and then rename the copy:
```
DROP t1;
ALTER TABLE t2 RENAME t1;
```


See also Section B.3.6.1, "Problems with ALTER TABLE".

\subsection*{19.5.1.2 Replication and BLACKHOLE Tables}

The BLACKHOLE storage engine accepts data but discards it and does not store it. When performing binary logging, all inserts to such tables are always logged, regardless of the logging format in use. Updates and deletes are handled differently depending on whether statement based or row based logging is in use. With the statement based logging format, all statements affecting BLACKHOLE tables are logged, but their effects ignored. When using row-based logging, updates and deletes to such tables are simply skipped-they are not written to the binary log. A warning is logged whenever this occurs.

For this reason we recommend when you replicate to tables using the BLACKHOLE storage engine that you have the binlog_format server variable set to STATEMENT, and not to either ROW or MIXED.

\subsection*{19.5.1.3 Replication and Character Sets}

The following applies to replication between MySQL servers that use different character sets:
- If the source has databases with a character set different from the global character_set_server value, you should design your CREATE TABLE statements so that they do not implicitly rely on the database default character set. A good workaround is to state the character set and collation explicitly in CREATE TABLE statements.

\subsection*{19.5.1.4 Replication and CHECKSUM TABLE}

CHECKSUM TABLE returns a checksum that is calculated row by row, using a method that depends on the table row storage format. The storage format is not guaranteed to remain the same between MySQL versions, so the checksum value might change following an upgrade.

\subsection*{19.5.1.5 Replication of CREATE SERVER, ALTER SERVER, and DROP SERVER}

The statements CREATE SERVER, ALTER SERVER, and DROP SERVER are not written to the binary log, regardless of the binary logging format that is in use.

\subsection*{19.5.1.6 Replication of CREATE ... IF NOT EXISTS Statements}

MySQL applies these rules when various CREATE ... IF NOT EXISTS statements are replicated:
- Every CREATE DATABASE IF NOT EXISTS statement is replicated, whether or not the database already exists on the source.
- Similarly, every CREATE TABLE IF NOT EXISTS statement without a SELECT is replicated, whether or not the table already exists on the source. This includes CREATE TABLE IF NOT EXISTS ... LIKE. Replication of CREATE TABLE IF NOT EXISTS ... SELECT follows somewhat different rules; see Section 19.5.1.7, "Replication of CREATE TABLE ... SELECT Statements", for more information.
- CREATE EVENT IF NOT EXISTS is always replicated, whether or not the event named in the statement already exists on the source.
- CREATE USER is written to the binary log only if successful. If the statement includes IF NOT EXISTS, it is considered successful, and is logged as long as at least one user named in the
statement is created; in such cases, the statement is logged as written; this includes references to existing users that were not created. See CREATE USER Binary Logging, for more information.
- CREATE PROCEDURE IF NOT EXISTS, CREATE FUNCTION IF NOT EXISTS, or CREATE TRIGGER IF NOT EXISTS, if successful, is written in its entirety to the binary log (including the IF NOT EXISTS clause), whether or not the statement raised a warning because the object (procedure, function, or trigger) already existed.

\subsection*{19.5.1.7 Replication of CREATE TABLE ... SELECT Statements}

MySQL applies these rules when CREATE TABLE ... SELECT statements are replicated:
- CREATE TABLE ... SELECT always performs an implicit commit (Section 15.3.3, "Statements That Cause an Implicit Commit").
- If the destination table does not exist, logging occurs as follows. It does not matter whether IF NOT EXISTS is present.
- STATEMENT or MIXED format: The statement is logged as written.
- ROW format: The statement is logged as a CREATE TABLE statement followed by a series of insertrow events.

With storage engines that support atomic DDL, the statement is logged as one transaction. For more information, see Section 15.1.1, "Atomic Data Definition Statement Support".
- If the CREATE TABLE . . . SELECT statement fails, nothing is logged. This includes the case that the destination table exists and IF NOT EXISTS is not given.
- If the destination table exists and IF NOT EXISTS is given, MySQL 8.4 ignores the statement completely; nothing is inserted or logged.

MySQL 8.4 does not allow a CREATE TABLE . . . SELECT statement to make any changes in tables other than the table that is created by the statement.

\subsection*{19.5.1.8 Replication of CURRENT_USER()}

The following statements support use of the CURRENT_USER( ) function to take the place of the name of, and possibly the host for, an affected user or a definer:
- DROP USER
- RENAME USER
- GRANT
- REVOKE
- CREATE FUNCTION
- CREATE PROCEDURE
- CREATE TRIGGER
- CREATE EVENT
- CREATE VIEW
- ALTER EVENT
- ALTER VIEW
- SET PASSWORD

When binary logging is enabled and CURRENT_USER( ) or CURRENT_USER is used as the definer in any of these statements, MySQL Server ensures that the statement is applied to the same user on both the source and the replica when the statement is replicated. In some cases, such as statements that change passwords, the function reference is expanded before it is written to the binary log, so that the statement includes the user name. For all other cases, the name of the current user on the source is replicated to the replica as metadata, and the replica applies the statement to the current user named in the metadata, rather than to the current user on the replica.

\subsection*{19.5.1.9 Replication with Differing Table Definitions on Source and Replica}

Source and target tables for replication do not have to be identical. A table on the source can have more or fewer columns than the replica's copy of the table. In addition, corresponding table columns on the source and the replica can use different data types, subject to certain conditions.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3581.jpg?height=127&width=99&top_left_y=808&top_left_x=370)

\section*{Note}

Replication between tables which are partitioned differently from one another is not supported. See Section 19.5.1.24, "Replication and Partitioning".

In all cases where the source and target tables do not have identical definitions, the database and table names must be the same on both the source and the replica. Additional conditions are discussed, with examples, in the following two sections.

\section*{Replication with More Columns on Source or Replica}

You can replicate a table from the source to the replica such that the source and replica copies of the table have differing numbers of columns, subject to the following conditions:
- Columns common to both versions of the table must be defined in the same order on the source and the replica. (This is true even if both tables have the same number of columns.)
- Columns common to both versions of the table must be defined before any additional columns.

This means that executing an ALTER TABLE statement on the replica where a new column is inserted into the table within the range of columns common to both tables causes replication to fail, as shown in the following example:

Suppose that a table t , existing on the source and the replica, is defined by the following CREATE TABLE statement:
```
CREATE TABLE t (
    c1 INT,
    c2 INT,
    c3 INT
);
```


Suppose that the ALTER TABLE statement shown here is executed on the replica:
```
ALTER TABLE t ADD COLUMN cnew1 INT AFTER c3;
```


The previous ALTER TABLE is permitted on the replica because the columns c1, c2, and c3 that are common to both versions of table $t$ remain grouped together in both versions of the table, before any columns that differ.

However, the following ALTER TABLE statement cannot be executed on the replica without causing replication to break:

\section*{ALTER TABLE t ADD COLUMN cnew2 INT AFTER c2;}

Replication fails after execution on the replica of the ALTER TABLE statement just shown, because the new column cnew2 comes between columns common to both versions of $t$.
- Each "extra" column in the version of the table having more columns must have a default value.

A column's default value is determined by a number of factors, including its type, whether it is defined with a DEFAULT option, whether it is declared as NULL, and the server SQL mode in effect at the time of its creation; for more information, see Section 13.6, "Data Type Default Values").

In addition, when the replica's copy of the table has more columns than the source's copy, each column common to the tables must use the same data type in both tables.

Examples. The following examples illustrate some valid and invalid table definitions:
More columns on the source. The following table definitions are valid and replicate correctly:
```
source> CREATE TABLE t1 (c1 INT, c2 INT, c3 INT);
replica> CREATE TABLE t1 (c1 INT, c2 INT);
```


The following table definitions would raise an error because the definitions of the columns common to both versions of the table are in a different order on the replica than they are on the source:
```
source> CREATE TABLE t1 (c1 INT, c2 INT, c3 INT);
replica> CREATE TABLE t1 (c2 INT, c1 INT);
```


The following table definitions would also raise an error because the definition of the extra column on the source appears before the definitions of the columns common to both versions of the table:
```
source> CREATE TABLE t1 (c3 INT, c1 INT, c2 INT);
replica> CREATE TABLE t1 (c1 INT, c2 INT);
```


More columns on the replica. The following table definitions are valid and replicate correctly:
```
source> CREATE TABLE t1 (c1 INT, c2 INT);
replica> CREATE TABLE t1 (c1 INT, c2 INT, c3 INT);
```


The following definitions raise an error because the columns common to both versions of the table are not defined in the same order on both the source and the replica:
```
source> CREATE TABLE t1 (c1 INT, c2 INT);
replica> CREATE TABLE t1 (c2 INT, c1 INT, c3 INT);
```


The following table definitions also raise an error because the definition for the extra column in the replica's version of the table appears before the definitions for the columns which are common to both versions of the table:
```
source> CREATE TABLE t1 (c1 INT, c2 INT);
replica> CREATE TABLE t1 (c3 INT, c1 INT, c2 INT);
```


The following table definitions fail because the replica's version of the table has additional columns compared to the source's version, and the two versions of the table use different data types for the common column c2:
```
source> CREATE TABLE t1 (c1 INT, c2 BIGINT);
replica> CREATE TABLE t1 (c1 INT, c2 INT, c3 INT);
```


\section*{Replication of Columns Having Different Data Types}

Corresponding columns on the source's and the replica's copies of the same table ideally should have the same data type. However, this is not always strictly enforced, as long as certain conditions are met.

It is usually possible to replicate from a column of a given data type to another column of the same type and same size or width, where applicable, or larger. For example, you can replicate from a CHAR(10) column to another CHAR(10), or from a CHAR(10) column to a CHAR(25) column without any problems. In certain cases, it also possible to replicate from a column having one data type (on the source) to a column having a different data type (on the replica); when the data type of the source's version of the column is promoted to a type that is the same size or larger on the replica, this is known as attribute promotion.

Attribute promotion can be used with both statement-based and row-based replication, and is not dependent on the storage engine used by either the source or the replica. However, the choice of logging format does have an effect on the type conversions that are permitted; the particulars are discussed later in this section.

\section*{Important}

Whether you use statement-based or row-based replication, the replica's copy of the table cannot contain more columns than the source's copy if you wish to employ attribute promotion.

Statement-based replication. When using statement-based replication, a simple rule of thumb to follow is, "If the statement run on the source would also execute successfully on the replica, it should also replicate successfully". In other words, if the statement uses a value that is compatible with the type of a given column on the replica, the statement can be replicated. For example, you can insert any value that fits in a TINYINT column into a BIGINT column as well; it follows that, even if you change the type of a TINYINT column in the replica's copy of a table to BIGINT, any insert into that column on the source that succeeds should also succeed on the replica, since it is impossible to have a legal TINYINT value that is large enough to exceed a BIGINT column.

Row-based replication: attribute promotion and demotion. Row-based replication supports attribute promotion and demotion between smaller data types and larger types. It is also possible to specify whether or not to permit lossy (truncated) or non-lossy conversions of demoted column values, as explained later in this section.

Lossy and non-lossy conversions. In the event that the target type cannot represent the value being inserted, a decision must be made on how to handle the conversion. If we permit the conversion but truncate (or otherwise modify) the source value to achieve a "fit" in the target column, we make what is known as a lossy conversion. A conversion which does not require truncation or similar modifications to fit the source column value in the target column is a non-lossy conversion.

Type conversion modes. The global value of the system variable replica_type_conversions controls the type conversion mode used on the replica. This variable takes a set of values from the following list, which describes the effects of each mode on the replica's type-conversion behavior:

ALL_LOSSY

In this mode, type conversions that would mean loss of information are permitted.

This does not imply that non-lossy conversions are permitted, merely that only cases requiring either lossy conversions or no conversion at all are permitted; for example, enabling only this mode permits an INT column to be converted to TINYINT (a lossy conversion), but not a TINYINT column to an INT column (nonlossy). Attempting the latter conversion in this case would cause replication to stop with an error on the replica.

\section*{ALL_NON_LOSSY}

This mode permits conversions that do not require truncation or other special handling of the source value; that is, it permits conversions where the target type has a wider range than the source type.

Setting this mode has no bearing on whether lossy conversions are permitted; this is controlled with the ALL_LOSSY mode. If only ALL_NON_LOSSY is set, but not ALL_LOSSY, then attempting a conversion that would result in the loss of data (such as INT to TINYINT, or CHAR(25) to VARCHAR(20)) causes the replica to stop with an error.

ALL_LOSSY,ALL_NON_LOSSY
When this mode is set, all supported type conversions are permitted, whether or not they are lossy conversions.

\begin{tabular}{|l|l|}
\hline ALL_SIGNED & Treat promoted integer types as signed values (the default behavior). \\
\hline ALL_UNSIGNED & Treat promoted integer types as unsigned values. \\
\hline ALL_SIGNED,ALL_UNSIGNED & Treat promoted integer types as signed if possible, otherwise as unsigned. \\
\hline [empty] & When replica_type_conversions is not set, no attribute promotion or demotion is permitted; this means that all columns in the source and target tables must be of the same types. \\
\hline & This mode is the default. \\
\hline
\end{tabular}

When an integer type is promoted, its signedness is not preserved. By default, the replica treats all such values as signed. You can control this behavior using ALL_SIGNED, ALL_UNSIGNED, or both. ALL_SIGNED tells the replica to treat all promoted integer types as signed; ALL_UNSIGNED instructs it to treat these as unsigned. Specifying both causes the replica to treat the value as signed if possible, otherwise to treat it as unsigned; the order in which they are listed is not significant. Neither ALL_SIGNED nor ALL_UNSIGNED has any effect if at least one of ALL_LOSSY or ALL_NONLOSSY is not also used.

Changing the type conversion mode requires restarting the replica with the new replica_type_conversions setting.

Supported conversions. Supported conversions between different but similar data types are shown in the following list:
- Between any of the integer types TINYINT, SMALLINT, MEDIUMINT, INT, and BIGINT.

This includes conversions between the signed and unsigned versions of these types.
Lossy conversions are made by truncating the source value to the maximum (or minimum) permitted by the target column. For ensuring non-lossy conversions when going from unsigned to signed types, the target column must be large enough to accommodate the range of values in the source column. For example, you can demote TINYINT UNSIGNED non-lossily to SMALLINT, but not to TINYINT.
- Between any of the decimal types DECIMAL, FLOAT, DOUBLE, and NUMERIC.

FLOAT to DOUBLE is a non-lossy conversion; DOUBLE to FLOAT can only be handled lossily. A conversion from $\operatorname{DECIMAL}(M, D)$ to $\operatorname{DECIMAL}\left(M^{\prime}, D^{\prime}\right)$ where $D^{\prime}>=D$ and $\left(M^{\prime}-D^{\prime}\right)>=(M-D)$ is non-lossy; for any case where $M^{\prime}<M, D^{\prime}<D$, or both, only a lossy conversion can be made.

For any of the decimal types, if a value to be stored cannot be fit in the target type, the value is rounded down according to the rounding rules defined for the server elsewhere in the documentation. See Section 14.24.4, "Rounding Behavior", for information about how this is done for decimal types.
- Between any of the string types CHAR, VARCHAR, and TEXT, including conversions between different widths.

Conversion of a CHAR, VARCHAR, or TEXT to a CHAR, VARCHAR, or TEXT column the same size or larger is never lossy. Lossy conversion is handled by inserting only the first $N$ characters of the string on the replica, where $N$ is the width of the target column.

Important
Replication between columns using different character sets is not supported.
- Between any of the binary data types BINARY, VARBINARY, and BLOB, including conversions between different widths.

Conversion of a BINARY, VARBINARY, or BLOB to a BINARY, VARBINARY, or BLOB column the same size or larger is never lossy. Lossy conversion is handled by inserting only the first $N$ bytes of the string on the replica, where $N$ is the width of the target column.
- Between any 2 BIT columns of any 2 sizes.

When inserting a value from a $\operatorname{BIT}(M)$ column into a $\operatorname{BIT}\left(M^{\prime}\right)$ column, where $M^{\prime}>M$, the most significant bits of the BIT( $M$ ' ) columns are cleared (set to zero) and the $M$ bits of the BIT ( $M$ ) value are set as the least significant bits of the $\mathrm{BIT}\left(M^{\prime}\right)$ column.

When inserting a value from a source BIT( M) column into a target BIT( $M^{\prime}$ ) column, where $M^{\prime}< M$, the maximum possible value for the BIT( $M$ ') column is assigned; in other words, an "all-set" value is assigned to the target column.

Conversions between types not in the previous list are not permitted.

\subsection*{19.5.1.10 Replication and DIRECTORY Table Options}

If a DATA DIRECTORY or INDEX DIRECTORY table option is used in a CREATE TABLE statement on the source server, the table option is also used on the replica. This can cause problems if no corresponding directory exists in the replica host file system or if it exists but is not accessible to the replica MySQL server. This can be overridden by using the NO_DIR_IN_CREATE server SQL mode on the replica, which causes the replica to ignore the DATA DIRECTORY and INDEX DIRECTORY table options when replicating CREATE TABLE statements. The result is that MyISAM data and index files are created in the table's database directory.

For more information, see Section 7.1.11, "Server SQL Modes".

\subsection*{19.5.1.11 Replication of DROP ... IF EXISTS Statements}

The DROP DATABASE IF EXISTS, DROP TABLE IF EXISTS, and DROP VIEW IF EXISTS statements are always replicated, even if the database, table, or view to be dropped does not exist on the source. This is to ensure that the object to be dropped no longer exists on either the source or the replica, once the replica has caught up with the source.

DROP ... IF EXISTS statements for stored programs (stored procedures and functions, triggers, and events) are also replicated, even if the stored program to be dropped does not exist on the source.

\subsection*{19.5.1.12 Replication and Floating-Point Values}

With statement-based replication, values are converted from decimal to binary. Because conversions between decimal and binary representations of them may be approximate, comparisons involving floating-point values are inexact. This is true for operations that use floating-point values explicitly, or that use values that are converted to floating-point implicitly. Comparisons of floating-point values might yield different results on source and replica servers due to differences in computer architecture, the compiler used to build MySQL, and so forth. See Section 14.3, "Type Conversion in Expression Evaluation", and Section B.3.4.8, "Problems with Floating-Point Values".

\subsection*{19.5.1.13 Replication and FLUSH}

Some forms of the FLUSH statement are not logged because they could cause problems if replicated to a replica: FLUSH LOGS and FLUSH TABLES WITH READ LOCK. For a syntax example, see Section 15.7.8.3, "FLUSH Statement". The FLUSH TABLES, ANALYZE TABLE, OPTIMIZE TABLE, and REPAIR TABLE statements are written to the binary log and thus replicated to replicas. This is not normally a problem because these statements do not modify table data.

However, this behavior can cause difficulties under certain circumstances. If you replicate the privilege tables in the mysql database and update those tables directly without using GRANT, you must issue
a FLUSH PRIVILEGES on the replicas to put the new privileges into effect. In addition, if you use FLUSH TABLES when renaming a MyISAM table that is part of a MERGE table, you must issue FLUSH TABLES manually on the replicas. These statements are written to the binary log unless you specify NO_WRITE_TO_BINLOG or its alias LOCAL.

\subsection*{19.5.1.14 Replication and System Functions}

Certain functions do not replicate well under some conditions:
- The USER( ), CURRENT_USER( ) (or CURRENT_USER), UUID( ), VERSION( ), and LOAD_FILE( ) functions are replicated without change and thus do not work reliably on the replica unless rowbased replication is enabled. (See Section 19.2.1, "Replication Formats".)

USER( ) and CURRENT_USER( ) are automatically replicated using row-based replication when using MIXED mode, and generate a warning in STATEMENT mode. (See also Section 19.5.1.8, "Replication of CURRENT_USER()".) This is also true for VERSION ( ) and RAND ( ).
- For NOW( ), the binary log includes the timestamp. This means that the value as returned by the call to this function on the source is replicated to the replica. To avoid unexpected results when replicating between MySQL servers in different time zones, set the time zone on both source and replica. For more information, see Section 19.5.1.33, "Replication and Time Zones".

To explain the potential problems when replicating between servers which are in different time zones, suppose that the source is located in New York, the replica is located in Stockholm, and both servers are using local time. Suppose further that, on the source, you create a table mytable, perform an INSERT statement on this table, and then select from the table, as shown here:
```
mysql> CREATE TABLE mytable (mycol TEXT);
Query OK, 0 rows affected (0.06 sec)
mysql> INSERT INTO mytable VALUES ( NOW() );
Query OK, 1 row affected (0.00 sec)
mysql> SELECT * FROM mytable;
+-----------------------+
| mycol |
+-----------------------+
| 2009-09-01 12:00:00 |
+----------------------+
1 row in set (0.00 sec)
```


Local time in Stockholm is 6 hours later than in New York; so, if you issue SELECT NOW ( ) on the replica at that exact same instant, the value 2009-09-01 $18: 00: 00$ is returned. For this reason, if you select from the replica's copy of mytable after the CREATE TABLE and INSERT statements just shown have been replicated, you might expect mycol to contain the value 2009-09-01 $18: 00: 00$. However, this is not the case; when you select from the replica's copy of mytable, you obtain exactly the same result as on the source:
```
mysql> SELECT * FROM mytable;
+----------------------+
| mycol |
+-----------------------+
| 2009-09-01 12:00:00 |
+-----------------------+
1 row in set (0.00 sec)
```


Unlike NOW ( ), the SYSDATE ( ) function is not replication-safe because it is not affected by SET TIMESTAMP statements in the binary log and is nondeterministic if statement-based logging is used. This is not a problem if row-based logging is used.

An alternative is to use the--sysdate-is-now option to cause SYSDATE( ) to be an alias for NOW() . This must be done on the source and the replica to work correctly. In such cases, a warning is still issued by this function, but can safely be ignored as long as--sysdate-is-now is used on both the source and the replica.

SYSDATE( ) is automatically replicated using row-based replication when using MIXED mode, and generates a warning in STATEMENT mode.

See also Section 19.5.1.33, "Replication and Time Zones".
- The following restriction applies to statement-based replication only, not to row-based replication. The GET_LOCK( ), RELEASE_LOCK( ), IS_FREE_LOCK( ), and IS_USED_LOCK( ) functions that handle user-level locks are replicated without the replica knowing the concurrency context on the source. Therefore, these functions should not be used to insert into a source table because the content on the replica would differ. For example, do not issue a statement such as INSERT INTO mytable VALUES(GET_LOCK(...)).

These functions are automatically replicated using row-based replication when using MIXED mode, and generate a warning in STATEMENT mode.

As a workaround for the preceding limitations when statement-based replication is in effect, you can use the strategy of saving the problematic function result in a user variable and referring to the variable in a later statement. For example, the following single-row INSERT is problematic due to the reference to the UUID ( ) function:
```
INSERT INTO t VALUES(UUID());
```


To work around the problem, do this instead:
```
SET @my_uuid = UUID();
INSERT INTO t VALUES(@my_uuid);
```


That sequence of statements replicates because the value of @my_uuid is stored in the binary log as a user-variable event prior to the INSERT statement and is available for use in the INSERT.

The same idea applies to multiple-row inserts, but is more cumbersome to use. For a two-row insert, you can do this:
```
SET @my_uuid1 = UUID(); @my_uuid2 = UUID();
INSERT INTO t VALUES(@my_uuid1),(@my_uuid2);
```


However, if the number of rows is large or unknown, the workaround is difficult or impracticable. For example, you cannot convert the following statement to one in which a given individual user variable is associated with each row:
```
INSERT INTO t2 SELECT UUID(), * FROM t1;
```


Within a stored function, RAND ( ) replicates correctly as long as it is invoked only once during the execution of the function. (You can consider the function execution timestamp and random number seed as implicit inputs that are identical on the source and replica.)

The FOUND_ROWS( ) and ROW_COUNT( ) functions are not replicated reliably using statement-based replication. A workaround is to store the result of the function call in a user variable, and then use that in the INSERT statement. For example, if you wish to store the result in a table named mytable, you might normally do so like this:
```
SELECT SQL_CALC_FOUND_ROWS FROM mytable LIMIT 1;
INSERT INTO mytable VALUES( FOUND_ROWS() );
```


However, if you are replicating mytable, you should use SELECT ... INTO, and then store the variable in the table, like this:
```
SELECT SQL_CALC_FOUND_ROWS INTO @found_rows FROM mytable LIMIT 1;
INSERT INTO mytable VALUES(@found_rows);
```


In this way, the user variable is replicated as part of the context, and applied on the replica correctly.
These functions are automatically replicated using row-based replication when using MIXED mode, and generate a warning in STATEMENT mode. (Bug \#12092, Bug \#30244)

\subsection*{19.5.1.15 Replication and Fractional Seconds Support}

MySQL 8.4 permits fractional seconds for TIME, DATETIME, and TIMESTAMP values, with up to microseconds ( 6 digits) precision. See Section 13.2.6, "Fractional Seconds in Time Values".

\subsection*{19.5.1.16 Replication of Invoked Features}

Replication of invoked features such as loadable functions and stored programs (stored procedures and functions, triggers, and events) provides the following characteristics:
- The effects of the feature are always replicated.
- The following statements are replicated using statement-based replication:
- CREATE EVENT
- ALTER EVENT
- DROP EVENT
- CREATE PROCEDURE
- DROP PROCEDURE
- CREATE FUNCTION
- DROP FUNCTION
- CREATE TRIGGER
- DROP TRIGGER

However, the effects of features created, modified, or dropped using these statements are replicated using row-based replication.

> Note
> Attempting to replicate invoked features using statement-based replication produces the warning Statement is not safe to log in statement format. For example, trying to replicate a loadable function with statementbased replication generates this warning because it currently cannot be determined by the MySQL server whether the function is deterministic. If you are absolutely certain that the invoked feature's effects are deterministic, you can safely disregard such warnings.
- In the case of CREATE EVENT and ALTER EVENT:
- The status of the event is set to REPLICA_SIDE_DISABLED on the replica regardless of the state specified (this does not apply to DROP EVENT).
- The source on which the event was created is identified on the replica by its server ID. The ORIGINATOR column in INFORMATION_SCHEMA. EVENTS stores this information. See Section 15.7.7.19, "SHOW EVENTS Statement", for more information.
- The feature implementation resides on the replica in a renewable state so that if the source fails, the replica can be used as the source without loss of event processing.

To determine whether there are any scheduled events on a MySQL server that were created on a different server (that was acting as a source), query the Information Schema EVENTS table in a manner similar to what is shown here:
```
SELECT EVENT_SCHEMA, EVENT_NAME
    FROM INFORMATION_SCHEMA.EVENTS
```

```
WHERE STATUS = 'REPLICA_SIDE_DISABLED';
```


Alternatively, you can use the SHOW EVENTS statement, like this:
```
SHOW EVENTS
    WHERE STATUS = 'REPLICA_SIDE_DISABLED';
```


When promoting a replica having such events to a source, you must enable each event using ALTER EVENT event_name ENABLE, where event_name is the name of the event.

If more than one source was involved in creating events on this replica, and you wish to identify events that were created only on a given source having the server ID source_id, modify the previous query on the EVENTS table to include the ORIGINATOR column, as shown here:
```
SELECT EVENT_SCHEMA, EVENT_NAME, ORIGINATOR
    FROM INFORMATION_SCHEMA.EVENTS
    WHERE STATUS = 'REPLICA_SIDE_DISABLED'
    AND ORIGINATOR = 'source_id'
```


You can employ ORIGINATOR with the SHOW EVENTS statement in a similar fashion:
```
SHOW EVENTS
    WHERE STATUS = 'REPLICA_SIDE_DISABLED'
    AND ORIGINATOR = 'source_id'
```


Note
REPLICA_SIDE_DISABLED replaces SLAVESIDE_DISABLED, which is deprecated.

Before enabling events that were replicated from the source, you should disable the MySQL Event Scheduler on the replica (using a statement such as SET GLOBAL event_scheduler = OFF;), run any necessary ALTER EVENT statements, restart the server, then re-enable the Event Scheduler on the replica afterward (using a statement such as SET GLOBAL event_scheduler = ON;)-

If you later demote the new source back to being a replica, you must disable manually all events enabled by the ALTER EVENT statements. You can do this by storing in a separate table the event names from the SELECT statement shown previously, or using ALTER EVENT statements to rename the events with a common prefix such as replicated_to identify them.

If you rename the events, then when demoting this server back to being a replica, you can identify the events by querying the EVENTS table, as shown here:
```
SELECT CONCAT(EVENT_SCHEMA, '.', EVENT_NAME) AS 'Db.Event'
    FROM INFORMATION_SCHEMA.EVENTS
    WHERE INSTR(EVENT_NAME, 'replicated_') = 1;
```


\subsection*{19.5.1.17 Replication of JSON Documents}

In MySQL 8.4, it is possible to log partial updates to JSON documents (see Partial Updates of JSON Values). The logging behavior depends on the format used, as described here:

Statement-based replication. JSON partial updates are always logged as partial updates. This cannot be disabled when using statement-based logging.

Row-based replication. JSON partial updates are not logged as such by default, but instead are logged as complete documents. To enable logging of partial updates, set binlog_row_value_options=PARTIAL_JSON. If a replication source has this variable set, partial updates received from that source are handled and applied by a replica regardless of the replica's own setting for the variable.

\subsection*{19.5.1.18 Replication and LIMIT}

Statement-based replication of LIMIT clauses in DELETE, UPDATE, and INSERT ... SELECT statements is unsafe since the order of the rows affected is not defined. (Such statements can be
replicated correctly with statement-based replication only if they also contain an ORDER BY clause.) When such a statement is encountered:
- When using STATEMENT mode, a warning that the statement is not safe for statement-based replication is now issued.

When using STATEMENT mode, warnings are issued for DML statements containing LIMIT even when they also have an ORDER BY clause (and so are made deterministic). This is a known issue. (Bug \#42851)
- When using MIXED mode, the statement is now automatically replicated using row-based mode.

\subsection*{19.5.1.19 Replication and LOAD DATA}

LOAD DATA is considered unsafe for statement-based logging (see Section 19.2.1.3, "Determination of Safe and Unsafe Statements in Binary Logging"). When binlog_format=MIXED is set, the statement is logged in row-based format. When binlog_format=STATEMENT is set, note that LOAD DATA does not generate a warning, unlike other unsafe statements.

If you use LOAD DATA with binlog_format=STATEMENT, each replica on which the changes are to be applied creates a temporary file containing the data. The replica then uses a LOAD DATA statement to apply the changes. This temporary file is not encrypted, even if binary log encryption is active on the source, If encryption is required, use row-based or mixed binary logging format instead, for which replicas do not create the temporary file.

If a PRIVILEGE_CHECKS_USER account has been used to help secure the replication channel (see Section 19.3.3, "Replication Privilege Checks"), it is strongly recommended that you log LOAD DATA operations using row-based binary logging (binlog_format=ROW). If REQUIRE_ROW_FORMAT is set for the channel, row-based binary logging is required. With this logging format, the FILE privilege is not needed to execute the event, so do not give the PRIVILEGE_CHECKS_USER account this privilege. If you need to recover from a replication error involving a LOAD DATA INFILE operation logged in statement format, and the replicated event is trusted, you could grant the FILE privilege to the PRIVILEGE_CHECKS_USER account temporarily, removing it after the replicated event has been applied.

When mysqlbinlog reads log events for LOAD DATA statements logged in statement-based format, a generated local file is created in a temporary directory. These temporary files are not automatically removed by mysqlbinlog or any other MySQL program. If you do use LOAD DATA statements with statement-based binary logging, you should delete the temporary files yourself after you no longer need the statement log. For more information, see Section 6.6.9, "mysqlbinlog - Utility for Processing Binary Log Files".

\subsection*{19.5.1.20 Replication and max_allowed_packet}
max_allowed_packet sets an upper limit on the size of any single message between the MySQL server and clients, including replicas. If you are replicating large column values (such as might be found in TEXT or BLOB columns) and max_allowed_packet is too small on the source, the source fails with an error, and the replica shuts down the replication I/O (receiver) thread. If max_allowed_packet is too small on the replica, this also causes the replica to stop the I/O thread.

Row-based replication sends all columns and column values for updated rows from the source to the replica, including values of columns that were not actually changed by the update. This means that, when you are replicating large column values using row-based replication, you must take care to set max_allowed_packet large enough to accommodate the largest row in any table to be replicated, even if you are replicating updates only, or you are inserting only relatively small values.

On a multi-threaded replica (with replica_parallel_workers > 0), ensure that the system variable replica_pending_jobs_size_max is set to a value equal to or greater than the setting for the max_allowed_packet system variable on the source. The default setting for replica_pending_jobs_size_max, 128 M , is twice the default setting for max_allowed_packet,
which is 64M. max_allowed_packet limits the packet size that the source can send, but the addition of an event header can produce a binary log event exceeding this size. Also, in row-based replication, a single event can be significantly larger than the max_allowed_packet size, because the value of max_allowed_packet only limits each column of the table.

The replica actually accepts packets up to the limit set by its replica_max_allowed_packet setting, which default to the maximum setting of 1 GB , to prevent a replication failure due to a large packet. However, the value of replica_pending_jobs_size_max controls the memory that is made available on the replica to hold incoming packets. The specified memory is shared among all the replica worker queues.

The value of replica_pending_jobs_size_max is a soft limit, and if an unusually large event (consisting of one or multiple packets) exceeds this size, the transaction is held until all the replica workers have empty queues, and then processed. All subsequent transactions are held until the large transaction has been completed. So although unusual events larger than replica_pending_jobs_size_max can be processed, the delay to clear the queues of all the replica workers and the wait to queue subsequent transactions can cause lag on the replica and decreased concurrency of the replica workers. replica_pending_jobs_size_max should therefore be set high enough to accommodate most expected event sizes.

\subsection*{19.5.1.21 Replication and MEMORY Tables}

When a replication source server shuts down and restarts, its MEMORY tables become empty. To replicate this effect to replicas, the first time that the source uses a given MEMORY table after startup, it logs an event that notifies replicas that the table must be emptied by writing a DELETE or TRUNCATE TABLE statement for that table to the binary log. This generated event is identifiable by a comment in the binary log, and if GTIDs are in use on the server, it has a GTID assigned. The statement is always logged in statement format, even if the binary logging format is set to ROW, and it is written even if read_only or super_read_only mode is set on the server. Note that the replica still has outdated data in a MEMORY table during the interval between the source's restart and its first use of the table. To avoid this interval when a direct query to the replica could return stale data, you can set the init_file system variable to name a file containing statements that populate the MEMORY table on the source at startup.

When a replica server shuts down and restarts, its MEMORY tables become empty. This causes the replica to be out of synchrony with the source and may lead to other failures or cause the replica to stop:
- Row-format updates and deletes received from the source may fail with Can't find record in 'memory_table'.
- Statements such as INSERT INTO ... SELECT FROM memory_table may insert a different set of rows on the source and replica.

The replica also writes a DELETE or TRUNCATE TABLE statement to its own binary log, which is passed on to any downstream replicas, causing them to empty their own MEMORY tables.

The safe way to restart a replica that is replicating MEMORY tables is to first drop or delete all rows from the MEMORY tables on the source and wait until those changes have replicated to the replica. Then it is safe to restart the replica.

An alternative restart method may apply in some cases. When binlog_format=ROW, you can prevent the replica from stopping if you set replica_exec_mode=IDEMPOTENT before you start the replica again. This allows the replica to continue to replicate, but its MEMORY tables still differ from those on the source. This is acceptable if the application logic is such that the contents of MEMORY tables can be safely lost (for example, if the MEMORY tables are used for caching). replica_exec_mode=IDEMPOTENT applies globally to all tables, so it may hide other replication errors in non-MEMORY tables.
(The method just described is not applicable in NDB Cluster, where replica_exec_mode is always IDEMPOTENT, and cannot be changed.)

The size of MEMORY tables is limited by the value of the max_heap_table_size system variable, which is not replicated (see Section 19.5.1.39, "Replication and Variables"). A change in max_heap_table_size takes effect for MEMORY tables that are created or updated using ALTER TABLE ... ENGINE = MEMORY or TRUNCATE TABLE following the change, or for all MEMORY tables following a server restart. If you increase the value of this variable on the source without doing so on the replica, it becomes possible for a table on the source to grow larger than its counterpart on the replica, leading to inserts that succeed on the source but fail on the replica with Table is full errors. This is a known issue (Bug \#48666). In such cases, you must set the global value of max_heap_table_size on the replica as well as on the source, then restart replication. It is also recommended that you restart both the source and replica MySQL servers, to ensure that the new value takes complete (global) effect on each of them.

See Section 18.3, "The MEMORY Storage Engine", for more information about MEMORY tables.

\subsection*{19.5.1.22 Replication of the mysql System Schema}

Data modification statements made to tables in the mysql schema are replicated according to the value of binlog_format; if this value is MIXED, these statements are replicated using row-based format. However, statements that would normally update this information indirectly-such GRANT, REVOKE, and statements manipulating triggers, stored routines, and views-are replicated to replicas using statement-based replication.

\subsection*{19.5.1.23 Replication and the Query Optimizer}

It is possible for the data on the source and replica to become different if a statement is written in such a way that the data modification is nondeterministic; that is, left up the query optimizer. (In general, this is not a good practice, even outside of replication.) Examples of nondeterministic statements include DELETE or UPDATE statements that use LIMIT with no ORDER BY clause; see Section 19.5.1.18, "Replication and LIMIT", for a detailed discussion of these.

\subsection*{19.5.1.24 Replication and Partitioning}

Replication is supported between partitioned tables as long as they use the same partitioning scheme and otherwise have the same structure, except where an exception is specifically allowed (see Section 19.5.1.9, "Replication with Differing Table Definitions on Source and Replica").

Replication between tables that have different partitioning is generally not supported. This because statements (such as ALTER TABLE ... DROP PARTITION) that act directly on partitions in such cases might produce different results on the source and the replica. In the case where a table is partitioned on the source but not on the replica, any statements that operate on partitions on the source's copy of the replica fail on the replica. When the replica's copy of the table is partitioned but the source's copy is not, statements that act directly on partitions cannot be run on the source without causing errors there. To avoid stopping replication or creating inconsistencies between the source and replica, always ensure that a table on the source and the corresponding replicated table on the replica are partitioned in the same way.

\subsection*{19.5.1.25 Replication and REPAIR TABLE}

When used on a corrupted or otherwise damaged table, it is possible for the REPAIR TABLE statement to delete rows that cannot be recovered. However, any such modifications of table data performed by this statement are not replicated, which can cause source and replica to lose synchronization. For this reason, in the event that a table on the source becomes damaged and you use REPAIR TABLE to repair it, you should first stop replication (if it is still running) before using REPAIR TABLE, then afterward compare the source's and replica's copies of the table and be prepared to correct any discrepancies manually, before restarting replication.

\subsection*{19.5.1.26 Replication and Reserved Words}

You can encounter problems when you attempt to replicate from an older source to a newer replica and you make use of identifiers on the source that are reserved words in the newer MySQL version running
on the replica. For example, a table column named rank on a MySQL 5.7 source that is replicating to a MySQL 8.4 replica could cause a problem because RANK became a reserved word in MySQL 8.0.

Replication can fail in such cases with Error 1064 You have an error in your SQL syntax. . . , even if a database or table named using the reserved word or a table having a column named using the reserved word is excluded from replication. This is due to the fact that each SQL event must be parsed by the replica prior to execution, so that the replica knows which database object or objects would be affected. Only after the event is parsed can the replica apply any filtering rules defined by --replicate-do-db, --replicate-do-table, --replicate-ignore-db, and --replicate-ignore-table.

To work around the problem of database, table, or column names on the source which would be regarded as reserved words by the replica, do one of the following:
- Use one or more ALTER TABLE statements on the source to change the names of any database objects where these names would be considered reserved words on the replica, and change any SQL statements that use the old names to use the new names instead.
- In any SQL statements using these database object names, write the names as quoted identifiers using backtick characters (ˋ).

For listings of reserved words by MySQL version, see Keywords and Reserved Words in MySQL 8.0, in the MySQL Server Version Reference. For identifier quoting rules, see Section 11.2, "Schema Object Names".

\subsection*{19.5.1.27 Replication and Row Searches}

When a replica using row-based replication format applies an UPDATE or DELETE operation, it must search the relevant table for the matching rows. The algorithm used to carry out this process uses one of the table's indexes to carry out the search as the first choice, and a hash table if there are no suitable indexes.

The algorithm first assesses the available indexes in the table definition to see if there is any suitable index to use, and if there are multiple possibilities, which index is the best fit for the operation. The algorithm ignores the following types of index:
- Fulltext indexes.
- Hidden indexes.
- Generated indexes.
- Multi-valued indexes.
- Any index where the before-image of the row event does not contain all the columns of the index.

If there are no suitable indexes after ruling out these index types, the algorithm does not use an index for the search. If there are suitable indexes, one index is selected from the candidates, in the following priority order:
1. A primary key.
2. A unique index where every column in the index has a NOT NULL attribute. If more than one such index is available, the algorithm chooses the leftmost of these indexes.
3. Any other index. If more than one such index is available, the algorithm chooses the leftmost of these indexes.

If the algorithm is able to select a primary key or a unique index where every column in the index has a NOT NULL attribute, it uses this index to iterate over the rows in the UPDATE or DELETE operation. For each row in the row event, the algorithm looks up the row in the index to locate the table record to update. If no matching record is found, it returns the error ER_KEY_NOT_FOUND and stops the replication applier thread.

If the algorithm was not able to find a suitable index, or was only able to find an index that was nonunique or contained nulls, a hash table is used to assist in identifying the table records. The algorithm creates a hash table containing the rows in the UPDATE or DELETE operation, with the key as the full before-image of the row. The algorithm then iterates over all the records in the target table, using the selected index if it found one, or else performing a full table scan. For each record in the target table, it determines whether that row exists in the hash table. If the row is found in the hash table, the record in the target table is updated, and the row is deleted from the hash table. When all the records in the target table have been checked, the algorithm verifies whether the hash table is now empty. If there are any unmatched rows remaining in the hash table, the algorithm returns the error ER_KEY_NOT_FOUND and stops the replication applier thread.

\subsection*{19.5.1.28 Replication and Source or Replica Shutdowns}

It is safe to shut down a replication source server and restart it later. When a replica loses its connection to the source, the replica tries to reconnect immediately and retries periodically if that fails. The default is to retry every 60 seconds. This may be changed with the CHANGE REPLICATION SOURCE TO statement. A replica also is able to deal with network connectivity outages. However, the replica notices the network outage only after receiving no data from the source for replica_net_timeout seconds. If your outages are short, you may want to decrease the value of replica_net_timeout. See Section 19.4.2, "Handling an Unexpected Halt of a Replica".

An unclean shutdown (for example, a crash) on the source side can result in the source's binary log having a final position less than the most recent position read by the replica, due to the source's binary log file not being flushed. This can cause the replica not to be able to replicate when the source comes back up. Setting sync_binlog=1 in the source server's my.cnf file helps to minimize this problem because it causes the source to flush its binary log more frequently. For the greatest possible durability and consistency in a replication setup using InnoDB with transactions, you should also set innodb_flush_log_at_trx_commit=1. With this setting, the contents of the InnoDB redo log buffer are written out to the log file at each transaction commit and the log file is flushed to disk. Note that the durability of transactions is still not guaranteed with this setting, because operating systems or disk hardware may tell mysqld that the flush-to-disk operation has taken place, even though it has not.

Shutting down a replica cleanly is safe because it keeps track of where it left off. However, be careful that the replica does not have temporary tables open; see Section 19.5.1.31, "Replication and Temporary Tables". Unclean shutdowns might produce problems, especially if the disk cache was not flushed to disk before the problem occurred:
- For transactions, the replica commits and then updates relay-log. info. If an unexpected exit occurs between these two operations, relay log processing proceeds further than the information file indicates and the replica re-executes the events from the last transaction in the relay log after it has been restarted.
- A similar problem can occur if the replica updates relay-log.info but the server host crashes before the write has been flushed to disk. To minimize the chance of this occurring, set sync_relay_log_info=1 in the replica my. cnf file. Setting sync_relay_log_info to 0 causes no writes to be forced to disk and the server relies on the operating system to flush the file from time to time.

The fault tolerance of your system for these types of problems is greatly increased if you have a good uninterruptible power supply.

\subsection*{19.5.1.29 Replica Errors During Replication}

If a statement produces the same error (identical error code) on both the source and the replica, the error is logged, but replication continues.

If a statement produces different errors on the source and the replica, the replication SQL thread terminates, and the replica writes a message to its error log and waits for the database administrator to decide what to do about the error. This includes the case that a statement produces an error on the source or the replica, but not both. To address the issue, connect to the replica manually and
determine the cause of the problem. SHOW REPLICA STATUS is useful for this. Then fix the problem and run START REPLICA. For example, you might need to create a nonexistent table before you can start the replica again.

> Note
> If a temporary error is recorded in the replica's error log, you do not necessarily have to take any action suggested in the quoted error message. Temporary errors should be handled by the client retrying the transaction. For example, if the replication SQL thread records a temporary error relating to a deadlock, you do not need to restart the transaction manually on the replica, unless the replication SQL thread subsequently terminates with a nontemporary error message.

If this error code validation behavior is not desirable, some or all errors can be masked out (ignored) with the --replica-skip-errors option.

For nontransactional storage engines such as MyISAM, it is possible to have a statement that only partially updates a table and returns an error code. This can happen, for example, on a multiple-row insert that has one row violating a key constraint, or if a long update statement is killed after updating some of the rows. If that happens on the source, the replica expects execution of the statement to result in the same error code. If it does not, the replication SQL thread stops as described previously.

If you are replicating between tables that use different storage engines on the source and replica, keep in mind that the same statement might produce a different error when run against one version of the table, but not the other, or might cause an error for one version of the table, but not the other. For example, since MyISAM ignores foreign key constraints, an INSERT or UPDATE statement accessing an InnoDB table on the source might cause a foreign key violation but the same statement performed on a MyISAM version of the same table on the replica would produce no such error, causing replication to stop.

Replication filter rules are applied first, prior to making any privilege or row format checks, making it possible to filter out any transactions that fail validation; no checks are performed and thus no errors are raised for transactions which have been filtered out. This means that the replica can accept only that part of the database to which a given user has been granted access (as long as any updates to this part of the database use the row-based replication format). This may be helpful when performing an upgrade or when migrating to a system or application that uses administration tables to which the inbound replication user does not have access. See also Section 19.2.5, "How Servers Evaluate Replication Filtering Rules".

\subsection*{19.5.1.30 Replication and Server SQL Mode}

Using different server SQL mode settings on the source and the replica may cause the same INSERT statements to be handled differently on the source and the replica, leading the source and replica to diverge. For best results, you should always use the same server SQL mode on the source and on the replica. This advice applies whether you are using statement-based or row-based replication.

If you are replicating partitioned tables, using different SQL modes on the source and the replica is likely to cause issues. At a minimum, this is likely to cause the distribution of data among partitions to be different in the source's and replica's copies of a given table. It may also cause inserts into partitioned tables that succeed on the source to fail on the replica.

For more information, see Section 7.1.11, "Server SQL Modes".

\subsection*{19.5.1.31 Replication and Temporary Tables}

In MySQL 8.4, when binlog_format is set to ROW or MIXED, statements that exclusively use temporary tables are not logged on the source, and therefore the temporary tables are not replicated. Statements that involve a mix of temporary and nontemporary tables are logged on the source only for the operations on nontemporary tables, and the operations on temporary tables are not logged. This
means that there are never any temporary tables on the replica to be lost in the event of an unplanned shutdown by the replica. For more information about row-based replication and temporary tables, see Row-based logging of temporary tables.

When binlog_format is set to STATEMENT, operations on temporary tables are logged on the source and replicated on the replica, provided that the statements involving temporary tables can be logged safely using statement-based format. In this situation, loss of replicated temporary tables on the replica can be an issue. In statement-based replication mode, CREATE TEMPORARY TABLE and DROP TEMPORARY TABLE statements cannot be used inside a transaction, procedure, function, or trigger when GTIDs are in use on the server (that is, when the enforce_gtid_consistency system variable is set to ON). They can be used outside these contexts when GTIDs are in use, provided that autocommit=1 is set.

Because of the differences in behavior between row-based or mixed replication mode and statementbased replication mode regarding temporary tables, you cannot switch the replication format at runtime, if the change applies to a context (global or session) that contains any open temporary tables. For more details, see the description of the binlog_format option.

Safe replica shutdown when using temporary tables. In statement-based replication mode, temporary tables are replicated except in the case where you stop the replica server (not just the replication threads) and you have replicated temporary tables that are open for use in updates that have not yet been executed on the replica. If you stop the replica server, the temporary tables needed by those updates are no longer available when the replica is restarted. To avoid this problem, do not shut down the replica while it has temporary tables open. Instead, use the following procedure:
1. Issue a STOP REPLICA SQL_THREAD statement.
2. Use SHOW STATUS to check the value of the Replica_open_temp_tables status variable.
3. If the value is not 0 , restart the replication SQL thread with START REPLICA SQL_THREAD and repeat the procedure later.
4. When the value is 0 , issue a mysqladmin shutdown command to stop the replica.

Temporary tables and replication options. By default, with statement-based replication, all temporary tables are replicated; this happens whether or not there are any matching - -replicate-do-db, --replicate-do-table, or --replicate-wild-do-table options in effect. However, the --replicate-ignore-table and --replicate-wild-ignore-table options are honored for temporary tables. The exception is that to enable correct removal of temporary tables at the end of a session, a replica always replicates a DROP TEMPORARY TABLE IF EXISTS statement, regardless of any exclusion rules that would normally apply for the specified table.

A recommended practice when using statement-based replication is to designate a prefix for exclusive use in naming temporary tables that you do not want replicated, then employ a --replicate-wild-ignore-table option to match that prefix. For example, you might give all such tables names beginning with norep (such as norepmytable, norepyourtable, and so on), then use -replicate-wild-ignore-table=norep\% to prevent them from being replicated.

\subsection*{19.5.1.32 Replication Retries and Timeouts}

The global value of the system variable replica_transaction_retries sets the maximum number of times for applier threads on a single-threaded or multithreaded replica to automatically retry failed transactions before stopping. Transactions are automatically retried when the SQL thread fails to execute them because of an InnoDB deadlock, or when the transaction's execution time exceeds the InnoDB innodb_lock_wait_timeout value. If a transaction has a non-temporary error that prevents it from succeeding, it is not retried.

The default setting for replica_transaction_retries is 10 , meaning that a failing transaction with an apparently temporary error is retried 10 times before the applier thread stops. Setting the variable to 0 disables automatic retrying of transactions. On a multithreaded replica, the specified number of transaction retries can take place on all applier threads of all channels. The Performance

Schema table replication_applier_status shows the total number of transaction retries that took place on each replication channel, in the COUNT_TRANSACTIONS_RETRIES column.

The process of retrying transactions can cause lag on a replica or on a Group Replication group member, which can be configured as a single-threaded or multithreaded replica. The Performance Schema table replication_applier_status_by_worker shows detailed information on transaction retries by the applier threads on a single-threaded or multithreaded replica. This data includes timestamps showing how long it took the applier thread to apply the last transaction from start to finish (and when the transaction currently in progress was started), and how long this was after the commit on the original source and the immediate source. The data also shows the number of retries for the last transaction and the transaction currently in progress, and enables you to identify the transient errors that caused the transactions to be retried. You can use this information to see whether transaction retries are the cause of replication lag, and investigate the root cause of the failures that led to the retries.

\subsection*{19.5.1.33 Replication and Time Zones}

By default, source and replica servers assume that they are in the same time zone. If you are replicating between servers in different time zones, the time zone must be set on both source and replica. Otherwise, statements depending on the local time on the source are not replicated properly, such as statements that use the NOW ( ) or FROM_UNIXTIME( ) functions.

Verify that your combination of settings for the system time zone (system_time_zone), server current time zone (the global value of time_zone), and per-session time zones (the session value of time_zone) on the source and replica is producing the correct results. In particular, if the time_zone system variable is set to the value SYSTEM, indicating that the server time zone is the same as the system time zone, this can cause the source and replica to apply different time zones. For example, a source could write the following statement in the binary log:

SET @@session.time_zone='SYSTEM';
If this source and its replica have a different setting for their system time zones, this statement can produce unexpected results on the replica, even if the replica's global time_zone value has been set to match the source's. For an explanation of MySQL Server's time zone settings, and how to change them, see Section 7.1.15, "MySQL Server Time Zone Support".

See also Section 19.5.1.14, "Replication and System Functions".

\subsection*{19.5.1.34 Replication and Transaction Inconsistencies}

Inconsistencies in the sequence of transactions that have been executed from the relay log can occur depending on your replication configuration. This section explains how to avoid inconsistencies and solve any problems they cause.

The following types of inconsistencies can exist:
- Half-applied transactions. A transaction which updates non-transactional tables has applied some but not all of its changes.
- Gaps. A gap in the externalized transaction set appears when, given an ordered sequence of transactions, a transaction that is later in the sequence is applied before some other transaction that is prior in the sequence. Gaps can only appear when using a multithreaded replica.

To avoid gaps occurring on a multithreaded replica, set replica_preserve_commit_order=ON. This is the default, because all replicas are multithreaded by default.

Binary logging and replica update logging are not required on the replica to set replica_preserve_commit_order=ON, and can be disabled if wanted.

Setting replica_preserve_commit_order=ON requires that replica_parallel_type is set to LOGICAL_CLOCK. In MySQL 8.4, this is the default.

In some specific situations, as listed in the description for replica_preserve_commit_order, setting replica_preserve_commit_order=ON cannot preserve commit order on the replica, so in these cases gaps might still appear in the sequence of transactions that have been executed from the replica's relay log.

Setting replica_preserve_commit_order=ON does not prevent source binary log position lag.
- Source binary log position lag. Even in the absence of gaps, it is possible that transactions after Exec_master_log_pos have been applied. That is, all transactions up to point N have been applied, and no transactions after N have been applied, but Exec_master_log_pos has a value smaller than N. In this situation, Exec_master_log_pos is a "low-water mark" of the transactions applied, and lags behind the position of the most recently applied transaction. This can only happen on multithreaded replicas. Enabling replica_preserve_commit_order does not prevent source binary log position lag.

The following scenarios are relevant to the existence of half-applied transactions, gaps, and source binary log position lag:
1. While replication threads are running, there may be gaps and half-applied transactions.
2. mysqld shuts down. Both clean and unclean shutdown abort ongoing transactions and may leave gaps and half-applied transactions.
3. KILL of replication threads (the SQL thread when using a single-threaded replica, the coordinator thread when using a multithreaded replica). This aborts ongoing transactions and may leave gaps and half-applied transactions.
4. Error in applier threads. This may leave gaps. If the error is in a mixed transaction, that transaction is half-applied. When using a multithreaded replica, workers which have not received an error complete their queues, so it may take time to stop all threads.
5. STOP REPLICA when using a multithreaded replica. After issuing STOP REPLICA, the replica waits for any gaps to be filled and then updates Exec_master_log_pos. This ensures it never leaves gaps or source binary log position lag, unless any of the cases above applies, in other words, before STOP REPLICA completes, either an error happens, or another thread issues KILL, or the server restarts. In these cases, STOP REPLICA returns successfully.
6. If the last transaction in the relay log is only half-received and the multithreaded replica's coordinator thread has started to schedule the transaction to a worker, then STOP REPLICA waits up to 60 seconds for the transaction to be received. After this timeout, the coordinator gives up and aborts the transaction. If the transaction is mixed, it may be left half-completed.
7. STOP REPLICA when the ongoing transaction updates transactional tables only, in which case it is rolled back and STOP REPLICA stops immediately. If the ongoing transaction is mixed, STOP REPLICA waits up to 60 seconds for the transaction to complete. After this timeout, it aborts the transaction, so it may be left half-completed.

The global setting for the system variable rpl_stop_replica_timeout is unrelated to the process of stopping the replication threads. It only makes the client that issues STOP REPLICA return to the client, but the replication threads continue to try to stop.

If a replication channel has gaps, it has the following consequences:
1. The replica database is in a state that may never have existed on the source.
2. The field Exec_master_log_pos in SHOW REPLICA STATUS is only a "low-water mark". In other words, transactions appearing before the position are guaranteed to have committed, but transactions after the position may have committed or not.
3. CHANGE REPLICATION SOURCE TO statements for that channel fail with an error, unless the applier threads are running and the statement only sets receiver options.
4. If mysqld is started with--relay-log-recovery, no recovery is done for that channel, and a warning is printed.
5. If mysqldump is used with --dump-replica, it does not record the existence of gaps; thus it prints CHANGE REPLICATION SOURCE TO with RELAY_LOG_POS set to the "low-water mark" position in Exec_master_log_pos.

After applying the dump on another server, and starting the replication threads, transactions appearing after the position are replicated again. Note that this is harmless if GTIDs are enabled (however, in that case it is not recommended to use --dump-replica).

If a replication channel has source binary log position lag but no gaps, cases 2 to 5 above apply, but case 1 does not.

The source binary log position information is persisted in binary format in the internal table mysql.slave_worker_info. START REPLICA [SQL_THREAD] always consults this information so that it applies only the correct transactions. This remains true even if replica_parallel_workers has been changed to 0 before START REPLICA, and even if START REPLICA is used with UNTIL. START REPLICA UNTIL SQL_AFTER_MTS_GAPS applies only as many transactions as needed in order to fill in the gaps. If START REPLICA is used with UNTIL clauses that tell it to stop before it has consumed all the gaps, then it leaves remaining gaps.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3599.jpg?height=111&width=106&top_left_y=1139&top_left_x=365)

> Warning
> RESET REPLICA removes the relay logs and resets the replication position. Thus issuing RESET REPLICA on a multithreaded replica with gaps means the replica loses any information about the gaps, without correcting the gaps. In this situation, if binary log position based replication is in use, the recovery process fails.

When GTID-based replication is in use (GTID_MODE=ON) and SOURCE_AUTO_POSITION is set for the replication channel using the CHANGE REPLICATION SOURCE TO statement, the old relay logs are not required for the recovery process. Instead, the replica can use GTID auto-positioning to calculate what transactions it is missing compared to the source. The process used for binary log position based replication to resolve gaps on a multithreaded replica is skipped entirely when GTID-based replication is in use. When the process is skipped, a START REPLICA UNTIL SQL_AFTER_MTS_GAPS statement behaves differently, and does not attempt to check for gaps in the sequence of transactions. You can also issue CHANGE REPLICATION SOURCE TO statements, which are not permitted on a non-GTID replica where there are gaps.

\subsection*{19.5.1.35 Replication and Transactions}

Mixing transactional and nontransactional statements within the same transaction. In general, you should avoid transactions that update both transactional and nontransactional tables in a replication environment. You should also avoid using any statement that accesses both transactional (or temporary) and nontransactional tables and writes to any of them.

The server uses these rules for binary logging:
- If the initial statements in a transaction are nontransactional, they are written to the binary log immediately. The remaining statements in the transaction are cached and not written to the binary log until the transaction is committed. (If the transaction is rolled back, the cached statements are written to the binary log only if they make nontransactional changes that cannot be rolled back. Otherwise, they are discarded.)
- For statement-based logging, logging of nontransactional statements is affected by the binlog_direct_non_transactional_updates system variable. When this variable is OFF (the default), logging is as just described. When this variable is ON, logging occurs immediately for nontransactional statements occurring anywhere in the transaction (not just initial nontransactional statements). Other statements are kept in the transaction cache and logged when the transaction
commits. binlog_direct_non_transactional_updates has no effect for row-format or mixedformat binary logging.

\section*{Transactional, nontransactional, and mixed statements.}

To apply those rules, the server considers a statement nontransactional if it changes only nontransactional tables, and transactional if it changes only transactional tables. A statement that references both nontransactional and transactional tables and updates any of the tables involved is considered a "mixed" statement. Mixed statements, like transactional statements, are cached and logged when the transaction commits.

A mixed statement that updates a transactional table is considered unsafe if the statement also performs either of the following actions:
- Updates or reads a temporary table
- Reads a nontransactional table and the transaction isolation level is less than REPEATABLE_READ

A mixed statement following the update of a transactional table within a transaction is considered unsafe if it performs either of the following actions:
- Updates any table and reads from any temporary table
- Updates a nontransactional table and binlog_direct_non_transactional_updates is OFF

For more information, see Section 19.2.1.3, "Determination of Safe and Unsafe Statements in Binary Logging".

\section*{Note}

A mixed statement is unrelated to mixed binary logging format.

In situations where transactions mix updates to transactional and nontransactional tables, the order of statements in the binary log is correct, and all needed statements are written to the binary log even in case of a ROLLBACK. However, when a second connection updates the nontransactional table before the first connection transaction is complete, statements can be logged out of order because the second connection update is written immediately after it is performed, regardless of the state of the transaction being performed by the first connection.

Using different storage engines on source and replica. It is possible to replicate transactional tables on the source using nontransactional tables on the replica. For example, you can replicate an InnoDB source table as a MyISAM replica table. However, if you do this, there are problems if the replica is stopped in the middle of a BEGIN ... COMMIT block because the replica restarts at the beginning of the BEGIN block.

It is also safe to replicate transactions from MyISAM tables on the source to transactional tables, such as tables that use the InnoDB storage engine, on the replica. In such cases, an AUTOCOMMIT=1 statement issued on the source is replicated, thus enforcing AUTOCOMMIT mode on the replica.

When the storage engine type of the replica is nontransactional, transactions on the source that mix updates of transactional and nontransactional tables should be avoided because they can cause inconsistency of the data between the source transactional table and the replica nontransactional table. That is, such transactions can lead to source storage engine-specific behavior with the possible effect of replication going out of synchrony. MySQL does not issue a warning about this, so extra care should be taken when replicating transactional tables from the source to nontransactional tables on the replicas.

Changing the binary logging format within transactions. The binlog_format and binlog_checksum system variables are read-only as long as a transaction is in progress.

Every transaction (including autocommit transactions) is recorded in the binary log as though it starts with a BEGIN statement, and ends with either a COMMIT or a ROLLBACK statement. This is even true for statements affecting tables that use a nontransactional storage engine (such as MyISAM).

\section*{Note}

For restrictions that apply specifically to XA transactions, see Section 15.3.8.3, "Restrictions on XA Transactions".

\subsection*{19.5.1.36 Replication and Triggers}

With statement-based replication, triggers executed on the source also execute on the replica. With row-based replication, triggers executed on the source do not execute on the replica. Instead, the row changes on the source resulting from trigger execution are replicated and applied on the replica.

This behavior is by design. If under row-based replication the replica applied the triggers as well as the row changes caused by them, the changes would in effect be applied twice on the replica, leading to different data on the source and the replica.

If you want triggers to execute on both the source and the replica, perhaps because you have different triggers on the source and replica, you must use statement-based replication. However, to enable replica-side triggers, it is not necessary to use statement-based replication exclusively. It is sufficient to switch to statement-based replication only for those statements where you want this effect, and to use row-based replication the rest of the time.

A statement invoking a trigger (or function) that causes an update to an AUTO_INCREMENT column is not replicated correctly using statement-based replication. MySQL 8.4 marks such statements as unsafe. (Bug \#45677)

A trigger can have triggers for different combinations of trigger event (INSERT, UPDATE, DELETE) and action time (BEFORE, AFTER), and multiple triggers are permitted.

For brevity, "multiple triggers" here is shorthand for "multiple triggers that have the same trigger event and action time."

Upgrades. Multiple triggers are not supported in versions earlier than MySQL 5.7. If you upgrade servers in a replication topology that use a version earlier than MySQL 5.7, upgrade the replicas first and then upgrade the source. If an upgraded replication source server still has old replicas using MySQL versions that do not support multiple triggers, an error occurs on those replicas if a trigger is created on the source for a table that already has a trigger with the same trigger event and action time.

Downgrades. If you downgrade a server that supports multiple triggers to an older version that does not, the downgrade has these effects:
- For each table that has triggers, all trigger definitions are in the .TRG file for the table. However, if there are multiple triggers with the same trigger event and action time, the server executes only one of them when the trigger event occurs. For information about . TRG files, see the Table Trigger Storage section of the MySQL Server Doxygen documentation, available at https://dev.mysql.com/ doc/index-other.html.
- If triggers for the table are added or dropped subsequent to the downgrade, the server rewrites the table's . TRG file. The rewritten file retains only one trigger per combination of trigger event and action time; the others are lost.

To avoid these problems, modify your triggers before downgrading. For each table that has multiple triggers per combination of trigger event and action time, convert each such set of triggers to a single trigger as follows:
1. For each trigger, create a stored routine that contains all the code in the trigger. Values accessed using NEW and OLD can be passed to the routine using parameters. If the trigger needs a single result value from the code, you can put the code in a stored function and have the function return the value. If the trigger needs multiple result values from the code, you can put the code in a stored procedure and return the values using OUT parameters.
2. Drop all triggers for the table.
3. Create one new trigger for the table that invokes the stored routines just created. The effect for this trigger is thus the same as the multiple triggers it replaces.

\subsection*{19.5.1.37 Replication and TRUNCATE TABLE}

TRUNCATE TABLE is normally regarded as a DML statement, and so would be expected to be logged and replicated using row-based format when the binary logging mode is ROW or MIXED. However this caused issues when logging or replicating, in STATEMENT or MIXED mode, tables that used transactional storage engines such as InnoDB when the transaction isolation level was READ COMMITTED or READ UNCOMMITTED, which precludes statement-based logging.

TRUNCATE TABLE is treated for purposes of logging and replication as DDL rather than DML so that it can be logged and replicated as a statement. However, the effects of the statement as applicable to InnoDB and other transactional tables on replicas still follow the rules described in Section 15.1.37, "TRUNCATE TABLE Statement" governing such tables. (Bug \#36763)

\subsection*{19.5.1.38 Replication and User Name Length}

The maximum length for user names in MySQL 8.4 is 32 characters. Replication of user names longer than 16 characters fails when the replica runs a version of MySQL previous to 5.7, because those versions support only shorter user names. This occurs only when replicating from a newer source to an older replica, which is not a recommended configuration.

\subsection*{19.5.1.39 Replication and Variables}

System variables are not replicated correctly when using STATEMENT mode, except for the following variables when they are used with session scope:
- auto_increment_increment
- auto_increment_offset
- character_set_client
- character_set_connection
- character_set_database
- character_set_server
- collation_connection
- collation_database
- collation_server
- foreign_key_checks
- identity
- last_insert_id
- lc_time_names
- pseudo_thread_id
- sql_auto_is_null
- time_zone
- timestamp
- unique_checks

When MIXED mode is used, the variables in the preceding list, when used with session scope, cause a switch from statement-based to row-based logging. See Section 7.4.4.3, "Mixed Binary Logging Format".
sql_mode is also replicated except for the NO_DIR_IN_CREATE mode; the replica always preserves its own value for NO_DIR_IN_CREATE, regardless of changes to it on the source. This is true for all replication formats.

However, when mysqlbinlog parses a SET @@sql_mode = mode statement, the full mode value, including NO_DIR_IN_CREATE, is passed to the receiving server. For this reason, replication of such a statement may not be safe when STATEMENT mode is in use.

The default_storage_engine system variable is not replicated, regardless of the logging mode; this is intended to facilitate replication between different storage engines.

The read_only system variable is not replicated. In addition, the enabling this variable has different effects with regard to temporary tables, table locking, and the SET PASSWORD statement in different MySQL versions.

The max_heap_table_size system variable is not replicated. Increasing the value of this variable on the source without doing so on the replica can lead eventually to Table is full errors on the replica when trying to execute INSERT statements on a MEMORY table on the source that is thus permitted to grow larger than its counterpart on the replica. For more information, see Section 19.5.1.21, "Replication and MEMORY Tables".

In statement-based replication, session variables are not replicated properly when used in statements that update tables. For example, the following sequence of statements does not insert the same data on the source and the replica:
```
SET max_join_size=1000;
INSERT INTO mytable VALUES(@@max_join_size);
```


This does not apply to the common sequence:
```
SET time_zone=...;
INSERT INTO mytable VALUES(CONVERT_TZ(..., ..., @@time_zone));
```


Replication of session variables is not a problem when row-based replication is being used, in which case, session variables are always replicated safely. See Section 19.2.1, "Replication Formats".

The following session variables are written to the binary log and honored by the replica when parsing the binary log, regardless of the logging format:
- sql_mode
- foreign_key_checks
- unique_checks
- character_set_client
- collation_connection
- collation_database
- collation_server
- sql_auto_is_null
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3603.jpg?height=115&width=104&top_left_y=2471&top_left_x=365)

\section*{Important}

Even though session variables relating to character sets and collations are written to the binary log, replication between different character sets is not supported.

To help reduce possible confusion, we recommend that you always use the same setting for the lower_case_table_names system variable on both source and replica, especially when you are running MySQL on platforms with case-sensitive file systems. The lower_case_table_names setting can only be configured when initializing the server.

\subsection*{19.5.1.40 Replication and Views}

Views are always replicated to replicas. Views are filtered by their own name, not by the tables they refer to. This means that a view can be replicated to the replica even if the view contains a table that would normally be filtered out by replication-ignore-table rules. Care should therefore be taken to ensure that views do not replicate table data that would normally be filtered for security reasons.

Replication from a table to a same-named view is supported using statement-based logging, but not when using row-based logging. Trying to do so when row-based logging is in effect causes an error.

\subsection*{19.5.2 Replication Compatibility Between MySQL Versions}

MySQL supports replication from an older source to a newer replica for version combinations where we support upgrades from the source version to the replica version as described at Section 1.3, "MySQL Releases: Innovation and LTS" and Section 3.2, "Upgrade Paths". However, you might encounter difficulties when replicating from an older source to a newer replica if the source uses statements or relies on behavior no longer supported in the version of MySQL used on the replica.

The use of more than two MySQL Server versions is not supported in replication setups involving multiple sources, regardless of the number of source or replica MySQL servers. For example, if you are using a chained or circular replication setup, you cannot use MySQL X.Y.1, MySQL X.Y.2, and MySQL X.Y. 3 concurrently, although you could use any two of these releases together.

\section*{Important}

It is strongly recommended to use the most recent release available within a given MySQL release series because replication (and other) capabilities are continually being improved. It is also recommended to upgrade sources and replicas that use early releases of a release series of MySQL to GA (production) releases when the latter become available for that release series.

The server version is recorded in the binary log for each transaction for the server that originally committed the transaction (original_server_version), and for the server that is the immediate source of the current server in the replication topology (immediate_server_version).

Replication from newer sources to older replicas might be possible, but is generally not supported. This is due to a number of factors:
- Binary log format changes. The binary log format can change between major releases. While we attempt to maintain backward compatibility, this is not always possible. A source might also have optional features enabled that are not understood by older replicas, such as binary log transaction compression, where the resulting compressed transaction payloads cannot be read by a replica from a release prior to MySQL 8.0.20.

This also has significant implications for upgrading replication servers; see Section 19.5.3, "Upgrading or Downgrading a Replication Topology", for more information.
- SQL incompatibilities. You cannot replicate from a newer source to an older replica using statement-based replication if the statements to be replicated use SQL features available on the source but not on the replica.

However, if both the source and the replica support row-based replication, and there are no data definition statements to be replicated that depend on SQL features found on the source but not on the replica, you can use row-based replication to replicate the effects of data modification statements even if the DDL run on the source is not supported on the replica.

For more information about row-based replication, see Section 19.2.1, "Replication Formats".
For more information on potential replication issues, see Section 19.5.1, "Replication Features and Issues".

\subsection*{19.5.3 Upgrading or Downgrading a Replication Topology}

When you upgrade servers that participate in a replication topology, you need to take into account each server's role in the topology and look out for issues specific to replication. For general information and instructions for upgrading a MySQL Server instance, see Chapter 3, Upgrading MySQL.

As explained in Section 19.5.2, "Replication Compatibility Between MySQL Versions", MySQL supports replication from an older source to a newer replica for version combinations where we support upgrades from the source version to the replica version as described at Section 1.3, "MySQL Releases: Innovation and LTS" and Section 3.2, "Upgrade Paths", but does not support replication from a source running a later release to a replica running an earlier release. A replica at an earlier release might not have the required capability to process transactions that can be handled by the source at a later release. You must therefore upgrade all of the replicas in a replication topology to the target MySQL Server release, before you upgrade the source server to the target release. In this way you will never be in the situation where a replica still at the earlier release is attempting to handle transactions from a source at the later release.

In a replication topology where there are multiple sources (multi-source replication), the use of more than two MySQL Server versions is not supported, regardless of the number of source or replica MySQL servers. For example, you cannot use MySQL X.Y.1, MySQL X.Y.2, and MySQL X.Y. 3 concurrently in such a setup, although you could use any two of these releases together.

\section*{Pre-Check Servers before Upgrade}

It is possible to encounter replication difficulties when replicating from a source at an earlier release that has not yet been upgraded, to a replica at a later release that has been upgraded. This can happen if the source uses statements or relies on behavior that is no longer supported in the later release installed on the replica. You can use the MySQL Shell upgrade checker utility util.checkForServerUpgrade( ) to check MySQL 8.0 server instances for upgrade to a MySQL 8.4 release. This utility identifies configuration and stored data that is known to potentially cause upgrade problems, including features and behaviors that are no longer available in the later release. See Upgrade Checker Utility for information on the upgrade checker utility.

\section*{Standard Upgrade Procedure}

To upgrade a replication topology, follow the instructions in Chapter 3, Upgrading MySQL for each individual MySQL Server instance, using this overall procedure:
1. Upgrade the replicas first. On each replica instance:
- Carry out the preliminary checks and steps described in Section 3.6, "Preparing Your Installation for Upgrade".
- Shut down MySQL Server.
- Upgrade the MySQL Server binaries or packages.
- Restart MySQL Server.
- MySQL Server performs the entire MySQL upgrade procedure automatically, disabling binary logging during the upgrade.
- Restart replication using a START REPLICA.
2. If there are multiple layers of replicas (replicas-of-replicas) start upgrading the replicas that are farthest away from the source, performing the upgrade in a bottom-up fashion.
3. When all replicas have upgraded and only the source remains, perform a switch-over to one of the replicas. In other words, stop client updates on the source, wait for at least one replica to apply all changes, reconfigure the replication topology so that replica becomes the source and that the source is left outside the replication topology. Upgrade the old source according to the procedure for a single server, and then reinsert it into the topology.

If you need to downgrade the servers in a replication topology, the source must be downgraded before the replicas are downgraded. On the replicas, you must ensure that the binary log and relay log have been fully processed, and purge them before proceeding with the downgrade.

\section*{Rolling Downgrade Procedure}
1. Stop the updates.
2. Wait for replicas to receive all updates. It is not necessary to wait for them to apply all changes. If they have not applied all changes, leave their applier running so they can process the received transactions in the background.
3. Downgrade the source server, following the instructions for single server downgrade.
4. Insert the downgraded source server in the topology again.
5. Allow updates again.
6. Wait until all replicas have applied all remaining transactions from the previous primary.
7. For each replica, take out the replica from the topology, wait for it to apply all its relay log, downgrade it following the instructions for a single server downgrade, and reinsert it back into the topology. If there are multiple levels of replicas (replicas-of-replicas) then downgrade top-down starting with the replicas nearest to the source server.

\subsection*{19.5.4 Troubleshooting Replication}

If you have followed the instructions but your replication setup is not working, the first thing to do is check the error log for messages. Many users have lost time by not doing this soon enough after encountering problems.

If you cannot tell from the error log what the problem was, try the following techniques:
- Verify that the source has binary logging enabled by issuing a SHOW BINARY LOG STATUS statement. Binary logging is enabled by default. If binary logging is enabled, Position is nonzero. If binary logging is not enabled, verify that you are not running the source with any settings that disable binary logging, such as the --skip-log-bin option.
- Verify that the server_id system variable was set at startup on both the source and replica and that the ID value is unique on each server.
- Verify that the replica is running. Use SHOW REPLICA STATUS to check whether the Replica_IO_Running and Replica_SQL_Running values are both Yes. If not, verify the options that were used when starting the replica server. For example, --skip-replica-start prevents the replication threads from starting until you issue a START REPLICA statement.
- If the replica is running, check whether it established a connection to the source. Use SHOW PROCESSLIST, find the I/O (receiver) and SQL (applier) threads and check their State column to see what they display. See Section 19.2.3, "Replication Threads". If the receiver thread state says Connecting to master, check the following:
- Verify the privileges for the replication user on the source.
- Check that the host name of the source is correct and that you are using the correct port to connect to the source. The port used for replication is the same as used for client network
communication (the default is 3306 ). For the host name, ensure that the name resolves to the correct IP address.
- Check the configuration file to see whether the skip_networking system variable has been enabled on the source or replica to disable networking. If so, comment the setting or remove it.
- If the source has a firewall or IP filtering configuration, ensure that the network port being used for MySQL is not being filtered.
- Check that you can reach the source by using ping or traceroute/tracert to reach the host.
- If the replica was running previously but has stopped, the reason usually is that some statement that succeeded on the source failed on the replica. This should never happen if you have taken a proper snapshot of the source, and never modified the data on the replica outside of the replication threads. If the replica stops unexpectedly, it is a bug or you have encountered one of the known replication limitations described in Section 19.5.1, "Replication Features and Issues". If it is a bug, see Section 19.5.5, "How to Report Replication Bugs or Problems", for instructions on how to report it.
- If a statement that succeeded on the source refuses to run on the replica, try the following procedure if it is not feasible to do a full database resynchronization by deleting the replica's databases and copying a new snapshot from the source:
1. Determine whether the affected table on the replica is different from the source table. Try to understand how this happened. Then make the replica's table identical to the source's and run START REPLICA.
2. If the preceding step does not work or does not apply, try to understand whether it would be safe to make the update manually (if needed) and then ignore the next statement from the source.
3. If you decide that the replica can skip the next statement from the source, issue the following statements:
```
mysql> SET GLOBAL sql_replica_skip_counter = N;
mysql> START REPLICA;
```


The value of $N$ should be 1 if the next statement from the source does not use AUTO_INCREMENT or LAST_INSERT_ID( ). Otherwise, the value should be 2 . The reason for using a value of 2 for statements that use AUTO_INCREMENT or LAST_INSERT_ID( ) is that they take two events in the binary log of the source.
4. If you are sure that the replica started out perfectly synchronized with the source, and that no one has updated the tables involved outside of the replication threads, then presumably the discrepancy is the result of a bug. If you are running the most recent version of MySQL, please report the problem. If you are running an older version, try upgrading to the latest production release to determine whether the problem persists.

\subsection*{19.5.5 How to Report Replication Bugs or Problems}

When you have determined that there is no user error involved, and replication still either does not work at all or is unstable, it is time to send us a bug report. We need to obtain as much information as possible from you to be able to track down the bug. Please spend some time and effort in preparing a good bug report.

If you have a repeatable test case that demonstrates the bug, please enter it into our bugs database using the instructions given in Section 1.6, "How to Report Bugs or Problems". If you have a "phantom" problem (one that you cannot duplicate at will), use the following procedure:
1. Verify that no user error is involved. For example, if you update the replica outside of the replication threads, the data goes out of synchrony, and you can have unique key violations on updates. In this case, the replication thread stops and waits for you to clean up the tables manually to bring them
into synchrony. This is not a replication problem. It is a problem of outside interference causing replication to fail.
2. Ensure that the replica is running with binary logging enabled (the log_bin system variable), and with the--log-replica-updates option enabled, which causes the replica to log the updates that it receives from the source into its own binary logs. These settings are the defaults.
3. Save all evidence before resetting the replication state. If we have no information or only sketchy information, it becomes difficult or impossible for us to track down the problem. The evidence you should collect is:
- All binary log files from the source
- All binary log files from the replica
- The output of SHOW BINARY LOG STATUS from the source at the time you discovered the problem
- The output of SHOW REPLICA STATUS from the replica at the time you discovered the problem
- Error logs from the source and the replica
4. Use mysqlbinlog to examine the binary logs. The following should be helpful to find the problem statement. log_file and log_pos are the Master_Log_File and Read_Master_Log_Pos values from SHOW REPLICA STATUS.
```
$> mysqlbinlog --start-position=log_pos log_file | head
```


After you have collected the evidence for the problem, try to isolate it as a separate test case first. Then enter the problem with as much information as possible into our bugs database using the instructions at Section 1.6, "How to Report Bugs or Problems".

