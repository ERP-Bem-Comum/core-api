\section*{Behaviors When Binary Log Transaction Compression is Enabled}

Transactions with payloads that are compressed can be rolled back like any other transaction, and they can also be filtered out on a replica by the usual filtering options. Binary log transaction compression can be applied to XA transactions.

When binary log transaction compression is enabled, the max_allowed_packet and replica_max_allowed_packet limits for the server still apply, and are measured on the compressed size of the Transaction_payload_event, plus the bytes used for the event header.

\section*{Important \\ Compressed transaction payloads are sent as a single packet, rather than each event of the transaction being sent in an individual packet, as is the case when binary log transaction compression is not in use. In case the compressed transaction packet exceeds the maximum packet size used in replication, which is 1 GiB , the source server writes the transaction uncompressed, so that it can be sent in smaller pieces.}

For multithreaded workers, each transaction (including its GTID event and Transaction_payload_event) is assigned to a worker thread. The worker thread decompresses the transaction payload and applies the individual events in it one by one. If an error is found applying any event within the Transaction_payload_event, the complete transaction is reported to the co-ordinator as having failed. When replica_parallel_type or replica_parallel_type is set to DATABASE, all the databases affected by the transaction are mapped before the transaction is scheduled. The use of binary log transaction compression with the DATABASE policy can reduce parallelism compared to uncompressed transactions, which are mapped and scheduled for each event.

For semisynchronous replication (see Section 19.4.10, "Semisynchronous Replication"), the replica acknowledges the transaction when the complete Transaction_payload_event has been received.

When binary log checksums are enabled (which is the default), the replication source server does not write checksums for individual events in a compressed transaction payload. Instead, a checksum is written for the complete Transaction_payload_event, and individual checksums are written for any events that were not compressed, such as events relating to GTIDs.

For the SHOW BINLOG EVENTS and SHOW RELAYLOG EVENTS statements, the Transaction_payload_event is first printed as a single unit, then it is unpacked and each event inside it is printed.

For operations that reference the end position of an event, such as START REPLICA with the UNTIL clause, SOURCE_POS_WAIT( ), and sql_replica_skip_counter, you must specify the end position of the compressed transaction payload (the Transaction_payload_event). When skipping events using sql_replica_skip_counter, a compressed transaction payload is counted as a single counter value, so all the events inside it are skipped as a unit.

\section*{Combining Compressed and Uncompressed Transaction Payloads}

MySQL Server releases that support binary log transaction compression can handle a mix of compressed and uncompressed transaction payloads.
- The system variables relating to binary log transaction compression do not need to be set the same on all Group Replication group members, and are not replicated from sources to replicas in a replication topology. You can decide whether or not binary log transaction compression is appropriate for each MySQL Server instance that has a binary log.
- If transaction compression is enabled then disabled on a server, compression is not applied to future transactions originated on that server, but transaction payloads that have been compressed can still be handled and displayed.
- If transaction compression is specified for individual sessions by setting the session value of binlog_transaction_compression, the binary log can contain a mix of compressed and uncompressed transaction payloads.

When a source in a replication topology and its replica both have binary log transaction compression enabled, the replica receives compressed transaction payloads and writes them compressed to its relay log. It decompresses the transaction payloads to apply the transactions, and then compresses them again after applying for writing to its binary log. Any downstream replicas receive the compressed transaction payloads.

When a source in a replication topology has binary log transaction compression enabled but its replica does not, the replica receives compressed transaction payloads and writes them compressed to its relay log. It decompresses the transaction payloads to apply the transactions, and then writes them uncompressed to its own binary log, if it has one. Any downstream replicas receive the uncompressed transaction payloads.

When a source in a replication topology does not have binary log transaction compression enabled but its replica does, if the replica has a binary log, it compresses the transaction payloads after applying them, and writes the compressed transaction payloads to its binary log. Any downstream replicas receive the compressed transaction payloads.

When a MySQL server instance has no binary log, it can receive, handle, and display compressed transaction payloads regardless of its value for binlog_transaction_compression. Compressed transaction payloads received by such server instances are written in their compressed state to the relay log, so they benefit indirectly from compression that was carried out by other servers in the replication topology.

\section*{Monitoring Binary Log Transaction Compression}

You can monitor the effects of binary log transaction compression using the Performance Schema table binary_log_transaction_compression_stats. The statistics include the data compression ratio for the monitored period, and you can also view the effect of compression on the last transaction on the server. You can reset the statistics by truncating the table. Statistics for binary logs and relay logs are split out so you can see the impact of compression for each log type. The MySQL server instance must have a binary log to produce these statistics.

The Performance Schema table events_stages_current shows when a transaction is in the stage of decompression or compression for its transaction payload, and displays its progress for this stage. Compression is carried out by the worker thread handling the transaction, just before the transaction is committed, provided that there are no events in the finalized capture cache that exclude the transaction from binary log transaction compression (for example, incident events). When decompression is required, it is carried out for one event from the payload at a time.
mysqlbinlog with the --verbose option includes comments stating the compressed size and the uncompressed size for compressed transaction payloads, and the compression algorithm that was used.

You can enable connection compression at the protocol level for replication connections, using the SOURCE_COMPRESSION_ALGORITHMS and SOURCE_ZSTD_COMPRESSION_LEVEL options of the CHANGE REPLICATION SOURCE TO statement, or the replica_compressed_protocol system variable. If you enable binary log transaction compression in a system where connection compression is also enabled, the impact of connection compression is reduced, as there might be little opportunity to further compress the compressed transaction payloads. However, connection compression can still operate on uncompressed events and on message headers. Binary log transaction compression can be enabled in combination with connection compression if you need to save storage space as well as network bandwidth. For more information on connection compression for replication connections, see Section 6.2.8, "Connection Compression Control".

For Group Replication, compression is enabled by default for messages that exceed the threshold set by the group_replication_compression_threshold system variable. You can also
configure compression for messages sent for distributed recovery by the method of state transfer from a donor's binary log, using the group_replication_recovery_compression_algorithms and group_replication_recovery_zstd_compression_level system variables. If you enable binary log transaction compression in a system where these are configured, Group Replication's message compression can still operate on uncompressed events and on message headers, but its impact is reduced. For more information on message compression for Group Replication, see Section 20.7.4, "Message Compression".

\subsection*{7.4.5 The Slow Query Log}

The slow query log consists of SQL statements that take more than long_query_time seconds to execute and require at least min_examined_row_limit rows to be examined. The slow query log can be used to find queries that take a long time to execute and are therefore candidates for optimization. However, examining a long slow query log can be a time-consuming task. To make this easier, you can use the mysqldumpslow command to process a slow query log file and summarize its contents. See Section 6.6.10, "mysqldumpslow - Summarize Slow Query Log Files".

The time to acquire the initial locks is not counted as execution time. mysqld writes a statement to the slow query log after it has been executed and after all locks have been released, so log order might differ from execution order.
- Slow Query Log Parameters
- Slow Query Log Contents

\section*{Slow Query Log Parameters}

The minimum and default values of long_query_time are 0 and 10 , respectively. The value can be specified to a resolution of microseconds.

By default, administrative statements are not logged, nor are queries that do not use indexes for lookups. This behavior can be changed using log_slow_admin_statements and log_queries_not_using_indexes, as described later.

By default, the slow query log is disabled. To specify the initial slow query log state explicitly, use --slow_query_log[=\{0|1\}]. With no argument or an argument of 1, --slow_query_log enables the log. With an argument of 0 , this option disables the log. To specify a log file name, use -slow_query_log_file=file_name. To specify the log destination, use the log_output system variable (as described in Section 7.4.1, "Selecting General Query Log and Slow Query Log Output Destinations").

\section*{Note}

If you specify the TABLE log destination, see Log Tables and "Too many open files" Errors.

If you specify no name for the slow query log file, the default name is host_name-slow.log. The server creates the file in the data directory unless an absolute path name is given to specify a different directory.

To disable or enable the slow query log or change the log file name at runtime, use the global slow_query_log and slow_query_log_file system variables. Set slow_query_log to 0 to disable the log or to 1 to enable it. Set slow_query_log_file to specify the name of the log file. If a log file already is open, it is closed and the new file is opened.

The server writes less information to the slow query log if you use the--log-short-format option.
To include slow administrative statements in the slow query log, enable the log_slow_admin_statements system variable. Administrative statements include ALTER TABLE, ANALYZE TABLE, CHECK TABLE, CREATE INDEX, DROP INDEX, OPTIMIZE TABLE, and REPAIR TABLE.

To include queries that do not use indexes for row lookups in the statements written to the slow query log, enable the log_queries_not_using_indexes system variable. (Even with that variable enabled, the server does not log queries that would not benefit from the presence of an index due to the table having fewer than two rows.)

When queries that do not use an index are logged, the slow query log may grow quickly. It is possible to put a rate limit on these queries by setting the log_throttle_queries_not_using_indexes system variable. By default, this variable is 0 , which means there is no limit. Positive values impose a per-minute limit on logging of queries that do not use indexes. The first such query opens a 60 -second window within which the server logs queries up to the given limit, then suppresses additional queries. If there are suppressed queries when the window ends, the server logs a summary that indicates how many there were and the aggregate time spent in them. The next 60-second window begins when the server logs the next query that does not use indexes.

The server uses the controlling parameters in the following order to determine whether to write a query to the slow query log:
1. The query must either not be an administrative statement, or log_slow_admin_statements must be enabled.
2. The query must have taken at least long_query_time seconds, or log_queries_not_using_indexes must be enabled and the query used no indexes for row lookups.
3. The query must have examined at least min_examined_row_limit rows.
4. The query must not be suppressed according to the log_throttle_queries_not_using_indexes setting.

The log_timestamps system variable controls the time zone of timestamps in messages written to the slow query log file (as well as to the general query log file and the error log). It does not affect the time zone of general query log and slow query log messages written to log tables, but rows retrieved from those tables can be converted from the local system time zone to any desired time zone with CONVERT_TZ() or by setting the session time_zone system variable.

By default, a replica does not write replicated queries to the slow query log. To change this, enable the log_slow_replica_statements system variable. Note that if row-based replication is in use (binlog_format=ROW), these system variables have no effect. Queries are only added to the replica's slow query log when they are logged in statement format in the binary log, that is, when binlog_format=STATEMENT is set, or when binlog_format=MIXED is set and the statement is logged in statement format. Slow queries that are logged in row format when binlog_format=MIXED is set, or that are logged when binlog_format=ROW is set, are not added to the replica's slow query log, even if log_slow_replica_statements is enabled.

\section*{Slow Query Log Contents}

When the slow query log is enabled, the server writes output to any destinations specified by the log_output system variable. If you enable the log, the server opens the log file and writes startup messages to it. However, further logging of queries to the file does not occur unless the FILE log destination is selected. If the destination is NONE, the server writes no queries even if the slow query log is enabled. Setting the log file name has no effect on logging if FILE is not selected as an output destination.

If the slow query log is enabled and FILE is selected as an output destination, each statement written to the log is preceded by a line that begins with a \# character and has these fields (with all fields on a single line):
- Query_time: duration

The statement execution time in seconds.
- Lock_time: duration

The time to acquire locks in seconds.
- Rows_sent: $N$

The number of rows sent to the client.
- Rows_examined:

The number of rows examined by the server layer (not counting any processing internal to storage engines).

Enabling the log_slow_extra system variable causes the server to write the following extra fields to FILE output in addition to those just listed (TABLE output is unaffected). Some field descriptions refer to status variable names. Consult the status variable descriptions for more information. However, in the slow query log, the counters are per-statement values, not cumulative per-session values.
- Thread_id: ID

The statement thread identifier.
- Errno: error_number

The statement error number, or 0 if no error occurred.
- Killed: N

If the statement was terminated, the error number indicating why, or 0 if the statement terminated normally.
- Bytes_received: N

The Bytes_received value for the statement.
- Bytes_sent: N

The Bytes_sent value for the statement.
- Read_first: N

The Handler_read_first value for the statement.
- Read_last: $N$

The Handler_read_last value for the statement.
- Read_key: $N$

The Handler_read_key value for the statement.
- Read_next: $N$

The Handler_read_next value for the statement.
- Read_prev: N

The Handler_read_prev value for the statement.
- Read_rnd: $N$

The Handler_read_rnd value for the statement.
- Read_rnd_next: $N$

The Handler_read_rnd_next value for the statement.
- Sort_merge_passes: N

The Sort_merge_passes value for the statement.
- Sort_range_count: N

The Sort_range value for the statement.
- Sort_rows: N

The Sort_rows value for the statement.
- Sort_scan_count: N

The Sort_scan value for the statement.
- Created_tmp_disk_tables: N

The Created_tmp_disk_tables value for the statement.
- Created_tmp_tables: N

The Created_tmp_tables value for the statement.
- Start: timestamp

The statement execution start time.
- End: timestamp

The statement execution end time.
A given slow query log file may contain a mix of lines with and without the extra fields added by enabling log_slow_extra. Log file analyzers can determine whether a line contains the additional fields by the field count.

Each statement written to the slow query log file is preceded by a SET statement that includes a timestamp, which indicates when the slow statement began executing.

Passwords in statements written to the slow query log are rewritten by the server not to occur literally in plain text. See Section 8.1.2.3, "Passwords and Logging".

Statements that cannot be parsed (due, for example, to syntax errors) are not written to the slow query log.

\subsection*{7.4.6 Server Log Maintenance}

As described in Section 7.4, "MySQL Server Logs", MySQL Server can create several different log files to help you see what activity is taking place. However, you must clean up these files regularly to ensure that the logs do not take up too much disk space.

When using MySQL with logging enabled, you may want to back up and remove old log files from time to time and tell MySQL to start logging to new files. See Section 9.2, "Database Backup Methods".

On a Linux (Red Hat) installation, you can use the mysql-log-rotate script for log maintenance. If you installed MySQL from an RPM distribution, this script should have been installed automatically. Be careful with this script if you are using the binary log for replication. You should not remove binary logs until you are certain that their contents have been processed by all replicas.

On other systems, you must install a short script yourself that you start from cron (or its equivalent) for handling log files.

Binary log files are automatically removed after the server's binary log expiration period. Removal of the files can take place at startup and when the binary log is flushed. The default
binary log expiration period is 30 days. To specify an alternative expiration period, use the binlog_expire_logs_seconds system variable. If you are using replication, you should specify an expiration period that is no lower than the maximum amount of time your replicas might lag behind the source. To remove binary logs on demand, use the PURGE BINARY LOGS statement (see Section 15.4.1.1, "PURGE BINARY LOGS Statement").

To force MySQL to start using new log files, flush the logs. Log flushing occurs when you execute a FLUSH LOGS statement or a mysqladmin flush-logs, mysqladmin refresh, mysqldump --flush-logs, or mysqldump --source-data command. See Section 15.7.8.3, "FLUSH Statement", Section 6.5.2, "mysqladmin - A MySQL Server Administration Program", and Section 6.5.4, "mysqldump - A Database Backup Program". In addition, the server flushes the binary log automatically when current binary log file size reaches the value of the max_binlog_size system variable.

FLUSH LOGS supports optional modifiers to enable selective flushing of individual logs (for example, FLUSH BINARY LOGS). See Section 15.7.8.3, "FLUSH Statement".

A log-flushing operation has the following effects:
- If binary logging is enabled, the server closes the current binary log file and opens a new log file with the next sequence number.
- If general query logging or slow query logging to a log file is enabled, the server closes and reopens the log file.
- If the server was started with the --log-error option to cause the error log to be written to a file, the server closes and reopens the log file.

Execution of log-flushing statements or commands requires connecting to the server using an account that has the RELOAD privilege. On Unix and Unix-like systems, another way to flush the logs is to send a signal to the server, which can be done by root or the account that owns the server process. (See Section 6.10, "Unix Signal Handling in MySQL".) Signals enable log flushing to be performed without having to connect to the server:
- A SIGHUP signal flushes all the logs. However, SIGHUP has additional effects other than log flushing that might be undesirable.
- SIGUSR1 causes the server to flush the error log, general query log, and slow query log. If you are interested in flushing only those logs, SIGUSR1 can be used as a more "lightweight" signal that does not have the SIGHUP effects that are unrelated to logs.

As mentioned previously, flushing the binary log creates a new binary log file, whereas flushing the general query log, slow query log, or error log just closes and reopens the log file. For the latter logs, to cause a new log file to be created on Unix, rename the current log file first before flushing it. At flush time, the server opens the new log file with the original name. For example, if the general query log, slow query log, and error log files are named mysql.log, mysql-slow.log, and err.log, you can use a series of commands like this from the command line:
```
cd mysql-data-directory
mv mysql.log mysql.log.old
mv mysql-slow.log mysql-slow.log.old
mv err.log err.log.old
mysqladmin flush-logs
```


On Windows, use rename rather than mv.
At this point, you can make a backup of mysql.log.old, mysql-slow.log.old, and err.log.old, then remove them from disk.

To rename the general query log or slow query log at runtime, first connect to the server and disable the log:
```
SET GLOBAL general_log = 'OFF';
```

```
SET GLOBAL slow_query_log = 'OFF';
```


With the logs disabled, rename the log files externally (for example, from the command line). Then enable the logs again:
```
SET GLOBAL general_log = 'ON';
SET GLOBAL slow_query_log = 'ON';
```


This method works on any platform and does not require a server restart.

\section*{Note}

For the server to recreate a given log file after you have renamed the file externally, the file location must be writable by the server. This may not always be the case. For example, on Linux, the server might write the error log as / var/log/mysqld.log, where/var/log is owned by root and not writable by mysqld. In this case, log-flushing operations fail to create a new log file.

To handle this situation, you must manually create the new log file with the proper ownership after renaming the original log file. For example, execute these commands as root:
```
mv /var/log/mysqld.log /var/log/mysqld.log.old
install -omysql -gmysql -m0644 /dev/null /var/log/mysqld.log
```


\subsection*{7.5 MySQL Components}

MySQL Server includes a component-based infrastructure for extending server capabilities. A component provides services that are available to the server and other components. (With respect to service use, the server is a component, equal to other components.) Components interact with each other only through the services they provide.

MySQL distributions include several components that implement server extensions:
- Components for configuring error logging. See Section 7.4.2, "The Error Log", and Section 7.5.3, "Error Log Components".
- A component for checking passwords. See Section 8.4.3, "The Password Validation Component".
- Keyring components provide secure storage for sensitive information. See Section 8.4.4, "The MySQL Keyring".
- A component that enables applications to add their own message events to the audit log. See Section 8.4.6, "The Audit Message Component".
- A component that implements a loadable function for accessing query attributes. See Section 11.6, "Query Attributes".
- A component for scheduling actively executing tasks. See Section 7.5.5, "Scheduler Component".

System and status variables implemented by a component are exposed when the component is installed and have names that begin with a component-specific prefix. For example, the log_filter_dragnet error log filter component implements a system variable named log_error_filter_rules, the full name of which is dragnet.log_error_filter_rules. To refer to this variable, use the full name.

The following sections describe how to install and uninstall components, and how to determine at runtime which components are installed and obtain information about them.

For information about the internal implementation of components, see the MySQL Server Doxygen documentation, available at https://dev.mysql.com/doc/index-other.html. For example, if you intend to write your own components, this information is important for understanding how components work.

\subsection*{7.5.1 Installing and Uninstalling Components}

Components must be loaded into the server before they can be used. MySQL supports manual component loading at runtime and automatic loading during server startup.

While a component is loaded, information about it is available as described in Section 7.5.2, "Obtaining Component Information".

The INSTALL COMPONENT and UNINSTALL COMPONENT SQL statements enable component loading and unloading. For example:
```
INSTALL COMPONENT 'file://component_validate_password';
UNINSTALL COMPONENT 'file://component_validate_password';
```


A loader service handles component loading and unloading, and also registers loaded components in the mysql.component system table.

Components are loaded in the server locally (not replicated).
The SQL statements for component manipulation affect server operation and the mysql.component system table as follows:
- INSTALL COMPONENT loads components into the server. The components become active immediately. The loader service also registers loaded components in the mysql.component system table. For subsequent server restarts, the loader service loads any components listed in mysql.component during the startup sequence. This occurs even if the server is started with the--skip-grant-tables option. The optional SET clause permits setting component systemvariable values when you install components.
- UNINSTALL COMPONENT deactivates components and unloads them from the server. The loader service also unregisters the components from the mysql. component system table so that the server no longer loads them during its startup sequence for subsequent restarts.

Compared to the corresponding INSTALL PLUGIN statement for server plugins, the INSTALL COMPONENT statement for components offers the significant advantage that it is not necessary to know any platform-specific file name suffix for naming the component. This means that a given INSTALL COMPONENT statement can be executed uniformly across platforms.

A component when installed may also automatically install related loadable functions. If so, the component when uninstalled also automatically uninstalls those functions.

\subsection*{7.5.2 Obtaining Component Information}

The mysql.component system table contains information about currently loaded components and shows which components have been registered using INSTALL COMPONENT. Selecting from the table shows which components are installed. For example:
```
mysql> SELECT * FROM mysql.component;
+---------------+--------------------+-------------------------------------
| component_id | component_group_id | component_urn |
+---------------+--------------------+--------------------------------------
| 1 | 1 | file://component_validate_password
| 2 | 2 | file://component_log_sink_json |
+---------------+---------------------+-------------------------------------
```


The component_id and component_group_id values are for internal use. The component_urn is the URN used in INSTALL COMPONENT and UNINSTALL COMPONENT statements to load and unload the component.

\subsection*{7.5.3 Error Log Components}

This section describes the characteristics of individual error log components. For general information about configuring error logging, see Section 7.4.2, "The Error Log".

A log component can be a filter or a sink:
- A filter processes log events, to add, remove, or modify event fields, or to delete events entirely. The resulting events pass to the next log component in the list of enabled components.
- A sink is a destination (writer) for log events. Typically, a sink processes log events into log messages that have a particular format and writes these messages to its associated output, such as a file or the system log. A sink may also write to the Performance Schema error_log table; see Section 29.12.22.2, "The error_log Table". Events pass unmodified to the next log component in the list of enabled components (that is, although a sink formats events to produce output messages, it does not modify events as they pass internally to the next component).

The log_error_services system variable lists the enabled log components. Components not named in the list are disabled. log_error_services also implicitly loads error log components if they are not already loaded. For more information, see Section 7.4.2.1, "Error Log Configuration".

The following sections describe individual log components, grouped by component type:
- Filter Error Log Components
- Sink Error Log Components

Component descriptions include these types of information:
- The component name and intended purpose.
- Whether the component is built in or must be loaded. For a loadable component, the description specifies the URN to use if explicitly loading or unloading the component with the INSTALL COMPONENT and UNINSTALL COMPONENT statements. Implicitly loading error log components requires only the component name. For more information, see Section 7.4.2.1, "Error Log Configuration".
- Whether the component can be listed multiple times in the log_error_services value.
- For a sink component, the destination to which the component writes output.
- For a sink component, whether it supports an interface to the Performance Schema error_log table.

\section*{Filter Error Log Components}

Error log filter components implement filtering of error log events. If no filter component is enabled, no filtering occurs.

Any enabled filter component affects log events only for components listed later in the log_error_services value. In particular, for any log sink component listed in log_error_services earlier than any filter component, no log event filtering occurs.

\section*{The log_filter_internal Component}
- Purpose: Implements filtering based on log event priority and error code, in combination with the log_error_verbosity and log_error_suppression_list system variables. See Section 7.4.2.5, "Priority-Based Error Log Filtering (log_filter_internal)".
- URN: This component is built in and need not be loaded.
- Multiple uses permitted: No.

If log_filter_internal is disabled, log_error_verbosity and log_error_suppression_list have no effect.

\section*{The log_filter_dragnet Component}
- Purpose: Implements filtering based on the rules defined by the dragnet.log_error_filter_rules system variable setting. See Section 7.4.2.6, "Rule-Based Error Log Filtering (log_filter_dragnet)".
- URN: file://component_log_filter_dragnet
- Multiple uses permitted: No.

\section*{Sink Error Log Components}

Error log sink components are writers that implement error log output. If no sink component is enabled, no log output occurs.

Some sink component descriptions refer to the default error log destination. This is the console or a file and is indicated by the value of the log_error system variable, determined as described in Section 7.4.2.2, "Default Error Log Destination Configuration".

\section*{The log_sink_internal Component}
- Purpose: Implements traditional error log message output format.
- URN: This component is built in and need not be loaded.
- Multiple uses permitted: No.
- Output destination: Writes to the default error log destination.
- Performance Schema support: Writes to the error_log table. Provides a parser for reading error log files created by previous server instances.

\section*{The log_sink_json Component}
- Purpose: Implements JSON-format error logging. See Section 7.4.2.7, "Error Logging in JSON Format".
- URN: file://component_log_sink_json
- Multiple uses permitted: Yes.
- Output destination: This sink determines its output destination based on the default error log destination, which is given by the log_error system variable:
- If log_error names a file, the sink bases output file naming on that file name, plus a numbered.$N N$. json suffix, with $N N$ starting at 00 . For example, if log_error is file_name, successive instances of log_sink_json named in the log_error_services value write to file_name.00.json, file_name.01.json, and so forth.
- If log_error is stderr, the sink writes to the console. If log_sink_json is named multiple times in the log_error_services value, they all write to the console, which is likely not useful.
- Performance Schema support: Writes to the error_log table. Provides a parser for reading error log files created by previous server instances.

\section*{The log_sink_syseventlog Component}
- Purpose: Implements error logging to the system log. This is the Event Log on Windows, and syslog on Unix and Unix-like systems. See Section 7.4.2.8, "Error Logging to the System Log".
- URN: file://component_log_sink_syseventlog
- Multiple uses permitted: No.
- Output destination: Writes to the system log. Does not use the default error log destination.
- Performance Schema support: Does not write to the error_log table. Does not provide a parser for reading error log files created by previous server instances.

\section*{The log_sink_test Component}
- Purpose: Intended for internal use in writing test cases, not for production use.
- URN: file://component_log_sink_test

Sink properties such as whether multiple uses are permitted and the output destination are not specified for log_sink_test because, as mentioned, it is for internal use. As such, its behavior is subject to change at any time.

\subsection*{7.5.4 Query Attribute Components}

A component service provides access to query attributes (see Section 11.6, "Query Attributes"). The query_attributes component uses this service to provide access to query attributes within SQL statements.
- Purpose: Implements the mysql_query_attribute_string() function that takes an attribute name argument and returns the attribute value as a string, or NULL if the attribute does not exist.
- URN: file://component_query_attributes

Developers who wish to incorporate the same query-attribute component service used by query_attributes should consult the mysql_query_attributes.h file in a MySQL source distribution.

\subsection*{7.5.5 Scheduler Component}

\section*{Note}

The scheduler component is included in MySQL Enterprise Edition, a commercial product. To learn more about commercial products, see https:// www.mysql.com/products/.

The scheduler component provides an implementation of the mysql_scheduler service that enables applications, components, or plugins to configure, run, and unconfigure tasks every $N$ seconds. For example, the audit_log server plugin calls the scheduler component at its initialization and configures a regular, recurring flush of its memory cache (see Enabling the Audit Log Flush Task).
- Purpose: Implements the component_scheduler.enabled system variable that controls whether the scheduler is actively executing tasks. At startup, the scheduler component registers the performance_schema.component_scheduler_tasks table, which lists the currently scheduled tasks and some runtime data about each one.
- URN: file://component_scheduler

For installation instructions, see Section 7.5.1, "Installing and Uninstalling Components".
The scheduler component implements the service using these elements:
- A priority queue of the registered, inactive scheduled tasks sorted by the next time to run (in ascending order).
- A list of the registered, active tasks.
- A background thread that:
- Sleeps if there are no tasks or if the top task needs more time to run. It wakes periodically to check whether it is time to end.
- Compiles a list of the tasks that need to run, moves them from the inactive queue, adds them to the active queue, and executes each task individually.
- After executing the task list, removes the tasks from the active list, adds them to the inactive list, and calculates the next time they need to run.

When a caller invokes the mysql_scheduler.create() service, it creates a new scheduled task instance to add to the queue, which signals the semaphore of the background thread. A handle to the new task is returned to the caller. The calling code should keep this handle and the service reference to the scheduling service until after calling the mysql_scheduler.destroy() service. When the caller invokes destroy( ) and passes in the handle it received from create( ), the service waits for the task to become inactive (if running) and then removes it from the inactive queue.

The component service calls each application-provided callback (function pointer) into the same scheduler thread, one at a time and in ascending order, based on the time each requires to run.

Developers who wish to incorporate scheduler-queueing capabilities into an application, component, or plugin should consult the mysql_scheduler.h file in a MySQL source distribution.

\subsection*{7.6 MySQL Server Plugins}

MySQL supports an plugin API that enables creation of server plugins. Plugins can be loaded at server startup, or loaded and unloaded at runtime without restarting the server. The plugins supported by this interface include, but are not limited to, storage engines, INFORMATION_SCHEMA tables, full-text parser plugins, and server extensions.

MySQL distributions include several plugins that implement server extensions:
- Plugins for authenticating attempts by clients to connect to MySQL Server. Plugins are available for several authentication protocols. See Section 8.2.17, "Pluggable Authentication".
- A connection control plugin that enables administrators to introduce an increasing delay after a certain number of consecutive failed client connection attempts. See Section 8.4.2, "Connection Control Plugins".
- A password-validation plugin implements password strength policies and assesses the strength of potential passwords. See Section 8.4.3, "The Password Validation Component".
- Semisynchronous replication plugins implement an interface to replication capabilities that permit the source to proceed as long as at least one replica has responded to each transaction. See Section 19.4.10, "Semisynchronous Replication".
- Group Replication enables you to create a highly available distributed MySQL service across a group of MySQL server instances, with data consistency, conflict detection and resolution, and group membership services all built-in. See Chapter 20, Group Replication.
- MySQL Enterprise Edition includes a thread pool plugin that manages connection threads to increase server performance by efficiently managing statement execution threads for large numbers of client connections. See Section 7.6.3, "MySQL Enterprise Thread Pool".
- MySQL Enterprise Edition includes an audit plugin for monitoring and logging of connection and query activity. See Section 8.4.5, "MySQL Enterprise Audit".
- MySQL Enterprise Edition includes a firewall plugin that implements an application-level firewall to enable database administrators to permit or deny SQL statement execution based on matching against allowlists of accepted statement patterns. See Section 8.4.7, "MySQL Enterprise Firewall".
- Query rewrite plugins examine statements received by MySQL Server and possibly rewrite them before the server executes them. See Section 7.6.4, "The Rewriter Query Rewrite Plugin", and Section 7.6.5, "The ddl_rewriter Plugin".
- Version Tokens enables creation of and synchronization around server tokens that applications can use to prevent accessing incorrect or out-of-date data. Version Tokens is based on a plugin library that implements a version_tokens plugin and a set of loadable functions. See Section 7.6.6, "Version Tokens".
- Keyring plugins provide secure storage for sensitive information. See Section 8.4.4, "The MySQL Keyring".
- X Plugin extends MySQL Server to be able to function as a document store. Running X Plugin enables MySQL Server to communicate with clients using the X Protocol, which is designed to expose the ACID compliant storage abilities of MySQL as a document store. See Section 22.5, "X Plugin".
- Clone permits cloning InnoDB data from a local or remote MySQL server instance. See Section 7.6.7, "The Clone Plugin".
- Test framework plugins test server services. For information about these plugins, see the Plugins for Testing Plugin Services section of the MySQL Server Doxygen documentation, available at https:// dev.mysql.com/doc/index-other.html.

The following sections describe how to install and uninstall plugins, and how to determine at runtime which plugins are installed and obtain information about them. For information about writing plugins, see The MySQL Plugin API.

\subsection*{7.6.1 Installing and Uninstalling Plugins}

Server plugins must be loaded into the server before they can be used. MySQL supports plugin loading at server startup and runtime. It is also possible to control the activation state of loaded plugins at startup, and to unload them at runtime.

While a plugin is loaded, information about it is available as described in Section 7.6.2, "Obtaining Server Plugin Information".
- Installing Plugins
- Controlling Plugin Activation State
- Uninstalling Plugins
- Plugins and Loadable Functions

\section*{Installing Plugins}

Before a server plugin can be used, it must be installed using one of the following methods. In the descriptions, plugin_name stands for a plugin name such as innodb, csv, or validate_password.
- Built-in Plugins
- Plugins Registered in the mysql.plugin System Table
- Plugins Named with Command-Line Options
- Plugins Installed with the INSTALL PLUGIN Statement

\section*{Built-in Plugins}

A built-in plugin is known by the server automatically. By default, the server enables the plugin at startup. Some built-in plugins permit this to be changed with the --plugin_name[=activation_state] option.

\section*{Plugins Registered in the mysql.plugin System Table}

The mysql.plugin system table serves as a registry of plugins (other than built-in plugins, which need not be registered). During the normal startup sequence, the server loads plugins registered in the table. By default, for a plugin loaded from the mysql. plugin table, the server also enables the plugin. This can be changed with the --plugin_name[=activation_state] option.

If the server is started with the--skip-grant-tables option, plugins registered in the mysql.plugin table are not loaded and are unavailable.

\section*{Plugins Named with Command-Line Options}

A plugin located in a plugin library file can be loaded at server startup with the --pluginload, --plugin-load-add, or--early-plugin-load option. Normally, for a plugin loaded at startup, the server also enables the plugin. This can be changed with the --plugin_name[=activation_state] option.

The --plugin-load and--plugin-load-add options load plugins after built-in plugins and storage engines have initialized during the server startup sequence. The --early-plugin-load option is used to load plugins that must be available prior to initialization of built-in plugins and storage engines.

The value of each plugin-loading option is a semicolon-separated list of plugin_library and name=plugin_library values. Each plugin_library is the name of a library file that contains plugin code, and each name is the name of a plugin to load. If a plugin library is named without any preceding plugin name, the server loads all plugins in the library. With a preceding plugin name, the server loads only the named plugin from the library. The server looks for plugin library files in the directory named by the plugin_dir system variable.

Plugin-loading options do not register any plugin in the mysql.plugin table. For subsequent restarts, the server loads the plugin again only if --plugin-load, --plugin-load-add, or --early-plugin-load is given again. That is, the option produces a one-time plugin-installation operation that persists for a single server invocation.
--plugin-load, --plugin-load-add, and --early-plugin-load enable plugins to be loaded even when--skip-grant-tables is given (which causes the server to ignore the mysql.plugin table). --plugin-load, --plugin-load-add, and --early-plugin-load also enable plugins to be loaded at startup that cannot be loaded at runtime.

The --plugin-load-add option complements the --plugin-load option:
- Each instance of - -plugin-load resets the set of plugins to load at startup, whereas --plugin-load-add adds a plugin or plugins to the set of plugins to be loaded without resetting the current set. Consequently, if multiple instances of --plugin-load are specified, only the last one applies. With multiple instances of --plugin-load-add, all of them apply.
- The argument format is the same as for --plugin-load, but multiple instances of - -pluginload - add can be used to avoid specifying a large set of plugins as a single long unwieldy --plugin-load argument.
- --plugin-load-add can be given in the absence of --plugin-load, but any instance of --plugin-load-add that appears before--plugin-load has no effect because--plugin-load resets the set of plugins to load.

For example, these options:
```
--plugin-load=x --plugin-load-add=y
```

are equivalent to these options:
```
--plugin-load-add=x --plugin-load-add=y
```

and are also equivalent to this option:
```
--plugin-load="x;y"
```


But these options:
```
--plugin-load-add=y --plugin-load=x
```

are equivalent to this option:
```
--plugin-load=x
```


\section*{Plugins Installed with the INSTALL PLUGIN Statement}

A plugin located in a plugin library file can be loaded at runtime with the INSTALL PLUGIN statement. The statement also registers the plugin in the mysql.plugin table to cause the server to load it on subsequent restarts. For this reason, INSTALL PLUGIN requires the INSERT privilege for the mysql.plugin table.

The plugin library file base name depends on your platform. Common suffixes are . so for Unix and Unix-like systems, . dll for Windows.

Example: The --plugin-load-add option installs a plugin at server startup. To install a plugin named myplugin from a plugin library file named somepluglib. so, use these lines in a my.cnf file:
[mysqld]
plugin-load-add=myplugin=somepluglib.so
In this case, the plugin is not registered in mysql.plugin. Restarting the server without the --plugin-load-add option causes the plugin not to be loaded at startup.

Alternatively, the INSTALL PLUGIN statement causes the server to load the plugin code from the library file at runtime:

INSTALL PLUGIN myplugin SONAME 'somepluglib.so';
INSTALL PLUGIN also causes "permanent" plugin registration: The plugin is listed in the mysql.plugin table to ensure that the server loads it on subsequent restarts.

Many plugins can be loaded either at server startup or at runtime. However, if a plugin is designed such that it must be loaded and initialized during server startup, attempts to load it at runtime using INSTALL PLUGIN produce an error:
```
mysql> INSTALL PLUGIN myplugin SONAME 'somepluglib.so';
ERROR 1721 (HY000): Plugin 'myplugin' is marked as not dynamically
installable. You have to stop the server to install it.
```


In this case, you must use --plugin-load, --plugin-load-add, or --early-plugin-load.
If a plugin is named both using a --plugin-load, --plugin-load-add, or --early-pluginload option and (as a result of an earlier INSTALL PLUGIN statement) in the mysql.plugin table, the server starts but writes these messages to the error log:
```
[ERROR] Function 'plugin_name' already exists
[Warning] Couldn't load plugin named 'plugin_name'
with soname 'plugin_object_file'.
```


\section*{Controlling Plugin Activation State}

If the server knows about a plugin when it starts (for example, because the plugin is named using a --plugin-load-add option or is registered in the mysql.plugin table), the server loads and enables the plugin by default. It is possible to control activation state for such a plugin using a --plugin_name[=activation_state] startup option, where plugin_name is the name of the plugin to affect, such as innodb, csv, or validate_password. As with other options, dashes and underscores are interchangeable in option names. Also, activation state values are not case-sensitive. For example, --my_plugin=ON and --my-plugin=on are equivalent.
- --plugin_name=0FF

Tells the server to disable the plugin. Using this option, you can disable, for example, the deprecated mysql_native_password plugin at server startup.
- --plugin_name[=0N]

Tells the server to enable the plugin. (Specifying the option as --plugin_name without a value has the same effect.) If the plugin fails to initialize, the server runs with the plugin disabled.
- --plugin_name=FORCE

Tells the server to enable the plugin, but if plugin initialization fails, the server does not start. In other words, this option forces the server to run with the plugin enabled or not at all.
- --plugin_name=FORCE_PLUS_PERMANENT

Like FORCE, but in addition prevents the plugin from being unloaded at runtime. If a user attempts to do so with UNINSTALL PLUGIN, an error occurs.

Plugin activation states are visible in the LOAD_OPTION column of the Information Schema PLUGINS table.

Suppose that CSV, BLACKHOLE, and ARCHIVE are built-in pluggable storage engines and that you want the server to load them at startup, subject to these conditions: The server is permitted to run if CSV initialization fails, must require that BLACKHOLE initialization succeeds, and should disable ARCHIVE. To accomplish that, use these lines in an option file:
```
[mysqld]
csv=ON
blackhole=FORCE
archive=0FF
```


The --enable-plugin_name option format is a synonym for --plugin_name=0N. The --disable-plugin_name and --skip-plugin_name option formats are synonyms for --plugin_name=0FF.

If a plugin is disabled, either explicitly with OFF or implicitly because it was enabled with ON but fails to initialize, aspects of server operation requiring the plugin change. For example, if the plugin implements a storage engine, existing tables for the storage engine become inaccessible, and attempts to create new tables for the storage engine result in tables that use the default storage engine unless the NO_ENGINE_SUBSTITUTION SQL mode is enabled to cause an error to occur instead.

Disabling a plugin may require adjustment to other options.

\section*{Uninstalling Plugins}

At runtime, the UNINSTALL PLUGIN statement disables and uninstalls a plugin known to the server. The statement unloads the plugin and removes it from the mysql.plugin system table, if it is registered there. For this reason, UNINSTALL PLUGIN statement requires the DELETE privilege for the mysql.plugin table. With the plugin no longer registered in the table, the server does not load the plugin during subsequent restarts.

UNINSTALL PLUGIN can unload a plugin regardless of whether it was loaded at runtime with INSTALL PLUGIN or at startup with a plugin-loading option, subject to these conditions:
- It cannot unload plugins that are built in to the server. These can be identified as those that have a library name of NULL in the output from the Information Schema PLUGINS table or SHOW PLUGINS.
- It cannot unload plugins for which the server was started with --plugin_name=FORCE_PLUS_PERMANENT, which prevents plugin unloading at runtime. These can be identified from the LOAD_OPTION column of the PLUGINS table.

To uninstall a plugin that currently is loaded at server startup with a plugin-loading option, use this procedure.
1. Remove from the my.cnf file any options and system variables related to the plugin. If any plugin system variables were persisted to the mysqld-auto.cnf file, remove them using RESET PERSIST var_name for each one to remove it.
2. Restart the server.
3. Plugins normally are installed using either a plugin-loading option at startup or with INSTALL PLUGIN at runtime, but not both. However, removing options for a plugin from the my.cnf file may not be sufficient to uninstall it if at some point INSTALL PLUGIN has also been used. If the plugin still appears in the output from PLUGINS or SHOW PLUGINS, use UNINSTALL PLUGIN to remove it from the mysql.plugin table. Then restart the server again.

\section*{Plugins and Loadable Functions}

A plugin when installed may also automatically install related loadable functions. If so, the plugin when uninstalled also automatically uninstalls those functions.

\subsection*{7.6.2 Obtaining Server Plugin Information}

There are several ways to determine which plugins are installed in the server:
- The Information Schema PLUGINS table contains a row for each loaded plugin. Any that have a PLUGIN_LIBRARY value of NULL are built in and cannot be unloaded.
```
mysql> TABLE INFORMATION_SCHEMA.PLUGINS\G
*************************** 1. rOW ***************************************
            PLUGIN_NAME: binlog
        PLUGIN_VERSION: 1.0
            PLUGIN_STATUS: ACTIVE
                PLUGIN_TYPE: STORAGE ENGINE
    PLUGIN_TYPE_VERSION: 80100.0
        PLUGIN_LIBRARY: NULL
PLUGIN_LIBRARY_VERSION: NULL
            PLUGIN_AUTHOR: Oracle Corporation
        h_DESCRIPTION: This is a pseudo storage engine to represent the binlog in a transaction
        PLUGIN_LICENSE: GPL
                LOAD_OPTION: FORCE
************************** 2. row *****************************************
            PLUGIN_NAME: mysql_native_password
        PLUGIN_VERSION: 1.1
            PLUGIN_STATUS: ACTIVE
                PLUGIN_TYPE: AUTHENTICATION
    PLUGIN_TYPE_VERSION: 2.1
        PLUGIN_LIBRARY: NULL
PLUGIN_LIBRARY_VERSION: NULL
            PLUGIN_AUTHOR: Oracle Corporation
    PLUGIN_DESCRIPTION: Native MySQL authentication
        PLUGIN_LICENSE: GPL
            LOAD_OPTION: FORCE
...
```

- The SHOW PLUGINS statement displays a row for each loaded plugin. Any that have a Library value of NULL are built in and cannot be unloaded.
```
mysql> SHOW PLUGINS\G
************************* 1. row *****************************************
        Name: binlog
    Status: ACTIVE
        Type: STORAGE ENGINE
Library: NULL
License: GPL
************************** 2. row *****************************************
        Name: mysql_native_password
    Status: ACTIVE
        Type: AUTHENTICATION
Library: NULL
License: GPL
...
```

- The mysql.plugin table shows which plugins have been registered with INSTALL PLUGIN. The table contains only plugin names and library file names, so it does not provide as much information as the PLUGINS table or the SHOW PLUGINS statement.

\subsection*{7.6.3 MySQL Enterprise Thread Pool}

\section*{Note}

MySQL Enterprise Thread Pool is an extension included in MySQL Enterprise Edition, a commercial product. To learn more about commercial products, https://www.mysql.com/products/.

MySQL Enterprise Edition includes MySQL Enterprise Thread Pool, implemented using a server plugin. The default thread-handling model in MySQL Server executes statements using one thread per client connection. As more clients connect to the server and execute statements, overall performance degrades. The thread pool plugin provides an alternative thread-handling model designed to reduce overhead and improve performance. The plugin implements a thread pool that increases server performance by efficiently managing statement execution threads for large numbers of client connections.

The thread pool addresses several problems of the model that uses one thread per connection:
- Too many thread stacks make CPU caches almost useless in highly parallel execution workloads. The thread pool promotes thread stack reuse to minimize the CPU cache footprint.
- With too many threads executing in parallel, context switching overhead is high. This also presents a challenge to the operating system scheduler. The thread pool controls the number of active threads to keep the parallelism within the MySQL server at a level that it can handle and that is appropriate for the server host on which MySQL is executing.
- Too many transactions executing in parallel increases resource contention. In InnoDB, this increases the time spent holding central mutexes. The thread pool controls when transactions start to ensure that not too many execute in parallel.

\section*{Additional Resources}

Section A.15, "MySQL 8.4 FAQ: MySQL Enterprise Thread Pool"

\subsection*{7.6.3.1 Thread Pool Elements}

MySQL Enterprise Thread Pool comprises these elements:
- A plugin library file implements a plugin for the thread pool code as well as several associated monitoring tables that provide information about thread pool operation:
- In MySQL 8.4, the monitoring tables are Performance Schema tables; see Section 29.12.16, "Performance Schema Thread Pool Tables".
- In older versions of MySQL, the monitoring tables were INFORMATION_SCHEMA tables (see Section 28.5, "INFORMATION_SCHEMA Thread Pool Tables"). The INFORMATION_SCHEMA tables are deprecated; expect them to be removed in a future version of MySQL. Applications should transition away from the INFORMATION_SCHEMA tables to the Performance Schema tables. For example, if an application uses this query:

SELECT * FROM INFORMATION_SCHEMA.TP_THREAD_STATE;
The application should use this query instead:
SELECT * FROM performance_schema.tp_thread_state;
Note
If you do not load all the monitoring tables, some or all MySQL Enterprise Monitor thread pool graphs may be empty.

For a detailed description of how the thread pool works, see Section 7.6.3.3, "Thread Pool Operation".
- Several system variables are related to the thread pool. The thread_handling system variable has a value of loaded-dynamically when the server successfully loads the thread pool plugin.

The other related system variables are implemented by the thread pool plugin and are not available unless it is enabled. For information about using these variables, see Section 7.6.3.3, "Thread Pool Operation", and Section 7.6.3.4, "Thread Pool Tuning".
- The Performance Schema has instruments that expose information about the thread pool and may be used to investigate operational performance. To identify them, use this query:
```
SELECT * FROM performance_schema.setup_instruments
WHERE NAME LIKE '%thread_pool%';
```


For more information, see Chapter 29, MySQL Performance Schema.

\subsection*{7.6.3.2 Thread Pool Installation}

This section describes how to install MySQL Enterprise Thread Pool. For general information about installing plugins, see Section 7.6.1, "Installing and Uninstalling Plugins".

To be usable by the server, the plugin library file must be located in the MySQL plugin directory (the directory named by the plugin_dir system variable). If necessary, configure the plugin directory location by setting the value of plugin_dir at server startup.

The plugin library file base name is thread_pool. The file name suffix differs per platform (for example, . so for Unix and Unix-like systems, . dll for Windows).

The thread pool monitoring tables are Performance Schema tables that are loaded and unloaded along with the thread pool plugin.

To enable thread pool capability, load the plugin by starting the server with the --plugin-load-add option. To do this, put these lines in the server my.cnf file, adjusting the . so suffix for your platform as necessary:
```
[mysqld]
plugin-load-add=thread_pool.so
```


To verify plugin installation, examine the Information Schema PLUGINS table or use the SHOW PLUGINS statement (see Section 7.6.2, "Obtaining Server Plugin Information"). For example:
```
mysql> SELECT PLUGIN_NAME, PLUGIN_STATUS
    FROM INFORMATION_SCHEMA.PLUGINS
    WHERE PLUGIN_NAME LIKE 'thread%';
+-------------------------+---------------+
| PLUGIN_NAME | PLUGIN_STATUS |
+------------------------+---------------+
| thread_pool | ACTIVE |
+------------------------+---------------+
```


To verify that the Performance Schema monitoring tables are available, examine the Information Schema TABLES table or use the SHOW TABLES statement. For example:
```
mysql> SELECT TABLE_NAME
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = 'performance_schema'
    AND TABLE_NAME LIKE 'tp%';
+-------------------------+
| TABLE_NAME |
+------------------------+
| tp_thread_group_state |
| tp_thread_group_stats |
| tp_thread_state |
+------------------------+
```


If the server loads the thread pool plugin successfully, it sets the thread_handling system variable to loaded-dynamically.

If the plugin fails to initialize, check the server error log for diagnostic messages.

\subsection*{7.6.3.3 Thread Pool Operation}

The thread pool consists of a number of thread groups, each of which manages a set of client connections. As connections are established, the thread pool assigns them to thread groups in roundrobin fashion.

The thread pool exposes system variables that may be used to configure its operation:
- thread_pool_algorithm: The concurrency algorithm to use for scheduling.
- thread_pool_dedicated_listeners: Dedicates a listener thread in each thread group to listen for incoming statements from connections assigned to the group.
- thread_pool_high_priority_connection: How to schedule statement execution for a session.
- thread_pool_longrun_trx_limit: How long to wait while threads using all of thread_pool_max_transactions_limit have been executing before suspending the limit for the group.
- thread_pool_max_active_query_threads: How many active threads per group to permit.
- thread_pool_max_transactions_limit: The maximum number of transactions permitted by the thread pool plugin.
- thread_pool_max_unused_threads: How many sleeping threads to permit.
- thread_pool_prio_kickup_timer: How long before the thread pool moves a statement awaiting execution from the low-priority queue to the high-priority queue.
- thread_pool_query_threads_per_group: The number of query threads permitted in a thread group (the default is a single query thread). Consider increasing the value if you experience slower response times due to long-running transactions.
- thread_pool_size: The number of thread groups in the thread pool. This is the most important parameter controlling thread pool performance.
- thread_pool_stall_limit: The time before an executing statement is considered to be stalled.
- thread_pool_transaction_delay: The delay period before starting a new transaction.

To configure the number of thread groups, use the thread_pool_size system variable. The default number of groups is 16 . For guidelines on setting this variable, see Section 7.6.3.4, "Thread Pool Tuning".

The maximum number of threads per group is 4096 (or 4095 on some systems where one thread is used internally).

The thread pool separates connections and threads, so there is no fixed relationship between connections and the threads that execute statements received from those connections. This differs from the default thread-handling model that associates one thread with one connection such that a given thread executes all statements from its connection.

By default, the thread pool tries to ensure a maximum of one thread executing in each group at any time, but sometimes permits more threads to execute temporarily for best performance:
- Each thread group has a listener thread that listens for incoming statements from the connections assigned to the group. When a statement arrives, the thread group either begins executing it immediately or queues it for later execution:
- Immediate execution occurs if the statement is the only one received, and there are no statements queued or currently executing.

Immediate execution can be delayed by configuring thread_pool_transaction_delay, which has a throttling effect on transactions. For more information, refer to the description of this variable in the discussion that follows.
- Queuing occurs if the statement cannot begin executing immediately due to concurrently queued or executing statements.
- The thread_pool_transaction_delay variable specifies a transaction delay in milliseconds. Worker threads sleep for the specified period before executing a new transaction.

A transaction delay can be used in cases where parallel transactions affect the performance of other operations due to resource contention. For example, if parallel transactions affect index creation or an online buffer pool resizing operation, you can configure a transaction delay to reduce resource contention while those operations are running. The delay has a throttling effect on transactions.

The thread_pool_transaction_delay setting does not affect queries issued from a privileged connection (a connection assigned to the Admin thread group). These queries are not subject to a configured transaction delay.
- If immediate execution occurs, the listener thread performs it. (This means that temporarily no thread in the group is listening.) If the statement finishes quickly, the executing thread returns to listening for statements. Otherwise, the thread pool considers the statement stalled and starts another thread as a listener thread (creating it if necessary). To ensure that no thread group becomes blocked by stalled statements, the thread pool has a background thread that regularly monitors thread group states.

By using the listening thread to execute a statement that can begin immediately, there is no need to create an additional thread if the statement finishes quickly. This ensures the most efficient execution possible in the case of a low number of concurrent threads.

When the thread pool plugin starts, it creates one thread per group (the listener thread), plus the background thread. Additional threads are created as necessary to execute statements.
- The value of the thread_pool_stall_limit system variable determines the meaning of "finishes quickly" in the previous item. The default time before threads are considered stalled is 60 ms but can be set to a maximum of 6s. This parameter is configurable to enable you to strike a balance appropriate for the server work load. Short wait values permit threads to start more quickly. Short values are also better for avoiding deadlock situations. Long wait values are useful for workloads that include long-running statements, to avoid starting too many new statements while the current ones execute.
- If thread_pool_max_active_query_threads is 0 , the default algorithm applies as just described for determining the maximum number of active threads per group. The default algorithm takes stalled threads into account and may temporarily permit more active threads. If thread_pool_max_active_query_threads is greater than 0, it places a limit on the number of active threads per group.
- The thread pool focuses on limiting the number of concurrent short-running statements. Before an executing statement reaches the stall time, it prevents other statements from beginning to execute. If the statement executes past the stall time, it is permitted to continue but no longer prevents other statements from starting. In this way, the thread pool tries to ensure that in each thread group there is never more than one short-running statement, although there might be multiple long-running statements. It is undesirable to let long-running statements prevent other statements from executing because there is no limit on the amount of waiting that might be necessary. For example, on a replication source server, a thread that is sending binary log events to a replica effectively runs forever.
- A statement becomes blocked if it encounters a disk I/O operation or a user level lock (row lock or table lock). The block would cause the thread group to become unused, so there are callbacks to the thread pool to ensure that the thread pool can immediately start a new thread in this group
to execute another statement. When a blocked thread returns, the thread pool permits it to restart immediately.
- There are two queues, a high-priority queue and a low-priority queue. The first statement in a transaction goes to the low-priority queue. Any following statements for the transaction go to the high-priority queue if the transaction is ongoing (statements for it have begun executing), or to the low-priority queue otherwise. Queue assignment can be affected by enabling the thread_pool_high_priority_connection system variable, which causes all queued statements for a session to go into the high-priority queue.

Statements for a nontransactional storage engine, or a transactional engine if autocommit is enabled, are treated as low-priority statements because in this case each statement is a transaction. Thus, given a mix of statements for InnoDB and MyISAM tables, the thread pool prioritizes those for InnoDB over those for MyISAM unless autocommit is enabled. With autocommit enabled, all statements have low priority.
- When the thread group selects a queued statement for execution, it first looks in the high-priority queue, then in the low-priority queue. If a statement is found, it is removed from its queue and begins to execute.
- If a statement stays in the low-priority queue too long, the thread pool moves to the high-priority queue. The value of the thread_pool_prio_kickup_timer system variable controls the time before movement. For each thread group, a maximum of one statement per 10 ms (100 per second) is moved from the low-priority queue to the high-priority queue.
- The thread pool reuses the most active threads to obtain a much better use of CPU caches. This is a small adjustment that has a great impact on performance.
- While a thread executes a statement from a user connection, Performance Schema instrumentation accounts thread activity to the user connection. Otherwise, Performance Schema accounts activity to the thread pool.

Here are examples of conditions under which a thread group might have multiple threads started to execute statements:
- One thread begins executing a statement, but runs long enough to be considered stalled. The thread group permits another thread to begin executing another statement even through the first thread is still executing.
- One thread begins executing a statement, then becomes blocked and reports this back to the thread pool. The thread group permits another thread to begin executing another statement.
- One thread begins executing a statement, becomes blocked, but does not report back that it is blocked because the block does not occur in code that has been instrumented with thread pool callbacks. In this case, the thread appears to the thread group to be still running. If the block lasts long enough for the statement to be considered stalled, the group permits another thread to begin executing another statement.

The thread pool is designed to be scalable across an increasing number of connections. It is also designed to avoid deadlocks that can arise from limiting the number of actively executing statements. It is important that threads that do not report back to the thread pool do not prevent other statements from executing and thus cause the thread pool to become deadlocked. Examples of such statements follow:
- Long-running statements. These would lead to all resources used by only a few statements and they could prevent all others from accessing the server.
- Binary log dump threads that read the binary log and send it to replicas. This is a kind of longrunning "statement" that runs for a very long time, and that should not prevent other statements from executing.
- Statements blocked on a row lock, table lock, sleep, or any other blocking activity that has not been reported back to the thread pool by MySQL Server or a storage engine.

In each case, to prevent deadlock, the statement is moved to the stalled category when it does not complete quickly, so that the thread group can permit another statement to begin executing. With this design, when a thread executes or becomes blocked for an extended time, the thread pool moves the thread to the stalled category and for the rest of the statement's execution, it does not prevent other statements from executing.

The maximum number of threads that can occur is the sum of max_connections and thread_pool_size. This can happen in a situation where all connections are in execution mode and an extra thread is created per group to listen for more statements. This is not necessarily a state that happens often, but it is theoretically possible.

\section*{Privileged Connections}

If the limit defined by thread_pool_max_transactions_limit has been reached and new connections or new transactions using existing connections appear to hang until one or more existing transactions are completed, in spite of any adjustments made to thread_pool_longrun_trx_limit, so that all existing connections are blocked or long-running, the only way to access the server may be to use a privileged connection.

To establish a privileged connection, the user initiating the connection must have the TP_CONNECTION_ADMIN privilege. A privileged connection ignores the limit defined by thread_pool_max_transactions_limit and permits connecting to the server to increase the limit, remove the limit, or kill running transactions. TP_CONNECTION_ADMIN privilege must be granted explicitly. It is not granted to any user by default.

A privileged connection can execute statements and start transactions, and is assigned to a thread group designated as the Admin thread group.

When querying the performance_schema.tp_thread_group_stats table, which reports statistics per thread group, Admin thread group statistics are reported in the last row of the result set. For example, if SELECT * FROM performance_schema.tp_thread_group_stats returns 17 rows (one row per thread group), the Admin thread group statistics are reported in the 17th row.

\subsection*{7.6.3.4 Thread Pool Tuning}

This section provides guidelines on determining the best configuration for thread pool performance, as measured using a metric such as transactions per second.

Of chief importance is the number of thread groups in the thread pool, which can be set on server startup using the --thread-pool-size option; this cannot be changed at runtime. Recommended values for this option depend on whether the primary storage engine in use is InnoDB or MyISAM:
- If the primary storage engine is InnoDB, the recommended value for the thread pool size is the number of physical cores available on the host machine, up to a maximum of 512.
- If the primary storage engine is MyISAM, the thread pool size should be fairly low. Optimal performance is often seen with values from 4 to 8 . Higher values tend to have a slightly negative but not dramatic impact on performance.

The upper limit on the number of concurrent transactions that can be processed by the thread pool plugin is determined by the value of thread_pool_max_transactions_limit. The recommendation initial setting for this system variable is the number of physical cores times 32 . You may need to adjust the value from this starting point to suit a given workload; a reasonable upper bound for this value is the maximum number of concurrent connections expected; the value of the Max_used_connections status variable can serve as a guide to determining this. A good way to proceed is to start with thread_pool_max_transactions_limit set to this value, then adjust it downwards while observing the effect on throughput.

The maximum number of query threads permitted in a thread group is determined by the value of thread_pool_query_threads_per_group, which can be adjusted at runtime. The product of this value and the thread pool size is approximately equal to the total number of threads available to process queries. Obtaining the best performance usually means striking the proper balance for your application between thread_pool_query_threads_per_group and the thread pool size. Greater values for thread_pool_query_threads_per_group value make it less likely that all the threads in the thread group simultaneously execute long running queries while blocking shorter ones when the workload includes both long and short running queries. You should bear in mind that the overhead of the connection polling operation for each thread group increases when using smaller values for the thread pool size with larger values for thread_pool_query_threads_per_group. For this reason, we recommend a starting value of 2 for thread_pool_query_threads_per_group; setting this variable to a lower value usually does not offer any performance benefit.

For best performance under normal conditions, we also recommend that you set thread_pool_algorithm to 1 for high concurrency.

In addition, the value of the thread_pool_stall_limit system variable determines the handling of blocked and long-running statements. If all calls blocking the MySQL Server were reported to the thread pool, it would always know when execution threads are blocked, but this may not always be true. For example, blocks could occur in code that has not been instrumented with thread pool callbacks. For such cases, the thread pool must be able to identify threads that appear to be blocked. This is done by means of a timeout determined by the value of thread_pool_stall_limit, which ensures that the server does not become completely blocked. The value of thread_pool_stall_limit represents a number of 10 -millisecond intervals, so that 600 (the maximum) represents 6 seconds.
thread_pool_stall_limit also enables the thread pool to handle long-running statements. If a long-running statement were permitted to block a thread group, all other connections assigned to the group would be blocked and unable to start execution until the long-running statement completed. In the worst case, this could take hours or even days.

The value of thread_pool_stall_limit should be chosen such that statements that execute longer than its value are considered stalled. Stalled statements generate a lot of extra overhead since they involve extra context switches and in some cases even extra thread creations. On the other hand, setting the thread_pool_stall_limit parameter too high means that long-running statements block a number of short-running statements for longer than necessary. Short wait values permit threads to start more quickly. Short values are also better for avoiding deadlock situations. Long wait values are useful for workloads that include long-running statements, to avoid starting too many new statements while the current ones execute.

Suppose a server executes a workload where $99.9 \%$ of the statements complete within 100 ms even when the server is loaded, and the remaining statements take between 100 ms and 2 hours fairly evenly spread. In this case, it would make sense to set thread_pool_stall_limit to 10 ( $10 \times 10 \mathrm{~ms}=100 \mathrm{~ms}$ ). The default value of $6(60 \mathrm{~ms})$ is suitable for servers that primarily execute very simple statements.

The thread_pool_stall_limit parameter can be changed at runtime to enable you to strike a balance appropriate for the server work load. Assuming that the tp_thread_group_stats table is enabled, you can use the following query to determine the fraction of executed statements that stalled:

SELECT SUM(STALLED_QUERIES_EXECUTED) / SUM(QUERIES_EXECUTED)
FROM performance_schema.tp_thread_group_stats;
This number should be as low as possible. To decrease the likelihood of statements stalling, increase the value of thread_pool_stall_limit.

When a statement arrives, what is the maximum time it can be delayed before it actually starts executing? Suppose that the following conditions apply:
- There are 200 statements queued in the low-priority queue.
- There are 10 statements queued in the high-priority queue.
- thread_pool_prio_kickup_timer is set to 10000 (10 seconds).
- thread_pool_stall_limit is set to $100(1$ second).

In the worst case, the 10 high-priority statements represent 10 transactions that continue executing for a long time. Thus, in the worst case, no statements can be moved to the high-priority queue because it always already contains statements awaiting execution. After 10 seconds, the new statement is eligible to be moved to the high-priority queue. However, before it can be moved, all the statements before it must be moved as well. This could take another 2 seconds because a maximum of 100 statements per second are moved to the high-priority queue. Now when the statement reaches the high-priority queue, there could potentially be many long-running statements ahead of it. In the worst case, every one of those becomes stalled and 1 second is required for each statement before the next statement is retrieved from the high-priority queue. Thus, in this scenario, it takes 222 seconds before the new statement starts executing.

This example shows a worst case for an application. How to handle it depends on the application. If the application has high requirements for the response time, it should most likely throttle users at a higher level itself. Otherwise, it can use the thread pool configuration parameters to set some kind of a maximum waiting time.

\subsection*{7.6.4 The Rewriter Query Rewrite Plugin}

MySQL supports query rewrite plugins that can examine and possibly modify SQL statements received by the server before the server executes them. See Query Rewrite Plugins.

MySQL distributions include a postparse query rewrite plugin named Rewriter and scripts for installing the plugin and its associated elements. These elements work together to provide statementrewriting capability:
- A server-side plugin named Rewriter examines statements and may rewrite them, based on its inmemory cache of rewrite rules.
- These statements are subject to rewriting: SELECT, INSERT, REPLACE, UPDATE, and DELETE.

Standalone statements and prepared statements are subject to rewriting. Statements occurring within view definitions or stored programs are not subject to rewriting.
- The Rewriter plugin uses a database named query_rewrite containing a table named rewrite_rules. The table provides persistent storage for the rules that the plugin uses to decide whether to rewrite statements. Users communicate with the plugin by modifying the set of rules stored in this table. The plugin communicates with users by setting the message column of table rows.
- The query_rewrite database contains a stored procedure named flush_rewrite_rules() that loads the contents of the rules table into the plugin.
- A loadable function named load_rewrite_rules( ) is used by the flush_rewrite_rules() stored procedure.
- The Rewriter plugin exposes system variables that enable plugin configuration and status variables that provide runtime operational information. This plugin also supports a privilege (SKIP_QUERY_REWRITE) that protects a given user's queries from being rewritten.

The following sections describe how to install and use the Rewriter plugin, and provide reference information for its associated elements.

\subsection*{7.6.4.1 Installing or Uninstalling the Rewriter Query Rewrite Plugin}

\section*{Note}

If installed, the Rewriter plugin involves some overhead even when disabled. To avoid this overhead, do not install the plugin unless you plan to use it.

To install or uninstall the Rewriter query rewrite plugin, choose the appropriate script located in the share directory of your MySQL installation:
- install_rewriter.sql: Choose this script to install the Rewriter plugin and its associated elements.
- uninstall_rewriter.sql: Choose this script to uninstall the Rewriter plugin and its associated elements.

Run the chosen script as follows:
```
$> mysql -u root -p < install_rewriter.sql
Enter password: (enter root password here)
```


The example here uses the install_rewriter.sql installation script. Substitute uninstall_rewriter.sqlif you are uninstalling the plugin.

Running an installation script should install and enable the plugin. To verify that, connect to the server and execute this statement:
```
mysql> SHOW GLOBAL VARIABLES LIKE 'rewriter_enabled';
+-------------------+-------+
| Variable_name | Value |
+-------------------+-------+
| rewriter_enabled | ON |
+-------------------+-------+
```


For usage instructions, see Section 7.6.4.2, "Using the Rewriter Query Rewrite Plugin". For reference information, see Section 7.6.4.3, "Rewriter Query Rewrite Plugin Reference".

\subsection*{7.6.4.2 Using the Rewriter Query Rewrite Plugin}

To enable or disable the plugin, enable or disable the rewriter_enabled system variable. By default, the Rewriter plugin is enabled when you install it (see Section 7.6.4.1, "Installing or Uninstalling the Rewriter Query Rewrite Plugin"). To set the initial plugin state explicitly, you can set the variable at server startup. For example, to enable the plugin in an option file, use these lines:
```
[mysqld]
rewriter_enabled=ON
```


It is also possible to enable or disable the plugin at runtime:
```
SET GLOBAL rewriter_enabled = ON;
SET GLOBAL rewriter_enabled = OFF;
```


Assuming that the Rewriter plugin is enabled, it examines and possibly modifies each rewritable statement received by the server. The plugin determines whether to rewrite statements based on its in-memory cache of rewriting rules, which are loaded from the rewrite_rules table in the query_rewrite database.

These statements are subject to rewriting: SELECT, INSERT, REPLACE, UPDATE, and DELETE.
Standalone statements and prepared statements are subject to rewriting. Statements occurring within view definitions or stored programs are not subject to rewriting.

Statements run by users with the SKIP_QUERY_REWRITE privilege are not subject to rewriting, provided that the rewriter_enabled_for_threads_without_privilege_checks system variable is set to OFF (default ON). This can be used for control statements and statements that should be replicated unchanged, such as those from the SOURCE_USER specified by CHANGE REPLICATION SOURCE TO. This is also true for statements executed by MySQL client programs including mysqlbinlog, mysqladmin, and mysqldump; for this reason, you should grant SKIP_QUERY_REWRITE to the user account or accounts used by these utilities to connect to MySQL.
- Adding Rewrite Rules
- How Statement Matching Works
- Rewriting Prepared Statements
- Rewriter Plugin Operational Information
- Rewriter Plugin Use of Character Sets

\section*{Adding Rewrite Rules}

To add rules for the Rewriter plugin, add rows to the rewrite_rules table, then invoke the flush_rewrite_rules() stored procedure to load the rules from the table into the plugin. The following example creates a simple rule to match statements that select a single literal value:
```
INSERT INTO query_rewrite.rewrite_rules (pattern, replacement)
VALUES('SELECT ?', 'SELECT ? + 1');
```


The resulting table contents look like this:
```
mysql> SELECT * FROM query_rewrite.rewrite_rules\G
************************** 1. row ******************************
                id: 1
            pattern: SELECT ?
    pattern_database: NULL
        replacement: SELECT ? + 1
            enabled: YES
            message: NULL
        pattern_digest: NULL
normalized_pattern: NULL
```


The rule specifies a pattern template indicating which SELECT statements to match, and a replacement template indicating how to rewrite matching statements. However, adding the rule to the rewrite_rules table is not sufficient to cause the Rewriter plugin to use the rule. You must invoke flush_rewrite_rules() to load the table contents into the plugin in-memory cache:
```
mysql> CALL query_rewrite.flush_rewrite_rules();
```


\section*{Tip}

If your rewrite rules seem not to be working properly, make sure that you have reloaded the rules table by calling flush_rewrite_rules( ).

When the plugin reads each rule from the rules table, it computes a normalized (statement digest) form from the pattern and a digest hash value, and uses them to update the normalized_pattern and pattern_digest columns:
```
mysql> SELECT * FROM query_rewrite.rewrite_rules\G
************************* 1. row *******************************
                id: 1
            pattern: SELECT ?
    pattern_database: NULL
            replacement: SELECT ? + 1
                enabled: YES
                message: NULL
        pattern_digest: d1b44b0c19af710b5a679907e284acd2ddc285201794bc69a2389d77baedddae
normalized_pattern: select ?
```


For information about statement digesting, normalized statements, and digest hash values, see Section 29.10, "Performance Schema Statement Digests and Sampling".

If a rule cannot be loaded due to some error, calling flush_rewrite_rules( ) produces an error:
```
mysql> CALL query_rewrite.flush_rewrite_rules();
ERROR 1644 (45000): Loading of some rule(s) failed.
```


When this occurs, the plugin writes an error message to the message column of the rule row to communicate the problem. Check the rewrite_rules table for rows with non-NULL message column values to see what problems exist.

Patterns use the same syntax as prepared statements (see Section 15.5.1, "PREPARE Statement"). Within a pattern template, ? characters act as parameter markers that match data values. The ? characters should not be enclosed within quotation marks. Parameter markers can be used only where data values should appear, and they cannot be used for SQL keywords, identifiers, functions, and so on. The plugin parses a statement to identify the literal values (as defined in Section 11.1, "Literal Values"), so you can put a parameter marker in place of any literal value.

Like the pattern, the replacement can contain? characters. For a statement that matches a pattern template, the plugin rewrites it, replacing ? parameter markers in the replacement using data values matched by the corresponding markers in the pattern. The result is a complete statement string. The plugin asks the server to parse it, and returns the result to the server as the representation of the rewritten statement.

After adding and loading the rule, check whether rewriting occurs according to whether statements match the rule pattern:
```
mysql> SELECT PI();
+----------+
| PI() |
+----------+
| 3.141593 |
+----------+
1 row in set (0.01 sec)
mysql> SELECT 10;
+--------+
| 10 + 1 |
+--------+
| 11 |
+--------+
1 row in set, 1 warning (0.00 sec)
```


No rewriting occurs for the first SELECT statement, but does for the second. The second statement illustrates that when the Rewriter plugin rewrites a statement, it produces a warning message. To view the message, use SHOW WARNINGS:
```
mysql> SHOW WARNINGS\G
************************** 1. row
    Level: Note
        Code: 1105
Message: Query 'SELECT 10' rewritten to 'SELECT 10 + 1' by a query rewrite plugin
```


A statement need not be rewritten to a statement of the same type. The following example loads a rule that rewrites DELETE statements to UPDATE statements:
```
INSERT INTO query_rewrite.rewrite_rules (pattern, replacement)
VALUES('DELETE FROM db1.t1 WHERE col = ?',
    'UPDATE db1.t1 SET col = NULL WHERE col = ?');
CALL query_rewrite.flush_rewrite_rules();
```


To enable or disable an existing rule, modify its enabled column and reload the table into the plugin. To disable rule 1:
```
UPDATE query_rewrite.rewrite_rules SET enabled = 'NO' WHERE id = 1;
CALL query_rewrite.flush_rewrite_rules();
```


This enables you to deactivate a rule without removing it from the table.
To re-enable rule 1:
```
UPDATE query_rewrite.rewrite_rules SET enabled = 'YES' WHERE id = 1;
CALL query_rewrite.flush_rewrite_rules();
```


The rewrite_rules table contains a pattern_database column that Rewriter uses for matching table names that are not qualified with a database name:
- Qualified table names in statements match qualified names in the pattern if corresponding database and table names are identical.
- Unqualified table names in statements match unqualified names in the pattern only if the default database is the same as pattern_database and the table names are identical.

Suppose that a table named appdb.users has a column named id and that applications are expected to select rows from the table using a query of one of these forms, where the second can be used when appdb is the default database:
```
SELECT * FROM users WHERE appdb.id = id_value;
SELECT * FROM users WHERE id = id_value;
```


Suppose also that the id column is renamed to user_id (perhaps the table must be modified to add another type of ID and it is necessary to indicate more specifically what type of ID the id column represents).

The change means that applications must refer to user_id rather than id in the WHERE clause, but old applications that cannot be updated no longer work properly. The Rewriter plugin can solve this problem by matching and rewriting problematic statements. To match the statement SELECT * FROM appdb.users WHERE id = value and rewrite it as SELECT * FROM appdb.users WHERE user_id = value, you can insert a row representing a replacement rule into the rewrite rules table. If you also want to match this SELECT using the unqualified table name, it is also necessary to add an explicit rule. Using ? as a value placeholder, the two INSERT statements needed look like this:
```
INSERT INTO query_rewrite.rewrite_rules
    (pattern, replacement) VALUES(
    'SELECT * FROM appdb.users WHERE id = ?',
    'SELECT * FROM appdb.users WHERE user_id = ?'
    );
INSERT INTO query_rewrite.rewrite_rules
    (pattern, replacement, pattern_database) VALUES(
    'SELECT * FROM users WHERE id = ?',
    'SELECT * FROM users WHERE user_id = ?',
    'appdb'
    );
```


After adding the two new rules, execute the following statement to cause them to take effect:
```
CALL query_rewrite.flush_rewrite_rules();
```


Rewriter uses the first rule to match statements that use the qualified table name, and the second to match statements that use the unqualified name. The second rule works only when appdb is the default database.

\section*{How Statement Matching Works}

The Rewriter plugin uses statement digests and digest hash values to match incoming statements against rewrite rules in stages. The max_digest_length system variable determines the size of the buffer used for computing statement digests. Larger values enable computation of digests that distinguish longer statements. Smaller values use less memory but increase the likelihood of longer statements colliding with the same digest value.

The plugin matches each statement to the rewrite rules as follows:
1. Compute the statement digest hash value and compare it to the rule digest hash values. This is subject to false positives, but serves as a quick rejection test.
2. If the statement digest hash value matches any pattern digest hash values, match the normalized (statement digest) form of the statement to the normalized form of the matching rule patterns.
3. If the normalized statement matches a rule, compare the literal values in the statement and the pattern. A ? character in the pattern matches any literal value in the statement. If the statement prepares a statement, ? in the pattern also matches ? in the statement. Otherwise, corresponding literals must be the same.

If multiple rules match a statement, it is nondeterministic which one the plugin uses to rewrite the statement.

If a pattern contains more markers than the replacement, the plugin discards excess data values. If a pattern contains fewer markers than the replacement, it is an error. The plugin notices this when the rules table is loaded, writes an error message to the message column of the rule row to communicate the problem, and sets the Rewriter_reload_error status variable to ON.

\section*{Rewriting Prepared Statements}

Prepared statements are rewritten at parse time (that is, when they are prepared), not when they are executed later.

Prepared statements differ from nonprepared statements in that they may contain ? characters as parameter markers. To match a ? in a prepared statement, a Rewriter pattern must contain ? in the same location. Suppose that a rewrite rule has this pattern:

SELECT ?, 3
The following table shows several prepared SELECT statements and whether the rule pattern matches them.

\begin{tabular}{|l|l|}
\hline Prepared Statement & Whether Pattern Matches Statement \\
\hline PREPARE s AS 'SELECT 3, 3' & Yes \\
\hline PREPARE s AS 'SELECT ?, 3' & Yes \\
\hline PREPARE s AS 'SELECT 3, ?' & No \\
\hline PREPARE s AS 'SELECT ?, ?' & No \\
\hline
\end{tabular}

\section*{Rewriter Plugin Operational Information}

The Rewriter plugin makes information available about its operation by means of several status variables:
```
mysql> SHOW GLOBAL STATUS LIKE 'Rewriter%';
+------------------------------------+-------+

\begin{tabular}{|l|l|}
\hline Variable_name & Value \\
\hline Rewriter_number_loaded_rules & 1 \\
\hline Rewriter_number_reloads & 5 \\
\hline Rewriter_number_rewritten_queries & 1 \\
\hline Rewriter_reload_error & ON \\
\hline
\end{tabular}
```


For descriptions of these variables, see Rewriter Query Rewrite Plugin Status Variables.
When you load the rules table by calling the flush_rewrite_rules() stored procedure, if an error occurs for some rule, the CALL statement produces an error, and the plugin sets the Rewriter_reload_error status variable to ON:
```
mysql> CALL query_rewrite.flush_rewrite_rules();
ERROR 1644 (45000): Loading of some rule(s) failed.
mysql> SHOW GLOBAL STATUS LIKE 'Rewriter_reload_error';
+-------------------------+-------+
| Variable_name | Value |
+------------------------+-------+
| Rewriter_reload_error | ON |
+------------------------+-------+
```


In this case, check the rewrite_rules table for rows with non-NULL message column values to see what problems exist.

\section*{Rewriter Plugin Use of Character Sets}

When the rewrite_rules table is loaded into the Rewriter plugin, the plugin interprets statements using the current global value of the character_set_client system variable. If the global character_set_client value is changed subsequently, the rules table must be reloaded.

A client must have a session character_set_client value identical to what the global value was when the rules table was loaded or rule matching does not work for that client.

\subsection*{7.6.4.3 Rewriter Query Rewrite Plugin Reference}

The following discussion serves as a reference to these elements associated with the Rewriter query rewrite plugin:
- The Rewriter rules table in the query_rewrite database
- Rewriter procedures and functions
- Rewriter system and status variables

\section*{Rewriter Query Rewrite Plugin Rules Table}

The rewrite_rules table in the query_rewrite database provides persistent storage for the rules that the Rewriter plugin uses to decide whether to rewrite statements.

Users communicate with the plugin by modifying the set of rules stored in this table. The plugin communicates information to users by setting the table's message column.

\section*{Note}

The rules table is loaded into the plugin by the flush_rewrite_rules stored procedure. Unless that procedure has been called following the most recent table modification, the table contents do not necessarily correspond to the set of rules the plugin is using.

The rewrite_rules table has these columns:
- id

The rule ID. This column is the table primary key. You can use the ID to uniquely identify any rule.
- pattern

The template that indicates the pattern for statements that the rule matches. Use ? to represent parameter markers that match data values.
- pattern_database

The database used to match unqualified table names in statements. Qualified table names in statements match qualified names in the pattern if corresponding database and table names are identical. Unqualified table names in statements match unqualified names in the pattern only if the default database is the same as pattern_database and the table names are identical.
- replacement

The template that indicates how to rewrite statements matching the pattern column value. Use ? to represent parameter markers that match data values. In rewritten statements, the plugin replaces ? parameter markers in replacement using data values matched by the corresponding markers in pattern.
- enabled

Whether the rule is enabled. Load operations (performed by invoking the flush_rewrite_rules() stored procedure) load the rule from the table into the Rewriter inmemory cache only if this column is YES.

This column makes it possible to deactivate a rule without removing it: Set the column to a value other than YES and reload the table into the plugin.
- message

The plugin uses this column for communicating with users. If no error occurs when the rules table is loaded into memory, the plugin sets the message column to NULL. A non-NULL value indicates an error and the column contents are the error message. Errors can occur under these circumstances:
- Either the pattern or the replacement is an incorrect SQL statement that produces syntax errors.
- The replacement contains more ? parameter markers than the pattern.

If a load error occurs, the plugin also sets the Rewriter_reload_error status variable to ON.
- pattern_digest

This column is used for debugging and diagnostics. If the column exists when the rules table is loaded into memory, the plugin updates it with the pattern digest. This column may be useful if you are trying to determine why some statement fails to be rewritten.
- normalized_pattern

This column is used for debugging and diagnostics. If the column exists when the rules table is loaded into memory, the plugin updates it with the normalized form of the pattern. This column may be useful if you are trying to determine why some statement fails to be rewritten.

\section*{Rewriter Query Rewrite Plugin Procedures and Functions}

Rewriter plugin operation uses a stored procedure that loads the rules table into its in-memory cache, and a helper loadable function. Under normal operation, users invoke only the stored procedure. The function is intended to be invoked by the stored procedure, not directly by users.
- flush_rewrite_rules()

This stored procedure uses the load_rewrite_rules() function to load the contents of the rewrite_rules table into the Rewriter in-memory cache.

Calling flush_rewrite_rules() implies COMMIT.
Invoke this procedure after you modify the rules table to cause the plugin to update its cache from the new table contents. If any errors occur, the plugin sets the message column for the appropriate rule rows in the table and sets the Rewriter_reload_error status variable to ON.
- load_rewrite_rules()

This function is a helper routine used by the flush_rewrite_rules() stored procedure.

\section*{Rewriter Query Rewrite Plugin System Variables}

The Rewriter query rewrite plugin supports the following system variables. These variables are available only if the plugin is installed (see Section 7.6.4.1, "Installing or Uninstalling the Rewriter Query Rewrite Plugin").
- rewriter_enabled

\begin{tabular}{|l|l|}
\hline System Variable & rewriter_enabled \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & ON \\
\hline Valid Values & OFF \\
\hline
\end{tabular}

Whether the Rewriter query rewrite plugin is enabled.
- rewriter_enabled_for_threads_without_privilege_checks

\begin{tabular}{|l|l|l|}
\hline System Variable & rewriter_enabled_for_threads_without_ & privil \\
\hline Scope & Global & \\
\hline Dynamic & Yes & \\
\hline SET_VAR Hint Applies & No & \\
\hline Type & Boolean & \\
\hline Default Value & ON & \\
\hline Valid Values & OFF & \\
\hline
\end{tabular}

Whether to apply rewrites for replication threads which execute with privilege checks disabled. If set to OFF, such rewrites are skipped. Requires the SYSTEM_VARIABLES_ADMIN privilege or SUPER privilege to set.

This variable has no effect if rewriter_enabled is 0FF.
- rewriter_verbose

\begin{tabular}{|l|l|}
\hline System Variable & rewriter_verbose \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline
\end{tabular}

For internal use.

\section*{Rewriter Query Rewrite Plugin Status Variables}

The Rewriter query rewrite plugin supports the following status variables. These variables are available only if the plugin is installed (see Section 7.6.4.1, "Installing or Uninstalling the Rewriter Query Rewrite Plugin").
- Rewriter_number_loaded_rules

The number of rewrite plugin rewrite rules successfully loaded from the rewrite_rules table into memory for use by the Rewriter plugin.
- Rewriter_number_reloads

The number of times the rewrite_rules table has been loaded into the in-memory cache used by the Rewriter plugin.
- Rewriter_number_rewritten_queries

The number of queries rewritten by the Rewriter query rewrite plugin since it was loaded.
- Rewriter_reload_error

Whether an error occurred the most recent time that the rewrite_rules table was loaded into the in-memory cache used by the Rewriter plugin. If the value is OFF, no error occurred. If the value is ON, an error occurred; check the message column of the rewriter_rules table for error messages.

\subsection*{7.6.5 The ddl_rewriter Plugin}

MySQL 8.4 includes a ddl_rewriter plugin that modifies CREATE TABLE statements received by the server before it parses and executes them. The plugin removes ENCRYPTION, DATA DIRECTORY, and INDEX DIRECTORY clauses, which may be helpful when restoring tables from SQL dump files created from databases that are encrypted or that have their tables stored outside the data directory. For example, the plugin may enable restoring such dump files into an unencrypted instance or in an environment where the paths outside the data directory are not accessible.

Before using the ddl_rewriter plugin, install it according to the instructions provided in Section 7.6.5.1, "Installing or Uninstalling ddl_rewriter".
ddl_rewriter examines SQL statements received by the server prior to parsing, rewriting them according to these conditions:
- ddl_rewriter considers only CREATE TABLE statements, and only if they are standalone statements that occur at the beginning of an input line or at the beginning of prepared statement text. ddl_rewriter does not consider CREATE TABLE statements within stored program definitions. Statements can extend over multiple lines.
- Within statements considered for rewrite, instances of the following clauses are rewritten and each instance replaced by a single space:
- ENCRYPTION
- DATA DIRECTORY (at the table and partition levels)
- INDEX DIRECTORY (at the table and partition levels)
- Rewriting does not depend on lettercase.

If ddl_rewriter rewrites a statement, it generates a warning:
```
mysql> CREATE TABLE t (i INT) DATA DIRECTORY '/var/mysql/data';
Query OK, 0 rows affected, 1 warning (0.03 sec)
mysql> SHOW WARNINGS\G
************************** 1. row *****************************************
    Level: Note
        Code: 1105
Message: Query 'CREATE TABLE t (i INT) DATA DIRECTORY '/var/mysql/data''
            rewritten to 'CREATE TABLE t (i INT) ' by a query rewrite plugin
1 row in set (0.00 sec)
```


If the general query log or binary log is enabled, the server writes to it statements as they appear after any rewriting by ddl_rewriter.

When installed, ddl_rewriter exposes the Performance Schema memory/rewriter/ ddl_rewriter instrument for tracking plugin memory use. See Section 29.12.20.10, "Memory Summary Tables"

\subsection*{7.6.5.1 Installing or Uninstalling ddl_rewriter}

This section describes how to install or uninstall the ddl_rewriter plugin. For general information about installing plugins, see Section 7.6.1, "Installing and Uninstalling Plugins".

\section*{Note}

If installed, the ddl_rewriter plugin involves some minimal overhead even when disabled. To avoid this overhead, install ddl_rewriter only for the period during which you intend to use it.

The primary use case is modification of statements restored from dump files, so the typical usage pattern is: 1) Install the plugin; 2) restore the dump file or files; 3 ) uninstall the plugin.

To be usable by the server, the plugin library file must be located in the MySQL plugin directory (the directory named by the plugin_dir system variable). If necessary, configure the plugin directory location by setting the value of plugin_dir at server startup.

The plugin library file base name is ddl_rewriter. The file name suffix differs per platform (for example, . so for Unix and Unix-like systems, . dll for Windows).

To install the ddl_rewriter plugin, use the INSTALL PLUGIN statement, adjusting the . so suffix for your platform as necessary:

INSTALL PLUGIN ddl_rewriter SONAME 'ddl_rewriter.so';
To verify plugin installation, examine the Information Schema PLUGINS table or use the SHOW PLUGINS statement (see Section 7.6.2, "Obtaining Server Plugin Information"). For example:
```
mysql> SELECT PLUGIN_NAME, PLUGIN_STATUS, PLUGIN_TYPE
    FROM INFORMATION_SCHEMA.PLUGINS
    WHERE PLUGIN_NAME LIKE 'ddl%';
+---------------+----------------+-------------+
| PLUGIN_NAME | PLUGIN_STATUS | PLUGIN_TYPE |
+---------------+---------------+-------------+
| ddl_rewriter | ACTIVE | AUDIT |
+---------------+---------------+-------------+
```


As the preceding result shows, ddl_rewriter is implemented as an audit plugin.
If the plugin fails to initialize, check the server error log for diagnostic messages.
Once installed as just described, ddl_rewriter remains installed until uninstalled. To remove it, use UNINSTALL PLUGIN:

UNINSTALL PLUGIN ddl_rewriter;
If ddl_rewriter is installed, you can use the --ddl-rewriter option for subsequent server startups to control ddl_rewriter plugin activation. For example, to prevent the plugin from being enabled at runtime, use this option:
```
[mysqld]
ddl-rewriter=0FF
```


\subsection*{7.6.5.2 ddl_rewriter Plugin Options}

This section describes the command options that control operation of the ddl_rewriter plugin. If values specified at startup time are incorrect, the ddl_rewriter plugin may fail to initialize properly and the server does not load it.

To control activation of the ddl_rewriter plugin, use this option:
- --ddl-rewriter[=value]

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ddl-rewriter[=value] \\
\hline Type & Enumeration \\
\hline Default Value & ON \\
\hline Valid Values & \begin{tabular}{l}
ON \\
OFF \\
FORCE \\
FORCE_PLUS_PERMANENT
\end{tabular} \\
\hline
\end{tabular}

This option controls how the server loads the ddl_rewriter plugin at startup. It is available only if the plugin has been previously registered with INSTALL PLUGIN or is loaded with --plugin-load or --plugin-load-add. See Section 7.6.5.1, "Installing or Uninstalling ddl_rewriter".

The option value should be one of those available for plugin-loading options, as described in Section 7.6.1, "Installing and Uninstalling Plugins". For example, --ddl-rewriter=OFF disables the plugin at server startup.

\subsection*{7.6.6 Version Tokens}

MySQL includes Version Tokens, a feature that enables creation of and synchronization around server tokens that applications can use to prevent accessing incorrect or out-of-date data.

The Version Tokens interface has these characteristics:
- Version tokens are pairs consisting of a name that serves as a key or identifier, plus a value.
- Version tokens can be locked. An application can use token locks to indicate to other cooperating applications that tokens are in use and should not be modified.
- Version token lists are established per server (for example, to specify the server assignment or operational state). In addition, an application that communicates with a server can register its own list of tokens that indicate the state it requires the server to be in. An SQL statement sent by the application to a server not in the required state produces an error. This is a signal to the application that it should seek a different server in the required state to receive the SQL statement.

The following sections describe the elements of Version Tokens, discuss how to install and use it, and provide reference information for its elements.

\subsection*{7.6.6.1 Version Tokens Elements}

Version Tokens is based on a plugin library that implements these elements:
- A server-side plugin named version_tokens holds the list of version tokens associated with the server and subscribes to notifications for statement execution events. The version_tokens plugin uses the audit plugin API to monitor incoming statements from clients and matches each client's session-specific version token list against the server version token list. If there is a match, the plugin lets the statement through and the server continues to process it. Otherwise, the plugin returns an error to the client and the statement fails.
- A set of loadable functions provides an SQL-level API for manipulating and inspecting the list of server version tokens maintained by the plugin. The VERSION_TOKEN_ADMIN privilege (or the deprecated SUPER privilege) is required to call any of the Version Token functions.
- When the version_tokens plugin loads, it defines the VERSION_TOKEN_ADMIN dynamic privilege. This privilege can be granted to users of the functions.
- A system variable enables clients to specify the list of version tokens that register the required server state. If the server has a different state when a client sends a statement, the client receives an error.

\subsection*{7.6.6.2 Installing or Uninstalling Version Tokens}

\section*{Note}

If installed, Version Tokens involves some overhead. To avoid this overhead, do not install it unless you plan to use it.

This section describes how to install or uninstall Version Tokens, which is implemented in a plugin library file containing a plugin and loadable functions. For general information about installing or uninstalling plugins and loadable functions, see Section 7.6.1, "Installing and Uninstalling Plugins", and Section 7.7.1, "Installing and Uninstalling Loadable Functions".

To be usable by the server, the plugin library file must be located in the MySQL plugin directory (the directory named by the plugin_dir system variable). If necessary, configure the plugin directory location by setting the value of plugin_dir at server startup.

The plugin library file base name is version_tokens. The file name suffix differs per platform (for example, . so for Unix and Unix-like systems, . dll for Windows).

To install the Version Tokens plugin and functions, use the INSTALL PLUGIN and CREATE FUNCTION statements, adjusting the . so suffix for your platform as necessary:
```
INSTALL PLUGIN version_tokens SONAME 'version_token.so';
CREATE FUNCTION version_tokens_set RETURNS STRING
    SONAME 'version_token.so';
CREATE FUNCTION version_tokens_show RETURNS STRING
    SONAME 'version_token.so';
CREATE FUNCTION version_tokens_edit RETURNS STRING
    SONAME 'version_token.so';
CREATE FUNCTION version_tokens_delete RETURNS STRING
    SONAME 'version_token.so';
CREATE FUNCTION version_tokens_lock_shared RETURNS INT
    SONAME 'version_token.so';
CREATE FUNCTION version_tokens_lock_exclusive RETURNS INT
    SONAME 'version_token.so';
CREATE FUNCTION version_tokens_unlock RETURNS INT
    SONAME 'version_token.so';
```


You must install the functions to manage the server's version token list, but you must also install the plugin because the functions do not work correctly without it.

If the plugin and functions are used on a replication source server, install them on all replica servers as well to avoid replication problems.

Once installed as just described, the plugin and functions remain installed until uninstalled. To remove them, use the UNINSTALL PLUGIN and DROP FUNCTION statements:
```
UNINSTALL PLUGIN version_tokens;
DROP FUNCTION version_tokens_set;
DROP FUNCTION version_tokens_show;
DROP FUNCTION version_tokens_edit;
DROP FUNCTION version_tokens_delete;
DROP FUNCTION version_tokens_lock_shared;
DROP FUNCTION version_tokens_lock_exclusive;
DROP FUNCTION version_tokens_unlock;
```


\subsection*{7.6.6.3 Using Version Tokens}

Before using Version Tokens, install it according to the instructions provided at Section 7.6.6.2, "Installing or Uninstalling Version Tokens".

A scenario in which Version Tokens can be useful is a system that accesses a collection of MySQL servers but needs to manage them for load balancing purposes by monitoring them and adjusting server assignments according to load changes. Such a system comprises these elements:
- The collection of MySQL servers to be managed.
- An administrative or management application that communicates with the servers and organizes them into high-availability groups. Groups serve different purposes, and servers within each group may have different assignments. Assignment of a server within a certain group can change at any time.
- Client applications that access the servers to retrieve and update data, choosing servers according to the purposes assigned them. For example, a client should not send an update to a read-only server.

Version Tokens permit server access to be managed according to assignment without requiring clients to repeatedly query the servers about their assignments:
- The management application performs server assignments and establishes version tokens on each server to reflect its assignment. The application caches this information to provide a central access point to it.

If at some point the management application needs to change a server assignment (for example, to change it from permitting writes to read only), it changes the server's version token list and updates its cache.
- To improve performance, client applications obtain cache information from the management application, enabling them to avoid having to retrieve information about server assignments for each statement. Based on the type of statements it issues (for example, reads versus writes), a client selects an appropriate server and connects to it.
- In addition, the client sends to the server its own client-specific version tokens to register the assignment it requires of the server. For each statement sent by the client to the server, the server compares its own token list with the client token list. If the server token list contains all tokens present in the client token list with the same values, there is a match and the server executes the statement.

On the other hand, perhaps the management application has changed the server assignment and its version token list. In this case, the new server assignment may now be incompatible with the client requirements. A token mismatch between the server and client token lists occurs and the server returns an error in reply to the statement. This is an indication to the client to refresh its version token information from the management application cache, and to select a new server to communicate with.

The client-side logic for detecting version token errors and selecting a new server can be implemented different ways:
- The client can handle all version token registration, mismatch detection, and connection switching itself.
- The logic for those actions can be implemented in a connector that manages connections between clients and MySQL servers. Such a connector might handle mismatch error detection and statement resending itself, or it might pass the error to the application and leave it to the application to resend the statement.

The following example illustrates the preceding discussion in more concrete form.
When Version Tokens initializes on a given server, the server's version token list is empty. Token list maintenance is performed by calling functions. The VERSION_TOKEN_ADMIN privilege (or the deprecated SUPER privilege) is required to call any of the Version Token functions, so token list modification is expected to be done by a management or administrative application that has that privilege.

Suppose that a management application communicates with a set of servers that are queried by clients to access employee and product databases (named emp and prod, respectively). All servers are permitted to process data retrieval statements, but only some of them are permitted to make database updates. To handle this on a database-specific basis, the management application establishes a list of version tokens on each server. In the token list for a given server, token names represent database names and token values are read or write depending on whether the database must be used in read-only fashion or whether it can take reads and writes.

Client applications register a list of version tokens they require the server to match by setting a system variable. Variable setting occurs on a client-specific basis, so different clients can register different requirements. By default, the client token list is empty, which matches any server token list. When a client sets its token list to a nonempty value, matching may succeed or fail, depending on the server version token list.

To define the version token list for a server, the management application calls the version_tokens_set ( ) function. (There are also functions for modifying and displaying the token list, described later.) For example, the application might send these statements to a group of three servers:

Server 1:
```
mysql> SELECT version_tokens_set('emp=read;prod=read');
+--------------------------------------------+
| version_tokens_set('emp=read;prod=read') |
+--------------------------------------------+
| 2 version tokens set. |
+-------------------------------------------+
```


Server 2:
```
mysql> SELECT version_tokens_set('emp=write;prod=read');
+--------------------------------------------
| version_tokens_set('emp=write;prod=read') |
+---------------------------------------------
| 2 version tokens set. |
```


Server 3:
```
mysql> SELECT version_tokens_set('emp=read;prod=write');
+--------------------------------------------
| version_tokens_set('emp=read;prod=write') |
+---------------------------------------------
| 2 version tokens set. |
+--------------------------------------------+
```


The token list in each case is specified as a semicolon-separated list of name=value pairs. The resulting token list values result in these server assignments:
- Any server accepts reads for either database.
- Only server 2 accepts updates for the emp database.
- Only server 3 accepts updates for the prod database.

In addition to assigning each server a version token list, the management application also maintains a cache that reflects the server assignments.

Before communicating with the servers, a client application contacts the management application and retrieves information about server assignments. Then the client selects a server based on those assignments. Suppose that a client wants to perform both reads and writes on the emp database. Based on the preceding assignments, only server 2 qualifies. The client connects to server 2 and registers its server requirements there by setting its version_tokens_session system variable:
```
mysql> SET @@SESSION.version_tokens_session = 'emp=write';
```


For subsequent statements sent by the client to server 2 , the server compares its own version token list to the client list to check whether they match. If so, statements execute normally:
```
mysql> UPDATE emp.employee SET salary = salary * 1.1 WHERE id = 4981;
Query OK, 1 row affected (0.07 sec)
Rows matched: 1 Changed: 1 Warnings: 0
mysql> SELECT last_name, first_name FROM emp.employee WHERE id = 4981;
+-----------+------------+
| last_name | first_name |
+------------+------------+
| Smith | Abe |
+-----------+------------+
1 row in set (0.01 sec)
```


Discrepancies between the server and client version token lists can occur two ways:
- A token name in the version_tokens_session value is not present in the server token list. In this case, an ER_VTOKEN_PLUGIN_TOKEN_NOT_FOUND error occurs.
- A token value in the version_tokens_session value differs from the value of the corresponding token in the server token list. In this case, an ER_VTOKEN_PLUGIN_TOKEN_MISMATCH error occurs.

As long as the assignment of server 2 does not change, the client continues to use it for reads and writes. But suppose that the management application wants to change server assignments so that writes for the emp database must be sent to server 1 instead of server 2. To do this, it uses version_tokens_edit ( ) to modify the emp token value on the two servers (and updates its cache of server assignments):

Server 1:
```
mysql> SELECT version_tokens_edit('emp=write');
+-------------------------------------+
| version_tokens_edit('emp=write') |
+------------------------------------+
| 1 version tokens updated. |
+-----------------------------------+
```


Server 2:
```
mysql> SELECT version_tokens_edit('emp=read');
+-----------------------------------+
| version_tokens_edit('emp=read') |
+----------------------------------+
| 1 version tokens updated. |
+----------------------------------+
```

version_tokens_edit() modifies the named tokens in the server token list and leaves other tokens unchanged.

The next time the client sends a statement to server 2, its own token list no longer matches the server token list and an error occurs:
```
mysql> UPDATE emp.employee SET salary = salary * 1.1 WHERE id = 4982;
ERROR 3136 (42000): Version token mismatch for emp. Correct value read
```


In this case, the client should contact the management application to obtain updated information about server assignments, select a new server, and send the failed statement to the new server.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1092.jpg?height=122&width=95&top_left_y=1544&top_left_x=310)

\section*{Note}

Each client must cooperate with Version Tokens by sending only statements in accordance with the token list that it registers with a given server. For example, if a client registers a token list of 'emp=read ', there is nothing in Version Tokens to prevent the client from sending updates for the emp database. The client itself must refrain from doing so.

For each statement received from a client, the server implicitly uses locking, as follows:
- Take a shared lock for each token named in the client token list (that is, in the version_tokens_session value)
- Perform the comparison between the server and client token lists
- Execute the statement or produce an error depending on the comparison result
- Release the locks

The server uses shared locks so that comparisons for multiple sessions can occur without blocking, while preventing changes to the tokens for any session that attempts to acquire an exclusive lock before it manipulates tokens of the same names in the server token list.

The preceding example uses only a few of the functions included in the Version Tokens plugin library, but there are others. One set of functions permits the server's list of version tokens to be manipulated and inspected. Another set of functions permits version tokens to be locked and unlocked.

These functions permit the server's list of version tokens to be created, changed, removed, and inspected:
- version_tokens_set ( ) completely replaces the current list and assigns a new list. The argument is a semicolon-separated list of name=value pairs.
- version_tokens_edit() enables partial modifications to the current list. It can add new tokens or change the values of existing tokens. The argument is a semicolon-separated list of name=value pairs.
- version_tokens_delete() deletes tokens from the current list. The argument is a semicolonseparated list of token names.
- version_tokens_show( ) displays the current token list. It takes no argument.

Each of those functions, if successful, returns a binary string indicating what action occurred. The following example establishes the server token list, modifies it by adding a new token, deletes some tokens, and displays the resulting token list:
```
mysql> SELECT version_tokens_set('tok1=a;tok2=b');
+---------------------------------------+
| version_tokens_set('tok1=a;tok2=b') |
+---------------------------------------+
| 2 version tokens set. |
+--------------------------------------+
mysql> SELECT version_tokens_edit('tok3=c');
+--------------------------------+
| version_tokens_edit('tok3=c') |
+---------------------------------+
| 1 version tokens updated. |
+--------------------------------+
mysql> SELECT version_tokens_delete('tok2;tok1');
+--------------------------------------+
| version_tokens_delete('tok2;tok1') |
+--------------------------------------+
| 2 version tokens deleted. |
+-------------------------------------+
mysql> SELECT version_tokens_show();
+------------------------+
| version_tokens_show() |
+-------------------------+
| tok3=c; |
+-------------------------+
```


Warnings occur if a token list is malformed:
```
mysql> SELECT version_tokens_set('tok1=a; =c');
+-----------------------------------+
| version_tokens_set('tok1=a; =c') |
+------------------------------------+
| 1 version tokens set. |
+-----------------------------------+
1 row in set, 1 warning (0.00 sec)
mysql> SHOW WARNINGS\G
*************************** 1. row ****************************************
    Level: Warning
        Code: 42000
Message: Invalid version token pair encountered. The list provided
            is only partially updated.
1 row in set (0.00 sec)
```


As mentioned previously, version tokens are defined using a semicolon-separated list of name=value pairs. Consider this invocation of version_tokens_set ( ):
```
mysql> SELECT version_tokens_set('tok1=b;;; tok2= a = b ; tok1 = 1\'2 3"4')
+-------------------------------------------------------------------
| version_tokens_set('tok1=b;;; tok2= a = b ; tok1 = 1\'2 3"4') |
+------------------------------------------------------------------
| 3 version tokens set.
```


Version Tokens interprets the argument as follows:
- Whitespace around names and values is ignored. Whitespace within names and values is permitted. (For version_tokens_delete( ), which takes a list of names without values, whitespace around names is ignored.)
- There is no quoting mechanism.
- Order of tokens is not significant except that if a token list contains multiple instances of a given token name, the last value takes precedence over earlier values.

Given those rules, the preceding version_tokens_set ( ) call results in a token list with two tokens: tok1 has the value $1^{\prime} 23^{\prime \prime} 4$, and tok2 has the value $\mathrm{a}=\mathrm{b}$. To verify this, call version_tokens_show( ):
```
mysql> SELECT version_tokens_show();
+----------------------------+
| version_tokens_show() |
+----------------------------+
| tok2=a = b;tok1=1'2 3"4; |
+---------------------------+
```


If the token list contains two tokens, why did version_tokens_set () return the value 3 version tokens set? That occurred because the original token list contained two definitions for tok1, and the second definition replaced the first.

The Version Tokens token-manipulation functions place these constraints on token names and values:
- Token names cannot contain $=$ or ; characters and have a maximum length of 64 characters.
- Token values cannot contain ; characters. Length of values is constrained by the value of the max_allowed_packet system variable.
- Version Tokens treats token names and values as binary strings, so comparisons are case-sensitive.

Version Tokens also includes a set of functions enabling tokens to be locked and unlocked:
- version_tokens_lock_exclusive( ) acquires exclusive version token locks. It takes a list of one or more lock names and a timeout value.
- version_tokens_lock_shared( ) acquires shared version token locks. It takes a list of one or more lock names and a timeout value.
- version_tokens_unlock( ) releases version token locks (exclusive and shared). It takes no argument.

Each locking function returns nonzero for success. Otherwise, an error occurs:
```
mysql> SELECT version_tokens_lock_shared('lock1', 'lock2', 0);
+---------------------------------------------------+
| version_tokens_lock_shared('lock1', 'lock2', 0) |
+----------------------------------------------------
| 1 |
+-----------------------------------------------------
mysql> SELECT version_tokens_lock_shared(NULL, 0);
ERROR 3131 (42000): Incorrect locking service lock name '(null)'.
```


Locking using Version Tokens locking functions is advisory; applications must agree to cooperate. It is possible to lock nonexisting token names. This does not create the tokens.

\section*{Note}

Version Tokens locking functions are based on the locking service described at Section 7.6.9.1, "The Locking Service", and thus have the same semantics for shared and exclusive locks. (Version Tokens uses the locking service routines built into the server, not the locking service function interface, so those functions
> need not be installed to use Version Tokens.) Locks acquired by Version Tokens use a locking service namespace of version_token_locks. Locking service locks can be monitored using the Performance Schema, so this is also true for Version Tokens locks. For details, see Locking Service Monitoring.

For the Version Tokens locking functions, token name arguments are used exactly as specified. Surrounding whitespace is not ignored and = and ; characters are permitted. This is because Version Tokens simply passes the token names to be locked as is to the locking service.

\subsection*{7.6.6.4 Version Tokens Reference}

The following discussion serves as a reference to these Version Tokens elements:
- Version Tokens Functions
- Version Tokens System Variables

\section*{Version Tokens Functions}

The Version Tokens plugin library includes several functions. One set of functions permits the server's list of version tokens to be manipulated and inspected. Another set of functions permits version tokens to be locked and unlocked. The VERSION_TOKEN_ADMIN privilege (or the deprecated SUPER privilege) is required to invoke any Version Tokens function.

The following functions permit the server's list of version tokens to be created, changed, removed, and inspected. Interpretation of name_list and token_list arguments (including whitespace handling) occurs as described in Section 7.6.6.3, "Using Version Tokens", which provides details about the syntax for specifying tokens, as well as additional examples.
- version_tokens_delete(name_list)

Deletes tokens from the server's list of version tokens using the name_list argument and returns a binary string that indicates the outcome of the operation. name_list is a semicolon-separated list of version token names to delete.
```
mysql> SELECT version_tokens_delete('tok1;tok3');
+--------------------------------------+
| version_tokens_delete('tok1;tok3') |
+--------------------------------------+
| 2 version tokens deleted. |
+--------------------------------------+
```


An argument of NULL is treated as an empty string, which has no effect on the token list.
version_tokens_delete( ) deletes the tokens named in its argument, if they exist. (It is not an error to delete nonexisting tokens.) To clear the token list entirely without knowing which tokens are in the list, pass NULL or a string containing no tokens to version_tokens_set ( ):
```
mysql> SELECT version_tokens_set(NULL);
+--------------------------------+
| version_tokens_set(NULL) |
+-------------------------------+
| Version tokens list cleared. |
+-------------------------------+
mysql> SELECT version_tokens_set('');
+--------------------------------+
| version_tokens_set('') |
+-------------------------------+
| Version tokens list cleared. |
+-------------------------------+
```

- version_tokens_edit(token_list)

Modifies the server's list of version tokens using the token_list argument and returns a binary string that indicates the outcome of the operation. token_list is a semicolon-separated list of
name=value pairs specifying the name of each token to be defined and its value. If a token exists, its value is updated with the given value. If a token does not exist, it is created with the given value. If the argument is NULL or a string containing no tokens, the token list remains unchanged.
```
mysql> SELECT version_tokens_set('tok1=value1;tok2=value2');
+-------------------------------------------------
| version_tokens_set('tok1=value1;tok2=value2') |
+-------------------------------------------------
| 2 version tokens set. |
+-------------------------------------------------+
mysql> SELECT version_tokens_edit('tok2=new_value2;tok3=new_value3');
+------------------------------------------------------------
| version_tokens_edit('tok2=new_value2;tok3=new_value3') |
+-----------------------------------------------------------
| 2 version tokens updated. |
```

- version_tokens_set(token_list)

Replaces the server's list of version tokens with the tokens defined in the token_list argument and returns a binary string that indicates the outcome of the operation. token_list is a semicolonseparated list of name=value pairs specifying the name of each token to be defined and its value. If the argument is NULL or a string containing no tokens, the token list is cleared.
```
mysql> SELECT version_tokens_set('tok1=value1;tok2=value2');
+------------------------------------------------
| version_tokens_set('tok1=value1;tok2=value2') |
+--------------------------------------------------
| 2 version tokens set.
+-----------------------l
```

- version_tokens_show( )

Returns the server's list of version tokens as a binary string containing a semicolon-separated list of name=value pairs.
```
mysql> SELECT version_tokens_show();
+----------------------------+
| version_tokens_show() |
+----------------------------+
| tok2=value2;tok1=value1; |
+----------------------------+
```


The following functions permit version tokens to be locked and unlocked:
- version_tokens_lock_exclusive(token_name[, token_name] ..., timeout)

Acquires exclusive locks on one or more version tokens, specified by name as strings, timing out with an error if the locks are not acquired within the given timeout value.
```
mysql> SELECT version_tokens_lock_exclusive('lock1', 'lock2', 10);
+------------------------------------------------------+
| version_tokens_lock_exclusive('lock1', 'lock2', 10) |
+-------------------------------------------------------
| 1 |
+-------------------------------------------------------
```

- version_tokens_lock_shared(token_name[, token_name] ..., timeout)

Acquires shared locks on one or more version tokens, specified by name as strings, timing out with an error if the locks are not acquired within the given timeout value.
```
mysql> SELECT version_tokens_lock_shared('lock1', 'lock2', 10);
+-----------------------------------------------------
| version_tokens_lock_shared('lock1', 'lock2', 10) |
+-----------------------------------------------------
| 1 |
+----------------------------------------------------+
```

- version_tokens_unlock()

Releases all locks that were acquired within the current session using version_tokens_lock_exclusive() and version_tokens_lock_shared().
```
mysql> SELECT version_tokens_unlock();
+---------------------------+
| version_tokens_unlock() |
+--------------------------+
| 1 |
+--------------------------+
```


The locking functions share these characteristics:
- The return value is nonzero for success. Otherwise, an error occurs.
- Token names are strings.
- In contrast to argument handling for the functions that manipulate the server token list, whitespace surrounding token name arguments is not ignored and = and ; characters are permitted.
- It is possible to lock nonexisting token names. This does not create the tokens.
- Timeout values are nonnegative integers representing the time in seconds to wait to acquire locks before timing out with an error. If the timeout is 0 , there is no waiting and the function produces an error if locks cannot be acquired immediately.
- Version Tokens locking functions are based on the locking service described at Section 7.6.9.1, "The Locking Service".

\section*{Version Tokens System Variables}

Version Tokens supports the following system variables. These variables are unavailable unless the Version Tokens plugin is installed (see Section 7.6.6.2, "Installing or Uninstalling Version Tokens").

System variables:
- version_tokens_session

\begin{tabular}{|l|l|}
\hline Command-Line Format & --version-tokens-session=value \\
\hline System Variable & version_tokens_session \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Default Value & NULL \\
\hline
\end{tabular}

The session value of this variable specifies the client version token list and indicates the tokens that the client session requires the server version token list to have.

If the version_tokens_session variable is NULL (the default) or has an empty value, any server version token list matches. (In effect, an empty value disables matching requirements.)

If the version_tokens_session variable has a nonempty value, any mismatch between its value and the server version token list results in an error for any statement the session sends to the server. A mismatch occurs under these conditions:
- A token name in the version_tokens_session value is not present in the server token list. In this case, an ER_VTOKEN_PLUGIN_TOKEN_NOT_FOUND error occurs.
- A token value in the version_tokens_session value differs from the value of the corresponding token in the server token list. In this case, an ER_VTOKEN_PLUGIN_TOKEN_MISMATCH error occurs.

It is not a mismatch for the server version token list to include a token not named in the version_tokens_session value.

Suppose that a management application has set the server token list as follows:
```
mysql> SELECT version_tokens_set('tok1=a;tok2=b;tok3=c');
+----------------------------------------------+
| version_tokens_set('tok1=a;tok2=b;tok3=c') |
+----------------------------------------------+
| 3 version tokens set. |
+---------------------------------------------
```


A client registers the tokens it requires the server to match by setting its version_tokens_session value. Then, for each subsequent statement sent by the client, the server checks its token list against the client version_tokens_session value and produces an error if there is a mismatch:
```
mysql> SET @@SESSION.version_tokens_session = 'tok1=a;tok2=b';
mysql> SELECT 1;
+---+
| 1 |
+---+
| 1 |
+---+
mysql> SET @@SESSION.version_tokens_session = 'tok1=b';
mysql> SELECT 1;
ERROR 3136 (42000): Version token mismatch for tok1. Correct value a
```


The first SELECT succeeds because the client tokens tok1 and tok2 are present in the server token list and each token has the same value in the server list. The second SELECT fails because, although tok1 is present in the server token list, it has a different value than specified by the client.

At this point, any statement sent by the client fails, unless the server token list changes such that it matches again. Suppose that the management application changes the server token list as follows:
```
mysql> SELECT version_tokens_edit('tok1=b');
+---------------------------------+
| version_tokens_edit('tok1=b') |
+---------------------------------+
| 1 version tokens updated. |
+--------------------------------+
mysql> SELECT version_tokens_show();
+-------------------------+
| version_tokens_show() |
+-------------------------+
| tok3=c;tok1=b;tok2=b; |
+------------------------+
```


Now the client version_tokens_session value matches the server token list and the client can once again successfully execute statements:
```
mysql> SELECT 1;
+---+
| 1 |
+---+
| 1 |
+---+
```

- version_tokens_session_number

\begin{tabular}{|l|l|}
\hline Command-Line Format & --version-tokens-session-number $=\#$ \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline System Variable & version_tokens_session_number \\
\hline Scope & Global, Session \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline
\end{tabular}

This variable is for internal use.

\subsection*{7.6.7 The Clone Plugin}

The clone plugin permits cloning data locally or from a remote MySQL server instance. Cloned data is a physical snapshot of data stored in InnoDB that includes schemas, tables, tablespaces, and data dictionary metadata. The cloned data comprises a fully functional data directory, which permits using the clone plugin for MySQL server provisioning.

\begin{figure}
\captionsetup{labelformat=empty}
\caption{Figure 7.1 Local Cloning Operation}
\includegraphics[alt={},max width=\textwidth]{https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1099.jpg?height=666&width=629&top_left_y=1027&top_left_x=349}
\end{figure}

A local cloning operation clones data from the MySQL server instance where the cloning operation is initiated to a directory on the same server or node where MySQL server instance runs.

\begin{figure}
\captionsetup{labelformat=empty}
\caption{Figure 7.2 Remote Cloning Operation}
\includegraphics[alt={},max width=\textwidth]{https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1099.jpg?height=613&width=633&top_left_y=1896&top_left_x=347}
\end{figure}

A remote cloning operation involves a local MySQL server instance (the "recipient") where the cloning operation is initiated, and a remote MySQL server instance (the "donor") where the source data is located. When a remote cloning operation is initiated on the recipient, cloned data is transferred over
the network from the donor to the recipient. By default, a remote cloning operation removes existing user-created data (schemas, tables, tablespaces) and binary logs from the recipient data directory before cloning data from the donor. Optionally, you can clone data to a different directory on the recipient to avoid removing data from the current recipient data directory.

There is no difference with respect to data that is cloned by a local cloning operation as compared to a remote cloning operation. Both operations clone the same set of data.

The clone plugin supports replication. In addition to cloning data, a cloning operation extracts and transfers replication coordinates from the donor and applies them on the recipient, which enables using the clone plugin for provisioning Group Replication members and replicas. Using the clone plugin for provisioning is considerably faster and more efficient than replicating a large number of transactions (see Section 7.6.7.7, "Cloning for Replication"). Group Replication members can also be configured to use the clone plugin as an alternative method of recovery, so that members automatically choose the most efficient way to retrieve group data from seed members. For more information, see Section 20.5.4.2, "Cloning for Distributed Recovery".

The clone plugin supports cloning of encrypted and page-compressed data. See Section 7.6.7.5, "Cloning Encrypted Data", and Section 7.6.7.6, "Cloning Compressed Data".

The clone plugin must be installed before you can use it. For installation instructions, see Section 7.6.7.1, "Installing the Clone Plugin". For cloning instructions, see Section 7.6.7.2, "Cloning Data Locally", and Section 7.6.7.3, "Cloning Remote Data".

Performance Schema tables and instrumentation are provided for monitoring cloning operations. See Section 7.6.7.10, "Monitoring Cloning Operations".

\subsection*{7.6.7.1 Installing the Clone Plugin}

This section describes how to install and configure the clone plugin. For remote cloning operations, the clone plugin must be installed on the donor and recipient MySQL server instances.

For general information about installing or uninstalling plugins, see Section 7.6.1, "Installing and Uninstalling Plugins".

To be usable by the server, the plugin library file must be located in the MySQL plugin directory (the directory named by the plugin_dir system variable). If necessary, set the value of plugin_dir at server startup to tell the server the plugin directory location.

The plugin library file base name is mysql_clone.so. The file name suffix differs by platform (for example, . so for Unix and Unix-like systems, . dll for Windows).

To load the plugin at server startup, use the --plugin-load-add option to name the library file that contains it. With this plugin-loading method, the option must be given each time the server starts. For example, put these lines in your my. cnf file, adjusting the plugin library file name extension for your platform as necessary. (The plugin library file name extension depends on your platform. Common suffixes are . so for Unix and Unix-like systems, . dll for Windows.)
[mysqld]
plugin-load-add=mysql_clone.so
After modifying my.cnf, restart the server to cause the new settings to take effect.

\section*{Note}

The --plugin-load-add option cannot be used to load the clone plugin when restarting the server during an upgrade from a previous MySQL version. In such cases, attempting to restart the server with plugin-loadadd=mysql_clone.so raises the error [ERROR] [MY-013238] [Server] Error installing plugin 'clone': Cannot install during upgrade. To keep this from happening, upgrade the server before attempting to start the server with plugin-load-add=mysql_clone.so.

Alternatively, to load the plugin at runtime, use this statement, adjusting the . so suffix for your platform as necessary:

INSTALL PLUGIN clone SONAME 'mysql_clone.so';
INSTALL PLUGIN loads the plugin, and also registers it in the mysql.plugins system table to cause the plugin to be loaded for each subsequent normal server startup without the need for - - plugin-load-add.

To verify plugin installation, examine the Information Schema PLUGINS table or use the SHOW PLUGINS statement (see Section 7.6.2, "Obtaining Server Plugin Information"). For example:
```
mysql> SELECT PLUGIN_NAME, PLUGIN_STATUS
    FROM INFORMATION_SCHEMA.PLUGINS
    WHERE PLUGIN_NAME = 'clone';
+--------------------------+---------------+
| PLUGIN_NAME | PLUGIN_STATUS |
+--------------------------+---------------+
| clone | ACTIVE |
+--------------------------+--------------+
```


If the plugin fails to initialize, check the server error log for clone or plugin-related diagnostic messages.
If the plugin has been previously registered with INSTALL PLUGIN or is loaded with --plugin-load-add, you can use the --clone option at server startup to control the plugin activation state. For example, to load the plugin at startup and prevent it from being removed at runtime, use these options:
```
[mysqld]
plugin-load-add=mysql_clone.so
clone=FORCE_PLUS_PERMANENT
```


If you want to prevent the server from running without the clone plugin, use --clone with a value of FORCE or FORCE_PLUS_PERMANENT to force server startup to fail if the plugin does not initialize successfully.

For more information about plugin activation states, see Controlling Plugin Activation State.

\subsection*{7.6.7.2 Cloning Data Locally}

The clone plugin supports the following syntax for cloning data locally; that is, cloning data from the local MySQL data directory to another directory on the same server or node where the MySQL server instance runs:
```
CLONE LOCAL DATA DIRECTORY [=] 'clone_dir';
```


To use CLONE syntax, the clone plugin must be installed. For installation instructions, see Section 7.6.7.1, "Installing the Clone Plugin".

The BACKUP_ADMIN privilege is required to execute CLONE LOCAL DATA DIRECTORY statements.
```
mysql> GRANT BACKUP_ADMIN ON *.* TO 'clone_user';
```

where clone_user is the MySQL user that performs the cloning operation. The user you select to perform the cloning operation can be any MySQL user with the BACKUP_ADMIN privilege on *.*.

The following example demonstrates cloning data locally:
```
mysql> CLONE LOCAL DATA DIRECTORY = '/path/to/clone_dir';
```

where /path/to/clone_dir is the full path of the local directory that data is cloned to. An absolute path is required, and the specified directory ("clone_dir") must not exist, but the specified path must be an existent path. The MySQL server must have the necessary write access to create the directory.

\section*{Note}

A local cloning operation does not support cloning of user-created tables or tablespaces that reside outside of the data directory. Attempting to clone such

\section*{tables or tablespaces causes the following error: ERROR 1086 (HY000):}

File '/path/to/tablespace_name.ibd' already exists. Cloning a tablespace with the same path as the source tablespace would cause a conflict and is therefore prohibited.

All other user-created InnoDB tables and tablespaces, the InnoDB system tablespace, redo logs, and undo tablespaces are cloned to the specified directory.

If desired, you can start the MySQL server on the cloned directory after the cloning operation is complete.
```
$> mysqld_safe --datadir=clone_dir
```

where clone_dir is the directory that data was cloned to.
For information about monitoring cloning operation status and progress, see Section 7.6.7.10, "Monitoring Cloning Operations".

\subsection*{7.6.7.3 Cloning Remote Data}

The clone plugin supports the following syntax for cloning remote data; that is, cloning data from a remote MySQL server instance (the donor) and transferring it to the MySQL instance where the cloning operation was initiated (the recipient).
```
CLONE INSTANCE FROM 'user'@'host':port
IDENTIFIED BY 'password'
[DATA DIRECTORY [=] 'clone_dir']
[REQUIRE [NO] SSL];
```

where:
- user is the clone user on the donor MySQL server instance.
- password is the user password.
- host is the hostname address of the donor MySQL server instance. Internet Protocol version 6 (IPv6) address format is not supported. An alias to the IPv6 address can be used instead. An IPv4 address can be used as is.
- port is the port number of the donor MySQL server instance. (The X Protocol port specified by mysqlx_port is not supported. Connecting to the donor MySQL server instance through MySQL Router is also not supported.)
- DATA DIRECTORY [=] 'clone_dir' is an optional clause used to specify a directory on the recipient for the data you are cloning. Use this option if you do not want to remove existing usercreated data (schemas, tables, tablespaces) and binary logs from the recipient data directory. An absolute path is required, and the directory must not exist. The MySQL server must have the necessary write access to create the directory.

When the optional DATA DIRECTORY [=] 'clone_dir' clause is not used, a cloning operation removes user-created data (schemas, tables, tablespaces) and binary logs from the recipient data directory, clones the new data to the recipient data directory, and automatically restarts the server afterward.
- [REQUIRE [NO] SSL] explicitly specifies whether an encrypted connection is to be used or not when transferring cloned data over the network. An error is returned if the explicit specification cannot be satisfied. If an SSL clause is not specified, clone attempts to establish an encrypted connection by default, falling back to an insecure connection if the secure connection attempt fails. A secure connection is required when cloning encrypted data regardless of whether this clause is specified. For more information, see Configuring an Encrypted Connection for Cloning.

\section*{Note}

By default, user-created InnoDB tables and tablespaces that reside in the data directory on the donor MySQL server instance are cloned to the data directory on the recipient MySQL server instance. If the DATA DIRECTORY [=] 'clone_dir' clause is specified, they are cloned to the specified directory.

User-created InnoDB tables and tablespaces that reside outside of the data directory on the donor MySQL server instance are cloned to the same path on the recipient MySQL server instance. An error is reported if a table or tablespace already exists.

By default, the InnoDB system tablespace, redo logs, and undo tablespaces are cloned to the same locations that are configured on the donor (as defined by innodb_data_home_dir and innodb_data_file_path, innodb_log_group_home_dir, and innodb_undo_directory, respectively). If the DATA DIRECTORY [=] 'clone_dir' clause is specified, those tablespaces and logs are cloned to the specified directory.

\section*{Remote Cloning Prerequisites}

To perform a cloning operation, the clone plugin must be active on both the donor and recipient MySQL server instances. For installation instructions, see Section 7.6.7.1, "Installing the Clone Plugin".

A MySQL user on the donor and recipient is required for executing the cloning operation (the "clone user").
- On the donor, the clone user requires the BACKUP_ADMIN privilege for accessing and transferring data from the donor and blocking concurrent DDL during the cloning operation. Concurrent DDL is permitted on the donor by default. See Section 7.6.7.4, "Cloning and Concurrent DDL".
- On the recipient, the clone user requires the CLONE_ADMIN privilege for replacing recipient data, blocking DDL on the recipient during the cloning operation, and automatically restarting the server. The CLONE_ADMIN privilege includes BACKUP_ADMIN and SHUTDOWN privileges implicitly.

Instructions for creating the clone user and granting the required privileges are included in the remote cloning example that follows this prerequisite information.

The following prerequisites are checked when the CLONE INSTANCE statement is executed:
- The donor and recipient must be the same MySQL server series, such as 8.4.0 and 8.4.11. To determine the MySQL server version, issue the following query:
```
mysql> SHOW VARIABLES LIKE 'version';
+----------------+-------+
| Variable_name | Value |
+----------------+-------+
| version | 8.4.9 |
+----------------+-------+
```

- The donor and recipient MySQL server instances must run on the same operating system and platform. For example, if the donor instance runs on a Linux 64-bit platform, the recipient instance must also run on that platform. Refer to your operating system documentation for information about how to determine your operating system platform.
- The recipient must have enough disk space for the cloned data. By default, user-created data (schemas, tables, tablespaces) and binary logs are removed on the recipient prior to cloning the donor data, so you only require enough space for the donor data. If you clone to a named directory using the DATA DIRECTORY clause, you must have enough disk space for the existing recipient data and the cloned data. You can estimate the size of your data by checking the data directory size on your file system and the size of any tablespaces that reside outside of the data directory. When estimating data size on the donor, remember that only InnoDB data is cloned. If you store data in other storage engines, adjust your data size estimate accordingly.
- InnoDB permits creating some tablespace types outside of the data directory. If the donor MySQL server instance has tablespaces that reside outside of the data directory, the cloning operation must be able access those tablespaces. You can query the Information Schema FILES table to identify tablespaces that reside outside of the data directory. Files that reside outside of the data directory have a fully qualified path to a directory other than the data directory.
```
mysql> SELECT FILE_NAME FROM INFORMATION_SCHEMA.FILES;
```

- Plugins that are active on the donor, including any keyring plugin, must also be active on the recipient. You can identify active plugins by issuing a SHOW PLUGINS statement or by querying the Information Schema PLUGINS table.
- The donor and recipient must have the same MySQL server character set and collation. For information about MySQL server character set and collation configuration, see Section 12.15, "Character Set Configuration".
- The same innodb_page_size and innodb_data_file_path settings are required on the donor and recipient. The innodb_data_file_path setting on the donor and recipient must specify the same number of data files of an equivalent size. You can check variable settings using SHOW VARIABLES syntax.
```
mysql> SHOW VARIABLES LIKE 'innodb_page_size';
mysql> SHOW VARIABLES LIKE 'innodb_data_file_path';
```

- If cloning encrypted or page-compressed data, the donor and recipient must have the same file system block size. For page-compressed data, the recipient file system must support sparse files and hole punching for hole punching to occur on the recipient. For information about these features and how to identify tables and tablespaces that use them, see Section 7.6.7.5, "Cloning Encrypted Data", and Section 7.6.7.6, "Cloning Compressed Data". To determine your file system block size, refer to your operating system documentation.
- A secure connection is required if you are cloning encrypted data. See Configuring an Encrypted Connection for Cloning.
- The clone_valid_donor_list setting on the recipient must include the host address of the donor MySQL server instance. You can only clone data from a host on the valid donor list. A MySQL user with the SYSTEM_VARIABLES_ADMIN privilege is required to configure this variable. Instructions for setting the clone_valid_donor_list variable are provided in the remote cloning example that follows this section. You can check the clone_valid_donor_list setting using SHOW VARIABLES syntax.
```
mysql> SHOW VARIABLES LIKE 'clone_valid_donor_list';
```

- There must be no other cloning operation running. Only a single cloning operation is permitted at a time. To determine if a clone operation is running, query the clone_status table. See Monitoring Cloning Operations using Performance Schema Clone Tables.
- The clone plugin transfers data in 1 MB packets plus metadata. The minimum required max_allowed_packet value is therefore 2 MB on the donor and the recipient MySQL server instances. A max_allowed_packet value less than 2 MB results in an error. Use the following query to check your max_allowed_packet setting:
```
mysql> SHOW VARIABLES LIKE 'max_allowed_packet';
```


The following prerequisites also apply:
- Undo tablespace file names on the donor must be unique. When data is cloned to the recipient, undo tablespaces, regardless of their location on the donor, are cloned to the innodb_undo_directory location on the recipient or to the directory specified by the DATA DIRECTORY [=] 'clone_dir' clause, if used. Duplicate undo tablespace file names on the donor are not permitted for this reason. An error is reported if duplicate undo tablespace file names are encountered during a cloning operation.

To view undo tablespace file names on the donor to ensure that they are unique, query the FILES table:
```
mysql> SELECT TABLESPACE_NAME, FILE_NAME FROM INFORMATION_SCHEMA.FILES
    WHERE FILE_TYPE LIKE 'UNDO LOG';
```


For information about dropping and adding undo tablespace files, see Section 17.6.3.4, "Undo Tablespaces".
- By default, the recipient MySQL server instance is restarted (stopped and started) automatically after the data is cloned. For an automatic restart to occur, a monitoring process must be available on the recipient to detect server shutdowns. Otherwise, the cloning operation halts with the following error after the data is cloned, and the recipient MySQL server instance is shut down:

ERROR 3707 (HY000): Restart server failed (mysqld is not managed by supervisor process).
This error does not indicate a cloning failure. It means that the recipient MySQL server instance must be started again manually after the data is cloned. After starting the server manually, you can connect to the recipient MySQL server instance and check the Performance Schema clone tables to verify that the cloning operation completed successfully (see Monitoring Cloning Operations using Performance Schema Clone Tables.) The RESTART statement has the same monitoring process requirement. For more information, see Section 15.7.8.8, "RESTART Statement". This requirement is not applicable if cloning to a named directory using the DATA DIRECTORY clause, as an automatic restart is not performed in this case.
- Several variables control various aspects of a remote cloning operation. Before performing a remote cloning operation, review the variables and adjust settings as necessary to suit your computing environment. Clone variables are set on recipient MySQL server instance where the cloning operation is executed. See Section 7.6.7.13, "Clone System Variables".

\section*{Cloning Remote Data}

The following example demonstrates cloning remote data. By default, a remote cloning operation removes user-created data (schemas, tables, tablespaces) and binary logs on the recipient, clones the new data to the recipient data directory, and restarts the MySQL server afterward.

The example assumes that remote cloning prerequisites are met. See Remote Cloning Prerequisites.
1. Login to the donor MySQL server instance with an administrative user account.
a. Create a clone user with the BACKUP_ADMIN privilege.
```
mysql> CREATE USER 'donor_clone_user'@'example.donor.host.com' IDENTIFIED BY 'password';
mysql> GRANT BACKUP_ADMIN on *.* to 'donor_clone_user'@'example.donor.host.com';
```

b. Install the clone plugin:
```
mysql> INSTALL PLUGIN clone SONAME 'mysql_clone.so';
```

2. Login to the recipient MySQL server instance with an administrative user account.
a. Create a clone user with the CLONE_ADMIN privilege.
```
mysql> CREATE USER 'recipient_clone_user'@'example.recipient.host.com' IDENTIFIED BY 'password';
mysql> GRANT CLONE_ADMIN on *.* to 'recipient_clone_user'@'example.recipient.host.com';
```

b. Install the clone plugin:
```
mysql> INSTALL PLUGIN clone SONAME 'mysql_clone.so';
```

c. Add the host address of the donor MySQL server instance to the clone_valid_donor_list variable setting.
```
mysql> SET GLOBAL clone_valid_donor_list = 'example.donor.host.com:3306';
```

3. Log on to the recipient MySQL server instance as the clone user you created previously (recipient_clone_user'@'example.recipient.host.com) and execute the CLONE INSTANCE statement.
```
mysql> CLONE INSTANCE FROM 'donor_clone_user'@'example.donor.host.com':3306
    IDENTIFIED BY 'password';
```


After the data is cloned, the MySQL server instance on the recipient is restarted automatically.
For information about monitoring cloning operation status and progress, see Section 7.6.7.10, "Monitoring Cloning Operations".

\section*{Cloning to a Named Directory}

By default, a remote cloning operation removes user-created data (schemas, tables, tablespaces) and binary logs from the recipient data directory before cloning data from the donor MySQL Server instance. By cloning to a named directory, you can avoid removing data from the current recipient data directory.

The procedure for cloning to a named directory is the same procedure described in Cloning Remote Data with one exception: The CLONE INSTANCE statement must include the DATA DIRECTORY clause. For example:
```
mysql> CLONE INSTANCE FROM 'user'@'example.donor.host.com':3306
    IDENTIFIED BY 'password'
    DATA DIRECTORY = '/path/to/clone_dir';
```


An absolute path is required, and the directory must not exist. The MySQL server must have the necessary write access to create the directory.

When cloning to a named directory, the recipient MySQL server instance is not restarted automatically after the data is cloned. If you want to restart the MySQL server on the named directory, you must do so manually:
```
$> mysqld_safe --datadir=/path/to/clone_dir
```

where /path/to/clone_dir is the path to the named directory on the recipient.

\section*{Configuring an Encrypted Connection for Cloning}

You can configure an encrypted connection for remote cloning operations to protect data as it is cloned over the network. An encrypted connection is required by default when cloning encrypted data. (see Section 7.6.7.5, "Cloning Encrypted Data".)

The instructions that follow describe how to configure the recipient MySQL server instance to use an encrypted connection. It is assumed that the donor MySQL server instance is already configured to use encrypted connections. If not, refer to Section 8.3.1, "Configuring MySQL to Use Encrypted Connections" for server-side configuration instructions.

To configure the recipient MySQL server instance to use an encrypted connection:
1. Make the client certificate and key files of the donor MySQL server instance available to the recipient host. Either distribute the files to the recipient host using a secure channel or place them on a mounted partition that is accessible to the recipient host. The client certificate and key files to make available include:
- ca.pem

The self-signed certificate authority (CA) file.
- client-cert.pem

The client public key certificate file.
- client-key.pem

The client private key file.
2. Configure the following SSL options on the recipient MySQL server instance.
- clone_ssl_ca

Specifies the path to the self-signed certificate authority (CA) file.
- clone_ssl_cert

Specifies the path to the client public key certificate file.
- clone_ssl_key

Specifies the path to the client private key file.
For example:
```
clone_ssl_ca=/path/to/ca.pem
clone_ssl_cert=/path/to/client-cert.pem
clone_ssl_key=/path/to/client-key.pem
```

3. To require that an encrypted connection is used, include the REQUIRE SSL clause when issuing the CLONE statement on the recipient.
```
mysql> CLONE INSTANCE FROM 'user'@'example.donor.host.com':3306
    IDENTIFIED BY 'password'
    DATA DIRECTORY = '/path/to/clone_dir'
    REQUIRE SSL;
```


If an SSL clause is not specified, the clone plugin attempts to establish an encrypted connection by default, falling back to an unencrypted connection if the encrypted connection attempt fails.

\section*{Note}

If you are cloning encrypted data, an encrypted connection is required by default regardless of whether the REQUIRE SSL clause is specified. Using REQUIRE NO SSL causes an error if you attempt to clone encrypted data.

\subsection*{7.6.7.4 Cloning and Concurrent DDL}

In MySQL 8.4, concurrent DDL is permitted on the donor by default. Concurrent DDL support on the donor is controlled by the clone_block_ddl variable. Concurrent DDL support can be enabled and disabled dynamically using a SET statement like this one:

SET GLOBAL clone_block_ddl=\{OFF|ON\}
The default setting is clone_block_ddl=0FF, which permits concurrent DDL on the donor.
Whether the effect of a concurrent DDL operation is cloned or not depends on whether the DDL operation finishes before the dynamic snapshot is taken by the cloning operation.

DDL operations that are not permitted during a cloning operation regardless of the clone_block_ddl setting include:
- ALTER TABLE tbl_name DISCARD TABLESPACE;
- ALTER TABLE tbl_name IMPORT TABLESPACE;
- ALTER INSTANCE DISABLE INNODB REDO_LOG;

\subsection*{7.6.7.5 Cloning Encrypted Data}

Cloning of encrypted data is supported. The following requirements apply:
- A secure connection is required when cloning remote data to ensure safe transfer of unencrypted tablespace keys over the network. Tablespace keys are decrypted at the donor before transport and re-encrypted at the recipient using the recipient master key. An error is reported if an encrypted connection is not available or the REQUIRE NO SSL clause is used in the CLONE INSTANCE statement. For information about configuring an encrypted connection for cloning, see Configuring an Encrypted Connection for Cloning.
- When cloning data to a local data directory that uses a locally managed keyring, the same keyring must be used when starting the MySQL server on the clone directory.
- When cloning data to a remote data directory (the recipient directory) that uses a locally managed keyring, the recipient keyring must be used when starting the MySQL sever on the cloned directory.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1108.jpg?height=122&width=122&top_left_y=900&top_left_x=287)

\section*{Note}

The innodb_redo_log_encrypt and innodb_undo_log_encrypt variable settings cannot be modified while a cloning operation is in progress.

For information about the data encryption feature, see Section 17.13, "InnoDB Data-at-Rest Encryption".

\subsection*{7.6.7.6 Cloning Compressed Data}

Cloning of page-compressed data is supported. The following requirements apply when cloning remote data:
- The recipient file system must support sparse files and hole punching for hole punching to occur on the recipient.
- The donor and recipient file systems must have the same block size. If file system block sizes differ, an error similar to the following is reported: ERROR 3868 (HY000): Clone Configuration FS Block Size: Donor value: 114688 is different from Recipient value: 4096.

For information about the page compression feature, see Section 17.9.2, "InnoDB Page Compression".

\subsection*{7.6.7.7 Cloning for Replication}

The clone plugin supports replication. In addition to cloning data, a cloning operation extracts replication coordinates from the donor and transfers them to the recipient, which enables using the clone plugin for provisioning Group Replication members and replicas. Using the clone plugin for provisioning is considerably faster and more efficient than replicating a large number of transactions.

Group Replication members can also be configured to use the clone plugin as an option for distributed recovery, in which case joining members automatically choose the most efficient way to retrieve group data from existing group members. For more information, see Section 20.5.4.2, "Cloning for Distributed Recovery".

During the cloning operation, both the binary log position (filename, offset) and the gtid_executed GTID set are extracted and transferred from the donor MySQL server instance to the recipient. This data permits initiating replication at a consistent position in the replication stream. The binary logs and relay logs, which are held in files, are not copied from the donor to the recipient. To initiate replication, the binary logs required for the recipient to catch up to the donor must not be purged between the time that the data is cloned and the time that replication is started. If the required binary logs are not available, a replication handshake error is reported. A cloned instance should therefore be added to a replication group without excessive delay to avoid required binary logs being purged or the new member lagging behind significantly, requiring more recovery time.
- Issue this query on a cloned MySQL server instance to check the binary log position that was transferred to the recipient:
```
mysql> SELECT BINLOG_FILE, BINLOG_POSITION FROM performance_schema.clone_status;
```

- Issue this query on a cloned MySQL server instance to check the gtid_executed GTID set that was transferred to the recipient:
```
mysql> SELECT @@GLOBAL.GTID_EXECUTED;
```


By default, the replication metadata repositories are held in tables that are copied from the donor to the recipient during the cloning operation. The replication metadata repositories hold replicationrelated configuration settings that can be used to resume replication correctly after the cloning operation. The tables mysql.slave_master_info, mysql.slave_relay_log_info, and mysql.slave_worker_info are all copied.

For a list of what is included in each table, see Section 19.2.4.2, "Replication Metadata Repositories".
To clone for replication, perform the following steps:
1. For a new group member for Group Replication, first configure the MySQL Server instance for Group Replication, following the instructions in Section 20.2.1.6, "Adding Instances to the Group". Also set up the prerequisites for cloning described in Section 20.5.4.2, "Cloning for Distributed Recovery". When you issue START GROUP_REPLICATION on the joining member, the cloning operation is managed automatically by Group Replication, so you do not need to carry out the operation manually, and you do not need to perform any further setup steps on the joining member.
2. For a replica in a source/replica MySQL replication topology, first clone the data from the donor MySQL server instance to the recipient manually. The donor must be a source or replica in the replication topology. For cloning instructions, see Section 7.6.7.3, "Cloning Remote Data".
3. After the cloning operation completes successfully, if you want to use the same replication channels on the recipient MySQL server instance that were present on the donor, verify which of them can resume replication automatically in the source/replica MySQL replication topology, and which need to be set up manually.
- For GTID-based replication, if the recipient is configured with gtid_mode=0N and has cloned from a donor with gtid_mode=ON, ON_PERMISSIVE, or OFF_PERMISSIVE, the gtid_executed GTID set from the donor is applied on the recipient. If the recipient is cloned from a replica already in the topology, replication channels on the recipient that use GTID autopositioning can resume replication automatically after the cloning operation when the channel is started. You do not need to perform any manual setup if you just want to use these same channels.
- For binary log file position based replication, the binary log position from the donor is applied on the recipient. Replication channels on the recipient that use binary log file position based replication automatically attempt to carry out the relay log recovery process, using the cloned relay log information, before restarting replication. For a single-threaded replica (replica_parallel_workers is set to 0), relay log recovery should succeed in the absence of any other issues, enabling the channel to resume replication with no further setup. For a multithreaded replica (replica_parallel_workers is greater than 0 ), relay log recovery is likely to fail because it cannot usually be completed automatically. In this case, an error message is issued, and you must set the channel up manually.
4. If you need to set up cloned replication channels manually, or want to use different replication channels on the recipient, the following instructions provide a summary and abbreviated examples for adding a recipient MySQL server instance to a replication topology. Also refer to the detailed instructions that apply to your replication setup.
- To add a recipient MySQL server instance to a MySQL replication topology that uses GTIDbased transactions as the replication data source, configure the instance as required, following the instructions in Section 19.1.3.4, "Setting Up Replication Using GTIDs". Add replication channels for the instance as shown in the following abbreviated example. The CHANGE

REPLICATION SOURCE TO statement must define the host address and port number of the source, and the SOURCE_AUTO_POSITION option should be enabled, as shown:
```
CHANGE SOURCE TO SOURCE_HOST = 'source_host_name', SOURCE_PORT = source_port_num,
    ...
    SOURCE_AUTO_POSITION = 1,
    FOR CHANNEL 'setup_channel';
START REPLICA USER = 'user_name' PASSWORD = 'password' FOR CHANNEL 'setup_channel';
```

- To add a recipient MySQL server instance to a MySQL replication topology that uses binary log file position based replication, configure the instance as required, following the instructions in Section 19.1.2, "Setting Up Binary Log File Position Based Replication". Add replication channels for the instance as shown in the following abbreviated example, using the binary log position that was transferred to the recipient during the cloning operation:
```
SELECT BINLOG_FILE, BINLOG_POSITION FROM performance_schema.clone_status;
CHANGE SOURCE TO SOURCE_HOST = 'source_host_name', SOURCE_PORT = source_port_num,
    ...
    SOURCE_LOG_FILE = 'source_log_name',
    SOURCE_LOG_POS = source_log_pos,
    FOR CHANNEL 'setup_channel';
START REPLICA USER = 'user_name' PASSWORD = 'password' FOR CHANNEL 'setup_channel';
```


\subsection*{7.6.7.8 Directories and Files Created During a Cloning Operation}

When data is cloned, the following directories and files are created for internal use. They should not be modified.
- \#clone: Contains internal clone files used by the cloning operation. Created in the directory that data is cloned to.
- \#ib_archive: Contains internally archived log files, archived on the donor during the cloning operation.
- *.\#clone files: Temporary data files created on the recipient while data is removed from the recipient data directory and new data is cloned during a remote cloning operation.

\subsection*{7.6.7.9 Remote Cloning Operation Failure Handling}

This section describes failure handing at different stages of a cloning operation.
1. Prerequisites are checked (see Remote Cloning Prerequisites).
- If a failure occurs during the prerequisite check, the CLONE INSTANCE operation reports an error.
2. Concurrent DDL on the donor is blocked only if the clone_block_ddl variable is set to ON (the default setting is 0FF). See Section 7.6.7.4, "Cloning and Concurrent DDL".

If the cloning operation is unable to obtain a DDL lock within the time limit specified by the clone_ddl_timeout variable, an error is reported.
3. User-created data (schemas, tables, tablespaces) and binary logs on the recipient are removed before data is cloned to the recipient data directory.

When user-created data and binary logs are removed from the recipient data directory during a remote cloning operation, the data is not saved and may be lost if a failure occurs. If the data is of importance, a backup should be taken before initiating a remote cloning operation.

For informational purposes, warnings are printed to the server error log to specify when data removal starts and finishes:
```
[Warning] [MY-013453] [InnoDB] Clone removing all user data for provisioning:
Started...
```

[Warning] [MY-013453] [InnoDB] Clone removing all user data for provisioning:
Finished
If a failure occurs while removing data, the recipient may be left with a partial set of schemas, tables, and tablespaces that existed before the cloning operation. Any time during the execution of a cloning operation or after a failure, the server is always in a consistent state.
4. Data is cloned from the donor. User-created data, dictionary metadata, and other system data are cloned.

If a failure occurs while cloning data, the cloning operation is rolled back and all cloned data removed. At this stage, the previously existing user-created data and binary logs on the recipient have also been removed.

Should this scenario occur, you can either rectify the cause of the failure and re-execute the cloning operation, or forgo the cloning operation and restore the recipient data from a backup taken before the cloning operation.
5. The server is restarted automatically (applies to remote cloning operations that do not clone to a named directory). During startup, typical server startup tasks are performed.

If the automatic server restart fails, you can restart the server manually to complete the cloning operation.

If a network error occurs during a cloning operation, the operation resumes if the error is resolved within the time specified by the clone_donor_timeout_after_network_failure variable defined on the donor instance. The clone_donor_timeout_after_network_failure default setting is 5 minutes but a range of 0 to 30 minutes is supported. If the operation does not resume within the allotted time, it aborts and returns an error, and the donor drops the snapshot. A setting of zero causes the donor to drop the snapshot immediately when a network error occurs. Configuring a longer timeout allows more time for resolving network issues but also increases the size of the delta on the donor instance, which increases clone recovery time as well as replication lag in cases where the clone is intended as a replica or replication group member.

The Clone idle timeout is set to the default wait_timeout setting, which is 28800 seconds ( 8 hours).

\subsection*{7.6.7.10 Monitoring Cloning Operations}

This section describes options for monitoring cloning operations.
- Monitoring Cloning Operations using Performance Schema Clone Tables
- Monitoring Cloning Operations Using Performance Schema Stage Events
- Monitoring Cloning Operations Using Performance Schema Clone Instrumentation
- The Com_clone Status Variable

\section*{Monitoring Cloning Operations using Performance Schema Clone Tables}

A cloning operation may take some time to complete, depending on the amount of data and other factors related to data transfer. You can monitor the status and progress of a cloning operation on the recipient MySQL server instance using the clone_status and clone_progress Performance Schema tables.

\section*{Note}

The clone_status and clone_progress Performance Schema tables can be used to monitor a cloning operation on the recipient MySQL server instance only. To monitor a cloning operation on the donor MySQL server instance, use the clone stage events, as described in Monitoring Cloning Operations Using Performance Schema Stage Events.
- The clone_status table provides the state of the current or last executed cloning operation. A clone operation has four possible states: Not Started, In Progress, Completed, and Failed.
- The clone_progress table provides progress information for the current or last executed clone operation, by stage. The stages of a cloning operation include DROP DATA, FILE COPY, PAGE_COPY, REDO_COPY, FILE_SYNC, RESTART, and RECOVERY.

The SELECT and EXECUTE privileges on the Performance Schema is required to access the Performance Schema clone tables.

To check the state of a cloning operation:
1. Connect to the recipient MySQL server instance.
2. Query the clone_status table:
```
mysql> SELECT STATE FROM performance_schema.clone_status;
+------------+
| STATE |
+-----------+
| Completed |
+------------+
```


Should a failure occur during a cloning operation, you can query the clone_status table for error information:
```
mysql> SELECT STATE, ERROR_NO, ERROR_MESSAGE FROM performance_schema.clone_status;
+------------+-----------+---------------+
| STATE | ERROR_NO | ERROR_MESSAGE |
+------------+-----------+---------------+
| Failed | xxx | "xxxxxxxxxxx" |
+------------+-----------+---------------+
```


To review the details of each stage of a cloning operation:
1. Connect to the recipient MySQL server instance.
2. Query the clone_progress table. For example, the following query provides state and end time data for each stage of the cloning operation:
```
mysql> SELECT STAGE, STATE, END_TIME FROM performance_schema.clone_progress;

\begin{tabular}{|l|l|l|l|}
\hline stage & state & end_time & \\
\hline DROP DATA & Completed & 2019-01-27 & 22:45:43.141261 \\
\hline FILE COPY & Completed & 2019-01-27 & 22:45:44.457572 \\
\hline PAGE COPY & Completed & 2019-01-27 & 22:45:44.577330 \\
\hline REDO COPY & Completed & 2019-01-27 & 22:45:44.679570 \\
\hline FILE SYNC & Completed & 2019-01-27 & 22:45:44.918547 \\
\hline RESTART & Completed & 2019-01-27 & 22:45:48.583565 \\
\hline RECOVERY & Completed & 2019-01-27 & 22:45:49.626595 \\
\hline
\end{tabular}
```


For other clone status and progress data points that you can monitor, refer to Section 29.12.19, "Performance Schema Clone Tables".

\section*{Monitoring Cloning Operations Using Performance Schema Stage Events}

A cloning operation may take some time to complete, depending on the amount of data and other factors related to data transfer. There are three stage events for monitoring the progress of a cloning operation. Each stage event reports WORK_COMPLETED and WORK_ESTIMATED values. Reported values are revised as the operation progresses.

This method of monitoring a cloning operation can be used on the donor or recipient MySQL server instance.

In order of occurrence, cloning operation stage events include:
- stage/innodb/clone (file copy): Indicates progress of the file copy phase of the cloning operation. WORK_ESTIMATED and WORK_COMPLETED units are file chunks. The number of files to be transferred is known at the start of the file copy phase, and the number of chunks is estimated based on the number of files. WORK_ESTIMATED is set to the number of estimated file chunks. WORK_COMPLETED is updated after each chunk is sent.
- stage/innodb/clone (page copy): Indicates progress of the page copy phase of cloning operation. WORK_ESTIMATED and WORK_COMPLETED units are pages. Once the file copy phase is completed, the number of pages to be transferred is known, and WORK_ESTIMATED is set to this value. WORK_COMPLETED is updated after each page is sent.
- stage/innodb/clone (redo copy): Indicates progress of the redo copy phase of cloning operation. WORK_ESTIMATED and WORK_COMPLETED units are redo chunks. Once the page copy phase is completed, the number of redo chunks to be transferred is known, and WORK_ESTIMATED is set to this value. WORK_COMPLETED is updated after each chunk is sent.

The following example demonstrates how to enable stage/innodb/clone\% event instruments and related consumer tables to monitor a cloning operation. For information about Performance Schema stage event instruments and related consumers, see Section 29.12.5, "Performance Schema Stage Event Tables".
1. Enable the stage/innodb/clone\% instruments:
```
mysql> UPDATE performance_schema.setup_instruments SET ENABLED = 'YES'
    WHERE NAME LIKE 'stage/innodb/clone%';
```

2. Enable the stage event consumer tables, which include events_stages_current, events_stages_history, and events_stages_history_long.
```
mysql> UPDATE performance_schema.setup_consumers SET ENABLED = 'YES'
    WHERE NAME LIKE '%stages%';
```

3. Run a cloning operation. In this example, a local data directory is cloned to a directory named cloned_dir.
```
mysql> CLONE LOCAL DATA DIRECTORY = '/path/to/cloned_dir';
```

4. Check the progress of the cloning operation by querying the Performance Schema events_stages_current table. The stage event shown differs depending on the cloning phase that is in progress. The WORK_COMPLETED column shows the work completed. The WORK_ESTIMATED column shows the work required in total.
```
mysql> SELECT EVENT_NAME, WORK_COMPLETED, WORK_ESTIMATED FROM performance_schema.events_stages_curre
        WHERE EVENT_NAME LIKE 'stage/innodb/clone%';
+----------------------------------+----------------+----------------+
    EVENT_NAME | WORK_COMPLETED | WORK_ESTIMATED |
+----------------------------------+----------------+------------------
| stage/innodb/clone (redo copy) | 1 | 1 |
+----------------------------------+---------------+----------------
```


The events_stages_current table returns an empty set if the cloning operation has finished. In this case, you can check the events_stages_history table to view event data for the completed operation. For example:
```
mysql> SELECT EVENT_NAME, WORK_COMPLETED, WORK_ESTIMATED FROM events_stages_history
        WHERE EVENT_NAME LIKE 'stage/innodb/clone%';
+----------------------------------+----------------+-----------------
    EVENT_NAME | WORK_COMPLETED | WORK_ESTIMATED |
+----------------------------------+----------------+------------------
    stage/innodb/clone (file copy) | 301 | 301 |
    stage/innodb/clone (page copy) | 0 | 0 |
    stage/innodb/clone (redo copy) | 1 | 1 |
+----------------------------------+---------------+----------------
```


\section*{Monitoring Cloning Operations Using Performance Schema Clone Instrumentation}

Performance Schema provides instrumentation for advanced performance monitoring of clone operations. To view the available clone instrumentation, and issue the following query:
```
mysql> SELECT NAME,ENABLED FROM performance_schema.setup_instruments
    WHERE NAME LIKE '%clone%';
+----------------------------------------------------+-----------
| NAME | ENABLED |
+----------------------------------------------------+-----------
| wait/synch/mutex/innodb/clone_snapshot_mutex | NO
| wait/synch/mutex/innodb/clone_sys_mutex | NO
| wait/synch/mutex/innodb/clone_task_mutex | NO
| wait/synch/mutex/group_rpl/LOCK_clone_donor_list | NO
| wait/synch/mutex/group_rpl/LOCK_clone_handler_run | NO
| wait/synch/mutex/group_rpl/LOCK_clone_query | NO
| wait/synch/mutex/group_rpl/LOCK_clone_read_mode | NO
| wait/synch/cond/group_rpl/COND_clone_handler_run | NO
| wait/io/file/innodb/innodb_clone_file | YES
| stage/innodb/clone (file copy) | YES
| stage/innodb/clone (redo copy) | YES
| stage/innodb/clone (page copy) | YES
| statement/abstract/clone | YES
| statement/clone/local | YES
| statement/clone/client | YES
| statement/clone/server | YES
| memory/innodb/clone | YES
| memory/clone/data | YES
+----------------------------------------------------+----------
```


\section*{Wait Instruments}

Performance schema wait instruments track events that take time. Clone wait event instruments include:
- wait/synch/mutex/innodb/clone_snapshot_mutex: Tracks wait events for the clone snapshot mutex, which synchronizes access to the dynamic snapshot object (on the donor and recipient) between multiple clone threads.
- wait/synch/mutex/innodb/clone_sys_mutex: Tracks wait events for the clone sys mutex. There is one clone system object in a MySQL server instance. This mutex synchronizes access to the clone system object on the donor and recipient. It is acquired by clone threads and other foreground and background threads.
- wait/synch/mutex/innodb/clone_task_mutex: Tracks wait events for the clone task mutex, used for clone task management. The clone_task_mutex is acquired by clone threads.
- wait/io/file/innodb/innodb_clone_file: Tracks all I/O wait operations for files that clone operates on.

For information about monitoring InnoDB mutex waits, see Section 17.16.2, "Monitoring InnoDB Mutex Waits Using Performance Schema". For information about monitoring wait events in general, see Section 29.12.4, "Performance Schema Wait Event Tables".

\section*{Stage Instruments}

Performance Schema stage events track steps that occur during the statement-execution process. Clone stage event instruments include:
- stage/innodb/clone (file copy): Indicates progress of the file copy phase of the cloning operation.
- stage/innodb/clone (redo copy): Indicates progress of the redo copy phase of cloning operation.
- stage/innodb/clone (page copy): Indicates progress of the page copy phase of cloning operation.

For information about monitoring cloning operations using stage events, see Monitoring Cloning Operations Using Performance Schema Stage Events. For general information about monitoring stage events, see Section 29.12.5, "Performance Schema Stage Event Tables".

\section*{Statement Instruments}

Performance Schema statement events track statement execution. When a clone operation is initiated, the different statement types tracked by clone statement instruments may be executed in parallel. You can observe these statement events in the Performance Schema statement event tables. The number of statements that execute depends on the clone_max_concurrency and clone_autotune_concurrency settings.

Clone statement event instruments include:
- statement/abstract/clone: Tracks statement events for any clone operation before it is classified as a local, client, or server operation type.
- statement/clone/local: Tracks clone statement events for local clone operations; generated when executing a CLONE LOCAL statement.
- statement/clone/client: Tracks remote cloning statement events that occur on the recipient MySQL server instance; generated when executing a CLONE INSTANCE statement on the recipient.
- statement/clone/server: Tracks remote cloning statement events that occur on the donor MySQL server instance; generated when executing a CLONE INSTANCE statement on the recipient.

For information about monitoring Performance Schema statement events, see Section 29.12.6, "Performance Schema Statement Event Tables".

\section*{Memory Instruments}

Performance Schema memory instruments track memory usage. Clone memory usage instruments include:
- memory/innodb/clone: Tracks memory allocated by InnoDB for the dynamic snapshot.
- memory/clone/data: Tracks memory allocated by the clone plugin during a clone operation.

For information about monitoring memory usage using Performance Schema, see Section 29.12.20.10, "Memory Summary Tables".

\section*{The Com_clone Status Variable}

The Com_clone status variable provides a count of CLONE statement executions.
For more information, refer to the discussion about Com_xxx statement counter variables in Section 7.1.10, "Server Status Variables".

\subsection*{7.6.7.11 Stopping a Cloning Operation}

If necessary, you can stop a cloning operation with a KILL QUERY processlist_id statement.
On the recipient MySQL server instance, you can retrieve the processlist identifier (PID) for a cloning operation from the PID column of the clone_status table.
```
mysql> SELECT * FROM performance_schema.clone_status\G
************************** 1. row *****************************
                        ID: 1
                    PID: 8
                    STATE: In Progress
        BEGIN_TIME: 2019-07-15 11:58:36.767
            END_TIME: NULL
                SOURCE: LOCAL INSTANCE
        DESTINATION: /path/to/clone_dir/
            ERROR_NO: 0
    ERROR_MESSAGE:
```

```
BINLOG_FILE:
BINLOG_POSITION: 0
    GTID_EXECUTED:
```


You can also retrieve the processlist identifier from the ID column of the INFORMATION_SCHEMA PROCESSLIST table, the Id column of SHOW PROCESSLIST output, or the PROCESSLIST_ID column of the Performance Schema threads table. These methods of obtaining the PID information can be used on the donor or recipient MySQL server instance.

\subsection*{7.6.7.12 Clone System Variable Reference}

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 7.7 Clone System Variable Reference}
\begin{tabular}{|l|l|l|l|l|l|}
\hline Name & Option File & System Var & Status Var & Var Scope & Dynamic \\
\hline clone_autotuner esoncurrency & Yes & Yes & & Global & Yes \\
\hline clone_block_ddles & Yes & Yes & & Global & Yes \\
\hline clone_buffer_sizes & Yes & Yes & & Global & Yes \\
\hline clone_ddl_timebed & Yes & Yes & & Global & Yes \\
\hline clone_delay_aftees data_drop & Yes & Yes & & Global & Yes \\
\hline clone_donor_tihrut_after_n & \& tersork_failure & Yes & & Global & Yes \\
\hline clone_enable_\& (mspression & Yes & Yes & & Global & Yes \\
\hline clone_max_corressrency & Yes & Yes & & Global & Yes \\
\hline clone_max_dałę\$andwidth & Yes & Yes & & Global & Yes \\
\hline clone_max_netresk_bandwio & dYes & Yes & & Global & Yes \\
\hline clone_ssl_ca Yes & Yes & Yes & & Global & Yes \\
\hline clone_ssl_cert Yes & Yes & Yes & & Global & Yes \\
\hline clone_ssl_key Yes & Yes & Yes & & Global & Yes \\
\hline clone_valid_dołées_list & Yes & Yes & & Global & Yes \\
\hline
\end{tabular}
\end{table}

\subsection*{7.6.7.13 Clone System Variables}

This section describes the system variables that control operation of the clone plugin. If values specified at startup are incorrect, the clone plugin may fail to initialize properly and the server does not load it. In this case, the server may also produce error messages for other clone settings because it does not recognize them.

Each system variable has a default value. System variables can be set at server startup using options on the command line or in an option file. They can be changed dynamically at runtime using the SET statement, which enables you to modify operation of the server without having to stop and restart it.

Setting a global system variable runtime value normally requires the SYSTEM_VARIABLES_ADMIN privilege (or the deprecated SUPER privilege). For more information, see Section 7.1.9.1, "System Variable Privileges".

Clone variables are configured on the recipient MySQL server instance where the cloning operation is executed.
- clone_autotune_concurrency

\begin{tabular}{|l|l|}
\hline Command-Line Format & --clone-autotune-concurrency \\
\hline System Variable & clone_autotune_concurrency \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Type & Boolean \\
\hline Default Value & ON \\
\hline
\end{tabular}

When clone_autotune_concurrency is enabled (the default), additional threads for remote cloning operations are spawned dynamically to optimize data transfer speed. The setting is applicable to recipient MySQL server instance only.

During a cloning operation, the number of threads increases incrementally toward a target of double the current thread count. The effect on the data transfer speed is evaluated at each increment. The process either continues or stops according to the following rules:
- If the data transfer speed degrades more than $5 \%$ with an incremental increase, the process stops.
- If there is at least a $5 \%$ improvement after reaching $25 \%$ of the target, the process continues. Otherwise, the process stops.
- If there is at least a $10 \%$ improvement after reaching $50 \%$ of the target, the process continues. Otherwise, the process stops.
- If there is at least a $25 \%$ improvement after reaching the target, the process continues toward a new target of double the current thread count. Otherwise, the process stops.

The autotuning process does not support decreasing the number of threads.
The clone_max_concurrency variable defines the maximum number of threads that can be spawned.

If clone_autotune_concurrency is disabled, clone_max_concurrency defines the number of threads spawned for a remote cloning operation.
- clone_buffer_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --clone-buffer-size \\
\hline System Variable & clone_buffer_size \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 4194304 \\
\hline Minimum Value & 1048576 \\
\hline Maximum Value & 268435456 \\
\hline Unit & bytes \\
\hline
\end{tabular}

Defines the size of the intermediate buffer used when transferring data during a local cloning operation. The default value is 4 mebibytes (MiB). A larger buffer size may permit I/O device drivers to fetch data in parallel, which can improve cloning performance.
- clone_block_ddl

\begin{tabular}{|l|l|l|}
\hline Command-Line Format & --clone-block-ddl & \\
\hline System Variable & clone_block_ddl & \\
\hline Scope & Global & \\
\hline Dynamic & Yes & \\
\hline SET_VAR Hint Applies & No & 1087 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

Enables an exclusive backup lock on the donor MySQL Server instance during a cloning operation, which blocks concurrent DDL operations on the donor. See Section 7.6.7.4, "Cloning and Concurrent DDL".
- clone_delay_after_data_drop

\begin{tabular}{|l|l|}
\hline Command-Line Format & --clone-delay-after-data-drop \\
\hline System Variable & clone_delay_after_data_drop \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 3600 \\
\hline Unit & bytes \\
\hline
\end{tabular}

Specifies a delay period immediately after removing existing data on the recipient MySQL Server instance at the start of a remote cloning operation. The delay is intended to provide enough time for the file system on the recipient host to free space before data is cloned from the donor MySQL Server instance. Certain file systems such as VxFS free space asynchronously in a background process. On these file systems, cloning data too soon after dropping existing data can result in clone operation failures due to insufficient space. The maximum delay period is 3600 seconds (1 hour). The default setting is 0 (no delay).

This variable is applicable to remote cloning operation only and is configured on the recipient MySQL Server instance.
- clone_ddl_timeout

\begin{tabular}{|l|l|}
\hline Command-Line Format & --clone-ddl-timeout \\
\hline System Variable & clone_ddl_timeout \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 300 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 2592000 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Unit & seconds \\
\hline
\end{tabular}

The time in seconds that a cloning operation waits for a backup lock. The backup lock blocks concurrent DDL when executing a cloning operation. This setting is applied on both the donor and recipient MySQL server instances.

A setting of 0 means that the cloning operation does not wait for a backup lock. In this case, executing a concurrent DDL operation can cause the cloning operation to fail.

Concurrent DDL is permitted on the donor during a cloning operation if clone_block_ddl is set to OFF (the default). In this case, the cloning operation does not have to wait for a backup lock on the donor. See Section 7.6.7.4, "Cloning and Concurrent DDL".
- clone_donor_timeout_after_network_failure

\begin{tabular}{|l|l|}
\hline Command-Line Format & --clone-donor-timeout-after-networkfailure \\
\hline System Variable & clone_donor_timeout_after_network_failure \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 5 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 30 \\
\hline Unit & minutes \\
\hline
\end{tabular}

Defines the amount of time in minutes the donor allows for the recipient to reconnect and restart a cloning operation after a network failure. For more information, see Section 7.6.7.9, "Remote Cloning Operation Failure Handling".

This variable is set on the donor MySQL server instance. Setting it on the recipient MySQL server instance has no effect.
- clone_enable_compression

\begin{tabular}{|l|l|}
\hline Command-Line Format & --clone-enable-compression \\
\hline System Variable & clone_enable_compression \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & 0FF \\
\hline
\end{tabular}

Enables compression of data at the network layer during a remote cloning operation. Compression saves network bandwidth at the cost of CPU. Enabling compression may improve the data transfer rate. This setting is only applied on the recipient MySQL server instance.
- clone_max_concurrency

\begin{tabular}{|l|l|}
\hline Command-Line Format & --clone-max-concurrency \\
\hline System Variable & Clone_max_concurrency \\
\cline { 2 - 3 } & \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 16 \\
\hline Minimum Value & 1 \\
\hline Maximum Value & 128 \\
\hline Unit & threads \\
\hline
\end{tabular}

Defines the maximum number of concurrent threads for a remote cloning operation. The default value is 16 . A greater number of threads can improve cloning performance but also reduces the number of permitted simultaneous client connections, which can affect the performance of existing client connections. This setting is only applied on the recipient MySQL server instance.

If clone_autotune_concurrency is enabled (the default), clone_max_concurrency is the maximum number of threads that can be dynamically spawned for a remote cloning operation. If clone_autotune_concurrency is disabled, clone_max_concurrency defines the number of threads spawned for a remote cloning operation.

A minimum data transfer rate of 1 mebibyte (MiB) per thread is recommended for remote cloning operations. The data transfer rate for a remote cloning operation is controlled by the clone_max_data_bandwidth variable.
- clone_max_data_bandwidth

\begin{tabular}{|l|l|}
\hline Command-Line Format & --clone-max-data-bandwidth \\
\hline System Variable & clone_max_data_bandwidth \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 1048576 \\
\hline Unit & miB/second \\
\hline
\end{tabular}

Defines the maximum data transfer rate in mebibytes (MiB) per second for a remote cloning operation. This variable helps manage the performance impact of a cloning operation. A limit should be set only when donor disk I/O bandwidth is saturated, affecting performance. A value of 0 means "unlimited", which permits cloning operations to run at the highest possible data transfer rate. This setting is only applicable to the recipient MySQL server instance.

The minimum data transfer rate is 1 MiB per second, per thread. For example, if there are 8 threads, the minimum transfer rate is 8 MiB per second. The clone_max_concurrency variable controls the maximum number threads spawned for a remote cloning operation.

The requested data transfer rate specified by clone_max_data_bandwidth may differ from the actual data transfer rate reported by the DATA_SPEED column in the performance_schema.clone_progress table. If your cloning operation is not achieving the desired data transfer rate and you have available bandwidth, check I/O usage on the recipient and donor. If there is underutilized bandwidth, I/O is the next mostly likely bottleneck.
- clone_max_network_bandwidth

\begin{tabular}{|l|l|}
\hline Command-Line Format & --clone-max-network-bandwidth \\
\hline System Variable & clone_max_network_bandwidth \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 1048576 \\
\hline Unit & miB/second \\
\hline
\end{tabular}

Specifies the maximum approximate network transfer rate in mebibytes (MiB) per second for a remote cloning operation. This variable can be used to manage the performance impact of a cloning operation on network bandwidth. It should be set only when network bandwidth is saturated, affecting performance on the donor instance. A value of 0 means "unlimited", which permits cloning at the highest possible data transfer rate over the network, providing the best performance. This setting is only applicable to the recipient MySQL server instance.
- clone_ssl_ca

\begin{tabular}{|l|l|}
\hline Command-Line Format & --clone-ssl-ca=file_name \\
\hline System Variable & clone_ssl_ca \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & File name \\
\hline Default Value & empty string \\
\hline
\end{tabular}

Specifies the path to the certificate authority (CA) file. Used to configure an encrypted connection for a remote cloning operation. This setting configured on the recipient and used when connecting to the donor.
- clone_ssl_cert

\begin{tabular}{|l|l|}
\hline Command-Line Format & --clone-ssl-cert=file_name \\
\hline System Variable & clone_ssl_cert \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & File name \\
\hline Default Value & empty string \\
\hline
\end{tabular}

Specifies the path to the public key certificate. Used to configure an encrypted connection for a remote cloning operation. This setting configured on the recipient and used when connecting to the donor.
- clone_ssl_key

\begin{tabular}{|l|l|}
\hline Command-Line Format & --clone-ssl-key=file_name \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline System Variable & clone_ssl_key \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & File name \\
\hline Default Value & empty string \\
\hline
\end{tabular}

Specifies the path to the private key file. Used to configure an encrypted connection for a remote cloning operation. This setting configured on the recipient and used when connecting to the donor.
- clone_valid_donor_list

\begin{tabular}{|l|l|}
\hline Command-Line Format & --clone-valid-donor-list=value \\
\hline System Variable & clone_valid_donor_list \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Default Value & NULL \\
\hline
\end{tabular}

Defines valid donor host addresses for remote cloning operations. This setting is applied on the recipient MySQL server instance. A comma-separated list of values is permitted in the following format: "HOST1: PORT1, HOST2: PORT2, HOST3: PORT3". Spaces are not permitted.

The clone_valid_donor_list variable adds a layer of security by providing control over the sources of cloned data. The privilege required to configure clone_valid_donor_list is different from the privilege required to execute remote cloning operations, which permits assigning those responsibilities to different roles. Configuring clone_valid_donor_list requires the SYSTEM_VARIABLES_ADMIN privilege, whereas executing a remote cloning operation requires the CLONE_ADMIN privilege.

Internet Protocol version 6 (IPv6) address format is not supported. Internet Protocol version 6 (IPv6) address format is not supported. An alias to the IPv6 address can be used instead. An IPv4 address can be used as is.

\subsection*{7.6.7.14 Clone Plugin Limitations}

The clone plugin is subject to these limitations:
- An instance cannot be cloned from a different MySQL server series. For example, you cannot clone between MySQL 8.0 and MySQL 8.4, but can clone within a series such as MySQL 8.4.1 and MySQL 8.4.13.
- Only a single MySQL instance can be cloned at a time. Cloning multiple MySQL instances in a single cloning operation is not supported.
- The X Protocol port specified by mysqlx_port is not supported for remote cloning operations (when specifying the port number of the donor MySQL server instance in a CLONE INSTANCE statement).
- The clone plugin does not support cloning of MySQL server configurations. The recipient MySQL server instance retains its configuration, including persisted system variable settings (see Section 7.1.9.3, "Persisted System Variables".)
- The clone plugin does not support cloning of binary logs.
- The clone plugin only clones data stored in InnoDB. Other storage engine data is not cloned. MyISAM and CSV tables stored in any schema including the sys schema are cloned as empty tables.
- Connecting to the donor MySQL server instance through MySQL Router is not supported.
- Local cloning operations do not support cloning of general tablespaces that were created with an absolute path. A cloned tablespace file with the same path as the source tablespace file would cause a conflict.

\subsection*{7.6.8 The Keyring Proxy Bridge Plugin}

MySQL Keyring originally implemented keystore capabilities using server plugins, but began transitioning to use the component infrastructure in MySQL 8.0. The transition includes revising the underlying implementation of keyring plugins to use the component infrastructure. This is facilitated using the plugin named daemon_keyring_proxy_plugin that acts as a bridge between the plugin and component service APIs, and enables keyring plugins to continue to be used with no change to user-visible characteristics.
daemon_keyring_proxy_plugin is built in and nothing need be done to install or enable it.

\subsection*{7.6.9 MySQL Plugin Services}

MySQL server plugins have access to server "plugin services." The plugin services interface complements the plugin API by exposing server functionality that plugins can call. For developer information about writing plugin services, see MySQL Services for Plugins. The following sections describe plugin services available at the SQL and C-language levels.

\subsection*{7.6.9.1 The Locking Service}

MySQL distributions provide a locking interface that is accessible at two levels:
- At the SQL level, as a set of loadable functions that each map onto calls to the service routines.
- As a C language interface, callable as a plugin service from server plugins or loadable functions.

For general information about plugin services, see Section 7.6.9, "MySQL Plugin Services". For general information about loadable functions, see Adding a Loadable Function.

The locking interface has these characteristics:
- Locks have three attributes: Lock namespace, lock name, and lock mode:
- Locks are identified by the combination of namespace and lock name. The namespace enables different applications to use the same lock names without colliding by creating locks in separate namespaces. For example, if applications A and B use namespaces of ns 1 and ns 2 , respectively, each application can use lock names lock1 and lock2 without interfering with the other application.
- A lock mode is either read or write. Read locks are shared: If a session has a read lock on a given lock identifier, other sessions can acquire a read lock on the same identifier. Write locks are exclusive: If a session has a write lock on a given lock identifier, other sessions cannot acquire a read or write lock on the same identifier.
- Namespace and lock names must be non-NULL, nonempty, and have a maximum length of 64 characters. A namespace or lock name specified as NULL, the empty string, or a string longer than 64 characters results in an ER_LOCKING_SERVICE_WRONG_NAME error.
- The locking interface treats namespace and lock names as binary strings, so comparisons are casesensitive.
- The locking interface provides functions to acquire locks and release locks. No special privilege is required to call these functions. Privilege checking is the responsibility of the calling application.
- Locks can be waited for if not immediately available. Lock acquisition calls take an integer timeout value that indicates how many seconds to wait to acquire locks before giving up. If the timeout is reached without successful lock acquisition, an ER_LOCKING_SERVICE_TIMEOUT error occurs. If the timeout is 0 , there is no waiting and the call produces an error if locks cannot be acquired immediately.
- The locking interface detects deadlock between lock-acquisition calls in different sessions. In this case, the locking service chooses a caller and terminates its lock-acquisition request with an ER_LOCKING_SERVICE_DEADLOCK error. This error does not cause transactions to roll back. To choose a session in case of deadlock, the locking service prefers sessions that hold read locks over sessions that hold write locks.
- A session can acquire multiple locks with a single lock-acquisition call. For a given call, lock acquisition is atomic: The call succeeds if all locks are acquired. If acquisition of any lock fails, the call acquires no locks and fails, typically with an ER_LOCKING_SERVICE_TIMEOUT or ER_LOCKING_SERVICE_DEADLOCK error.
- A session can acquire multiple locks for the same lock identifier (namespace and lock name combination). These lock instances can be read locks, write locks, or a mix of both.
- Locks acquired within a session are released explicitly by calling a release-locks function, or implicitly when the session terminates (either normally or abnormally). Locks are not released when transactions commit or roll back.
- Within a session, all locks for a given namespace when released are released together.

The interface provided by the locking service is distinct from that provided by GET_LOCK( ) and related SQL functions (see Section 14.14, "Locking Functions"). For example, GET_LOCK( ) does not implement namespaces and provides only exclusive locks, not distinct read and write locks.

\section*{The Locking Service C Interface}

This section describes how to use the locking service C language interface. To use the function interface instead, see The Locking Service Function Interface For general characteristics of the locking service interface, see Section 7.6.9.1, "The Locking Service". For general information about plugin services, see Section 7.6.9, "MySQL Plugin Services".

Source files that use the locking service should include this header file:
\#include <mysql/service_locking.h>
To acquire one or more locks, call this function:
```
int mysql_acquire_locking_service_locks(MYSQL_THD opaque_thd,
    const char* lock_namespace,
    const char**lock_names,
    size_t lock_num,
    enum enum_locking_service_lock_type lock_type,
    unsigned long lock_timeout);
```


The arguments have these meanings:
- opaque_thd: A thread handle. If specified as NULL, the handle for the current thread is used.
- lock_namespace: A null-terminated string that indicates the lock namespace.
- lock_names: An array of null-terminated strings that provides the names of the locks to acquire.
- lock_num: The number of names in the lock_names array.
- lock_type: The lock mode, either LOCKING_SERVICE_READ or LOCKING_SERVICE_WRITE to acquire read locks or write locks, respectively.
- lock_timeout: An integer number of seconds to wait to acquire the locks before giving up.

To release locks acquired for a given namespace, call this function:
```
int mysql_release_locking_service_locks(MYSQL_THD opaque_thd,
    const char* lock_namespace);
```


The arguments have these meanings:
- opaque_thd: A thread handle. If specified as NULL, the handle for the current thread is used.
- lock_namespace: A null-terminated string that indicates the lock namespace.

Locks acquired or waited for by the locking service can be monitored at the SQL level using the Performance Schema. For details, see Locking Service Monitoring.

\section*{The Locking Service Function Interface}

This section describes how to use the locking service interface provided by its loadable functions. To use the C language interface instead, see The Locking Service C Interface For general characteristics of the locking service interface, see Section 7.6.9.1, "The Locking Service". For general information about loadable functions, see Adding a Loadable Function.
- Installing or Uninstalling the Locking Service Function Interface
- Using the Locking Service Function Interface
- Locking Service Monitoring
- Locking Service Interface Function Reference

\section*{Installing or Uninstalling the Locking Service Function Interface}

The locking service routines described in The Locking Service C Interface need not be installed because they are built into the server. The same is not true of the loadable functions that map onto calls to the service routines: The functions must be installed before use. This section describes how to do that. For general information about loadable function installation, see Section 7.7.1, "Installing and Uninstalling Loadable Functions".

The locking service functions are implemented in a plugin library file located in the directory named by the plugin_dir system variable. The file base name is locking_service. The file name suffix differs per platform (for example, . so for Unix and Unix-like systems, . dll for Windows).

To install the locking service functions, use the CREATE FUNCTION statement, adjusting the . so suffix for your platform as necessary:
```
CREATE FUNCTION service_get_read_locks RETURNS INT
    SONAME 'locking_service.so';
CREATE FUNCTION service_get_write_locks RETURNS INT
    SONAME 'locking_service.so';
CREATE FUNCTION service_release_locks RETURNS INT
    SONAME 'locking_service.so';
```


If the functions are used on a replication source server, install them on all replica servers as well to avoid replication problems.

Once installed, the functions remain installed until uninstalled. To remove them, use the DROP FUNCTION statement:
```
DROP FUNCTION service_get_read_locks;
```

```
DROP FUNCTION service_get_write_locks;
DROP FUNCTION service_release_locks;
```


\section*{Using the Locking Service Function Interface}

Before using the locking service functions, install them according to the instructions provided at Installing or Uninstalling the Locking Service Function Interface.

To acquire one or more read locks, call this function:
```
mysql> SELECT service_get_read_locks('mynamespace', 'rlock1', 'rlock2', 10);
+------------------------------------------------------------------
| service_get_read_locks('mynamespace', 'rlock1', 'rlock2', 10) |
+------------------------------------------------------------------
| 1 |
+-----------------------------------------------------------------
```


The first argument is the lock namespace. The final argument is an integer timeout indicating how many seconds to wait to acquire the locks before giving up. The arguments in between are the lock names.

For the example just shown, the function acquires locks with lock identifiers (mynamespace, rlock1) and (mynamespace, rlock2).

To acquire write locks rather than read locks, call this function:
```
mysql> SELECT service_get_write_locks('mynamespace', 'wlock1', 'wlock2', 10);
+--------------------------------------------------------------------
| service_get_write_locks('mynamespace', 'wlock1', 'wlock2', 10) |
+--------------------------------------------------------------------
| 1 |
+--------------------------------------------------------------------
```


In this case, the lock identifiers are (mynamespace, wlock1) and (mynamespace, wlock2).
To release all locks for a namespace, use this function:
```
mysql> SELECT service_release_locks('mynamespace');
+----------------------------------------+
| service_release_locks('mynamespace') |
+----------------------------------------+
| 1 |
+----------------------------------------+
```


Each locking function returns nonzero for success. If the function fails, an error occurs. For example, the following error occurs because lock names cannot be empty:
```
mysql> SELECT service_get_read_locks('mynamespace', '', 10);
ERROR 3131 (42000): Incorrect locking service lock name ''.
```


A session can acquire multiple locks for the same lock identifier. As long as a different session does not have a write lock for an identifier, the session can acquire any number of read or write locks. Each lock request for the identifier acquires a new lock. The following statements acquire three write locks with the same identifier, then three read locks for the same identifier:
```
SELECT service_get_write_locks('ns', 'lock1', 'lock1', 'lock1', 0);
SELECT service_get_read_locks('ns', 'lock1', 'lock1', 'lock1', 0);
```


If you examine the Performance Schema metadata_locks table at this point, you should find that the session holds six distinct locks with the same (ns, lock1) identifier. (For details, see Locking Service Monitoring.)

Because the session holds at least one write lock on (ns, lock1), no other session can acquire a lock for it, either read or write. If the session held only read locks for the identifier, other sessions could acquire read locks for it, but not write locks.

Locks for a single lock-acquisition call are acquired atomically, but atomicity does not hold across calls. Thus, for a statement such as the following, where service_get_write_locks() is called once per row of the result set, atomicity holds for each individual call, but not for the statement as a whole:
```
SELECT service_get_write_locks('ns', 'lock1', 'lock2', 0) FROM t1 WHERE ... ;
```


\section*{Caution}

Because the locking service returns a separate lock for each successful request for a given lock identifier, it is possible for a single statement to acquire a large number of locks. For example:

INSERT INTO ... SELECT service_get_write_locks('ns', t1.col_name, 0) FROM t1;
These types of statements may have certain adverse effects. For example, if the statement fails part way through and rolls back, locks acquired up to the point of failure still exist. If the intent is for there to be a correspondence between rows inserted and locks acquired, that intent is not satisfied. Also, if it is important that locks are granted in a certain order, be aware that result set order may differ depending on which execution plan the optimizer chooses. For these reasons, it may be best to limit applications to a single lock-acquisition call per statement.

\section*{Locking Service Monitoring}

The locking service is implemented using the MySQL Server metadata locks framework, so you monitor locking service locks acquired or waited for by examining the Performance Schema metadata_locks table.

First, enable the metadata lock instrument:
```
mysql> UPDATE performance_schema.setup_instruments SET ENABLED = 'YES'
    -> WHERE NAME = 'wait/lock/metadata/sql/mdl';
```


Then acquire some locks and check the contents of the metadata_locks table:
```
mysql> SELECT service_get_write_locks('mynamespace', 'lock1', 0);
+-------------------------------------------------------
| service_get_write_locks('mynamespace', 'lock1', 0) |
+------------------------------------------------------
| 1 |
+------------------------------------------------------
mysql> SELECT service_get_read_locks('mynamespace', 'lock2', 0);
+-----------------------------------------------------+
| service_get_read_locks('mynamespace', 'lock2', 0) |
+------------------------------------------------------
| 1 |
+------------------------------------------------------
mysql> SELECT OBJECT_TYPE, OBJECT_SCHEMA, OBJECT_NAME, LOCK_TYPE, LOCK_STATUS
        -> FROM performance_schema.metadata_locks
        -> WHERE OBJECT_TYPE = 'LOCKING SERVICE'\G
************************** 1. rOW ******************************
    OBJECT_TYPE: LOCKING SERVICE
OBJECT_SCHEMA: mynamespace
    OBJECT_NAME: lock1
        LOCK_TYPE: EXCLUSIVE
    LOCK_STATUS: GRANTED
************************** 2. row *****************************************
    OBJECT_TYPE: LOCKING SERVICE
OBJECT_SCHEMA: mynamespace
    OBJECT_NAME: lock2
        LOCK_TYPE: SHARED
    LOCK_STATUS: GRANTED
```


Locking service locks have an OBJECT_TYPE value of LOCKING SERVICE. This is distinct from, for example, locks acquired with the GET_LOCK( ) function, which have an OBJECT_TYPE of USER LEVEL LOCK.

The lock namespace, name, and mode appear in the OBJECT_SCHEMA, OBJECT_NAME, and LOCK_TYPE columns. Read and write locks have LOCK_TYPE values of SHARED and EXCLUSIVE, respectively.

The LOCK_STATUS value is GRANTED for an acquired lock, PENDING for a lock that is being waited for. You can expect to see PENDING if one session holds a write lock and another session is attempting to acquire a lock having the same identifier.

\section*{Locking Service Interface Function Reference}

The SQL interface to the locking service implements the loadable functions described in this section. For usage examples, see Using the Locking Service Function Interface.

The functions share these characteristics:
- The return value is nonzero for success. Otherwise, an error occurs.
- Namespace and lock names must be non-NULL, nonempty, and have a maximum length of 64 characters.
- Timeout values must be integers indicating how many seconds to wait to acquire locks before giving up with an error. If the timeout is 0 , there is no waiting and the function produces an error if locks cannot be acquired immediately.

These locking service functions are available:
- service_get_read_locks(namespace, lock_name[, lock_name] ..., timeout)

Acquires one or more read (shared) locks in the given namespace using the given lock names, timing out with an error if the locks are not acquired within the given timeout value.
- service_get_write_locks(namespace, lock_name[, lock_name] ..., timeout)

Acquires one or more write (exclusive) locks in the given namespace using the given lock names, timing out with an error if the locks are not acquired within the given timeout value.
- service_release_locks(namespace)

For the given namespace, releases all locks that were acquired within the current session using service_get_read_locks() and service_get_write_locks().

It is not an error for there to be no locks in the namespace.

\subsection*{7.6.9.2 The Keyring Service}

MySQL Server supports a keyring service that enables internal components and plugins to securely store sensitive information for later retrieval. MySQL distributions provide a keyring interface that is accessible at two levels:
- At the SQL level, as a set of loadable functions that each map onto calls to the service routines.
- As a C language interface, callable as a plugin service from server plugins or loadable functions.

This section describes how to use the keyring service functions to store, retrieve, and remove keys in the MySQL keyring keystore. For information about the SQL interface that uses functions, Section 8.4.4.12, "General-Purpose Keyring Key-Management Functions". For general keyring information, see Section 8.4.4, "The MySQL Keyring".

The keyring service uses whatever underlying keyring plugin is enabled, if any. If no keyring plugin is enabled, keyring service calls fail.

A "record" in the keystore consists of data (the key itself) and a unique identifier through which the key is accessed. The identifier has two parts:
- key_id: The key ID or name. key_id values that begin with mysql_are reserved by MySQL Server.
- user_id: The session effective user ID. If there is no user context, this value can be NULL. The value need not actually be a "user"; the meaning depends on the application.

Functions that implement the keyring function interface pass the value of CURRENT_USER( ) as the user_id value to keyring service functions.

The keyring service functions have these characteristics in common:
- Each function returns 0 for success, 1 for failure.
- The key_id and user_id arguments form a unique combination indicating which key in the keyring to use.
- The key_type argument provides additional information about the key, such as its encryption method or intended use.
- Keyring service functions treat key IDs, user names, types, and values as binary strings, so comparisons are case-sensitive. For example, IDs of MyKey and mykey refer to different keys.

These keyring service functions are available:
- my_key_fetch()

Deobfuscates and retrieves a key from the keyring, along with its type. The function allocates the memory for the buffers used to store the returned key and key type. The caller should zero or obfuscate the memory when it is no longer needed, then free it.

Syntax:
```
bool my_key_fetch(const char *key_id, const char **key_type,
    const char* user_id, void **key, size_t *key_len)
```


\section*{Arguments:}
- key_id, user_id: Null-terminated strings that as a pair form a unique identifier indicating which key to fetch.
- key_type: The address of a buffer pointer. The function stores into it a pointer to a nullterminated string that provides additional information about the key (stored when the key was added).
- key: The address of a buffer pointer. The function stores into it a pointer to the buffer containing the fetched key data.
- key_len: The address of a variable into which the function stores the size in bytes of the *key buffer.

Return value:
Returns 0 for success, 1 for failure.
- my_key_generate()

Generates a new random key of a given type and length and stores it in the keyring. The key has a length of key_len and is associated with the identifier formed from key_id and user_id. The type and length values must be consistent with the values supported by the underlying keyring plugin. See Section 8.4.4.10, "Supported Keyring Key Types and Lengths".

\section*{Syntax:}
```
bool my_key_generate(const char *key_id, const char *key_type,
```

```
const char *user_id, size_t key_len)
```


Arguments:
- key_id, user_id: Null-terminated strings that as a pair form a unique identifier for the key to be generated.
- key_type: A null-terminated string that provides additional information about the key.
- key_len: The size in bytes of the key to be generated.

Return value:
Returns 0 for success, 1 for failure.
- my_key_remove()

Removes a key from the keyring.
Syntax:
bool my_key_remove(const char *key_id, const char* user_id)
Arguments:
- key_id, user_id: Null-terminated strings that as a pair form a unique identifier for the key to be removed.

Return value:
Returns 0 for success, 1 for failure.
- my_key_store()

Obfuscates and stores a key in the keyring.
Syntax:
```
bool my_key_store(const char *key_id, const char *key_type,
    const char* user_id, void *key, size_t key_len)
```


\section*{Arguments:}
- key_id, user_id: Null-terminated strings that as a pair form a unique identifier for the key to be stored.
- key_type: A null-terminated string that provides additional information about the key.
- key: The buffer containing the key data to be stored.
- key_len: The size in bytes of the key buffer.

Return value:
Returns 0 for success, 1 for failure.

\subsection*{7.7 MySQL Server Loadable Functions}

MySQL supports loadable functions, that is, functions that are not built in but can be loaded at runtime (either during startup or later) to extend server capabilities, or unloaded to remove capabilities. For a table describing the available loadable functions, see Section 14.2, "Loadable Function Reference". Loadable functions contrast with built-in (native) functions, which are implemented as part of the server and are always available; for a table, see Section 14.1, "Built-In Function and Operator Reference".

\section*{Note}

Loadable functions previously were known as user-defined functions (UDFs). That terminology was something of a misnomer because "user-defined" also can apply to other types of functions, such as stored functions (a type of stored object written using SQL) and native functions added by modifying the server source code.

MySQL distributions include loadable functions that implement, in whole or in part, these server capabilities:
- Group Replication enables you to create a highly available distributed MySQL service across a group of MySQL server instances, with data consistency, conflict detection and resolution, and group membership services all built-in. See Chapter 20, Group Replication.
- MySQL Enterprise Edition includes functions that perform encryption operations based on the OpenSSL library. See Section 8.6, "MySQL Enterprise Encryption".
- MySQL Enterprise Edition includes functions that provide an SQL-level API for masking and deidentification operations. See Section 8.5, "MySQL Enterprise Data Masking and De-Identification".
- MySQL Enterprise Edition includes audit logging for monitoring and logging of connection and query activity. See Section 8.4.5, "MySQL Enterprise Audit", and Section 8.4.6, "The Audit Message Component".
- MySQL Enterprise Edition includes a firewall capability that implements an application-level firewall to enable database administrators to permit or deny SQL statement execution based on matching against patterns for accepted statement. See Section 8.4.7, "MySQL Enterprise Firewall".
- A query rewriter examines statements received by MySQL Server and possibly rewrites them before the server executes them. See Section 7.6.4, "The Rewriter Query Rewrite Plugin"
- Version Tokens enables creation of and synchronization around server tokens that applications can use to prevent accessing incorrect or out-of-date data. See Section 7.6.6, "Version Tokens".
- The MySQL Keyring provides secure storage for sensitive information. See Section 8.4.4, "The MySQL Keyring".
- A locking service provides a locking interface for application use. See Section 7.6.9.1, "The Locking Service".
- A function provides access to query attributes. See Section 11.6, "Query Attributes".

The following sections describe how to install and uninstall loadable functions, and how to determine at runtime which loadable functions are installed and obtain information about them.

In some cases, a loadable function is loaded by installing the component that implements the function, rather than by loading the function directly. For details about a particular loadable function, see the installation instructions for the server feature that includes it.

For information about writing loadable functions, see Adding Functions to MySQL.

\subsection*{7.7.1 Installing and Uninstalling Loadable Functions}

Loadable functions, as the name implies, must be loaded into the server before they can be used. MySQL supports automatic function loading during server startup and manual loading thereafter.

While a loadable function is loaded, information about it is available as described in Section 7.7.2, "Obtaining Information About Loadable Functions".
- Installing Loadable Functions
- Uninstalling Loadable Functions
- Reinstalling or Upgrading Loadable Functions

\section*{Installing Loadable Functions}

To load a loadable function manually, use the CREATE FUNCTION statement. For example:
```
CREATE FUNCTION metaphon
    RETURNS STRING
    SONAME 'udf_example.so';
```


The file base name depends on your platform. Common suffixes are . so for Unix and Unix-like systems, . dll for Windows.

CREATE FUNCTION has these effects:
- It loads the function into the server to make it available immediately.
- It registers the function in the mysql. func system table to make it persistent across server restarts. For this reason, CREATE FUNCTION requires the INSERT privilege for the mysql system database.
- It adds the function to the Performance Schema user_defined_functions table that provides runtime information about installed loadable functions. See Section 7.7.2, "Obtaining Information About Loadable Functions".

Automatic loading of loadable functions occurs during the normal server startup sequence:
- Functions registered in the mysql. func table are installed.
- Components or plugins that are installed at startup may automatically install related functions.
- Automatic function installation adds the functions to the Performance Schema user_defined_functions table that provides runtime information about installed functions.

If the server is started with the --skip-grant-tables option, functions registered in the mysql. func table are not loaded and are unavailable. This does not apply to functions installed automatically by a component or plugin.

\section*{Uninstalling Loadable Functions}

To remove a loadable function, use the DROP FUNCTION statement. For example:
DROP FUNCTION metaphon;
DROP FUNCTION has these effects:
- It unloads the function to make it unavailable.
- It removes the function from the mysql. func system table. For this reason, DROP FUNCTION requires the DELETE privilege for the mysql system database. With the function no longer registered in the mysql. func table, the server does not load the function during subsequent restarts.
- It removes the function from the Performance Schema user_defined_functions table that provides runtime information about installed loadable functions.

DROP FUNCTION cannot be used to drop a loadable function that is installed automatically by components or plugins rather than by using CREATE FUNCTION. Such a function is also dropped automatically, when the component or plugin that installed it is uninstalled.

\section*{Reinstalling or Upgrading Loadable Functions}

To reinstall or upgrade the shared library associated with a loadable function, issue a DROP FUNCTION statement, upgrade the shared library, and then issue a CREATE FUNCTION statement. If you upgrade the shared library first and then use DROP FUNCTION, the server may unexpectedly shut down.

\subsection*{7.7.2 Obtaining Information About Loadable Functions}

The Performance Schema user_defined_functions table contains information about the currently installed loadable functions:

SELECT * FROM performance_schema.user_defined_functions;
The mysql. func system table also lists installed loadable functions, but only those installed using CREATE FUNCTION. The user_defined_functions table lists loadable functions installed using CREATE FUNCTION as well as loadable functions installed automatically by components or plugins. This difference makes user_defined_functions preferable to mysql.func for checking which loadable functions are installed. See Section 29.12.22.10, "The user_defined_functions Table".

\subsection*{7.8 Running Multiple MySQL Instances on One Machine}

In some cases, you might want to run multiple instances of MySQL on a single machine. You might want to test a new MySQL release while leaving an existing production setup undisturbed. Or you might want to give different users access to different mysqld servers that they manage themselves. (For example, you might be an Internet Service Provider that wants to provide independent MySQL installations for different customers.)

It is possible to use a different MySQL server binary per instance, or use the same binary for multiple instances, or any combination of the two approaches. For example, you might run a server from MySQL 8.3 and one from MySQL 8.4, to see how different versions handle a given workload. Or you might run multiple instances of the current production version, each managing a different set of databases.

Whether or not you use distinct server binaries, each instance that you run must be configured with unique values for several operating parameters. This eliminates the potential for conflict between instances. Parameters can be set on the command line, in option files, or by setting environment variables. See Section 6.2.2, "Specifying Program Options". To see the values used by a given instance, connect to it and execute a SHOW VARIABLES statement.

The primary resource managed by a MySQL instance is the data directory. Each instance should use a different data directory, the location of which is specified using the --datadir=dir_name option. For methods of configuring each instance with its own data directory, and warnings about the dangers of failing to do so, see Section 7.8.1, "Setting Up Multiple Data Directories".

In addition to using different data directories, several other options must have different values for each server instance:
- --port=port_num
--port controls the port number for TCP/IP connections. Alternatively, if the host has multiple network addresses, you can set the bind_address system variable to cause each server to listen to a different address.
- --socket=\{file_name|pipe_name\}
--socket controls the Unix socket file path on Unix or the named-pipe name on Windows. On Windows, it is necessary to specify distinct pipe names only for those servers configured to permit named-pipe connections.
- --shared-memory-base-name=name

This option is used only on Windows. It designates the shared-memory name used by a Windows server to permit clients to connect using shared memory. It is necessary to specify distinct sharedmemory names only for those servers configured to permit shared-memory connections.
- --pid-file=file_name

This option indicates the path name of the file in which the server writes its process ID.
If you use the following log file options, their values must differ for each server:
```
- --general_log_file=file_name
- --log-bin[=file_name]
- --slow_query_log_file=file_name
- --log-error[=file_name]
```


For further discussion of log file options, see Section 7.4, "MySQL Server Logs".
To achieve better performance, you can specify the following option differently for each server, to spread the load between several physical disks:
- --tmpdir=dir_name

Having different temporary directories also makes it easier to determine which MySQL server created any given temporary file.

If you have multiple MySQL installations in different locations, you can specify the base directory for each installation with the --basedir=dir_name option. This causes each instance to automatically use a different data directory, log files, and PID file because the default for each of those parameters is relative to the base directory. In that case, the only other options you need to specify are the - socket and --port options. Suppose that you install different versions of MySQL using tar file binary distributions. These install in different locations, so you can start the server for each installation using the command bin/mysqld_safe under its corresponding base directory. mysqld_safe determines the proper - - basedir option to pass to mysqld, and you need specify only the - socket and --port options to mysqld_safe.

As discussed in the following sections, it is possible to start additional servers by specifying appropriate command options or by setting environment variables. However, if you need to run multiple servers on a more permanent basis, it is more convenient to use option files to specify for each server those option values that must be unique to it. The --defaults-file option is useful for this purpose.

\subsection*{7.8.1 Setting Up Multiple Data Directories}

Each MySQL Instance on a machine should have its own data directory. The location is specified using the --datadir=dir_name option.

There are different methods of setting up a data directory for a new instance:
- Create a new data directory.
- Copy an existing data directory.

The following discussion provides more detail about each method.

\section*{Warning}

Normally, you should never have two servers that update data in the same databases. This may lead to unpleasant surprises if your operating system does not support fault-free system locking. If (despite this warning) you run multiple servers using the same data directory and they have logging enabled, you must use the appropriate options to specify log file names that are unique to each server. Otherwise, the servers try to log to the same files.

Even when the preceding precautions are observed, this kind of setup works only with MyISAM and MERGE tables, and not with any of the other storage engines. Also, this warning against sharing a data directory among servers
> always applies in an NFS environment. Permitting multiple MySQL servers to access a common data directory over NFS is a very bad idea. The primary problem is that NFS is the speed bottleneck. It is not meant for such use. Another risk with NFS is that you must devise a way to ensure that two or more servers do not interfere with each other. Usually NFS file locking is handled by the lockd daemon, but at the moment there is no platform that performs locking 100\% reliably in every situation.

\section*{Create a New Data Directory}

With this method, the data directory is in the same state as when you first install MySQL, and has the default set of MySQL accounts and no user data.

On Unix, initialize the data directory. See Section 2.9, "Postinstallation Setup and Testing".
On Windows, the data directory is included in the MySQL distribution:
- MySQL Zip archive distributions for Windows contain an unmodified data directory. You can unpack such a distribution into a temporary location, then copy it data directory to where you are setting up the new instance.
- Windows MSI package installers create and set up the data directory that the installed server uses, but also create a pristine "template" data directory named data under the installation directory. After an installation has been performed using an MSI package, the template data directory can be copied to set up additional MySQL instances.

\section*{Copy an Existing Data Directory}

With this method, any MySQL accounts or user data present in the data directory are carried over to the new data directory.
1. Stop the existing MySQL instance using the data directory. This must be a clean shutdown so that the instance flushes any pending changes to disk.
2. Copy the data directory to the location where the new data directory should be.
3. Copy the my.cnf or my.ini option file used by the existing instance. This serves as a basis for the new instance.
4. Modify the new option file so that any pathnames referring to the original data directory refer to the new data directory. Also, modify any other options that must be unique per instance, such as the TCP/IP port number and the log files. For a list of parameters that must be unique per instance, see Section 7.8, "Running Multiple MySQL Instances on One Machine".
5. Start the new instance, telling it to use the new option file.

\subsection*{7.8.2 Running Multiple MySQL Instances on Windows}

You can run multiple servers on Windows by starting them manually from the command line, each with appropriate operating parameters, or by installing several servers as Windows services and running them that way. General instructions for running MySQL from the command line or as a service are given in Section 2.3, "Installing MySQL on Microsoft Windows". The following sections describe how to start each server with different values for those options that must be unique per server, such as the data directory. These options are listed in Section 7.8, "Running Multiple MySQL Instances on One Machine".

\subsection*{7.8.2.1 Starting Multiple MySQL Instances at the Windows Command Line}

The procedure for starting a single MySQL server manually from the command line is described in Section 2.3.3.6, "Starting MySQL from the Windows Command Line". To start multiple servers this way, you can specify the appropriate options on the command line or in an option file. It is more convenient to place the options in an option file, but it is necessary to make sure that each server gets its own set
of options. To do this, create an option file for each server and tell the server the file name with a - -defaults-file option when you run it.

Suppose that you want to run one instance of mysqld on port 3307 with a data directory of C: \mydata1, and another instance on port 3308 with a data directory of C: \mydata2. Use this procedure:
1. Make sure that each data directory exists, including its own copy of the mysql database that contains the grant tables.
2. Create two option files. For example, create one file named $\mathrm{C}: \backslash \mathrm{my}$-opts1.cnf that looks like this:
```
[mysqld]
datadir = C:/mydata1
port = 3307
```


Create a second file named C: \my-opts2.cnf that looks like this:
```
[mysqld]
datadir = C:/mydata2
port = 3308
```

3. Use the--defaults-file option to start each server with its own option file:
```
C:\> C:\mysql\bin\mysqld --defaults-file=C:\my-opts1.cnf
C:\> C:\mysql\bin\mysqld --defaults-file=C:\my-opts2.cnf
```


Each server starts in the foreground (no new prompt appears until the server exits later), so you need to issue those two commands in separate console windows.

To shut down the servers, connect to each using the appropriate port number:
```
C:\> C:\mysql\bin\mysqladmin --port=3307 --host=127.0.0.1 --user=root --password shutdown
C:\> C:\mysql\bin\mysqladmin --port=3308 --host=127.0.0.1 --user=root --password shutdown
```


Servers configured as just described permit clients to connect over TCP/IP. If your version of Windows supports named pipes and you also want to permit named-pipe connections, specify options that enable the named pipe and specify its name. Each server that supports named-pipe connections must use a unique pipe name. For example, the $\mathrm{C}: \backslash$ my-opts1.cnf file might be written like this:
```
[mysqld]
datadir = C:/mydata1
port = 3307
enable-named-pipe
socket = mypipe1
```


Modify C : \my-opts2.cnf similarly for use by the second server. Then start the servers as described previously.

A similar procedure applies for servers that you want to permit shared-memory connections. Enable such connections by starting the server with the shared_memory system variable enabled and specify a unique shared-memory name for each server by setting the shared_memory_base_name system variable.

\subsection*{7.8.2.2 Starting Multiple MySQL Instances as Windows Services}

On Windows, a MySQL server can run as a Windows service. The procedures for installing, controlling, and removing a single MySQL service are described in Section 2.3.3.8, "Starting MySQL as a Windows Service".

To set up multiple MySQL services, you must make sure that each instance uses a different service name in addition to the other parameters that must be unique per instance.

For the following instructions, suppose that you want to run the mysqld server from two different versions of MySQL that are installed at C: \mysql-5.7.9 and C: \mysql-8.4.9, respectively. (This
might be the case if you are running 5.7.9 as your production server, but also want to conduct tests using 8.4.9.)

To install MySQL as a Windows service, use the --install or --install-manual option. For information about these options, see Section 2.3.3.8, "Starting MySQL as a Windows Service".

Based on the preceding information, you have several ways to set up multiple services. The following instructions describe some examples. Before trying any of them, shut down and remove any existing MySQL services.
- Approach 1: Specify the options for all services in one of the standard option files. To do this, use a different service name for each server. Suppose that you want to run the 5.7.9 mysqld using the service name of mysqld1 and the 8.4.9 mysqld using the service name mysqld2. In this case, you can use the [mysqld1] group for 5.7.9 and the [mysqld2] group for 8.4.9. For example, you can set up C: \my.cnf like this:
```
# options for mysqld1 service
[mysqld1]
basedir = C:/mysql-5.7.9
port = 3307
enable-named-pipe
socket = mypipe1
# options for mysqld2 service
[mysqld2]
basedir = C:/mysql-8.4.9
port = 3308
enable-named-pipe
socket = mypipe2
```


Install the services as follows, using the full server path names to ensure that Windows registers the correct executable program for each service:
```
C:\> C:\mysql-5.7.9\bin\mysqld --install mysqld1
C:\> C:\mysql-8.4.9\bin\mysqld --install mysqld2
```


To start the services, use the services manager, or NET START or SC START with the appropriate service names:
```
C:\> SC START mysqld1
C:\> SC START mysqld2
```


To stop the services, use the services manager, or use NET STOP or SC STOP with the appropriate service names:
```
C:\> SC STOP mysqld1
C:\> SC STOP mysqld2
```

- Approach 2: Specify options for each server in separate files and use --defaults-file when you install the services to tell each server what file to use. In this case, each file should list options using a [mysqld] group.

With this approach, to specify options for the 5.7.9 mysqld, create a file C: \my-opts1.cnf that looks like this:
```
[mysqld]
basedir = C:/mysql-5.7.9
port = 3307
enable-named-pipe
socket = mypipe1
```


For the 8.4.9 mysqld, create a file $\mathrm{C}: \backslash \mathrm{my}$-opts2.cnf that looks like this:
```
[mysqld]
basedir = C:/mysql-8.4.9
port = 3308
enable-named-pipe
```

```
socket = mypipe2
```


Install the services as follows (enter each command on a single line):
```
C:\> C:\mysql-5.7.9\bin\mysqld --install mysqld1
    --defaults-file=C:\my-opts1.cnf
C:\> C:\mysql-8.4.9\bin\mysqld --install mysqld2
    --defaults-file=C:\my-opts2.cnf
```


When you install a MySQL server as a service and use a--defaults-file option, the service name must precede the option.

After installing the services, start and stop them the same way as in the preceding example.
To remove multiple services, use SC DELETE mysqld_service_name for each one. Alternatively, use mysqld --remove for each one, specifying a service name following the --remove option. If the service name is the default (MySQL), you can omit it when using mysqld --remove.

\subsection*{7.8.3 Running Multiple MySQL Instances on Unix}
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1138.jpg?height=113&width=94&top_left_y=991&top_left_x=306)

\section*{Note}

The discussion here uses mysqld_safe to launch multiple instances of MySQL. For MySQL installation using an RPM distribution, server startup and shutdown is managed by systemd on several Linux platforms. On these platforms, mysqld_safe is not installed because it is unnecessary. For information about using systemd to handle multiple MySQL instances, see Section 2.5.9, "Managing MySQL Server with systemd".

One way is to run multiple MySQL instances on Unix is to compile different servers with different default TCP/IP ports and Unix socket files so that each one listens on different network interfaces. Compiling in different base directories for each installation also results automatically in a separate, compiled-in data directory, log file, and PID file location for each server.

Assume that an existing 8.3 server is configured for the default TCP/IP port number (3306) and Unix socket file (/tmp/mysql.sock). To configure a new 8.4.9 server to have different operating parameters, use a CMake command something like this:
```
$> cmake . -DMYSQL_TCP_PORT=port_number \
    -DMYSQL_UNIX_ADDR=file_name \
    -DCMAKE_INSTALL_PREFIX=/usr/local/mysql-8.4.9
```


Here, port_number and file_name must be different from the default TCP/IP port number and Unix socket file path name, and the CMAKE_INSTALL_PREFIX value should specify an installation directory different from the one under which the existing MySQL installation is located.

If you have a MySQL server listening on a given port number, you can use the following command to find out what operating parameters it is using for several important configurable variables, including the base directory and Unix socket file name:
\$> mysqladmin --host=host_name --port=port_number variables
With the information displayed by that command, you can tell what option values not to use when configuring an additional server.

If you specify localhost as the host name, mysqladmin defaults to using a Unix socket file rather than TCP/IP. To explicitly specify the transport protocol, use the --protocol=\{TCP|SOCKET|PIPE| MEMORY\} option.

You need not compile a new MySQL server just to start with a different Unix socket file and TCP/IP port number. It is also possible to use the same server binary and start each invocation of it with different parameter values at runtime. One way to do so is by using command-line options:
```
$> mysqld_safe --socket=file_name --port=port_number
```


To start a second server, provide different --socket and --port option values, and pass a-datadir=dir_name option to mysqld_safe so that the server uses a different data directory.

Alternatively, put the options for each server in a different option file, then start each server using a --defaults-file option that specifies the path to the appropriate option file. For example, if the option files for two server instances are named /usr/local/mysql/my.cnf and /usr/local/mysql/ my.cnf2, start the servers like this: command:
```
$> mysqld_safe --defaults-file=/usr/local/mysql/my.cnf
$> mysqld_safe --defaults-file=/usr/local/mysql/my.cnf2
```


Another way to achieve a similar effect is to use environment variables to set the Unix socket file name and TCP/IP port number:
```
$> MYSQL_UNIX_PORT=/tmp/mysqld-new.sock
$> MYSQL_TCP_PORT=3307
$> export MYSQL_UNIX_PORT MYSQL_TCP_PORT
$> bin/mysqld --initialize --user=mysql
$> mysqld_safe --datadir=/path/to/datadir &
```


This is a quick way of starting a second server to use for testing. The nice thing about this method is that the environment variable settings apply to any client programs that you invoke from the same shell. Thus, connections for those clients are automatically directed to the second server.

Section 6.9, "Environment Variables", includes a list of other environment variables you can use to affect MySQL programs.

On Unix, the mysqld_multi script provides another way to start multiple servers. See Section 6.3.4, "mysqld_multi - Manage Multiple MySQL Servers".

\subsection*{7.8.4 Using Client Programs in a Multiple-Server Environment}

To connect with a client program to a MySQL server that is listening to different network interfaces from those compiled into your client, you can use one of the following methods:
- Start the client with --host=host_name --port=port_number to connect using TCP/IP to a remote server, with --host=127.0.0.1--port=port_number to connect using TCP/IP to a local server, or with --host=localhost --socket=file_name to connect to a local server using a Unix socket file or a Windows named pipe.
- Start the client with - - protocol=TCP to connect using TCP/IP, --protocol=SOCKET to connect using a Unix socket file, --protocol=PIPE to connect using a named pipe, or -protocol=MEMORY to connect using shared memory. For TCP/IP connections, you may also need to specify - - host and - - port options. For the other types of connections, you may need to specify a --socket option to specify a Unix socket file or Windows named-pipe name, or a --shared-memory-base-name option to specify the shared-memory name. Shared-memory connections are supported only on Windows.
- On Unix, set the MYSQL_UNIX_PORT and MYSQL_TCP_PORT environment variables to point to the Unix socket file and TCP/IP port number before you start your clients. If you normally use a specific socket file or port number, you can place commands to set these environment variables in your . login file so that they apply each time you log in. See Section 6.9, "Environment Variables".
- Specify the default Unix socket file and TCP/IP port number in the [client] group of an option file. For example, you can use C: \my.cnf on Windows, or the .my.cnf file in your home directory on Unix. See Section 6.2.2.2, "Using Option Files".
- In a C program, you can specify the socket file or port number arguments in the mysql_real_connect ( ) call. You can also have the program read option files by calling mysql_options(). See C API Basic Function Descriptions.
- If you are using the Perl DBD : : mysql module, you can read options from MySQL option files. For example:
```
$dsn = "DBI:mysql:test;mysql_read_default_group=client;"
    "mysql_read_default_file=/usr/local/mysql/data/my.cnf";
$dbh = DBI->connect($dsn, $user, $password);
```


See Section 31.9, "MySQL Perl API".
Other programming interfaces may provide similar capabilities for reading option files.

\subsection*{7.9 Debugging MySQL}

This section describes debugging techniques that assist efforts to track down problems in MySQL.

\subsection*{7.9.1 Debugging a MySQL Server}

If you are using some functionality that is very new in MySQL , you can try to run mysqld with the - -skip-new option (which disables all new, potentially unsafe functionality). See Section B.3.3.3, "What to Do If MySQL Keeps Crashing".

If mysqld does not want to start, verify that you have no my.cnf files that interfere with your setup! You can check your my.cnf arguments with mysqld --print-defaults and avoid using them by starting with mysqld --no-defaults ....

If mysqld starts to eat up CPU or memory or if it "hangs," you can use mysqladmin processlist status to find out if someone is executing a query that takes a long time. It may be a good idea to run mysqladmin -i10 processlist status in some window if you are experiencing performance problems or problems when new clients cannot connect.

The command mysqladmin debug dumps some information about locks in use, used memory and query usage to the MySQL log file. This may help solve some problems. This command also provides some useful information even if you have not compiled MySQL for debugging!

If the problem is that some tables are getting slower and slower you should try to optimize the table with OPTIMIZE TABLE or myisamchk. See Chapter 7, MySQL Server Administration. You should also check the slow queries with EXPLAIN.

You should also read the OS-specific section in this manual for problems that may be unique to your environment. See Section 2.1, "General Installation Guidance".

\subsection*{7.9.1.1 Compiling MySQL for Debugging}

If you have some very specific problem, you can always try to debug MySQL. To do this you must configure MySQL with the - DWITH_DEBUG=1 option. You can check whether MySQL was compiled with debugging by doing: mysqld --help. If the --debug flag is listed with the options then you have debugging enabled. mysqladmin ver also lists the mysqld version as mysql ... --debug in this case.

If mysqld stops crashing when you configure it with the -DWITH_DEBUG=1 CMake option, you probably have found a compiler bug or a timing bug within MySQL. In this case, you can try to add -g using the CMAKE_C_FLAGS and CMAKE_CXX_FLAGS CMake options and not use -DWITH_DEBUG=1. If mysqld dies, you can at least attach to it with gdb or use gdb on the core file to find out what happened.

When you configure MySQL for debugging you automatically enable a lot of extra safety check functions that monitor the health of mysqld. If they find something "unexpected," an entry is written to stderr, which mysqld_safe directs to the error log! This also means that if you are having some unexpected problems with MySQL and are using a source distribution, the first thing you should do is to configure MySQL for debugging. If you believe that you have found a bug, please use the instructions at Section 1.6, "How to Report Bugs or Problems".

In the Windows MySQL distribution, mysqld.exe is by default compiled with support for trace files.

\subsection*{7.9.1.2 Creating Trace Files}

If the mysqld server does not start or it crashes easily, you can try to create a trace file to find the problem.

To do this, you must have a mysqld that has been compiled with debugging support. You can check this by executing mysqld -V. If the version number ends with -debug, it is compiled with support for trace files. (On Windows, the debugging server is named mysqld-debug rather than mysqld.)

Start the mysqld server with a trace log in /tmp/mysqld.trace on Unix or \mysqld.trace on Windows:
```
$> mysqld --debug
```


On Windows, you should also use the --standalone flag to not start mysqld as a service. In a console window, use this command:
```
C:\> mysqld-debug --debug --standalone
```


After this, you can use the mysql.exe command-line tool in a second console window to reproduce the problem. You can stop the mysqld server with mysqladmin shutdown.

The trace file can become very large! To generate a smaller trace file, you can use debugging options something like this:
mysqld --debug=d,info,error,query,general,where:o,/tmp/mysqld.trace
This only prints information with the most interesting tags to the trace file.
If you file a bug, please add only those lines from the trace file to the bug report that indicate where something seems to go wrong. If you cannot locate the wrong place, open a bug report and upload the whole trace file to the report, so that a MySQL developer can take a look at it. For instructions, see Section 1.6, "How to Report Bugs or Problems".

The trace file is made with the DBUG package by Fred Fish. See Section 7.9.4, "The DBUG Package".

\subsection*{7.9.1.3 Using WER with PDB to create a Windows crashdump}

Program Database files (with suffix pdb) are included in the ZIP Archive Debug Binaries \& Test Suite distribution of MySQL. These files provide information for debugging your MySQL installation in the event of a problem. This is a separate download from the standard MSI or Zip file.

\section*{Note}

The PDB files are available in a separate file labeled "ZIP Archive Debug Binaries \& Test Suite".

The PDB file contains more detailed information about mysqld and other tools that enables more detailed trace and dump files to be created. You can use these with WinDbg or Visual Studio to debug mysqld.

For more information on PDB files and the debugging options available, see Debugging Tools for Windows.

To use WinDbg, either install the full Windows Driver Kit (WDK) or install the standalone version.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1141.jpg?height=118&width=106&top_left_y=2352&top_left_x=365)

\section*{Important}

The .exe and .pdb files must be an exact match (both version number and MySQL server edition); otherwise, or WinDBG complains while attempting to load the symbols.
1. To generate a minidump mysqld.dmp, enable the core-file option under the [mysqld] section in my.ini. Restart the MySQL server after making these changes.
2. Create a directory to store the generated files, such as $\mathrm{c}: \backslash$ symbols
3. Determine the path to your windbg. exe executable using the Find GUI or from the command line, for example: dir /s /b windbg.exe -- a common default is C:|Program Files\Debugging Tools for Windows (x64)lwindbg.exe
4. Launch windbg.exe giving it the paths to mysqld.exe, mysqld.pdb, mysqld.dmp, and the source code. Alternatively, pass in each path from the WinDbg GUI. For example:
```
windbg.exe -i "C:\mysql-8.4.9-winx64\bin\"^
    -z "C:\mysql-8.4.9-winx64\data\mysqld.dmp"^
    -srcpath "E:\ade\mysql_archives\8.4\8.4.9\mysql-8.4.9"^
    -y "C:\mysql-8.4.9-winx64\bin;SRV*c:\symbols*http://msdl.microsoft.com/download/symbols"^
    -v -n -c "!analyze -vvvvv"
```


\section*{Note}

The ^ character and newline are removed by the Windows command line processor, so be sure the spaces remain intact.

\subsection*{7.9.1.4 Debugging mysqld under gdb}

On most systems you can also start mysqld from gdb to get more information if mysqld crashes.
With some older gdb versions on Linux you must use run --one-thread if you want to be able to debug mysqld threads. In this case, you can only have one thread active at a time.

NPTL threads (the new thread library on Linux) may cause problems while running mysqld under gdb. Some symptoms are:
- mysqld hangs during startup (before it writes ready for connections).
- mysqld crashes during a pthread_mutex_lock() or pthread_mutex_unlock() call.

In this case, you should set the following environment variable in the shell before starting gdb:
```
LD_ASSUME_KERNEL=2.4.1
export LD_ASSUME_KERNEL
```


When running mysqld under gdb, you should disable the stack trace with--skip-stack-trace to be able to catch segfaults within gdb.

Use the --gdb option to mysqld to install an interrupt handler for SIGINT (needed to stop mysqld with $\wedge \mathrm{C}$ to set breakpoints) and disable stack tracing and core file handling.

It is very hard to debug MySQL under gdb if you do a lot of new connections the whole time as gdb does not free the memory for old threads. You can avoid this problem by starting mysqld with thread_cache_size set to a value equal to max_connections +1 . In most cases just using - thread_cache_size=5' helps a lot!

If you want to get a core dump on Linux if mysqld dies with a SIGSEGV signal, you can start mysqld with the--core-file option. This core file can be used to make a backtrace that may help you find out why mysqld died:
```
$> gdb mysqld core
gdb> backtrace full
gdb> quit
```


See Section B.3.3.3, "What to Do If MySQL Keeps Crashing".
If you are using gdb on Linux, you should install a . gdb file, with the following information, in your current directory:
```
set print sevenbit off
handle SIGUSR1 nostop noprint
handle SIGUSR2 nostop noprint
```

```
handle SIGWAITING nostop noprint
handle SIGLWP nostop noprint
handle SIGPIPE nostop
handle SIGALRM nostop
handle SIGHUP nostop
handle SIGTERM nostop noprint
```


Here is an example how to debug mysqld:
```
$> gdb /usr/local/libexec/mysqld
gdb> run
...
backtrace full # Do this when mysqld crashes
```


Include the preceding output in a bug report, which you can file using the instructions in Section 1.6, "How to Report Bugs or Problems".

If mysqld hangs, you can try to use some system tools like strace or /usr/proc/bin/pstack to examine where mysqld has hung.
```
strace /tmp/log libexec/mysqld
```


If you are using the Perl DBI interface, you can turn on debugging information by using the trace method or by setting the DBI_TRACE environment variable.

\subsection*{7.9.1.5 Using a Stack Trace}

On some operating systems, the error log contains a stack trace if mysqld dies unexpectedly. You can use this to find out where (and maybe why) mysqld died. See Section 7.4.2, "The Error Log". To get a stack trace, you must not compile mysqld with the -fomit-frame-pointer option to gcc. See Section 7.9.1.1, "Compiling MySQL for Debugging".

A stack trace in the error log looks something like this:
```
mysqld got signal 11;
Attempting backtrace. You can use the following information
to find out where mysqld died. If you see no messages after
this, something went terribly wrong...
stack_bottom = 0x41fd0110 thread_stack 0x40000
mysqld(my_print_stacktrace+0x32)[0x9da402]
mysqld(handle_segfault+0x28a)[0x6648e9]
/lib/libpthread.so.0[0x7f1a5af000f0]
/lib/libc.so.6(strcmp+0x2)[0x7f1a5a10f0f2]
mysqld(_Z21check_change_passwordP3THDPKcS2_Pcj+0x7c)[0x7412cb]
mysqld(_ZN16set_var_password5checkEP3THD+0xd0)[0x688354]
mysqld(_Z17sql_set_variablesP3THDP4ListI12set_var_baseE+0x68)[0x688494]
mysqld(_Z21mysql_execute_commandP3THD+0x41a0)[0x67a170]
mysqld(_Z11mysql_parseP3THDPKcjPS2_+0x282)[0x67f0ad]
mysqld(_Z16dispatch_command19enum_server_commandP3THDPcj+0xbb7[0x67fdf8]
mysqld(_Z10do_commandP3THD+0x24d)[0x6811b6]
mysqld(handle_one_connection+0x11c)[0x66e05e]
```


If resolution of function names for the trace fails, the trace contains less information:
```
mysqld got signal 11;
Attempting backtrace. You can use the following information
to find out where mysqld died. If you see no messages after
this, something went terribly wrong...
stack_bottom = 0x41fd0110 thread_stack 0x40000
[0x9da402]
[0x6648e9]
[0x7f1a5af000f0]
[0x7f1a5a10f0f2]
[0x7412cb]
[0x688354]
[0x688494]
[0x67a170]
```

```
[0x67f0ad]
[0x67fdf8]
[0x6811b6]
[0x66e05e]
```


Newer versions of glibc stack trace functions also print the address as relative to the object. On glibc-based systems (Linux), the trace for an unexpected exit within a plugin looks something like:
```
plugin/auth/auth_test_plugin.so(+0x9a6)[0x7ff4d11c29a6]
```


To translate the relative address (+0x9a6) into a file name and line number, use this command:
```
$> addr2line -fie auth_test_plugin.so 0x9a6
auth_test_plugin
mysql-trunk/plugin/auth/test_plugin.c:65
```


The addr2line utility is part of the binutils package on Linux.
On Solaris, the procedure is similar. The Solaris printstack( ) already prints relative addresses:
```
plugin/auth/auth_test_plugin.so:0x1510
```


To translate, use this command:
```
$> gaddr2line -fie auth_test_plugin.so 0x1510
mysql-trunk/plugin/auth/test_plugin.c:88
```


Windows already prints the address, function name and line:
```
000007FEF07E10A4 auth_test_plugin.dll!auth_test_plugin()[test_plugin.c:72]
```


\subsection*{7.9.1.6 Using Server Logs to Find Causes of Errors in mysqld}

Note that before starting mysqld with the general query log enabled, you should check all your tables with myisamchk. See Chapter 7, MySQL Server Administration.

If mysqld dies or hangs, you should start mysqld with the general query log enabled. See Section 7.4.3, "The General Query Log". When mysqld dies again, you can examine the end of the log file for the query that killed mysqld.

If you use the default general query log file, the log is stored in the database directory as host_name. log In most cases it is the last query in the log file that killed mysqld, but if possible you should verify this by restarting mysqld and executing the found query from the mysql command-line tools. If this works, you should also test all complicated queries that did not complete.

You can also try the command EXPLAIN on all SELECT statements that takes a long time to ensure that mysqld is using indexes properly. See Section 15.8.2, "EXPLAIN Statement".

You can find the queries that take a long time to execute by starting mysqld with the slow query log enabled. See Section 7.4.5, "The Slow Query Log".

If you find the text mysqld restarted in the error log (normally a file named host_name.err) you probably have found a query that causes mysqld to fail. If this happens, you should check all your tables with myisamchk (see Chapter 7, MySQL Server Administration), and test the queries in the MySQL log files to see whether one fails. If you find such a query, try first upgrading to the newest MySQL version. If this does not help, report a bug, see Section 1.6, "How to Report Bugs or Problems".

If you have started mysqld with the myisam_recover_options system variable set, MySQL automatically checks and tries to repair MyISAM tables if they are marked as 'not closed properly' or 'crashed'. If this happens, MySQL writes an entry in the hostname.err file 'Warning: Checking table . . . ' which is followed by Warning: Repairing table if the table needs to be repaired. If you get a lot of these errors, without mysqld having died unexpectedly just before, then something is wrong and needs to be investigated further. See Section 7.1.7, "Server Command Options".

When the server detects MyISAM table corruption, it writes additional information to the error log, such as the name and line number of the source file, and the list of threads accessing the table. Example:

Got an error from thread_id=1, mi_dynrec.c:368. This is useful information to include in bug reports.

It is not a good sign if mysqld did die unexpectedly, but in this case, you should not investigate the Checking table... messages, but instead try to find out why mysqld died.

\subsection*{7.9.1.7 Making a Test Case If You Experience Table Corruption}

The following procedure applies to MyISAM tables. For information about steps to take when encountering InnoDB table corruption, see Section 1.6, "How to Report Bugs or Problems".

If you encounter corrupted MyISAM tables or if mysqld always fails after some update statements, you can test whether the issue is reproducible by doing the following:
1. Stop the MySQL daemon with mysqladmin shutdown.
2. Make a backup of the tables to guard against the very unlikely case that the repair does something bad.
3. Check all tables with myisamchk -s database/*.MYI. Repair any corrupted tables with myisamchk -r database/table.MYI.
4. Make a second backup of the tables.
5. Remove (or move away) any old log files from the MySQL data directory if you need more space.
6. Start mysqld with the binary log enabled. If you want to find a statement that crashes mysqld, you should start the server with the general query log enabled as well. See Section 7.4.3, "The General Query Log", and Section 7.4.4, "The Binary Log".
7. When you have gotten a crashed table, stop the mysqld server.
8. Restore the backup.
9. Restart the mysqld server without the binary log enabled.
10. Re-execute the statements with mysqlbinlog binary-log-file | mysql. The binary log is saved in the MySQL database directory with the name hostname-bin. NNNNNN.
11. If the tables are corrupted again or you can get mysqld to die with the above command, you have found a reproducible bug. FTP the tables and the binary log to our bugs database using the instructions given in Section 1.6, "How to Report Bugs or Problems". If you are a support customer, you can use the MySQL Customer Support Center (https://www.mysql.com/support/) to alert the MySQL team about the problem and have it fixed as soon as possible.

\subsection*{7.9.2 Debugging a MySQL Client}

To be able to debug a MySQL client with the integrated debug package, you should configure MySQL with - DWITH_DEBUG=1. See Section 2.8.7, "MySQL Source-Configuration Options".

Before running a client, you should set the MYSQL_DEBUG environment variable:
```
$> MYSQL_DEBUG=d:t:O,/tmp/client.trace
$> export MYSQL_DEBUG
```


This causes clients to generate a trace file in / tmp/client. trace.
If you have problems with your own client code, you should attempt to connect to the server and run your query using a client that is known to work. Do this by running mysql in debugging mode (assuming that you have compiled MySQL with debugging on):
```
$> mysql --debug=d:t:O,/tmp/client.trace
```


This provides useful information in case you mail a bug report. See Section 1.6, "How to Report Bugs or Problems".

If your client crashes at some 'legal' looking code, you should check that your mysql. h include file matches your MySQL library file. A very common mistake is to use an old mysql.h file from an old MySQL installation with new MySQL library.

\subsection*{7.9.3 The LOCK_ORDER Tool}

The MySQL server is a multithreaded application that uses numerous internal locking and lock-related primitives, such as mutexes, rwlocks (including prlocks and sxlocks), conditions, and files. Within the server, the set of lock-related objects changes with implementation of new features and code refactoring for performance improvements. As with any multithreaded application that uses locking primitives, there is always a risk of encountering a deadlock during execution when multiple locks are held at once. For MySQL, the effect of a deadlock is catastrophic, causing a complete loss of service.

To enable detection of lock-acquisition deadlocks and enforcement that runtime execution is free of them, MySQL supports LOCK_ORDER tooling. This enables a lock-order dependency graph to be defined as part of server design, and server runtime checking to ensure that lock acquisition is acyclic and that execution paths comply with the graph.

This section provides information about using the LOCK_ORDER tool, but only at a basic level. For complete details, see the Lock Order section of the MySQL Server Doxygen documentation, available at https://dev.mysql.com/doc/index-other.html.

The LOCK_ORDER tool is intended for debugging the server, not for production use.
To use the LOCK_ORDER tool, follow this procedure:
1. Build MySQL from source, configuring it with the -DWITH_LOCK_ORDER=ON CMake option so that the build includes LOCK_ORDER tooling.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1146.jpg?height=108&width=102&top_left_y=1425&top_left_x=360)

\section*{Note}

With the WITH_LOCK_ORDER option enabled, MySQL builds require the flex program.
2. To run the server with the LOCK_ORDER tool enabled, enable the lock_order system variable at server startup. Several other system variables for LOCK_ORDER configuration are available as well.
3. For MySQL test suite operation, mysql-test-run.pl has a--lock-order option that controls whether to enable the LOCK_ORDER tool during test case execution.

The system variables described following configure operation of the LOCK_ORDER tool, assuming that MySQL has been built to include LOCK_ORDER tooling. The primary variable is lock_order, which indicates whether to enable the LOCK_ORDER tool at runtime:
- If lock_order is disabled (the default), no other LOCK_ORDER system variables have any effect.
- If lock_order is enabled, the other system variables configure which LOCK_ORDER features to enable.

\section*{Note}

In general, it is intended that the LOCK_ORDER tool be configured by executing mysql-test-run.pl with the --lock-order option, and for mysql-testrun.pl to set LOCK_ORDER system variables to appropriate values.

All LOCK_ORDER system variables must be set at server startup. At runtime, their values are visible but cannot be changed.

Some system variables exist in pairs, such as lock_order_debug_loop and lock_order_trace_loop. For such pairs, the variables are distinguished as follows when the condition occurs with which they are associated:
- If the _debug_ variable is enabled, a debug assertion is raised.
- If the _trace_ variable is enabled, an error is printed to the logs.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 7.8 LOCK_ORDER System Variable Summary}
\begin{tabular}{|l|l|l|}
\hline Variable Name & Variable Type & Variable Scope \\
\hline lock_order & Boolean & Global \\
\hline lock_order_debug_loop & Boolean & Global \\
\hline lock_order_debug_missing_arc & Boolean & Global \\
\hline lock_order_debug_missing_key & Boolean & Global \\
\hline lock_order_debug_missing_unloc & Boolean & Global \\
\hline lock_order_dependencies & File name & Global \\
\hline lock_order_extra_dependencies & File name & Global \\
\hline lock_order_output_directory & Directory name & Global \\
\hline lock_order_print_txt & Boolean & Global \\
\hline lock_order_trace_loop & Boolean & Global \\
\hline lock_order_trace_missing_arc & Boolean & Global \\
\hline lock_order_trace_missing_key & Boolean & Global \\
\hline lock_order_trace_missing_unlock & Boolean & Global \\
\hline
\end{tabular}
\end{table}
- lock_order

\begin{tabular}{|l|l|}
\hline Command-Line Format & --lock-order[=\{OFF|ON\}] \\
\hline System Variable & lock_order \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & 0FF \\
\hline
\end{tabular}

Whether to enable the LOCK_ORDER tool at runtime. If lock_order is disabled (the default), no other LOCK_ORDER system variables have any effect. If lock_order is enabled, the other system variables configure which LOCK_ORDER features to enable.

If lock_order is enabled, an error is raised if the server encounters a lock-acquisition sequence that is not declared in the lock-order graph.
- lock_order_debug_loop

\begin{tabular}{|l|l|}
\hline Command-Line Format & --lock-order-debug-loop[=\{OFF|ON\}] \\
\hline System Variable & lock_order_debug_loop \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & 0FF \\
\hline
\end{tabular}

Whether the LOCK_ORDER tool causes a debug assertion failure when it encounters a dependency that is flagged as a loop in the lock-order graph.
- lock_order_debug_missing_arc

\begin{tabular}{|l|l|}
\hline Command-Line Format & --lock-order-debug-missing$\operatorname{arc}[=\{\mathrm{OFF} \mid \mathrm{ON}\}]$ \\
\hline System Variable & lock_order_debug_missing_arc \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

Whether the LOCK_ORDER tool causes a debug assertion failure when it encounters a dependency that is not declared in the lock-order graph.
- lock_order_debug_missing_key

\begin{tabular}{|l|l|}
\hline Command-Line Format & --lock-order-debug-missingkey[=\{OFF|ON\}] \\
\hline System Variable & lock_order_debug_missing_key \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

Whether the LOCK_ORDER tool causes a debug assertion failure when it encounters an object that is not properly instrumented with the Performance Schema.
- lock_order_debug_missing_unlock

\begin{tabular}{|l|l|}
\hline Command-Line Format & --lock-order-debug-missingunlock [=\{OFF|ON\}] \\
\hline System Variable & lock_order_debug_missing_unlock \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

Whether the LOCK_ORDER tool causes a debug assertion failure when it encounters a lock that is destroyed while still held.
- lock_order_dependencies

\begin{tabular}{|l|l|}
\hline Command-Line Format & --lock-order-dependencies=file_name \\
\hline System Variable & lock_order_dependencies \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & File name \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Default Value & empty string
\end{tabular}

The path to the lock_order_dependencies.txt file that defines the server lock-order dependency graph.

It is permitted to specify no dependencies. An empty dependency graph is used in this case.
- lock_order_extra_dependencies

\begin{tabular}{|l|l|}
\hline Command-Line Format & --lock-order-extradependencies=file_name \\
\hline System Variable & lock_order_extra_dependencies \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & File name \\
\hline Default Value & empty string \\
\hline
\end{tabular}

The path to a file containing additional dependencies for the lock-order dependency graph. This is useful to amend the primary server dependency graph, defined in the lock_order_dependencies.txt file, with additional dependencies describing the behavior of third party code. (The alternative is to modify lock_order_dependencies.txt itself, which is not encouraged.)

If this variable is not set, no secondary file is used.
- lock_order_output_directory

\begin{tabular}{|l|l|}
\hline Command-Line Format & --lock-order-outputdirectory=dir_name \\
\hline System Variable & lock_order_output_directory \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Directory name \\
\hline Default Value & empty string \\
\hline
\end{tabular}

The directory where the LOCK_ORDER tool writes its logs. If this variable is not set, the default is the current directory.
- lock_order_print_txt

\begin{tabular}{|l|l|}
\hline Command-Line Format & --lock-order-print-txt[=\{OFF|ON\}] \\
\hline System Variable & lock_order_print_txt \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & 0FF \\
\hline
\end{tabular}

Whether the LOCK_ORDER tool performs a lock-order graph analysis and prints a textual report. The report includes any lock-acquisition cycles detected.
- lock_order_trace_loop

\begin{tabular}{|l|l|}
\hline Command-Line Format & --lock-order-trace-loop[=\{OFF | ON\}] \\
\hline System Variable & lock_order_trace_loop \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

Whether the LOCK_ORDER tool prints a trace in the log file when it encounters a dependency that is flagged as a loop in the lock-order graph.
- lock_order_trace_missing_arc

\begin{tabular}{|l|l|}
\hline Command-Line Format & --lock-order-trace-missing$\operatorname{arc}[=\{\mathrm{OFF} \mid \mathrm{ON}\}]$ \\
\hline System Variable & lock_order_trace_missing_arc \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & ON \\
\hline
\end{tabular}

Whether the LOCK_ORDER tool prints a trace in the log file when it encounters a dependency that is not declared in the lock-order graph.
- lock_order_trace_missing_key

\begin{tabular}{|l|l|}
\hline Command-Line Format & --lock-order-trace-missingkey[=\{OFF|ON\}] \\
\hline System Variable & lock_order_trace_missing_key \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

Whether the LOCK_ORDER tool prints a trace in the log file when it encounters an object that is not properly instrumented with the Performance Schema.
- lock_order_trace_missing_unlock

\begin{tabular}{|l|l|}
\hline Command-Line Format & --lock-order-trace-missingunlock[=\{OFF|ON\}] \\
\hline System Variable & lock_order_trace_missing_unlock \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|} 
Default Value & ON
\end{tabular}

Whether the LOCK_ORDER tool prints a trace in the log file when it encounters a lock that is destroyed while still held.

\subsection*{7.9.4 The DBUG Package}

The MySQL server and most MySQL clients are compiled with the DBUG package originally created by Fred Fish. When you have configured MySQL for debugging, this package makes it possible to get a trace file of what the program is doing. See Section 7.9.1.2, "Creating Trace Files".

This section summarizes the argument values that you can specify in debug options on the command line for MySQL programs that have been built with debugging support.

The DBUG package can be used by invoking a program with the --debug[=debug_options] or -\# [debug_options] option. If you specify the --debug or -\# option without a debug_options value, most MySQL programs use a default value. The server default is d:t:i:o,/tmp/mysqld.trace on Unix and d:t:i:0, \mysqld.trace on Windows. The effect of this default is:
- d: Enable output for all debug macros
- t: Trace function calls and exits
- i: Add PID to output lines
- o,/tmp/mysqld.trace, 0, \mysqld.trace: Set the debug output file.

Most client programs use a default debug_options value of d:t:o,/tmp/program_name.trace, regardless of platform.

Here are some example debug control strings as they might be specified on a shell command line:
```
--debug=d:t
--debug=d:f,main,subr1:F:L:t,20
--debug=d,input,output,files:n
--debug=d:t:i:0,\\mysqld.trace
```


For mysqld, it is also possible to change DBUG settings at runtime by setting the debug system variable. This variable has global and session values:
```
mysql> SET GLOBAL debug = 'debug_options';
mysql> SET SESSION debug = 'debug_options';
```


Changing the global debug value requires privileges sufficient to set global system variables. Changing the session debug value requires privileges sufficient to set restricted session system variables. See Section 7.1.9.1, "System Variable Privileges".

The debug_options value is a sequence of colon-separated fields:
```
field_1:field_2:...:field_N
```


Each field within the value consists of a mandatory flag character, optionally preceded by a + or character, and optionally followed by a comma-separated list of modifiers:
[+|-]flag[,modifier,modifier,...,modifier]
The following table describes the permitted flag characters. Unrecognized flag characters are silently ignored.

\begin{tabular}{|l|l|}
\hline Flag & Description \\
\hline d & \begin{tabular}{l} 
Enable output from DBUG_ $X X X$ macros for \\
the current state. May be followed by a list of \\
keywords, which enables output only for the
\end{tabular}
\end{tabular}

\begin{tabular}{|l|l|}
\hline Flag & Description \\
\hline & \begin{tabular}{l}
DBUG macros with that keyword. An empty list of keywords enables output for all macros. \\
In MySQL, common debug macro keywords to enable are enter, exit, error, warning, info, and loop.
\end{tabular} \\
\hline D & Delay after each debugger output line. The argument is the delay, in tenths of seconds, subject to machine capabilities. For example, D, 20 specifies a delay of two seconds. \\
\hline f & Limit debugging, tracing, and profiling to the list of named functions. An empty list enables all functions. The appropriate d or t flags must still be given; this flag only limits their actions if they are enabled. \\
\hline F & Identify the source file name for each line of debug or trace output. \\
\hline i & Identify the process with the PID or thread ID for each line of debug or trace output. \\
\hline L & Identify the source file line number for each line of debug or trace output. \\
\hline n & Print the current function nesting depth for each line of debug or trace output. \\
\hline N & Number each line of debug output. \\
\hline 0 & Redirect the debugger output stream to the specified file. The default output is stderr. \\
\hline 0 & Like o, but the file is really flushed between each write. When needed, the file is closed and reopened between each write. \\
\hline a & Like o, but opens for append. \\
\hline A & Like 0, but opens for append. \\
\hline p & Limit debugger actions to specified processes. A process must be identified with the DBUG_PROCESS macro and match one in the list for debugger actions to occur. \\
\hline P & Print the current process name for each line of debug or trace output. \\
\hline r & When pushing a new state, do not inherit the previous state's function nesting level. Useful when the output is to start at the left margin. \\
\hline t & Enable function call/exit trace lines. May be followed by a list (containing only one modifier) giving a numeric maximum trace level, beyond which no output occurs for either debugging or tracing macros. The default is a compile time option. \\
\hline T & Print the current timestamp for every line of output. \\
\hline
\end{tabular}

The leading + or - character and trailing list of modifiers are used for flag characters such as d or f that can enable a debug operation for all applicable modifiers or just some of them:
- With no leading + or -, the flag value is set to exactly the modifier list as given.
- With a leading + or -, the modifiers in the list are added to or subtracted from the current modifier list.

The following examples show how this works for the $d$ flag. An empty $d$ list enabled output for all debug macros. A nonempty list enables output only for the macro keywords in the list.

These statements set the d value to the modifier list as given:
```
mysql> SET debug = 'd';
mysql> SELECT @@debug;
+----------+
| @@debug |
+----------+
| d |
+---------+
mysql> SET debug = 'd,error,warning';
mysql> SELECT @@debug;
+------------------+
| @@debug |
+------------------+
| d,error,warning |
+------------------+
```


A leading + or - adds to or subtracts from the current d value:
```
mysql> SET debug = '+d,loop';
mysql> SELECT @@debug;
+-----------------------+
| @@debug |
+-----------------------+
| d,error,warning,loop |
+-----------------------+
mysql> SET debug = '-d,error,loop';
mysql> SELECT @@debug;
+------------+
| @@debug |
+------------+
| d,warning |
+-----------+
```


Adding to "all macros enabled" results in no change:
```
mysql> SET debug = 'd';
mysql> SELECT @@debug;
+----------+
| @@debug |
+----------+
| d |
+----------+
mysql> SET debug = '+d,loop';
mysql> SELECT @@debug;
+----------+
| @@debug |
+---------+
| d |
+---------+
```


Disabling all enabled macros disables the d flag entirely:
```
mysql> SET debug = 'd,error,loop';
mysql> SELECT @@debug;
+---------------+
| @@debug |
+---------------+
| d,error,loop |
+---------------+
```

mysql> SET debug = '-d,error,loop';
mysql> SELECT @@debug;

+---------+
$\mid$ @@debug |
+--------+
$+\quad$ |
+--------+

