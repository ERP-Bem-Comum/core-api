\section*{Warning \\ Setting max_digest_length to zero disables digest production, which also disables server functionality that requires digests, such as MySQL Enterprise Firewall.}

Decreasing the max_digest_length value reduces memory use but causes the digest value of more statements to become indistinguishable if they differ only at the end. Increasing the value permits longer statements to be distinguished but increases memory use, particularly for workloads that involve large numbers of simultaneous sessions (the server allocates max_digest_length bytes per session).

The parser uses this system variable as a limit on the maximum length of normalized statement digests that it computes. The Performance Schema, if it tracks statement digests, makes a copy of the digest value, using the performance_schema_max_digest_length. system variable as a limit on the maximum length of digests that it stores. Consequently, if performance_schema_max_digest_length is less than max_digest_length, digest values stored in the Performance Schema are truncated relative to the original digest values.

For more information about statement digesting, see Section 29.10, "Performance Schema Statement Digests and Sampling".
- max_error_count

\begin{tabular}{|l|l|}
\hline Command-Line Format & --max-error-count=\# \\
\hline System Variable & max_error_count \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & Yes \\
\hline Type & Integer \\
\hline Default Value & 1024 \\
\hline Minimum Value & 0 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Maximum Value & 65535 \\
\hline
\end{tabular}

The maximum number of error, warning, and information messages to be stored for display by the SHOW ERRORS and SHOW WARNINGS statements. This is the same as the number of condition areas in the diagnostics area, and thus the number of conditions that can be inspected by GET DIAGNOSTICS.

Setting the session value of this system variable is a restricted operation. The session user must have privileges sufficient to set restricted session variables. See Section 7.1.9.1, "System Variable Privileges".
- max_execution_time

\begin{tabular}{|l|l|}
\hline Command-Line Format & --max-execution-time=\# \\
\hline System Variable & max_execution_time \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & Yes \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 4294967295 \\
\hline Unit & milliseconds \\
\hline
\end{tabular}

The execution timeout for SELECT statements, in milliseconds. If the value is 0 , timeouts are not enabled.
max_execution_time applies as follows:
- The global max_execution_time value provides the default for the session value for new connections. The session value applies to SELECT executions executed within the session that include no MAX_EXECUTION_TIME $(N)$ optimizer hint or for which $N$ is 0 .
- max_execution_time applies to read-only SELECT statements. Statements that are not read only are those that invoke a stored function that modifies data as a side effect.
- max_execution_time is ignored for SELECT statements in stored programs.
- max_heap_table_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --max-heap-table-size=\# \\
\hline System Variable & max_heap_table_size \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & Yes \\
\hline Type & Integer \\
\hline Default Value & 16777216 \\
\hline Minimum Value & 16384 \\
\hline Maximum Value (64-bit platforms) & 18446744073709550592 \\
\hline Maximum Value (32-bit platforms) & 4294966272 \\
\hline Unit & bytes \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|} 
Block Size & 1024
\end{tabular}

This variable sets the maximum size to which user-created MEMORY tables are permitted to grow. The value of the variable is used to calculate MEMORY table MAX_ROWS values.

Setting this variable has no effect on any existing MEMORY table, unless the table is re-created with a statement such as CREATE TABLE or altered with ALTER TABLE or TRUNCATE TABLE. A server restart also sets the maximum size of existing MEMORY tables to the global max_heap_table_size value.

This variable is also used in conjunction with tmp_table_size to limit the size of internal inmemory tables. See Section 10.4.4, "Internal Temporary Table Use in MySQL".
max_heap_table_size is not replicated. See Section 19.5.1.21, "Replication and MEMORY Tables", and Section 19.5.1.39, "Replication and Variables", for more information.
- max_insert_delayed_threads

\begin{tabular}{|l|l|}
\hline Deprecated & Yes \\
\hline System Variable & max_insert_delayed_threads \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & 20 \\
\hline Maximum Value & 16384 \\
\hline
\end{tabular}

This variable is a synonym for max_delayed_threads. Like max_delayed_threads, it is deprecated (because DELAYED inserts are not supported) and subject to removal in a future MySQL release.

Setting the session value of this system variable is a restricted operation. The session user must have privileges sufficient to set restricted session variables. See Section 7.1.9.1, "System Variable Privileges".
- max_join_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --max-join-size=\# \\
\hline System Variable & max_join_size \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & Yes \\
\hline Type & Integer \\
\hline Default Value & 18446744073709551615 \\
\hline Minimum Value & 1 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Maximum Value & 18446744073709551615 \\
\hline
\end{tabular}

This represents a limit on the maximum number of row accesses in base tables made by a join. If the server's estimate indicates that a greater number of rows than max_join_size must be read from the base tables, the statement is rejected with an error.

Setting this variable to a value other than DEFAULT resets the value of sql_big_selects to 0 . If you set the sql_big_selects value again, the max_join_size variable is ignored.
- max_length_for_sort_data

\begin{tabular}{|l|l|}
\hline Command-Line Format & --max-length-for-sort-data=\# \\
\hline Deprecated & Yes \\
\hline System Variable & max_length_for_sort_data \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & Yes \\
\hline Type & Integer \\
\hline Default Value & 4096 \\
\hline Minimum Value & 4 \\
\hline Maximum Value & 8388608 \\
\hline Unit & bytes \\
\hline
\end{tabular}

This variable is deprecated, and has no effect in MySQL 8.4.
- max_points_in_geometry

\begin{tabular}{|l|l|}
\hline Command-Line Format & --max-points-in-geometry=\# \\
\hline System Variable & max_points_in_geometry \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & Yes \\
\hline Type & Integer \\
\hline Default Value & 65536 \\
\hline Minimum Value & 3 \\
\hline Maximum Value & 1048576 \\
\hline
\end{tabular}

The maximum value of the points_per_circle argument to the ST_Buffer_Strategy( ) function.
- max_prepared_stmt_count

\begin{tabular}{|l|l|l|}
\hline \multirow{6}{*}{} & Command-Line Format & --max-prepared-stmt-count=\# \\
\hline & System Variable & max_prepared_stmt_count \\
\hline & Scope & Global \\
\hline & Dynamic & Yes \\
\hline & SET_VAR Hint Applies & No \\
\hline & Type & Integer \\
\hline 796 & Default Value & 16382 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Minimum Value & 0 \\
\hline Maximum Value & 4194304 \\
\hline
\end{tabular}

This variable limits the total number of prepared statements in the server. It can be used in environments where there is the potential for denial-of-service attacks based on running the server out of memory by preparing huge numbers of statements. If the value is set lower than the current number of prepared statements, existing statements are not affected and can be used, but no new statements can be prepared until the current number drops below the limit. Setting the value to 0 disables prepared statements.
- max_seeks_for_key

\begin{tabular}{|l|l|}
\hline Command-Line Format & --max-seeks-for-key=\# \\
\hline System Variable & max_seeks_for_key \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & Yes \\
\hline Type & Integer \\
\hline Default Value (Windows) & 4294967295 \\
\hline Default Value (Other, 64-bit platforms) & 18446744073709551615 \\
\hline Default Value (Other, 32-bit platforms) & 4294967295 \\
\hline Minimum Value & 1 \\
\hline Maximum Value (Windows) & 4294967295 \\
\hline Maximum Value (Other, 64-bit platforms) & 18446744073709551615 \\
\hline Maximum Value (Other, 32-bit platforms) & 4294967295 \\
\hline
\end{tabular}

Limit the assumed maximum number of seeks when looking up rows based on a key. The MySQL optimizer assumes that no more than this number of key seeks are required when searching for matching rows in a table by scanning an index, regardless of the actual cardinality of the index (see Section 15.7.7.23, "SHOW INDEX Statement"). By setting this to a low value (say, 100), you can force MySQL to prefer indexes instead of table scans.
- max_sort_length

\begin{tabular}{|l|l|}
\hline Command-Line Format & --max-sort-length=\# \\
\hline System Variable & max_sort_length \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & Yes \\
\hline Type & Integer \\
\hline Default Value & 1024 \\
\hline Minimum Value & 4 \\
\hline Maximum Value & 8388608 \\
\hline Unit & bytes \\
\hline
\end{tabular}

The number of bytes to use when sorting string values which use PAD SPACE collations. The server uses only the first max_sort_length bytes of any such value and ignores the rest. Consequently, such values that differ only after the first max_sort_length bytes compare as equal for GROUP BY, ORDER BY, and DISTINCT operations. (This behavior differs from previous versions of MySQL, where this setting was applied to all values used in comparisons.)

Increasing the value of max_sort_length may require increasing the value of sort_buffer_size as well. For details, see Section 10.2.1.16, "ORDER BY Optimization"
- max_sp_recursion_depth

\begin{tabular}{|l|l|}
\hline Command-Line Format & --max-sp-recursion-depth[=\#] \\
\hline System Variable & max_sp_recursion_depth \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 255 \\
\hline
\end{tabular}

The number of times that any given stored procedure may be called recursively. The default value for this option is 0 , which completely disables recursion in stored procedures. The maximum value is 255.

Stored procedure recursion increases the demand on thread stack space. If you increase the value of max_sp_recursion_depth, it may be necessary to increase thread stack size by increasing the value of thread_stack at server startup.
- max_user_connections

\begin{tabular}{|l|l|}
\hline Command-Line Format & --max-user-connections=\# \\
\hline System Variable & max_user_connections \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 4294967295 \\
\hline
\end{tabular}

The maximum number of simultaneous connections permitted to any given MySQL user account. A value of 0 (the default) means "no limit."

This variable has a global value that can be set at server startup or runtime. It also has a read-only session value that indicates the effective simultaneous-connection limit that applies to the account associated with the current session. The session value is initialized as follows:
- If the user account has a nonzero MAX_USER_CONNECTIONS resource limit, the session max_user_connections value is set to that limit.
- Otherwise, the session max_user_connections value is set to the global value.

Account resource limits are specified using the CREATE USER or ALTER USER statement. See Section 8.2.21, "Setting Account Resource Limits".
- max_write_lock_count

\begin{tabular}{|l|l|}
\hline Command-Line Format & --max-write-lock-count=\# \\
\hline System Variable & max_write_lock_count \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value (Windows) & 4294967295 \\
\hline Default Value (Other, 64-bit platforms) & 18446744073709551615 \\
\hline Default Value (Other, 32-bit platforms) & 4294967295 \\
\hline Minimum Value & 1 \\
\hline Maximum Value (Windows) & 4294967295 \\
\hline Maximum Value (Other, 64-bit platforms) & 18446744073709551615 \\
\hline Maximum Value (Other, 32-bit platforms) & 4294967295 \\
\hline
\end{tabular}

After this many write locks, permit some pending read lock requests to be processed in between. Write lock requests have higher priority than read lock requests. However, if max_write_lock_count is set to some low value (say, 10), read lock requests may be preferred over pending write lock requests if the read lock requests have already been passed over in favor of 10 write lock requests. Normally this behavior does not occur because max_write_lock_count by default has a very large value.
- mecab_rc_file

\begin{tabular}{|l|l|}
\hline Command-Line Format & --mecab-rc-file=file_name \\
\hline System Variable & mecab_rc_file \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & File name \\
\hline
\end{tabular}

The mecab_rc_file option is used when setting up the MeCab full-text parser.
The mecab_rc_file option defines the path to the mecabrc configuration file, which is the configuration file for MeCab. The option is read-only and can only be set at startup. The mecabrc configuration file is required to initialize MeCab.

For information about the MeCab full-text parser, see Section 14.9.9, "MeCab Full-Text Parser Plugin".

For information about options that can be specified in the MeCab mecabrc configuration file, refer to the MeCab Documentation on the Google Developers site.
- min_examined_row_limit

\begin{tabular}{|l|l|}
\hline Command-Line Format & --min-examined-row-limit=\# \\
\hline System Variable & min_examined_row_limit \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value (64-bit platforms) & 18446744073709551615 \\
\hline Maximum Value (32-bit platforms) & 4294967295 \\
\hline
\end{tabular}

Queries that examine fewer than this number of rows are not logged to the slow query log.
Setting the session value of this system variable is a restricted operation. The session user must have privileges sufficient to set restricted session variables. See Section 7.1.9.1, "System Variable Privileges".
- myisam_data_pointer_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --myisam-data-pointer-size=\# \\
\hline System Variable & myisam_data_pointer_size \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 6 \\
\hline Minimum Value & 2 \\
\hline Maximum Value & 7 \\
\hline Unit & bytes \\
\hline
\end{tabular}

The default pointer size in bytes, to be used by CREATE TABLE for MyISAM tables when no MAX_ROWS option is specified. This variable cannot be less than 2 or larger than 7 . The default value is 6 . See Section B.3.2.10, "The table is full".
- myisam_max_sort_file_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --myisam-max-sort-file-size=\# \\
\hline System Variable & myisam_max_sort_file_size \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value (Windows) & 2146435072 \\
\hline Default Value (Other, 64-bit platforms) & 9223372036853727232 \\
\hline Default Value (Other, 32-bit platforms) & 2147483648 \\
\hline Minimum Value & 0 \\
\hline Maximum Value (Windows) & 2146435072 \\
\hline Maximum Value (Other, 64-bit platforms) & 9223372036853727232 \\
\hline Maximum Value (Other, 32-bit platforms) & 2147483648 \\
\hline Unit & bytes \\
\hline
\end{tabular}

The maximum size of the temporary file that MySQL is permitted to use while re-creating a MyISAM index (during REPAIR TABLE, ALTER TABLE, or LOAD DATA). If the file size would be larger than
this value, the index is created using the key cache instead, which is slower. The value is given in bytes.

If MyISAM index files exceed this size and disk space is available, increasing the value may help performance. The space must be available in the file system containing the directory where the original index file is located.
- myisam_mmap_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --myisam-mmap-size=\# \\
\hline System Variable & myisam_mmap_size \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value (64-bit platforms) & 18446744073709551615 \\
\hline Default Value (32-bit platforms) & 4294967295 \\
\hline Minimum Value & 7 \\
\hline Maximum Value (64-bit platforms) & 18446744073709551615 \\
\hline Maximum Value (32-bit platforms) & 4294967295 \\
\hline Unit & bytes \\
\hline
\end{tabular}

The maximum amount of memory to use for memory mapping compressed MyISAM files. If many compressed MyISAM tables are used, the value can be decreased to reduce the likelihood of memory-swapping problems.
- myisam_recover_options

\begin{tabular}{|l|l|}
\hline Command-Line Format & --myisam-recover-options[=list] \\
\hline System Variable & myisam_recover_options \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Enumeration \\
\hline Default Value & OFF \\
\hline Valid Values & \begin{tabular}{l}
OFF \\
DEFAULT \\
BACKUP \\
FORCE \\
QUICK
\end{tabular} \\
\hline
\end{tabular}

Set the MyISAM storage engine recovery mode. The variable value is any combination of the values of OFF, DEFAULT, BACKUP, FORCE, or QUICK. If you specify multiple values, separate them by commas. Specifying the variable with no value at server startup is the same as specifying DEFAULT, and specifying with an explicit value of "" disables recovery (same as a value of OFF). If recovery is enabled, each time mysqld opens a MyISAM table, it checks whether the table is marked as crashed or was not closed properly. (The last option works only if you are running with external
locking disabled.) If this is the case, mysqld runs a check on the table. If the table was corrupted, mysqld attempts to repair it.

The following options affect how the repair works.

\begin{tabular}{|l|l|}
\hline Option & Description \\
\hline OFF & No recovery. \\
\hline DEFAULT & Recovery without backup, forcing, or quick checking. \\
\hline BACKUP & If the data file was changed during recovery, save a backup of the tbl_name. MYD file as tbl_name-datetime. BAK. \\
\hline FORCE & Run recovery even if we would lose more than one row from the .MYD file. \\
\hline QUICK & Do not check the rows in the table if there are not any delete blocks. \\
\hline
\end{tabular}

Before the server automatically repairs a table, it writes a note about the repair to the error log. If you want to be able to recover from most problems without user intervention, you should use the options BACKUP, FORCE. This forces a repair of a table even if some rows would be deleted, but it keeps the old data file as a backup so that you can later examine what happened.

See Section 18.2.1, "MyISAM Startup Options".
- myisam_sort_buffer_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --myisam-sort-buffer-size=\# \\
\hline System Variable & myisam_sort_buffer_size \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 8388608 \\
\hline Minimum Value & 4096 \\
\hline Maximum Value (64-bit platforms) & 18446744073709551615 \\
\hline Maximum Value (32-bit platforms) & 4294967295 \\
\hline Unit & bytes \\
\hline
\end{tabular}

The size of the buffer that is allocated when sorting MyISAM indexes during a REPAIR TABLE or when creating indexes with CREATE INDEX or ALTER TABLE.
- myisam_stats_method

\begin{tabular}{|l|l|}
\hline Command-Line Format & --myisam-stats-method=name \\
\hline System Variable & myisam_stats_method \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Enumeration \\
\hline Default Value & nulls_unequal \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\cline { 2 - 2 } & Valid Values \\
& nulls_unequal \\
& nulls_equal \\
& nulls_ignored
\end{tabular}

How the server treats NULL values when collecting statistics about the distribution of index values for MyISAM tables. This variable has three possible values, nulls_equal, nulls_unequal, and nulls_ignored. For nulls_equal, all NULL index values are considered equal and form a single value group that has a size equal to the number of NULL values. For nulls_unequal, NULL values are considered unequal, and each NULL forms a distinct value group of size 1. For nulls_ignored, NULL values are ignored.

The method that is used for generating table statistics influences how the optimizer chooses indexes for query execution, as described in Section 10.3.8, "InnoDB and MyISAM Index Statistics Collection".
- myisam_use_mmap

\begin{tabular}{|l|l|}
\hline Command-Line Format & --myisam-use-mmap[=\{OFF|ON\}] \\
\hline System Variable & myisam_use_mmap \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & 0FF \\
\hline
\end{tabular}

Use memory mapping for reading and writing MyISAM tables.
- mysql_native_password_proxy_users

\begin{tabular}{|l|l|}
\hline Command-Line Format & --mysql-native-password-proxyusers[=\{OFF|ON\}] \\
\hline Deprecated & Yes \\
\hline System Variable & mysql_native_password_proxy_users \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

This variable controls whether the mysql_native_password built-in authentication plugin (deprecated) supports proxy users. It has no effect unless the check_proxy_users system variable and the mysql_native_password plugin are enabled. For information about user proxying, see Section 8.2.19, "Proxy Users".
- named_pipe

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - named - pipe [=\{OFF|ON\}] \\
\hline System Variable & named_pipe \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
SET_VAR Hint Applies & No \\
\hline Platform Specific & Windows \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}
(Windows only.) Indicates whether the server supports connections over named pipes.
- named_pipe_full_access_group

\begin{tabular}{|l|l|}
\hline Command-Line Format & --named-pipe-full-access-group=value \\
\hline System Variable & named_pipe_full_access_group \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Platform Specific & Windows \\
\hline Type & String \\
\hline Default Value & empty string \\
\hline Valid Values & \begin{tabular}{l}
empty string \\
valid Windows local group name \\
*everyone*
\end{tabular} \\
\hline
\end{tabular}
(Windows only.) The access control granted to clients on the named pipe created by the MySQL server is set to the minimum necessary for successful communication when the named_pipe system variable is enabled to support named-pipe connections. Some MySQL client software can open named pipe connections without any additional configuration; however, other client software may still require full access to open a named pipe connection.

This variable sets the name of a Windows local group whose members are granted sufficient access by the MySQL server to use named-pipe clients. The default value is an empty string, which means that no Windows user is granted full access to the named pipe.

A new Windows local group name (for example, mysql_access_client_users) can be created in Windows and then used to replace the default value when access is absolutely necessary. In this case, limit the membership of the group to as few users as possible, removing users from the group when their client software is upgraded. A non-member of the group who attempts to open a connection to MySQL with the affected named-pipe client is denied access until a Windows administrator adds the user to the group. Newly added users must log out and log in again to join the group (required by Windows).

Setting the value to ' *everyone* ' provides a language-independent way of referring to the Everyone group on Windows. The Everyone group is not secure by default.
- net_buffer_length

\begin{tabular}{|l|l|}
\hline Command-Line Format & --net-buffer-length=\# \\
\hline System Variable & net_buffer_length \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Default Value & 16384 \\
\hline Minimum Value & 1024 \\
\hline Maximum Value & 1048576 \\
\hline Unit & bytes \\
\hline Block Size & 1024 \\
\hline
\end{tabular}

Each client thread is associated with a connection buffer and result buffer. Both begin with a size given by net_buffer_length but are dynamically enlarged up to max_allowed_packet bytes as needed. The result buffer shrinks to net_buffer_length after each SQL statement.

This variable should not normally be changed, but if you have very little memory, you can set it to the expected length of statements sent by clients. If statements exceed this length, the connection buffer is automatically enlarged. The maximum value to which net_buffer_length can be set is 1 MB .

The session value of this variable is read only.
- net_read_timeout

\begin{tabular}{|l|l|}
\hline Command-Line Format & --net-read-timeout=\# \\
\hline System Variable & net_read_timeout \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 30 \\
\hline Minimum Value & 1 \\
\hline Maximum Value & 31536000 \\
\hline Unit & seconds \\
\hline
\end{tabular}

The number of seconds to wait for more data from a connection before aborting the read. When the server is reading from the client, net_read_timeout is the timeout value controlling when to abort. When the server is writing to the client, net_write_timeout is the timeout value controlling when to abort. See also replica_net_timeout.
- net_retry_count

\begin{tabular}{|l|l|}
\hline Command-Line Format & --net-retry-count=\# \\
\hline System Variable & net_retry_count \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 10 \\
\hline Minimum Value & 1 \\
\hline Maximum Value (64-bit platforms) & 18446744073709551615 \\
\hline Maximum Value (32-bit platforms) & 4294967295 \\
\hline
\end{tabular}

If a read or write on a communication port is interrupted, retry this many times before giving up. This value should be set quite high on FreeBSD because internal interrupts are sent to all threads.
- net_write_timeout

\begin{tabular}{|l|l|}
\hline Command-Line Format & --net-write-timeout=\# \\
\hline System Variable & net_write_timeout \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 60 \\
\hline Minimum Value & 1 \\
\hline Maximum Value & 31536000 \\
\hline Unit & seconds \\
\hline
\end{tabular}

The number of seconds to wait for a block to be written to a connection before aborting the write. See also net_read_timeout.
- ngram_token_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ngram-token-size=\# \\
\hline System Variable & ngram_token_size \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 2 \\
\hline Minimum Value & 1 \\
\hline Maximum Value & 10 \\
\hline
\end{tabular}

Defines the n-gram token size for the n-gram full-text parser. The ngram_token_size option is read-only and can only be modified at startup. The default value is 2 (bigram). The maximum value is 10.

For more information about how to configure this variable, see Section 14.9.8, "ngram Full-Text Parser".
- offline_mode

\begin{tabular}{|l|l|}
\hline Command-Line Format & --offline-mode[=\{OFF|ON\}] \\
\hline System Variable & offline_mode \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline
\end{tabular}

In offline mode, the MySQL instance disconnects client users unless they have relevant privileges, and does not allow them to initiate new connections. Clients that are refused access receive an ER_SERVER_OFFLINE_MODE error.

To put a server in offline mode, change the value of the offline_mode system variable from OFF to ON. To resume normal operations, change offline_mode from ON to OFF. To control offline mode, an administrator account must have the SYSTEM_VARIABLES_ADMIN privilege and the CONNECTION_ADMIN privilege (or the deprecated SUPER privilege, which covers both these privileges). CONNECTION_ADMIN is required, to prevent accidental lockout.

Offline mode has these characteristics:
- Connected client users who do not have the CONNECTION_ADMIN privilege (or the deprecated SUPER privilege) are disconnected on the next request, with an appropriate error. Disconnection includes terminating running statements and releasing locks. Such clients also cannot initiate new connections, and receive an appropriate error.
- Connected client users who have the CONNECTION_ADMIN or SUPER privilege are not disconnected, and can initiate new connections to manage the server.
- If the user that puts a server in offline mode does not have the SYSTEM_USER privilege, connected client users who have the SYSTEM_USER privilege are also not disconnected. However, these users cannot initiate new connections to the server while it is in offline mode, unless they have the CONNECTION_ADMIN or SUPER privilege as well. It is only their existing connection that cannot be terminated, because the SYSTEM_USER privilege is required to kill a session or statement that is executing with the SYSTEM_USER privilege.
- Replication threads are permitted to keep applying data to the server.
- old_alter_table

\begin{tabular}{|l|l|}
\hline Command-Line Format & --old-alter-table[=\{OFF|ON\}] \\
\hline System Variable & old_alter_table \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & 0FF \\
\hline
\end{tabular}

When this variable is enabled, the server does not use the optimized method of processing an ALTER TABLE operation. It reverts to using a temporary table, copying over the data, and then renaming the temporary table to the original, as used by MySQL 5.0 and earlier. For more information on the operation of ALTER TABLE, see Section 15.1.9, "ALTER TABLE Statement".

ALTER TABLE ... DROP PARTITION with old_alter_table=0N rebuilds the partitioned table and attempts to move data from the dropped partition to another partition with a compatible PARTITION ... VALUES definition. Data that cannot be moved to another partition is deleted. In earlier releases, ALTER TABLE ... DROP PARTITION with old_alter_table=ON deletes data stored in the partition and drops the partition.
- open_files_limit

\begin{tabular}{|l|l|}
\hline Command-Line Format & --open-files-limit=\# \\
\hline System Variable & open_files_limit \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 5000, with possible adjustment \\
\hline Minimum Value & 0 \\
\hline Maximum Value & platform dependent \\
\hline
\end{tabular}

The number of file descriptors available to mysqld from the operating system:
- At startup, mysqld reserves descriptors with setrlimit(), using the value requested at by setting this variable directly or by using the --open-files-limit option to mysqld_safe. If mysqld produces the error Too many open files, try increasing the open_files_limit value. Internally, the maximum value for this variable is the maximum unsigned integer value, but the actual maximum is platform dependent.
- At runtime, the value of open_files_limit indicates the number of file descriptors actually permitted to mysqld by the operating system, which might differ from the value requested at startup. If the number of file descriptors requested during startup cannot be allocated, mysqld writes a warning to the error log.

The effective open_files_limit value is based on the value specified at system startup (if any) and the values of max_connections and table_open_cache, using these formulas:
- 10 + max_connections + (table_open_cache * 2 ). Using the defaults for these variables yields 8161.

On Windows only, 2048 (the value of the C Run-Time Library file descriptor maximum) is added to this number. This totals 10209, again using the default values for the indicated system variables.
- max_connections * 5
- The operating system limit.

The server attempts to obtain the number of file descriptors using the maximum of those values, capped to the maximum unsigned integer value. If that many descriptors cannot be obtained, the server attempts to obtain as many as the system permits.

The effective value is 0 on systems where MySQL cannot change the number of open files.
On Unix, the value cannot be set greater than the value displayed by the ulimit - $n$ command. On Linux systems using systemd, the value cannot be set greater than LimitNOFILE (this is DefaultLimitNOFILE, if LimitNOFILE is not set); otherwise, on Linux, the value of open_files_limit cannot exceed ulimit - n.
- optimizer_prune_level

\begin{tabular}{|l|l|}
\hline Command-Line Format & --optimizer-prune-level=\# \\
\hline System Variable & optimizer_prune_level \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & Yes \\
\hline Type & Integer \\
\hline Default Value & 1 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Minimum Value & 0 \\
\hline Maximum Value & 1 \\
\hline
\end{tabular}

Controls the heuristics applied during query optimization to prune less-promising partial plans from the optimizer search space. A value of 0 disables heuristics so that the optimizer performs an exhaustive search. A value of 1 causes the optimizer to prune plans based on the number of rows retrieved by intermediate plans.
- optimizer_search_depth

\begin{tabular}{|l|l|}
\hline Command-Line Format & --optimizer-search-depth=\# \\
\hline System Variable & optimizer_search_depth \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & Yes \\
\hline Type & Integer \\
\hline Default Value & 62 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 62 \\
\hline
\end{tabular}

The maximum depth of search performed by the query optimizer. Values larger than the number of relations in a query result in better query plans, but take longer to generate an execution plan for a query. Values smaller than the number of relations in a query return an execution plan quicker, but the resulting plan may be far from being optimal. If set to 0 , the system automatically picks a reasonable value.
- optimizer_switch

\begin{tabular}{|l|l|}
\hline Command-Line Format & --optimizer-switch=value \\
\hline System Variable & optimizer_switch \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & Yes \\
\hline Type & Set \\
\hline Valid Values & \begin{tabular}{l}
batched_key_access=\{on|off\} \\
block_nested_loop=\{on|off\} condition_fanout_filter=\{on|off\} derived_condition_pushdown=\{on|off\} \\
derived_merge=\{on|off\} \\
duplicateweedout=\{on|off\} \\
engine_condition_pushdown=\{on|off\} \\
firstmatch=\{on|off\} \\
hash_join=\{on|off\} \\
index_condition_pushdown=\{on|off\}
\end{tabular} \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l}
|index_merge=\{on|off\} \\
index_merge_intersection=\{on|off\} \\
index_merge_sort_union=\{on | off\} \\
index_merge_union=\{on|off\} \\
loosescan=\{on|off\} \\
materialization=\{on|off\} \\
$\mathrm{mrr}=\{\mathrm{on} \mid \mathrm{off}\}$ \\
mrr_cost_based=\{on|off\} \\
prefer_ordering_index=\{on|off\} \\
semijoin=\{on|off\} \\
skip_scan=\{on|off\} \\
subquery_materialization_cost_based=\{on| off\} \\
subquery_to_derived=\{on|off\} \\
use_index_extensions=\{on|off\} \\
use_invisible_indexes=\{on|off\}
\end{tabular} & \\
\hline
\end{tabular}

The optimizer_switch system variable enables control over optimizer behavior. The value of this variable is a set of flags, each of which has a value of on or off to indicate whether the corresponding optimizer behavior is enabled or disabled. This variable has global and session values and can be changed at runtime. The global default can be set at server startup.

To see the current set of optimizer flags, select the variable value:
```
mysql> SELECT @@optimizer_switch\G
*************************** 1. row ****************************************
@@optimizer_switch: index_merge=on,index_merge_union=on,
    index_merge_sort_union=on,index_merge_intersection=on,
    engine_condition_pushdown=on,index_condition_pushdown=on,
    mrr=on,mrr_cost_based=on,block_nested_loop=on,
    batched_key_access=off,materialization=on,semijoin=on,
    loosescan=on,firstmatch=on,duplicateweedout=on,
    subquery_materialization_cost_based=on,
    use_index_extensions=on,condition_fanout_filter=on,
    derived_merge=on,use_invisible_indexes=off,skip_scan=on,
    hash_join=on,subquery_to_derived=off,
    prefer_ordering_index=on, hypergraph_optimizer=off,
    derived_condition_pushdown=on, hash_set_operations=on
1 row in set (0.00 sec)
```


For more information about the syntax of this variable and the optimizer behaviors that it controls, see Section 10.9.2, "Switchable Optimizations".
- optimizer_trace

\begin{tabular}{|l|l|}
\hline Command-Line Format & --optimizer-trace=value \\
\hline System Variable & optimizer_trace \\
\hline Scope & Global, Session \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline
\end{tabular}

This variable controls optimizer tracing. For details, see Section 10.15, "Tracing the Optimizer".
- optimizer_trace_features

\begin{tabular}{|l|l|}
\hline Command-Line Format & --optimizer-trace-features=value \\
\hline System Variable & optimizer_trace_features \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline
\end{tabular}

This variable enables or disables selected optimizer tracing features. For details, see Section 10.15, "Tracing the Optimizer".
- optimizer_trace_limit

\begin{tabular}{|l|l|}
\hline Command-Line Format & --optimizer-trace-limit=\# \\
\hline System Variable & optimizer_trace_limit \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 1 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 2147483647 \\
\hline
\end{tabular}

The maximum number of optimizer traces to display. For details, see Section 10.15, "Tracing the Optimizer".
- optimizer_trace_max_mem_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --optimizer-trace-max-mem-size=\# \\
\hline System Variable & optimizer_trace_max_mem_size \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & Yes \\
\hline Type & Integer \\
\hline Default Value & 1048576 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 4294967295 \\
\hline Unit & bytes \\
\hline
\end{tabular}

The maximum cumulative size of stored optimizer traces. For details, see Section 10.15, "Tracing the Optimizer".
- optimizer_trace_offset

\begin{tabular}{|l|l|}
\hline Command-Line Format & --optimizer-trace-offset=\# \\
\hline System Variable & optimizer_trace_offset \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & -1 \\
\hline Minimum Value & -2147483647 \\
\hline Maximum Value & 2147483647 \\
\hline
\end{tabular}

The offset of optimizer traces to display. For details, see Section 10.15, "Tracing the Optimizer".
- performance_schema_xxx

Performance Schema system variables are listed in Section 29.15, "Performance Schema System Variables". These variables may be used to configure Performance Schema operation.
- parser_max_mem_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --parser-max-mem-size=\# \\
\hline System Variable & parser_max_mem_size \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value (64-bit platforms) & 18446744073709551615 \\
\hline Default Value (32-bit platforms) & 4294967295 \\
\hline Minimum Value & 10000000 \\
\hline Maximum Value (64-bit platforms) & 18446744073709551615 \\
\hline Maximum Value (32-bit platforms) & 4294967295 \\
\hline Unit & bytes \\
\hline
\end{tabular}

The maximum amount of memory available to the parser. The default value places no limit on memory available. The value can be reduced to protect against out-of-memory situations caused by parsing long or complex SQL statements.
- partial_revokes

\begin{tabular}{|l|l|}
\hline Command-Line Format & --partial-revokes[=\{OFF|ON\}] \\
\hline System Variable & partial_revokes \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & 0FF (if partial revokes do not exist) \\
\hline
\end{tabular}

Enabling this variable makes it possible to revoke privileges partially. Specifically, for users who have privileges at the global level, partial_revokes enables privileges for specific schemas to be revoked while leaving the privileges in place for other schemas. For example, a user who has the global UPDATE privilege can be restricted from exercising this privilege on the mysql system schema. (Or, stated another way, the user is enabled to exercise the UPDATE privilege on all schemas except the mysql schema.) In this sense, the user's global UPDATE privilege is partially revoked.

Once enabled, partial_revokes cannot be disabled if any account has privilege restrictions. If any such account exists, disabling partial_revokes fails:
- For attempts to disable partial_revokes at startup, the server logs an error message and enables partial_revokes.
- For attempts to disable partial_revokes at runtime, an error occurs and the partial_revokes value remains unchanged.

To disable partial_revokes in this case, first modify each account that has partially revoked privileges, either by re-granting the privileges or by removing the account.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0843.jpg?height=127&width=97&top_left_y=1155&top_left_x=404)

\section*{Note}

In privilege assignments, enabling partial_revokes causes MySQL to interpret occurrences of unescaped _ and \% SQL wildcard characters in schema names as literal characters, just as if they had been escaped as \_ and $\backslash \%$. Because this changes how MySQL interprets privileges, it may be advisable to avoid unescaped wildcard characters in privilege assignments for installations where partial_revokes may be enabled.

In addition, use of _ and \% as wildcard characters in grants is deprecated, and you should expect support for them to be removed in a future version of MySQL.

For more information, including instructions for removing partial revokes, see Section 8.2.12, "Privilege Restriction Using Partial Revokes".
- password_history

\begin{tabular}{|l|l|}
\hline Command-Line Format & --password-history=\# \\
\hline System Variable & password_history \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 4294967295 \\
\hline
\end{tabular}

This variable defines the global policy for controlling reuse of previous passwords based on required minimum number of password changes. For an account password used previously, this variable indicates the number of subsequent account password changes that must occur before the password
can be reused. If the value is 0 (the default), there is no reuse restriction based on number of password changes.

Changes to this variable apply immediately to all accounts defined with the PASSWORD HISTORY DEFAULT option.

The global number-of-changes password reuse policy can be overridden as desired for individual accounts using the PASSWORD HISTORY option of the CREATE USER and ALTER USER statements. See Section 8.2.15, "Password Management".
- password_require_current

\begin{tabular}{|l|l|}
\hline Command-Line Format & --password-require-current[=\{OFF| ON\}] \\
\hline System Variable & password_require_current \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & 0FF \\
\hline
\end{tabular}

This variable defines the global policy for controlling whether attempts to change an account password must specify the current password to be replaced.

Changes to this variable apply immediately to all accounts defined with the PASSWORD REQUIRE CURRENT DEFAULT option.

The global verification-required policy can be overridden as desired for individual accounts using the PASSWORD REQUIRE option of the CREATE USER and ALTER USER statements. See Section 8.2.15, "Password Management".
- password_reuse_interval

\begin{tabular}{|l|l|}
\hline Command-Line Format & --password-reuse-interval=\# \\
\hline System Variable & password_reuse_interval \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 4294967295 \\
\hline Unit & days \\
\hline
\end{tabular}

This variable defines the global policy for controlling reuse of previous passwords based on time elapsed. For an account password used previously, this variable indicates the number of days
that must pass before the password can be reused. If the value is 0 (the default), there is no reuse restriction based on time elapsed.

Changes to this variable apply immediately to all accounts defined with the PASSWORD REUSE INTERVAL DEFAULT option.

The global time-elapsed password reuse policy can be overridden as desired for individual accounts using the PASSWORD REUSE INTERVAL option of the CREATE USER and ALTER USER statements. See Section 8.2.15, "Password Management".
- persisted_globals_load

\begin{tabular}{|l|l|}
\hline Command-Line Format & --persisted-globals-load[=\{OFF|ON\}] \\
\hline System Variable & persisted_globals_load \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & ON \\
\hline
\end{tabular}

Whether to load persisted configuration settings from the mysqld-auto.cnf file in the data directory. The server normally processes this file at startup after all other option files (see Section 6.2.2.2, "Using Option Files"). Disabling persisted_globals_load causes the server startup sequence to skip mysqld-auto.cnf.

To modify the contents of mysqld-auto.cnf, use the SET PERSIST, SET PERSIST_ONLY, and RESET PERSIST statements. See Section 7.1.9.3, "Persisted System Variables".
- persist_only_admin_x509_subject

\begin{tabular}{|l|l|}
\hline Command-Line Format & --persist-only-admin-x509subject=string \\
\hline System Variable & persist_only_admin_x509_subject \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Default Value & empty string \\
\hline
\end{tabular}

SET PERSIST and SET PERSIST_ONLY enable system variables to be persisted to the mysqldauto. cnf option file in the data directory (see Section 15.7.6.1, "SET Syntax for Variable Assignment"). Persisting system variables enables runtime configuration changes that affect subsequent server restarts, which is convenient for remote administration not requiring direct access to MySQL server host option files. However, some system variables are nonpersistible or can be persisted only under certain restrictive conditions.

The persist_only_admin_x509_subject system variable specifies the SSL certificate X. 509 Subject value that users must have to be able to persist system variables that are persist-restricted. The default value is the empty string, which disables the Subject check so that persist-restricted system variables cannot be persisted by any user.

If persist_only_admin_x509_subject is nonempty, users who connect to the server using an encrypted connection and supply an SSL certificate with the designated Subject value then can use SET PERSIST_ONLY to persist persist-restricted system variables. For information about persist-restricted system variables and instructions for configuring MySQL to enable
persist_only_admin_x509_subject, see Section 7.1.9.4, "Nonpersistible and PersistRestricted System Variables".
- persist_sensitive_variables_in_plaintext

\begin{tabular}{|l|l|}
\hline Command-Line Format & - persist_sensitive_variables_in_plaintext[=\{OFF ON\}] \\
\hline System Variable & persist_sensitive_variables_in_plaintext \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & ON \\
\hline
\end{tabular}
persist_sensitive_variables_in_plaintext controls whether the server is permitted to store the values of sensitive system variables in an unencrypted format, if keyring component support is not available at the time when SET PERSIST is used to set the value of the system variable. It also controls whether or not the server can start if the encrypted values cannot be decrypted. Note that keyring plugins do not support secure storage of sensitive system variables; a keyring component (see Section 8.4.4, "The MySQL Keyring") must be enabled on the MySQL Server instance to support secure storage.

The default setting, ON, encrypts the values if keyring component support is available, and persists them unencrypted (with a warning) if it is not. The next time any persisted system variable is set, if keyring support is available at that time, the server encrypts the values of any unencrypted sensitive system variables. The ON setting also allows the server to start if encrypted system variable values cannot be decrypted, in which case a warning is issued and the default values for the system variables are used. In that situation, their values cannot be changed until they can be decrypted.

The most secure setting, 0FF, means sensitive system variable values cannot be persisted if keyring component support is unavailable. The 0FF setting also means the server does not start if encrypted system variable values cannot be decrypted.

For more information, see Persisting Sensitive System Variables.
- pid_file

\begin{tabular}{|l|l|}
\hline Command-Line Format & --pid-file=file_name \\
\hline System Variable & pid_file \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & File name \\
\hline
\end{tabular}

The path name of the file in which the server writes its process ID. The server creates the file in the data directory unless an absolute path name is given to specify a different directory. If you specify this variable, you must specify a value. If you do not specify this variable, MySQL uses a default value of host_name.pid, where host_name is the name of the host machine.

The process ID file is used by other programs such as mysqld_safe to determine the server's process ID. On Windows, this variable also affects the default error log file name. See Section 7.4.2, "The Error Log".
- plugin_dir

\begin{tabular}{|l|l|}
\hline Command-Line Format & --plugin-dir=dir_name \\
\hline System Variable & plugin_dir \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Directory name \\
\hline Default Value & BASEDIR/lib/plugin \\
\hline
\end{tabular}

The path name of the plugin directory.
If the plugin directory is writable by the server, it may be possible for a user to write executable code to a file in the directory using SELECT ... INTO DUMPFILE. This can be prevented by making plugin_dir read only to the server or by setting secure_file_priv to a directory where SELECT writes can be made safely.
- port

\begin{tabular}{|l|l|}
\hline Command-Line Format & --port=port_num \\
\hline System Variable & port \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 3306 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 65535 \\
\hline
\end{tabular}

The number of the port on which the server listens for TCP/IP connections. This variable can be set with the --port option.
- preload_buffer_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --preload-buffer-size=\# \\
\hline System Variable & preload_buffer_size \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 32768 \\
\hline Minimum Value & 1024 \\
\hline Maximum Value & 1073741824 \\
\hline Unit & bytes \\
\hline
\end{tabular}

The size of the buffer that is allocated when preloading indexes.
Setting the session value of this system variable is a restricted operation. The session user must have privileges sufficient to set restricted session variables. See Section 7.1.9.1, "System Variable
- print_identified_with_as_hex

\begin{tabular}{|l|l|}
\hline Command-Line Format & --print-identified-with-ashex[=\{OFF|ON\}] \\
\hline System Variable & print_identified_with_as_hex \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

Password hash values displayed in the IDENTIFIED WITH clause of output from SHOW CREATE USER may contain unprintable characters that have adverse effects on terminal displays and in other environments. Enabling print_identified_with_as_hex causes SHOW CREATE USER to display such hash values as hexadecimal strings rather than as regular string literals. Hash values that do not contain unprintable characters still display as regular string literals, even with this variable enabled.
- profiling

If set to 0 or OFF (the default), statement profiling is disabled. If set to 1 or ON, statement profiling is enabled and the SHOW PROFILE and SHOW PROFILES statements provide access to profiling information. See Section 15.7.7.33, "SHOW PROFILES Statement".

This variable is deprecated; expect it to be removed in a future MySQL release.
- profiling_history_size

The number of statements for which to maintain profiling information if profiling is enabled. The default value is 15 . The maximum value is 100 . Setting the value to 0 effectively disables profiling. See Section 15.7.7.33, "SHOW PROFILES Statement".

This variable is deprecated; expect it to be removed in a future MySQL release.
- protocol_compression_algorithms

\begin{tabular}{|l|l|}
\hline Command-Line Format & --protocol-compressionalgorithms=value \\
\hline System Variable & protocol_compression_algorithms \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Set \\
\hline Default Value & zlib, zstd, uncompressed \\
\hline Valid Values & \begin{tabular}{l}
zlib \\
zstd
\end{tabular} \\
\hline
\end{tabular}

The compression algorithms that the server permits for incoming connections. These include connections by client programs and by servers participating in source/replica replication or Group Replication. Compression does not apply to connections for FEDERATED tables.
protocol_compression_algorithms does not control connection compression for X Protocol. See Section 22.5.5, "Connection Compression with X Plugin" for information on how this operates.

The variable value is a list of one or more comma-separated compression algorithm names, in any order, chosen from the following items (not case-sensitive):
- zlib: Permit connections that use the zlib compression algorithm.
- zstd: Permit connections that use the zstd compression algorithm.
- uncompressed: Permit uncompressed connections. If this algorithm name is not included in the protocol_compression_algorithms value, the server does not permit uncompressed connections. It permits only compressed connections that use whichever other algorithms are specified in the value, and there is no fallback to uncompressed connections.

The default value of zlib, zstd, uncompressed indicates that the server permits all compression algorithms.

For more information, see Section 6.2.8, "Connection Compression Control".
- protocol_version

\begin{tabular}{|l|l|}
\hline System Variable & protocol_version \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 10 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 4294967295 \\
\hline
\end{tabular}

The version of the client/server protocol used by the MySQL server.
- proxy_user

\begin{tabular}{|l|l|}
\hline System Variable & proxy_user \\
\hline Scope & Session \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline
\end{tabular}

If the current client is a proxy for another user, this variable is the proxy user account name. Otherwise, this variable is NULL. See Section 8.2.19, "Proxy Users".
- pseudo_replica_mode

\begin{tabular}{|l|lr|}
\hline System Variable & pseudo_replica_mode & \\
\hline Scope & Session & 819 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline
\end{tabular}
pseudo_replica_mode is for internal server use. It assists with the correct handling of transactions that originated on older or newer servers than the server currently processing them. mysqlbinlog sets the value of pseudo_replica_mode to true before executing any SQL statements.

Setting the session value of pseudo_replica_mode is a restricted operation. The session user must have either the REPLICATION_APPLIER privilege (see Section 19.3.3, "Replication Privilege Checks"), or privileges sufficient to set restricted session variables (see Section 7.1.9.1, "System Variable Privileges"). However, note that the variable is not intended for users to set; it is set automatically by the replication infrastructure.
pseudo_replica_mode has the following effects on the handling of prepared XA transactions, which can be attached to or detached from the handling session (by default, the session that issues XA START):
- If true, and the handling session has executed an internal-use BINLOG statement, XA transactions are automatically detached from the session as soon as the first part of the transaction up to XA PREPARE finishes, so they can be committed or rolled back by any session that has the XA_RECOVER_ADMIN privilege.
- If false, XA transactions remain attached to the handling session as long as that session is alive, during which time no other session can commit the transaction. The prepared transaction is only detached if the session disconnects or the server restarts.
pseudo_replica_mode has the following effects on the original_commit_timestamp replication delay timestamp and the original_server_version system variable:
- If true, transactions that do not explicitly set original_commit_timestamp or original_server_version are assumed to originate on another, unknown server, so the value 0 , meaning unknown, is assigned to both the timestamp and the system variable.
- If false, transactions that do not explicitly set original_commit_timestamp or original_server_version are assumed to originate on the current server, so the current timestamp and the current server's version are assigned to the timestamp and the system variable.
pseudo_replica_mode has the following effects on the handling of a statement that sets one or more unsupported (removed or unknown) SQL modes:
- If true, the server ignores the unsupported mode and raises a warning.
- If false, the server rejects the statement with ER_UNSUPPORTED_SQL_MODE.
- pseudo_slave_mode

\begin{tabular}{|l|l|}
\hline Deprecated & Yes \\
\hline System Variable & pseudo_slave_mode \\
\hline Scope & Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline
\end{tabular}

Deprecated alias for pseudo_replica_mode.
- pseudo_thread_id

\begin{tabular}{|l|l|}
\hline System Variable & pseudo_thread_id \\
\hline Scope & Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 2147483647 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 2147483647 \\
\hline
\end{tabular}

This variable is for internal server use.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0851.jpg?height=177&width=277&top_left_y=936&top_left_x=402)

\section*{Warning}

Changing the session value of the pseudo_thread_id system variable changes the value returned by the CONNECTION_ID( ) function.

Setting the session value of this system variable is a restricted operation. The session user must have privileges sufficient to set restricted session variables. See Section 7.1.9.1, "System Variable Privileges".
- query_alloc_block_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --query-alloc-block-size=\# \\
\hline System Variable & query_alloc_block_size \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 8192 \\
\hline Minimum Value & 1024 \\
\hline Maximum Value & 4294966272 \\
\hline Unit & bytes \\
\hline Block Size & 1024 \\
\hline
\end{tabular}

The allocation size in bytes of memory blocks that are allocated for objects created during statement parsing and execution. If you have problems with memory fragmentation, it might help to increase this parameter.

The block size for the byte number is 1024 . A value that is not an exact multiple of the block size is rounded down to the next lower multiple of the block size by MySQL Server before storing the value for the system variable. The parser allows values up to the maximum unsigned integer value for the platform ( 4294967295 or $2^{32}-1$ for a 32 -bit system, 18446744073709551615 or $2^{64}-1$ for a 64 -bit system) but the actual maximum is a block size lower.
- query_prealloc_size

\begin{tabular}{|l|l|}
\hline & Command-Line Format \\
\hline & Deprecated \\
\cline { 2 - 3 } & System Variable \\
\cline { 2 - 3 } & Yes \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 8192 \\
\hline Minimum Value & 8192 \\
\hline Maximum Value (64-bit platforms) & 18446744073709550592 \\
\hline Maximum Value (32-bit platforms) & 4294966272 \\
\hline Unit & bytes \\
\hline Block Size & 1024 \\
\hline
\end{tabular}
query_prealloc_size is deprecated, and setting it has no effect; you should expect its removal in a future release of MySQL.
- rand_seed1

\begin{tabular}{|l|l|}
\hline System Variable & rand_seed1 \\
\hline Scope & Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & N/A \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 4294967295 \\
\hline
\end{tabular}

The rand_seed1 and rand_seed2 variables exist as session variables only, and can be set but not read. The variables-but not their values-are shown in the output of SHOW VARIABLES.

The purpose of these variables is to support replication of the RAND ( ) function. For statements that invoke RAND ( ), the source passes two values to the replica, where they are used to seed the random number generator. The replica uses these values to set the session variables rand_seed1 and rand_seed2 so that RAND ( ) on the replica generates the same value as on the source.
- rand_seed2

See the description for rand_seed1.
- range_alloc_block_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --range-alloc-block-size=\# \\
\hline System Variable & range_alloc_block_size \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & Yes \\
\hline Type & Integer \\
\hline Default Value & 4096 \\
\hline Minimum Value & 4096 \\
\hline Maximum Value (64-bit platforms) & 18446744073709550592 \\
\hline Maximum Value & 4294966272 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Unit & bytes \\
\hline Block Size & 1024 \\
\hline
\end{tabular}

The size in bytes of blocks that are allocated when doing range optimization.
The block size for the byte number is 1024 . A value that is not an exact multiple of the block size is rounded down to the next lower multiple of the block size by MySQL Server before storing the value for the system variable. The parser allows values up to the maximum unsigned integer value for the platform ( 4294967295 or $2^{32}-1$ for a 32 -bit system, 18446744073709551615 or $2^{64}-1$ for a 64 -bit system) but the actual maximum is a block size lower.
- range_optimizer_max_mem_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --range-optimizer-max-mem-size=\# \\
\hline System Variable & range_optimizer_max_mem_size \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & Yes \\
\hline Type & Integer \\
\hline Default Value & 8388608 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 18446744073709551615 \\
\hline Unit & bytes \\
\hline
\end{tabular}

The limit on memory consumption for the range optimizer. A value of 0 means "no limit." If an execution plan considered by the optimizer uses the range access method but the optimizer estimates that the amount of memory needed for this method would exceed the limit, it abandons the plan and considers other plans. For more information, see Limiting Memory Use for Range Optimization.
- rbr_exec_mode

\begin{tabular}{|l|l|}
\hline System Variable & rbr_exec_mode \\
\hline Scope & Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Enumeration \\
\hline Default Value & STRICT \\
\hline Valid Values & \begin{tabular}{l}
STRICT \\
IDEMPOTENT
\end{tabular} \\
\hline
\end{tabular}

For internal use by mysqlbinlog. This variable switches the server between IDEMPOTENT mode and STRICT mode. IDEMPOTENT mode causes suppression of duplicate-key and no-key-found errors in BINLOG statements generated by mysqlbinlog. This mode is useful when replaying a row-based binary log on a server that causes conflicts with existing data. mysqlbinlog sets this mode when you specify the --idempotent option by writing the following to the output:
```
SET SESSION RBR_EXEC_MODE=IDEMPOTENT;
```

- read_buffer_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - read - buffer - size=\# \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline System Variable & read_buffer_size \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & Yes \\
\hline Type & Integer \\
\hline Default Value & 131072 \\
\hline Minimum Value & 8192 \\
\hline Maximum Value & 2147479552 \\
\hline Unit & bytes \\
\hline Block Size & 4096 \\
\hline
\end{tabular}

Each thread that does a sequential scan for a MyISAM table allocates a buffer of this size (in bytes) for each table it scans. If you do many sequential scans, you might want to increase this value, which defaults to 131072 . The value of this variable should be a multiple of 4 KB . If it is set to a value that is not a multiple of 4 KB , its value is rounded down to the nearest multiple of 4 KB .

This option is also used in the following context for all other storage engines with the exception of InnoDB:
- For caching the indexes in a temporary file (not a temporary table), when sorting rows for ORDER $B Y$.
- For bulk insert into partitions.
- For caching results of nested queries.
read_buffer_size is also used in one other storage engine-specific way: to determine the memory block size for MEMORY tables.
select_into_buffer_size is used for the I/O cache buffer for SELECT INTO DUMPFILE and SELECT INTO OUTFILE statements. (read_buffer_size is used for the I/O cache buffer size in all other cases.)

For more information about memory use during different operations, see Section 10.12.3.1, "How MySQL Uses Memory".
- read_only

\begin{tabular}{|l|l|}
\hline Command-Line Format & --read-only[=\{OFF | ON\}] \\
\hline System Variable & read_only \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline
\end{tabular}

\section*{Default Value}

\section*{OFF}

If the read_only system variable is enabled, the server permits no client updates except from users who have the CONNECTION_ADMIN privilege (or the deprecated SUPER privilege). This variable is disabled by default.

The server also supports a super_read_only system variable (disabled by default), which has these effects:
- If super_read_only is enabled, the server prohibits client updates, even from users who have the CONNECTION_ADMIN or SUPER privilege.
- Setting super_read_only to ON implicitly forces read_only to ON.
- Setting read_only to OFF implicitly forces super_read_only to OFF.

When read_only is enabled and when super_read_only is enabled, the server still permits these operations:
- Updates performed by replication threads, if the server is a replica. In replication setups, it can be useful to enable read_only on replica servers to ensure that replicas accept updates only from the source server and not from clients.
- Writes to the system table mysql.gtid_executed, which stores GTIDs for executed transactions that are not present in the current binary log file.
- Use of ANALYZE TABLE or OPTIMIZE TABLE statements. The purpose of read-only mode is to prevent changes to table structure or contents. Analysis and optimization do not qualify as such changes. This means, for example, that consistency checks on read-only replicas can be performed with mysqlcheck --all-databases --analyze.
- Use of FLUSH STATUS statements, which are always written to the binary log.
- Operations on TEMPORARY tables.
- Inserts into the log tables (mysql.general_log and mysql.slow_log); see Section 7.4.1, "Selecting General Query Log and Slow Query Log Output Destinations".
- Updates to Performance Schema tables, such as UPDATE or TRUNCATE TABLE operations.

Changes to read_only on a replication source server are not replicated to replica servers. The value can be set on a replica independent of the setting on the source.

The following conditions apply to attempts to enable read_only (including implicit attempts resulting from enabling super_read_only):
- The attempt fails and an error occurs if you have any explicit locks (acquired with LOCK TABLES) or have a pending transaction.
- The attempt blocks while other clients have any ongoing statement, active LOCK TABLES WRITE, or ongoing commit, until the locks are released and the statements and transactions end. While the attempt to enable read_only is pending, requests by other clients for table locks or to begin transactions also block until read_only has been set.
- The attempt blocks if there are active transactions that hold metadata locks, until those transactions end.
- read_only can be enabled while you hold a global read lock (acquired with FLUSH TABLES WITH READ LOCK) because that does not involve table locks.
- read_rnd_buffer_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --read-rnd-buffer-size=\# \\
\hline System Variable & read_rnd_buffer_size \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & Yes \\
\hline Type & Integer \\
\hline Default Value & 262144 \\
\hline Minimum Value & 1 \\
\hline Maximum Value & 2147483647 \\
\hline Unit & bytes \\
\hline
\end{tabular}

This variable is used for reads from MyISAM tables, and, for any storage engine, for Multi-Range Read optimization.

When reading rows from a MyISAM table in sorted order following a key-sorting operation, the rows are read through this buffer to avoid disk seeks. See Section 10.2.1.16, "ORDER BY Optimization". Setting the variable to a large value can improve ORDER BY performance by a lot. However, this is a buffer allocated for each client, so you should not set the global variable to a large value. Instead, change the session variable only from within those clients that need to run large queries.

For more information about memory use during different operations, see Section 10.12.3.1, "How MySQL Uses Memory". For information about Multi-Range Read optimization, see Section 10.2.1.11, "Multi-Range Read Optimization".
- regexp_stack_limit

\begin{tabular}{|l|l|}
\hline Command-Line Format & --regexp-stack-limit=\# \\
\hline System Variable & regexp_stack_limit \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 8000000 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 2147483647 \\
\hline Unit & bytes \\
\hline
\end{tabular}

The maximum available memory in bytes for the internal stack used for regular expression matching operations performed by REGEXP_LIKE( ) and similar functions (see Section 14.8.2, "Regular Expressions").
- regexp_time_limit

\begin{tabular}{|l|l|}
\hline Command-Line Format & --regexp-time-limit=\# \\
\hline System Variable & regexp_time_limit \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Type & Integer \\
\hline Default Value & 32 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 2147483647 \\
\hline
\end{tabular}

The time limit for regular expression matching operations performed by REGEXP_LIKE() and similar functions (see Section 14.8.2, "Regular Expressions"). This limit is expressed as the maximum permitted number of steps performed by the match engine, and thus affects execution time only indirectly. Typically, it is on the order of milliseconds.
- require_row_format

\begin{tabular}{|l|l|}
\hline System Variable & require_row_format \\
\hline Scope & Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & 0FF \\
\hline
\end{tabular}

This variable is for internal server use by replication and mysqlbinlog. It restricts DML events executed in the session to events encoded in row-based binary logging format only, and temporary tables cannot be created. Queries that do not respect the restrictions fail.

Setting the session value of this system variable to ON requires no privileges. Setting the session value of this system variable to 0FF is a restricted operation, and the session user must have privileges sufficient to set restricted session variables. See Section 7.1.9.1, "System Variable Privileges".
- require_secure_transport

\begin{tabular}{|l|l|}
\hline Command-Line Format & --require-secure-transport[=\{OFF| ON\}] \\
\hline System Variable & require_secure_transport \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

Whether client connections to the server are required to use some form of secure transport. When this variable is enabled, the server permits only TCP/IP connections encrypted using TLS/SSL, or connections that use a socket file (on Unix) or shared memory (on Windows). The server rejects nonsecure connection attempts, which fail with an ER_SECURE_TRANSPORT_REQUIRED error.

This capability supplements per-account SSL requirements, which take precedence. For example, if an account is defined with REQUIRE SSL, enabling require_secure_transport does not make it possible to use the account to connect using a Unix socket file.

It is possible for a server to have no secure transports available. For example, a server on Windows supports no secure transports if started without specifying any SSL certificate or key files and with the shared_memory system variable disabled. Under these conditions, attempts to enable require_secure_transport at startup cause the server to write a
message to the error log and exit. Attempts to enable the variable at runtime fail with an ER_NO_SECURE_TRANSPORTS_CONFIGURED error.

All replication group members should have the same value for this variable; otherwise, some members may not be able to join.

See also Configuring Encrypted Connections as Mandatory.
- restrict_fk_on_non_standard_key

\begin{tabular}{|l|l|}
\hline Command-Line Format & --restrict-fk-on-non-standard-key \\
\hline Deprecated & Yes \\
\hline System Variable & restrict_fk_on_non_standard_key \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & ON \\
\hline
\end{tabular}

This variable, when ON (the default), prevents the use of non-unique keys or partial keys as foreign keys. To allow such keys to be used as foreign keys in the current session, use SET @@session.restrict_fk_on_non_standard_key=0FF; to allow them to be used globally, set the global variable or start the server with --skip-restrict-fk-on-non-standard-key.

Using non-unique or partial keys as foreign keys in a CREATE TABLE or ALTER TABLE statement is deprecated, and you should expect support for it to be removed in a future version of MySQL. When restrict_fk_on_non_standard_key is ON, attempts to do so are rejected with ER_FK_NO_INDEX_PARENT; when it is OFF, this usage is permitted but still raises ER_WARN_DEPRECATED_NON_STANDARD_KEY as a warning.
restrict_fk_on_non_standard_key is deprecated, and subject to removal in a future version of MySQL. Setting it raises a deprecation warning.

Implication for MySQL Replication. When a foreign key is created on a nonstandard key on the primary because restrict_fk_on_non_standard_key is 0FF, the statement succeeds on the replica regardless of any setting on the replica for this variable.
- resultset_metadata

\begin{tabular}{|l|l|}
\hline System Variable & resultset_metadata \\
\hline Scope & Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Enumeration \\
\hline Default Value & FULL \\
\hline Valid Values & \begin{tabular}{l}
FULL \\
NONE
\end{tabular} \\
\hline
\end{tabular}

For connections for which metadata transfer is optional, the client sets the resultset_metadata system variable to control whether the server returns result set metadata. Permitted values are FULL (return all metadata; this is the default) and NONE (return no metadata).

For connections that are not metadata-optional, setting resultset_metadata to NONE produces an error.

For details about managing result set metadata transfer, see Optional Result Set Metadata.
- secondary_engine_cost_threshold

For use with MySQL HeatWave only. See System Variables, for more information.
- schema_definition_cache

\begin{tabular}{|l|l|}
\hline Command-Line Format & --schema-definition-cache=\# \\
\hline System Variable & schema_definition_cache \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 256 \\
\hline Minimum Value & 256 \\
\hline Maximum Value & 524288 \\
\hline
\end{tabular}

Defines a limit for the number of schema definition objects, both used and unused, that can be kept in the dictionary object cache.

Unused schema definition objects are only kept in the dictionary object cache when the number in use is less than the capacity defined by schema_definition_cache.

A setting of 0 means that schema definition objects are only kept in the dictionary object cache while they are in use.

For more information, see Section 16.4, "Dictionary Object Cache".
- secure_file_priv

\begin{tabular}{|l|l|}
\hline Command-Line Format & --secure-file-priv=dir_name \\
\hline System Variable & secure_file_priv \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Default Value & platform specific \\
\hline Valid Values & \begin{tabular}{l}
empty string \\
dirname \\
NULL
\end{tabular} \\
\hline
\end{tabular}

This variable is used to limit the effect of data import and export operations, such as those performed by the LOAD DATA and SELECT ... INTO OUTFILE statements and the LOAD_FILE() function. These operations are permitted only to users who have the FILE privilege.
secure_file_priv may be set as follows:
- If empty, the variable has no effect. This is not a secure setting.
- If set to the name of a directory, the server limits import and export operations to work only with files in that directory. The directory must exist; the server does not create it.
- If set to NULL, the server disables import and export operations.

The default value is platform specific and depends on the value of the INSTALL_LAYOUT CMake option, as shown in the following table. To specify the default secure_file_priv value explicitly if you are building from source, use the INSTALL_SECURE_FILE_PRIVDIR CMake option.

\begin{tabular}{|l|l|}
\hline INSTALL_LAYOUT Value & Default secure_file_priv Value \\
\hline STANDALONE & empty \\
\hline DEB, RPM, SVR4 & /var/lib/mysql-files \\
\hline Otherwise & mysql-files under the CMAKE_INSTALL_PREFIX value \\
\hline
\end{tabular}

The server checks the value of secure_file_priv at startup and writes a warning to the error log if the value is insecure. A non-NULL value is considered insecure if it is empty, or the value is the data directory or a subdirectory of it, or a directory that is accessible by all users. If secure_file_priv is set to a nonexistent path, the server writes an error message to the error log and exits.
- select_into_buffer_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --select-into-buffer-size=\# \\
\hline System Variable & select_into_buffer_size \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & Yes \\
\hline Type & Integer \\
\hline Default Value & 131072 \\
\hline Minimum Value & 8192 \\
\hline Maximum Value & 2147479552 \\
\hline Unit & bytes \\
\hline Block Size & 4096 \\
\hline
\end{tabular}

When using SELECT INTO OUTFILE or SELECT INTO DUMPFILE to dump data into one or more files for backup creation, data migration, or other purposes, writes can often be buffered and then trigger a large burst of write I/O activity to the disk or other storage device and stall other queries that are more sensitive to latency. You can use this variable to control the size of the buffer used to write data to the storage device to determine when buffer synchronization should occur, and thus to prevent write stalls of the kind just described from occurring.
select_into_buffer_size overrides any value set for read_buffer_size. (select_into_buffer_size and read_buffer_size have the same default, maximum, and minimum values.) You can also use select_into_disk_sync_delay to set a timeout to be observed afterwards, each time synchronization takes place.

Setting the session value of this system variable is a restricted operation. The session user must have privileges sufficient to set restricted session variables. See Section 7.1.9.1, "System Variable Privileges".
- select_into_disk_sync

\begin{tabular}{|l|l|}
\hline Command-Line Format & --select-into-disk-sync=\{ON|OFF\} \\
\hline System Variable & select_into_disk_sync \\
\hline \hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & Yes \\
\hline Type & Boolean \\
\hline Default Value & 0FF \\
\hline Valid Values & \begin{tabular}{l}
OFF \\
ON
\end{tabular} \\
\hline
\end{tabular}

When set on ON, enables buffer synchronization of writes to an output file by a long-running SELECT INTO OUTFILE or SELECT INTO DUMPFILE statement using select_into_buffer_size.
- select_into_disk_sync_delay

\begin{tabular}{|l|l|}
\hline Command-Line Format & --select-into-disk-sync-delay=\# \\
\hline System Variable & select_into_disk_sync_delay \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & Yes \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 31536000 \\
\hline Unit & milliseconds \\
\hline
\end{tabular}

When buffer synchronization of writes to an output file by a long-running SELECT INTO OUTFILE or SELECT INTO DUMPFILE statement is enabled by select_into_disk_sync, this variable sets an optional delay (in milliseconds) following synchronization. 0 (the default) means no delay.

Setting the session value of this system variable is a restricted operation. The session user must have privileges sufficient to set restricted session variables. See Section 7.1.9.1, "System Variable Privileges".
- session_track_gtids

\begin{tabular}{|l|l|}
\hline Command-Line Format & --session-track-gtids=value \\
\hline System Variable & session_track_gtids \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Enumeration \\
\hline Default Value & 0FF \\
\hline Valid Values & \begin{tabular}{l}
OFF \\
OWN_GTID \\
ALL_GTIDS
\end{tabular} \\
\hline
\end{tabular}

Controls whether the server returns GTIDs to the client, enabling the client to use them to track the server state. Depending on the variable value, at the end of executing each transaction, the server's

GTIDs are captured and returned to the client as part of the acknowledgement. The possible values for session_track_gtids are as follows:
- OFF: The server does not return GTIDs to the client. This is the default.
- OWN_GTID: The server returns the GTIDs for all transactions that were successfully committed by this client in its current session since the last acknowledgement. Typically, this is the single GTID for the last transaction committed, but if a single client request resulted in multiple transactions, the server returns a GTID set containing all the relevant GTIDs.
- ALL_GTIDS: The server returns the global value of its gtid_executed system variable, which it reads at a point after the transaction is successfully committed. As well as the GTID for the transaction just committed, this GTID set includes all transactions committed on the server by any client, and can include transactions committed after the point when the transaction currently being acknowledged was committed.
session_track_gtids cannot be set within transactional context.
For more information about session state tracking, see Section 7.1.18, "Server Tracking of Client Session State".
- session_track_schema

\begin{tabular}{|l|l|}
\hline Command-Line Format & --session-track-schema [=\{OFF|ON\}] \\
\hline System Variable & session_track_schema \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & ON \\
\hline
\end{tabular}

Controls whether the server tracks when the default schema (database) is set within the current session and notifies the client to make the schema name available.

If the schema name tracker is enabled, name notification occurs each time the default schema is set, even if the new schema name is the same as the old.

For more information about session state tracking, see Section 7.1.18, "Server Tracking of Client Session State".
- session_track_state_change

\begin{tabular}{|l|l|}
\hline Command-Line Format & --session-track-state-change[=\{0FF| ON\}] \\
\hline System Variable & session_track_state_change \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

Controls whether the server tracks changes to the state of the current session and notifies the client when state changes occur. Changes can be reported for these attributes of client session state:
- Session-specific values for system variables.
- User-defined variables.
- Temporary tables.
- Prepared statements.

If the session state tracker is enabled, notification occurs for each change that involves tracked session attributes, even if the new attribute values are the same as the old. For example, setting a user-defined variable to its current value results in a notification.

The session_track_state_change variable controls only notification of when changes occur, not what the changes are. For example, state-change notifications occur when the default schema is set or tracked session system variables are assigned, but the notification does not include the schema name or variable values. To receive notification of the schema name or session system variable values, use the session_track_schema or session_track_system_variables system variable, respectively.

\section*{Note}

Assigning a value to session_track_state_change itself is not considered a state change and is not reported as such. However, if its name listed in the value of session_track_system_variables, any assignments to it do result in notification of the new value.

For more information about session state tracking, see Section 7.1.18, "Server Tracking of Client Session State".
- session_track_system_variables

\begin{tabular}{|l|l|}
\hline Command-Line Format & --session-track-system-variables=\# \\
\hline System Variable & session_track_system_variables \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Default Value & time_zone, autocommit, character_set_client, character_set_results, character_set_connection \\
\hline
\end{tabular}

Controls whether the server tracks assignments to session system variables and notifies the client of the name and value of each assigned variable. The variable value is a commaseparated list of variables for which to track assignments. By default, notification is enabled for time_zone, autocommit, character_set_client, character_set_results, and character_set_connection. (The latter three variables are those affected by SET NAMES.)

To enable display of the Statement ID for each statement processed, use the statement_id variable. For example:
```
mysql> SET @@SESSION.session_track_system_variables='statement_id'
mysql> SELECT 1;
+---+
| 1 |
+---+
| 1 |
+---+
```


1 row in set ( 0.0006 sec )
Statement ID: 603835

The special value * (asterisk) causes the server to track assignments to all session variables. If given, this value must be specified by itself without specific system variable names. This value also enables display of the Statement ID for each successful statement processed.

To disable notification of session variable assignments, set session_track_system_variables to the empty string.

If session system variable tracking is enabled, notification occurs for all assignments to tracked session variables, even if the new values are the same as the old.

For more information about session state tracking, see Section 7.1.18, "Server Tracking of Client Session State".
- session_track_transaction_info

\begin{tabular}{|l|l|}
\hline Command-Line Format & --session-track-transactioninfo=value \\
\hline System Variable & session_track_transaction_info \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Enumeration \\
\hline Default Value & OFF \\
\hline Valid Values & \begin{tabular}{l}
OFF \\
STATE \\
CHARACTERISTICS
\end{tabular} \\
\hline
\end{tabular}

Controls whether the server tracks the state and characteristics of transactions within the current session and notifies the client to make this information available. These session_track_transaction_info values are permitted:
- OFF: Disable transaction state tracking. This is the default.
- STATE: Enable transaction state tracking without characteristics tracking. State tracking enables the client to determine whether a transaction is in progress and whether it could be moved to a different session without being rolled back.
- CHARACTERISTICS: Enable transaction state tracking, including characteristics tracking. Characteristics tracking enables the client to determine how to restart a transaction in another session so that it has the same characteristics as in the original session. The following characteristics are relevant for this purpose:
```
ISOLATION LEVEL
READ ONLY
READ WRITE
WITH CONSISTENT SNAPSHOT
```


For a client to safely relocate a transaction to another session, it must track not only transaction state but also transaction characteristics. In addition, the client must track the transaction_isolation and transaction_read_only system variables to correctly determine the session defaults. (To
track these variables, list them in the value of the session_track_system_variables system variable.)

For more information about session state tracking, see Section 7.1.18, "Server Tracking of Client Session State".
- set_operations_buffer_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --set-operations-buffer-size=\# \\
\hline System Variable & set_operations_buffer_size \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 256K \\
\hline Minimum Value & 16K \\
\hline Maximum Value & 1 GB \\
\hline Unit & bytes \\
\hline Block Size & 128 \\
\hline
\end{tabular}

Sets the buffer size for INTERSECT and EXCEPT operations that use hash tables when the hash_set_operations optimizer switch is ON. In general, increasing the size of this buffer improves performance of these operations when the hashing optimization is enabled.
- sha256_password_auto_generate_rsa_keys

\begin{tabular}{|l|l|}
\hline Command-Line Format & --sha256-password-auto-generate-rsakeys[=\{OFF|ON\}] \\
\hline Deprecated & Yes \\
\hline System Variable & sha256_password_auto_generate_rsa_keys \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & ON \\
\hline
\end{tabular}

The server uses this variable to determine whether to autogenerate RSA private/public key-pair files in the data directory if they do not already exist.

At startup, the server automatically generates RSA private/public key-pair files in the data directory if all of these conditions are true: The sha256_password_auto_generate_rsa_keys or caching_sha2_password_auto_generate_rsa_keys system variable is enabled; no RSA options are specified; the RSA files are missing from the data directory. These key-pair files enable secure password exchange using RSA over unencrypted connections for accounts authenticated by the sha256_password (deprecated) or caching_sha2_password plugin; see Section 8.4.1.3, "SHA-256 Pluggable Authentication", and Section 8.4.1.2, "Caching SHA-2 Pluggable Authentication".

For more information about RSA file autogeneration, including file names and characteristics, see Section 8.3.3.1, "Creating SSL and RSA Certificates and Keys using MySQL"

The auto_generate_certs system variable is related but controls autogeneration of SSL certificate and key files needed for secure connections using SSL.
- sha256_password_private_key_path

\begin{tabular}{|l|l|}
\hline Command-Line Format & --sha256-password-private-keypath=file_name \\
\hline Deprecated & Yes \\
\hline System Variable & sha256_password_private_key_path \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & File name \\
\hline Default Value & private_key.pem \\
\hline
\end{tabular}

The value of this variable is the path name of the RSA private key file for the sha256_password (deprecated) authentication plugin. If the file is named as a relative path, it is interpreted relative to the server data directory. The file must be in PEM format.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0866.jpg?height=104&width=106&top_left_y=1018&top_left_x=338)

\section*{Important}

Because this file stores a private key, its access mode should be restricted so that only the MySQL server can read it.

For information about sha256_password, see Section 8.4.1.3, "SHA-256 Pluggable Authentication".
- sha256_password_proxy_users

\begin{tabular}{|l|l|}
\hline Command-Line Format & --sha256-password-proxy-users [=\{OFF| ON\}] \\
\hline Deprecated & Yes \\
\hline System Variable & sha256_password_proxy_users \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

This variable controls whether the sha256_password (deprecated) built-in authentication plugin supports proxy users. It has no effect unless the check_proxy_users system variable is enabled. For information about user proxying, see Section 8.2.19, "Proxy Users".
- sha256_password_public_key_path

\begin{tabular}{|l|l|}
\hline Command-Line Format & --sha256-password-public-keypath=file_name \\
\hline Deprecated & Yes \\
\hline System Variable & sha256_password_public_key_path \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & File name \\
\hline Default Value & public_key.pem \\
\hline
\end{tabular}

The value of this variable is the path name of the RSA public key file for the sha256_password (deprecated) authentication plugin. If the file is named as a relative path, it is interpreted relative to the server data directory. The file must be in PEM format. Because this file stores a public key, copies can be freely distributed to client users. (Clients that explicitly specify a public key when connecting to the server using RSA password encryption must use the same public key as that used by the server.)

For information about sha256_password (deprecated), including information about how clients specify the RSA public key, see Section 8.4.1.3, "SHA-256 Pluggable Authentication".
- shared_memory

\begin{tabular}{|l|l|}
\hline Command-Line Format & --shared-memory[=\{OFF | ON ] ] \\
\hline System Variable & shared_memory \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Platform Specific & Windows \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}
(Windows only.) Whether the server permits shared-memory connections.
- shared_memory_base_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & --shared-memory-base-name=name \\
\hline System Variable & shared_memory_base_name \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Platform Specific & Windows \\
\hline Type & String \\
\hline Default Value & MYSQL \\
\hline
\end{tabular}
(Windows only.) The name of shared memory to use for shared-memory connections. This is useful when running multiple MySQL instances on a single physical machine. The default name is MYSQL.
The name is case-sensitive.
This variable applies only if the server is started with the shared_memory system variable enabled to support shared-memory connections.
- show_create_table_skip_secondary_engine

For use with MySQL HeatWave only. See System Variables, for more information.
- show_create_table_verbosity

\begin{tabular}{|l|l|}
\hline Command-Line Format & --show-create-table-verbosity[=\{OFF| ON\}] \\
\hline System Variable & show_create_table_verbosity \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

SHOW CREATE TABLE normally does not show the ROW_FORMAT table option if the row format is the default format. Enabling this variable causes SHOW CREATE TABLE to display ROW_FORMAT regardless of whether it is the default format.
- show_gipk_in_create_table_and_information_schema

\begin{tabular}{|l|l|}
\hline Command-Line Format & --show-gipk-in-create-table-and-information-schema[=\{OFF|ON\}] \\
\hline System Variable & show_gipk_in_create_table_and_information_sche \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & ON \\
\hline
\end{tabular}

Whether generated invisible primary keys are visible in the output of SHOW statements and in Information Schema tables. When this variable is set to 0FF, such keys are not shown.

This variable is not replicated.
For more information, see Section 15.1.20.11, "Generated Invisible Primary Keys".
- skip_external_locking

\begin{tabular}{|l|l|}
\hline Command-Line Format & --skip-external-locking[=\{OFF|ON\}] \\
\hline System Variable & skip_external_locking \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & ON \\
\hline
\end{tabular}

This is OFF if mysqld uses external locking (system locking), ON if external locking is disabled. This affects only MyISAM table access.

This variable is set by the --external-locking or --skip-external-locking option. External locking is disabled by default.

External locking affects only MyISAM table access. For more information, including conditions under which it can and cannot be used, see Section 10.11.5, "External Locking".
- skip_name_resolve

\begin{tabular}{|l|l|l|}
\hline \multirow{4}{*}{} & Command-Line Format & --skip-name-resolve[=\{OFF|ON\}] \\
\hline & System Variable & skip_name_resolve \\
\hline & Scope & Global \\
\hline & Dynamic & No \\
\hline 838 & SET_VAR Hint Applies & No \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

Whether to resolve host names when checking client connections. If this variable is 0FF, mysqld resolves host names when checking client connections. If it is 0N, mysqld uses only IP numbers; in this case, all Host column values in the grant tables must be IP addresses. See Section 7.1.12.3, "DNS Lookups and the Host Cache".

Depending on the network configuration of your system and the Host values for your accounts, clients may need to connect using an explicit --host option, such as --host=127.0.0.1 or -host=::1.

An attempt to connect to the host 127.0.0.1 normally resolves to the localhost account. However, this fails if the server is run with skip_name_resolve enabled. If you plan to do that, make sure an account exists that can accept a connection. For example, to be able to connect as root using --host=127.0.0.1 or --host=::1, create these accounts:
```
CREATE USER 'root'@'127.0.0.1' IDENTIFIED BY 'root-password';
CREATE USER 'root'@'::1' IDENTIFIED BY 'root-password';
```

- skip_networking

\begin{tabular}{|l|l|}
\hline Command-Line Format & --skip-networking[=\{OFF|ON\}] \\
\hline System Variable & skip_networking \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

This variable controls whether the server permits TCP/IP connections. By default, it is disabled (permit TCP connections). If enabled, the server permits only local (non-TCP/IP) connections and all interaction with mysqld must be made using named pipes or shared memory (on Windows) or Unix socket files (on Unix). This option is highly recommended for systems where only local clients are permitted. See Section 7.1.12.3, "DNS Lookups and the Host Cache".

Because starting the server with--skip-grant-tables disables authentication checks, the server also disables remote connections in that case by enabling skip_networking.
- skip_show_database

\begin{tabular}{|l|l|}
\hline Command-Line Format & --skip-show-database \\
\hline System Variable & skip_show_database \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & 0FF \\
\hline
\end{tabular}

This prevents people from using the SHOW DATABASES statement if they do not have the SHOW DATABASES privilege. This can improve security if you have concerns about users being able to see databases belonging to other users. Its effect depends on the SHOW DATABASES privilege: If the variable value is ON, the SHOW DATABASES statement is permitted only to users who have the SHOW

DATABASES is permitted to all users, but displays the names of only those databases for which the user has the SHOW DATABASES or other privilege.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0870.jpg?height=119&width=108&top_left_y=370&top_left_x=333)

\section*{Caution}

Because any static global privilege is considered a privilege for all databases, any static global privilege enables a user to see all database names with SHOW DATABASES or by examining the SCHEMATA table of INFORMATION_SCHEMA, except databases that have been restricted at the database level by partial revokes.
- slow_launch_time

\begin{tabular}{|l|l|}
\hline Command-Line Format & --slow-launch-time=\# \\
\hline System Variable & slow_launch_time \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 2 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 31536000 \\
\hline Unit & seconds \\
\hline
\end{tabular}

If creating a thread takes longer than this many seconds, the server increments the Slow_launch_threads status variable.
- slow_query_log

\begin{tabular}{|l|l|}
\hline Command-Line Format & --slow-query-log[=\{OFF|ON\}] \\
\hline System Variable & slow_query_log \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

Whether the slow query log is enabled. The value can be 0 (or OFF) to disable the log or 1 (or ON) to enable the log. The destination for log output is controlled by the log_output system variable; if that value is NONE, no log entries are written even if the log is enabled.
"Slow" is determined by the value of the long_query_time variable. See Section 7.4.5, "The Slow Query Log".
- slow_query_log_file

\begin{tabular}{|l|l|}
\hline Command-Line Format & --slow-query-log-file=file_name \\
\hline System Variable & slow_query_log_file \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Type & File name \\
\hline Default Value & host_name-slow.log \\
\hline
\end{tabular}

The name of the slow query log file. The default value is host_name-slow.log, but the initial value can be changed with the --slow_query_log_file option.
- socket

\begin{tabular}{|l|l|}
\hline Command-Line Format & --socket=\{file_name|pipe_name\} \\
\hline System Variable & socket \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Default Value (Windows) & MySQL \\
\hline Default Value (Other) & /tmp/mysql.sock \\
\hline
\end{tabular}

On Unix platforms, this variable is the name of the socket file that is used for local client connections. The default is /tmp/mysql. sock. (For some distribution formats, the directory might be different, such as /var/lib/mysql for RPMs.)

On Windows, this variable is the name of the named pipe that is used for local client connections. The default value is MySQL (not case-sensitive).
- sort_buffer_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --sort-buffer-size=\# \\
\hline System Variable & sort_buffer_size \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & Yes \\
\hline Type & Integer \\
\hline Default Value & 262144 \\
\hline Minimum Value & 32768 \\
\hline Maximum Value (Windows) & 4294967295 \\
\hline Maximum Value (Other, 64-bit platforms) & 18446744073709551615 \\
\hline Maximum Value (Other, 32-bit platforms) & 4294967295 \\
\hline Unit & bytes \\
\hline
\end{tabular}

Each session that must perform a sort allocates a buffer of this size. sort_buffer_size is not specific to any storage engine and applies in a general manner for optimization. At minimum the sort_buffer_size value must be large enough to accommodate fifteen tuples in the sort buffer. Also, increasing the value of max_sort_length may require increasing the value of sort_buffer_size. For more information, see Section 10.2.1.16, "ORDER BY Optimization"

If you see many Sort_merge_passes per second in SHOW GLOBAL STATUS output, you can consider increasing the sort_buffer_size value to speed up ORDER BY or GROUP BY operations that cannot be improved with query optimization or improved indexing.

The optimizer tries to work out how much space is needed but can allocate more, up to the limit. Setting it larger than required globally slows down most queries that perform sorts. It is best to
increase it as a session setting, and only for the sessions that need a larger size. On Linux, there are thresholds of 256 KB and 2 MB where larger values may significantly slow down memory allocation, so you should consider staying below one of those values. Experiment to find the best value for your workload. See Section B.3.3.5, "Where MySQL Stores Temporary Files".

The maximum permissible setting for sort_buffer_size is 4GB-1. Larger values are permitted for 64-bit platforms (except 64-bit Windows, for which large values are truncated to 4GB-1 with a warning).
- sql_auto_is_null

\begin{tabular}{|l|l|}
\hline System Variable & sql_auto_is_null \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & Yes \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

If this variable is enabled, then after a statement that successfully inserts an automatically generated AUTO_INCREMENT value, you can find that value by issuing a statement of the following form:

SELECT * FROM tbl_name WHERE auto_col IS NULL
If the statement returns a row, the value returned is the same as if you invoked the LAST_INSERT_ID( ) function. For details, including the return value after a multiple-row insert, see Section 14.15, "Information Functions". If no AUTO_INCREMENT value was successfully inserted, the SELECT statement returns no row.

The behavior of retrieving an AUTO_INCREMENT value by using an IS NULL comparison is used by some ODBC programs, such as Access. See Obtaining Auto-Increment Values. This behavior can be disabled by setting sql_auto_is_null to OFF.

The default value of sql_auto_is_null is OFF.
- sql_big_selects

\begin{tabular}{|l|l|}
\hline System Variable & sql_big_selects \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & Yes \\
\hline Type & Boolean \\
\hline Default Value & ON \\
\hline
\end{tabular}

If set to OFF, MySQL aborts SELECT statements that are likely to take a very long time to execute (that is, statements for which the optimizer estimates that the number of examined rows exceeds the value of max_join_size). This is useful when an inadvisable WHERE statement has been issued. The default value for a new connection is ON, which permits all SELECT statements.

If you set the max_join_size system variable to a value other than DEFAULT, sql_big_selects is set to OFF.
- sql_buffer_result

\begin{tabular}{l|l|l|}
\cline { 2 - 3 } & System Variable & sql_buffer_result \\
\hline 842 & Scope & Global, Session \\
\cline { 2 - 3 } & &
\end{tabular}

\begin{tabular}{|l|l|} 
Dynamic & Yes \\
\hline SET_VAR Hint Applies & Yes \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

If enabled, sql_buffer_result forces results from SELECT statements to be put into temporary tables. This helps MySQL free the table locks early and can be beneficial in cases where it takes a long time to send results to the client. The default value is OFF.
- sql_generate_invisible_primary_key

\begin{tabular}{|l|l|}
\hline Command-Line Format & --sql-generate-invisible-primarykey[=\{OFF|ON\}] \\
\hline System Variable & sql_generate_invisible_primary_key \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

Whether this server adds a generated invisible primary key to any InnoDB table that is created without one.

This variable is not replicated. In addition, even if set on the replica, it is ignored by replication applier threads; this means that, by default, a replica does not generate a primary key for any replicated table which, on the source, was created without one. You can cause the replica to generate invisible primary keys for such tables by setting REQUIRE_TABLE_PRIMARY_KEY_CHECK = GENERATE as part of a CHANGE REPLICATION SOURCE TO statement, optionally specifying a replication channel.

For more information and examples, see Section 15.1.20.11, "Generated Invisible Primary Keys".
- sql_log_off

\begin{tabular}{|l|l|}
\hline System Variable & sql_log_off \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline Valid Values & \begin{tabular}{l}
OFF (enable logging) \\
ON (disable logging)
\end{tabular} \\
\hline
\end{tabular}

This variable controls whether logging to the general query log is disabled for the current session (assuming that the general query log itself is enabled). The default value is OFF (that is, enable logging). To disable or enable general query logging for the current session, set the session sql_log_off variable to ON or OFF.

Setting the session value of this system variable is a restricted operation. The session user must have privileges sufficient to set restricted session variables. See Section 7.1.9.1, "System Variable Privileges".
- sql_mode

\begin{tabular}{|l|l|}
\hline Command-Line Format & --sql-mode=name \\
\hline System Variable & sql_mode \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & Yes \\
\hline Type & Set \\
\hline Default Value & \begin{tabular}{l}
ONLY_FULL_GROUP_BY \\
STRICT_TRANS_TABLES \\
NO_ZERO_IN_DATE NO_ZERO_DATE \\
ERROR_FOR_DIVISION_BY_ZERO \\
NO_ENGINE_SUBSTITUTION
\end{tabular} \\
\hline Valid Values & \begin{tabular}{l}
ALLOW_INVALID_DATES \\
ANSI_QUOTES \\
ERROR_FOR_DIVISION_BY_ZERO \\
HIGH_NOT_PRECEDENCE \\
IGNORE_SPACE \\
NO_AUTO_VALUE_ON_ZERO \\
NO_BACKSLASH_ESCAPES \\
NO_DIR_IN_CREATE \\
NO_ENGINE_SUBSTITUTION \\
NO_UNSIGNED_SUBTRACTION \\
NO_ZERO_DATE \\
NO_ZERO_IN_DATE \\
ONLY_FULL_GROUP_BY \\
PAD_CHAR_TO_FULL_LENGTH \\
PIPES_AS_CONCAT \\
REAL_AS_FLOAT \\
STRICT_ALL_TABLES \\
STRICT_TRANS_TABLES
\end{tabular} \\
\hline
\end{tabular}

The current server SQL mode, which can be set dynamically. For details, see Section 7.1.11, "Server SQL Modes".

\section*{Note}

MySQL installation programs may configure the SQL mode during the installation process.

If the SQL mode differs from the default or from what you expect, check for a setting in an option file that the server reads at startup.
- sql_notes

\begin{tabular}{|l|l|}
\hline System Variable & sql_notes \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & ON \\
\hline
\end{tabular}

If enabled (the default), diagnostics of Note level increment warning_count and the server records them. If disabled, Note diagnostics do not increment warning_count and the server does not record them. mysqldump includes output to disable this variable so that reloading the dump file does not produce warnings for events that do not affect the integrity of the reload operation.
- sql_quote_show_create

\begin{tabular}{|l|l|}
\hline System Variable & sql_quote_show_create \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & ON \\
\hline
\end{tabular}

If enabled (the default), the server quotes identifiers for SHOW CREATE TABLE and SHOW CREATE DATABASE statements. If disabled, quoting is disabled. This option is enabled by default so that replication works for identifiers that require quoting. See Section 15.7.7.11, "SHOW CREATE TABLE Statement", and Section 15.7.7.7, "SHOW CREATE DATABASE Statement".
- sql_require_primary_key

\begin{tabular}{|l|l|}
\hline Command-Line Format & --sql-require-primary-key[=\{OFF|ON\}] \\
\hline System Variable & sql_require_primary_key \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & Yes \\
\hline Type & Boolean \\
\hline
\end{tabular}

Default Value
OFF

Whether statements that create new tables or alter the structure of existing tables enforce the requirement that tables have a primary key.

Setting the session value of this system variable is a restricted operation. The session user must have privileges sufficient to set restricted session variables. See Section 7.1.9.1, "System Variable Privileges".

Enabling this variable helps avoid performance problems in row-based replication that can occur when tables have no primary key. Suppose that a table has no primary key and an update or delete modifies multiple rows. On the replication source server, this operation can be performed using a single table scan but, when replicated using row-based replication, results in a table scan for each row to be modified on the replica. With a primary key, these table scans do not occur.
sql_require_primary_key applies to both base tables and TEMPORARY tables, and changes to its value are replicated to replica servers. The table must use MySQL storage engines that can participate in replication.

When enabled, sql_require_primary_key has these effects:
- Attempts to create a new table with no primary key fail with an error. This includes CREATE TABLE ... LIKE. It also includes CREATE TABLE ... SELECT, unless the CREATE TABLE part includes a primary key definition.
- Attempts to drop the primary key from an existing table fail with an error, with the exception that dropping the primary key and adding a primary key in the same ALTER TABLE statement is permitted.

Dropping the primary key fails even if the table also contains a UNIQUE NOT NULL index.
- Attempts to import a table with no primary key fail with an error.

The REQUIRE_TABLE_PRIMARY_KEY_CHECK option of the CHANGE REPLICATION SOURCE TO statement enables a replica to select its own policy for primary key checks. When the option is set to ON for a replication channel, the replica always uses the value ON for the sql_require_primary_key system variable in replication operations, requiring a primary key. When the option is set to OFF, the replica always uses the value OFF for the sql_require_primary_key system variable in replication operations, so that a primary key is never required, even if the source required one. When the REQUIRE_TABLE_PRIMARY_KEY_CHECK option is set to STREAM, which is the default, the replica uses whatever value is replicated from the source for each transaction. With the STREAM setting for the REQUIRE_TABLE_PRIMARY_KEY_CHECK option, if privilege checks are in use for the replication channel, the PRIVILEGE_CHECKS_USER account needs privileges sufficient to set restricted session variables, so that it can set the session value for the sql_require_primary_key system variable. With the ON or OFF settings, the account does not need these privileges. For more information, see Section 19.3.3, "Replication Privilege Checks".
- sql_safe_updates

\begin{tabular}{|l|l|}
\hline System Variable & sql_safe_updates \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & Yes \\
\hline Type & Boolean \\
\hline
\end{tabular}

Default Value

If this variable is enabled, UPDATE and DELETE statements that do not use a key in the WHERE clause or a LIMIT clause produce an error. This makes it possible to catch UPDATE and DELETE statements where keys are not used properly and that would probably change or delete a large number of rows. The default value is 0FF.

For the mysql client, sql_safe_updates can be enabled by using the --safe-updates option. For more information, see Using Safe-Updates Mode (--safe-updates).
- sql_select_limit

\begin{tabular}{|l|l|}
\hline System Variable & sql_select_limit \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & Yes \\
\hline Type & Integer \\
\hline Default Value & 18446744073709551615 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 18446744073709551615 \\
\hline
\end{tabular}

The maximum number of rows to return from SELECT statements. For more information, see Using Safe-Updates Mode (--safe-updates).

The default value for a new connection is the maximum number of rows that the server permits per table. Typical default values are $\left(2^{32}\right)-1$ or $\left(2^{64}\right)-1$. If you have changed the limit, the default value can be restored by assigning a value of DEFAULT.

If a SELECT has a LIMIT clause, the LIMIT takes precedence over the value of sql_select_limit.
- sql_warnings

\begin{tabular}{|l|l|}
\hline System Variable & sql_warnings \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & 0FF \\
\hline
\end{tabular}

This variable controls whether single-row INSERT statements produce an information string if warnings occur. The default is OFF. Set the value to ON to produce an information string.
- ssl_ca

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ssl-ca=file_name \\
\hline System Variable & ssl_ca \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & File name \\
\hline Default Value & NULL \\
\hline
\end{tabular}

The path name of the Certificate Authority (CA) certificate file in PEM format. The file contains a list of trusted SSL Certificate Authorities.

This variable can be modified at runtime to affect the TLS context the server uses for new connections established after the execution of ALTER INSTANCE RELOAD TLS or after a restart if the variable value was persisted. See Server-Side Runtime Configuration and Monitoring for Encrypted Connections.
- ssl_capath

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ssl-capath=dir_name \\
\hline System Variable & ssl_capath \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Directory name \\
\hline Default Value & NULL \\
\hline
\end{tabular}

The path name of the directory that contains trusted SSL Certificate Authority (CA) certificate files in PEM format. You must run OpenSSL rehash on the directory specified by this option prior to using it. On Linux systems, you can invoke rehash like this:
\$> openssl rehash path/to/directory
On Windows platforms, you can use the c_rehash script in a command prompt, like this:
\> c_rehash path/to/directory
See openssl-rehash for complete syntax and other information.
This variable is can be modified at runtime to affect the TLS context the server uses for new connections established after the execution of ALTER INSTANCE RELOAD TLS or after a restart if the variable value was persisted. See Server-Side Runtime Configuration and Monitoring for Encrypted Connections.
- ssl_cert

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ssl-cert=file_name \\
\hline System Variable & ssl_cert \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & File name \\
\hline Default Value & NULL \\
\hline
\end{tabular}

The path name of the server SSL public key certificate file in PEM format.
If the server is started with ssl_cert set to a certificate that uses any restricted cipher or cipher category, the server starts with support for encrypted connections disabled. For information about cipher restrictions, see Connection Cipher Configuration.

This variable can be modified at runtime to affect the TLS context the server uses for new connections established after the execution of ALTER INSTANCE RELOAD TLS or after a restart if the variable value was persisted. See Server-Side Runtime Configuration and Monitoring for Encrypted Connections.
- ssl_cipher

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ssl-cipher=name \\
\hline System Variable & ssl_cipher \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Default Value & NULL \\
\hline
\end{tabular}

The list of permissible encryption ciphers for connections that use TLSv1.2. If no cipher in the list is supported, encrypted connections that use this TLS protocol do not work.

The list may include any of the following values:
- ECDHE-ECDSA-AES128-GCM-SHA256
- ECDHE-ECDSA-AES256-GCM-SHA384
- ECDHE-RSA-AES128-GCM-SHA256
- ECDHE-RSA-AES256-GCM-SHA384
- ECDHE-ECDSA-CHACHA20-POLY1305
- ECDHE-RSA-CHACHA20-POLY1305
- ECDHE-ECDSA-AES256-CCM
- ECDHE-ECDSA-AES128-CCM
- DHE-RSA-AES128-GCM-SHA256
- DHE-RSA-AES256-GCM-SHA384
- DHE-RSA-AES256-CCM
- DHE-RSA-AES128-CCM
- DHE-RSA-CHACHA20-POLY1305

Trying to include any values in the cipher list that are not shown here when setting this variable raises an error (ER_BLOCKED_CIPHER).

For greatest portability, the cipher list should be a list of one or more cipher names, separated by colons. The following example shows two cipher names separated by a colon:
```
[mysqld]
ssl_cipher="DHE-RSA-AES128-GCM-SHA256:AES128-SHA"
```


OpenSSL supports the syntax for specifying ciphers described in the OpenSSL documentation at https://www.openssl.org/docs/manmaster/man1/ciphers.html.

For information about which encryption ciphers MySQL supports, see Section 8.3.2, "Encrypted Connection TLS Protocols and Ciphers".

This variable can be modified at runtime to affect the TLS context the server uses for new connections established after the execution of ALTER INSTANCE RELOAD TLS or after a restart
if the variable value was persisted. See Server-Side Runtime Configuration and Monitoring for Encrypted Connections.
- ssl_crl

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ssl-crl=file_name \\
\hline System Variable & ssl_crl \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & File name \\
\hline Default Value & NULL \\
\hline
\end{tabular}

The path name of the file containing certificate revocation lists in PEM format.
This variable can be modified at runtime to affect the TLS context the server uses for new connections established after the execution of ALTER INSTANCE RELOAD TLS or after a restart if the variable value was persisted. See Server-Side Runtime Configuration and Monitoring for Encrypted Connections.
- ssl_crlpath

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ssl-crlpath=dir_name \\
\hline System Variable & ssl_crlpath \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Directory name \\
\hline Default Value & NULL \\
\hline
\end{tabular}

The path of the directory that contains certificate revocation-list files in PEM format.
This variable can be modified at runtime to affect the TLS context the server uses for new connections established after the execution of ALTER INSTANCE RELOAD TLS or after a restart if the variable value was persisted. See Server-Side Runtime Configuration and Monitoring for Encrypted Connections.
- ssl_fips_mode

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ssl-fips-mode=\{OFF | ON | STRICT\} \\
\hline Deprecated & Yes \\
\hline System Variable & ssl_fips_mode \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Enumeration \\
\hline Default Value & OFF \\
\hline Valid Values & \begin{tabular}{l}
OFF (or 0) \\
ON (or 1) \\
STRICT (or 2)
\end{tabular} \\
\hline
\end{tabular}

Controls whether to enable FIPS mode on the server side. The ssl_fips_mode system variable differs from other ssl_ $x x x$ system variables in that it is not used to control whether the server permits encrypted connections, but rather to affect which cryptographic operations are permitted. See Section 8.8, "FIPS Support".

These ssl_fips_mode values are permitted:
- OFF (or 0): Disable FIPS mode.
- ON (or 1): Enable FIPS mode.
- STRICT (or 2): Enable "strict" FIPS mode.

\section*{Note}

If the OpenSSL FIPS Object Module is not available, the only permitted value for ssl_fips_mode is OFF. In this case, setting ssl_fips_mode to ON or STRICT at startup causes the server to produce an error message and exit.

This option is deprecated and made read-only. Expect it to be removed in a future version of MySQL.
- ssl_key

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ssl-key=file_name \\
\hline System Variable & ssl_key \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & File name \\
\hline Default Value & NULL \\
\hline
\end{tabular}

The path name of the server SSL private key file in PEM format. For better security, use a certificate with an RSA key size of at least 2048 bits.

If the key file is protected by a passphrase, the server prompts the user for the passphrase. The password must be given interactively; it cannot be stored in a file. If the passphrase is incorrect, the program continues as if it could not read the key.

This variable can be modified at runtime to affect the TLS context the server uses for new connections established after the execution of ALTER INSTANCE RELOAD TLS or after a restart if the variable value was persisted. See Server-Side Runtime Configuration and Monitoring for Encrypted Connections.
- ssl_session_cache_mode

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ssl_session_cache_mode=\{ON|OFF\} \\
\hline System Variable & ssl_session_cache_mode \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & ON \\
\hline Valid Values & ON \\
\hline
\end{tabular}

Controls whether to enable the session cache in memory on the server side and session-ticket generation by the server. The default mode is ON (enable session cache mode). A change to the ssl_session_cache_mode system variable has an effect only after the ALTER INSTANCE RELOAD TLS statement has been executed, or after a restart if the variable value was persisted.

These ssl_session_cache_mode values are permitted:
- ON: Enable session cache mode.
- OFF: Disable session cache mode.

The server does not advertise its support for session resumption if the value of this system variable is OFF. When running on OpenSSL 1.0.x the session tickets are always generated, but the tickets are not usable when ssl_session_cache_mode is enabled.

The current value in effect for ssl_session_cache_mode can be observed with the Ssl_session_cache_mode status variable.
- ssl_session_cache_timeout

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ssl_session_cache_timeout \\
\hline System Variable & ssl_session_cache_timeout \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 300 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 84600 \\
\hline Unit & seconds \\
\hline
\end{tabular}

Sets a period of time during which prior session reuse is permitted when establishing a new encrypted connection to the server, provided the ssl_session_cache_mode system variable is enabled and prior session data is available. If the session timeout expires, a session can no longer be reused.

The default value is 300 seconds and the maximum value is 84600 (or one day in seconds). A change to the ssl_session_cache_timeout system variable has an effect only after the ALTER INSTANCE RELOAD TLS statement has been executed, or after a restart if the variable value was persisted. The current value in effect for ssl_session_cache_timeout can be observed with the Ssl_session_cache_timeout status variable.
- statement_id

\begin{tabular}{|l|l|}
\hline System Variable & statement_id \\
\hline Scope & Session \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|}
\hline Type & Integer
\end{tabular}

Each statement executed in the current session is assigned a sequence number. This can be used together with the session_track_system_variables system variable to identify this statement in Performance Schema tables such as the events_statements_history table.
- stored_program_cache

\begin{tabular}{|l|l|}
\hline Command-Line Format & --stored-program-cache=\# \\
\hline System Variable & stored_program_cache \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 256 \\
\hline Minimum Value & 16 \\
\hline Maximum Value & 524288 \\
\hline
\end{tabular}

Sets a soft upper limit for the number of cached stored routines per connection. The value of this variable is specified in terms of the number of stored routines held in each of the two caches maintained by the MySQL Server for, respectively, stored procedures and stored functions.

Whenever a stored routine is executed this cache size is checked before the first or top-level statement in the routine is parsed; if the number of routines of the same type (stored procedures or stored functions according to which is being executed) exceeds the limit specified by this variable, the corresponding cache is flushed and memory previously allocated for cached objects is freed. This allows the cache to be flushed safely, even when there are dependencies between stored routines.

The stored procedure and stored function caches exists in parallel with the stored program definition cache partition of the dictionary object cache. The stored procedure and stored function caches are per connection, while the stored program definition cache is shared. The existence of objects in the stored procedure and stored function caches have no dependence on the existence of objects in the stored program definition cache, and vice versa. For more information, see Section 16.4, "Dictionary Object Cache".
- stored_program_definition_cache

\begin{tabular}{|l|l|}
\hline Command-Line Format & --stored-program-definition-cache=\# \\
\hline System Variable & stored_program_definition_cache \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 256 \\
\hline Minimum Value & 256 \\
\hline Maximum Value & 524288 \\
\hline
\end{tabular}

Defines a limit for the number of stored program definition objects, both used and unused, that can be kept in the dictionary object cache.

Unused stored program definition objects are only kept in the dictionary object cache when the number in use is less than the capacity defined by stored_program_definition_cache.

A setting of 0 means that stored program definition objects are only kept in the dictionary object cache while they are in use.

The stored program definition cache partition exists in parallel with the stored procedure and stored function caches that are configured using the stored_program_cache option.

The stored_program_cache option sets a soft upper limit for the number of cached stored procedures or functions per connection, and the limit is checked each time a connection executes a stored procedure or function. The stored program definition cache partition, on the other hand, is a shared cache that stores stored program definition objects for other purposes. The existence of objects in the stored program definition cache partition has no dependence on the existence of objects in the stored procedure cache or stored function cache, and vice versa.

For related information, see Section 16.4, "Dictionary Object Cache".
- super_read_only

\begin{tabular}{|l|l|}
\hline Command-Line Format & --super-read-only[=\{OFF|ON\}] \\
\hline System Variable & super_read_only \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

If the read_only system variable is enabled, the server permits no client updates except from users who have the CONNECTION_ADMIN privilege (or the deprecated SUPER privilege). If the super_read_only system variable is also enabled, the server prohibits client updates even from users who have CONNECTION_ADMIN or SUPER. See the description of the read_only system variable for a description of read-only mode and information about how read_only and super_read_only interact.

Client updates prevented when super_read_only is enabled include operations that do not necessarily appear to be updates, such as CREATE FUNCTION (to install a loadable function), INSTALL PLUGIN, and INSTALL COMPONENT. These operations are prohibited because they involve changes to tables in the mysql system schema.

Similarly, if the Event Scheduler is enabled, enabling the super_read_only system variable prevents it from updating event "last executed" timestamps in the events data dictionary table. This causes the Event Scheduler to stop the next time it tries to execute a scheduled event, after writing a message to the server error log. (In this situation the event_scheduler system variable does not change from ON to OFF. An implication is that this variable rejects the DBA intent that the Event Scheduler be enabled or disabled, where its actual status of started or stopped may be distinct.). If super_read_only is subsequently disabled after being enabled, the server automatically restarts the Event Scheduler as needed.

Changes to super_read_only on a replication source server are not replicated to replica servers. The value can be set on a replica independent of the setting on the source.
- syseventlog.facility

\begin{tabular}{|l|l|}
\hline Command-Line Format & --syseventlog.facility=value \\
\hline System Variable & syseventlog.facility \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Default Value & daemon \\
\hline
\end{tabular}

The facility for error log output written to syslog (what type of program is sending the message).
This variable is unavailable unless the log_sink_syseventlog error log component is installed.
See Section 7.4.2.8, "Error Logging to the System Log".
The permitted values can vary per operating system; consult your system syslog documentation.
This variable does not exist on Windows.
- syseventlog.include_pid

\begin{tabular}{|l|l|}
\hline Command-Line Format & --syseventlog.include-pid[=\{OFF | ON\}] \\
\hline System Variable & syseventlog.include_pid \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & ON \\
\hline
\end{tabular}

Whether to include the server process ID in each line of error log output written to syslog. This variable is unavailable unless the log_sink_syseventlog error log component is installed. See Section 7.4.2.8, "Error Logging to the System Log".

This variable does not exist on Windows.
- syseventlog.tag

\begin{tabular}{|l|l|}
\hline Command-Line Format & --syseventlog.tag=tag \\
\hline System Variable & syseventlog.tag \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Default Value & empty string \\
\hline
\end{tabular}

The tag to be added to the server identifier in error log output written to syslog or the Windows Event Log. This variable is unavailable unless the log_sink_syseventlog error log component is installed. See Section 7.4.2.8, "Error Logging to the System Log".

By default, no tag is set, so the server identifier is simply MySQL on Windows, and mysqld on other platforms. If a tag value of tag is specified, it is appended to the server identifier with a leading hyphen, resulting in a syslog identifier of mysqld-tag (or MySQL-tag on Windows).

On Windows, to use a tag that does not already exist, the server must be run from an account with Administrator privileges, to permit creation of a registry entry for the tag. Elevated privileges are not required if the tag already exists.
- system_time_zone

\begin{tabular}{|l|l|} 
Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline
\end{tabular}

The server system time zone. When the server begins executing, it inherits a time zone setting from the machine defaults, possibly modified by the environment of the account used for running the server or the startup script. The value is used to set system_time_zone. To explicitly specify the system time zone, set the TZ environment variable or use the --timezone option of the mysqld_safe script.

In addition to startup time initialization, if the server host time zone changes (for example, due to daylight saving time), system_time_zone reflects that change, which has these implications for applications:
- Queries that reference system_time_zone will get one value before a daylight saving change and a different value after the change.
- For queries that begin executing before a daylight saving change and end after the change, the system_time_zone remains constant within the query because the value is usually cached at the beginning of execution.

The system_time_zone variable differs from the time_zone variable. Although they might have the same value, the latter variable is used to initialize the time zone for each client that connects. See Section 7.1.15, "MySQL Server Time Zone Support".
- table_definition_cache

\begin{tabular}{|l|l|}
\hline Command-Line Format & --table-definition-cache=\# \\
\hline System Variable & table_definition_cache \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & -1 (signifies autosizing; do not assign this literal value) \\
\hline Minimum Value & 400 \\
\hline Maximum Value & 524288 \\
\hline
\end{tabular}

The number of table definitions that can be stored in the table definition cache. If you use a large number of tables, you can create a large table definition cache to speed up opening of tables. The table definition cache takes less space and does not use file descriptors, unlike the normal table cache. The minimum value is 400 . The default value is based on the following formula, capped to a limit of 2000:

MIN(400 + table_open_cache / 2, 2000)
For InnoDB, the table_definition_cache setting acts as a soft limit for the number of table instances in the dictionary object cache and the number file-per-table tablespaces that can be open at one time.

If the number of table instances in the dictionary object cache exceeds the table_definition_cache limit, an LRU mechanism begins marking table instances for eviction and eventually removes them from the dictionary object cache. The number of open tables with
cached metadata can be higher than the table_definition_cache limit due to table instances with foreign key relationships, which are not placed on the LRU list.

The number of file-per-table tablespaces that can be open at one time is limited by both the table_definition_cache and innodb_open_files settings. If both variables are set, the highest setting is used. If neither variable is set, the table_definition_cache setting, which has a higher default value, is used. If the number of open tablespaces exceeds the limit defined by table_definition_cache or innodb_open_files, an LRU mechanism searches the LRU list for tablespace files that are fully flushed and not currently being extended. This process is performed each time a new tablespace is opened. Only inactive tablespaces are closed.

The table definition cache exists in parallel with the table definition cache partition of the dictionary object cache. Both caches store table definitions but serve different parts of the MySQL server. Objects in one cache have no dependence on the existence of objects in the other. For more information, see Section 16.4, "Dictionary Object Cache".
- table_encryption_privilege_check

\begin{tabular}{|l|l|}
\hline Command-Line Format & --table-encryption-privilegecheck[=\{OFF|ON\}] \\
\hline System Variable & table_encryption_privilege_check \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

Controls the TABLE_ENCRYPTION_ADMIN privilege check that occurs when creating or altering a schema or general tablespace with encryption that differs from the default_table_encryption setting, or when creating or altering a table with an encryption setting that differs from the default schema encryption. The check is disabled by default.

Setting table_encryption_privilege_check at runtime requires the SUPER privilege.
table_encryption_privilege_check supports SET PERSIST and SET PERSIST_ONLY syntax. See Section 7.1.9.3, "Persisted System Variables".

For more information, see Defining an Encryption Default for Schemas and General Tablespaces.
- table_open_cache

\begin{tabular}{|l|l|}
\hline Command-Line Format & --table-open-cache=\# \\
\hline System Variable & table_open_cache \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 4000 \\
\hline Minimum Value & 1 \\
\hline Maximum Value & 524288 \\
\hline
\end{tabular}

The number of open tables for all threads. Increasing this value increases the number of file descriptors that mysqld requires. The effective value of this variable is the greater of the effective
value of open_files_limit - 10 - the effective value of max_connections / 2, and 400; that is
```
            (open_files_limit - 10 - max_connections) / 2,
        400
    )
```


You can check whether you need to increase the table cache by checking the Opened_tables status variable. If the value of Opened_tables is large and you do not use FLUSH TABLES often (which just forces all tables to be closed and reopened), then you should increase the value of the table_open_cache variable. For more information about the table cache, see Section 10.4.3.1, "How MySQL Opens and Closes Tables".
- table_open_cache_instances

\begin{tabular}{|l|l|}
\hline Command-Line Format & --table-open-cache-instances=\# \\
\hline System Variable & table_open_cache_instances \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 16 \\
\hline Minimum Value & 1 \\
\hline Maximum Value & 64 \\
\hline
\end{tabular}

The number of open tables cache instances. To improve scalability by reducing contention among sessions, the open tables cache can be partitioned into several smaller cache instances of size table_open_cache / table_open_cache_instances . A session needs to lock only one instance to access it for DML statements. This segments cache access among instances, permitting higher performance for operations that use the cache when there are many sessions accessing tables. (DDL statements still require a lock on the entire cache, but such statements are much less frequent than DML statements.)

A value of 8 or 16 is recommended on systems that routinely use 16 or more cores. However, if you have many large triggers on your tables that cause a high memory load, the default setting for table_open_cache_instances might lead to excessive memory usage. In that situation, it can be helpful to set table_open_cache_instances to 1 in order to restrict memory usage.
- tablespace_definition_cache

\begin{tabular}{|l|l|}
\hline Command-Line Format & --tablespace-definition-cache=\# \\
\hline System Variable & tablespace_definition_cache \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 256 \\
\hline Minimum Value & 256 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l} 
Maximum Value & 524288
\end{tabular}

Defines a limit for the number of tablespace definition objects, both used and unused, that can be kept in the dictionary object cache.

Unused tablespace definition objects are only kept in the dictionary object cache when the number in use is less than the capacity defined by tablespace_definition_cache.

A setting of 0 means that tablespace definition objects are only kept in the dictionary object cache while they are in use.

For more information, see Section 16.4, "Dictionary Object Cache".
- temptable_max_mmap

\begin{tabular}{|l|l|}
\hline Command-Line Format & --temptable-max-mmap=\# \\
\hline System Variable & temptable_max_mmap \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & $2^{\wedge}$ 64-1 \\
\hline Unit & bytes \\
\hline
\end{tabular}

Defines the maximum amount of memory (in bytes) the TempTable storage engine is permitted to allocate from memory-mapped temporary files before it starts storing data to InnoDB internal temporary tables on disk. A setting of 0 (default) disables allocation of memory from memorymapped temporary files. For more information, see Section 10.4.4, "Internal Temporary Table Use in MySQL".

Before MySQL 8.4, this option was set to 1 GiB instead of 0 .
- temptable_max_ram

\begin{tabular}{|l|l|}
\hline Command-Line Format & --temptable-max-ram=\# \\
\hline System Variable & temptable_max_ram \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 3\% of total memory: min 1 GB , max 4 GB \\
\hline Minimum Value & 2097152 \\
\hline Maximum Value & 2^64-1 \\
\hline Unit & bytes \\
\hline
\end{tabular}

Defines the maximum amount of memory that can be occupied by the TempTable storage engine before it starts storing data on disk. The default value is $3 \%$ of total memory available on the server,
with a minimum and maximum default range of $1-4 \mathrm{GiB}$. For more information, see Section 10.4.4, "Internal Temporary Table Use in MySQL".

Before MySQL 8.4, the default value was always 1 GiB .
- temptable_use_mmap

\begin{tabular}{|l|l|}
\hline Command-Line Format & --temptable-use-mmap[=\{OFF|ON\}] \\
\hline Deprecated & Yes \\
\hline System Variable & temptable_use_mmap \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & 0FF \\
\hline
\end{tabular}

Defines whether the TempTable storage engine allocates space for internal in-memory temporary tables as memory-mapped temporary files when the amount of memory occupied by the TempTable storage engine exceeds the limit defined by the temptable_max_ram variable. When temptable_use_mmap is disabled (default), the TempTable storage engine uses InnoDB on-disk internal temporary tables instead. For more information, see Section 10.4.4, "Internal Temporary Table Use in MySQL".
- thread_cache_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --thread-cache-size=\# \\
\hline System Variable & thread_cache_size \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & -1 (signifies autosizing; do not assign this literal value) \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 16384 \\
\hline
\end{tabular}

How many threads the server should cache for reuse. When a client disconnects, the client's threads are put in the cache if there are fewer than thread_cache_size threads there. Requests for threads are satisfied by reusing threads taken from the cache if possible, and only when the cache is empty is a new thread created. This variable can be increased to improve performance if you have a lot of new connections. Normally, this does not provide a notable performance improvement if you have a good thread implementation. However, if your server sees hundreds of connections per second you should normally set thread_cache_size high enough so that most new connections use cached threads. By examining the difference between the Connections and Threads_created status variables, you can see how efficient the thread cache is. For details, see Section 7.1.10, "Server Status Variables".

The default value is based on the following formula, capped to a limit of 100:
```
8 + (max_connections / 100)
```

- thread_handling

\begin{tabular}{|l|l|}
\hline Command-Line Format & --thread-handling=name \\
\hline System Variable & thread_handling \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Enumeration \\
\hline Default Value & one-thread-per-connection \\
\hline Valid Values & \begin{tabular}{l}
no-threads \\
one-thread-per-connection \\
loaded-dynamically
\end{tabular} \\
\hline
\end{tabular}

The thread-handling model used by the server for connection threads. The permissible values are no-threads (the server uses a single thread to handle one connection), one-thread-per-connection (the server uses one thread to handle each client connection), and loadeddynamically (set by the thread pool plugin when it initializes). no-threads is useful for debugging under Linux; see Section 7.9, "Debugging MySQL".
- thread_pool_algorithm

\begin{tabular}{|l|l|}
\hline Command-Line Format & --thread-pool-algorithm=\# \\
\hline System Variable & thread_pool_algorithm \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 1 \\
\hline
\end{tabular}

This variable controls which algorithm the thread pool plugin uses:
- 0 : Use a conservative low-concurrency algorithm.
- 1: Use an aggressive high-currency algorithm which performs better with optimal thread counts, but performance may be degraded if the number of connections reaches extremely high values.

This variable is available only if the thread pool plugin is enabled. See Section 7.6.3, "MySQL Enterprise Thread Pool".
- thread_pool_dedicated_listeners

\begin{tabular}{|l|l|l|}
\hline Command-Line Format & --thread-pool-dedicated-listeners & \\
\hline System Variable & thread_pool_dedicated_listeners & \\
\hline Scope & Global & \\
\hline Dynamic & No & \\
\hline SET_VAR Hint Applies & No & \\
\hline Type & Boolean & \\
\hline & & 861 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Default Value & OFF
\end{tabular}

Dedicates a listener thread in each thread group to listen for incoming statements from connections assigned to the group.
- OFF: (Default) Disables dedicated listener threads.
- ON: Dedicates a listener thread in each thread group to listen for incoming statements from connections assigned to the group. Dedicated listener threads do not execute queries.

Enabling thread_pool_dedicated_listeners is only useful when a transaction limit is defined by thread_pool_max_transactions_limit. Otherwise, thread_pool_dedicated_listeners should not be enabled.

This variable is available only with MySQL Enterprise Edition, and not supported in MySQL 8.4.
- thread_pool_high_priority_connection

\begin{tabular}{|l|l|}
\hline Command-Line Format & --thread-pool-high-priorityconnection=\# \\
\hline System Variable & thread_pool_high_priority_connection \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 1 \\
\hline
\end{tabular}

This variable affects queuing of new statements prior to execution. If the value is 0 (false, the default), statement queuing uses both the low-priority and high-priority queues. If the value is 1 (true), queued statements always go to the high-priority queue.

This variable is available only if the thread pool plugin is enabled. See Section 7.6.3, "MySQL Enterprise Thread Pool".
- thread_pool_longrun_trx_limit

\begin{tabular}{|l|l|}
\hline Command-Line Format & --thread-pool-longrun-trx-limit=\# \\
\hline System Variable & thread_pool_longrun_trx_limit \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 2000 \\
\hline Minimum Value & 10 \\
\hline Maximum Value & 60*60*24 \\
\hline Unit & ms \\
\hline
\end{tabular}

When thread_pool_max_transactions_limit is in use, there is a maximum number of transactions that can be active in each thread group. If entire number available is being used by
long-running transactions, any additional transaction assigned to the group blocks until one of the long-running transactions is completed, which users can perceive as an inexplicable hang.

To mitigate this issue, the limit for a given thread group is suspended if all of the threads using up the transaction maximum have been executing longer than the interval (in milliseconds) specified by thread_pool_longrun_trx_limit. When the number of long-running transactions decreases, thread_pool_max_transactions_limit can be (and is) enabled again. In order for this to happen, the number of ongoing transactions must be less than thread_pool_max_transactions_limit / 2 for the interval defined as shown:

MIN( MAX(thread_pool_longrun_trx_limit * 15, 5000), 30000)
This variable is available only if the thread pool plugin is enabled. See Section 7.6.3, "MySQL Enterprise Thread Pool".
- thread_pool_max_active_query_threads

\begin{tabular}{|l|l|}
\hline Command-Line Format & --thread-pool-max-active-querythreads \\
\hline System Variable & thread_pool_max_active_query_threads \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 512 \\
\hline
\end{tabular}

The maximum permissible number of active (running) query threads per group. If the value is 0 , the thread pool plugin uses up to as many threads as are available.

This variable is available only if the thread pool plugin is enabled. See Section 7.6.3, "MySQL Enterprise Thread Pool".
- thread_pool_max_transactions_limit

\begin{tabular}{|l|l|}
\hline Command-Line Format & --thread-pool-max-transactions-limit \\
\hline System Variable & thread_pool_max_transactions_limit \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 1000000 \\
\hline
\end{tabular}

The maximum number of transactions permitted by the thread pool plugin. Defining a transaction limit binds a thread to a transaction until it commits, which helps stabilize throughput during high concurrency.

The default value of 0 means that there is no transaction limit. The variable is dynamic but cannot be changed from 0 to a higher value at runtime and vice versa. A non-zero value at startup permits
dynamic configuration at runtime. The CONNECTION_ADMIN privilege is required to configure thread_pool_max_transactions_limit at runtime.

When you define a transaction limit, enabling thread_pool_dedicated_listeners creates a dedicated listener thread in each thread group. The additional dedicated listener thread consumes more resources and affects thread pool performance. thread_pool_dedicated_listeners should therefore be used cautiously.

When the limit defined by thread_pool_max_transactions_limit has been reached, new connections or transactions on existing connections may appear to hang until one or more existing transactions are completed. It should be possible in many cases to mitigate this issue by setting thread_pool_longrun_trx_limit so that the transaction maximum can be relaxed when the number of ongoing transactions matches it for a given length of time. If existing connections continue to be blocked or long-running even after attempting this, a privileged connection may be required to access the server to increase the limit, remove the limit, or kill running transactions. See Privileged Connections.

This variable is available only with MySQL Enterprise Edition, and not supported in MySQL 8.4.
- thread_pool_max_unused_threads

\begin{tabular}{|l|l|}
\hline Command-Line Format & --thread-pool-max-unused-threads=\# \\
\hline System Variable & thread_pool_max_unused_threads \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 4096 \\
\hline
\end{tabular}

The maximum permitted number of unused threads in the thread pool. This variable makes it possible to limit the amount of memory used by sleeping threads.

A value of 0 (the default) means no limit on the number of sleeping threads. A value of $N$ where $N$ is greater than 0 means 1 consumer thread and $N-1$ reserve threads. In this case, if a thread is ready to sleep but the number of sleeping threads is already at the maximum, the thread exits rather than going to sleep.

A sleeping thread is either sleeping as a consumer thread or a reserve thread. The thread pool permits one thread to be the consumer thread when sleeping. If a thread goes to sleep and there is no existing consumer thread, it sleeps as a consumer thread. When a thread must be woken up, a consumer thread is selected if there is one. A reserve thread is selected only when there is no consumer thread to wake up.

This variable is available only if the thread pool plugin is enabled. See Section 7.6.3, "MySQL Enterprise Thread Pool".
- thread_pool_prio_kickup_timer

\begin{tabular}{|l|l|}
\hline Command-Line Format & --thread-pool-prio-kickup-timer=\# \\
\hline System Variable & thread_pool_prio_kickup_timer \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Type & Integer \\
\hline Default Value & 1000 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 4294967294 \\
\hline Unit & milliseconds \\
\hline
\end{tabular}

This variable affects statements waiting for execution in the low-priority queue. The value is the number of milliseconds before a waiting statement is moved to the high-priority queue. The default is 1000 (1 second).

This variable is available only if the thread pool plugin is enabled. See Section 7.6.3, "MySQL Enterprise Thread Pool".
- thread_pool_query_threads_per_group

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -thread-pool-query-threads-pergroup \\
\hline System Variable & thread_pool_query_threads_per_group \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 1 \\
\hline Minimum Value & 1 \\
\hline Maximum Value & 4096 \\
\hline
\end{tabular}

The maximum number of query threads permitted in a thread group. The maximum value is 4096, but if thread_pool_max_transactions_limit is set, thread_pool_query_threads_per_group must not exceed that value.

The default value of 1 means there is one active query thread in each thread group, which works well for many loads. When you are using the high concurrency thread pool algorithm (thread_pool_algorithm = 1), consider increasing the value if you experience slower response times due to long-running transactions.

The CONNECTION_ADMIN privilege is required to configure thread_pool_query_threads_per_group at runtime.

If you decrease the value of thread_pool_query_threads_per_group at runtime, threads that are currently running user queries are allowed to complete, then moved to the reserve pool or terminated. if you increment the value at runtime and the thread group needs more threads, these are taken from the reserve pool if possible, otherwise they are created.

This variable is available only with MySQL Enterprise Edition, and not supported in MySQL 8.4.
- thread_pool_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --thread-pool-size=\# \\
\hline System Variable & thread_pool_size \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Type & Integer \\
\hline Default Value & 16 \\
\hline Minimum Value & 1 \\
\hline Maximum Value & 512 \\
\hline
\end{tabular}

The number of thread groups in the thread pool. This is the most important parameter controlling thread pool performance. It affects how many statements can execute simultaneously. If a value outside the range of permissible values is specified, the thread pool plugin does not load and the server writes a message to the error log.

This variable is available only if the thread pool plugin is enabled. See Section 7.6.3, "MySQL Enterprise Thread Pool".
- thread_pool_stall_limit

\begin{tabular}{|l|l|}
\hline Command-Line Format & --thread-pool-stall-limit=\# \\
\hline System Variable & thread_pool_stall_limit \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 6 \\
\hline Minimum Value & 4 \\
\hline Maximum Value & 600 \\
\hline Unit & milliseconds * 10 \\
\hline
\end{tabular}

This variable affects executing statements. The value is the amount of time a statement has to finish after starting to execute before it becomes defined as stalled, at which point the thread pool permits the thread group to begin executing another statement. The value is measured in 10 millisecond units, so the default of 6 means 60 ms . Short wait values permit threads to start more quickly. Short values are also better for avoiding deadlock situations. Long wait values are useful for workloads that include long-running statements, to avoid starting too many new statements while the current ones execute.

This variable is available only if the thread pool plugin is enabled. See Section 7.6.3, "MySQL Enterprise Thread Pool".
- thread_pool_transaction_delay

\begin{tabular}{|l|l|}
\hline Command-Line Format & --thread-pool-transaction-delay \\
\hline System Variable & thread_pool_transaction_delay \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Maximum Value & 300000 \\
\hline
\end{tabular}

The delay period before executing a new transaction, in milliseconds. The maximum value is 300000 ( 5 minutes).

A transaction delay can be used in cases where parallel transactions affect the performance of other operations due to resource contention. For example, if parallel transactions affect index creation or an online buffer pool resizing operation, you can configure a transaction delay to reduce resource contention while those operations are running.

Worker threads sleep for the number of milliseconds specified by thread_pool_transaction_delay before executing a new transaction.

The thread_pool_transaction_delay setting does not affect queries issued from a privileged connection (a connection assigned to the Admin thread group). These queries are not subject to a configured transaction delay.
- thread_stack

\begin{tabular}{|l|l|}
\hline Command-Line Format & --thread-stack=\# \\
\hline System Variable & thread_stack \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 1048576 \\
\hline Minimum Value & 131072 \\
\hline Maximum Value (64-bit platforms) & 18446744073709550592 \\
\hline Maximum Value (32-bit platforms) & 4294966272 \\
\hline Unit & bytes \\
\hline Block Size & 1024 \\
\hline
\end{tabular}

The stack size for each thread. The default is large enough for normal operation. If the thread stack size is too small, it limits the complexity of the SQL statements that the server can handle, the recursion depth of stored procedures, and other memory-consuming actions.
- time_zone

\begin{tabular}{|l|l|}
\hline System Variable & time_zone \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & Yes \\
\hline Type & String \\
\hline Default Value & SYSTEM \\
\hline Minimum Value & -13:59 \\
\hline Maximum Value & +14:00 \\
\hline
\end{tabular}

The current time zone. This variable is used to initialize the time zone for each client that connects. By default, the initial value of this is 'SYSTEM ' (which means, "use the value of
system_time_zone"). The value can be specified explicitly at server startup with the --default-time-zone option. See Section 7.1.15, "MySQL Server Time Zone Support".

\section*{Note}

If set to SYSTEM, every MySQL function call that requires a time zone calculation makes a system library call to determine the current system time zone. This call may be protected by a global mutex, resulting in contention.
- timestamp

\begin{tabular}{|l|l|}
\hline System Variable & timestamp \\
\hline Scope & Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & Yes \\
\hline Type & Numeric \\
\hline Default Value & UNIX_TIMESTAMP( ) \\
\hline Minimum Value & 1 \\
\hline Maximum Value & 2147483647 \\
\hline
\end{tabular}

Set the time for this client. This is used to get the original timestamp if you use the binary log to restore rows. timestamp_value should be a Unix epoch timestamp (a value like that returned by UNIX_TIMESTAMP(), not a value in 'YYYY-MM-DD hh:mm:ss' format) or DEFAULT.

Setting timestamp to a constant value causes it to retain that value until it is changed again. Setting timestamp to DEFAULT causes its value to be the current date and time as of the time it is accessed.
timestamp is a DOUBLE rather than BIGINT because its value includes a microseconds part. The maximum value corresponds to '2038-01-19 03:14:07' UTC, the same as for the TIMESTAMP data type.

SET timestamp affects the value returned by NOW() but not by SYSDATE(). This means that timestamp settings in the binary log have no effect on invocations of SYSDATE( ). The server can be started with the --sysdate-is-now option to cause SYSDATE( ) to be a synonym for NOW( ), in which case SET timestamp affects both functions.
- tls_certificates_enforced_validation

\begin{tabular}{|l|l|}
\hline Command-Line Format & --tls-certificates-enforcedvalidation[=\{OFF|ON\}] \\
\hline System Variable & tls_certificates_enforced_validation \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & 0FF \\
\hline
\end{tabular}

During startup, the server ensures that the location of each required SSL certificate file is present in the default data directory if the file locations are not given on the command line. However, the server does not validate the certificate files and, as a result, it is able to start with an invalid certificate. The tls_certificates_enforced_validation system variable controls whether certificate
validation is enforced at startup. Discovery of an invalid certificate halts the startup execution when validation enforcement is enabled. By default, certificate validation enforcement is disabled (OFF).

Validation enforcement can be enabled by specifying the --tls-certificates-enforcedvalidation option on the command line with or without the 0N value. With validation enforcement enabled, certificates are also validated at the time of reloading them through the ALTER INSTANCE RELOAD TLS statement. This system variable cannot be persisted across reboots. For more information, see Configuring Certificate Validation Enforcement.
- tls_ciphersuites

\begin{tabular}{|l|l|}
\hline Command-Line Format & --tls-ciphersuites=ciphersuite_list \\
\hline System Variable & tls_ciphersuites \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Default Value & NULL \\
\hline
\end{tabular}

Which ciphersuites the server permits for encrypted connections that use TLSv1.3. The value is a list of zero or more colon-separated ciphersuite names from among those listed here:
- TLS_AES_128_GCM_SHA256
- TLS_AES_256_GCM_SHA384
- TLS_CHACHA20_POLY1305_SHA256
- TLS_AES_128_CCM_SHA256

Trying to include any values in the cipher list that are not shown here when setting this variable raises an error (ER_BLOCKED_CIPHER).

The ciphersuites that can be named for this variable depend on the SSL library used to compile MySQL. If this variable is not set, its default value is NULL, which means that the server permits the default set of ciphersuites. If the variable is set to the empty string, no ciphersuites are enabled and encrypted connections cannot be established. For more information, see Section 8.3.2, "Encrypted Connection TLS Protocols and Ciphers".
- tls_version

\begin{tabular}{|l|l|}
\hline Command-Line Format & --tls-version=protocol_list \\
\hline System Variable & tls_version \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Default Value & TLSv1.2, TLSv1.3 \\
\hline
\end{tabular}

Which protocols the server permits for encrypted connections. The value is a list of one or more comma-separated protocol names, which are not case-sensitive. The protocols that can be named for this variable depend on the SSL library used to compile MySQL. Permitted protocols should be
chosen such as not to leave "holes" in the list. For details, see Section 8.3.2, "Encrypted Connection TLS Protocols and Ciphers".

This variable can be modified at runtime to affect the TLS context the server uses for new connections. See Server-Side Runtime Configuration and Monitoring for Encrypted Connections.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0900.jpg?height=118&width=99&top_left_y=497&top_left_x=342)

\section*{Important}
- MySQL 8.4 does not support the TLSv1 and TLSv1.1 connection protocols. See Removal of Support for the TLSv1 and TLSv1.1 Protocols for more information.
- Support for the TLSv1.3 protocol is available in MySQL 8.4, provided that MySQL Server was compiled using OpenSSL 1.1.1 or higher. The server checks the version of OpenSSL at startup, and if it is lower than 1.1.1, TLSv1.3 is removed from the default value for the system variable. In that case, the default is TLSv1.2.

Setting this variable to an empty string disables encrypted connections.
- tmp_table_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --tmp-table-size=\# \\
\hline System Variable & tmp_table_size \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & Yes \\
\hline Type & Integer \\
\hline Default Value & 16777216 \\
\hline Minimum Value & 1024 \\
\hline Maximum Value & 18446744073709551615 \\
\hline Unit & bytes \\
\hline
\end{tabular}

Defines the maximum size of internal in-memory temporary tables created by the MEMORY and TempTable storage engines. If an internal in-memory temporary table exceeds this size, it is automatically converted to an on-disk internal temporary table.

The tmp_table_size variable does not apply to user-created MEMORY tables. User-created TempTable tables are not supported.

When using the MEMORY storage engine for internal in-memory temporary tables, the actual size limit is the smaller of tmp_table_size and max_heap_table_size. The max_heap_table_size setting does not apply to TempTable tables.

Increase the value of tmp_table_size (and max_heap_table_size if necessary when using the MEMORY storage engine for internal in-memory temporary tables) if you do many advanced GROUP BY queries and you have lots of memory.

You can compare the number of internal on-disk temporary tables created to the total number of internal temporary tables created by comparing Created_tmp_disk_tables and Created_tmp_tables values.

See also Section 10.4.4, "Internal Temporary Table Use in MySQL".
- tmpdir

\begin{tabular}{|l|l|}
\hline Command-Line Format & --tmpdir=dir_name \\
\hline System Variable & tmpdir \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Directory name \\
\hline
\end{tabular}

The path of the directory to use for creating temporary files. It might be useful if your default / tmp directory resides on a partition that is too small to hold temporary tables. This variable can be set to a list of several paths that are used in round-robin fashion. Paths should be separated by colon characters (:) on Unix and semicolon characters (;) on Windows.
tmpdir can be a non-permanent location, such as a directory on a memory-based file system or a directory that is cleared when the server host restarts. If the MySQL server is acting as a replica, and you are using a non-permanent location for tmpdir, consider setting a different temporary directory for the replica using the replica_load_tmpdir variable. For a replica, the temporary files used to replicate LOAD DATA statements are stored in this directory, so with a permanent location they can survive machine restarts, although replication can now continue after a restart if the temporary files have been removed.

For more information about the storage location of temporary files, see Section B.3.3.5, "Where MySQL Stores Temporary Files".
- transaction_alloc_block_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --transaction-alloc-block-size=\# \\
\hline System Variable & transaction_alloc_block_size \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 8192 \\
\hline Minimum Value & 1024 \\
\hline Maximum Value & 131072 \\
\hline Unit & bytes \\
\hline Block Size & 1024 \\
\hline
\end{tabular}

The amount in bytes by which to increase a per-transaction memory pool which needs memory. See the description of transaction_prealloc_size.
- transaction_isolation

\begin{tabular}{|l|l|}
\hline Command-Line Format & --transaction-isolation=name \\
\hline System Variable & transaction_isolation \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Enumeration \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Default Value & REPEATABLE-READ \\
\hline \multirow[t]{4}{*}{Valid Values} & READ - UNCOMMITTED \\
\hline & READ - COMMITTED \\
\hline & REPEATABLE - READ \\
\hline & SERIALIZABLE \\
\hline
\end{tabular}

The transaction isolation level. The default is REPEATABLE-READ.
The transaction isolation level has three scopes: global, session, and next transaction. This three-scope implementation leads to some nonstandard isolation-level assignment semantics, as described later.

To set the global transaction isolation level at startup, use the --transaction-isolation server option.

At runtime, the isolation level can be set directly using the SET statement to assign a value to the transaction_isolation system variable, or indirectly using the SET TRANSACTION statement. If you set transaction_isolation directly to an isolation level name that contains a space, the name should be enclosed within quotation marks, with the space replaced by a dash. For example, use this SET statement to set the global value:
```
SET GLOBAL transaction_isolation = 'READ-COMMITTED';
```


Setting the global transaction_isolation value sets the isolation level for all subsequent sessions. Existing sessions are unaffected.

To set the session or next-level transaction_isolation value, use the SET statement. For most session system variables, these statements are equivalent ways to set the value:
```
SET @@SESSION.var_name = value;
SET SESSION var_name = value;
SET var_name = value;
SET @@var_name = value;
```


As mentioned previously, the transaction isolation level has a next-transaction scope, in addition to the global and session scopes. To enable the next-transaction scope to be set, SET syntax for assigning session system variable values has nonstandard semantics for transaction_isolation:
- To set the session isolation level, use any of these syntaxes:
```
SET @@SESSION.transaction_isolation = value;
SET SESSION transaction_isolation = value;
```

```
SET transaction_isolation = value;
```


For each of those syntaxes, these semantics apply:
- Sets the isolation level for all subsequent transactions performed within the session.
- Permitted within transactions, but does not affect the current ongoing transaction.
- If executed between transactions, overrides any preceding statement that sets the nexttransaction isolation level.
- Corresponds to SET SESSION TRANSACTION ISOLATION LEVEL (with the SESSION keyword).
- To set the next-transaction isolation level, use this syntax:
```
SET @@transaction_isolation = value;
```


For that syntax, these semantics apply:
- Sets the isolation level only for the next single transaction performed within the session.
- Subsequent transactions revert to the session isolation level.
- Not permitted within transactions.
- Corresponds to SET TRANSACTION ISOLATION LEVEL (without the SESSION keyword).

For more information about SET TRANSACTION and its relationship to the transaction_isolation system variable, see Section 15.3.7, "SET TRANSACTION Statement".
- transaction_prealloc_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --transaction-prealloc-size=\# \\
\hline Deprecated & Yes \\
\hline System Variable & transaction_prealloc_size \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 4096 \\
\hline Minimum Value & 1024 \\
\hline Maximum Value & 131072 \\
\hline Unit & bytes \\
\hline Block Size & 1024 \\
\hline
\end{tabular}

There is a per-transaction memory pool from which various transaction-related allocations take memory. The initial size of the pool in bytes is transaction_prealloc_size. For every allocation that cannot be satisfied from the pool because it has insufficient memory available, the pool is increased by transaction_alloc_block_size bytes. When the transaction ends, the pool is truncated to transaction_prealloc_size bytes. By making transaction_prealloc_size sufficiently large to contain all statements within a single transaction, you can avoid many malloc() calls.
transaction_prealloc_size is deprecated, and setting this variable no longer has any effect. Expect transaction_prealloc_size to be removed in a future release of MySQL.
- transaction_read_only

\begin{tabular}{|l|l|}
\hline Command-Line Format & --transaction-read-only[=\{OFF|ON\}] \\
\hline System Variable & transaction_read_only \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & 0FF \\
\hline
\end{tabular}

The transaction access mode. The value can be OFF (read/write; the default) or ON (read only).
The transaction access mode has three scopes: global, session, and next transaction. This threescope implementation leads to some nonstandard access-mode assignment semantics, as described later.

To set the global transaction access mode at startup, use the --transaction-read-only server option.

At runtime, the access mode can be set directly using the SET statement to assign a value to the transaction_read_only system variable, or indirectly using the SET TRANSACTION statement. For example, use this SET statement to set the global value:

SET GLOBAL transaction_read_only = ON;
Setting the global transaction_read_only value sets the access mode for all subsequent sessions. Existing sessions are unaffected.

To set the session or next-level transaction_read_only value, use the SET statement. For most session system variables, these statements are equivalent ways to set the value:
```
SET @@SESSION.var_name = value;
SET SESSION var_name = value;
SET var_name = value;
SET @@var_name = value;
```


As mentioned previously, the transaction access mode has a next-transaction scope, in addition to the global and session scopes. To enable the next-transaction scope to be set, SET syntax for assigning session system variable values has nonstandard semantics for transaction_read_only,
- To set the session access mode, use any of these syntaxes:
```
SET @@SESSION.transaction_read_only = value;
SET SESSION transaction_read_only = value;
```

```
SET transaction_read_only = value;
```


For each of those syntaxes, these semantics apply:
- Sets the access mode for all subsequent transactions performed within the session.
- Permitted within transactions, but does not affect the current ongoing transaction.
- If executed between transactions, overrides any preceding statement that sets the nexttransaction access mode.
- Corresponds to SET SESSION TRANSACTION \{READ WRITE | READ ONLY\} (with the SESSION keyword).
- To set the next-transaction access mode, use this syntax:
```
SET @@transaction_read_only = value;
```


For that syntax, these semantics apply:
- Sets the access mode only for the next single transaction performed within the session.
- Subsequent transactions revert to the session access mode.
- Not permitted within transactions.
- Corresponds to SET TRANSACTION \{READ WRITE | READ ONLY\} (without the SESSION keyword).

For more information about SET TRANSACTION and its relationship to the transaction_read_only system variable, see Section 15.3.7, "SET TRANSACTION Statement".
- unique_checks

\begin{tabular}{|l|l|}
\hline System Variable & unique_checks \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & Yes \\
\hline Type & Boolean \\
\hline Default Value & ON \\
\hline
\end{tabular}

If set to 1 (the default), uniqueness checks for secondary indexes in InnoDB tables are performed. If set to 0 , storage engines are permitted to assume that duplicate keys are not present in input data. If you know for certain that your data does not contain uniqueness violations, you can set this to 0 to speed up large table imports to InnoDB.

Setting this variable to 0 does not require storage engines to ignore duplicate keys. An engine is still permitted to check for them and issue duplicate-key errors if it detects them.
- updatable_views_with_limit

\begin{tabular}{|l|l|}
\hline Command-Line Format & --updatable-views-with-limit[=\{OFF| ON\} ] \\
\hline System Variable & updatable_views_with_limit \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & Yes \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Type & Boolean \\
\hline Default Value & 1 \\
\hline
\end{tabular}

This variable controls whether updates to a view can be made when the view does not contain all columns of the primary key defined in the underlying table, if the update statement contains a LIMIT clause. (Such updates often are generated by GUI tools.) An update is an UPDATE or DELETE statement. Primary key here means a PRIMARY KEY, or a UNIQUE index in which no column can contain NULL.

The variable can have two values:
- 1 or YES: Issue a warning only (not an error message). This is the default value.
- 0 or NO: Prohibit the update.
- use_secondary_engine

For use with MySQL HeatWave only. See System Variables, for more information.
- validate_password.xxx

The validate_password component implements a set of system variables having names of the form validate_password. $x x x$. These variables affect password testing by that component; see Section 8.4.3.2, "Password Validation Options and Variables".
- version

The version number for the server. The value might also include a suffix indicating server build or configuration information. - debug indicates that the server was built with debugging support enabled.
- version_comment

\begin{tabular}{|l|l|}
\hline System Variable & version_comment \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline
\end{tabular}

The CMake configuration program has a COMPILATION_COMMENT_SERVER option that permits a comment to be specified when building MySQL. This variable contains the value of that comment.
- version_compile_machine

\begin{tabular}{|l|l|}
\hline System Variable & version_compile_machine \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline
\end{tabular}

The type of the server binary.
- version_compile_os

\begin{tabular}{|l|l|}
\hline System Variable & version_compile_os \\
\hline Scope & Global \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline
\end{tabular}

The type of operating system on which MySQL was built.
- version_compile_zlib

\begin{tabular}{|l|l|}
\hline System Variable & version_compile_zlib \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline
\end{tabular}

The version of the compiled-in zlib library.
- wait_timeout

\begin{tabular}{|l|l|}
\hline Command-Line Format & --wait-timeout=\# \\
\hline System Variable & wait_timeout \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 28800 \\
\hline Minimum Value & 1 \\
\hline Maximum Value (Windows) & 2147483 \\
\hline Maximum Value (Other) & 31536000 \\
\hline Unit & seconds \\
\hline
\end{tabular}

The number of seconds the server waits for activity on a noninteractive connection before closing it.
On thread startup, the session wait_timeout value is initialized from the global wait_timeout value or from the global interactive_timeout value, depending on the type of client (as defined by the CLIENT_INTERACTIVE connect option to mysql_real_connect ( )). See also interactive_timeout.
- warning_count

The number of errors, warnings, and notes that resulted from the last statement that generated messages. This variable is read only. See Section 15.7.7.42, "SHOW WARNINGS Statement".
- windowing_use_high_precision

\begin{tabular}{|l|l|}
\hline Command-Line Format & --windowing-use-highprecision[=\{OFF|ON\}] \\
\hline System Variable & windowing_use_high_precision \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & Yes \\
\hline Type & Boolean \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Default Value & ON \\
\hline
\end{tabular}

Whether to compute window operations without loss of precision. See Section 10.2.1.21, "Window Function Optimization".
- xa_detach_on_prepare

\begin{tabular}{|l|l|}
\hline Command-Line Format & --xa-detach-on-prepare[=\{OFF|ON\}] \\
\hline System Variable & xa_detach_on_prepare \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & ON \\
\hline
\end{tabular}

When set to ON (enabled), all XA transactions are detached (disconnected) from the connection (session) as part of XA PREPARE. This means that the XA transaction can be committed or rolled back by another connection, even if the originating connection has not terminated, and this connection can start new transactions.

Temporary tables cannot be used inside detached XA transactions.
When this is OFF (disabled), an XA transaction is strictly associated with the same connection until the session disconnects. It is recommended that you allow it to be enabled (the default behavior) for replication.

For more information, see Section 15.3.8.2, "XA Transaction States".

\subsection*{7.1.9 Using System Variables}

The MySQL server maintains many system variables that configure its operation. Section 7.1.8, "Server System Variables", describes the meaning of these variables. Each system variable has a default value. System variables can be set at server startup using options on the command line or in an option file. Most of them can be changed dynamically while the server is running by means of the SET statement, which enables you to modify operation of the server without having to stop and restart it. You can also use system variable values in expressions.

Many system variables are built in. System variables may also be installed by server plugins or components:
- System variables implemented by a server plugin are exposed when the plugin is installed and have names that begin with the plugin name. For example, the audit_log plugin implements a system variable named audit_log_policy.
- System variables implemented by a component are exposed when the component is installed and have names that begin with a component-specific prefix. For example, the log_filter_dragnet error log filter component implements a system variable named log_error_filter_rules, the full name of which is dragnet. log_error_filter_rules. To refer to this variable, use the full name.

There are two scopes in which system variables exist. Global variables affect the overall operation of the server. Session variables affect its operation for individual client connections. A given system variable can have both a global and a session value. Global and session system variables are related as follows:
- When the server starts, it initializes each global variable to its default value. These defaults can be changed by options specified on the command line or in an option file. (See Section 6.2.2, "Specifying Program Options".)
- The server also maintains a set of session variables for each client that connects. The client's session variables are initialized at connect time using the current values of the corresponding global variables. For example, a client's SQL mode is controlled by the session sql_mode value, which is initialized when the client connects to the value of the global sql_mode value.

For some system variables, the session value is not initialized from the corresponding global value; if so, that is indicated in the variable description.

System variable values can be set globally at server startup by using options on the command line or in an option file. At startup, the syntax for system variables is the same as for command options, so within variable names, dashes and underscores may be used interchangeably. For example, general_log=0N and --general-log=0N are equivalent.

When you use a startup option to set a variable that takes a numeric value, the value can be given with a suffix of K, M, G, T, P, or E (either uppercase or lowercase) to indicate a multiplier of 1024, 1024 ${ }^{2}$, $1024^{3}, 1024^{4}, 1024^{5}$, or $1024^{6}$; that is, units of kilobytes, megabytes, gigabytes, terabytes, petabytes, or ettabytes, respectively. Thus, the following command starts the server with a sort buffer size of 256 kilobytes and a maximum packet size of one gigabyte:
```
mysqld --sort-buffer-size=256K --max-allowed-packet=1G
```


Within an option file, those variables are set like this:
```
[mysqld]
sort_buffer_size=256K
max_allowed_packet=1G
```


The lettercase of suffix letters does not matter; 256 K and 256 K are equivalent, as are 1 G and 1 g .
To restrict the maximum value to which a system variable can be set at runtime with the SET statement, specify this maximum by using an option of the form --maximum-var_name=value at server startup. For example, to prevent the value of sort_buffer_size from being increased to more than 32 MB at runtime, use the option--maximum-sort-buffer-size=32M.

Many system variables are dynamic and can be changed at runtime by using the SET statement. For a list, see Section 7.1.9.2, "Dynamic System Variables". To change a system variable with SET, refer to it by name, optionally preceded by a modifier. At runtime, system variable names must be written using underscores, not dashes. The following examples briefly illustrate this syntax:
- Set a global system variable:
```
SET GLOBAL max_connections = 1000;
SET @@GLOBAL.max_connections = 1000;
```

- Persist a global system variable to the mysqld-auto.cnf file (and set the runtime value):
```
SET PERSIST max_connections = 1000;
SET @@PERSIST.max_connections = 1000;
```

- Persist a global system variable to the mysqld-auto.cnf file (without setting the runtime value):
```
SET PERSIST_ONLY back_log = 1000;
SET @@PERSIST_ONLY.back_log = 1000;
```

- Set a session system variable:
```
SET SESSION sql_mode = 'TRADITIONAL';
SET @@SESSION.sql_mode = 'TRADITIONAL';
SET @@sql_mode = 'TRADITIONAL';
```


For complete details about SET syntax, see Section 15.7.6.1, "SET Syntax for Variable Assignment". For a description of the privilege requirements for setting and persisting system variables, see Section 7.1.9.1, "System Variable Privileges"

Suffixes for specifying a value multiplier can be used when setting a variable at server startup, but not to set the value with SET at runtime. On the other hand, with SET you can assign a variable's value using an expression, which is not true when you set a variable at server startup. For example, the first of the following lines is legal at server startup, but the second is not:
```
$> mysql --max_allowed_packet=16M
$> mysql --max_allowed_packet=16*1024*1024
```


Conversely, the second of the following lines is legal at runtime, but the first is not:
```
mysql> SET GLOBAL max_allowed_packet=16M;
mysql> SET GLOBAL max_allowed_packet=16*1024*1024;
```


To display system variable names and values, use the SHOW VARIABLES statement:
```
mysql> SHOW VARIABLES;
+--------------------------------------------------------+---------------------
| Variable_name | Value |
| activate_all_roles_on_login | OFF
| admin_address
| admin_port | 33062
| admin_ssl_ca
| admin_ssl_capath
| admin_ssl_cert
| admin_ssl_cipher
| admin_ssl_crl
| admin_ssl_crlpath
| admin_ssl_key
| admin_tls_ciphersuites
| admin_tls_version | TLSv1.2,TLSv1.3
| authentication_policy | *,,
| auto_generate_certs | ON
| auto_increment_increment | 1
| auto_increment_offset | 1
| autocommit | ON
| automatic_sp_privileges | ON
...

\begin{tabular}{|l|l|}
\hline version & 8.4.0 \\
\hline version_comment & Source distribution \\
\hline version_compile_machine & x86_64 \\
\hline version_compile_os & Linux \\
\hline version_compile_zlib & 1.2 . 13 \\
\hline wait_timeout & 28800 \\
\hline warning_count & 0 \\
\hline windowing_use_high_precision & ON \\
\hline xa_detach_on_prepare & ON \\
\hline
\end{tabular}
```


With a LIKE clause, the statement displays only those variables that match the pattern. To obtain a specific variable name, use a LIKE clause as shown:
```
SHOW VARIABLES LIKE 'max_join_size';
SHOW SESSION VARIABLES LIKE 'max_join_size';
```


To get a list of variables whose name match a pattern, use the $\%$ wildcard character in a LIKE clause:
SHOW VARIABLES LIKE '\%size\%';
SHOW GLOBAL VARIABLES LIKE '\%size\%';
Wildcard characters can be used in any position within the pattern to be matched. Strictly speaking, because _ is a wildcard that matches any single character, you should escape it as \_ to match it literally. In practice, this is rarely necessary.

For SHOW VARIABLES, if you specify neither GLOBAL nor SESSION, MySQL returns SESSION values.
The reason for requiring the GLOBAL keyword when setting GLOBAL-only variables but not when retrieving them is to prevent problems in the future:
- Were a SESSION variable to be removed that has the same name as a GLOBAL variable, a client with privileges sufficient to modify global variables might accidentally change the GLOBAL variable rather than just the SESSION variable for its own session.
- Were a SESSION variable to be added with the same name as a GLOBAL variable, a client that intends to change the GLOBAL variable might find only its own SESSION variable changed.

\subsection*{7.1.9.1 System Variable Privileges}

A system variable can have a global value that affects server operation as a whole, a session value that affects only the current session, or both:
- For dynamic system variables, the SET statement can be used to change their global or session runtime value (or both), to affect operation of the current server instance. (For information about dynamic variables, see Section 7.1.9.2, "Dynamic System Variables".)
- For certain global system variables, SET can be used to persist their value to the mysqldauto. cnf file in the data directory, to affect server operation for subsequent startups. (For information about persisting system variables and the mysqld-auto.cnf file, see Section 7.1.9.3, "Persisted System Variables".)
- For persisted global system variables, RESET PERSIST can be used to remove their value from mysqld-auto.cnf, to affect server operation for subsequent startups.

This section describes the privileges required for operations that assign values to system variables at runtime. This includes operations that affect runtime values, and operations that persist values.

To set a global system variable, use a SET statement with the appropriate keyword. These privileges apply:
- To set a global system variable runtime value, use the SET GLOBAL statement, which requires the SYSTEM_VARIABLES_ADMIN privilege (or the deprecated SUPER privilege).
- To persist a global system variable to the mysqld-auto . cnf file (and set the runtime value), use the SET PERSIST statement, which requires the SYSTEM_VARIABLES_ADMIN or SUPER privilege.
- To persist a global system variable to the mysqld-auto.cnf file (without setting the runtime value), use the SET PERSIST_ONLY statement, which requires the SYSTEM_VARIABLES_ADMIN and PERSIST_RO_VARIABLES_ADMIN privileges. SET PERSIST_ONLY can be used for both dynamic and read-only system variables, but is particularly useful for persisting read-only variables, for which SET PERSIST cannot be used.
- Some global system variables are persist-restricted (see Section 7.1.9.4, "Nonpersistible and PersistRestricted System Variables"). To persist these variables, use the SET PERSIST_ONLY statement, which requires the privileges described previously. In addition, you must connect to the server using an encrypted connection and supply an SSL certificate with the Subject value specified by the persist_only_admin_x509_subject system variable.

To remove a persisted global system variable from the mysqld-auto.cnf file, use the RESET PERSIST statement. These privileges apply:
- For dynamic system variables, RESET PERSIST requires the SYSTEM_VARIABLES_ADMIN or SUPER privilege.
- For read-only system variables, RESET PERSIST requires the SYSTEM_VARIABLES_ADMIN and PERSIST_RO_VARIABLES_ADMIN privileges.
- For persist-restricted variables, RESET PERSIST does not require an encrypted connection to the server made using a particular SSL certificate.

If a global system variable has any exceptions to the preceding privilege requirements, the variable description indicates those exceptions. Examples include default_table_encryption and
mandatory_roles, which require additional privileges. These additional privileges apply to operations that set the global runtime value, but not operations that persist the value.

To set a session system variable runtime value, use the SET SESSION statement. In contrast to setting global runtime values, setting session runtime values normally requires no special privileges and can be done by any user to affect the current session. For some system variables, setting the session value may have effects outside the current session and thus is a restricted operation that can be done only by users who have a special privilege:
- The privilege required is SESSION_VARIABLES_ADMIN.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0912.jpg?height=213&width=35&top_left_y=667&top_left_x=566)

> Note
> Any user who has SYSTEM_VARIABLES_ADMIN or SUPER effectively has SESSION_VARIABLES_ADMIN by implication and need not be granted SESSION_VARIABLES_ADMIN explicitly.

If a session system variable is restricted, the variable description indicates that restriction. Examples include binlog_format and sql_log_bin. Setting the session value of these variables affects binary logging for the current session, but may also have wider implications for the integrity of server replication and backups.

SESSION_VARIABLES_ADMIN enables administrators to minimize the privilege footprint of users who may previously have been granted SYSTEM_VARIABLES_ADMIN or SUPER for the purpose of enabling them to modify restricted session system variables. Suppose that an administrator has created the following role to confer the ability to set restricted session system variables:

CREATE ROLE set_session_sysvars;
GRANT SYSTEM_VARIABLES_ADMIN ON *.* TO set_session_sysvars;
Any user granted the set_session_sysvars role (and who has that role active) is able to set restricted session system variables. However, that user is also able to set global system variables, which may be undesirable.

By modifying the role to have SESSION_VARIABLES_ADMIN instead of SYSTEM_VARIABLES_ADMIN, the role privileges can be reduced to the ability to set restricted session system variables and nothing else. To modify the role, use these statements:

GRANT SESSION_VARIABLES_ADMIN ON *.* TO set_session_sysvars;
REVOKE SYSTEM_VARIABLES_ADMIN ON *.* FROM set_session_sysvars;
Modifying the role has an immediate effect: Any account granted the set_session_sysvars role no longer has SYSTEM_VARIABLES_ADMIN and is not able to set global system variables without being granted that ability explicitly. A similar GRANT/REVOKE sequence can be applied to any account that was granted SYSTEM_VARIABLES_ADMIN directly rather than by means of a role.

\subsection*{7.1.9.2 Dynamic System Variables}

Many server system variables are dynamic and can be set at runtime. See Section 15.7.6.1, "SET Syntax for Variable Assignment". For a description of the privilege requirements for setting system variables, see Section 7.1.9.1, "System Variable Privileges"

The following table lists all dynamic system variables applicable within mysqld.
The table lists each variable's data type and scope. The last column indicates whether the scope for each variable is Global, Session, or both. Please see the corresponding item descriptions for details on setting and using the variables. Where appropriate, direct links to further information about the items are provided.

Variables that have a type of "string" take a string value. Variables that have a type of "numeric" take a numeric value. Variables that have a type of "boolean" can be set to $0,1,0 \mathrm{~N}$ or OFF. Variables that are marked as "enumeration" normally should be set to one of the available values for the variable, but can also be set to the number that corresponds to the desired enumeration value. For enumerated system
variables, the first enumeration value corresponds to 0 . This differs from the ENUM data type used for table columns, for which the first enumeration value corresponds to 1 .

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 7.5 Dynamic System Variable Summary}
\begin{tabular}{|l|l|l|}
\hline Variable Name & Variable Type & Variable Scope \\
\hline activate_all_roles_on_login & Boolean & Global \\
\hline admin_ssl_ca & File name & Global \\
\hline admin_ssl_capath & Directory name & Global \\
\hline admin_ssl_cert & File name & Global \\
\hline admin_ssl_cipher & String & Global \\
\hline admin_ssl_crl & File name & Global \\
\hline admin_ssl_crlpath & Directory name & Global \\
\hline admin_ssl_key & File name & Global \\
\hline admin_tls_ciphersuites & String & Global \\
\hline admin_tls_version & String & Global \\
\hline audit_log_connection_policy & Enumeration & Global \\
\hline audit_log_disable & Boolean & Global \\
\hline audit_log_exclude_accounts & String & Global \\
\hline audit_log_flush & Boolean & Global \\
\hline audit_log_format_unix_timestamp & Boolean & Global \\
\hline audit_log_include_accounts & String & Global \\
\hline audit_log_password_history_keep & Indæger & Global \\
\hline audit_log_prune_seconds & Integer & Global \\
\hline audit_log_read_buffer_size & Integer & Both \\
\hline audit_log_rotate_on_size & Integer & Global \\
\hline audit_log_statement_policy & Enumeration & Global \\
\hline authentication_kerberos_service & pBitnicigal & Global \\
\hline authentication_ldap_sasl_auth_me & esthring name & Global \\
\hline authentication_ldap_sasl_bind_ba & stridg & Global \\
\hline authentication_ldap_sasl_bind_roc & Striding & Global \\
\hline authentication_ldap_sasl_bind_ro & \$tripingl & Global \\
\hline authentication_ldap_sasl_ca_path & String & Global \\
\hline authentication_Idap_sasl_connect & Ittitegent & Global \\
\hline authentication_ldap_sasl_group_s & Stariclg attr & Global \\
\hline authentication_ldap_sasl_group_s & Savincig filter & Global \\
\hline authentication_ldap_sasl_init_poo & Insieger & Global \\
\hline authentication_ldap_sasl_log_stat & ulsteger & Global \\
\hline authentication_ldap_sasl_max_po & dhtegger & Global \\
\hline authentication_Idap_sasl_referral & Boolean & Global \\
\hline authentication_ldap_sasl_respons & entergeout & Global \\
\hline authentication_Idap_sasl_server_ & Ditstng & Global \\
\hline authentication_Idap_sasl_server_ & dotteger & Global \\
\hline authentication_ldap_sasl_tls & Boolean & Global \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|l|}
\hline Variable Name & Variable Type & Variable Scope \\
\hline authentication_ldap_sasl_user_se & Attringattr & Global \\
\hline authentication_Idap_simple_auth & Btethigd _name & Global \\
\hline authentication_Idap_simple_bind & Lasagdn & Global \\
\hline authentication_Idap_simple_bind & String! & Global \\
\hline authentication_Idap_simple_bind & Stvingwd & Global \\
\hline authentication_Idap_simple_ca_p & astring & Global \\
\hline authentication_Idap_simple_conn & ecttegereout & Global \\
\hline authentication_Idap_simple_group & Sstreagch_attr & Global \\
\hline authentication_Idap_simple_group & Ssiéagch_filter & Global \\
\hline authentication_Idap_simple_init_p & dotegine & Global \\
\hline authentication_ldap_simple_log_s & thatteger & Global \\
\hline authentication_Idap_simple_max & protelgesize & Global \\
\hline authentication_Idap_simple_referr & Boolean & Global \\
\hline authentication_Idap_simple_respo & instegameout & Global \\
\hline authentication_Idap_simple_serve & Stmines. & Global \\
\hline authentication_ldap_simple_serve & Intreger & Global \\
\hline authentication_ldap_simple_tls & Boolean & Global \\
\hline authentication_Idap_simple_user_ & Stainch_attr & Global \\
\hline authentication_policy & String & Global \\
\hline authentication_webauthn_rp_id & String & Global \\
\hline auto_increment_increment & Integer & Both \\
\hline auto_increment_offset & Integer & Both \\
\hline autocommit & Boolean & Both \\
\hline automatic_sp_privileges & Boolean & Global \\
\hline big_tables & Boolean & Both \\
\hline binlog_cache_size & Integer & Global \\
\hline binlog_checksum & String & Global \\
\hline binlog_direct_non_transactional_u & BOdtlean & Both \\
\hline binlog_encryption & Boolean & Global \\
\hline binlog_error_action & Enumeration & Global \\
\hline binlog_expire_logs_auto_purge & Boolean & Global \\
\hline binlog_expire_logs_seconds & Integer & Global \\
\hline binlog_format & Enumeration & Both \\
\hline binlog_group_commit_sync_delay & Integer & Global \\
\hline binlog_group_commit_sync_no_d & draegeount & Global \\
\hline binlog_max_flush_queue_time & Integer & Global \\
\hline binlog_order_commits & Boolean & Global \\
\hline binlog_row_image & Enumeration & Both \\
\hline binlog_row_metadata & Enumeration & Global \\
\hline binlog_row_value_options & Set & Both \\
\hline binlog_rows_query_log_events & Boolean & Both \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|}
\hline Variable Name & Variable Type & Variable Scope \\
\hline binlog_stmt_cache_size & Integer & Global \\
\hline binlog_transaction_compression & Boolean & Both \\
\hline binlog_transaction_compression_ & ervelgestd & Both \\
\hline binlog_transaction_dependency_h & histtegresize & Global \\
\hline block_encryption_mode & String & Both \\
\hline bulk_insert_buffer_size & Integer & Both \\
\hline caching_sha2_password_digest_r & rdnoeger & Global \\
\hline character_set_client & String & Both \\
\hline character_set_connection & String & Both \\
\hline character_set_database & String & Both \\
\hline character_set_filesystem & String & Both \\
\hline character_set_results & String & Both \\
\hline character_set_server & String & Both \\
\hline check_proxy_users & Boolean & Global \\
\hline clone_autotune_concurrency & Boolean & Global \\
\hline clone_block_ddl & Boolean & Global \\
\hline clone_buffer_size & Integer & Global \\
\hline clone_ddl_timeout & Integer & Global \\
\hline clone_delay_after_data_drop & Integer & Global \\
\hline clone_donor_timeout_after_netwo & Ilitcajidrire & Global \\
\hline clone_enable_compression & Boolean & Global \\
\hline clone_max_concurrency & Integer & Global \\
\hline clone_max_data_bandwidth & Integer & Global \\
\hline clone_max_network_bandwidth & Integer & Global \\
\hline clone_ssl_ca & File name & Global \\
\hline clone_ssl_cert & File name & Global \\
\hline clone_ssl_key & File name & Global \\
\hline clone_valid_donor_list & String & Global \\
\hline collation_connection & String & Both \\
\hline collation_database & String & Both \\
\hline collation_server & String & Both \\
\hline completion_type & Enumeration & Both \\
\hline component_scheduler.enabled & Boolean & Global \\
\hline concurrent_insert & Enumeration & Global \\
\hline connect_timeout & Integer & Global \\
\hline connection_control_failed_connec & tinotegehreshold & Global \\
\hline connection_control_max_connecti & demtegelay & Global \\
\hline connection_control_min_connectio & Imtergeny & Global \\
\hline connection_memory_chunk_size & Integer & Both \\
\hline connection_memory_limit & Integer & Both \\
\hline cte_max_recursion_depth & Integer & Both \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|}
\hline Variable Name & Variable Type & Variable Scope \\
\hline debug & String & Both \\
\hline debug_sync & String & Session \\
\hline default_collation_for_utf8mb4 & Enumeration & Both \\
\hline default_password_lifetime & Integer & Global \\
\hline default_storage_engine & Enumeration & Both \\
\hline default_table_encryption & Boolean & Both \\
\hline default_tmp_storage_engine & Enumeration & Both \\
\hline default_week_format & Integer & Both \\
\hline delay_key_write & Enumeration & Global \\
\hline delayed_insert_limit & Integer & Global \\
\hline delayed_insert_timeout & Integer & Global \\
\hline delayed_queue_size & Integer & Global \\
\hline div_precision_increment & Integer & Both \\
\hline dragnet.log_error_filter_rules & String & Global \\
\hline end_markers_in_json & Boolean & Both \\
\hline enforce_gtid_consistency & Enumeration & Global \\
\hline enterprise_encryption.maximum_ $\boldsymbol{+}$ & \$atelger_r_size & Global \\
\hline enterprise_encryption.rsa_suppor & Bleglayn_padding & Global \\
\hline eq_range_index_dive_limit & Integer & Both \\
\hline event_scheduler & Enumeration & Global \\
\hline explain_format & Enumeration & Both \\
\hline explain_json_format_version & Integer & Both \\
\hline explicit_defaults_for_timestamp & Boolean & Both \\
\hline flush & Boolean & Global \\
\hline flush_time & Integer & Global \\
\hline foreign_key_checks & Boolean & Both \\
\hline ft_boolean_syntax & String & Global \\
\hline general_log & Boolean & Global \\
\hline general_log_file & File name & Global \\
\hline generated_random_password_len & ghteger & Both \\
\hline global_connection_memory_limit & Integer & Global \\
\hline global_connection_memory_track & Bqolean & Both \\
\hline group_concat_max_len & Integer & Both \\
\hline group_replication_advertise_recov & stryingndpoints & Global \\
\hline group_replication_allow_local_low & eroderamn _join & Global \\
\hline group_replication_auto_increment & Innegement & Global \\
\hline group_replication_autorejoin_tries & Integer & Global \\
\hline group_replication_bootstrap_grou & Boolean & Global \\
\hline group_replication_clone_threshold & dInteger & Global \\
\hline group_replication_communication & Strelongg_options & Global \\
\hline group_replication_communication & Integemessage_size & Global \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|}
\hline Variable Name & Variable Type & Variable Scope \\
\hline group_replication_communication & Staing & Global \\
\hline group_replication_components_stc & dpttgeeout & Global \\
\hline \multicolumn{2}{|l|}{group_replication_compression_thhetdged} & Global \\
\hline group_replication_consistency & Enumeration & Both \\
\hline group_replication_enforce_update & Benodeanhere_checks & Global \\
\hline group_replication_exit_state_actio & Enumeration & Global \\
\hline \multicolumn{2}{|l|}{group_replication_flow_control_appliegehreshold} & Global \\
\hline \multicolumn{2}{|l|}{group_replication_flow_control_cettifegethreshold} & Global \\
\hline group_replication_flow_control_ho & Idtexecent & Global \\
\hline \multicolumn{2}{|l|}{group_replication_flow_control_maktepyexta} & Global \\
\hline \multicolumn{2}{|l|}{group_replication_flow_control_mentbgerquota_percent} & Global \\
\hline group_replication_flow_control_mi & integera & Global \\
\hline group_replication_flow_control_mi & Intregrevery_quota & Global \\
\hline \multicolumn{2}{|l|}{group_replication_flow_control_mdetumeration} & Global \\
\hline \multicolumn{2}{|l|}{group_replication_flow_control_perineger} & Global \\
\hline group_replication_flow_control_rel & tategepercent & Global \\
\hline group_replication_force_members & String & Global \\
\hline group_replication_group_name & String & Global \\
\hline group_replication_group_seeds & String & Global \\
\hline group_replication_gtid_assignmen & tntegek_size & Global \\
\hline group_replication_ip_allowlist & String & Global \\
\hline group_replication_local_address & String & Global \\
\hline group_replication_member_expel & Wintregeut & Global \\
\hline \multicolumn{2}{|l|}{group_replication_member_weightlnteger} & Global \\
\hline \multicolumn{2}{|l|}{group_replication_message_cachentegær} & Global \\
\hline group_replication_paxos_single_le & eßadelean & Global \\
\hline group_replication_poll_spin_loops & Integer & Global \\
\hline group_replication_preemptive_gar & Boggeallection & Global \\
\hline group_replication_preemptive_gar & batgegecollection_rows_threshold & Global \\
\hline group_replication_recovery_comp & seseion_algorithms & Global \\
\hline \multicolumn{2}{|l|}{group_replication_recovery_get_plodolelely} & Global \\
\hline group_replication_recovery_public & Fldeynarate & Global \\
\hline group_replication_recovery_recon & nreetgenterval & Global \\
\hline group_replication_recovery_retry_ & doterigter & Global \\
\hline \multicolumn{2}{|l|}{group_replication_recovery_ssl_caString} & Global \\
\hline \multicolumn{2}{|l|}{group_replication_recovery_ssl_caquating} & Global \\
\hline \multicolumn{2}{|l|}{group_replication_recovery_ssl_ceSttring} & Global \\
\hline \multicolumn{2}{|l|}{group_replication_recovery_ssl_ci|Stung} & Global \\
\hline \multicolumn{2}{|l|}{group_replication_recovery_ssl_crFile name} & Global \\
\hline \multicolumn{2}{|l|}{group_replication_recovery_ssl_cr甲iadetory name} & Global \\
\hline \multicolumn{2}{|l|}{group_replication_recovery_ssl_kestring} & Global \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|}
\hline Variable Name & Variable Type & Variable Scope \\
\hline group_replication_recovery_ssl_v & ABidgolsanver_cert & Global \\
\hline group_replication_recovery_tls_ci & SBlenisgites & Global \\
\hline group_replication_recovery_tls_ve & Stiving & Global \\
\hline group_replication_recovery_use_\$ & BBloolean & Global \\
\hline group_replication_recovery_zstd & dntegærssion_level & Global \\
\hline group_replication_single_primary & Bwelean & Global \\
\hline group_replication_ssl_mode & Enumeration & Global \\
\hline group_replication_start_on_boot & Boolean & Global \\
\hline group_replication_tls_source & Enumeration & Global \\
\hline group_replication_transaction_siz & Intiegier & Global \\
\hline group_replication_unreachable_m & \&ijoeigertimeout & Global \\
\hline group_replication_view_change_u & Stitting & Global \\
\hline gtid_executed_compression_perio & dhteger & Global \\
\hline gtid_mode & Enumeration & Global \\
\hline gtid_next & Enumeration & Session \\
\hline gtid_purged & String & Global \\
\hline histogram_generation_max_mem & Isitereger & Both \\
\hline host_cache_size & Integer & Global \\
\hline identity & Integer & Session \\
\hline immediate_server_version & Integer & Session \\
\hline information_schema_stats_expiry & Integer & Both \\
\hline init_connect & String & Global \\
\hline init_replica & String & Global \\
\hline init_slave & String & Global \\
\hline innodb_adaptive_flushing & Boolean & Global \\
\hline innodb_adaptive_flushing_lwm & Integer & Global \\
\hline innodb_adaptive_hash_index & Boolean & Global \\
\hline innodb_adaptive_max_sleep_dela & ynteger & Global \\
\hline innodb_autoextend_increment & Integer & Global \\
\hline innodb_background_drop_list_em & 圆甲olean & Global \\
\hline innodb_buffer_pool_dump_at_shu & Bloqean & Global \\
\hline innodb_buffer_pool_dump_now & Boolean & Global \\
\hline innodb_buffer_pool_dump_pct & Integer & Global \\
\hline innodb_buffer_pool_filename & File name & Global \\
\hline innodb_buffer_pool_in_core_file & Boolean & Global \\
\hline innodb_buffer_pool_load_abort & Boolean & Global \\
\hline innodb_buffer_pool_load_now & Boolean & Global \\
\hline innodb_buffer_pool_size & Integer & Global \\
\hline innodb_change_buffer_max_size & Integer & Global \\
\hline innodb_change_buffering & Enumeration & Global \\
\hline innodb_change_buffering_debug & Integer & Global \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|}
\hline Variable Name & Variable Type & Variable Scope \\
\hline innodb_checkpoint_disabled & Boolean & Global \\
\hline innodb_checksum_algorithm & Enumeration & Global \\
\hline innodb_cmp_per_index_enabled & Boolean & Global \\
\hline innodb_commit_concurrency & Integer & Global \\
\hline innodb_compress_debug & Enumeration & Global \\
\hline \multicolumn{2}{|l|}{innodb_compression_failure_thresimtedegrct} & Global \\
\hline innodb_compression_level & Integer & Global \\
\hline \multicolumn{2}{|l|}{innodb_compression_pad_pct_malnteger} & Global \\
\hline innodb_concurrency_tickets & Integer & Global \\
\hline innodb_ddl_buffer_size & Integer & Session \\
\hline innodb_ddl_log_crash_reset_debu & Boolean & Global \\
\hline innodb_ddl_threads & Integer & Session \\
\hline innodb_deadlock_detect & Boolean & Global \\
\hline innodb_default_row_format & Enumeration & Global \\
\hline innodb_disable_sort_file_cache & Boolean & Global \\
\hline innodb_doublewrite & Enumeration & Global \\
\hline innodb_extend_and_initialize & Boolean & Global \\
\hline innodb_fast_shutdown & Integer & Global \\
\hline innodb_fil_make_page_dirty_debu & integer & Global \\
\hline innodb_file_per_table & Boolean & Global \\
\hline innodb_fill_factor & Integer & Global \\
\hline innodb_flush_log_at_timeout & Integer & Global \\
\hline innodb_flush_log_at_trx_commit & Enumeration & Global \\
\hline innodb_flush_neighbors & Enumeration & Global \\
\hline innodb_flush_sync & Boolean & Global \\
\hline innodb_flushing_avg_loops & Integer & Global \\
\hline innodb_fsync_threshold & Integer & Global \\
\hline innodb_ft_aux_table & String & Global \\
\hline innodb_ft_enable_diag_print & Boolean & Global \\
\hline innodb_ft_enable_stopword & Boolean & Both \\
\hline innodb_ft_num_word_optimize & Integer & Global \\
\hline innodb_ft_result_cache_limit & Integer & Global \\
\hline innodb_ft_server_stopword_table & String & Global \\
\hline innodb_ft_user_stopword_table & String & Both \\
\hline innodb_idle_flush_pct & Integer & Global \\
\hline innodb_io_capacity & Integer & Global \\
\hline innodb_io_capacity_max & Integer & Global \\
\hline innodb_limit_optimistic_insert_deb & Lingeger & Global \\
\hline innodb_lock_wait_timeout & Integer & Both \\
\hline innodb_log_buffer_size & Integer & Global \\
\hline innodb_log_checkpoint_fuzzy_nov & Boolean & Global \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|}
\hline Variable Name & Variable Type & Variable Scope \\
\hline innodb_log_checkpoint_now & Boolean & Global \\
\hline innodb_log_checksums & Boolean & Global \\
\hline innodb_log_compressed_pages & Boolean & Global \\
\hline innodb_log_spin_cpu_abs_lwm & Integer & Global \\
\hline innodb_log_spin_cpu_pct_hwm & Integer & Global \\
\hline innodb_log_wait_for_flush_spin_h & unteger & Global \\
\hline innodb_log_write_ahead_size & Integer & Global \\
\hline innodb_log_writer_threads & Boolean & Global \\
\hline innodb_Iru_scan_depth & Integer & Global \\
\hline innodb_max_dirty_pages_pct & Numeric & Global \\
\hline innodb_max_dirty_pages_pct_lwn & Numeric & Global \\
\hline innodb_max_purge_lag & Integer & Global \\
\hline innodb_max_purge_lag_delay & Integer & Global \\
\hline innodb_max_undo_log_size & Integer & Global \\
\hline innodb_merge_threshold_set_all & diretegger & Global \\
\hline innodb_monitor_disable & String & Global \\
\hline innodb_monitor_enable & String & Global \\
\hline innodb_monitor_reset & Enumeration & Global \\
\hline innodb_monitor_reset_all & Enumeration & Global \\
\hline innodb_old_blocks_pct & Integer & Global \\
\hline innodb_old_blocks_time & Integer & Global \\
\hline innodb_online_alter_log_max_siz & elnteger & Global \\
\hline innodb_open_files & Integer & Global \\
\hline innodb_optimize_fulltext_only & Boolean & Global \\
\hline innodb_parallel_read_threads & Integer & Session \\
\hline innodb_print_all_deadlocks & Boolean & Global \\
\hline innodb_print_ddl_logs & Boolean & Global \\
\hline innodb_purge_batch_size & Integer & Global \\
\hline innodb_purge_rseg_truncate_freq & ulætegjer & Global \\
\hline innodb_random_read_ahead & Boolean & Global \\
\hline innodb_read_ahead_threshold & Integer & Global \\
\hline innodb_redo_log_archive_dirs & String & Global \\
\hline innodb_redo_log_capacity & Integer & Global \\
\hline innodb_redo_log_encrypt & Boolean & Global \\
\hline innodb_replication_delay & Integer & Global \\
\hline innodb_rollback_segments & Integer & Global \\
\hline innodb_saved_page_number_deb & undeger & Global \\
\hline innodb_segment_reserve_factor & Numeric & Global \\
\hline innodb_spin_wait_delay & Integer & Global \\
\hline innodb_spin_wait_pause_multiplie & enteger & Global \\
\hline innodb_stats_auto_recalc & Boolean & Global \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|}
\hline Variable Name & Variable Type & Variable Scope \\
\hline innodb_stats_include_delete_mar & A odolean & Global \\
\hline innodb_stats_method & Enumeration & Global \\
\hline innodb_stats_on_metadata & Boolean & Global \\
\hline innodb_stats_persistent & Boolean & Global \\
\hline innodb_stats_persistent_sample_ & dateger & Global \\
\hline \multicolumn{2}{|l|}{innodb_stats_transient_sample_pagexger} & Global \\
\hline innodb_status_output & Boolean & Global \\
\hline innodb_status_output_locks & Boolean & Global \\
\hline innodb_strict_mode & Boolean & Both \\
\hline innodb_sync_spin_loops & Integer & Global \\
\hline innodb_table_locks & Boolean & Both \\
\hline innodb_thread_concurrency & Integer & Global \\
\hline innodb_thread_sleep_delay & Integer & Global \\
\hline innodb_tmpdir & Directory name & Both \\
\hline innodb_trx_purge_view_update_o & Byodlednug & Global \\
\hline innodb_trx_rseg_n_slots_debug & Integer & Global \\
\hline innodb_undo_log_encrypt & Boolean & Global \\
\hline innodb_undo_log_truncate & Boolean & Global \\
\hline innodb_undo_tablespaces & Integer & Global \\
\hline innodb_use_fdatasync & Boolean & Global \\
\hline insert_id & Integer & Session \\
\hline interactive_timeout & Integer & Both \\
\hline internal_tmp_mem_storage_engin & Enumeration & Both \\
\hline join_buffer_size & Integer & Both \\
\hline keep_files_on_create & Boolean & Both \\
\hline key_buffer_size & Integer & Global \\
\hline key_cache_age_threshold & Integer & Global \\
\hline key_cache_block_size & Integer & Global \\
\hline key_cache_division_limit & Integer & Global \\
\hline keyring_aws_cmk_id & String & Global \\
\hline keyring_aws_region & Enumeration & Global \\
\hline keyring_hashicorp_auth_path & String & Global \\
\hline keyring_hashicorp_ca_path & File name & Global \\
\hline keyring_hashicorp_caching & Boolean & Global \\
\hline keyring_hashicorp_role_id & String & Global \\
\hline keyring_hashicorp_secret_id & String & Global \\
\hline keyring_hashicorp_server_url & String & Global \\
\hline keyring_hashicorp_store_path & String & Global \\
\hline keyring_okv_conf_dir & Directory name & Global \\
\hline keyring_operations & Boolean & Global \\
\hline last_insert_id & Integer & Session \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|}
\hline Variable Name & Variable Type & Variable Scope \\
\hline Ic_messages & String & Both \\
\hline Ic_time_names & String & Both \\
\hline local_infile & Boolean & Global \\
\hline lock_wait_timeout & Integer & Both \\
\hline log_bin_trust_function_creators & Boolean & Global \\
\hline log_error_services & String & Global \\
\hline log_error_suppression_list & String & Global \\
\hline log_error_verbosity & Integer & Global \\
\hline log_output & Set & Global \\
\hline log_queries_not_using_indexes & Boolean & Global \\
\hline log_raw & Boolean & Global \\
\hline log_slow_admin_statements & Boolean & Global \\
\hline log_slow_extra & Boolean & Global \\
\hline log_slow_replica_statements & Boolean & Global \\
\hline log_slow_slave_statements & Boolean & Global \\
\hline log_statements_unsafe_for_binlog & Boolean & Global \\
\hline log_throttle_queries_not_using_in & deteger & Global \\
\hline log_timestamps & Enumeration & Global \\
\hline long_query_time & Numeric & Both \\
\hline low_priority_updates & Boolean & Both \\
\hline mandatory_roles & String & Global \\
\hline master_verify_checksum & Boolean & Global \\
\hline max_allowed_packet & Integer & Both \\
\hline max_binlog_cache_size & Integer & Global \\
\hline max_binlog_size & Integer & Global \\
\hline max_binlog_stmt_cache_size & Integer & Global \\
\hline max_connect_errors & Integer & Global \\
\hline max_connections & Integer & Global \\
\hline max_delayed_threads & Integer & Both \\
\hline max_error_count & Integer & Both \\
\hline max_execution_time & Integer & Both \\
\hline max_heap_table_size & Integer & Both \\
\hline max_insert_delayed_threads & Integer & Both \\
\hline max_join_size & Integer & Both \\
\hline max_length_for_sort_data & Integer & Both \\
\hline max_points_in_geometry & Integer & Both \\
\hline max_prepared_stmt_count & Integer & Global \\
\hline max_relay_log_size & Integer & Global \\
\hline max_seeks_for_key & Integer & Both \\
\hline max_sort_length & Integer & Both \\
\hline max_sp_recursion_depth & Integer & Both \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|}
\hline Variable Name & Variable Type & Variable Scope \\
\hline max_user_connections & Integer & Both \\
\hline max_write_lock_count & Integer & Global \\
\hline min_examined_row_limit & Integer & Both \\
\hline myisam_data_pointer_size & Integer & Global \\
\hline myisam_max_sort_file_size & Integer & Global \\
\hline myisam_sort_buffer_size & Integer & Both \\
\hline myisam_stats_method & Enumeration & Both \\
\hline myisam_use_mmap & Boolean & Global \\
\hline mysql_firewall_mode & Boolean & Global \\
\hline mysql_firewall_trace & Boolean & Global \\
\hline mysql_native_password_proxy_us & Broolean & Global \\
\hline mysqlx_compression_algorithms & Set & Global \\
\hline mysqlx_connect_timeout & Integer & Global \\
\hline mysqlx_deflate_default_compress & ibriedearel & Global \\
\hline mysqlx_deflate_max_client_comp & resegor_level & Global \\
\hline mysqlx_document_id_unique_pref & Integer & Global \\
\hline mysqlx_enable_hello_notice & Boolean & Global \\
\hline mysqlx_idle_worker_thread_timeo & unteger & Global \\
\hline mysqlx_interactive_timeout & Integer & Global \\
\hline mysqlx_Iz4_default_compression & letedger & Global \\
\hline mysqlx_lz4_max_client_compress & ilontegrevel & Global \\
\hline mysqlx_max_allowed_packet & Integer & Global \\
\hline mysqlx_max_connections & Integer & Global \\
\hline mysqlx_min_worker_threads & Integer & Global \\
\hline mysqlx_read_timeout & Integer & Session \\
\hline mysqlx_wait_timeout & Integer & Session \\
\hline mysqlx_write_timeout & Integer & Session \\
\hline mysqlx_zstd_default_compression & Inteagetr & Global \\
\hline mysqlx_zstd_max_client_compres & sindegervel & Global \\
\hline ndb_allow_copying_alter_table & Boolean & Both \\
\hline ndb_autoincrement_prefetch_sz & Integer & Both \\
\hline ndb_batch_size & Integer & Both \\
\hline ndb_blob_read_batch_bytes & Integer & Both \\
\hline ndb_blob_write_batch_bytes & Integer & Both \\
\hline ndb_clear_apply_status & Boolean & Global \\
\hline ndb_conflict_role & Enumeration & Global \\
\hline ndb_data_node_neighbour & Integer & Global \\
\hline ndb_dbg_check_shares & Integer & Both \\
\hline ndb_default_column_format & Enumeration & Global \\
\hline ndb_default_column_format & Enumeration & Global \\
\hline ndb_deferred_constraints & Integer & Both \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|}
\hline Variable Name & Variable Type & Variable Scope \\
\hline ndb_deferred_constraints & Integer & Both \\
\hline ndb_distribution & Enumeration & Global \\
\hline ndb_distribution & Enumeration & Global \\
\hline ndb_eventbuffer_free_percent & Integer & Global \\
\hline ndb_eventbuffer_max_alloc & Integer & Global \\
\hline ndb_extra_logging & Integer & Global \\
\hline ndb_force_send & Boolean & Both \\
\hline ndb_fully_replicated & Boolean & Both \\
\hline ndb_index_stat_enable & Boolean & Both \\
\hline ndb_index_stat_option & String & Both \\
\hline ndb_join_pushdown & Boolean & Both \\
\hline ndb_log_binlog_index & Boolean & Global \\
\hline ndb_log_cache_size & Integer & Global \\
\hline ndb_log_empty_epochs & Boolean & Global \\
\hline ndb_log_empty_epochs & Boolean & Global \\
\hline ndb_log_empty_update & Boolean & Global \\
\hline ndb_log_empty_update & Boolean & Global \\
\hline ndb_log_exclusive_reads & Boolean & Both \\
\hline ndb_log_exclusive_reads & Boolean & Both \\
\hline ndb_log_transaction_compression & Boolean & Global \\
\hline ndb_log_transaction_compression & Integerzstd & Global \\
\hline ndb_log_update_as_write & Boolean & Global \\
\hline ndb_log_update_minimal & Boolean & Global \\
\hline ndb_log_updated_only & Boolean & Global \\
\hline ndb_metadata_check & Boolean & Global \\
\hline ndb_metadata_check_interval & Integer & Global \\
\hline ndb_metadata_sync & Boolean & Global \\
\hline ndb_optimization_delay & Integer & Global \\
\hline ndb_optimized_node_selection & Integer & Global \\
\hline ndb_read_backup & Boolean & Global \\
\hline ndb_recv_thread_activation_thres & Horoteger & Global \\
\hline ndb_recv_thread_cpu_mask & Bitmap & Global \\
\hline ndb_replica_batch_size & Integer & Global \\
\hline ndb_replica_blob_write_batch_by & wsteger & Global \\
\hline ndb_report_thresh_binlog_epoch & shitæger & Global \\
\hline ndb_report_thresh_binlog_mem_ $\psi$ & Libagger & Global \\
\hline ndb_row_checksum & Integer & Both \\
\hline ndb_schema_dist_lock_wait_time & dnteger & Global \\
\hline ndb_show_foreign_key_mock_tab & Brolean & Global \\
\hline ndb_slave_conflict_role & Enumeration & Global \\
\hline ndb_table_no_logging & Boolean & Session \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|}
\hline Variable Name & Variable Type & Variable Scope \\
\hline ndb_table_temporary & Boolean & Session \\
\hline ndb_use_exact_count & Boolean & Both \\
\hline ndb_use_transactions & Boolean & Both \\
\hline ndbinfo_max_bytes & Integer & Both \\
\hline ndbinfo_max_rows & Integer & Both \\
\hline ndbinfo_offline & Boolean & Global \\
\hline ndbinfo_show_hidden & Boolean & Both \\
\hline net_buffer_length & Integer & Both \\
\hline net_read_timeout & Integer & Both \\
\hline net_retry_count & Integer & Both \\
\hline net_write_timeout & Integer & Both \\
\hline offline_mode & Boolean & Global \\
\hline old_alter_table & Boolean & Both \\
\hline optimizer_prune_level & Integer & Both \\
\hline optimizer_search_depth & Integer & Both \\
\hline optimizer_switch & Set & Both \\
\hline optimizer_trace & String & Both \\
\hline optimizer_trace_features & String & Both \\
\hline optimizer_trace_limit & Integer & Both \\
\hline optimizer_trace_max_mem_size & Integer & Both \\
\hline optimizer_trace_offset & Integer & Both \\
\hline original_commit_timestamp & Numeric & Session \\
\hline original_server_version & Integer & Session \\
\hline parser_max_mem_size & Integer & Both \\
\hline partial_revokes & Boolean & Global \\
\hline password_history & Integer & Global \\
\hline password_require_current & Boolean & Global \\
\hline password_reuse_interval & Integer & Global \\
\hline performance_schema_max_diges & thsegeple_age & Global \\
\hline performance_schema_show_proc & Brodikan & Global \\
\hline preload_buffer_size & Integer & Both \\
\hline print_identified_with_as_hex & Boolean & Both \\
\hline profiling & Boolean & Both \\
\hline profiling_history_size & Integer & Both \\
\hline protocol_compression_algorithms & Set & Global \\
\hline pseudo_replica_mode & Boolean & Session \\
\hline pseudo_slave_mode & Boolean & Session \\
\hline pseudo_thread_id & Integer & Session \\
\hline query_alloc_block_size & Integer & Both \\
\hline query_prealloc_size & Integer & Both \\
\hline rand_seed1 & Integer & Session \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|}
\hline Variable Name & Variable Type & Variable Scope \\
\hline rand_seed2 & Integer & Session \\
\hline range_alloc_block_size & Integer & Both \\
\hline range_optimizer_max_mem_size & Integer & Both \\
\hline rbr_exec_mode & Enumeration & Session \\
\hline read_buffer_size & Integer & Both \\
\hline read_only & Boolean & Global \\
\hline read_rnd_buffer_size & Integer & Both \\
\hline regexp_stack_limit & Integer & Global \\
\hline regexp_time_limit & Integer & Global \\
\hline relay_log_purge & Boolean & Global \\
\hline replica_allow_batching & Boolean & Global \\
\hline replica_checkpoint_group & Integer & Global \\
\hline replica_checkpoint_period & Integer & Global \\
\hline replica_compressed_protocol & Boolean & Global \\
\hline replica_exec_mode & Enumeration & Global \\
\hline replica_max_allowed_packet & Integer & Global \\
\hline replica_net_timeout & Integer & Global \\
\hline replica_parallel_type & Enumeration & Global \\
\hline replica_parallel_workers & Integer & Global \\
\hline replica_pending_jobs_size_max & Integer & Global \\
\hline replica_preserve_commit_order & Boolean & Global \\
\hline replica_sql_verify_checksum & Boolean & Global \\
\hline replica_transaction_retries & Integer & Global \\
\hline replica_type_conversions & Set & Global \\
\hline replication_optimize_for_static_pl & Biopleanfig & Global \\
\hline replication_sender_observe_comm & Brodelen & Global \\
\hline require_row_format & Boolean & Session \\
\hline require_secure_transport & Boolean & Global \\
\hline restrict_fk_on_non_standard_key & Boolean & Both \\
\hline resultset_metadata & Enumeration & Session \\
\hline rewriter_enabled & Boolean & Global \\
\hline rewriter_enabled_for_threads_wit & Badleainilege_checks & Global \\
\hline rewriter_verbose & Integer & Global \\
\hline rpl_read_size & Integer & Global \\
\hline rpl_semi_sync_master_enabled & Boolean & Global \\
\hline rpl_semi_sync_master_timeout & Integer & Global \\
\hline rpl_semi_sync_master_trace_leve & Integer & Global \\
\hline rpl_semi_sync_master_wait_for_s & Hantegeount & Global \\
\hline rpl_semi_sync_master_wait_no_s & IBrolean & Global \\
\hline rpl_semi_sync_master_wait_point & Enumeration & Global \\
\hline rpl_semi_sync_replica_enabled & Boolean & Global \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|}
\hline Variable Name & Variable Type & Variable Scope \\
\hline \multicolumn{2}{|l|}{rpl_semi_sync_replica_trace_levellnteger} & Global \\
\hline rpl_semi_sync_slave_enabled & Boolean & Global \\
\hline rpl_semi_sync_slave_trace_level & Integer & Global \\
\hline rpl_semi_sync_source_enabled & Boolean & Global \\
\hline rpl_semi_sync_source_timeout & Integer & Global \\
\hline \multicolumn{2}{|l|}{rpl_semi_sync_source_trace_levellnteger} & Global \\
\hline \multicolumn{2}{|l|}{rpl_semi_sync_source_wait_for_repliegecount} & Global \\
\hline \multicolumn{2}{|l|}{rpl_semi_sync_source_wait_no_reĐbodæan} & Global \\
\hline rpl_semi_sync_source_wait_point & Enumeration & Global \\
\hline rpl_stop_replica_timeout & Integer & Global \\
\hline rpl_stop_slave_timeout & Integer & Global \\
\hline schema_definition_cache & Integer & Global \\
\hline secondary_engine_cost_threshold & Numeric & Session \\
\hline select_into_buffer_size & Integer & Both \\
\hline select_into_disk_sync & Boolean & Both \\
\hline select_into_disk_sync_delay & Integer & Both \\
\hline server_id & Integer & Global \\
\hline session_track_gtids & Enumeration & Both \\
\hline session_track_schema & Boolean & Both \\
\hline session_track_state_change & Boolean & Both \\
\hline session_track_system_variables & String & Both \\
\hline session_track_transaction_info & Enumeration & Both \\
\hline set_operations_buffer_size & Integer & Both \\
\hline sha256_password_proxy_users & Boolean & Global \\
\hline show_create_table_skip_seconda & Roelægine & Session \\
\hline show_create_table_verbosity & Boolean & Both \\
\hline show_gipk_in_create_table_and_ & rfodreation_schema & Both \\
\hline slave_allow_batching & Boolean & Global \\
\hline slave_checkpoint_group & Integer & Global \\
\hline slave_checkpoint_period & Integer & Global \\
\hline slave_compressed_protocol & Boolean & Global \\
\hline slave_exec_mode & Enumeration & Global \\
\hline slave_max_allowed_packet & Integer & Global \\
\hline slave_net_timeout & Integer & Global \\
\hline slave_parallel_type & Enumeration & Global \\
\hline slave_parallel_workers & Integer & Global \\
\hline slave_pending_jobs_size_max & Integer & Global \\
\hline slave_preserve_commit_order & Boolean & Global \\
\hline slave_sql_verify_checksum & Boolean & Global \\
\hline slave_transaction_retries & Integer & Global \\
\hline slave_type_conversions & Set & Global \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|}
\hline Variable Name & Variable Type & Variable Scope \\
\hline slow_launch_time & Integer & Global \\
\hline slow_query_log & Boolean & Global \\
\hline slow_query_log_file & File name & Global \\
\hline sort_buffer_size & Integer & Both \\
\hline source_verify_checksum & Boolean & Global \\
\hline sql_auto_is_null & Boolean & Both \\
\hline sql_big_selects & Boolean & Both \\
\hline sql_buffer_result & Boolean & Both \\
\hline sql_generate_invisible_primary_k & goolean & Both \\
\hline sql_log_bin & Boolean & Session \\
\hline sql_log_off & Boolean & Both \\
\hline sql_mode & Set & Both \\
\hline sql_notes & Boolean & Both \\
\hline sql_quote_show_create & Boolean & Both \\
\hline sql_replica_skip_counter & Integer & Global \\
\hline sql_require_primary_key & Boolean & Both \\
\hline sql_safe_updates & Boolean & Both \\
\hline sql_select_limit & Integer & Both \\
\hline sql_slave_skip_counter & Integer & Global \\
\hline sql_warnings & Boolean & Both \\
\hline ssl_ca & File name & Global \\
\hline ssl_capath & Directory name & Global \\
\hline ssl_cert & File name & Global \\
\hline ssl_cipher & String & Global \\
\hline ssl_crl & File name & Global \\
\hline ssl_crlpath & Directory name & Global \\
\hline ssl_key & File name & Global \\
\hline ssl_session_cache_mode & Boolean & Global \\
\hline ssl_session_cache_timeout & Integer & Global \\
\hline stored_program_cache & Integer & Global \\
\hline stored_program_definition_cache & Integer & Global \\
\hline super_read_only & Boolean & Global \\
\hline sync_binlog & Integer & Global \\
\hline sync_master_info & Integer & Global \\
\hline sync_relay_log & Integer & Global \\
\hline sync_relay_log_info & Integer & Global \\
\hline sync_source_info & Integer & Global \\
\hline syseventlog.facility & String & Global \\
\hline syseventlog.include_pid & Boolean & Global \\
\hline syseventlog.tag & String & Global \\
\hline table_definition_cache & Integer & Global \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|}
\hline Variable Name & Variable Type & Variable Scope \\
\hline table_encryption_privilege_check & Boolean & Global \\
\hline table_open_cache & Integer & Global \\
\hline tablespace_definition_cache & Integer & Global \\
\hline telemetry.otel_log_level & Enumeration & Global \\
\hline telemetry.query_text_enabled & Boolean & Global \\
\hline telemetry.trace_enabled & Boolean & Global \\
\hline temptable_max_mmap & Integer & Global \\
\hline temptable_max_ram & Integer & Global \\
\hline temptable_use_mmap & Boolean & Global \\
\hline terminology_use_previous & Enumeration & Both \\
\hline thread_cache_size & Integer & Global \\
\hline thread_pool_high_priority_connec & típteger & Both \\
\hline thread_pool_longrun_trx_limit & Integer & Global \\
\hline thread_pool_max_active_query_t & hinetager & Global \\
\hline thread_pool_max_transactions_lim & dinteger & Global \\
\hline thread_pool_max_unused_threads & snteger & Global \\
\hline thread_pool_prio_kickup_timer & Integer & Global \\
\hline thread_pool_query_threads_per_g & ghateger & Global \\
\hline thread_pool_stall_limit & Integer & Global \\
\hline thread_pool_transaction_delay & Integer & Global \\
\hline time_zone & String & Both \\
\hline timestamp & Numeric & Session \\
\hline tls_ciphersuites & String & Global \\
\hline tls_version & String & Global \\
\hline tmp_table_size & Integer & Both \\
\hline transaction_alloc_block_size & Integer & Both \\
\hline transaction_allow_batching & Boolean & Session \\
\hline transaction_isolation & Enumeration & Both \\
\hline transaction_prealloc_size & Integer & Both \\
\hline transaction_read_only & Boolean & Both \\
\hline unique_checks & Boolean & Both \\
\hline updatable_views_with_limit & Boolean & Both \\
\hline use_secondary_engine & Enumeration & Session \\
\hline validate_password_check_user_n & Broelean & Global \\
\hline validate_password_dictionary_file & File name & Global \\
\hline validate_password_length & Integer & Global \\
\hline validate_password_mixed_case_ & contager & Global \\
\hline validate_password_number_count & Integer & Global \\
\hline validate_password_policy & Enumeration & Global \\
\hline validate_password_special_char_ & doteger & Global \\
\hline validate_password.changed_chara & alttergepercentage & Global \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|}
\hline Variable Name & Variable Type & Variable Scope \\
\hline validate_password.check_user_n & Bwolean & Global \\
\hline validate_password.dictionary_file & File name & Global \\
\hline validate_password.length & Integer & Global \\
\hline validate_password.mixed_case_c & duttger & Global \\
\hline validate_password.number_count & Integer & Global \\
\hline validate_password.policy & Enumeration & Global \\
\hline validate_password.special_char_¢ & ¢mutager & Global \\
\hline version_tokens_session & String & Both \\
\hline wait_timeout & Integer & Both \\
\hline windowing_use_high_precision & Boolean & Both \\
\hline xa_detach_on_prepare & Boolean & Both \\
\hline
\end{tabular}

\subsection*{7.1.9.3 Persisted System Variables}

The MySQL server maintains system variables that configure its operation. A system variable can have a global value that affects server operation as a whole, a session value that affects the current session, or both. Many system variables are dynamic and can be changed at runtime using the SET statement to affect operation of the current server instance. SET can also be used to persist certain global system variables to the mysqld-auto.cnf file in the data directory, to affect server operation for subsequent startups. RESET PERSIST removes persisted settings from mysqld-auto.cnf.

The following discussion describes aspects of persisting system variables:
- Overview of Persisted System Variables
- Syntax for Persisting System Variables
- Obtaining Information About Persisted System Variables
- Format and Server Handling of the mysqld-auto.cnf File
- Persisting Sensitive System Variables

\section*{Overview of Persisted System Variables}

The capability of persisting global system variables at runtime enables server configuration that persists across server startups. Although many system variables can be set at startup from a my.cnf option file, or at runtime using the SET statement, those methods of configuring the server either require login access to the server host, or do not provide the capability of persistently configuring the server at runtime or remotely:
- Modifying an option file requires direct access to that file, which requires login access to the MySQL server host. This is not always convenient.
- Modifying system variables with SET GLOBAL is a runtime capability that can be done from clients run locally or from remote hosts, but the changes affect only the currently running server instance. The settings are not persistent and do not carry over to subsequent server startups.

To augment administrative capabilities for server configuration beyond what is achievable by editing option files or using SET GLOBAL, MySQL provides variants of SET syntax that persist system variable settings to a file named mysqld-auto.cnf file in the data directory. Examples:
```
SET PERSIST max_connections = 1000;
SET @@PERSIST.max_connections = 1000;
SET PERSIST_ONLY back_log = 100;
SET @@PERSIST_ONLY.back_log = 100;
```


MySQL also provides a RESET PERSIST statement for removing persisted system variables from mysqld-auto.cnf.

Server configuration performed by persisting system variables has these characteristics:
- Persisted settings are made at runtime.
- Persisted settings are permanent. They apply across server restarts.
- Persisted settings can be made from local clients or clients who connect from a remote host. This provides the convenience of remotely configuring multiple MySQL servers from a central client host.
- To persist system variables, you need not have login access to the MySQL server host or file system access to option files. Ability to persist settings is controlled using the MySQL privilege system. See Section 7.1.9.1, "System Variable Privileges".
- An administrator with sufficient privileges can reconfigure a server by persisting system variables, then cause the server to use the changed settings immediately by executing a RESTART statement.
- Persisted settings provide immediate feedback about errors. An error in a manually entered setting might not be discovered until much later. SET statements that persist system variables avoid the possibility of malformed settings because settings with syntax errors do not succeed and do not change server configuration.

\section*{Syntax for Persisting System Variables}

These SET syntax options are available for persisting system variables:
- To persist a global system variable to the mysqld-auto . cnf option file in the data directory, precede the variable name by the PERSIST keyword or the @@PERSIST . qualifier:
```
SET PERSIST max_connections = 1000;
SET @@PERSIST.max_connections = 1000;
```


Like SET GLOBAL, SET PERSIST sets the global variable runtime value, but also writes the variable setting to the mysqld-auto.cnf file (replacing any existing variable setting if there is one).
- To persist a global system variable to the mysqld-auto.cnf file without setting the global variable runtime value, precede the variable name by the PERSIST_ONLY keyword or the @@PERSIST_ONLY. qualifier:
```
SET PERSIST_ONLY back_log = 1000;
SET @@PERSIST_ONLY.back_log = 1000;
```


Like PERSIST, PERSIST_ONLY writes the variable setting to mysqld-auto.cnf. However, unlike PERSIST, PERSIST_ONLY does not modify the global variable runtime value. This makes PERSIST_ONLY suitable for configuring read-only system variables that can be set only at server startup.

For more information about SET, see Section 15.7.6.1, "SET Syntax for Variable Assignment".
These RESET PERSIST syntax options are available for removing persisted system variables:
- To remove all persisted variables from mysqld-auto.cnf, use RESET PERSIST without naming any system variable:
```
RESET PERSIST;
```

- To remove a specific persisted variable from mysqld-auto.cnf, name it in the statement:
```
RESET PERSIST system_var_name;
```


This includes plugin system variables, even if the plugin is not currently installed. If the variable is not present in the file, an error occurs.
- To remove a specific persisted variable from mysqld-auto.cnf, but produce a warning rather than an error if the variable is not present in the file, add an IF EXISTS clause to the previous syntax:
```
RESET PERSIST IF EXISTS system_var_name;
```


For more information about RESET PERSIST, see Section 15.7.8.7, "RESET PERSIST Statement".
Using SET to persist a global system variable to a value of DEFAULT or to its literal default value assigns the variable its default value and adds a setting for the variable to mysqld-auto . cnf. To remove the variable from the file, use RESET PERSIST.

Some system variables cannot be persisted. See Section 7.1.9.4, "Nonpersistible and PersistRestricted System Variables".

A system variable implemented by a plugin can be persisted if the plugin is installed when the SET statement is executed. Assignment of the persisted plugin variable takes effect for subsequent server restarts if the plugin is still installed. If the plugin is no longer installed, the plugin variable does not exist when the server reads the mysqld-auto.cnf file. In this case, the server writes a warning to the error log and continues:
```
currently unknown variable 'var_name'
was read from the persisted config file
```


\section*{Obtaining Information About Persisted System Variables}

The Performance Schema persisted_variables table provides an SQL interface to the mysqldauto.cnf file, enabling its contents to be inspected at runtime using SELECT statements. See Section 29.12.14.1, "Performance Schema persisted_variables Table".

The Performance Schema variables_info table contains information showing when and by which user each system variable was most recently set. See Section 29.12.14.2, "Performance Schema variables_info Table".

RESET PERSIST affects the contents of the persisted_variables table because the table contents correspond to the contents of the mysqld-auto.cnf file. On the other hand, because RESET PERSIST does not change variable values, it has no effect on the contents of the variables_info table until the server is restarted.

\section*{Format and Server Handling of the mysqld-auto.cnf File}

The mysqld-auto.cnf file uses a JSON format like this (reformatted slightly for readability):
```
{
    "Version": 1,
    "mysql_server": {
        "max_connections": {
            "Value": "152",
            "Metadata": {
                "Timestamp": 1519921341372531,
                "User": "root",
                "Host": "localhost"
            }
        },
        "transaction_isolation": {
            "Value": "READ-COMMITTED",
            "Metadata": {
                "Timestamp": 1519921553880520,
                "User": "root",
                "Host": "localhost"
            }
        },
        "mysql_server_static_options": {
            "innodb_api_enable_mdl": {
                "Value": "0",
                "Metadata": {
                    "Timestamp": 1519922873467872,
                    "User": "root",
```

```
                    "Host": "localhost"
                }
            },
            "log_replica_updates": {
                "Value": "1",
                "Metadata": {
                    "Timestamp": 1519925628441588,
                    "User": "root",
                    "Host": "localhost"
                }
            }
        }
    }
}
```


At startup, the server processes the mysqld-auto.cnf file after all other option files (see Section 6.2.2.2, "Using Option Files"). The server handles the file contents as follows:
- If the persisted_globals_load system variable is disabled, the server ignores the mysqldauto.cnf file.
- The "mysql_server_static_options" section contains read-only variables persisted using SET PERSIST_ONLY. The section may also (despite its name) contain certain dynamic variables that are not read only. All variables present inside this section are appended to the command line and processed with other command-line options.
- All remaining persisted variables are set by executing the equivalent of a SET GLOBAL statement later, just before the server starts listening for client connections. These settings therefore do not take effect until late in the startup process, which might be unsuitable for certain system variables. It may be preferable to set such variables in my.cnf rather than in mysqld-auto.cnf.

Management of the mysqld-auto.cnf file should be left to the server. Manipulation of the file should be performed only using SET and RESET PERSIST statements, not manually:
- Removal of the file results in a loss of all persisted settings at the next server startup. (This is permissible if your intent is to reconfigure the server without these settings.) To remove all settings in the file without removing the file itself, use this statement:

\section*{RESET PERSIST;}
- Manual changes to the file may result in a parse error at server startup. In this case, the server reports an error and exits. If this issue occurs, start the server with the persisted_globals_load system variable disabled or with the - - no-defaults option. Alternatively, remove the mysqldauto.cnf file. However, as noted previously, removing this file results in a loss of all persisted settings.

