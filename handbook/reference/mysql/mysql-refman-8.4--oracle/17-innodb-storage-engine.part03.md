\section*{InnoDB System Variables}
- innodb_adaptive_flushing

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-adaptive-flushing[=\{OFF| ON\}] \\
\hline System Variable & innodb_adaptive_flushing \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & ON \\
\hline
\end{tabular}

Specifies whether to dynamically adjust the rate of flushing dirty pages in the InnoDB buffer pool based on the workload. Adjusting the flush rate dynamically is intended to avoid bursts of I/O activity. This setting is enabled by default. See Section 17.8.3.5, "Configuring Buffer Pool Flushing" for more information. For general I/O tuning advice, see Section 10.5.8, "Optimizing InnoDB Disk I/O".
- innodb_adaptive_flushing_lwm

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-adaptive-flushing-lwm=\# \\
\hline System Variable & innodb_adaptive_flushing_lwm \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 10 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 70 \\
\hline
\end{tabular}

Defines the low water mark representing percentage of redo log capacity at which adaptive flushing is enabled. For more information, see Section 17.8.3.5, "Configuring Buffer Pool Flushing".
- innodb_adaptive_hash_index

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-adaptive-hash-index[=\{OFF| ON\}] \\
\hline System Variable & innodb_adaptive_hash_index \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & 0FF \\
\hline
\end{tabular}

Whether the InnoDB adaptive hash index is enabled or disabled. It may be desirable, depending on your workload, to dynamically enable or disable adaptive hash indexing to improve query performance. Because the adaptive hash index may not be useful for all workloads, conduct benchmarks with it both enabled and disabled, using realistic workloads. See Section 17.5.3, "Adaptive Hash Index" for details.

This variable is disabled by default. You can modify this parameter using the SET GLOBAL statement, without restarting the server. Changing the setting at runtime requires privileges sufficient to set global system variables. See Section 7.1.9.1, "System Variable Privileges". You can also use --innodb-adaptive-hash-index at server startup to enable it.

Disabling the adaptive hash index empties the hash table immediately. Normal operations can continue while the hash table is emptied, and executing queries that were using the hash table access the index B-trees directly instead. When the adaptive hash index is re-enabled, the hash table is populated again during normal operation.

Before MySQL 8.4, this option was enabled by default.
- innodb_adaptive_hash_index_parts

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-adaptive-hash-index-parts=\# \\
\hline System Variable & innodb_adaptive_hash_index_parts \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Numeric \\
\hline Default Value & 8 \\
\hline Minimum Value & 1 \\
\hline Maximum Value & 512 \\
\hline
\end{tabular}

Partitions the adaptive hash index search system. Each index is bound to a specific partition, with each partition protected by a separate latch.

The adaptive hash index search system is partitioned into 8 parts by default. The maximum setting is 512.

For related information, see Section 17.5.3, "Adaptive Hash Index".
- innodb_adaptive_max_sleep_delay

\begin{tabular}{l|l|l|}
\cline { 2 - 3 } & Command-Line Format & --innodb-adaptive-max-sleep-delay=\# \\
\hline & System Variable & innodb_adaptive_max_sleep_delay 3161 \\
\cline { 2 - 3 } &
\end{tabular}

\begin{tabular}{|l|l|}
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 150000 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 1000000 \\
\hline Unit & microseconds \\
\hline
\end{tabular}

Permits InnoDB to automatically adjust the value of innodb_thread_sleep_delay up or down according to the current workload. Any nonzero value enables automated, dynamic adjustment of the innodb_thread_sleep_delay value, up to the maximum value specified in the innodb_adaptive_max_sleep_delay option. The value represents the number of microseconds. This option can be useful in busy systems, with greater than 16 InnoDB threads. (In practice, it is most valuable for MySQL systems with hundreds or thousands of simultaneous connections.)

For more information, see Section 17.8.4, "Configuring Thread Concurrency for InnoDB".
- innodb_autoextend_increment

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-autoextend-increment=\# \\
\hline System Variable & innodb_autoextend_increment \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 64 \\
\hline Minimum Value & 1 \\
\hline Maximum Value & 1000 \\
\hline Unit & megabytes \\
\hline
\end{tabular}

The increment size (in megabytes) for extending the size of an auto-extending InnoDB system tablespace file when it becomes full. The default value is 64 . For related information, see System Tablespace Data File Configuration, and Resizing the System Tablespace.

The innodb_autoextend_increment setting does not affect file-per-table tablespace files or general tablespace files. These files are auto-extending regardless of the innodb_autoextend_increment setting. The initial extensions are by small amounts, after which extensions occur in increments of 4 MB .
- innodb_autoinc_lock_mode

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-autoinc-lock-mode=\# \\
\hline System Variable & innodb_autoinc_lock_mode \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 2 \\
\hline Valid Values & 0 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline & 1 \\
2 \\
\hline
\end{tabular}

The lock mode to use for generating auto-increment values. Permissible values are 0,1 , or 2 , for traditional, consecutive, or interleaved, respectively.

The default setting is 2 (interleaved), for compatibility with row-based replication.
For the characteristics of each lock mode, see InnoDB AUTO_INCREMENT Lock Modes.
- innodb_background_drop_list_empty

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-background-drop-listempty[=\{OFF|ON\}] \\
\hline System Variable & innodb_background_drop_list_empty \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

Enabling the innodb_background_drop_list_empty debug option helps avoid test case failures by delaying table creation until the background drop list is empty. For example, if test case A places table t1 on the background drop list, test case B waits until the background drop list is empty before creating table t1.
- innodb_buffer_pool_chunk_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-buffer-pool-chunk-size=\# \\
\hline System Variable & innodb_buffer_pool_chunk_size \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 134217728 \\
\hline Minimum Value & 1048576 \\
\hline Maximum Value & innodb_buffer_pool_size / innodb_buffer_pool_instances \\
\hline Unit & bytes \\
\hline
\end{tabular}
innodb_buffer_pool_chunk_size defines the chunk size for InnoDB buffer pool resizing operations.

To avoid copying all buffer pool pages during resizing operations, the operation is performed in "chunks". By default, innodb_buffer_pool_chunk_size is 128 MB ( 134217728 bytes). The number of pages contained in a chunk depends on the value of innodb_page_size.
innodb_buffer_pool_chunk_size can be increased or decreased in units of 1MB (1048576 bytes).

The following conditions apply when altering the innodb_buffer_pool_chunk_size value:
- If innodb_buffer_pool_chunk_size *innodb_buffer_pool_instances is larger than the current buffer pool size when the buffer pool is initialized, innodb_buffer_pool_chunk_size is truncated to innodb_buffer_pool_size / innodb_buffer_pool_instances.
- Buffer pool size must always be equal to or a multiple of innodb_buffer_pool_chunk_size * innodb_buffer_pool_instances. If you alter innodb_buffer_pool_chunk_size, innodb_buffer_pool_size is automatically rounded to a value that is equal to or a multiple of innodb_buffer_pool_chunk_size * innodb_buffer_pool_instances. The adjustment occurs when the buffer pool is initialized.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3194.jpg?height=99&width=103&top_left_y=918&top_left_x=338)

\section*{Important}

Care should be taken when changing innodb_buffer_pool_chunk_size, as changing this value can automatically increase the size of the buffer pool. Before changing innodb_buffer_pool_chunk_size, calculate its effect on innodb_buffer_pool_size to ensure that the resulting buffer pool size is acceptable.

To avoid potential performance issues, the number of chunks (innodb_buffer_pool_size / innodb_buffer_pool_chunk_size) should not exceed 1000.

The innodb_buffer_pool_size variable is dynamic, which permits resizing the buffer pool while the server is online. However, the buffer pool size must be equal to or a multiple of innodb_buffer_pool_chunk_size * innodb_buffer_pool_instances, and changing either of those variable settings requires restarting the server.

See Section 17.8.3.1, "Configuring InnoDB Buffer Pool Size" for more information.
- innodb_buffer_pool_debug

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-buffer-pool-debug[=\{0FF| ON\}] \\
\hline System Variable & innodb_buffer_pool_debug \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

Enabling this option permits multiple buffer pool instances when the buffer pool is less than 1 GB in size, ignoring the 1 GB minimum buffer pool size constraint imposed on innodb_buffer_pool_instances. The innodb_buffer_pool_debug option is only available if debugging support is compiled in using the WITH_DEBUG CMake option.
- innodb_buffer_pool_dump_at_shutdown

\begin{tabular}{|l|l|}
\hline Command-Line Format & \begin{tabular}{l} 
- - innodb - buffer - pool - dump - at - \\
shutdown [=\{OFF|ON\}]
\end{tabular} \\
\hline System Variable & innodb_buffer_pool_dump_at_shutdown \\
\hline Scope & Global \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & ON \\
\hline
\end{tabular}

Specifies whether to record the pages cached in the InnoDB buffer pool when the MySQL server is shut down, to shorten the warmup process at the next restart. Typically used in combination with innodb_buffer_pool_load_at_startup. The innodb_buffer_pool_dump_pct option defines the percentage of most recently used buffer pool pages to dump.

Both innodb_buffer_pool_dump_at_shutdown and innodb_buffer_pool_load_at_startup are enabled by default.

For more information, see Section 17.8.3.6, "Saving and Restoring the Buffer Pool State".
- innodb_buffer_pool_dump_now

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-buffer-pool-dump-now[=\{0FF| ON\}] \\
\hline System Variable & innodb_buffer_pool_dump_now \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

Immediately makes a record of pages cached in the InnoDB buffer pool. Typically used in combination with innodb_buffer_pool_load_now.

Enabling innodb_buffer_pool_dump_now triggers the recording action but does not alter the variable setting, which always remains 0FF or 0 . To view buffer pool dump status after triggering a dump, query the Innodb_buffer_pool_dump_status variable.

Enabling innodb_buffer_pool_dump_now triggers the dump action but does not alter the variable setting, which always remains OFF or 0 . To view buffer pool dump status after triggering a dump, query the Innodb_buffer_pool_dump_status variable.

For more information, see Section 17.8.3.6, "Saving and Restoring the Buffer Pool State".
- innodb_buffer_pool_dump_pct

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-buffer-pool-dump-pct=\# \\
\hline System Variable & innodb_buffer_pool_dump_pct \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 25 \\
\hline Minimum Value & 1 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Maximum Value & 100 \\
\hline
\end{tabular}

Specifies the percentage of the most recently used pages for each buffer pool to read out and dump. The range is 1 to 100 . The default value is 25 . For example, if there are 4 buffer pools with 100 pages each, and innodb_buffer_pool_dump_pct is set to 25 , the 25 most recently used pages from each buffer pool are dumped.
- innodb_buffer_pool_filename

\begin{tabular}{|l|l|}
\hline Command-Line Format & \begin{tabular}{l}
--innodb-buffer-pool- \\
filename=file_name
\end{tabular} \\
\hline System Variable & innodb_buffer_pool_filename \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & File name \\
\hline Default Value & ib_buffer_pool \\
\hline
\end{tabular}

Specifies the name of the file that holds the list of tablespace IDs and page IDs produced by innodb_buffer_pool_dump_at_shutdown or innodb_buffer_pool_dump_now. Tablespace IDs and page IDs are saved in the following format: space, page_id. By default, the file is named ib_buffer_pool and is located in the InnoDB data directory. A non-default location must be specified relative to the data directory.

A file name can be specified at runtime, using a SET statement:
SET GLOBAL innodb_buffer_pool_filename='file_name';
You can also specify a file name at startup, in a startup string or MySQL configuration file. When specifying a file name at startup, the file must exist or InnoDB returns a startup error indicating that there is no such file or directory.

For more information, see Section 17.8.3.6, "Saving and Restoring the Buffer Pool State".
- innodb_buffer_pool_in_core_file

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-buffer-pool-in-corefile[=\{OFF|ON\}] \\
\hline System Variable & innodb_buffer_pool_in_core_file \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

Disabling (default) the innodb_buffer_pool_in_core_file variable reduces the size of core files by excluding InnoDB buffer pool pages.

To use this variable, the core_file variable must be enabled, and to disable this option the operating system must support the MADV_DONTDUMP non-POSIX extension to madvise(), which is supported in Linux 3.4 and later. For more information, see Section 17.8.3.7, "Excluding or Including Buffer Pool Pages from Core Files".

This is disabled by default on systems that support MADV_DONTDUMP, which is typically only Linux and not macOS or Windows.

Before MySQL 8.4, this option was enabled by default.
- innodb_buffer_pool_instances

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-buffer-pool-instances=\# \\
\hline System Variable & innodb_buffer_pool_instances \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & see description \\
\hline Minimum Value & 1 \\
\hline Maximum Value & 64 \\
\hline
\end{tabular}

The number of regions that the InnoDB buffer pool is divided into. For systems with buffer pools in the multi-gigabyte range, dividing the buffer pool into separate instances can improve concurrency, by reducing contention as different threads read and write to cached pages. Each page that is stored in or read from the buffer pool is assigned to one of the buffer pool instances randomly, using a hashing function. Each buffer pool instance manages its own free lists, flush lists, LRUs, and all other data structures connected to a buffer pool, and is protected by its own buffer pool mutex.

The total buffer pool size is divided among all the buffer pools. For best efficiency, specify a combination of innodb_buffer_pool_instances and innodb_buffer_pool_size so that each buffer pool instance is at least 1 GB .

If innodb_buffer_pool_size<= 1 GiB , then the default innodb_buffer_pool_instances value is 1 .

If innodb_buffer_pool_size $>1 \mathrm{GiB}$, then the default innodb_buffer_pool_instances value is the minimum value from the following two calculated hints, within a range of 1-64:
- Buffer pool hint: calculated as $1 / 2$ of (innodb_buffer_pool_size / innodb_buffer_pool_chunk_size)
- CPU hint: calculated as $1 / 4$ of available logical processors

For related information, see Section 17.8.3.1, "Configuring InnoDB Buffer Pool Size".
- innodb_buffer_pool_load_abort

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-buffer-pool-loadabort[=\{OFF|ON\}] \\
\hline System Variable & innodb_buffer_pool_load_abort \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Default Value & OFF
\end{tabular}

Interrupts the process of restoring InnoDB buffer pool contents triggered by innodb_buffer_pool_load_at_startup or innodb_buffer_pool_load_now.

Enabling innodb_buffer_pool_load_abort triggers the abort action but does not alter the variable setting, which always remains OFF or 0 . To view buffer pool load status after triggering an abort action, query the Innodb_buffer_pool_load_status variable.

For more information, see Section 17.8.3.6, "Saving and Restoring the Buffer Pool State".
- innodb_buffer_pool_load_at_startup

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-buffer-pool-load-atstartup[=\{OFF|ON\}] \\
\hline System Variable & innodb_buffer_pool_load_at_startup \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & ON \\
\hline
\end{tabular}

Specifies that, on MySQL server startup, the InnoDB buffer pool is automatically warmed up by loading the same pages it held at an earlier time. Typically used in combination with innodb_buffer_pool_dump_at_shutdown.

Both innodb_buffer_pool_dump_at_shutdown and innodb_buffer_pool_load_at_startup are enabled by default.

For more information, see Section 17.8.3.6, "Saving and Restoring the Buffer Pool State".
- innodb_buffer_pool_load_now

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-buffer-pool-load-now[=\{0FF| ON\}] \\
\hline System Variable & innodb_buffer_pool_load_now \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

Immediately warms up the InnoDB buffer pool by loading data pages without waiting for a server restart. Can be useful to bring cache memory back to a known state during benchmarking or to ready the MySQL server to resume its normal workload after running queries for reports or maintenance.

Enabling innodb_buffer_pool_load_now triggers the load action but does not alter the variable setting, which always remains OFF or 0 . To view buffer pool load progress after triggering a load, query the Innodb_buffer_pool_load_status variable.

For more information, see Section 17.8.3.6, "Saving and Restoring the Buffer Pool State".
- innodb_buffer_pool_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-buffer-pool-size=\# \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline System Variable & innodb_buffer_pool_size \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 134217728 \\
\hline Minimum Value & 5242880 \\
\hline Maximum Value (64-bit platforms) & 2**64-1 \\
\hline Maximum Value (32-bit platforms) & 2**32-1 \\
\hline Unit & bytes \\
\hline
\end{tabular}

The size in bytes of the buffer pool, the memory area where InnoDB caches table and index data. The default value is 134217728 bytes ( 128 MB ). The maximum value depends on the CPU architecture; the maximum is $4294967295\left(2^{32}-1\right)$ on 32-bit systems and 18446744073709551615 ( $2^{64}$-1) on 64-bit systems. On 32-bit systems, the CPU architecture and operating system may impose a lower practical maximum size than the stated maximum. When the size of the buffer pool is greater than 1 GB , setting innodb_buffer_pool_instances to a value greater than 1 can improve the scalability on a busy server.

A larger buffer pool requires less disk I/O to access the same table data more than once. On a dedicated database server, you might set the buffer pool size to $80 \%$ of the machine's physical memory size. Be aware of the following potential issues when configuring buffer pool size, and be prepared to scale back the size of the buffer pool if necessary.
- Competition for physical memory can cause paging in the operating system.
- InnoDB reserves additional memory for buffers and control structures, so that the total allocated space is approximately $10 \%$ greater than the specified buffer pool size.
- Address space for the buffer pool must be contiguous, which can be an issue on Windows systems with DLLs that load at specific addresses.
- The time to initialize the buffer pool is roughly proportional to its size. On instances with large buffer pools, initialization time might be significant. To reduce the initialization period, you can save the buffer pool state at server shutdown and restore it at server startup. See Section 17.8.3.6, "Saving and Restoring the Buffer Pool State".

When you increase or decrease buffer pool size, the operation is performed in chunks. Chunk size is defined by the innodb_buffer_pool_chunk_size variable, which has a default of 128 MB .

Buffer pool size must always be equal to or a multiple of innodb_buffer_pool_chunk_size * innodb_buffer_pool_instances. If you alter the buffer pool size to a value that is not equal to or a multiple of innodb_buffer_pool_chunk_size * innodb_buffer_pool_instances, buffer pool size is automatically adjusted to a value that is equal to or a multiple of innodb_buffer_pool_chunk_size * innodb_buffer_pool_instances.
innodb_buffer_pool_size can be set dynamically, which allows you to resize the buffer pool without restarting the server. The Innodb_buffer_pool_resize_status status variable reports the status of online buffer pool resizing operations. See Section 17.8.3.1, "Configuring InnoDB Buffer Pool Size" for more information.

If the server is started with --innodb-dedicated-server, the value of innodb_buffer_pool_size is set automatically if it is not explicitly defined. For more information, see Section 17.8.12, "Enabling Automatic InnoDB Configuration for a Dedicated MySQL Server".
- innodb_change_buffer_max_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-change-buffer-max-size=\# \\
\hline System Variable & innodb_change_buffer_max_size \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 25 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 50 \\
\hline
\end{tabular}

Maximum size for the InnoDB change buffer, as a percentage of the total size of the buffer pool. You might increase this value for a MySQL server with heavy insert, update, and delete activity, or decrease it for a MySQL server with unchanging data used for reporting. For more information, see Section 17.5.2, "Change Buffer". For general I/O tuning advice, see Section 10.5.8, "Optimizing InnoDB Disk I/O".
- innodb_change_buffering

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-change-buffering=value \\
\hline System Variable & innodb_change_buffering \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Enumeration \\
\hline Default Value & none \\
\hline Valid Values & \begin{tabular}{l}
none \\
inserts \\
deletes \\
changes \\
purges \\
all
\end{tabular} \\
\hline
\end{tabular}

Whether InnoDB performs change buffering, an optimization that delays write operations to secondary indexes so that the I/O operations can be performed sequentially. Permitted values are described in the following table. Values may also be specified numerically.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 17.24 Permitted Values for innodb_change_buffering}
\begin{tabular}{|l|l|l|l|}
\hline & Value & Numeric Value & Description \\
\hline & none & 0 & Default. Do not buffer any operations. \\
\hline & inserts & 1 & Buffer insert operations. \\
\hline & deletes & 2 & Buffer delete marking operations; strictly speaking, the writes that mark index records \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|l|}
\hline Value & Numeric Value & Description \\
\hline & & for later deletion during a purge operation. \\
\hline changes & 3 & Buffer inserts and deletemarking operations. \\
\hline purges & 4 & Buffer the physical deletion operations that happen in the background. \\
\hline all & 5 & Buffer inserts, delete-marking operations, and purges. \\
\hline
\end{tabular}

Before MySQL 8.4, the default value was all.
For more information, see Section 17.5.2, "Change Buffer". For general I/O tuning advice, see Section 10.5.8, "Optimizing InnoDB Disk I/O".
- innodb_change_buffering_debug

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-change-buffering-debug=\# \\
\hline System Variable & innodb_change_buffering_debug \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 2 \\
\hline
\end{tabular}

Sets a debug flag for InnoDB change buffering. A value of 1 forces all changes to the change buffer. A value of 2 causes an unexpected exit at merge. A default value of 0 indicates that the change buffering debug flag is not set. This option is only available when debugging support is compiled in using the WITH_DEBUG CMake option.
- innodb_checkpoint_disabled

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-checkpoint-disabled[=\{OFF| ON\}] \\
\hline System Variable & innodb_checkpoint_disabled \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

This is a debug option that is only intended for expert debugging use. It disables checkpoints so that a deliberate server exit always initiates InnoDB recovery. It should only be enabled for a short interval, typically before running DML operations that write redo log entries that would require recovery following a server exit. This option is only available if debugging support is compiled in using the WITH_DEBUG CMake option.
- innodb_checksum_algorithm

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-checksum-algorithm=value \\
\hline System Variable & innodb_checksum_algorithm \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Enumeration \\
\hline Default Value & crc32 \\
\hline Valid Values & \begin{tabular}{l}
crc32 \\
strict_crc32 \\
innodb \\
strict_innodb \\
none \\
strict_none
\end{tabular} \\
\hline
\end{tabular}

Specifies how to generate and verify the checksum stored in the disk blocks of InnoDB tablespaces. The default value for innodb_checksum_algorithm is crc32.

The value innodb is backward-compatible with earlier versions of MySQL. The value crc32 uses an algorithm that is faster to compute the checksum for every modified block, and to check the checksums for each disk read. It scans blocks 64 bits at a time, which is faster than the innodb checksum algorithm, which scans blocks 8 bits at a time. The value none writes a constant value in the checksum field rather than computing a value based on the block data. The blocks in a tablespace can use a mix of old, new, and no checksum values, being updated gradually as the data is modified; once blocks in a tablespace are modified to use the crc32 algorithm, the associated tables cannot be read by earlier versions of MySQL.

The strict form of a checksum algorithm reports an error if it encounters a valid but non-matching checksum value in a tablespace. It is recommended that you only use strict settings in a new instance, to set up tablespaces for the first time. Strict settings are somewhat faster, because they do not need to compute all checksum values during disk reads.

The following table shows the difference between the none, innodb, and crc32 option values, and their strict counterparts. none, innodb, and crc32 write the specified type of checksum value into each data block, but for compatibility accept other checksum values when verifying a block during a read operation. Strict settings also accept valid checksum values but print an error message when a valid non-matching checksum value is encountered. Using the strict form can make verification faster if all InnoDB data files in an instance are created under an identical innodb_checksum_algorithm value.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 17.25 Permitted innodb_checksum_algorithm Values}
\begin{tabular}{|l|l|l|}
\hline Value & Generated checksum (when writing) & Permitted checksums (when reading) \\
\hline none & A constant number. & Any of the checksums generated by none, innodb, or crc32. \\
\hline innodb & A checksum calculated in software, using the original algorithm from InnoDB. & Any of the checksums generated by none, innodb, or crc32. \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|l|}
\hline Value & Generated checksum (when writing) & Permitted checksums (when reading) \\
\hline crc32 & A checksum calculated using the crc32 algorithm, possibly done with a hardware assist. & Any of the checksums generated by none, innodb, or crc32. \\
\hline strict_none & A constant number & Any of the checksums generated by none, innodb, or crc32. InnoDB prints an error message if a valid but non-matching checksum is encountered. \\
\hline strict_innodb & A checksum calculated in software, using the original algorithm from InnoDB. & Any of the checksums generated by none, innodb, or crc32. InnoDB prints an error message if a valid but non-matching checksum is encountered. \\
\hline strict_crc32 & A checksum calculated using the crc32 algorithm, possibly done with a hardware assist. & Any of the checksums generated by none, innodb, or crc32. InnoDB prints an error message if a valid but non-matching checksum is encountered. \\
\hline
\end{tabular}
- innodb_cmp_per_index_enabled

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-cmp-per-indexenabled[=\{OFF|ON\}] \\
\hline System Variable & innodb_cmp_per_index_enabled \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

Enables per-index compression-related statistics in the Information Schema INNODB_CMP_PER_INDEX table. Because these statistics can be expensive to gather, only enable this option on development, test, or replica instances during performance tuning related to InnoDB compressed tables.

For more information, see Section 28.4.8, "The INFORMATION_SCHEMA INNODB_CMP_PER_INDEX and INNODB_CMP_PER_INDEX_RESET Tables", and Section 17.9.1.4, "Monitoring InnoDB Table Compression at Runtime".
- innodb_commit_concurrency

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-commit-concurrency=\# \\
\hline System Variable & innodb_commit_concurrency \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 1000 \\
\hline
\end{tabular}

The number of threads that can commit at the same time. A value of 0 (the default) permits any number of transactions to commit simultaneously.

The value of innodb_commit_concurrency cannot be changed at runtime from zero to nonzero or vice versa. The value can be changed from one nonzero value to another.
- innodb_compress_debug

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-compress-debug=value \\
\hline System Variable & innodb_compress_debug \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Enumeration \\
\hline Default Value & none \\
\hline Valid Values & \begin{tabular}{l}
none \\
zlib \\
lz4 \\
lz4hc
\end{tabular} \\
\hline
\end{tabular}

Compresses all tables using a specified compression algorithm without having to define a COMPRESSION attribute for each table. This option is only available if debugging support is compiled in using the WITH_DEBUG CMake option.

For related information, see Section 17.9.2, "InnoDB Page Compression".
- innodb_compression_failure_threshold_pct

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-compression-failure-threshold-pct=\# \\
\hline System Variable & innodb_compression_failure_threshold_pct \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 5 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 100 \\
\hline
\end{tabular}

Defines the compression failure rate threshold for a table, as a percentage, at which point MySQL begins adding padding within compressed pages to avoid expensive compression failures. When this threshold is passed, MySQL begins to leave additional free space within each new compressed page, dynamically adjusting the amount of free space up to the percentage of page size specified
by innodb_compression_pad_pct_max. A value of zero disables the mechanism that monitors compression efficiency and dynamically adjusts the padding amount.

For more information, see Section 17.9.1.6, "Compression for OLTP Workloads".
- innodb_compression_level

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-compression-level=\# \\
\hline System Variable & innodb_compression_level \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 6 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 9 \\
\hline
\end{tabular}

Specifies the level of zlib compression to use for InnoDB compressed tables and indexes. A higher value lets you fit more data onto a storage device, at the expense of more CPU overhead during compression. A lower value lets you reduce CPU overhead when storage space is not critical, or you expect the data is not especially compressible.

For more information, see Section 17.9.1.6, "Compression for OLTP Workloads".
- innodb_compression_pad_pct_max

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-compression-pad-pct-max=\# \\
\hline System Variable & innodb_compression_pad_pct_max \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 50 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 75 \\
\hline
\end{tabular}

Specifies the maximum percentage that can be reserved as free space within each compressed page, allowing room to reorganize the data and modification log within the page when a compressed table or index is updated and the data might be recompressed. Only applies when innodb_compression_failure_threshold_pct is set to a nonzero value, and the rate of compression failures passes the cutoff point.

For more information, see Section 17.9.1.6, "Compression for OLTP Workloads".
- innodb_concurrency_tickets

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-concurrency-tickets=\# \\
\hline System Variable & innodb_concurrency_tickets \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No 3175 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Type & Integer \\
\hline Default Value & 5000 \\
\hline Minimum Value & 1 \\
\hline Maximum Value & 4294967295 \\
\hline
\end{tabular}

Determines the number of threads that can enter InnoDB concurrently. A thread is placed in a queue when it tries to enter InnoDB if the number of threads has already reached the concurrency limit. When a thread is permitted to enter InnoDB, it is given a number of "tickets" equal to the value of innodb_concurrency_tickets, and the thread can enter and leave InnoDB freely until it has used up its tickets. After that point, the thread again becomes subject to the concurrency check (and possible queuing) the next time it tries to enter InnodB. The default value is 5000.

With a small innodb_concurrency_tickets value, small transactions that only need to process a few rows compete fairly with larger transactions that process many rows. The disadvantage of a small innodb_concurrency_tickets value is that large transactions must loop through the queue many times before they can complete, which extends the amount of time required to complete their task.

With a large innodb_concurrency_tickets value, large transactions spend less time waiting for a position at the end of the queue (controlled by innodb_thread_concurrency) and more time retrieving rows. Large transactions also require fewer trips through the queue to complete their task. The disadvantage of a large innodb_concurrency_tickets value is that too many large transactions running at the same time can starve smaller transactions by making them wait a longer time before executing.

With a nonzero innodb_thread_concurrency value, you may need to adjust the innodb_concurrency_tickets value up or down to find the optimal balance between larger and smaller transactions. The SHOW ENGINE INNODB STATUS report shows the number of tickets remaining for an executing transaction in its current pass through the queue. This data may also be obtained from the TRX_CONCURRENCY_TICKETS column of the Information Schema INNODB_TRX table.

For more information, see Section 17.8.4, "Configuring Thread Concurrency for InnoDB".
- innodb_data_file_path

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-data-file-path=file_name \\
\hline System Variable & innodb_data_file_path \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Default Value & ibdata1:12M:autoextend \\
\hline
\end{tabular}

Defines the name, size, and attributes of InnoDB system tablespace data files. If you do not specify a value for innodb_data_file_path, the default behavior is to create a single auto-extending data file, slightly larger than 12 MB , named ibdata1.

The full syntax for a data file specification includes the file name, file size, autoextend attribute, and max attribute:
file_name:file_size[:autoextend[:max:max_file_size]]
File sizes are specified in kilobytes, megabytes, or gigabytes by appending K, M or G to the size value. If specifying the data file size in kilobytes, do so in multiples of 1024. Otherwise, KB values are
rounded to nearest megabyte (MB) boundary. The sum of file sizes must be, at a minimum, slightly larger than 12 MB .

For additional configuration information, see System Tablespace Data File Configuration. For resizing instructions, see Resizing the System Tablespace.
- innodb_data_home_dir

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-data-home-dir=dir_name \\
\hline System Variable & innodb_data_home_dir \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Directory name \\
\hline
\end{tabular}

The common part of the directory path for InnoDB system tablespace data files. The default value is the MySQL data directory. The setting is concatenated with the innodb_data_file_path setting, unless that setting is defined with an absolute path.

A trailing slash is required when specifying a value for innodb_data_home_dir. For example:
```
[mysqld]
innodb_data_home_dir = /path/to/myibdata/
```


This setting does not affect the location of file-per-table tablespaces.
For related information, see Section 17.8.1, "InnoDB Startup Configuration".
- innodb_ddl_buffer_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-ddl-buffer-size=\# \\
\hline System Variable & innodb_ddl_buffer_size \\
\hline Scope & Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 1048576 \\
\hline Minimum Value & 65536 \\
\hline Maximum Value & 4294967295 \\
\hline Unit & bytes \\
\hline
\end{tabular}

Defines the maximum buffer size for DDL operations. The default setting is 1048576 bytes (approximately 1 MB ). Applies to online DDL operations that create or rebuild secondary indexes. See Section 17.12.4, "Online DDL Memory Management". The maximum buffer size per DDL thread is the maximum buffer size divided by the number of DDL threads (innodb_ddl_buffer_size/innodb_ddl_threads).
- innodb_ddl_log_crash_reset_debug

\begin{tabular}{|l|l|l|}
\hline & Command-Line Format & --innodb-ddl-log-crash-resetdebug[=\{OFF|ON\}] \\
\hline & System Variable & innodb_ddl_log_crash_reset_debug \\
\hline & Scope & Global 3177 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

Enable this debug option to reset DDL log crash injection counters to 1 . This option is only available when debugging support is compiled in using the WITH_DEBUG CMake option.
- innodb_ddl_threads

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-ddl-threads=\# \\
\hline System Variable & innodb_ddl_threads \\
\hline Scope & Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 4 \\
\hline Minimum Value & 1 \\
\hline Maximum Value & 64 \\
\hline
\end{tabular}

Defines the maximum number of parallel threads for the sort and build phases of index creation. Applies to online DDL operations that create or rebuild secondary indexes. For related information, see Section 17.12.5, "Configuring Parallel Threads for Online DDL Operations", and Section 17.12.4, "Online DDL Memory Management".
- innodb_deadlock_detect

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-deadlock-detect[=\{OFF|ON\}] \\
\hline System Variable & innodb_deadlock_detect \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & ON \\
\hline
\end{tabular}

This option is used to disable deadlock detection. On high concurrency systems, deadlock detection can cause a slowdown when numerous threads wait for the same lock. At times, it may be more efficient to disable deadlock detection and rely on the innodb_lock_wait_timeout setting for transaction rollback when a deadlock occurs.

For related information, see Section 17.7.5.2, "Deadlock Detection".
- innodb_default_row_format

\begin{tabular}{|l|l|l|}
\hline \multirow{5}{*}{} & Command-Line Format & --innodb-default-row-format=value \\
\hline & System Variable & innodb_default_row_format \\
\hline & Scope & Global \\
\hline & Dynamic & Yes \\
\hline & SET_VAR Hint Applies & No \\
\hline 3178 & Type & Enumeration \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Default Value & DYNAMIC \\
\hline Valid Values & \begin{tabular}{l}
REDUNDANT \\
COMPACT \\
DYNAMIC
\end{tabular} \\
\hline
\end{tabular}

The innodb_default_row_format option defines the default row format for InnoDB tables and user-created temporary tables. The default setting is DYNAMIC. Other permitted values are COMPACT and REDUNDANT. The COMPRESSED row format, which is not supported for use in the system tablespace, cannot be defined as the default.

Newly created tables use the row format defined by innodb_default_row_format when a ROW_FORMAT option is not specified explicitly or when ROW_FORMAT=DEFAULT is used.

When a ROW_FORMAT option is not specified explicitly or when ROW_FORMAT=DEFAULT is used, any operation that rebuilds a table also silently changes the row format of the table to the format defined by innodb_default_row_format. For more information, see Defining the Row Format of a Table.

Internal InnoDB temporary tables created by the server to process queries use the DYNAMIC row format, regardless of the innodb_default_row_format setting.
- innodb_directories

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-directories=dir_name \\
\hline System Variable & innodb_directories \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Directory name \\
\hline Default Value & NULL \\
\hline
\end{tabular}

Defines directories to scan at startup for tablespace files. This option is used when moving or restoring tablespace files to a new location while the server is offline. It is also used to specify directories of tablespace files created using an absolute path or that reside outside of the data directory.

Tablespace discovery during crash recovery relies on the innodb_directories setting to identify tablespaces referenced in the redo logs. For more information, see Tablespace Discovery During Crash Recovery.

The default value is NULL, but directories defined by innodb_data_home_dir, innodb_undo_directory, and datadir are always appended to the innodb_directories argument value when InnoDB builds a list of directories to scan at startup. These directories are appended regardless of whether an innodb_directories setting is specified explicitly.
innodb_directories may be specified as an option in a startup command or in a MySQL option file. Quotes surround the argument value because otherwise some command interpreters interpret semicolon (;) as a special character. (For example, Unix shells treat it as a command terminator.)

Startup command:
```
mysqld --innodb-directories="directory_path_1;directory_path_2"
```


MySQL option file:
innodb_directories="directory_path_1;directory_path_2"
Wildcard expressions cannot be used to specify directories.
The innodb_directories scan also traverses the subdirectories of specified directories. Duplicate directories and subdirectories are discarded from the list of directories to be scanned.

For more information, see Section 17.6.3.6, "Moving Tablespace Files While the Server is Offline".
- innodb_disable_sort_file_cache

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-disable-sort-filecache [=\{OFF|ON\}] \\
\hline System Variable & innodb_disable_sort_file_cache \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

Disables the operating system file system cache for merge-sort temporary files. The effect is to open such files with the equivalent of $0 \_$DIRECT.
- innodb_doublewrite

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-doublewrite=value \\
\hline System Variable & innodb_doublewrite \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Enumeration \\
\hline Default Value & ON \\
\hline Valid Values & \begin{tabular}{l}
ON \\
OFF \\
DETECT_AND_RECOVER \\
DETECT_ONLY
\end{tabular} \\
\hline
\end{tabular}

The innodb_doublewrite variable controls doublewrite buffering. Doublewrite buffering is enabled by default in most cases.

You can set innodb_doublewrite to ON or OFF when starting the server to enable or disable doublewrite buffering, respectively. DETECT_AND_RECOVER is the same as ON. With this setting, except that the doublewrite buffer is fully enabled, with database page content written to the doublewrite buffer where it is accessed during recovery to fix incomplete page writes. With DETECT_ONLY, only metadata is written to the doublewrite buffer. Database page content is not written to the doublewrite buffer, and recovery does not use the doublewrite buffer to fix incomplete page writes. This lightweight setting is intended for detecting incomplete page writes only.

MySQL supports dynamic changes to the innodb_doublewrite setting that enables the doublewrite buffer, between ON, DETECT_AND_RECOVER, and DETECT_ONLY. MySQL does not support dynamic changes between a setting that enables the doublewrite buffer and OFF or vice versa.

If the doublewrite buffer is located on a Fusion-io device that supports atomic writes, the doublewrite buffer is automatically disabled and data file writes are performed using Fusion-io atomic writes instead. However, be aware that the innodb_doublewrite setting is global. When the doublewrite buffer is disabled, it is disabled for all data files including those that do not reside on Fusion-io hardware. This feature is only supported on Fusion-io hardware and is only enabled for Fusionio NVMFS on Linux. To take full advantage of this feature, an innodb_flush_method setting of O_DIRECT is recommended.

For related information, see Section 17.6.4, "Doublewrite Buffer".
- innodb_doublewrite_batch_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-doublewrite-batch-size=\# \\
\hline System Variable & innodb_doublewrite_batch_size \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 256 \\
\hline
\end{tabular}

This variable was intended to represent the number of doublewrite pages to write in a batch. This functionality was replaced by innodb_doublewrite_pages.

For more information, see Section 17.6.4, "Doublewrite Buffer".
- innodb_doublewrite_dir

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-doublewrite-dir=dir_name \\
\hline System Variable & innodb_doublewrite_dir \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Directory name \\
\hline
\end{tabular}

Defines the directory for doublewrite files. If no directory is specified, doublewrite files are created in the innodb_data_home_dir directory, which defaults to the data directory if unspecified.

For more information, see Section 17.6.4, "Doublewrite Buffer".
- innodb_doublewrite_files

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-doublewrite-files=\# \\
\hline System Variable & innodb_doublewrite_files \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 2 \\
\hline Minimum Value & 1 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Maximum Value & 256 \\
\hline
\end{tabular}

Defines the number of doublewrite files. By default, two doublewrite files are created for each buffer pool instance.

At a minimum, there are two doublewrite files. The maximum number of doublewrite files is two times the number of buffer pool instances. (The number of buffer pool instances is controlled by the innodb_buffer_pool_instances variable.)

For more information, see Section 17.6.4, "Doublewrite Buffer".
- innodb_doublewrite_pages

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-doublewrite-pages=\# \\
\hline System Variable & innodb_doublewrite_pages \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 128 \\
\hline Minimum Value & 1 \\
\hline Maximum Value & 512 \\
\hline
\end{tabular}

Defines the maximum number of doublewrite pages per thread for a batch write. If no value is specified, innodb_doublewrite_pages defaults to 128.

Before MySQL 8.4, the default value was the innodb_write_io_threads value, which is 4 by default.

For more information, see Section 17.6.4, "Doublewrite Buffer".
- innodb_extend_and_initialize

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb=extend-andinitialize[=\{OFF|ON\}] \\
\hline System Variable & innodb_extend_and_initialize \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & ON \\
\hline
\end{tabular}

Controls how space is allocated to file-per-table and general tablespaces on Linux systems.
When enabled, InnoDB writes NULLs to newly allocated pages. When disabled, space is allocated using posix_fallocate( ) calls, which reserve space without physically writing NULLs.

For more information, see Section 17.6.3.8, "Optimizing Tablespace Space Allocation on Linux".
- innodb_fast_shutdown

\begin{tabular}{l|l|l|}
\cline { 2 - 3 } & Command-Line Format & --innodb-fast-shutdown=\# \\
\hline 3182 & System Variable & innodb_fast_shutdown \\
\cline { 2 - 3 } & &
\end{tabular}

\begin{tabular}{|l|l|}
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 1 \\
\hline Valid Values & \begin{tabular}{l}
0 \\
1 \\
2
\end{tabular} \\
\hline
\end{tabular}

The InnoDB shutdown mode. If the value is 0 , InnoDB does a slow shutdown, a full purge and a change buffer merge before shutting down. If the value is 1 (the default), InnoDB skips these operations at shutdown, a process known as a fast shutdown. If the value is $2, \mathrm{InnoDB}$ flushes its logs and shuts down cold, as if MySQL had crashed; no committed transactions are lost, but the crash recovery operation makes the next startup take longer.

The slow shutdown can take minutes, or even hours in extreme cases where substantial amounts of data are still buffered. Use the slow shutdown technique before upgrading or downgrading between MySQL major releases, so that all data files are fully prepared in case the upgrade process updates the file format.

Use innodb_fast_shutdown=2 in emergency or troubleshooting situations, to get the absolute fastest shutdown if data is at risk of corruption.
- innodb_fil_make_page_dirty_debug

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-fil-make-page-dirty-debug=\# \\
\hline System Variable & innodb_fil_make_page_dirty_debug \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 2**32-1 \\
\hline
\end{tabular}

By default, setting innodb_fil_make_page_dirty_debug to the ID of a tablespace immediately dirties the first page of the tablespace. If innodb_saved_page_number_debug is set to a nondefault value, setting innodb_fil_make_page_dirty_debug dirties the specified page. The innodb_fil_make_page_dirty_debug option is only available if debugging support is compiled in using the WITH_DEBUG CMake option.
- innodb_file_per_table

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-file-per-table[=\{OFF|ON\}] \\
\hline System Variable & innodb_file_per_table \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|} 
Default Value & ON
\end{tabular}

When innodb_file_per_table is enabled, tables are created in file-per-table tablespaces by default. When disabled, tables are created in the system tablespace by default. For information about file-per-table tablespaces, see Section 17.6.3.2, "File-Per-Table Tablespaces". For information about the InnoDB system tablespace, see Section 17.6.3.1, "The System Tablespace".

The innodb_file_per_table variable can be configured at runtime using a SET GLOBAL statement, specified on the command line at startup, or specified in an option file. Configuration at runtime requires privileges sufficient to set global system variables (see Section 7.1.9.1, "System Variable Privileges") and immediately affects the operation of all connections.

When a table that resides in a file-per-table tablespace is truncated or dropped, the freed space is returned to the operating system. Truncating or dropping a table that resides in the system tablespace only frees space in the system tablespace. Freed space in the system tablespace can be used again for InnoDB data but is not returned to the operating system, as system tablespace data files never shrink.

The innodb_file_per-table setting does not affect the creation of temporary tables; temporary tables are created in session temporary tablespaces. See Section 17.6.3.5, "Temporary Tablespaces".
- innodb_fill_factor

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-fill-factor=\# \\
\hline System Variable & innodb_fill_factor \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 100 \\
\hline Minimum Value & 10 \\
\hline Maximum Value & 100 \\
\hline
\end{tabular}

InnoDB performs a bulk load when creating or rebuilding indexes. This method of index creation is known as a "sorted index build".
innodb_fill_factor defines the percentage of space on each B-tree page that is filled during a sorted index build, with the remaining space reserved for future index growth. For example, setting innodb_fill_factor to 80 reserves 20 percent of the space on each B-tree page for future index growth. Actual percentages may vary. The innodb_fill_factor setting is interpreted as a hint rather than a hard limit.

An innodb_fill_factor setting of 100 leaves $1 / 16$ of the space in clustered index pages free for future index growth.
innodb_fill_factor applies to both B-tree leaf and non-leaf pages. It does not apply to external pages used for TEXT or BLOB entries.

For more information, see Section 17.6.2.3, "Sorted Index Builds".
- innodb_flush_log_at_timeout

\begin{tabular}{|l|l|}
\cline { 2 - 3 } & Command-Line Format \\
\cline { 2 - 3 } & System Variable \\
\cline { 2 - 3 } & --innodb-flush-log-at-timeout=\# \\
\hline 3184 & innodb_flush_log_at_timeout \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 1 \\
\hline Minimum Value & 1 \\
\hline Maximum Value & 2700 \\
\hline Unit & seconds \\
\hline
\end{tabular}

Write and flush the logs every $N$ seconds. innodb_flush_log_at_timeout allows the timeout period between flushes to be increased in order to reduce flushing and avoid impacting performance of binary log group commit. The default setting for innodb_flush_log_at_timeout is once per second.
- innodb_flush_log_at_trx_commit

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-flush-log-at-trx-commit=\# \\
\hline System Variable & innodb_flush_log_at_trx_commit \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Enumeration \\
\hline Default Value & 1 \\
\hline Valid Values & \begin{tabular}{l}
0 \\
1 \\
2
\end{tabular} \\
\hline
\end{tabular}

Controls the balance between strict ACID compliance for commit operations and higher performance that is possible when commit-related I/O operations are rearranged and done in batches. You can achieve better performance by changing the default value but then you can lose transactions in a crash.
- The default setting of 1 is required for full ACID compliance. Logs are written and flushed to disk at each transaction commit.
- With a setting of 0 , logs are written and flushed to disk once per second. Transactions for which logs have not been flushed can be lost in a crash.
- With a setting of 2 , logs are written after each transaction commit and flushed to disk once per second. Transactions for which logs have not been flushed can be lost in a crash.
- For settings 0 and 2 , once-per-second flushing is not $100 \%$ guaranteed. Flushing may occur more frequently due to DDL changes and other internal InnoDB activities that cause logs to be flushed independently of the innodb_flush_log_at_trx_commit setting, and sometimes less frequently due to scheduling issues. If logs are flushed once per second, up to one second of transactions can be lost in a crash. If logs are flushed more or less frequently than once per second, the amount of transactions that can be lost varies accordingly.
- Log flushing frequency is controlled by innodb_flush_log_at_timeout, which allows you to set log flushing frequency to $N$ seconds (where $N$ is $1 \ldots 2700$, with a default value of 1 ). However, any unexpected mysqld process exit can erase up to $N$ seconds of transactions.
- DDL changes and other internal InnoDB activities flush the log independently of the innodb_flush_log_at_trx_commit setting.
- InnoDB crash recovery works regardless of the innodb_flush_log_at_trx_commit setting. Transactions are either applied entirely or erased entirely.

For durability and consistency in a replication setup that uses InnoDB with transactions:
- If binary logging is enabled, set sync_binlog=1.
- Always set innodb_flush_log_at_trx_commit=1.

For information on the combination of settings on a replica that is most resilient to unexpected halts, see Section 19.4.2, "Handling an Unexpected Halt of a Replica".

\section*{Caution}

Many operating systems and some disk hardware fool the flush-to-disk operation. They may tell mysqld that the flush has taken place, even though it has not. In this case, the durability of transactions is not guaranteed even with the recommended settings, and in the worst case, a power outage can corrupt InnoDB data. Using a battery-backed disk cache in the SCSI disk controller or in the disk itself speeds up file flushes, and makes the operation safer. You can also try to disable the caching of disk writes in hardware caches.
- innodb_flush_method

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-flush-method=value \\
\hline System Variable & innodb_flush_method \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Default Value (Unix) & O_DIRECT if supported, otherwise fsync \\
\hline Default Value (Windows) & unbuffered \\
\hline Valid Values (Unix) & \begin{tabular}{l}
fsync \\
O_DSYNC \\
littlesync \\
nosync \\
O_DIRECT \\
O_DIRECT_NO_FSYNC
\end{tabular} \\
\hline Valid Values (Windows) & unbuffered \\
\hline
\end{tabular}

Defines the method used to flush data to InnoDB data files and log files, which can affect I/O throughput.

On Unix-like systems, the default value is 0_DIRECT if supported otherwise defaults to fsync. On Windows, the default value is unbuffered.

The innodb_flush_method options for Unix-like systems include:
- fsync or 0 : InnoDB uses the fsync ( ) system call to flush both the data and log files.
- O_DSYNC or 1: InnoDB uses 0_SYNC to open and flush the log files, and fsync ( ) to flush the data files. InnoDB does not use 0_DSYNC directly because there have been problems with it on many varieties of Unix.
- littlesync or 2: This option is used for internal performance testing and is currently unsupported. Use at your own risk.
- nosync or 3: This option is used for internal performance testing and is currently unsupported. Use at your own risk.
- O_DIRECT or 4: InnoDB uses 0_DIRECT (or directio( ) on Solaris) to open the data files, and uses fsync ( ) to flush both the data and log files. This option is available on some GNU/Linux versions, FreeBSD, and Solaris.
- O_DIRECT_NO_FSYNC: InnoDB uses O_DIRECT during flushing I/O, but skips the fsync ( ) system call after each write operation.

MySQL calls fsync ( ) after creating a new file, after increasing file size, and after closing a file, to ensure that file system metadata changes are synchronized. The fsync() system call is still skipped after each write operation.

Data loss is possible if redo log files and data files reside on different storage devices, and an unexpected exit occurs before data file writes are flushed from a device cache that is not batterybacked. If you use or intend to use different storage devices for redo log files and data files, and your data files reside on a device with a cache that is not battery-backed, use 0_DIRECT instead.

On platforms that support fdatasync ( ) system calls, the innodb_use_fdatasync variable permits innodb_flush_method options that use fsync() to use fdatasync() instead. An fdatasync() system call does not flush changes to file metadata unless required for subsequent data retrieval, providing a potential performance benefit.

The innodb_flush_method options for Windows systems include:
- unbuffered or 0: InnoDB uses non-buffered I/O.

\section*{Note}

Running MySQL server on a 4 K sector hard drive on Windows is not supported with unbuffered. The workaround is to use innodb_flush_method=normal.
- normal or 1: InnoDB uses buffered I/O.

How each setting affects performance depends on hardware configuration and workload. Benchmark your particular configuration to decide which setting to use, or whether to keep the default setting. Examine the Innodb_data_fsyncs status variable to see the overall number of fsync ( ) calls (or fdatasync() calls if innodb_use_fdatasync is enabled) for each setting. The mix of read and write operations in your workload can affect how a setting performs. For example, on a system with
a hardware RAID controller and battery-backed write cache, O_DIRECT can help to avoid double buffering between the InnoDB buffer pool and the operating system file system cache. On some systems where InnoDB data and log files are located on a SAN, the default value or O_DSYNC might be faster for a read-heavy workload with mostly SELECT statements. Always test this parameter with hardware and workload that reflect your production environment. For general I/O tuning advice, see Section 10.5.8, "Optimizing InnoDB Disk I/O".
- innodb_flush_neighbors

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-flush-neighbors=\# \\
\hline System Variable & innodb_flush_neighbors \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Enumeration \\
\hline Default Value & 0 \\
\hline Valid Values & \begin{tabular}{l}
0 \\
1 \\
2
\end{tabular} \\
\hline
\end{tabular}

Specifies whether flushing a page from the InnoDB buffer pool also flushes other dirty pages in the same extent.
- A setting of 0 disables innodb_flush_neighbors. Dirty pages in the same extent are not flushed.
- A setting of 1 flushes contiguous dirty pages in the same extent.
- A setting of 2 flushes dirty pages in the same extent.

When the table data is stored on a traditional HDD storage device, flushing such neighbor pages in one operation reduces I/O overhead (primarily for disk seek operations) compared to flushing individual pages at different times. For table data stored on SSD, seek time is not a significant factor and you can set this option to 0 to spread out write operations. For related information, see Section 17.8.3.5, "Configuring Buffer Pool Flushing".
- innodb_flush_sync

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-flush-sync[=\{OFF|ON\}] \\
\hline System Variable & innodb_flush_sync \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & ON \\
\hline
\end{tabular}

The innodb_flush_sync variable, which is enabled by default, causes the innodb_io_capacity and innodb_io_capacity_max settings to be ignored during bursts of I/O activity that occur at checkpoints. To adhere to the I/O rate defined by innodb_io_capacity and innodb_io_capacity_max, disable innodb_flush_sync.

For information about configuring the innodb_flush_sync variable, see Section 17.8.7, "Configuring InnoDB I/O Capacity".
- innodb_flushing_avg_loops

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-flushing-avg-loops=\# \\
\hline System Variable & innodb_flushing_avg_loops \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 30 \\
\hline Minimum Value & 1 \\
\hline Maximum Value & 1000 \\
\hline
\end{tabular}

Number of iterations for which InnoDB keeps the previously calculated snapshot of the flushing state, controlling how quickly adaptive flushing responds to changing workloads. Increasing the value makes the rate of flush operations change smoothly and gradually as the workload changes. Decreasing the value makes adaptive flushing adjust quickly to workload changes, which can cause spikes in flushing activity if the workload increases and decreases suddenly.

For related information, see Section 17.8.3.5, "Configuring Buffer Pool Flushing".
- innodb_force_load_corrupted

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-force-load-corrupted[=\{OFF| ON\}] \\
\hline System Variable & innodb_force_load_corrupted \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & 0FF \\
\hline
\end{tabular}

Permits InnoDB to load tables at startup that are marked as corrupted. Use only during troubleshooting, to recover data that is otherwise inaccessible. When troubleshooting is complete, disable this setting and restart the server.
- innodb_force_recovery

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-force-recovery=\# \\
\hline System Variable & innodb_force_recovery \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Maximum Value & 6
\end{tabular}

The crash recovery mode, typically only changed in serious troubleshooting situations. Possible values are from 0 to 6 . For the meanings of these values and important information about innodb_force_recovery, see Section 17.20.3, "Forcing InnoDB Recovery".
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3220.jpg?height=127&width=113&top_left_y=511&top_left_x=333)

\section*{Warning}

Only set this variable to a value greater than 0 in an emergency situation so that you can start InnoDB and dump your tables. As a safety measure, InnoDB prevents INSERT, UPDATE, or DELETE operations when innodb_force_recovery is greater than 0 . An innodb_force_recovery setting of 4 or greater places InnoDB into readonly mode.

These restrictions may cause replication administration commands to fail with an error, as replication stores the replica status logs in InnoDB tables.
- innodb_fsync_threshold

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-fsync-threshold=\# \\
\hline System Variable & innodb_fsync_threshold \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 2* *64-1 \\
\hline
\end{tabular}

By default, when InnoDB creates a new data file, such as a new log file or tablespace file, the file is fully written to the operating system cache before it is flushed to disk, which can cause a large amount of disk write activity to occur at once. To force smaller, periodic flushes of data from the operating system cache, you can use the innodb_fsync_threshold variable to define a threshold value, in bytes. When the byte threshold is reached, the contents of the operating system cache are flushed to disk. The default value of 0 forces the default behavior, which is to flush data to disk only after a file is fully written to the cache.

Specifying a threshold to force smaller, periodic flushes may be beneficial in cases where multiple MySQL instances use the same storage devices. For example, creating a new MySQL instance and its associated data files could cause large surges of disk write activity, impeding the performance of other MySQL instances that use the same storage devices. Configuring a threshold helps avoid such surges in write activity.
- innodb_ft_aux_table

\begin{tabular}{|l|l|}
\hline System Variable & innodb_ft_aux_table \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Type & String \\
\hline
\end{tabular}

Specifies the qualified name of an InnoDB table containing a FULLTEXT index. This variable is intended for diagnostic purposes and can only be set at runtime. For example:
```
SET GLOBAL innodb_ft_aux_table = 'test/t1';
```


After you set this variable to a name in the format db_name/table_name, the INFORMATION_SCHEMA tables INNODB_FT_INDEX_TABLE, INNODB_FT_INDEX_CACHE, INNODB_FT_CONFIG, INNODB_FT_DELETED, and INNODB_FT_BEING_DELETED show information about the search index for the specified table.

For more information, see Section 17.15.4, "InnoDB INFORMATION_SCHEMA FULLTEXT Index Tables".
- innodb_ft_cache_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-ft-cache-size=\# \\
\hline System Variable & innodb_ft_cache_size \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 8000000 \\
\hline Minimum Value & 1600000 \\
\hline Maximum Value & 80000000 \\
\hline Unit & bytes \\
\hline
\end{tabular}

The memory allocated, in bytes, for the InnoDB FULLTEXT search index cache, which holds a parsed document in memory while creating an InnoDB FULLTEXT index. Index inserts and updates are only committed to disk when the innodb_ft_cache_size size limit is reached. innodb_ft_cache_size defines the cache size on a per table basis. To set a global limit for all tables, see innodb_ft_total_cache_size.

For more information, see InnoDB Full-Text Index Cache.
- innodb_ft_enable_diag_print

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-ft-enable-diag-print[=\{OFF| ON\}] \\
\hline System Variable & innodb_ft_enable_diag_print \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & 0FF \\
\hline
\end{tabular}

Whether to enable additional full-text search (FTS) diagnostic output. This option is primarily intended for advanced FTS debugging and is not of interest to most users. Output is printed to the error log and includes information such as:
- FTS index sync progress (when the FTS cache limit is reached). For example:

SYNC words: 100
- FTS optimize progress. For example:
```
FTS start optimize test
FTS_OPTIMIZE: optimize "mysql"
FTS_OPTIMIZE: processed "mysql"
```

- FTS index build progress. For example:
```
Number of doc processed: 1000
```

- For FTS queries, the query parsing tree, word weight, query processing time, and memory usage are printed. For example:
```
FTS Search Processing time: 1 secs: 100 millisec: row(s) 10000
Full Search Memory: 245666 (bytes), Row: 10000
```

- innodb_ft_enable_stopword

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-ft-enable-stopword[=\{0FF| ON\}] \\
\hline System Variable & innodb_ft_enable_stopword \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & ON \\
\hline
\end{tabular}

Specifies that a set of stopwords is associated with an InnoDB FULLTEXT index at the time the index is created. If the innodb_ft_user_stopword_table option is set, the stopwords are taken from that table. Else, if the innodb_ft_server_stopword_table option is set, the stopwords are taken from that table. Otherwise, a built-in set of default stopwords is used.

For more information, see Section 14.9.4, "Full-Text Stopwords".
- innodb_ft_max_token_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-ft-max-token-size=\# \\
\hline System Variable & innodb_ft_max_token_size \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 84 \\
\hline Minimum Value & 10 \\
\hline Maximum Value & 84 \\
\hline
\end{tabular}

Maximum character length of words that are stored in an InnoDB FULLTEXT index. Setting a limit on this value reduces the size of the index, thus speeding up queries, by omitting long keywords or arbitrary collections of letters that are not real words and are not likely to be search terms.

For more information, see Section 14.9.6, "Fine-Tuning MySQL Full-Text Search".
- innodb_ft_min_token_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-ft-min-token-size=\# \\
\hline System Variable & innodb_ft_min_token_size \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 3 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 16 \\
\hline
\end{tabular}

Minimum length of words that are stored in an InnoDB FULLTEXT index. Increasing this value reduces the size of the index, thus speeding up queries, by omitting common words that are unlikely to be significant in a search context, such as the English words "a" and "to". For content using a CJK (Chinese, Japanese, Korean) character set, specify a value of 1.

For more information, see Section 14.9.6, "Fine-Tuning MySQL Full-Text Search".
- innodb_ft_num_word_optimize

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-ft-num-word-optimize=\# \\
\hline System Variable & innodb_ft_num_word_optimize \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 2000 \\
\hline Minimum Value & 1000 \\
\hline Maximum Value & 10000 \\
\hline
\end{tabular}

Number of words to process during each OPTIMIZE TABLE operation on an InnoDB FULLTEXT index. Because a bulk insert or update operation to a table containing a full-text search index could require substantial index maintenance to incorporate all changes, you might do a series of OPTIMIZE TABLE statements, each picking up where the last left off.

For more information, see Section 14.9.6, "Fine-Tuning MySQL Full-Text Search".
- innodb_ft_result_cache_limit

\begin{tabular}{|l|l|l|}
\hline Command-Line Format & --innodb-ft-result-cache-limit=\# & \\
\hline System Variable & innodb_ft_result_cache_limit & \\
\hline Scope & Global & \\
\hline Dynamic & Yes & \\
\hline SET_VAR Hint Applies & No & \\
\hline Type & Integer & \\
\hline Default Value & 2000000000 & \\
\hline Minimum Value & 1000000 & \\
\hline Maximum Value & 2**32-1 & 3193 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Unit & bytes \\
\hline
\end{tabular}

The InnoDB full-text search query result cache limit (defined in bytes) per full-text search query or per thread. Intermediate and final InnoDB full-text search query results are handled in memory. Use innodb_ft_result_cache_limit to place a size limit on the full-text search query result cache to avoid excessive memory consumption in case of very large InnoDB full-text search query results (millions or hundreds of millions of rows, for example). Memory is allocated as required when a fulltext search query is processed. If the result cache size limit is reached, an error is returned indicating that the query exceeds the maximum allowed memory.

The maximum value of innodb_ft_result_cache_limit for all platform types and bit sizes is 2**32-1.
- innodb_ft_server_stopword_table

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-ft-server-stopwordtable=db_name/table_name \\
\hline System Variable & innodb_ft_server_stopword_table \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Default Value & NULL \\
\hline
\end{tabular}

This option is used to specify your own InnoDB FULLTEXT index stopword list for all InnoDB tables. To configure your own stopword list for a specific InnoDB table, use innodb_ft_user_stopword_table.

Set innodb_ft_server_stopword_table to the name of the table containing a list of stopwords, in the format db_name/table_name.

The stopword table must exist before you configure innodb_ft_server_stopword_table. innodb_ft_enable_stopword must be enabled and innodb_ft_server_stopword_table option must be configured before you create the FULLTEXT index.

The stopword table must be an InnoDB table, containing a single VARCHAR column named value.
For more information, see Section 14.9.4, "Full-Text Stopwords".
- innodb_ft_sort_pll_degree

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-ft-sort-pll-degree=\# \\
\hline System Variable & innodb_ft_sort_pll_degree \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 2 \\
\hline Minimum Value & 1 \\
\hline
\end{tabular}

\begin{tabular}{|l|l} 
Maximum Value & 16
\end{tabular}

Number of threads used in parallel to index and tokenize text in an InnoDB FULLTEXT index when building a search index.

For related information, see Section 17.6.2.4, "InnoDB Full-Text Indexes", and innodb_sort_buffer_size.
- innodb_ft_total_cache_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-ft-total-cache-size=\# \\
\hline System Variable & innodb_ft_total_cache_size \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 640000000 \\
\hline Minimum Value & 32000000 \\
\hline Maximum Value & 1600000000 \\
\hline Unit & bytes \\
\hline
\end{tabular}

The total memory allocated, in bytes, for the InnoDB full-text search index cache for all tables. Creating numerous tables, each with a FULLTEXT search index, could consume a significant portion of available memory. innodb_ft_total_cache_size defines a global memory limit for all fulltext search indexes to help avoid excessive memory consumption. If the global limit is reached by an index operation, a forced sync is triggered.

For more information, see InnoDB Full-Text Index Cache.
- innodb_ft_user_stopword_table

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-ft-user-stopwordtable=db_name/table_name \\
\hline System Variable & innodb_ft_user_stopword_table \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Default Value & NULL \\
\hline
\end{tabular}

This option is used to specify your own InnoDB FULLTEXT index stopword list on a specific table. To configure your own stopword list for all InnoDB tables, use innodb_ft_server_stopword_table.

Set innodb_ft_user_stopword_table to the name of the table containing a list of stopwords, in the format db_name/table_name.

The stopword table must exist before you configure innodb_ft_user_stopword_table. innodb_ft_enable_stopword must be enabled and innodb_ft_user_stopword_table must be configured before you create the FULLTEXT index.

The stopword table must be an InnoDB table, containing a single VARCHAR column named value.
For more information, see Section 14.9.4, "Full-Text Stopwords".
- innodb_idle_flush_pct

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-idle-flush-pct=\# \\
\hline System Variable & innodb_idle_flush_pct \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 100 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 100 \\
\hline
\end{tabular}

Limits page flushing when InnoDB is idle. The innodb_idle_flush_pct value is a percentage of the innodb_io_capacity setting, which defines the number of I/O operations per second available to InnoDB. For more information, see Limiting Buffer Flushing During Idle Periods.
- innodb_io_capacity

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-io-capacity=\# \\
\hline System Variable & innodb_io_capacity \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 10000 \\
\hline Minimum Value & 100 \\
\hline Maximum Value & 2* *32-1 \\
\hline
\end{tabular}

The innodb_io_capacity variable defines the number of I/O operations per second (IOPS) available to InnoDB background tasks, such as flushing pages from the buffer pool and merging data from the change buffer.

For information about configuring the innodb_io_capacity variable, see Section 17.8.7, "Configuring InnoDB I/O Capacity".
- innodb_io_capacity_max

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-io-capacity-max=\# \\
\hline System Variable & innodb_io_capacity_max \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 2 * innodb_io_capacity \\
\hline Minimum Value & 100 \\
\hline Maximum Value & 2**32-1 \\
\hline
\end{tabular}

If flushing activity falls behind, InnoDB can flush more aggressively, at a higher rate of I/ O operations per second (IOPS) than defined by the innodb_io_capacity variable. The innodb_io_capacity_max variable defines a maximum number of IOPS performed by InnoDB background tasks in such situations. This option does not control innodb_flush_sync behavior.

The default value is twice the value of innodb_io_capacity.
For information about configuring the innodb_io_capacity_max variable, see Section 17.8.7, "Configuring InnoDB I/O Capacity".
- innodb_limit_optimistic_insert_debug

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-limit-optimistic-insertdebug=\# \\
\hline System Variable & innodb_limit_optimistic_insert_debug \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 2* *32-1 \\
\hline
\end{tabular}

Limits the number of records per B-tree page. A default value of 0 means that no limit is imposed. This option is only available if debugging support is compiled in using the WITH_DEBUG CMake option.
- innodb_lock_wait_timeout

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-lock-wait-timeout=\# \\
\hline System Variable & innodb_lock_wait_timeout \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 50 \\
\hline Minimum Value & 1 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Maximum Value & 1073741824 \\
\hline Unit & seconds \\
\hline
\end{tabular}

The length of time in seconds an InnoDB transaction waits for a row lock before giving up. The default value is 50 seconds. A transaction that tries to access a row that is locked by another InnoDB transaction waits at most this many seconds for write access to the row before issuing the following error:

ERROR 1205 (HY000): Lock wait timeout exceeded; try restarting transaction
When a lock wait timeout occurs, the current statement is rolled back (not the entire transaction). To have the entire transaction roll back, start the server with the --innodb-rollback-on-timeout option. See also Section 17.20.5, "InnoDB Error Handling".

You might decrease this value for highly interactive applications or OLTP systems, to display user feedback quickly or put the update into a queue for processing later. You might increase this value for long-running back-end operations, such as a transform step in a data warehouse that waits for other large insert or update operations to finish.
innodb_lock_wait_timeout applies to InnoDB row locks. A MySQL table lock does not happen inside InnoDB and this timeout does not apply to waits for table locks.

The lock wait timeout value does not apply to deadlocks when innodb_deadlock_detect is enabled (the default) because InnoDB detects deadlocks immediately and rolls back one of the deadlocked transactions. When innodb_deadlock_detect is disabled, InnoDB relies on innodb_lock_wait_timeout for transaction rollback when a deadlock occurs. See Section 17.7.5.2, "Deadlock Detection".
innodb_lock_wait_timeout can be set at runtime with the SET GLOBAL or SET SESSION statement. Changing the GLOBAL setting requires privileges sufficient to set global system variables (see Section 7.1.9.1, "System Variable Privileges") and affects the operation of all clients that subsequently connect. Any client can change the SESSION setting for innodb_lock_wait_timeout, which affects only that client.
- innodb_log_buffer_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-log-buffer-size=\# \\
\hline System Variable & innodb_log_buffer_size \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 67108864 \\
\hline Minimum Value & 1048576 \\
\hline Maximum Value & 4294967295 \\
\hline
\end{tabular}

The size in bytes of the buffer that InnoDB uses to write to the log files on disk. The default is 64 MB . A large log buffer enables large transactions to run without the need to write the log to disk before the transactions commit. Thus, if you have transactions that update, insert, or delete many rows, making the log buffer larger saves disk I/O. For related information, see Memory Configuration, and Section 10.5.4, "Optimizing InnoDB Redo Logging". For general I/O tuning advice, see Section 10.5.8, "Optimizing InnoDB Disk I/O".
- innodb_log_checkpoint_fuzzy_now

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-log-checkpoint-fuzzynow[=\{OFF|ON\}] \\
\hline System Variable & innodb_log_checkpoint_fuzzy_now \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & 0FF \\
\hline
\end{tabular}

Enable this debug option to force InnoDB to write a fuzzy checkpoint. This option is only available if debugging support is compiled in using the WITH_DEBUG CMake option.
- innodb_log_checkpoint_now

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-log-checkpoint-now[=\{OFF| ON\}] \\
\hline System Variable & innodb_log_checkpoint_now \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & 0FF \\
\hline
\end{tabular}

Enable this debug option to force InnoDB to write a checkpoint. This option is only available if debugging support is compiled in using the WITH_DEBUG CMake option.
- innodb_log_checksums

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-log-checksums [=\{OFF | ON \}] \\
\hline System Variable & innodb_log_checksums \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & ON \\
\hline
\end{tabular}

Enables or disables checksums for redo log pages.
innodb_log_checksums=ON enables the CRC-32C checksum algorithm for redo log pages. When innodb_log_checksums is disabled, the contents of the redo log page checksum field are ignored.

Checksums on the redo log header page and redo log checkpoint pages are never disabled.
- innodb_log_compressed_pages

\begin{tabular}{|l|l|l|}
\hline & Command-Line Format & \begin{tabular}{l}
--innodb-log-compressed-pages [=\{0FF| \\
ON\}]
\end{tabular} \\
\cline { 2 - 3 } & System Variable & innodb_log_compressed_pages \\
\hline & Scope & Global \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & ON \\
\hline
\end{tabular}

Specifies whether images of re-compressed pages are written to the redo log. Re-compression may occur when changes are made to compressed data.
innodb_log_compressed_pages is enabled by default to prevent corruption that could occur if a different version of the zlib compression algorithm is used during recovery. If you are certain that the zlib version is not subject to change, you can disable innodb_log_compressed_pages to reduce redo log generation for workloads that modify compressed data.

To measure the effect of enabling or disabling innodb_log_compressed_pages, compare redo log generation for both settings under the same workload. Options for measuring redo log generation include observing the Log sequence number (LSN) in the LOG section of SHOW ENGINE INNODB STATUS output, or monitoring Innodb_os_log_written status for the number of bytes written to the redo log files.

For related information, see Section 17.9.1.6, "Compression for OLTP Workloads".
- innodb_log_file_size

\begin{table}
\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-log-file-size=\# \\
\hline Deprecated & Yes \\
\hline System Variable & innodb_log_file_size \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 50331648 \\
\hline Minimum Value & 4194304 \\
\hline Maximum Value & 512GB / innodb_log_files_in_group \\
\hline Unit & bytes \\
\hline
\end{tabular}
\captionsetup{labelformat=empty}
\caption{Note
innodb_log_file_size and innodb_log_files_in_group have been superseded by innodb_redo_log_capacity; see Section 17.6.5, "Redo Log".}
\end{table}

The size in bytes of each log file in a log group. The combined size of log files (innodb_log_file_size *innodb_log_files_in_group) cannot exceed a maximum value that is slightly less than 512 GB . A pair of 255 GB log files, for example, approaches the limit but does not exceed it. The default value is 48 MB .

Generally, the combined size of the log files should be large enough that the server can smooth out peaks and troughs in workload activity, which often means that there is enough redo log space to
handle more than an hour of write activity. The larger the value, the less checkpoint flush activity is required in the buffer pool, saving disk I/O. Larger log files also make crash recovery slower.

The minimum innodb_log_file_size is 4MB.
For related information, see Redo Log Configuration. For general I/O tuning advice, see Section 10.5.8, "Optimizing InnoDB Disk I/O".

If the server is started with --innodb-dedicated-server, the value of innodb_log_file_size is set automatically if it is not explicitly defined. For more information, see Section 17.8.12, "Enabling Automatic InnoDB Configuration for a Dedicated MySQL Server".
- innodb_log_files_in_group

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-log-files-in-group=\# \\
\hline Deprecated & Yes \\
\hline System Variable & innodb_log_files_in_group \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 2 \\
\hline Minimum Value & 2 \\
\hline Maximum Value & 100 \\
\hline
\end{tabular}

\section*{Note}
innodb_log_file_size and innodb_log_files_in_group have been superseded by innodb_redo_log_capacity; see Section 17.6.5, "Redo Log".

The number of log files in the log group. InnoDB writes to the files in a circular fashion. The default (and recommended) value is 2 . The location of the files is specified by innodb_log_group_home_dir. The combined size of log files (innodb_log_file_size * innodb_log_files_in_group) can be up to 512 GB .

For related information, see Redo Log Configuration.
If the server is started with --innodb-dedicated-server, the value of innodb_log_files_in_group is set automatically if it is not explicitly defined. For more information, see Section 17.8.12, "Enabling Automatic InnoDB Configuration for a Dedicated MySQL Server".
- innodb_log_group_home_dir

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-log-group-home-dir=dir_name \\
\hline System Variable & innodb_log_group_home_dir \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Type & Directory name \\
\hline
\end{tabular}

The directory path to the InnoDB redo log files.
For related information, see Redo Log Configuration.
- innodb_log_spin_cpu_abs_lwm

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-log-spin-cpu-abs-lwm=\# \\
\hline System Variable & innodb_log_spin_cpu_abs_lwm \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 80 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 4294967295 \\
\hline
\end{tabular}

Defines the minimum amount of CPU usage below which user threads no longer spin while waiting for flushed redo. The value is expressed as a sum of CPU core usage. For example, The default value of 80 is $80 \%$ of a single CPU core. On a system with a multi-core processor, a value of 150 represents 100\% usage of one CPU core plus 50\% usage of a second CPU core.

For related information, see Section 10.5.4, "Optimizing InnoDB Redo Logging".
- innodb_log_spin_cpu_pct_hwm

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-log-spin-cpu-pct-hwm=\# \\
\hline System Variable & innodb_log_spin_cpu_pct_hwm \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 50 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 100 \\
\hline
\end{tabular}

Defines the maximum amount of CPU usage above which user threads no longer spin while waiting for flushed redo. The value is expressed as a percentage of the combined total processing power of all CPU cores. The default value is 50\%. For example, 100\% usage of two CPU cores is 50\% of the combined CPU processing power on a server with four CPU cores.

The innodb_log_spin_cpu_pct_hwm variable respects processor affinity. For example, if a server has 48 cores but the mysqld process is pinned to only four CPU cores, the other 44 CPU cores are ignored.

For related information, see Section 10.5.4, "Optimizing InnoDB Redo Logging".
- innodb_log_wait_for_flush_spin_hwm

\begin{tabular}{l|l|l|}
\cline { 2 - 3 } & Command-Line Format & --innodb-log-wait-for-flush-spin- \\
\hline 3202 & & hwm=\# \\
\cline { 2 - 3 } & &
\end{tabular}

\begin{tabular}{|l|l|}
\hline System Variable & innodb_log_wait_for_flush_spin_hwm \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 400 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 2**32-1 \\
\hline Unit & microseconds \\
\hline
\end{tabular}

Defines the maximum average log flush time beyond which user threads no longer spin while waiting for flushed redo. The default value is 400 microseconds.

For related information, see Section 10.5.4, "Optimizing InnoDB Redo Logging".
- innodb_log_write_ahead_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-log-write-ahead-size=\# \\
\hline System Variable & innodb_log_write_ahead_size \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 8192 \\
\hline Minimum Value & 512 (log file block size) \\
\hline Maximum Value & Equal to innodb_page_size \\
\hline Unit & bytes \\
\hline
\end{tabular}

Defines the write-ahead block size for the redo log, in bytes. To avoid "read-on-write", set innodb_log_write_ahead_size to match the operating system or file system cache block size. The default setting is 8192 bytes. Read-on-write occurs when redo log blocks are not entirely cached to the operating system or file system due to a mismatch between write-ahead block size for the redo log and operating system or file system cache block size.

Valid values for innodb_log_write_ahead_size are multiples of the InnoDB log file block size $\left(2^{\mathrm{n}}\right)$. The minimum value is the InnoDB log file block size (512). Write-ahead does not occur when the minimum value is specified. The maximum value is equal to the innodb_page_size value. If you specify a value for innodb_log_write_ahead_size that is larger than the innodb_page_size value, the innodb_log_write_ahead_size setting is truncated to the innodb_page_size value.

Setting the innodb_log_write_ahead_size value too low in relation to the operating system or file system cache block size results in "read-on-write". Setting the value too high may have a slight impact on fsync performance for log file writes due to several blocks being written at once.

For related information, see Section 10.5.4, "Optimizing InnoDB Redo Logging".
- innodb_log_writer_threads

\begin{tabular}{|l|l|}
\hline Command-Line Format & \begin{tabular}{l}
--innodb-log-writer-threads $[=\{$ OFF $\mid$ \\
ON $\}]$
\end{tabular} \\
\hline System Variable & innodb_log_writer_threads \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & ON \\
\hline
\end{tabular}

Enables dedicated log writer threads for writing redo log records from the log buffer to the system buffers and flushing the system buffers to the redo log files. Dedicated log writer threads can improve performance on high-concurrency systems, but for low-concurrency systems, disabling dedicated log writer threads provides better performance.

For more information, see Section 10.5.4, "Optimizing InnoDB Redo Logging".
- innodb_lru_scan_depth

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-lru-scan-depth=\# \\
\hline System Variable & innodb_lru_scan_depth \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 1024 \\
\hline Minimum Value & 100 \\
\hline Maximum Value & 2**32-1 \\
\hline
\end{tabular}

A parameter that influences the algorithms and heuristics for the flush operation for the InnoDB buffer pool. Primarily of interest to performance experts tuning I/O-intensive workloads. It specifies, per buffer pool instance, how far down the buffer pool LRU page list the page cleaner thread scans looking for dirty pages to flush. This is a background operation performed once per second.

A setting smaller than the default is generally suitable for most workloads. A value that is much higher than necessary may impact performance. Only consider increasing the value if you have spare I/O capacity under a typical workload. Conversely, if a write-intensive workload saturates your I/O capacity, decrease the value, especially in the case of a large buffer pool.

When tuning innodb_lru_scan_depth, start with a low value and configure the setting upward with the goal of rarely seeing zero free pages. Also, consider adjusting innodb_lru_scan_depth when changing the number of buffer pool instances, since innodb_lru_scan_depth * innodb_buffer_pool_instances defines the amount of work performed by the page cleaner thread each second.

For related information, see Section 17.8.3.5, "Configuring Buffer Pool Flushing". For general I/O tuning advice, see Section 10.5.8, "Optimizing InnoDB Disk I/O".
- innodb_max_dirty_pages_pct

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-max-dirty-pages-pct=\# \\
\hline System Variable & innodb_max_dirty_pages_pct \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Numeric \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Default Value & 90 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 99.999 \\
\hline
\end{tabular}

InnoDB tries to flush data from the buffer pool so that the percentage of dirty pages does not exceed this value.

The innodb_max_dirty_pages_pct setting establishes a target for flushing activity. It does not affect the rate of flushing. For information about managing the rate of flushing, see Section 17.8.3.5, "Configuring Buffer Pool Flushing".

For related information, see Section 17.8.3.5, "Configuring Buffer Pool Flushing". For general I/O tuning advice, see Section 10.5.8, "Optimizing InnoDB Disk I/O".
- innodb_max_dirty_pages_pct_lwm

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-max-dirty-pages-pct-lwm=\# \\
\hline System Variable & innodb_max_dirty_pages_pct_lwm \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Numeric \\
\hline Default Value & 10 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 99.999 \\
\hline
\end{tabular}

Defines a low water mark representing the percentage of dirty pages at which preflushing is enabled to control the dirty page ratio. A value of 0 disables the pre-flushing behavior entirely. The configured value should always be lower than the innodb_max_dirty_pages_pct value. For more information, see Section 17.8.3.5, "Configuring Buffer Pool Flushing".
- innodb_max_purge_lag

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-max-purge-lag=\# \\
\hline System Variable & innodb_max_purge_lag \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 4294967295 \\
\hline
\end{tabular}

Defines the desired maximum purge lag. If this value is exceeded, a delay is imposed on INSERT, UPDATE, and DELETE operations to allow time for purge to catch up. The default value is 0 , which means there is no maximum purge lag and no delay.

For more information, see Section 17.8.9, "Purge Configuration".
- innodb_max_purge_lag_delay

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-max-purge-lag-delay=\# \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline System Variable & innodb_max_purge_lag_delay \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 10000000 \\
\hline Unit & microseconds \\
\hline
\end{tabular}

Specifies the maximum delay in microseconds for the delay imposed when the innodb_max_purge_lag threshold is exceeded. The specified innodb_max_purge_lag_delay value is an upper limit on the delay period calculated by the innodb_max_purge_lag formula.

For more information, see Section 17.8.9, "Purge Configuration".
- innodb_max_undo_log_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-max-undo-log-size=\# \\
\hline System Variable & innodb_max_undo_log_size \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 1073741824 \\
\hline Minimum Value & 10485760 \\
\hline Maximum Value & 2**64-1 \\
\hline Unit & bytes \\
\hline
\end{tabular}

Defines a threshold size for undo tablespaces. If an undo tablespace exceeds the threshold, it can be marked for truncation when innodb_undo_log_truncate is enabled. The default value is 1073741824 bytes (1024 MiB).

For more information, see Truncating Undo Tablespaces.
- innodb_merge_threshold_set_all_debug

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-merge-threshold-set-alldebug=\# \\
\hline System Variable & innodb_merge_threshold_set_all_debug \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 50 \\
\hline Minimum Value & 1 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Maximum Value & 50 \\
\hline
\end{tabular}

Defines a page-full percentage value for index pages that overrides the current MERGE_THRESHOLD setting for all indexes that are currently in the dictionary cache. This option is only available if debugging support is compiled in using the WITH_DEBUG CMake option. For related information, see Section 17.8.11, "Configuring the Merge Threshold for Index Pages".
- innodb_monitor_disable

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-monitor-disable=\{counter|\} module|pattern|all\} \\
\hline System Variable & innodb_monitor_disable \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline
\end{tabular}

This variable acts as a switch, disabling InnoDB metrics counters. Counter data may be queried using the Information Schema INNODB_METRICS table. For usage information, see Section 17.15.6, "InnoDB INFORMATION_SCHEMA Metrics Table".
innodb_monitor_disable='latch' disables statistics collection for SHOW ENGINE INNODB MUTEX. For more information, see Section 15.7.7.16, "SHOW ENGINE Statement".
- innodb_monitor_enable

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-monitor-enable=\{counter|\} module|pattern|all\} \\
\hline System Variable & innodb_monitor_enable \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline
\end{tabular}

This variable acts as a switch, enabling InnoDB metrics counters. Counter data may be queried using the Information Schema INNODB_METRICS table. For usage information, see Section 17.15.6, "InnoDB INFORMATION_SCHEMA Metrics Table".
innodb_monitor_enable='latch' enables statistics collection for SHOW ENGINE INNODB MUTEX. For more information, see Section 15.7.7.16, "SHOW ENGINE Statement".
- innodb_monitor_reset

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-monitor-reset=\{counter|\} module|pattern|all\} \\
\hline System Variable & innodb_monitor_reset \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Enumeration \\
\hline Default Value & NULL \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Valid Values & \begin{tabular}{l}
counter \\
module pattern \\
all
\end{tabular} \\
\hline
\end{tabular}

This variable acts as a switch, resetting the count value for InnoDB metrics counters to zero. Counter data may be queried using the Information Schema INNODB_METRICS table. For usage information, see Section 17.15.6, "InnoDB INFORMATION_SCHEMA Metrics Table".
innodb_monitor_reset='latch' resets statistics reported by SHOW ENGINE INNODB MUTEX. For more information, see Section 15.7.7.16, "SHOW ENGINE Statement".
- innodb_monitor_reset_all

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-monitor-reset-all=\{counter| module|pattern|all\} \\
\hline System Variable & innodb_monitor_reset_all \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Enumeration \\
\hline Default Value & NULL \\
\hline Valid Values & \begin{tabular}{l}
counter \\
module \\
pattern \\
all
\end{tabular} \\
\hline
\end{tabular}

This variable acts as a switch, resetting all values (minimum, maximum, and so on) for InnoDB metrics counters. Counter data may be queried using the Information Schema INNODB_METRICS table. For usage information, see Section 17.15.6, "InnoDB INFORMATION_SCHEMA Metrics Table".
- innodb_numa_interleave

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-numa-interleave[=\{OFF|ON\}] \\
\hline System Variable & innodb_numa_interleave \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & ON \\
\hline
\end{tabular}

Enables the NUMA interleave memory policy for allocation of the InnoDB buffer pool. When innodb_numa_interleave is enabled, the NUMA memory policy is set to MPOL_INTERLEAVE for the mysqld process. After the InnoDB buffer pool is allocated, the NUMA memory policy is set back to MPOL_DEFAULT. For the innodb_numa_interleave option to be available, MySQL must
be compiled on a NUMA-enabled Linux system. The default value is ON if the system supports it, otherwise it defaults to OFF.

CMake sets the default WITH_NUMA value based on whether the current platform has NUMA support. For more information, see Section 2.8.7, "MySQL Source-Configuration Options".
- innodb_old_blocks_pct

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-old-blocks-pct=\# \\
\hline System Variable & innodb_old_blocks_pct \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 37 \\
\hline Minimum Value & 5 \\
\hline Maximum Value & 95 \\
\hline
\end{tabular}

Specifies the approximate percentage of the InnoDB buffer pool used for the old block sublist. The range of values is 5 to 95 . The default value is 37 (that is, $3 / 8$ of the pool). Often used in combination with innodb_old_blocks_time.

For more information, see Section 17.8.3.3, "Making the Buffer Pool Scan Resistant". For information about buffer pool management, the LRU algorithm, and eviction policies, see Section 17.5.1, "Buffer Pool".
- innodb_old_blocks_time

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-old-blocks-time=\# \\
\hline System Variable & innodb_old_blocks_time \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 1000 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 2* *32-1 \\
\hline Unit & milliseconds \\
\hline
\end{tabular}

Non-zero values protect against the buffer pool being filled by data that is referenced only for a brief period, such as during a full table scan. Increasing this value offers more protection against full table scans interfering with data cached in the buffer pool.

Specifies how long in milliseconds a block inserted into the old sublist must stay there after its first access before it can be moved to the new sublist. If the value is 0 , a block inserted into the old sublist moves immediately to the new sublist the first time it is accessed, no matter how soon after insertion the access occurs. If the value is greater than 0 , blocks remain in the old sublist until an access occurs at least that many milliseconds after the first access. For example, a value of 1000 causes
blocks to stay in the old sublist for 1 second after the first access before they become eligible to move to the new sublist.

The default value is 1000.

This variable is often used in combination with innodb_old_blocks_pct. For more information, see Section 17.8.3.3, "Making the Buffer Pool Scan Resistant". For information about buffer pool management, the LRU algorithm, and eviction policies, see Section 17.5.1, "Buffer Pool".
- innodb_online_alter_log_max_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-online-alter-log-max-size=\# \\
\hline System Variable & innodb_online_alter_log_max_size \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 134217728 \\
\hline Minimum Value & 65536 \\
\hline Maximum Value & 2* *64-1 \\
\hline Unit & bytes \\
\hline
\end{tabular}

Specifies an upper limit in bytes on the size of the temporary log files used during online DDL operations for InnoDB tables. There is one such log file for each index being created or table being altered. This log file stores data inserted, updated, or deleted in the table during the DDL operation. The temporary log file is extended when needed by the value of innodb_sort_buffer_size, up to the maximum specified by innodb_online_alter_log_max_size. If a temporary log file exceeds the upper size limit, the ALTER TABLE operation fails and all uncommitted concurrent DML operations are rolled back. Thus, a large value for this option allows more DML to happen during an online DDL operation, but also extends the period of time at the end of the DDL operation when the table is locked to apply the data from the log.
- innodb_open_files

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-open-files=\# \\
\hline System Variable & innodb_open_files \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & -1 (signifies autosizing; do not assign this literal value) \\
\hline Minimum Value & 10 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Maximum Value & 2147483647 \\
\hline
\end{tabular}

Specifies the maximum number of files that InnoDB can have open at one time. The minimum value is 10 . If innodb_file_per_table is disabled, the default value is 300 ; otherwise, the default value is 300 or the table_open_cache setting, whichever is higher.

The innodb_open_files limit can be set at runtime using a SELECT innodb_set_open_files_limit ( $N$ ) statement, where $N$ is the desired innodb_open_files limit; for example:
```
mysql> SELECT innodb_set_open_files_limit(1000);
```


The statement executes a stored procedure that sets the new limit. If the procedure is successful, it returns the value of the newly set limit; otherwise, a failure message is returned.

It is not permitted to set innodb_open_files using a SET statement. To set innodb_open_files at runtime, use the SELECT innodb_set_open_files_limit ( $N$ ) statement described above.

Setting innodb_open_files=default is not supported. Only integer values are permitted.
To prevent non-LRU managed files from consuming the entire innodb_open_files limit, non-LRU managed files are limited to 90 percent of this limit, which reserves 10 percent of it for LRU managed files.
- innodb_optimize_fulltext_only

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-optimize-fulltextonly[=\{OFF|ON\}] \\
\hline System Variable & innodb_optimize_fulltext_only \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & 0FF \\
\hline
\end{tabular}

Changes the way OPTIMIZE TABLE operates on InnoDB tables. Intended to be enabled temporarily, during maintenance operations for InnoDB tables with FULLTEXT indexes.

By default, OPTIMIZE TABLE reorganizes data in the clustered index of the table. When this option is enabled, OPTIMIZE TABLE skips the reorganization of table data, and instead processes newly added, deleted, and updated token data for InnoDB FULLTEXT indexes. For more information, see Optimizing InnoDB Full-Text Indexes.
- innodb_page_cleaners

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-page-cleaners=\# \\
\hline System Variable & innodb_page_cleaners \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & innodb_buffer_pool_instances \\
\hline Minimum Value & 1 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Maximum Value & 64 \\
\hline
\end{tabular}

The number of page cleaner threads that flush dirty pages from buffer pool instances. Page cleaner threads perform flush list and LRU flushing. When there are multiple page cleaner threads, buffer pool flushing tasks for each buffer pool instance are dispatched to idle page cleaner threads. The innodb_page_cleaners default value is set to the same value as innodb_buffer_pool_instances. If the specified number of page cleaner threads exceeds the number of buffer pool instances, then innodb_page_cleaners is automatically set to the same value as innodb_buffer_pool_instances.

If your workload is write-IO bound when flushing dirty pages from buffer pool instances to data files, and if your system hardware has available capacity, increasing the number of page cleaner threads may help improve write-IO throughput.

Multithreaded page cleaner support extends to shutdown and recovery phases.
The setpriority() system call is used on Linux platforms where it is supported, and where the mysqld execution user is authorized to give page_cleaner threads priority over other MySQL and InnoDB threads to help page flushing keep pace with the current workload. setpriority() support is indicated by this InnoDB startup message:
```
[Note] InnoDB: If the mysqld execution user is authorized, page cleaner
thread priority can be changed. See the man page of setpriority().
```


For systems where server startup and shutdown is not managed by systemd, mysqld execution user authorization can be configured in /etc/security/limits.conf. For example, if mysqld is run under the mysql user, you can authorize the mysql user by adding these lines to /etc/ security/limits.conf:
```
mysql hard nice -20
mysql soft nice -20
```


For systemd managed systems, the same can be achieved by specifying LimitNICE=-20 in a localized systemd configuration file. For example, create a file named override.conf in /etc/ systemd/system/mysqld.service.d/override.conf and add this entry:
```
[Service]
LimitNICE=-20
```


After creating or changing override.conf, reload the systemd configuration, then tell systemd to restart the MySQL service:
```
systemctl daemon-reload
systemctl restart mysqld # RPM platforms
systemctl restart mysql # Debian platforms
```


For more information about using a localized systemd configuration file, see Configuring systemd for MySQL.

After authorizing the mysqld execution user, use the cat command to verify the configured Nice limits for the mysqld process:
```
$> cat /proc/mysqld_pid/limits | grep nice
Max nice priority 18446744073709551596 18446744073709551596
```

- innodb_page_size

\begin{tabular}{|l|l|l|}
\hline \multirow{3}{*}{} & Command-Line Format & --innodb-page-size=\# \\
\hline & System Variable & innodb_page_size \\
\hline & Scope & Global \\
\hline 3212 & Dynamic & No \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline SET_VAR Hint Applies & No \\
\hline Type & Enumeration \\
\hline Default Value & 16384 \\
\hline Valid Values & \begin{tabular}{l}
4096 \\
8192 \\
16384 \\
32768 \\
65536
\end{tabular} \\
\hline
\end{tabular}

Specifies the page size for InnoDB tablespaces. Values can be specified in bytes or kilobytes. For example, a 16 kilobyte page size value can be specified as $16384,16 \mathrm{~KB}$, or 16 K .
innodb_page_size can only be configured prior to initializing the MySQL instance and cannot be changed afterward. If no value is specified, the instance is initialized using the default page size. See Section 17.8.1, "InnoDB Startup Configuration".

For both 32 KB and 64 KB page sizes, the maximum row length is approximately 16000 bytes. ROW_FORMAT=COMPRESSED is not supported when innodb_page_size is set to 32 KB or 64 KB . For innodb_page_size $=32 \mathrm{~KB}$, extent size is 2 MB . For innodb_page_size $=64 \mathrm{~KB}$, extent size is 4 MB . innodb_log_buffer_size should be set to at least 16 MB (the default is 64 MB ) when using 32 KB or 64 KB page sizes.

The default 16 KB page size or larger is appropriate for a wide range of workloads, particularly for queries involving table scans and DML operations involving bulk updates. Smaller page sizes might be more efficient for OLTP workloads involving many small writes, where contention can be an issue when single pages contain many rows. Smaller pages might also be efficient with SSD storage devices, which typically use small block sizes. Keeping the InnoDB page size close to the storage device block size minimizes the amount of unchanged data that is rewritten to disk.

The minimum file size for the first system tablespace data file (ibdata1) differs depending on the innodb_page_size value. See the innodb_data_file_path option description for more information.

A MySQL instance using a particular InnoDB page size cannot use data files or log files from an instance that uses a different page size.

For general I/O tuning advice, see Section 10.5.8, "Optimizing InnoDB Disk I/O".
- innodb_parallel_read_threads

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-parallel-read-threads=\# \\
\hline System Variable & innodb_parallel_read_threads \\
\hline Scope & Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & (available logical processors / 8), min of 4 \\
\hline Minimum Value & 1 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Maximum Value & 256
\end{tabular}

Defines the number of threads that can be used for parallel clustered index reads. Parallel scanning of partitions is also supported. Parallel read threads can improve CHECK TABLE performance. InnoDB reads the clustered index twice during a CHECK TABLE operation. The second read can be performed in parallel. This feature does not apply to secondary index scans. The innodb_parallel_read_threads session variable must be set to a value greater than 1 for parallel clustered index reads to occur. The actual number of threads used to perform a parallel clustered index read is determined by the innodb_parallel_read_threads setting or the number of index subtrees to scan, whichever is smaller. The pages read into the buffer pool during the scan are kept at the tail of the buffer pool LRU list so that they can be discarded quickly when free buffer pool pages are required.

The maximum number of parallel read threads (256) is the total number of threads for all client connections. If the thread limit is reached, connections fall back to using a single thread. The default value is calculated by the number of available logical processors on the system divided by 8 , with a minimum default value of 4 .

Before MySQL 8.4, the default value was always 4.
- innodb_print_all_deadlocks

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-print-all-deadlocks[=\{OFF| ON\} ] \\
\hline System Variable & innodb_print_all_deadlocks \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

When this option is enabled, information about all deadlocks in InnoDB user transactions is recorded in the mysqld error log. Otherwise, you see information about only the last deadlock, using the SHOW ENGINE INNODB STATUS statement. An occasional InnoDB deadlock is not necessarily an issue, because InnoDB detects the condition immediately and rolls back one of the transactions automatically. You might use this option to troubleshoot why deadlocks are occurring if an application does not have appropriate error-handling logic to detect the rollback and retry its operation. A large number of deadlocks might indicate the need to restructure transactions that issue DML or SELECT ... FOR UPDATE statements for multiple tables, so that each transaction accesses the tables in the same order, thus avoiding the deadlock condition.

For related information, see Section 17.7.5, "Deadlocks in InnoDB".
- innodb_print_ddl_logs

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-print-ddl-logs[=\{OFF|ON\}] \\
\hline System Variable & innodb_print_ddl_logs \\
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

Enabling this option causes MySQL to write DDL logs to stderr. For more information, see Viewing DDL Logs.
- innodb_purge_batch_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-purge-batch-size=\# \\
\hline System Variable & innodb_purge_batch_size \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 300 \\
\hline Minimum Value & 1 \\
\hline Maximum Value & 5000 \\
\hline
\end{tabular}

Defines the number of undo log pages that purge parses and processes in one batch from the history list. In a multithreaded purge configuration, the coordinator purge thread divides innodb_purge_batch_size by innodb_purge_threads and assigns that number of pages to each purge thread. The innodb_purge_batch_size variable also defines the number of undo log pages that purge frees after every 128 iterations through the undo logs.

The innodb_purge_batch_size option is intended for advanced performance tuning in combination with the innodb_purge_threads setting. Most users need not change innodb_purge_batch_size from its default value.

For related information, see Section 17.8.9, "Purge Configuration".
- innodb_purge_threads

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-purge-threads=\# \\
\hline System Variable & innodb_purge_threads \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 1 if \# of available logical processors is <= 16; otherwise 4 \\
\hline Minimum Value & 1 \\
\hline Maximum Value & 32 \\
\hline
\end{tabular}

The number of background threads devoted to the InnoDB purge operation. Increasing the value creates additional purge threads, which can improve efficiency on systems where DML operations are performed on multiple tables.

For related information, see Section 17.8.9, "Purge Configuration".
- innodb_purge_rseg_truncate_frequency

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-purge-rseg-truncate- \\
\hline & frequency=\# 3215 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline System Variable & innodb_purge_rseg_truncate_frequency \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 128 \\
\hline Minimum Value & 1 \\
\hline Maximum Value & 128 \\
\hline
\end{tabular}

Defines the frequency with which the purge system frees rollback segments in terms of the number of times that purge is invoked. An undo tablespace cannot be truncated until its rollback segments are freed. Normally, the purge system frees rollback segments once every 128 times that purge is invoked. The default value is 128 . Reducing this value increases the frequency with which the purge thread frees rollback segments.
innodb_purge_rseg_truncate_frequency is intended for use with innodb_undo_log_truncate. For more information, see Truncating Undo Tablespaces.
- innodb_random_read_ahead

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-random-read-ahead[=\{0FF| ON\}] \\
\hline System Variable & innodb_random_read_ahead \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

Enables the random read-ahead technique for optimizing InnoDB I/O.
For details about performance considerations for different types of read-ahead requests, see Section 17.8.3.4, "Configuring InnoDB Buffer Pool Prefetching (Read-Ahead)". For general I/O tuning advice, see Section 10.5.8, "Optimizing InnoDB Disk I/O".
- innodb_read_ahead_threshold

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-read-ahead-threshold=\# \\
\hline System Variable & innodb_read_ahead_threshold \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 56 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 64 \\
\hline
\end{tabular}

Controls the sensitivity of linear read-ahead that InnoDB uses to prefetch pages into the buffer pool. If InnoDB reads at least innodb_read_ahead_threshold pages sequentially from an extent (64 pages), it initiates an asynchronous read for the entire following extent. The permissible range of
values is 0 to 64 . A value of 0 disables read-ahead. For the default of 56 , InnoDB must read at least 56 pages sequentially from an extent to initiate an asynchronous read for the following extent.

Knowing how many pages are read through the read-ahead mechanism, and how many of these pages are evicted from the buffer pool without ever being accessed, can be useful when fine-tuning the innodb_read_ahead_threshold setting. SHOW ENGINE INNODB STATUS output displays counter information from the Innodb_buffer_pool_read_ahead and Innodb_buffer_pool_read_ahead_evicted global status variables, which report the number of pages brought into the buffer pool by read-ahead requests, and the number of such pages evicted from the buffer pool without ever being accessed, respectively. The status variables report global values since the last server restart.

SHOW ENGINE INNODB STATUS also shows the rate at which the read-ahead pages are read and the rate at which such pages are evicted without being accessed. The per-second averages are based on the statistics collected since the last invocation of SHOW ENGINE INNODB STATUS and are displayed in the BUFFER POOL AND MEMORY section of the SHOW ENGINE INNODB STATUS output.

For more information, see Section 17.8.3.4, "Configuring InnoDB Buffer Pool Prefetching (ReadAhead)". For general I/O tuning advice, see Section 10.5.8, "Optimizing InnoDB Disk I/O".
- innodb_read_io_threads

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-read-io-threads=\# \\
\hline System Variable & innodb_read_io_threads \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & (available logical processors / 2), min of 4 \\
\hline Minimum Value & 1 \\
\hline Maximum Value & 64 \\
\hline
\end{tabular}

The number of I/O threads for read operations in InnoDB. Its counterpart for write threads is innodb_write_io_threads. For more information, see Section 17.8.5, "Configuring the Number of Background InnoDB I/O Threads". For general I/O tuning advice, see Section 10.5.8, "Optimizing InnoDB Disk I/O". The default value is the number of available logical processors on the system divided by 2 , with a minimum default value of 4 .

Before MySQL 8.4, the default value was always 4.

\section*{Note}

On Linux systems, running multiple MySQL servers (typically more than 12) with default settings for innodb_read_io_threads, innodb_write_io_threads, and the Linux aio-max-nr setting can exceed system limits. Ideally, increase the aio-max-nr setting; as a workaround, you might reduce the settings for one or both of the MySQL variables.
- innodb_read_only

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - innodb - read - only $[=\{$ OFF $\mid$ ON $\}]$ \\
\hline System Variable & innodb_read_only \\
\hline \hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

Starts InnoDB in read-only mode. For distributing database applications or data sets on read-only media. Can also be used in data warehouses to share the same data directory between multiple instances. For more information, see Section 17.8.2, "Configuring InnoDB for Read-Only Operation".

Enabling innodb_read_only prevents creating and dropping tables for all storage engines, and not only InnoDB. Table creation and drop operations for any storage engine modify data dictionary tables in the mysql system database, but those tables use the InnoDB storage engine and cannot be modified when innodb_read_only is enabled. The same principle applies to other table operations that require modifying data dictionary tables. Examples:
- If the innodb_read_only system variable is enabled, ANALYZE TABLE may fail because it cannot update statistics tables in the data dictionary, which use InnoDB. For ANALYZE TABLE operations that update the key distribution, failure may occur even if the operation updates the table itself (for example, if it is a MyISAM table). To obtain the updated distribution statistics, set information_schema_stats_expiry=0.
- ALTER TABLE tbl_name ENGINE=engine_name fails because it updates the storage engine designation, which is stored in the data dictionary.

In addition, other tables in the mysql system database use the InnoDB storage engine. Making those tables read-only results in restrictions on operations that modify them. Examples:
- Account-management statements such as CREATE USER and GRANT fail because the grant tables use InnodB.
- The INSTALL PLUGIN and UNINSTALL PLUGIN plugin-management statements fail because the mysql.plugin system table uses InnoDB.
- The CREATE FUNCTION and DROP FUNCTION loadable function-management statements fail because the mysql. func system table uses InnodB.
- innodb_redo_log_archive_dirs

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-redo-log-archive-dirs \\
\hline System Variable & innodb_redo_log_archive_dirs \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Default Value & NULL \\
\hline
\end{tabular}

Defines labeled directories where redo log archive files can be created. You can define multiple labeled directories in a semicolon-separated list. For example:
```
innodb_redo_log_archive_dirs='label1:/backups1;label2:/backups2'
```


A label can be any string of characters, with the exception of colons (:), which are not permitted. An empty label is also permitted, but the colon (:) is still required in this case.

A path must be specified, and the directory must exist. The path can contain colons ( ${ }^{\prime}:$ '), but semicolons (;) are not permitted.
- innodb_redo_log_capacity

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-redo-log-capacity=\# \\
\hline System Variable & innodb_redo_log_capacity \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 104857600 \\
\hline Minimum Value & 8388608 \\
\hline Maximum Value & 549755813888 \\
\hline Unit & bytes \\
\hline
\end{tabular}

Defines the amount of disk space occupied by redo log files.
innodb_redo_log_capacity supercedes the innodb_log_files_in_group and innodb_log_file_size variables, which are both ignored if innodb_redo_log_capacity is defined.

If innodb_redo_log_capacity is not defined, and if neither innodb_log_file_size or innodb_log_files_in_group are defined, then the default innodb_redo_log_capacity value is used.

If innodb_redo_log_capacity is not defined, and if innodb_log_file_size and/or innodb_log_files_in_group is defined, then the InnoDB redo log capacity is calculated as (innodb_log_files_in_group *innodb_log_file_size). This calculation does not modify the unused innodb_redo_log_capacity setting's value.

The Innodb_redo_log_capacity_resized server status variable indicates the total redo log capacity for all redo log files.

If the server is started with --innodb-dedicated-server, the value of innodb_redo_log_capacity is set automatically if it is not explicitly defined. For more information, see Section 17.8.12, "Enabling Automatic InnoDB Configuration for a Dedicated MySQL Server".

For more information, see Section 17.6.5, "Redo Log".
- innodb_redo_log_encrypt

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-redo-log-encrypt [=\{OFF|ON\}] \\
\hline System Variable & innodb_redo_log_encrypt \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & 0FF \\
\hline
\end{tabular}

Controls encryption of redo log data for tables encrypted using the InnoDB data-at-rest encryption feature. Encryption of redo log data is disabled by default. For more information, see Redo Log Encryption.
- innodb_replication_delay

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-replication-delay=\# \\
\hline System Variable & innodb_replication_delay \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 4294967295 \\
\hline Unit & milliseconds \\
\hline
\end{tabular}

The replication thread delay in milliseconds on a replica server if innodb_thread_concurrency is reached.
- innodb_rollback_on_timeout

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-rollback-on-timeout[=\{OFF| ON\}] \\
\hline System Variable & innodb_rollback_on_timeout \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

InnoDB rolls back only the last statement on a transaction timeout by default. If - - innodb -rollback-on-timeout is specified, a transaction timeout causes InnoDB to abort and roll back the entire transaction.

For more information, see Section 17.20.5, "InnoDB Error Handling".
- innodb_rollback_segments

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-rollback-segments=\# \\
\hline System Variable & innodb_rollback_segments \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Type & Integer \\
\hline Default Value & 128 \\
\hline Minimum Value & 1 \\
\hline Maximum Value & 128 \\
\hline
\end{tabular}
innodb_rollback_segments defines the number of rollback segments allocated to each undo tablespace and the global temporary tablespace for transactions that generate undo records. The number of transactions that each rollback segment supports depends on the InnoDB page size and the number of undo logs assigned to each transaction. For more information, see Section 17.6.6, "Undo Logs".

For related information, see Section 17.3, "InnoDB Multi-Versioning". For information about undo tablespaces, see Section 17.6.3.4, "Undo Tablespaces".
- innodb_saved_page_number_debug

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-saved-page-number-debug=\# \\
\hline System Variable & innodb_saved_page_number_debug \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 2**32-1 \\
\hline
\end{tabular}

Saves a page number. Setting the innodb_fil_make_page_dirty_debug option dirties the page defined by innodb_saved_page_number_debug. The innodb_saved_page_number_debug option is only available if debugging support is compiled in using the WITH_DEBUG CMake option.
- innodb_segment_reserve_factor

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-segment-reserve-factor=\# \\
\hline System Variable & innodb_segment_reserve_factor \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Numeric \\
\hline Default Value & 12.5 \\
\hline Minimum Value & 0.03 \\
\hline Maximum Value & 40 \\
\hline
\end{tabular}

Defines the percentage of tablespace file segment pages reserved as empty pages. The setting is applicable to file-per-table and general tablespaces. The innodb_segment_reserve_factor default setting is 12.5 percent, which is the same percentage of pages reserved in previous MySQL releases.

For more information, see Configuring the Percentage of Reserved File Segment Pages.
- innodb_sort_buffer_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-sort-buffer-size=\# \\
\hline System Variable & innodb_sort_buffer_size \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 1048576 \\
\hline Minimum Value & 65536 \\
\hline Maximum Value & 67108864 \\
\hline Unit & bytes \\
\hline
\end{tabular}

This variable defines the amount by which the temporary log file is extended when recording concurrent DML during an online DDL operation, and the size of the temporary log file read buffer and write buffer.

For more information, see Section 17.12.3, "Online DDL Space Requirements".
- innodb_spin_wait_delay

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-spin-wait-delay=\# \\
\hline System Variable & innodb_spin_wait_delay \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 6 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 1000 \\
\hline
\end{tabular}

The maximum delay between polls for a spin lock. The low-level implementation of this mechanism varies depending on the combination of hardware and operating system, so the delay does not correspond to a fixed time interval.

Can be used in combination with the innodb_spin_wait_pause_multiplier variable for greater control over the duration of spin-lock polling delays.

For more information, see Section 17.8.8, "Configuring Spin Lock Polling".
- innodb_spin_wait_pause_multiplier

\begin{tabular}{|l|l|l|}
\hline \multirow{6}{*}{} & Command-Line Format & --innodb-spin-wait-pausemultiplier=\# \\
\hline & System Variable & innodb_spin_wait_pause_multiplier \\
\hline & Scope & Global \\
\hline & Dynamic & Yes \\
\hline & SET_VAR Hint Applies & No \\
\hline & Type & Integer \\
\hline 3222 & Default Value & 50 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Minimum Value & 0 \\
\hline Maximum Value & 100 \\
\hline
\end{tabular}

Defines a multiplier value used to determine the number of PAUSE instructions in spin-wait loops that occur when a thread waits to acquire a mutex or rw-lock.

For more information, see Section 17.8.8, "Configuring Spin Lock Polling".
- innodb_stats_auto_recalc

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-stats-auto-recalc[=\{0FF| ON\}] \\
\hline System Variable & innodb_stats_auto_recalc \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & ON \\
\hline
\end{tabular}

Causes InnoDB to automatically recalculate persistent statistics after the data in a table is changed substantially. The threshold value is $10 \%$ of the rows in the table. This setting applies to tables created when the innodb_stats_persistent option is enabled. Automatic statistics recalculation may also be configured by specifying STATS_AUTO_RECALC=1 in a CREATE TABLE or ALTER TABLE statement. The amount of data sampled to produce the statistics is controlled by the innodb_stats_persistent_sample_pages variable.

For more information, see Section 17.8.10.1, "Configuring Persistent Optimizer Statistics Parameters".
- innodb_stats_include_delete_marked

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-stats-include-deletemarked[=\{OFF|ON\}] \\
\hline System Variable & innodb_stats_include_delete_marked \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

By default, InnoDB reads uncommitted data when calculating statistics. In the case of an uncommitted transaction that deletes rows from a table, InnoDB excludes records that are delete-marked when calculating row estimates and index statistics, which can lead to nonoptimal execution plans for other transactions that are operating on the table concurrently using a transaction isolation level other than READ UNCOMMITTED. To avoid this scenario,
innodb_stats_include_delete_marked can be enabled to ensure that InnoDB includes delete-marked records when calculating persistent optimizer statistics.

When innodb_stats_include_delete_marked is enabled, ANALYZE TABLE considers deletemarked records when recalculating statistics.
innodb_stats_include_delete_marked is a global setting that affects all InnoDB tables. It is only applicable to persistent optimizer statistics.

For related information, see Section 17.8.10.1, "Configuring Persistent Optimizer Statistics Parameters".
- innodb_stats_method

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-stats-method=value \\
\hline System Variable & innodb_stats_method \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Enumeration \\
\hline Default Value & nulls_equal \\
\hline Valid Values & \begin{tabular}{l}
nulls_equal \\
nulls_unequal \\
nulls_ignored
\end{tabular} \\
\hline
\end{tabular}

How the server treats NULL values when collecting statistics about the distribution of index values for InnoDB tables. Permitted values are nulls_equal, nulls_unequal, and nulls_ignored. For nulls_equal, all NULL index values are considered equal and form a single value group with a size equal to the number of NULL values. For nulls_unequal, NULL values are considered unequal, and each NULL forms a distinct value group of size 1. For nulls_ignored, NULL values are ignored.

The method used to generate table statistics influences how the optimizer chooses indexes for query execution, as described in Section 10.3.8, "InnoDB and MyISAM Index Statistics Collection".
- innodb_stats_on_metadata

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-stats-on-metadata[=\{0FF| ON\}] \\
\hline System Variable & innodb_stats_on_metadata \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & 0FF \\
\hline
\end{tabular}

This option only applies when optimizer statistics are configured to be non-persistent. Optimizer statistics are not persisted to disk when innodb_stats_persistent is disabled or when individual tables are created or altered with STATS_PERSISTENT=0. For more information, see Section 17.8.10.2, "Configuring Non-Persistent Optimizer Statistics Parameters".

When innodb_stats_on_metadata is enabled, InnoDB updates non-persistent statistics when metadata statements such as SHOW TABLE STATUS or when accessing the Information Schema

TABLES or STATISTICS tables. (These updates are similar to what happens for ANALYZE TABLE.) When disabled, InnoDB does not update statistics during these operations. Leaving the setting disabled can improve access speed for schemas that have a large number of tables or indexes. It can also improve the stability of execution plans for queries that involve InnoDB tables.

To change the setting, issue the statement SET GLOBAL innodb_stats_on_metadata=mode, where mode is either ON or OFF (or 1 or 0 ). Changing the setting requires privileges sufficient to set global system variables (see Section 7.1.9.1, "System Variable Privileges") and immediately affects the operation of all connections.
- innodb_stats_persistent

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-stats-persistent[=\{OFF|ON\}] \\
\hline System Variable & innodb_stats_persistent \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & ON \\
\hline
\end{tabular}

Specifies whether InnoDB index statistics are persisted to disk. Otherwise, statistics may be recalculated frequently which can lead to variations in query execution plans. This setting is stored with each table when the table is created. You can set innodb_stats_persistent at the global level before creating a table, or use the STATS_PERSISTENT clause of the CREATE TABLE and ALTER TABLE statements to override the system-wide setting and configure persistent statistics for individual tables.

For more information, see Section 17.8.10.1, "Configuring Persistent Optimizer Statistics Parameters".
- innodb_stats_persistent_sample_pages

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-stats-persistent-samplepages=\# \\
\hline System Variable & innodb_stats_persistent_sample_pages \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 20 \\
\hline Minimum Value & 1 \\
\hline Maximum Value & 18446744073709551615 \\
\hline
\end{tabular}

The number of index pages to sample when estimating cardinality and other statistics for an indexed column, such as those calculated by ANALYZE TABLE. Increasing the value improves the accuracy of index statistics, which can improve the query execution plan, at the expense of increased I/O during the execution of ANALYZE TABLE for an InnoDB table. For more information, see Section 17.8.10.1, "Configuring Persistent Optimizer Statistics Parameters".

\section*{Note}

Setting a high value for innodb_stats_persistent_sample_pages could result in lengthy ANALYZE TABLE execution time. To estimate the number of database pages accessed by ANALYZE TABLE, see
innodb_stats_persistent_sample_pages only applies when innodb_stats_persistent is enabled for a table; when innodb_stats_persistent is disabled, innodb_stats_transient_sample_pages applies instead.
- innodb_stats_transient_sample_pages

\begin{table}
\captionsetup{labelformat=empty}
\caption{Section 17.8.10.3, "Estimating ANALYZE TABLE Complexity for InnoDB Tables".}
\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-stats-transient-samplepages=\# \\
\hline System Variable & innodb_stats_transient_sample_pages \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 8 \\
\hline Minimum Value & 1 \\
\hline Maximum Value & 18446744073709551615 \\
\hline
\end{tabular}
\end{table}

The number of index pages to sample when estimating cardinality and other statistics for an indexed column, such as those calculated by ANALYZE TABLE. The default value is 8 . Increasing the value improves the accuracy of index statistics, which can improve the query execution plan, at the expense of increased I/O when opening an InnoDB table or recalculating statistics. For more information, see Section 17.8.10.2, "Configuring Non-Persistent Optimizer Statistics Parameters".

\section*{Note}

Setting a high value for innodb_stats_transient_sample_pages could result in lengthy ANALYZE TABLE execution time. To estimate the number of database pages accessed by ANALYZE TABLE, see Section 17.8.10.3, "Estimating ANALYZE TABLE Complexity for InnoDB Tables".
innodb_stats_transient_sample_pages only applies when innodb_stats_persistent is disabled for a table; when innodb_stats_persistent is enabled, innodb_stats_persistent_sample_pages applies instead. Takes the place of innodb_stats_sample_pages that was removed in MySQL 8.0. For more information, see Section 17.8.10.2, "Configuring Non-Persistent Optimizer Statistics Parameters".
- innodb_status_output

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-status-output[=\{OFF|ON\}] \\
\hline System Variable & innodb_status_output \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & 0FF \\
\hline
\end{tabular}

Enables or disables periodic output for the standard InnoDB Monitor. Also used in combination with innodb_status_output_locks to enable or disable periodic output for the InnoDB Lock Monitor. For more information, see Section 17.17.2, "Enabling InnoDB Monitors".
- innodb_status_output_locks

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-status-output-locks[=\{OFF| ON\}] \\
\hline System Variable & innodb_status_output_locks \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

Enables or disables the InnodB Lock Monitor. When enabled, the InnoDB Lock Monitor prints additional information about locks in SHOW ENGINE INNODB STATUS output and in periodic output printed to the MySQL error log. Periodic output for the InnoDB Lock Monitor is printed as part of the standard InnoDB Monitor output. The standard InnoDB Monitor must therefore be enabled for the InnoDB Lock Monitor to print data to the MySQL error log periodically. For more information, see Section 17.17.2, "Enabling InnoDB Monitors".
- innodb_strict_mode

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-strict-mode[=\{OFF|ON\}] \\
\hline System Variable & innodb_strict_mode \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & ON \\
\hline
\end{tabular}

When innodb_strict_mode is enabled, InnoDB returns errors rather than warnings when checking for invalid or incompatible table options.

It checks that KEY_BLOCK_SIZE, ROW_FORMAT, DATA DIRECTORY, TEMPORARY, and TABLESPACE options are compatible with each other and other settings.
innodb_strict_mode=0N also enables a row size check when creating or altering a table, to prevent INSERT or UPDATE from failing due to the record being too large for the selected page size.

You can enable or disable innodb_strict_mode on the command line when starting mysqld, or in a MySQL configuration file. You can also enable or disable innodb_strict_mode at runtime with the statement SET [GLOBAL|SESSION] innodb_strict_mode=mode, where mode is either ON or OFF. Changing the GLOBAL setting requires privileges sufficient to set global system variables (see Section 7.1.9.1, "System Variable Privileges") and affects the operation of all clients that subsequently connect. Any client can change the SESSION setting for innodb_strict_mode, and the setting affects only that client.

Setting the session value of this system variable is a restricted operation. The session user must have privileges sufficient to set restricted session variables. See Section 7.1.9.1, "System Variable Privileges".
- innodb_sync_array_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - innodb - sync - array - size $=\#$ \\
\hline System Variable & innodb_sync_array_size \\
\hline Scope & Global \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 1 \\
\hline Minimum Value & 1 \\
\hline Maximum Value & 1024 \\
\hline
\end{tabular}

Defines the size of the mutex/lock wait array. Increasing the value splits the internal data structure used to coordinate threads, for higher concurrency in workloads with large numbers of waiting threads. This setting must be configured when the MySQL instance is starting up, and cannot be changed afterward. Increasing the value is recommended for workloads that frequently produce a large number of waiting threads, typically greater than 768 .
- innodb_sync_spin_loops

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-sync-spin-loops=\# \\
\hline System Variable & innodb_sync_spin_loops \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 30 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 4294967295 \\
\hline
\end{tabular}

The number of times a thread waits for an InnoDB mutex to be freed before the thread is suspended.
- innodb_sync_debug

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-sync-debug[=\{OFF|ON\}] \\
\hline System Variable & innodb_sync_debug \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

Enables sync debug checking for the InnoDB storage engine. This option is only available if debugging support is compiled in using the WITH_DEBUG CMake option.
- innodb_table_locks

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-table-locks[=\{OFF|ON\}] \\
\hline System Variable & innodb_table_locks \\
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

If autocommit = 0, InnoDB honors LOCK TABLES; MySQL does not return from LOCK TABLES ... WRITE until all other threads have released all their locks to the table. The default value of innodb_table_locks is 1 , which means that LOCK TABLES causes InnoDB to lock a table internally if autocommit $=0$.
innodb_table_locks = 0 has no effect for tables locked explicitly with LOCK TABLES . . . WRITE. It does have an effect for tables locked for read or write by LOCK TABLES ... WRITE implicitly (for example, through triggers) or by LOCK TABLES ... READ.

For related information, see Section 17.7, "InnoDB Locking and Transaction Model".
- innodb_temp_data_file_path

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-temp-data-filepath=file_name \\
\hline System Variable & innodb_temp_data_file_path \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Default Value & ibtmp1:12M:autoextend \\
\hline
\end{tabular}

Defines the relative path, name, size, and attributes of global temporary tablespace data files. The global temporary tablespace stores rollback segments for changes made to user-created temporary tables.

If no value is specified for innodb_temp_data_file_path, the default behavior is to create a single auto-extending data file named ibtmp1 in the innodb_data_home_dir directory. The initial file size is slightly larger than 12 MB .

The syntax for a global temporary tablespace data file specification includes the file name, file size, and autoextend and max attributes:
```
file_name:file_size[:autoextend[:max:max_file_size]]
```


The global temporary tablespace data file cannot have the same name as another InnoDB data file. Any inability or error creating the global temporary tablespace data file is treated as fatal and server startup is refused.

File sizes are specified in $\mathrm{KB}, \mathrm{MB}$, or GB by appending $\mathrm{K}, \mathrm{M}$ or G to the size value. The sum of file sizes must be slightly larger than 12 MB .

The size limit of individual files is determined by the operating system. File size can be more than 4GB on operating systems that support large files. Use of raw disk partitions for global temporary tablespace data files is not supported.

The autoextend and max attributes can be used only for the data file specified last in the innodb_temp_data_file_path setting. For example:
```
[mysqld]
```

innodb_temp_data_file_path=ibtmp1:50M;ibtmp2:12M:autoextend:max:500M
The autoextend option causes the data file to automatically increase in size when it runs out of free space. The autoextend increment is 64 MB by default. To modify the increment, change the innodb_autoextend_increment variable setting.

The directory path for global temporary tablespace data files is formed by concatenating the paths defined by innodb_data_home_dir and innodb_temp_data_file_path.

Before running InnoDB in read-only mode, set innodb_temp_data_file_path to a location outside of the data directory. The path must be relative to the data directory. For example:
--innodb-temp-data-file-path=../../../tmp/ibtmp1:12M:autoextend
For more information, see Global Temporary Tablespace.
- innodb_temp_tablespaces_dir

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-temp-tablespacesdir=dir_name \\
\hline System Variable & innodb_temp_tablespaces_dir \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Directory name \\
\hline Default Value & \#innodb_temp \\
\hline
\end{tabular}

Defines the location where InnoDB creates a pool of session temporary tablespaces at startup. The default location is the \#innodb_temp directory in the data directory. A fully qualified path or path relative to the data directory is permitted.

Session temporary tablespaces always store user-created temporary tables and internal temporary tables created by the optimizer using InnoDB. (Previously, the on-disk storage engine for internal temporary tables was determined by the internal_tmp_disk_storage_engine system variable, which is no longer supported. See Storage Engine for On-Disk Internal Temporary Tables.)

For more information, see Session Temporary Tablespaces.
- innodb_thread_concurrency

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-thread-concurrency=\# \\
\hline System Variable & innodb_thread_concurrency \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Maximum Value & 1000
\end{tabular}

Defines the maximum number of threads permitted inside of InnoDB. A value of 0 (the default) is interpreted as infinite concurrency (no limit). This variable is intended for performance tuning on high concurrency systems.

InnoDB tries to keep the number of threads inside InnoDB less than or equal to the innodb_thread_concurrency limit. Threads waiting for locks are not counted in the number of concurrently executing threads.

The correct setting depends on workload and computing environment. Consider setting this variable if your MySQL instance shares CPU resources with other applications or if your workload or number of concurrent users is growing. Test a range of values to determine the setting that provides the best performance. innodb_thread_concurrency is a dynamic variable, which permits experimenting with different settings on a live test system. If a particular setting performs poorly, you can quickly set innodb_thread_concurrency back to 0 .

Use the following guidelines to help find and maintain an appropriate setting:
- If the number of concurrent user threads for a workload is consistently small and does not affect performance, set innodb_thread_concurrency=0 (no limit).
- If your workload is consistently heavy or occasionally spikes, set an innodb_thread_concurrency value and adjust it until you find the number of threads that provides the best performance. For example, suppose that your system typically has 40 to 50 users, but periodically the number increases to 60,70 , or more. Through testing, you find that performance remains largely stable with a limit of 80 concurrent users. In this case, set innodb_thread_concurrency to 80.
- If you do not want InnoDB to use more than a certain number of virtual CPUs for user threads (20 virtual CPUs, for example), set innodb_thread_concurrency to this number (or possibly lower, depending on performance testing). If your goal is to isolate MySQL from other applications, consider binding the mysqld process exclusively to the virtual CPUs. Be aware, however, that exclusive binding can result in non-optimal hardware usage if the mysqld process is not consistently busy. In this case, you can bind the mysqld process to the virtual CPUs but allow other applications to use some or all of the virtual CPUs.

\section*{Note}

From an operating system perspective, using a resource management solution to manage how CPU time is shared among applications may be preferable to binding the mysqld process. For example, you could assign $90 \%$ of virtual CPU time to a given application while other critical processes are not running, and scale that value back to $40 \%$ when other critical processes are running.
- In some cases, the optimal innodb_thread_concurrency setting can be smaller than the number of virtual CPUs.
- An innodb_thread_concurrency value that is too high can cause performance regression due to increased contention on system internals and resources.
- Monitor and analyze your system regularly. Changes to workload, number of users, or computing environment may require that you adjust the innodb_thread_concurrency setting.

A value of 0 disables the queries inside InnoDB and queries in queue counters in the ROW OPERATIONS section of SHOW ENGINE INNODB STATUS output.

For related information, see Section 17.8.4, "Configuring Thread Concurrency for InnoDB".
- innodb_thread_sleep_delay

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-thread-sleep-delay=\# \\
\hline System Variable & innodb_thread_sleep_delay \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 10000 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 1000000 \\
\hline Unit & microseconds \\
\hline
\end{tabular}

How long InnoDB threads sleep before joining the InnoDB queue, in microseconds. The default value is 10000. A value of 0 disables sleep. You can set innodb_adaptive_max_sleep_delay to the highest value you would allow for innodb_thread_sleep_delay, and InnoDB automatically adjusts innodb_thread_sleep_delay up or down depending on current thread-scheduling activity. This dynamic adjustment helps the thread scheduling mechanism to work smoothly during times when the system is lightly loaded or when it is operating near full capacity.

For more information, see Section 17.8.4, "Configuring Thread Concurrency for InnoDB".
- innodb_tmpdir

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-tmpdir=dir_name \\
\hline System Variable & innodb_tmpdir \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Directory name \\
\hline Default Value & NULL \\
\hline
\end{tabular}

Used to define an alternate directory for temporary sort files created during online ALTER TABLE operations that rebuild the table.

Online ALTER TABLE operations that rebuild the table also create an intermediate table file in the same directory as the original table. The innodb_tmpdir option is not applicable to intermediate table files.

A valid value is any directory path other than the MySQL data directory path. If the value is NULL (the default), temporary files are created MySQL temporary directory (\$TMPDIR on Unix, \%TEMP $\%$ on Windows, or the directory specified by the --tmpdir configuration option). If a directory is specified, existence of the directory and permissions are only checked when innodb_tmpdir is configured using a SET statement. If a symlink is provided in a directory string, the symlink is resolved and stored as an absolute path. The path should not exceed 512 bytes. An online ALTER

TABLE operation reports an error if innodb_tmpdir is set to an invalid directory. innodb_tmpdir overrides the MySQL tmpdir setting but only for online ALTER TABLE operations.

The FILE privilege is required to configure innodb_tmpdir.
The innodb_tmpdir option was introduced to help avoid overflowing a temporary file directory located on a tmpfs file system. Such overflows could occur as a result of large temporary sort files created during online ALTER TABLE operations that rebuild the table.

In replication environments, only consider replicating the innodb_tmpdir setting if all servers have the same operating system environment. Otherwise, replicating the innodb_tmpdir setting could result in a replication failure when running online ALTER TABLE operations that rebuild the table. If server operating environments differ, it is recommended that you configure innodb_tmpdir on each server individually.

For more information, see Section 17.12.3, "Online DDL Space Requirements". For information about online ALTER TABLE operations, see Section 17.12, "InnoDB and Online DDL".
- innodb_trx_purge_view_update_only_debug

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-trx-purge-view-update-onlydebug[=\{OFF|ON\}] \\
\hline System Variable & innodb_trx_purge_view_update_only_debug \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & 0FF \\
\hline
\end{tabular}

Pauses purging of delete-marked records while allowing the purge view to be updated. This option artificially creates a situation in which the purge view is updated but purges have not yet been performed. This option is only available if debugging support is compiled in using the WITH_DEBUG CMake option.
- innodb_trx_rseg_n_slots_debug

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-trx-rseg-n-slots-debug=\# \\
\hline System Variable & innodb_trx_rseg_n_slots_debug \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 1024 \\
\hline
\end{tabular}

Sets a debug flag that limits TRX_RSEG_N_SLOTS to a given value for the trx_rsegf_undo_find_free function that looks for free slots for undo log segments. This option is only available if debugging support is compiled in using the WITH_DEBUG CMake option.
- innodb_undo_directory

\begin{tabular}{|l|l|}
\hline System Variable & innodb_undo_directory \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Directory name \\
\hline
\end{tabular}

The path where InnoDB creates undo tablespaces. Typically used to place undo tablespaces on a different storage device.

There is no default value (it is NULL). If the innodb_undo_directory variable is undefined, undo tablespaces are created in the data directory.

The default undo tablespaces (innodb_undo_001 and innodb_undo_002) created when the MySQL instance is initialized always reside in the directory defined by the innodb_undo_directory variable.

Undo tablespaces created using CREATE UNDO TABLESPACE syntax are created in the directory defined by the innodb_undo_directory variable if a different path is not specified.

For more information, see Section 17.6.3.4, "Undo Tablespaces".
- innodb_undo_log_encrypt

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-undo-log-encrypt[=\{OFF|ON\}] \\
\hline System Variable & innodb_undo_log_encrypt \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

Controls encryption of undo log data for tables encrypted using the InnoDB data-at-rest encryption feature. Only applies to undo logs that reside in separate undo tablespaces. See Section 17.6.3.4, "Undo Tablespaces". Encryption is not supported for undo log data that resides in the system tablespace. For more information, see Undo Log Encryption.
- innodb_undo_log_truncate

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-undo-log-truncate[=\{OFF| ON\}] \\
\hline System Variable & innodb_undo_log_truncate \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & ON \\
\hline
\end{tabular}

When enabled, undo tablespaces that exceed the threshold value defined by innodb_max_undo_log_size are marked for truncation. Only undo tablespaces can be truncated.

Truncating undo logs that reside in the system tablespace is not supported. For truncation to occur, there must be at least two undo tablespaces.

The innodb_purge_rseg_truncate_frequency variable can be used to expedite truncation of undo tablespaces.

For more information, see Truncating Undo Tablespaces.
- innodb_undo_tablespaces

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-undo-tablespaces=\# \\
\hline Deprecated & Yes \\
\hline System Variable & innodb_undo_tablespaces \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 2 \\
\hline Minimum Value & 2 \\
\hline Maximum Value & 127 \\
\hline
\end{tabular}

Defines the number of undo tablespaces used by InnoDB. The default and minimum value is 2 .
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3265.jpg?height=179&width=275&top_left_y=1304&top_left_x=397)

\section*{Note}

The innodb_undo_tablespaces variable is deprecated; setting it has no effect. You should expect it to be removed in a future MySQL release.

For more information, see Section 17.6.3.4, "Undo Tablespaces".
- innodb_use_fdatasync

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-use-fdatasync[=\{OFF | ON\}] \\
\hline System Variable & innodb_use_fdatasync \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & ON \\
\hline
\end{tabular}

On platforms that support fdatasync() system calls, having innodb_use_fdatasync enabled permits using fdatasync() instead of fsync() system calls for operating system flushes. An fdatasync() call does not flush changes to file metadata unless required for subsequent data retrieval, providing a potential performance benefit.

A subset of innodb_flush_method settings such as fsync, 0_DSYNC, and 0_DIRECT use fsync() system calls. The innodb_use_fdatasync variable is applicable when using those settings.

Before MySQL 8.4, this option was disabled by default.
- innodb_use_native_aio

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-use-native-aio[=\{OFF|ON\}] \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline System Variable & innodb_use_native_aio \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & ON \\
\hline
\end{tabular}

Specifies whether to use the asynchronous I/O subsystem. This variable cannot be changed while the server is running. Normally, you do not need to configure this option, because it is enabled by default.

This feature improves the scalability of heavily I/O-bound systems, which typically show many pending reads/writes in SHOW ENGINE INNODB STATUS output.

Running with a large number of InnoDB I/O threads, and especially running multiple such instances on the same server machine, can exceed capacity limits on Linux systems. In this case, you may receive the following error:

EAGAIN: The specified maxevents exceeds the user's limit of available events.
You can typically address this error by writing a higher limit to /proc/sys/fs/aio-max-nr.
However, if a problem with the asynchronous I/O subsystem in the OS prevents InnoDB from starting, you can start the server with innodb_use_native_aio=0. This option may also be disabled automatically during startup if InnoDB detects a potential problem such as a combination of tmpdir location, tmpfs file system, and Linux kernel that does not support AIO on tmpfs.

For more information, see Section 17.8.6, "Using Asynchronous I/O on Linux".
- innodb_validate_tablespace_paths

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-validate-tablespacepaths[=\{OFF|ON\}] \\
\hline System Variable & innodb_validate_tablespace_paths \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & ON \\
\hline
\end{tabular}

Controls tablespace file path validation. At startup, InnoDB validates the paths of known tablespace files against tablespace file paths stored in the data dictionary in case tablespace files have been moved to a different location. The innodb_validate_tablespace_paths variable permits disabling tablespace path validation. This feature is intended for environments where tablespaces files are not moved. Disabling path validation improves startup time on systems with a large number of tablespace files.

\section*{Warning}

Starting the server with tablespace path validation disabled after moving tablespace files can lead to undefined behavior.

For more information, see Section 17.6.3.7, "Disabling Tablespace Path Validation".
- innodb_version

The InnoDB version number. This is a legacy variable, the value is the same as the MySQL server version.
- innodb_write_io_threads

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-write-io-threads=\# \\
\hline System Variable & innodb_write_io_threads \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 4 \\
\hline Minimum Value & 1 \\
\hline Maximum Value & 64 \\
\hline
\end{tabular}

The number of I/O threads for write operations in InnoDB. The default value is 4 . Its counterpart for read threads is innodb_read_io_threads. For more information, see Section 17.8.5, "Configuring the Number of Background InnoDB I/O Threads". For general I/O tuning advice, see Section 10.5.8, "Optimizing InnoDB Disk I/O".

\section*{Note \\ On Linux systems, running multiple MySQL servers (typically more than 12) with default settings for innodb_read_io_threads, innodb_write_io_threads, and the Linux aio-max-nr setting can exceed system limits. Ideally, increase the aio-max-nr setting; as a workaround, you might reduce the settings for one or both of the MySQL variables.}

Also take into consideration the value of sync_binlog, which controls synchronization of the binary log to disk.

For general I/O tuning advice, see Section 10.5.8, "Optimizing InnoDB Disk I/O".

\subsection*{17.15 InnoDB INFORMATION_SCHEMA Tables}

This section provides information and usage examples for InnoDB INFORMATION_SCHEMA tables.
InnoDB INFORMATION_SCHEMA tables provide metadata, status information, and statistics about various aspects of the InnoDB storage engine. You can view a list of InnoDB INFORMATION_SCHEMA tables by issuing a SHOW TABLES statement on the INFORMATION_SCHEMA database:
```
mysql> SHOW TABLES FROM INFORMATION_SCHEMA LIKE 'INNODB%';
```


For table definitions, see Section 28.4, "INFORMATION_SCHEMA InnoDB Tables". For general information regarding the MySQL INFORMATION_SCHEMA database, see Chapter 28, INFORMATION_SCHEMA Tables.

\subsection*{17.15.1 InnoDB INFORMATION_SCHEMA Tables about Compression}

There are two pairs of InnoDB INFORMATION_SCHEMA tables about compression that can provide insight into how well compression is working overall:
- INNODB_CMP and INNODB_CMP_RESET provide information about the number of compression operations and the amount of time spent performing compression.
- INNODB_CMPMEM and INNODB_CMPMEM_RESET provide information about the way memory is allocated for compression.

\subsection*{17.15.1.1 INNODB_CMP and INNODB_CMP_RESET}

The INNODB_CMP and INNODB_CMP_RESET tables provide status information about operations related to compressed tables, which are described in Section 17.9, "InnoDB Table and Page Compression". The PAGE_SIZE column reports the compressed page size.

These two tables have identical contents, but reading from INNODB_CMP_RESET resets the statistics on compression and uncompression operations. For example, if you archive the output of INNODB_CMP_RESET every 60 minutes, you see the statistics for each hourly period. If you monitor the output of INNODB_CMP (making sure never to read INNODB_CMP_RESET), you see the cumulative statistics since InnoDB was started.

For the table definition, see Section 28.4.6, "The INFORMATION_SCHEMA INNODB_CMP and INNODB_CMP_RESET Tables".

\subsection*{17.15.1.2 INNODB_CMPMEM and INNODB_CMPMEM_RESET}

The INNODB_CMPMEM and INNODB_CMPMEM_RESET tables provide status information about compressed pages that reside in the buffer pool. Please consult Section 17.9, "InnoDB Table and Page Compression" for further information on compressed tables and the use of the buffer pool. The INNODB_CMP and INNODB_CMP_RESET tables should provide more useful statistics on compression.

\section*{Internal Details}

InnoDB uses a buddy allocator system to manage memory allocated to pages of various sizes, from 1 KB to 16 KB . Each row of the two tables described here corresponds to a single page size.

The INNODB_CMPMEM and INNODB_CMPMEM_RESET tables have identical contents, but reading from INNODB_CMPMEM_RESET resets the statistics on relocation operations. For example, if every 60 minutes you archived the output of INNODB_CMPMEM_RESET, it would show the hourly statistics. If you never read INNODB_CMPMEM_RESET and monitored the output of INNODB_CMPMEM instead, it would show the cumulative statistics since InnoDB was started.

For the table definition, see Section 28.4.7, "The INFORMATION_SCHEMA INNODB_CMPMEM and INNODB_CMPMEM_RESET Tables".

\subsection*{17.15.1.3 Using the Compression Information Schema Tables}

\section*{Example 17.1 Using the Compression Information Schema Tables}

The following is sample output from a database that contains compressed tables (see Section 17.9, "InnoDB Table and Page Compression", INNODB_CMP, INNODB_CMP_PER_INDEX, and INNODB_CMPMEM).

The following table shows the contents of INFORMATION_SCHEMA. INNODB_CMP under a light workload. The only compressed page size that the buffer pool contains is 8 K . Compressing or uncompressing pages has consumed less than a second since the time the statistics were reset, because the columns COMPRESS_TIME and UNCOMPRESS_TIME are zero.

\begin{tabular}{|l|l|l|l|l|l|}
\hline page size & compress ops & compress ops ok & compress time & uncompress ops & uncompress time \\
\hline 1024 & 0 & 0 & 0 & 0 & 0 \\
\hline 2048 & 0 & 0 & 0 & 0 & 0 \\
\hline 4096 & 0 & 0 & 0 & 0 & 0 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|}
\hline page size & compress ops & \begin{tabular}{l} 
compress ops \\
ok
\end{tabular} & compress time & \begin{tabular}{l} 
uncompress \\
ops
\end{tabular} & \begin{tabular}{l} 
uncompress \\
time
\end{tabular} \\
\hline 8192 & 1048 & 921 & 0 & 61 & 0 \\
\hline 16384 & 0 & 0 & 0 & 0 & 0 \\
\hline
\end{tabular}

According to INNODB_CMPMEM, there are 6169 compressed 8 KB pages in the buffer pool. The only other allocated block size is 64 bytes. The smallest PAGE_SIZE in INNODB_CMPMEM is used for block descriptors of those compressed pages for which no uncompressed page exists in the buffer pool. We see that there are 5910 such pages. Indirectly, we see that 259 (6169-5910) compressed pages also exist in the buffer pool in uncompressed form.

The following table shows the contents of INFORMATION_SCHEMA. INNODB_CMPMEM under a light workload. Some memory is unusable due to fragmentation of the memory allocator for compressed pages: SUM(PAGE_SIZE*PAGES_FREE)=6784. This is because small memory allocation requests are fulfilled by splitting bigger blocks, starting from the 16 K blocks that are allocated from the main buffer pool, using the buddy allocation system. The fragmentation is this low because some allocated blocks have been relocated (copied) to form bigger adjacent free blocks. This copying of SUM(PAGE_SIZE*RELOCATION_OPS) bytes has consumed less than a second (SUM(RELOCATION_TIME)=0).

\begin{tabular}{|l|l|l|l|l|}
\hline page size & pages used & pages free & relocation ops & relocation time \\
\hline 64 & 5910 & 0 & 2436 & 0 \\
\hline 128 & 0 & 1 & 0 & 0 \\
\hline 256 & 0 & 0 & 0 & 0 \\
\hline 512 & 0 & 1 & 0 & 0 \\
\hline 1024 & 0 & 0 & 0 & 0 \\
\hline 2048 & 0 & 1 & 0 & 0 \\
\hline 4096 & 0 & 1 & 0 & 0 \\
\hline 8192 & 6169 & 0 & 5 & 0 \\
\hline 16384 & 0 & 0 & 0 & 0 \\
\hline
\end{tabular}

\subsection*{17.15.2 InnoDB INFORMATION_SCHEMA Transaction and Locking Information}

One INFORMATION_SCHEMA table and two Performance Schema tables enable you to monitor InnoDB transactions and diagnose potential locking problems:
- INNODB_TRX: This INFORMATION_SCHEMA table provides information about every transaction currently executing inside InnoDB, including the transaction state (for example, whether it is running or waiting for a lock), when the transaction started, and the particular SQL statement the transaction is executing.
- data_locks: This Performance Schema table contains a row for each hold lock and each lock request that is blocked waiting for a held lock to be released:
- There is one row for each held lock, whatever the state of the transaction that holds the lock (INNODB_TRX. TRX_STATE is RUNNING, LOCK WAIT, ROLLING BACK or COMMITTING).
- Each transaction in InnoDB that is waiting for another transaction to release a lock (INNODB_TRX. TRX_STATE is LOCK WAIT) is blocked by exactly one blocking lock request. That blocking lock request is for a row or table lock held by another transaction in an incompatible mode. A lock request always has a mode that is incompatible with the mode of the held lock that blocks the request (read vs. write, shared vs. exclusive).

The blocked transaction cannot proceed until the other transaction commits or rolls back, thereby releasing the requested lock. For every blocked transaction, data_locks contains one row that describes each lock the transaction has requested, and for which it is waiting.
- data_lock_waits: This Performance Schema table indicates which transactions are waiting for a given lock, or for which lock a given transaction is waiting. This table contains one or more rows for each blocked transaction, indicating the lock it has requested and any locks that are blocking that request. The REQUESTING_ENGINE_LOCK_ID value refers to the lock requested by a transaction, and the BLOCKING_ENGINE_LOCK_ID value refers to the lock (held by another transaction) that prevents the first transaction from proceeding. For any given blocked transaction, all rows in data_lock_waits have the same value for REQUESTING_ENGINE_LOCK_ID and different values for BLOCKING_ENGINE_LOCK_ID.

For more information about the preceding tables, see Section 28.4.28, "The INFORMATION_SCHEMA INNODB_TRX Table", Section 29.12.13.1, "The data_locks Table", and Section 29.12.13.2, "The data_lock_waits Table".

\subsection*{17.15.2.1 Using InnoDB Transaction and Locking Information}

This section describes the use of locking information as exposed by the Performance Schema data_locks and data_lock_waits tables.

\section*{Identifying Blocking Transactions}

It is sometimes helpful to identify which transaction blocks another. The tables that contain information about InnoDB transactions and data locks enable you to determine which transaction is waiting for another, and which resource is being requested. (For descriptions of these tables, see Section 17.15.2, "InnoDB INFORMATION_SCHEMA Transaction and Locking Information".)

Suppose that three sessions are running concurrently. Each session corresponds to a MySQL thread, and executes one transaction after another. Consider the state of the system when these sessions have issued the following statements, but none has yet committed its transaction:
- Session A:
```
BEGIN;
SELECT a FROM t FOR UPDATE;
SELECT SLEEP(100);
```

- Session B:
```
SELECT b FROM t FOR UPDATE;
```

- Session C:
```
SELECT c FROM t FOR UPDATE;
```


In this scenario, use the following query to see which transactions are waiting and which transactions are blocking them:
```
SELECT
    r.trx_id waiting_trx_id,
    r.trx_mysql_thread_id waiting_thread,
    r.trx_query waiting_query,
    b.trx_id blocking_trx_id,
    b.trx_mysql_thread_id blocking_thread,
    b.trx_query blocking_query
FROM performance_schema.data_lock_waits w
INNER JOIN information_schema.innodb_trx b
    ON b.trx_id = w.blocking_engine_transaction_id
INNER JOIN information_schema.innodb_trx r
    ON r.trx_id = w.requesting_engine_transaction_id;
```


Or, more simply, use the sys schema innodb_lock_waits view:
```
SELECT
    waiting_trx_id,
    waiting_pid,
    waiting_query,
    blocking_trx_id,
    blocking_pid,
    blocking_query
FROM sys.innodb_lock_waits;
```


If a NULL value is reported for the blocking query, see Identifying a Blocking Query After the Issuing Session Becomes Idle.

\begin{tabular}{|l|l|l|l|l|l|}
\hline waiting trx id & waiting thread & waiting query & blocking trx id & blocking thread & blocking query \\
\hline A4 & 6 & SELECT b FROM t FOR UPDATE & A3 & 5 & SELECT SLEEP(100) \\
\hline A5 & 7 & SELECT c FROM t FOR UPDATE & A3 & 5 & SELECT SLEEP(100) \\
\hline A5 & 7 & SELECT c FROM t FOR UPDATE & A4 & 6 & SELECT b FROM t FOR UPDATE \\
\hline
\end{tabular}

In the preceding table, you can identify sessions by the "waiting query" or "blocking query" columns. As you can see:
- Session B (trx id A4, thread 6) and Session C (trx id A5, thread 7) are both waiting for Session A (trx id A 3 , thread 5 ).
- Session C is waiting for Session B as well as Session A.

You can see the underlying data in the INFORMATION_SCHEMA INNODB_TRX table and Performance Schema data_locks and data_lock_waits tables.

The following table shows some sample contents of the INNODB_TRX table.

\begin{tabular}{|l|l|l|l|l|l|l|l|}
\hline trx id & trx state & trx started & trx requested lock id & trx wait started & trx weight & trx mysql thread id & trx query \\
\hline A3 & RUNNING & 2008-01 -1 16:44:54 & & NULL & 2 & 5 & SELECT SLEEP(100) \\
\hline A4 & LOCK WAIT & 2008-01-1 16:45:09 & 5A4:1:3:2 & 2008-01-152 16:45:09 & & 6 & SELECT b FROM t FOR UPDATE \\
\hline A5 & LOCK WAIT & 2008-01-1 16:45:14 & 545:1:3:2 & 2008-01-152 16 : 45 : 14 & & 7 & SELECT c FROM t FOR UPDATE \\
\hline
\end{tabular}

The following table shows some sample contents of the data_locks table.

\begin{tabular}{|l|l|l|l|l|l|l|l|}
\hline lock id & lock trx id & lock mode & lock type & lock schema & lock table & lock index & lock data \\
\hline A3:1:3:2 & A3 & X & RECORD & test & t & PRIMARY & 0x0200 \\
\hline A4:1:3:2 & A4 & X & RECORD & test & t & PRIMARY & 0x0200 \\
\hline A5:1:3:2 & A5 & X & RECORD & test & t & PRIMARY & 0x0200 \\
\hline
\end{tabular}

The following table shows some sample contents of the data_lock_waits table.

\begin{tabular}{|l|l|l|l|}
\hline requesting trx id & requested lock id & blocking trx id & blocking lock id \\
\hline A4 & A4 $: 1: 3: 2$ & A3 & A3 $: 1: 3: 2$ \\
\hline A5 & A5 $: 1: 3: 2$ & A3 & A3 $: 1: 3: 2$ \\
\hline A5 & A5 $: 1: 3: 2$ & A4 & A4 $: 1: 3: 2$ \\
\hline
\end{tabular}

\section*{Identifying a Blocking Query After the Issuing Session Becomes Idle}

When identifying blocking transactions, a NULL value is reported for the blocking query if the session that issued the query has become idle. In this case, use the following steps to determine the blocking query:
1. Identify the processlist ID of the blocking transaction. In the sys.innodb_lock_waits table, the processlist ID of the blocking transaction is the blocking_pid value.
2. Using the blocking_pid, query the MySQL Performance Schema threads table to determine the THREAD_ID of the blocking transaction. For example, if the blocking_pid is 6 , issue this query:

SELECT THREAD_ID FROM performance_schema.threads WHERE PROCESSLIST_ID = 6;
3. Using the THREAD_ID, query the Performance Schema events_statements_current table to determine the last query executed by the thread. For example, if the THREAD_ID is 28, issue this query:

SELECT THREAD_ID, SQL_TEXT FROM performance_schema.events_statements_current
WHERE THREAD_ID $=28 \backslash \mathrm{G}$
4. If the last query executed by the thread is not enough information to determine why a lock is held, you can query the Performance Schema events_statements_history table to view the last 10 statements executed by the thread.

SELECT THREAD_ID, SQL_TEXT FROM performance_schema.events_statements_history
WHERE THREAD_ID = 28 ORDER BY EVENT_ID;

\section*{Correlating InnoDB Transactions with MySQL Sessions}

Sometimes it is useful to correlate internal InnoDB locking information with the session-level information maintained by MySQL. For example, you might like to know, for a given InnoDB transaction ID, the corresponding MySQL session ID and name of the session that may be holding a lock, and thus blocking other transactions.

The following output from the INFORMATION_SCHEMA INNODB_TRX table and Performance Schema data_locks and data_lock_waits tables is taken from a somewhat loaded system. As can be seen, there are several transactions running.

The following data_locks and data_lock_waits tables show that:
- Transaction 77F (executing an INSERT) is waiting for transactions 77E, 77D, and 77B to commit.
- Transaction 77E (executing an INSERT) is waiting for transactions 77D and 77B to commit.
- Transaction 77D (executing an INSERT) is waiting for transaction 77B to commit.
- Transaction 77B (executing an INSERT) is waiting for transaction 77A to commit.
- Transaction 77A is running, currently executing SELECT.
- Transaction E56 (executing an INSERT) is waiting for transaction E55 to commit.
- Transaction E55 (executing an INSERT) is waiting for transaction 19C to commit.
- Transaction 19 C is running, currently executing an INSERT.

\section*{Note}

There may be inconsistencies between queries shown in the INFORMATION_SCHEMA PROCESSLIST and INNODB_TRX tables. For an explanation, see Section 17.15.2.3, "Persistence and Consistency of InnoDB Transaction and Locking Information".

The following table shows the contents of the PROCESSLIST table for a system running a heavy workload.

\begin{tabular}{|l|l|l|l|l|l|l|l|}
\hline ID & USER & HOST & DB & COMMAND & TIME & STATE & INFO \\
\hline 384 & root & localhost & test & Query & 10 & update & \begin{tabular}{l}
INSERT \\
INTO t2 \\
VALUES ...
\end{tabular} \\
\hline 257 & root & localhost & test & Query & 3 & update & \begin{tabular}{l}
INSERT \\
INTO t2 \\
VALUES ...
\end{tabular} \\
\hline 130 & root & localhost & test & Query & 0 & update & \begin{tabular}{l}
INSERT \\
INTO t2 \\
VALUES ...
\end{tabular} \\
\hline 61 & root & localhost & test & Query & 1 & update & \begin{tabular}{l}
INSERT \\
INTO t2 \\
VALUES ...
\end{tabular} \\
\hline 8 & root & localhost & test & Query & 1 & update & \begin{tabular}{l}
INSERT \\
INTO t2 \\
VALUES ...
\end{tabular} \\
\hline 4 & root & localhost & test & Query & 0 & preparing & \begin{tabular}{l}
SELECT \\
* FROM \\
PROCESSLIST
\end{tabular} \\
\hline 2 & root & localhost & test & Sleep & 566 & & NULL \\
\hline
\end{tabular}

The following table shows the contents of the INNODB_TRX table for a system running a heavy workload.

\begin{tabular}{|l|l|l|l|l|l|l|l|}
\hline trx id & trx state & trx started & trx requested lock id & trx wait started & trx weight & trx mysql thread id & trx query \\
\hline 77F & LOCK WAIT & 2008-01-1 13:10:16 & 577F & 2008-01-151 13:10:16 & & 876 & INSERT INTO t09 (D, B, C) VALUES ... \\
\hline 77E & LOCK WAIT & 2008-01-1577E 13:10:16 & & 2008-01-151 13:10:16 & & 875 & INSERT INTO t09 (D, B, C) VALUES ... \\
\hline 77D & LOCK WAIT & 2008-01-157D 13:10:16 & & 2008-01-151 13:10:16 & & 874 & INSERT INTO t09 (D, B, C) VALUES ... \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|l|l|}
\hline trx id & trx state & trx started & trx requested lock id & trx wait started & trx weight & trx mysql thread id & trx query \\
\hline 77B & LOCK WAIT & 2008-01-1 13:10:16 & 577B:733:1 & 220108-01-154 13:10:16 & & 873 & INSERT INTO t09 (D, B, C) VALUES ... \\
\hline 77A & RUNNING & 2008-01-1 13:10:16 & BNULL & NULL & 4 & 872 & SELECT b, c FROM t09 WHERE ... \\
\hline E56 & LOCK WAIT & 2008-01-1 13:10:06 & E56:743:6 & :2008-01-15 13:10:06 & & 384 & INSERT INTO t2 VALUES ... \\
\hline E55 & LOCK WAIT & 2008-01-1 13:10:06 & 压55: 743:3 & 82008-01-1 13:10:13 & 5965 & 257 & INSERT INTO t2 VALUES ... \\
\hline 19C & RUNNING & 2008-01-1 13:09:10 & BNULL & NULL & 2900 & 130 & INSERT INTO t2 VALUES ... \\
\hline E15 & RUNNING & 2008-01-1 13:08:59 & NULL & NULL & 5395 & 61 & INSERT INTO t2 VALUES ... \\
\hline 51D & RUNNING & 2008-01-1 13:08:47 & BNULL & NULL & 9807 & 8 & INSERT INTO t2 VALUES ... \\
\hline
\end{tabular}

The following table shows the contents of the data_lock_waits table for a system running a heavy workload.

\begin{tabular}{|l|l|l|l|}
\hline requesting trx id & requested lock id & blocking trx id & blocking lock id \\
\hline 77F & 77F:806 & 77E & 77E:806 \\
\hline 77F & 77F:806 & 77D & 77D :806 \\
\hline 77F & 77F:806 & 77B & 77B:806 \\
\hline 77E & 77E:806 & 77D & 77D : 806 \\
\hline 77E & 77E:806 & 77B & 77B:806 \\
\hline 77D & 77D : 806 & 77B & 77B:806 \\
\hline 77B & 77B:733:12:1 & 77A & 77A:733:12:1 \\
\hline E56 & E56:743:6:2 & E55 & E55:743:6:2 \\
\hline E55 & E55:743:38:2 & 19C & 19C:743:38:2 \\
\hline
\end{tabular}

The following table shows the contents of the data_locks table for a system running a heavy workload.

\begin{tabular}{|l|l|l|l|l|l|l|l|}
\hline lock id & lock trx id & lock mode & lock type & lock schema & lock table & lock index & lock data \\
\hline 77F : 806 & 77F & AUTO_INC & TABLE & test & t09 & NULL & NULL \\
\hline 77E:806 & 77E & AUTO_INC & TABLE & test & t09 & NULL & NULL \\
\hline 77D : 806 & 77D & AUTO_INC & TABLE & test & t09 & NULL & NULL \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|l|l|}
\hline lock id & lock trx id & lock mode & lock type & lock schema & lock table & lock index & lock data \\
\hline 77B:806 & 77B & AUTO_INC & TABLE & test & t09 & NULL & NULL \\
\hline 77B:733:1 & 27:7B & X & RECORD & test & t09 & PRIMARY & supremum pseudorecord \\
\hline 77A:733:1 & 27:71A & X & RECORD & test & t09 & PRIMARY & supremum pseudorecord \\
\hline E56:743:6 & : 56 & S & RECORD & test & t2 & PRIMARY & 0, 0 \\
\hline E55:743:6 & : 255 & X & RECORD & test & t2 & PRIMARY & 0, 0 \\
\hline E55:743:3 & E:55 & S & RECORD & test & t2 & PRIMARY & 1922, 1922 \\
\hline 19C : 743 : 3 & 81:9C & X & RECORD & test & t2 & PRIMARY & 1922, 1922 \\
\hline
\end{tabular}

\subsection*{17.15.2.2 InnoDB Lock and Lock-Wait Information}

When a transaction updates a row in a table, or locks it with SELECT FOR UPDATE, InnoDB establishes a list or queue of locks on that row. Similarly, InnoDB maintains a list of locks on a table for table-level locks. If a second transaction wants to update a row or lock a table already locked by a prior transaction in an incompatible mode, InnoDB adds a lock request for the row to the corresponding queue. For a lock to be acquired by a transaction, all incompatible lock requests previously entered into the lock queue for that row or table must be removed (which occurs when the transactions holding or requesting those locks either commit or roll back).

A transaction may have any number of lock requests for different rows or tables. At any given time, a transaction may request a lock that is held by another transaction, in which case it is blocked by that other transaction. The requesting transaction must wait for the transaction that holds the blocking lock to commit or roll back. If a transaction is not waiting for a lock, it is in a RUNNING state. If a transaction is waiting for a lock, it is in a LOCK WAIT state. (The INFORMATION_SCHEMA INNODB_TRX table indicates transaction state values.)

The Performance Schema data_locks table holds one or more rows for each LOCK WAIT transaction, indicating any lock requests that prevent its progress. This table also contains one row describing each lock in a queue of locks pending for a given row or table. The Performance Schema data_lock_waits table shows which locks already held by a transaction are blocking locks requested by other transactions.

\subsection*{17.15.2.3 Persistence and Consistency of InnoDB Transaction and Locking Information}

The data exposed by the transaction and locking tables (INFORMATION_SCHEMA INNODB_TRX table, Performance Schema data_locks and data_lock_waits tables) represents a glimpse into fastchanging data. This is not like user tables, where the data changes only when application-initiated updates occur. The underlying data is internal system-managed data, and can change very quickly:
- Data might not be consistent between the INNODB_TRX, data_locks, and data_lock_waits tables.

The data_locks and data_lock_waits tables expose live data from the InnoDB storage engine, to provide lock information about the transactions in the INNODB_TRX table. Data retrieved from the lock tables exists when the SELECT is executed, but might be gone or changed by the time the query result is consumed by the client.

Joining data_locks with data_lock_waits can show rows in data_lock_waits that identify a parent row in data_locks that no longer exists or does not exist yet.
- Data in the transaction and locking tables might not be consistent with data in the INFORMATION_SCHEMA PROCESSLIST table or Performance Schema threads table.

For example, you should be careful when comparing data in the InnoDB transaction and locking tables with data in the PROCESSLIST table. Even if you issue a single SELECT (joining INNODB_TRX and PROCESSLIST, for example), the content of those tables is generally not consistent. It is possible for INNODB_TRX to reference rows that are not present in PROCESSLIST or for the currently executing SQL query of a transaction shown in INNODB_TRX. TRX_QUERY to differ from the one in PROCESSLIST. INFO.

\subsection*{17.15.3 InnoDB INFORMATION_SCHEMA Schema Object Tables}

You can extract metadata about schema objects managed by InnoDB using InnoDB INFORMATION_SCHEMA tables. This information comes from the data dictionary. Traditionally, you would get this type of information using the techniques from Section 17.17, "InnoDB Monitors", setting up InnoDB monitors and parsing the output from the SHOW ENGINE INNODB STATUS statement. The InnoDB INFORMATION_SCHEMA table interface allows you to query this data using SQL.

InnoDB INFORMATION_SCHEMA schema object tables include the tables listed here:
- INNODB_DATAFILES
- INNODB_TABLESTATS
- INNODB_FOREIGN
- INNODB_COLUMNS
- INNODB_INDEXES
- INNODB_FIELDS
- INNODB_TABLESPACES
- INNODB_TABLESPACES_BRIEF
- INNODB_FOREIGN_COLS
- INNODB_TABLES

The table names are indicative of the type of data provided:
- INNODB_TABLES provides metadata about InnoDB tables.
- INNODB_COLUMNS provides metadata about InnoDB table columns.
- INNODB_INDEXES provides metadata about InnoDB indexes.
- INNODB_FIELDS provides metadata about the key columns (fields) of InnoDB indexes.
- INNODB_TABLESTATS provides a view of low-level status information about InnoDB tables that is derived from in-memory data structures.
- INNODB_DATAFILES provides data file path information for InnoDB file-per-table and general tablespaces.
- INNODB_TABLESPACES provides metadata about InnoDB file-per-table, general, and undo tablespaces.
- INNODB_TABLESPACES_BRIEF provides a subset of metadata about InnoDB tablespaces.
- INNODB_FOREIGN provides metadata about foreign keys defined on InnoDB tables.
- INNODB_FOREIGN_COLS provides metadata about the columns of foreign keys that are defined on InnodB tables.

InnoDB INFORMATION_SCHEMA schema object tables can be joined together through fields such as TABLE_ID, INDEX_ID, and SPACE, allowing you to easily retrieve all available data for an object you want to study or monitor.

Refer to the InnoDB INFORMATION_SCHEMA documentation for information about the columns of each table.

\section*{Example 17.2 InnoDB INFORMATION_SCHEMA Schema Object Tables}

This example uses a simple table (t1) with a single index (i1) to demonstrate the type of metadata found in the InnoDB INFORMATION_SCHEMA schema object tables.
1. Create a test database and table t1:
```
mysql> CREATE DATABASE test;
mysql> USE test;
mysql> CREATE TABLE t1 (
    col1 INT,
    col2 CHAR(10),
    col3 VARCHAR(10))
    ENGINE = InnoDB;
mysql> CREATE INDEX i1 ON t1(col1);
```

2. After creating the table t1, query INNODB_TABLES to locate the metadata for test/t1:
```
mysql> SELECT * FROM INFORMATION_SCHEMA.INNODB_TABLES WHERE NAME='test/t1' \G
************************** 1. row ******************************
        TABLE_ID: 71
                NAME: test/t1
                FLAG: 1
            N_COLS: 6
                SPACE: 57
        ROW_FORMAT: Compact
ZIP_PAGE_SIZE: 0
    INSTANT_COLS: 0
```


Table t1 has a TABLE_ID of 71. The FLAG field provides bit level information about table format and storage characteristics. There are six columns, three of which are hidden columns created by InnoDB (DB_ROW_ID, DB_TRX_ID, and DB_ROLL_PTR). The ID of the table's SPACE is 57 (a value of 0 would indicate that the table resides in the system tablespace). The ROW_FORMAT is Compact. ZIP_PAGE_SIZE only applies to tables with a Compressed row format. INSTANT_COLS shows number of columns in the table prior to adding the first instant column using ALTER TABLE ... ADD COLUMN with ALGORITHM=INSTANT.
3. Using the TABLE_ID information from INNODB_TABLES, query the INNODB_COLUMNS table for information about the table's columns.
```
mysql> SELECT * FROM INFORMATION_SCHEMA.INNODB_COLUMNS where TABLE_ID = 71\G
************************** 1. row ******************************
        TABLE_ID: 71
                NAME: col1
                    POS: 0
                MTYPE: 6
            PRTYPE: 1027
                    LEN: 4
    HAS_DEFAULT: 0
DEFAULT_VALUE: NULL
************************** 2. row *****************************************
        TABLE_ID: 71
                NAME: col2
                    POS: 1
```

```
                MTYPE: 2
            PRTYPE: 524542
                    LEN: 10
    HAS_DEFAULT: 0
DEFAULT_VALUE: NULL
************************* 3. row *******************************
        TABLE_ID: 71
                    NAME: col3
                        POS: 2
                MTYPE: 1
            PRTYPE: 524303
                    LEN: 10
    HAS_DEFAULT: 0
DEFAULT_VALUE: NULL
```


In addition to the TABLE_ID and column NAME, INNODB_COLUMNS provides the ordinal position (POS) of each column (starting from 0 and incrementing sequentially), the column MTYPE or "main type" ( $6=$ INT, $2=$ CHAR, $1=$ VARCHAR), the PRTYPE or "precise type" (a binary value with bits that represent the MySQL data type, character set code, and nullability), and the column length (LEN). The HAS_DEFAULT and DEFAULT_VALUE columns only apply to columns added instantly using ALTER TABLE ... ADD COLUMN with ALGORITHM=INSTANT.
4. Using the TABLE_ID information from INNODB_TABLES once again, query INNODB_INDEXES for information about the indexes associated with table t1.
```
mysql> SELECT * FROM INFORMATION_SCHEMA.INNODB_INDEXES WHERE TABLE_ID = 71 \G
*************************** 1. r OW ***************************************
    INDEX_ID: 111
            NAME: GEN_CLUST_INDEX
    TABLE_ID: 71
            TYPE: 1
    N_FIELDS: 0
        PAGE_NO: 3
            SPACE: 57
MERGE_THRESHOLD: 50
************************* 2. row *******************************
    INDEX_ID: 112
            NAME: i1
    TABLE_ID: 71
            TYPE: 0
    N_FIELDS: 1
        PAGE_NO: 4
            SPACE: 57
MERGE_THRESHOLD: 50
```


INNODB_INDEXES returns data for two indexes. The first index is GEN_CLUST_INDEX, which is a clustered index created by InnoDB if the table does not have a user-defined clustered index. The second index (i1) is the user-defined secondary index.

The INDEX_ID is an identifier for the index that is unique across all databases in an instance. The TABLE_ID identifies the table that the index is associated with. The index TYPE value indicates the type of index ( $1=$ Clustered Index, $0=$ Secondary index). The N_FILEDS value is the number of fields that comprise the index. PAGE_NO is the root page number of the index B-tree, and SPACE is the ID of the tablespace where the index resides. A nonzero value indicates that the index does not reside in the system tablespace. MERGE_THRESHOLD defines a percentage threshold value for the amount of data in an index page. If the amount of data in an index page falls below the this value (the default is $50 \%$ ) when a row is deleted or when a row is shortened by an update operation, InnoDB attempts to merge the index page with a neighboring index page.
5. Using the INDEX_ID information from INNODB_INDEXES, query INNODB_FIELDS for information about the fields of index i1.
```
mysql> SELECT * FROM INFORMATION_SCHEMA.INNODB_FIELDS where INDEX_ID = 112 \G
*************************** 1. r OW ***************************************
INDEX_ID: 112
    NAME: col1
        POS: 0
```


INNODB_FIELDS provides the NAME of the indexed field and its ordinal position within the index. If the index (i1) had been defined on multiple fields, INNODB_FIELDS would provide metadata for each of the indexed fields.
6. Using the SPACE information from INNODB_TABLES, query INNODB_TABLESPACES table for information about the table's tablespace.
```
mysql> SELECT * FROM INFORMATION_SCHEMA.INNODB_TABLESPACES WHERE SPACE = 57 \G
************************* 1. rOW *****************************************
                SPACE: 57
                NAME: test/t1
                FLAG: 16417
    ROW_FORMAT: Dynamic
        PAGE_SIZE: 16384
    _PAGE_SIZE: 0
    SPACE_TYPE: Single
    FS_BLOCK_SIZE: 4096
            FILE_SIZE: 114688
ALLOCATED_SIZE: 98304
AUTOEXTEND_SIZE: 0
SERVER_VERSION: 8.4.0
    SPACE_VERSION: 1
        ENCRYPTION: N
                STATE: normal
```


In addition to the SPACE ID of the tablespace and the NAME of the associated table, INNODB_TABLESPACES provides tablespace FLAG data, which is bit level information about tablespace format and storage characteristics. Also provided are tablespace ROW_FORMAT, PAGE_SIZE, and several other tablespace metadata items.
7. Using the SPACE information from INNODB_TABLES once again, query INNODB_DATAFILES for the location of the tablespace data file.
```
mysql> SELECT * FROM INFORMATION_SCHEMA.INNODB_DATAFILES WHERE SPACE = 57 \G
*************************** 1. row ****************************************
SPACE: 57
    PATH: ./test/t1.ibd
```


The datafile is located in the test directory under MySQL's data directory. If a file-pertable tablespace were created in a location outside the MySQL data directory using the DATA DIRECTORY clause of the CREATE TABLE statement, the tablespace PATH would be a fully qualified directory path.
8. As a final step, insert a row into table t1 (TABLE_ID = 71) and view the data in the INNODB_TABLESTATS table. The data in this table is used by the MySQL optimizer to calculate which index to use when querying an InnoDB table. This information is derived from in-memory data structures.
```
mysql> INSERT INTO t1 VALUES(5, 'abc', 'def');
Query OK, 1 row affected (0.06 sec)
mysql> SELECT * FROM INFORMATION_SCHEMA.INNODB_TABLESTATS where TABLE_ID = 71 \G
************************** 1. row
        TABLE_ID: 71
                NAME: test/t1
STATS_INITIALIZED: Initialized
        NUM_ROWS: 1
    CLUST_INDEX_SIZE: 1
    OTHER_INDEX_SIZE: 0
    MODIFIED_COUNTER: 1
            AUTOINC: 0
        REF_COUNT : 1
```


The STATS_INITIALIZED field indicates whether or not statistics have been collected for the table. NUM_ROWS is the current estimated number of rows in the table. The CLUST_INDEX_SIZE and OTHER_INDEX_SIZE fields report the number of pages on disk that store clustered and
secondary indexes for the table, respectively. The MODIFIED_COUNTER value shows the number of rows modified by DML operations and cascade operations from foreign keys. The AUTOINC value is the next number to be issued for any autoincrement-based operation. There are no autoincrement columns defined on table t1, so the value is 0 . The REF_COUNT value is a counter. When the counter reaches 0 , it signifies that the table metadata can be evicted from the table cache.

\section*{Example 17.3 Foreign Key INFORMATION_SCHEMA Schema Object Tables}

The INNODB_FOREIGN and INNODB_FOREIGN_COLS tables provide data about foreign key relationships. This example uses a parent table and child table with a foreign key relationship to demonstrate the data found in the INNODB_FOREIGN and INNODB_FOREIGN_COLS tables.
1. Create the test database with parent and child tables:
```
mysql> CREATE DATABASE test;
mysql> USE test;
mysql> CREATE TABLE parent (id INT NOT NULL,
        PRIMARY KEY (id)) ENGINE=INNODB;
mysql> CREATE TABLE child (id INT, parent_id INT,
    -> INDEX par_ind (parent_id),
    -> CONSTRAINT fk1
    -> FOREIGN KEY (parent_id) REFERENCES parent(id)
    -> ON DELETE CASCADE) ENGINE=INNODB;
```

2. After the parent and child tables are created, query INNODB_FOREIGN and locate the foreign key data for the test/child and test/parent foreign key relationship:
```
mysql> SELECT * FROM INFORMATION_SCHEMA.INNODB_FOREIGN \G
*************************** 1. row ***************************************
            ID: test/fk1
FOR_NAME: test/child
REF_NAME: test/parent
    N_COLS: 1
        TYPE: 1
```


Metadata includes the foreign key ID (fk1), which is named for the CONSTRAINT that was defined on the child table. The FOR_NAME is the name of the child table where the foreign key is defined. REF_NAME is the name of the parent table (the "referenced" table). N_COLS is the number of columns in the foreign key index. TYPE is a numerical value representing bit flags that provide additional information about the foreign key column. In this case, the TYPE value is 1 , which indicates that the ON DELETE CASCADE option was specified for the foreign key. See the INNODB_FOREIGN table definition for more information about TYPE values.
3. Using the foreign key ID, query INNODB_FOREIGN_COLS to view data about the columns of the foreign key.
```
mysql> SELECT * FROM INFORMATION_SCHEMA.INNODB_FOREIGN_COLS WHERE ID = 'test/fk1' \G
*************************** 1. r ow ****************************
        ID: test/fk1
FOR_COL_NAME: parent_id
REF_COL_NAME: id
    POS: 0
```


FOR_COL_NAME is the name of the foreign key column in the child table, and REF_COL_NAME is the name of the referenced column in the parent table. The POS value is the ordinal position of the key field within the foreign key index, starting at zero.

\section*{Example 17.4 Joining InnoDB INFORMATION_SCHEMA Schema Object Tables}

This example demonstrates joining three InnoDB INFORMATION_SCHEMA schema object tables (INNODB_TABLES, INNODB_TABLESPACES, and INNODB_TABLESTATS) to gather file format, row format, page size, and index size information about tables in the employees sample database.

The following table aliases are used to shorten the query string:
- INFORMATION_SCHEMA.INNODB_TABLES: a
- INFORMATION_SCHEMA.INNODB_TABLESPACES: b
- INFORMATION_SCHEMA.INNODB_TABLESTATS: c

An IF ( ) control flow function is used to account for compressed tables. If a table is compressed, the index size is calculated using ZIP_PAGE_SIZE rather than PAGE_SIZE. CLUST_INDEX_SIZE and OTHER_INDEX_SIZE, which are reported in bytes, are divided by 1024*1024 to provide index sizes in megabytes (MBs). MB values are rounded to zero decimal spaces using the ROUND ( ) function.
```
mysql> SELECT a.NAME, a.ROW_FORMAT,
        @page_size :=
            IF(a.ROW_FORMAT='Compressed',
                b.ZIP_PAGE_SIZE, b.PAGE_SIZE)
                AS page_size,
            ROUND((@page_size * c.CLUST_INDEX_SIZE)
                /(1024*1024)) AS pk_mb,
            ROUND((@page_size * c.OTHER_INDEX_SIZE)
                /(1024*1024)) AS secidx_mb
        FROM INFORMATION_SCHEMA.INNODB_TABLES a
        INNER JOIN INFORMATION_SCHEMA.INNODB_TABLESPACES b on a.NAME = b.NAME
        INNER JOIN INFORMATION_SCHEMA.INNODB_TABLESTATS c on b.NAME = c.NAME
        WHERE a.NAME LIKE 'employees/%'
        ORDER BY a.NAME DESC;

\begin{tabular}{|l|l|l|l|l|}
\hline NAME & ROW_FORMAT & page_size & pk_mb & secidx_mb \\
\hline employees/titles & Dynamic & 16384 & 20 & 11 \\
\hline employees/salaries & Dynamic & 16384 & 93 & 34 \\
\hline employees/employees & Dynamic & 16384 & 15 & 0 \\
\hline employees/dept_manager & Dynamic & 16384 & 0 & 0 \\
\hline employees/dept_emp & Dynamic & 16384 & 12 & 10 \\
\hline employees/departments & Dynamic & 16384 & 0 & 0 \\
\hline
\end{tabular}
```


\subsection*{17.15.4 InnoDB INFORMATION_SCHEMA FULLTEXT Index Tables}

The following tables provide metadata for FULLTEXT indexes:
```
mysql> SHOW TABLES FROM INFORMATION_SCHEMA LIKE 'INNODB_FT%';
+--------------------------------------------+
| Tables_in_INFORMATION_SCHEMA (INNODB_FT%) |
+---------------------------------------------
| INNODB_FT_CONFIG
| INNODB_FT_BEING_DELETED
| INNODB_FT_DELETED
| INNODB_FT_DEFAULT_STOPWORD
| INNODB_FT_INDEX_TABLE
| INNODB_FT_INDEX_CACHE
+--------------------------------------------+
```


\section*{Table Overview}
- INNODB_FT_CONFIG: Provides metadata about the FULLTEXT index and associated processing for an InnodB table.
- INNODB_FT_BEING_DELETED: Provides a snapshot of the INNODB_FT_DELETED table; it is used only during an OPTIMIZE TABLE maintenance operation. When OPTIMIZE TABLE is run, the INNODB_FT_BEING_DELETED table is emptied, and DOC_ID values are removed from the INNODB_FT_DELETED table. Because the contents of INNODB_FT_BEING_DELETED typically have a short lifetime, this table has limited utility for monitoring or debugging. For information about running OPTIMIZE TABLE on tables with FULLTEXT indexes, see Section 14.9.6, "Fine-Tuning MySQL Full-Text Search".
- INNODB_FT_DELETED: Stores rows that are deleted from the FULLTEXT index for an InnoDB table. To avoid expensive index reorganization during DML operations for an InnoDB FULLTEXT index, the information about newly deleted words is stored separately, filtered out of search results when you do a text search, and removed from the main search index only when you issue an OPTIMIZE TABLE statement for the InnoDB table.
- INNODB_FT_DEFAULT_STOPWORD: Holds a list of stopwords that are used by default when creating a FULLTEXT index on InnoDB tables.

For information about the INNODB_FT_DEFAULT_STOPWORD table, see Section 14.9.4, "Full-Text Stopwords".
- INNODB_FT_INDEX_TABLE: Provides information about the inverted index used to process text searches against the FULLTEXT index of an InnoDB table.
- INNODB_FT_INDEX_CACHE: Provides token information about newly inserted rows in a FULLTEXT index. To avoid expensive index reorganization during DML operations, the information about newly indexed words is stored separately, and combined with the main search index only when OPTIMIZE TABLE is run, when the server is shut down, or when the cache size exceeds a limit defined by the innodb_ft_cache_size or innodb_ft_total_cache_size system variable.

\section*{Note}

With the exception of the INNODB_FT_DEFAULT_STOPWORD table, these tables are empty initially. Before querying any of them, set the value of the innodb_ft_aux_table system variable to the name (including the database name) of the table that contains the FULLTEXT index (for example, test/ articles).

\section*{Example 17.5 InnoDB FULLTEXT Index INFORMATION_SCHEMA Tables}

This example uses a table with a FULLTEXT index to demonstrate the data contained in the FULLTEXT index INFORMATION_SCHEMA tables.
1. Create a table with a FULLTEXT index and insert some data:
```
mysql> CREATE TABLE articles (
        id INT UNSIGNED AUTO_INCREMENT NOT NULL PRIMARY KEY,
        title VARCHAR(200),
        body TEXT,
        FULLTEXT (title,body)
    ) ENGINE=InnoDB;
mysql> INSERT INTO articles (title,body) VALUES
    ('MySQL Tutorial','DBMS stands for DataBase ...'),
    ('How To Use MySQL Well','After you went through a ...'),
    ('Optimizing MySQL','In this tutorial we show ...'),
    ('1001 MySQL Tricks','1. Never run mysqld as root. 2. ...'),
    ('MySQL vs. YourSQL','In the following database comparison ...'),
    ('MySQL Security','When configured properly, MySQL ...');
```

2. Set the innodb_ft_aux_table variable to the name of the table with the FULLTEXT index. If this variable is not set, the InnoDB FULLTEXT INFORMATION_SCHEMA tables are empty, with the exception of INNODB_FT_DEFAULT_STOPWORD.
```
mysql> SET GLOBAL innodb_ft_aux_table = 'test/articles';
```

3. Query the INNODB_FT_INDEX_CACHE table, which shows information about newly inserted rows in a FULLTEXT index. To avoid expensive index reorganization during DML operations, data for newly inserted rows remains in the FULLTEXT index cache until OPTIMIZE TABLE is run (or until the server is shut down or cache limits are exceeded).
```
mysql> SELECT * FROM INFORMATION_SCHEMA.INNODB_FT_INDEX_CACHE LIMIT 5;
+-------------+---------------+-------------+----------+-------+----------+
```

```

\begin{tabular}{|l|l|l|l|l|l|}
\hline WORD & FIRST_DOC_ID & LAST_DOC_ID & DOC_COUNT & DOC_ID & POSITION \\
\hline 1001 & 5 & 5 & 1 & 5 & 0 \\
\hline after & 3 & 3 & 1 & 3 & 22 \\
\hline comparison & 6 & 6 & 1 & 6 & 44 \\
\hline configured & 7 & 7 & 1 & 7 & 20 \\
\hline database & 2 & 6 & 2 & 2 & 31 \\
\hline
\end{tabular}
```

4. Enable the innodb_optimize_fulltext_only system variable and run OPTIMIZE TABLE on the table that contains the FULLTEXT index. This operation flushes the contents of the FULLTEXT index cache to the main FULLTEXT index. innodb_optimize_fulltext_only changes the way the OPTIMIZE TABLE statement operates on InnoDB tables, and is intended to be enabled temporarily, during maintenance operations on InnoDB tables with FULLTEXT indexes.
```
mysql> SET GLOBAL innodb_optimize_fulltext_only=ON;
mysql> OPTIMIZE TABLE articles;
+----------------+----------+----------+---------+
| Table | Op | Msg_type | Msg_text |
+----------------+-----------+----------+----------+
| test.articles | optimize | status | OK |
+----------------+-----------+----------+----------+
```

5. Query the INNODB_FT_INDEX_TABLE table to view information about data in the main FULLTEXT index, including information about the data that was just flushed from the FULLTEXT index cache.
```
mysql> SELECT * FROM INFORMATION_SCHEMA.INNODB_FT_INDEX_TABLE LIMIT 5;
+-------------+---------------+-------------+-----------+--------+----------+
| WORD | FIRST_DOC_ID | LAST_DOC_ID | DOC_COUNT | DOC_ID | POSITION |
+------------+--------------+-------------+-----------+--------+---------+
```


The INNODB_FT_INDEX_CACHE table is now empty since the OPTIMIZE TABLE operation flushed the FULLTEXT index cache.
```
mysql> SELECT * FROM INFORMATION_SCHEMA.INNODB_FT_INDEX_CACHE LIMIT 5;
Empty set (0.00 sec)
```

6. Delete some records from the test/articles table.
```
mysql> DELETE FROM test.articles WHERE id < 4;
```

7. Query the INNODB_FT_DELETED table. This table records rows that are deleted from the FULLTEXT index. To avoid expensive index reorganization during DML operations, information about newly deleted records is stored separately, filtered out of search results when you do a text search, and removed from the main search index when you run OPTIMIZE TABLE.
```
mysql> SELECT * FROM INFORMATION_SCHEMA.INNODB_FT_DELETED;
+--------+
| DOC_ID |
+--------+
| 2 |
| 3 |
+--------+
```

8. Run OPTIMIZE TABLE to remove the deleted records.
```
mysql> OPTIMIZE TABLE articles;
+----------------+-----------+----------+----------+
| Table | Op | Msg_type | Msg_text |
+----------------+----------+----------+----------+
| test.articles | optimize | status | OK |
```

```
+----------------+----------+----------+---------+
```


The INNODB_FT_DELETED table should now be empty.
```
mysql> SELECT * FROM INFORMATION_SCHEMA.INNODB_FT_DELETED;
Empty set (0.00 sec)
```

9. Query the INNODB_FT_CONFIG table. This table contains metadata about the FULLTEXT index and related processing:
- optimize_checkpoint_limit: The number of seconds after which an OPTIMIZE TABLE run stops.
- synced_doc_id: The next DOC_ID to be issued.
- stopword_table_name: The database/table name for a user-defined stopword table. The VALUE column is empty if there is no user-defined stopword table.
- use_stopword: Indicates whether a stopword table is used, which is defined when the FULLTEXT index is created.
```
mysql> SELECT * FROM INFORMATION_SCHEMA.INNODB_FT_CONFIG;
+-----------------------------+-------+
| KEY | VALUE |
+-----------------------------+-------+
| optimize_checkpoint_limit | 180
| synced_doc_id | 8
| stopword_table_name
| use_stopword | 1
+----------------------------+-------+
```

10. Disable innodb_optimize_fulltext_only, since it is intended to be enabled only temporarily:
```
mysql> SET GLOBAL innodb_optimize_fulltext_only=OFF;
```


\subsection*{17.15.5 InnoDB INFORMATION_SCHEMA Buffer Pool Tables}

The InnoDB INFORMATION_SCHEMA buffer pool tables provide buffer pool status information and metadata about the pages within the InnoDB buffer pool.

The InnoDB INFORMATION_SCHEMA buffer pool tables include those listed below:
```
mysql> SHOW TABLES FROM INFORMATION_SCHEMA LIKE 'INNODB_BUFFER%';
+-------------------------------------------------+
| Tables_in_INFORMATION_SCHEMA (INNODB_BUFFER%) |
+-------------------------------------------------
| INNODB_BUFFER_PAGE_LRU
| INNODB_BUFFER_PAGE
| INNODB_BUFFER_POOL_STATS
+-------
```


\section*{Table Overview}
- INNODB_BUFFER_PAGE: Holds information about each page in the InnoDB buffer pool.
- INNODB_BUFFER_PAGE_LRU: Holds information about the pages in the InnoDB buffer pool, in particular how they are ordered in the LRU list that determines which pages to evict from the buffer pool when it becomes full. The INNODB_BUFFER_PAGE_LRU table has the same columns as the INNODB_BUFFER_PAGE table, except that the INNODB_BUFFER_PAGE_LRU table has an LRU_POSITION column instead of a BLOCK_ID column.
- INNODB_BUFFER_POOL_STATS: Provides buffer pool status information. Much of the same information is provided by SHOW ENGINE INNODB STATUS output, or may be obtained using InnoDB buffer pool server status variables.

\section*{Warning}

Querying the INNODB_BUFFER_PAGE or INNODB_BUFFER_PAGE_LRU table can affect performance. Do not query these tables on a production system unless you are aware of the performance impact and have determined it to be acceptable. To avoid impacting performance on a production system, reproduce the issue you want to investigate and query buffer pool statistics on a test instance.

\section*{Example 17.6 Querying System Data in the INNODB_BUFFER_PAGE Table}

This query provides an approximate count of pages that contain system data by excluding pages where the TABLE_NAME value is either NULL or includes a slash / or period . in the table name, which indicates a user-defined table.
```
mysql> SELECT COUNT(*) FROM INFORMATION_SCHEMA.INNODB_BUFFER_PAGE
    WHERE TABLE_NAME IS NULL OR (INSTR(TABLE_NAME, '/') = 0 AND INSTR(TABLE_NAME, '.') = 0);
+-----------+
| COUNT(*) |
+-----------+
| 1516 |
+-----------+
```


This query returns the approximate number of pages that contain system data, the total number of buffer pool pages, and an approximate percentage of pages that contain system data.
```
mysql> SELECT
        (SELECT COUNT(*) FROM INFORMATION_SCHEMA.INNODB_BUFFER_PAGE
        WHERE TABLE_NAME IS NULL OR (INSTR(TABLE_NAME, '/') = 0 AND INSTR(TABLE_NAME, '.') = 0)
        ) AS system_pages,
        (
        SELECT COUNT(*)
        FROM INFORMATION_SCHEMA.INNODB_BUFFER_PAGE
        ) AS total_pages,
        (
        SELECT ROUND((system_pages/total_pages) * 100)
        ) AS system_page_percentage;
+---------------+--------------+-----------------------+
| system_pages | total_pages | system_page_percentage |
+---------------+--------------+------------------------
| 295 | 8192 | |
+---------------+--------------+------------------------
```


The type of system data in the buffer pool can be determined by querying the PAGE_TYPE value. For example, the following query returns eight distinct PAGE_TYPE values among the pages that contain system data:
```
mysql> SELECT DISTINCT PAGE_TYPE FROM INFORMATION_SCHEMA.INNODB_BUFFER_PAGE
        WHERE TABLE_NAME IS NULL OR (INSTR(TABLE_NAME, '/') = 0 AND INSTR(TABLE_NAME, '.') = 0);
+--------------------+
| PAGE_TYPE |
+--------------------+
| SYSTEM
| IBUF_BITMAP
| UNKNOWN
| FILE_SPACE_HEADER
| INODE
| UNDO_LOG
| ALLOCATED
+--------------------+
```


\section*{Example 17.7 Querying User Data in the INNODB_BUFFER_PAGE Table}

This query provides an approximate count of pages containing user data by counting pages where the TABLE_NAME value is NOT NULL and NOT LIKE '\%INNODB_TABLES\%'.
```
mysql> SELECT COUNT(*) FROM INFORMATION_SCHEMA.INNODB_BUFFER_PAGE
    WHERE TABLE_NAME IS NOT NULL AND TABLE_NAME NOT LIKE '%INNODB_TABLES%';
```

```
+----------+
| COUNT(*) |
+----------+
| 7897 |
+----------+
```


This query returns the approximate number of pages that contain user data, the total number of buffer pool pages, and an approximate percentage of pages that contain user data.
```
mysql> SELECT
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.INNODB_BUFFER_PAGE
    WHERE TABLE_NAME IS NOT NULL AND (INSTR(TABLE_NAME, '/') > 0 OR INSTR(TABLE_NAME, '.') > 0)
    ) AS user_pages,
    (
    SELECT COUNT(*)
    FROM information_schema.INNODB_BUFFER_PAGE
    ) AS total_pages,
    l
    SELECT ROUND((user_pages/total_pages) * 100)
    ) AS user_page_percentage;
+-------------+-------------+---------------------+
| user_pages | total_pages | user_page_percentage |
+-------------+--------------+-----------------------+
+-------------+--------------+---------------------+
```


This query identifies user-defined tables with pages in the buffer pool:
```
mysql> SELECT DISTINCT TABLE_NAME FROM INFORMATION_SCHEMA.INNODB_BUFFER_PAGE
        WHERE TABLE_NAME IS NOT NULL AND (INSTR(TABLE_NAME, '/') > 0 OR INSTR(TABLE_NAME, '.') > 0)
        AND TABLE_NAME NOT LIKE 'ˋmysqlˋ.ˋinnodb_%';
+---------------------------+
| TABLE_NAME |
+---------------------------+
| ˋemployeesˋ.ˋsalariesˋ
| ˋemployeesˋ.ˋemployeesˋ
+--------------------------+
```


\section*{Example 17.8 Querying Index Data in the INNODB_BUFFER_PAGE Table}

For information about index pages, query the INDEX_NAME column using the name of the index. For example, the following query returns the number of pages and total data size of pages for the emp_no index that is defined on the employees. salaries table:
```
mysql> SELECT INDEX_NAME, COUNT(*) AS Pages,
ROUND(SUM(IF(COMPRESSED_SIZE = 0, @@GLOBAL.innodb_page_size, COMPRESSED_SIZE))/1024/1024)
AS 'Total Data (MB)'
FROM INFORMATION_SCHEMA.INNODB_BUFFER_PAGE
WHERE INDEX_NAME='emp_no' AND TABLE_NAME = 'ˋemployeesˋ.ˋsalariesˋ';
+-------------+--------+-----------------+
| INDEX_NAME | Pages | Total Data (MB) |
+-------------+--------+-----------------+
| emp_no | 1609 | 25 |
```


This query returns the number of pages and total data size of pages for all indexes defined on the employees.salaries table:
```
mysql> SELECT INDEX_NAME, COUNT(*) AS Pages,
    ROUND(SUM(IF(COMPRESSED_SIZE = 0, @@GLOBAL.innodb_page_size, COMPRESSED_SIZE))/1024/1024)
    AS 'Total Data (MB)'
    FROM INFORMATION_SCHEMA.INNODB_BUFFER_PAGE
    WHERE TABLE_NAME = 'ˋemployeesˋ.ˋsalariesˋ'
    GROUP BY INDEX_NAME;
+-------------+--------+-----------------+
| INDEX_NAME | Pages | Total Data (MB) |
+-------------+--------+------------------+
```


\section*{Example 17.9 Querying LRU_POSITION Data in the INNODB_BUFFER_PAGE_LRU Table}

The INNODB_BUFFER_PAGE_LRU table holds information about the pages in the InnoDB buffer pool, in particular how they are ordered that determines which pages to evict from the buffer pool when it becomes full. The definition for this page is the same as for INNODB_BUFFER_PAGE, except this table has an LRU_POSITION column instead of a BLOCK_ID column.

This query counts the number of positions at a specific location in the LRU list occupied by pages of the employees.employees table.
```
mysql> SELECT COUNT(LRU_POSITION) FROM INFORMATION_SCHEMA.INNODB_BUFFER_PAGE_LRU
    WHERE TABLE_NAME='ˋemployeesˋ.ˋemployeesˋ' AND LRU_POSITION < 3072;
+-----------------------+
| COUNT(LRU_POSITION) |
+-----------------------+
| 548 |
+----------------------+
```


\section*{Example 17.10 Querying the INNODB_BUFFER_POOL_STATS Table}

The INNODB_BUFFER_POOL_STATS table provides information similar to SHOW ENGINE INNODB STATUS and InnoDB buffer pool status variables.
```
mysql> SELECT * FROM information_schema.INNODB_BUFFER_POOL_STATS \G
*************************** 1. row ***************************************
                                        POOL_ID: 0
                                    POOL_SIZE: 8192
                                FREE_BUFFERS: 1
                            DATABASE_PAGES: 8173
                    OLD_DATABASE_PAGES: 3014
            MODIFIED_DATABASE_PAGES: 0
                    PENDING_DECOMPRESS: 0
                                PENDING_READS: 0
                        PENDING_FLUSH_LRU: 0
                    PENDING_FLUSH_LIST: 0
                            PAGES_MADE_YOUNG: 15907
                    PAGES_NOT_MADE_YOUNG: 3803101
                PAGES_MADE_YOUNG_RATE: 0
        PAGES_MADE_NOT_YOUNG_RATE: 0
                        NUMBER_PAGES_READ: 3270
                NUMBER_PAGES_CREATED: 13176
                NUMBER_PAGES_WRITTEN: 15109
                            PAGES_READ_RATE: 0
                        PAGES_CREATE_RATE: 0
                    PAGES_WRITTEN_RATE: 0
                        NUMBER_PAGES_GET: 33069332
                                    HIT_RATE: 0
    YOUNG_MAKE_PER_THOUSAND_GETS: 0
NOT_YOUNG_MAKE_PER_THOUSAND_GETS: 0
            NUMBER_PAGES_READ_AHEAD: 2713
        NUMBER_READ_AHEAD_EVICTED: 0
                            READ_AHEAD_RATE: 0
            READ_AHEAD_EVICTED_RATE: 0
                                    LRU_IO_TOTAL: 0
                            LRU_IO_CURRENT: 0
                        UNCOMPRESS_TOTAL: 0
                    UNCOMPRESS_CURRENT: 0
```


For comparison, SHOW ENGINE INNODB STATUS output and InnoDB buffer pool status variable output is shown below, based on the same data set.

For more information about SHOW ENGINE INNODB STATUS output, see Section 17.17.3, "InnoDB Standard Monitor and Lock Monitor Output".
```
mysql> SHOW ENGINE INNODB STATUS\G
...
-----------------------
BUFFER POOL AND MEMORY
-----------------------
Total large memory allocated 137428992
```

```
Dictionary memory allocated 579084
Buffer pool size 8192
Free buffers 1
Database pages 8173
Old database pages 3014
Modified db pages 0
Pending reads 0
Pending writes: LRU 0, flush list 0, single page 0
Pages made young 15907, not young 3803101
0.00 youngs/s, 0.00 non-youngs/s
Pages read 3270, created 13176, written 15109
0.00 reads/s, 0.00 creates/s, 0.00 writes/s
No buffer pool page gets since the last printout
Pages read ahead 0.00/s, evicted without access 0.00/s, Random read ahead 0.00/s
LRU len: 8173, unzip_LRU len: 0
I/O sum[0]:cur[0], unzip sum[0]:cur[0]
...
```


For status variable descriptions, see Section 7.1.10, "Server Status Variables".
```
mysql> SHOW STATUS LIKE 'Innodb_buffer%';
+----------------------------------------+-------------+

\begin{tabular}{|l|l|}
\hline Variable_name & Value \\
\hline Innodb_buffer_pool_dump_status & not started \\
\hline Innodb_buffer_pool_load_status & not started \\
\hline Innodb_buffer_pool_resize_status & not started \\
\hline Innodb_buffer_pool_pages_data & 8173 \\
\hline Innodb_buffer_pool_bytes_data & 133906432 \\
\hline Innodb_buffer_pool_pages_dirty & 0 \\
\hline Innodb_buffer_pool_bytes_dirty & 0 \\
\hline Innodb_buffer_pool_pages_flushed & 15109 \\
\hline Innodb_buffer_pool_pages_free & 1 \\
\hline Innodb_buffer_pool_pages_misc & 18 \\
\hline Innodb_buffer_pool_pages_total & 8192 \\
\hline Innodb_buffer_pool_read_ahead_rnd & 0 \\
\hline Innodb_buffer_pool_read_ahead & 2713 \\
\hline Innodb_buffer_pool_read_ahead_evicted & 0 \\
\hline Innodb_buffer_pool_read_requests & 33069332 \\
\hline Innodb_buffer_pool_reads & 558 \\
\hline Innodb_buffer_pool_wait_free & 0 \\
\hline Innodb_buffer_pool_write_requests & 11985961 \\
\hline
\end{tabular}
```


\subsection*{17.15.6 InnoDB INFORMATION_SCHEMA Metrics Table}

The INNODB_METRICS table provides information about InnoDB performance and resource-related counters.

INNODB_METRICS table columns are shown below. For column descriptions, see Section 28.4.21, "The INFORMATION_SCHEMA INNODB_METRICS Table".
```
mysql> SELECT * FROM INFORMATION_SCHEMA.INNODB_METRICS WHERE NAME="dml_inserts" \G
*************************** 1. row *****************************
                    NAME: dml_inserts
            SUBSYSTEM: dml
                    COUNT: 46273
            MAX_COUNT: 46273
            MIN_COUNT: NULL
            AVG_COUNT: 492.2659574468085
        COUNT_RESET: 46273
MAX_COUNT_RESET: 46273
MIN_COUNT_RESET: NULL
AVG_COUNT_RESET: NULL
        TIME_ENABLED: 2014-11-28 16:07:53
    TIME_DISABLED: NULL
        TIME_ELAPSED: 94
            TIME_RESET: NULL
                    STATUS: enabled
                        TYPE: status_counter
                    COMMENT: Number of rows inserted
```


\section*{Enabling, Disabling, and Resetting Counters}

You can enable, disable, and reset counters using the following variables:
- innodb_monitor_enable: Enables counters.
```
SET GLOBAL innodb_monitor_enable = [counter-name|module_name|pattern|all];
```

- innodb_monitor_disable: Disables counters.
```
SET GLOBAL innodb_monitor_disable = [counter-name|module_name|pattern|all];
```

- innodb_monitor_reset: Resets counter values to zero.
```
SET GLOBAL innodb_monitor_reset = [counter-name|module_name|pattern|all];
```

- innodb_monitor_reset_all: Resets all counter values. A counter must be disabled before using innodb_monitor_reset_all.
```
SET GLOBAL innodb_monitor_reset_all = [counter-name|module_name|pattern|all];
```


Counters and counter modules can also be enabled at startup using the MySQL server configuration file. For example, to enable the log module, metadata_table_handles_opened and metadata_table_handles_closed counters, enter the following line in the [mysqld] section of the MySQL server configuration file.
```
[mysqld]
innodb_monitor_enable = log,metadata_table_handles_opened,metadata_table_handles_closed
```


When enabling multiple counters or modules in a configuration file, specify the innodb_monitor_enable variable followed by counter and module names separated by a comma, as shown above. Only the innodb_monitor_enable variable can be used in a configuration file. The innodb_monitor_disable and innodb_monitor_reset variables are supported on the command line only.

\section*{Note}

Because each counter adds a degree of runtime overhead, use counters conservatively on production servers to diagnose specific issues or monitor specific functionality. A test or development server is recommended for more extensive use of counters.

\section*{Counters}

The list of available counters is subject to change. Query the Information Schema INNODB_METRICS table for counters available in your MySQL server version.

The counters enabled by default correspond to those shown in SHOW ENGINE INNODB STATUS output. Counters shown in SHOW ENGINE INNODB STATUS output are always enabled at a system level but can be disabled for the INNODB_METRICS table. Counter status is not persistent. Unless configured otherwise, counters revert to their default enabled or disabled status when the server is restarted.

If you run programs that would be affected by the addition or removal of counters, it is recommended that you review the releases notes and query the INNODB_METRICS table to identify those changes as part of your upgrade process.
```
mysql> SELECT name, subsystem, status FROM INFORMATION_SCHEMA.INNODB_METRICS ORDER BY NAME;
+----------------------------------------------+--------------------+---------+
| name | subsystem | status |
+-----------------------------------------------+-------------------------------
| adaptive_hash_pages_added | adaptive_hash_index | disabled
| adaptive_hash_pages_removed | adaptive_hash_index | disabled
| adaptive_hash_rows_added | adaptive_hash_index | disabled
| adaptive_hash_rows_deleted_no_hash_entry | adaptive_hash_index | disabled
| adaptive_hash_rows_removed | adaptive_hash_index | disabled |
```

```
| adaptive_hash_rows_updated | adaptive_hash_index | disabled |
| adaptive_hash_searches | adaptive_hash_index | enabled
| adaptive_hash_searches_btree | adaptive_hash_index | enabled
| buffer_data_reads | buffer | enabled
| buffer_data_written | buffer | enabled
| buffer_flush_adaptive | buffer | disabled
| buffer_flush_adaptive_avg_pass | buffer | disabled
| buffer_flush_adaptive_avg_time_est | buffer | disabled
| buffer_flush_adaptive_avg_time_slot | buffer | disabled
| buffer_flush_adaptive_avg_time_thread | buffer | disabled
| buffer_flush_adaptive_pages | buffer | disabled
| buffer_flush_adaptive_total_pages | buffer | disabled
| buffer_flush_avg_page_rate | buffer | disabled
| buffer_flush_avg_pass | buffer | disabled
| buffer_flush_avg_time | buffer | disabled
| buffer_flush_background | buffer | disabled
| buffer_flush_background_pages | buffer | disabled
| buffer_flush_background_total_pages | buffer | disabled
| buffer_flush_batches | buffer | disabled
| buffer_flush_batch_num_scan | buffer | disabled
| buffer_flush_batch_pages | buffer | disabled
| buffer_flush_batch_scanned | buffer | disabled
| buffer_flush_batch_scanned_per_call | buffer | disabled
| buffer_flush_batch_total_pages | buffer | disabled
| buffer_flush_lsn_avg_rate | buffer | disabled
| buffer_flush_neighbor | buffer | disabled
| buffer_flush_neighbor_pages | buffer | disabled
| buffer_flush_neighbor_total_pages | buffer | disabled
| buffer_flush_n_to_flush_by_age | buffer | disabled
| buffer_flush_n_to_flush_by_dirty_page | buffer | disabled
| buffer_flush_n_to_flush_requested | buffer | disabled
| buffer_flush_pct_for_dirty | buffer | disabled
| buffer_flush_pct_for_lsn | buffer | disabled
| buffer_flush_sync | buffer | disabled
| buffer_flush_sync_pages | buffer | disabled
| buffer_flush_sync_total_pages | buffer | disabled
| buffer_flush_sync_waits | buffer | disabled
| buffer_LRU_batches_evict | buffer | disabled
| buffer_LRU_batches_flush | buffer | disabled
| buffer_LRU_batch_evict_pages | buffer | disabled
| buffer_LRU_batch_evict_total_pages | buffer | disabled
| buffer_LRU_batch_flush_avg_pass | buffer | disabled
| buffer_LRU_batch_flush_avg_time_est | buffer | disabled
| buffer_LRU_batch_flush_avg_time_slot | buffer | disabled
| buffer_LRU_batch_flush_avg_time_thread | buffer | disabled
| buffer_LRU_batch_flush_pages | buffer | disabled
| buffer_LRU_batch_flush_total_pages | buffer | disabled
| buffer_LRU_batch_num_scan | buffer | disabled
| buffer_LRU_batch_scanned | buffer | disabled
| buffer_LRU_batch_scanned_per_call | buffer | disabled
| buffer_LRU_get_free_loops | buffer | disabled
| buffer_LRU_get_free_search | Buffer | disabled
| buffer_LRU_get_free_waits | buffer | disabled
| buffer_LRU_search_num_scan | buffer | disabled
| buffer_LRU_search_scanned | buffer | disabled
| buffer_LRU_search_scanned_per_call | buffer | disabled
| buffer_LRU_single_flush_failure_count | Buffer | disabled
| buffer_LRU_single_flush_num_scan | buffer | disabled
| buffer_LRU_single_flush_scanned | buffer | disabled
| buffer_LRU_single_flush_scanned_per_call | buffer | disabled
| buffer_LRU_unzip_search_num_scan | buffer | disabled
| buffer_LRU_unzip_search_scanned | buffer | disabled
| buffer_LRU_unzip_search_scanned_per_call | buffer | disabled
| buffer_pages_created | buffer | enabled
| buffer_pages_read | buffer | enabled
| buffer_pages_written | buffer | enabled
| buffer_page_read_blob | buffer_page_io | disabled
| buffer_page_read_fsp_hdr | buffer_page_io | disabled
| buffer_page_read_ibuf_bitmap | buffer_page_io | disabled
| buffer_page_read_ibuf_free_list | buffer_page_io | disabled
| buffer_page_read_index_ibuf_leaf | buffer_page_io | disabled
| buffer_page_read_index_ibuf_non_leaf | buffer_page_io | disabled
```

```
buffer_page_read_index_inode | buffer_page_io | disabled
buffer_page_read_index_leaf | buffer_page_io | disabled
buffer_page_read_index_non_leaf | buffer_page_io | disabled
buffer_page_read_other | buffer_page_io | disabled
buffer_page_read_rseg_array | buffer_page_io | disabled
buffer_page_read_system_page | buffer_page_io | disabled
buffer_page_read_trx_system | buffer_page_io | disabled
buffer_page_read_undo_log | buffer_page_io | disabled
buffer_page_read_xdes | buffer_page_io | disabled
buffer_page_read_zblob | buffer_page_io | disabled
buffer_page_read_zblob2 | buffer_page_io | disabled
buffer_page_written_blob | buffer_page_io | disabled
buffer_page_written_fsp_hdr | buffer_page_io | disabled
buffer_page_written_ibuf_bitmap | buffer_page_io | disabled
buffer_page_written_ibuf_free_list | buffer_page_io | disabled
buffer_page_written_index_ibuf_leaf | buffer_page_io | disabled
buffer_page_written_index_ibuf_non_leaf | buffer_page_io | disabled
buffer_page_written_index_inode | buffer_page_io | disabled
buffer_page_written_index_leaf | buffer_page_io | disabled
buffer_page_written_index_non_leaf | buffer_page_io | disabled
buffer_page_written_on_log_no_waits | buffer_page_io | disabled
buffer_page_written_on_log_waits | buffer_page_io | disabled
buffer_page_written_on_log_wait_loops | buffer_page_io | disabled
buffer_page_written_other
buffer_page_written_rseg_array
buffer_page_written_system_page
buffer_page_written_trx_system
buffer_page_written_undo_log
buffer_page_written_xdes
buffer_page_written_zblob
buffer_page_written_zblob2
buffer_pool_bytes_data
buffer_pool_bytes_dirty
buffer_pool_pages_data
buffer_pool_pages_dirty
buffer_pool_pages_free
buffer_pool_pages_misc
buffer_pool_pages_total
buffer_pool_reads
buffer_pool_read_ahead
buffer_pool_read_ahead_evicted
buffer_pool_read_requests
buffer_pool_size
buffer_pool_wait_free
buffer_pool_write_requests
compression_pad_decrements
compression_pad_increments
compress_pages_compressed
compress_pages_decompressed
cpu_n
cpu_stime_abs
cpu_stime_pct
cpu_utime_abs
cpu_utime_pct
dblwr_async_requests
dblwr_flush_requests
dblwr_flush_wait_events
dblwr_sync_requests
ddl_background_drop_tables
ddl_log_file_alter_table
ddl_online_create_index
ddl_pending_alter_table
ddl_sort_file_alter_table
dml_deletes
dml_inserts
dml_reads
dml_system_deletes
dml_system_inserts
dml_system_reads
dml_system_updates
dml_updates
file_num_open_files
buffer_page_io | disabled
buffer_page_io | disabled
buffer_page_io | disabled
buffer_page_io | disabled
buffer_page_io | disabled
buffer_page_io | disabled
buffer_page_io | disabled
buffer_page_io | disabled
buffer | enabled
buffer | enabled
buffer | enabled
buffer | enabled
buffer | enabled
buffer | enabled
buffer | enabled
buffer | enabled
buffer | enabled
buffer | enabled
buffer | enabled
server | enabled
buffer | enabled
buffer | enabled
compression | disabled
compression | disabled
compression | disabled
compression | disabled
cpu | disabled
cpu | disabled
cpu | disabled
cpu | disabled
cpu | disabled
dblwr | disabled
dblwr | disabled
dblwr | disabled
dblwr | disabled
ddl | disabled
ddl | disabled
ddl | disabled
ddl | disabled
ddl | disabled
dml | enabled
dml | enabled
dml | disabled
dml | enabled
dml | enabled
dml | enabled
dml | enabled
dml | enabled
file_system | enabled
```

```
| ibuf_merges | change_buffer | enabled
| ibuf_merges_delete | change_buffer | enabled
| ibuf_merges_delete_mark | change_buffer | enabled
| ibuf_merges_discard_delete | change_buffer | enabled
| ibuf_merges_discard_delete_mark | change_buffer | enabled
| ibuf_merges_discard_insert | change_buffer | enabled
| ibuf_merges_insert | change_buffer | enabled
| ibuf_size | change_buffer | enabled
| icp_attempts | icp | disabled
| icp_match | icp | disabled
| icp_no_match | icp | disabled
| icp_out_of_range | icp | disabled
| index_page_discards | index | disabled
| index_page_merge_attempts | index | disabled
| index_page_merge_successful | index | disabled
| index_page_reorg_attempts | index | disabled
| index_page_reorg_successful | index | disabled
| index_page_splits | index | disabled
| innodb_activity_count | server | enabled
| innodb_background_drop_table_usec | server | disabled
| innodb_dblwr_pages_written | server | enabled
| innodb_dblwr_writes | server | enabled
| innodb_dict_lru_count | server | disabled
| innodb_dict_lru_usec | server | disabled
| innodb_ibuf_merge_usec | server | disabled
| innodb_master_active_loops | server | disabled
| innodb_master_idle_loops | server | disabled
| innodb_master_purge_usec | server | disabled
| innodb_master_thread_sleeps | server | disabled
| innodb_mem_validate_usec | server | disabled
| innodb_page_size | server | enabled
| innodb_rwlock_sx_os_waits | server | enabled
| innodb_rwlock_sx_spin_rounds | server | enabled
| innodb_rwlock_sx_spin_waits | server | enabled
| innodb_rwlock_s_os_waits | server | enabled
| innodb_rwlock_s_spin_rounds | server | enabled
| innodb_rwlock_s_spin_waits | server | enabled
| innodb_rwlock_x_os_waits | server | enabled
| innodb_rwlock_x_spin_rounds | server | enabled
| innodb_rwlock_x_spin_waits | server | enabled
| lock_deadlocks | lock | enabled
| lock_deadlock_false_positives | lock | enabled
| lock_deadlock_rounds | lock | enabled
| lock_rec_grant_attempts | lock | enabled
| lock_rec_locks | lock | disabled
| lock_rec_lock_created | lock | disabled
| lock_rec_lock_removed | lock | disabled
| lock_rec_lock_requests | lock | disabled
| lock_rec_lock_waits | lock | disabled
| lock_rec_release_attempts | lock | enabled
| lock_row_lock_current_waits | lock | enabled
| lock_row_lock_time | lock | enabled
| lock_row_lock_time_avg | lock | enabled
| lock_row_lock_time_max | lock | enabled
| lock_row_lock_waits | lock | enabled
| lock_schedule_refreshes | lock | enabled
| lock_table_locks | lock | disabled
| lock_table_lock_created | lock | disabled
| lock_table_lock_removed | lock | disabled
| lock_table_lock_waits | lock | disabled
| lock_threads_waiting | lock | enabled
| lock_timeouts | lock | enabled
| log_checkpoints | log | disabled
| log_concurrency_margin | log | disabled
| log_flusher_no_waits | log | disabled
| log_flusher_waits | log | disabled
| log_flusher_wait_loops | log | disabled
| log_flush_avg_time | log | disabled
| log_flush_lsn_avg_rate | log | disabled
| log_flush_max_time | log | disabled
| log_flush_notifier_no_waits | log | disabled
| log_flush_notifier_waits | log | disabled
```

```
| log_flush_notifier_wait_loops
| log_flush_total_time
| log_free_space
| log_full_block_writes
| log_lsn_archived
| log_lsn_buf_dirty_pages_added
| log_lsn_buf_pool_oldest_approx
| log_lsn_buf_pool_oldest_lwm
| log_lsn_checkpoint_age
| log_lsn_current
| log_lsn_last_checkpoint
| log_lsn_last_flush
| log_max_modified_age_async
| log_max_modified_age_sync
| log_next_file
| log_on_buffer_space_no_waits
| log_on_buffer_space_waits
| log_on_buffer_space_wait_loops
| log_on_file_space_no_waits
| log_on_file_space_waits
| log_on_file_space_wait_loops
| log_on_flush_no_waits
| log_on_flush_waits
| log_on_flush_wait_loops
| log_on_recent_closed_wait_loops
| log_on_recent_written_wait_loops
| log_on_write_no_waits
| log_on_write_waits
| log_on_write_wait_loops
| log_padded
| log_partial_block_writes
| log_waits
| log_writer_no_waits
| log_writer_on_archiver_waits
| log_writer_on_file_space_waits
| log_writer_waits
| log_writer_wait_loops
| log_writes
| log_write_notifier_no_waits
| log_write_notifier_waits
| log_write_notifier_wait_loops
| log_write_requests
| log_write_to_file_requests_interval
| metadata_table_handles_closed
| metadata_table_handles_opened
| metadata_table_reference_count
| module_cpu
| module_dblwr
| module_page_track
| os_data_fsyncs
| os_data_reads
| os_data_writes
| os_log_bytes_written
| os_log_fsyncs
| os_log_pending_fsyncs
| os_log_pending_writes
| os_pending_reads
| os_pending_writes
| page_track_checkpoint_partial_flush_request | page_track
| page_track_full_block_writes | page_track
| page_track_partial_block_writes | page_track
| page_track_resets
| purge_del_mark_records
| purge_dml_delay_usec
| purge_invoked
| purge_resume_count
| purge_stop_count
| purge_truncate_history_count
| purge_truncate_history_usec
| purge_undo_log_pages
| purge_upd_exist_or_extern_records | purge |isabled
| sampled_pages_read

\begin{tabular}{|l|l|}
\hline log & disabled \\
\hline log & disabled \\
\hline log & disabled \\
\hline log & disabled \\
\hline log & disabled \\
\hline log & disabled \\
\hline log & disabled \\
\hline log & disabled \\
\hline log & disabled \\
\hline log & disabled \\
\hline log & disabled \\
\hline log & disabled \\
\hline log & disabled \\
\hline log & disabled \\
\hline log & disabled \\
\hline log & disabled \\
\hline log & disabled \\
\hline log & disabled \\
\hline log & disabled \\
\hline log & disabled \\
\hline log & disabled \\
\hline log & disabled \\
\hline log & disabled \\
\hline log & disabled \\
\hline log & disabled \\
\hline log & disabled \\
\hline log & disabled \\
\hline log & disabled \\
\hline log & disabled \\
\hline log & disabled \\
\hline log & disabled \\
\hline log & enabled \\
\hline log & disabled \\
\hline log & disabled \\
\hline log & disabled \\
\hline log & disabled \\
\hline log & disabled \\
\hline log & enabled \\
\hline log & disabled \\
\hline log & disabled \\
\hline log & disabled \\
\hline log & enabled \\
\hline log & disabled \\
\hline metadata & disabled \\
\hline metadata & disabled \\
\hline metadata & disabled \\
\hline cpu & disabled \\
\hline dblwr & disabled \\
\hline page_track & disabled \\
\hline os & enabled \\
\hline os & enabled \\
\hline os & enabled \\
\hline os & enabled \\
\hline os & enabled \\
\hline os & enabled \\
\hline os & enabled \\
\hline os & disabled \\
\hline os & disabled \\
\hline page_track & disabled \\
\hline page_track & disabled \\
\hline page_track & disabled \\
\hline page_track & disabled \\
\hline purge & disabled \\
\hline purge & disabled \\
\hline purge & disabled \\
\hline purge & disabled \\
\hline purge & disabled \\
\hline purge & disabled \\
\hline purge & disabled \\
\hline purge & disabled \\
\hline purge & disabled \\
\hline sampling & disabled \\
\hline
\end{tabular}
```

```
| sampled_pages_skipped | sampling | disabled |
| trx_active_transactions | transaction | disabled |
| trx_allocations | transaction | disabled |
| trx_commits_insert_update | transaction | disabled |
| trx_nl_ro_commits | transaction | disabled |
| trx_on_log_no_waits | transaction | disabled |
| trx_on_log_waits | transaction | disabled |
| trx_on_log_wait_loops | transaction | disabled |
| trx_rollbacks | transaction | disabled |
| trx_rollbacks_savepoint | transaction | disabled |
| trx_rollback_active | transaction | disabled |
| trx_ro_commits | transaction | disabled |
| trx_rseg_current_size | transaction | disabled |
| trx_rseg_history_len | transaction | enabled
| trx_rw_commits | transaction | disabled |
| trx_undo_slots_cached | transaction | disabled |
| trx_undo_slots_used | transaction | disabled |
| undo_truncate_count | undo | disabled |
| undo_truncate_done_logging_count | undo | disabled |
| undo_truncate_start_logging_count | undo | disabled |
| undo_truncate_usec | undo | disabled |
+-----------------------------------------------+-------------------------------
314 rows in set (0.00 sec)
```


\section*{Counter Modules}

Each counter is associated with a particular module. Module names can be used to enable, disable, or reset all counters for a particular subsystem. For example, use module_dml to enable all counters associated with the dml subsystem.
```
mysql> SET GLOBAL innodb_monitor_enable = module_dml;
mysql> SELECT name, subsystem, status FROM INFORMATION_SCHEMA.INNODB_METRICS
    WHERE subsystem ='dml';
+--------------+-----------+---------+
| name | subsystem | status |
+--------------+-----------+---------+
| dml_reads | dml | enabled |
| dml_inserts | dml | enabled |
| dml_deletes | dml | enabled |
| dml_updates | dml | enabled |
+--------------+-----------+---------+
```


Module names can be used with innodb_monitor_enable and related variables.
Module names and corresponding SUBSYSTEM names are listed below.
- module_adaptive_hash (subsystem = adaptive_hash_index)
- module_buffer (subsystem = buffer)
- module_buffer_page (subsystem = buffer_page_io)
- module_compress (subsystem = compression)
- module_ddl (subsystem = ddl)
- module_dml (subsystem = dml)
- module_file (subsystem = file_system)
- module_ibuf_system (subsystem = change_buffer)
- module_icp (subsystem = icp)
- module_index (subsystem = index)
- module_innodb (subsystem = innodb)
- module_lock $($ subsystem $=$ lock $)$
- module_log (subsystem = log)
- module_metadata (subsystem = metadata)
- module_os (subsystem = os)
- module_purge (subsystem = purge)
- module_trx (subsystem = transaction)
- module_undo (subsystem = undo)

\section*{Example 17.11 Working with INNODB_METRICS Table Counters}

This example demonstrates enabling, disabling, and resetting a counter, and querying counter data in the INNODB_METRICS table.
1. Create a simple InnoDB table:
```
mysql> USE test;
Database changed
mysql> CREATE TABLE t1 (c1 INT) ENGINE=INNODB;
Query OK, 0 rows affected (0.02 sec)
```

2. Enable the dml_inserts counter.
```
mysql> SET GLOBAL innodb_monitor_enable = dml_inserts;
Query OK, 0 rows affected (0.01 sec)
```


A description of the dml_inserts counter can be found in the COMMENT column of the INNODB_METRICS table:
```
mysql> SELECT NAME, COMMENT FROM INFORMATION_SCHEMA.INNODB_METRICS WHERE NAME="dml_inserts";
+--------------+--------------------------+
| NAME | COMMENT |
+--------------+-------------------------+
| dml_inserts | Number of rows inserted |
+--------------+------------------------+
```

3. Query the INNODB_METRICS table for the dml_inserts counter data. Because no DML operations have been performed, the counter values are zero or NULL. The TIME_ENABLED and TIME_ELAPSED values indicate when the counter was last enabled and how many seconds have elapsed since that time.
```
mysql> SELECT * FROM INFORMATION_SCHEMA.INNODB_METRICS WHERE NAME="dml_inserts" \G
*************************** 1. r OW *****************************
                        NAME: dml_inserts
            SUBSYSTEM: dml
                    COUNT: 0
            MAX_COUNT: 0
            MIN_COUNT: NULL
            AVG_COUNT: 0
        COUNT_RESET: 0
MAX_COUNT_RESET: 0
MIN_COUNT_RESET: NULL
AVG_COUNT_RESET: NULL
        TIME_ENABLED: 2014-12-04 14:18:28
    TIME_DISABLED: NULL
    TIME_ELAPSED: 28
            TIME_RESET: NULL
                    STATUS: enabled
                        TYPE: status_counter
                COMMENT: Number of rows inserted
```

4. Insert three rows of data into the table.
```
mysql> INSERT INTO t1 values(1);
Query OK, 1 row affected (0.00 sec)
```

```
mysql> INSERT INTO t1 values(2);
Query OK, 1 row affected (0.00 sec)
mysql> INSERT INTO t1 values(3);
Query OK, 1 row affected (0.00 sec)
```

5. Query the INNODB_METRICS table again for the dml_inserts counter data. A number of counter values have now incremented including COUNT, MAX_COUNT, AVG_COUNT, and COUNT_RESET. Refer to the INNODB_METRICS table definition for descriptions of these values.
```
mysql> SELECT * FROM INFORMATION_SCHEMA.INNODB_METRICS WHERE NAME="dml_inserts"\G
************************** 1. r ow ******************************
                    NAME: dml_inserts
            SUBSYSTEM: dml
                    COUNT: 3
            MAX_COUNT: 3
            MIN_COUNT: NULL
            AVG_COUNT: 0.046153846153846156
        COUNT_RESET: 3
MAX_COUNT_RESET: 3
MIN_COUNT_RESET: NULL
AVG_COUNT_RESET: NULL
        TIME_ENABLED: 2014-12-04 14:18:28
    TIME_DISABLED: NULL
        TIME_ELAPSED: 65
            TIME_RESET: NULL
                    STATUS: enabled
                            TYPE: status_counter
                    COMMENT: Number of rows inserted
```

6. Reset the dml_inserts counter and query the INNODB_METRICS table again for the dml_inserts counter data. The \%_RESET values that were reported previously, such as COUNT_RESET and MAX_RESET, are set back to zero. Values such as COUNT, MAX_COUNT, and AVG_COUNT, which cumulatively collect data from the time the counter is enabled, are unaffected by the reset.
```
mysql> SET GLOBAL innodb_monitor_reset = dml_inserts;
Query OK, 0 rows affected (0.00 sec)
mysql> SELECT * FROM INFORMATION_SCHEMA.INNODB_METRICS WHERE NAME="dml_inserts"\G
*************************** 1. row *****************************
                        NAME: dml_inserts
                SUBSYSTEM: dml
                        COUNT: 3
                MAX_COUNT: 3
                MIN_COUNT: NULL
                AVG_COUNT: 0.03529411764705882
        COUNT_RESET: 0
MAX_COUNT_RESET: 0
MIN_COUNT_RESET: NULL
AVG_COUNT_RESET: 0
        TIME_ENABLED: 2014-12-04 14:18:28
    TIME_DISABLED: NULL
        TIME_ELAPSED: 85
            TIME_RESET: 2014-12-04 14:19:44
                    STATUS: enabled
                        TYPE: status_counter
                    COMMENT: Number of rows inserted
```

7. To reset all counter values, you must first disable the counter. Disabling the counter sets the STATUS value to disabled.
```
mysql> SET GLOBAL innodb_monitor_disable = dml_inserts;
Query OK, 0 rows affected (0.00 sec)
mysql> SELECT * FROM INFORMATION_SCHEMA.INNODB_METRICS WHERE NAME="dml_inserts"\G
*************************** 1. row ******************************
        NAME: dml_inserts
    SUBSYSTEM: dml
```

```
                    COUNT: 3
            MAX_COUNT: 3
            MIN_COUNT: NULL
            AVG_COUNT: 0.030612244897959183
        COUNT_RESET: 0
MAX_COUNT_RESET: 0
MIN_COUNT_RESET: NULL
AVG_COUNT_RESET: 0
    TIME_ENABLED: 2014-12-04 14:18:28
    TIME_DISABLED: 2014-12-04 14:20:06
    TIME_ELAPSED: 98
        TIME_RESET: NULL
                STATUS: disabled
                    TYPE: status_counter
                COMMENT: Number of rows inserted
```


\section*{Note}

Wildcard match is supported for counter and module names. For example, instead of specifying the full dml_inserts counter name, you can specify dml_i\%. You can also enable, disable, or reset multiple counters or modules at once using a wildcard match. For example, specify dml_\% to enable, disable, or reset all counters that begin with dml_.
8. After the counter is disabled, you can reset all counter values using the innodb_monitor_reset_all option. All values are set to zero or NULL.
```
mysql> SET GLOBAL innodb_monitor_reset_all = dml_inserts;
Query OK, 0 rows affected (0.00 sec)
mysql> SELECT * FROM INFORMATION_SCHEMA.INNODB_METRICS WHERE NAME="dml_inserts"\G
*************************** 1. row ******************************
                        NAME: dml_inserts
            SUBSYSTEM: dml
                    COUNT: 0
            MAX_COUNT: NULL
            MIN_COUNT: NULL
            AVG_COUNT: NULL
        COUNT_RESET: 0
MAX_COUNT_RESET: NULL
MIN_COUNT_RESET: NULL
AVG_COUNT_RESET: NULL
    TIME_ENABLED: NULL
    TIME_DISABLED: NULL
    TIME_ELAPSED: NULL
        TIME_RESET: NULL
                STATUS: disabled
                    TYPE: status_counter
                COMMENT: Number of rows inserted
```


\subsection*{17.15.7 InnoDB INFORMATION_SCHEMA Temporary Table Info Table}

INNODB_TEMP_TABLE_INFO provides information about user-created InnoDB temporary tables that are active in the InnoDB instance. It does not provide information about internal InnoDB temporary tables used by the optimizer.
```
mysql> SHOW TABLES FROM INFORMATION_SCHEMA LIKE 'INNODB_TEMP%';
+----------------------------------------------+
| Tables_in_INFORMATION_SCHEMA (INNODB_TEMP%) |
+-----------------------------------------------
| INNODB_TEMP_TABLE_INFO |
+-----------------------------------------------
```


For the table definition, see Section 28.4.27, "The INFORMATION_SCHEMA INNODB_TEMP_TABLE_INFO Table".

\section*{Example 17.12 INNODB_TEMP_TABLE_INFO}

This example demonstrates characteristics of the INNODB_TEMP_TABLE_INFO table.
1. Create a simple InnoDB temporary table:
```
mysql> CREATE TEMPORARY TABLE t1 (c1 INT PRIMARY KEY) ENGINE=INNODB;
```

2. Query INNODB_TEMP_TABLE_INFO to view the temporary table metadata.
```
mysql> SELECT * FROM INFORMATION_SCHEMA.INNODB_TEMP_TABLE_INFO\G
************************** 1. rOW *****************************************
    TABLE_ID: 194
            NAME: #sql7a79_1_0
        N_COLS: 4
            SPACE: 182
```


The TABLE_ID is a unique identifier for the temporary table. The NAME column displays the system-generated name for the temporary table, which is prefixed with "\#sql". The number of columns (N_COLS) is 4 rather than 1 because InnoDB always creates three hidden table columns (DB_ROW_ID, DB_TRX_ID, and DB_ROLL_PTR).
3. Restart MySQL and query INNODB_TEMP_TABLE_INFO.
```
mysql> SELECT * FROM INFORMATION_SCHEMA.INNODB_TEMP_TABLE_INFO\G
```


An empty set is returned because INNODB_TEMP_TABLE_INFO and its data are not persisted to disk when the server is shut down.
4. Create a new temporary table.
```
mysql> CREATE TEMPORARY TABLE t1 (c1 INT PRIMARY KEY) ENGINE=INNODB;
```

5. Query INNODB_TEMP_TABLE_INFO to view the temporary table metadata.
```
mysql> SELECT * FROM INFORMATION_SCHEMA.INNODB_TEMP_TABLE_INFO\G
*************************** 1. r OW ***************************************
    TABLE_ID: 196
            NAME: #sql7b0e_1_0
        N_COLS: 4
            SPACE: 184
```


The SPACE ID may be different because it is dynamically generated when the server is started.

\subsection*{17.15.8 Retrieving InnoDB Tablespace Metadata from INFORMATION_SCHEMA.FILES}

The Information Schema FILES table provides metadata about all InnoDB tablespace types including file-per-table tablespaces, general tablespaces, the system tablespace, temporary table tablespaces, and undo tablespaces (if present).

This section provides InnoDB-specific usage examples. For more information about data provided by the Information Schema FILES table, see Section 28.3.15, "The INFORMATION_SCHEMA FILES Table".

\section*{Note}

The INNODB_TABLESPACES and INNODB_DATAFILES tables also provide metadata about InnoDB tablespaces, but data is limited to file-per-table, general, and undo tablespaces.

This query retrieves metadata about the InnoDB system tablespace from fields of the Information Schema FILES table that are pertinent to InnoDB tablespaces. FILES columns that are not relevant to InnoDB always return NULL, and are excluded from the query.
```
mysql> SELECT FILE_ID, FILE_NAME, FILE_TYPE, TABLESPACE_NAME, FREE_EXTENTS,
    -> TOTAL_EXTENTS, EXTENT_SIZE, INITIAL_SIZE, MAXIMUM_SIZE, AUTOEXTEND_SIZE, DATA_FREE, STATUS ENG]
    -> FROM INFORMATION_SCHEMA.FILES WHERE TABLESPACE_NAME LIKE 'innodb_system' \G
*************************** 1. row *****************************
        FILE_ID: 0
```

```
            FILE_NAME: ./ibdata1
            FILE_TYPE: TABLESPACE
TABLESPACE_NAME: innodb_system
        FREE_EXTENTS: 0
    TOTAL_EXTENTS: 12
        EXTENT_SIZE: 1048576
    INITIAL_SIZE: 12582912
    MAXIMUM_SIZE: NULL
AUTOEXTEND_SIZE: 67108864
        DATA_FREE: 4194304
            ENGINE: NORMAL
```


This query retrieves the FILE_ID (equivalent to the space ID) and the FILE_NAME (which includes path information) for InnoDB file-per-table and general tablespaces. File-per-table and general tablespaces have a .ibd file extension.
```
mysql> SELECT FILE_ID, FILE_NAME FROM INFORMATION_SCHEMA.FILES
    -> WHERE FILE_NAME LIKE '%.ibd%' ORDER BY FILE_ID;
    +----------+------------------------------------------
    | FILE_ID | FILE_NAME |
    +----------+-----------------------------------------
            ./mysql/plugin.ibd
            ./mysql/servers.ibd
            ./mysql/help_topic.ibd
            ./mysql/help_category.ibd
            ./mysql/help_relation.ibd
            ./mysql/help_keyword.ibd
            ./mysql/time_zone_name.ibd
            ./mysql/time_zone.ibd
            ./mysql/time_zone_transition.ibd
            ./mysql/time_zone_transition_type.ibd
            ./mysql/time_zone_leap_second.ibd
            ./mysql/innodb_table_stats.ibd
            ./mysql/innodb_index_stats.ibd
            ./mysql/slave_relay_log_info.ibd
            ./mysql/slave_master_info.ibd
            ./mysql/slave_worker_info.ibd
            ./mysql/gtid_executed.ibd
            ./mysql/server_cost.ibd
            ./mysql/engine_cost.ibd
            ./sys/sys_config.ibd
            ./test/t1.ibd
        26 | /home/user/test/test/t2.ibd
    +----------+---------------------------------------+
```


This query retrieves the FILE_ID and FILE_NAME for the InnoDB global temporary tablespace. Global temporary tablespace file names are prefixed by ibtmp.
```
mysql> SELECT FILE_ID, FILE_NAME FROM INFORMATION_SCHEMA.FILES
    WHERE FILE_NAME LIKE '%ibtmp%';
+----------+------------+
| FILE_ID | FILE_NAME |
+----------+------------+
| 22 | ./ibtmp1 |
+----------+------------+
```


Similarly, InnoDB undo tablespace file names are prefixed by undo. The following query returns the FILE_ID and FILE_NAME for InnoDB undo tablespaces.
```
mysql> SELECT FILE_ID, FILE_NAME FROM INFORMATION_SCHEMA.FILES
    WHERE FILE_NAME LIKE '%undo%';
```


\subsection*{17.16 InnoDB Integration with MySQL Performance Schema}

This section provides a brief introduction to InnoDB integration with Performance Schema. For comprehensive Performance Schema documentation, see Chapter 29, MySQL Performance Schema.

You can profile certain internal InnoDB operations using the MySQL Performance Schema feature. This type of tuning is primarily for expert users who evaluate optimization strategies to overcome
performance bottlenecks. DBAs can also use this feature for capacity planning, to see whether their typical workload encounters any performance bottlenecks with a particular combination of CPU, RAM, and disk storage; and if so, to judge whether performance can be improved by increasing the capacity of some part of the system.

To use this feature to examine InnoDB performance:
- You must be generally familiar with how to use the Performance Schema feature. For example, you should know how enable instruments and consumers, and how to query performance_schema tables to retrieve data. For an introductory overview, see Section 29.1, "Performance Schema Quick Start".
- You should be familiar with Performance Schema instruments that are available for InnoDB. To view InnoDB-related instruments, you can query the setup_instruments table for instrument names that contain 'innodb'.
```
mysql> SELECT *
    FROM performance_schema.setup_instruments
    WHERE NAME LIKE '%innodb%';
```

![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3300.jpg?height=405&width=1260&top_left_y=968&top_left_x=324)
```
...
| wait/io/file/innodb/innodb_data_file | YES | YES
| wait/io/file/innodb/innodb_log_file | YES | YES
| wait/io/file/innodb/innodb_temp_file | YES | YES
| stage/innodb/alter table (end) | YES | YES
| stage/innodb/alter table (flush) | YES | YES
| stage/innodb/alter table (insert) | YES | YES
| stage/innodb/alter table (log apply index) | YES | YES
| stage/innodb/alter table (log apply table) | YES | YES
| stage/innodb/alter table (merge sort) | YES | YES
| stage/innodb/alter table (read PK and internal sort) | YES | YES
| stage/innodb/buffer pool load | YES | YES
| memory/innodb/buf_buf_pool | NO | NO
| memory/innodb/dict_stats_bg_recalc_pool_t | NO | NO
| memory/innodb/dict_stats_index_map_t | NO | NO
| memory/innodb/dict_stats_n_diff_on_level | NO | NO
| memory/innodb/other | NO | NO
| memory/innodb/row_log_buf | NO | NO
| memory/innodb/row_merge_sort | NO | NO
| memory/innodb/std | NO | NO
| memory/innodb/sync_debug_latches | NO | NO
| memory/innodb/trx_sys_t::rw_trx_ids | NO | NO |
...
+---------------------------------------------------------+------------------
155 rows in set (0.00 sec)
```


For additional information about the instrumented InnoDB objects, you can query Performance Schema instances tables, which provide additional information about instrumented objects. Instance tables relevant to InnoDB include:
- The mutex_instances table
- The rwlock_instances table
- The cond_instances table
- The file_instances table

\section*{Note}

Mutexes and RW-locks related to the InnoDB buffer pool are not included in this coverage; the same applies to the output of the SHOW ENGINE INNODB MUTEX statement.

For example, to view information about instrumented InnoDB file objects seen by the Performance Schema when executing file I/O instrumentation, you might issue the following query:
```
mysql> SELECT *
        FROM performance_schema.file_instances
        WHERE EVENT_NAME LIKE '%innodb%'\G
*************************** 1. row ****************************************
    FILE_NAME: /home/dtprice/mysql-8.4/data/ibdata1
EVENT_NAME: wait/io/file/innodb/innodb_data_file
OPEN_COUNT: 3
*************************** 2. row ****************************************
    FILE_NAME: /home/dtprice/mysql-8.4/data/#ib_16384_0.dblwr
EVENT_NAME: wait/io/file/innodb/innodb_dblwr_file
OPEN_COUNT: 2
************************** 3. row *****************************************
    FILE_NAME: /home/dtprice/mysql-8.4/data/#ib_16384_1.dblwr
EVENT_NAME: wait/io/file/mysql-8.4/innodb_dblwr_file
OPEN_COUNT: 2
...
```

- You should be familiar with performance_schema tables that store InnoDB event data. Tables relevant to InnoDB-related events include:
- The Wait Event tables, which store wait events.
- The Summary tables, which provide aggregated information for terminated events over time. Summary tables include file I/O summary tables, which aggregate information about I/O operations.
- Stage Event tables, which store event data for InnoDB ALTER TABLE and buffer pool load operations. For more information, see Section 17.16.1, "Monitoring ALTER TABLE Progress for InnoDB Tables Using Performance Schema", and Monitoring Buffer Pool Load Progress Using Performance Schema.

If you are only interested in InnoDB-related objects, use the clause WHERE EVENT_NAME LIKE ${ }^{\prime} \% \mathrm{innodb}^{\prime}$ or WHERE NAME LIKE '\%innodb\%' (as required) when querying these tables.

\subsection*{17.16.1 Monitoring ALTER TABLE Progress for InnoDB Tables Using Performance Schema}

You can monitor ALTER TABLE progress for InnoDB tables using Performance Schema.
There are seven stage events that represent different phases of ALTER TABLE. Each stage event reports a running total of WORK_COMPLETED and WORK_ESTIMATED for the overall ALTER TABLE operation as it progresses through its different phases. WORK_ESTIMATED is calculated using a formula that takes into account all of the work that ALTER TABLE performs, and may be revised during ALTER TABLE processing. WORK_COMPLETED and WORK_ESTIMATED values are an abstract representation of all of the work performed by ALTER TABLE.

In order of occurrence, ALTER TABLE stage events include:
- stage/innodb/alter table (read PK and internal sort): This stage is active when ALTER TABLE is in the reading-primary-key phase. It starts with WORK_COMPLETED $=0$ and WORK_ESTIMATED set to the estimated number of pages in the primary key. When the stage is completed, WORK_ESTIMATED is updated to the actual number of pages in the primary key.
- stage/innodb/alter table (merge sort): This stage is repeated for each index added by the ALTER TABLE operation.
- stage/innodb/alter table (insert): This stage is repeated for each index added by the ALTER TABLE operation.
- stage/innodb/alter table (log apply index): This stage includes the application of DML log generated while ALTER TABLE was running.
- stage/innodb/alter table (flush): Before this stage begins, WORK_ESTIMATED is updated with a more accurate estimate, based on the length of the flush list.
- stage/innodb/alter table (log apply table): This stage includes the application of concurrent DML log generated while ALTER TABLE was running. The duration of this phase depends on the extent of table changes. This phase is instant if no concurrent DML was run on the table.
- stage/innodb/alter table (end): Includes any remaining work that appeared after the flush phase, such as reapplying DML that was executed on the table while ALTER TABLE was running.

\section*{Note}

InnoDB ALTER TABLE stage events do not currently account for the addition of spatial indexes.

\section*{ALTER TABLE Monitoring Example Using Performance Schema}

The following example demonstrates how to enable the stage/innodb/alter table\% stage event instruments and related consumer tables to monitor ALTER TABLE progress. For information about Performance Schema stage event instruments and related consumers, see Section 29.12.5, "Performance Schema Stage Event Tables".
1. Enable the stage/innodb/alter\% instruments:
```
mysql> UPDATE performance_schema.setup_instruments
    SET ENABLED = 'YES'
    WHERE NAME LIKE 'stage/innodb/alter%';
Query OK, 7 rows affected (0.00 sec)
Rows matched: 7 Changed: 7 Warnings: 0
```

2. Enable the stage event consumer tables, which include events_stages_current, events_stages_history, and events_stages_history_long.
```
mysql> UPDATE performance_schema.setup_consumers
    SET ENABLED = 'YES'
    WHERE NAME LIKE '%stages%';
Query OK, 3 rows affected (0.00 sec)
Rows matched: 3 Changed: 3 Warnings: 0
```

3. Run an ALTER TABLE operation. In this example, a middle_name column is added to the employees table of the employees sample database.
```
mysql> ALTER TABLE employees.employees ADD COLUMN middle_name varchar(14) AFTER first_name;
Query OK, 0 rows affected (9.27 sec)
Records: 0 Duplicates: 0 Warnings: 0
```

4. Check the progress of the ALTER TABLE operation by querying the Performance Schema events_stages_current table. The stage event shown differs depending on which ALTER TABLE phase is currently in progress. The WORK_COMPLETED column shows the work completed. The WORK_ESTIMATED column provides an estimate of the remaining work.
```
mysql> SELECT EVENT_NAME, WORK_COMPLETED, WORK_ESTIMATED
    FROM performance_schema.events_stages_current;
+-------------------------------------------------------+----------------------------------
| EVENT_NAME | WORK_COMPLETED | WORK_ESTIMATED |
+---------------------------------------------------------+--------------------------------
```

```
stage/innodb/alter table (read PK and internal sort) | 280 | 1245 |
row in set (0.01 sec)
```


The events_stages_current table returns an empty set if the ALTER TABLE operation has completed. In this case, you can check the events_stages_history table to view event data for the completed operation. For example:
```
mysql> SELECT EVENT_NAME, WORK_COMPLETED, WORK_ESTIMATED
        FROM performance_schema.events_stages_history;
```

```
+-------------------------------------------------------+----------------+-----------------
    EVENT_NAME | WORK_COMPLETED | WORK_ESTIMATED |
+-----------------------------------------------------+---------------+--------------+
    stage/innodb/alter table (read PK and internal sort) | 886 | 1213
    stage/innodb/alter table (flush)
    stage/innodb/alter table (log apply table)
    stage/innodb/alter table (end)
    stage/innodb/alter table (log apply table) 1981 | 1981 |
    rows in set (0.00 sec)
```


As shown above, the WORK_ESTIMATED value was revised during ALTER TABLE processing. The estimated work after completion of the initial stage is 1213 . When ALTER TABLE processing completed, WORK_ESTIMATED was set to the actual value, which is 1981.

\subsection*{17.16.2 Monitoring InnoDB Mutex Waits Using Performance Schema}

A mutex is a synchronization mechanism used in the code to enforce that only one thread at a given time can have access to a common resource. When two or more threads executing in the server need to access the same resource, the threads compete against each other. The first thread to obtain a lock on the mutex causes the other threads to wait until the lock is released.

For InnoDB mutexes that are instrumented, mutex waits can be monitored using Performance Schema. Wait event data collected in Performance Schema tables can help identify mutexes with the most waits or the greatest total wait time, for example.

The following example demonstrates how to enable InnoDB mutex wait instruments, how to enable associated consumers, and how to query wait event data.
1. To view available InnoDB mutex wait instruments, query the Performance Schema setup_instruments table. All InnoDB mutex wait instruments are disabled by default.
```
mysql> SELECT *
        FROM performance_schema.setup_instruments
        WHERE NAME LIKE '%wait/synch/mutex/innodb%';
+-----------------------------------------------------------------------------
| NAME | ENABLED | TIMED |
+-----------------------------------------------------------+---------+------+
| wait/synch/mutex/innodb/commit_cond_mutex | NO | NO
| wait/synch/mutex/innodb/innobase_share_mutex | NO | NO
| wait/synch/mutex/innodb/autoinc_mutex | NO | NO
| wait/synch/mutex/innodb/autoinc_persisted_mutex | NO | NO
| wait/synch/mutex/innodb/buf_pool_flush_state_mutex | NO | NO
| wait/synch/mutex/innodb/buf_pool_LRU_list_mutex | NO | NO
| wait/synch/mutex/innodb/buf_pool_free_list_mutex | NO | NO
| wait/synch/mutex/innodb/buf_pool_zip_free_mutex | NO | NO
| wait/synch/mutex/innodb/buf_pool_zip_hash_mutex | NO | NO
| wait/synch/mutex/innodb/buf_pool_zip_mutex | NO | NO
| wait/synch/mutex/innodb/cache_last_read_mutex | NO | NO
| wait/synch/mutex/innodb/dict_foreign_err_mutex | NO | NO
| wait/synch/mutex/innodb/dict_persist_dirty_tables_mutex | NO | NO
| wait/synch/mutex/innodb/dict_sys_mutex | NO | NO
| wait/synch/mutex/innodb/recalc_pool_mutex | NO | NO
| wait/synch/mutex/innodb/fil_system_mutex | NO | NO
| wait/synch/mutex/innodb/flush_list_mutex | NO | NO
| wait/synch/mutex/innodb/fts_bg_threads_mutex | NO | NO
| wait/synch/mutex/innodb/fts_delete_mutex | NO | NO
| wait/synch/mutex/innodb/fts_optimize_mutex | NO | NO
```

```
| wait/synch/mutex/innodb/fts_doc_id_mutex | NO | NO
| wait/synch/mutex/innodb/log_flush_order_mutex | NO | NO
| wait/synch/mutex/innodb/hash_table_mutex | NO | NO
| wait/synch/mutex/innodb/ibuf_bitmap_mutex | NO | NO
| wait/synch/mutex/innodb/ibuf_mutex | NO | NO
| wait/synch/mutex/innodb/ibuf_pessimistic_insert_mutex | NO | NO
| wait/synch/mutex/innodb/log_sys_mutex | NO | NO
| wait/synch/mutex/innodb/log_sys_write_mutex | NO | NO
| wait/synch/mutex/innodb/mutex_list_mutex | NO | NO
| wait/synch/mutex/innodb/page_zip_stat_per_index_mutex | NO | NO
| wait/synch/mutex/innodb/purge_sys_pq_mutex | NO | NO
| wait/synch/mutex/innodb/recv_sys_mutex | NO | NO
| wait/synch/mutex/innodb/recv_writer_mutex | NO | NO
| wait/synch/mutex/innodb/redo_rseg_mutex | NO | NO
| wait/synch/mutex/innodb/noredo_rseg_mutex | NO | NO
| wait/synch/mutex/innodb/rw_lock_list_mutex | NO | NO
| wait/synch/mutex/innodb/rw_lock_mutex | NO | NO
| wait/synch/mutex/innodb/srv_dict_tmpfile_mutex | NO | NO
| wait/synch/mutex/innodb/srv_innodb_monitor_mutex | NO | NO
| wait/synch/mutex/innodb/srv_misc_tmpfile_mutex | NO | NO
| wait/synch/mutex/innodb/srv_monitor_file_mutex | NO | NO
| wait/synch/mutex/innodb/buf_dblwr_mutex | NO | NO
| wait/synch/mutex/innodb/trx_undo_mutex | NO | NO
| wait/synch/mutex/innodb/trx_pool_mutex | NO | NO
| wait/synch/mutex/innodb/trx_pool_manager_mutex | NO | NO
| wait/synch/mutex/innodb/srv_sys_mutex | NO | NO
| wait/synch/mutex/innodb/lock_mutex | NO | NO
| wait/synch/mutex/innodb/lock_wait_mutex | NO | NO
| wait/synch/mutex/innodb/trx_mutex | NO | NO
| wait/synch/mutex/innodb/srv_threads_mutex | NO | NO
| wait/synch/mutex/innodb/rtr_active_mutex | NO | NO
| wait/synch/mutex/innodb/rtr_match_mutex | NO | NO
| wait/synch/mutex/innodb/rtr_path_mutex | NO | NO
| wait/synch/mutex/innodb/rtr_ssn_mutex | NO | NO
| wait/synch/mutex/innodb/trx_sys_mutex | NO | NO
| wait/synch/mutex/innodb/zip_pad_mutex | NO | NO
| wait/synch/mutex/innodb/master_key_id_mutex | NO | NO
```

2. Some InnoDB mutex instances are created at server startup and are only instrumented if the associated instrument is also enabled at server startup. To ensure that all InnoDB mutex instances are instrumented and enabled, add the following performance-schema-instrument rule to your MySQL configuration file:
```
performance-schema-instrument='wait/synch/mutex/innodb/%=ON'
```


If you do not require wait event data for all InnoDB mutexes, you can disable specific instruments by adding additional performance-schema-instrument rules to your MySQL configuration file. For example, to disable InnoDB mutex wait event instruments related to full-text search, add the following rule:
```
performance-schema-instrument='wait/synch/mutex/innodb/fts%=OFF'
```


Note
Rules with a longer prefix such as wait/synch/mutex/innodb/fts\% take precedence over rules with shorter prefixes such as wait/synch/ mutex/innodb/\%.

After adding the performance-schema-instrument rules to your configuration file, restart the server. All the InnoDB mutexes except for those related to full text search are enabled. To verify, query the setup_instruments table. The ENABLED and TIMED columns should be set to YES for the instruments that you enabled.
```
mysql> SELECT *
    FROM performance_schema.setup_instruments
    WHERE NAME LIKE '%wait/synch/mutex/innodb%';
+--------------------------------------------------------+------------------
```

```
| NAME | ENABLED | TIMED |
| wait/synch/mutex/innodb/commit_cond_mutex | YES | YES
| wait/synch/mutex/innodb/innobase_share_mutex | YES | YES
| wait/synch/mutex/innodb/autoinc_mutex | YES | YES
...
| wait/synch/mutex/innodb/master_key_id_mutex | YES | YES |
+--------------------------------------------------------+------------------
49 rows in set (0.00 sec)
```

3. Enable wait event consumers by updating the setup_consumers table. Wait event consumers are disabled by default.
```
mysql> UPDATE performance_schema.setup_consumers
    SET enabled = 'YES'
    WHERE name like 'events_waits%';
Query OK, 3 rows affected (0.00 sec)
Rows matched: 3 Changed: 3 Warnings: 0
```


You can verify that wait event consumers are enabled by querying the setup_consumers table. The events_waits_current, events_waits_history, and events_waits_history_long consumers should be enabled.
```
mysql> SELECT * FROM performance_schema.setup_consumers;
+------------------------------------+---------+

\begin{tabular}{|l|l|}
\hline NAME & ENABLED \\
\hline events_stages_current & N0 \\
\hline events_stages_history & NO \\
\hline events_stages_history_long & NO \\
\hline events_statements_current & YES \\
\hline events_statements_history & YES \\
\hline events_statements_history_long & NO \\
\hline events_transactions_current & YES \\
\hline events_transactions_history & YES \\
\hline events_transactions_history_long & NO \\
\hline events_waits_current & YES \\
\hline events_waits_history & YES \\
\hline events_waits_history_long & YES \\
\hline global_instrumentation & YES \\
\hline thread_instrumentation & YES \\
\hline statements_digest & YES \\
\hline
\end{tabular}
15 rows in set (0.00 sec)
```

4. Once instruments and consumers are enabled, run the workload that you want to monitor. In this example, the mysqlslap load emulation client is used to simulate a workload.
```
$> ./mysqlslap --auto-generate-sql --concurrency=100 --iterations=10
    --number-of-queries=1000 --number-char-cols=6 --number-int-cols=6;
```

5. Query the wait event data. In this example, wait event data is queried from the events_waits_summary_global_by_event_name table which aggregates data found in the events_waits_current, events_waits_history, and events_waits_history_long tables. Data is summarized by event name (EVENT_NAME), which is the name of the instrument that produced the event. Summarized data includes:
- COUNT_STAR

The number of summarized wait events.
- SUM_TIMER_WAIT

The total wait time of the summarized timed wait events.
- MIN_TIMER_WAIT

The minimum wait time of the summarized timed wait events.

\section*{- AVG_TIMER_WAIT}

The average wait time of the summarized timed wait events.

\section*{- MAX_TIMER_WAIT}

The maximum wait time of the summarized timed wait events.

The following query returns the instrument name (EVENT_NAME), the number of wait events (COUNT_STAR), and the total wait time for the events for that instrument (SUM_TIMER_WAIT). Because waits are timed in picoseconds (trillionths of a second) by default, wait times are divided by 1000000000 to show wait times in milliseconds. Data is presented in descending order, by the number of summarized wait events (COUNT_STAR). You can adjust the ORDER BY clause to order the data by total wait time.
```
mysql> SELECT EVENT_NAME, COUNT_STAR, SUM_TIMER_WAIT/1000000000 SUM_TIMER_WAIT_MS
    FROM performance_schema.events_waits_summary_global_by_event_name
    WHERE SUM_TIMER_WAIT > 0 AND EVENT_NAME LIKE 'wait/synch/mutex/innodb/%'
    ORDER BY COUNT_STAR DESC;

\begin{tabular}{|l|l|l|}
\hline EVENT_NAME & COUNT_STAR & SUM_TIMER_WAIT_MS \\
\hline wait/synch/mutex/innodb/trx_mutex & 201111 & 23.4719 \\
\hline wait/synch/mutex/innodb/fil_system_mutex & 62244 & 9.6426 \\
\hline wait/synch/mutex/innodb/redo_rseg_mutex & 48238 & 3.1135 \\
\hline wait/synch/mutex/innodb/log_sys_mutex & 46113 & 2.0434 \\
\hline wait/synch/mutex/innodb/trx_sys_mutex & 35134 & 1068.1588 \\
\hline wait/synch/mutex/innodb/lock_mutex & 34872 & 1039.2589 \\
\hline wait/synch/mutex/innodb/log_sys_write_mutex & 17805 & 1526.0490 \\
\hline wait/synch/mutex/innodb/dict_sys_mutex & 14912 & 1606.7348 \\
\hline wait/synch/mutex/innodb/trx_undo_mutex & 10634 & 1.1424 \\
\hline wait/synch/mutex/innodb/rw_lock_list_mutex & 8538 & 0.1960 \\
\hline wait/synch/mutex/innodb/buf_pool_free_list_mutex & 5961 & 0.6473 \\
\hline wait/synch/mutex/innodb/trx_pool_mutex & 4885 & 8821.7496 \\
\hline wait/synch/mutex/innodb/buf_pool_LRU_list_mutex & 4364 & 0.2077 \\
\hline wait/synch/mutex/innodb/innobase_share_mutex & 3212 & 0.2650 \\
\hline wait/synch/mutex/innodb/flush_list_mutex & 3178 & 0.2349 \\
\hline wait/synch/mutex/innodb/trx_pool_manager_mutex & 2495 & 0.1310 \\
\hline wait/synch/mutex/innodb/buf_pool_flush_state_mutex & 1318 & 0.2161 \\
\hline wait/synch/mutex/innodb/log_flush_order_mutex & 1250 & 0.0893 \\
\hline wait/synch/mutex/innodb/buf_dblwr_mutex & 951 & 0.0918 \\
\hline wait/synch/mutex/innodb/recalc_pool_mutex & 670 & 0.0942 \\
\hline wait/synch/mutex/innodb/dict_persist_dirty_tables_mutex & 345 & 0.0414 \\
\hline wait/synch/mutex/innodb/lock_wait_mutex & 303 & 0.1565 \\
\hline wait/synch/mutex/innodb/autoinc_mutex & 196 & 0.0213 \\
\hline wait/synch/mutex/innodb/autoinc_persisted_mutex & 196 & 0.0175 \\
\hline wait/synch/mutex/innodb/purge_sys_pq_mutex & 117 & 0.0308 \\
\hline wait/synch/mutex/innodb/srv_sys_mutex & 94 & 0.0077 \\
\hline wait/synch/mutex/innodb/ibuf_mutex & 22 & 0.0086 \\
\hline wait/synch/mutex/innodb/recv_sys_mutex & 12 & 0.0008 \\
\hline wait/synch/mutex/innodb/srv_innodb_monitor_mutex & 4 & 0.0009 \\
\hline wait/synch/mutex/innodb/recv_writer_mutex & 1 & 0.0005 \\
\hline
\end{tabular}
```


\section*{Note}

The preceding result set includes wait event data produced during the startup process. To exclude this data, you can truncate the events_waits_summary_global_by_event_name table immediately after startup and before running your workload. However, the truncate operation itself may produce a negligible amount wait event data.
```
mysql> TRUNCATE performance_schema.events_waits_summary_global_by_event_name;
```


\subsection*{17.17 InnoDB Monitors}

InnoDB monitors provide information about the InnoDB internal state. This information is useful for performance tuning.

\subsection*{17.17.1 InnoDB Monitor Types}

There are two types of InnoDB monitor:
- The standard InnoDB Monitor displays the following types of information:
- Work done by the main background thread
- Semaphore waits
- Data about the most recent foreign key and deadlock errors
- Lock waits for transactions
- Table and record locks held by active transactions
- Pending I/O operations and related statistics
- Insert buffer and adaptive hash index statistics
- Redo log data
- Buffer pool statistics
- Row operation data
- The InnoDB Lock Monitor prints additional lock information as part of the standard InnoDB Monitor output.

\subsection*{17.17.2 Enabling InnoDB Monitors}

When InnoDB monitors are enabled for periodic output, InnoDB writes the output to mysqld server standard error output (stderr) every 15 seconds, approximately.

InnoDB sends the monitor output to stderr rather than to stdout or fixed-size memory buffers to avoid potential buffer overflows.

On Windows, stderr is directed to the default log file unless configured otherwise. If you want to direct the output to the console window rather than to the error log, start the server from a command prompt in a console window with the --console option. For more information, see Default Error Log Destination on Windows.

On Unix and Unix-like systems, stderr is typically directed to the terminal unless configured otherwise. For more information, see Default Error Log Destination on Unix and Unix-Like Systems.

InnoDB monitors should only be enabled when you actually want to see monitor information because output generation causes some performance decrement. Also, if monitor output is directed to the error log, the log may become quite large if you forget to disable the monitor later.

\section*{Note}

To assist with troubleshooting, InnoDB temporarily enables standard InnoDB Monitor output under certain conditions. For more information, see Section 17.20, "InnoDB Troubleshooting".

InnoDB monitor output begins with a header containing a timestamp and the monitor name. For example:
```
2014-10-16 18:37:29 0x7fc2a95c1700 INNODB MONITOR OUTPUT
```


The header for the standard InnoDB Monitor (INNODB MONITOR OUTPUT) is also used for the Lock Monitor because the latter produces the same output with the addition of extra lock information.

The innodb_status_output and innodb_status_output_locks system variables are used to enable the standard InnoDB Monitor and InnoDB Lock Monitor.

The PROCESS privilege is required to enable or disable InnoDB Monitors.

\section*{Enabling the Standard InnoDB Monitor}

Enable the standard InnoDB Monitor by setting the innodb_status_output system variable to ON.
SET GLOBAL innodb_status_output=ON;
To disable the standard InnoDB Monitor, set innodb_status_output to OFF.
When you shut down the server, the innodb_status_output variable is set to the default 0FF value.

\section*{Enabling the InnoDB Lock Monitor}

InnoDB Lock Monitor data is printed with the InnoDB Standard Monitor output. Both the InnoDB Standard Monitor and InnoDB Lock Monitor must be enabled to have InnoDB Lock Monitor data printed periodically.

To enable the InnoDB Lock Monitor, set the innodb_status_output_locks system variable to ON. Both the InnoDB standard Monitor and InnoDB Lock Monitor must be enabled to have InnoDB Lock Monitor data printed periodically:

SET GLOBAL innodb_status_output=ON;
SET GLOBAL innodb_status_output_locks=ON;
To disable the InnoDB Lock Monitor, set innodb_status_output_locks to 0FF. Set innodb_status_output to OFF to also disable the InnoDB Standard Monitor.

When you shut down the server, the innodb_status_output and innodb_status_output_locks variables are set to the default OFF value.

\section*{Note}

To enable the InnoDB Lock Monitor for SHOW ENGINE INNODB STATUS output, you are only required to enable innodb_status_output_locks.

\section*{Obtaining Standard InnoDB Monitor Output On Demand}

As an alternative to enabling the standard InnoDB Monitor for periodic output, you can obtain standard InnoDB Monitor output on demand using the SHOW ENGINE INNODB STATUS SQL statement, which fetches the output to your client program. If you are using the mysql interactive client, the output is more readable if you replace the usual semicolon statement terminator with \G:
mysql> SHOW ENGINE INNODB STATUS\G
SHOW ENGINE INNODB STATUS output also includes InnoDB Lock Monitor data if the InnoDB Lock Monitor is enabled.

\section*{Directing Standard InnoDB Monitor Output to a Status File}

Standard InnoDB Monitor output can be enabled and directed to a status file by specifying the - -innodb-status-file option at startup. When this option is used, InnoDB creates a file named innodb_status.pid in the data directory and writes output to it every 15 seconds, approximately.

InnoDB removes the status file when the server is shut down normally. If an abnormal shutdown occurs, the status file may have to be removed manually.

The --innodb-status-file option is intended for temporary use, as output generation can affect performance, and the innodb_status.pid file can become quite large over time.

\subsection*{17.17.3 InnoDB Standard Monitor and Lock Monitor Output}

The Lock Monitor is the same as the Standard Monitor except that it includes additional lock information. Enabling either monitor for periodic output turns on the same output stream, but the stream includes extra information if the Lock Monitor is enabled. For example, if you enable the Standard Monitor and Lock Monitor, that turns on a single output stream. The stream includes extra lock information until you disable the Lock Monitor.

Standard Monitor output is limited to 1 MB when produced using the SHOW ENGINE INNODB STATUS statement. This limit does not apply to output written to server standard error output (stderr).

Example Standard Monitor output:
```
mysql> SHOW ENGINE INNODB STATUS\G
*************************** 1. rOW ****************************************
    Type: InnoDB
    Name:
Status:
================================
Per second averages calculated from the last 4 seconds
BACKGROUND THREAD
srv_master_thread loops: 15 srv_active, 0 srv_shutdown, 1122 srv_idle
srv_master_thread log flush and writes: 0
------
SEMAPHORES
OS WAIT ARRAY INFO: reservation count 24
OS WAIT ARRAY INFO: signal count 24
RW-shared spins 4, rounds 8, OS waits 4
RW-excl spins 2, rounds 60, OS waits 2
RW-sx spins 0, rounds 0, OS waits 0
Spin rounds per wait: 2.00 RW-shared, 30.00 RW-excl, 0.00 RW-sx
--------------------------
LATEST FOREIGN KEY ERROR
--------------------------
2018-04-12 14:57:24 0x7f97a9c91700 Transaction:
TRANSACTION 7717, ACTIVE 0 sec inserting
mysql tables in use 1, locked 1
4 lock struct(s), heap size 1136, 3 row lock(s), undo log entries 3
MySQL thread id 8, OS thread handle 140289365317376, query id 14 localhost root update
INSERT INTO child VALUES (NULL, 1), (NULL, 2), (NULL, 3), (NULL, 4), (NULL, 5), (NULL, 6)
Foreign key constraint fails for table ˋtestˋ.ˋchildˋ:
'
    CONSTRAINT ˋchild_ibfk_1ˋ FOREIGN KEY (ˋparent_idˋ) REFERENCES ˋparentˋ (ˋidˋ) ON DELETE
    CASCADE ON UPDATE CASCADE
Trying to add in child table, in index par_ind tuple:
DATA TUPLE: 2 fields;
    0: len 4; hex 80000003; asc ;;
    1: len 4; hex 80000003; asc ;;
But in parent table ˋtestˋ.ˋparentˋ, in index PRIMARY,
the closest match we can find is record:
PHYSICAL RECORD: n_fields 3; compact format; info bits 0
    0: len 4; hex 80000004; asc ;;
    1: len 6; hex 000000001e19; asc ;;
    2: len 7; hex 81000001110137; asc 7;;
TRANSACTIONS
Trx id counter 7748
Purge done for trx's n:o < 7747 undo n:o < 0 state: running but idle
History list length 19
```


\section*{LIST OF TRANSACTIONS FOR EACH SESSION:}
```
---TRANSACTION 421764459790000, not started
0 lock struct(s), heap size 1136, 0 row lock(s)
---TRANSACTION 7747, ACTIVE 23 sec starting index read
mysql tables in use 1, locked 1
LOCK WAIT 2 lock struct(s), heap size 1136, 1 row lock(s)
MySQL thread id 9, OS thread handle 140286987249408, query id 51 localhost root updating
DELETE FROM t WHERE i = 1
------- TRX HAS BEEN WAITING 23 SEC FOR THIS LOCK TO BE GRANTED:
RECORD LOCKS space id 4 page no 4 n bits 72 index GEN_CLUST_INDEX of table ˋtestˋ.ˋtˋ
trx id 7747 lock_mode X waiting
Record lock, heap no 3 PHYSICAL RECORD: n_fields 4; compact format; info bits 0
    0: len 6; hex 000000000202; asc ;;
    1: len 6; hex 000000001e41; asc A;;
    2: len 7; hex 820000008b0110; asc ;;
    3: len 4; hex 80000001; asc ;;
```


TABLE LOCK table ˋtestˋ.ˋtˋ trx id 7747 lock mode IX
RECORD LOCKS space id 4 page no 4 n bits 72 index GEN_CLUST_INDEX of table ˋtestˋ.ˋtˋ
trx id 7747 lock_mode X waiting
Record lock, heap no 3 PHYSICAL RECORD: n_fields 4; compact format; info bits 0
    0: len 6; hex 000000000202; asc ;;
    1: len 6; hex 000000001e41; asc A;;
    2: len 7; hex 820000008b0110; asc ;;
    3: len 4; hex 80000001; asc ;;
-
FILE I/0
-------
I/O thread 0 state: waiting for i/o request (insert buffer thread)
I/0 thread 1 state: waiting for i/o request (log thread)
I/O thread 2 state: waiting for i/o request (read thread)
I/O thread 3 state: waiting for i/o request (read thread)
I/O thread 4 state: waiting for i/o request (read thread)
I/0 thread 5 state: waiting for i/o request (read thread)
I/O thread 6 state: waiting for i/o request (write thread)
I/0 thread 7 state: waiting for i/o request (write thread)
I/0 thread 8 state: waiting for i/o request (write thread)
I/O thread 9 state: waiting for i/o request (write thread)
Pending normal aio reads: [0, 0, 0, 0] , aio writes: [0, 0, 0, 0] ,
    ibuf aio reads:, log i/o's:, sync i/o's:
Pending flushes (fsync) log: 0; buffer pool: 0
833 OS file reads, 605 OS file writes, 208 OS fsyncs
0.00 reads/s, 0 avg bytes/read, 0.00 writes/s, 0.00 fsyncs/s
INSERT BUFFER AND ADAPTIVE HASH INDEX
Ibuf: size 1, free list len 0 , seg size 2 , 0 merges
merged operations:
    insert 0, delete mark 0, delete 0
discarded operations:
    insert 0, delete mark 0, delete 0
Hash table size 553253, node heap has 0 buffer(s)
Hash table size 553253, node heap has 1 buffer(s)
Hash table size 553253, node heap has 3 buffer(s)
Hash table size 553253, node heap has 0 buffer(s)
Hash table size 553253, node heap has 0 buffer(s)
Hash table size 553253, node heap has 0 buffer(s)
Hash table size 553253, node heap has 0 buffer(s)
Hash table size 553253, node heap has 0 buffer(s)
0.00 hash searches/s, 0.00 non-hash searches/s
---
LOG
---

\begin{tabular}{ll} 
Log sequence number & 19643450 \\
Log buffer assigned up to & 19643450 \\
Log buffer completed up to & 19643450 \\
Log written up to & 19643450 \\
Log flushed up to & 19643450 \\
Added dirty pages up to & 19643450 \\
Pages flushed up to & 19643450
\end{tabular}

\begin{tabular}{|l|}
\hline Last checkpoint at 19643450 129 log i/o's done, 0.00 log i/o's/second \\
\hline BUFFER POOL AND MEMORY \\
\hline Buffer pool hit rate 1000 / 1000, young-making rate 0 / 1000 not $0 / 1000$ Pages read ahead 0.00/s, evicted without access 0.00/s, Random read ahead 0.00/s LRU len: 973, unzip_LRU len: 0 I/O sum[0]:cur[0], unzip sum[0]:cur[0] \\
\hline INDIVIDUAL BUFFER POOL INFO \\
\hline ---BUFFER POOL 0 \\
\hline Buffer pool size \\
\hline Free buffers \\
\hline Database pages 491 \\
\hline Old database pages 0 \\
\hline Modified db pages 0 \\
\hline Pending reads 0 \\
\hline Pending writes: LRU 0, flush list 0, single page 0 Pages made young 0, not young 0 0.00 youngs/s, 0.00 non-youngs/s Pages read 411, created 80, written 210 0.00 reads/s, 0.00 creates/s, 0.00 writes/s \\
\hline Buffer pool size 65536 \\
\hline Free buffers 65052 \\
\hline Database pages 482 \\
\hline Old database pages 0 \\
\hline Modified db pages 0 \\
\hline Pending reads 0 \\
\hline Pending writes: LRU 0, flush list 0, single page 0 Pages made young 0, not young 0 0.00 youngs/s, 0.00 non-youngs/s \\
\hline Pages read 399, created 83, written 194 0.00 reads/s, 0.00 creates/s, 0.00 writes/s No buffer pool page gets since the last printout \\
\hline ROW OPERATIONS \\
\hline 0 queries inside InnoDB, 0 queries in queue 0 read views open inside InnoDB \\
\hline Process ID=5772, Main thread ID=140286437054208 , state=sleeping Number of rows inserted 57, updated 354, deleted 4, read 4421 0.00 inserts/s, 0.00 updates/s, 0.00 deletes/s, 0.00 reads/s \\
\hline END OF INNODB MONITOR OUTPUT \\
\hline
\end{tabular}

\section*{Standard Monitor Output Sections}

For a description of each metric reported by the Standard Monitor, refer to the Metrics chapter in the Oracle Enterprise Manager for MySQL Database User's Guide.
- Status

This section shows the timestamp, the monitor name, and the number of seconds that per-second averages are based on. The number of seconds is the elapsed time between the current time and the last time InnoDB Monitor output was printed.
- BACKGROUND THREAD

The srv_master_thread lines shows work done by the main background thread.
- SEMAPHORES

This section reports threads waiting for a semaphore and statistics on how many times threads have needed a spin or a wait on a mutex or a rw-lock semaphore. A large number of threads waiting for semaphores may be a result of disk I/O, or contention problems inside InnoDB. Contention can be due to heavy parallelism of queries or problems in operating system thread scheduling. Setting the innodb_thread_concurrency system variable smaller than the default value might help in such situations. The Spin rounds per wait line shows the number of spinlock rounds per OS wait for a mutex.

Mutex metrics are reported by SHOW ENGINE INNODB MUTEX.
- LATEST FOREIGN KEY ERROR

This section provides information about the most recent foreign key constraint error. It is not present if no such error has occurred. The contents include the statement that failed as well as information about the constraint that failed and the referenced and referencing tables.
- LATEST DETECTED DEADLOCK

This section provides information about the most recent deadlock. It is not present if no deadlock has occurred. The contents show which transactions are involved, the statement each was attempting to execute, the locks they have and need, and which transaction InnoDB decided to roll back to break the deadlock. The lock modes reported in this section are explained in Section 17.7.1, "InnoDB Locking".
- TRANSACTIONS

If this section reports lock waits, your applications might have lock contention. The output can also help to trace the reasons for transaction deadlocks.
- FILE I/O

This section provides information about threads that InnoDB uses to perform various types of I/ O. The first few of these are dedicated to general InnoDB processing. The contents also display information for pending I/O operations and statistics for I/O performance.

The number of these threads are controlled by the innodb_read_io_threads and innodb_write_io_threads parameters. See Section 17.14, "InnoDB Startup Options and System Variables".
- INSERT BUFFER AND ADAPTIVE HASH INDEX

This section shows the status of the InnoDB insert buffer (also referred to as the change buffer) and the adaptive hash index.

For related information, see Section 17.5.2, "Change Buffer", and Section 17.5.3, "Adaptive Hash Index".
- LOG

This section displays information about the InnoDB log. The contents include the current log sequence number, how far the log has been flushed to disk, and the position at which InnoDB last took a checkpoint. (See Section 17.11.3, "InnoDB Checkpoints".) The section also displays information about pending writes and write performance statistics.
- BUFFER POOL AND MEMORY

This section gives you statistics on pages read and written. You can calculate from these numbers how many data file I/O operations your queries currently are doing.

For buffer pool statistics descriptions, see Monitoring the Buffer Pool Using the InnoDB Standard Monitor. For additional information about the operation of the buffer pool, see Section 17.5.1, "Buffer Pool".
- ROW OPERATIONS

This section shows what the main thread is doing, including the number and performance rate for each type of row operation.

\subsection*{17.18 InnoDB Backup and Recovery}

This section covers topics related to InnoDB backup and recovery.
- For information about backup techniques applicable to InnoDB, see Section 17.18.1, "InnoDB Backup".
- For information about point-in-time recovery, recovery from disk failure or corruption, and how InnoDB performs crash recovery, see Section 17.18.2, "InnoDB Recovery".

\subsection*{17.18.1 InnoDB Backup}

The key to safe database management is making regular backups. Depending on your data volume, number of MySQL servers, and database workload, you can use these backup techniques, alone or in combination: hot backup with MySQL Enterprise Backup; cold backup by copying files while the MySQL server is shut down; logical backup with mysqldump for smaller data volumes or to record the structure of schema objects. Hot and cold backups are physical backups that copy actual data files, which can be used directly by the mysqld server for faster restore.

Using MySQL Enterprise Backup is the recommended method for backing up InnoDB data.
Note
InnoDB does not support databases that are restored using third-party backup tools.

\section*{Hot Backups}

The mysqlbackup command, part of the MySQL Enterprise Backup component, lets you back up a running MySQL instance, including InnoDB tables, with minimal disruption to operations while producing a consistent snapshot of the database. When mysqlbackup is copying InnoDB tables, reads and writes to InnoDB tables can continue. MySQL Enterprise Backup can also create compressed backup files, and back up subsets of tables and databases. In conjunction with the MySQL binary log, users can perform point-in-time recovery. MySQL Enterprise Backup is part of the MySQL Enterprise subscription. For more details, see Section 32.1, "MySQL Enterprise Backup Overview".

\section*{Cold Backups}

If you can shut down the MySQL server, you can make a physical backup that consists of all files used by InnoDB to manage its tables. Use the following procedure:
1. Perform a slow shutdown of the MySQL server and make sure that it stops without errors.
2. Copy all InnoDB data files (ibdata files and . ibd files) into a safe place.
3. Copy all InnoDB redo log files (\#ib_redoN files) to a safe place.
4. Copy your my. cnf configuration file or files to a safe place.

\section*{Logical Backups Using mysqldump}

In addition to physical backups, it is recommended that you regularly create logical backups by dumping your tables using mysqldump. A binary file might be corrupted without you noticing it. Dumped tables are stored into text files that are human-readable, so spotting table corruption becomes easier. Also, because the format is simpler, the chance for serious data corruption is smaller. mysqldump also has a--single-transaction option for making a consistent snapshot without locking out other clients. See Section 9.3.1, "Establishing a Backup Policy".

Replication works with InnoDB tables, so you can use MySQL replication capabilities to keep a copy of your database at database sites requiring high availability. See Section 17.19, "InnoDB and MySQL Replication".

\subsection*{17.18.2 InnoDB Recovery}

This section describes InnoDB recovery. Topics include:
- Point-in-Time Recovery
- Recovery from Data Corruption or Disk Failure
- InnoDB Crash Recovery
- Tablespace Discovery During Crash Recovery

\section*{Point-in-Time Recovery}

To recover an InnoDB database to the present from the time at which the physical backup was made, you must run MySQL server with binary logging enabled, even before taking the backup. To achieve point-in-time recovery after restoring a backup, you can apply changes from the binary log that occurred after the backup was made. See Section 9.5, "Point-in-Time (Incremental) Recovery".

\section*{Recovery from Data Corruption or Disk Failure}

If your database becomes corrupted or disk failure occurs, you must perform the recovery using a backup. In the case of corruption, first find a backup that is not corrupted. After restoring the base backup, do a point-in-time recovery from the binary log files using mysqlbinlog and mysql to restore the changes that occurred after the backup was made.

In some cases of database corruption, it is enough to dump, drop, and re-create one or a few corrupt tables. You can use the CHECK TABLE statement to check whether a table is corrupt, although CHECK TABLE naturally cannot detect every possible kind of corruption.

In some cases, apparent database page corruption is actually due to the operating system corrupting its own file cache, and the data on disk may be okay. It is best to try restarting the computer first. Doing so may eliminate errors that appeared to be database page corruption. If MySQL still has trouble starting because of InnoDB consistency problems, see Section 17.20.3, "Forcing InnoDB Recovery" for steps to start the instance in recovery mode, which permits you to dump the data.

\section*{InnoDB Crash Recovery}

To recover from an unexpected MySQL server exit, the only requirement is to restart the MySQL server. InnoDB automatically checks the logs and performs a roll-forward of the database to the
present. InnoDB automatically rolls back uncommitted transactions that were present at the time of the crash.

InnoDB crash recovery consists of several steps:
- Tablespace discovery

Tablespace discovery is the process that InnoDB uses to identify tablespaces that require redo log application. See Tablespace Discovery During Crash Recovery.
- Redo log application

Redo log application is performed during initialization, before accepting any connections. If all changes are flushed from the buffer pool to the tablespaces (ibdata* and *.ibd files) at the time of the shutdown or crash, redo log application is skipped. InnoDB also skips redo log application if redo log files are missing at startup.
- The current maximum auto-increment counter value is written to the redo log each time the value changes, which makes it crash-safe. During recovery, InnoDB scans the redo log to collect counter value changes and applies the changes to the in-memory table object.

For more information about how InnoDB handles auto-increment values, see Section 17.6.1.6, "AUTO_INCREMENT Handling in InnoDB", and InnoDB AUTO_INCREMENT Counter Initialization.
- When encountering index tree corruption, InnoDB writes a corruption flag to the redo log, which makes the corruption flag crash-safe. InnoDB also writes in-memory corruption flag data to an engine-private system table on each checkpoint. During recovery, InnoDB reads corruption flags from both locations and merges results before marking in-memory table and index objects as corrupt.
- Removing redo logs to speed up recovery is not recommended, even if some data loss is acceptable. Removing redo logs should only be considered after a clean shutdown, with innodb_fast_shutdown set to 0 or 1.
- Roll back of incomplete transactions

Incomplete transactions are any transactions that were active at the time of unexpected exit or fast shutdown. The time it takes to roll back an incomplete transaction can be three or four times the amount of time a transaction is active before it is interrupted, depending on server load.

You cannot cancel transactions that are being rolled back. In extreme cases, when rolling back transactions is expected to take an exceptionally long time, it may be faster to start InnoDB with an innodb_force_recovery setting of 3 or greater. See Section 17.20.3, "Forcing InnoDB Recovery".
- Change buffer merge

Applying changes from the change buffer (part of the system tablespace) to leaf pages of secondary indexes, as the index pages are read to the buffer pool.
- Purge

Deleting delete-marked records that are no longer visible to active transactions.
The steps that follow redo log application do not depend on the redo log (other than for logging the writes) and are performed in parallel with normal processing. Of these, only rollback of incomplete transactions is special to crash recovery. The insert buffer merge and the purge are performed during normal processing.

After redo log application, InnoDB attempts to accept connections as early as possible, to reduce downtime. As part of crash recovery, InnoDB rolls back transactions that were not committed or in XA

PREPARE state when the server exited. The rollback is performed by a background thread, executed in parallel with transactions from new connections. Until the rollback operation is completed, new connections may encounter locking conflicts with recovered transactions.

In most situations, even if the MySQL server was killed unexpectedly in the middle of heavy activity, the recovery process happens automatically and no action is required of the DBA. If a hardware failure or severe system error corrupted InnoDB data, MySQL might refuse to start. In this case, see Section 17.20.3, "Forcing InnoDB Recovery".

For information about the binary log and InnoDB crash recovery, see Section 7.4.4, "The Binary Log".

\section*{Tablespace Discovery During Crash Recovery}

If, during recovery, InnoDB encounters redo logs written since the last checkpoint, the redo logs must be applied to affected tablespaces. The process that identifies affected tablespaces during recovery is referred to as tablespace discovery.

Tablespace discovery relies on the innodb_directories setting, which defines the directories to scan at startup for tablespace files. The innodb_directories default setting is NULL, but the directories defined by innodb_data_home_dir, innodb_undo_directory, and datadir are always appended to the innodb_directories argument value when InnoDB builds a list of directories to scan at startup. These directories are appended regardless of whether an innodb_directories setting is specified explicitly. Tablespace files defined with an absolute path or that reside outside of the directories appended to the innodb_directories setting should be added to the innodb_directories setting. Recovery is terminated if any tablespace file referenced in a redo log has not been discovered previously.

\subsection*{17.19 InnoDB and MySQL Replication}

It is possible to use replication in a way where the storage engine on the replica is not the same as the storage engine on the source. For example, you can replicate modifications to an InnoDB table on the source to a MyISAM table on the replica. For more information see, Section 19.4.4, "Using Replication with Different Source and Replica Storage Engines".

For information about setting up a replica, see Section 19.1.2.6, "Setting Up Replicas", and Section 19.1.2.5, "Choosing a Method for Data Snapshots". To make a new replica without taking down the source or an existing replica, use the MySQL Enterprise Backup product.

Transactions that fail on the source do not affect replication. MySQL replication is based on the binary log where MySQL writes SQL statements that modify data. A transaction that fails (for example, because of a foreign key violation, or because it is rolled back) is not written to the binary log, so it is not sent to replicas. See Section 15.3.1, "START TRANSACTION, COMMIT, and ROLLBACK Statements".

Replication and CASCADE. Cascading actions for InnoDB tables on the source are executed on the replica only if the tables sharing the foreign key relation use InnoDB on both the source and replica. This is true whether you are using statement-based or row-based replication. Suppose that you have started replication, and then create two tables on the source, where InnoDB is defined as the default storage engine, using the following CREATE TABLE statements:
```
CREATE TABLE fc1 (
    i INT PRIMARY KEY,
    j INT
);
CREATE TABLE fc2 (
    m INT PRIMARY KEY,
    n INT,
    FOREIGN KEY ni (n) REFERENCES fc1 (i)
        ON DELETE CASCADE
);
```


If the replica has MyISAM defined as the default storage engine, the same tables are created on the replica, but they use the MyISAM storage engine, and the FOREIGN KEY option is ignored. Now we insert some rows into the tables on the source:
```
source> INSERT INTO fc1 VALUES (1, 1), (2, 2);
Query OK, 2 rows affected (0.09 sec)
Records: 2 Duplicates: 0 Warnings: 0
source> INSERT INTO fc2 VALUES (1, 1), (2, 2), (3, 1);
Query OK, 3 rows affected (0.19 sec)
Records: 3 Duplicates: 0 Warnings: 0
```


At this point, on both the source and the replica, table fc1 contains 2 rows, and table fc2 contains 3 rows, as shown here:
```
source> SELECT * FROM fc1;
+---+------+
| i | j |
+---+------+
| 1 | 1 |
| 2 | 2 |
+---+------+
2 rows in set (0.00 sec)
source> SELECT * FROM fc2;
+---+------+
| m | n |
+---+------+
| 1 | 1 |
| 2 | 2 |
| 3 | 1 |
+---+------+
3 rows in set (0.00 sec)
replica> SELECT * FROM fc1;
+---+------+
| i | j |
+---+------+
| 1 | 1 |
| 2 | 2 |
+---+------+
2 rows in set (0.00 sec)
replica> SELECT * FROM fc2;
+---+------+
| m | n |
+---+------+
| 1 | 1 |
| 2 | 2 |
| 3 | 1 |
+---+------+
3 rows in set (0.00 sec)
```


Now suppose that you perform the following DELETE statement on the source:
```
source> DELETE FROM fc1 WHERE i=1;
Query OK, 1 row affected (0.09 sec)
```


Due to the cascade, table fc2 on the source now contains only 1 row:
```
source> SELECT * FROM fc2;
+---+---+
| m | n |
+---+---+
| 2 | 2 |
+---+---+
1 row in set (0.00 sec)
```


However, the cascade does not propagate on the replica because on the replica the DELETE for fc1 deletes no rows from fc2. The replica's copy of fc2 still contains all of the rows that were originally inserted:
```
replica> SELECT * FROM fc2;
+---+---+
| m | n |
+---+---+
| 1 | 1 |
| 3 | 1 |
| 2 | 2 |
+---+---+
3 rows in set (0.00 sec)
```


This difference is due to the fact that the cascading deletes are handled internally by the InnoDB storage engine, which means that none of the changes are logged.

\subsection*{17.20 InnoDB Troubleshooting}

The following general guidelines apply to troubleshooting InnoDB problems:
- When an operation fails or you suspect a bug, look at the MySQL server error log (see Section 7.4.2, "The Error Log"). Server Error Message Reference provides troubleshooting information for some of the common InnoDB-specific errors that you may encounter.
- If the failure is related to a deadlock, run with the innodb_print_all_deadlocks option enabled so that details about each deadlock are printed to the MySQL server error log. For information about deadlocks, see Section 17.7.5, "Deadlocks in InnoDB".
- If the issue is related to the InnoDB data dictionary, see Section 17.20.4, "Troubleshooting InnoDB Data Dictionary Operations".
- When troubleshooting, it is usually best to run the MySQL server from the command prompt, rather than through mysqld_safe or as a Windows service. You can then see what mysqld prints to the console, and so have a better grasp of what is going on. On Windows, start mysqld with the console option to direct the output to the console window.
- Enable the InnoDB Monitors to obtain information about a problem (see Section 17.17, "InnoDB Monitors"). If the problem is performance-related, or your server appears to be hung, you should enable the standard Monitor to print information about the internal state of InnoDB. If the problem is with locks, enable the Lock Monitor. If the problem is with table creation, tablespaces, or data dictionary operations, refer to the InnoDB Information Schema system tables to examine contents of the InnoDB internal data dictionary.

InnoDB temporarily enables standard InnoDB Monitor output under the following conditions:
- A long semaphore wait
- InnoDB cannot find free blocks in the buffer pool
- Over $67 \%$ of the buffer pool is occupied by lock heaps or the adaptive hash index
- If you suspect that a table is corrupt, run CHECK TABLE on that table.

\subsection*{17.20.1 Troubleshooting InnoDB I/O Problems}

The troubleshooting steps for InnoDB I/O problems depend on when the problem occurs: during startup of the MySQL server, or during normal operations when a DML or DDL statement fails due to problems at the file system level.

\section*{Initialization Problems}

If something goes wrong when InnoDB attempts to initialize its tablespace or its log files, delete all files created by InnoDB: all ibdata files and all redo log files (\#ib_redoN files). If you created any InnoDB tables, also delete any .ibd files from the MySQL database directories. Then try initializing

InnoDB again. For easiest troubleshooting, start the MySQL server from a command prompt so that you see what is happening.

\section*{Runtime Problems}

If InnoDB prints an operating system error during a file operation, usually the problem has one of the following solutions:
- Make sure the InnoDB data file directory and the InnoDB log directory exist.
- Make sure mysqld has access rights to create files in those directories.
- Make sure mysqld can read the proper my.cnf or my.ini option file, so that it starts with the options that you specified.
- Make sure the disk is not full and you are not exceeding any disk quota.
- Make sure that the names you specify for subdirectories and data files do not clash.
- Doublecheck the syntax of the innodb_data_home_dir and innodb_data_file_path values. In particular, any MAX value in the innodb_data_file_path option is a hard limit, and exceeding that limit causes a fatal error.

\subsection*{17.20.2 Troubleshooting Recovery Failures}

Checkpoints and advancing the checkpoint LSN are not permitted until redo log recovery is complete and data dictionary dynamic metadata (srv_dict_metadata) is transferred to data dictionary table (dict_table_t) objects. Should the redo log run out of space during recovery or after recovery (but before data dictionary dynamic metadata is transferred to data dictionary table objects) as a result of this change, an innodb_force_recovery restart may be required, starting with at least the SRV_FORCE_NO_IBUF_MERGE setting or, in case that fails, the SRV_FORCE_NO_LOG_REDO setting. If an innodb_force_recovery restart fails in this scenario, recovery from backup may be necessary.

\subsection*{17.20.3 Forcing InnoDB Recovery}

To investigate database page corruption, you might dump your tables from the database with SELECT ... INTO OUTFILE. Usually, most of the data obtained in this way is intact. Serious corruption might cause SELECT * FROM tbl_name statements or InnoDB background operations to unexpectedly exit or assert, or even cause InnoDB roll-forward recovery to crash. In such cases, you can use the innodb_force_recovery option to force the InnoDB storage engine to start up while preventing background operations from running, so that you can dump your tables. For example, you can add the following line to the [mysqld] section of your option file before restarting the server:
```
[mysqld]
innodb_force_recovery = 1
```


For information about using option files, see Section 6.2.2.2, "Using Option Files".

> Warning
> Only set innodb_force_recovery to a value greater than 0 in an emergency situation, so that you can start InnoDB and dump your tables. Before doing so, ensure that you have a backup copy of your database in case you need to recreate it. Values of 4 or greater can permanently corrupt data files. Only use an innodb_force_recovery setting of 4 or greater on a production server instance after you have successfully tested the setting on a separate physical copy of your database. When forcing InnoDB recovery, you should always start with innodb_force_recovery=1 and only increase the value incrementally, as necessary.
innodb_force_recovery is 0 by default (normal startup without forced recovery). The permissible nonzero values for innodb_force_recovery are 1 to 6 . A larger value includes the functionality of lesser values. For example, a value of 3 includes all of the functionality of values 1 and 2 .

If you are able to dump your tables with an innodb_force_recovery value of 3 or less, then you are relatively safe that only some data on corrupt individual pages is lost. A value of 4 or greater is considered dangerous because data files can be permanently corrupted. A value of 6 is considered drastic because database pages are left in an obsolete state, which in turn may introduce more corruption into B-trees and other database structures.

As a safety measure, InnoDB prevents INSERT, UPDATE, or DELETE operations when innodb_force_recovery is greater than 0 . An innodb_force_recovery setting of 4 or greater places InnoDB in read-only mode.
- 1 (SRV_FORCE_IGNORE_CORRUPT)

Lets the server run even if it detects a corrupt page. Tries to make SELECT * FROM tbl_name jump over corrupt index records and pages, which helps in dumping tables.
- 2 (SRV_FORCE_NO_BACKGROUND)

Prevents the master thread and any purge threads from running. If an unexpected exit would occur during the purge operation, this recovery value prevents it.
- 3 (SRV_FORCE_NO_TRX_UNDO)

Does not run transaction rollbacks after crash recovery.
- 4 (SRV_FORCE_NO_IBUF_MERGE)

Prevents insert buffer merge operations. If they would cause a crash, does not do them. Does not calculate table statistics. This value can permanently corrupt data files. After using this value, be prepared to drop and recreate all secondary indexes. Sets InnoDB to read-only.
- 5 (SRV_FORCE_NO_UNDO_LOG_SCAN)

Does not look at undo logs when starting the database: InnoDB treats even incomplete transactions as committed. This value can permanently corrupt data files. Sets InnoDB to read-only.
- 6 (SRV_FORCE_NO_LOG_REDO)

Does not do the redo log roll-forward in connection with recovery. This value can permanently corrupt data files. Leaves database pages in an obsolete state, which in turn may introduce more corruption into B-trees and other database structures. Sets InnoDB to read-only.

You can SELECT from tables to dump them. With an innodb_force_recovery value of 3 or less you can DROP or CREATE tables. DROP TABLE is also supported with an innodb_force_recovery value greater than 3. DROP TABLE is not permitted with an innodb_force_recovery value greater than 4.

If you know that a given table is causing an unexpected exit on rollback, you can drop it. If you encounter a runaway rollback caused by a failing mass import or ALTER TABLE, you can kill the mysqld process and set innodb_force_recovery to 3 to bring the database up without the rollback, and then DROP the table that is causing the runaway rollback.

If corruption within the table data prevents you from dumping the entire table contents, a query with an ORDER BY primary_key DESC clause might be able to dump the portion of the table after the corrupted part.

If a high innodb_force_recovery value is required to start InnoDB, there may be corrupted data structures that could cause complex queries (queries containing WHERE, ORDER BY, or other clauses) to fail. In this case, you may only be able to run basic SELECT * FROM t queries.

\subsection*{17.20.4 Troubleshooting InnoDB Data Dictionary Operations}

Information about table definitions is stored in the InnoDB data dictionary. If you move data files around, dictionary data can become inconsistent.

If a data dictionary corruption or consistency issue prevents you from starting InnoDB, see Section 17.20.3, "Forcing InnoDB Recovery" for information about manual recovery.

\section*{Cannot Open Datafile}

With innodb_file_per_table enabled (the default), the following messages may appear at startup if a file-per-table tablespace file (.ibd file) is missing:
[ERROR] InnoDB: Operating system error number 2 in a file operation.
[ERROR] InnoDB: The error means the system cannot find the path specified.
[ERROR] InnoDB: Cannot open datafile for read-only: './test/t1.ibd' OS error: 71
[Warning] InnoDB: Ignoring tablespace ˋtest/t1ˋ because it could not be opened.
To address these messages, issue DROP TABLE statement to remove data about the missing table from the data dictionary.

\section*{Restoring Orphan File-Per-Table ibd Files}

This procedure describes how to restore orphan file-per-table .ibd files to another MySQL instance. You might use this procedure if the system tablespace is lost or unrecoverable and you want to restore . ibd file backups on a new MySQL instance.

The procedure is not supported for general tablespace . ibd files.
The procedure assumes that you only have . ibd file backups, you are recovering to the same version of MySQL that initially created the orphan .ibd files, and that .ibd file backups are clean. See Section 17.6.1.4, "Moving or Copying InnoDB Tables" for information about creating clean backups.

Table import limitations outlined in Section 17.6.1.3, "Importing InnoDB Tables" are applicable to this procedure.
1. On the new MySQL instance, recreate the table in a database of the same name.
```
mysql> CREATE DATABASE sakila;
mysql> USE sakila;
mysql> CREATE TABLE actor (
    -> actor_id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
    -> first_name VARCHAR(45) NOT NULL,
    -> last_name VARCHAR(45) NOT NULL,
    -> last_update TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    -> PRIMARY KEY (actor_id),
    -> KEY idx_actor_last_name (last_name)
    -> )ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

2. Discard the tablespace of the newly created table.
```
mysql> ALTER TABLE sakila.actor DISCARD TABLESPACE;
```

3. Copy the orphan .ibd file from your backup directory to the new database directory.
```
$> cp /backup_directory/actor.ibd path/to/mysql-5.7/data/sakila/
```

4. Ensure that the .ibd file has the necessary file permissions.
5. Import the orphan .ibd file. A warning is issued indicating that InnoDB is attempting to import the file without schema verification.
```
mysql> ALTER TABLE sakila.actor IMPORT TABLESPACE; SHOW WARNINGS;
Query OK, 0 rows affected, 1 warning (0.15 sec)
```

```
Warning | 1810 | InnoDB: IO Read error: (2, No such file or directory)
Error opening './sakila/actor.cfg', will attempt to import
without schema verification
```

6. Query the table to verify that the .ibd file was successfully restored.
```
mysql> SELECT COUNT(*) FROM sakila.actor;
+----------+
| count(*) |
+-----------+
| 200 |
+-----------+
```


\subsection*{17.20.5 InnoDB Error Handling}

The following items describe how InnoDB performs error handling. InnoDB sometimes rolls back only the statement that failed, other times it rolls back the entire transaction.
- If you run out of file space in a tablespace, a MySQL Table is full error occurs and InnoDB rolls back the SQL statement.
- A transaction deadlock causes InnoDB to roll back the entire transaction. Retry the entire transaction when this happens.

A lock wait timeout causes InnoDB to roll back the current statement (the statement that was waiting for the lock and encountered the timeout). To have the entire transaction roll back, start the server with --innodb-rollback-on-timeout enabled. Retry the statement if using the default behavior, or the entire transaction if--innodb-rollback-on-timeout is enabled.

Both deadlocks and lock wait timeouts are normal on busy servers and it is necessary for applications to be aware that they may happen and handle them by retrying. You can make them less likely by doing as little work as possible between the first change to data during a transaction and the commit, so the locks are held for the shortest possible time and for the smallest possible number of rows. Sometimes splitting work between different transactions may be practical and helpful.
- A duplicate-key error rolls back the SQL statement, if you have not specified the IGNORE option in your statement.
- A row too long error rolls back the SQL statement.
- Other errors are mostly detected by the MySQL layer of code (above the InnoDB storage engine level), and they roll back the corresponding SQL statement. Locks are not released in a rollback of a single SQL statement.

During implicit rollbacks, as well as during the execution of an explicit ROLLBACK SQL statement, SHOW PROCESSLIST displays Rolling back in the State column for the relevant connection.

\subsection*{17.21 InnoDB Limits}

This section describes limits for InnoDB tables, indexes, tablespaces, and other aspects of the InnoDB storage engine.
- A table can contain a maximum of 1017 columns. Virtual generated columns are included in this limit.
- A table can contain a maximum of 64 secondary indexes.
- The index key prefix length limit is 3072 bytes for InnoDB tables that use DYNAMIC or COMPRESSED row format.

The index key prefix length limit is 767 bytes for InnoDB tables that use the REDUNDANT or COMPACT row format. For example, you might hit this limit with a column prefix index of more than 191
characters on a TEXT or VARCHAR column, assuming a utf8mb4 character set and the maximum of 4 bytes for each character.

Attempting to use an index key prefix length that exceeds the limit returns an error.
If you reduce the InnoDB page size to 8 KB or 4 KB by specifying the innodb_page_size option when creating the MySQL instance, the maximum length of the index key is lowered proportionally, based on the limit of 3072 bytes for a 16 KB page size. That is, the maximum index key length is 1536 bytes when the page size is 8 KB , and 768 bytes when the page size is 4 KB .

The limits that apply to index key prefixes also apply to full-column index keys.
- A maximum of 16 columns is permitted for multicolumn indexes. Exceeding the limit returns an error.

ERROR 1070 (42000): Too many key parts specified; max 16 parts allowed
- The maximum row size, excluding any variable-length columns that are stored off-page, is slightly less than half of a page for $4 \mathrm{~KB}, 8 \mathrm{~KB}, 16 \mathrm{~KB}$, and 32 KB page sizes. For example, the maximum row size for the default innodb_page_size of 16 KB is about 8000 bytes. However, for an InnoDB page size of 64 KB , the maximum row size is approximately 16000 bytes. LONGBLOB and LONGTEXT columns must be less than 4 GB , and the total row size, including BLOB and TEXT columns, must be less than 4 GB .

If a row is less than half a page long, all of it is stored locally within the page. If it exceeds half a page, variable-length columns are chosen for external off-page storage until the row fits within half a page, as described in Section 17.11.2, "File Space Management".
- Although InnoDB supports row sizes larger than 65,535 bytes internally, MySQL itself imposes a row-size limit of 65,535 for the combined size of all columns. See Section 10.4.7, "Limits on Table Column Count and Row Size".
- The maximum table or tablespace size is impacted by the server's file system, which can impose a maximum file size that is smaller than the internal 64 TiB size limit defined by InnoDB. For example, the ext4 file system on Linux has a maximum file size of 16 TiB , so the maximum table or tablespace size becomes 16 TiB instead of 64 TiB . Another example is the FAT32 file system, which has a maximum file size of 4 GB .

If you require a larger system tablespace, configure it using several smaller data files rather than one large data file, or distribute table data across file-per-table and general tablespace data files.
- The combined maximum size for InnoDB log files is 512 GB .
- The minimum tablespace size is slightly larger than 10 MB . The maximum tablespace size depends on the InnoDB page size.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 17.26 InnoDB Maximum Tablespace Size}
\begin{tabular}{|l|l|}
\hline InnoDB Page Size & Maximum Tablespace Size \\
\hline 4 KB & 16 TB \\
\hline 8 KB & 32TB \\
\hline 16 KB & 64TB \\
\hline 32 KB & 128TB \\
\hline 64 KB & 256TB \\
\hline
\end{tabular}
\end{table}

The maximum tablespace size is also the maximum size for a table.
- An InnoDB instance supports up to $2^{\wedge} 32(4294967296)$ tablespaces, with a small number of those tablespaces reserved for undo and temporary tables.
- Shared tablespaces support up to $2^{\wedge} 32(4294967296)$ tables.
- The path of a tablespace file, including the file name, cannot exceed the MAX_PATH limit on Windows. Prior to Windows 10, the MAX_PATH limit is 260 characters. As of Windows 10, version 1607, MAX_PATH limitations are removed from common Win32 file and directory functions, but you must enable the new behavior.
- For limits associated with concurrent read-write transactions, see Section 17.6.6, "Undo Logs".

\subsection*{17.22 InnoDB Restrictions and Limitations}

This section describes restrictions and limitations of the InnoDB storage engine.
- You cannot create a table with a column name that matches the name of an internal InnoDB column (including DB_ROW_ID, DB_TRX_ID, and DB_ROLL_PTR. This restriction applies to use of the names in any lettercase.
```
mysql> CREATE TABLE t1 (c1 INT, db_row_id INT) ENGINE=INNODB;
ERROR 1166 (42000): Incorrect column name 'db_row_id'
```

- SHOW TABLE STATUS does not provide accurate statistics for InnoDB tables except for the physical size reserved by the table. The row count is only a rough estimate used in SQL optimization.
- InnoDB does not keep an internal count of rows in a table because concurrent transactions might "see" different numbers of rows at the same time. Consequently, SELECT COUNT ( * ) statements only count rows visible to the current transaction.

For information about how InnoDB processes SELECT COUNT (*) statements, refer to the COUNT() description in Section 14.19.1, "Aggregate Function Descriptions".
- ROW_FORMAT=COMPRESSED is unsupported for page sizes greater than 16 KB .
- A MySQL instance using a particular InnoDB page size (innodb_page_size) cannot use data files or log files from an instance that uses a different page size.
- For limitations associated with importing tables using the Transportable Tablespaces feature, see Table Import Limitations.
- For limitations associated with online DDL, see Section 17.12.8, "Online DDL Limitations".
- For limitations associated with general tablespaces, see General Tablespace Limitations.
- For limitations associated with data-at-rest encryption, see Encryption Limitations.

